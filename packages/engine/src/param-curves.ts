/**
 * Parameter Curves - Perceptual Scaling Utilities
 *
 * Implements exponential and logarithmic parameter curves for natural-feeling
 * audio parameter control. Human perception of frequency and gain is logarithmic,
 * so linear parameter mappings feel unnatural.
 *
 * Benefits:
 * - Natural-feeling frequency sweeps (exponential 20Hz-20kHz)
 * - Smooth volume/gain control (logarithmic dB scaling)
 * - Perceptually linear parameter adjustment
 * - Professional audio parameter mapping standards
 *
 * Pattern:
 * - Exponential curves for frequency parameters (filters, oscillators)
 * - Logarithmic curves for gain/volume parameters (amplifiers, dynamics)
 * - Linear curves for time-based parameters (delay, attack, release)
 *
 * Usage:
 * ```typescript
 * import { mapFrequency, mapGain, mapTime } from './param-curves';
 *
 * // Map 0-1 knob position to 20Hz-20kHz (exponential)
 * const freq = mapFrequency(0.5); // ~632Hz (geometric mean)
 *
 * // Map 0-1 knob position to -60dB to 0dB (logarithmic)
 * const gain = mapGain(0.5); // ~-30dB (linear in dB)
 *
 * // Map 0-1 knob position to 0.01s-2s (exponential for natural feel)
 * const time = mapTime(0.5, 0.01, 2); // ~0.14s
 * ```
 */

declare global {
  interface Window {
    LL_DEBUG_PARAM_CURVES?: number;
  }
}

