import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars)
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
  currentStep: number; // continuous 0-16 (quarter notes)
  isPlaying: boolean;
  onPlacementsChange?: (placements: IconPlacement[]) => void;
  onPreviewNote?: (soundId: string, pitch: number) => void;
  resolution: '1/4' | '1/8' | '1/16';
  quantizeBar: (bar: number) => number;
}

const COLUMN_WIDTH = 48; // quarter
const ROW_HEIGHT = 10;
const TIME_STEPS = 16;
const BARS = 4;
const STEPS_PER_BAR = 4;
const TOTAL_SEMITONES = 36;
const BASE_MIDI = 48;

const EIGHTH_WIDTH = COLUMN_WIDTH / 2;  // 24
const SIXTEENTH_WIDTH = COLUMN_WIDTH / 4; // 12
const EPS = 0.0001;
const WRAPPER_PADDING = 15; // Invisible buffer zone around drop area to catch edge drops

// Canonical 1/16 backbone
const SNAP_DIVISOR = { '1/4': 4, '1/8': 2, '1/16': 1 } as const;
const centerXFromBar = (bar: number) => bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2; // 12*bar + 6

// Unified icon box and scale for placed + ghost
const ICON_BOX = 40;
const BASE_SCALE = 0.8;

// Debug flag - set to true to enable console logs and visual debug overlays
const DEBUG = true;

