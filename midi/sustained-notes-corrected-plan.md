# Sustained Notes Implementation Plan - Corrected Version

**Date:** 2025-10-17
**Feature:** Add duration support to icon sequencer (sustained notes on 1/16 backbone)
**Status:** Implementation-ready after critical issue corrections

---

## Executive Summary

This document provides a corrected, implementation-ready plan for adding duration support to the music sequencer. The original plan contained **5 critical issues** that would cause compilation failures and data loss:

### Critical Issues Fixed

1. **Type Mismatch** - Original plan had `duration: string` parameter but passed `durSeconds` (number). **Fixed:** Changed to `durationSeconds: number` throughout.

2. **Wrong Import Paths** - Original plan referenced non-existent `../stores/useSequencerStore`. **Fixed:** Changed to import `IconPlacement` from `IconSequencerWithDensity.tsx`.

3. **Missing Serialization** - Original plan didn't update serializeLoop/deserializeLoop functions. **Fixed:** Added `duration16` field preservation in both functions to prevent data loss.

4. **UI Rendering Ambiguity** - Original plan unclear on block alignment strategy. **Fixed:** Specified left-aligned blocks with centered glyphs for clear visual representation.

5. **Missing Type Update** - Original plan didn't update IconPlacement interface. **Fixed:** Added `duration16?: number` field to interface.

### Implementation Strategy

- **Backward Compatible**: Optional `duration16` field defaults to 1 (eighth note)
- **MVP Scope**: No resize handles initially (follow-up PR)
- **8-Step Sequence**: Each step is independently committable for easy rollback
- **7 QA Scenarios**: Comprehensive testing matrix covering all edge cases

---

## File Changes

### 1. shared/types/schemas.ts

**Location:** `/Users/bradleytangonan/Desktop/my apps/music-playground/shared/types/schemas.ts`
**Lines:** Add to IconStepSchema object (currently ends at line ~15)

```typescript
export const IconStepSchema = z.object({
  bar: z.number().int().min(0).max(63),
  row: z.number().int().min(0).max(3),
  soundId: z.string().min(1),
  velocity: z.number().min(0).max(1).optional().default(0.8),
  pitch: z.number().int().min(0).max(127),
  duration16: z.number().int().min(1).max(64).optional().default(1) // ADD THIS LINE
})
```

**Rationale:**
- `min(1)` prevents zero/negative durations
- `max(64)` limits to 4 bars (16 sixteenths × 4 bars)
- `.optional().default(1)` ensures backward compatibility with existing loops
- Default of 1 sixteenth = eighth note (current behavior)

---

### 2. apps/composer/src/components/IconSequencerWithDensity.tsx

**Location:** `/Users/bradleytangonan/Desktop/my apps/music-playground/apps/composer/src/components/IconSequencerWithDensity.tsx`

#### 2a. Update IconPlacement Interface (Line 6)

```typescript
interface IconPlacement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars)
  pitch: number; // MIDI note number (48-83 for 3 octaves: C3-B5)
  velocity: number;
  duration16?: number; // ADD THIS LINE - Duration in sixteenth notes (1-64)
}
```

#### 2b. Update Rendering Logic (Lines 285-301)

**Current Code:**
```typescript
const cellCenterX = p.bar * SIXTEENTH_WIDTH + SIXTEENTH_WIDTH / 2;
const targetLeft = cellCenterX - ICON_BOX / 2;
```

**New Code:**
```typescript
// Left-align blocks at bar position, width based on duration
const duration = p.duration16 ?? 1;
const blockWidth = duration * SIXTEENTH_WIDTH;
const targetLeft = p.bar * SIXTEENTH_WIDTH; // Left-aligned, not centered

// Clamp block width to not extend past bar 63
const maxWidth = (64 - p.bar) * SIXTEENTH_WIDTH;
const clampedWidth = Math.min(blockWidth, maxWidth);

// Center glyph within the block
const glyphCenterX = targetLeft + clampedWidth / 2;
```

