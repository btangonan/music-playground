import * as Tone from 'tone';
import { makeInstrumentV2 } from './synth-advanced';
import {
  initializeFxBuses,
  setSendLevel,
  getSendLevel,
  resetSendLevels,
  disposeFxBuses,
  areFxBusesInitialized,
  FxBuses,
  type FxBusConfig
} from './bus-fx';
import {
  mapFrequency,
  mapGain,
  mapTime,
  mapQ,
  mapRatio,
  dbToGain
} from './param-curves';

export interface InstrumentConfig {
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate';
  color: string;
  out: Tone.Gain;
  synth?: Tone.PolySynth | Tone.MonoSynth | Tone.Players;
  triggerOn?: (note: string, time?: number) => void;
  triggerOff?: (note?: string, time?: number) => void;
  play: (note: string, duration?: string, time?: number) => void;
  _debugAnalyser?: Tone.Analyser;
  _debugInterval?: NodeJS.Timeout | null;
}

export interface EffectConfig {
  type: string;
  input: Tone.Gain;
  output: Tone.Gain;
  node: any;
  set: (value: number) => void;
}

// === NEW: DeviceTrackRef abstraction =======================================
export type DeviceKind = 'instrument' | 'sampler';
export interface DeviceTrackRef {
  kind: DeviceKind;
  id: string;
  out: Tone.Gain;
}
// ===========================================================================

// Master bus
export const Bus = {
  master: new Tone.Gain(1).toDestination(),
  recordTap: new Tone.Gain(1),
  kick: new Tone.Gain(1),      // Sidechain trigger tap for ducking
  ambient: new Tone.Gain(1)    // Target tap for ducking (pads, reverb)
};

const dest = new Tone.Gain(1).connect(Bus.master);
Bus.recordTap.connect(dest);

// Recording
let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

export function startRec() {
  if (mediaRecorder?.state === 'recording') return;
  const stream = (Tone.getContext() as any).createMediaStreamDestination();
  Bus.master.connect(stream);
  mediaRecorder = new MediaRecorder(stream.stream);
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/wav' });
    chunks = [];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harmonic-sketch.wav';
    a.click();
    URL.revokeObjectURL(url);
  };
  mediaRecorder.start();
}

export function stopRec() {
  mediaRecorder?.stop();
}

// ---- Trigger helpers -------------------------------------------------------
export function trigger(kind: 'keys'|'bass'|'drums'|'pad_gate', synth: any, payload: string, time?: any) {
  if (kind === 'drums') {
    const name = payload as any;
    if (synth?.has?.(name)) synth.player(name).start(time);
    return;
  }
  const note = payload || (kind === 'bass' ? 'C2' : 'C4');
  const dur = '8n';
  if ('triggerAttackRelease' in synth) synth.triggerAttackRelease(note, dur, time);
}

// ---- Per-track loop (16 steps) ---------------------------------------------
export function createTrackLoop(
  kind: 'keys'|'bass'|'drums'|'pad_gate',
  synth: any,
  steps: boolean[],
  onStep: (index:number)=>void,
  shouldTrigger?: (index:number)=>boolean
) {
  const events = Array.from({length:16}, (_,i)=>({ time: `${i}*8n`, index:i }));
  const part = new Tone.Part((time, ev:any) => {
    onStep(ev.index);
    const ok = shouldTrigger ? shouldTrigger(ev.index) : true;
    if (ok && steps[ev.index]) {
      const defaultNote = kind === 'bass' ? 'C2' : (kind === 'keys' || kind === 'pad_gate' ? 'C4' : 'kick');
      trigger(kind, synth, defaultNote, time);
    }
  }, events);
  part.loop = true;
  part.loopEnd = '2m'; // 16 * 8n
  return part;
}

// ---- Per-pad loop (16 steps) - for MPC pad system -------------------------
export function createPadLoop(
  kind: 'keys'|'bass'|'drums'|'pad_gate',
  synth: any,
  steps: boolean[],
  onStep: (index:number)=>void,
  shouldTrigger?: (index:number)=>boolean
) {
  const events = Array.from({length:16}, (_,i)=>({ time: `${i}*8n`, index:i }));
  const part = new Tone.Part((time, ev:any) => {
    onStep(ev.index);
    const ok = shouldTrigger ? shouldTrigger(ev.index) : true;
    if (ok && steps[ev.index]) {
      const defaultNote = kind === 'bass' ? 'C2' : (kind === 'keys' || kind === 'pad_gate' ? 'C4' : 'kick');
      trigger(kind, synth, defaultNote, time);
    }
  }, events);
  part.loop = true;
  part.loopEnd = '2m'; // 16 * 8n
  return part;
}

