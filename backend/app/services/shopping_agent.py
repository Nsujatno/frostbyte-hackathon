from typing import Dict, List, Any, Optional
from app.config import get_settings
from app.database import supabase
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from datetime import datetime
import json

settings = get_settings()


class ShoppingAgent:
    def __init__(self):
        """Initialize agent with Gemini 2.5 Flash Preview"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-preview-09-2025",
            api_key=settings.google_api_key,
            temperature=0.7,
        )
        self.max_iterations = 6
        
    async def run_streaming(self, user_input: str, user_id: str):
        """
        Run the shopping assistant agent with streaming iterations
        Yields each iteration as it completes
        """
        print(f"🛒 Shopping Agent: Starting STREAMING for user {user_id}")
        print(f"📝 User input: {user_input}")
        
        iterations = []
        context = {
            "user_input": user_input,
            "user_id": user_id,
            "location": "Texas"  # Default location
        }
        
        for i in range(self.max_iterations):
            print(f"\n{'='*60}")
            print(f"🤖 Agent Iteration {i+1}/{self.max_iterations}")
            print(f"{'='*60}")
            
            # THINK
            thinking = await self._think(context, iterations)
            print(f"💭 THINKING: {thinking}")
            
            # Yield thinking immediately for live display
            yield {
                "type": "thinking",
                "iteration": i + 1,
                "thinking": thinking
            }
            
            # ACT (force list generation on last iteration if not done)
            if i == self.max_iterations - 1 and not context.get("final_list"):
                action = "generate_shopping_list"
                action_input = {}
                print(f"⚡ ACTION (FORCED FINAL): {action}")
            else:
                action, action_input = await self._decide_action(thinking, context, iterations)
                print(f"⚡ ACTION: {action}")
            
            # OBSERVE
            observation = await self._execute_action(action, action_input, user_id, context)
            print(f"👁️ OBSERVATION: {observation[:200]}...")
            
            iterations.append({
                "iteration": i + 1,
                "thinking": thinking,
                "action": action,
                "action_input": action_input,
                "observation": observation
            })
            
            # Update context with observations
            context["past_iterations"] = iterations
            
            # Check if finished
            if action == "generate_shopping_list":
                print("\n✅ Agent finished - shopping list generated!")
                break
        
        # Yield final result
        yield {
            "type": "complete",
            "shopping_list": context.get("final_list", []),
            "total_items": len(context.get("final_list", [])),
            "estimated_co2_saved": context.get("estimated_co2_saved", 0),
            "iterations": iterations
        }
    
    async def _think(self, context: Dict, iterations: List[Dict]) -> str:
        """Generate thinking step using LLM"""
        
        prompt = f"""You are an AI shopping assistant agent. Based on the context, decide what you need to think about next.

User Request: {context['user_input']}

IMPORTANT: The user will NOT provide a detailed shopping list. Your job is to suggest sustainable items based on:
- Their purchase history
- Their commitments to alternatives
- Seasonal produce
- General sustainable shopping principles

Previous iterations:
{json.dumps(iterations[-2:] if len(iterations) > 1 else iterations, indent=2)}

What should you think about next? Consider:
- What information do you still need from their history/commitments?
- Have you gathered enough data to make recommendations?
- Should you generate the shopping list now?

Respond with ONE clear thought (max 1 sentence, ~10 words)."""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            print(f"❌ Error in thinking: {e}")
            return "Gathering user purchase history"
    
    async def _decide_action(self, thinking: str, context: Dict, iterations: List[Dict]) -> tuple:
        """Decide which action to take based on thinking"""
        
        available_tools = """
Available tools:
1. query_past_receipts - Get user's purchase history
2. query_commitments - Check sustainable alternatives they committed to
3. search_seasonal_produce - Find what's in season (LLM call)
4. query_user_profile - Get user preferences
5. calculate_carbon_impact - Estimate CO2 for items
6. generate_shopping_list - Create the final shopping list
"""
        
        prompt = f"""Based on your thinking, choose the BEST tool to use next.

Thinking: {thinking}

{available_tools}

Previous actions: {[it['action'] for it in iterations]}

Respond with JSON:
{{"action": "tool_name", "input": {{"param": "value"}}}}

