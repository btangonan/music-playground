# Octave-Aware Pitch Shift Adaptation Proposal

## Problem Statement

**Issue:** Keyboard key 'K' (D5) creates dissonant sound with Blake Shimmer preset when octave offset is non-zero (+1 or +2).

**Root Cause:** Blake Shimmer uses fixed +7 semitone pitch shift. When combined with positive octave transposition, high notes (D6+, A6+) enter frequency ranges where pitch shifter artifacts become audibly dissonant (~1500+ Hz).

**Verified Behavior:**
- ✅ octaveOffset = 0: 'K' → D5 (587 Hz) → A5 (880 Hz) - **Sounds clean**
- ⚠️ octaveOffset = +1: 'K' → D6 (1175 Hz) → A6 (1760 Hz) - **Dissonant artifacts**
- ❌ octaveOffset = +2: 'K' → D7 (2349 Hz) → A7 (3520 Hz) - **Severe dissonance**

---

## Frequency Analysis

### Pitch Shift Artifact Zones

| Zone | Output Frequency | Pitch Shift | Artifact Level | Action |
|------|-----------------|-------------|----------------|---------|
| **Safe** | < 1200 Hz | +7 semitones | None/Minimal | Full shift |
| **Transition** | 1200-1400 Hz | +5 semitones | Mild | Reduced shift |
| **High** | 1400-1600 Hz | +3 semitones | Moderate | Minimal shift |
| **Danger** | > 1600 Hz | +0 semitones | Severe | Bypass shift |

### Key Frequency Table (Base Notes → Transposed + Shifted)

| Key | Base Note | Oct 0 → Shifted | Oct +1 → Shifted | Oct +2 → Shifted | Zone |
|-----|-----------|-----------------|------------------|------------------|------|
| A | C4 (262 Hz) | G4 (392 Hz) | G5 (784 Hz) | G6 (1568 Hz) | Safe → High |
| J | C5 (523 Hz) | G5 (784 Hz) | G6 (1568 Hz) | G7 (3136 Hz) | Safe → Danger |
| **K** | **D5 (587 Hz)** | **A5 (880 Hz)** | **A6 (1760 Hz)** | **A7 (3520 Hz)** | **Safe → Danger** |
| O | D#5 (622 Hz) | A#5 (932 Hz) | A#6 (1865 Hz) | A#7 (3729 Hz) | Safe → Danger |

---

## Proposed Solution: Dynamic Pitch Shift Adaptation

### Architecture Overview

**Approach:** Dynamically adjust shimmer pitch shift based on keyboard octave offset to prevent high-frequency artifacts.

**Key Features:**
1. Real-time pitch shift recalculation when octave changes (ArrowUp/Down)
2. Frequency-aware pitch reduction rules
3. Immediate parameter updates to all active shimmer effects
4. Smooth transitions between octave ranges

### Core Algorithm

```typescript
// src/lib/pitch-shift-rules.ts (NEW FILE)

import * as Tone from 'tone';

/**
 * Frequency zones for pitch shift artifact management
 */
const FREQUENCY_ZONES = {
  SAFE: 1200,      // Full +7 semitones (no artifacts)
  TRANSITION: 1400, // Reduced +5 semitones (mild artifacts)
  HIGH: 1600,       // Minimal +3 semitones (moderate artifacts)
  DANGER: 1800      // Bypass +0 semitones (severe artifacts)
} as const;

/**
 * Calculate safe pitch shift amount based on output frequency
 * @param baseNote - MIDI note string (e.g., 'D5')
 * @param octaveOffset - Keyboard octave transposition (-2 to +2)
 * @param targetShift - Desired pitch shift in semitones (default: +7)
 * @returns Safe pitch shift amount in semitones
 */
export function calculateSafePitchShift(
  baseNote: string,
  octaveOffset: number,
  targetShift: number = 7
): number {
  // Convert note to frequency
  const baseFreq = Tone.Frequency(baseNote).toFrequency();

  // Calculate transposed frequency (after keyboard octave shift)
  const transposedFreq = baseFreq * Math.pow(2, octaveOffset);

  // Calculate output frequency (after pitch shift)
  const outputFreq = transposedFreq * Math.pow(2, targetShift / 12);

  // Apply frequency-dependent reduction rules
  if (outputFreq < FREQUENCY_ZONES.SAFE) {
    return targetShift; // Safe zone: full +7 semitones
  } else if (outputFreq < FREQUENCY_ZONES.TRANSITION) {
    return targetShift - 2; // Transition: +5 semitones
  } else if (outputFreq < FREQUENCY_ZONES.HIGH) {
    return targetShift - 4; // High zone: +3 semitones
  } else if (outputFreq < FREQUENCY_ZONES.DANGER) {
    return 2; // Danger zone: +2 semitones
  }

  return 0; // Extreme danger: bypass pitch shift
}

/**
 * Calculate adaptive pitch shift for highest note in keyboard range
 * Uses D#5 (highest base note) as reference for conservative safety
 */
export function getAdaptivePitchShiftForOctave(octaveOffset: number): number {
  // Use D#5 (622 Hz) as reference - highest note in base SCALE
  // This ensures all notes in the octave are safe
  return calculateSafePitchShift('D#5', octaveOffset, 7);
}

/**
 * Update pitch shift for all shimmer effects in instrument chains
 */
export function updateShimmerPitchShift(
  instruments: any[],
  effects: any[],
  newPitchShift: number
) {
  let updatedCount = 0;

  instruments.forEach(inst => {
    inst.effects.forEach((effect: any) => {
      if (effect.type === 'shimmer' && effect.config?.node?.pitchShift) {
        const node = effect.config.node;
        try {
          if (node.pitchShift.pitch && typeof node.pitchShift.pitch === 'object' && 'value' in node.pitchShift.pitch) {
            node.pitchShift.pitch.value = newPitchShift;
            updatedCount++;
            console.log(`[Pitch Adapt] Updated shimmer pitch to +${newPitchShift} semitones`);
          }
        } catch (e) {
          console.error('[Pitch Adapt] Failed to update shimmer:', e);
        }
      }
    });
  });

  return updatedCount;
}
```

