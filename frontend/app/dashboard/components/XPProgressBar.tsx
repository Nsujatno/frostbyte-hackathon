'use client';

interface XPProgressBarProps {
  currentLevel: number;
  currentXP: number;
  requiredXP: number;
}

export default function XPProgressBar({ currentLevel, currentXP, requiredXP }: XPProgressBarProps) {
  const percentage = (currentXP / requiredXP) * 100;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: '#5A7A66' }}>
          Level {currentLevel}
        </span>
        <span className="text-sm font-semibold" style={{ color: '#5A7A66' }}>
          Level {currentLevel + 1}
        </span>
      </div>
      
      <div 
        className="h-8 rounded-full overflow-hidden"
        style={{ backgroundColor: '#E8E8E8' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #C8E6A0 0%, #D4F58E 100%)',
          }}
        >
          {percentage > 20 && (
            <span className="text-xs font-bold" style={{ color: '#1F3A2E' }}>
              {currentXP} XP
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-sm font-semibold" style={{ color: '#2E5D3F' }}>
          {currentXP} / {requiredXP} XP ({Math.round(percentage)}%)
        </span>
      </div>
    </div>
  );
}
