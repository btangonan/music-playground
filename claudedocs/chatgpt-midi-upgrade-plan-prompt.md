# ChatGPT Review Request: MIDI Interpretation System Upgrade Plan

## Context: Music Playground Project

We're building a web-based music sequencer that imports MIDI files and maps them to our custom 16-sound instrument palette. The app is built with TypeScript, React, and Tone.js, with a headless audio engine architecture.

**Repository:** `music-playground`
**MIDI Parser:** `@tonejs/midi` v2.0.28
**Audio Engine:** Tone.js v14.8.49

---

## Current MIDI Interpretation System

### File Structure

```
apps/composer/src/
├── audio/AudioEngine.ts          # parseMIDI() method (lines 157-198)
├── utils/midiToPlacement.ts      # Conversion logic
└── components/MidiUploader.tsx   # UI integration

Key Functions:
- AudioEngine.parseMIDI()         → Parses MIDI ArrayBuffer → ParsedMidiClip
- midiClipToPlacements()          → Converts notes → Placement[] for sequencer
- mapMidiToSoundId()              → GM instrument → our soundId
```

### Current Implementation (AudioEngine.ts:157-198)

```typescript
async parseMIDI(arrayBuffer: ArrayBuffer, name: string = 'Imported MIDI'): Promise<ParsedMidiClip> {
  const midi = new Midi(arrayBuffer)

  // ⚠️ ISSUE #1: Only reads first tempo, ignores tempo changes
  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120

  // ⚠️ ISSUE #2: No time signature detection - always assumes 4/4
  // midi.header.timeSignatures exists but unused

  const notes: ParsedMidiNote[] = []

  for (const track of midi.tracks) {
    const channel = typeof track.channel === 'number' ? track.channel : undefined
    const program = typeof track.instrument?.number === 'number' ? track.instrument.number : undefined

    for (const note of track.notes) {
      notes.push({
        timeSec: note.time,
        durationSec: note.duration,
        midi: note.midi,
        velocity: note.velocity,
        channel,   // ✅ Extracted correctly
        program    // ✅ Extracted correctly
      })
    }
  }

  return { name, bpm, notes }
}
```

### Current Instrument Mapping (midiToPlacement.ts:56-70)

```typescript
function mapMidiToSoundId(midiNote: number, channel?: number, program?: number): string {
  // ✅ GM drums work correctly
  if (channel === 9) {
    return mapGmDrumToSoundId(midiNote)
  }

  // ⚠️ ISSUE #3: Uses program number but mapping may be suboptimal
  // Falls back to pitch-based mapping
  if (midiNote < 36) return 'sub'
  if (midiNote <= 47) return 'wobble'
  if (midiNote <= 59) return 'pad'      // Piano samples (C3-B3 range)
  if (midiNote <= 71) return 'lead'
  if (midiNote <= 83) return 'pluck'
  if (midiNote <= 95) return 'arp'
  return 'sweep'
}
```

---

## Identified Issues & Missing Features

### 🔴 CRITICAL: Time Signature Detection Missing

**Current Behavior:**
- All MIDI files interpreted as 4/4 time
- `midi.header.timeSignatures` array exists but unused
- App schema supports `'4/4' | '3/4'` (shared/types/schemas.ts:60)
- Engine has `setTimeSig(sig: string)` function (packages/engine/src/audio-engine.ts:694-697)

**Impact:**
- 3/4, 6/8, 5/4 songs get wrong bar boundaries
- Rhythmic placement incorrect for non-4/4 music
- User experience: imported songs sound wrong

**Example:**
```typescript
// Current: Always 4/4
const bar = toSixteenthIndex(timeSec, bpm)  // Assumes 16 sixteenths per bar

// Needed: Respect time signature
const bar = toSixteenthIndex(timeSec, bpm, timeSignature)
```

---

### 🟡 IMPORTANT: BPM Detection Limited

