import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';
import ChordLabels from './ChordLabels';
import { SEQUENCER_LAYOUT, GRID_WIDTH, GRID_TOTAL_WIDTH } from './sequencerLayout';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars)
  pitch: number; // MIDI note number (48-83 for 3 octaves: C3-B5)
  velocity: number;
  duration16?: number; // duration in sixteenths (defaults to 1)
}

interface IconSequencerWithDensityProps {
  selectedSound: string | null;
  selectedKey: string;
  draggingSound: string | null;
  barChords: (Chord | null)[]; // 4 bars
  assignmentMode: Chord | null;
  onBarChordAssign: (barIndex: number, chord: Chord) => void;
  currentStep: number; // continuous 0-16 (quarter notes)
  isPlaying: boolean;
  placements?: IconPlacement[];
  onPlacementsChange?: (placements: IconPlacement[]) => void;
  onPreviewNote?: (soundId: string, pitch: number) => void;
  resolution: '1/4' | '1/8' | '1/16';
  quantizeBar: (bar: number) => number;
  octaveOffset?: number;
  onOctaveOffsetChange?: (offset: number) => void;
  onChordSelect?: (chord: Chord | null) => void;
  onPresetSelect?: (preset: string) => void;
}

// Shared constants
const { COLUMN_WIDTH, ROW_HEIGHT, TIME_STEPS, STEPS_PER_BAR, TOTAL_SEMITONES, WRAPPER_PADDING, GRID_BORDER_WIDTH } = SEQUENCER_LAYOUT;

const EIGHTH_WIDTH = COLUMN_WIDTH / 2;
const SIXTEENTH_WIDTH = COLUMN_WIDTH / 4;
const EPS = 0.0001;

// Canonical 1/16 backbone
const SNAP_DIVISOR = { '1/4': 4, '1/8': 2, '1/16': 1 } as const;
const centerXFromBar = (bar: number) => bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;

// Unified icon box and scale for placed + ghost
const ICON_BOX = 40;
const BASE_SCALE = 0.8;

// Duration bar styling
const BAR_HEIGHT = 12;

// Debug flag - enable to see visual borders
const DEBUG = false;

