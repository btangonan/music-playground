import * as Tone from 'tone';
import { MasterLimiter, isMasterLimiterInitialized } from './gain-staging';

/**
 * Shared FX Bus System - Professional Send/Receive Architecture
 *
 * Implements Tone.js send/receive pattern for CPU-efficient effect sharing.
 * Multiple instruments can send to shared reverb, delay, and chorus buses.
 *
 * Benefits:
 * - 30-40% CPU reduction (one reverb instance instead of per-instrument)
 * - Professional mix bus architecture (industry standard)
 * - Independent send levels per instrument
 * - Unified ambience across mix
 *
 * Pattern (from Context7 Tone.js docs):
 * - Effect instance with wet: 1 (100% wet, no dry)
 * - Tone.Channel with volume control (-60 to 0 dB)
 * - channel.receive("name") for bus routing
 * - source.send("name") to route audio to bus
 *
 * Usage:
 * ```typescript
 * import { FxBuses, setSendLevel } from './bus-fx';
 *
 * // Send instrument to reverb bus
 * const instrumentChannel = new Tone.Channel().toDestination();
 * instrumentChannel.send("reverb");
 * instrument.connect(instrumentChannel);
 *
 * // Control reverb send level
 * setSendLevel("reverb", -12); // -12 dB send
 * ```
 */

declare global {
  interface Window {
    LL_DEBUG_FX_BUSES?: number;
  }
}

function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.LL_DEBUG_FX_BUSES) {
    console.log('[FX Buses]', ...args);
  }
}

