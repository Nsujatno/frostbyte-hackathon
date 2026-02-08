'use client';

import { useState } from 'react';

interface MissionCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  co2SavedKg?: number;
  moneySaved?: number;
  status?: string;
  onComplete?: () => void;
}

export default function MissionCard({
  id,
  title,
  description,
  category,
  xpReward,
  co2SavedKg,
  moneySaved,
  status = 'available',
  onComplete
}: MissionCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState('');

  const handleCompleteMission = async () => {
    if (isCompleting || status === 'completed') return;

    setIsCompleting(true);
    setError('');

    try {
      const token = localStorage.getItem('supabase_token');
      
      if (!token) {
        setError('Please log in to complete missions');
        setIsCompleting(false);
        return;
      }

      const response = await fetch('http://localhost:8000/activities/complete-mission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mission_id: id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reset loading state
        setIsCompleting(false);
        
        // Trigger parent refresh
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(data.detail || 'Failed to complete mission');
        setIsCompleting(false);
      }
    } catch (err: any) {
      console.error('Error completing mission:', err);
      setError('Error completing mission. Please try again.');
      setIsCompleting(false);
    }
  };
  const categoryImages: Record<string, string> = {
    transportation: '/transportation.png',
    food: '/food.png',
    energy: '/energy.png',
    shopping: '/shopping.png',
  };

  const categoryAttributions: Record<string, React.ReactNode> = {
    transportation: (
      <a href="https://www.flaticon.com/free-icons/car" title="car icons" target="_blank" rel="noopener noreferrer">
        Car icons created by Konkapp - Flaticon
      </a>
    ),
    food: (
      <a href="https://www.flaticon.com/free-icons/food" title="food icons" target="_blank" rel="noopener noreferrer">
        Food icons created by Freepik - Flaticon
      </a>
    ),
    energy: (
      <a href="https://www.flaticon.com/free-icons/save" title="save icons" target="_blank" rel="noopener noreferrer">
        Save icons created by Freepik - Flaticon
      </a>
    ),
    shopping: (
      <a href="https://www.flaticon.com/free-icons/shopping-bag" title="shopping bag icons" target="_blank" rel="noopener noreferrer">
        Shopping bag icons created by iconixar - Flaticon
      </a>
    ),
  };

  const categoryColors: Record<string, string> = {
    transportation: '#E3F2FD',
    food: '#F1F8E9',
    energy: '#FFF3E0',
    shopping: '#FCE4EC',
  };

  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E1E8E4',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: categoryColors[category] || '#F4F7F5' }}
          >
            <img 
              src={categoryImages[category] || '/placeholder.png'} 
              alt={`${category} icon`}
              className="w-6 h-6 object-contain"
            />
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#1F3A2E' }}>
              {title}
            </h4>
            <p className="text-xs capitalize" style={{ color: '#5A7A66' }}>
              {category}
            </p>
          </div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#D4F58E', color: '#1F3A2E' }}
        >
          +{xpReward} XP
        </div>
      </div>

      {/* Description */}
      <p className="text-sm mb-4" style={{ color: '#5A7A66', lineHeight: 1.5 }}>
        {description}
      </p>

      {/* Impact metrics */}
      <div className="flex items-center gap-4 mb-4">
        {co2SavedKg != null && co2SavedKg > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm">🌍</span>
            <span className="text-xs font-semibold" style={{ color: '#2E5D3F' }}>
              {co2SavedKg}kg CO2
            </span>
          </div>
        )}
        {moneySaved != null && moneySaved > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm">💰</span>
            <span className="text-xs font-semibold" style={{ color: '#2E5D3F' }}>
              ${moneySaved.toFixed(2)} saved
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: '#FEE', color: '#C00' }}>
          {error}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleCompleteMission}
        className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: status === 'completed' ? '#E8E8E8' : '#4A7C59',
          color: status === 'completed' ? '#5A7A66' : '#FFFFFF',
        }}
        disabled={status === 'completed' || isCompleting}
      >
        {isCompleting ? 'Completing...' : status === 'completed' ? '✓ Completed' : 'Complete Mission'}
      </button>

      {/* Icon Attribution */}
      <div className="mt-2 text-xs text-center" style={{ color: '#9CA3AF' }}>
        {categoryAttributions[category]}
      </div>
    </div>
  );
}
