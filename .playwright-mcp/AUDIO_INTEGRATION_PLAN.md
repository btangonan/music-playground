# Loop Lab Audio Integration Plan

## Context for ChatGPT

I'm integrating audio playback into a Loop Lab UI that was exported from Figma. The UI has all the visual components working (drag-and-drop sequencer, chord palette, sound icon gallery), but currently plays no sound. I need to wire it up to our existing Tone.js-based audio engine.

---

## Current System Architecture

### Existing Audio Infrastructure

**Location:** `apps/composer/src/audio/`

1. **AudioEngine.ts** (142 lines)
   - Singleton wrapper around Tone.js v14.8.49
   - Manages 16 instrument synths (one per sound icon)
   - Public API:
     - `start()` - Initialize audio context (must be called from user gesture)
     - `stop()` - Stop transport
     - `setBPM(bpm: number)` - Set tempo
     - `scheduleNote(soundId, note, time, velocity)` - Schedule note playback
     - `dispose()` - Cleanup

2. **iconSounds.ts** (265 lines)
   - 16 pre-configured Tone.js synth definitions
   - Categories: synth (4), drum (4), bass (2), fx (6)
   - Each sound has: id, name, category, type (melodic/rhythmic), toneConfig
   - Sound IDs: 'synth-lead', 'synth-pad', 'synth-pluck', 'synth-arp', 'drum-kick', 'drum-snare', 'drum-hihat', 'drum-clap', 'bass-sub', 'bass-wobble', 'fx-riser', 'fx-impact', 'fx-sweep', 'fx-glitch', 'fx-vocal-chop', 'fx-noise'

**Key Architecture Principle (CRITICAL):**
- Engine package is HEADLESS (no DOM dependencies)
- Uses `globalThis` instead of `window`
- Tone.js locked to v14.8.49 for PitchShift support
- Performance target: First sound < 2.5s from app load

### New Loop Lab UI Components

**Location:** `apps/composer/src/views/LoopLabView.tsx` + `src/components/`

**UI State Management:**
- `isPlaying` - boolean for play/pause
- `bpm` - number (default 120)
- `selectedSound` - string | null (which icon is selected)
- `selectedKey` - string (default 'C')
- `barChords` - array of 4 chords for 4-bar progression (default: ['I', 'I', 'V', 'vi'])
- `currentStep` - float 0-16 for continuous playhead position
- `placements` - array of IconPlacement objects:
  ```typescript
  interface IconPlacement {
    soundId: string;  // Icon sound ID
    bar: number;      // 0-15 (time step in 16-step grid)
    pitch: number;    // MIDI note number (48-83 for C3-B5)
    velocity: number; // 0-1 volume
  }
  ```

**Key UI Components:**
1. **TopBar** - Has Preview/Save buttons, BPM spinner, Key selector
2. **ChordPalette** - 10 chord buttons + 4 presets
3. **IconGallery** - 16 draggable sound icons
4. **IconSequencerWithDensity** - Main grid where icons are placed
5. **Playhead Animation** - Uses requestAnimationFrame, continuous 0-16 float position

**Important UI Details:**
- Grid is 16 steps (TIME_STEPS = 16) × 36 rows (TOTAL_SEMITONES = 36)
- Each column = 48px (COLUMN_WIDTH)
- Each row = 10px (ROW_HEIGHT)
- MIDI range: C3 (48) to B5 (83)
- Row 0 = B5 (top), Row 35 = C3 (bottom) - inverted mapping
- Playhead triggers notes when passing through icon center: `distance < 0.08`

### Sound Icon ID Mapping Issue

**CRITICAL MISMATCH DISCOVERED:**

**UI Component (SoundIcons.tsx) uses:**
- 'lead', 'pad', 'pluck', 'arp', 'kick', 'snare', 'hihat', 'clap', 'sub', 'wobble', 'riser', 'impact', 'sweep', 'glitch', 'vocal', 'noise'

**Audio Engine (iconSounds.ts) expects:**
- 'synth-lead', 'synth-pad', 'synth-pluck', 'synth-arp', 'drum-kick', 'drum-snare', 'drum-hihat', 'drum-clap', 'bass-sub', 'bass-wobble', 'fx-riser', 'fx-impact', 'fx-sweep', 'fx-glitch', 'fx-vocal-chop', 'fx-noise'

