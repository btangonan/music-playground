# Music Playground - Product Specification

**Version**: 2.0 (Complete Redesign)
**Last Updated**: 2025-10-16
**Status**: Architecture Approved, Ready for Implementation

---

## Executive Summary

Music Playground is a **loop-based DAW** that combines chord progression building, icon-based sound sequencing, and MPC-style pad triggering into a sequential song arrangement workflow.

**Key Innovation**: Users build harmonically-aware loops by first laying down chord progressions, then adding melodic/rhythmic icon sounds that automatically follow the harmony.

---

## Product Vision

**Target Users**: Non-musicians and casual creators who want to make music without theory knowledge

**Core Experience**:
1. Build chord progression (harmonic foundation)
2. Add cute icon sounds (melody + rhythm)
3. Save to MPC pad (loop launcher)
4. Arrange pads sequentially to compose songs

**Inspiration**:
- **Harmonic-sketchpad** (existing app) - Chordboard chord builder
- **DanielX Composer** - Icon-based sound placement
- **Akai MPC** - Pad-based loop triggering
- **Ableton Session View** - Loop launching workflow

---

## Core Architecture

### **Layer 1: Chord Progression Builder**

**Purpose**: Create harmonic foundation for loop

**Components**:
- **Chord Palette**: 10 chord functions
  - `I` (tonic, green)
  - `ii` (subdominant, cream)
  - `iii` (mediant, cream)
  - `IV` (subdominant, cream)
  - `V` (dominant, pink)
  - `vi` (submediant, cream)
  - `bVII` (subtonic, purple)
  - `sus` (suspended, purple)
  - `dim` (diminished, purple)
  - `+7` (augmented 7th, purple)

- **Chord Grid**: 4×4 grid (16 bars)
  - Drag chord from palette to grid slot
  - Click to edit chord (inline picker for root + quality)
  - Color-coded by harmonic function

- **Preset System**: Pre-defined progressions
  - Pop: I-V-vi-IV
  - Sad: vi-IV-I-V
  - Chill: I-iii-vi-IV
  - Shoegaze: bVII-IV-I-V
  - Experimental: Custom complex progressions

**Technical Foundation**: Port from `/Users/bradleytangonan/Desktop/my apps/harmonic-sketchpad`

---

### **Layer 2: Icon Sound Sequencer**

**Purpose**: Add melodic/rhythmic content on top of chord progression

**Icon Sound Library**:
- **Total**: 16 sounds (MVP)
- **Format**: Tone.js synthesized (programmatic)
- **Categories**:
  - **Synths** (4): Lead, Pad, Pluck, Arp
  - **Drums** (4): Kick, Snare, Hi-hat, Clap
  - **Bass** (2): Sub, Wobble
  - **FX** (6): Riser, Impact, Sweep, Glitch, Vocal Chop, Noise

**Sound Properties**:
- Each sound has **icon** (Streamline free set or custom)
- **Type**: melodic (follows chords) or rhythmic (fixed pitch)
- **Tunable**: User can adjust with engine effects later (defer to post-MVP)

**Mini Sequencer**:
- **Grid**: 4 rows × 8/16 steps (matches loop length)
- **Interaction**:
  - Drag icon from library onto grid cell
  - Click cell to remove sound
  - Melodic sounds auto-harmonize to chord progression
  - Rhythmic sounds (drums/FX) ignore chords

**Chord Following Behavior**:
```typescript
// Example: User places "Lead" sound on steps 1, 5, 9, 13
// Chord progression: C maj → G maj → Am → F maj
// Engine automatically transposes lead to match chords:
// Bar 1 (C): plays C4
// Bar 2 (G): plays G4 (transposed up 7 semitones)
// Bar 3 (Am): plays A4 (transposed up 9 semitones)
// Bar 4 (F): plays F4 (transposed up 5 semitones)
```

---

### **Layer 3: MPC Pad Bank**