// Instrument factory
export function makeInstrument(kind: 'keys' | 'bass' | 'drums' | 'pad_gate', opts?: any): InstrumentConfig {
  const out = new Tone.Gain(1);

  if (kind === 'pad_gate') {
    const inst = makeInstrumentV2('pad_gate', opts);

    return {
      kind,
      color: '#c77dff',
      out: inst.out,
      synth: inst.synth,
      triggerOn: inst.triggerOn,
      triggerOff: inst.triggerOff,
      play: inst.play
    };
  }

  if (kind === 'keys') {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 }
    }).connect(out);

    // DEBUG: Add analyser to instrument output to verify audio generation
    const DEV = process.env.NODE_ENV !== 'production';
    const instrumentAnalyser = DEV ? new Tone.Analyser('waveform', 2048) : undefined;
    if (instrumentAnalyser) {
      out.connect(instrumentAnalyser);
    }

    // DEBUG: Monitor instrument output RMS every 500ms
    let debugInterval: NodeJS.Timeout | null = null;
    if (DEV && typeof globalThis !== 'undefined' && (globalThis as any).LL_DEBUG_REVERSE_REVERB && instrumentAnalyser) {
      debugInterval = setInterval(() => {
        const waveform = instrumentAnalyser.getValue() as Float32Array;
        let sum = 0;
        for (let i = 0; i < waveform.length; i++) {
          const sample = waveform[i] as number;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / waveform.length);
        globalThis.console.log('[Keys Instrument] Output RMS:', rms.toFixed(6));
      }, 500);
    }

    return {
      kind,
      color: '#54d7ff',
      out,
      synth,
      play: (note: string, duration = '8n', time?: number) => {
        synth.triggerAttackRelease(note, duration, time);

        // DEBUG: Log note trigger and check RMS immediately after
        if (DEV && typeof globalThis !== 'undefined' && (globalThis as any).LL_DEBUG_REVERSE_REVERB && instrumentAnalyser) {
          globalThis.console.log('[Keys Instrument] Note triggered:', note, duration);

          // Check RMS immediately (after a brief delay to let audio start)
          setTimeout(() => {
            const waveform = instrumentAnalyser.getValue() as Float32Array;
            let sum = 0;
            for (let i = 0; i < waveform.length; i++) {
              const sample = waveform[i] as number;
              sum += sample * sample;
            }
            const rms = Math.sqrt(sum / waveform.length);
            globalThis.console.log('[Keys Instrument] Output RMS after note trigger:', rms.toFixed(6));
          }, 50); // 50ms delay to let envelope attack
        }
      },
      // Expose debug resources for cleanup
      _debugAnalyser: instrumentAnalyser,
      _debugInterval: debugInterval
    };
  }

  if (kind === 'bass') {
    const synth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.2 },
      filter: { Q: 2 }
    }).connect(out);

    return {
      kind,
      color: '#ffe45e',
      out,
      synth,
      play: (note: string, duration = '8n', time?: number) => {
        synth.triggerAttackRelease(note, duration, time);
      }
    };
  }

  if (kind === 'drums') {
    const players = new Tone.Players({
      kick: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
      snare: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
      hihat: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3'
    }).connect(out);

    return {
      kind,
      color: '#7cffcb',
      out,
      synth: players,
      play: (name = 'kick', duration?: string, time?: number) => {
        if (players.has(name)) {
          players.player(name).start(time);
        }
      }
    };
  }

  return makeInstrument('keys');
}

