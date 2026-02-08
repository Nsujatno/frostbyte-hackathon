'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SidebarStats {
  co2Saved: number;
  xpEarned: number;
  missionsCompleted: number;
  streakDays: number;
  treesPlanted: number;
  milesNotDriven: number;
  ledHours: number;
}

interface SidebarProps {
  activeRoute?: string;
  stats?: SidebarStats;
}

export default function Sidebar({ activeRoute = 'dashboard', stats }: SidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('supabase_token');
    router.push('/login');
  };

  const menuItems = [
    { icon: '🏠', label: 'Dashboard', route: 'dashboard' },
    { icon: '📊', label: 'Analytics', route: 'analytics' },
    { icon: '🎯', label: 'Missions', route: 'missions' },
    { icon: '📸', label: 'Receipt Scanner', route: 'receipt-scanner' },
    { icon: '🔮', label: 'Future Impact', route: 'impact' },
    { icon: '🏆', label: 'Achievements', route: 'achievements' },
    { icon: '👤', label: 'Profile', route: 'profile' },
  ];

  // Use props data or fallback to placeholder values
  const statsDisplay = [
    { 
      icon: '🌍', 
      label: 'CO2 Saved', 
      value: stats ? `${stats.co2Saved.toFixed(1)}kg` : '0.0kg'
    },
    { 
      icon: '⚡', 
      label: 'XP Earned', 
      value: stats ? `${stats.xpEarned}` : '0'
    },
    { 
      icon: '🎯', 
      label: 'Missions', 
      value: stats ? `${stats.missionsCompleted}` : '0'
    },
    { 
      icon: '🔥', 
      label: 'Streak', 
      value: stats ? `${stats.streakDays} Days` : '0 Days'
    },
  ];

  const equivalents = [
    { 
      icon: '🌳', 
      text: stats ? `${stats.treesPlanted.toFixed(1)} trees planted` : '0.0 trees planted'
    },
    { 
      icon: '🚗', 
      text: stats ? `${Math.round(stats.milesNotDriven)} miles not driven` : '0 miles not driven'
    },
    { 
      icon: '💡', 
      text: stats ? `${Math.round(stats.ledHours)} hours of LED lights` : '0 hours of LED lights'
    },
  ];

  return (
    <div 
      className="w-60 h-screen flex flex-col sticky top-0"
      style={{ backgroundColor: '#1F3A2E' }}
    >
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>EcoQuest</span>
        </h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.route}
            onClick={() => router.push(`/${item.route}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200"
            style={{
              backgroundColor: activeRoute === item.route ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              if (activeRoute !== item.route) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeRoute !== item.route) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Expandable Total Impact Card */}
      <div className="border-t border-white/10 relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 text-left transition-all duration-200 hover:bg-white/5"
        >
          {/* Collapsed State - Show Preview Stats */}
          {!isExpanded && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white/80">Total Impact</p>
                <span className="text-white/60 text-sm">▼</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* CO2 Saved */}
                <div className="text-center">
                  <div className="text-lg mb-0.5">🌍</div>
                  <div className="text-xs font-bold text-white">
                    {stats ? `${stats.co2Saved.toFixed(1)}kg` : '0.0kg'}
                  </div>
                  <div className="text-xs text-white/50">CO2</div>
                </div>
                {/* XP Earned */}
                <div className="text-center">
                  <div className="text-lg mb-0.5">⚡</div>
                  <div className="text-xs font-bold text-white">
                    {stats ? stats.xpEarned : 0}
                  </div>
                  <div className="text-xs text-white/50">XP</div>
                </div>
                {/* Streak */}
                <div className="text-center">
                  <div className="text-lg mb-0.5">🔥</div>
                  <div className="text-xs font-bold text-white">
                    {stats ? stats.streakDays : 0}
                  </div>
                  <div className="text-xs text-white/50">Days</div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded State Header */}
          {isExpanded && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Total Impact</p>
              <span 
                className="text-white text-lg transition-transform duration-200"
                style={{ transform: 'rotate(180deg)' }}
              >
                ▼
              </span>
            </div>
          )}
        </button>

        {/* Expanded Content - Positioned Absolutely to Overlay */}
        {isExpanded && (
          <div
            className="absolute bottom-full left-0 right-0 transition-all duration-300 pt-4"
            style={{ 
              zIndex: 100,
              backgroundColor: '#1F3A2E',
            }}
          >
            <div className="px-4 pb-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {statsDisplay.map((stat, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <div className="text-xl mb-1">{stat.icon}</div>
                    <div className="text-sm font-bold text-white mb-0.5">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/60">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Equivalents */}
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(212, 245, 142, 0.15)' }}
              >
                <p className="text-xs font-semibold text-white/80 mb-2">
                  Equivalent to:
                </p>
                <div className="space-y-1.5">
                  {equivalents.map((eq, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm">{eq.icon}</span>
                      <span className="text-xs text-white/90">
                        {eq.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
