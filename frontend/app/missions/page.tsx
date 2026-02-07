'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../dashboard/components/Sidebar';
import MissionCard from '../dashboard/components/MissionCard';
import RightSidebar, { RightSidebarRef } from '../dashboard/components/RightSidebar';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  xp_reward: number;
  co2_saved_kg?: number;
  money_saved?: number;
  status: string;
}

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

export default function MissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const rightSidebarRef = useRef<RightSidebarRef>(null);

  useEffect(() => {
    fetchMissionsAndStats();
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
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  const fetchMissions = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) return;

      const response = await fetch('http://localhost:8000/missions/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.missions) {
          // Sort by XP reward descending
          const sortedMissions = data.missions.sort((a: Mission, b: Mission) => b.xp_reward - a.xp_reward);
          setMissions(sortedMissions);
        }
      }
    } catch (err) {
      console.error('Error refreshing missions:', err);
    }
  };

  const handleMissionComplete = async () => {
    // Refresh stats, missions, and activity feed after completion
    await Promise.all([fetchStats(), fetchMissions()]);
    
    // Refresh activity feed in sidebar
    if (rightSidebarRef.current) {
      rightSidebarRef.current.refreshActivities();
    }
  };

  const fetchMissionsAndStats = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch both missions and stats in parallel
      const [missionsResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:8000/missions/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://localhost:8000/missions/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (!missionsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const missionsData = await missionsResponse.json();
      const statsData = await statsResponse.json();
      
      if (missionsData.success && missionsData.missions) {
        // Sort by XP reward descending
        const sortedMissions = missionsData.missions.sort((a: Mission, b: Mission) => b.xp_reward - a.xp_reward);
        setMissions(sortedMissions);
      }

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Separate missions by status
  const activeMissions = missions.filter(m => m.status === 'available');
  const completedMissions = missions.filter(m => m.status === 'completed');

  return (
    <div className="flex min-h-screen font-['Nunito']" style={{ backgroundColor: '#F4F7F5' }}>
      {/* Left Sidebar */}
      <Sidebar 
        activeRoute="missions"
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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#1F3A2E' }}>
            Your Missions
          </h1>
          <p className="text-lg" style={{ color: '#5A7A66' }}>
            Complete missions to earn XP, reduce your carbon footprint, and level up your plant!
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div 
              className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: '#4A7C59', borderTopColor: 'transparent' }}
            />
            <p className="text-lg" style={{ color: '#5A7A66' }}>
              Loading your missions...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#FEE', color: '#C00' }}>
            {error}
          </div>
        )}

        {!loading && missions.length === 0 && (
          <div 
            className="rounded-xl p-12 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
          >
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-xl font-semibold mb-2" style={{ color: '#1F3A2E' }}>
              No missions yet
            </p>
            <p className="text-base mb-4" style={{ color: '#5A7A66' }}>
              Complete the survey to get personalized missions!
            </p>
            <button
              onClick={() => router.push('/survey')}
              className="px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#4A7C59', color: '#FFFFFF' }}
            >
              Take Survey
            </button>
          </div>
        )}

        {!loading && missions.length > 0 && (
          <>
            {/* Active Missions Section */}
            {activeMissions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F3A2E' }}>
                  <span>Active Missions</span>
                  <span className="text-base font-normal px-3 py-1 rounded-full" style={{ backgroundColor: '#D4F58E', color: '#1F3A2E' }}>
                    {activeMissions.length}
                  </span>
                </h2>
                <div className="grid gap-4">
                  {activeMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      id={mission.id}
                      title={mission.title}
                      description={mission.description}
                      category={mission.category}
                      xpReward={mission.xp_reward}
                      co2SavedKg={mission.co2_saved_kg}
                      moneySaved={mission.money_saved}
                      status={mission.status}
                      onComplete={handleMissionComplete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Missions Section */}
            {completedMissions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F3A2E' }}>
                  <span>Completed Missions</span>
                  <span className="text-base font-normal px-3 py-1 rounded-full" style={{ backgroundColor: '#E8E8E8', color: '#5A7A66' }}>
                    {completedMissions.length}
                  </span>
                </h2>
                <div className="grid gap-4">
                  {completedMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      id={mission.id}
                      title={mission.title}
                      description={mission.description}
                      category={mission.category}
                      xpReward={mission.xp_reward}
                      co2SavedKg={mission.co2_saved_kg}
                      moneySaved={mission.money_saved}
                      status={mission.status}
                      onComplete={handleMissionComplete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Right Sidebar */}
      <RightSidebar ref={rightSidebarRef} onActivitySubmitted={fetchStats} />
    </div>
  );
}
