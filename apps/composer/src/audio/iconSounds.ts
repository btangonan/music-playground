// Icon sound library - 16 sounds for MVP
// Tone.js configurations for each sound

export interface IconSound {
  id: string
  name: string
  category: 'synth' | 'drum' | 'bass' | 'fx'
  type: 'melodic' | 'rhythmic'
  toneConfig: {
    synthType: string
    options?: Record<string, unknown>
  }
}

export const ICON_SOUNDS: Record<string, IconSound> = {
  // Synths (4) - melodic
  'synth-lead': {
    id: 'synth-lead',
    name: 'Lead',
    category: 'synth',
    type: 'melodic',
    toneConfig: {
      synthType: 'MonoSynth',
      options: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
      }
    }
  },

  'synth-pad': {
    id: 'synth-pad',
    name: 'Pad',
    category: 'synth',
    type: 'melodic',
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 2.0 }
      }
    }
  },

  'synth-pluck': {
    id: 'synth-pluck',
    name: 'Pluck',
    category: 'synth',
    type: 'melodic',
    toneConfig: {
      synthType: 'PluckSynth',
      options: {
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.7
      }
    }
  },

  'synth-arp': {
    id: 'synth-arp',
    name: 'Arp',
    category: 'synth',
    type: 'melodic',
    toneConfig: {
      synthType: 'Synth',
      options: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.3 }
      }
    }
  },

  // Drums (4) - rhythmic
  'drum-kick': {
    id: 'drum-kick',
    name: 'Kick',
    category: 'drum',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'MembraneSynth',
      options: {
        pitchDecay: 0.05,
        octaves: 10,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      }
    }
  },

  'drum-snare': {
    id: 'drum-snare',
    name: 'Snare',
    category: 'drum',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'NoiseSynth',
      options: {
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.2 }
      }
    }
  },

  'drum-hihat': {
    id: 'drum-hihat',
    name: 'Hi-hat',
    category: 'drum',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'MetalSynth',
      options: {
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.1 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }
    }
  },

  'drum-clap': {
    id: 'drum-clap',
    name: 'Clap',
    category: 'drum',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'NoiseSynth',
      options: {
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.15 }
      }
    }
  },

  // Bass (2) - melodic
  'bass-sub': {
    id: 'bass-sub',
    name: 'Sub',
    category: 'bass',
    type: 'melodic',
    toneConfig: {
      synthType: 'MonoSynth',
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 }
      }
    }
  },

  'bass-wobble': {
    id: 'bass-wobble',
    name: 'Wobble',
    category: 'bass',
    type: 'melodic',
    toneConfig: {
      synthType: 'FMSynth',
      options: {
        harmonicity: 0.5,
        modulationIndex: 5,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 }
      }
    }
  },

  // FX (6) - rhythmic
  'fx-riser': {
    id: 'fx-riser',
    name: 'Riser',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'NoiseSynth',
      options: {
        noise: { type: 'white' },
        envelope: { attack: 1.0, decay: 0.0, sustain: 1.0, release: 0.5 }
      }
    }
  },

  'fx-impact': {
    id: 'fx-impact',
    name: 'Impact',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'MembraneSynth',
      options: {
        pitchDecay: 0.5,
        octaves: 6,
        envelope: { attack: 0.001, decay: 1.0, sustain: 0.0, release: 1.5 }
      }
    }
  },

  'fx-sweep': {
    id: 'fx-sweep',
    name: 'Sweep',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'Synth',
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.0, sustain: 1.0, release: 0.5 }
      }
    }
  },

  'fx-glitch': {
    id: 'fx-glitch',
    name: 'Glitch',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'MetalSynth',
      options: {
        frequency: 100,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.05 },
        harmonicity: 12,
        modulationIndex: 64
      }
    }
  },

  'fx-vocal-chop': {
    id: 'fx-vocal-chop',
    name: 'Vocal Chop',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'AMSynth',
      options: {
        harmonicity: 3,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.2 }
      }
    }
  },

  'fx-noise': {
    id: 'fx-noise',
    name: 'Noise',
    category: 'fx',
    type: 'rhythmic',
    toneConfig: {
      synthType: 'NoiseSynth',
      options: {
        noise: { type: 'brown' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.3 }
      }
    }
  }
}

// Helper to get sound by ID
export function getIconSound(id: string): IconSound | undefined {
  return ICON_SOUNDS[id]
}

// Get all sounds by category
export function getIconSoundsByCategory(category: IconSound['category']): IconSound[] {
  return Object.values(ICON_SOUNDS).filter(sound => sound.category === category)
}
