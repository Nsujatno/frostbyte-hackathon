"""
LangGraph workflow for generating personalized carbon reduction missions.

This workflow:
1. Fetches user survey data
2. Calculates CO2 footprint using Climatiq.io API
3. Classifies user profile (BEGINNER/INTERMEDIATE/EXPERT)
4. Generates 8-12 personalized missions using Gemini
5. Formats output for database storage
"""

from typing import TypedDict, List, Dict, Any, Annotated
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import httpx
import json
from app.config import get_settings

settings = get_settings()


class WorkflowState(TypedDict):
    """State maintained throughout the workflow"""
    user_id: str
    survey_data: Dict[str, Any]
    baseline_co2_kg: float
    profile_type: str
    opportunity_areas: List[str]
    missions: List[Dict[str, Any]]
    error: str | None


async def calculate_co2_footprint(state: WorkflowState) -> WorkflowState:
    """
    Calculate CO2 footprint using Climatiq.io API based on survey responses.
    
    Falls back to estimated calculations if API call fails.
    """
    survey = state["survey_data"]
    
    try:
        # Use Climatiq.io API for accurate calculations
        async with httpx.AsyncClient() as client:
            total_co2 = 0.0
            
            # Transportation emissions
            if survey.get("commute_method") and survey.get("commute_distance"):
                commute_emissions = await _calculate_transportation_emissions(
                    client, survey["commute_method"], survey.get("commute_distance", 0)
                )
                total_co2 += commute_emissions
            
            # Flight emissions
            if survey.get("flight_frequency"):
                flight_emissions = await _calculate_flight_emissions(
                    client, survey["flight_frequency"]
                )
                total_co2 += flight_emissions
            
            # Food emissions
            if survey.get("diet_type"):
                food_emissions = await _calculate_food_emissions(
                    client, survey["diet_type"]
                )
                total_co2 += food_emissions
            
            state["baseline_co2_kg"] = round(total_co2, 2)
            
    except Exception as e:
        print(f"Climatiq API error: {e}. Using estimated calculations.")
        # Fallback to estimated calculations
        state["baseline_co2_kg"] = _estimate_co2_footprint(survey)
    
    return state


async def _calculate_transportation_emissions(
    client: httpx.AsyncClient, 
    commute_method: str, 
    distance_miles: int
) -> float:
    """Calculate transportation emissions via Climatiq API"""
    
    # Map survey options to Climatiq activity types
    activity_map = {
        "I drive alone": "passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na",
        "I carpool with others": "passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na",
        "Public transportation (bus, train, subway)": "passenger_train-route_type_commuter_rail",
        "I bike": None,  # Zero emissions
        "I walk": None,  # Zero emissions
        "I work/study from home": None,  # Zero emissions
        "Mix of multiple methods": "passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na"
    }
    
    activity_id = activity_map.get(commute_method)
    
    if not activity_id:
        return 0.0  # Zero emissions for bike/walk/home
    
    # Convert miles to km (Climatiq uses metric)
    distance_km = distance_miles * 1.60934
    
    # Calculate monthly emissions (assuming 20 work days/month, round trip)
    monthly_distance_km = distance_km * 2 * 20
    
    try:
        response = await client.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers={
                "Authorization": f"Bearer {settings.climatiq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "emission_factor": {
                    "activity_id": activity_id,
                    "source": "EPA",
                    "region": "US",
                    "year": "2024"
                },
                "parameters": {
                    "distance": monthly_distance_km,
                    "distance_unit": "km"
                }
            },
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            # Climatiq returns kg CO2e
            return data.get("co2e", 0.0)
        else:
            # Fallback estimation
            return _estimate_transport_co2(commute_method, distance_miles)
            
    except Exception as e:
        print(f"Climatiq transport API error: {e}")
        return _estimate_transport_co2(commute_method, distance_miles)


async def _calculate_flight_emissions(
    client: httpx.AsyncClient, 
    flight_frequency: str
) -> float:
    """Calculate flight emissions via Climatiq API"""
    
    # Map frequency to estimated miles
    flight_miles_map = {
        "Never or almost never": 0,
        "1-2 times": 2000,  # ~1 round trip domestic
        "3-5 times": 5000,
        "6-10 times": 10000,
        "More than 10 times": 15000
    }
    
    miles = flight_miles_map.get(flight_frequency, 0)
    
    if miles == 0:
        return 0.0
    
    # Convert to km
    km = miles * 1.60934
    
    try:
        response = await client.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers={
                "Authorization": f"Bearer {settings.climatiq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "emission_factor": {
                    "activity_id": "passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_na-rf_included",
                    "source": "EPA",
                    "region": "US",
                    "year": "2024"
                },
                "parameters": {
                    "distance": km,
                    "distance_unit": "km",
                    "passengers": 1
                }
            },
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("co2e", 0.0)
        else:
            return _estimate_flight_co2(flight_frequency)
            
    except Exception as e:
        print(f"Climatiq flight API error: {e}")
        return _estimate_flight_co2(flight_frequency)


