'use client';

interface PlantVisualizationProps {
  stageName: string;
  stage: number;
  xpToNextStage: number;
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

const plantAttributions: Record<number, string> = {
  1: 'Seeds icons created by Freepik - Flaticon',
  2: 'Sprout icons created by Umeicon - Flaticon',
  3: 'Seedling icons created by Umeicon - Flaticon',
  4: 'Sapling icons created by Umeicon - Flaticon',
  5: 'Tree icons created by Freepik - Flaticon',
  6: 'Tree icons created by justicon - Flaticon',
  7: 'Forest icons created by Freepik - Flaticon',
};

export default function PlantVisualization({ stageName, stage, xpToNextStage }: PlantVisualizationProps) {
  return (
    <div 
      className="rounded-2xl p-6 mb-5"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Plant illustration */}
      <div className="flex justify-center mb-6">
        <div className="text-center">
          <img 
            src={plantImages[stage] || plantImages[1]}
            alt={`${stageName} plant stage ${stage}`}
            style={{ width: '180px', height: '180px', objectFit: 'contain' }}
          />
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
      <div className="flex gap-3 justify-center mb-4">
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
      </div>

      {/* Attribution */}
      <div className="text-center">
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          {plantAttributions[stage]}
        </p>
      </div>
    </div>
  );
}

