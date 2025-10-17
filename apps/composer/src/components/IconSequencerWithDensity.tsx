import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars, supports 1/4, 1/8, 1/16 resolution)
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
  onPreviewNote?: (soundId: string, pitch: number) => void;
  resolution: '1/4' | '1/8' | '1/16'; // Grid quantization resolution
  quantizeBar: (bar: number) => number; // Snap bar position to current resolution
}

const COLUMN_WIDTH = 48;
const ROW_HEIGHT = 10;
const TIME_STEPS = 16; // Visual columns: 4 bars × 4 quarter notes = 16 columns
const BARS = 4;
const STEPS_PER_BAR = 4; // Visual quarter notes per bar
const TOTAL_SEMITONES = 36; // C3 to B5
const BASE_MIDI = 48; // C3

// Zone boundaries (row indices, 0-based from top)
const ZONE_HIGH_END = 12;  // rows 0-11: C5-B5
const ZONE_MID_END = 24;   // rows 12-23: C4-B4
// rows 24-35: C3-B3 (LOW)

// Subdivision widths for hover precision
const EIGHTH_WIDTH = COLUMN_WIDTH / 2;   // 24px
const SIXTEENTH_WIDTH = COLUMN_WIDTH / 4; // 12px
const EPS = 0.0001; // Epsilon for boundary stability in subdivision calculations

// Helper function to calculate icon dimensions based on resolution
// Used by both renderDragGhost and renderPlacements for consistency
const getIconDimensions = (resolution: '1/4' | '1/8' | '1/16') => {
  const iconWidth = resolution === '1/4' ? COLUMN_WIDTH :
                    resolution === '1/8' ? EIGHTH_WIDTH :
                    SIXTEENTH_WIDTH;
  // iconVisualSize is the size before CSS scale(0.8) is applied
  const iconVisualSize = Math.min(iconWidth, 40);
  // scaledIconSize is the final visual size after scale(0.8) transform
  const scaledIconSize = iconVisualSize * 0.8;
  return {
    iconWidth,
    iconVisualSize,
    halfSize: iconVisualSize / 2,
    scaledHalfSize: scaledIconSize / 2  // For centering drag ghost on cursor
  };
};

