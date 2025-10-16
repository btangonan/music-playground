import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-15 (time step)
  pitch: number; // MIDI note number (48-83 for 3 octaves: C3-B5)
  velocity: number;
}

interface IconSequencerWithDensityProps {
  selectedSound: string | null;
  selectedKey: string;
  draggingSound: string | null;
  barChords: (Chord | null)[]; // 4 bars, each can have a chord
  assignmentMode: Chord | null; // Which chord is being assigned
  onBarChordAssign: (barIndex: number, chord: Chord) => void;
  currentStep: number; // Now a continuous float 0-16
  isPlaying: boolean;
  onPlacementsChange?: (placements: IconPlacement[]) => void;
}

const COLUMN_WIDTH = 48;
const ROW_HEIGHT = 10;
const TIME_STEPS = 16;
const BARS = 4;
const STEPS_PER_BAR = 4;
const TOTAL_SEMITONES = 36; // C3 to B5
const BASE_MIDI = 48; // C3

// Zone boundaries (row indices, 0-based from top)
const ZONE_HIGH_END = 12;  // rows 0-11: C5-B5
const ZONE_MID_END = 24;   // rows 12-23: C4-B4
// rows 24-35: C3-B3 (LOW)

export default function IconSequencerWithDensity({
  selectedSound,
  selectedKey,
  draggingSound,
  barChords,
  assignmentMode,
  onBarChordAssign,
  currentStep,
  isPlaying,
  onPlacementsChange
}: IconSequencerWithDensityProps) {
  const [placements, setPlacements] = useState<IconPlacement[]>([]);

  // Notify parent of placement changes
  useEffect(() => {
    onPlacementsChange?.(placements);
  }, [placements, onPlacementsChange]);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<number | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sequencerRef = useRef<HTMLDivElement>(null);

  const handlePlacementDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    
    setDraggedPlacementIndex(index);
    setIsDragging(true);
    
    const placement = placements[index];
    setDragGhost({
      x: e.clientX,
      y: e.clientY,
      soundId: placement.soundId
    });
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('placementIndex', index.toString());
    e.dataTransfer.setData('soundId', placement.soundId);
    
    // Create a completely transparent DOM element for drag image
    const emptyDiv = document.createElement('div');
    emptyDiv.style.width = '1px';
    emptyDiv.style.height = '1px';
    emptyDiv.style.position = 'absolute';
    emptyDiv.style.top = '-9999px';
    emptyDiv.style.opacity = '0';
    document.body.appendChild(emptyDiv);
    e.dataTransfer.setDragImage(emptyDiv, 0, 0);
    
    // Clean up after a short delay
    setTimeout(() => {
      if (document.body.contains(emptyDiv)) {
        document.body.removeChild(emptyDiv);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Determine which sound is being dragged
    const soundId = dragGhost?.soundId || draggingSound;
    
    // Set or update drag ghost
    if (soundId) {
      setDragGhost({
        x: e.clientX,
        y: e.clientY,
        soundId
      });
      
      // Set dragging state
      if (!isDragging) {
        setIsDragging(true);
      }
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

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear hover when leaving the sequencer completely
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setHoveredCell(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!sequencerRef.current) return;
    
    const rect = sequencerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate cell position at drop point
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    
    if (col < 0 || col >= TIME_STEPS || row < 0 || row >= TOTAL_SEMITONES) {
      // Out of bounds
      setHoveredCell(null);
      setIsDragging(false);
      setDragGhost(null);
      setDraggedPlacementIndex(null);
      return;
    }
    
    // Convert row to pitch (inverted: row 0 = B5, row 35 = C3)
    const pitch = 83 - row; // B5 (83) at top, C3 (48) at bottom
    
    // Check if we're moving an existing placement
    const placementIndexStr = e.dataTransfer.getData('placementIndex');
    if (placementIndexStr) {
      // Moving existing placement
      const placementIndex = parseInt(placementIndexStr);
      const updatedPlacements = [...placements];
      updatedPlacements[placementIndex] = {
        ...updatedPlacements[placementIndex],
        bar: col,
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
        bar: col,
        pitch,
        velocity: 80,
      };
      setPlacements([...placements, newPlacement]);
    }
    
    setHoveredCell(null);
    setIsDragging(false);
    setDragGhost(null);
  };

  const handleBarClick = (e: React.MouseEvent, barIndex: number) => {
    e.stopPropagation();
    if (assignmentMode) {
      onBarChordAssign(barIndex, assignmentMode);
    }
  };

  // Render the grid with chord density overlays
  const renderGrid = () => {
    const rows = [];
    
    for (let row = 0; row < TOTAL_SEMITONES; row++) {
      const midi = 83 - row; // B5 at top (83), C3 at bottom (48)
      const pc = midiToPitchClass(midi);
      
      // Determine zone background (with 30% opacity for high/low) - ONLY when dragging
      let zoneBg = '#FFFFFF'; // Default: white for all zones
      if (isDragging) {
        if (row < ZONE_HIGH_END) {
          zoneBg = 'rgba(224, 242, 254, 0.3)'; // HIGH (sky-100 @ 30%)
        } else if (row >= ZONE_MID_END) {
          zoneBg = 'rgba(255, 251, 235, 0.3)'; // LOW (amber-50 @ 30%)
        }
        // MID stays white
      }
      
      const cells = [];
      
      for (let col = 0; col < TIME_STEPS; col++) {
        const barIndex = Math.floor(col / STEPS_PER_BAR);
        const chord = barChords[barIndex];
        
        // Bar chord color (ALWAYS visible - subtle 20% opacity)
        let barChordColor = 'transparent';
        if (chord) {
          const color = chordColors[chord];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          barChordColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        
        // Pitch density overlay (ONLY when dragging)
        let densityColor = 'transparent';
        if (chord) {
          const alpha = densityAlpha(pc, chord);
          const color = chordColors[chord];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          densityColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
        
        cells.push(
          <div
            key={col}
            style={{
              width: `${COLUMN_WIDTH}px`,
              height: `${ROW_HEIGHT}px`,
              minWidth: `${COLUMN_WIDTH}px`,
              minHeight: `${ROW_HEIGHT}px`,
              maxWidth: `${COLUMN_WIDTH}px`,
              maxHeight: `${ROW_HEIGHT}px`,
              borderRight: col < TIME_STEPS - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
              borderTop: 'none',
              borderBottom: 'none',
              borderLeft: 'none',
              backgroundColor: zoneBg,
              position: 'relative',
              flexShrink: 0,
              margin: 0,
              padding: 0,
              boxSizing: 'border-box',
              lineHeight: 0,
              fontSize: 0,
              display: 'block'
            }}
          >
            {/* Bar chord color - ALWAYS visible */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                backgroundColor: barChordColor,
                pointerEvents: 'none',
                margin: 0,
                padding: 0,
                border: 'none'
              }}
            />
            
            {/* Pitch density overlay - ONLY visible when dragging */}
            {isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: densityColor,
                  pointerEvents: 'none',
                  margin: 0,
                  padding: 0,
                  border: 'none'
                }}
              />
            )}
            
            {/* Hover indicator (only when dragging) */}
            {isHovered && isDragging && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(142, 225, 255, 0.3)',
                  border: '2px solid rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                  zIndex: 50
                }}
              />
            )}
          </div>
        );
      }
      
      rows.push(
        <div 
          key={row} 
          className="flex"
          style={{
            height: `${ROW_HEIGHT}px`,
            minHeight: `${ROW_HEIGHT}px`,
            maxHeight: `${ROW_HEIGHT}px`,
            flexShrink: 0,
            lineHeight: 0,
            margin: 0,
            padding: 0,
            gap: 0,
            ...(isDragging && row < TOTAL_SEMITONES - 1 && {
              borderBottom: '1px solid rgba(0,0,0,0.15)'
            })
          }}
        >
          {cells}
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: 0, padding: 0 }}>
        {rows}
      </div>
    );
  };

  // Render placed icons
  const renderPlacements = () => {
    return placements.map((placement, index) => {
      const sound = SOUND_ICONS.find(s => s.id === placement.soundId);
      if (!sound) return null;
      
      const IconComponent = sound.icon;
      const row = 83 - placement.pitch; // Convert pitch back to row
      const isDragged = draggedPlacementIndex === index;
      
      // Check if playhead is hitting this icon
      // Playhead position is in continuous steps (0-16)
      // Icon is at column center: placement.bar + 0.5
      // Trigger when playhead passes through the icon's center position
      const iconCenterStep = placement.bar + 0.5;
      const distance = Math.abs(currentStep - iconCenterStep);
      const isHit = isPlaying && distance < 0.08; // Tight threshold for center hit
      
      return (
        <motion.div
          key={index}
          draggable={true}
          onDragStart={(e) => handlePlacementDragStart(e, index)}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Also allow double-click to delete
            const updatedPlacements = placements.filter((_, i) => i !== index);
            setPlacements(updatedPlacements);
          }}
          animate={{
            scale: isHit ? 1.3 * 0.8 : 0.8
          }}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 20
          }}
          style={{
            position: 'absolute',
            left: `${placement.bar * COLUMN_WIDTH}px`,
            top: `${row * ROW_HEIGHT}px`,
            width: `${COLUMN_WIDTH}px`,
            height: `${ROW_HEIGHT}px`,
            cursor: isDragged ? 'grabbing' : 'grab',
            opacity: isDragged ? 0 : 1,
            pointerEvents: 'auto',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            style={{ 
              width: '40px',
              height: '40px',
              pointerEvents: 'none'
            }}
          >
            <IconComponent />
          </div>
        </motion.div>
      );
    });
  };

  // Render drag ghost
  const renderDragGhost = () => {
    if (!dragGhost || !sequencerRef.current) return null;
    
    const sound = SOUND_ICONS.find(s => s.id === dragGhost.soundId);
    if (!sound) return null;
    
    const IconComponent = sound.icon;
    
    return (
      <div
        style={{
          position: 'fixed',
          left: `${dragGhost.x - 16}px`,
          top: `${dragGhost.y - 16}px`,
          width: '32px',
          height: '32px',
          opacity: 0.8,
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <div style={{ transform: 'scale(0.8)' }}>
          <IconComponent />
        </div>
      </div>
    );
  };

  // Render bar overlays for chord assignment
  const renderBarOverlays = () => {
    if (!assignmentMode) return null;
    
    return Array.from({ length: BARS }).map((_, barIndex) => (
      <div
        key={barIndex}
        onClick={(e) => handleBarClick(e, barIndex)}
        style={{
          position: 'absolute',
          left: `${barIndex * STEPS_PER_BAR * COLUMN_WIDTH}px`,
          top: 0,
          width: `${STEPS_PER_BAR * COLUMN_WIDTH}px`,
          height: '100%',
          cursor: 'crosshair',
          border: '2px dashed rgba(0,0,0,0.3)',
          backgroundColor: 'rgba(255,255,255,0.5)',
          pointerEvents: 'auto',
          zIndex: 300
        }}
      >
        <div 
          className="flex items-center justify-center h-full"
          style={{
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 600,
            color: 'rgba(0,0,0,0.5)'
          }}
        >
          Click to assign "{assignmentMode}"
        </div>
      </div>
    ));
  };

  return (
    <div>
      {/* Piano Roll Container */}
      <div
        ref={sequencerRef}
        className="relative border-2 border-black rounded-xl overflow-hidden"
        style={{
          width: `${COLUMN_WIDTH * TIME_STEPS}px`,
          height: `${ROW_HEIGHT * TOTAL_SEMITONES}px`,
          userSelect: 'none',
          flexShrink: 0,
          minWidth: `${COLUMN_WIDTH * TIME_STEPS}px`,
          minHeight: `${ROW_HEIGHT * TOTAL_SEMITONES}px`,
          maxWidth: `${COLUMN_WIDTH * TIME_STEPS}px`,
          maxHeight: `${ROW_HEIGHT * TOTAL_SEMITONES}px`
        }}
        onDragOver={!assignmentMode ? handleDragOver : undefined}
        onDragLeave={!assignmentMode ? handleDragLeave : undefined}
        onDrop={!assignmentMode ? handleDrop : undefined}
        onDragEnd={!assignmentMode ? handleDragEnd : undefined}
      >
        {/* Grid with density overlays */}
        {renderGrid()}
        
        {/* Placed icons */}
        {!assignmentMode && renderPlacements()}
        
        {/* Playhead - moves continuously, triggers at column centers */}
        {isPlaying && (
          <div
            style={{
              position: 'absolute',
              left: `${currentStep * COLUMN_WIDTH}px`,
              top: 0,
              width: '2px',
              height: '100%',
              backgroundColor: '#FFD11A',
              boxShadow: '0 0 8px rgba(255, 209, 26, 0.8)',
              pointerEvents: 'none',
              zIndex: 150
            }}
          />
        )}
        
        {/* Bar assignment overlays (highest z-index) */}
        {renderBarOverlays()}
      </div>
      
      {/* Drag ghost */}
      {renderDragGhost()}
    </div>
  );
}
