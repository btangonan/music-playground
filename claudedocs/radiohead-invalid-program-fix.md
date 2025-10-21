# Radiohead MIDI Fix - Invalid Program Numbers

## User Report

**Files**:
1. `midi/Radiohead - Everything In Its Right Place (beginning).mid` - sounds NORMAL ✅
2. `midi/Radiohead - Everything In Its Right Place (1).mid` - sounds "crazy low" ❌

**Expected**: Both should play C5 as the main note
**Actual**: Second file plays much lower

---

## Root Cause Analysis

### The Problem

**Second file has tracks with invalid GM program numbers:**

```
Track 6: Synthesizer (Program 255 - Invalid!)
  - Notes: 1065
  - Pitch Range: C1 (MIDI 24) to C3 (MIDI 48)
  - Program 255 is INVALID (GM only goes 0-127)

Track 7: Synthesizer 2 (Program 255 - Invalid!)
  - Notes: 1065
  - Pitch Range: C1 (MIDI 24) to C3 (MIDI 48)
  - Same invalid program number
```

### Why It Sounded "Crazy Low"

**Before fix**:
1. Program 255 fails validation (not in 0-127 range)
2. Falls back to pitch-based mapping
3. MIDI 24-35 → `'sub'` (deep bass synth)
4. MIDI 36-47 → `'wobble'` (bass synth)
5. MIDI 48 → `'pad'` (piano)
6. Bass synths playing C1-C3 sound VERY low
7. Combined with already-low MIDI notes = "crazy low" sound

### The MIDI File Error

**Tracks 6 & 7 are likely duplicates of Track 1 (Bass) with:**
- Invalid program number (255 instead of valid GM program)
- Same note count (1065 notes)
- Probably a MIDI export error from the DAW

---

## The Fix ✅

Applied **three-layer defense** against invalid program numbers:

### Layer 1: Warn User (Line 161-163)

```typescript
// Handle invalid program numbers (> 127 or < 0)
if (program !== undefined && (program < 0 || program > 127)) {
  console.warn(`[MIDI] Invalid GM program ${program} (valid range: 0-127). Mapping to 'lead' synth.`)
  return 'lead' // Use neutral melodic sound
}
```

**What it does**:
- Warns user in console about invalid programs
- Maps to `'lead'` (soft round synth) instead of bass sounds
- Prevents pitch-based fallback for invalid programs

### Layer 2: Auto-Transpose Low Notes (Line 233-239)

```typescript
// Auto-transpose tracks with invalid programs if they're too low (< C3 / MIDI 48)
if (note.program !== undefined && (note.program < 0 || note.program > 127)) {
  if (note.midi < 48) {
    finalPitch = note.midi + 12 // Transpose up one octave
    console.log(`[MIDI] Invalid program ${note.program}: transposing MIDI ${note.midi} → ${finalPitch} (up 1 octave)`)
  }
}
```

**What it does**:
- Detects invalid program numbers
- If notes are too low (< C3 / MIDI 48), transpose up 1 octave (+12 semitones)
- MIDI 24 (C1) → 36 (C2)
- MIDI 36 (C2) → 48 (C3)
- MIDI 47 (B2) → 59 (B3)
- Brings notes into reasonable melodic range

### Layer 3: Correct Sound Selection

**Before**: Invalid programs → bass sounds (too low)
**After**: Invalid programs → `'lead'` synth (neutral melodic sound)

---

## Impact on Second File

**Track 6 & 7 (Program 255) - Before Fix**:
```
MIDI 24-47 → 'sub'/'wobble' (bass) → Sounds crazy low ❌
MIDI 48 → 'pad' (piano) → C3 (still too low) ❌
```

**Track 6 & 7 (Program 255) - After Fix**:
```
MIDI 24 → transpose +12 → MIDI 36 → 'lead' synth → C2 ✅
MIDI 36 → transpose +12 → MIDI 48 → 'lead' synth → C3 ✅
MIDI 47 → transpose +12 → MIDI 59 → 'lead' synth → B3 ✅
MIDI 48 → no transpose → MIDI 48 → 'lead' synth → C3 ✅
```