export default function IconSequencerWithDensity(props: IconSequencerWithDensityProps) {
  const { selectedSound, selectedKey, draggingSound, barChords, assignmentMode, onBarChordAssign, currentStep, isPlaying, onPlacementsChange, onPreviewNote, resolution, quantizeBar } = props;

  const [placements, setPlacements] = useState<IconPlacement[]>([]);
  useEffect(() => { onPlacementsChange?.(placements); }, [placements, onPlacementsChange]);

  // UPDATED: store snappedBar for absolute overlay
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; xWithinCol: number; snappedBar: number } | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sequencerRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);

  const makeCenteredDragImage = (e: React.DragEvent) => {
    const dragImg = document.createElement('div');
    dragImg.style.width = `${ICON_BOX}px`;
    dragImg.style.height = `${ICON_BOX}px`;
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-9999px';
    dragImg.style.opacity = '0';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, ICON_BOX / 2, ICON_BOX / 2);
    setTimeout(() => document.body.contains(dragImg) && document.body.removeChild(dragImg), 0);
  };

  const handlePlacementDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedPlacementIndex(index);
    setIsDragging(true);
    const p = placements[index];
    setDragGhost({ x: e.clientX, y: e.clientY, soundId: p.soundId });
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('placementIndex', String(index));
    e.dataTransfer.setData('soundId', p.soundId);
    makeCenteredDragImage(e);
  };

  const handleIconDoubleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    // Remove the icon from placements
    const updated = placements.filter((_, i) => i !== index);
    setPlacements(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!outerWrapperRef.current) return;
    const rect = outerWrapperRef.current.getBoundingClientRect();
    // Subtract wrapper padding to get coordinates relative to inner grid
    let x = e.clientX - rect.left - WRAPPER_PADDING;
    let y = e.clientY - rect.top - WRAPPER_PADDING;
    // Clamp to grid bounds
    const maxX = COLUMN_WIDTH * TIME_STEPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES;
    x = Math.min(Math.max(x, 0), maxX);
    y = Math.min(Math.max(y, 0), maxY);
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);

    // CRITICAL: Snap to nearest valid grid position based on absolute mouse location
    const divisor = SNAP_DIVISOR[resolution];
    const absoluteRawBar = x / SIXTEENTH_WIDTH; // Remove EPS to prevent first-cell flapping
    const snappedBar = Math.round(absoluteRawBar / divisor) * divisor;

    // Bounds check: keep within grid (0-63)
    const maxValidBar = 63;
    const finalSnappedBar = Math.max(0, Math.min(maxValidBar, snappedBar));

    if (DEBUG) {
      console.log('🎯 HOVER SNAP LOGIC:', {
        resolution,
        divisor,
        mouseX: x.toFixed(1),
        col,
        absoluteRawBar: absoluteRawBar.toFixed(2),
        snappedBar,
        finalSnappedBar,
        snapCenterX: (finalSnappedBar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2).toFixed(1) + 'px'
      });
    }

    const safeSnappedBar = finalSnappedBar;

    if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) {
      setHoveredCell({ row, col, xWithinCol: x % COLUMN_WIDTH, snappedBar: safeSnappedBar });
    }

    // Update drag ghost to center on the target sixteenth cell
    const soundId = dragGhost?.soundId || draggingSound;
    if (soundId) {
      // Center the ghost icon within its target sixteenth cell (matching placed icon positioning)
      const cellCenterX = safeSnappedBar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
      const quantizedCenterY = row * ROW_HEIGHT + ROW_HEIGHT / 2;
      // Ghost x/y are the center point (renderDragGhost offsets by ICON_BOX/2)
      // Add padding offset since grid is inset within wrapper
      const ghostX = rect.left + WRAPPER_PADDING + cellCenterX;
      const ghostY = rect.top + WRAPPER_PADDING + quantizedCenterY;

      setDragGhost({ x: ghostX, y: ghostY, soundId });
      if (!isDragging) setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!outerWrapperRef.current) return;
    const rect = outerWrapperRef.current.getBoundingClientRect();
    // Subtract wrapper padding to get coordinates relative to inner grid
    let x = e.clientX - rect.left - WRAPPER_PADDING;
    let y = e.clientY - rect.top - WRAPPER_PADDING;
    // Clamp to grid bounds
    const maxX = COLUMN_WIDTH * TIME_STEPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES;
    x = Math.min(Math.max(x, 0), maxX);
    y = Math.min(Math.max(y, 0), maxY);
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);

    // CRITICAL: Snap to nearest valid grid position based on absolute mouse location
    const divisor = SNAP_DIVISOR[resolution];
    const absoluteRawBar = x / SIXTEENTH_WIDTH; // Remove EPS to prevent first-cell flapping
    const snappedBar = Math.round(absoluteRawBar / divisor) * divisor;

    // Bounds check: keep within grid (0-63)
    const maxValidBar = 63;
    const finalSnappedBar = Math.max(0, Math.min(maxValidBar, snappedBar));

    const pitch = 83 - row;

    if (DEBUG) {
      console.log('🎯 DROP:', {
        resolution,
        divisor,
        mouseX: x.toFixed(1),
        mouseY: y.toFixed(1),
        col,
        row,
        absoluteRawBar: absoluteRawBar.toFixed(2),
        snappedBar,
        finalSnappedBar,
        pitch,
        snapCenterX: (finalSnappedBar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2).toFixed(1) + 'px'
      });
    }
    const isDuplicating = e.metaKey || e.altKey;
    const placementIndexStr = e.dataTransfer.getData('placementIndex');
    if (placementIndexStr) {
      const placementIndex = parseInt(placementIndexStr);
      if (isDuplicating) {
        const original = placements[placementIndex];
        const np: IconPlacement = { ...original, bar: finalSnappedBar, pitch };
        setPlacements([...placements, np]);
        onPreviewNote?.(np.soundId, pitch);
      } else {
        const up = [...placements];
        up[placementIndex] = { ...up[placementIndex], bar: finalSnappedBar, pitch };
        setPlacements(up);
        onPreviewNote?.(up[placementIndex].soundId, pitch);
      }
      setDraggedPlacementIndex(null);
    } else {
      const soundId = e.dataTransfer.getData('soundId');
      if (!soundId) return;
      const np: IconPlacement = { soundId, bar: finalSnappedBar, pitch, velocity: 80 };
      setPlacements([...placements, np]);
      onPreviewNote?.(soundId, pitch);
    }
    setHoveredCell(null);
    setIsDragging(false);
    setDragGhost(null);
  };

  const renderGrid = () => {
    const rows = [];
    for (let row = 0; row < TOTAL_SEMITONES; row++) {
      const midi = 83 - row;
      const pc = midiToPitchClass(midi);
      let zoneBg = '#FFFFFF';
      if (isDragging) { if (row < 12) zoneBg = 'rgba(224, 242, 254, 0.3)'; else if (row >= 24) zoneBg = 'rgba(255, 251, 235, 0.3)'; }
      const cells = [];
      for (let col = 0; col < TIME_STEPS; col++) {
        const barIndex = Math.floor(col / STEPS_PER_BAR);
        const chord = barChords[barIndex];
        let barChordColor = 'transparent';
        if (chord) {
          const color = chordColors[chord];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          barChordColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        let densityColor = 'transparent';
        if (chord) {
          const alpha = densityAlpha(pc, chord);
          const color = chordColors[chord];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          densityColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        // Vertical lines at column boundaries and subdivisions
        const subdivisionLines: number[] = [];
        if (resolution === '1/4') {
          // Show line at left edge of quarter column (aligns with chord boundaries)
          subdivisionLines.push(0); // Left edge
        } else if (resolution === '1/8') {
          // Show lines at eighth boundaries
          subdivisionLines.push(0, COLUMN_WIDTH / 2); // 0px, 24px
        } else if (resolution === '1/16') {
          // Show all sixteenth boundaries
          subdivisionLines.push(0, SIXTEENTH_WIDTH, COLUMN_WIDTH / 2, SIXTEENTH_WIDTH * 3); // 0, 12, 24, 36px
        }
        cells.push(
          <div key={col} style={{ width: `${COLUMN_WIDTH}px`, height: `${ROW_HEIGHT}px`, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: barChordColor, pointerEvents: 'none' }} />
            {isDragging && (<div style={{ position: 'absolute', inset: 0, backgroundColor: densityColor, pointerEvents: 'none' }} />)}
            {subdivisionLines.map((xPos, idx) => (<div key={`subdiv-${idx}`} style={{ position: 'absolute', left: `${xPos}px`, top: 0, width: '1px', height: '100%', backgroundColor: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />))}
          </div>
        );
      }
      rows.push(<div key={row} className="flex" style={{ height: `${ROW_HEIGHT}px`, flexShrink: 0 }}>{cells}</div>);
    }
    return (<div style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>);
  };

  const renderPlacements = () => {
    return placements.map((p, index) => {
      const sound = SOUND_ICONS.find(s => s.id === p.soundId);
      if (!sound) return null;
      const IconComponent = sound.icon;
      const row = 83 - p.pitch;
      const isDragged = draggedPlacementIndex === index;

      // Icons render CENTERED on the target sixteenth cell
      // bar is a canonical grid position (0-63) indicating the cell
      // Center the icon within its target sixteenth cell
      const cellCenterX = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
      const targetLeft = cellCenterX - ICON_BOX / 2;

      const iconQuarterNotePosition = p.bar / 4;
      const distance = Math.abs(currentStep - iconQuarterNotePosition);
      const isHit = isPlaying && distance < 0.08;
      const rowCenter = row * ROW_HEIGHT + ROW_HEIGHT / 2;

      if (DEBUG) {
        console.log(`📍 ICON ${index}:`, {
          bar: p.bar,
          resolution,
          targetLeft: targetLeft.toFixed(1) + 'px',
          row,
          rowCenter: rowCenter.toFixed(1) + 'px',
          pitch: p.pitch
        });
      }

      return (
        <motion.div key={index} draggable onDragStart={(e) => handlePlacementDragStart(e, index)} onDoubleClick={(e) => handleIconDoubleClick(e, index)} style={{ position: 'absolute', left: `${targetLeft}px`, top: `${rowCenter}px`, transform: 'translate(0, -50%) translateZ(0)', width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, cursor: isDragged ? 'grabbing' : 'grab', opacity: isDragged ? 0 : 1, pointerEvents: 'auto', zIndex: 200, willChange: 'transform,left' }}>
          <motion.div animate={{ scale: isHit ? BASE_SCALE * 1.3 : BASE_SCALE }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} style={{ width: '100%', height: '100%', transformOrigin: 'center' }}><IconComponent /></motion.div>
        </motion.div>
      );
    });
  };

  // NEW: single absolute overlay so hover always mirrors drop result
  const renderHoverOverlay = () => {
    if (!hoveredCell || !isDragging) return null;
    const divisor = SNAP_DIVISOR[resolution];
    const hoverWidth = divisor * SIXTEENTH_WIDTH;
    // snappedBar is grid line position where icon left edge will be placed
    const cellStartBar = hoveredCell.snappedBar;
    const iconLeftX = cellStartBar * SIXTEENTH_WIDTH;
    const rowTop = hoveredCell.row * ROW_HEIGHT;

    if (DEBUG) {
      console.log('🎨 OVERLAY RENDER:', {
        resolution,
        divisor,
        SIXTEENTH_WIDTH,
        cellStartBar,
        iconLeftX,
        hoverWidth
      });
    }

    return (
      <>
        {/* Hover highlight box */}
        <div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: `${hoverWidth}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'rgba(142,225,255,0.3)', border: '2px solid rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 50 }} />

        {DEBUG && (
          <>
            {/* DEBUG: Vertical line at icon left edge position */}
            <div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: '2px', height: `${ROW_HEIGHT}px`, backgroundColor: 'red', pointerEvents: 'none', zIndex: 51 }} />

            {/* DEBUG: Text label showing coordinates */}
            <div style={{
              position: 'absolute',
              left: `${iconLeftX}px`,
              top: `${rowTop - 20}px`,
              fontSize: '10px',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '2px 4px',
              border: '1px solid black',
              pointerEvents: 'none',
              zIndex: 52,
              whiteSpace: 'nowrap'
            }}>
              bar:{hoveredCell.snappedBar} L:{iconLeftX.toFixed(0)}px
            </div>
          </>
        )}
      </>
    );
  };

  const renderDragGhost = () => {
    if (!dragGhost) return null;
    const sound = SOUND_ICONS.find(s => s.id === dragGhost.soundId);
    if (!sound) return null;
    const IconComponent = sound.icon;
    return (
      <div style={{ position: 'fixed', left: `${dragGhost.x - ICON_BOX / 2}px`, top: `${dragGhost.y - ICON_BOX / 2}px`, width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, opacity: 0.85, pointerEvents: 'none', zIndex: 1000 }}>
        <div style={{ width: '100%', height: '100%', transform: `scale(${BASE_SCALE})`, transformOrigin: 'center' }}><IconComponent /></div>
      </div>
    );
  };

  const handleDragEnd = () => { setDraggedPlacementIndex(null); setHoveredCell(null); setDragGhost(null); setIsDragging(false); };
  const handleDragLeave = (e: React.DragEvent) => { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setHoveredCell(null); };
  const handleBarClick = (e: React.MouseEvent, barIndex: number) => { e.stopPropagation(); if (assignmentMode) onBarChordAssign(barIndex, assignmentMode); };

  return (
    <div>
      {/* Outer drop zone wrapper - extended hit zone with padding buffer */}
      <div
        ref={outerWrapperRef}
        className="relative flex items-center justify-center"
        style={{
          width: `${COLUMN_WIDTH * TIME_STEPS + WRAPPER_PADDING * 2}px`,
          height: `${ROW_HEIGHT * TOTAL_SEMITONES + WRAPPER_PADDING * 2}px`
        }}
        onDragOver={!assignmentMode ? handleDragOver : undefined}
        onDragLeave={!assignmentMode ? handleDragLeave : undefined}
        onDrop={!assignmentMode ? handleDrop : undefined}
        onDragEnd={!assignmentMode ? handleDragEnd : undefined}
      >
        <div ref={sequencerRef} className="relative border-2 border-black rounded-xl overflow-hidden" style={{ width: `${COLUMN_WIDTH * TIME_STEPS}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES}px`, userSelect: 'none', flexShrink: 0 }}>
          {renderGrid()}
          {renderHoverOverlay()}
          {!assignmentMode && renderPlacements()}
          {isPlaying && (<div style={{ position: 'absolute', left: `${currentStep * COLUMN_WIDTH}px`, top: 0, width: '2px', height: '100%', backgroundColor: '#FFD11A', boxShadow: '0 0 8px rgba(255, 209, 26, 0.8)', pointerEvents: 'none', zIndex: 150 }} />)}
        </div>
      </div>
      {renderDragGhost()}
    </div>
  );
}
