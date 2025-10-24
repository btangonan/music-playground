import { type Chord } from './chordData';
import { chordColors } from './chordData';

interface ChordPaletteProps {
  selectedChord: Chord | null;
  onChordSelect: (chord: Chord | null) => void;
  onPresetSelect: (preset: string) => void;
  layout?: 'horizontal' | 'vertical';
}

const CHORDS: Chord[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII', 'sus', 'dim', '+7'];
const PRESETS = ['Pop', 'Sad', 'Chill', 'Shoegaze'];

export default function ChordPalette({ selectedChord, onChordSelect, onPresetSelect, layout = 'horizontal' }: ChordPaletteProps) {
  const handleChordClick = (chord: Chord) => {
    if (selectedChord === chord) {
      onChordSelect(null); // Deselect
    } else {
      onChordSelect(chord);
    }
  };

  // Vertical layout for left sidebar
  if (layout === 'vertical') {
    return (
      <div className="flex flex-col gap-1" style={{ padding: '8px 0' }}>
        {CHORDS.map((chord) => {
          const isSelected = selectedChord === chord;
          const color = chordColors[chord];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          const bgColor = isSelected
            ? `rgba(${r}, ${g}, ${b}, 0.5)`
            : `rgba(${r}, ${g}, ${b}, 0.25)`;

          return (
            <button
              key={chord}
              onClick={() => handleChordClick(chord)}
              className="flex items-center justify-center border border-[rgba(0,0,0,0.1)] transition-all duration-200"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontFamily: 'Inter',
                fontSize: '11px',
                fontWeight: isSelected ? 600 : 500,
                backgroundColor: bgColor,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {chord}
            </button>
          );
        })}
      </div>
    );
  }

  // Horizontal layout (original) - now responsive
  return (
    <div
      className="bg-white"
      style={{ minHeight: '32px', padding: '8px' }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-8">
        {/* Left: Label + Chord Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span
            className="text-[rgba(0,0,0,0.55)] w-full sm:w-auto text-center sm:text-left"
            style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '12px', lineHeight: '16px' }}
          >
            CHORDS:
          </span>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {CHORDS.map((chord) => {
              const isSelected = selectedChord === chord;
              const color = chordColors[chord];
              
              // Convert hex to rgba - always show color, more saturated when selected
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              const bgColor = isSelected 
                ? `rgba(${r}, ${g}, ${b}, 0.5)` // 50% opacity when selected
                : `rgba(${r}, ${g}, ${b}, 0.25)`; // 25% opacity by default
              
              return (
                <button
                  key={chord}
                  onClick={() => handleChordClick(chord)}
                  className="flex items-center justify-center border border-[rgba(0,0,0,0.1)] transition-all duration-200"
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    fontFamily: 'Inter',
                    fontSize: '11px',
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: bgColor,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.4)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {chord}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Preset Label + Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span
            className="text-[rgba(0,0,0,0.55)] w-full sm:w-auto text-center sm:text-left"
            style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '12px', lineHeight: '16px' }}
          >
            PRESETS:
          </span>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => onPresetSelect(preset)}
                className="flex items-center justify-center border border-[rgba(0,0,0,0.1)] transition-all duration-200"
                style={{
                  minWidth: '64px',
                  minHeight: '44px',
                  padding: '0 8px',
                  borderRadius: '8px',
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
