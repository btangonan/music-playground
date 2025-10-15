import * as Tone from 'tone';

/**
 * Gain Staging System - Professional Headroom Management
 *
 * Implements master limiter and trim controls for proper gain structure.
 * Prevents clipping and establishes industry-standard headroom targets.
 *
 * Benefits:
 * - Master limiter protects final output from clipping
 * - Trim controls allow +3/-12 dB adjustments at any stage
 * - Headroom targets: -6 dB for mix bus, -3 dB for master
 * - Smooth 50ms parameter ramping prevents zipper noise
 *
 * Pattern:
 * - Master limiter is singleton at final output stage
 * - All audio routes through limiter before Tone.Destination
 * - Trim controls can be inserted anywhere in signal chain
 *
 * Usage:
 * ```typescript
 * import { initializeMasterLimiter, createTrim, MasterLimiter } from './gain-staging';
 *
 * // Initialize master limiter once at startup
 * await initializeMasterLimiter();
 *
 * // Route audio through master limiter instead of toDestination()
 * instrument.connect(MasterLimiter.limiter);
 *
 * // Add trim controls at any stage
 * const trim = createTrim(-3); // -3 dB trim
 * instrument.connect(trim).connect(effect);
 * setTrimLevel(trim, -6); // Adjust to -6 dB
 * ```
 */

declare global {
  interface Window {
    LL_DEBUG_GAIN_STAGING?: number;
  }
}

