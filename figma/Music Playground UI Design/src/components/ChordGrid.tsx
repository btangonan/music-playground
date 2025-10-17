import { useState } from 'react';

const CHORD_PALETTE = [
  { id: 'I', name: 'I', roman: 'I', color: '#CCFF00', label: 'Tonic' },
  { id: 'ii', name: 'ii', roman: 'ii', color: '#FEF3C7', label: 'Subdominant' },
  { id: 'iii', name: 'iii', roman: 'iii', color: '#FEF3C7', label: 'Mediant' },
  { id: 'IV', name: 'IV', roman: 'IV', color: '#FEF3C7', label: 'Subdominant' },
  { id: 'V', name: 'V', roman: 'V', color: '#FF62C6', label: 'Dominant' },
  { id: 'vi', name: 'vi', roman: 'vi', color: '#FEF3C7', label: 'Submediant' },
  { id: 'bVII', name: 'bVII', roman: 'bVII', color: '#CDB3FF', label: 'Subtonic' },
];

const PRESETS = {
  'Pop': ['I', 'V', 'vi', 'IV'],
  'Sad': ['vi', 'IV', 'I', 'V'],
  'Chill': ['I', 'iii', 'vi', 'IV'],
  'Shoegaze': ['I', 'bVII', 'IV', 'V'],
};

type LoopLength = 1 | 2 | 4 | 8;

export default function ChordGrid() {
  const [loopLength, setLoopLength] = useState<LoopLength>(4);
  const [selectedChord, setSelectedChord] = useState<string | null>('I');
  const [grid, setGrid] = useState<(string | null)[]>(Array(16).fill(null));

  const handleGridClick = (index: number) => {
    if (index >= loopLength) return;
    
    const newGrid = [...grid];
    newGrid[index] = selectedChord;
    setGrid(newGrid);
  };

  const handleRightClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const newGrid = [...grid];
    newGrid[index] = null;
    setGrid(newGrid);
  };

  const applyPreset = (presetName: string) => {
    const pattern = PRESETS[presetName as keyof typeof PRESETS];
    if (!pattern) return;
    
    const newGrid = Array(16).fill(null);
    pattern.forEach((chord, i) => {
      if (i < loopLength) {
        newGrid[i] = chord;
      }
    });
    setGrid(newGrid);
  };

  const getChordColor = (chordId: string | null) => {
    if (!chordId) return 'transparent';
    const chord = CHORD_PALETTE.find(c => c.id === chordId);
    return chord?.color || '#FFD11A';
  };

  // Get grid layout based on loop length
  // Bar size matches height of 4 stacked 32px buttons + 3 gaps (8px each) = 152px
  const getGridLayout = () => {
    switch (loopLength) {
      case 1:
        return { cols: 1, rows: 1, size: 152 };
      case 2:
        return { cols: 2, rows: 1, size: 152 };
      case 4:
        return { cols: 4, rows: 1, size: 152 };
      case 8:
        return { cols: 8, rows: 1, size: 152 };
      default:
        return { cols: 4, rows: 1, size: 152 };
    }
  };

  const layout = getGridLayout();

  return (
    <div 
      className="bg-white pt-4 pb-3 mb-2"
    >
      {/* Top Row: Title + Presets + Chords */}
      <div className="flex items-center gap-4 mb-3">
        {/* Title */}
        <span 
          className="text-[rgba(0,0,0,0.6)]"
          style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          CHORDS:
        </span>

        {/* Preset Buttons */}
        <div className="flex gap-2">
          {Object.keys(PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="
                bg-white border-2 border-black rounded-lg px-3
                bounce-transition hover:scale-105 active:scale-95
                hover:bg-gray-100
              "
              style={{ 
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: '12px',
                height: '32px'
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Chord Palette - Horizontal */}
        <div className="flex items-center gap-2">
          {CHORD_PALETTE.map((chord) => (
            <button
              key={chord.id}
              onClick={() => setSelectedChord(chord.id)}
              title={chord.label}
              className={`
                rounded-lg border-2 border-black
                bounce-transition hover:scale-105 active:scale-95
                flex items-center justify-center
                ${selectedChord === chord.id 
                  ? 'ring-2 ring-black ring-offset-2' 
                  : ''
                }
              `}
              style={{ 
                backgroundColor: chord.color,
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '12px',
                width: '48px',
                height: '32px'
              }}
            >
              {chord.roman}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Bar Number Buttons + Bar Squares */}
      <div className="flex gap-3">
        {/* Loop Length Selector - Vertical Stack */}
        <div className="flex flex-col gap-2">
          {[1, 2, 4, 8].map((length) => (
            <button
              key={length}
              onClick={() => setLoopLength(length as LoopLength)}
              className={`
                rounded-full border-2 border-black
                bounce-transition hover:scale-105 active:scale-95
                flex items-center justify-center
                ${loopLength === length 
                  ? 'bg-black text-white' 
                  : 'bg-white text-black'
                }
              `}
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 600, 
                fontSize: '12px', 
                width: '32px',
                height: '32px',
                padding: '0'
              }}
            >
              {length}
            </button>
          ))}
        </div>

        {/* Bar Grid - Dynamic based on loop length */}
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${layout.cols}, ${layout.size}px)`,
            gridTemplateRows: `repeat(${layout.rows}, ${layout.size}px)`
          }}
        >
          {Array(loopLength).fill(null).map((_, index) => {
            const chord = grid[index];
            return (
              <button
                key={index}
                onClick={() => handleGridClick(index)}
                onContextMenu={(e) => handleRightClick(e, index)}
                className={`
                  rounded-lg border-2 border-black
                  bounce-transition hover:scale-105 active:scale-95
                  hover:border-gray-600
                  flex items-center justify-center
                  ${chord ? 'pixel-fade' : ''}
                `}
                style={{ 
                  backgroundColor: chord ? getChordColor(chord) : 'white',
                  width: `${layout.size}px`,
                  height: `${layout.size}px`,
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: '18px'
                }}
              >
                {chord ? (
                  <span>{CHORD_PALETTE.find(c => c.id === chord)?.roman}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div 
        className="mt-2 text-[rgba(0,0,0,0.4)] italic"
        style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '11px' }}
      >
        Click a bar to select. Right-click to clear.
      </div>
    </div>
  );
}
