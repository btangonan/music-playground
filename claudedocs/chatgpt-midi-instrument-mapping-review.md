# ChatGPT Review Request: MIDI Instrument Interpretation & Mapping Strategy

## Context

We're building a music sequencer app that imports MIDI files and maps General MIDI instruments to our 16 custom synthesizer sounds. Currently, our mapping ignores GM program numbers and only uses pitch ranges, causing incorrect instrument interpretation.

---

## Problem Statement

**Current Behavior:**
Our `mapMidiToSoundId()` function (in `midiToPlacement.ts`) ignores GM program numbers and maps instruments purely by pitch range:

```typescript
// Current pitch-only mapping (INCORRECT)
if (midiNote < 36) return 'sub'           // C1 and below
if (midiNote <= 47) return 'wobble'       // C#1 to B2
if (midiNote <= 59) return 'pad'          // C3 to B3
if (midiNote <= 71) return 'lead'         // C4 to B4
if (midiNote <= 83) return 'pluck'        // C5 to B5
if (midiNote <= 95) return 'arp'          // C6 to B6
return 'sweep'                            // C7 and above
```

**Issue:**
This means a piano (Program 0), bass (Program 33), and strings (Program 48) all get mapped to completely different sounds based solely on their pitch, not their actual instrument type. A bass note at C2 becomes 'wobble', a piano at C4 becomes 'lead', etc.

---

## Example MIDI Files

### File 1: "everything in its right place - radiohead (1).mid"
- **Track 1** (Channel 1): Program 0 = Acoustic Grand Piano
- **Track 2** (Channel 2): Program 33 = Acoustic Bass
- **Track 3** (Channel 10): Drums (GM standard drum channel)
- **Track 4** (Channel 3): Program 48 = String Ensemble 1

### File 2: AUD_FV0065.mid ("DAISIES" by Justin Bieber)
```
Track 4:  Electric Bass (Finger) - Program 33, Channel 1
          Pitch range: 25-44 (C#0 to G#2)
          168 notes

Track 6:  Electric Guitar (Jazz) - Program 26, Channel 2
          Pitch range: 34-68 (A#0 to G#4)
          168 notes

Track 8:  Tenor Sax - Program 66, Channel 3
          Pitch range: 53-63 (F3 to D#4)
          50 notes

Track 12: Electric Guitar (Muted) - Program 28, Channel 5
          Pitch range: 34-68 (A#0 to G#4)
          168 notes

Track 15: Drums (Standard Kit) - Channel 9
          Pitch range: 33-49
          163 notes
```

---

## Our 16 Available Sounds

From `iconSounds.ts`, we have these sound IDs:

### Synths (4 - melodic)
- `synth-lead`: MonoSynth with sawtooth (bright, cutting)
- `synth-pad`: **Sampler with Salamander Grand Piano samples** (realistic piano)
- `synth-pluck`: PolySynth with rich sustained bass character
- `synth-arp`: Synth with square wave, short envelope (staccato)

### Drums (4 - rhythmic)
- `drum-kick`: MembraneSynth (bass drum)
- `drum-snare`: NoiseSynth white (snare)
- `drum-hihat`: MetalSynth (hi-hat)
- `drum-clap`: NoiseSynth pink (clap)

### Bass (2 - melodic)
- `bass-sub`: PolySynth with fatsquare, sizzling James Blake-inspired
- `bass-wobble`: FMSynth (modulated bass)

### FX (6)
- `fx-riser`: NoiseSynth (white noise riser)
- `fx-impact`: PolySynth with fatsawtooth, thick pad (James Blake)
- `fx-sweep`: PolySynth with triangle, Prophet-5 inspired (Radiohead)
- `fx-glitch`: MetalSynth (metallic percussion)
- `fx-vocal-chop`: PolySynth with sine, ethereal theremin-like
- `fx-noise`: NoiseSynth (brown noise)

---

## Current Code

### midiToPlacement.ts - Current Mapping Function