Choose wisely - you have limited iterations!"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            text = response.content.strip()
            
            # Extract JSON
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            decision = json.loads(text)
            return decision["action"], decision.get("input", {})
        except Exception as e:
            print(f"❌ Error deciding action: {e}")
            # Default to query receipts if haven't done it yet
            if not any(it["action"] == "query_past_receipts" for it in iterations):
                return "query_past_receipts", {"limit": 10}
            return "generate_shopping_list", {}
    
    async def _execute_action(self, action: str, action_input: Dict, user_id: str, context: Dict) -> str:
        """Execute the chosen action"""
        
        if action == "query_past_receipts":
            return await self._query_past_receipts(user_id, action_input.get("limit", 10))
        
        elif action == "query_commitments":
            return await self._query_commitments(user_id)
        
        elif action == "search_seasonal_produce":
            return await self._search_seasonal_produce(context.get("location", "Texas"))
        
        elif action == "query_user_profile":
            return await self._query_user_profile(user_id)
        
        elif action == "calculate_carbon_impact":
            return await self._calculate_carbon_impact(action_input.get("items", []))
        
        elif action == "generate_shopping_list":
            return await self._generate_shopping_list(context)
        
        else:
            return f"Unknown action: {action}"
    
    # Tool implementations
    
    async def _query_past_receipts(self, user_id: str, limit: int) -> str:
        """Query user's past receipt scans"""
        try:
            # Get recent receipt scans
            receipts = supabase.table("receipt_scans")\
                .select("*, receipt_items(*)")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            if not receipts.data:
                return "No past receipts found. User is new to receipt scanning."
            
            # Summarize items
            item_counts = {}
            for receipt in receipts.data:
                for item in receipt.get("receipt_items", []):
                    name = item["item_name"]
                    item_counts[name] = item_counts.get(name, 0) + 1
            
            # Get most frequent items
            frequent = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            summary = f"User bought {len(receipts.data)} receipts. Most frequent items:\n"
            for item, count in frequent:
                summary += f"- {item} ({count}x)\n"
            
            return summary
        except Exception as e:
            return f"Error querying receipts: {str(e)}"
    
    async def _query_commitments(self, user_id: str) -> str:
        """Query user's commitments to sustainable alternatives"""
        try:
            commitments = supabase.table("user_commitments")\
                .select("*, receipt_items(alternative_name, item_name)")\
                .eq("user_id", user_id)\
                .eq("is_completed", False)\
                .execute()
            
            if not commitments.data:
                return "No active commitments found."
            
            summary = f"User has {len(commitments.data)} pending commitments:\n"
            for c in commitments.data[:5]:
                item_info = c.get("receipt_items", {})
                alt = item_info.get("alternative_name", "unknown")
                orig = item_info.get("item_name", "unknown")
                summary += f"- Try {alt} instead of {orig}\n"
            
            return summary
        except Exception as e:
            return f"Error querying commitments: {str(e)}"
    
    async def _search_seasonal_produce(self, location: str) -> str:
        """Search for seasonal produce using LLM"""
        try:
            month = datetime.now().strftime("%B")
            prompt = f"What fruits and vegetables are in peak season in {location} during {month}? List 5-7 items with brief notes on sustainability benefits. Be concise."
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            return f"Error searching seasonal produce: {str(e)}"
    
    async def _query_user_profile(self, user_id: str) -> str:
        """Query user profile for preferences"""
        try:
            profile = supabase.table("user_profiles")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            if not profile.data:
                return "No profile data found."
            
            p = profile.data[0]
            return f"User preferences: Level {p.get('level', 1)}, {p.get('total_xp', 0)} XP, saved {p.get('total_co2_saved_kg', 0)} kg CO2"
        except Exception as e:
            return f"Error querying profile: {str(e)}"
    
    async def _calculate_carbon_impact(self, items: List[str]) -> str:
        """Calculate estimated carbon impact"""
        # Simple estimation
        total = len(items) * 0.5  # Rough estimate
        return f"Estimated CO2 impact: {total:.1f} kg for {len(items)} items"
    
    async def _generate_shopping_list(self, context: Dict) -> str:
        """Generate the final shopping list using all gathered context"""
        try:
            prompt = f"""Generate a personalized sustainable shopping list based on this context:

User request: {context['user_input']}

Context from previous iterations:
{json.dumps(context.get('past_iterations', []), indent=2)}

Create a JSON array of shopping list items with this structure:
[
  {{
    "name": "item name",
    "category": "commitment_reminder|seasonal|smart_swap|other",
    "original_item": "what they used to buy (for swaps)",
    "reason": "why recommend this",
    "carbon_saved_kg": 0.0,
    "emoji": "appropriate emoji"
  }}
]

Include 8-12 items. Prioritize commitment reminders, then seasonal items, then smart swaps."""
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            text = response.content.strip()
            
            # Extract JSON
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            shopping_list = json.loads(text)
            
            # Store in context
            context["final_list"] = shopping_list
            context["estimated_co2_saved"] = sum(item.get("carbon_saved_kg", 0) for item in shopping_list)
            
            return f"Generated shopping list with {len(shopping_list)} items, saving ~{context['estimated_co2_saved']:.1f} kg CO2"
        except Exception as e:
            print(f"❌ Error generating list: {e}")
            # Fallback simple list
            context["final_list"] = [
                {
                    "name": "Seasonal spinach",
                    "category": "seasonal",
                    "reason": "In season in Texas",
                    "carbon_saved_kg": 0.5,
                    "emoji": "🌱"
                }
            ]
            return "Generated basic shopping list (fallback)"


# Singleton instance
shopping_agent = ShoppingAgent()
