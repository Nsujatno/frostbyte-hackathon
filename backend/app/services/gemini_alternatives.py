"""
Gemini AI Service for Sustainable Alternatives
Suggests eco-friendly alternatives for grocery items
"""

from typing import Dict, Optional
from app.config import get_settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json

settings = get_settings()


class GeminiAlternativesService:
    def __init__(self):
        """Initialize Gemini AI client"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-lite",
            api_key=settings.google_api_key,
            temperature=0.3,
        )
    
    async def get_sustainable_alternative(
        self, 
        item_name: str, 
        carbon_kg: float
    ) -> Dict[str, any]:
        """
        Get sustainable alternative suggestion for a grocery item
        
        Args:
            item_name: Name of the grocery item
            carbon_kg: Current carbon footprint in kg CO2
            
        Returns:
            Dict with alternative details or None if no better alternative exists
        """
        print(f"🤖 Gemini: Getting sustainable alternative for: {item_name} ({carbon_kg} kg CO2)")
        
        try:
            # Craft prompt to prevent hallucinating prices
            prompt = f"""You are a sustainability expert helping people make eco-friendly shopping choices.

Given this grocery item:
- Item: {item_name}
- Current carbon footprint: {carbon_kg} kg CO2

If there's a significantly more sustainable alternative (at least 20% less carbon):
1. Suggest the alternative product name
2. Estimate its carbon footprint (be conservative)
3. Calculate the percentage savings
4. Provide ONE of these price notes ONLY: "similar price", "slightly cheaper", "slightly more expensive", "much cheaper", "much more expensive"
5. Add a helpful tip or context in one sentence

CRITICAL: DO NOT include specific dollar amounts. Only use the exact price note phrases listed above.

If the item is already eco-friendly (low carbon) or there's no significantly better alternative:
- Set alternative_name to null
- Provide a brief encouraging note

Response format (JSON only, no markdown):
{{
  "alternative_name": "product name or null",
  "alternative_carbon_kg": number or null,
  "carbon_savings_percent": number or null,
  "price_note": "one of the phrases above or null",
  "note": "helpful tip or encouragement"
}}"""

            print("🤖 Gemini: Calling API for alternative suggestion...")
            
            messages = [
                SystemMessage(content="You are a sustainability expert. Always respond with valid JSON."),
                HumanMessage(content=prompt)
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
            
            print(f"🤖 Gemini: Response received (length: {len(text)} chars)")
            
            # Parse JSON response
            result = json.loads(text)
            
            print(f"🤖 Gemini: Alternative suggestion: {result.get('alternative_name', 'None')}")
            
            return result
            
        except Exception as e:
            print(f"❌ Gemini: Error getting alternative: {str(e)}")
            # Return a safe default
            return {
                "alternative_name": None,
                "alternative_carbon_kg": None,
                "carbon_savings_percent": None,
                "price_note": None,
                "note": "Unable to find alternative suggestions at this time"
            }


# Singleton instance
gemini_alternatives_service = GeminiAlternativesService()