async def _calculate_food_emissions(
    client: httpx.AsyncClient, 
    diet_type: str
) -> float:
    """Estimate food emissions based on diet type"""
    
    # Monthly kg CO2e estimates based on literature
    diet_emissions_map = {
        "I eat meat with most meals": 250,
        "I eat meat several times a week": 180,
        "I eat meat occasionally (1-2x/week)": 120,
        "Pescatarian (fish but no meat)": 90,
        "Vegetarian": 60,
        "Vegan": 40
    }
    
    return diet_emissions_map.get(diet_type, 150)


def _estimate_co2_footprint(survey: Dict[str, Any]) -> float:
    """Fallback CO2 estimation when API is unavailable"""
    total = 0.0
    
    # Transportation
    if survey.get("commute_method"):
        total += _estimate_transport_co2(
            survey["commute_method"], 
            survey.get("commute_distance", 0)
        )
    
    # Flights
    if survey.get("flight_frequency"):
        total += _estimate_flight_co2(survey["flight_frequency"])
    
    # Food
    if survey.get("diet_type"):
        diet_map = {
            "I eat meat with most meals": 250,
            "I eat meat several times a week": 180,
            "I eat meat occasionally (1-2x/week)": 120,
            "Pescatarian (fish but no meat)": 90,
            "Vegetarian": 60,
            "Vegan": 40
        }
        total += diet_map.get(survey["diet_type"], 150)
    
    return round(total, 2)


def _estimate_transport_co2(commute_method: str, distance_miles: int) -> float:
    """Fallback transport estimation"""
    # kg CO2 per mile estimates
    emissions_per_mile = {
        "I drive alone": 0.404,
        "I carpool with others": 0.202,  # Divided by 2
        "Public transportation (bus, train, subway)": 0.14,
        "I bike": 0,
        "I walk": 0,
        "I work/study from home": 0,
        "Mix of multiple methods": 0.25
    }
    
    rate = emissions_per_mile.get(commute_method, 0.25)
    # Monthly: distance × 2 (round trip) × 20 days
    return rate * distance_miles * 2 * 20


def _estimate_flight_co2(flight_frequency: str) -> float:
    """Fallback flight estimation"""
    flight_co2_map = {
        "Never or almost never": 0,
        "1-2 times": 400,
        "3-5 times": 1000,
        "6-10 times": 2000,
        "More than 10 times": 3000
    }
    return flight_co2_map.get(flight_frequency, 0)


def classify_user_profile(state: WorkflowState) -> WorkflowState:
    """
    Classify user as BEGINNER, INTERMEDIATE, or EXPERT based on survey responses.
    """
    survey = state["survey_data"]
    
    # Factors for classification
    time_commitment = survey.get("time_commitment", "")
    carbon_awareness = survey.get("carbon_awareness", "")
    achievable_changes = survey.get("achievable_changes", "")
    current_habits = survey.get("current_habits", [])
    
    # Count current sustainable habits
    habit_count = len(current_habits) if isinstance(current_habits, list) else 0
    
    # Classify based on multiple factors
    beginner_score = 0
    intermediate_score = 0
    expert_score = 0
    
    # Time commitment scoring
    if "5-10 minutes" in time_commitment:
        beginner_score += 3
    elif "15-30 minutes" in time_commitment or "30-60 minutes" in time_commitment:
        intermediate_score += 3
    elif "1+ hours" in time_commitment:
        expert_score += 3
    
    # Awareness scoring
    if "no idea" in carbon_awareness:
        beginner_score += 2
    elif "rough sense" in carbon_awareness:
        intermediate_score += 2
    elif "calculated it" in carbon_awareness or "actively track" in carbon_awareness:
        expert_score += 2
    
    # Current habits
    if habit_count == 0 or (habit_count == 1 and "None of these yet" in str(current_habits)):
        beginner_score += 2
    elif habit_count <= 3:
        intermediate_score += 2
    else:
        expert_score += 2
    
    # Achievable changes
    if "Tiny habits" in achievable_changes:
        beginner_score += 1
    elif "Small weekly" in achievable_changes or "Monthly commitments" in achievable_changes:
        intermediate_score += 1
    elif "Bigger lifestyle" in achievable_changes or "ready for all" in achievable_changes:
        expert_score += 1
    
    # Determine final classification
    max_score = max(beginner_score, intermediate_score, expert_score)
    if max_score == expert_score:
        state["profile_type"] = "EXPERT"
    elif max_score == intermediate_score:
        state["profile_type"] = "INTERMEDIATE"
    else:
        state["profile_type"] = "BEGINNER"
    
    return state