**Purpose**: Store loops and trigger them for song arrangement

**Pad Grid**: 4×4 (16 pads total)

**Pad States**:
- **Empty**: Gray, no content, shows pad number
- **Filled**: Shows loop preview (miniature icon pattern or waveform)
- **Playing**: Pulsing border, highlighted
- **Hover**: Ring effect

**Loop Save Flow**:
1. User builds loop in Layers 1 + 2
2. Clicks "Save to Pad" button
3. Selects empty pad slot (1-16)
4. Loop data (chord progression + icon sequence) saved to pad
5. Pad shows visual preview

**Loop Data Structure**:
```typescript
interface Loop {
  id: string
  name: string  // auto: "Loop 1", "Loop 2", user can rename
  length: 1 | 2 | 4 | 8  // bars, user-selectable
  chordProgression: ChordCell[]  // 4×4 grid state
  iconSequence: IconStep[]  // which icons on which steps
  timestamp: number
}

interface ChordCell {
  bar: number  // 0-15
  chord: string  // "C maj7", "D min7", etc.
  roman: string  // "I", "ii", etc.
}

interface IconStep {
  step: number  // 0-15 (or 0-31 for 8-bar loop)
  soundId: string  // references IconSound
  note?: string  // for melodic sounds (auto-calculated from chord)
  velocity: number  // 0-1
}
```

**Pad Interaction**:
- **Click**: Trigger loop playback (for preview)
- **Right-click**: Options (rename, duplicate, delete, export)
- **Drag to timeline**: Add loop to song sequence

---

### **Layer 4: Sequential Song Timeline**

**Purpose**: Arrange loops in order to create full song structure

**Layout**: Horizontal, single track

**Visual Design**:
```
Timeline (BPM: 120)
┌─────────────────────────────────────────────────────────────────┐
│ [Intro] [Verse] [Chorus] [Verse] [Bridge] [Chorus] [Outro]     │
│    4b      8b      8b       8b       4b       8b       4b        │
└─────────────────────────────────────────────────────────────────┘
  0        4        12       20       28       32       40       44
```

**Loop Blocks**:
- Each block represents one loop instance
- Shows loop name and duration (bars)
- Color matches pad color
- Playhead sweeps left-to-right

**Interactions**:
- **Add Loop**: Click pad → loop added at playhead position
- **Move Loop**: Drag block horizontally to reorder
- **Duplicate**: Alt+drag to duplicate loop
- **Delete**: Click X on block or press Delete key
- **Resize**: Not supported (loop length fixed when created)

**Playback**:
- Play button starts from playhead
- Loops play sequentially with no gap
- Transport controls: Play, Stop, Loop section
- Export: Bounce entire timeline to audio file (post-MVP)

---

## User Flows

### **Flow 1: Create First Loop**

1. User opens app (empty state)
2. **Layer 1**: Drags chords from palette to 4×4 grid
   - Or selects preset (e.g., "Pop": I-V-vi-IV)
3. **Layer 2**: Drags icon sounds from library onto sequencer
   - Lead synth on beats 1, 5, 9, 13
   - Kick drum on beats 1, 5, 9, 13
   - Snare on beats 5, 13
4. Clicks "Preview Loop" to hear it
5. Adjusts sounds/chords if needed
6. Clicks "Save to Pad"
7. Selects empty pad slot (e.g., Pad 1)
8. Pad 1 now shows loop preview

### **Flow 2: Build Song from Loops**

1. User has 4 loops saved to pads (Intro, Verse, Chorus, Bridge)
2. Switches to "Song View" (timeline visible)
3. Clicks Pad 1 (Intro) → added to timeline at position 0
4. Clicks Pad 2 (Verse) → added after Intro
5. Clicks Pad 3 (Chorus) → added after Verse
6. Clicks Pad 2 again → Verse repeats
7. Drags Chorus block to reorder
8. Clicks "Play Song" to hear full arrangement
9. Clicks "Export" to save as audio (post-MVP)

