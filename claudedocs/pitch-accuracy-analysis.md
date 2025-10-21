# Pitch Accuracy Analysis - Daisies MIDI Files

## Issue Report

**User Feedback**: Justin Bieber "Daisies" MIDI files sound more accurate with new instrument mapping, but **too low in pitch**.

## MIDI File Analysis

### File 1: AUD_DS1446.mid

**Track Pitch Ranges**:
| Track | Instrument | Min Pitch | Max Pitch | Avg Pitch | Octave Distribution |
|-------|------------|-----------|-----------|-----------|---------------------|
| 1 | Electric Guitar (Clean) | A#1 (34) | G#4 (68) | A2 (45.1) | Mostly Octave 2 (128 notes) |
| 2 | Electric Bass (Pick) | A#1 (34) | A#2 (46) | D#2 (38.9) | Mostly Octave 2 (80 notes) |
| 3 | Electric Guitar (Jazz) | D#4 (63) | C5 (72) | G4 (66.8) | Mostly Octave 4 (17 notes) |
| 4 | Tenor Sax | D#3 (51) | F4 (65) | A#3 (58.3) | Octaves 3-4 (split) |
| 5 | Synth Voice | A#3 (58) | D#4 (63) | C4 (60.1) | Mostly Octave 4 (17 notes) |
| 6 | Rock Organ | B3 (59) | F6 (89) | E5 (76.2) | Octave 5 (14 notes) |
| 7 | Acoustic Grand Piano | C#2 (37) | D#4 (63) | F#3 (53.9) | Octaves 2-4 (varied) |
| 8 | Drums | C2 (36) | C#3 (49) | E2 (40.4) | Octave 2 (drums) |

**Expected Playback**:
- Bass should sound in **low octaves** (1-2) - ✅ CORRECT
- Guitar rhythm should sound in **mid octaves** (2-4) - ✅ CORRECT
- Sax/organ should sound in **higher octaves** (3-5) - ✅ CORRECT

### File 2: AUD_FV0065.mid

**Track Pitch Ranges**:
| Track | Instrument | Min Pitch | Max Pitch | Avg Pitch | Octave Distribution |
|-------|------------|-----------|-----------|-----------|---------------------|
| 1 | Electric Bass (Finger) | C#1 (25) | G#2 (44) | C#2 (37.2) | Very low bass |
| 2 | Electric Guitar (Jazz) | A#1 (34) | G#4 (68) | B2 (47.4) | Mostly Octaves 2-3 |
| 3 | Tenor Sax | F3 (53) | D#4 (63) | A#3 (57.7) | Octaves 3-4 |
| 4 | Electric Guitar (Muted) | A#1 (34) | G#4 (68) | B2 (47.4) | Mostly Octaves 2-3 |
| 5 | Drums | A1 (33) | C#3 (49) | C2 (36.1) | Drums |

---

## Our MIDI → Note Name Conversion

**Formula**:
```javascript
const octave = Math.floor((midiNote - 12) / 12);
const note = noteNames[midiNote % 12];
return `${note}${octave}`;
```

**Verification**:
| MIDI | Expected Note | Our Output | Status |
|------|---------------|------------|--------|
| 36 | C2 | C2 | ✅ CORRECT |
| 48 | C3 | C3 | ✅ CORRECT |
| 60 | C4 (Middle C) | C4 | ✅ CORRECT |
| 72 | C5 | C5 | ✅ CORRECT |

**Standard**: MIDI 60 = C4 (middle C) in Scientific Pitch Notation
**Tone.js**: Uses C4 = middle C = MIDI 60 ✅ MATCHES

---

## Potential Causes of "Too Low" Perception

### 1. ❓ Drum Override (Unlikely cause for melodic instruments)

**Code**: `apps/composer/src/views/LoopLabView.tsx:292-295`
```typescript
if (soundId === 'kick' || soundId === 'snare' || soundId === 'hihat' || soundId === 'clap') {
  note = 'C1'; // Force all drums to low frequency
}
```

**Impact**: Only affects drums, not melodic instruments like piano/bass/guitar.

---

### 2. ❓ Salamander Piano Samples Octave Offset

**Samples**: `https://tonejs.github.io/audio/salamander/`

**Mapping**:
```javascript
urls: {
  A0: "A0.mp3", C1: "C1.mp3", ...
  C4: "C4.mp3", // Middle C sample
  ...
  C8: "C8.mp3"
}
```

**Expected Behavior**: When we call `triggerAttackRelease("C4")`, Tone.js should play the C4.mp3 sample at its natural pitch.

