from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from app.database import supabase
import jwt
from app.config import get_settings

router = APIRouter(
    prefix="/survey",
    tags=["survey"],
    responses={404: {"description": "Not found"}},
)

settings = get_settings()

# Pydantic model for survey request
class SurveyRequest(BaseModel):
    commute_method: Optional[str] = None
    commute_distance: Optional[int] = None
    flight_frequency: Optional[str] = None
    diet_type: Optional[str] = None
    eating_out_frequency: Optional[str] = None
    cooking_habits: Optional[str] = None
    shopping_habits: Optional[List[str]] = None
    clothing_frequency: Optional[str] = None
    shopping_location: Optional[str] = None
    purchase_behavior: Optional[str] = None
    housing_type: Optional[str] = None
    energy_control: Optional[str] = None
    current_habits: Optional[List[str]] = None
    carbon_awareness: Optional[str] = None
    time_commitment: Optional[str] = None
    motivation: Optional[str] = None
    achievable_changes: Optional[str] = None

def get_user_id_from_token(authorization: str) -> str:
    """Extract user ID from Bearer token"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = authorization.replace("Bearer ", "")
        
        decoded = jwt.decode(
            token, 
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": False
            }
        )
        user_id = decoded.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID found")
        
        return user_id
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

@router.post("/")
async def submit_survey(
    survey_data: SurveyRequest,
    authorization: str = Header(None)
):
    """
    Submit or update user survey responses.
    Uses upsert to insert new survey or update existing one.
    """
    try:
        # Get user ID from token
        user_id = get_user_id_from_token(authorization)
        
        # Prepare data for database
        data = {
            "user_id": user_id,
            **survey_data.model_dump(exclude_none=False)
        }
        
        # Upsert into database (insert or update based on user_id)
        response = supabase.table("survey_responses").upsert(
            data,
            on_conflict="user_id"
        ).execute()
        
        return {
            "success": True,
            "message": "Survey response saved successfully",
            "survey_id": response.data[0]["id"] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving survey: {str(e)}")

@router.get("/")
async def get_survey(authorization: str = Header(None)):
    """
    Get user's survey response
    """
    try:
        # Get user ID from token
        user_id = get_user_id_from_token(authorization)
        
        # Query user's survey
        response = supabase.table("survey_responses").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            return {
                "success": False,
                "message": "No survey found for this user"
            }
        
        return {
            "success": True,
            "data": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving survey: {str(e)}")
