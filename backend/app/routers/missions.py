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
            "opportunity_areas": result["opportunity_areas"]
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
