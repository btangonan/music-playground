import { useState, useRef } from 'react';
import { SOUND_ICONS } from './SoundIcons';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-15 (time step)
  pitch: number; // MIDI note number (48-83 for 3 octaves: C3-B5)
  velocity: number;
}

interface IconSequencerProps {
  selectedSound: string | null;
  selectedKey: string;
  draggingSound: string | null;
}

// Piano roll constants
const PIANO_ROLL_WIDTH = 768; // 16 columns × 48px
const PIANO_ROLL_HEIGHT = 360; // 36 rows × 10px
const TIME_STEPS = 16;
const COLUMN_WIDTH = 48; // pixels
const ROW_HEIGHT = 10; // pixels per semitone
const TOTAL_SEMITONES = 36; // 3 octaves

// Zone definitions (no physical borders, just colors)
const ZONES = [
  { id: 'high', startRow: 0, endRow: 11, baseNote: 72, color: 'rgba(224, 242, 254, 0.3)' }, // C5-B5, sky-100/30
  { id: 'mid', startRow: 12, endRow: 23, baseNote: 60, color: '#FFFFFF' }, // C4-B4, white
  { id: 'low', startRow: 24, endRow: 35, baseNote: 48, color: 'rgba(255, 251, 235, 0.3)' }, // C3-B3, amber-50/30
];

// Melodic sounds (synths, bass)
const MELODIC_CATEGORIES = ['synths', 'bass'];

// Drum sounds with canonical pitches
const DRUM_CANONICAL_PITCHES: { [key: string]: number } = {
  'kick': 48, // C3
  'snare': 50, // D3
  'hihat': 54, // F#3
  'clap': 52, // E3
};

// Key to root note mapping (C3 = 48)
const KEY_TO_ROOT: { [key: string]: number } = {
  'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
};

// Major scale intervals for I chord (root, major 3rd, perfect 5th)
const I_CHORD_INTERVALS = [0, 4, 7];

