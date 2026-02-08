import json
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
from app.database import supabase
from app.routers.survey import get_user_id_from_token
from app.services.shopping_agent import shopping_agent

router = APIRouter(
    prefix="/shopping",
    tags=["shopping"],
    responses={404: {"description": "Not found"}},
)


class GenerateListRequest(BaseModel):
    user_input: str


class SaveListRequest(BaseModel):
    shopping_list_id: str


@router.post("/generate-list")
async def generate_shopping_list(
    request: GenerateListRequest,
    authorization: str = Header(None)
):
    """
    Generate a personalized shopping list using the AI agent with streaming
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    
    print("🛒 === Starting shopping list generation (STREAMING) ===")
    
    try:
        user_id = get_user_id_from_token(authorization)
        print(f"User ID: {user_id}")
        print(f"User input: {request.user_input}")
        
        async def event_stream():
            """Stream agent iterations and final result"""
            final_data = None
            
            async for event in shopping_agent.run_streaming(request.user_input, user_id):
                # Send event to frontend
                yield f"data: {json.dumps(event)}\n\n"
                
                # Store final result
                if event.get("type") == "complete":
                    final_data = event
            
            # Save to database after streaming completes
            if final_data:
                print("Saving shopping list to database...")
                list_data = {
                    "user_id": user_id,
                    "user_input": request.user_input,
                    "items": final_data["shopping_list"],
                    "total_items": final_data["total_items"],
                    "estimated_co2_saved": final_data["estimated_co2_saved"],
                    "agent_iterations": final_data["iterations"]
                }
                
                list_response = supabase.table("shopping_lists").insert(list_data).execute()
                shopping_list_id = list_response.data[0]["id"] if list_response.data else None
                
                # Log to activity feed
                print("Logging to activity feed...")
                activity_data = {
                    "user_id": user_id,
                    "activity_type": "freeform",
                    "user_input": f"🛒 Used AI Shopping Assistant",
                    "ai_summary": f"Generated personalized shopping list with {final_data['total_items']} sustainable items",
                    "detected_category": "shopping",
                    "xp_earned": 25,
                    "co2_saved_kg": final_data["estimated_co2_saved"],
                    "money_saved": None,
                    "emoji": "🛒",
                }
                supabase.table("user_activities").insert(activity_data).execute()
                
                # Award XP
                print("Awarding XP...")
                from app.routers.activities import update_user_stats
                await update_user_stats(user_id, 25, final_data["estimated_co2_saved"], 0, 0)
                
                # Send final completion event with ID
                yield f"data: {json.dumps({'type': 'saved', 'shopping_list_id': shopping_list_id})}\n\n"
            
            print("=== Shopping list generation complete! ===")
        
        return StreamingResponse(event_stream(), media_type="text/event-stream")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating shopping list: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/complete-shopping")
async def complete_shopping(
    request: SaveListRequest,
    authorization: str = Header(None)
):
    """
    Mark shopping list as completed and award XP
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Get shopping list
        list_response = supabase.table("shopping_lists")\
            .select("*")\
            .eq("id", request.shopping_list_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not list_response.data:
            raise HTTPException(status_code=404, detail="Shopping list not found")
        
        shopping_list = list_response.data[0]
        
        # Mark as completed
        supabase.table("shopping_lists")\
            .update({"completed_at": datetime.now().isoformat()})\
            .eq("id", request.shopping_list_id)\
            .execute()
        
        # Award XP (100 XP for completing shopping)
        xp_earned = 100
        co2_saved = shopping_list.get("estimated_co2_saved", 0)
        
        # Log to activity feed
        activity_data = {
            "user_id": user_id,
            "activity_type": "freeform",
            "user_input": f"✅ Completed sustainable shopping",
            "ai_summary": f"Completed shopping list with {shopping_list['total_items']} sustainable items",
            "detected_category": "shopping",
            "xp_earned": xp_earned,
            "co2_saved_kg": co2_saved,
            "money_saved": None,
            "emoji": "✅",
        }
        supabase.table("user_activities").insert(activity_data).execute()
        
        # Award XP
        from app.routers.activities import update_user_stats
        await update_user_stats(user_id, xp_earned, co2_saved, 0, 0)
        
        return {
            "success": True,
            "xp_earned": xp_earned,
            "co2_saved": co2_saved
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error completing shopping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/history")
async def get_shopping_history(
    authorization: str = Header(None),
    limit: int = 10
):
    """
    Get user's shopping list history
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        lists = supabase.table("shopping_lists")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return {
            "success": True,
            "shopping_lists": lists.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