**Rendering Changes:**
- Replace `width: ICON_BOX` with `width: clampedWidth`
- Replace icon positioning from `targetLeft` to `glyphCenterX - ICON_BOX / 2`
- Add visual cue for sustained notes (e.g., slightly different background color)

**Example:**
```typescript
<div
  style={{
    position: 'absolute',
    left: targetLeft,
    top: rowTop,
    width: clampedWidth, // Variable width
    height: ROW_HEIGHT,
    backgroundColor: duration > 1 ? 'rgba(255, 209, 26, 0.3)' : 'rgba(255, 209, 26, 0.2)',
    borderRadius: '4px'
  }}
>
  <div
    style={{
      position: 'absolute',
      left: glyphCenterX - ICON_BOX / 2, // Centered glyph
      width: ICON_BOX,
      height: ICON_BOX
    }}
  >
    {/* Icon content */}
  </div>
</div>
```

---

### 3. apps/composer/src/audio/AudioEngine.ts

**Location:** `/Users/bradleytangonan/Desktop/my apps/music-playground/apps/composer/src/audio/AudioEngine.ts`

#### 3a. Update scheduleNote Signature (Line 105)

**Current:**
```typescript
scheduleNote(soundId: string, note: string, time: number | string, velocity: number): boolean
```

**New:**
```typescript
scheduleNote(soundId: string, note: string, time: number | string, velocity: number, durationSeconds: number): boolean
```

#### 3b. Update triggerAttackRelease Calls (Lines 119-127)

**Current:**
```typescript
else if (instrument instanceof Tone.NoiseSynth) {
  instrument.triggerAttackRelease('8n', time, velocity) // Hardcoded '8n'
} else if (soundId === 'drum-kick') {
  instrument.triggerAttackRelease('C1', '8n', time, velocity)
} else {
  instrument.triggerAttackRelease(note, '8n', time, velocity)
}
```

**New:**
```typescript
else if (instrument instanceof Tone.NoiseSynth) {
  instrument.triggerAttackRelease(durationSeconds, time, velocity) // Use parameter
} else if (soundId === 'drum-kick') {
  instrument.triggerAttackRelease('C1', durationSeconds, time, velocity)
} else {
  instrument.triggerAttackRelease(note, durationSeconds, time, velocity)
}
```

**Note:** Tone.js accepts duration as seconds (number) or Tone.Time string. Using number is more precise.

---

### 4. apps/composer/src/utils/midiToPlacement.ts

**Location:** `/Users/bradleytangonan/Desktop/my apps/music-playground/apps/composer/src/utils/midiToPlacement.ts`

#### 4a. Fix Import (Line 2)

**Current (WRONG):**
```typescript
import type { Placement } from '../stores/useSequencerStore'
```

**New (CORRECT):**
```typescript
import type { IconPlacement } from '../components/IconSequencerWithDensity'
```

**Note:** Update all references from `Placement` to `IconPlacement` throughout the file.

#### 4b. Add Helper Function (Before midiClipToPlacements)

```typescript
/**
 * Convert MIDI duration in seconds to sixteenth note count
 * @param durationSec - Duration in seconds from MIDI note
 * @param bpm - Tempo in beats per minute
 * @returns Number of sixteenth notes (minimum 1, maximum 64)
 */
function toSixteenthLength(durationSec: number, bpm: number): number {
  const beatsPerSecond = bpm / 60
  const beats = durationSec * beatsPerSecond
  const sixteenths = beats * 4 // 4 sixteenths per beat

  // Round to nearest sixteenth, minimum 1, maximum 64
  return Math.max(1, Math.min(64, Math.round(sixteenths)))
}
```

#### 4c. Update midiClipToPlacements Function (Lines 80-121)

**Add duration conversion in the mapping:**

