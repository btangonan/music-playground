/**
 * Adaptive Pitch Shift Rules
 *
 * Prevents dissonant pitch shift artifacts in high frequency ranges
 * by dynamically adjusting shimmer pitch shift amount based on note frequency.
 *
 * Problem: Pitch shifters create audible artifacts above ~1500 Hz
 * Solution: Reduce pitch shift amount for high-frequency notes
 */

export type AdaptResult = {
  semitones: number;
  wetScale?: number;
};

/**
 * Frequency zones for pitch shift artifact management
 * Tuned to balance shimmer effect vs artifact audibility
 */
const FREQUENCY_ZONES = {
  SAFE: 1200,       // Full +7 semitones (no artifacts)
  TRANSITION: 1400, // Reduced +5 semitones (mild artifacts)
  HIGH: 1600,       // Minimal +3 semitones (moderate artifacts)
  DANGER: 1800      // Bypass +0 semitones (severe artifacts)
} as const;

/**
 * Calculate adaptive shimmer parameters based on input frequency
 *
 * @param freqHz - Input note frequency in Hz (after octave transposition)
 * @returns Adaptive semitone shift + optional wet scale reduction
 *
 * @example
 * // Low register: Full shimmer effect
 * adaptiveShimmerForFreq(440) // A4 → { semitones: 7 }
 *
 * // High register: Reduced shimmer to prevent artifacts
 * adaptiveShimmerForFreq(1760) // A6 → { semitones: 0, wetScale: 0.85 }
 */
export function adaptiveShimmerForFreq(freqHz: number): AdaptResult {
  // Safe zone: Full +7 semitone shift (perfect 5th)
  if (freqHz < FREQUENCY_ZONES.SAFE) {
    return { semitones: 7 };
  }

  // Transition zone: Reduce to +5 semitones (perfect 4th)
  // Slight wet reduction to compensate for less dramatic pitch shift
  if (freqHz < FREQUENCY_ZONES.TRANSITION) {
    return { semitones: 5, wetScale: 0.95 };
  }

  // High zone: Minimal +3 semitones (minor 3rd)
  // More wet reduction for cleaner sound
  if (freqHz < FREQUENCY_ZONES.HIGH) {
    return { semitones: 3, wetScale: 0.9 };
  }

  // Danger zone: Bypass pitch shift entirely (+0 semitones)
  // Significant wet reduction to minimize artifacts
  if (freqHz < FREQUENCY_ZONES.DANGER) {
    return { semitones: 0, wetScale: 0.85 };
  }

  // Extreme danger: Full bypass
  return { semitones: 0, wetScale: 0.8 };
}

/**
 * Debug flag for pitch adaptation logging
 * Enable in browser console: window.LL_DEBUG_PITCH_ADAPT = true
 */
declare global {
  interface Window {
    LL_DEBUG_PITCH_ADAPT?: boolean;
  }
}
