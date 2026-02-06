'use client';

interface PlantVisualizationProps {
  stageName: string;
  stage: number;
  xpToNextStage: number;
}

const plantEmojis: Record<number, string> = {
  1: '🌱',
  2: '🌿',
  3: '🪴',
  4: '🌳',
  5: '🌲',
  6: '🎄',
  7: '🌴',
};

export default function PlantVisualization({ stageName, stage, xpToNextStage }: PlantVisualizationProps) {
  return (
    <div 
      className="rounded-2xl p-6 mb-5"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Plant illustration */}
      <div className="flex justify-center mb-6">
        <div 
          className="text-center"
          style={{ fontSize: '180px', lineHeight: 1 }}
        >
          {plantEmojis[stage] || '🌱'}
        </div>
      </div>

      {/* Stage info */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1F3A2E' }}>
          Stage {stage}: {stageName}
        </h3>
        <p className="text-sm" style={{ color: '#5A7A66' }}>
          {xpToNextStage} XP until next stage
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#E1F5FE',
            color: '#0277BD',
          }}
        >
          💧 Water
        </button>
        <button
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#FCE4EC',
            color: '#C2185B',
          }}
        >
          🎨 Customize
        </button>
        <button
          className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#F3E5F5',
            color: '#7B1FA2',
          }}
        >
          📊 Stats
        </button>
      </div>
    </div>
  );
}