```typescript
export function midiClipToPlacements(clip: ParsedMidiClip): IconPlacement[] {
  const placements: IconPlacement[] = []
  const bpm = clip.bpm

  for (const note of clip.notes) {
    const bar = toSixteenthPosition(note.timeSec, bpm)
    const duration16 = toSixteenthLength(note.durationSec, bpm) // ADD THIS

    // Clamp duration to not extend past bar 63
    const maxDuration = 64 - bar
    const clampedDuration = Math.min(duration16, maxDuration)

    placements.push({
      soundId: mapMidiNoteToSound(note.pitch),
      bar,
      pitch: note.pitch,
      velocity: note.velocity * 100,
      duration16: clampedDuration // ADD THIS
    })
  }

  return placements
}
```

---

### 5. apps/composer/src/views/LoopLabView.tsx

**Location:** `/Users/bradleytangonan/Desktop/my apps/music-playground/apps/composer/src/views/LoopLabView.tsx`

#### 5a. Add Helper Function (After component definition, before render)

```typescript
/**
 * Convert sixteenth note count to seconds at current BPM
 * @param sixteenths - Number of sixteenth notes
 * @param bpm - Tempo in beats per minute
 * @returns Duration in seconds
 */
function sixteenthToSeconds(sixteenths: number, bpm: number): number {
  const beatsPerSecond = bpm / 60
  const beats = sixteenths / 4 // 4 sixteenths per beat
  return beats / beatsPerSecond
}
```

#### 5b. Update serializeLoop Function (Lines 105-111)

**Current:**
```typescript
const iconSequence: IconStep[] = placements.map(p => ({
  bar: p.bar,
  row: p.row ?? 0,
  soundId: p.soundId,
  velocity: p.velocity / 100,
  pitch: p.pitch,
}));
```

**New:**
```typescript
const iconSequence: IconStep[] = placements.map(p => ({
  bar: p.bar,
  row: p.row ?? 0,
  soundId: p.soundId,
  velocity: p.velocity / 100,
  pitch: p.pitch,
  duration16: p.duration16 ?? 1 // ADD THIS - Preserve duration
}));
```

#### 5c. Update deserializeLoop Function (Lines 141-148)

**Current:**
```typescript
const newPlacements = loop.iconSequence.map(step => ({
  bar: step.bar,
  row: step.row,
  soundId: step.soundId,
  velocity: step.velocity * 100,
  pitch: step.pitch,
}));
```

**New:**
```typescript
const newPlacements = loop.iconSequence.map(step => ({
  bar: step.bar,
  row: step.row,
  soundId: step.soundId,
  velocity: step.velocity * 100,
  pitch: step.pitch,
  duration16: step.duration16 ?? 1 // ADD THIS - Restore duration
}));
```

#### 5d. Update Scheduling Logic (Lines 364-382)

**Current:**
```typescript
placements.forEach((placement) => {
  const engineSoundId = mapSoundId(placement.soundId);
  const note = midiToNoteName(placement.pitch);
  const time = barToToneTime(placement.bar);

  const eventId = Tone.Transport.schedule((scheduleTime) => {
    engine.scheduleNote(
      engineSoundId,
      note,
      scheduleTime,
      placement.velocity / 100 // Normalize to 0-1
    );
  }, time);

  eventIds.push(eventId);
});
```

**New:**
```typescript
placements.forEach((placement) => {
  const engineSoundId = mapSoundId(placement.soundId);
  const note = midiToNoteName(placement.pitch);
  const time = barToToneTime(placement.bar);

  // Calculate duration in seconds
  const duration16 = placement.duration16 ?? 1;
  const durationSeconds = sixteenthToSeconds(duration16, bpm);

  const eventId = Tone.Transport.schedule((scheduleTime) => {
    engine.scheduleNote(
      engineSoundId,
      note,
      scheduleTime,
      placement.velocity / 100, // Normalize to 0-1
      durationSeconds // ADD THIS - Pass actual duration
    );
  }, time);

  eventIds.push(eventId);
});
```

---

