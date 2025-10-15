import { type AdvancedOpts, type SynthFlavor } from './synth-advanced';

// ════════════════════════════════════════════════════════════════════════════
// Synth Preset Library
// ════════════════════════════════════════════════════════════════════════════

export type SynthPreset = AdvancedOpts & { name: string };

// ─────────────────────────────────────────────────────────────────────────────
// Artist-Grade Synth Presets (4 foundational voices)
// ─────────────────────────────────────────────────────────────────────────────
export const SynthPresets = {
  AtmosPad: {
    name: 'Atmos Pad',
    flavor: 'fat' as SynthFlavor,
    polyphony: 8,
    unison: { count: 5, spread: 35 },
    voice: {
      envelope: {
        attack: 0.2,
        decay: 0.5,
        sustain: 0.7,
        release: 3.5
      }
    }
  },

  DreamyKeys: {
    name: 'Dreamy Keys',
    flavor: 'fm' as SynthFlavor,
    polyphony: 8,
    voice: {
      harmonicity: 2,
      modulationIndex: 4,
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 1.5
      }
    }
  },

  BlakeMono: {
    name: 'Blake Mono',
    flavor: 'duo' as SynthFlavor,
    glide: 0.08,
    voice: {
      vibratoRate: 5,
      vibratoAmount: 0.12,
      harmonicity: 1.01
    }
  },

  PluckGlass: {
    name: 'Pluck Glass',
    flavor: 'pluck' as SynthFlavor
  }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Preset Conversion Helper
// ─────────────────────────────────────────────────────────────────────────────
export function presetToOpts(name: keyof typeof SynthPresets): AdvancedOpts {
  const preset = SynthPresets[name];

  // Return a copy without the 'name' property
  const { name: _name, ...opts } = preset;

  return opts as AdvancedOpts;
}