**Current Behavior:**
- Only reads first tempo: `midi.header.tempos[0].bpm`
- Ignores tempo changes mid-song
- Defaults to 120 if no tempo events

**Impact:**
- Songs with tempo changes (ritardando, accelerando) import incorrectly
- Multi-section songs with different tempos broken

**Available Data:**
```typescript
midi.header.tempos = [
  { bpm: 120, ticks: 0 },
  { bpm: 140, ticks: 1920 }  // ← Currently ignored
]
```

**Design Question:**
- Should we support tempo changes, or just warn user and use average/first tempo?
- Our sequencer is 4-bar loop-based - tempo changes may not fit model

---

### 🟡 IMPORTANT: Instrument Mapping Needs Improvement

**Current State:**
- GM drums (channel 9) ✅ Work correctly
- Program numbers ✅ Extracted but mapping suboptimal
- Pitch fallback exists

**Issue:**
See existing document: `claudedocs/chatgpt-midi-instrument-mapping-review.md`

**Our 16 Available Sounds:**
```typescript
// Synths (4 - melodic)
'synth-lead'   // MonoSynth sawtooth (bright)
'synth-pad'    // Sampler with grand piano samples ⭐
'synth-pluck'  // PolySynth rich bass character
'synth-arp'    // Square wave, short staccato

// Drums (4 - rhythmic)
'drum-kick'    // MembraneSynth
'drum-snare'   // NoiseSynth white
'drum-hihat'   // MetalSynth
'drum-clap'    // NoiseSynth pink

// Bass (2 - melodic)
'bass-sub'     // PolySynth fatsquare (James Blake)
'bass-wobble'  // FMSynth modulated

// FX (6)
'fx-riser', 'fx-impact', 'fx-sweep', 'fx-glitch', 'fx-vocal-chop', 'fx-noise'
```

**Known Mapping Issues:**
- Piano (Program 0) → Should use `synth-pad` (our grand piano Sampler)
- Bass (Programs 32-39) → Should use `bass-sub` or `bass-wobble`
- Strings (Programs 40-55) → Currently maps to `fx-impact` (thick pad)

---

### 🟢 NICE-TO-HAVE: Additional Metadata

**Currently Missing:**
- Key signature detection (`midi.header.keySignatures`)
- Track names/labels (`track.name`)
- Lyrics/text events
- Copyright info

**Potential Use:**
- Display key signature in UI
- Auto-suggest chord progressions
- Track-based instrument overrides

---

## Available Test Files

Located in `midi/` directory:

1. **everything in its right place - radiohead (1).mid**
   - 631 notes total
   - Tracks: Piano (Prog 0), Bass (Prog 33), Drums (Ch 10), Strings (Prog 48)
   - Minimal sustain (mostly 1/8th notes)

2. **AUD_FV0065.mid** ("DAISIES" by Justin Bieber)
   - Electric Bass (Prog 33), Jazz Guitar (Prog 26), Tenor Sax (Prog 66)
   - Muted Guitar (Prog 28), Drums (Ch 9)

3. **test_loop.mid** - Basic test file
4. **AUD_DS1446.md** - Additional test case

---

## Technical Constraints

### Architecture Requirements
1. **Headless engine** - No DOM dependencies in `packages/engine/`
2. **Bundle size budget** - Must stay under 150KB gzipped
3. **Monorepo structure** - Engine package separate from composer app
4. **TypeScript strict mode** - All code fully typed

### Performance Targets
- First sound < 2.5s from app load
- Audio latency < 100ms (desktop), < 150ms (mobile)
- MIDI parsing should not block UI

### Data Model Constraints
- **4-bar loop system** - Sequencer works in 4-bar chunks
- **64 sixteenth notes** - Grid is 0-63 sixteenth indices
- **16 sounds maximum** - UI grid limitation
- **Placement deduplication** - One icon per `(bar, soundId, pitch)` cell

---

## Type Definitions