**Resolution Strategy:** Create ID mapping in audio integration layer

---

## Integration Requirements

### 1. Audio Engine Initialization

**Where:** LoopLabView.tsx
**When:** On first user interaction (Preview Loop button click)

**Requirements:**
- Create AudioEngine instance in useEffect
- Call `engine.start()` in handlePlayPause when isPlaying changes to true
- Set BPM when bpm state changes: `engine.setBPM(bpm)`
- Dispose engine on component unmount

**User Experience:**
- First click on "Preview Loop" = initialize audio (may have slight delay)
- Show loading indicator during initialization?
- Subsequent plays = instant

### 2. Sound ID Mapping Layer

**Where:** New file `src/audio/soundIdMapper.ts`

```typescript
// Map UI sound IDs to Audio Engine sound IDs
const SOUND_ID_MAP: Record<string, string> = {
  'lead': 'synth-lead',
  'pad': 'synth-pad',
  'pluck': 'synth-pluck',
  'arp': 'synth-arp',
  'kick': 'drum-kick',
  'snare': 'drum-snare',
  'hihat': 'drum-hihat',
  'clap': 'drum-clap',
  'sub': 'bass-sub',
  'wobble': 'bass-wobble',
  'riser': 'fx-riser',
  'impact': 'fx-impact',
  'sweep': 'fx-sweep',
  'glitch': 'fx-glitch',
  'vocal': 'fx-vocal-chop',
  'noise': 'fx-noise'
};

export function mapSoundId(uiSoundId: string): string {
  return SOUND_ID_MAP[uiSoundId] || uiSoundId;
}
```

### 3. Note Scheduling System

**Where:** LoopLabView.tsx (new effect hook)

**Algorithm:**
```typescript
useEffect(() => {
  if (!isPlaying || !audioEngineRef.current) return;

  // Schedule notes for all placements on a loop
  const msPerLoop = (60000 / bpm) * 16; // 16 beats total

  for (const placement of placements) {
    const engineSoundId = mapSoundId(placement.soundId);
    const note = midiToNoteName(placement.pitch); // e.g., 'C4'
    const timeInBeats = placement.bar / 4; // Convert step to beats (16th notes)

    // Schedule with Tone.js transport
    audioEngineRef.current.scheduleNote(
      engineSoundId,
      note,
      `+${timeInBeats}`,
      placement.velocity / 100 // Normalize to 0-1
    );
  }

  // Start transport loop
  Tone.Transport.loop = true;
  Tone.Transport.loopEnd = '4m'; // 4 measures

}, [isPlaying, placements, bpm]);
```

**Helper needed:**
```typescript
function midiToNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((midiNote - 12) / 12);
  const note = noteNames[midiNote % 12];
  return `${note}${octave}`;
}
```

### 4. Chord Harmonization (Future Enhancement)

**Current:** Placements use raw MIDI pitch
**Future:** Apply chord harmonization to melodic sounds based on barChords array

**Complexity:** HIGH - requires music theory logic
**Priority:** LOW - get basic playback working first

**When implemented:**
- Check if sound type is 'melodic' (from ICON_SOUNDS)
- Determine which bar the note is in (0-3)
- Get chord for that bar from barChords
- Apply chord harmonization algorithm
- This is OPTIONAL for MVP - can just play raw pitches first

### 5. Preview Button Integration

**Current:** `handlePlayPause()` just toggles `isPlaying` state

**New behavior:**
```typescript
const handlePlayPause = async () => {
  if (!audioEngineRef.current) {
    // First time: initialize audio
    try {
      const engine = new AudioEngine();
      await engine.start();
      audioEngineRef.current = engine;
      engine.setBPM(bpm);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      // Show error to user?
    }
  } else {
    // Toggle playback
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      Tone.Transport.start();
    } else {
      Tone.Transport.stop();
    }
  }
};
```

### 6. BPM Synchronization

**Current:** BPM stored in local state, changes via spinner

**New behavior:**
```typescript
useEffect(() => {
  if (audioEngineRef.current) {
    audioEngineRef.current.setBPM(bpm);
  }
}, [bpm]);
```

