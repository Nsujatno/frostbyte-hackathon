"""
Climatiq API Service
Handles carbon footprint calculations and comparison metrics
"""

import httpx
from typing import Dict, Optional
from app.config import get_settings

settings = get_settings()


class ClimatiqService:
    def __init__(self):
        """Initialize Climatiq API client"""
        self.api_key = settings.climatiq_api_key
        self.base_url = "https://api.climatiq.io/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def calculate_item_carbon(self, item_name: str, category: str = "food") -> float:
        """
        Calculate carbon footprint for a grocery item using Climatiq API
        
        Args:
            item_name: Name of the item
            category: Category of the item (default: food)
            
        Returns:
            CO2 footprint in kg
        """
        print(f"🌍 Climatiq: Calculating carbon footprint for: {item_name}")
        
        try:
            # Use a simplified approach with emission factors
            # Map common items to emission factor IDs
            emission_factor_id = self._get_emission_factor_id(item_name.lower())
            
            # Default weight/amount for estimation
            amount = 1.0
            
            # Call Climatiq API
            print(f"🌍 Climatiq: Calling API with emission factor: {emission_factor_id}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/estimate",
                    headers=self.headers,
                    json={
                        "emission_factor": {
                            "id": emission_factor_id
                        },
                        "parameters": {
                            "weight": amount,
                            "weight_unit": "kg"
                        }
                    },
                    timeout=10.0
                )
                
                print(f"🌍 Climatiq: API response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    co2_kg = data.get("co2e", 0)
                    print(f"✅ Climatiq: Carbon footprint calculated: {co2_kg} kg CO2")
                    return co2_kg
                else:
                    print(f"⚠️ Climatiq: API error {response.status_code}, using fallback estimation")
                    return self._fallback_estimation(item_name)
                    
        except Exception as e:
            print(f"❌ Climatiq: Error calling API: {str(e)}, using fallback")
            return self._fallback_estimation(item_name)
    
    def _get_emission_factor_id(self, item_name: str) -> str:
        """
        Map item name to Climatiq emission factor ID
        
        This is a simplified mapping. In production, you'd want a more comprehensive database.
        """
        # Common food categories from Climatiq's database
        if any(meat in item_name for meat in ['beef', 'steak', 'burger']):
            return "consumer_goods-type_meat_products_beef"
        elif 'chicken' in item_name or 'poultry' in item_name:
            return "consumer_goods-type_meat_products_poultry"
        elif 'pork' in item_name:
            return "consumer_goods-type_meat_products_pork"
        elif 'fish' in item_name:
            return "consumer_goods-type_fish_products"
        elif 'milk' in item_name or 'dairy' in item_name:
            return "consumer_goods-type_dairy_products"
        elif any(veg in item_name for veg in ['vegetable', 'carrot', 'broccoli', 'lettuce']):
            return "consumer_goods-type_vegetables"
        elif any(fruit in item_name for fruit in ['fruit', 'apple', 'banana', 'orange', 'berry']):
            return "consumer_goods-type_fruit"
        else:
            # Default to general food category
            return "consumer_goods-type_food_products"
    
    def _fallback_estimation(self, item_name: str) -> float:
        """
        Fallback carbon estimation when API is unavailable
        Based on typical carbon footprints (kg CO2 per kg of product)
        """
        item_lower = item_name.lower()
        
        # High carbon items
        if any(meat in item_lower for meat in ['beef', 'steak', 'burger', 'lamb']):
            return 27.0
        elif 'cheese' in item_lower:
            return 13.5
        elif any(meat in item_lower for meat in ['pork', 'bacon', 'ham']):
            return 12.0
        elif 'chicken' in item_lower or 'poultry' in item_lower:
            return 6.9
        
        # Medium carbon items
        elif 'fish' in item_lower:
            return 6.0
        elif 'milk' in item_lower:
            return 3.2
        elif 'rice' in item_lower:
            return 2.7
        elif 'egg' in item_lower:
            return 4.8
        
        # Low carbon items
        elif any(veg in item_lower for veg in ['vegetable', 'carrot', 'broccoli', 'lettuce', 'spinach']):
            return 0.4
        elif any(fruit in item_lower for fruit in ['banana', 'apple', 'orange', 'berry']):
            return 0.7
        elif 'bean' in item_lower or 'lentil' in item_lower:
            return 0.9
        
        # Default medium-low
        return 2.0
    
    async def get_comparison_metric(self, co2_kg: float) -> str:
        """
        Get human-readable comparison for CO2 amount
        
        Args:
            co2_kg: Amount of CO2 in kilograms
            
        Returns:
            Comparison string (e.g., "driving 68 miles")
        """
        print(f"🌍 Climatiq: Getting comparison metric for {co2_kg} kg CO2")
        
        try:
            # CO2 per mile driven in a car: ~0.42 kg
            miles_driven = round(co2_kg / 0.42, 1)
            
            # Also calculate other comparisons
            # Smartphone charging: ~0.008 kg per full charge
            phone_charges = round(co2_kg / 0.008, 0)
            
            # Choose most relevant comparison
            if co2_kg > 10:
                metric = f"driving {miles_driven} miles"
            elif co2_kg > 1:
                metric = f"{phone_charges} smartphone charges"
            else:
                # For small amounts, use daily comparison
                days_breathing = round(co2_kg / 0.9, 1)  # ~0.9 kg CO2 per day breathing
                metric = f"{days_breathing} days of breathing"
            
            print(f"✅ Climatiq: Comparison metric: {metric}")
            return metric
            
        except Exception as e:
            print(f"❌ Climatiq: Error generating comparison metric: {str(e)}")
            return f"{co2_kg} kg CO2"


# Singleton instance
climatiq_service = ClimatiqService()
