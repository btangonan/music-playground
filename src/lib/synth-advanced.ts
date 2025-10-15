import * as Tone from 'tone';

export type AdvancedOpts = { flavor?: string; polyphony?: number; voice?: any };

export function makeInstrumentV2(
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate',
  opts: AdvancedOpts = {}
) {
  if (kind === 'pad_gate') {
    // Use MonoSynth for per-voice filter + filterEnvelope, wrapped in PolySynth for polyphony
    const voices = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'triangle' },
      filter: { type: 'lowpass', Q: 0.5, rolloff: -24 },
      filterEnvelope: {
        attack: 0.12,
        decay: 0.5,
        sustain: 0.8,
        release: 1.8,
        baseFrequency: 250,
        octaves: 3
      },
      envelope: { attack: 0.12, decay: 0.25, sustain: 0.9, release: 2.2 }
    });
    voices.maxPolyphony = opts.polyphony ?? 32; // Increased from 8 to prevent "Note dropped" errors

    // Subtle slow motion
    const vibrato = new Tone.Vibrato({ frequency: 0.3, depth: 0.03, wet: 0.5 });
    const chorus = new Tone.Chorus({ frequency: 0.18, depth: 0.25, delayTime: 3.5, wet: 0.25 }).start();

    // Gentle top smoothing to avoid brittle highs
    const airLP = new Tone.Filter({ type: 'lowpass', frequency: 6500, Q: 0 });

    const out = new Tone.Gain(1);

    // Chain: voices → vibrato → chorus → airLP → out
    voices.chain(vibrato, chorus, airLP, out);

    return {
      kind: 'pad_gate',
      out,
      synth: voices,
      triggerOn(note: string, time?: number) {
        voices.triggerAttack(note, time);
      },
      triggerOff(note?: string, time?: number) {
        voices.triggerRelease(note, time);
      },
      play(note: string, duration = '8n', time?: number) {
        voices.triggerAttackRelease(note, duration, time);
      },
      dispose() {
        voices.dispose();
        vibrato.dispose();
        chorus.dispose();
        airLP.dispose();
        out.dispose();
      }
    };
  }

  throw new Error('Unsupported kind for makeInstrumentV2: ' + kind);
}