### **Flow 3: Edit Existing Loop**

1. User right-clicks filled pad
2. Selects "Edit Loop"
3. Returns to Loop Builder with loop loaded
4. Makes changes to chords or sounds
5. Clicks "Update Pad"
6. All timeline instances of that loop update automatically

---

## Technical Architecture

### **Frontend Stack**
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS (cute pixel-toy aesthetic)
- **State**: React Context or Zustand for loop/song state
- **Audio**: Tone.js v14 (existing engine)
- **UI Components**: Custom (no Shadcn to avoid @music/ui conflicts)

### **Audio Engine Integration**

**Existing Engine Capabilities** (from packages/engine):
- `makeInstrument()` - create synths/drums
- `makeEffect()` - reverb, delay, filter, etc.
- `setMacro()` - control effect params
- `Bus` - mixing architecture
- Transport scheduling

**New Engine Requirements**:
```typescript
// Loop playback system
interface LoopPlayer {
  loadLoop(loop: Loop): void
  play(): void
  stop(): void
  onLoopEnd(callback: () => void): void
}

// Chord-aware note scheduling
interface ChordHarmonizer {
  transposeToChord(baseNote: string, chord: string): string[]
  schedulePattern(pattern: IconStep[], chords: ChordCell[]): void
}

// Song timeline player
interface SongPlayer {
  loadTimeline(loops: Loop[]): void
  play(): void
  stop(): void
  seek(bar: number): void
  getCurrentBar(): number
}
```

**Tone.js Implementation**:
```typescript
// Chord harmonizer uses Tone.js Part for scheduling
const part = new Tone.Part((time, value) => {
  const { note, soundId, velocity } = value
  const chord = getCurrentChord(time)
  const harmonizedNote = transposeToChord(note, chord)
  instruments[soundId].triggerAttackRelease(harmonizedNote, '8n', time, velocity)
}, iconSteps)

// Sequential song playback uses Tone.Transport
Tone.Transport.scheduleRepeat((time) => {
  const currentLoop = getLoopAtTime(time)
  playLoop(currentLoop, time)
}, loopDuration)
```

---

## Data Model

### **Complete Schema**

```typescript
// Icon Sound - library entry
interface IconSound {
  id: string  // "synth-lead", "drum-kick", etc.
  name: string
  icon: string  // Streamline icon name or emoji
  category: 'synth' | 'drum' | 'bass' | 'fx'
  type: 'melodic' | 'rhythmic'
  toneConfig: {
    synthType: 'PolySynth' | 'MonoSynth' | 'FMSynth' | 'AMSynth' | 'Players'
    options: object  // Tone.js synth options
  }
}

// Chord Cell - single bar in progression
interface ChordCell {
  bar: number  // 0-15
  chord: string  // "C maj7"
  roman: string  // "I"
  root: string  // "C"
  quality: string  // "maj7"
}

// Icon Step - sound placement in sequencer
interface IconStep {
  step: number  // 0-31 (max for 8-bar loop)
  soundId: string
  velocity: number  // 0-1
  note?: string  // for melodic sounds (user doesn't set, auto-calculated)
}

// Loop - saved pad content
interface Loop {
  id: string
  name: string
  length: 1 | 2 | 4 | 8  // bars
  chordProgression: ChordCell[]
  iconSequence: IconStep[]
  createdAt: number
  updatedAt: number
  color: string  // for visual coding
}

// Pad - pad bank slot
interface Pad {
  number: number  // 0-15
  loop: Loop | null
}

// Timeline Block - loop instance in song
interface TimelineBlock {
  id: string
  loopId: string  // references Loop
  startBar: number  // position in timeline
  duration: number  // loop.length (bars)
}

// Song - complete arrangement
interface Song {
  id: string
  name: string
  bpm: number
  timeSignature: '4/4' | '3/4'
  timeline: TimelineBlock[]
  totalBars: number  // computed from timeline
  createdAt: number
  updatedAt: number
}
```

