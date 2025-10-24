import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SOUND_ICONS } from './SoundIcons';
import { type Chord, densityAlpha, midiToPitchClass, chordColors } from './chordData';
import ChordLabels from './ChordLabels';
import { SEQUENCER_LAYOUT, getRowHeight, getColumnWidth } from './sequencerLayout';
import { useMultiSelection } from '../hooks/useMultiSelection';

interface IconPlacement {
  id: string; // Stable UUID for selection tracking
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
  // Mobile interaction props
  isMobile?: boolean;
  onGridCellClick?: (bar: number, pitch: number) => void;
  onIconClick?: (placement: IconPlacement) => void;
  selectedIconForDeletion?: IconPlacement | null;
  selectedSoundForPlacement?: string | null;
}

/**
 * Ensures all placements have stable UUID identifiers.
 * Migrates legacy placements without IDs by generating new UUIDs.
 */
function ensurePlacementIds(placements: IconPlacement[]): IconPlacement[] {
  return placements.map(p => {
    if (p.id) return p; // Already has ID
    return { ...p, id: crypto.randomUUID() }; // Generate new ID
  });
}

// Shared constants from sequencerLayout
// Note: ROW_HEIGHT and COLUMN_WIDTH are dynamic - use getRowHeight(isMobile) and getColumnWidth(isMobile)
const { TIME_STEPS, STEPS_PER_BAR, TOTAL_SEMITONES, WRAPPER_PADDING, GRID_BORDER_WIDTH } = SEQUENCER_LAYOUT;

const BARS = 4;
const BASE_MIDI = 48;
const EPS = 0.0001;

// Canonical 1/16 backbone
const SNAP_DIVISOR = { '1/4': 4, '1/8': 2, '1/16': 1 } as const;

// Unified icon box and scale for placed + ghost
const ICON_BOX = 40;
const BASE_SCALE = 0.8;

// Duration bar styling
const BAR_HEIGHT = 12;  // Bar for duration visualization

// Debug flag - set to true to enable console logs and visual debug overlays
const DEBUG = false;

