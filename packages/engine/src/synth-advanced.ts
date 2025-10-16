import * as Tone from 'tone';

/**
 * @stub Minimal implementation - TODO: Full advanced synth in v2
 * Placeholder for advanced synthesizer instruments.
 * Currently returns a simple Gain node wrapper to satisfy imports.
 */

export type InstrumentOpts = {
  preset?: string;
  volume?: number;
};

/**
 * Minimal stub of an advanced instrument.
 * Returns a connectable Tone.js Gain node with fluent API matching audio-engine.ts requirements.
 *
 * @param _name - Instrument name (ignored in stub)
 * @param opts - Optional configuration
 * @returns Connectable instrument-like object with out, synth, triggerOn, triggerOff, play
 */
export function makeInstrumentV2(_name: string, opts?: InstrumentOpts) {
  const gain = new Tone.Gain(1);

  // Apply volume if specified (dB to linear conversion)
  if (typeof opts?.volume === 'number') {
    const db = opts.volume;
    gain.gain.value = Math.pow(10, db / 20);
  }

  return {
    out: gain,
    synth: undefined, // Stub: no actual synth
    output: gain, // For internal use
    triggerOn: (_note: string, _time?: number) => {
      /* noop - no actual sound generation */
    },
    triggerOff: (_note?: string, _time?: number) => {
      /* noop */
    },
    play: (_note: string, _duration?: string, _time?: number) => {
      /* noop - no actual sound generation */
    },
    connect(node: any) {
      // Tolerate anything with connect method
      if (node?.connect) gain.connect(node);
      return this;
    },
    start() {
      /* noop */
    },
    stop() {
      /* noop */
    },
    dispose() {
      gain.dispose();
    },
  };
}