function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.LL_DEBUG_PARAM_CURVES) {
    console.log('[Param Curves]', ...args);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Frequency Mapping (Exponential)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map normalized value (0-1) to frequency using exponential curve
 *
 * Exponential scaling provides perceptually linear frequency sweeps.
 * Each octave has equal perceptual weight.
 *
 * @param value - Normalized input (0-1)
 * @param minFreq - Minimum frequency in Hz (default 20Hz)
 * @param maxFreq - Maximum frequency in Hz (default 20000Hz)
 * @returns Frequency in Hz
 *
 * @example
 * mapFrequency(0)    // 20Hz (minimum)
 * mapFrequency(0.5)  // ~632Hz (geometric mean)
 * mapFrequency(1)    // 20000Hz (maximum)
 */
export function mapFrequency(
  value: number,
  minFreq: number = 20,
  maxFreq: number = 20000
): number {
  // Clamp input to valid range
  const v = Math.max(0, Math.min(1, value));

  // Exponential mapping: freq = minFreq * (maxFreq/minFreq)^v
  const freq = minFreq * Math.pow(maxFreq / minFreq, v);

  debugLog(`mapFrequency(${value.toFixed(3)}) = ${freq.toFixed(2)}Hz`);

  return freq;
}

/**
 * Inverse frequency mapping - convert Hz to normalized value (0-1)
 *
 * Useful for reading current frequency and converting back to knob position.
 *
 * @param freq - Frequency in Hz
 * @param minFreq - Minimum frequency in Hz (default 20Hz)
 * @param maxFreq - Maximum frequency in Hz (default 20000Hz)
 * @returns Normalized value (0-1)
 */
export function unmapFrequency(
  freq: number,
  minFreq: number = 20,
  maxFreq: number = 20000
): number {
  // Clamp frequency to valid range
  const f = Math.max(minFreq, Math.min(maxFreq, freq));

  // Inverse exponential: v = log(freq/minFreq) / log(maxFreq/minFreq)
  const value = Math.log(f / minFreq) / Math.log(maxFreq / minFreq);

  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Gain Mapping (Logarithmic)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map normalized value (0-1) to gain in decibels (logarithmic)
 *
 * Logarithmic scaling provides perceptually linear volume control.
 * Each equal increment feels like equal loudness change.
 *
 * @param value - Normalized input (0-1)
 * @param minDb - Minimum gain in dB (default -60dB, near silence)
 * @param maxDb - Maximum gain in dB (default 0dB, unity)
 * @returns Gain in decibels
 *
 * @example
 * mapGain(0)    // -60dB (near silence)
 * mapGain(0.5)  // -30dB (half volume in dB, not linear amplitude)
 * mapGain(1)    // 0dB (unity gain)
 */
export function mapGain(
  value: number,
  minDb: number = -60,
  maxDb: number = 0
): number {
  // Clamp input to valid range
  const v = Math.max(0, Math.min(1, value));

  // Linear mapping in dB space (logarithmic in linear amplitude)
  const db = minDb + v * (maxDb - minDb);

  debugLog(`mapGain(${value.toFixed(3)}) = ${db.toFixed(2)}dB`);

  return db;
}

/**
 * Convert decibels to linear gain value
 *
 * Web Audio API gain nodes use linear gain, not dB.
 * Use this to convert dB to linear for setting gain.value.
 *
 * @param db - Gain in decibels
 * @returns Linear gain value
 *
 * @example
 * dbToGain(-60)  // ~0.001 (near silence)
 * dbToGain(-20)  // 0.1 (10% amplitude)
 * dbToGain(0)    // 1.0 (unity gain)
 * dbToGain(6)    // ~2.0 (double amplitude)
 */
export function dbToGain(db: number): number {
  // gain = 10^(dB/20)
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain value to decibels
 *
 * @param gain - Linear gain value
 * @returns Gain in decibels
 *
 * @example
 * gainToDb(0.001)  // ~-60dB
 * gainToDb(0.1)    // -20dB
 * gainToDb(1.0)    // 0dB
 * gainToDb(2.0)    // ~6dB
 */
export function gainToDb(gain: number): number {
  // Clamp to prevent log(0) = -Infinity
  const g = Math.max(0.000001, gain);

  // dB = 20 * log10(gain)
  return 20 * Math.log10(g);
}

// ═══════════════════════════════════════════════════════════════════════════
// Time Mapping (Exponential for Natural Feel)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map normalized value (0-1) to time using exponential curve
 *
 * Exponential scaling provides natural-feeling time control.
 * Short times get more precision, long times still accessible.
 *
 * @param value - Normalized input (0-1)
 * @param minTime - Minimum time in seconds (default 0.001s = 1ms)
 * @param maxTime - Maximum time in seconds (default 10s)
 * @returns Time in seconds
 *
 * @example
 * mapTime(0)     // 0.001s (1ms, fast attack)
 * mapTime(0.5)   // ~0.1s (100ms, medium)
 * mapTime(1)     // 10s (long release)
 */
export function mapTime(
  value: number,
  minTime: number = 0.001,
  maxTime: number = 10
): number {
  // Clamp input to valid range
  const v = Math.max(0, Math.min(1, value));

  // Exponential mapping for natural time feel
  const time = minTime * Math.pow(maxTime / minTime, v);

  debugLog(`mapTime(${value.toFixed(3)}) = ${time.toFixed(4)}s`);

  return time;
}

// ═══════════════════════════════════════════════════════════════════════════
// Q Factor Mapping (Logarithmic for Filter Resonance)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map normalized value (0-1) to filter Q factor
 *
 * Logarithmic scaling for natural resonance control.
 * Low values (0.1-1) = gentle slope, high values (10-30) = narrow notch.
 *
 * @param value - Normalized input (0-1)
 * @param minQ - Minimum Q factor (default 0.1, very gentle)
 * @param maxQ - Maximum Q factor (default 30, very resonant)
 * @returns Q factor
 *
 * @example
 * mapQ(0)    // 0.1 (gentle slope, -6dB/octave feel)
 * mapQ(0.5)  // ~1.7 (moderate resonance)
 * mapQ(1)    // 30 (sharp notch, very resonant)
 */
export function mapQ(
  value: number,
  minQ: number = 0.1,
  maxQ: number = 30
): number {
  // Clamp input to valid range
  const v = Math.max(0, Math.min(1, value));

  // Exponential mapping for perceptual linearity
  const q = minQ * Math.pow(maxQ / minQ, v);

  debugLog(`mapQ(${value.toFixed(3)}) = ${q.toFixed(2)}`);

  return q;
}

// ═══════════════════════════════════════════════════════════════════════════
// Ratio Mapping (Logarithmic for Compression/Expansion)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map normalized value (0-1) to compression ratio
 *
 * Logarithmic scaling for natural compression control.
 * Common ratios: 1:1 (no compression), 2:1 (gentle), 4:1 (medium), 10:1 (heavy), 20:1 (limiting)
 *
 * @param value - Normalized input (0-1)
 * @param minRatio - Minimum ratio (default 1, no compression)
 * @param maxRatio - Maximum ratio (default 20, limiting)
 * @returns Compression ratio
 *
 * @example
 * mapRatio(0)    // 1:1 (no compression)
 * mapRatio(0.5)  // ~4.5:1 (medium compression)
 * mapRatio(1)    // 20:1 (heavy limiting)
 */
export function mapRatio(
  value: number,
  minRatio: number = 1,
  maxRatio: number = 20
): number {
  // Clamp input to valid range
  const v = Math.max(0, Math.min(1, value));

  // Exponential mapping for natural ratio progression
  const ratio = minRatio * Math.pow(maxRatio / minRatio, v);

  debugLog(`mapRatio(${value.toFixed(3)}) = ${ratio.toFixed(2)}:1`);

  return ratio;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility: Apply Curve with Smoothing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply parameter curve with smooth ramping
 *
 * Combines curve mapping with Tone.js parameter ramping for artifact-free changes.
 *
 * @param param - Tone.js AudioParam (e.g., filter.frequency)
 * @param value - Normalized input (0-1)
 * @param curveType - Type of curve to apply
 * @param rampTime - Ramp duration in seconds (default 0.05s = 50ms)
 *
 * @example
 * applyParamCurve(filter.frequency, 0.7, 'frequency', 0.05);
 * applyParamCurve(gain.gain, 0.5, 'gain', 0.1);
 */
export function applyParamCurve(
  param: any,
  value: number,
  curveType: 'frequency' | 'gain' | 'time' | 'q' | 'ratio',
  rampTime: number = 0.05
): void {
  let targetValue: number;

  switch (curveType) {
    case 'frequency':
      targetValue = mapFrequency(value);
      break;
    case 'gain':
      // Convert dB to linear gain for Web Audio API
      targetValue = dbToGain(mapGain(value));
      break;
    case 'time':
      targetValue = mapTime(value);
      break;
    case 'q':
      targetValue = mapQ(value);
      break;
    case 'ratio':
      targetValue = mapRatio(value);
      break;
    default:
      console.warn(`[Param Curves] Unknown curve type: ${curveType}`);
      return;
  }

  // Use rampTo for smooth parameter changes
  if (param && typeof param.rampTo === 'function') {
    param.rampTo(targetValue, rampTime);
  } else if (param && 'value' in param) {
    param.value = targetValue;
  }

  debugLog(
    `applyParamCurve: ${curveType}(${value.toFixed(3)}) = ${targetValue.toFixed(3)} over ${rampTime * 1000}ms`
  );
}
