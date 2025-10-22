// Icon sound library - 16 sounds for MVP
// Tone.js configurations for each sound

export interface IconSound {
  id: string
  name: string
  category: 'synth' | 'drum' | 'bass' | 'fx'
  type: 'melodic' | 'rhythmic'
  oneShot?: boolean // If true, sound has its own envelope (sustain=0) and should use short trigger duration
  volume?: number // Volume in decibels (dB), default is 0. Range: -60 to 6
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
    volume: -12, // Normalized for master bus dynamics
    toneConfig: {
      synthType: 'MonoSynth',
      options: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 }
      }
    }
  },

  'synth-pad': {
    id: 'synth-pad',
    name: 'Pad',
    category: 'synth',
    type: 'melodic',
    volume: -6, // Normalized for master bus dynamics (piano samples - louder for melodic lead)
    // Grand piano - Salamander samples from CDN
    toneConfig: {
      synthType: 'Sampler',
      options: {
        urls: {
          A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
          A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
          A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
          A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
          A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
          A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
          A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
          A7: "A7.mp3", C8: "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/"
      }
    }
  },

  'synth-pluck': {
    id: 'synth-pluck',
    name: 'Pluck',
    category: 'synth',
    type: 'melodic',
    volume: -12, // Normalized for master bus dynamics
    // Rich sustained bass - deep, warm, full-bodied
    // Sine sub-bass layer with slight harmonic richness
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        oscillator: {
          type: 'sine',        // Pure bass foundation
          partials: [1, 0.2, 0.05, 0.02] // Subtle harmonic richness
        },
        envelope: {
          attack: 0.05,        // Quick but smooth attack
          decay: 0.3,
          sustain: 0.85,       // Very high sustain for richness
          release: 1.0         // Long release for smooth decay
        },
        filterEnvelope: {
          attack: 0.08,
          decay: 0.4,
          sustain: 0.7,        // Keep filter mostly open
          release: 0.9,
          baseFrequency: 200,  // Low bass range
          octaves: 2           // Moderate movement
        },
        filter: {
          type: 'lowpass',
          Q: 1,                // Minimal resonance for cleanness
          rolloff: -24         // Steep rolloff to focus bass
        }
      }
    }
  },

  'synth-arp': {
    id: 'synth-arp',
    name: 'Arp',
    category: 'synth',
    type: 'melodic',
    volume: -12, // Normalized for master bus dynamics
    oneShot: true, // sustain=0, let envelope control sound length
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
    volume: -6, // Normalized for master bus dynamics
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
    volume: -9, // Normalized for master bus dynamics
    oneShot: true, // sustain=0, let envelope control sound length
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
    volume: -12, // Normalized for master bus dynamics
    oneShot: true, // sustain=0, let envelope control sound length
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
    volume: -9, // Normalized for master bus dynamics
    oneShot: true, // sustain=0, let envelope control sound length
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
    volume: -9, // Normalized for master bus dynamics
    // Deep sub bass - dark and low-frequency focused
    // Minimal harmonics for pure low-end
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        oscillator: {
          type: 'sine',        // Pure sine wave for deep sub bass
          partials: [1, 0.1, 0.02] // Minimal harmonics for darkness
        },
        envelope: {
          attack: 0.05,        // Quick attack for bass punch
          decay: 0.3,
          sustain: 0.8,        // High sustain for low-end presence
          release: 0.8
        },
        filterEnvelope: {
          attack: 0.08,
          decay: 0.4,
          sustain: 0.6,        // Keep filter relatively closed
          release: 0.6,
          baseFrequency: 80,   // Very low starting point for sub
          octaves: 1.5         // Minimal sweep to stay dark
        },
        filter: {
          type: 'lowpass',
          Q: 1,                // Minimal resonance for darkness
          rolloff: -24         // Steep rolloff to cut highs
        }
      }
    }
  },

  'bass-wobble': {
    id: 'bass-wobble',
    name: 'Wobble',
    category: 'bass',
    type: 'melodic',
    volume: -9, // Normalized for master bus dynamics
    toneConfig: {
      synthType: 'FMSynth',
      options: {
        harmonicity: 0.5,
        modulationIndex: 5,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.8 }
      }
    }
  },

  // FX (6) - rhythmic
  'fx-riser': {
    id: 'fx-riser',
    name: 'Riser',
    category: 'fx',
    type: 'rhythmic',
    volume: -15, // Normalized for master bus dynamics
    toneConfig: {
      synthType: 'NoiseSynth',
      options: {
        noise: { type: 'white' },
        envelope: { attack: 1.0, decay: 0.0, sustain: 0.4, release: 0.5 }
      }
    }
  },

  'fx-impact': {
    id: 'fx-impact',
    name: 'Impact',
    category: 'fx',
    type: 'melodic',
    volume: -12, // Normalized for master bus dynamics
    // Thick James Blake-inspired pad synth
    // Multiple detuned sawtooths for width and warmth
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        oscillator: {
          type: 'fatsawtooth', // Built-in 3 detuned sawtooths
          count: 3,
          spread: 30          // 30 cents detune spread
        },
        envelope: {
          attack: 0.1,        // Slow attack for pad character
          decay: 0.3,
          sustain: 0.7,       // High sustain for thickness
          release: 1.5        // Long release for lush tail
        },
        filterEnvelope: {
          attack: 0.2,
          decay: 0.4,
          sustain: 0.6,
          release: 1.2,
          baseFrequency: 200, // Warm low cutoff
          octaves: 3          // Moderate filter sweep
        },
        filter: {
          type: 'lowpass',
          Q: 2,               // Slight resonance for character
          rolloff: -24        // Steep rolloff for smoothness
        }
      }
    }
  },

  'fx-sweep': {
    id: 'fx-sweep',
    name: 'Sweep',
    category: 'fx',
    type: 'rhythmic',
    volume: -12, // Normalized for master bus dynamics
    // Radiohead "Everything In Its Right Place" - Prophet-5 inspired
    // Round, smooth analog character with gentle filter movement
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        maxPolyphony: 5,      // Prophet-5 voice limit
        oscillator: {
          type: 'triangle',    // Rounder waveform, less harmonics
          partials: [1, 0.3, 0.1] // Soft harmonic rolloff
        },
        envelope: {
          attack: 0.08,        // Slow, gentle attack
          decay: 0.4,
          sustain: 0.8,        // Very high sustain for fullness
          release: 0.8         // Long, smooth release
        },
        filterEnvelope: {
          attack: 0.15,        // Very slow filter opening
          decay: 0.8,
          sustain: 0.6,        // Gentle sustain level
          release: 1.5,        // Very long filter release
          baseFrequency: 600,  // Higher base for smoothness
          octaves: 2.5         // Moderate sweep, less extreme
        },
        filter: {
          type: 'lowpass',
          Q: 1.5,              // Minimal resonance, very smooth
          rolloff: -24         // Steep rolloff for roundness
        }
      }
    }
  },

  'fx-glitch': {
    id: 'fx-glitch',
    name: 'Glitch',
    category: 'fx',
    type: 'rhythmic',
    volume: -15, // Normalized for master bus dynamics
    oneShot: true, // sustain=0, let envelope control sound length
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
    volume: -9, // Normalized for master bus dynamics (increased for slow attack/release)
    // Futuristic haunting James Blake - ethereal theremin-like character
    // Bright, wavering, ghostly with wide open filter
    toneConfig: {
      synthType: 'PolySynth',
      options: {
        oscillator: {
          type: 'sine',        // Pure, ethereal tone
          count: 2,            // Subtle detune for wavering
          spread: 8            // Small detune for shimmer
        },
        envelope: {
          attack: 0.3,         // Slow attack for ghostly entrance
          decay: 0.5,
          sustain: 0.4,        // Medium sustain
          release: 2.0         // Very long release for haunting tail
        },
        filterEnvelope: {
          attack: 0.5,         // Very slow filter opening
          decay: 1.0,
          sustain: 0.8,        // Keep filter mostly open
          release: 1.5,
          baseFrequency: 800,  // Bright starting point
          octaves: 2.5         // Wide sweep for theremin-like quality
        },
        filter: {
          type: 'lowpass',
          Q: 1,                // Minimal resonance for smoothness
          rolloff: -12         // Gentle slope
        }
      }
    }
  },

  'fx-noise': {
    id: 'fx-noise',
    name: 'Noise',
    category: 'fx',
    type: 'rhythmic',
    volume: -4, // Increased to -4dB for more presence
    oneShot: true, // sustain=0, let envelope control sound length
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
