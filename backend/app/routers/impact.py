from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.database import supabase
from app.routers.survey import get_user_id_from_token

router = APIRouter(
    prefix="/impact",
    tags=["impact"],
    responses={404: {"description": "Not found"}},
)

@router.get("/projections")
async def get_impact_projections(authorization: str = Header(None)):
    """
    Get impact projections and breakdown for the Future Impact page.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # 1. Calculate Current Pace (User's actual activity over last 30 days)
        today = datetime.now()
        thirty_days_ago = today - timedelta(days=30)
        
        activities_response = supabase.table("user_activities")\
            .select("co2_saved_kg, created_at, detected_category")\
            .eq("user_id", user_id)\
            .gte("created_at", thirty_days_ago.isoformat())\
            .execute()
            
        activities_30d = activities_response.data or []
        co2_saved_30d = sum(item.get("co2_saved_kg", 0) or 0 for item in activities_30d)
        
        # Monthly rate (extrapolate to 30 days if user has less history, 
        # but to keep it realistic, we just take the last 30 days sum)
        # If the user joined < 30 days ago, this might be lower than actual potential,
        # but "Your Current Pace" implies actual recent performance.
        # We'll use the tracked 30d sum as the monthly pace.
        monthly_pace = max(co2_saved_30d, 1.0) # Minimum 1kg to show something on graph
        
        # 2. Calculate Best Case (If they complete all active missions)
        # We assume active missions are habits they could adopt.
        # Let's assume the "potential" is adding these active missions to their weekly routine?
        # Or just completing them once?
        # User prompt: "If they complete all suggested missions" -> "Best Case Scenario".
        # Let's assume these missions represent *additional* monthly potential if done regularly.
        # For simplicity/heuristic: We'll add the sum of active missions to the monthly pace.
        
        missions_response = supabase.table("user_missions")\
            .select("co2_saved_kg")\
            .eq("user_id", user_id)\
            .eq("status", "available")\
            .execute()
            
        active_missions = missions_response.data or []
        potential_boost = sum(m.get("co2_saved_kg", 0) or 0 for m in active_missions)
        
        # Assume they do these missions 4 times a month (weekly)
        best_case_monthly_pace = monthly_pace + (potential_boost * 4)
        
        # 3. Generate data points for the graph
        # X-axis: 1 month, 6 months, 1 year
        
        current_pace_projection = {
            "1_month": round(monthly_pace, 1),
            "6_months": round(monthly_pace * 6, 1),
            "1_year": round(monthly_pace * 12, 1)
        }
        
        best_case_projection = {
            "1_month": round(best_case_monthly_pace, 1),
            "6_months": round(best_case_monthly_pace * 6, 1),
            "1_year": round(best_case_monthly_pace * 12, 1)
        }
        
        # 4. Category Breakdown (Lifetime)
        # Fetch all time activities for breakdown
        all_activities_response = supabase.table("user_activities")\
            .select("co2_saved_kg, detected_category, ai_summary")\
            .eq("user_id", user_id)\
            .execute()
            
        all_activities = all_activities_response.data or []
        
        category_totals = {
            "transportation": 0.0,
            "food": 0.0,
            "shopping": 0.0,
            "energy": 0.0
        }
        
        # Aggregate specific actions
        # Structure: category -> { summary -> {co2: float, count: int} }
        action_details = {
            "transportation": {},
            "food": {},
            "shopping": {},
            "energy": {}
        }
        
        total_lifetime_co2 = 0.0
        
        for activity in all_activities:
            cat = activity.get("detected_category", "energy") or "energy"
            co2 = activity.get("co2_saved_kg", 0) or 0
            summary = activity.get("ai_summary", "Unknown Activity")
            
            if cat not in category_totals:
                cat = "energy" # Fallback
                
            category_totals[cat] += co2
            total_lifetime_co2 += co2
            
            # Aggregate actions
            if summary not in action_details[cat]:
                action_details[cat][summary] = {"co2": 0.0, "count": 0}
            action_details[cat][summary]["co2"] += co2
            action_details[cat][summary]["count"] += 1
            
        # Convert to percentages and top actions
        category_breakdown = []
        top_actions_by_category = {}
        
        for cat, details in action_details.items():
            # Sort actions by CO2
            sorted_actions = sorted(
                [{"name": k, **v} for k, v in details.items()],
                key=lambda x: x["co2"],
                reverse=True
            )[:5] # Top 5
            
            # Format numbers
            for action in sorted_actions:
                action["co2"] = round(action["co2"], 1)
                
            top_actions_by_category[cat] = sorted_actions
            
        if total_lifetime_co2 > 0:
            for cat, amount in category_totals.items():
                percentage = round((amount / total_lifetime_co2) * 100)
                category_breakdown.append({
                    "category": cat,
                    "percentage": percentage,
                    "amount_kg": round(amount, 1)
                })
        else:
            # Default distribution if no data
            category_breakdown = [
                {"category": "transportation", "percentage": 40, "amount_kg": 0},
                {"category": "food", "percentage": 35, "amount_kg": 0},
                {"category": "shopping", "percentage": 15, "amount_kg": 0},
                {"category": "energy", "percentage": 10, "amount_kg": 0}
            ]
            
        # 5. Get top high-impact missions for "Bridging the gap"
        # We already fetched active missions, let's sort them
        missions_info = supabase.table("user_missions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("status", "available")\
            .order("co2_saved_kg", desc=True)\
            .limit(3)\
            .execute()
            
        top_missions = missions_info.data or []
        
        # 6. Get User Profile for Plant Stage
        profile_response = supabase.table("user_profiles")\
            .select("plant_stage, plant_type, total_xp")\
            .eq("user_id", user_id)\
            .execute()
            
        user_profile = profile_response.data[0] if profile_response.data else {}
        
        plant_stage_names = {
            1: "Seed",
            2: "Sprout",
            3: "Seedling",
            4: "Young Tree",
            5: "Mature Tree",
            6: "Ancient Tree",
            7: "Forest Guardian"
        }
        
        current_stage = user_profile.get("plant_stage", 1)

        return {
            "success": True,
            "projections": {
                "current_pace": current_pace_projection,
                "best_case": best_case_projection
            },
            "category_breakdown": category_breakdown,
            "suggestions": top_missions,
            "monthly_pace_kg": round(monthly_pace, 1),
            "potential_annual_savings_kg": round(best_case_monthly_pace * 12, 1),
            "user_profile": {
                "plant_stage": current_stage,
                "plant_type": "oak",
                "plant_stage_name": plant_stage_names.get(current_stage, "Seed")
            },
            "top_actions": top_actions_by_category
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating impact projections: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating projections: {str(e)}")
