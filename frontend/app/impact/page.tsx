'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../dashboard/components/Sidebar';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FiShare2 } from 'react-icons/fi';
import html2canvas from 'html2canvas';

interface ImpactData {
  success: boolean;
  projections: {
    current_pace: {
      "1_month": number;
      "6_months": number;
      "1_year": number;
    };
    best_case: {
      "1_month": number;
      "6_months": number;
      "1_year": number;
    };
  };
  category_breakdown: {
    category: string;
    percentage: number;
    amount_kg: number;
  }[];
  suggestions: any[];
  monthly_pace_kg: number;
  potential_annual_savings_kg: number;
  user_profile?: {
    plant_stage: number;
    plant_type: string;
    plant_stage_name: string;
  };
  top_actions?: Record<string, {
    name: string;
    co2: number;
    count: number;
  }[]>;
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

const plantImages: Record<number, string> = {
  1: '/seed.png',
  2: '/sprout.png',
  3: '/seedling.png',
  4: '/young_tree.png',
  5: '/mature_tree.png',
  6: '/ancient_tree.png',
  7: '/forest_guardian.png',
};

export default function ImpactPage() {
  const router = useRouter();
  const [data, setData] = useState<ImpactData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchImpactData();
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
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  const fetchImpactData = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/impact/projections', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        // Default to the category with highest percentage
        if (result.category_breakdown.length > 0) {
             const topCat = result.category_breakdown.reduce((prev: any, current: any) => 
                (prev.percentage > current.percentage) ? prev : current
             );
             setSelectedCategory(topCat.category);
        }
      }
    } catch (error) {
      console.error('Error fetching impact data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (shareCardRef.current) {
        try {
            await document.fonts.ready;
            
            // Get dimensions
            const { offsetWidth, offsetHeight } = shareCardRef.current;
            
            const canvas = await html2canvas(shareCardRef.current, {
                useCORS: true, 
                scale: 2, // High resolution
                backgroundColor: null, // Transparent corners
                width: offsetWidth, // Force correct dimensions
                height: offsetHeight,
                onclone: (clonedDoc) => {
                    const element = clonedDoc.querySelector('[data-share-card]');
                    if (element instanceof HTMLElement) {
                        // Text rendering fixes
                        // @ts-ignore
                        element.style.textRendering = 'geometricPrecision'; 
                        (element.style as any).fontSmooth = 'antialiased';
                        (element.style as any).webkitFontSmoothing = 'antialiased';
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `my-eco-impact-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Share capture failed:", err);
        }
    }
  };

  // Prepare chart data
  const chartData = data ? [
    {
      name: '1 Month',
      current: data.projections.current_pace['1_month'],
      best: data.projections.best_case['1_month'],
    },
    {
      name: '6 Months',
      current: data.projections.current_pace['6_months'],
      best: data.projections.best_case['6_months'],
    },
    {
      name: '1 Year',
      current: data.projections.current_pace['1_year'],
      best: data.projections.best_case['1_year'],
    },
  ] : [];

  const COLORS = ['#FFBB28', '#FF8042', '#00C49F', '#0088FE'];
  const CATEGORY_COLORS: Record<string, string> = {
    transportation: '#FF8042', // Orange
    food: '#00C49F', // Green
    shopping: '#FFBB28', // Yellow
    energy: '#0088FE', // Blue
  };

  if (loading) {
    return (
      <div className="flex min-h-screen font-['Nunito']" style={{ backgroundColor: '#F4F7F5' }}>
        <Sidebar activeRoute="impact" />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </main>
      </div>
    );
  }

  const plantStage = data?.user_profile?.plant_stage || 1;
  const plantImage = plantImages[plantStage] || plantImages[1];

  return (
    <div className="flex min-h-screen font-['Nunito']" style={{ backgroundColor: '#F4F7F5' }}>
      <Sidebar 
        activeRoute="impact" 
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

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 pr-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: '#1F3A2E' }}>Future Impact</h1>
                        <p className="text-gray-600">Visualize your long-term environmental contribution</p>
                    </div>
                </div>

                {/* Top Row: Pie Chart & Share Card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Category Breakdown */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                        <h3 className="font-bold mb-2" style={{ color: '#1F3A2E' }}>Impact Breakdown</h3>
                        <div className="h-44 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Pie
                                        data={data?.category_breakdown}
                                        cx="35%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="amount_kg"
                                        nameKey="category"
                                        onClick={(entry) => setSelectedCategory(entry.category)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {data?.category_breakdown.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={CATEGORY_COLORS[entry.category] || COLORS[index % COLORS.length]}
                                                stroke={selectedCategory === entry.category ? '#000' : 'none'}
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}kg`, 'CO2 Saved']} />
                                    <Legend 
                                        layout="vertical" 
                                        verticalAlign="middle" 
                                        align="right"
                                        wrapperStyle={{ paddingLeft: "0px", fontSize: "12px" }}
                                        formatter={(value) => <span className="capitalize text-gray-700 font-medium ml-1">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        {selectedCategory && data?.top_actions?.[selectedCategory] && (
                            <div className="mt-2 border-t border-gray-100 pt-2 flex-1 overflow-auto px-1 min-h-0">
                                <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider">
                                    Top {selectedCategory} Actions
                                </h4>
                                <div className="space-y-2">
                                {data.top_actions[selectedCategory].length > 0 ? (
                                     data.top_actions[selectedCategory].slice(0, 3).map((action, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded text-gray-700 hover:bg-gray-100 transition-colors">
                                            <span className="truncate mr-2 font-medium">{action.name}</span>
                                            <span className="shrink-0 text-[#1F3A2E] font-bold">{action.co2}kg</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No specific actions logged yet.</p>
                                )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shareable Milestone Card */}
                    <div className="h-[400px]">
                            <div 
                                ref={shareCardRef}
                                data-share-card
                                style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', transform: 'translateZ(0)' }}
                                className="bg-gradient-to-br from-[#1F3A2E] to-[#2d5241] p-6 rounded-2xl text-white w-full h-full relative overflow-hidden shadow-lg flex flex-col justify-center items-center"
                            >
                                <button 
                                    onClick={handleShare}
                                    data-html2canvas-ignore
                                    className="absolute top-4 right-4 p-2 rounded-full transition-colors z-20"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    title="Share Milestone"
                                >
                                    <FiShare2 size={20} />
                                </button>

                                {/* Background decorations */}
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-8 -mb-8 pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                                
                                <div className="relative z-10 text-center w-full flex flex-col items-center justify-between h-full py-4">
                                    <div className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider backdrop-blur-sm mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                        MY ECO IMPACT
                                    </div>
                                    
                                    <div className="w-32 h-32 rounded-full flex items-center justify-center backdrop-blur-sm p-7 relative mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.1)' }}></div>
                                        <img 
                                            src={plantImage} 
                                            alt="My Plant" 
                                            className="w-full h-full object-contain drop-shadow-lg"
                                        />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-bold opacity-90 leading-tight">I'm on track to save</h2>
                                        <div className="text-4xl font-extrabold text-[#D4F58E] my-1">
                                            {data?.projections.current_pace['1_year'].toFixed(0)}kg
                                        </div>
                                        <p className="font-medium text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>of CO2 this year!</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 rounded-xl p-2 backdrop-blur-sm w-full mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="text-center">
                                            <div className="text-lg">🌳</div>
                                            <div className="text-[9px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Trees</div>
                                            <div className="font-bold text-sm">{Math.round((data?.projections.current_pace['1_year'] || 0) / 22)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg">🚗</div>
                                            <div className="text-[9px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Miles</div>
                                            <div className="font-bold text-sm">{Math.round((data?.projections.current_pace['1_year'] || 0) / 0.404)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg">💡</div>
                                            <div className="text-[9px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Hrs</div>
                                            <div className="font-bold text-sm">{Math.round((data?.projections.current_pace['1_year'] || 0) / 0.006)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto pt-4 text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        ecoquest.app • {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>

                {/* Metrics Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: '1 Month Projection', val: data?.projections.current_pace['1_month'] },
                        { label: '6 Month Projection', val: data?.projections.current_pace['6_months'] },
                        { label: '1 Year Projection', val: data?.projections.current_pace['1_year'] }
                    ].map((metric, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <h4 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{metric.label}</h4>
                            <div className="text-3xl font-bold text-[#1F3A2E] mb-1">{metric.val?.toFixed(1)}kg CO2</div>
                            <div className="text-xs text-[#5A7A66]">
                                Equivalent to {(metric.val ? metric.val / 22 : 0).toFixed(1)} trees 🌳
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Visual: Timeline Graph */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <h3 className="font-bold text-xl mb-6" style={{ color: '#1F3A2E' }}>Projected Impact Timeline</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} label={{ value: 'CO2 Saved (kg)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend wrapperStyle={{ position: 'relative', marginTop: '14px' }}/>
                                <Line 
                                    type="monotone" 
                                    name="Your Current Pace" 
                                    dataKey="current" 
                                    stroke="#4A7C59" 
                                    strokeWidth={3} 
                                    activeDot={{ r: 8 }} 
                                    dot={{ r: 4 }}
                                />
                                <Line 
                                    type="monotone" 
                                    name="Best Case Scenario" 
                                    dataKey="best" 
                                    stroke="#D4F58E" 
                                    strokeWidth={3} 
                                    strokeDasharray="5 5" 
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-[#166534]">Bridge the Gap!</h4>
                            <p className="text-sm text-[#15803d] mt-1">If you complete your suggested missions, you could save an extra <span className="font-bold">{((data?.projections.best_case['1_year'] || 0) - (data?.projections.current_pace['1_year'] || 0)).toFixed(1)}kg</span> of CO2 this year.</p>
                        </div>
                        <button 
                          onClick={() => router.push('/missions')}
                          className="bg-[#166534] hover:bg-[#14532d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                            View High-Impact Missions
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 hidden xl:flex flex-col gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-full h-40 bg-[#F0FDF4] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img src="/environment.svg" alt="Environment Decoration" className="h-full w-full object-contain" />
                    </div>
                    <h3 className="font-bold text-[#1F3A2E] mb-2">Nature & You</h3>
                    <p className="text-sm text-gray-600 mb-4">Every action counts towards a greener future.</p>
                    <div className="text-[10px] text-gray-400">
                        <a href="https://storyset.com/nature" target="_blank" rel="noopener noreferrer" className="hover:underline">Nature illustrations by Storyset</a>
                    </div>
                </div>
                <div className="bg-white mb-2 pt-6 pb-5 px-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-full h-40 bg-[#F0FDF4] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img src="/protecting the environment-bro.svg" alt="Protecting Environment" className="h-full w-full object-contain" />
                    </div>
                    <h3 className="font-bold text-[#1F3A2E] mb-2">Join the Movement</h3>
                    <p className="text-sm text-gray-600 mb-4">Protecting our planet, one step at a time.</p>
                    <div className="text-[10px] text-gray-400">
                        <a href="https://storyset.com/nature" target="_blank" rel="noopener noreferrer" className="hover:underline">Nature illustrations by Storyset</a>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-full h-102 bg-[#F0FDF4] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img src="/Taking care of the Earth-amico.svg" alt="Taking Care of Earth" className="h-full w-full object-contain" />
                    </div>
                    <h3 className="font-bold text-[#1F3A2E] mb-2">Global Impact</h3>
                    <p className="text-sm text-gray-600 mb-4">Make a difference for the whole world.</p>
                    <div className="text-[10px] text-gray-400">
                        <a href="https://storyset.com/people" target="_blank" rel="noopener noreferrer" className="hover:underline">People illustrations by Storyset</a>
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
