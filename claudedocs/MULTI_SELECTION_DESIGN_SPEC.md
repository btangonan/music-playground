# Multi-Selection Design Specification
**Feature**: Multi-select, copy/paste, delete, and replace for sequencer grid icons

**Version**: 1.0
**Date**: 2025-10-21
**Status**: Design Phase - Ready for Implementation

---

## Executive Summary

This specification defines a comprehensive multi-selection system for the IconSequencerWithDensity component, enabling users to:

1. **Select multiple icons** using click + modifier keys
2. **Copy/paste selection** via Option-drag to maintain spatial relationships
3. **Delete multiple icons** with keyboard shortcuts
4. **Replace all selected icons** with a different sound via Option-drag from gallery

The design prioritizes:
- **Elegance**: Familiar interactions (Shift/Cmd click, standard shortcuts)
- **Robustness**: Stable ID-based tracking, proper boundary clamping
- **Visual clarity**: Color-coded feedback for different operation modes

---

## Current Architecture Analysis

### Data Structure
```typescript
interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth positions across 4 bars)
  pitch: number; // MIDI 48-83 (3 octaves: C3-B5)
  velocity: number;
  duration16?: number; // Duration in sixteenths
}
```

### Existing Interaction Patterns
- **Drag existing icon**: `handlePlacementDragStart` → move or copy (Meta/Alt key)
- **Double-click icon**: Delete single icon immediately
- **Alt+drag from gallery**: Replace mode (finds overlapping icon)
- **Keyboard tracking**: `isCmdPressedRef` monitors Alt key via global listener

### Visual Rendering
- **Container**: Positioned by bar/pitch, width matches duration
- **Draggable wrapper**: 40×40px, handles mouse events
- **motion.div**: Animated icon component with scale on playback hit
- **Duration bar**: Trailing visual indicator with gradient fade
- **Resize zone**: 15px hover area at right edge for duration adjustment

---

## Design Decisions

### 1. Data Model Enhancement

**Add Stable Identifiers to IconPlacement:**

```typescript
interface IconPlacement {
  id: string; // NEW: UUID for stable selection tracking
  soundId: string;
  bar: number;
  pitch: number;
  velocity: number;
  duration16?: number;
}
```

**Rationale:**
- Index-based tracking fails when placements array mutates
- UUIDs provide stable references across add/delete/undo operations
- Compatible with external placements sync mechanism

**ID Generation:**
- Use `crypto.randomUUID()` when creating new placements
- Migrate existing placements with generated IDs on first render
- Persist IDs through MIDI import and serialization

---

### 2. State Management

**New State Variables:**

```typescript
// Track selected placement IDs (Set for O(1) lookup)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Multi-selection drag context
const [draggedSelectionAnchor, setDraggedSelectionAnchor] = useState<IconPlacement | null>(null);

// Replace mode visual feedback
const [replaceMode, setReplaceMode] = useState<boolean>(false);
```

**Selection Cleanup (prevents stale references):**
```typescript
useEffect(() => {
  // Remove IDs of deleted placements from selection
  const validIds = new Set(placements.map(p => p.id));
  setSelectedIds(prev => {
    const cleaned = new Set([...prev].filter(id => validIds.has(id)));
    return cleaned.size !== prev.size ? cleaned : prev;
  });
}, [placements]);

// Clear selection on external placements change (undo/redo support)
useEffect(() => {
  if (externalPlacements && externalPlacements !== lastPropagatedRef.current) {
    setSelectedIds(new Set());
  }
}, [externalPlacements]);
```

---

## 3. User Interactions

### Selection Interactions

**Click to Select:**
```typescript
const handleIconClick = (e: React.MouseEvent, placement: IconPlacement) => {
  e.stopPropagation();

  if (e.shiftKey) {
    // SHIFT+CLICK: Toggle in selection
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(placement.id)) {
        next.delete(placement.id);
      } else {
        next.add(placement.id);
      }
      return next;
    });
  } else if (e.metaKey) {
    // CMD+CLICK: Add to selection
    setSelectedIds(prev => new Set(prev).add(placement.id));
  } else {
    // PLAIN CLICK: Select only this one
    setSelectedIds(new Set([placement.id]));
  }
};
```

