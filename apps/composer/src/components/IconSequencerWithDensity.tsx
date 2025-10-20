import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';

interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars)
  pitch: number; // MIDI note number (48-83 for 3 octaves: C3-B5)
  velocity: number;
  duration16?: number; // NEW: duration in sixteenths (defaults to 1)
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
  placements?: IconPlacement[]; // External placements (e.g., from MIDI import)
  onPlacementsChange?: (placements: IconPlacement[]) => void;
  onPreviewNote?: (soundId: string, pitch: number) => void;
  resolution: '1/4' | '1/8' | '1/16';
  quantizeBar: (bar: number) => number;
  octaveOffset?: number;
  onOctaveOffsetChange?: (offset: number) => void;
  onChordSelect?: (chord: Chord | null) => void;
  onPresetSelect?: (preset: string) => void;
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

// Duration bar styling
const BAR_HEIGHT = 12;  // Bar for duration visualization

// Debug flag - set to true to enable console logs and visual debug overlays
const DEBUG = false;

export default function IconSequencerWithDensity(props: IconSequencerWithDensityProps) {
  const { selectedSound, selectedKey, draggingSound, barChords, assignmentMode, onBarChordAssign, currentStep, isPlaying, placements: externalPlacements, onPlacementsChange, onPreviewNote, resolution, quantizeBar, octaveOffset: externalOctaveOffset, onOctaveOffsetChange, onChordSelect, onPresetSelect } = props;

  const [internalOctaveOffset, setInternalOctaveOffset] = useState(0);
  const octaveOffset = externalOctaveOffset !== undefined ? externalOctaveOffset : internalOctaveOffset;
  const setOctaveOffset = onOctaveOffsetChange || setInternalOctaveOffset;

  const BASE_TOP_MIDI = 83;
  const BASE_BOTTOM_MIDI = 48;
  const topMidi = BASE_TOP_MIDI + octaveOffset * 12;
  const baseMidi = BASE_BOTTOM_MIDI + octaveOffset * 12;

  const [placements, setPlacements] = useState<IconPlacement[]>([]);
  const isSyncingFromExternal = useRef(false);
  const lastPropagatedRef = useRef<IconPlacement[] | null>(null);

  // Sync external placements to internal state
  // BUT skip if it's the same reference we just sent (prevent circular updates)
  useEffect(() => {
    if (externalPlacements && externalPlacements !== lastPropagatedRef.current) {
      isSyncingFromExternal.current = true;
      setPlacements(externalPlacements);
    }
  }, [externalPlacements]);

  // Propagate internal changes to parent (but not external changes)
  useEffect(() => {
    if (isSyncingFromExternal.current) {
      // This change came from external source, don't propagate back
      isSyncingFromExternal.current = false;
    } else {
      // Internal change, propagate to parent
      lastPropagatedRef.current = placements; // Track what we sent
      onPlacementsChange?.(placements);
    }
  }, [placements]); // Removed onPlacementsChange from deps - should be stable function

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; xWithinCol: number; snappedBar: number } | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isCmdPressedRef = useRef(false); // Track CMD key state globally (ref to avoid closure bugs)
  const [resizingPlacement, setResizingPlacement] = useState<{ index: number; startX: number; startDuration: number } | null>(null);
  const [hoveredResizeIcon, setHoveredResizeIcon] = useState<number | null>(null);
  const sequencerRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);

  // Track CMD key state during drag operations using global keyboard events
  useEffect(() => {
    if (!isDragging) return;

    if (DEBUG) console.log('🎹 KEYBOARD LISTENER ATTACHED - ALT/Option key detection active');

    const handleKeyDown = (e: KeyboardEvent) => {
      // Debug: Log ALL keydown events to see if ANY fire during drag
      if (DEBUG) console.log('⌨️ KEYDOWN EVENT:', { key: e.key, altKey: e.altKey, code: e.code });

      if (e.key === 'Alt' || e.altKey) {
        isCmdPressedRef.current = true;
        if (DEBUG) console.log('⌥ ALT/OPTION PRESSED during drag - replace mode active');
      }
    };

    // Don't listen to keyup during drag - CMD state is "sticky" until drag ends
    // This prevents accidental release during the drop gesture
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (DEBUG) console.log('🎹 KEYBOARD LISTENER REMOVED');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging]);

  const makeCenteredDragImage = (e: React.DragEvent) => { const d = document.createElement('div'); d.style.width = `${ICON_BOX}px`; d.style.height = `${ICON_BOX}px`; d.style.position = 'absolute'; d.style.top = '-9999px'; d.style.opacity = '0'; document.body.appendChild(d); e.dataTransfer.setDragImage(d, ICON_BOX / 2, ICON_BOX / 2); setTimeout(() => document.body.contains(d) && document.body.removeChild(d), 0); };

  const handlePlacementDragStart = (e: React.DragEvent, index: number) => { e.stopPropagation(); setDraggedPlacementIndex(index); setIsDragging(true); const p = placements[index]; setDragGhost({ x: e.clientX, y: e.clientY, soundId: p.soundId }); e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('placementIndex', String(index)); e.dataTransfer.setData('soundId', p.soundId); makeCenteredDragImage(e); };
  const handleIconDoubleClick = (e: React.MouseEvent, index: number) => { e.stopPropagation(); const updated = placements.filter((_, i) => i !== index); setPlacements(updated); };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Always use 'copy' effect to match gallery's effectAllowed='copy'
    e.dataTransfer.dropEffect = 'copy';

    // Track ALT/Option key state from dragOver event (CMD/Meta blocks drops!)
    isCmdPressedRef.current = e.altKey;

    if (!outerWrapperRef.current) return;

    const rect = outerWrapperRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - WRAPPER_PADDING;
    const rawY = e.clientY - rect.top - WRAPPER_PADDING;
    const maxX = COLUMN_WIDTH * TIME_STEPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES;

    // Get sound ID from drag data or existing ghost
    const soundId = dragGhost?.soundId || draggingSound;

    // Start tracking drag state as soon as we detect dragging sound from gallery
    if (soundId && !isDragging) {
      setIsDragging(true);
      if (DEBUG) console.log('🎯 DRAG DETECTED - tracking ALT/Option via dragOver altKey');
    }

    // If mouse is outside the grid bounds, clear hover state and don't show preview
    if (rawX < 0 || rawX > maxX || rawY < 0 || rawY > maxY) {
      setHoveredCell(null);
      // Still update drag ghost position for visual feedback
      if (soundId) {
        setDragGhost({ x: e.clientX, y: e.clientY, soundId });
      }
      return;
    }

    // Clamp to grid bounds for edge drop handling (when in padding zone)
    const x = Math.min(Math.max(rawX, 0), maxX);
    const y = Math.min(Math.max(rawY, 0), maxY);

    const col = Math.floor(x / COLUMN_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    const divisor = SNAP_DIVISOR[resolution];

    // Snap to grid: use the cell the mouse is currently IN (floor-based snapping)
    // Icon lands at the LEFT EDGE of the cell containing the mouse
    const cellInSixteenths = Math.floor(x / SIXTEENTH_WIDTH);
    const snappedBar = Math.floor(cellInSixteenths / divisor) * divisor;
    const finalSnappedBar = Math.max(0, Math.min(63, snappedBar));

    if (DEBUG && resolution === '1/16') {
      console.log('🔵 DRAG_OVER:', { x, cellInSixteenths, divisor, snappedBar, finalSnappedBar, resolution });
    }

    if (col >= 0 && col < TIME_STEPS && row >= 0 && row < TOTAL_SEMITONES) {
      setHoveredCell({ row, col, xWithinCol: x % COLUMN_WIDTH, snappedBar: finalSnappedBar });
    }

    // Update drag ghost position
    if (soundId) {
      setDragGhost({ x: e.clientX, y: e.clientY, soundId });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (DEBUG) console.log('🎬 DROP EVENT RECEIVED:', { metaKey: e.metaKey, hasHoveredCell: !!hoveredCell });

    e.preventDefault();
    e.stopPropagation();

    if (!outerWrapperRef.current || !hoveredCell) {
      if (DEBUG) console.log('⚠️ DROP REJECTED - missing refs:', { hasWrapper: !!outerWrapperRef.current, hasHoveredCell: !!hoveredCell });
      return;
    }

    // Validate that drop position is within actual grid bounds (not just wrapper padding zone)
    const rect = outerWrapperRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left - WRAPPER_PADDING;
    const dropY = e.clientY - rect.top - WRAPPER_PADDING;
    const maxX = COLUMN_WIDTH * TIME_STEPS;
    const maxY = ROW_HEIGHT * TOTAL_SEMITONES;

    // Reject drops outside the inner grid bounds
    if (dropX < 0 || dropX > maxX || dropY < 0 || dropY > maxY) {
      if (DEBUG) {
        console.log('🚫 DROP REJECTED - Out of bounds:', { dropX, dropY, maxX, maxY });
      }
      // Clean up state without placing icon
      setHoveredCell(null);
      setIsDragging(false);
      setDragGhost(null);
      setDraggedPlacementIndex(null);
      return;
    }

    // Use the EXACT position from the hover state - don't recalculate!
    const finalSnappedBar = hoveredCell.snappedBar;
    const row = hoveredCell.row;

    if (DEBUG && resolution === '1/16') {
      const renderX = finalSnappedBar * SIXTEENTH_WIDTH;
      console.log('🟢 DROP:', {
        usingHoveredCell: true,
        hoveredBar: hoveredCell.snappedBar,
        finalSnappedBar,
        renderX,
        resolution
      });
    }

    const pitch = topMidi - row;
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

      // ALT/Option+drag replacement feature: check if ALT key was held during drag OR at drop
      // Using ALT instead of CMD because CMD/Meta blocks browser drop events
      const replaceMode = isCmdPressedRef.current || e.altKey;

      if (DEBUG) {
        console.log('🔍 DROP DEBUG - Replace Mode Check:', {
          isAltPressed: isCmdPressedRef.current,
          dropEventAltKey: e.altKey,
          replaceMode,
          finalSnappedBar,
          pitch,
          placementsCount: placements.length,
          soundId
        });
      }

      if (replaceMode) {
        // Find existing placement where drop position overlaps with icon's visual area
        // Icon is 40px wide (ICON_BOX) centered on its bar position
        // Each sixteenth is 12px (SIXTEENTH_WIDTH)
        // So an icon at bar N visually covers approximately bars N-1 to N+2
        const ICON_OVERLAP_RANGE = 2; // Check ±2 bars for overlap

        const existingIndex = placements.findIndex(p => {
          const barDistance = Math.abs(p.bar - finalSnappedBar);
          const pitchMatch = p.pitch === pitch;
          const barOverlap = barDistance <= ICON_OVERLAP_RANGE;

          if (DEBUG && pitchMatch && barOverlap) {
            console.log('🎯 FOUND OVERLAP:', {
              existingBar: p.bar,
              dropBar: finalSnappedBar,
              barDistance,
              pitch: p.pitch
            });
          }

          return pitchMatch && barOverlap;
        });

        if (DEBUG) {
          console.log('🔍 REPLACE MODE - Search result:', {
            existingIndex,
            searchedFor: { bar: finalSnappedBar, pitch },
            totalPlacements: placements.length,
            allPlacements: placements.map(p => ({ bar: p.bar, pitch: p.pitch, id: p.soundId }))
          });
        }

        if (existingIndex !== -1) {
          // Replace the sound of the existing icon while preserving all other properties
          const updated = [...placements];
          updated[existingIndex] = { ...updated[existingIndex], soundId };
          setPlacements(updated);
          onPreviewNote?.(soundId, pitch);

          if (DEBUG) {
            console.log('✅ REPLACED sound at index', existingIndex);
          }

          // Clean up and return early
          setHoveredCell(null);
          setIsDragging(false);
          setDragGhost(null);
          return;
        }
      }

      // Normal behavior: add new placement
      if (DEBUG) {
        console.log('➕ ADDING new placement at bar:', finalSnappedBar, 'pitch:', pitch);
        console.log('📋 Current placements:', placements.length, '→ New count:', placements.length + 1);
      }
      const np: IconPlacement = { soundId, bar: finalSnappedBar, pitch, velocity: 80 };
      setPlacements([...placements, np]);
      onPreviewNote?.(soundId, pitch);
    }

    // Always clear drag state after drop
    if (DEBUG) {
      console.log('🧹 CLEANUP: Clearing drag state');
    }
    setHoveredCell(null);
    setIsDragging(false);
    setDragGhost(null);
  };

  const handleResizeStart = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const currentDuration = placements[index].duration16 ?? 1;
    setResizingPlacement({ index, startX: e.clientX, startDuration: currentDuration });
  };

  useEffect(() => {
    if (!resizingPlacement) return;

    const handleResizeMove = (e: MouseEvent) => {
      if (!outerWrapperRef.current) return;

      const deltaX = e.clientX - resizingPlacement.startX;
      const deltaSixteenths = Math.round(deltaX / SIXTEENTH_WIDTH);

      // Calculate new duration with resolution snapping
      const divisor = SNAP_DIVISOR[resolution];
      const rawNewDuration = resizingPlacement.startDuration + deltaSixteenths;
      const snappedDuration = Math.round(rawNewDuration / divisor) * divisor;

      // Minimum 1 sixteenth
      const minDuration = Math.max(divisor, 1);
      let newDuration = Math.max(minDuration, snappedDuration);

      // Clamp to loop end (bar 64)
      const placement = placements[resizingPlacement.index];
      const maxDuration = 64 - placement.bar;
      newDuration = Math.min(newDuration, maxDuration);

      // Update placement if changed
      if (newDuration !== placement.duration16) {
        const updated = [...placements];
        updated[resizingPlacement.index] = { ...placement, duration16: newDuration };
        setPlacements(updated);
      }
    };

    const handleResizeEnd = () => {
      setResizingPlacement(null);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizingPlacement, placements, resolution]);

  const renderGrid = () => {
    const rows = [];
    for (let row = 0; row < TOTAL_SEMITONES; row++) {
      const midi = topMidi - row;
      const pc = midiToPitchClass(midi);
      let zoneBg = '#FFFFFF';
      if (isDragging) { if (row < 12) zoneBg = 'rgba(224, 242, 254, 0.3)'; else if (row >= 24) zoneBg = 'rgba(255, 251, 235, 0.3)'; }
      const cells = [];
      for (let col = 0; col < TIME_STEPS; col++) {
        const barIndex = Math.floor(col / STEPS_PER_BAR);
        const chord = barChords[barIndex];
        let barChordColor = 'transparent';
        if (chord) { const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); barChordColor = `rgba(${r}, ${g}, ${b}, 0.2)`; }
        let densityColor = 'transparent'; if (chord) { const alpha = densityAlpha(pc, chord); const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); densityColor = `rgba(${r}, ${g}, ${b}, ${alpha})`; }
        const subdivisionLines: number[] = [];
        if (resolution === '1/4') { subdivisionLines.push(0); } else if (resolution === '1/8') { subdivisionLines.push(0, COLUMN_WIDTH / 2); } else if (resolution === '1/16') { subdivisionLines.push(0, SIXTEENTH_WIDTH, COLUMN_WIDTH / 2, SIXTEENTH_WIDTH * 3); }
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
    const BLOCK_HEIGHT = 40; // Container height (for icon)

    return placements.map((p, index) => {
      const sound = SOUND_ICONS.find(s => s.id === p.soundId);
      if (!sound) return null;
      const IconComponent = sound.icon;
      const row = topMidi - p.pitch;
      const isDragged = draggedPlacementIndex === index;

      // Position container so icon CENTER aligns with cell CENTER
      // Cell center is at: p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH/2
      // Icon center is at: ICON_BOX/2 from container left edge
      // So container left should be: cellCenter - iconCenter
      const cellCenterX = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
      const startX = cellCenterX - ICON_BOX / 2;
      const widthPx = (p.duration16 ?? 1) * SIXTEENTH_WIDTH;
      const rowTop = row * ROW_HEIGHT;

      // Center the container on the grid row
      const blockTop = rowTop - (BLOCK_HEIGHT - ROW_HEIGHT) / 2;

      // Calculate bar dimensions - start at icon center with fade
      const BAR_START_OFFSET = ICON_BOX / 2; // Start at icon center (20px)
      const barWidth = Math.max(0, widthPx - BAR_START_OFFSET);
      const barVerticalOffset = (BLOCK_HEIGHT - BAR_HEIGHT) / 2;
      const FADE_DISTANCE = ICON_BOX / 2; // Fade from center (20px) to hitbox edge (40px)

      // Get icon color for bar
      const barColor = sound.color || '#808080';

      const iconQuarterNotePosition = p.bar / 4;
      const distance = Math.abs(currentStep - iconQuarterNotePosition);
      const isHit = isPlaying && distance < 0.08;

      if (DEBUG && resolution === '1/16') {
        console.log(`📍 ICON RENDER ${index}:`, {
          bar: p.bar,
          dur: p.duration16 ?? 1,
          startX,
          widthPx,
          SIXTEENTH_WIDTH,
          calculation: `${p.bar} * ${SIXTEENTH_WIDTH} = ${startX}`
        });
      }

      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${startX}px`,
            top: `${blockTop}px`,
            width: `${widthPx}px`,
            height: `${BLOCK_HEIGHT}px`,
            zIndex: 200
          }}
        >
          {/* Draggable wrapper - 40x40px centered on grid cell */}
          <div
            draggable
            onDragStart={(e) => handlePlacementDragStart(e, index)}
            onDoubleClick={(e) => handleIconDoubleClick(e, index)}
            style={{
              position: 'absolute',
              left: '0px',
              top: `${(BLOCK_HEIGHT - ICON_BOX) / 2}px`,
              width: `${ICON_BOX}px`,
              height: `${ICON_BOX}px`,
              cursor: isDragged ? 'grabbing' : (hoveredResizeIcon === index ? 'default' : 'grab'),
              zIndex: 201,
              // Allow drops from gallery to pass through to grid when dragging from gallery
              // When dragging a placed icon, keep pointer events on THAT icon, disable others
              pointerEvents: (draggedPlacementIndex !== index && (draggingSound || isDragging || dragGhost)) ? 'none' : 'auto'
            }}
          >
            {/* Icon centered in draggable wrapper */}
            <motion.div
              animate={{ scale: isHit ? 1.1 : 1.0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              style={{
                position: 'absolute',
                left: '0px',
                top: '0px',
                width: `${ICON_BOX}px`,
                height: `${ICON_BOX}px`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                backgroundColor: DEBUG ? 'rgba(0, 255, 0, 0.2)' : 'transparent'
              }}
            >
              <IconComponent />
            </motion.div>
          </div>

          {/* Debug marker - shows exact left edge of container */}
          {DEBUG && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '2px',
              height: `${BLOCK_HEIGHT}px`,
              backgroundColor: 'red',
              pointerEvents: 'none',
              zIndex: 10
            }} />
          )}

          {/* Duration bar trailing to the right - show when resizing, has width, or hovering */}
          {(resizingPlacement?.index === index || barWidth > 0 || hoveredResizeIcon === index) && (
            <div
              style={{
                position: 'absolute',
                left: `${BAR_START_OFFSET}px`,
                top: `${barVerticalOffset}px`,
                width: `${Math.max(barWidth, hoveredResizeIcon === index ? ICON_BOX / 2 : 0)}px`,
                height: `${BAR_HEIGHT}px`,
                background: `linear-gradient(to right, transparent 0px, ${barColor}80 ${FADE_DISTANCE}px)`,
                borderRadius: `${BAR_HEIGHT / 2}px`, // Both edges rounded (pill shape)
                pointerEvents: 'none',
                opacity: resizingPlacement?.index === index ? 1 : (barWidth > 0 ? 1 : 0.6),
                transition: 'opacity 0.15s ease'
              }}
            />
          )}

          {/* Invisible resize zone at right edge of icon/duration */}
          <div
            onMouseDown={(e) => handleResizeStart(e, index)}
            onMouseEnter={() => setHoveredResizeIcon(index)}
            onMouseLeave={() => setHoveredResizeIcon(null)}
            style={{
              position: 'absolute',
              left: `${Math.max(ICON_BOX - 15, widthPx - 15)}px`, // At icon right edge minimum, extends with duration
              top: 0,
              width: '15px', // 15px hover zone width
              height: `${BLOCK_HEIGHT}px`,
              cursor: hoveredResizeIcon === index || resizingPlacement?.index === index ? 'ew-resize' : 'auto',
              zIndex: 202, // Above draggable wrapper (201) to receive mouse events
              // Allow drops from gallery to pass through when dragging from gallery
              pointerEvents: draggingSound ? 'none' : 'auto',
              // Debug: uncomment to see hover zone
              // background: 'rgba(255,0,0,0.2)'
            }}
          />
        </div>
      );
    });
  };

  const renderHoverOverlay = () => {
    if (!hoveredCell || !isDragging) return null;
    const divisor = SNAP_DIVISOR[resolution];
    const hoverWidth = divisor * SIXTEENTH_WIDTH;  // Grid cell width based on resolution
    const cellStartBar = hoveredCell.snappedBar;
    const iconLeftX = cellStartBar * SIXTEENTH_WIDTH;
    const rowTop = hoveredCell.row * ROW_HEIGHT;

    if (DEBUG && resolution === '1/16') {
      console.log('📦 HOVER:', { cellStartBar, iconLeftX, hoverWidth, divisor, SIXTEENTH_WIDTH });
    }

    return (
      <>
        {/* Target cell highlight */}
        <div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: `${hoverWidth}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'rgba(142,225,255,0.3)', border: '2px solid rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 50 }} />
        {/* Icon preview outline (40px wide) */}
        {DEBUG && <div style={{ position: 'absolute', left: `${iconLeftX}px`, top: `${rowTop}px`, width: `${ICON_BOX}px`, height: `${ROW_HEIGHT}px`, backgroundColor: 'transparent', border: '2px dashed rgba(255,0,0,0.5)', pointerEvents: 'none', zIndex: 51 }} />}
      </>
    );
  };

  const renderDragGhost = () => {
    if (!dragGhost) return null;
    const sound = SOUND_ICONS.find(s => s.id === dragGhost.soundId);
    if (!sound) return null;
    const IconComponent = sound.icon;
    return (<div style={{ position: 'fixed', left: `${dragGhost.x - ICON_BOX / 2}px`, top: `${dragGhost.y - ICON_BOX / 2}px`, width: `${ICON_BOX}px`, height: `${ICON_BOX}px`, opacity: 0.85, pointerEvents: 'none', zIndex: 1000 }}><div style={{ width: '100%', height: '100%', transform: `scale(${BASE_SCALE})`, transformOrigin: 'center' }}><IconComponent /></div></div>);
  };

  const handleDragEnd = () => {
    if (DEBUG) {
      console.log('🏁 DRAG END: Clearing all drag state', { wasCmdPressed: isCmdPressedRef.current });
    }
    setDraggedPlacementIndex(null);
    setHoveredCell(null);
    setDragGhost(null);
    setIsDragging(false);
    // Reset CMD state when drag ends (after a small delay to ensure drop completes)
    setTimeout(() => { isCmdPressedRef.current = false; }, 50);
  };
  const handleDragLeave = (e: React.DragEvent) => { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setHoveredCell(null); };
  const handleBarClick = (e: React.MouseEvent, barIndex: number) => { e.stopPropagation(); if (assignmentMode) onBarChordAssign(barIndex, assignmentMode); };

  return (
    <div className="flex flex-row">
      {/* Left sidebar: Up arrow + Down arrow aligned with sequencer edges */}
      <div className="flex flex-col items-center justify-between mr-2" style={{ height: `${ROW_HEIGHT * TOTAL_SEMITONES}px` }}>
        {/* Octave Up */}
        <button
          onClick={() => setOctaveOffset(o => Math.min(o + 1, 3))}
          disabled={octaveOffset >= 3}
          style={{
            fontSize: '20px',
            opacity: octaveOffset < 3 ? 1 : 0.3,
            cursor: octaveOffset < 3 ? 'pointer' : 'not-allowed',
            background: 'none',
            border: 'none',
            padding: '4px',
            color: '#000000',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title={`Octave Up (C${3 + octaveOffset} to B${5 + octaveOffset})`}
        >
          ↑
        </button>

        {/* Octave Down */}
        <button
          onClick={() => setOctaveOffset(o => Math.max(o - 1, -3))}
          disabled={octaveOffset <= -3}
          style={{
            fontSize: '20px',
            opacity: octaveOffset > -3 ? 1 : 0.3,
            cursor: octaveOffset > -3 ? 'pointer' : 'not-allowed',
            background: 'none',
            border: 'none',
            padding: '4px',
            color: '#000000',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title={`Octave Down (C${3 + octaveOffset} to B${5 + octaveOffset})`}
        >
          ↓
        </button>
      </div>

      {/* Sequencer grid */}
      <div ref={outerWrapperRef} className="relative flex items-center justify-center" style={{ width: `${COLUMN_WIDTH * TIME_STEPS + WRAPPER_PADDING * 2}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES + WRAPPER_PADDING * 2}px` }} onDragOver={!assignmentMode ? handleDragOver : undefined} onDragLeave={!assignmentMode ? handleDragLeave : undefined} onDrop={!assignmentMode ? handleDrop : undefined} onDragEnd={!assignmentMode ? handleDragEnd : undefined}>
        <div ref={sequencerRef} className="relative border-2 border-black rounded-xl overflow-hidden" style={{ width: `${COLUMN_WIDTH * TIME_STEPS}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES}px`, userSelect: 'none', flexShrink: 0 }}>
          {renderGrid()}
          {renderHoverOverlay()}
          {!assignmentMode && renderPlacements()}
          {isPlaying && (<div style={{ position: 'absolute', left: `${currentStep * COLUMN_WIDTH}px`, top: 0, width: '2px', height: '100%', backgroundColor: '#FFD11A', boxShadow: '0 0 8px rgba(255, 209, 26, 0.8)', pointerEvents: 'none', zIndex: 150 }} />)}

          {/* Clickable bar overlays for chord assignment mode */}
          {assignmentMode && (
            <>
              {[0, 1, 2, 3].map(barIndex => (
                <div
                  key={`bar-overlay-${barIndex}`}
                  onClick={(e) => handleBarClick(e, barIndex)}
                  style={{
                    position: 'absolute',
                    left: `${barIndex * STEPS_PER_BAR * COLUMN_WIDTH}px`,
                    top: 0,
                    width: `${STEPS_PER_BAR * COLUMN_WIDTH}px`,
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 250,
                    // Subtle visual feedback on hover
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
      {renderDragGhost()}
    </div>
  );
}