## Implementation Sequence

Execute these steps in order. Each step can be committed separately for easy rollback.

### Step 1: Update Data Schema
**File:** `shared/types/schemas.ts`
**Action:** Add `duration16` field to IconStepSchema
**Commit Message:** `feat(schema): add duration16 field to IconStepSchema`
**Risk:** None - optional field with default value

### Step 2: Update UI Type
**File:** `apps/composer/src/components/IconSequencerWithDensity.tsx`
**Action:** Add `duration16?: number` to IconPlacement interface
**Commit Message:** `feat(types): add duration16 to IconPlacement interface`
**Risk:** None - type-only change

### Step 3: Update MIDI Conversion
**File:** `apps/composer/src/utils/midiToPlacement.ts`
**Actions:**
- Fix import from `useSequencerStore` to `IconSequencerWithDensity`
- Add `toSixteenthLength` helper function
- Update `midiClipToPlacements` to convert and clamp duration
**Commit Message:** `feat(midi): convert MIDI note durations to sixteenth counts`
**Risk:** Low - only affects MIDI import, defaults to 1 if conversion fails

### Step 4: Update Audio Engine
**File:** `apps/composer/src/audio/AudioEngine.ts`
**Actions:**
- Add `durationSeconds` parameter to `scheduleNote` signature
- Replace hardcoded `'8n'` with `durationSeconds` parameter
**Commit Message:** `feat(audio): add duration parameter to scheduleNote`
**Risk:** Medium - breaking change but compiler will catch all call sites

### Step 5: Update Serialization
**File:** `apps/composer/src/views/LoopLabView.tsx`
**Actions:**
- Update `serializeLoop` to include `duration16` field
- Update `deserializeLoop` to restore `duration16` field
**Commit Message:** `feat(serialize): preserve duration16 in loop serialization`
**Risk:** High - data loss if omitted, but defaults prevent breakage

### Step 6: Update Scheduling
**File:** `apps/composer/src/views/LoopLabView.tsx`
**Actions:**
- Add `sixteenthToSeconds` helper function
- Update scheduling loop to calculate and pass `durationSeconds`
**Commit Message:** `feat(playback): schedule notes with actual duration`
**Risk:** Medium - audio behavior changes, must verify timing

### Step 7: Update UI Rendering
**File:** `apps/composer/src/components/IconSequencerWithDensity.tsx`
**Actions:**
- Update rendering logic to left-align blocks
- Calculate variable width based on `duration16`
- Clamp width to not extend past bar 63
- Center glyphs within blocks
**Commit Message:** `feat(ui): render sustained notes with variable width blocks`
**Risk:** Medium - visual changes, must verify alignment

### Step 8: Manual Testing
**Actions:**
- Load existing loop (verify backward compatibility)
- Import MIDI with sustained notes (verify duration conversion)
- Play loop (verify audio duration matches visual)
- Save and reload loop (verify serialization round-trip)
**Commit Message:** N/A (testing phase)
**Risk:** N/A - validation step

---

## QA Matrix

### Test Scenario 1: Backward Compatibility
**Input:** Load existing loop JSON without `duration16` field
**Expected:** All notes default to `duration16: 1` (eighth note)
**Validation:**
- Check console: `placements.map(p => p.duration16)` should show all `1` or `undefined`
- Visual: All notes should look the same as before
- Audio: No change in sound duration
**Pass Criteria:** No errors, existing behavior preserved

### Test Scenario 2: MIDI Import - Short Notes
**Input:** Import MIDI file with staccato eighth notes
**Expected:** `duration16: 1` for each note
**Validation:**
- Console log in `midiClipToPlacements`: `console.log('Duration:', duration16)`
- Visual: Single-cell width blocks
**Pass Criteria:** `duration16` values are 1 or close to 1

