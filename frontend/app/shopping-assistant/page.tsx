'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../dashboard/components/Sidebar';

interface UserStats {
  xp: { total_xp: number; current_level: number; xp_current_level: number; xp_to_next_level: number; level_progress_percent: number; };
  plant: { stage: number; type: string; stage_name: string; xp_to_next_stage: number; };
  impact: { total_co2_saved: number; total_missions_completed: number; total_money_saved: number; current_streak_days: number; longest_streak_days: number; };
  equivalents: { trees_planted: number; miles_not_driven: number; led_hours: number; };
}

interface ShoppingItem {
  name: string;
  category: string;
  original_item?: string;
  reason: string;
  carbon_saved_kg: number;
  emoji: string;
}

export default function ShoppingAssistantPage() {
  const router = useRouter();
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string>('');
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) return;
      const statsResponse = await fetch('http://localhost:8000/missions/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) setStats(statsData.stats);
      }
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const handleGenerate = async () => {
    if (!userInput.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setThinkingStep('');
    setShoppingList([]);
    
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('http://localhost:8000/shopping/generate-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_input: userInput })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start generation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'thinking') {
              setThinkingStep(data.thinking);
            } else if (data.type === 'complete') {
              setShoppingList(data.shopping_list);
            } else if (data.type === 'saved') {
              setShoppingListId(data.shopping_list_id);
              await fetchStats();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate shopping list');
    } finally {
      setIsGenerating(false);
    }
  };

  const addItem = () => {
    const newItem: ShoppingItem = {
      name: '',
      category: 'other',
      reason: 'Custom item',
      carbon_saved_kg: 0,
      emoji: '📦'
    };
    setShoppingList([...shoppingList, newItem]);
  };

  const updateItem = (index: number, field: keyof ShoppingItem, value: any) => {
    const updated = [...shoppingList];
    updated[index] = { ...updated[index], [field]: value };
    setShoppingList(updated);
  };

  const deleteItem = (index: number) => {
    setShoppingList(shoppingList.filter((_, i) => i !== index));
  };

  const downloadList = () => {
    const text = shoppingList.map(item => 
      `${item.emoji} ${item.name}${item.original_item ? ` (instead of ${item.original_item})` : ''}`
    ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sustainable-shopping-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const completeShopping = async () => {
    if (!shoppingListId) return;
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('http://localhost:8000/shopping/complete-shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shopping_list_id: shoppingListId })
      });
      if (response.ok) {
        const data = await response.json();
        router.push('/dashboard');
      }
    } catch (error) { console.error('Error:', error); }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F4F7F5' }}>
      <Sidebar 
        activeRoute="shopping-assistant"
        stats={stats ? {
          co2Saved: stats.impact.total_co2_saved,
          xpEarned: stats.xp.total_xp,
          missionsCompleted: stats.impact.total_missions_completed,
          streakDays: stats.impact.current_streak_days,
          treesPlanted: stats.equivalents.trees_planted,
          milesNotDriven: stats.equivalents.miles_not_driven,
          ledHours: stats.equivalents.led_hours
        } : undefined}
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-[#1F3A2E] mb-2">AI Shopping Assistant</h1>
          <p className="text-gray-600 mb-8">Get personalized sustainable shopping recommendations</p>

          {/* Input */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Where are you shopping?</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g., I'm going to Whole Foods, help me shop sustainably"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-500"
                disabled={isGenerating}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !userInput.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 font-medium"
              >
                {isGenerating ? 'Thinking...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Live Thinking */}
          {isGenerating && thinkingStep && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 animate-pulse" />
                <p className="text-gray-600 font-medium animate-pulse">{thinkingStep}</p>
              </div>
            </div>
          )}

          {/* Editable Shopping List */}
          {shoppingList.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">✅ Your Shopping List</h2>
                <div className="flex gap-2">
                  <button onClick={addItem} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium">
                    + Add Item
                  </button>
                  <button onClick={downloadList} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                    💾 Download
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {shoppingList.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        className="w-full font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none"
                        placeholder="Item name"
                      />
                      <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                      {item.carbon_saved_kg > 0 && (
                        <p className="text-sm text-emerald-600 font-medium mt-1">💚 Saves {item.carbon_saved_kg} kg CO2</p>
                      )}
                    </div>
                    <button onClick={() => deleteItem(idx)} className="text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={completeShopping} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                  ✅ Complete Shopping (+100 XP)
                </button>
                <button onClick={() => router.push('/dashboard')} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                  Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isGenerating && shoppingList.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Shop Sustainably?</h3>
              <p className="text-gray-600 mb-6">Tell me where you're shopping and I'll create a personalized list!</p>
              <div className="text-sm text-gray-500">
                <p>✓ Based on your purchase history</p>
                <p>✓ Seasonal produce recommendations</p>
                <p>✓ Smart sustainable swaps</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
