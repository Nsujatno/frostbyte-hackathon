'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import XPProgressBar from './components/XPProgressBar';
import PlantVisualization from './components/PlantVisualization';
import MissionCard from './components/MissionCard';
import RightSidebar, { RightSidebarRef } from './components/RightSidebar';

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

export default function DashboardPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const rightSidebarRef = useRef<RightSidebarRef>(null);

  useEffect(() => {
    fetchDashboardData();
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
          const sortedMissions = data.missions
            .filter((m: Mission) => m.status === 'available') // Only show active missions on dashboard
            .sort((a: Mission, b: Mission) => b.xp_reward - a.xp_reward)
            .slice(0, 5);
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

  const fetchDashboardData = async () => {
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
        throw new Error('Failed to fetch dashboard data');
      }

      const missionsData = await missionsResponse.json();
      const statsData = await statsResponse.json();
      
      if (missionsData.success && missionsData.missions) {
        const sortedMissions = missionsData.missions
          .filter((m: Mission) => m.status === 'available') // Only show active missions on dashboard
          .sort((a: Mission, b: Mission) => b.xp_reward - a.xp_reward)
          .slice(0, 5);
        setMissions(sortedMissions);
      }

      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      setLoading(false);
      
      // Use placeholder data if fetch fails
      setStats({
        xp: {
          total_xp: 680,
          current_level: 4,
          xp_current_level: 680,
          xp_to_next_level: 1000,
          level_progress_percent: 68
        },
        plant: {
          stage: 4,
          type: 'oak',
          stage_name: 'Young Tree',
          xp_to_next_stage: 320
        },
        impact: {
          total_co2_saved: 127.5,
          total_missions_completed: 24,
          total_money_saved: 85.50,
          current_streak_days: 12,
          longest_streak_days: 18
        },
        equivalents: {
          trees_planted: 5.8,
          miles_not_driven: 315.6,
          led_hours: 21250
        }
      });
      
      // Use placeholder missions if fetch fails
      setMissions([
        {
          id: '1',
          title: 'Try a plant-based lunch once this week',
          description: 'Pick one day this week and choose a vegetarian or vegan option for lunch. Many restaurants offer delicious plant-based meals.',
          category: 'food',
          xp_reward: 20,
          co2_saved_kg: 2.3,
          money_saved: 3.50,
          status: 'available',
        },
        {
          id: '2',
          title: 'Unplug devices before bed tonight',
          description: 'Before you go to sleep, unplug phone chargers, laptop chargers, and other devices that draw phantom power when not in use.',
          category: 'energy',
          xp_reward: 15,
          co2_saved_kg: 1.2,
          money_saved: 1.50,
          status: 'available',
        },
        {
          id: '3',
          title: 'Take the bus to work tomorrow',
          description: 'Leave your car at home tomorrow and use public transportation for your commute. It\'s a great way to reduce emissions.',
          category: 'transportation',
          xp_reward: 40,
          co2_saved_kg: 5.2,
          money_saved: 8.00,
          status: 'available',
        },
      ]);
    }
  };

  return (
    <div className="flex min-h-screen font-['Nunito']" style={{ backgroundColor: '#F4F7F5' }}>
      {/* Left Sidebar */}
      <Sidebar 
        activeRoute="dashboard"
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
        {/* XP Progress */}
        {stats && (
          <XPProgressBar 
            currentLevel={stats.xp.current_level}
            currentXP={stats.xp.xp_current_level}
            requiredXP={stats.xp.xp_to_next_level}
          />
        )}

        {/* Plant Visualization */}
        {stats && (
          <PlantVisualization 
            stageName={stats.plant.stage_name}
            stage={stats.plant.stage}
            xpToNextStage={stats.plant.xp_to_next_stage}
          />
        )}

        {/* Active Missions */}
        <div className="mb-5">
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#1F3A2E' }}>
            Active Missions
          </h3>
          
          {loading && (
            <div className="text-center py-8">
              <div 
                className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#4A7C59', borderTopColor: 'transparent' }}
              />
              <p className="mt-3 text-sm" style={{ color: '#5A7A66' }}>
                Loading your missions...
              </p>
            </div>
          )}

          {!loading && missions.length === 0 && (
            <div 
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E1E8E4' }}
            >
              <div className="text-5xl mb-3">🎯</div>
              <p className="text-lg font-semibold mb-2" style={{ color: '#1F3A2E' }}>
                No missions yet
              </p>
              <p className="text-sm" style={{ color: '#5A7A66' }}>
                Complete the survey to get personalized missions!
              </p>
              <button
                onClick={() => router.push('/survey')}
                className="mt-4 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: '#4A7C59', color: '#FFFFFF' }}
              >
                Take Survey
              </button>
            </div>
          )}

          {!loading && missions.length > 0 && (
            <div className="grid gap-3">
              {missions.map((mission) => (
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
          )}

          {!loading && missions.length > 0 && (
            <button
              onClick={() => router.push('/missions')}
              className="mt-4 text-sm font-semibold transition-colors duration-200 hover:underline"
              style={{ color: '#4A7C59' }}
            >
              View All Missions ({missions.length}) →
            </button>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar ref={rightSidebarRef} onActivitySubmitted={fetchStats} />
    </div>
  );
}