```typescript
/**
 * Map GM drum notes (MIDI channel 9) to drum soundIds
 * Follows General MIDI percussion map
 */
function mapGmDrumToSoundId(midiNote: number): string {
  // Core GM drum map
  if (midiNote === 35 || midiNote === 36) return 'kick'        // Acoustic/Bass Kick
  if (midiNote === 38 || midiNote === 40) return 'snare'       // Acoustic/Electric Snare
  if (midiNote === 39) return 'clap'                           // Hand Clap
  if (midiNote === 42 || midiNote === 44 || midiNote === 46) return 'hihat'  // Closed/Pedal/Open HH

  // Fallback routing for less common drums
  if (midiNote >= 41 && midiNote <= 45) return 'snare' // Low/Mid/High Tom → snare bucket
  if (midiNote >= 47 && midiNote <= 50) return 'snare' // Mid/High Tom → snare bucket
  return 'hihat' // Ride/Crash/Other percussion → hihat bucket
}

/**
 * Map MIDI note number (0-127) to soundId string
 * Uses pitch ranges to intelligently assign icon sounds
 * NOTE: UI uses short soundIds: 'lead', 'kick', 'sub' (not 'synth-lead', 'drum-kick', 'bass-sub')
 *
 * UPDATED: Channel-aware mapping
 * - Channel 9 (GM drums) → routes to drum soundIds
 * - Other channels → pitch-based melodic mapping
 */
function mapMidiToSoundId(midiNote: number, channel?: number, program?: number): string {
  // Phase 1: Detect GM drums channel (0-indexed channel 9)
  if (channel === 9) {
    return mapGmDrumToSoundId(midiNote)
  }

  // Existing pitch-only mapping as fallback for melodic
  if (midiNote < 36) return 'sub'
  if (midiNote <= 47) return 'wobble'
  if (midiNote <= 59) return 'pad'
  if (midiNote <= 71) return 'lead'
  if (midiNote <= 83) return 'pluck'
  if (midiNote <= 95) return 'arp'
  return 'sweep'
}
```

---

## Proposed Solution (Claude's Initial Design)

Add a GM program-to-soundId mapping function:

```typescript
/**
 * Map GM program number (0-127) to appropriate soundId
 * General MIDI program groups:
 * 0-7: Piano → 'synth-pad' (we have a Sampler grand piano)
 * 8-15: Chromatic Percussion → 'synth-arp'
 * 16-23: Organ → 'fx-impact' (thick pad)
 * 24-31: Guitar → 'synth-pluck'
 * 32-39: Bass → 'bass-sub' or 'bass-wobble'
 * 40-47: Strings → 'fx-impact' (thick pad sound)
 * 48-55: Ensemble → 'fx-impact' (thick pad sound)
 * 56-63: Brass → 'synth-lead'
 * 64-71: Reed → 'synth-lead'
 * 72-79: Pipe → 'fx-vocal-chop' (ethereal)
 * 80-87: Synth Lead → 'synth-lead'
 * 88-95: Synth Pad → 'fx-impact' (thick pad)
 * 96-103: Synth Effects → 'fx-sweep'
 * 104-111: Ethnic → 'synth-pluck'
 * 112-119: Percussive → 'fx-glitch'
 * 120-127: Sound Effects → 'fx-sweep'
 */
function mapGmProgramToSoundId(program: number): string {
  if (program <= 7) return 'synth-pad'      // Piano → Sampler grand piano
  if (program <= 15) return 'synth-arp'     // Chromatic Percussion
  if (program <= 23) return 'fx-impact'     // Organ → thick pad
  if (program <= 31) return 'synth-pluck'   // Guitar
  if (program <= 39) {
    // Bass instruments - differentiate by register
    return program >= 36 ? 'bass-wobble' : 'bass-sub'
  }
  if (program <= 55) return 'fx-impact'     // Strings + Ensemble → thick pad
  if (program <= 71) return 'synth-lead'    // Brass + Reed
  if (program <= 79) return 'fx-vocal-chop' // Pipe → ethereal
  if (program <= 87) return 'synth-lead'    // Synth Lead
  if (program <= 95) return 'fx-impact'     // Synth Pad → thick pad
  if (program <= 103) return 'fx-sweep'     // Synth Effects
  if (program <= 111) return 'synth-pluck'  // Ethnic
  if (program <= 119) return 'fx-glitch'    // Percussive
  return 'fx-sweep'                         // Sound Effects
}

// Updated main mapping function
function mapMidiToSoundId(midiNote: number, channel?: number, program?: number): string {
  // Priority 1: Detect GM drums channel (0-indexed channel 9)
  if (channel === 9) {
    return mapGmDrumToSoundId(midiNote)
  }

  // Priority 2: Use GM program number if available
  if (typeof program === 'number' && program >= 0 && program <= 127) {
    return mapGmProgramToSoundId(program)
  }

  // Priority 3: Fallback to pitch-based mapping for unknown instruments
  if (midiNote < 36) return 'bass-sub'
  if (midiNote <= 47) return 'bass-wobble'
  if (midiNote <= 59) return 'synth-pad'
  if (midiNote <= 71) return 'synth-lead'
  if (midiNote <= 83) return 'synth-pluck'
  if (midiNote <= 95) return 'synth-arp'
  return 'fx-sweep'
}
```