// Effect factory
export async function makeEffect(type: string): Promise<EffectConfig> {
  const input = new Tone.Gain(1);
  const output = new Tone.Gain(1);

  let node: any;

  switch (type) {
    case 'space':
      node = new Tone.Reverb({ decay: 3, wet: 0.35 });
      await node.ready; // Wait for impulse response buffer initialization
      break;
    case 'echo':
      node = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.35, wet: 0.4 });
      break;
    case 'fuzz':
      node = new Tone.Distortion({ distortion: 0.6, wet: 0.5 });
      break;
    case 'crush':
      node = new Tone.BitCrusher({ bits: 4 });
      break;
    case 'ring':
      node = new Tone.Distortion({ distortion: 0.5 });
      break;
    case 'filter':
      node = new Tone.Filter({ type: 'lowpass', frequency: 1200, Q: 1 });
      break;
    case 'vibrato':
      node = new Tone.Vibrato({ frequency: 4, depth: 0.4 });
      break;

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Artist Sound Pack Effects (9 effects)
    // ═══════════════════════════════════════════════════════════════════════
    case 'chorus':
      node = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 });
      node.start(); // Chorus needs to be started
      break;
    case 'tremolo':
      node = new Tone.Tremolo({ frequency: 4, depth: 0.5, wet: 0.5 });
      node.start(); // Tremolo needs to be started
      break;
    case 'shimmer': {
      // Dual-path shimmer: pitched-dry tap + reverb'd-pitched with clarity
      // Architecture: dry + pitched-dry (HPF) + reverb'd-pitched (predelay + HPF)
      const shimmerReverb = new Tone.Reverb({ decay: 4, wet: 1 });
      await shimmerReverb.ready;

      const pitchShift = new (Tone as any).PitchShift({
        pitch: 12, // +1 octave
        windowSize: 0.035, // Smaller window for fewer artifacts
        feedback: 0, // We'll control feedback externally
        wet: 1
      });

      // NEW: High-pass filter to prevent mud on pitched signal
      const hpf = new Tone.Filter({
        type: 'highpass',
        frequency: 240, // Remove low-end mud from shimmer
        Q: 1
      });

      // NEW: Predelay before reverb for spatial clarity
      const predelay = new Tone.Delay(0.025); // 25ms predelay

      // Gain nodes
      const feedbackGain = new Tone.Gain(0.2); // Gentle feedback to prevent runaway
      const wetGain = new Tone.Gain(0.4); // Overall reverb'd shimmer wetness
      const pitchDryGain = new Tone.Gain(0.15); // NEW: Direct pitched signal for clarity
      const dryGain = new Tone.Gain(0.6); // Dry signal
      const shimmerMix = new Tone.Gain(1); // Final mix

      // Routing: input -> [dry path, pitched-dry path, reverb'd-pitched path] -> mix -> output
      // Dry path: input -> dry -> mix
      input.connect(dryGain);
      dryGain.connect(shimmerMix);

      // Shimmer path: input -> pitchShift -> [HPF] -> [pitched-dry, predelay+reverb] -> mix
      input.connect(pitchShift);

      // NEW: Pitched-dry path (immediate clarity)
      pitchShift.connect(hpf);
      hpf.connect(pitchDryGain);
      pitchDryGain.connect(shimmerMix);

      // Reverb'd-pitched path (bloom)
      hpf.connect(predelay);
      predelay.connect(shimmerReverb);
      shimmerReverb.connect(wetGain);
      wetGain.connect(shimmerMix);

      // Feedback loop (prevent runaway with low gain)
      shimmerReverb.connect(feedbackGain);
      feedbackGain.connect(pitchShift);

      shimmerMix.connect(output);

      node = {
        type: 'shimmer',
        pitchShift,
        reverb: shimmerReverb,
        hpf,
        predelay,
        feedbackGain,
        wetGain,
        pitchDryGain,
        dryGain
      };
      break;
    }
    case 'reverse_reverb': {
      // Reverse Reverb: Records audio, reverses buffer, applies reverb
      // Creates Radiohead-style swelling effects
      const { makeReverseReverb } = await import('./reverse-reverb');
      const reverseReverbEffect = makeReverseReverb(30, 1, 2, 0.4); // 1s record, 2s decay for tighter response
      await reverseReverbEffect.initialize();

      // Connect wrapper input/output to reverse reverb's internal routing
      input.connect(reverseReverbEffect.input);
      reverseReverbEffect.output.connect(output);

      node = {
        type: 'reverse_reverb',
        effect: reverseReverbEffect
      };

      // Skip default connection (reverse reverb has custom routing - already connected above)
      break;
    }
    case 'phaser':
      node = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 });
      break;
    case 'pingpong':
      node = new Tone.PingPongDelay({ delayTime: '8n', feedback: 0.4, wet: 0.5 });
      break;
    case 'autofilter':
      node = new Tone.AutoFilter({ frequency: '4n', baseFrequency: 200, octaves: 2.5, wet: 0.5 });
      node.start(); // AutoFilter needs to be started
      break;
    case 'autopanner':
      node = new Tone.AutoPanner({ frequency: '8n', depth: 1, wet: 0.5 });
      node.start(); // AutoPanner needs to be started
      break;
    case 'compressor':
      node = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.03, release: 0.25 });
      break;
    case 'eq3':
      node = new Tone.EQ3({ low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500 });
      break;

    case 'convolver': {
      // Convolution Reverb with optional predelay for expensive spatial effects
      // Uses impulse responses from ir-manifest
      const { getIR, logIRLoad } = await import('./ir-manifest');
      const defaultIR = getIR('m7_hall_a');

      if (!defaultIR) {
        throw new Error('[Convolver] No default IR found in manifest');
      }

      logIRLoad(defaultIR.id, 'loading');

      const convolver = new Tone.Convolver(defaultIR.url);
      // Tone.js v14: Convolver.ready is a Promise (TypeScript types incomplete)
      await (convolver as any).ready;

      logIRLoad(defaultIR.id, 'loaded');

      // Optional predelay for early reflection offset
      const predelay = new Tone.Delay((defaultIR.preDelayMs || 0) / 1000);
      const wetGain = new Tone.Gain(defaultIR.gain || 0.7);
      const dryGain = new Tone.Gain(0.3);
      const convolverMix = new Tone.Gain(1);

      // Routing: input -> [dry path, wet path with predelay] -> mix -> output
      input.connect(dryGain);
      dryGain.connect(convolverMix);

      input.connect(predelay);
      predelay.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(convolverMix);

      convolverMix.connect(output);

      node = {
        type: 'convolver',
        convolver,
        predelay,
        wetGain,
        dryGain,
        currentIR: defaultIR
      };
      break;
    }

    case 'harmonizer': {
      // Parallel internal graph: input -> dry -> mix -> output
      //                           input -> pitchVoices... -> wet -> mix
      const dry = new Tone.Gain(0.5);
      const wet = new Tone.Gain(0.5);
      const mix = new Tone.Gain(1);

      input.connect(dry);
      dry.connect(mix);

      // Guard for Tone v15: PitchShift deprecated, use graceful fallback
      if (typeof (Tone as any).PitchShift !== 'undefined') {
        // Tone v14 or compatible - create pitch shift voices
        const pitchUp = new (Tone as any).PitchShift({ pitch: 7 }); // +7 semitones (perfect 5th)
        const pitchDown = new (Tone as any).PitchShift({ pitch: -5 }); // -5 semitones (perfect 4th down)

        input.connect(pitchUp);
        input.connect(pitchDown);
        pitchUp.connect(wet);
        pitchDown.connect(wet);
      } else {
        // Tone v15+ fallback - log once and pass through dry signal
        console.info(
          '[Harmonizer] Tone.PitchShift unavailable in v15+. ' +
          'For true harmonizer: pin Tone to v14 or add AudioWorklet pitch shifter. ' +
          'Currently passing dry signal only.'
        );
        // Just connect input to wet (acts as simple gain)
        input.connect(wet);
      }

      wet.connect(mix);
      mix.connect(output);

      // Expose dry/wet gains for set() method
      node = { dry, wet, mix, type: 'harmonizer' };
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Stage 2B - Mid/Side Stereo Width Control
    // ═══════════════════════════════════════════════════════════════════════
    case 'width': {
      const { makeWidthProcessor } = await import('./width');
      const widthProc = makeWidthProcessor(1); // Start at full stereo (1)

      // Connect input/output
      input.connect(widthProc.input);
      widthProc.output.connect(output);

      // Expose processor for set() method
      node = { type: 'width', processor: widthProc };
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEW: Stage 3 - Ambient Texture Layer
    // ═══════════════════════════════════════════════════════════════════════
    case 'ambient': {
      const { makeAmbientLayer } = await import('./ambient-layer');
      const ambientLayer = makeAmbientLayer('noise', undefined, -24, 800, 0.3);

      // Connect input/output
      input.connect(ambientLayer.input);
      ambientLayer.output.connect(output);

      // Auto-start ambient layer
      ambientLayer.start();

      // Expose layer for set() method
      node = { type: 'ambient', layer: ambientLayer };
      break;
    }

    default:
      node = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.35, wet: 0.4 });
  }

  // Skip default connection for effects with custom internal routing
  if (type !== 'harmonizer' && type !== 'shimmer' && type !== 'convolver' && type !== 'reverse_reverb' && type !== 'width' && type !== 'ambient') {
    input.connect(node);
    node.connect(output);
  }

  return {
    type,
    input,
    output,
    node,
    set: (value: number) => {
      const v = Math.max(0, Math.min(1, value));

      // Shimmer special handling - control wet/dry/feedback balance
      if (type === 'shimmer' && 'wetGain' in node && node.wetGain.gain) {
        node.wetGain.gain.rampTo(v, 0.05); // Wet amount (shimmer effect)
        node.dryGain.gain.rampTo(1 - v * 0.5, 0.05); // Dry amount (reduce less aggressively)
        node.feedbackGain.gain.rampTo(Math.min(v * 0.3, 0.25), 0.05); // Feedback (capped at 0.25 to prevent runaway)
        return;
      }

      // Convolver special handling - control wet/dry balance
      if (type === 'convolver' && 'wetGain' in node && node.wetGain.gain) {
        node.wetGain.gain.rampTo(v, 0.05); // Wet amount
        node.dryGain.gain.rampTo(1 - v, 0.05); // Dry amount (inverse)
        return;
      }

      // Reverse Reverb special handling - control wet mix
      if (type === 'reverse_reverb' && 'effect' in node && node.effect) {
        node.effect.setWet(v);
        return;
      }

      // Harmonizer special handling - control wet/dry balance
      if (type === 'harmonizer' && 'wet' in node && node.wet.gain) {
        // Use rampTo for smooth transitions
        node.wet.gain.rampTo(v, 0.05); // Wet amount
        node.dry.gain.rampTo(1 - v, 0.05); // Dry amount (inverse)
        return;
      }

      // Width special handling - control stereo width (0-2 range: 0=mono, 1=full stereo, 2=enhanced)
      if (type === 'width' && 'processor' in node && node.processor.setWidth) {
        // Map 0-1 input to 0-2 width range for enhanced width capability
        node.processor.setWidth(v * 2);
        return;
      }

      // Ambient special handling - control wet/dry balance
      if (type === 'ambient' && 'layer' in node && node.layer.setWet) {
        node.layer.setWet(v);
        return;
      }

      // Common parameters with perceptual curves
      if ('wet' in node && node.wet && typeof node.wet === 'object' && 'value' in node.wet) {
        node.wet.value = v;
      }

      // Frequency: Exponential curve for perceptual linearity (20Hz-20kHz)
      if ('frequency' in node && node.frequency && typeof node.frequency === 'object') {
        // Use 100Hz-4000Hz range for filters (musical range)
        const freq = mapFrequency(v, 100, 4000);
        if (typeof node.frequency.rampTo === 'function') {
          node.frequency.rampTo(freq, 0.05);
        } else {
          node.frequency.value = freq;
        }
      }

      if ('feedback' in node && node.feedback && typeof node.feedback === 'object' && 'value' in node.feedback) {
        node.feedback.value = v * 0.85;
      }

      if ('distortion' in node && typeof node.distortion === 'number') {
        node.distortion = v * 0.9;
      }

      if ('bits' in node && typeof node.bits === 'object' && 'value' in node.bits) {
        node.bits.value = Math.floor(1 + v * 7);
      }

      // New effect-specific parameters
      if ('depth' in node && node.depth && typeof node.depth === 'object' && 'value' in node.depth) {
        node.depth.value = v;
      }

      if ('octaves' in node && node.octaves && typeof node.octaves === 'object' && 'value' in node.octaves) {
        node.octaves.value = v * 4; // 0-4 octaves (linear is appropriate for octave count)
      }

      // Base Frequency: Exponential curve for natural sweep (100Hz-2000Hz)
      if ('baseFrequency' in node && node.baseFrequency && typeof node.baseFrequency === 'object') {
        const freq = mapFrequency(v, 100, 2000);
        if (typeof node.baseFrequency.rampTo === 'function') {
          node.baseFrequency.rampTo(freq, 0.05);
        } else {
          node.baseFrequency.value = freq;
        }
      }

      // Threshold: Linear in dB space (already perceptually correct)
      if ('threshold' in node && node.threshold && typeof node.threshold === 'object') {
        const thresholdDb = mapGain(v, -40, -10); // -40dB to -10dB
        if (typeof node.threshold.rampTo === 'function') {
          node.threshold.rampTo(thresholdDb, 0.05);
        } else {
          node.threshold.value = thresholdDb;
        }
      }

      // Ratio: Logarithmic curve for natural compression feel (1:1 to 12:1)
      if ('ratio' in node && node.ratio && typeof node.ratio === 'object') {
        const ratio = mapRatio(v, 1, 12);
        if (typeof node.ratio.rampTo === 'function') {
          node.ratio.rampTo(ratio, 0.05);
        } else {
          node.ratio.value = ratio;
        }
      }

      // EQ3 bands: Linear in dB space (perceptually correct for gain)
      if ('low' in node && node.low && typeof node.low === 'object') {
        const gain = mapGain(v, -12, 12); // -12dB to +12dB
        if (typeof node.low.rampTo === 'function') {
          node.low.rampTo(gain, 0.05);
        } else {
          node.low.value = gain;
        }
      }

      if ('mid' in node && node.mid && typeof node.mid === 'object') {
        const gain = mapGain(v, -12, 12); // -12dB to +12dB
        if (typeof node.mid.rampTo === 'function') {
          node.mid.rampTo(gain, 0.05);
        } else {
          node.mid.value = gain;
        }
      }

      if ('high' in node && node.high && typeof node.high === 'object') {
        const gain = mapGain(v, -12, 12); // -12dB to +12dB
        if (typeof node.high.rampTo === 'function') {
          node.high.rampTo(gain, 0.05);
        } else {
          node.high.value = gain;
        }
      }
    }
  };
}