---

## UI Design Specification

### **Design System: Cute Pixel Toy**

**Colors** (Light mode only):
```
Sky: #8EE1FF (background)
Paper: #FFFFFF (surfaces)
Ink Solid: #111111 (text)
Ink Muted: rgba(0,0,0,0.55) (secondary text)

Tile Default: #FFFFFF (cards/buttons)
Tile Border: rgba(0,0,0,0.10) (borders)
Tile Active: #111111 (active state background)
Tile Active Text: #FFFFFF (text on active)

Ring Soft: rgba(0,0,0,0.18) (focus rings)

Accents:
- Star: #FFD11A (yellow)
- Pink: #FF62C6 (magenta)
- Lime: #CCFF00 (bright green)
- Cobalt: #3B82F6 (blue)
```

**Typography**:
- Font: Inter (geometric sans)
- Title: 18px/24px semibold
- Body: 14px/20px regular
- Label: 12px/16px medium

**Spacing**:
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px

**Border Radius**:
- sm: 8px, md: 12px, lg: 16px, xl: 20px, full: 999px

**Motion**:
- Fast: 120ms ease
- Normal: 180ms ease
- Keyframes: wiggle, pop, breath, comet

---

### **View Layouts**

#### **View 1: Loop Builder** (Primary workspace)

```
┌─────────────────────────────────────────────────────────────────┐
│ [▶ Preview Loop] [💾 Save to Pad] [⚙️ Settings]   BPM: 120      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CHORD PALETTE          CHORD GRID (4×4)                         │
│  ┌───┬───┐              ┌────┬────┬────┬────┐                   │
│  │ I │ii │              │ I  │ V  │vi  │IV  │                   │
│  ├───┼───┤              ├────┼────┼────┼────┤                   │
│  │iii│IV │              │ I  │ V  │vi  │IV  │                   │
│  ├───┼───┤              ├────┼────┼────┼────┤                   │
│  │ V │vi │              │bVII│ IV │ I  │ V  │                   │
│  ├───┼───┤              ├────┼────┼────┼────┤                   │
│  │bVII│sus│              │ I  │ V  │vi  │IV  │                   │
│  ├───┼───┤              └────┴────┴────┴────┘                   │
│  │dim│+7 │              Preset: [Pop ▾]                          │
│  └───┴───┘                                                       │
│                                                                   │
│  ICON SOUND LIBRARY                                              │
│  Synths: [🎹] [🎛️] [⚡] [🌊]                                     │
│  Drums:  [🥁] [👏] [🎵] [💥]                                     │
│  Bass:   [🔊] [📻]                                               │
│  FX:     [✨] [💫] [🌀] [⚙️] [🎤] [📡]                            │
│                                                                   │
│  SEQUENCER (4×16 grid)                                           │
│  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16                │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐              │
│  │🎹│  │  │  │🎹│  │  │  │🎹│  │  │  │🎹│  │  │  │ Lead         │
│  ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤              │
│  │🥁│  │  │  │🥁│  │  │  │🥁│  │  │  │🥁│  │  │  │ Kick         │
│  ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤              │
│  │  │  │  │  │👏│  │  │  │  │  │  │  │👏│  │  │  │ Snare        │
│  ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤              │
│  │🔊│  │🔊│  │🔊│  │🔊│  │🔊│  │🔊│  │🔊│  │🔊│  │ Bass         │
│  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘              │
│                                                                   │
│  Loop Length: [4 bars ▾]                                         │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  MPC PAD BANK (4×4 grid, bottom of screen)                       │
│  ┌────┬────┬────┬────┐                                           │
│  │ 1  │ 2  │ 3  │ 4  │                                           │
│  ├────┼────┼────┼────┤                                           │
│  │ 5  │ 6  │ 7  │ 8  │                                           │
│  ├────┼────┼────┼────┤                                           │
│  │ 9  │ 10 │ 11 │ 12 │                                           │
│  ├────┼────┼────┼────┤                                           │
│  │ 13 │ 14 │ 15 │ 16 │                                           │
│  └────┴────┴────┴────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### **View 2: Song Arrangement** (Timeline view)

```
┌─────────────────────────────────────────────────────────────────┐
│ [◀ Back to Builder] [▶ Play Song] [⏹ Stop] [💾 Export]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  MPC PAD BANK (Click pad to add loop to timeline)               │
│  ┌────────┬────────┬────────┬────────┐                          │
│  │ Intro  │ Verse  │ Chorus │ Bridge │                          │
│  │   4b   │   8b   │   8b   │   4b   │                          │
│  ├────────┼────────┼────────┼────────┤                          │
│  │   5    │   6    │   7    │   8    │                          │
│  │  (empty)                                                      │
│  ├────────┼────────┼────────┼────────┤                          │
│  │   9    │   10   │   11   │   12   │                          │
│  │  (empty)                                                      │
│  ├────────┼────────┼────────┼────────┤                          │
│  │   13   │   14   │   15   │   16   │                          │
│  │  (empty)                                                      │
│  └────────┴────────┴────────┴────────┘                          │
│                                                                   │
│  SONG TIMELINE (Sequential, single track)                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Intro] [Verse] [Chorus] [Verse] [Bridge] [Chorus]         ││
│  │    4b      8b       8b       8b       4b       8b            ││
│  │  ▲                                                            ││
│  │  playhead                                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│  0        4        12       20       28       32       40        │
│                                                                   │
│  Total Duration: 40 bars (2:00 @ 120 BPM)                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### **Phase 1: Port Chordboard** (Week 1, 12-16 hours)
- Extract chord system from harmonic-sketchpad
- Create ChordPalette component
- Create ChordGrid component (4×4 drag-drop)
- Implement inline chord picker
- Add preset system
- Integrate with Tone.js engine for chord playback

