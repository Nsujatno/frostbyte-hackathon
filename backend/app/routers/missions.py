from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database import supabase
from app.langgraph_workflow import mission_workflow, WorkflowState
from app.routers.survey import get_user_id_from_token

router = APIRouter(
    prefix="/missions",
    tags=["missions"],
    responses={404: {"description": "Not found"}},
)


class MissionGenerateResponse(BaseModel):
    success: bool
    user_profile: Dict[str, Any]
    missions: List[Dict[str, Any]]
    message: Optional[str] = None


@router.post("/generate", response_model=MissionGenerateResponse)
async def generate_missions(authorization: str = Header(None)):
    """
    Generate personalized missions for a user based on their survey responses.
    
    Flow:
    1. Get user ID from auth token
    2. Fetch survey data from Supabase
    3. Run LangGraph workflow to generate missions
    4. Store user profile and missions in Supabase
    5. Return results
    """
    try:
        # Get user ID from token
        user_id = get_user_id_from_token(authorization)
        
        # Fetch survey data
        survey_response = supabase.table("survey_responses").select("*").eq("user_id", user_id).execute()
        
        if not survey_response.data:
            raise HTTPException(
                status_code=404, 
                detail="Survey not found. Please complete the survey first."
            )
        
        survey_data = survey_response.data[0]
        
        # Remove metadata fields for cleaner data
        survey_cleaned = {k: v for k, v in survey_data.items() if k not in ["id", "user_id", "created_at", "updated_at"]}
        
        # Initialize workflow state
        initial_state: WorkflowState = {
            "user_id": user_id,
            "survey_data": survey_cleaned,
            "baseline_co2_kg": 0.0,
            "profile_type": "BEGINNER",
            "opportunity_areas": [],
            "missions": [],
            "error": None
        }
        
        # Run the LangGraph workflow
        result = await mission_workflow.ainvoke(initial_state)
        
        if result.get("error"):
            print(f"Workflow error: {result['error']}")
            # Continue with fallback missions
        
        # Store user profile in Supabase
        profile_data = {
            "user_id": user_id,
            "profile_type": result["profile_type"],
            "baseline_co2_kg": result["baseline_co2_kg"],
            "opportunity_areas": result["opportunity_areas"],
            # Initialize XP and leveling
            "total_xp": 0,
            "current_level": 1,
            "xp_current_level": 0,
            "xp_to_next_level": 100,
            # Initialize plant
            "plant_stage": 1,
            "plant_type": "oak",
            # Initialize stats (will be updated as missions complete)
            "total_co2_saved": 0.0,
            "total_missions_completed": 0,
            "total_money_saved": 0.0,
            # Initialize streak
            "current_streak_days": 0,
            "longest_streak_days": 0
        }
        
        profile_response = supabase.table("user_profiles").upsert(
            profile_data,
            on_conflict="user_id"
        ).execute()
        
        # Store missions in Supabase
        missions_to_insert = []
        for mission in result["missions"]:
            mission_data = {
                "user_id": user_id,
                "title": mission["title"],
                "description": mission["description"],
                "category": mission["category"],
                "co2_saved_kg": mission.get("co2_saved_kg"),
                "money_saved": mission.get("money_saved"),
                "xp_reward": mission["xp_reward"],
                "mission_type": mission["mission_type"],
                "tips": mission.get("tips", []),
                "status": "available"
            }
            missions_to_insert.append(mission_data)
        
        # Delete existing missions for this user first
        supabase.table("user_missions").delete().eq("user_id", user_id).execute()
        
        # Insert new missions
        missions_response = supabase.table("user_missions").insert(missions_to_insert).execute()
        
        return MissionGenerateResponse(
            success=True,
            user_profile={
                "profile_type": result["profile_type"],
                "baseline_co2_kg": result["baseline_co2_kg"],
                "opportunity_areas": result["opportunity_areas"]
            },
            missions=result["missions"],
            message="Missions generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating missions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating missions: {str(e)}"
        )


@router.get("/")
async def get_user_missions(authorization: str = Header(None)):
    """
    Get all missions for the authenticated user.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Fetch missions
        response = supabase.table("user_missions").select("*").eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "missions": response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching missions: {str(e)}")


@router.get("/profile")
async def get_user_profile(authorization: str = Header(None)):
    """
    Get the user's profile analysis.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Fetch profile
        response = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {
            "success": True,
            "profile": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching profile: {str(e)}")


@router.get("/stats")
async def get_user_stats(authorization: str = Header(None)):
    """
    Get comprehensive user statistics for the dashboard.
    Includes XP, level, plant info, lifetime stats, and equivalents.
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Fetch profile
        profile_response = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        
        if not profile_response.data:
            # Return default stats if profile doesn't exist yet
            return {
                "success": True,
                "stats": {
                    "xp": {
                        "total_xp": 0,
                        "current_level": 1,
                        "xp_current_level": 0,
                        "xp_to_next_level": 100,
                        "level_progress_percent": 0
                    },
                    "plant": {
                        "stage": 1,
                        "type": "oak",
                        "stage_name": "Seed"
                    },
                    "impact": {
                        "total_co2_saved": 0.0,
                        "total_missions_completed": 0,
                        "total_money_saved": 0.0,
                        "current_streak_days": 0,
                        "longest_streak_days": 0
                    },
                    "equivalents": {
                        "trees_planted": 0.0,
                        "miles_not_driven": 0.0,
                        "led_hours": 0.0
                    }
                }
            }
        
        profile = profile_response.data[0]
        
        # Calculate level progress percentage
        xp_current = profile.get("xp_current_level", 0)
        xp_needed = profile.get("xp_to_next_level", 100)
        level_progress = round((xp_current / xp_needed) * 100) if xp_needed > 0 else 0
        
        # Calculate equivalents
        co2_saved = profile.get("total_co2_saved", 0.0)
        trees_planted = round(co2_saved / 22.0, 1)  # ~22kg CO2 per tree/year
        miles_not_driven = round(co2_saved / 0.404, 1)  # ~0.404kg CO2 per mile
        led_hours = round(co2_saved / 0.006, 0)  # ~0.006kg CO2 per LED hour
        
        # Map plant stage to name
        plant_stage_names = {
            1: "Seed",
            2: "Sprout",
            3: "Seedling",
            4: "Young Tree",
            5: "Mature Tree",
            6: "Ancient Tree",
            7: "Forest Guardian"
        }
        
        return {
            "success": True,
            "stats": {
                "xp": {
                    "total_xp": profile.get("total_xp", 0),
                    "current_level": profile.get("current_level", 1),
                    "xp_current_level": xp_current,
                    "xp_to_next_level": xp_needed,
                    "level_progress_percent": level_progress
                },
                "plant": {
                    "stage": profile.get("plant_stage", 1),
                    "type": profile.get("plant_type", "oak"),
                    "stage_name": plant_stage_names.get(profile.get("plant_stage", 1), "Seed")
                },
                "impact": {
                    "total_co2_saved": profile.get("total_co2_saved", 0.0),
                    "total_missions_completed": profile.get("total_missions_completed", 0),
                    "total_money_saved": profile.get("total_money_saved", 0.0),
                    "current_streak_days": profile.get("current_streak_days", 0),
                    "longest_streak_days": profile.get("longest_streak_days", 0)
                },
                "equivalents": {
                    "trees_planted": trees_planted,
                    "miles_not_driven": miles_not_driven,
                    "led_hours": led_hours
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching stats: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

