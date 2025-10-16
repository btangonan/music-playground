import * as Tone from 'tone';

/**
 * @stub Functional minimal implementation - provides basic ambient texture
 * Minimal ambient layer using filtered noise.
 * Safe for headless use (no DOM dependencies).
 *
 * Future: Could expand with granular synthesis, sample-based pads, etc.
 */

/**
 * Creates a simple ambient layer using pink noise through a lowpass filter.
 *
 * @param _kind - Type of ambient layer (currently ignored, always noise)
 * @param _seed - Random seed for variation (currently ignored)
 * @param levelDb - Output level in decibels (default: -24dB)
 * @param lowpassHz - Lowpass filter cutoff frequency (default: 800Hz)
 * @param attackSec - Fade-in attack time in seconds (default: 0.3s)
 * @returns Connectable ambient layer object
 */
export function makeAmbientLayer(
  _kind: 'noise' | 'pad' = 'noise',
  _seed?: number,
  levelDb: number = -24,
  lowpassHz: number = 800,
  attackSec: number = 0.3
) {
  const noise = new Tone.Noise('pink');
  const filter = new Tone.Filter(lowpassHz, 'lowpass', -12);
  const gain = new Tone.Gain(Math.pow(10, levelDb / 20));

  // Chain: noise → filter → gain
  noise.chain(filter, gain);

  return {
    input: gain,
    output: gain,
    node: gain,
    connect(node: any) {
      // Tolerate anything with connect method
      if (node?.connect) gain.connect(node);
      return this;
    },
    start(time?: number) {
      noise.start(time);
      // Smooth fade-in if attack time specified
      if (attackSec > 0) {
        const targetGain = Math.pow(10, levelDb / 20);
        gain.gain.setValueAtTime(0, time || Tone.now());
        gain.gain.linearRampToValueAtTime(targetGain, (time || Tone.now()) + attackSec);
      }
    },
    stop(time?: number) {
      noise.stop(time);
    },
    setWet(_value: number) {
      // Stub: no-op for now
    },
    dispose() {
      noise.dispose();
      filter.dispose();
      gain.dispose();
    },
  };
}