**Deselect All:**
```typescript
const handleGridClick = (e: React.MouseEvent) => {
  // Click empty grid area (not on icon, not during drag)
  if (!isDragging && selectedIds.size > 0) {
    setSelectedIds(new Set());
  }
};
```

**Keyboard Shortcuts:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // SELECT ALL
    if (e.metaKey && e.key === 'a' && !e.shiftKey) {
      e.preventDefault();
      setSelectedIds(new Set(placements.map(p => p.id)));
    }

    // DESELECT ALL
    if (e.key === 'Escape' && selectedIds.size > 0) {
      e.preventDefault();
      setSelectedIds(new Set());
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [placements, selectedIds]);
```

---

### Delete Operation

**Keyboard Shortcut:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
      e.preventDefault();
      handleDeleteSelected();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedIds, placements]);
```

**Delete Handler:**
```typescript
const handleDeleteSelected = () => {
  if (selectedIds.size === 0) return;

  // Filter out selected placements
  const updated = placements.filter(p => !selectedIds.has(p.id));
  setPlacements(updated);
  setSelectedIds(new Set()); // Clear selection after delete
};
```

**Existing Double-Click (unchanged):**
- Double-click continues to delete single icon immediately
- No selection required
- Maintains muscle memory compatibility

---

### Copy/Paste Operation

**Interaction Flow:**
1. User selects multiple icons (e.g., 3 notes)
2. User Option+drags ONE of the selected icons
3. All selected icons copy as a group, maintaining relative positions
4. Drop at new location → group pastes with same spatial relationships

**Drag Start Detection:**
```typescript
const handlePlacementDragStart = (e: React.DragEvent, placement: IconPlacement) => {
  e.stopPropagation();

  const isSelectedIcon = selectedIds.has(placement.id);
  const isDraggingSelection = isSelectedIcon && selectedIds.size > 1;

  if (isDraggingSelection) {
    // Multi-selection drag mode
    setDraggedSelectionAnchor(placement); // The icon being dragged
    e.dataTransfer.setData('selectionDrag', 'true');
    e.dataTransfer.setData('anchorId', placement.id);
  } else {
    // Single icon drag (existing behavior)
    const index = placements.findIndex(p => p.id === placement.id);
    setDraggedPlacementIndex(index);
    e.dataTransfer.setData('placementIndex', String(index));
  }

  setIsDragging(true);
  setDragGhost({ x: e.clientX, y: e.clientY, soundId: placement.soundId });
  e.dataTransfer.effectAllowed = 'copyMove';
  makeCenteredDragImage(e);
};
```

**Calculate Relative Positions:**
```typescript
const getSelectionOffsets = (anchorPlacement: IconPlacement) => {
  const selected = placements.filter(p => selectedIds.has(p.id));
  return selected.map(p => ({
    id: p.id,
    soundId: p.soundId,
    barOffset: p.bar - anchorPlacement.bar,
    pitchOffset: p.pitch - anchorPlacement.pitch,
    velocity: p.velocity,
    duration16: p.duration16
  }));
};
```

