# Figma AI Design Prompt - Music Playground (4-Layer DAW)

**For:** ChatGPT + Figma AI
**Project:** music-playground
**Date:** 2025-10-15

---

## Context

Design a web-based music creation app with a cute, playful, pixel-toy aesthetic. The app has 4 integrated layers:

1. **Chord Progression Builder** - Drag-and-drop Roman numeral tiles into grid
2. **Icon Sound Sequencer** - Place melodic/rhythmic icon sounds on timeline
3. **MPC Pad Bank** - Save loops to pads, trigger them live
4. **Sequential Song Timeline** - Arrange loops horizontally to create song structure

**Key Constraint**: This is NOT a traditional step sequencer. It's an icon-based loop builder with chord harmonization.

---

## Design System

### Color Palette

**Background**: Sky blue (#8EE1FF) - bright, cheerful, toy-like

**Chord Function Colors** (from harmonic-sketchpad reference):
- **Tonic** (I, vi): `#4ade80` (green) - home, stable
- **Predominant** (ii, IV): `#60a5fa` (blue) - tension building
- **Dominant** (V, bVII): `#f472b6` (pink) - tension, resolution seeking
- **Special** (sus, dim, +7): `#fbbf24` (yellow) - colorful, unstable

**UI Chrome**:
- Panel backgrounds: `#ffffff` with subtle border
- Active/selected: `#fbbf24` (yellow highlight)
- Inactive/disabled: `#94a3b8` (gray)
- Delete/remove: `#ef4444` (red)

### Typography

- **Headers**: 16px, bold, sans-serif (Inter or similar)
- **Labels**: 14px, medium, sans-serif
- **Chord symbols**: 18px, bold (Roman numerals should be large and clear)
- **Icon names**: 12px, regular

### Icons

**Source**: Streamline Icons - https://home.streamlinehq.com/ (free tier)

**Required Icons** (16 total):
1. **Synth Category** (4):
   - Lead synth (sharp, bright)
   - Pad synth (soft, ambient)
   - Bass synth (low, fat)
   - Pluck synth (percussive, short)

2. **Drum Category** (6):
   - Kick drum
   - Snare drum
   - Hi-hat closed
   - Hi-hat open
   - Crash cymbal
   - Tom drum

3. **Percussion Category** (3):
   - Clap
   - Shaker
   - Cowbell

4. **FX Category** (3):
   - Riser (up arrow)
   - Impact (explosion)
   - Noise burst (static)

**Icon Style**: Simple, outlined, pixel-friendly, 24×24px minimum

---

## View 1: Loop Builder (Primary Workspace)

This is where users create loops by combining chords + icon sounds.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOOP BUILDER                                    [BPM: 120] [4/4]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  CHORD PROGRESSION BUILDER                                           │
│  ┌────────────────────────────────────────┐                         │
│  │ Chord Palette (drag from here)         │                         │
│  │  [I]  [ii] [iii] [IV]  [V]             │                         │
│  │  [vi] [bVII] [sus] [dim] [+7]          │                         │
│  └────────────────────────────────────────┘                         │
│                                                                       │
│  ┌────────────────────────────────────────┐                         │
│  │ Chord Grid (drop chords here)          │                         │
│  │  [  ] [  ] [  ] [  ]                   │  Bar 1-4                │
│  │  [  ] [  ] [  ] [  ]                   │  Bar 5-8                │
│  │  [  ] [  ] [  ] [  ]                   │  Bar 9-12               │
│  │  [  ] [  ] [  ] [  ]                   │  Bar 13-16              │
│  └────────────────────────────────────────┘                         │
│                                                                       │
│  ───────────────────────────────────────────────────────────────    │
│                                                                       │
│  ICON SOUND SEQUENCER                                                │
│  ┌────────────────────────────────────────┐                         │
│  │ Icon Library (click to place)          │                         │
│  │                                         │                         │
│  │  SYNTH:  [🎹] [🎵] [🎸] [🔊]           │                         │
│  │  DRUMS:  [🥁] [🔔] [🎺] [🥁] [💥] [🎵] │                         │
│  │  PERC:   [👏] [🎲] [🔔]                │                         │
│  │  FX:     [⬆️] [💥] [📻]                │                         │
│  └────────────────────────────────────────┘                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Mini Sequencer Grid (16 bars × 4 rows)                       │  │
│  │                                                               │  │
│  │  Row 1: [  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ]... │  │
│  │  Row 2: [  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ]... │  │
│  │  Row 3: [  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ]... │  │
│  │  Row 4: [  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ]... │  │
│  │         Bar 1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [Clear Grid] [Preview Loop ▶️] [Save to Pad 💾]                     │
│                                                                       │
│  ───────────────────────────────────────────────────────────────    │
│                                                                       │
│  MPC PAD BANK (saved loops)                                          │
│  ┌─────┬─────┬─────┬─────┐                                          │
│  │ P1  │ P2  │ P3  │ P4  │  [Loop Name]                             │
│  │ 🟢  │ ⚪  │ ⚪  │ ⚪  │  [4 bars]                                │
│  ├─────┼─────┼─────┼─────┤                                          │
│  │ P5  │ P6  │ P7  │ P8  │                                          │
│  │ ⚪  │ ⚪  │ ⚪  │ ⚪  │                                          │
│  ├─────┼─────┼─────┼─────┤                                          │
│  │ P9  │ P10 │ P11 │ P12 │                                          │
│  │ ⚪  │ ⚪  │ ⚪  │ ⚪  │                                          │
│  ├─────┼─────┼─────┼─────┤                                          │
│  │ P13 │ P14 │ P15 │ P16 │                                          │
│  │ ⚪  │ ⚪  │ ⚪  │ ⚪  │                                          │
│  └─────┴─────┴─────┴─────┘                                          │
│                                                                       │
│  [Load] [Edit] [Delete]                                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Details

**Chord Palette Tile** (draggable):
- Size: 60×60px
- Border: 2px solid
- Background: Chord function color (see color palette)
- Text: Roman numeral (bold, 18px, centered)
- Hover: Scale 1.05, cursor: grab
- Drag: Opacity 0.5, cursor: grabbing

**Chord Grid Cell** (droppable):
- Size: 80×80px
- Border: 2px dashed #94a3b8 (empty), solid when filled
- Background: White (empty), chord function color when filled
- Text: Roman numeral + note name (e.g., "I / C maj7")
- Hover: Border becomes yellow #fbbf24
- Interaction: Click filled cell → inline picker to change chord

**Icon Sound Tile** (clickable):
- Size: 48×48px
- Icon: 24×24px Streamline icon
- Label: Sound name below (12px)
- Border: 2px solid #94a3b8
- Hover: Border yellow, scale 1.1
- Active (selected): Background yellow #fbbf24
- Click: Selects sound, next grid click places it

**Mini Sequencer Grid Cell**:
- Size: 40×40px (16 cols × 4 rows visible)
- Border: 1px solid #e2e8f0
- Background: White (empty), shows icon when filled
- Icon: 20×20px Streamline icon (from selected sound)
- Hover: Border yellow
- Click: Places selected icon sound, right-click removes
- Bar markers: Every 4 cells, thicker border

**MPC Pad**:
- Size: 100×100px
- Border: 3px solid #94a3b8 (empty), colored when filled
- Background: White (empty), loop color when filled
- Text: Pad number (top-left, 12px), loop name + duration (centered)
- Status indicator: Green dot 🟢 if playing
- Hover: Scale 1.05, shadow
- Click: Triggers loop playback

---

## View 2: Song Arrangement (Sequential Timeline)

Switch to this view to arrange loops into a song.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  SONG ARRANGEMENT                            [BPM: 120] [Total: 32b]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  MPC PAD BANK (click to add to timeline)                             │
│  ┌─────┬─────┬─────┬─────┐                                          │
│  │ P1  │ P2  │ P3  │ P4  │                                          │
│  │Intro│Verse│Choru│Build│                                          │
│  │ 4b  │ 8b  │ 8b  │ 4b  │                                          │
│  ├─────┼─────┼─────┼─────┤                                          │
│  │ P5  │ P6  │ P7  │ P8  │                                          │
│  │ ⚪  │ ⚪  │ ⚪  │ ⚪  │                                          │
│  ├─────┼─────┼─────┼─────┤                                          │
│  │ ... │ ... │ ... │ ... │                                          │
│  └─────┴─────┴─────┴─────┘                                          │
│                                                                       │
│  ───────────────────────────────────────────────────────────────    │
│                                                                       │
│  SEQUENTIAL TIMELINE (horizontal, single track)                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  [Intro    ] [Verse      ] [Chorus     ] [Verse      ]      │  │
│  │   4 bars      8 bars        8 bars        8 bars             │  │
│  │                                                               │  │
│  │  0:00    0:08      0:24          0:40          0:56          │  │
│  │  ├────────┼──────────┼────────────┼────────────┤             │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [Clear Timeline] [Play from Start ▶️] [Export MIDI]                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Details

**Timeline Block** (draggable):
- Height: 80px
- Width: Proportional to loop duration (4 bars = 120px, 8 bars = 240px)
- Border: 3px solid, colored by loop
- Background: Loop color with 20% opacity
- Text: Loop name (bold, 14px, top), duration (12px, bottom)
- Corner: Small "×" button to remove
- Hover: Shadow, scale 1.02
- Drag: Reorder position in timeline

---

## Interaction Flows

### Flow 1: Create a Loop

1. User drags **[I]** chord tile from palette → drops into chord grid cell 1
2. Chord cell fills with green background, shows "I / C maj7"
3. User drags **[V]** chord tile → drops into cell 5
4. User clicks **Lead Synth** icon 🎹 from icon library (highlights yellow)
5. User clicks mini sequencer grid at bar 1 → 🎹 icon appears
6. User clicks grid at bar 3 → another 🎹 icon appears
7. User clicks **Kick Drum** icon 🥁 (new selection)
8. User clicks grid bars 1, 2, 3, 4 on row 2 → 🥁 icons appear (steady beat)
9. User clicks **[Preview Loop ▶️]** → audio plays with chord harmonization
10. User clicks **[Save to Pad 💾]** → dialog appears for loop name
11. User types "Intro" → loop saved to Pad 1 with green background

### Flow 2: Arrange a Song

1. User switches to **Song Arrangement** view
2. User clicks **Pad 1 (Intro)** from pad bank
3. Timeline shows: `[Intro | 4 bars]` block appears at position 0
4. User clicks **Pad 2 (Verse)**
5. Timeline extends: `[Intro | 4b] [Verse | 8b]`
6. User clicks **Pad 3 (Chorus)**
7. Timeline: `[Intro | 4b] [Verse | 8b] [Chorus | 8b]`
8. User drags **Verse** block after Chorus → reorders to: `[Intro] [Verse] [Chorus] [Verse]`
9. User clicks **[Play from Start ▶️]** → entire song plays sequentially
10. Total duration shown: "0:56" (32 bars at 120 BPM)

---

## Design Requirements

### Must-Haves

1. **Drag-and-Drop**:
   - Chord tiles from palette → grid cells (visual feedback during drag)
   - Timeline blocks for reordering (smooth animation)

2. **Click-to-Place**:
   - Icon sounds: click icon → then click grid cells (selected icon highlighted)
   - Multiple placements with same icon (don't de-select after placing)

3. **Visual Feedback**:
   - Hover states: borders, shadows, scale transforms
   - Active states: yellow highlight (#fbbf24)
   - Playing indicator: green dot 🟢 on active pad/timeline block

4. **Responsive Grid**:
   - Mini sequencer scrolls horizontally for 16+ bars
   - Chord grid fits within viewport (max 4×4 visible)
   - Timeline scrolls horizontally for long songs

5. **Color Coding**:
   - Chords by harmonic function (green/blue/pink/yellow)
   - Loops by user-selected color (pad background matches timeline block)

### Nice-to-Haves

1. **Keyboard Shortcuts**:
   - Space: Play/pause
   - Delete: Remove selected item
   - Ctrl+Z: Undo last action

2. **Context Menus**:
   - Right-click chord cell → change chord, clear
   - Right-click sequencer cell → remove icon
   - Right-click pad → rename, change color, delete

3. **Animations**:
   - Smooth transitions when switching views (fade in/out)
   - Playback cursor moving across grid/timeline
   - Pads pulse when triggered

---

## Technical Notes for Figma AI

1. **Component System**:
   - Create reusable components for: ChordTile, IconTile, PadButton, TimelineBlock
   - Use Auto Layout for flexible grids
   - Variants for states: empty, filled, hover, active, playing

2. **Color Styles**:
   - Define color variables for chord functions, UI chrome, states
   - Use opacity for hover/active states (don't create separate colors)

3. **Typography Styles**:
   - Header, Body, Label, Caption styles
   - Use consistent font weights (regular, medium, bold)

4. **Spacing System**:
   - Base unit: 8px
   - Padding/margins: 8, 16, 24, 32px
   - Gap between grid cells: 4px

5. **Interactive Components**:
   - Buttons should have hover/active/disabled states
   - Grid cells should have empty/filled/hover states
   - Pads should have empty/filled/playing states

---

## Reference Images

*User provided two screenshots:*
1. danielx.net/composer - Icon-based sound placement UI
2. harmonic-sketchpad Chordboard - Roman numeral chord palette + grid

**Key takeaways from references**:
- Icon sounds should be visually distinct (use Streamline icons, not emoji)
- Chord palette should use Roman numerals (I, ii, iii, IV, V, vi, bVII)
- Grid layout should be clean, not cluttered
- Playback state should be obvious (green indicators)

---

## Deliverables

1. **High-fidelity Figma design** for both views (Loop Builder + Song Arrangement)
2. **Component library** with all reusable UI elements
3. **Color + typography styles** matching design system above
4. **Interactive prototype** showing:
   - Drag chord from palette → grid
   - Click icon → click grid → place sound
   - Click pad → add to timeline
   - Play loop/song animation (cursor moving)

---

## Questions to Resolve with Designer

1. Should icon library be expandable categories (Synth, Drums, Perc, FX) or flat list?
2. How to show which row in mini sequencer corresponds to which icon? (Label rows?)
3. Should timeline show time markers (0:00, 0:08, 0:16) or bar numbers (1, 5, 9, 13)?
4. What happens if user tries to save loop without any sounds? (Disable button? Show warning?)
5. Should there be a "clear all" button for chord grid? (Risky, needs confirmation)

---

**End of Prompt**
