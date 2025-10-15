// IR Manifest for Convolution Reverb
// Impulse Response metadata for expensive spatial effects

export type IRMeta = {
  id: string;
  url: string;
  label: string;
  gain?: number;
  preDelayMs?: number;
};

/**
 * Curated impulse responses for professional reverb tones
 * Sources: Open-source IR libraries (ensure licensing compliance)
 */
export const IRs: IRMeta[] = [
  {
    id: 'm7_hall_a',
    url: 'https://tonejs.github.io/audio/ir/hall.wav',
    label: 'M7 Hall A',
    gain: 0.7,
    preDelayMs: 25
  },
  {
    id: 'm7_church_short',
    url: 'https://tonejs.github.io/audio/ir/parking-garage.wav',
    label: 'M7 Church Short',
    gain: 0.65,
    preDelayMs: 15
  },
  {
    id: 'emt140_plate_2_5s',
    url: 'https://tonejs.github.io/audio/ir/marco-faltoni-mezzanotte-in-spe-di-luce.wav',
    label: 'EMT-140 Plate 2.5s',
    gain: 0.8,
    preDelayMs: 20
  },
  {
    id: 'small_room',
    url: 'https://tonejs.github.io/audio/ir/small-room.wav',
    label: 'Small Room',
    gain: 0.9,
    preDelayMs: 5
  }
];

/**
 * Get IR metadata by ID
 */
export function getIR(id: string): IRMeta | undefined {
  return IRs.find(ir => ir.id === id);
}

/**
 * Debug logging for IR loading (controlled by LL_DEBUG_IR flag)
 */
export function logIRLoad(id: string, status: 'loading' | 'loaded' | 'error', error?: Error) {
  if (typeof window !== 'undefined' && (window as any).LL_DEBUG_IR) {
    const timestamp = new Date().toISOString();
    console.log(`[IR ${timestamp}] ${id}: ${status}`, error ? error.message : '');
  }
}