---

## General MIDI Best Practices (Research Findings)

### GM Standard Structure
- **128 program numbers** (0-127 internally, displayed as 1-128)
- Organized into **16 families** of 8 instruments each
- **Channel 10 reserved for drums** (percussion only)
- **A440 standard**: MIDI note 69 = A440 (note 60 = middle C)

### Key GM Conventions
1. **Program 0** = Acoustic Grand Piano (universal standard)
2. **Program 25** = Nylon String Guitar
3. **Channel 10** = Always percussion/drums
4. **Programs 0-7** = Piano family
5. **Programs 32-39** = Bass family

### Instrument Families (0-indexed)
```
0-7:    Piano
8-15:   Chromatic Percussion
16-23:  Organ
24-31:  Guitar
32-39:  Bass
40-47:  Strings
48-55:  Ensemble
56-63:  Brass
64-71:  Reed
72-79:  Pipe
80-87:  Synth Lead
88-95:  Synth Pad
96-103: Synth Effects
104-111: Ethnic
112-119: Percussive
120-127: Sound Effects
```

---

## Questions for ChatGPT Review

### 1. **Is the proposed GM program mapping strategy sound?**
   - Are the mappings from GM instrument families to our 16 sounds reasonable?
   - Example: Mapping Organ (16-23) → `fx-impact` (thick pad) - does this make sense?
   - Should Guitar (24-31) → `synth-pluck` or something else?

### 2. **Should we recategorize our icon sounds?**
   Current categories:
   - `synth-*` (4 sounds)
   - `drum-*` (4 sounds)
   - `bass-*` (2 sounds)
   - `fx-*` (6 sounds)

   Issues:
   - `synth-pad` is actually a grand piano Sampler, not a synth pad
   - `fx-impact` is being used as a pad sound, but categorized as FX
   - Should we rename based on actual timbral characteristics vs. arbitrary categories?

### 3. **Are there missing essential sounds?**
   Looking at the MIDI examples:
   - Electric Guitar (Programs 26, 28, 30) → Currently maps to `synth-pluck`
   - Tenor Sax (Program 66) → Currently maps to `synth-lead`
   - Strings/Ensemble (Programs 40-55) → Currently maps to `fx-impact`

   Should we:
   - Add dedicated guitar sound(s)?
   - Add dedicated brass/reed sound?
   - Keep using approximations with our existing 16 sounds?

### 4. **Fallback strategy correctness?**
   When no program number is available, should we:
   - Use pitch-based mapping (current proposal)?
   - Default to a neutral sound like `synth-pad` (piano)?
   - Try to detect instrument type from note patterns?

### 5. **Testing approach?**
   How should we validate that mappings sound "correct"?
   - Load both MIDI files and listen to results
   - Create mapping visualization/debug mode
   - Allow user override of instrument mappings?

### 6. **Performance considerations?**
   - Is program-based lookup optimal (if/else chain vs. lookup table)?
   - Should we cache mappings per track/channel?
   - Any concerns with 16 simultaneous instruments?

---

## Technical Constraints

1. **Must use exactly 16 sounds** (UI grid limitation)
2. **All sounds already synthesized in Tone.js** (no audio file loading except piano samples)
3. **Headless architecture** - engine package can't access DOM (Node.js compatible)
4. **Bundle size budget** - Must stay under 150KB gzipped

---

## Success Criteria

✅ Piano MIDI files sound like piano (use `synth-pad` Sampler)
✅ Bass instruments sound bass-like (use `bass-sub` or `bass-wobble`)
✅ Drums on channel 10 map correctly to our 4 drum sounds
✅ Melodic instruments maintain musical character (lead vs. pad vs. pluck distinction)
✅ Fallback mapping doesn't create jarring sonic mismatches

---

## Request

Please review:
1. The proposed GM program → soundId mapping strategy
2. Whether we should recategorize/rename our 16 sounds for clarity
3. Any missing critical instrument types
4. Potential edge cases or improvements
5. Whether the priority system (drums → program → pitch) is correct

**Focus areas:**
- Sonic/musical coherence (will imported MIDI sound "right"?)
- Mapping completeness (are all GM families reasonably covered?)
- Code architecture (is the approach extensible and maintainable?)

Thank you!
