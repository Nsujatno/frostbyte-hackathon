from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import supabase
from app.routers.survey import get_user_id_from_token
from app.services.gemini_receipt_parser import gemini_receipt_parser
from app.services.climatiq_service import climatiq_service
from app.services.gemini_alternatives import gemini_alternatives_service

router = APIRouter(
    prefix="/receipts",
    tags=["receipts"],
    responses={404: {"description": "Not found"}},
)


class ScanReceiptRequest(BaseModel):
    image_base64: str


class AnalyzeReceiptRequest(BaseModel):
    receipt_scan_id: str


class SaveCommitmentsRequest(BaseModel):
    receipt_scan_id: str
    commitments: List[Dict[str, str]]  # List of {item_id, commitment_text}


@router.post("/scan")
async def scan_receipt(
    request: ScanReceiptRequest,
    authorization: str = Header(None)
):
    """
    Scan a receipt image using Google Cloud Vision API
    
    Returns:
        receipt_scan_id and extracted items
    """
    print("=== Starting receipt scan ===")
    
    try:
        user_id = get_user_id_from_token(authorization)
        print(f"User ID: {user_id}")
        
        # Extract text from receipt using Vision API
        print("Calling Gemini to parse receipt image")
        extracted_data = await gemini_receipt_parser.parse_receipt(request.image_base64)
        print(f"Gemini parsing completed: {len(extracted_data['items'])} items found")
        
        # Create receipt scan record
        receipt_data = {
            "user_id": user_id,
            "store_name": extracted_data.get("store_name"),
            "scan_date": extracted_data.get("scan_date"),
            "total_items": len(extracted_data["items"]),
            "total_co2_kg": 0,  # Will be updated in analyze step
            "xp_earned": 50  # Base XP for scanning
        }
        
        print("Creating receipt_scans record in database")
        receipt_response = supabase.table("receipt_scans").insert(receipt_data).execute()
        
        if not receipt_response.data:
            print("Failed to create receipt scan record")
            raise HTTPException(status_code=500, detail="Failed to save receipt scan")
        
        receipt_scan = receipt_response.data[0]
        receipt_scan_id = receipt_scan["id"]
        
        print(f"Receipt scan created with ID: {receipt_scan_id}")
        print("=== Receipt scan complete ===")
        
        return {
            "success": True,
            "receipt_scan_id": receipt_scan_id,
            "store_name": extracted_data.get("store_name"),
            "scan_date": extracted_data.get("scan_date"),
            "items": extracted_data["items"],
            "total_items": len(extracted_data["items"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in receipt scan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error scanning receipt: {str(e)}")


@router.post("/analyze")
async def analyze_receipt(
    request: AnalyzeReceiptRequest,
    authorization: str = Header(None)
):
    """
    Analyze receipt items for carbon footprint and alternatives
    
    Process:
    1. Calculate carbon footprint for each item (Climatiq)
    2. Get sustainable alternatives (Gemini)
    3. Check if user has previous commitments to these alternatives
    4. Calculate total CO2 and comparison metric
    5. Award XP to user
    """
    print(f"=== Starting receipt analysis for {request.receipt_scan_id} ===")
    
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Get receipt scan record
        receipt_response = supabase.table("receipt_scans")\
            .select("*")\
            .eq("id", request.receipt_scan_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not receipt_response.data:
            raise HTTPException(status_code=404, detail="Receipt scan not found")
        
        receipt_scan = receipt_response.data[0]
        
        # Get items from the scan (they should have been passed, but let's fetch from a temp storage)
        # For now, we'll need the items to be sent in the request
        # Let's modify this to accept items in the request
        
        print("Receipt analysis complete - this endpoint needs items data")
        
        # Return placeholder for now
        return {
            "success": True,
            "message": "Analysis endpoint ready - needs implementation with items data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in receipt analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing receipt: {str(e)}")


# Let me refactor to combine scan and analyze into one endpoint
@router.post("/scan-and-analyze")
async def scan_and_analyze_receipt(
    request: ScanReceiptRequest,
    authorization: str = Header(None)
):
    """
    Complete receipt processing: scan, analyze, and return full results
    """
    print("=== Starting full receipt scan and analysis ===")
    
    try:
        user_id = get_user_id_from_token(authorization)
        print(f"User ID: {user_id}")
        
        # Step 1: Extract text from receipt using Gemini
        print("Step 1: Calling Gemini to parse receipt image")
        extracted_data = await gemini_receipt_parser.parse_receipt(request.image_base64)
        print(f"Gemini parsing completed: {len(extracted_data['items'])} items found")
        
        if not extracted_data["items"]:
            raise HTTPException(status_code=400, detail="No items found on receipt")
        
        # Step 2: Create receipt scan record
        print("Step 2: Creating receipt_scans record")
        receipt_data = {
            "user_id": user_id,
            "store_name": extracted_data.get("store_name"),
            "scan_date": extracted_data.get("scan_date"),
            "total_items": len(extracted_data["items"]),
            "xp_earned": 50  # Base XP
        }
        
        receipt_response = supabase.table("receipt_scans").insert(receipt_data).execute()
        receipt_scan = receipt_response.data[0]
        receipt_scan_id = receipt_scan["id"]
        print(f"Receipt scan created: {receipt_scan_id}")
        
        # Step 3: Analyze each item
        print(f"Step 3: Analyzing {len(extracted_data['items'])} items")
        analyzed_items = []
        total_co2 = 0.0
        
        for idx, item in enumerate(extracted_data["items"]):
            print(f"Analyzing item {idx + 1}/{len(extracted_data['items'])}: {item['name']}")
            
            # Calculate carbon footprint with Climatiq
            print(f"  -> Calling Climatiq API for carbon calculation")
            carbon_kg = await climatiq_service.calculate_item_carbon(
                item["name"],
                "food"  # Category
            )
            print(f"  -> Carbon footprint: {carbon_kg} kg CO2")
            
            total_co2 += carbon_kg
            
            # Determine impact level
            if carbon_kg >= 10:
                impact_level = "high"
            elif carbon_kg >= 2:
                impact_level = "medium"
            else:
                impact_level = "low"
            
            # Get sustainable alternative from Gemini
            print(f"  -> Calling Gemini API for alternative suggestion")
            alternative = await gemini_alternatives_service.get_sustainable_alternative(
                item["name"],
                carbon_kg
            )
            print(f"  -> Alternative: {alternative.get('alternative_name', 'None')}")
            
            has_alternative = alternative.get("alternative_name") is not None
            
            # Check previous commitments for this alternative
            commitment_check = None
            if has_alternative:
                print(f"  -> Checking previous commitments")
                commitment_check = await check_previous_commitment(
                    user_id,
                    alternative["alternative_name"]
                )
                print(f"  -> Previous commitment: {commitment_check}")
            
            # Store item in database
            item_data = {
                "receipt_scan_id": receipt_scan_id,
                "item_name": item["name"],
                "price": item.get("price"),
                "carbon_footprint_kg": round(carbon_kg, 2),
                "impact_level": impact_level,
                "has_alternative": has_alternative,
                "alternative_name": alternative.get("alternative_name"),
                "alternative_carbon_kg": alternative.get("alternative_carbon_kg"),
                "carbon_savings_percent": alternative.get("carbon_savings_percent"),
                "price_difference": None,  # Gemini won't provide specific amounts
                "alternative_note": alternative.get("note")
            }
            
            item_response = supabase.table("receipt_items").insert(item_data).execute()
            stored_item = item_response.data[0]
            
            # Add to results
            analyzed_items.append({
                **stored_item,
                "had_previous_commitment": commitment_check
            })
        
        print(f"Step 4: All items analyzed. Total CO2: {total_co2} kg")
        
        # Step 4: Get comparison metric from Climatiq
        print("Step 5: Getting comparison metric")
        comparison_metric = await climatiq_service.get_comparison_metric(total_co2)
        print(f"Comparison: {comparison_metric}")
        
        # Step 5: Update receipt scan with totals
        print("Step 6: Updating receipt scan with totals")
        update_data = {
            "total_co2_kg": round(total_co2, 2),
            "comparison_metric": comparison_metric
        }
        
        supabase.table("receipt_scans")\
            .update(update_data)\
            .eq("id", receipt_scan_id)\
            .execute()
        
        # Step 6: Award XP to user
        print("Step 7: Awarding XP to user profile")
        await award_receipt_xp(user_id, 50)  # Base XP for scanning
        print("XP awarded successfully")
        
        # Step 7: Log activity to feed
        print("Step 8: Logging activity to feed")
        activity_data = {
            "user_id": user_id,
            "activity_type": "freeform",
            "user_input": f"🧾 Scanned receipt from {extracted_data.get('store_name', 'store')}",
            "ai_summary": f"Scanned {len(analyzed_items)} items and analyzed carbon footprint",
            "detected_category": "shopping",
            "xp_earned": 50,
            "co2_saved_kg": 0,
            "money_saved": None,
            "emoji": "🧾",
        }
        supabase.table("user_activities").insert(activity_data).execute()
        print("Activity logged successfully")
        
        # Check if user completed previous commitments for bonus XP
        commitment_bonus_awarded = await check_and_award_commitment_bonus(
            user_id,
            analyzed_items
        )
        
        print("=== Receipt scan and analysis complete ===")
        
        return {
            "success": True,
            "receipt_scan_id": receipt_scan_id,
            "store_name": extracted_data.get("store_name"),
            "scan_date": extracted_data.get("scan_date"),
            "total_items": len(analyzed_items),
            "total_co2_kg": round(total_co2, 2),
            "comparison_metric": comparison_metric,
            "xp_earned": 50,
            "commitment_bonus_xp": 50 if commitment_bonus_awarded else 0,
            "items": analyzed_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in receipt scan and analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing receipt: {str(e)}")


@router.get("/history")
async def get_receipt_history(
    authorization: str = Header(None),
    limit: int = 10
):
    """
    Get user's recent receipt scans
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Fetch receipt scans
        receipts_response = supabase.table("receipt_scans")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return {
            "success": True,
            "receipts": receipts_response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching receipt history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.get("/{receipt_id}/details")
async def get_receipt_details(
    receipt_id: str,
    authorization: str = Header(None)
):
    """
    Get detailed information about a specific receipt including all items
    """
    try:
        user_id = get_user_id_from_token(authorization)
        
        # Get receipt
        receipt_response = supabase.table("receipt_scans")\
            .select("*")\
            .eq("id", receipt_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not receipt_response.data:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        receipt = receipt_response.data[0]
        
        # Get all items for this receipt
        items_response = supabase.table("receipt_items")\
            .select("*")\
            .eq("receipt_scan_id", receipt_id)\
            .execute()
        
        return {
            "success": True,
            "receipt": receipt,
            "items": items_response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching receipt details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching details: {str(e)}")


@router.post("/commitments")
async def save_commitments(
    request: SaveCommitmentsRequest,
    authorization: str = Header(None)
):
    """
    Save user commitments to try sustainable alternatives
    Awards bonus XP if 3+ commitments made
    """
    print(f"=== Saving commitments for receipt {request.receipt_scan_id} ===")
    
    try:
        user_id = get_user_id_from_token(authorization)
        print(f"User {user_id} saving {len(request.commitments)} commitments")
        
        # Validate receipt belongs to user
        receipt_response = supabase.table("receipt_scans")\
            .select("id")\
            .eq("id", request.receipt_scan_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not receipt_response.data:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        # Save each commitment
        commitments_saved = 0
        for commitment_data in request.commitments:
            commitment = {
                "user_id": user_id,
                "receipt_scan_id": request.receipt_scan_id,
                "item_id": commitment_data["item_id"],
                "commitment_text": commitment_data["commitment_text"],
                "is_completed": False
            }
            
            print(f"Saving commitment: {commitment['commitment_text']}")
            supabase.table("user_commitments").insert(commitment).execute()
            commitments_saved += 1
        
        print(f"Successfully saved {commitments_saved} commitments")
        
        # Award bonus XP if 3+ commitments
        bonus_xp_awarded = False
        if commitments_saved >= 3:
            print("3+ commitments made, awarding bonus XP")
            await award_receipt_xp(user_id, 50)  # Bonus XP
            bonus_xp_awarded = True
            print("Bonus XP awarded")
        
        # Log commitment activity to feed
        print("Logging commitment activity to feed")
        activity_data = {
            "user_id": user_id,
            "activity_type": "freeform",
            "user_input": f"🌱 Committed to {commitments_saved} sustainable alternative{'s' if commitments_saved > 1 else ''}",
            "ai_summary": f"Made {commitments_saved} commitment{'s' if commitments_saved > 1 else ''} to try eco-friendly alternatives",
            "detected_category": "commitment",
            "xp_earned": 50 if bonus_xp_awarded else 0,
            "co2_saved_kg": 0,
            "money_saved": None,
            "emoji": "🌱",
        }
        supabase.table("user_activities").insert(activity_data).execute()
        print("Commitment activity logged successfully")
        
        print("=== Commitments saved successfully ===")
        
        return {
            "success": True,
            "commitments_saved": commitments_saved,
            "bonus_xp_awarded": bonus_xp_awarded,
            "bonus_xp": 50 if bonus_xp_awarded else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error saving commitments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving commitments: {str(e)}")


# Helper Functions

async def check_previous_commitment(user_id: str, alternative_name: str) -> Optional[Dict]:
    """
    Check if user has previously committed to this alternative
    """
    try:
        # Query commitments for this alternative
        commitment_response = supabase.table("user_commitments")\
            .select("*")\
            .eq("user_id", user_id)\
            .ilike("commitment_text", f"%{alternative_name}%")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if commitment_response.data:
            return commitment_response.data[0]
        return None
        
    except Exception as e:
        print(f"❌ Error checking previous commitment: {e}")
        return None


async def check_and_award_commitment_bonus(user_id: str, items: List[Dict]) -> bool:
    """
    Check if user followed through on commitments and award bonus XP
    """
    try:
        bonus_awarded = False
        
        for item in items:
            if item.get("had_previous_commitment"):
                # User committed to this alternative before and now bought it!
                commitment = item["had_previous_commitment"]
                
                # Mark commitment as completed
                supabase.table("user_commitments")\
                    .update({"is_completed": True, "completed_at": datetime.now().isoformat()})\
                    .eq("id", commitment["id"])\
                    .execute()
                
                # Award bonus XP (once per receipt)
                if not bonus_awarded:
                    print(f"User followed through on commitment! Awarding bonus XP")
                    await award_receipt_xp(user_id, 50)
                    bonus_awarded = True
        
        return bonus_awarded
        
    except Exception as e:
        print(f"❌ Error checking commitment bonus: {e}")
        return False


async def award_receipt_xp(user_id: str, xp_amount: int):
    """
    Award XP to user profile for receipt scanning
    """
    try:
        # Import the helper from activities router
        from app.routers.activities import update_user_stats
        
        # Award XP (0 CO2, 0 missions, 0 money since those are tracked separately)
        await update_user_stats(user_id, xp_amount, 0, 0, 0)
        
    except Exception as e:
        print(f"❌ Error awarding XP: {e}")
        raise