### Current Types

```typescript
// apps/composer/src/audio/AudioEngine.ts:11-24
export interface ParsedMidiNote {
  timeSec: number
  durationSec: number
  midi: number
  velocity: number
  channel?: number   // 0-15, channel 9 = GM drums
  program?: number   // 0-127 GM program number
}

export interface ParsedMidiClip {
  name: string
  bpm: number
  notes: ParsedMidiNote[]
  // ❌ Missing: timeSignature, keySignature, tempoChanges
}

// apps/composer/src/types/placement.ts
export interface Placement {
  soundId: string      // One of our 16 sounds
  bar: number          // 0-63 (sixteenth index)
  pitch: number        // MIDI note 0-127
  velocity: number     // 0-100 (percentage)
  duration16?: number  // Duration in sixteenths (>=1)
}
```

### Proposed Extended Types

```typescript
export interface ParsedMidiClip {
  name: string
  bpm: number          // First/average tempo
  timeSignature?: {    // NEW
    numerator: number
    denominator: number
    raw: string        // e.g., "3/4"
  }
  keySignature?: {     // NEW
    key: string        // e.g., "C", "Dm"
    scale: string      // "major" | "minor"
  }
  tempoChanges?: {     // NEW (future consideration)
    bpm: number
    timeSec: number
  }[]
  notes: ParsedMidiNote[]
}
```

---

## @tonejs/midi Library Capabilities

Based on v2.0.28 documentation and source:

### Available MIDI Header Data

```typescript
const midi = new Midi(arrayBuffer)

// Tempo
midi.header.tempos: Array<{ bpm: number, ticks: number }>

// Time Signature (likely available)
midi.header.timeSignatures: Array<{
  timeSignature: [number, number],  // e.g., [3, 4] for 3/4
  ticks: number
}>

// Key Signature (likely available)
midi.header.keySignatures: Array<{
  key: string,     // e.g., "C", "Dm"
  scale: string,   // "major" | "minor"
  ticks: number
}>

// Track Data
midi.tracks: Array<{
  name: string
  channel: number
  instrument: { number: number, name: string }
  notes: Array<{
    midi: number
    time: number
    duration: number
    velocity: number
  }>
}>
```

---

## Your Task: Create Upgrade Plan

Please review the current MIDI interpretation system and propose a **prioritized upgrade plan** to fix the identified issues.

### Required Sections

#### 1. Priority Assessment
Rank the issues by:
- **User impact** - How much does this affect imported MIDI quality?
- **Implementation complexity** - How difficult to implement?
- **Architectural risk** - Does this require breaking changes?

Suggested priority tiers:
- **P0 (Critical)** - Must fix for basic MIDI functionality
- **P1 (High)** - Significantly improves user experience
- **P2 (Medium)** - Nice-to-have improvements
- **P3 (Low)** - Future enhancements

#### 2. Time Signature Detection Plan

**Questions:**
- Should we use first time signature or support changes?
- How to handle unsupported signatures (7/8, 5/4, etc.)?
- Where to store: `ParsedMidiClip` or `Placement` metadata?
- How to update `toSixteenthIndex()` calculation?
- Should we expand schema to support more than '4/4' | '3/4'?

**Code Changes Needed:**
- `AudioEngine.parseMIDI()` - Extract time signature
- `midiToPlacement.ts` - Update bar calculations
- Type definitions - Extend ParsedMidiClip
- UI - Display time signature to user

#### 3. BPM/Tempo Handling Strategy

**Questions:**
- Support tempo changes or just warn user?
- If multiple tempos: use first, average, or mode?
- Should we quantize notes to nearest tempo section?
- How to communicate limitations to user?

**Recommendation Needed:**
Given our 4-bar loop model, what's the best approach?

#### 4. Instrument Mapping Improvements

Reference existing analysis in:
`claudedocs/chatgpt-midi-instrument-mapping-review.md`

