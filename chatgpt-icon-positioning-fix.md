# Icon Positioning and Grid Alignment Problem

## Context
We have a music sequencer React component with:
- A grid showing 16 quarter notes (64 sixteenth notes total)
- Icons that can be dragged and placed on the grid
- Resolution modes: 1/4, 1/8, 1/16 that affect quantization and visual grid lines
- Chord progression labels above the sequencer
- A playhead that moves during playback

## Current Issues
1. **Icons render outside container bounds** - causing visual glitching at edges
2. **Icons not aligning with grid lines** - they should land ON vertical grid lines, not between them
3. **Playhead timing mismatch** - playhead position doesn't match when sounds trigger
4. **Chord row misalignment** - chord labels above don't align with sequencer grid
5. **Drag ghost positioning** - preview during drag doesn't match final landing position

## Technical Constraints
- **COLUMN_WIDTH** = 48px (quarter note width)
- **SIXTEENTH_WIDTH** = 12px (one sixteenth note)
- **Canonical Grid**: All positioning based on 64 sixteenth-note positions (bars 0-63)
- **Resolution Modes**:
  - `1/4`: Quantize to quarter notes (every 4 sixteenths), show quarter lines
  - `1/8`: Quantize to eighth notes (every 2 sixteenths), show eighth lines
  - `1/16`: Quantize to sixteenth notes (every 1 sixteenth), show all sixteenth lines
- **Icon Size**: 40px box, scaled to 0.8 (32px visual)
- **Container**: Fixed dimensions, must use `overflow-hidden` to prevent scroll

## Key Requirements
1. **Icons must land ON vertical grid lines** (at boundaries: 0px, 12px, 24px, 36px...)
2. **Icons must stay within container bounds** (no rendering at negative coordinates)
3. **All elements must use same coordinate system**:
   - Grid background
   - Vertical subdivision lines
   - Placed icons
   - Drag ghost preview
   - Hover overlay
   - Playhead
   - Chord labels above
4. **No visual artifacts** from overflow or clipping
5. **No glitching during drag** at container edges

## Current Code Structure

### Container
```tsx
<div
  ref={sequencerRef}
  className="relative border-2 border-black rounded-xl overflow-hidden"
  style={{
    width: `${COLUMN_WIDTH * TIME_STEPS}px`,  // 768px
    height: `${ROW_HEIGHT * TOTAL_SEMITONES}px`,  // 360px
    userSelect: 'none',
    flexShrink: 0
  }}
>
  {renderGrid()}
  {renderHoverOverlay()}
  {renderPlacements()}  // Icons
  {playhead}
</div>
```

### Icon Positioning (Current - BROKEN)
```tsx
// Icons render at: bar * SIXTEENTH_WIDTH
const targetCenter = p.bar * SIXTEENTH_WIDTH;
// Problem: bar=0 renders at x=0px, but icon is 40px wide with transform translate(-50%, -50%)
// So icon center at 0px means left edge at -20px (outside container!)
```

### Grid Lines (Current)
```tsx
// In 1/16 mode, shows lines at: 0, 12, 24, 36px within each quarter column
// Lines render at sixteenth boundaries
```

### Drag Ghost (Current)
```tsx
const quantizedCenterX = safeSnappedBar * SIXTEENTH_WIDTH;
const ghostX = rect.left + quantizedCenterX;
```

### Playhead (Current)
```tsx
left: `${currentStep * COLUMN_WIDTH}px`
// currentStep is in quarter notes (0-16)
```

### Chord Labels (Current)
```tsx
// Width = columnWidth * stepsPerBar * barChords.length
// Each bar (4 quarter notes) gets one chord color region
```

## Failed Attempts
1. **Tried adding paddingLeft + marginLeft offset** → Icons outside bounds, glitching
2. **Tried absolutely positioned grid wrapper** → Coordinate system mismatch
3. **Tried rendering at centers (bar*12+6)** → Icons between lines, not on lines
4. **Tried rendering at boundaries (bar*12)** → Icons half outside container at bar=0

## What We Need

### The Solution Should:
1. Define ONE consistent coordinate system for all elements
2. Ensure icons at bar=0 have their visual center at a grid line while staying fully visible
3. Keep all visual elements (grid, icons, playhead) in sync
4. Handle the transform: translate(-50%, -50%) offset correctly
5. Prevent any rendering outside container bounds

### Specific Questions:
1. **Should the first grid line be at x=0 or offset inward?**
2. **Should icons center on grid lines, or should grid lines be between icons?**
3. **How to handle the icon's transform offset in positioning calculations?**
4. **Should we add left padding to container to create safe space for first icon?**
5. **How should playhead align - at bar boundaries or bar centers?**

## Expected Behavior
- Icon placed at **bar=0** → renders with center on first visible grid line, fully within container
- Icon placed at **bar=1** → renders with center on second grid line (12px from first)
- Icon placed at **bar=63** → renders with center on last grid line, fully within container
- **Playhead** passes through icon centers exactly when sounds trigger
- **Drag ghost** shows icon at exact landing position during drag
- **No glitching** when dragging near container edges
- **Chord colors** align perfectly with grid columns

## Files to Consider
1. `apps/composer/src/components/IconSequencerWithDensity.tsx` - Main sequencer
2. `apps/composer/src/components/ChordLabels.tsx` - Chord row above sequencer

## Request
Please provide:
1. **Clear positioning strategy** - where should grid lines and icons render?
2. **Complete coordinate formulas** for:
   - Icon positioning: `const targetCenter = ???`
   - Drag ghost: `const quantizedCenterX = ???`
   - Hover overlay: `const hoverLeft = ???`
   - Playhead: `left: ???`
   - Grid lines: where to render them
3. **Container adjustments** needed (padding, wrapper divs, etc.)
4. **Explanation** of the coordinate system and why it works
5. **Edge cases** handled (bar=0, bar=63, different resolution modes)
