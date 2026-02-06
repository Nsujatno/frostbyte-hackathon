'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: string;
  summary: string;
  emoji: string;
  xp_earned: number;
  co2_saved_kg?: number;
  money_saved?: number;
  time_ago: string;
}

interface RightSidebarProps {
  onActivitySubmitted?: () => void;
}

export default function RightSidebar({ onActivitySubmitted }: RightSidebarProps) {
  const [activityInput, setActivityInput] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:8000/activities/feed?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.activities);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setLoading(false);
    }
  };

  const handleSubmitActivity = async () => {
    if (!activityInput.trim() || submitting) return;
    
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) {
        setError('Please log in to submit activities');
        setSubmitting(false);
        return;
      }

      const response = await fetch('http://localhost:8000/activities/freeform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ activity_text: activityInput }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMessage(data.message || 'Activity logged!');
        setActivityInput('');
        
        // Refresh activity feed
        fetchActivities();
        
        // Trigger parent dashboard stats refresh
        if (onActivitySubmitted) {
          onActivitySubmitted();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.detail || 'Failed to submit activity');
      }
    } catch (err: any) {
      console.error('Error submitting activity:', err);
      setError('Error submitting activity. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitActivity();
    }
  };

  return (
    <div 
      className="w-96 h-screen p-6 overflow-y-auto sticky top-0"
      style={{ backgroundColor: '#FFFFFF', borderLeft: '1px solid #E1E8E4' }}
    >
      {/* Quick Activity Log */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F3A2E' }}>
          <span>💬</span>
          <span>Quick Activity Log</span>
        </h3>
        
        {/* Input Area */}
        <div className="mb-4">
          <textarea
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What eco-friendly thing did you do today?&#10;&#10;Examples:&#10;• I took the bus to work&#10;• Had a plant-based lunch&#10;• Unplugged my devices"
            className="w-full px-4 py-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            style={{
              border: '1px solid #E1E8E4',
              color: '#1F3A2E',
              minHeight: '100px',
            }}
            disabled={submitting}
          />
          
          {/* Error Message */}
          {error && (
            <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: '#FEE', color: '#C00' }}>
              {error}
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="mt-2 p-2 rounded text-xs font-semibold" style={{ backgroundColor: '#D4F58E', color: '#1F3A2E' }}>
              {successMessage}
            </div>
          )}
          
          <button
            onClick={handleSubmitActivity}
            disabled={submitting || !activityInput.trim()}
            className="w-full mt-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#4A7C59',
              color: '#FFFFFF',
            }}
          >
            {submitting ? 'Analyzing...' : 'Log Activity'}
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <h4 className="text-sm font-bold mb-3" style={{ color: '#1F3A2E' }}>
          Recent Activity
        </h4>
        
        {loading && (
          <div className="text-center py-8">
            <div 
              className="inline-block w-6 h-6 border-3 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#4A7C59', borderTopColor: 'transparent' }}
            />
          </div>
        )}
        
        {!loading && activities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#5A7A66' }}>
              No activities yet. Start logging your eco-friendly actions!
            </p>
          </div>
        )}
        
        {!loading && activities.length > 0 && (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className="p-3 rounded-lg transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: '#F4F7F5', border: '1px solid #E1E8E4' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{activity.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#1F3A2E' }}>
                      {activity.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span 
                        className="font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#D4F58E', color: '#1F3A2E' }}
                      >
                        +{activity.xp_earned} XP
                      </span>
                      {activity.co2_saved_kg && activity.co2_saved_kg > 0 && (
                        <span style={{ color: '#2E5D3F' }}>
                          🌍 {activity.co2_saved_kg}kg CO2
                        </span>
                      )}
                      {activity.money_saved && activity.money_saved > 0 && (
                        <span style={{ color: '#2E5D3F' }}>
                          💰 ${activity.money_saved.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#5A7A66' }}>
                      {activity.time_ago}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Suggestions (placeholder for now) */}
      <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFE0B2' }}>
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#1F3A2E' }}>
          <span>💡</span>
          <span>Smart Suggestions</span>
        </h4>
        <p className="text-xs mb-2" style={{ color: '#5A7A66' }}>
          Based on your patterns:
        </p>
        <ul className="space-y-1 text-xs" style={{ color: '#1F3A2E' }}>
          <li>• You usually drive on Wednesdays. Try the bus?</li>
          <li>• Great job with plant-based meals this week!</li>
          <li>• 2 missions expiring today 
            <span style={{ color: '#4A7C59', cursor: 'pointer' }} className="ml-1 font-semibold">
              [View Missions →]
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
