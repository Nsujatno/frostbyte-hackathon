"""
Gemini Receipt Parser Service
Parses receipt images using Gemini 2.0 Flash Lite vision capabilities
"""

from typing import Dict, List
from app.config import get_settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
import base64

settings = get_settings()


class GeminiReceiptParser:
    def __init__(self):
        """Initialize Gemini AI client with vision capabilities"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-lite",
            api_key=settings.google_api_key,
            temperature=0,  # Consistent parsing
        )
    
    async def parse_receipt(self, image_base64: str) -> Dict:
        """
        Parse a receipt image to extract items and metadata
        
        Args:
            image_base64: Base64-encoded receipt image
            
        Returns:
            Dict with store_name, scan_date, and items list
        """
        print("📸 Gemini Parser: Starting receipt parsing...")
        
        try:
            # Create prompt for structured receipt parsing
            prompt = """Analyze this receipt image and extract the following information in JSON format:

1. Store name (if visible)
2. Purchase date (if visible, format as YYYY-MM-DD)
3. List of purchased items with names and prices

For each item:
- Extract the item name (clean and readable)
- Extract the price (as a number)

Response format (JSON only, no markdown):
{
  "store_name": "Store Name" or null,
  "scan_date": "YYYY-MM-DD" or null,
  "items": [
    {"name": "Item Name", "price": 0.00}
  ]
}

IMPORTANT: 
- Only include items you can clearly read
- If you can't determine store name or date, set to null
- Ensure prices are numbers (not strings)
- Do not include tax, subtotal, or total as items
"""

            print("🤖 Gemini Parser: Sending image to Gemini API...")
            
            # Create message with image
            messages = [
                SystemMessage(content="You are a receipt parser. Always respond with valid JSON."),
                HumanMessage(content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": f"data:image/jpeg;base64,{image_base64}"}
                ])
            ]
            
            response = await self.llm.ainvoke(messages)
            text = response.content.strip()
            
            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            print(f"🤖 Gemini Parser: Response received (length: {len(text)} chars)")
            
            # Parse JSON response
            result = json.loads(text)
            
            print(f"🤖 Gemini Parser: Parsed {len(result.get('items', []))} items")
            print(f"🤖 Gemini Parser: Store: {result.get('store_name', 'Unknown')}")
            
            return result
            
        except Exception as e:
            print(f"❌ Gemini Parser: Error parsing receipt: {str(e)}")
            # Return minimal valid response
            return {
                "store_name": None,
                "scan_date": None,
                "items": []
            }


# Singleton instance
gemini_receipt_parser = GeminiReceiptParser()