// Connect chain
export function connectChain(instrumentOut: Tone.Gain, effects: EffectConfig[] = []) {
  try { instrumentOut.disconnect(); } catch {}

  // DEBUG: Log connection chain
  globalThis.console.log('[connectChain] Connecting:', {
    instrumentOut,
    effectCount: effects.length,
    effectTypes: effects.map(e => e.type)
  });

  let prev: Tone.ToneAudioNode = instrumentOut;
  for (const fx of effects) {
    // do not disconnect fx IO here; simply chain
    globalThis.console.log('[connectChain] Connecting to effect:', fx.type, 'input:', fx.input);
    prev.connect(fx.input);
    prev = fx.output;
  }
  prev.connect(Bus.master);

  globalThis.console.log('[connectChain] Chain complete. Final output connected to Bus.master');

  return prev;
}

// Transport control
export function setTempo(bpm: number) {
  Tone.Transport.bpm.value = bpm;
}

export function setTimeSig(sig: string) {
  const [n] = sig.split('/').map(Number);
  Tone.Transport.timeSignature = n;
}

// Engine control
export const Engine = {
  start: async () => { await Tone.start(); },
  play: () => { Tone.Transport.start(); },
  stop: () => {
    Tone.Transport.stop();
    // Safe DOM event dispatch for browser contexts
    if (typeof globalThis !== 'undefined' && (globalThis as any).CustomEvent && (globalThis as any).dispatchEvent) {
      (globalThis as any).dispatchEvent(new (globalThis as any).CustomEvent('playhead', { detail: { id: null, index: -1 } }));
    }
  },
  getContext: () => Tone.getContext(),
  getTransport: () => Tone.Transport
};