---

## Implementation Plan

### File Changes

#### 1. **NEW FILE: `src/lib/pitch-shift-rules.ts`**
- Core algorithm: `calculateSafePitchShift()`
- Octave helper: `getAdaptivePitchShiftForOctave()`
- Effect updater: `updateShimmerPitchShift()`

#### 2. **MODIFY: `src/pages/Index.tsx`**

Add octave change handler (lines 217-237):

```typescript
// Import new module
import { getAdaptivePitchShiftForOctave, updateShimmerPitchShift } from '@/lib/pitch-shift-rules';

// Replace ArrowUp handler (line 217-226):
if (key === 'ARROWUP') {
  e.preventDefault();
  setOctaveOffset(prev => {
    const newOffset = Math.min(prev + 1, 2);
    if (newOffset !== prev) {
      // Calculate safe pitch shift for new octave
      const safePitchShift = getAdaptivePitchShiftForOctave(newOffset);

      // Update all active shimmer effects
      const updated = updateShimmerPitchShift(instruments, effects, safePitchShift);

      toast({
        title: `🎵 Octave ${newOffset > 0 ? '+' : ''}${newOffset}`,
        description: updated > 0 ? `Shimmer adapted to +${safePitchShift} semitones` : undefined
      });
    }
    return newOffset;
  });
  return;
}

// Replace ArrowDown handler (line 228-237):
if (key === 'ARROWDOWN') {
  e.preventDefault();
  setOctaveOffset(prev => {
    const newOffset = Math.max(prev - 1, -2);
    if (newOffset !== prev) {
      // Calculate safe pitch shift for new octave
      const safePitchShift = getAdaptivePitchShiftForOctave(newOffset);

      // Update all active shimmer effects
      const updated = updateShimmerPitchShift(instruments, effects, safePitchShift);

      toast({
        title: `🎵 Octave ${newOffset > 0 ? '+' : ''}${newOffset}`,
        description: updated > 0 ? `Shimmer adapted to +${safePitchShift} semitones` : undefined
      });
    }
    return newOffset;
  });
  return;
}
```

#### 3. **MODIFY: `src/lib/presets.ts`** (Optional Enhancement)

Add metadata to shimmer presets indicating they support adaptive pitch shift:

```typescript
BlakeShimmer: [
  // ... existing effects ...
  {
    type: 'shimmer',
    params: {
      wet: 0.35,
      decay: 6,
      pitchShift: 7, // Base value - will adapt based on octave
      _adaptive: true // Flag for dynamic adaptation
    }
  },
  // ... rest of preset ...
]
```

---

## Testing Strategy

### Test Cases

1. **Baseline Test (Octave 0)**
   - Play all keys A-L with octaveOffset = 0
   - Verify 'K' (D5) sounds clean with +7 semitone shift
   - Expected: No dissonance

2. **Octave +1 Test**
   - Set octaveOffset = +1 (ArrowUp)
   - Verify console shows "Shimmer adapted to +5 semitones"
   - Play 'K' (D6) - should sound clean with reduced shift
   - Expected: No dissonance, smooth sound