### Test Scenario 3: MIDI Import - Sustained Notes
**Input:** Import MIDI file with whole notes (4 beats)
**Expected:** `duration16: 16` (16 sixteenths = 4 beats)
**Validation:**
- Console log duration calculations
- Visual: Wide blocks spanning 16 cells
**Pass Criteria:** `duration16` values match note durations (±1 sixteenth for rounding)

### Test Scenario 4: Audio Playback Duration
**Input:** Place note with `duration16: 8` (2 beats = half note)
**Expected:** Sound plays for 2 beats at current BPM
**Validation:**
- Use headphones/speakers
- Count beats while listening
- Console log: `console.log('Duration seconds:', durationSeconds)`
**Pass Criteria:** Audible duration matches visual duration (±0.1s tolerance)

### Test Scenario 5: Loop Boundary Clamping
**Input:** Import MIDI note at bar 60 with duration 8 sixteenths
**Expected:** Duration clamped to 4 sixteenths (bars 60-63)
**Validation:**
- Check `midiClipToPlacements`: Should clamp to `maxDuration = 64 - bar`
- Visual: Block stops at bar 63, doesn't overflow
**Pass Criteria:** No notes extend past bar 63

### Test Scenario 6: Serialization Round-Trip
**Input:**
1. Import MIDI with sustained notes
2. Save loop
3. Reload page
4. Load saved loop
**Expected:** `duration16` values preserved exactly
**Validation:**
- Before save: `console.log('Before:', placements[0].duration16)`
- After load: `console.log('After:', placements[0].duration16)`
**Pass Criteria:** Values match exactly, no data loss

### Test Scenario 7: UI Rendering
**Input:** Place notes with `duration16: 1, 4, 8, 16`
**Expected:**
- Left-aligned blocks at bar position
- Width proportional to duration
- Glyphs centered within blocks
- Visual distinction for sustained vs short notes
**Validation:**
- Visual inspection
- Measure block widths: Should be `duration * SIXTEENTH_WIDTH`
**Pass Criteria:** Blocks render correctly, no overlap or misalignment

---

## Risk Mitigation

### Risk 1: Data Loss on Serialization
**Mitigation:**
- Optional field with default value prevents breaking existing loops
- Zod schema validation catches invalid values at API boundary
- Unit test serialization/deserialization round-trip
**Fallback:** If `duration16` missing after load, default to 1

### Risk 2: Audio Timing Bugs
**Mitigation:**
- `sixteenthToSeconds` helper is isolated and testable
- Console log duration calculations during development
- Manual testing with metronome to verify timing
**Fallback:** If timing is wrong, revert scheduling changes (Step 6)

### Risk 3: UI Performance Degradation
**Mitigation:**
- Variable-width rendering is no more complex than current centered rendering
- Only affects icon positioning math, not React re-renders
- Test with 200+ notes to verify performance
**Fallback:** If performance issues, simplify rendering or add memoization

### Risk 4: Type Safety Violations
**Mitigation:**
- Zod schema validates at runtime (API boundary)
- TypeScript validates at compile time (UI layer)
- `Math.max(1, ...)` prevents zero/negative durations
**Fallback:** If invalid duration reaches rendering, clamp to 1

### Risk 5: MIDI Conversion Errors
**Mitigation:**
- `toSixteenthLength` uses `Math.round` for accurate conversion
- Clamping prevents overflow past bar 63
- Test with various MIDI files (staccato, legato, whole notes)
**Fallback:** If conversion produces bad values, default to 1

---

## Rollback Strategy

### Rollback by Step

Each implementation step is a separate commit. To rollback:

```bash
# Rollback last commit
git revert HEAD

# Rollback specific commit
git revert <commit-hash>

# Rollback multiple commits
git revert HEAD~3..HEAD
```

### Rollback by Feature

If entire feature needs removal:

```bash
# Create rollback branch
git checkout -b rollback/sustained-notes

# Revert all 7 commits in reverse order
git revert <step-7-hash>
git revert <step-6-hash>
git revert <step-5-hash>
git revert <step-4-hash>
git revert <step-3-hash>
git revert <step-2-hash>
git revert <step-1-hash>

# Push rollback
git push origin rollback/sustained-notes
```

