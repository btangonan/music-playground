import { Play, Save, Settings, Square, Upload, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import KeySelector from './KeySelector';
import MidiUploader from './MidiUploader';

interface TopBarProps {
  isPlaying: boolean;
  bpm: number;
  onPlayPause: () => void;
  onSave: () => void;
  onClearAll: () => void;
  onBpmChange: (bpm: number) => void;
  selectedKey: string;
  onKeyChange: (key: string) => void;
  resolution: '1/4' | '1/8' | '1/16';
  onResolutionChange: (resolution: '1/4' | '1/8' | '1/16') => void;
  midiMetadata: { name: string; bpm: number; iconCount: number; noteCount: number } | null;
  onMidiUpload: (placements: any[], metadata: any) => void;
  onShowMidiModal: () => void;
  ensureAudioEngine: () => Promise<any>;
}

export default function TopBar({
  isPlaying,
  bpm,
  onPlayPause,
  onSave,
  onClearAll,
  onBpmChange,
  selectedKey,
  onKeyChange,
  resolution,
  onResolutionChange,
  midiMetadata,
  onMidiUpload,
  onShowMidiModal,
  ensureAudioEngine
}: TopBarProps) {
  const midiUploaderRef = useRef<{ triggerUpload: () => void }>(null);

  const handleImportClick = () => {
    // Always trigger file picker to import new MIDI
    const fileInput = document.querySelector('input[type="file"][accept*="midi"]') as HTMLInputElement;
    fileInput?.click();
  };

  const handleClearClick = () => {
    if (window.confirm('Clear all notes and chords? This cannot be undone.')) {
      onClearAll();
    }
  };
  return (
    <div 
      className="bg-white border-2 border-black rounded-2xl p-4 mb-4"
      style={{ 
        height: '60px'
      }}
    >
      <div className="flex items-center justify-between h-full w-full">
        {/* Left Side - Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            className="
              bg-[#FFD11A] px-3 py-2 rounded-xl
              flex items-center gap-2
              border-none
              bounce-transition hover:scale-105 active:scale-98
              hover:opacity-90
            "
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-black stroke-black" />
            ) : (
              <Play className="w-4 h-4 fill-black stroke-black" />
            )}
            <span>Play Loop</span>
          </button>

          <button
            onClick={onSave}
            className="
              bg-white border border-[rgba(0,0,0,0.1)] px-3 py-2 rounded-xl
              flex items-center gap-2
              bounce-transition hover:scale-105 active:scale-98
              hover:bg-[rgba(0,0,0,0.05)]
            "
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            <Save className="w-4 h-4" />
            <span>Save to Pad</span>
          </button>

          {/* Import MIDI Button */}
          <div className="relative">
            <button
              onClick={handleImportClick}
              className="
                bg-white border border-[rgba(0,0,0,0.1)] px-3 py-2 rounded-xl
                flex items-center gap-2
                bounce-transition hover:scale-105 active:scale-98
                hover:bg-[rgba(0,0,0,0.05)]
              "
              style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}
            >
              <Upload className="w-4 h-4" />
              <span>Import MIDI</span>
            </button>

            {/* Hidden MidiUploader */}
            <div style={{ display: 'none' }}>
              <MidiUploader
                compact={true}
                ensureAudioEngine={ensureAudioEngine}
                onPlacements={onMidiUpload}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Key, BPM & Settings */}
        <div className="flex items-center gap-3">
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
              value={Math.round(bpm)}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
              className="w-12 text-center bg-transparent outline-none"
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px' }}
              min="60"
              max="200"
              step="1"
            />
          </div>

          {/* Clear All Button */}
          <button
            onClick={handleClearClick}
            className="
              bg-white border border-[rgba(0,0,0,0.1)] p-2.5 rounded-xl
              flex items-center justify-center
              bounce-transition hover:scale-105 active:scale-98
              hover:bg-[rgba(0,0,0,0.05)]
            "
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            className="
              bg-white border border-[rgba(0,0,0,0.1)] p-2.5 rounded-xl
              flex items-center justify-center
              bounce-transition hover:scale-105 active:scale-98
              hover:bg-[rgba(0,0,0,0.05)]
            "
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
