from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
from app.database import supabase
from app.routers.survey import get_user_id_from_token
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import get_settings
import httpx
import json

settings = get_settings()

router = APIRouter(
    prefix="/activities",
    tags=["activities"],
    responses={404: {"description": "Not found"}},
)


class FreeformActivityRequest(BaseModel):
    activity_text: str


class CompleteMissionRequest(BaseModel):
    mission_id: str


class ActivityResponse(BaseModel):
    success: bool
    activity: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


@router.post("/freeform", response_model=ActivityResponse)
async def submit_freeform_activity(
    request: FreeformActivityRequest,
    authorization: str = Header(None)
):
    """
    Submit a freeform activity that will be parsed by Gemini,
    calculated for CO2 savings via Climatiq, and award XP.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        activity_text = request.activity_text.strip()
        
        # Validation
        if len(activity_text) < 10:
            raise HTTPException(status_code=400, detail="Activity description too short (min 10 characters)")
        if len(activity_text) > 200:
            raise HTTPException(status_code=400, detail="Activity description too long (max 200 characters)")
        
        # Check daily limit (max 20 freeform activities per day)
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count_response = supabase.table("user_activities")\
            .select("id", count="exact")\
            .eq("user_id", user_id)\
            .eq("activity_type", "freeform")\
            .gte("created_at", today_start.isoformat())\
            .execute()
        
        if daily_count_response.count and daily_count_response.count >= 20:
            raise HTTPException(status_code=429, detail="Daily activity limit reached (20 per day)")
        
        # Check for duplicate recent activities (within 4 hours)
        four_hours_ago = datetime.now() - timedelta(hours=4)
        recent_activities = supabase.table("user_activities")\
            .select("user_input")\
            .eq("user_id", user_id)\
            .eq("activity_type", "freeform")\
            .gte("created_at", four_hours_ago.isoformat())\
            .execute()
        
        if recent_activities.data:
            for activity in recent_activities.data:
                if activity.get("user_input", "").lower() == activity_text.lower():
                    raise HTTPException(status_code=400, detail="Similar activity already logged recently")
        
        # Parse with Gemini 2.0 Flash Lite
        gemini_result = await parse_activity_with_gemini(activity_text)
        
        if gemini_result["confidence"] < 50:
            raise HTTPException(
                status_code=400, 
                detail="Unable to recognize this as an eco-friendly activity. Please be more specific."
            )
        
        # Calculate CO2 savings with Climatiq
        co2_saved = await calculate_co2_with_climatiq(
            gemini_result["climatiq_estimate"],
            user_id
        )
        
        # Cap CO2 at 10kg to prevent exploits
        co2_saved = min(co2_saved, 10.0)
        
        # Calculate XP
        xp_earned = calculate_xp(co2_saved, gemini_result["category"])
        
        # Estimate money saved (optional, basic estimates)
        money_saved = estimate_money_saved(gemini_result["category"], co2_saved)
        
        # Store activity
        activity_data = {
            "user_id": user_id,
            "activity_type": "freeform",
            "user_input": activity_text,
            "ai_summary": gemini_result["summary"],
            "detected_category": gemini_result["category"],
            "xp_earned": xp_earned,
            "co2_saved_kg": round(co2_saved, 2),
            "money_saved": round(money_saved, 2) if money_saved > 0 else None,
            "emoji": gemini_result["emoji"],
        }
        
        activity_response = supabase.table("user_activities").insert(activity_data).execute()
        
        if not activity_response.data:
            raise HTTPException(status_code=500, detail="Failed to save activity")
        
        # Update user profile stats
        await update_user_stats(user_id, xp_earned, co2_saved, 0, money_saved)
        
        return ActivityResponse(
            success=True,
            activity=activity_response.data[0],
            message=f"Great job! You earned {xp_earned} XP and saved {co2_saved:.1f}kg CO2!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting freeform activity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing activity: {str(e)}")


@router.post("/complete-mission", response_model=ActivityResponse)
async def complete_mission(
    request: CompleteMissionRequest,
    authorization: str = Header(None)
):
    """
    Complete a mission and create an activity record.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Get mission details
        mission_response = supabase.table("user_missions")\
            .select("*")\
            .eq("id", request.mission_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not mission_response.data:
            raise HTTPException(status_code=404, detail="Mission not found")
        
        mission = mission_response.data[0]
        
        # Check if already completed
        if mission.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Mission already completed")
        
        # Create activity record
        activity_data = {
            "user_id": user_id,
            "activity_type": "mission",
            "mission_id": request.mission_id,
            "user_input": None,
            "ai_summary": mission["title"],
            "detected_category": mission["category"],
            "xp_earned": mission["xp_reward"],
            "co2_saved_kg": mission.get("co2_saved_kg"),
            "money_saved": mission.get("money_saved"),
            "emoji": get_category_emoji(mission["category"]),
        }
        
        activity_response = supabase.table("user_activities").insert(activity_data).execute()
        
        # Update mission status
        supabase.table("user_missions")\
            .update({"status": "completed", "completed_at": datetime.now().isoformat()})\
            .eq("id", request.mission_id)\
            .execute()
        
        # Update user stats
        await update_user_stats(
            user_id,
            mission["xp_reward"],
            mission.get("co2_saved_kg", 0),
            1,  # missions_completed
            mission.get("money_saved", 0)
        )
        
        return ActivityResponse(
            success=True,
            activity=activity_response.data[0],
            message=f"Mission completed! +{mission['xp_reward']} XP"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error completing mission: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error completing mission: {str(e)}")


@router.get("/feed")
async def get_activity_feed(
    authorization: str = Header(None),
    limit: int = 20,
    offset: int = 0
):
    """
    Get the user's activity feed (both missions and freeform).
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Fetch activities
        activities_response = supabase.table("user_activities")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Format activities for frontend
        formatted_activities = []
        for activity in activities_response.data:
            time_ago = get_time_ago(activity["created_at"])
            formatted_activities.append({
                "id": activity["id"],
                "type": activity["activity_type"],
                "summary": activity["ai_summary"],
                "emoji": activity["emoji"],
                "xp_earned": activity["xp_earned"],
                "co2_saved_kg": activity.get("co2_saved_kg"),
                "money_saved": activity.get("money_saved"),
                "time_ago": time_ago,
                "created_at": activity["created_at"]
            })
        
        return {
            "success": True,
            "activities": formatted_activities,
            "total_count": len(activities_response.data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching activity feed: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {str(e)}")


# Helper Functions

async def parse_activity_with_gemini(user_input: str) -> Dict[str, Any]:
    """
    Use Gemini 2.0 Flash Lite to parse and categorize user activity.
    """
    system_prompt = """You are an eco-action analyzer. Given a user's description of a sustainable action, 
extract structured information.

Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief, clear description (max 50 chars)",
  "category": "transportation|food|energy|shopping",
  "emoji": "Appropriate emoji (🚌🥗⚡🛍️)",
  "climatiq_estimate": {
    "activity_type": "transportation|food|energy|shopping",
    "details": {}
  },
  "confidence": 0-100
}

Examples:
- "took the bus to work" → {"summary": "Bus commute", "category": "transportation", "emoji": "🚌", "climatiq_estimate": {"activity_type": "transportation", "details": {"mode": "bus", "distance_km": 10}}, "confidence": 90}
- "ate a vegan lunch" → {"summary": "Plant-based meal", "category": "food", "emoji": "🥗", "climatiq_estimate": {"activity_type": "food", "details": {"meal_type": "lunch", "is_plant_based": true}}, "confidence": 85}

If not an eco-friendly action, set confidence < 50.
Return ONLY the JSON, no other text."""

    user_message = f'User input: "{user_input}"'

    try:
        # Initialize Gemini model
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-lite",
            api_key=settings.google_api_key,
            temperature=0.3,
        )
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        response = await llm.ainvoke(messages)
        result_text = response.content.strip()
        
        # Clean up markdown code blocks if present
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        result = json.loads(result_text)
        return result
        
    except Exception as e:
        print(f"Gemini parsing error: {e}")
        # Return low confidence if parsing fails
        return {
            "summary": user_input[:50],
            "category": "energy",
            "emoji": "🌱",
            "climatiq_estimate": {"activity_type": "energy", "details": {}},
            "confidence": 30
        }


async def calculate_co2_with_climatiq(climatiq_estimate: Dict, user_id: str) -> float:
    """
    Calculate CO2 savings using Climatiq API based on activity type.
    """
    activity_type = climatiq_estimate.get("activity_type")
    details = climatiq_estimate.get("details", {})
    
    # Simplified CO2 estimates (you can enhance with actual Climatiq API calls)
    co2_saved = 0.0
    
    if activity_type == "transportation":
        mode = details.get("mode", "bus")
        distance_km = details.get("distance_km", 10)
        
        # Estimate: Car vs alternative
        car_emissions_per_km = 0.25  # kg CO2
        alternative_emissions = {
            "bus": 0.05,
            "bicycle": 0.0,
            "walk": 0.0,
            "train": 0.04,
            "carpool": 0.125
        }
        
        alt_emissions = alternative_emissions.get(mode, 0.1)
        co2_saved = (car_emissions_per_km - alt_emissions) * distance_km
        
    elif activity_type == "food":
        is_plant_based = details.get("is_plant_based", True)
        if is_plant_based:
            co2_saved = 1.8  # Average meat meal vs plant meal
    
    elif activity_type == "energy":
        hours = details.get("hours", 4)
        co2_saved = hours * 0.05  # Phantom power reduction
    
    elif activity_type == "shopping":
        co2_saved = 0.5  # Reusable bag, secondhand, etc.
    
    return max(co2_saved, 0.1)  # Minimum 0.1kg


def calculate_xp(co2_saved_kg: float, category: str) -> int:
    """
    Calculate XP based on CO2 savings and category.
    """
    base_xp = 10
    co2_xp = min(int(co2_saved_kg * 5), 40)
    
    category_bonuses = {
        "transportation": 10,
        "food": 5,
        "energy": 5,
        "shopping": 5
    }
    
    total_xp = base_xp + co2_xp + category_bonuses.get(category, 0)
    return min(total_xp, 50)  # Cap at 50


def estimate_money_saved(category: str, co2_saved_kg: float) -> float:
    """
    Estimate money saved based on category.
    """
    if category == "transportation":
        # Assume $0.60 per km, CO2 saved ~0.25kg per km
        return (co2_saved_kg / 0.25) * 0.60
    elif category == "food":
        return 3.0  # Plant-based saves ~$3 per meal
    elif category == "energy":
        # $0.13 per kWh, CO2 saved ~0.42kg per kWh
        return (co2_saved_kg / 0.42) * 0.13
    
    return 0.0


async def update_user_stats(user_id: str, xp: int, co2: float, missions: int, money: float):
    """
    Update user profile stats after activity.
    """
    try:
        # Get current profile
        profile_response = supabase.table("user_profiles")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if not profile_response.data:
            print(f"No profile found for user {user_id}")
            return
        
        profile = profile_response.data[0]
        
        # Calculate new totals
        old_total_xp = profile.get("total_xp", 0)
        new_total_xp = old_total_xp + xp
        new_level = calculate_level(new_total_xp)
        old_level = profile.get("current_level", 1)
        
        # Calculate XP in current level
        level_threshold = get_level_threshold(new_level)
        xp_in_level = new_total_xp - level_threshold
        next_level_threshold = get_level_threshold(new_level + 1)
        xp_to_next = next_level_threshold - new_total_xp
        
        # Update profile
        
        # Calculate streak
        today = date.today()
        last_activity_str = profile.get("last_activity_date")
        current_streak = profile.get("current_streak_days", 0)
        longest_streak = profile.get("longest_streak_days", 0)
        
        if last_activity_str:
            try:
                # Handle both "YYYY-MM-DD" and full ISO timestamps if legacy data exists
                if "T" in last_activity_str:
                    last_activity_date = datetime.fromisoformat(last_activity_str).date()
                else:
                    last_activity_date = date.fromisoformat(last_activity_str)
                    
                if last_activity_date == today:
                    # Already active today, streak doesn't change
                    pass
                elif last_activity_date == today - timedelta(days=1):
                    # Consecutive day, increment streak
                    current_streak += 1
                else:
                    # Missed a day (or more), reset streak
                    current_streak = 1
            except ValueError:
                # If date format is bad, reset streak
                current_streak = 1
        else:
            # First activity
            current_streak = 1
            
        # Update longest streak
        if current_streak > longest_streak:
            longest_streak = current_streak
            
        # Update profile
        update_data = {
            "total_xp": new_total_xp,
            "current_level": new_level,
            "xp_current_level": xp_in_level,
            "xp_to_next_level": xp_to_next,
            "total_co2_saved": profile.get("total_co2_saved", 0) + co2,
            "total_missions_completed": profile.get("total_missions_completed", 0) + missions,
            "total_money_saved": profile.get("total_money_saved", 0) + money,
            "last_activity_date": today.isoformat(),
            "current_streak_days": current_streak,
            "longest_streak_days": longest_streak,
        }
        
        # Update plant stage if level increased
        if new_level > old_level:
            new_plant_stage = get_plant_stage(new_level)
            update_data["plant_stage"] = new_plant_stage
            print(f"🎉 Level up! {old_level} → {new_level}, Plant stage: {new_plant_stage}")
        
        print(f"Updating user stats: XP {old_total_xp} → {new_total_xp} (+{xp}), Level: {new_level}, CO2: +{co2}kg")
        
        supabase.table("user_profiles")\
            .update(update_data)\
            .eq("user_id", user_id)\
            .execute()
        
        print(f"✅ Successfully updated profile for user {user_id}")
        
    except Exception as e:
        print(f"❌ Error updating user stats: {e}")
        import traceback
        traceback.print_exc()


def calculate_level(total_xp: int) -> int:
    """Calculate level from total XP. Each level requires level * 100 XP."""
    level = 1
    xp_needed = 0
    
    while xp_needed <= total_xp:
        level += 1
        xp_needed += level * 100
    
    return level - 1


def get_level_threshold(level: int) -> int:
    """Get the XP threshold for a given level."""
    total = 0
    for i in range(2, level + 1):
        total += i * 100
    return total


def get_plant_stage(level: int) -> int:
    """Determine plant stage based on level."""
    if level <= 2:
        return 1
    elif level <= 4:
        return 2
    elif level <= 7:
        return 3
    elif level <= 10:
        return 4
    elif level <= 15:
        return 5
    elif level <= 20:
        return 6
    else:
        return 7


def get_category_emoji(category: str) -> str:
    """Get emoji for category."""
    emojis = {
        'transportation': '🚌',
        'food': '🥗',
        'energy': '⚡',
        'shopping': '🛍️',
    }
    return emojis.get(category, '🌱')


def get_time_ago(timestamp_str: str) -> str:
    """Convert timestamp to human-readable time ago."""
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now(timestamp.tzinfo)
        diff = now - timestamp
        
        if diff.days > 1:
            return f"{diff.days} days ago"
        elif diff.days == 1:
            return "Yesterday"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
    except:
        return "Recently"