export default function IconSequencerWithDensity(props: IconSequencerWithDensityProps) {
  const { selectedSound, selectedKey, draggingSound, barChords, assignmentMode, onBarChordAssign, currentStep, isPlaying, placements: externalPlacements, onPlacementsChange, onPreviewNote, resolution, quantizeBar, octaveOffset: externalOctaveOffset, onOctaveOffsetChange, onChordSelect, onPresetSelect, isMobile, onGridCellClick, onIconClick, selectedIconForDeletion, selectedSoundForPlacement } = props;

  // Responsive dimensions - mobile uses smaller cells to fit screen width
  const ROW_HEIGHT = getRowHeight(isMobile || false);
  const COLUMN_WIDTH = getColumnWidth(isMobile || false);

  // Derived widths based on responsive COLUMN_WIDTH
  const EIGHTH_WIDTH = COLUMN_WIDTH / 2;
  const SIXTEENTH_WIDTH = COLUMN_WIDTH / 4;
  const centerXFromBar = (bar: number) => bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;

  // Responsive grid dimensions
  const gridWidth = COLUMN_WIDTH * TIME_STEPS;
  const gridTotalWidth = gridWidth + 2 * GRID_BORDER_WIDTH;

  // DEBUG: Log responsive dimensions on every render
  console.log('[IconSequencer] Responsive dimensions:', {
    isMobile,
    COLUMN_WIDTH,
    ROW_HEIGHT,
    gridWidth,
    gridTotalWidth,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'SSR'
  });

  const [internalOctaveOffset, setInternalOctaveOffset] = useState(0);
  const octaveOffset = externalOctaveOffset !== undefined ? externalOctaveOffset : internalOctaveOffset;
  const setOctaveOffset = onOctaveOffsetChange || setInternalOctaveOffset;

  const BASE_BOTTOM_MIDI = 36; // C2 - 3 octaves span
  const BASE_TOP_MIDI = 72; // C5 - exactly 3 octaves above C2
  const topMidi = BASE_TOP_MIDI + octaveOffset * 12;
  const baseMidi = BASE_BOTTOM_MIDI + octaveOffset * 12;

  // Shared grid padding calculation - used for pitch markers, placements, and hover overlay
  const gridContentHeight = TOTAL_SEMITONES * ROW_HEIGHT;
  const containerHeight = ROW_HEIGHT * TOTAL_SEMITONES + ROW_HEIGHT + 10;
  const gridPaddingTop = (containerHeight - gridContentHeight) / 2;

  const [placements, setPlacements] = useState<IconPlacement[]>([]);
  const isSyncingFromExternal = useRef(false);
  const lastPropagatedRef = useRef<IconPlacement[] | null>(null);

  // Sync external placements to internal state
  // BUT skip if it's the same reference we just sent (prevent circular updates)
  // Also ensure all placements have UUIDs (migrate legacy data)
  useEffect(() => {
    if (externalPlacements && externalPlacements !== lastPropagatedRef.current) {
      isSyncingFromExternal.current = true;
      setPlacements(ensurePlacementIds(externalPlacements));
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

  // Multi-selection state - disabled during chord assignment mode
  const selection = useMultiSelection({
    items: placements,
    onChange: setPlacements,
    enabled: !assignmentMode
  });

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; xWithinCol: number; snappedBar: number } | null>(null);
  const [draggedPlacementIndex, setDraggedPlacementIndex] = useState<number | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; soundId: string } | null>(null);
  const [dragGhosts, setDragGhosts] = useState<Array<{ offsetX: number; offsetY: number; soundId: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const isCmdPressedRef = useRef(false); // Track CMD key state globally (ref to avoid closure bugs)
  const [resizingPlacement, setResizingPlacement] = useState<{ index: number; startX: number; startDuration: number } | null>(null);
  const [hoveredResizeIcon, setHoveredResizeIcon] = useState<number | null>(null);
  const sequencerRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const marqueeJustEndedRef = useRef(false);

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

  const handlePlacementDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedPlacementIndex(index);
    setIsDragging(true);
    const p = placements[index];
    setDragGhost({ x: e.clientX, y: e.clientY, soundId: p.soundId });

    // If dragging a selected icon with multiple selections, create ghosts for all selected
    const isDraggedInSelection = selection.isSelected(p.id);
    if (isDraggedInSelection && selection.selectedIds.size > 1) {
      const ghosts = selection.selectedItems.map(item => ({
        offsetX: (item.bar - p.bar) * SIXTEENTH_WIDTH,
        // Y-offset: higher pitches are visually ABOVE (negative Y), so invert the sign
        offsetY: (p.pitch - item.pitch) * ROW_HEIGHT,
        soundId: item.soundId
      }));
      setDragGhosts(ghosts);
    } else {
      setDragGhosts([]);
    }

    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('placementIndex', String(index));
    e.dataTransfer.setData('soundId', p.soundId);
    makeCenteredDragImage(e);
  };
  const handleIconDoubleClick = (e: React.MouseEvent, index: number) => { e.stopPropagation(); const updated = placements.filter((_, i) => i !== index); setPlacements(updated); };

  // Marquee selection handlers
  const handleMarqueeStart = (e: React.MouseEvent) => {
    // Only start marquee if clicking on grid background (not on icons or during drag)
    if (assignmentMode || isDragging || dragGhost) return;

    const rect = sequencerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMarqueeMove = useCallback((e: MouseEvent) => {
    const rect = sequencerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarquee(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const handleMarqueeEnd = useCallback(() => {
    if (!marquee) return;

    // Calculate marquee rectangle bounds
    const minX = Math.min(marquee.startX, marquee.currentX);
    const maxX = Math.max(marquee.startX, marquee.currentX);
    const minY = Math.min(marquee.startY, marquee.currentY);
    const maxY = Math.max(marquee.startY, marquee.currentY);

    // Find icons that intersect with marquee
    // NOTE: Icon positions in DOM include gridPaddingTop, so we must use the same coordinate space
    const selectedInMarquee: string[] = [];
    placements.forEach((p) => {
      const row = topMidi - p.pitch;
      const cellCenterX = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
      const iconLeft = cellCenterX - ICON_BOX / 2;
      const iconRight = iconLeft + ICON_BOX;
      // Icon visual position in grid container (same coordinate space as marquee) - shifted up 2px to match render
      const iconTop = row * ROW_HEIGHT + gridPaddingTop - (40 - ROW_HEIGHT) / 2 - 2;
      const iconBottom = iconTop + 40; // BLOCK_HEIGHT = 40

      // Check if icon intersects with marquee box
      const intersects = iconRight >= minX && iconLeft <= maxX && iconBottom >= minY && iconTop <= maxY;
      if (intersects) {
        selectedInMarquee.push(p.id);
      }
    });

    // Mark that marquee just ended to prevent onClick from clearing selection
    marqueeJustEndedRef.current = true;
    setTimeout(() => {
      marqueeJustEndedRef.current = false;
    }, 100);

    // Clear marquee first
    setMarquee(null);

    // Then update selection in a single atomic operation (avoids state batching issues)
    if (selectedInMarquee.length > 0) {
      selection.setSelection(selectedInMarquee);
    } else {
      selection.clearSelection();
    }
  }, [marquee, placements, topMidi, gridPaddingTop, selection]);

  // Window-level mouse handlers for marquee selection (allows dragging beyond grid bounds)
  useEffect(() => {
    if (!marquee) return;

    window.addEventListener('mousemove', handleMarqueeMove);
    window.addEventListener('mouseup', handleMarqueeEnd);

    return () => {
      window.removeEventListener('mousemove', handleMarqueeMove);
      window.removeEventListener('mouseup', handleMarqueeEnd);
    };
  }, [marquee, handleMarqueeMove, handleMarqueeEnd]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Always use 'copy' effect to match gallery's effectAllowed='copy'
    e.dataTransfer.dropEffect = 'copy';

    // Track ALT/Option key state from dragOver event (CMD/Meta blocks drops!)
    isCmdPressedRef.current = e.altKey;

    if (!outerWrapperRef.current) return;

    const rect = outerWrapperRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - WRAPPER_PADDING;
    const rawY = e.clientY - rect.top - WRAPPER_PADDING - gridPaddingTop;
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

    // Snap to grid: floor to snap point at or before cursor, then center the icon
    // This ensures the icon lands on the grid line closest to where user dropped
    const cursorBar = x / SIXTEENTH_WIDTH; // Exact bar position of cursor
    const snappedBar = Math.floor(cursorBar / divisor) * divisor; // Floor to snap point at/before cursor
    const finalSnappedBar = Math.max(0, Math.min(63, snappedBar));

    if (DEBUG && resolution === '1/16') {
      console.log('🔵 DRAG_OVER:', { x, divisor, snappedBar, finalSnappedBar, resolution });
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
    const dropY = e.clientY - rect.top - WRAPPER_PADDING - gridPaddingTop;
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
      const draggedPlacement = placements[placementIndex];
      const isDraggedInSelection = selection.isSelected(draggedPlacement.id);

      if (isDuplicating) {
        // Duplication mode: duplicate the dragged icon (or all selected icons if dragged is in selection)
        if (isDraggedInSelection && selection.selectedIds.size > 1) {
          // Duplicate all selected icons with same offset
          const deltaBar = finalSnappedBar - draggedPlacement.bar;
          const deltaPitch = pitch - draggedPlacement.pitch;
          const newPlacements = selection.selectedItems.map(p => ({
            ...p,
            id: crypto.randomUUID(),
            bar: Math.max(0, Math.min(63, p.bar + deltaBar)),
            pitch: Math.max(BASE_BOTTOM_MIDI, Math.min(topMidi, p.pitch + deltaPitch))
          }));
          setPlacements([...placements, ...newPlacements]);
          // Select the newly created duplicates
          selection.setSelection(newPlacements.map(p => p.id));
          onPreviewNote?.(draggedPlacement.soundId, pitch);
        } else {
          // Single duplication
          const np: IconPlacement = { ...draggedPlacement, id: crypto.randomUUID(), bar: finalSnappedBar, pitch };
          setPlacements([...placements, np]);
          // Select the newly created duplicate
          selection.setSelection([np.id]);
          onPreviewNote?.(np.soundId, pitch);
        }
      } else {
        // Move mode: move the dragged icon (or all selected icons if dragged is in selection)
        if (isDraggedInSelection && selection.selectedIds.size > 1) {
          // Move all selected icons with same offset
          const deltaBar = finalSnappedBar - draggedPlacement.bar;
          const deltaPitch = pitch - draggedPlacement.pitch;
          const up = placements.map(p => {
            if (selection.isSelected(p.id)) {
              return {
                ...p,
                bar: Math.max(0, Math.min(63, p.bar + deltaBar)),
                pitch: Math.max(BASE_BOTTOM_MIDI, Math.min(topMidi, p.pitch + deltaPitch))
              };
            }
            return p;
          });
          setPlacements(up);
          onPreviewNote?.(draggedPlacement.soundId, pitch);
        } else {
          // Single move
          const up = [...placements];
          up[placementIndex] = { ...up[placementIndex], bar: finalSnappedBar, pitch };
          setPlacements(up);
          onPreviewNote?.(up[placementIndex].soundId, pitch);
        }
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
      const np: IconPlacement = { id: crypto.randomUUID(), soundId, bar: finalSnappedBar, pitch, velocity: 80 };
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

      // Minimum 1 sixteenth - always allow reducing to single note regardless of snap divisor
      const minDuration = 1;
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

  const renderGridLines = () => {
    // Render vertical grid lines as single overlay to avoid double-line artifacts
    const lines = [];
    const divisor = SNAP_DIVISOR[resolution];
    const totalSixteenths = TIME_STEPS * 4; // 16 quarter notes × 4 sixteenths = 64 sixteenths
    const sixteenthsPerBar = STEPS_PER_BAR * 4; // 4 quarter notes × 4 sixteenths = 16 sixteenths per bar

    for (let bar = 0; bar <= totalSixteenths; bar += divisor) {
      const xPos = bar * SIXTEENTH_WIDTH;
      const isBarBoundary = bar % sixteenthsPerBar === 0; // Every 16 sixteenths = bar boundary

      lines.push(
        <div
          key={bar}
          style={{
            position: 'absolute',
            left: `${xPos}px`,
            top: 0,
            width: isBarBoundary ? '2px' : '1px', // Bar boundaries are 2px thick
            height: '100%',
            backgroundColor: isBarBoundary ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)', // Bar boundaries slightly darker
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      );
    }

    return <>{lines}</>;
  };

  const renderGrid = () => {
    const rows = [];
    const containerHeight = ROW_HEIGHT * TOTAL_SEMITONES + ROW_HEIGHT + 10;
    const totalRows = Math.ceil(containerHeight / ROW_HEIGHT); // Fill entire container height
    const paddingRows = totalRows - TOTAL_SEMITONES;
    const topPaddingRows = Math.floor(paddingRows / 2);

    for (let row = 0; row < totalRows; row++) {
      // Calculate actual grid row (offset by padding rows)
      const gridRow = row - topPaddingRows;
      const isPlayableRow = gridRow >= 0 && gridRow < TOTAL_SEMITONES;
      const midi = isPlayableRow ? topMidi - gridRow : -1;
      const pc = isPlayableRow ? midiToPitchClass(midi) : 0;

      let zoneBg = '#FFFFFF';
      if (isDragging && isPlayableRow) { if (gridRow < 12) zoneBg = 'rgba(224, 242, 254, 0.3)'; else if (gridRow >= 24) zoneBg = 'rgba(255, 251, 235, 0.3)'; }

      const cells = [];
      for (let col = 0; col < TIME_STEPS; col++) {
        const barIndex = Math.floor(col / STEPS_PER_BAR);
        const chord = barChords[barIndex];
        let barChordColor = 'transparent';
        if (chord) { const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); barChordColor = `rgba(${r}, ${g}, ${b}, 0.2)`; }
        let densityColor = 'transparent';
        if (chord && isPlayableRow) { const alpha = densityAlpha(pc, chord); const color = chordColors[chord]; const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16); densityColor = `rgba(${r}, ${g}, ${b}, ${alpha})`; }
        cells.push(
          <div
            key={col}
            className="grid-background"
            style={{ width: `${COLUMN_WIDTH}px`, height: `${ROW_HEIGHT}px`, position: 'relative', flexShrink: 0, cursor: onGridCellClick ? 'pointer' : 'default' }}
            onClick={() => {
              // Handle tap-to-place on mobile
              if (onGridCellClick && isPlayableRow) {
                const bar = col * 4; // Convert column (quarter note) to sixteenth notes
                const pitch = midi;
                onGridCellClick(bar, pitch);
              }
            }}
          >
            <div style={{ position: 'absolute', inset: 0, backgroundColor: barChordColor, pointerEvents: 'none' }} />
            {isDragging && (<div style={{ position: 'absolute', inset: 0, backgroundColor: densityColor, pointerEvents: 'none' }} />)}
          </div>
        );
      }
      rows.push(<div key={row} className="flex grid-background" style={{ height: `${ROW_HEIGHT}px`, flexShrink: 0 }}>{cells}</div>);
    }
    return (<div className="grid-background" style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>);
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
      const rowTop = row * ROW_HEIGHT + gridPaddingTop;

      // Center the container on the grid row, shifted up slightly for better visual alignment
      const blockTop = rowTop - (BLOCK_HEIGHT - ROW_HEIGHT) / 2 - 2;

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
          data-icon-placement="true"
          style={{
            position: 'absolute',
            left: `${startX}px`,
            top: `${blockTop}px`,
            width: `${ICON_BOX}px`, // Icon box fixed width, duration bar extends separately
            height: `${BLOCK_HEIGHT}px`,
            zIndex: 200
          }}
        >
          {/* Draggable wrapper - 40x40px centered on grid cell */}
          <div
            draggable
            onDragStart={(e) => handlePlacementDragStart(e, index)}
            onDoubleClick={(e) => handleIconDoubleClick(e, index)}
            onClick={(e) => {
              e.stopPropagation();
              selection.selectItem(p.id);
              // Mobile tap-to-select for deletion
              if (onIconClick && isMobile) {
                onIconClick(p);
              }
            }}
            style={{
              position: 'absolute',
              left: '0px', // Container already positioned to center icon (startX = cellCenterX - ICON_BOX/2)
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
            {/* Icon centered in draggable wrapper - matching gallery approach */}
            <motion.div
              animate={{ scale: isHit ? 1.1 : 1.0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: 'center center',
                pointerEvents: 'none',
                backgroundColor: DEBUG ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selection.isSelected(p.id) && (
                <div
                  className="border-cycle"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid',
                    backgroundColor: 'transparent',
                    pointerEvents: 'none',
                    zIndex: -1
                  }}
                />
              )}
              {/* Mobile deletion selection - red ring like gallery's blue ring */}
              {selectedIconForDeletion === p && isMobile && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '4px solid #EF4444',
                    backgroundColor: 'transparent',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                />
              )}
              <div style={{ width: '40px', height: '40px', display: 'block', lineHeight: 0 }}>
                <IconComponent />
              </div>
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

    const rowTop = hoveredCell.row * ROW_HEIGHT + gridPaddingTop;

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

    // Render multiple ghosts if dragging selected group
    if (dragGhosts.length > 0) {
      return (
        <>
          {dragGhosts.map((ghost, idx) => {
            const sound = SOUND_ICONS.find(s => s.id === ghost.soundId);
            if (!sound) return null;
            const IconComponent = sound.icon;
            const ghostX = dragGhost.x + ghost.offsetX;
            const ghostY = dragGhost.y + ghost.offsetY;
            return (
              <div
                key={idx}
                style={{
                  position: 'fixed',
                  left: `${ghostX - ICON_BOX / 2}px`,
                  top: `${ghostY - ICON_BOX / 2}px`,
                  width: `${ICON_BOX}px`,
                  height: `${ICON_BOX}px`,
                  opacity: 0.85,
                  pointerEvents: 'none',
                  zIndex: 1000
                }}
              >
                <div style={{ width: '100%', height: '100%', transform: `scale(${BASE_SCALE})`, transformOrigin: 'center' }}>
                  <IconComponent />
                </div>
              </div>
            );
          })}
        </>
      );
    }

    // Single ghost (original behavior)
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
    setDragGhosts([]);
    setIsDragging(false);
    // Reset CMD state when drag ends (after a small delay to ensure drop completes)
    setTimeout(() => { isCmdPressedRef.current = false; }, 50);
  };
  const handleDragLeave = (e: React.DragEvent) => { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setHoveredCell(null); };
  const handleBarClick = (e: React.MouseEvent, barIndex: number) => { e.stopPropagation(); if (assignmentMode) onBarChordAssign(barIndex, assignmentMode); };

  // Scroll wheel pitch control with throttling
  useEffect(() => {
    const wrapper = outerWrapperRef.current;
    if (!wrapper) return;

    let accumulatedDelta = 0;
    const THRESHOLD = 40; // Require ~2-3 scroll notches before changing octave

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scroll

      accumulatedDelta += e.deltaY;

      // Only change octave when accumulated delta exceeds threshold
      if (Math.abs(accumulatedDelta) >= THRESHOLD) {
        if (accumulatedDelta > 0) {
          // Scroll down = pitch down = decrease octave (down to -3)
          setOctaveOffset(o => Math.max(o - 1, -3));
        } else {
          // Scroll up = pitch up = increase octave (up to +3)
          setOctaveOffset(o => Math.min(o + 1, 3));
        }
        accumulatedDelta = 0; // Reset after change
      }
    };

    // Add listener with passive: false to allow preventDefault
    wrapper.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', handleWheel);
    };
  }, [setOctaveOffset]);

  // Render C note pitch markers - positioned absolutely inside grid container
  const renderPitchMarkers = () => {
    const cNotes = [];

    // Find all C notes within the visible range (baseMidi to topMidi)
    // C notes are MIDI numbers where (midi % 12) === 0
    // MIDI 24=C1, 36=C2, 48=C3, 60=C4, 72=C5, 84=C6, etc.

    for (let midi = 0; midi <= 127; midi += 12) {
      // Only show C notes that are fully within the grid range
      if (midi >= baseMidi && midi <= topMidi) {
        const octave = Math.floor((midi - 12) / 12); // MIDI 24=C1, 36=C2, 48=C3, etc.
        const noteName = `C${octave}`;
        const rowFromTop = topMidi - midi; // Position from top of grid
        const yPosition = rowFromTop * ROW_HEIGHT + gridPaddingTop;

        // Add all C notes within the visible range
        if (rowFromTop >= 0 && rowFromTop < TOTAL_SEMITONES) {
          cNotes.push({ midi, noteName, yPosition });
        }
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          left: '-32px',
          top: `${WRAPPER_PADDING}px`,
          width: '32px',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100,
          outline: DEBUG ? '2px solid red' : 'none'
        }}
      >
        {cNotes.map(({ midi, noteName, yPosition }) => (
          <div
            key={midi}
            className="absolute font-medium text-gray-500"
            style={{
              top: `${yPosition}px`,
              left: '8px',
              lineHeight: `${ROW_HEIGHT}px`,
              height: `${ROW_HEIGHT}px`,
              fontSize: '10px',
              userSelect: 'none'
            }}
          >
            {noteName}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-row">
      {/* DEBUG: Visual indicator of responsive state */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '10px',
        padding: '8px 12px',
        background: isMobile ? '#22c55e' : '#ef4444',
        color: 'white',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {isMobile ? '📱 MOBILE' : '💻 DESKTOP'} | {COLUMN_WIDTH}px cols | {gridTotalWidth}px grid
        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '4px' }}>
          v10-17x18 | Grid: {gridWidth}px | Window: {typeof window !== 'undefined' ? window.innerWidth : '?'}px
        </div>
      </div>
      {/* Sequencer grid with scroll-based pitch control */}
      <div className="relative flex flex-col items-center" style={{ gap: '0px' }}>
        {/* Mobile scroll container - max height on mobile, full height on desktop */}
        <div
          className={isMobile ? "overflow-auto w-full flex justify-center" : ""}
          style={isMobile ? {
            maxHeight: '60vh',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          } : {}}
        >
          <div
            ref={outerWrapperRef}
            className="relative flex items-center justify-center"
            style={{ width: `${gridTotalWidth + WRAPPER_PADDING * 2}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES + WRAPPER_PADDING * 2 + ROW_HEIGHT + 10}px` }}
            onDragOver={!assignmentMode ? handleDragOver : undefined}
            onDragLeave={!assignmentMode ? handleDragLeave : undefined}
            onDrop={!assignmentMode ? handleDrop : undefined}
            onDragEnd={!assignmentMode ? handleDragEnd : undefined}
          onClick={(e) => {
            // Clear selection when clicking anywhere except on icons
            if (!assignmentMode) {
              // Don't clear if marquee just ended (prevents mouseup+click race condition)
              if (marqueeJustEndedRef.current) return;

              const target = e.target as HTMLElement;
              // Check if clicked on an icon or inside an icon's wrapper
              if (!target.closest('[data-icon-placement]')) {
                selection.clearSelection();
              }
            }
          }}
        >
          {/* C note pitch markers - absolutely positioned to left of grid */}
          {renderPitchMarkers()}
          <div
            ref={sequencerRef}
            className={`relative border-2 border-black rounded-xl ${marquee ? 'overflow-visible' : 'overflow-hidden'}`}
            style={{ width: `${gridWidth}px`, height: `${ROW_HEIGHT * TOTAL_SEMITONES + ROW_HEIGHT + 10}px`, userSelect: 'none', flexShrink: 0, outline: DEBUG ? '2px solid blue' : 'none' }}
            onMouseDown={(e) => {
              // Start marquee if clicking on grid background
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.grid-background')) {
                handleMarqueeStart(e);
              }
            }}
          >
            {/* Step numbers at bottom of grid */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '0',
                display: 'flex',
                height: '16px',
                width: '100%',
                zIndex: 200,
                pointerEvents: 'none'
              }}
            >
              {Array.from({ length: TIME_STEPS }).map((_, index) => {
                // Show numbers at steps 1, 5, 9, 13 (every 4th step, 1-indexed)
                const showNumber = index % 4 === 0;

                return (
                  <div
                    key={index}
                    style={{
                      width: `${COLUMN_WIDTH}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Inter',
                      fontSize: '12px',
                      lineHeight: '16px',
                      fontWeight: 500,
                      color: 'rgba(0,0,0,0.55)'
                    }}
                  >
                    {showNumber ? index + 1 : ''}
                  </div>
                );
              })}
            </div>

            {renderGrid()}
            {renderGridLines()}
            {renderHoverOverlay()}
            {!assignmentMode && renderPlacements()}
            {isPlaying && (<div style={{ position: 'absolute', left: `${currentStep * COLUMN_WIDTH}px`, top: 0, width: '2px', height: '100%', backgroundColor: '#00D9FF', pointerEvents: 'none', zIndex: 150 }} />)}

            {/* Marquee selection rectangle */}
            {marquee && (
              <div style={{
                position: 'absolute',
                left: `${Math.min(marquee.startX, marquee.currentX)}px`,
                top: `${Math.min(marquee.startY, marquee.currentY)}px`,
                width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
                height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
                border: '2px solid #3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
                zIndex: 250
              }} />
            )}

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
        {/* Close mobile scroll container */}
        </div>
        <div style={{ width: `${gridTotalWidth}px`, paddingLeft: `${GRID_BORDER_WIDTH}px` }}>
          <ChordLabels
            barChords={barChords}
            columnWidth={COLUMN_WIDTH}
            gridBorderWidth={GRID_BORDER_WIDTH}
            debug={DEBUG}
          />
        </div>
      </div>
      {renderDragGhost()}
    </div>
  );
}
