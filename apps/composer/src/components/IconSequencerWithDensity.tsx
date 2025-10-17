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

// Canonical 1/16 backbone
const SNAP_DIVISOR = { '1/4': 4, '1/8': 2, '1/16': 1 } as const;
const centerXFromBar = (bar: number) => bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2; // 12*bar + 6

// Unified icon box and scale for placed + ghost
const ICON_BOX = 40;
const BASE_SCALE = 0.8;

// Debug flag - set to true to enable console logs and visual debug overlays
const DEBUG = false;

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!sequencerRef.current) return;
    const rect = sequencerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const maxX = COLUMN_WIDTH * TIME_STEPS - EPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES - EPS;
    x = Math.min(Math.max(x, 0), maxX);
    y = Math.min(Math.max(y, 0), maxY);
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    const xWithinCol = x % COLUMN_WIDTH;

    // NEW: snappedBar computed exactly like drop (absolute, not relative)
    const sixteenthWithinCol = Math.floor((xWithinCol + EPS) / SIXTEENTH_WIDTH);
    const divisor = SNAP_DIVISOR[resolution];
    const raw = col * 4 + sixteenthWithinCol;
    // Snap to START of quantized cell (bar stores cell left edge on canonical grid)
    const snappedBar = Math.round(raw / divisor) * divisor;
    const safeSnappedBar = Math.max(0, Math.min(63, snappedBar));

    if (DEBUG) {
      console.log('🎯 HOVER:', {
        resolution,
        mouseX: x.toFixed(1),
        mouseY: y.toFixed(1),
        col,
        row,
        xWithinCol: xWithinCol.toFixed(1),
        sixteenthWithinCol,
        divisor,
        raw,
        snappedBar,
        safeSnappedBar,
        overlayLeft: (safeSnappedBar * SIXTEENTH_WIDTH).toFixed(1) + 'px',
        overlayWidth: (divisor * SIXTEENTH_WIDTH).toFixed(1) + 'px',
        centerX: (safeSnappedBar * SIXTEENTH_WIDTH + (divisor * SIXTEENTH_WIDTH) / 2).toFixed(1) + 'px'
      });
    }

    if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) {
      setHoveredCell({ row, col, xWithinCol, snappedBar: safeSnappedBar });
    }

    // Update drag ghost to snap to quantized position (Model A: mid-cell center)
    const soundId = dragGhost?.soundId || draggingSound;
    if (soundId) {
      // Calculate quantized screen coordinates at center of snapped cell
      const cellWidth = divisor * SIXTEENTH_WIDTH;
      const quantizedCenterX = safeSnappedBar * SIXTEENTH_WIDTH + cellWidth / 2;
      const quantizedCenterY = row * ROW_HEIGHT + ROW_HEIGHT / 2;
      const ghostX = rect.left + quantizedCenterX;
      const ghostY = rect.top + quantizedCenterY;

      setDragGhost({ x: ghostX, y: ghostY, soundId });
      if (!isDragging) setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sequencerRef.current) return;
    const rect = sequencerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const maxX = COLUMN_WIDTH * TIME_STEPS - EPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES - EPS;
    x = Math.min(Math.max(x, 0), maxX);
    y = Math.min(Math.max(y, 0), maxY);
    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    const xWithinCol = x % COLUMN_WIDTH;
    const sixteenthWithinCol = Math.floor((xWithinCol + EPS) / SIXTEENTH_WIDTH);
    const divisor = SNAP_DIVISOR[resolution];
    const raw = col * 4 + sixteenthWithinCol;
    // Snap to START of quantized cell (bar stores cell left edge on canonical grid)
    const snappedBar = Math.round(raw / divisor) * divisor;
    const pitch = 83 - row;

    if (DEBUG) {
      const iconCenterX = snappedBar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
      console.log('🎯 DROP:', {
        resolution,
        mouseX: x.toFixed(1),
        mouseY: y.toFixed(1),
        col,
        row,
        xWithinCol: xWithinCol.toFixed(1),
        sixteenthWithinCol,
        divisor,
        raw,
        snappedBar,
        pitch,
        iconCenterX: iconCenterX.toFixed(1) + 'px',
        iconBar: snappedBar
      });
    }
    const isDuplicating = e.metaKey || e.altKey;
    const placementIndexStr = e.dataTransfer.getData('placementIndex');
    if (placementIndexStr) {
      const placementIndex = parseInt(placementIndexStr);
      if (isDuplicating) {
        const original = placements[placementIndex];
        const np: IconPlacement = { ...original, bar: snappedBar, pitch };
        setPlacements([...placements, np]);
        onPreviewNote?.(np.soundId, pitch);
      } else {
        const up = [...placements];
        up[placementIndex] = { ...up[placementIndex], bar: snappedBar, pitch };
        setPlacements(up);
        onPreviewNote?.(up[placementIndex].soundId, pitch);
      }
      setDraggedPlacementIndex(null);
    } else {
      const soundId = e.dataTransfer.getData('soundId');
      if (!soundId) return;
      const np: IconPlacement = { soundId, bar: snappedBar, pitch, velocity: 80 };
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

      // Icons render at mid-sixteenth-cell (Model A: center-between-lines)
      // bar is a canonical grid position (0-63), place icon at center of that sixteenth
      const targetCenter = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;

      const iconQuarterNotePosition = p.bar / 4;
      const distance = Math.abs(currentStep - iconQuarterNotePosition);
      const isHit = isPlaying && distance < 0.08;
      const rowCenter = row * ROW_HEIGHT + ROW_HEIGHT / 2;

      if (DEBUG) {
        console.log(`📍 ICON ${index}:`, {
          bar: p.bar,
          resolution,
          targetCenter: targetCenter.toFixed(1) + 'px',
          row,
          rowCenter: rowCenter.toFixed(1) + 'px',
          pitch: p.pitch
        });
      }

      return (
        <motion.div key={index} draggable onDragStart={(e) => handlePlacementDragStart(e, index)} style={{ position: 'absolute', left: `${targetCenter}px`, top: `${rowCenter}px`, transform: 'translate(-50%, -50%) translateZ(0)', width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, cursor: isDragged ? 'grabbing' : 'grab', opacity: isDragged ? 0 : 1, pointerEvents: 'auto', zIndex: 200, willChange: 'transform,left' }}>
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
    // snappedBar is cell start, calculate left edge and center
    const cellStartBar = hoveredCell.snappedBar;
    const hoverLeft = cellStartBar * SIXTEENTH_WIDTH;
    const rowTop = hoveredCell.row * ROW_HEIGHT;
    const cellCenterOffset = (divisor * SIXTEENTH_WIDTH) / 2;
    const iconCenterX = hoverLeft + cellCenterOffset;

    if (DEBUG) {
      console.log('🎨 OVERLAY RENDER:', {
        resolution,
        divisor,
        SIXTEENTH_WIDTH,
        cellStartBar,
        hoverLeft,
        hoverWidth,
        cellCenterOffset,
        iconCenterX
      });
    }

    return (
      <>
        {/* Hover highlight box */}
        <div style={{ position: 'absolute', left: `${hoverLeft}px`, top: `${rowTop}px`, width: `${hoverWidth}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'rgba(142,225,255,0.3)', border: '2px solid rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 50 }} />

        {DEBUG && (
          <>
            {/* DEBUG: Vertical line at icon center position */}
            <div style={{ position: 'absolute', left: `${iconCenterX}px`, top: `${rowTop}px`, width: '2px', height: `${ROW_HEIGHT}px`, backgroundColor: 'red', pointerEvents: 'none', zIndex: 51 }} />

            {/* DEBUG: Text label showing coordinates */}
            <div style={{
              position: 'absolute',
              left: `${hoverLeft}px`,
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
              bar:{hoveredCell.snappedBar} cell:[{cellStartBar}-{cellStartBar+divisor}] L:{hoverLeft.toFixed(0)}px C:{iconCenterX.toFixed(0)}px
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
      <div ref={sequencerRef} className="relative border-2 border-black rounded-xl overflow-hidden" style={{ width: `${COLUMN_WIDTH * TIME_STEPS}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES}px`, userSelect: 'none', flexShrink: 0 }} onDragOver={!assignmentMode ? handleDragOver : undefined} onDragLeave={!assignmentMode ? handleDragLeave : undefined} onDrop={!assignmentMode ? handleDrop : undefined} onDragEnd={!assignmentMode ? handleDragEnd : undefined}>
        {renderGrid()}
        {renderHoverOverlay()}
        {!assignmentMode && renderPlacements()}
        {isPlaying && (<div style={{ position: 'absolute', left: `${currentStep * COLUMN_WIDTH}px`, top: 0, width: '2px', height: '100%', backgroundColor: '#FFD11A', boxShadow: '0 0 8px rgba(255, 209, 26, 0.8)', pointerEvents: 'none', zIndex: 150 }} />)}
      </div>
      {renderDragGhost()}
    </div>
  );
}