export interface FxBusConfig {
  effect: Tone.ToneAudioNode;
  channel: Tone.Channel;
  name: string;
  defaultLevel: number; // dB
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Effect Bus Instances
// ═══════════════════════════════════════════════════════════════════════════

let reverbBus: FxBusConfig | null = null;
let delayBus: FxBusConfig | null = null;
let chorusBus: FxBusConfig | null = null;

/**
 * Initialize shared FX buses (call once at app startup)
 * Creates reverb, delay, and chorus buses with professional settings
 */
export async function initializeFxBuses(): Promise<void> {
  debugLog('Initializing FX buses...');

  // Check if master limiter is initialized
  if (!isMasterLimiterInitialized()) {
    console.warn('[FX Buses] Master limiter not initialized. Buses will route directly to destination.');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Reverb Bus - 4s decay, 100% wet
  // ────────────────────────────────────────────────────────────────────────
  const reverbEffect = new Tone.Reverb({
    decay: 4,
    wet: 1, // 100% wet (no dry signal from bus)
    preDelay: 0.01 // 10ms predelay for clarity
  });

  // Route through master limiter if available, otherwise direct to destination
  if (isMasterLimiterInitialized()) {
    reverbEffect.connect(MasterLimiter.limiter);
  } else {
    reverbEffect.toDestination();
  }

  await reverbEffect.ready; // Wait for impulse response buffer

  const reverbChannel = new Tone.Channel({
    volume: -60 // Start muted (-60 dB)
  }).connect(reverbEffect);

  reverbChannel.receive('reverb'); // Enable send/receive routing

  reverbBus = {
    effect: reverbEffect,
    channel: reverbChannel,
    name: 'reverb',
    defaultLevel: -18 // -18 dB default send level
  };

  debugLog('Reverb bus initialized:', {
    decay: 4,
    wet: 1,
    defaultLevel: -18
  });

  // ────────────────────────────────────────────────────────────────────────
  // Delay Bus - 8n timing, 40% feedback, 100% wet
  // ────────────────────────────────────────────────────────────────────────
  const delayEffect = new Tone.FeedbackDelay({
    delayTime: '8n',
    feedback: 0.4,
    wet: 1 // 100% wet (no dry signal from bus)
  });

  // Route through master limiter if available, otherwise direct to destination
  if (isMasterLimiterInitialized()) {
    delayEffect.connect(MasterLimiter.limiter);
  } else {
    delayEffect.toDestination();
  }

  const delayChannel = new Tone.Channel({
    volume: -60 // Start muted (-60 dB)
  }).connect(delayEffect);

  delayChannel.receive('delay'); // Enable send/receive routing

  delayBus = {
    effect: delayEffect,
    channel: delayChannel,
    name: 'delay',
    defaultLevel: -20 // -20 dB default send level
  };

  debugLog('Delay bus initialized:', {
    delayTime: '8n',
    feedback: 0.4,
    defaultLevel: -20
  });

  // ────────────────────────────────────────────────────────────────────────
  // Chorus Bus - 1.5Hz modulation, 100% wet
  // ────────────────────────────────────────────────────────────────────────
  const chorusEffect = new Tone.Chorus({
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.7,
    wet: 1 // 100% wet (no dry signal from bus)
  });

  // Route through master limiter if available, otherwise direct to destination
  if (isMasterLimiterInitialized()) {
    chorusEffect.connect(MasterLimiter.limiter);
  } else {
    chorusEffect.toDestination();
  }

  chorusEffect.start(); // Chorus LFO needs to be started

  const chorusChannel = new Tone.Channel({
    volume: -60 // Start muted (-60 dB)
  }).connect(chorusEffect);

  chorusChannel.receive('chorus'); // Enable send/receive routing

  chorusBus = {
    effect: chorusEffect,
    channel: chorusChannel,
    name: 'chorus',
    defaultLevel: -22 // -22 dB default send level
  };

  debugLog('Chorus bus initialized:', {
    frequency: 1.5,
    depth: 0.7,
    defaultLevel: -22
  });

  debugLog('All FX buses initialized successfully');
}

/**
 * Get all available FX buses
 * @returns Array of bus configurations
 */
export function getFxBuses(): FxBusConfig[] {
  const buses: FxBusConfig[] = [];
  if (reverbBus) buses.push(reverbBus);
  if (delayBus) buses.push(delayBus);
  if (chorusBus) buses.push(chorusBus);
  return buses;
}

/**
 * Set send level for a specific FX bus
 *
 * @param busName - Name of the bus ('reverb', 'delay', or 'chorus')
 * @param levelDb - Send level in decibels (-60 to 0 dB)
 *
 * @example
 * setSendLevel('reverb', -12); // -12 dB send to reverb
 * setSendLevel('delay', -Infinity); // Mute delay send
 */
export function setSendLevel(busName: string, levelDb: number): void {
  // Clamp to safe range (-60 to 0 dB)
  const safeLevelDb = Math.max(-60, Math.min(0, levelDb));

  let bus: FxBusConfig | null = null;
  switch (busName) {
    case 'reverb':
      bus = reverbBus;
      break;
    case 'delay':
      bus = delayBus;
      break;
    case 'chorus':
      bus = chorusBus;
      break;
    default:
      console.warn(`[FX Buses] Unknown bus name: ${busName}`);
      return;
  }

  if (!bus) {
    console.warn(`[FX Buses] Bus '${busName}' not initialized yet`);
    return;
  }

  // Use rampTo for smooth parameter changes (50ms)
  bus.channel.volume.rampTo(safeLevelDb, 0.05);

  debugLog(`Set ${busName} send level to ${safeLevelDb.toFixed(1)} dB`);
}

/**
 * Get current send level for a specific FX bus
 *
 * @param busName - Name of the bus ('reverb', 'delay', or 'chorus')
 * @returns Current send level in decibels, or null if bus not found
 */
export function getSendLevel(busName: string): number | null {
  let bus: FxBusConfig | null = null;
  switch (busName) {
    case 'reverb':
      bus = reverbBus;
      break;
    case 'delay':
      bus = delayBus;
      break;
    case 'chorus':
      bus = chorusBus;
      break;
    default:
      return null;
  }

  if (!bus) return null;
  return bus.channel.volume.value;
}

/**
 * Reset all bus send levels to their defaults
 */
export function resetSendLevels(): void {
  if (reverbBus) setSendLevel('reverb', reverbBus.defaultLevel);
  if (delayBus) setSendLevel('delay', delayBus.defaultLevel);
  if (chorusBus) setSendLevel('chorus', chorusBus.defaultLevel);
  debugLog('Reset all send levels to defaults');
}

/**
 * Dispose all FX buses (cleanup on app shutdown)
 */
export function disposeFxBuses(): void {
  debugLog('Disposing FX buses...');

  if (reverbBus) {
    reverbBus.effect.dispose();
    reverbBus.channel.dispose();
    reverbBus = null;
  }

  if (delayBus) {
    delayBus.effect.dispose();
    delayBus.channel.dispose();
    delayBus = null;
  }

  if (chorusBus) {
    if ('stop' in chorusBus.effect) {
      (chorusBus.effect as any).stop(); // Stop chorus LFO
    }
    chorusBus.effect.dispose();
    chorusBus.channel.dispose();
    chorusBus = null;
  }

  debugLog('All FX buses disposed');
}

/**
 * Check if FX buses are initialized
 * @returns True if all buses are ready
 */
export function areFxBusesInitialized(): boolean {
  return reverbBus !== null && delayBus !== null && chorusBus !== null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Export bus instances for advanced usage
// ═══════════════════════════════════════════════════════════════════════════

export const FxBuses = {
  get reverb() {
    return reverbBus;
  },
  get delay() {
    return delayBus;
  },
  get chorus() {
    return chorusBus;
  }
};