**Focus:**
- Is the proposed GM program → soundId mapping reasonable?
- Any critical instrument types we're missing?
- Should we recategorize sounds (e.g., rename `synth-pad` to `piano`)?

#### 5. Implementation Roadmap

Propose phased rollout:

**Phase 1: Critical Fixes**
- Time signature detection
- BPM handling improvements
- Updated type definitions

**Phase 2: Instrument Mapping**
- Improved GM program mapping
- Better fallback logic
- User override capability?

**Phase 3: Enhanced Metadata**
- Key signature detection
- Track naming
- Multi-tempo warnings

#### 6. Testing Strategy

How to validate changes:
- Unit tests for new parsing logic
- Integration tests with real MIDI files
- User acceptance criteria
- Regression prevention

Specific test cases:
- 3/4 waltz MIDI file
- Multi-tempo composition
- Complex GM orchestration
- Edge cases (missing metadata, malformed files)

#### 7. Breaking Changes & Migration

**Potential Breaking Changes:**
- ParsedMidiClip type signature changes
- midiToPlacement function signature
- Placement metadata additions

**Migration Strategy:**
- Backward compatibility approach
- Version detection
- User communication

---

## Success Criteria

After implementing the upgrade plan, we should achieve:

✅ **Time Signature Accuracy**
- 3/4 songs import with correct bar boundaries
- 6/8 songs handled appropriately
- Unsupported signatures fallback gracefully

✅ **BPM Fidelity**
- Tempo detected accurately from MIDI
- Multi-tempo files handled or user warned
- No broken timing for standard songs

✅ **Instrument Quality**
- Piano sounds like piano (uses our Sampler)
- Bass sounds bass-like
- Drums route correctly
- Melodic vs. rhythmic distinction preserved

✅ **User Experience**
- Clear feedback on MIDI metadata (tempo, key, meter)
- Warnings for unsupported features
- No silent failures or mysterious bugs

---

## Output Format

Please provide:

1. **Executive Summary** (2-3 paragraphs)
   - Overall assessment of current system
   - Top 3 critical improvements needed
   - Estimated complexity (low/medium/high)

2. **Detailed Priority Matrix**
   ```
   Issue                | User Impact | Complexity | Priority | Estimate
   ---------------------|-------------|------------|----------|----------
   Time signature       | High        | Medium     | P0       | 4 hours
   BPM multi-tempo      | Medium      | Low        | P1       | 2 hours
   Instrument mapping   | High        | Medium     | P1       | 6 hours
   Key signature        | Low         | Low        | P2       | 1 hour
   ```

3. **Implementation Plan** (For each P0/P1 item)
   - Problem statement
   - Proposed solution with code examples
   - Files to modify
   - Type changes needed
   - Edge cases to handle
   - Test strategy

4. **Code Samples**
   - Show updated `parseMIDI()` implementation
   - Show updated `toSixteenthIndex()` with time signature support
   - Show improved `mapMidiToSoundId()` logic

5. **Risk Assessment**
   - Breaking changes
   - Performance implications
   - Backward compatibility concerns
   - Migration path

6. **Open Questions**
   - Architectural decisions we need to make
   - Trade-offs to consider
   - User preference questions

---

## Context Documents

For additional context, you may reference:

- **Instrument mapping analysis**: `claudedocs/chatgpt-midi-instrument-mapping-review.md`
- **Architecture overview**: `ARCHITECTURE.md`
- **Development guide**: `DEVELOPMENT.md`
- **Type schemas**: `shared/types/schemas.ts`

---

## Final Note

Focus on **pragmatic, incremental improvements** that:
- Work within our 4-bar loop model
- Don't require massive refactoring
- Provide immediate user value
- Maintain type safety and code quality

We're not trying to build a full DAW - just make MIDI import work correctly for common use cases (pop songs, simple compositions, loop-based music).

Thank you for your detailed analysis and recommendations!
