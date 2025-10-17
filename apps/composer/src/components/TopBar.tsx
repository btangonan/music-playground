import { Play, Save, Settings, Square } from 'lucide-react';
import KeySelector from './KeySelector';

interface TopBarProps {
  isPlaying: boolean;
  bpm: number;
  onPlayPause: () => void;
  onSave: () => void;
  onBpmChange: (bpm: number) => void;
  selectedKey: string;
  onKeyChange: (key: string) => void;
  resolution: '1/4' | '1/8' | '1/16';
  onResolutionChange: (resolution: '1/4' | '1/8' | '1/16') => void;
}

export default function TopBar({
  isPlaying,
  bpm,
  onPlayPause,
  onSave,
  onBpmChange,
  selectedKey,
  onKeyChange,
  resolution,
  onResolutionChange
}: TopBarProps) {
  return (
    <div 
      className="bg-white border-2 border-black rounded-2xl p-4 mb-4"
      style={{ 
        height: '60px'
      }}
    >
      <div className="flex items-center justify-between h-full">
        {/* Left Side - Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPlayPause}
            className="
              bg-[#FFD11A] px-3 py-2 rounded-xl
              flex items-center gap-2
              border-none
              bounce-transition hover:scale-105 active:scale-98
              hover:opacity-90
            "
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px' }}
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-black stroke-black" />
            ) : (
              <Play className="w-4 h-4 fill-black stroke-black" />
            )}
            <span>Preview Loop</span>
          </button>

          <button
            onClick={onSave}
            className="
              bg-white border border-[rgba(0,0,0,0.1)] px-3 py-2 rounded-xl
              flex items-center gap-2
              bounce-transition hover:scale-105 active:scale-98
              hover:bg-[rgba(0,0,0,0.05)]
            "
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px' }}
          >
            <Save className="w-4 h-4" />
            <span>Save to Pad</span>
          </button>
        </div>

        {/* Right Side - Key, BPM & Settings */}
        <div className="flex items-center gap-4">
          {/* Key Selector */}
          <KeySelector
            selectedKey={selectedKey}
            onKeyChange={onKeyChange}
          />

          {/* Resolution Toggle */}
          <div className="flex items-center gap-1">
            {(['1/4', '1/8', '1/16'] as const).map((res) => (
              <button
                key={res}
                onClick={() => onResolutionChange(res)}
                className={`
                  px-2 py-1 rounded-lg text-xs
                  transition-all duration-150
                  ${resolution === res
                    ? 'bg-[#FFD11A] text-black font-bold'
                    : 'bg-white border border-[rgba(0,0,0,0.1)] text-[rgba(0,0,0,0.55)] hover:bg-[rgba(0,0,0,0.05)]'
                  }
                `}
                style={{ fontFamily: 'Inter', fontWeight: resolution === res ? 700 : 500, fontSize: '12px' }}
              >
                {res}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="text-[rgba(0,0,0,0.55)]"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px' }}
            >
              BPM:
            </span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
              className="w-12 text-center bg-transparent outline-none"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px' }}
              min="60"
              max="200"
            />
          </div>

          <button
            className="
              bg-white border border-[rgba(0,0,0,0.1)] px-3 py-2 rounded-xl
              flex items-center gap-2
              bounce-transition hover:scale-105 active:scale-98
              hover:bg-[rgba(0,0,0,0.05)]
            "
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px' }}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