**Deliverable**: Working chord progression builder

---

### **Phase 2: Icon Sound Library** (Week 1-2, 10-14 hours)
- Define 16 IconSound objects with Tone.js configs
- Find/create 16 Streamline icons
- Create IconLibrary browser component (categorized)
- Implement drag-from-library interaction
- Build mini sequencer grid (4×16)
- Add drop-onto-sequencer interaction

**Deliverable**: Can drag sounds onto sequencer grid

---

### **Phase 3: Chord Harmonization** (Week 2, 8-12 hours)
- Implement `transposeToChord()` music theory logic
- Create `ChordHarmonizer` class
- Schedule melodic sounds with Tone.js Part
- Schedule rhythmic sounds (drums/FX) without transposition
- Add loop preview playback
- Test chord following with different progressions

**Deliverable**: Sounds follow chord progression automatically

---

### **Phase 4: MPC Pad System** (Week 2-3, 10-14 hours)
- Create Pad component (4×4 grid)
- Implement Loop save flow
- Add loop preview on pad (visual representation)
- Add pad click to trigger loop playback
- Implement right-click context menu (rename, duplicate, delete)
- Add LocalStorage persistence for pads

**Deliverable**: Can save loops to pads and trigger playback

---

### **Phase 5: Song Timeline** (Week 3, 10-14 hours)
- Create Timeline component (horizontal, sequential)
- Implement click-pad-to-add interaction
- Add drag-to-reorder loop blocks
- Implement sequential playback with Tone.Transport
- Add playhead visualization
- Add export functionality (post-MVP: defer)

**Deliverable**: Can arrange pads into songs and play back

---

### **Phase 6: Polish & Testing** (Week 4, 8-12 hours)
- Add cute animations (wiggle, pop, comet)
- Keyboard shortcuts
- Empty state designs
- Error handling
- Cross-browser testing
- Bundle size verification (<150 KB)