**Result**: Notes now play in C2-C3 range instead of C1-C2 (one octave higher), using melodic synth instead of bass.

---

## Console Output Examples

**When importing the file, you'll now see**:

```
[MIDI] Invalid GM program 255 (valid range: 0-127). Mapping to 'lead' synth.
[MIDI] Invalid program 255: transposing MIDI 24 → 36 (up 1 octave)
[MIDI] Invalid program 255: transposing MIDI 36 → 48 (up 1 octave)
[MIDI] Invalid program 255: transposing MIDI 44 → 56 (up 1 octave)
... (repeated for each low note)
```

This helps users understand what's happening with bad MIDI files.

---

## Files Modified

### `apps/composer/src/utils/midiToPlacement.ts`

**Lines 160-164** (invalid program detection):
```typescript
// Handle invalid program numbers (> 127 or < 0)
if (program !== undefined && (program < 0 || program > 127)) {
  console.warn(`[MIDI] Invalid GM program ${program} (valid range: 0-127). Mapping to 'lead' synth.`)
  return 'lead' // Use neutral melodic sound instead of pitch-based bass mapping
}
```

**Lines 230-248** (auto-transpose):
```typescript
for (const [, note] of cellMap) {
  let finalPitch = note.midi

  // Auto-transpose tracks with invalid programs if they're too low (< C3 / MIDI 48)
  if (note.program !== undefined && (note.program < 0 || note.program > 127)) {
    if (note.midi < 48) {
      finalPitch = note.midi + 12 // Transpose up one octave
      console.log(`[MIDI] Invalid program ${note.program}: transposing MIDI ${note.midi} → ${finalPitch} (up 1 octave)`)
    }
  }

  placements.push({
    soundId: mapMidiToSoundId(note.midi, note.channel, note.program),
    bar: note.bar,
    pitch: finalPitch, // Use transposed pitch
    velocity: Math.round(note.velocity * 100),
    duration16: note.duration16
  })
}
```

---

## Testing

**Before Fix**:
1. Import "Radiohead - Everything In Its Right Place (1).mid"
2. Hear very low bass sounds (C1-C2 range)
3. Sounds "crazy low" compared to expected C5

**After Fix**:
1. Import same file
2. See console warnings about program 255
3. See transpose messages for low notes
4. Hear melodic synth at C2-C3 range (one octave higher)
5. Sounds more reasonable (though still one octave low due to bad MIDI data)

**Note**: The file STILL won't match the first file perfectly because the MIDI data itself is wrong (C1-C3 instead of C5). But it will sound MUCH better than before.

---

## Why Not Transpose More?

**We transpose +12 (one octave), not +24 (two octaves) because**:
1. We don't know the user's intent - maybe they want low bass
2. The file might be a weird arrangement (like bass octave doubling)
3. One octave is a safe conservative fix
4. User can still adjust octave manually if needed

---

## Edge Cases Handled

**✅ Invalid program -1**: Detected, mapped to 'lead', transposed if low
**✅ Invalid program 255**: Detected, mapped to 'lead', transposed if low
**✅ Invalid program 999**: Detected, mapped to 'lead', transposed if low
**✅ Notes ≥ C3 (MIDI 48)**: No transpose (already reasonable range)
**✅ Valid programs 0-127**: No change (normal GM mapping)

---

## Summary

**Issue**: Second Radiohead MIDI file has tracks with invalid program number 255 playing notes in C1-C3 range, sounding "crazy low"

**Root Cause**:
1. Invalid GM program numbers (> 127)
2. Low MIDI notes (24-48)
3. Fallback to bass synths made it worse

**Fix**:
1. Detect invalid programs
2. Map to neutral `'lead'` synth instead of bass
3. Auto-transpose notes < C3 up one octave
4. Warn user in console

**Result**: Tracks now play at C2-C3 with melodic synth instead of C1-C2 with bass, sounding much better

**Status**: ✅ Fixed and hot-reloaded. Ready for testing.

---

**Last Updated**: 2025-10-21 00:54 PST