export default function IconSequencerWithDensity({
  selectedSound,
  selectedKey,
  draggingSound,
  barChords,
  assignmentMode,
  onBarChordAssign,
  currentStep,
  isPlaying,
  onPlacementsChange,
  onPreviewNote,
  resolution,
  quantizeBar
}: IconSequencerWithDensityProps) {
  const [placements, setPlacements] = useState<IconPlacement[]>([]);

  // Notify parent of placement changes
  useEffect(() => {
    onPlacementsChange?.(placements);
  }, [placements, onPlacementsChange]);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    xWithinCol: number  // Position within column (0-47) for precise subdivision highlighting
  } | null>(null);
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

    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('placementIndex', index.toString());
    e.dataTransfer.setData('soundId', placement.soundId);

    // Create a properly sized drag image element with centered hotspot
    // Use scaled sizes to match the visual (scale 0.8)
    const { scaledIconSize, scaledHalfSize } = getIconDimensions(resolution);
    const dragImg = document.createElement('div');
    dragImg.style.width = `${scaledIconSize}px`;
    dragImg.style.height = `${scaledIconSize}px`;
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-9999px';
    dragImg.style.opacity = '0';
    document.body.appendChild(dragImg);
    // Set hotspot to center of scaled drag image for natural grab feeling
    e.dataTransfer.setDragImage(dragImg, scaledHalfSize, scaledHalfSize);

    // Clean up after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImg)) {
        document.body.removeChild(dragImg);
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

    // Use sequencerRef for consistent rect calculation with handleDrop
    const rect = sequencerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate cell position
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    const xWithinCol = x % COLUMN_WIDTH;  // Capture position within column for precise hover

    if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) {
      setHoveredCell({ row, col, xWithinCol });
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

    // Calculate visual column (0-15) and row
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

    // Calculate position within the column (0-48px)
    const xWithinCol = x % COLUMN_WIDTH;

    // Map visual position to internal sixteenth note position (0-63)
    // Each visual column represents 4 sixteenth notes
    let sixteenthPosition: number;
    switch (resolution) {
      case '1/4':
        // Quarter notes: each column = 4 sixteenths, snap to start
        sixteenthPosition = col * 4;
        break;
      case '1/8':
        // Eighth notes: each column = 4 sixteenths, split into 2 halves
        // Add epsilon to prevent boundary rounding errors
        const eighthWithinCol = Math.floor((xWithinCol + EPS) / (COLUMN_WIDTH / 2));
        sixteenthPosition = col * 4 + eighthWithinCol * 2;
        break;
      case '1/16':
        // Sixteenth notes: each column = 4 sixteenths, split into 4 quarters
        // Add epsilon to prevent boundary rounding errors
        const sixteenthWithinCol = Math.floor((xWithinCol + EPS) / (COLUMN_WIDTH / 4));
        sixteenthPosition = col * 4 + sixteenthWithinCol;
        break;
    }

    // Quantize to ensure snapping
    const snappedBar = quantizeBar(sixteenthPosition);

    // Convert row to pitch (inverted: row 0 = B5, row 35 = C3)
    const pitch = 83 - row; // B5 (83) at top, C3 (48) at bottom

    // Detect Option key (Alt on Windows, Option on Mac)
    const isDuplicating = e.metaKey || e.altKey;

    // Check if we're moving an existing placement
    const placementIndexStr = e.dataTransfer.getData('placementIndex');
    if (placementIndexStr) {
      // Moving or duplicating existing placement
      const placementIndex = parseInt(placementIndexStr);

      if (isDuplicating) {
        // Duplicate: create new placement at new position
        const originalPlacement = placements[placementIndex];
        const newPlacement: IconPlacement = {
          ...originalPlacement,
          bar: snappedBar,
          pitch,
        };
        setPlacements([...placements, newPlacement]);

        // Play preview of the duplicated note
        onPreviewNote?.(newPlacement.soundId, pitch);
      } else {
        // Move: update existing placement position
        const updatedPlacements = [...placements];
        updatedPlacements[placementIndex] = {
          ...updatedPlacements[placementIndex],
          bar: snappedBar,
          pitch,
        };
        setPlacements(updatedPlacements);

        // Play preview of the moved note
        onPreviewNote?.(updatedPlacements[placementIndex].soundId, pitch);
      }
      setDraggedPlacementIndex(null);
    } else {
      // Adding new placement from gallery
      const soundId = e.dataTransfer.getData('soundId');
      if (!soundId) return;

      const newPlacement: IconPlacement = {
        soundId,
        bar: snappedBar,
        pitch,
        velocity: 80,
      };
      setPlacements([...placements, newPlacement]);

      // Play preview of the note that will sound
      onPreviewNote?.(soundId, pitch);
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
        
        // Calculate subdivision lines based on resolution
        const subdivisionLines: number[] = [];
        if (resolution === '1/8') {
          // 1 line at 50% (divides column into 2 eighths)
          subdivisionLines.push(COLUMN_WIDTH / 2);
        } else if (resolution === '1/16') {
          // 3 lines at 25%, 50%, 75% (divides column into 4 sixteenths)
          subdivisionLines.push(COLUMN_WIDTH / 4, COLUMN_WIDTH / 2, (COLUMN_WIDTH * 3) / 4);
        }

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

            {/* Subdivision lines based on resolution */}
            {subdivisionLines.map((xPos, idx) => (
              <div
                key={`subdiv-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${xPos}px`,
                  top: 0,
                  width: '1px',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            ))}

            {/* Hover indicator (only when dragging) */}
            {isHovered && isDragging && (() => {
              // Calculate precise hover indicator dimensions based on resolution
              let hoverWidth: number;
              let hoverLeft: number;

              if (resolution === '1/4') {
                // Full column width for quarter notes
                hoverWidth = COLUMN_WIDTH;
                hoverLeft = 0;
              } else if (resolution === '1/8') {
                // Half column width for eighth notes
                const eighthIndex = Math.floor(hoveredCell!.xWithinCol / EIGHTH_WIDTH);
                hoverWidth = EIGHTH_WIDTH;
                hoverLeft = eighthIndex * EIGHTH_WIDTH;
              } else {
                // Quarter column width for sixteenth notes
                const sixteenthIndex = Math.floor(hoveredCell!.xWithinCol / SIXTEENTH_WIDTH);
                hoverWidth = SIXTEENTH_WIDTH;
                hoverLeft = sixteenthIndex * SIXTEENTH_WIDTH;
              }

              return (
                <div
                  style={{
                    position: 'absolute',
                    left: `${hoverLeft}px`,
                    top: 0,
                    width: `${hoverWidth}px`,
                    height: ROW_HEIGHT,
                    backgroundColor: 'rgba(142, 225, 255, 0.3)',
                    border: '2px solid rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                    zIndex: 50
                  }}
                />
              );
            })()}
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
    // Calculate icon visual size for rendering
    const { iconVisualSize } = getIconDimensions(resolution);

    return placements.map((placement, index) => {
      const sound = SOUND_ICONS.find(s => s.id === placement.soundId);
      if (!sound) return null;

      const IconComponent = sound.icon;
      const row = 83 - placement.pitch; // Convert pitch back to row
      const isDragged = draggedPlacementIndex === index;

      // Calculate quantum-center position: align to the center of the coarsest quantum
      // that divides this position (quarter, eighth, or sixteenth)
      const col = Math.floor(placement.bar / 4);  // Visual column (0-15)
      const within = placement.bar % 4;  // Position within quarter (0-3)

      let centerWithinQuarter: number;
      if (within === 0) {
        // Quarter-aligned: center at middle of 48px column
        centerWithinQuarter = 24;
      } else if (within === 2) {
        // Eighth-aligned: center at second eighth position
        centerWithinQuarter = 36;
      } else {
        // Sixteenth-aligned: center at sixteenth positions (18 or 42)
        centerWithinQuarter = 6 + within * 12;
      }

      const targetCenter = col * COLUMN_WIDTH + centerWithinQuarter;

      // Check if playhead is hitting this icon
      // Playhead position is in continuous steps (0-16 quarter notes)
      // Convert bar (0-63 sixteenths) to quarter note position (0-16)
      const iconQuarterNotePosition = placement.bar / 4;
      const distance = Math.abs(currentStep - iconQuarterNotePosition);
      const isHit = isPlaying && distance < 0.08; // Tight threshold for hit

      // Compute Y-axis center position for proper vertical centering
      const rowCenter = row * ROW_HEIGHT + ROW_HEIGHT / 2;

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
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 20
          }}
          style={{
            position: 'absolute',
            left: `${targetCenter}px`,
            top: `${rowCenter}px`,
            transform: 'translate(-50%, -50%) translateZ(0)',  // Center X and Y + GPU
            willChange: 'transform, left',
            width: `${iconVisualSize}px`,
            height: `${iconVisualSize}px`,
            cursor: isDragged ? 'grabbing' : 'grab',
            opacity: isDragged ? 0 : 1,
            pointerEvents: 'auto',
            zIndex: 200
          }}
        >
          <motion.div
            animate={{
              scale: isHit ? 1.3 * 0.8 : 0.8
            }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 20
            }}
            style={{
              width: '100%',
              height: '100%',
              transformOrigin: 'center'
            }}
          >
            <IconComponent />
          </motion.div>
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

    // Calculate dynamic size based on current resolution
    // Use scaled sizes to match native drag image and placed icons
    const { scaledIconSize, scaledHalfSize } = getIconDimensions(resolution);

    return (
      <div
        style={{
          position: 'fixed',
          left: `${dragGhost.x - scaledHalfSize}px`,
          top: `${dragGhost.y - scaledHalfSize}px`,
          width: `${scaledIconSize}px`,
          height: `${scaledIconSize}px`,
          opacity: 0.8,
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <IconComponent />
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