export default function IconSequencerWithDensity(props: IconSequencerWithDensityProps) {
  const { selectedSound, selectedKey, draggingSound, barChords, assignmentMode, onBarChordAssign, currentStep, isPlaying, placements: externalPlacements, onPlacementsChange, onPreviewNote, resolution, quantizeBar, octaveOffset: externalOctaveOffset, onOctaveOffsetChange, onChordSelect, onPresetSelect } = props;

  const [internalOctaveOffset, setInternalOctaveOffset] = useState(0);
  const octaveOffset = externalOctaveOffset !== undefined ? externalOctaveOffset : internalOctaveOffset;
  const setOctaveOffset = onOctaveOffsetChange || setInternalOctaveOffset;

  const BASE_BOTTOM_MIDI = 36; // C2 - 3 octaves span
  const BASE_TOP_MIDI = 72;  // C5 - exactly 3 octaves above C2
  const topMidi = BASE_TOP_MIDI + octaveOffset * 12;
  const baseMidi = BASE_BOTTOM_MIDI + octaveOffset * 12;

  // Shared grid padding calculation - used for pitch markers, placements, and hover overlay
  const gridContentHeight = TOTAL_SEMITONES * ROW_HEIGHT;
  const containerHeight = ROW_HEIGHT * TOTAL_SEMITONES + ROW_HEIGHT + 10;
  const gridPaddingTop = (containerHeight - gridContentHeight) / 2;

  const [placements, setPlacements] = useState<IconPlacement[]>([]);
  const isSyncingFromExternal = useRef(false);
  const lastPropagatedRef = useRef<IconPlacement[] | null>(null);

  useEffect(() => { if (externalPlacements && externalPlacements !== lastPropagatedRef.current) { isSyncingFromExternal.current = true; setPlacements(externalPlacements); } }, [externalPlacements]);
  useEffect(() => { if (isSyncingFromExternal.current) { isSyncingFromExternal.current = false; } else { lastPropagatedRef.current = placements; onPlacementsChange?.(placements); } }, [placements]);

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; xWithinCol: number; snappedBar: number } | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isCmdPressedRef = useRef(false);
  const [resizingPlacement, setResizingPlacement] = useState<{ index: number; startX: number; startDuration: number } | null>(null);
  const [hoveredResizeIcon, setHoveredResizeIcon] = useState<number | null>(null);
  const sequencerRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!isDragging) return; const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt' || e.altKey) { isCmdPressedRef.current = true; } }; window.addEventListener('keydown', handleKeyDown); return () => { window.removeEventListener('keydown', handleKeyDown); }; }, [isDragging]);

  const makeCenteredDragImage = (e: React.DragEvent) => { const d = document.createElement('div'); d.style.width = `${ICON_BOX}px`; d.style.height = `${ICON_BOX}px`; d.style.position = 'absolute'; d.style.top = '-9999px'; d.style.opacity = '0'; document.body.appendChild(d); e.dataTransfer.setDragImage(d, ICON_BOX / 2, ICON_BOX / 2); setTimeout(() => document.body.contains(d) && document.body.removeChild(d), 0); };

  const handlePlacementDragStart = (e: React.DragEvent, index: number) => { e.stopPropagation(); setDraggedPlacementIndex(index); setIsDragging(true); const p = placements[index]; setDragGhost({ x: e.clientX, y: e.clientY, soundId: p.soundId }); e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('placementIndex', String(index)); e.dataTransfer.setData('soundId', p.soundId); makeCenteredDragImage(e); };
  const handleIconDoubleClick = (e: React.MouseEvent, index: number) => { e.stopPropagation(); const updated = placements.filter((_, i) => i !== index); setPlacements(updated); };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; isCmdPressedRef.current = e.altKey; if (!outerWrapperRef.current) return; const rect = outerWrapperRef.current.getBoundingClientRect(); const rawX = e.clientX - rect.left - WRAPPER_PADDING; const rawY = e.clientY - rect.top - WRAPPER_PADDING - gridPaddingTop; const maxX = COLUMN_WIDTH * TIME_STEPS; const maxY = ROW_HEIGHT * TOTAL_SEMITONES; const soundId = dragGhost?.soundId || draggingSound; if (soundId && !isDragging) { setIsDragging(true); } if (rawX < 0 || rawX > maxX || rawY < 0 || rawY > maxY) { setHoveredCell(null); if (soundId) { setDragGhost({ x: e.clientX, y: e.clientY, soundId }); } return; } const x = Math.min(Math.max(rawX, 0), maxX); const y = Math.min(Math.max(rawY, 0), maxY); const col = Math.floor(x / COLUMN_WIDTH); const row = Math.floor(y / ROW_HEIGHT); const divisor = SNAP_DIVISOR[resolution]; const cellInSixteenths = Math.floor(x / SIXTEENTH_WIDTH); const snappedBar = Math.floor(cellInSixteenths / divisor) * divisor; const finalSnappedBar = Math.max(0, Math.min(63, snappedBar)); if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) { setHoveredCell({ row, col, xWithinCol: x % COLUMN_WIDTH, snappedBar: finalSnappedBar }); } if (soundId) { setDragGhost({ x: e.clientX, y: e.clientY, soundId }); } };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!outerWrapperRef.current || !hoveredCell) { return; } const rect = outerWrapperRef.current.getBoundingClientRect(); const dropX = e.clientX - rect.left - WRAPPER_PADDING; const dropY = e.clientY - rect.top - WRAPPER_PADDING - gridPaddingTop; const maxX = COLUMN_WIDTH * TIME_STEPS; const maxY = ROW_HEIGHT * TOTAL_SEMITONES; if (dropX < 0 || dropX > maxX || dropY < 0 || dropY > maxY) { setHoveredCell(null); setIsDragging(false); setDragGhost(null); setDraggedPlacementIndex(null); return; } const finalSnappedBar = hoveredCell.snappedBar; const row = hoveredCell.row; const pitch = topMidi - row; const isDuplicating = e.metaKey || e.altKey; const placementIndexStr = e.dataTransfer.getData('placementIndex'); if (placementIndexStr) { const placementIndex = parseInt(placementIndexStr); if (isDuplicating) { const original = placements[placementIndex]; const np: IconPlacement = { ...original, bar: finalSnappedBar, pitch }; setPlacements([...placements, np]); onPreviewNote?.(np.soundId, pitch); } else { const up = [...placements]; up[placementIndex] = { ...up[placementIndex], bar: finalSnappedBar, pitch }; setPlacements(up); onPreviewNote?.(up[placementIndex].soundId, pitch); } setDraggedPlacementIndex(null); } else { const soundId = e.dataTransfer.getData('soundId'); if (!soundId) return; const replaceMode = isCmdPressedRef.current || e.altKey; if (replaceMode) { const ICON_OVERLAP_RANGE = 2; const existingIndex = placements.findIndex(p => { const barDistance = Math.abs(p.bar - finalSnappedBar); const pitchMatch = p.pitch === pitch; const barOverlap = barDistance <= ICON_OVERLAP_RANGE; return pitchMatch && barOverlap; }); if (existingIndex !== -1) { const updated = [...placements]; updated[existingIndex] = { ...updated[existingIndex], soundId }; setPlacements(updated); onPreviewNote?.(soundId, pitch); setHoveredCell(null); setIsDragging(false); setDragGhost(null); return; } } const np: IconPlacement = { soundId, bar: finalSnappedBar, pitch, velocity: 80 }; setPlacements([...placements, np]); onPreviewNote?.(soundId, pitch); } setHoveredCell(null); setIsDragging(false); setDragGhost(null); };

  const handleResizeStart = (e: React.MouseEvent, index: number) => { e.stopPropagation(); e.preventDefault(); const currentDuration = placements[index].duration16 ?? 1; setResizingPlacement({ index, startX: e.clientX, startDuration: currentDuration }); };

  useEffect(() => { if (!resizingPlacement) return; const handleResizeMove = (e: MouseEvent) => { if (!outerWrapperRef.current) return; const deltaX = e.clientX - resizingPlacement.startX; const deltaSixteenths = Math.round(deltaX / SIXTEENTH_WIDTH); const divisor = SNAP_DIVISOR[resolution]; const rawNewDuration = resizingPlacement.startDuration + deltaSixteenths; const snappedDuration = Math.round(rawNewDuration / divisor) * divisor; const minDuration = Math.max(divisor, 1); let newDuration = Math.max(minDuration, snappedDuration); const placement = placements[resizingPlacement.index]; const maxDuration = 64 - placement.bar; newDuration = Math.min(newDuration, maxDuration); if (newDuration !== placement.duration16) { const updated = [...placements]; updated[resizingPlacement.index] = { ...placement, duration16: newDuration }; setPlacements(updated); } }; const handleResizeEnd = () => { setResizingPlacement(null); }; document.addEventListener('mousemove', handleResizeMove); document.addEventListener('mouseup', handleResizeEnd); return () => { document.removeEventListener('mousemove', handleResizeMove); document.removeEventListener('mouseup', handleResizeEnd); }; }, [resizingPlacement, placements, resolution]);

  const renderGrid = () => { const rows = []; const totalRows = Math.ceil(containerHeight / ROW_HEIGHT); const paddingRows = totalRows - TOTAL_SEMITONES; const topPaddingRows = Math.floor(paddingRows / 2); for (let row = 0; row < totalRows; row++) { const gridRow = row - topPaddingRows; const isPlayableRow = gridRow >= 0 && gridRow < TOTAL_SEMITONES; const midi = isPlayableRow ? topMidi - gridRow : -1; const pc = isPlayableRow ? midiToPitchClass(midi) : 0; let zoneBg = '#FFFFFF'; if (isDragging && isPlayableRow) { if (gridRow < 12) zoneBg = 'rgba(224, 242, 254, 0.3)'; else if (gridRow >= 24) zoneBg = 'rgba(255, 251, 235, 0.3)'; } const cells = []; for (let col = 0; col < TIME_STEPS; col++) { const barIndex = Math.floor(col / STEPS_PER_BAR); const chord = barChords[barIndex]; let barChordColor = 'transparent'; if (chord) { const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); barChordColor = `rgba(${r}, ${g}, ${b}, 0.2)`; } let densityColor = 'transparent'; if (chord && isPlayableRow) { const alpha = densityAlpha(pc, chord); const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); densityColor = `rgba(${r}, ${g}, ${b}, ${alpha})`; } const subdivisionLines: number[] = []; if (resolution === '1/4') { subdivisionLines.push(0); } else if (resolution === '1/8') { subdivisionLines.push(0, COLUMN_WIDTH / 2); } else if (resolution === '1/16') { subdivisionLines.push(0, SIXTEENTH_WIDTH, COLUMN_WIDTH / 2, SIXTEENTH_WIDTH * 3); } cells.push(<div key={col} style={{ width: `${COLUMN_WIDTH}px`, height: `${ROW_HEIGHT}px`, position: 'relative', flexShrink: 0 }}><div style={{ position: 'absolute', inset: 0, backgroundColor: barChordColor, pointerEvents: 'none' }} />{isDragging && (<div style={{ position: 'absolute', inset: 0, backgroundColor: densityColor, pointerEvents: 'none' }} />)}{subdivisionLines.map((xPos, idx) => (<div key={`subdiv-${idx}`} style={{ position: 'absolute', left: `${xPos}px`, top: 0, width: '1px', height: '100%', backgroundColor: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />))}</div>); } rows.push(<div key={row} className="flex" style={{ height: `${ROW_HEIGHT}px`, flexShrink: 0 }}>{cells}</div>); } return (<div style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>); };

  const renderPlacements = () => { const BLOCK_HEIGHT = 40; return placements.map((p, index) => { const sound = SOUND_ICONS.find(s => s.id === p.soundId); if (!sound) return null; const IconComponent = sound.icon; const row = topMidi - p.pitch; const isDragged = draggedPlacementIndex === index; const cellCenterX = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2; const startX = cellCenterX - ICON_BOX / 2; const widthPx = (p.duration16 ?? 1) * SIXTEENTH_WIDTH; const rowTop = row * ROW_HEIGHT + gridPaddingTop; const blockTop = rowTop - (BLOCK_HEIGHT - ROW_HEIGHT) / 2; const BAR_START_OFFSET = ICON_BOX / 2; const barWidth = Math.max(0, widthPx - BAR_START_OFFSET); const barVerticalOffset = (BLOCK_HEIGHT - BAR_HEIGHT) / 2; const FADE_DISTANCE = ICON_BOX / 2; const barColor = sound.color || '#808080'; const iconQuarterNotePosition = p.bar / 4; const distance = Math.abs(currentStep - iconQuarterNotePosition); const isHit = isPlaying && distance < 0.08; return (<div key={index} style={{ position: 'absolute', left: `${startX}px`, top: `${blockTop}px`, width: `${widthPx}px`, height: `${BLOCK_HEIGHT}px`, zIndex: 200 }}>{DEBUG && (<div style={{ position: 'absolute', left: 0, top: 0, width: '2px', height: `${BLOCK_HEIGHT}px`, backgroundColor: 'red', pointerEvents: 'none', zIndex: 10 }} />)}<div draggable onDragStart={(e) => handlePlacementDragStart(e, index)} onDoubleClick={(e) => handleIconDoubleClick(e, index)} style={{ position: 'absolute', left: '0px', top: `${(BLOCK_HEIGHT - ICON_BOX) / 2}px`, width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, cursor: isDragged ? 'grabbing' : (hoveredResizeIcon === index ? 'default' : 'grab'), zIndex: 201, pointerEvents: (draggedPlacementIndex !== index && (draggingSound || isDragging || dragGhost)) ? 'none' : 'auto' }}><motion.div animate={{ scale: isHit ? 1.1 : 1.0 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} style={{ position: 'absolute', left: '0px', top: '0px', width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, transformOrigin: 'center center', pointerEvents: 'none', backgroundColor: DEBUG ? 'rgba(0, 255, 0, 0.2)' : 'transparent' }}><IconComponent /></motion.div></div>{(resizingPlacement?.index === index || barWidth > 0 || hoveredResizeIcon === index) && (<div style={{ position: 'absolute', left: `${BAR_START_OFFSET}px`, top: `${barVerticalOffset}px`, width: `${Math.max(barWidth, hoveredResizeIcon === index ? ICON_BOX / 2 : 0)}px`, height: `${BAR_HEIGHT}px`, background: `linear-gradient(to right, transparent 0px, ${barColor}80 ${FADE_DISTANCE}px)`, borderRadius: `${BAR_HEIGHT / 2}px`, pointerEvents: 'none', opacity: resizingPlacement?.index === index ? 1 : (barWidth > 0 ? 1 : 0.6), transition: 'opacity 0.15s ease' }} />)}<div onMouseDown={(e) => handleResizeStart(e, index)} onMouseEnter={() => setHoveredResizeIcon(index)} onMouseLeave={() => setHoveredResizeIcon(null)} style={{ position: 'absolute', left: `${Math.max(ICON_BOX - 15, widthPx - 15)}px`, top: 0, width: '15px', height: `${BLOCK_HEIGHT}px`, cursor: hoveredResizeIcon === index || resizingPlacement?.index === index ? 'ew-resize' : 'auto', zIndex: 202, pointerEvents: draggingSound ? 'none' : 'auto' }} /></div>); }); };

  const renderHoverOverlay = () => { if (!hoveredCell || !isDragging) return null; const divisor = SNAP_DIVISOR[resolution]; const hoverWidth = divisor * SIXTEENTH_WIDTH; const cellStartBar = hoveredCell.snappedBar; const iconLeftX = cellStartBar * SIXTEENTH_WIDTH; const rowTop = hoveredCell.row * ROW_HEIGHT + gridPaddingTop; return (<><div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: `${hoverWidth}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'rgba(142,225,255,0.3)', border: '2px solid rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 50 }} />{DEBUG && <div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: `${ICON_BOX}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'transparent', border: '2px dashed rgba(255,0,0,0.5)', pointerEvents: 'none', zIndex: 51 }} />}</>); };

  const renderDragGhost = () => { if (!dragGhost) return null; const sound = SOUND_ICONS.find(s => s.id === dragGhost.soundId); if (!sound) return null; const IconComponent = sound.icon; return (<div style={{ position: 'fixed', left: `${dragGhost.x - ICON_BOX / 2}px`, top: `${dragGhost.y - ICON_BOX / 2}px`, width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, opacity: 0.85, pointerEvents: 'none', zIndex: 1000 }}><div style={{ width: '100%', height: '100%', transform: `scale(${BASE_SCALE})`, transformOrigin: 'center' }}><IconComponent /></div></div>); };

  const handleDragEnd = () => { setDraggedPlacementIndex(null); setHoveredCell(null); setDragGhost(null); setIsDragging(false); setTimeout(() => { isCmdPressedRef.current = false; }, 50); };
  const handleDragLeave = (e: React.DragEvent) => { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setHoveredCell(null); };
  const handleBarClick = (e: React.MouseEvent, barIndex: number) => { e.stopPropagation(); if (assignmentMode) onBarChordAssign(barIndex, assignmentMode); };

  useEffect(() => { const wrapper = outerWrapperRef.current; if (!wrapper) return; let accumulatedDelta = 0; const THRESHOLD = 40; const handleWheel = (e: WheelEvent) => { e.preventDefault(); accumulatedDelta += e.deltaY; if (Math.abs(accumulatedDelta) >= THRESHOLD) { if (accumulatedDelta > 0) { setOctaveOffset(o => Math.max(o - 1, -3)); } else { setOctaveOffset(o => Math.min(o + 1, 3)); } accumulatedDelta = 0; } }; wrapper.addEventListener('wheel', handleWheel, { passive: false }); return () => { wrapper.removeEventListener('wheel', handleWheel); }; }, [setOctaveOffset]);

  const renderPitchMarkers = () => { const cNotes = []; for (let midi = 0; midi <= 127; midi += 12) { if (midi >= baseMidi && midi <= topMidi) { const octave = Math.floor((midi - 12) / 12); const noteName = `C${octave}`; const rowFromTop = topMidi - midi; const yPosition = rowFromTop * ROW_HEIGHT + gridPaddingTop; if (rowFromTop >= 0 && rowFromTop < TOTAL_SEMITONES) { cNotes.push({ midi, noteName, yPosition }); } } } return (<div style={{ position: 'absolute', left: `${-32}px`, top: `${WRAPPER_PADDING}px`, width: '32px', height: '100%', pointerEvents: 'none', zIndex: 100, outline: DEBUG ? '1px solid red' : 'none' }}>{cNotes.map(({ midi, noteName, yPosition }) => (<div key={midi} className="absolute text-xs font-medium text-gray-500" style={{ top: `${yPosition}px`, right: '4px', lineHeight: `${ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`, userSelect: 'none' }}>{noteName}</div>))}</div>); };

  return (<div className="flex flex-row">
      {/* Sequencer grid with scroll-based pitch control */}
      <div className="relative flex flex-col items-start gap-2">
        <div ref={outerWrapperRef} className="relative flex items-center justify-start" style={{ width: `${GRID_TOTAL_WIDTH + WRAPPER_PADDING * 2}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES + WRAPPER_PADDING * 2 + ROW_HEIGHT + 10}px` }} onDragOver={!assignmentMode ? handleDragOver : undefined} onDragLeave={!assignmentMode ? handleDragLeave : undefined} onDrop={!assignmentMode ? handleDrop : undefined} onDragEnd={!assignmentMode ? handleDragEnd : undefined}>
          {/* Pitch markers to the left */}
          {renderPitchMarkers()}
          <div ref={sequencerRef} className="relative border-2 border-black rounded-xl overflow-hidden" style={{ width: `${GRID_WIDTH}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES + ROW_HEIGHT + 10}px`, userSelect: 'none', flexShrink: 0, outline: DEBUG ? '1px solid blue' : 'none' }}>{renderGrid()}{renderHoverOverlay()}{!assignmentMode && renderPlacements()}{isPlaying && (<div style={{ position: 'absolute', left: `${currentStep * COLUMN_WIDTH}px`, top: 0, width: '2px', height: '100%', backgroundColor: '#000000', pointerEvents: 'none', zIndex: 150 }} />)}{assignmentMode && ([0, 1, 2, 3].map(barIndex => (<div key={`bar-overlay-${barIndex}`} onClick={(e) => handleBarClick(e, barIndex)} style={{ position: 'absolute', left: `${barIndex * STEPS_PER_BAR * COLUMN_WIDTH}px`, top: 0, width: `${STEPS_PER_BAR * COLUMN_WIDTH}px`, height: '100%', cursor: 'pointer', zIndex: 250, backgroundColor: 'transparent' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }} />)))}
          </div>
        </div>
        {/* Chord labels sized to EXACT grid total width incl. borders */}
        <ChordLabels barChords={barChords} columnWidth={COLUMN_WIDTH} stepsPerBar={STEPS_PER_BAR} gridBorderWidth={GRID_BORDER_WIDTH} debug={DEBUG} />
      </div>
      {renderDragGhost()}
    </div>);
}