**Deliverable**: Production-ready MVP

---

### **Total Estimated Time**: 58-82 hours (6-8 weeks part-time)

---

## Success Metrics

### **MVP Launch Criteria**
- ✅ Can create 16-bar chord progression (custom or preset)
- ✅ Can drag 16 different icon sounds onto sequencer
- ✅ Melodic sounds auto-harmonize to chords
- ✅ Can save loops to 16 MPC pads
- ✅ Can arrange loops sequentially in timeline
- ✅ Full song playback works smoothly
- ✅ Bundle size < 150 KB gzipped
- ✅ No console errors in production
- ✅ Works in Chrome/Safari/Firefox

### **User Experience Goals**
- First loop created < 2 minutes (onboarding)
- First song arranged < 5 minutes
- Zero music theory required
- Instant audio feedback (< 100ms latency)
- Fun, playful, toy-like feel

### **Technical Goals**
- Headless engine architecture maintained
- No DOM dependencies in packages/engine
- All components use Tailwind (no custom CSS)
- Accessible (WCAG AA minimum)
- Mobile-responsive (defer to post-MVP)

---

## Post-MVP Roadmap

### **Phase 7: Sound Tuning** (defer if heavy)
- Expose engine effects per icon sound
- Macro controls (space, color, hype) per sound
- User can customize synth parameters

### **Phase 8: Sample Support**
- User uploads WAV/MP3 samples
- Replace Tone.js sounds with custom samples
- Sample library browser

### **Phase 9: Export & Sharing**
- Bounce song timeline to WAV/MP3
- Share song via URL
- Embed song in website

### **Phase 10: Advanced Features**
- Multi-track stacking (2-3 tracks max)
- Loop variations (A/B sections)
- MIDI export
- Collaboration (real-time or async)

---

## Technical Constraints

### **Must Not Violate**
- ❌ No DOM types in packages/engine
- ❌ No @music/ui package usage (keep components local)
- ❌ No mixing Tone.js versions (lock to v14.8.49)
- ❌ No exceeding 150 KB bundle budget
- ❌ No blocking audio context (start() in click handler)

### **Must Follow**
- ✅ Headless engine architecture
- ✅ TypeScript strict mode
- ✅ Tailwind CSS only (no custom CSS files)
- ✅ React functional components + hooks
- ✅ LocalStorage for persistence (no backend MVP)

---

## Open Questions

1. **Sound tuning**: Too heavy for MVP? → Defer to Phase 7
2. **Loop naming**: Auto-generate or force user to name? → Auto-generate "Loop 1", allow rename
3. **Pad bank persistence**: LocalStorage sufficient? → Yes for MVP
4. **Mobile support**: Essential for MVP? → No, defer to post-MVP
5. **Undo/Redo**: Required for MVP? → No, defer

---

## References

**Existing Codebases**:
- `/Users/bradleytangonan/Desktop/my apps/harmonic-sketchpad` - Chordboard system
- `/Users/bradleytangonan/Desktop/my apps/music-playground` - Current engine + app

**External Inspiration**:
- https://danielx.net/composer/ - Icon-based notation
- Akai MPC workflow - Pad launching
- Ableton Session View - Loop arrangement

**Design Assets**:
- Streamline Icons (https://home.streamlinehq.com/) - Free icon set
- Figma design prompt: TBD (next step)

---

## Approval Status

**Decisions Locked** ✅:
1. Loop length: User-selectable (1/2/4/8 bars)
2. Icon sounds: 16 Tone.js sounds, tuning deferred
3. Sound format: Tone.js programmatic
4. Timeline: Sequential (one track)
5. MVP scope: All 4 layers

**Ready for**: Figma design creation → Implementation

---

**Document Owner**: Bradley Tangonan
**Last Review**: 2025-10-16
**Status**: APPROVED - Ready for implementation