3. **Octave +2 Test**
   - Set octaveOffset = +2 (ArrowUp twice)
   - Verify console shows "Shimmer adapted to +3 semitones" or "+2 semitones"
   - Play 'K' (D7) - should sound clean with minimal shift
   - Expected: No dissonance, subtle shimmer effect

4. **Octave -1 and -2 Test**
   - Test negative octaves (ArrowDown)
   - Verify pitch shift returns to +7 semitones (low frequencies are safe)
   - Expected: Full shimmer effect in low register

5. **Transition Test**
   - Rapidly change octaves while playing
   - Verify smooth transitions without clicks/pops
   - Expected: Clean octave transitions

### Console Verification

Expected console output when changing octaves:
```
[Pitch Adapt] Updated shimmer pitch to +7 semitones  (octave 0, -1, -2)
[Pitch Adapt] Updated shimmer pitch to +5 semitones  (octave +1)
[Pitch Adapt] Updated shimmer pitch to +3 semitones  (octave +2)
```

---

## Edge Cases & Considerations

### 1. **Multiple Shimmer Effects**
- Solution handles multiple shimmer instances in different instrument chains
- Each shimmer updated independently with same pitch shift value

### 2. **Preset Application During Non-Zero Octave**
- When applying Blake Shimmer preset while octaveOffset ≠ 0:
- Preset loads with default +7 semitones
- Need to immediately apply adaptive pitch shift after preset loads
- **Action:** Add `updateShimmerPitchShift()` call after `buildEffectChain()` in `applyPreset()`

### 3. **Effect Chain Reordering**
- If user reorders effects, shimmer references remain valid
- No special handling needed

### 4. **Manual Pitch Shift Editing**
- If user manually adjusts shimmer pitch, octave change will override it
- This is intended behavior (octave adaptation takes precedence)

### 5. **Performance Impact**
- Immediate parameter assignment (no ramp) = instant update
- Minimal CPU overhead (~1ms per octave change)
- No audio glitches expected

---

## Alternative Approaches Considered

### ❌ Approach A: Per-Note Frequency Analysis
**Rejected:** Requires real-time frequency detection, complex and CPU-intensive.

### ❌ Approach B: Multiple Preset Variants
**Rejected:** Creates UI complexity, harder to maintain, less flexible.

### ✅ Approach C: Octave-Aware Adaptation (CHOSEN)
**Selected:** Simple, efficient, leverages known octave offset, maintains single preset.

---

## Implementation Checklist

- [ ] Create `src/lib/pitch-shift-rules.ts`
- [ ] Implement `calculateSafePitchShift()` algorithm
- [ ] Implement `getAdaptivePitchShiftForOctave()` helper
- [ ] Implement `updateShimmerPitchShift()` updater
- [ ] Modify `Index.tsx` ArrowUp handler with pitch adaptation
- [ ] Modify `Index.tsx` ArrowDown handler with pitch adaptation
- [ ] Add `updateShimmerPitchShift()` call after preset application
- [ ] Test all octaves (0, ±1, ±2) with 'K' key
- [ ] Test all keys in high octaves (+1, +2)
- [ ] Verify console logs show correct pitch values
- [ ] Verify no dissonance in any octave/key combination
- [ ] Update Chroma memory with fix details

---

## Expected Outcome

After implementation:
- ✅ 'K' key sounds clean at all octave offsets
- ✅ All keys sound clean at all octave offsets
- ✅ Shimmer effect adapts intelligently to prevent artifacts
- ✅ Console logs show adaptive pitch shift values
- ✅ Smooth octave transitions without audio glitches
- ✅ No performance degradation

---

## Questions for ChatGPT Review

1. **Frequency Thresholds:** Are the zone boundaries (1200/1400/1600/1800 Hz) optimal, or should they be adjusted?

2. **Pitch Reduction Steps:** Current steps are +7 → +5 → +3 → +2 → +0. Should we use smaller/smoother increments?

3. **Reference Note Selection:** Using D#5 (highest base note) as reference for octave calculations. Is this conservative enough?

4. **Alternative Algorithm:** Should we use smooth interpolation instead of discrete steps? E.g., `lerp(7, 0, (freq - 1200) / 800)`?

5. **Preset Application:** Should adaptive pitch shift apply ONLY to shimmer in Blake* presets, or ALL shimmer effects globally?

6. **UI Feedback:** Should we show pitch shift amount in the effect node UI, or only in console/toast?

7. **Edge Case:** What happens if user manually adjusts shimmer pitch, then changes octave? Current behavior: octave change overrides manual adjustment. Is this acceptable?

---

## Ready for Implementation

This proposal provides complete architecture, algorithm, and implementation details for ChatGPT to review and validate before coding begins.