### 7. Stop Functionality

**Where:** LoopLabView.tsx unmount

```typescript
useEffect(() => {
  return () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
      audioEngineRef.current.dispose();
    }
  };
}, []);
```

---

## Questions for ChatGPT Review

### Technical Decisions

1. **Scheduling Strategy:**
   - Should I schedule all notes upfront when play is clicked?
   - Or schedule dynamically as playhead moves?
   - Tone.js Transport.loop approach vs manual scheduling?

2. **State Management:**
   - Is useRef for audioEngine instance correct?
   - Should audio state be lifted to context for multiple components?

3. **Performance:**
   - Do I need to clear scheduled events on each play?
   - How to handle adding/removing placements while playing?

4. **Error Handling:**
   - What if audio context initialization fails?
   - How to handle invalid sound IDs gracefully?

### Missing Pieces

1. **Sound Icon Preview:**
   - Should clicking an icon in the gallery play a preview sound?
   - One-shot trigger separate from sequencer?

2. **Visual Feedback:**
   - Animate icons when they trigger (already has scale animation)
   - Show loading state during audio initialization?

3. **Key/Scale Integration:**
   - Currently key selector exists but doesn't affect audio
   - Should MIDI notes be transposed based on selected key?

4. **Chord Data Integration:**
   - chordData.ts has densityAlpha and chordColors
   - Is this for visual density overlay only or audio too?

### Code Organization

1. **File Structure:**
   - Keep audio logic in LoopLabView.tsx?
   - Or extract to custom hook `useAudioPlayback()`?
   - Or separate file `audio/loopPlayback.ts`?

2. **Testing:**
   - How to mock Tone.js for tests?
   - Integration tests for audio scheduling?

### Edge Cases

1. **Editing While Playing:**
   - User drags new icon onto grid while playing
   - Should it schedule immediately or wait for next loop?

2. **Empty Grid:**
   - No placements = play silence?
   - Show message "Add sounds to hear audio"?

3. **Save Functionality:**
   - handleSave() currently just console.log
   - Should it save audio state or just visual state?

---

## Success Criteria

**Must Have (MVP):**
- [x] Preview button initializes audio engine
- [x] Playing state triggers Tone.Transport
- [x] Placed icons trigger sounds at correct times
- [x] Correct pitch mapping (MIDI 48-83)
- [x] BPM changes affect playback speed
- [x] Stop cleans up audio resources

**Nice to Have:**
- [ ] Icon click preview (one-shot sound)
- [ ] Visual feedback on sound trigger
- [ ] Loading indicator during init
- [ ] Error messages for audio failures

**Future:**
- [ ] Chord harmonization
- [ ] Key transposition
- [ ] Save/load with audio state
- [ ] Real-time editing while playing

---

## Implementation Order

1. **Phase 1: Basic Playback** (30 minutes)
   - Create audioEngine ref
   - Initialize on first play
   - Wire up start/stop/setBPM

2. **Phase 2: Note Scheduling** (1 hour)
   - Create soundIdMapper
   - Create midiToNoteName helper
   - Schedule notes from placements
   - Test with simple placement

3. **Phase 3: Loop Integration** (30 minutes)
   - Set up Tone.Transport.loop
   - Handle playhead animation sync
   - Test with multiple placements

4. **Phase 4: Polish** (30 minutes)
   - Add error handling
   - Add cleanup on unmount
   - Test edge cases

**Total Estimate:** 2-3 hours of focused development

---

## Request for ChatGPT

**Please review this plan and provide:**

1. **Technical Validation:**
   - Is the Tone.js Transport.loop approach correct?
   - Any issues with the scheduling algorithm?
   - Better ways to handle the sound ID mismatch?

2. **Code Architecture:**
   - Should I extract audio logic to custom hook?
   - How to structure for testability?

3. **Missing Considerations:**
   - What am I overlooking?
   - Any audio/music theory issues?
   - Performance concerns?

4. **Priority Recommendations:**
   - What's essential vs. optional for MVP?
   - What can be deferred to later?

5. **Implementation Guidance:**
   - Specific code patterns to use/avoid?
   - Tone.js best practices?

**Thank you for your review!**