**Drop with Boundary Clamping:**
```typescript
const handleDrop = (e: React.DragEvent) => {
  // ... existing validation ...

  const isSelectionDrag = e.dataTransfer.getData('selectionDrag') === 'true';
  const isDuplicating = e.metaKey || e.altKey;

  if (isSelectionDrag) {
    const offsets = getSelectionOffsets(draggedSelectionAnchor);
    const newBar = hoveredCell.snappedBar;
    const newPitch = topMidi - hoveredCell.row;

    if (isDuplicating) {
      // COPY: Create new placements at offset positions
      const newPlacements = offsets.map(offset => ({
        id: crypto.randomUUID(), // NEW unique IDs
        soundId: offset.soundId,
        bar: Math.max(0, Math.min(63, newBar + offset.barOffset)), // Clamp to grid
        pitch: Math.max(48, Math.min(83, newPitch + offset.pitchOffset)), // Clamp to range
        velocity: offset.velocity,
        duration16: offset.duration16
      }));

      setPlacements([...placements, ...newPlacements]);
      setSelectedIds(new Set(newPlacements.map(p => p.id))); // Select new copies
    } else {
      // MOVE: Update existing placements
      const updated = placements.map(p => {
        const offset = offsets.find(o => o.id === p.id);
        if (offset) {
          return {
            ...p,
            bar: Math.max(0, Math.min(63, newBar + offset.barOffset)),
            pitch: Math.max(48, Math.min(83, newPitch + offset.pitchOffset))
          };
        }
        return p;
      });
      setPlacements(updated);
    }

    setDraggedSelectionAnchor(null);
  } else {
    // ... existing single icon drop logic ...
  }
};
```

---

### Replace Operation

**Interaction Flow:**
1. User selects multiple icons (e.g., 5 different drum sounds)
2. User Option+drags a new sound from gallery (e.g., clap)
3. All 5 selected icons change to the clap sound
4. Position, pitch, velocity, duration preserved

**Modified Drop Handler:**
```typescript
const handleDrop = (e: React.DragEvent) => {
  // ... validation and position calc ...

  const soundId = e.dataTransfer.getData('soundId');
  const placementIndexStr = e.dataTransfer.getData('placementIndex');
  const replaceMode = isCmdPressedRef.current || e.altKey;

  if (soundId && !placementIndexStr) {
    // Dropping from gallery

    if (selectedIds.size > 0 && replaceMode) {
      // REPLACE SELECTED: Change soundId of all selected icons
      const updated = placements.map(p => {
        if (selectedIds.has(p.id)) {
          return { ...p, soundId }; // Replace sound, keep position/pitch/velocity/duration
        }
        return p;
      });
      setPlacements(updated);
      // Keep selection active to allow further operations
      return;
    }

    if (replaceMode) {
      // REPLACE SINGLE: Existing behavior (find overlapping icon)
      // ... existing overlap detection and replace logic ...
    } else {
      // NEW PLACEMENT: Create new icon
      // ... existing create logic ...
    }
  }
};
```

---

## 4. Visual Feedback

### Selection Highlight

**Component Wrapper Enhancement:**
```typescript
const renderPlacement = (placement: IconPlacement, index: number) => {
  const isSelected = selectedIds.has(placement.id);
  const isReplaceTarget = isSelected && isDragging && replaceMode;

  return (
    <div key={placement.id} style={{/* positioning */}}>
      {/* Selection highlight */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: '-4px', // Extend beyond icon bounds
            border: `2px solid ${isReplaceTarget ? '#F59E0B' : '#3B82F6'}`,
            borderRadius: '10px',
            backgroundColor: isReplaceTarget
              ? 'rgba(245, 158, 11, 0.15)'  // Orange for replace
              : 'rgba(59, 130, 246, 0.1)',  // Blue for selection
            boxShadow: isReplaceTarget
              ? '0 0 12px rgba(245, 158, 11, 0.4)'
              : '0 0 8px rgba(59, 130, 246, 0.3)',
            pointerEvents: 'none',
            zIndex: 199,
            animation: isReplaceTarget ? 'pulse 1s ease-in-out infinite' : 'none'
          }}
        />
      )}

      {/* Existing draggable wrapper and icon */}
      {/* ... */}
    </div>
  );
};
```