def identify_opportunities(state: WorkflowState) -> WorkflowState:
    """
    Identify top 3 opportunity areas based on CO2 impact and user lifestyle.
    """
    survey = state["survey_data"]
    opportunities = []
    
    # Calculate impact potential for each category
    impact_scores = {}
    
    # Transportation impact
    transport_score = 0
    if survey.get("commute_method") in ["I drive alone", "Mix of multiple methods"]:
        transport_score += 3
    if survey.get("commute_distance", 0) > 10:
        transport_score += 2
    if "More than" in survey.get("flight_frequency", ""):
        transport_score += 2
    impact_scores["transportation"] = transport_score
    
    # Food impact
    food_score = 0
    if "meat with most meals" in survey.get("diet_type", ""):
        food_score += 3
    if "Daily" in survey.get("eating_out_frequency", "") or "4-6 times" in survey.get("eating_out_frequency", ""):
        food_score += 2
    if "don't cook" in survey.get("cooking_habits", "") or "Rarely" in survey.get("cooking_habits", ""):
        food_score += 1
    impact_scores["food"] = food_score
    
    # Shopping impact
    shopping_score = 0
    if "Monthly" in survey.get("clothing_frequency", ""):
        shopping_score += 2
    if "Buy it new immediately" == survey.get("purchase_behavior"):
        shopping_score += 2
    if "Mostly online" in survey.get("shopping_location", ""):
        shopping_score += 1
    impact_scores["shopping"] = shopping_score
    
    # Energy impact
    energy_score = 0
    if "Full control" in survey.get("energy_control", "") or "Some control" in survey.get("energy_control", ""):
        energy_score += 3
    if "House" in survey.get("housing_type", ""):
        energy_score += 2
    impact_scores["energy"] = energy_score
    
    # Sort by score and get top 3
    sorted_areas = sorted(impact_scores.items(), key=lambda x: x[1], reverse=True)
    state["opportunity_areas"] = [area for area, score in sorted_areas[:3] if score > 0]
    
    # Ensure at least one opportunity
    if not state["opportunity_areas"]:
        state["opportunity_areas"] = ["transportation", "food", "energy"]
    
    return state


async def generate_missions(state: WorkflowState) -> WorkflowState:
    """
    Generate 8-12 personalized missions using Gemini 2.5 Flash.
    """
    
    # Initialize Gemini model
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-preview-09-2025",
        api_key=settings.google_api_key,
        temperature=0.7,
    )
    
    # Prepare the prompt with user context
    system_prompt = """You are an AI sustainability coach analyzing a user's onboarding survey to create a personalized carbon reduction plan.

INPUT: User survey responses including transportation habits, diet, shopping behavior, energy usage, current habits, time commitment, and motivation.

YOUR TASK:
1. Generate 8-12 personalized missions that are:
   - SPECIFIC and ACTIONABLE (not "reduce meat" but "try one meatless meal this week")
   - FEASIBLE given their constraints (don't suggest biking if they commute 30 miles)
   - MATCHED to time commitment (quick wins for busy users)
   - ALIGNED with motivation (show $ savings if money-motivated)
   - DISTRIBUTED: 60% easy (10-20 XP), 30% medium (30-50 XP), 10% challenging (60-100 XP)

2. For each mission include:
   - Title (short, clear action)
   - Description (2-3 sentences explaining what to do)
   - Category (transportation/food/energy/shopping)
   - Estimated CO2 saved (kg)
   - Money saved ($ if applicable)
   - XP reward
   - 2-3 helpful tips
   - Mission type (one_time/repeatable/streak)

CONSTRAINTS:
- Never suggest extreme changes (going vegan, selling car, moving houses)
- Respect their current situation (don't suggest meal prep if they never cook)
- Focus on highest ROI actions for their profile
- Make missions feel achievable, not overwhelming

OUTPUT FORMAT: JSON array of mission objects.

EXAMPLE GOOD MISSIONS:
- "Unplug your phone charger before bed tonight"
- "Try a plant-based lunch option once this week"
- "Combine two errands into one trip"
- "Use a reusable water bottle today"

EXAMPLE BAD MISSIONS:
- "Go vegetarian"
- "Start biking to work"
- "Never buy clothes again"
- "Switch to renewable energy"
"""
    
    user_context = f"""
User Profile:
- Profile Type: {state['profile_type']}
- Baseline CO2: {state['baseline_co2_kg']} kg/month
- Top Opportunities: {', '.join(state['opportunity_areas'])}

Survey Responses:
{json.dumps(state['survey_data'], indent=2)}

Generate 8-12 personalized missions as a JSON array. Each mission object should have:
{{
  "title": "...",
  "description": "...",
  "category": "transportation|food|energy|shopping",  // CATEGORY = what area of life (transportation, food, etc)
  "co2_saved_kg": 0.0,
  "money_saved": 0.0,
  "xp_reward": 0,
  "tips": ["...", "...", "..."],
  "mission_type": "one_time|repeatable|streak"  // MISSION_TYPE = how often user can do it (one_time, repeatable, streak). NOT the category!
}}

IMPORTANT: 
- "category" must be one of: transportation, food, energy, shopping
- "mission_type" must be one of: one_time, repeatable, streak
- These are DIFFERENT fields! Do not confuse them!
"""
    
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_context)
        ]
        
        response = await llm.ainvoke(messages)
        
        # Parse the response
        content = response.content
        
        # Extract JSON from markdown code blocks if present
        if "```json" in content:
            json_start = content.find("```json") + 7
            json_end = content.find("```", json_start)
            content = content[json_start:json_end].strip()
        elif "```" in content:
            json_start = content.find("```") + 3
            json_end = content.find("```", json_start)
            content = content[json_start:json_end].strip()
        
        missions = json.loads(content)
        
        # Validate missions
        if not isinstance(missions, list) or len(missions) < 8:
            raise ValueError("Invalid missions format or too few missions")
        
        # Validate and sanitize each mission
        valid_mission_types = ["one_time", "repeatable", "streak"]
        valid_categories = ["transportation", "food", "energy", "shopping"]
        
        for mission in missions:
            # Ensure mission_type is valid (default to "one_time" if invalid)
            if mission.get("mission_type") not in valid_mission_types:
                print(f"Invalid mission_type '{mission.get('mission_type')}' for mission '{mission.get('title')}', defaulting to 'one_time'")
                mission["mission_type"] = "one_time"
            
            # Ensure category is valid (default to first opportunity area if invalid)
            if mission.get("category") not in valid_categories:
                print(f"Invalid category '{mission.get('category')}' for mission '{mission.get('title')}', defaulting to '{state['opportunity_areas'][0]}'")
                mission["category"] = state['opportunity_areas'][0] if state['opportunity_areas'] else "energy"
        
        state["missions"] = missions
        state["error"] = None
        
    except Exception as e:
        print(f"Error generating missions: {e}")
        state["error"] = str(e)
        # Provide fallback missions
        state["missions"] = _generate_fallback_missions(state)
    
    return state


