from fastapi import APIRouter
from app.database import supabase

router = APIRouter(
    prefix="/example",
    tags=["example"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def read_example():
    try:
        # Example query using Supabase client
        # response = supabase.table("your_table").select("*").execute()
        # return response.data
        return {"message": "Example route working", "supabase_connected": True}
    except Exception as e:
        return {"message": "Error connecting to Supabase", "error": str(e)}