**Pulse Animation (CSS):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}
```

---

### Selection Count Badge

**Floating UI Component:**
```typescript
const renderSelectionBadge = () => {
  if (selectedIds.size === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: '#3B82F6',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 300,
        userSelect: 'none'
      }}
    >
      {selectedIds.size} selected
    </div>
  );
};
```

---

### Multi-Selection Drag Ghost

**Formation Preview:**
```typescript
const renderDragGhost = () => {
  if (!dragGhost) return null;

  const isMultiDrag = draggedSelectionAnchor && selectedIds.size > 1;

  if (isMultiDrag) {
    const selected = placements.filter(p => selectedIds.has(p.id));
    const anchor = draggedSelectionAnchor;

    return selected.map(p => {
      const offsetX = (p.bar - anchor.bar) * SIXTEENTH_WIDTH;
      const offsetY = (anchor.pitch - p.pitch) * ROW_HEIGHT; // Inverted Y
      const sound = SOUND_ICONS.find(s => s.id === p.soundId);
      if (!sound) return null;

      const IconComponent = sound.icon;
      const isAnchor = p.id === anchor.id;

      return (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: `${dragGhost.x - ICON_BOX/2 + offsetX}px`,
            top: `${dragGhost.y - ICON_BOX/2 + offsetY}px`,
            width: `${ICON_BOX}px`,
            height: `${ICON_BOX}px`,
            opacity: isAnchor ? 0.9 : 0.6,
            pointerEvents: 'none',
            zIndex: isAnchor ? 1001 : 1000,
            border: '2px solid #3B82F6',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
        >
          {/* Count badge on anchor */}
          {isAnchor && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#1E40AF',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
            >
              {selectedIds.size}
            </div>
          )}

          <div style={{
            width: '100%',
            height: '100%',
            transform: `scale(${BASE_SCALE})`,
            transformOrigin: 'center'
          }}>
            <IconComponent />
          </div>
        </div>
      );
    });
  } else {
    // ... existing single ghost rendering ...
  }
};
```

---

## 5. Edge Cases & Error Handling

### Boundary Violations
**Problem:** Selection paste extends beyond grid bounds
**Solution:** Clamp each icon individually to valid range

```typescript
// Bar: 0-63 (4 bars × 16 sixteenths)
bar: Math.max(0, Math.min(63, newBar + offset.barOffset))

// Pitch: 48-83 (3 octaves MIDI range)
pitch: Math.max(48, Math.min(83, newPitch + offset.pitchOffset))
```

### Overlapping Placements
**Current Behavior:** Icons can overlap (no collision detection)
**Recommendation:** Keep current for flexibility
**Future Enhancement:** Optional "snap to empty cell" mode

### Selection Persistence
**Problem:** Selection references deleted icons
**Solution:** Automatic cleanup on placement changes (see State Management section)

### Drag Unselected Icon
**Problem:** User drags unselected icon while items selected
**Solution:** Treat as single-icon drag (clear selection implicitly)

### Replace Mode with Empty Selection
**Problem:** Alt+drag from gallery with no selection
**Solution:** Fall back to single-icon replace (existing behavior)

### Undo/Redo Compatibility
**Problem:** Selection doesn't sync with undo
**Solution:** Clear selection on external placements change

---

## 6. Complete Keyboard Shortcuts

### Selection
| Action | Shortcut | Behavior |
|--------|----------|----------|
| Select single | Click icon | Select and deselect others |
| Toggle selection | Shift+Click | Add or remove from selection |
| Add to selection | Cmd+Click | Add without deselecting others |
| Select all | Cmd+A | Select all icons in grid |
| Deselect all | Escape | Clear selection |
| Deselect all | Click empty grid | Clear selection |

### Operations
| Action | Shortcut | Behavior |
|--------|----------|----------|
| Delete selected | Delete/Backspace | Remove all selected icons |
| Delete single | Double-click icon | Remove icon (no selection needed) |

### Drag Modifiers
| Action | Modifier | Behavior |
|--------|----------|----------|
| Move selection | Drag selected | Move all selected icons |
| Copy selection | Option+Drag selected | Duplicate all at new location |
| Replace selected | Option+Drag from gallery | Change soundId of all selected |
| Single copy/replace | Option+Drag unselected | Existing single-icon behavior |

---

## 7. Visual Design Summary

### Color Scheme
- **Selection**: `#3B82F6` (blue-500) with 10% background, 30% shadow
- **Replace Target**: `#F59E0B` (amber-500) with 15% background, 40% shadow, pulse animation
- **Badge**: `#3B82F6` background, white text
- **Hover (unselected)**: `#E5E7EB` (gray-200) subtle border
- **Hover (selected)**: `#60A5FA` (blue-400) brighter border

