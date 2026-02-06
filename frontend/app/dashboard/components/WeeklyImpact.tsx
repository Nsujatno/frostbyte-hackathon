'use client';

export default function WeeklyImpact() {
  const stats = [
    { icon: '🌍', label: 'CO2 Saved', value: '18.5kg' },
    { icon: '⚡', label: 'XP Earned', value: '385' },
    { icon: '🎯', label: 'Missions', value: '7/10' },
    { icon: '🔥', label: 'Streak', value: '5 Days' },
  ];

  const equivalents = [
    { icon: '🌳', text: '0.8 trees planted' },
    { icon: '🚗', text: '45 miles not driven' },
    { icon: '💡', text: '30 hours of LED lights' },
  ];

  return (
    <div 
      className="rounded-2xl p-6 mb-5"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <h3 className="text-xl font-bold mb-5" style={{ color: '#1F3A2E' }}>
        This Week's Impact
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#F4F7F5' }}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#2E5D3F' }}>
              {stat.value}
            </div>
            <div className="text-xs font-semibold" style={{ color: '#5A7A66' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Equivalents */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: '#F0F9F4', border: '1px solid #E1E8E4' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: '#5A7A66' }}>
          Equivalent to:
        </p>
        <div className="space-y-2">
          {equivalents.map((eq, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-lg">{eq.icon}</span>
              <span className="text-sm" style={{ color: '#1F3A2E' }}>
                {eq.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
