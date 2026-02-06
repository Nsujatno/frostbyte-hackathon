'use client';

interface MissionCardProps {
  title: string;
  description: string;
  category: string;
  xpReward: number;
  co2SavedKg?: number;
  moneySaved?: number;
  status?: string;
}

export default function MissionCard({
  title,
  description,
  category,
  xpReward,
  co2SavedKg,
  moneySaved,
  status = 'available'
}: MissionCardProps) {
  const categoryEmojis: Record<string, string> = {
    transportation: '🚌',
    food: '🥗',
    energy: '⚡',
    shopping: '🛍️',
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
            {categoryEmojis[category] || '🎯'}
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

      {/* Action button */}
      <button
        className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
        style={{
          backgroundColor: status === 'completed' ? '#E8E8E8' : '#4A7C59',
          color: status === 'completed' ? '#5A7A66' : '#FFFFFF',
        }}
        disabled={status === 'completed'}
      >
        {status === 'completed' ? '✓ Completed' : 'Start Mission'}
      </button>
    </div>
  );
}
