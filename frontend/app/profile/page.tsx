'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../dashboard/components/Sidebar';
import PlantVisualization from '../dashboard/components/PlantVisualization';

interface UserStats {
  xp: {
    total_xp: number;
    current_level: number;
    xp_current_level: number;
    xp_to_next_level: number;
    level_progress_percent: number;
  };
  plant: {
    stage: number;
    type: string;
    stage_name: string;
    xp_to_next_stage: number;
  };
  impact: {
    total_co2_saved: number;
    total_missions_completed: number;
    total_money_saved: number;
    current_streak_days: number;
    longest_streak_days: number;
  };
  equivalents: {
    trees_planted: number;
    miles_not_driven: number;
    led_hours: number;
  };
}

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  subtitle?: string;
}

function StatCard({ icon, value, label, subtitle }: StatCardProps) {
  return (
    <div
      className="p-6 rounded-xl transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-3xl font-bold mb-1" style={{ color: '#1F3A2E' }}>
        {value}
      </div>
      <div className="text-sm font-semibold" style={{ color: '#5A7A66' }}>
        {label}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: '#5A7A66' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Decode token to get email (simple base64 decode of JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || 'User');
      } catch (e) {
        setUserEmail('User');
      }

      // Fetch stats
      const statsResponse = await fetch('http://localhost:8000/missions/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching profile data:', err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('supabase_token');
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen font-['Nunito']" style={{ backgroundColor: '#F4F7F5' }}>
      {/* Left Sidebar */}
      <Sidebar 
        activeRoute="profile"
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {loading && (
          <div className="text-center py-12">
            <div 
              className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: '#4A7C59', borderTopColor: 'transparent' }}
            />
            <p className="text-lg" style={{ color: '#5A7A66' }}>
              Loading your profile...
            </p>
          </div>
        )}

        {!loading && stats && (
          <div className="max-w-5xl">
            {/* User Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#1F3A2E' }}>
                Your Profile
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-lg" style={{ color: '#5A7A66' }}>
                  {userEmail}
                </p>
                <span 
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: '#D4F58E', color: '#1F3A2E' }}
                >
                  Level {stats.xp.current_level}
                </span>
              </div>
            </div>

            {/* Plant Progress Card */}
            <div 
              className="p-6 rounded-xl mb-6"
              style={{ 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E1E8E4',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F4F7F5 100%)'
              }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                Plant Growth Progress
              </h2>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <PlantVisualization 
                    stageName={stats.plant.stage_name}
                    stage={stats.plant.stage}
                    xpToNextStage={stats.plant.xp_to_next_stage}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold mb-2" style={{ color: '#1F3A2E' }}>
                    {stats.plant.stage_name}
                  </p>
                  <p className="text-base mb-3" style={{ color: '#5A7A66' }}>
                    {stats.plant.xp_to_next_stage} XP until next stage
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: '#4A7C59',
                        width: `${Math.min(100, ((stats.xp.total_xp / (stats.xp.total_xp + stats.plant.xp_to_next_stage)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                Your Stats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon="⚡"
                  value={stats.xp.total_xp.toLocaleString()}
                  label="Total XP"
                  subtitle="Experience Points"
                />
                <StatCard
                  icon="🏆"
                  value={`Level ${stats.xp.current_level}`}
                  label="Current Level"
                  subtitle={`${stats.xp.level_progress_percent}% to next`}
                />
                <StatCard
                  icon="🌍"
                  value={`${stats.impact.total_co2_saved.toFixed(1)}kg`}
                  label="CO2 Saved"
                  subtitle="Carbon Reduced"
                />
                <StatCard
                  icon="💰"
                  value={`$${stats.impact.total_money_saved.toFixed(2)}`}
                  label="Money Saved"
                  subtitle="Total Savings"
                />
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                Your Environmental Impact
              </h2>
              <div 
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
              >
                <p className="text-base mb-4" style={{ color: '#5A7A66' }}>
                  Your efforts are equivalent to:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F4F7F5' }}>
                    <div className="text-4xl mb-2">🌳</div>
                    <div className="text-2xl font-bold" style={{ color: '#1F3A2E' }}>
                      {stats.equivalents.trees_planted.toFixed(1)}
                    </div>
                    <div className="text-sm" style={{ color: '#5A7A66' }}>
                      Trees Planted
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F4F7F5' }}>
                    <div className="text-4xl mb-2">🚗</div>
                    <div className="text-2xl font-bold" style={{ color: '#1F3A2E' }}>
                      {Math.round(stats.equivalents.miles_not_driven)}
                    </div>
                    <div className="text-sm" style={{ color: '#5A7A66' }}>
                      Miles Not Driven
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F4F7F5' }}>
                    <div className="text-4xl mb-2">💡</div>
                    <div className="text-2xl font-bold" style={{ color: '#1F3A2E' }}>
                      {Math.round(stats.equivalents.led_hours).toLocaleString()}
                    </div>
                    <div className="text-sm" style={{ color: '#5A7A66' }}>
                      Hours of LED Lights
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mission Summary & Streaks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Mission Summary */}
              <div 
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
              >
                <h3 className="text-xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                  🎯 Mission Progress
                </h3>
                <div className="text-5xl font-bold mb-2" style={{ color: '#4A7C59' }}>
                  {stats.impact.total_missions_completed}
                </div>
                <p className="text-base mb-4" style={{ color: '#5A7A66' }}>
                  Missions Completed
                </p>
                <button
                  onClick={() => router.push('/missions')}
                  className="text-sm font-semibold transition-colors duration-200 hover:underline"
                  style={{ color: '#4A7C59' }}
                >
                  View All Missions →
                </button>
              </div>

              {/* Streak */}
              <div 
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
              >
                <h3 className="text-xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                  🔥 Consistency
                </h3>
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-1" style={{ color: '#5A7A66' }}>
                    Current Streak
                  </div>
                  <div className="text-4xl font-bold" style={{ color: '#4A7C59' }}>
                    {stats.impact.current_streak_days} Days
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#5A7A66' }}>
                    Longest Streak
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#1F3A2E' }}>
                    {stats.impact.longest_streak_days} Days 🏅
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div 
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
                Account Details
              </h3>
              <div className="space-y-3 mb-6">
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#5A7A66' }}>
                    Email
                  </div>
                  <div className="text-base" style={{ color: '#1F3A2E' }}>
                    {userEmail}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#5A7A66' }}>
                    Level
                  </div>
                  <div className="text-base" style={{ color: '#1F3A2E' }}>
                    Level {stats.xp.current_level}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: '#C00', color: '#FFFFFF' }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