function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.LL_DEBUG_GAIN_STAGING) {
    console.log('[Gain Staging]', ...args);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Master Limiter Singleton
// ═══════════════════════════════════════════════════════════════════════════

interface MasterLimiterConfig {
  limiter: Tone.Limiter;
  threshold: number; // dB
  initialized: boolean;
}

let masterLimiter: MasterLimiterConfig | null = null;

/**
 * Initialize master limiter at final output stage
 *
 * Sets up a Tone.Limiter with -3 dB threshold (professional headroom target)
 * connected to Tone.Destination. All audio should route through this limiter.
 *
 * @returns Promise that resolves when limiter is initialized
 *
 * @example
 * await initializeMasterLimiter();
 * instrument.connect(MasterLimiter.limiter); // Route through master limiter
 */
export async function initializeMasterLimiter(): Promise<void> {
  if (masterLimiter?.initialized) {
    debugLog('Master limiter already initialized');
    return;
  }

  debugLog('Initializing master limiter...');

  // Create limiter with -3 dB threshold (professional headroom target)
  const limiter = new Tone.Limiter(-3).toDestination();

  masterLimiter = {
    limiter,
    threshold: -3,
    initialized: true
  };

  debugLog('Master limiter initialized:', {
    threshold: -3,
    reduction: limiter.reduction
  });
}

/**
 * Set master limiter threshold
 *
 * @param thresholdDb - Threshold in decibels (-20 to 0 dB)
 *
 * @example
 * setMasterLimiterThreshold(-6); // -6 dB threshold for extra headroom
 */
export function setMasterLimiterThreshold(thresholdDb: number): void {
  if (!masterLimiter) {
    console.warn('[Gain Staging] Master limiter not initialized yet');
    return;
  }

  // Clamp to safe range (-20 to 0 dB)
  const safeThreshold = Math.max(-20, Math.min(0, thresholdDb));

  // Use rampTo for smooth parameter changes (50ms)
  masterLimiter.limiter.threshold.rampTo(safeThreshold, 0.05);
  masterLimiter.threshold = safeThreshold;

  debugLog(`Set master limiter threshold to ${safeThreshold.toFixed(1)} dB`);
}

/**
 * Get current master limiter gain reduction
 *
 * @returns Current gain reduction in decibels (0 or negative value)
 */
export function getMasterLimiterReduction(): number {
  if (!masterLimiter) return 0;
  return masterLimiter.limiter.reduction;
}

/**
 * Check if master limiter is initialized
 *
 * @returns True if master limiter is ready
 */
export function isMasterLimiterInitialized(): boolean {
  return masterLimiter?.initialized ?? false;
}

/**
 * Dispose master limiter (cleanup on app shutdown)
 */
export function disposeMasterLimiter(): void {
  if (!masterLimiter) return;

  debugLog('Disposing master limiter...');
  masterLimiter.limiter.dispose();
  masterLimiter = null;
  debugLog('Master limiter disposed');
}

// ═══════════════════════════════════════════════════════════════════════════
// Export master limiter for global access
// ═══════════════════════════════════════════════════════════════════════════

export const MasterLimiter = {
  get limiter() {
    if (!masterLimiter) {
      throw new Error('[Gain Staging] Master limiter not initialized. Call initializeMasterLimiter() first.');
    }
    return masterLimiter.limiter;
  },
  get threshold() {
    return masterLimiter?.threshold ?? -3;
  },
  get reduction() {
    return masterLimiter?.limiter.reduction ?? 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Trim Controls (+3/-12 dB range)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create trim gain control
 *
 * Returns a Tone.Gain node with +3/-12 dB range for inter-stage level control.
 * Use these to balance levels between processing stages.
 *
 * @param initialDb - Initial trim level in decibels (-12 to +3 dB, default 0)
 * @returns Tone.Gain node configured as trim control
 *
 * @example
 * const trim = createTrim(-3); // -3 dB trim
 * instrument.connect(trim).connect(reverb);
 * setTrimLevel(trim, -6); // Adjust to -6 dB later
 */
export function createTrim(initialDb: number = 0): Tone.Gain {
  // Clamp to professional trim range (-12 to +3 dB)
  const safeDb = Math.max(-12, Math.min(3, initialDb));

  // Convert dB to gain (gain = 10^(dB/20))
  const initialGain = Math.pow(10, safeDb / 20);

  const trim = new Tone.Gain(initialGain);

  debugLog(`Created trim control at ${safeDb.toFixed(1)} dB (gain: ${initialGain.toFixed(3)})`);

  return trim;
}

/**
 * Set trim level with smooth ramping
 *
 * @param trim - Tone.Gain node created by createTrim()
 * @param levelDb - New trim level in decibels (-12 to +3 dB)
 * @param rampTime - Ramp time in seconds (default 0.05 = 50ms)
 *
 * @example
 * setTrimLevel(trim, -6, 0.1); // Ramp to -6 dB over 100ms
 */
export function setTrimLevel(trim: Tone.Gain, levelDb: number, rampTime: number = 0.05): void {
  // Clamp to professional trim range (-12 to +3 dB)
  const safeDb = Math.max(-12, Math.min(3, levelDb));

  // Convert dB to gain (gain = 10^(dB/20))
  const targetGain = Math.pow(10, safeDb / 20);

  // Use rampTo for smooth parameter changes
  trim.gain.rampTo(targetGain, rampTime);

  debugLog(`Set trim level to ${safeDb.toFixed(1)} dB (gain: ${targetGain.toFixed(3)}) over ${rampTime * 1000}ms`);
}

/**
 * Get current trim level in decibels
 *
 * @param trim - Tone.Gain node created by createTrim()
 * @returns Current trim level in decibels
 */
export function getTrimLevel(trim: Tone.Gain): number {
  const gain = trim.gain.value;
  // Convert gain to dB (dB = 20 * log10(gain))
  const db = 20 * Math.log10(gain);
  return db;
}

// ═══════════════════════════════════════════════════════════════════════════
// Headroom Monitoring Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Headroom targets for professional mixing
 */
export const HeadroomTargets = {
  MIX_BUS: -6,    // dB - Target for mix bus (before master)
  MASTER: -3,     // dB - Target for master (before limiter)
  INSTRUMENT: -12, // dB - Target for individual instrument outputs
  EFFECT_SEND: -18 // dB - Target for effect send levels
} as const;

/**
 * Check if signal is within target headroom
 *
 * @param currentDb - Current signal level in decibels
 * @param target - Target headroom level (from HeadroomTargets)
 * @returns True if signal is at or below target
 *
 * @example
 * if (!isWithinHeadroom(-2, HeadroomTargets.MASTER)) {
 *   console.warn('Master level too hot! Reduce gain.');
 * }
 */
export function isWithinHeadroom(currentDb: number, target: number): boolean {
  return currentDb <= target;
}

/**
 * Calculate headroom margin (how much headroom is available)
 *
 * @param currentDb - Current signal level in decibels
 * @param target - Target headroom level (from HeadroomTargets)
 * @returns Headroom margin in decibels (positive = safe, negative = too hot)
 *
 * @example
 * const margin = calculateHeadroomMargin(-2, HeadroomTargets.MASTER);
 * console.log(`${margin > 0 ? 'Safe' : 'Too hot'}: ${Math.abs(margin).toFixed(1)} dB`);
 */
export function calculateHeadroomMargin(currentDb: number, target: number): number {
  return target - currentDb;
}