// ═══════════════════════════════════════════════════════════════════════════
// FX Bus System Exports (PR #23)
// ═══════════════════════════════════════════════════════════════════════════

export {
  initializeFxBuses,
  setSendLevel,
  getSendLevel,
  resetSendLevels,
  disposeFxBuses,
  areFxBusesInitialized,
  FxBuses,
  type FxBusConfig
};

// ═══════════════════════════════════════════════════════════════════════════
// Gain Staging System Exports (PR #24)
// ═══════════════════════════════════════════════════════════════════════════

export {
  initializeMasterLimiter,
  setMasterLimiterThreshold,
  getMasterLimiterReduction,
  isMasterLimiterInitialized,
  disposeMasterLimiter,
  MasterLimiter,
  createTrim,
  setTrimLevel,
  getTrimLevel,
  HeadroomTargets,
  isWithinHeadroom,
  calculateHeadroomMargin
} from './gain-staging';

// ═══════════════════════════════════════════════════════════════════════════
// Parameter Curves System Exports (PR #25)
// ═══════════════════════════════════════════════════════════════════════════

export {
  mapFrequency,
  unmapFrequency,
  mapGain,
  dbToGain,
  gainToDb,
  mapTime,
  mapQ,
  mapRatio,
  applyParamCurve
} from './param-curves';