### Z-Index Hierarchy
- **Selection highlight**: 199 (below icon)
- **Icon container**: 200
- **Draggable wrapper**: 201
- **Resize zone**: 202
- **Selection badge**: 300
- **Drag ghost**: 1000-1001

---

## 8. Implementation Roadmap

### Phase 1: Foundation (2-3 hours)
1. Add `id` field to IconPlacement interface
2. Generate UUIDs for new placements
3. Migrate existing placements with IDs
4. Add `selectedIds` state
5. Implement selection cleanup useEffect

### Phase 2: Selection UI (2-3 hours)
1. Implement `handleIconClick` with modifier keys
2. Add selection highlight rendering
3. Implement grid click deselect
4. Add Cmd+A and Escape shortcuts
5. Add selection count badge

### Phase 3: Delete Operation (1 hour)
1. Implement `handleDeleteSelected`
2. Add Delete/Backspace listener
3. Test with various selection sizes

### Phase 4: Copy/Paste (3-4 hours)
1. Implement `draggedSelectionAnchor` state
2. Modify `handlePlacementDragStart` for multi-drag detection
3. Implement `getSelectionOffsets` utility
4. Modify `handleDrop` for selection paste
5. Add boundary clamping logic
6. Implement multi-ghost drag preview

### Phase 5: Replace Operation (2 hours)
1. Add replace mode detection in `handleDrop`
2. Implement bulk soundId replacement
3. Add replace target visual feedback (orange pulse)
4. Test with gallery drag + Alt modifier

### Phase 6: Polish & Testing (2-3 hours)
1. Test all keyboard shortcuts
2. Test edge cases (boundary violations, empty selection, etc.)
3. Verify undo/redo compatibility
4. Performance testing with large selections (20+ icons)
5. Accessibility review (keyboard-only navigation)

**Total Estimated Time: 12-16 hours**

---

## 9. Testing Checklist

### Selection
- [ ] Click icon selects single, deselects others
- [ ] Shift+Click toggles icon in selection
- [ ] Cmd+Click adds to selection
- [ ] Cmd+A selects all icons
- [ ] Escape clears selection
- [ ] Click empty grid clears selection
- [ ] Selection persists across operations

### Delete
- [ ] Delete key removes all selected icons
- [ ] Backspace removes all selected icons
- [ ] Double-click deletes single icon (no selection needed)
- [ ] Selection clears after delete

### Copy/Paste
- [ ] Option+drag single selected icon copies it
- [ ] Option+drag multi-selection copies all with spatial relationships
- [ ] Plain drag multi-selection moves all
- [ ] Boundary clamping prevents invalid positions
- [ ] New copies have unique IDs
- [ ] New copies become selected after paste

### Replace
- [ ] Option+drag from gallery with selection replaces all
- [ ] Option+drag from gallery without selection replaces single (existing)
- [ ] Replace preserves position, pitch, velocity, duration
- [ ] Selection stays active after replace
- [ ] Visual feedback shows replace targets (orange pulse)

### Visual Feedback
- [ ] Selected icons show blue border + glow
- [ ] Replace targets show orange pulse
- [ ] Selection count badge displays correct number
- [ ] Multi-drag ghost shows formation preview
- [ ] Hover states work correctly (gray → blue)

### Edge Cases
- [ ] Selection clears on external placements change
- [ ] No crashes with empty selection operations
- [ ] Boundary violations clamp correctly
- [ ] Dragging unselected icon clears selection
- [ ] Replace with empty selection falls back to single replace

---