**Possible Issue**: If Salamander samples are labeled with a different octave convention (e.g., their "C4.mp3" is actually C3 audio), this would cause -12 semitone offset.

---

### 3. ❓ Synth Tuning/Detune

**Checked**: No global `detune` or `transpose` settings found in:
- AudioEngine.ts (no tuning offsets)
- iconSounds.ts (only `spread` for detuning multiple oscillators, no octave shift)

---

### 4. ❓ Tone.js Context Frequency (Reference Pitch)

**Standard Tuning**: A4 = 440 Hz
**Alternative Tunings**:
- A4 = 432 Hz (8 Hz lower, sounds ~0.3 semitones flat)
- A4 = 444 Hz (4 Hz higher, sounds sharp)

**Checked**: No explicit `Tone.context.frequency` or `setA4()` calls found.

**Tone.js Default**: Should use standard A4 = 440 Hz unless explicitly changed.

---

## Debug Plan

### Step 1: Enable Pitch Debug Logging

**Added to AudioEngine.ts**:
```javascript
// DEBUG: Log note scheduling for pitch accuracy verification
if (globalThis.LL_DEBUG_PITCH) {
  console.log(`[PITCH DEBUG] ${soundId}: ${note}, dur=${dur.toFixed(3)}s, vel=${velocity.toFixed(2)}`)
}
```

**Usage**:
```javascript
// In browser console:
globalThis.LL_DEBUG_PITCH = true

// Then import MIDI and watch console for:
// [PITCH DEBUG] synth-pad: C4, dur=0.500s, vel=0.80
// [PITCH DEBUG] bass-sub: A1, dur=0.300s, vel=0.70
```

**Verification**:
- Compare logged notes to MIDI analysis above
- Bass notes should show A1, C#2, D#2, etc. (low octaves)
- Piano should show C4, F#3, D#4, etc. (mid octaves)

---

### Step 2: Test Individual Notes

**Browser Console Test**:
```javascript
// Play middle C on piano
engine.scheduleNote('synth-pad', 'C4', '+0', 0.8)

// Play low A on bass
engine.scheduleNote('bass-sub', 'A1', '+0', 0.8)

// Play high C on lead
engine.scheduleNote('synth-lead', 'C5', '+0', 0.8)
```

**Expected**:
- C4 should sound like middle C on a piano
- A1 should sound like very low bass note
- C5 should sound one octave above middle C

**If wrong**: Notes sound one octave lower than expected → Octave offset error

---

### Step 3: Compare to Reference

**Reference Audio**: Original Justin Bieber "Daisies" recording

**Test**:
1. Play original recording
2. Note approximate pitch of bass line
3. Import MIDI and compare pitch

**Expected**: Bass should match original (very low, around A1-D#2 range)

---

## Possible Fixes (If Issue Confirmed)

### Option A: Octave Offset in midiToNoteName

**If everything plays 1 octave too low**, change formula:

```javascript
// Current:
const octave = Math.floor((midiNote - 12) / 12);

// Fix (+1 octave):
const octave = Math.floor((midiNote - 12) / 12) + 1;
```

**Impact**:
- MIDI 60 → C5 instead of C4
- MIDI 48 → C4 instead of C3
- etc.

---

### Option B: Salamander Sample Relabeling

**If only piano sounds wrong**, add transpose to Sampler:

```javascript
toneConfig: {
  synthType: 'Sampler',
  options: {
    urls: { ... },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    // NEW: Add +12 semitone transpose
    transpose: 12
  }
}
```

---

### Option C: Individual Synth Transpose

**If specific synths sound wrong**, add detune per sound:

```javascript
toneConfig: {
  synthType: 'PolySynth',
  options: {
    // NEW: Add +1200 cents (1 octave up)
    detune: 1200,
    oscillator: { ... }
  }
}
```

---

## Action Items

1. **User**: Enable `globalThis.LL_DEBUG_PITCH = true` in browser console
2. **User**: Import Daisies MIDI file and paste first 20 log lines
3. **User**: Test individual notes (C4, A1, C5) and report perceived pitch
4. **User**: Compare bass line pitch to original recording

5. **Developer**: Review debug logs to identify systematic offset
6. **Developer**: Apply appropriate fix based on findings

---

## Notes

- MIDI pitch ranges are **mathematically correct** for pop music arrangement
- Bass in octaves 1-2 is **normal and expected** for bass guitar/synth bass
- Conversion formula matches Tone.js standard (C4 = middle C = MIDI 60)
- No global transpose/detune found in codebase

**Hypothesis**: Either Salamander samples or our synths have an octave offset we haven't detected yet. Debug logging will reveal this.