export default function IconSequencer({ selectedSound, selectedKey, draggingSound }: IconSequencerProps) {
  const [placements, setPlacements] = useState<IconPlacement[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<number | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sequencerRef = useRef<HTMLDivElement>(null);

  // Get sound category info
  const getSoundInfo = (soundId: string) => {
    return SOUND_ICONS.find(s => s.id === soundId);
  };

  // Check if sound is melodic
  const isMelodic = (soundId: string) => {
    const sound = getSoundInfo(soundId);
    return sound && MELODIC_CATEGORIES.includes(sound.category);
  };

  // Get canonical pitch for drums
  const getCanonicalPitch = (soundId: string): number | null => {
    return DRUM_CANONICAL_PITCHES[soundId] || null;
  };

  // Get highlighted rows based on dragged sound and selected key
  const getHighlightedRows = (soundId: string | null, key: string): number[] => {
    if (!soundId) return [];
    
    const sound = getSoundInfo(soundId);
    if (!sound) return [];

    if (isMelodic(soundId)) {
      // Melodic: highlight I chord notes (root, major 3rd, perfect 5th) across all octaves
      const rootOffset = KEY_TO_ROOT[key] || 0;
      const highlightedRows: number[] = [];
      
      // For each octave (3 octaves: C3-B3, C4-B4, C5-B5)
      for (let octave = 0; octave < 3; octave++) {
        I_CHORD_INTERVALS.forEach(interval => {
          const pitchInOctave = (rootOffset + interval) % 12;
          // Calculate row: 12 rows per octave, inverted (high notes at top)
          // Octave 0 (LOW/C3-B3) = rows 24-35
          // Octave 1 (MID/C4-B4) = rows 12-23
          // Octave 2 (HIGH/C5-B5) = rows 0-11
          const octaveStartRow = (2 - octave) * 12;
          const row = octaveStartRow + (11 - pitchInOctave);
          highlightedRows.push(row);
        });
      }
      
      return highlightedRows;
    } else {
      // Drums: highlight only canonical row
      const canonicalPitch = getCanonicalPitch(soundId);
      if (canonicalPitch === null) return [];
      const row = 35 - (canonicalPitch - 48); // Convert pitch to row (inverted)
      return [row];
    }
  };

  const handlePlacementDragStart = (e: React.DragEvent, placementIndex: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('placementIndex', placementIndex.toString());
    setDraggedPlacementIndex(placementIndex);
    setIsDragging(true);
    
    const placement = placements[placementIndex];
    setDragGhost({
      x: e.clientX,
      y: e.clientY,
      soundId: placement.soundId
    });
    
    // Create invisible drag image
    const dragImg = document.createElement('div');
    dragImg.style.width = '1px';
    dragImg.style.height = '1px';
    dragImg.style.opacity = '0';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 0, 0);
    setTimeout(() => document.body.removeChild(dragImg), 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Activate highlighting when dragging over sequencer
    setIsDragging(true);
    
    // Update ghost position
    if (dragGhost) {
      setDragGhost({
        ...dragGhost,
        x: e.clientX,
        y: e.clientY
      });
    }
    
    if (!sequencerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate cell position
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    
    if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) {
      setHoveredCell({ row, col });
    }
  };

  const handleDragEnd = () => {
    setDraggedPlacementIndex(null);
    setHoveredCell(null);
    setDragGhost(null);
    setIsDragging(false);
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!hoveredCell) return;
    
    // Convert row to pitch (inverted: row 0 = B5, row 35 = C3)
    const pitch = 83 - hoveredCell.row; // B5 (83) at top, C3 (48) at bottom
    
    // Check if we're moving an existing placement
    const placementIndexStr = e.dataTransfer.getData('placementIndex');
    if (placementIndexStr) {
      // Moving existing placement
      const placementIndex = parseInt(placementIndexStr);
      const updatedPlacements = [...placements];
      updatedPlacements[placementIndex] = {
        ...updatedPlacements[placementIndex],
        bar: hoveredCell.col,
        pitch,
      };
      setPlacements(updatedPlacements);
      setDraggedPlacementIndex(null);
    } else {
      // Adding new placement from gallery
      const soundId = e.dataTransfer.getData('soundId');
      if (!soundId) return;
      
      const newPlacement: IconPlacement = {
        soundId,
        bar: hoveredCell.col,
        pitch,
        velocity: 80,
      };
      setPlacements([...placements, newPlacement]);
    }
    
    setHoveredCell(null);
    setIsDragging(false);
  };

  const handlePlacementClick = (index: number) => {
    setSelectedPlacement(index === selectedPlacement ? null : index);
  };

  const handlePlacementRightClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setPlacements(placements.filter((_, i) => i !== index));
    setSelectedPlacement(null);
  };

  // Convert pitch to row
  const pitchToRow = (pitch: number): number => {
    return 83 - pitch; // B5 (83) = row 0, C3 (48) = row 35
  };

  // Determine which sound is being dragged (from gallery or placement)
  const getDraggedSoundId = (): string | null => {
    if (dragGhost) return dragGhost.soundId;
    if (draggingSound) return draggingSound;
    return null;
  };

  const draggedSoundId = getDraggedSoundId();
  const highlightedRows = getHighlightedRows(draggedSoundId, selectedKey);

  return (
    <div 
      ref={sequencerRef}
      className="bg-white border-2 border-black rounded-2xl p-4 relative"
    >
      {/* Header */}
      <h3 
        className="mb-3"
        style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '18px' }}
      >
        Icon Sound Sequencer
      </h3>

      {/* Instructions */}
      <p 
        className="text-[rgba(0,0,0,0.4)] mb-3 italic"
        style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '11px' }}
      >
        Drag icons from the gallery above. Vertical = pitch (3 octaves), horizontal = timing (16 steps).
      </p>
      
      {/* Unified Piano Roll */}
      <div 
        className="border-2 border-black rounded-lg overflow-hidden relative"
        style={{ 
          width: `${PIANO_ROLL_WIDTH}px`,
          height: `${PIANO_ROLL_HEIGHT}px`
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Zone Background Colors */}
        {ZONES.map(zone => (
          <div
            key={zone.id}
            className="absolute w-full pointer-events-none"
            style={{
              top: `${zone.startRow * ROW_HEIGHT}px`,
              height: `${(zone.endRow - zone.startRow + 1) * ROW_HEIGHT}px`,
              backgroundColor: zone.color,
            }}
          />
        ))}

        {/* Vertical step dividers (always visible) */}
        <div className="absolute inset-0 pointer-events-none">
          {Array(TIME_STEPS).fill(null).map((_, i) => (
            <div
              key={`col-${i}`}
              className="absolute h-full"
              style={{ 
                left: `${i * COLUMN_WIDTH}px`,
                width: '1px',
                backgroundColor: 'rgba(0,0,0,0.05)',
              }}
            />
          ))}
        </div>

        {/* Horizontal semitone lines (visible only during drag) */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            opacity: isDragging ? 1 : 0,
            transition: 'opacity 200ms ease-in-out'
          }}
        >
          {Array(TOTAL_SEMITONES).fill(null).map((_, i) => (
            <div
              key={`row-${i}`}
              className="absolute w-full"
              style={{ 
                top: `${i * ROW_HEIGHT}px`,
                height: '1px',
                backgroundColor: 'rgba(0,0,0,0.05)',
              }}
            />
          ))}
        </div>

        {/* Harmony Highlighting (during drag) */}
        {isDragging && draggedSoundId && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dimmed overlay on all rows first */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.7)',
                transition: 'all 150ms ease-out'
              }}
            />
            
            {/* Green glow on highlighted rows */}
            {highlightedRows.map(row => (
              <div
                key={`highlight-${row}`}
                className="absolute w-full"
                style={{
                  top: `${row * ROW_HEIGHT}px`,
                  height: `${ROW_HEIGHT}px`,
                  backgroundColor: 'rgba(74, 222, 128, 0.7)',
                  boxShadow: 'inset 0 2px 4px rgba(74, 222, 128, 0.3)',
                  transition: 'all 150ms ease-out'
                }}
              />
            ))}
          </div>
        )}

        {/* Hover Preview */}
        {hoveredCell && (
          <div
            className="absolute pointer-events-none"
            style={{ 
              left: `${hoveredCell.col * COLUMN_WIDTH}px`,
              top: `${hoveredCell.row * ROW_HEIGHT}px`,
              width: `${COLUMN_WIDTH}px`,
              height: `${ROW_HEIGHT}px`,
              border: '2px solid rgba(255,209,26,0.6)',
              backgroundColor: 'rgba(255,209,26,0.1)',
              transition: 'all 50ms ease-out',
              zIndex: 10
            }}
          />
        )}

        {/* Placed Icons */}
        {placements.map((placement, index) => {
          const sound = getSoundInfo(placement.soundId);
          if (!sound) return null;
          
          const Icon = sound.icon;
          const row = pitchToRow(placement.pitch);
          const col = placement.bar;
          
          const isSelected = selectedPlacement === index;
          const isDraggingThis = draggedPlacementIndex === index;

          return (
            <div
              key={index}
              draggable
              onDragStart={(e) => handlePlacementDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                handlePlacementClick(index);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                handlePlacementRightClick(e, index);
              }}
              className={`
                absolute rounded-lg border-2 border-black
                flex items-center justify-center overflow-hidden
                hover:scale-110 active:scale-95
                cursor-grab active:cursor-grabbing
                ${isSelected 
                  ? 'ring-2 ring-[#FFD11A] ring-offset-1 bg-white' 
                  : 'bg-white hover:ring-1 hover:ring-[rgba(0,0,0,0.3)]'
                }
                ${isDraggingThis ? 'opacity-30' : ''}
              `}
              style={{ 
                left: `${col * COLUMN_WIDTH + COLUMN_WIDTH / 2 - 16}px`,
                top: `${row * ROW_HEIGHT + ROW_HEIGHT / 2 - 16}px`,
                width: '32px',
                height: '32px',
                zIndex: isDraggingThis ? 1 : 20,
                transition: 'transform 150ms ease-out'
              }}
              title={`${sound.name} - Step ${col + 1}`}
            >
              <div className="w-5 h-5 pointer-events-none flex items-center justify-center">
                <Icon />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar Numbers */}
      <div className="flex mt-2" style={{ width: `${PIANO_ROLL_WIDTH}px` }}>
        {[1, 5, 9, 13].map((barNum, i) => (
          <div
            key={barNum}
            className="flex-1 text-center text-[rgba(0,0,0,0.4)]"
            style={{ 
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: '11px'
            }}
          >
            {barNum}
          </div>
        ))}
      </div>

      {/* Drag Ghost - follows cursor */}
      {dragGhost && (() => {
        const sound = getSoundInfo(dragGhost.soundId);
        if (!sound) return null;
        const Icon = sound.icon;
        
        return (
          <div
            className="fixed pointer-events-none z-50 rounded-lg border-2 border-black bg-white flex items-center justify-center overflow-hidden"
            style={{
              left: `${dragGhost.x - 16}px`,
              top: `${dragGhost.y - 16}px`,
              width: '32px',
              height: '32px',
              opacity: 0.8
            }}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <Icon />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