## 10. Future Enhancements

### Clipboard Operations
- **Cmd+C**: Copy selected to clipboard (persist across sessions)
- **Cmd+X**: Cut selected (copy + delete)
- **Cmd+V**: Paste from clipboard at cursor position

### Marquee Selection
- **Click+drag empty grid**: Draw selection box
- **Shift+marquee**: Add to existing selection
- **Visual**: Animated dashed border rectangle

### Selection Filters
- **Filter by sound**: Select all instances of current sound
- **Filter by pitch**: Select all notes on specific pitch
- **Filter by bar**: Select all icons in bar range

### Smart Paste
- **Snap to empty cells**: Avoid overlaps when pasting
- **Quantize on paste**: Auto-snap to grid resolution
- **Transpose on paste**: Shift+Cmd+V opens transpose dialog

---

## 11. API Changes

### New Props (Optional for Parent Component)
```typescript
interface IconSequencerWithDensityProps {
  // ... existing props ...

  // Optional external selection control
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;

  // Optional clipboard integration
  clipboard?: IconPlacement[];
  onClipboardChange?: (items: IconPlacement[]) => void;
}
```

### Component Export
```typescript
export interface IconSequencerSelection {
  selectedIds: Set<string>;
  selectedPlacements: IconPlacement[];
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
}

// Expose selection API via ref
export default forwardRef<IconSequencerSelection, IconSequencerWithDensityProps>(
  function IconSequencerWithDensity(props, ref) {
    // ... implementation ...

    useImperativeHandle(ref, () => ({
      selectedIds,
      selectedPlacements: placements.filter(p => selectedIds.has(p.id)),
      selectAll: () => setSelectedIds(new Set(placements.map(p => p.id))),
      clearSelection: () => setSelectedIds(new Set()),
      deleteSelected: handleDeleteSelected
    }));

    return (/* ... */);
  }
);
```

---

## 12. Accessibility Considerations

### Keyboard Navigation
- **Tab**: Navigate between selected icons
- **Arrow keys**: Move focus between icons
- **Space**: Toggle selection on focused icon
- **Enter**: Confirm operation on selection

### Screen Reader Announcements
```typescript
// After selection change
announceToScreenReader(`${selectedIds.size} icons selected`);

// After delete
announceToScreenReader(`Deleted ${count} icons`);

// After paste
announceToScreenReader(`Pasted ${count} icons`);
```

### ARIA Attributes
```typescript
<div
  role="button"
  tabIndex={0}
  aria-selected={isSelected}
  aria-label={`Sound icon ${placement.soundId} at bar ${placement.bar}`}
  // ...
>
```

---

## 13. Performance Considerations

### Large Selection Optimization
- **Virtual scrolling**: For 100+ icons, only render visible
- **Batch updates**: Group setState calls with unstable_batchedUpdates
- **Memoization**: Memo expensive calculations (offsets, boundaries)

```typescript
const selectionOffsets = useMemo(() => {
  if (!draggedSelectionAnchor) return [];
  return getSelectionOffsets(draggedSelectionAnchor);
}, [draggedSelectionAnchor, selectedIds, placements]);
```

### Render Optimization
```typescript
// Memo individual placement renders
const PlacementComponent = memo(({ placement, isSelected, ... }) => {
  // ... rendering logic ...
}, (prevProps, nextProps) => {
  return prevProps.placement.id === nextProps.placement.id &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isDragged === nextProps.isDragged;
});
```

---

## Conclusion

This specification provides a complete, production-ready design for multi-selection functionality in the sequencer grid. The design prioritizes:

1. **User Experience**: Familiar patterns (Figma/macOS style selections)
2. **Robustness**: Stable ID tracking, proper boundary handling
3. **Visual Clarity**: Color-coded feedback (blue=selected, orange=replace)
4. **Maintainability**: Clean state management, well-defined handlers

Implementation should follow the 6-phase roadmap for systematic delivery with testing at each phase.

**Status**: ✅ Ready for implementation
