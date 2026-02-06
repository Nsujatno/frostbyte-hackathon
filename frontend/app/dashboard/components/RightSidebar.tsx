'use client';

import { useState } from 'react';

export default function RightSidebar() {
  const [activityInput, setActivityInput] = useState('');

  const recentActivities = [
    { time: 'Just now', action: 'Bus commute', xp: 40, co2: 2.5 },
    { time: '2 hours ago', action: 'Meatless lunch', xp: 30, co2: 1.8 },
    { time: 'Yesterday', action: 'Reusable cup', xp: 15, co2: 0.2 },
    { time: 'Yesterday', action: 'Walked to store', xp: 25, co2: 1.2 },
  ];

  const suggestions = [
    { text: 'You usually drive on Wednesdays. Try the bus?', type: 'pattern' },
    { text: "Haven't scanned a receipt in 3 days!", action: 'Scan Now →' },
    { text: '2 missions expiring today', action: 'View Missions →' },
  ];

  const handleSubmit = () => {
    // TODO: Implement activity logging
    console.log('Activity logged:', activityInput);
    setActivityInput('');
  };

  return (
    <div className="w-[380px] h-screen overflow-y-auto p-5" style={{ backgroundColor: '#F4F7F5' }}>
      {/* Quick Activity Log */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1F3A2E' }}>
          💬 Quick Activity Log
        </h3>
        
        <div
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
        >
          <textarea
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            placeholder="Type what you did today..."
            className="w-full h-24 mb-3 text-sm resize-none outline-none"
            style={{ 
              color: '#1F3A2E',
              backgroundColor: 'transparent',
            }}
          />
          <div className="text-xs mb-3" style={{ color: '#5A7A66' }}>
            Example: "took the bus" or "used reusable bag"
          </div>
          <button
            onClick={handleSubmit}
            disabled={!activityInput.trim()}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: activityInput.trim() ? '#4A7C59' : '#E8E8E8',
              color: activityInput.trim() ? '#FFFFFF' : '#5A7A66',
            }}
          >
            Send
          </button>
        </div>

        {/* Recent activity feed */}
        <div className="space-y-3 mb-4">
          {recentActivities.map((activity, index) => (
            <div
              key={index}
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm">✅</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#5A7A66' }}>
                    {activity.time}
                  </div>
                  <div className="text-sm mb-1" style={{ color: '#1F3A2E' }}>
                    {activity.action}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span style={{ color: '#4A7C59' }}>+{activity.xp} XP</span>
                    <span style={{ color: '#2E5D3F' }}>·</span>
                    <span style={{ color: '#2E5D3F' }}>{activity.co2}kg CO2 saved</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="text-sm font-semibold transition-colors duration-200 hover:underline"
          style={{ color: '#4A7C59' }}
        >
          View All Activity →
        </button>
      </div>

      {/* Smart Suggestions */}
      <div>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1F3A2E' }}>
          💡 Smart Suggestions
        </h3>
        
        <div
          className="rounded-xl p-4 mb-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: '#5A7A66' }}>
            Based on your patterns:
          </p>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-sm" style={{ color: '#2E5D3F' }}>•</span>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: '#1F3A2E' }}>
                    {suggestion.text}
                  </p>
                  {suggestion.action && (
                    <button
                      className="text-xs font-semibold mt-1 hover:underline"
                      style={{ color: '#4A7C59' }}
                    >
                      {suggestion.action}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
