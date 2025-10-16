/**
 * Sound ID Mapping Layer
 *
 * Maps UI sound IDs to Audio Engine sound IDs.
 * UI components use short IDs ('lead', 'kick', etc.)
 * while the AudioEngine expects prefixed IDs ('synth-lead', 'drum-kick', etc.)
 */

const SOUND_ID_MAP: Record<string, string> = {
  // Synths
  'lead': 'synth-lead',
  'pad': 'synth-pad',
  'pluck': 'synth-pluck',
  'arp': 'synth-arp',

  // Drums
  'kick': 'drum-kick',
  'snare': 'drum-snare',
  'hihat': 'drum-hihat',
  'clap': 'drum-clap',

  // Bass
  'sub': 'bass-sub',
  'wobble': 'bass-wobble',

  // FX
  'riser': 'fx-riser',
  'impact': 'fx-impact',
  'sweep': 'fx-sweep',
  'glitch': 'fx-glitch',
  'vocal': 'fx-vocal-chop',
  'noise': 'fx-noise'
};

/**
 * Maps a UI sound ID to the corresponding Audio Engine sound ID
 * @param uiSoundId - The sound ID from the UI components
 * @returns The mapped sound ID for the AudioEngine, or the original ID if no mapping exists
 */
export function mapSoundId(uiSoundId: string): string {
  return SOUND_ID_MAP[uiSoundId] || uiSoundId;
}

/**
 * Maps an Audio Engine sound ID back to a UI sound ID
 * @param engineSoundId - The sound ID from the AudioEngine
 * @returns The mapped UI sound ID, or the original ID if no mapping exists
 */
export function unmapSoundId(engineSoundId: string): string {
  const entry = Object.entries(SOUND_ID_MAP).find(([_, engineId]) => engineId === engineSoundId);
  return entry ? entry[0] : engineSoundId;
}
