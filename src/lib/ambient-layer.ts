import * as Tone from 'tone';

/**
 * Ambient Texture Layer
 *
 * Provides continuous textured background layer using pink noise or audio samples
 * for atmospheric depth. Ideal for Radiohead-style ambient pads and soundscapes.
 *
 * Technical Implementation:
 * - Pink noise generator with configurable filtering
 * - Optional audio sample playback with loop capability
 * - Wet/dry balance for mixing with main signal
 * - Low-pass filtering for taming high frequencies
 *
 * Usage:
 * - Radiohead ambient textures: Pink noise + low-pass + reverb
 * - Atmospheric pads: Sustained sample loops with filtering
 * - Background texture: Low volume (-24dB) continuous layer
 */

declare global {
  interface Window {
    LL_DEBUG_AMBIENT?: number;
  }
}

function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.LL_DEBUG_AMBIENT) {
    console.log('[Ambient]', ...args);
  }
}

export interface AmbientLayerConfig {
  input: Tone.Gain;
  output: Tone.Gain;
  start: () => void;
  stop: () => void;
  setVolume: (db: number) => void;
  setFilterFreq: (hz: number) => void;
  setWet: (amount: number) => void;
  dispose: () => void;
}

export type AmbientSourceType = 'noise' | 'sample';

/**
 * Create ambient texture layer processor
 *
 * @param sourceType - Type of ambient source ('noise' or 'sample')
 * @param sampleUrl - Optional URL for sample-based ambient layer
 * @param initialVolume - Initial volume in dB (default -24)
 * @param initialFilterFreq - Initial low-pass filter frequency in Hz (default 800)
 * @param initialWet - Initial wet/dry balance 0-1 (default 0.3)
 * @returns Ambient layer processor with start/stop/control methods
 */
export function makeAmbientLayer(
  sourceType: AmbientSourceType = 'noise',
  sampleUrl?: string,
  initialVolume = -24,
  initialFilterFreq = 800,
  initialWet = 0.3
): AmbientLayerConfig {
  debugLog('Creating ambient layer:', { sourceType, sampleUrl, initialVolume, initialFilterFreq, initialWet });

  // IO nodes
  const input = new Tone.Gain(1);
  const output = new Tone.Gain(1);

  // Wet/dry routing
  const dryGain = new Tone.Gain(1 - initialWet);
  const wetGain = new Tone.Gain(initialWet);
  const mix = new Tone.Gain(1);

  // Ambient source setup
  let source: Tone.Noise | Tone.Player | null = null;
  const sourceGain = new Tone.Gain(Tone.dbToGain(initialVolume));
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: initialFilterFreq,
    Q: 1
  });

  if (sourceType === 'noise') {
    // Pink noise for natural texture
    source = new Tone.Noise('pink');
    debugLog('Created pink noise source');
  } else if (sourceType === 'sample' && sampleUrl) {
    // Audio sample player with looping
    source = new Tone.Player({
      url: sampleUrl,
      loop: true,
      fadeIn: 1,
      fadeOut: 1
    });
    debugLog('Created sample player:', sampleUrl);
  } else {
    // Fallback to pink noise if sample URL missing
    source = new Tone.Noise('pink');
    debugLog('Fallback to pink noise (missing sample URL)');
  }

  // Routing
  // Dry path: input → dryGain → mix
  input.connect(dryGain);
  dryGain.connect(mix);

  // Wet path: source → sourceGain → filter → wetGain → mix
  source.connect(sourceGain);
  sourceGain.connect(filter);
  filter.connect(wetGain);
  wetGain.connect(mix);

  // Output
  mix.connect(output);

  function start() {
    debugLog('Starting ambient layer');
    if (source && 'start' in source) {
      source.start();
    }
  }

  function stop() {
    debugLog('Stopping ambient layer');
    if (source && 'stop' in source) {
      source.stop();
    }
  }

  function setVolume(db: number) {
    // Clamp to safe range -60 to 0 dB
    const safeDb = Math.max(-60, Math.min(0, db));
    debugLog('Setting ambient volume to:', safeDb, 'dB');
    sourceGain.gain.rampTo(Tone.dbToGain(safeDb), 0.1);
  }

  function setFilterFreq(hz: number) {
    // Clamp to safe range 20 to 20000 Hz
    const safeHz = Math.max(20, Math.min(20000, hz));
    debugLog('Setting filter frequency to:', safeHz, 'Hz');
    filter.frequency.rampTo(safeHz, 0.05);
  }

  function setWet(amount: number) {
    // Clamp to 0-1 range
    const safeAmount = Math.max(0, Math.min(1, amount));
    debugLog('Setting wet/dry balance to:', safeAmount);
    wetGain.gain.rampTo(safeAmount, 0.05);
    dryGain.gain.rampTo(1 - safeAmount, 0.05);
  }

  function dispose() {
    debugLog('Disposing ambient layer');
    stop();
    input.dispose();
    output.dispose();
    dryGain.dispose();
    wetGain.dispose();
    mix.dispose();
    sourceGain.dispose();
    filter.dispose();
    if (source) {
      source.dispose();
    }
  }

  return {
    input,
    output,
    start,
    stop,
    setVolume,
    setFilterFreq,
    setWet,
    dispose
  };
}