### Feature Flag Option (Advanced)

If partial rollback needed, add feature flag:

```typescript
// In LoopLabView.tsx
const ENABLE_SUSTAINED_NOTES = false; // Set to false to disable

// In scheduling logic
const durationSeconds = ENABLE_SUSTAINED_NOTES
  ? sixteenthToSeconds(placement.duration16 ?? 1, bpm)
  : sixteenthToSeconds(1, bpm); // Always use eighth note

// In rendering logic
const duration = ENABLE_SUSTAINED_NOTES ? (p.duration16 ?? 1) : 1;
```

### Data Recovery

If serialization issues cause data loss:

1. Check browser localStorage for previous loop state
2. Check API server logs for last successful save
3. Restore from backup if available
4. Worst case: MIDI re-import will regenerate durations

---

## Success Criteria

### Functional Requirements
- ✅ Existing loops load without errors
- ✅ MIDI import converts durations correctly
- ✅ Audio playback duration matches visual duration
- ✅ Serialization preserves duration values
- ✅ UI renders variable-width blocks correctly
- ✅ No notes extend past bar 63

### Quality Requirements
- ✅ All TypeScript types are correct
- ✅ No compilation errors
- ✅ Bundle size increase < 2 KB
- ✅ No console errors or warnings
- ✅ Manual QA passes all 7 test scenarios

### Documentation Requirements
- ✅ Update ARCHITECTURE.md with duration system explanation
- ✅ Update DEVELOPMENT.md with duration debugging tips
- ✅ Add code comments for helper functions

---

## Next Steps After Implementation

### Immediate Follow-ups
1. Update documentation (ARCHITECTURE.md, DEVELOPMENT.md)
2. Create ChromaDB memory entry for this feature
3. Git commit and push to feature branch
4. Create pull request with this document in description

### Future Enhancements (Separate PRs)
1. **Resize Handles** - Allow manual duration adjustment in UI
2. **Snap-to-Grid** - Quantize durations to musically meaningful values (1, 2, 4, 8, 16)
3. **Duration Presets** - Keyboard shortcuts for common durations (Q=quarter, H=half, W=whole)
4. **Visual Indicators** - Different colors/patterns for different duration ranges
5. **Duration Inspector** - Show duration in musical notation (♪, ♩, 𝅗𝅥) on hover

---

## Appendix: Original Plan Issues

For reference, here are the exact issues found in the original plan:

### Issue 1: Type Mismatch in AudioEngine.scheduleNote
**Original Plan:**
```typescript
scheduleNote(soundId: string, note: string, time: number | string, velocity: number, duration: string): boolean
```
**Problem:** Parameter typed as `string` but implementation showed passing `durSeconds` (number)
**Fix:** Changed to `durationSeconds: number`

### Issue 2: Wrong Import Path in midiToPlacement.ts
**Original Plan:**
```typescript
import type { Placement } from '../stores/useSequencerStore'
```
**Problem:** File `useSequencerStore.ts` doesn't exist
**Fix:** Changed to `import type { IconPlacement } from '../components/IconSequencerWithDensity'`

### Issue 3: Missing Serialization Updates
**Original Plan:** Didn't mention serializeLoop/deserializeLoop functions
**Problem:** Would cause data loss on save/load
**Fix:** Added `duration16` field to both functions

### Issue 4: UI Rendering Ambiguity
**Original Plan:** "update rendering logic to show variable-width blocks"
**Problem:** Unclear if left-aligned or centered
**Fix:** Specified left-aligned blocks with centered glyphs

### Issue 5: Missing IconPlacement Update
**Original Plan:** Didn't update IconPlacement interface
**Problem:** TypeScript compilation would fail
**Fix:** Added `duration16?: number` to interface

---

**End of Corrected Implementation Plan**
