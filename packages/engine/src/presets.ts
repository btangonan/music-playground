import * as Tone from 'tone';
import { makeEffect, type EffectConfig } from './audio-engine';
import { applyEffectParams } from './effect-param-mapper';
import { postWireEffect } from './effect-wiring';

// ════════════════════════════════════════════════════════════════════════════
// Artist Sound Pack Core
// ════════════════════════════════════════════════════════════════════════════

export type EffectPreset = {
  type: string;
  params?: Record<string, any>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Safe parameter application with Signal detection
// ─────────────────────────────────────────────────────────────────────────────
function isToneParam(obj: any): obj is Tone.Signal {
  return obj && typeof obj === 'object' && 'value' in obj && 'rampTo' in obj;
}

function applyParams(node: any, params: Record<string, any>) {
  for (const [key, val] of Object.entries(params)) {
    if (!(key in node)) continue;

    const target = node[key];

    if (isToneParam(target)) {
      // Use rampTo for click-free parameter changes (30-80ms)
      const rampTime = 0.05; // 50ms
      target.rampTo(val, rampTime);
    } else if (typeof target === 'object' && target !== null) {
      // Nested object - recurse
      applyParams(target, val as Record<string, any>);
    } else {
      // Plain property
      node[key] = val;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build effect chain from preset with safe parameter application
// ─────────────────────────────────────────────────────────────────────────────
export async function buildEffectChain(preset: EffectPreset[]): Promise<EffectConfig[]> {
  const chain: EffectConfig[] = [];

  for (const { type, params } of preset) {
    const config = await makeEffect(type);

    // Ensure custom-routed effects (e.g., reverse_reverb) are actually in the chain
    postWireEffect(config);

    if (params) {
      // Engine-aware mapping for special nodes; legacy applier still used for simple cases
      applyEffectParams(config, params);
    }

    chain.push(config);
  }

  return chain;
}

// ════════════════════════════════════════════════════════════════════════════
// Artist Presets (6 professional-grade sound packs)
// ════════════════════════════════════════════════════════════════════════════

export const Presets: Record<string, EffectPreset[]> = {
  // ───────────────────────────────────────────────────────────────────────────
  // Atmos Pad - Lush ambient pad with shimmer and space
  // ───────────────────────────────────────────────────────────────────────────
  AtmosPad: [
    {
      type: 'shimmer',
      params: {
        wet: 0.4,
        decay: 4,
        pitchShift: 12 // +1 octave
      }
    },
    {
      type: 'chorus',
      params: {
        frequency: 1.5,
        delayTime: 3.5,
        depth: 0.7,
        wet: 0.5
      }
    },
    {
      type: 'space',
      params: {
        decay: 5,
        wet: 0.45
      }
    },
    {
      type: 'compressor',
      params: {
        threshold: -18,
        ratio: 3,
        attack: 0.05,
        release: 0.3
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Dreamy Keys - Ethereal keys with vibrato and echo
  // ───────────────────────────────────────────────────────────────────────────
  DreamyKeys: [
    {
      type: 'vibrato',
      params: {
        frequency: 3,
        depth: 0.3
      }
    },
    {
      type: 'echo',
      params: {
        delayTime: '8n',
        feedback: 0.4,
        wet: 0.35
      }
    },
    {
      type: 'tremolo',
      params: {
        frequency: 4,
        depth: 0.5,
        wet: 0.4
      }
    },
    {
      type: 'space',
      params: {
        decay: 3,
        wet: 0.3
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Blake Shimmer - James Blake-inspired reverb octave shimmer
  // ───────────────────────────────────────────────────────────────────────────
  BlakeShimmer: [
    {
      type: 'eq3',
      params: {
        low: -3,
        mid: 2,
        high: 0,
        lowFrequency: 400,
        highFrequency: 2500
      }
    },
    {
      type: 'shimmer',
      params: {
        wet: 0.35,
        decay: 6,
        pitchShift: 7
      }
    },
    {
      type: 'compressor',
      params: {
        threshold: -20,
        ratio: 4,
        attack: 0.03,
        release: 0.25
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Fred Pump Pad - Fred again.. style pumping pad with autopanner
  // ───────────────────────────────────────────────────────────────────────────
  FredPumpPad: [
    {
      type: 'autopanner',
      params: {
        frequency: '8n',
        depth: 0.8,
        wet: 0.6
      }
    },
    {
      type: 'compressor',
      params: {
        threshold: -25,
        ratio: 6,
        attack: 0.01,
        release: 0.1
      }
    },
    {
      type: 'echo',
      params: {
        delayTime: '16n',
        feedback: 0.3,
        wet: 0.25
      }
    },
    {
      type: 'space',
      params: {
        decay: 2.5,
        wet: 0.35
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Jamie Mallet - Clean steel-drum mallet sound (Re-voiced)
  // Design: Bright EQ → micro slap delay → tight plate → focused width
  // ───────────────────────────────────────────────────────────────────────────
  JamieMallet: [
    {
      type: 'eq3',
      params: {
        low: -6,
        mid: 2,
        high: 2,
        lowFrequency: 240,
        highFrequency: 3400
      }
    },
    {
      type: 'pingpong',
      params: {
        delayTime: 0.03,
        feedback: 0.12,
        wet: 0.18
      }
    },
    {
      type: 'space',
      params: {
        decay: 1.2,
        wet: 0.25
      }
    },
    {
      type: 'width',
      params: {
        width: 0.9
      }
    },
    {
      type: 'compressor',
      params: {
        threshold: -22,
        ratio: 3.5,
        attack: 0.004,
        release: 0.18
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Radiohead Tape - Lo-fi tape saturation with autofilter sweep
  // ───────────────────────────────────────────────────────────────────────────
  RadioheadTape: [
    {
      type: 'crush',
      params: {
        bits: 6
      }
    },
    {
      type: 'autofilter',
      params: {
        frequency: '4n',
        baseFrequency: 200,
        octaves: 2.5,
        wet: 0.6
      }
    },
    {
      type: 'fuzz',
      params: {
        distortion: 0.4,
        wet: 0.35
      }
    },
    {
      type: 'width',
      params: {
        width: 0.5
      }
    },
    {
      type: 'echo',
      params: {
        delayTime: '8n.',
        feedback: 0.45,
        wet: 0.3
      }
    },
    {
      type: 'space',
      params: {
        decay: 2,
        wet: 0.25
      }
    }
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Blake Shimmer M7 - James Blake "Retrograde" deep/resonant shimmer (Re-voiced)
  // ───────────────────────────────────────────────────────────────────────────
  BlakeShimmer_M7: [
    {
      type: 'eq3',
      params: { low: -2, mid: 1, high: -1, lowFrequency: 350, highFrequency: 3500 }
    },
    {
      type: 'compressor',
      params: { threshold: -24, ratio: 3, attack: 0.01, release: 0.15 }
    },
    {
      type: 'shimmer',
      params: { wet: 0.28, decay: 8, pitchShift: 12, hpfHz: 200, predelay: 35, feedback: 0.12 }
    },
    {
      type: 'convolver',
      params: { wet: 0.42, predelay: 32 }
    },
    {
      type: 'space',
      params: { decay: 3.5, wet: 0.18 }
    },
    {
      type: 'compressor',
      params: { threshold: -18, ratio: 2.5, attack: 0.08, release: 0.45 }
    }
  ],

  RadioheadPlate: [
    { type: 'eq3', params: { low: -2, mid: 0, high: 1, lowFrequency: 350, highFrequency: 2800 } },
    { type: 'convolver', params: { wet: 0.4, predelay: 15 } },
    { type: 'compressor', params: { threshold: -22, ratio: 3, attack: 0.04, release: 0.3 } },
  ],

  BlakeShimmer_Clear: [
    { type: 'eq3', params: { low: -3, mid: 2, high: 1, lowFrequency: 400, highFrequency: 2500 } },
    { type: 'shimmer', params: { wet: 0.32, decay: 6.5, pitchShift: 7, predelay: 25, pitchDry: 0.15, hpfHz: 240, feedback: 0.1 } },
    { type: 'compressor', params: { threshold: -20, ratio: 4, attack: 0.03, release: 0.25 } },
  ],

  Radiohead_ReversePlate: [
    { type: 'eq3', params: { low: -4, mid: 1, high: 2, lowFrequency: 300, highFrequency: 3000 } },
    { type: 'reverse_reverb', params: { predelayMs: 30, recordLength: 2, reverbDecay: 4, wet: 0.45 } },
    { type: 'compressor', params: { threshold: -18, ratio: 3, attack: 0.05, release: 0.35 } },
  ],

  Radiohead_AmbPlate: [
    { type: 'eq3', params: { low: -4, mid: 1, high: -2, lowFrequency: 250, highFrequency: 4000 } },
    { type: 'ambient', params: { wet: 0.35, volume: -24, filterFreq: 800 } },
    { type: 'space', params: { decay: 5, wet: 0.5 } },
    { type: 'compressor', params: { threshold: -22, ratio: 3, attack: 0.08, release: 0.4 } },
  ],

  // Jon Hopkins: soften fuzz/shimmer to remove dissonance; longer tail, lower wet
  JonHopkins_Immersive: [
    { type: 'eq3', params: { low: 0, mid: -1, high: -2, lowFrequency: 300, highFrequency: 4000 } },
    { type: 'fuzz', params: { distortion: 0.15, wet: 0.2 } },
    { type: 'autofilter', params: { frequency: 0.08, baseFrequency: 300, octaves: 2, wet: 0.5 } },
    { type: 'shimmer', params: { wet: 0.22, decay: 7, pitchShift: 7, hpfHz: 260, feedback: 0.1 } },
    { type: 'space', params: { decay: 5.5, wet: 0.35 } },
    { type: 'echo', params: { delayTime: '8n.', feedback: 0.26, wet: 0.18 } },
    { type: 'compressor', params: { threshold: -20, ratio: 2.5, attack: 0.06, release: 0.3 } },
  ],
};