def _generate_fallback_missions(state: WorkflowState) -> List[Dict[str, Any]]:
    """Generate basic fallback missions if LLM fails"""
    return [
        {
            "title": "Use a reusable water bottle today",
            "description": "Skip the disposable plastic bottles and bring your own reusable water bottle. This simple switch saves plastic waste and money.",
            "category": "shopping",
            "co2_saved_kg": 0.5,
            "money_saved": 2.0,
            "xp_reward": 10,
            "tips": [
                "Keep your bottle in your bag",
                "Add flavor with lemon or cucumber",
                "Clean it daily for freshness"
            ],
            "mission_type": "one_time"
        },
        {
            "title": "Unplug devices before bed tonight",
            "description": "Before you go to sleep, unplug phone chargers, laptop chargers, and other devices that draw phantom power when not in use.",
            "category": "energy",
            "co2_saved_kg": 1.2,
            "money_saved": 1.5,
            "xp_reward": 15,
            "tips": [
                "Use a power strip for easy unplugging",
                "Make it part of your bedtime routine",
                "Focus on bedroom and office first"
            ],
            "mission_type": "repeatable"
        },
        {
            "title": "Try one meatless meal this week",
            "description": "Choose one day this week and opt for a vegetarian or plant-based meal. Explore new flavors while reducing your carbon footprint.",
            "category": "food",
            "co2_saved_kg": 2.3,
            "money_saved": 5.0,
            "xp_reward": 20,
            "tips": [
                "Try a veggie burger or falafel",
                "Make it Meatless Monday",
                "Ask friends for restaurant recommendations"
            ],
            "mission_type": "one_time"
        }
    ]


# Build the LangGraph workflow
def create_mission_workflow():
    """Create and compile the mission generation workflow"""
    
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("calculate_co2", calculate_co2_footprint)
    workflow.add_node("classify_profile", classify_user_profile)
    workflow.add_node("identify_opportunities", identify_opportunities)
    workflow.add_node("generate_missions", generate_missions)
    
    # Define edges (flow)
    workflow.set_entry_point("calculate_co2")
    workflow.add_edge("calculate_co2", "classify_profile")
    workflow.add_edge("classify_profile", "identify_opportunities")
    workflow.add_edge("identify_opportunities", "generate_missions")
    workflow.add_edge("generate_missions", END)
    
    return workflow.compile()


# Create the compiled workflow
mission_workflow = create_mission_workflow()
