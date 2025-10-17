// Chord definitions and density calculation

export type Chord = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'bVII' | 'sus' | 'dim' | '+7';

// Chord pitch classes (relative to key root)
export const chordPCs: Record<Chord, number[]> = {
  I: [0, 4, 7],      // C, E, G
  ii: [2, 5, 9],     // D, F, A
  iii: [4, 7, 11],   // E, G, B
  IV: [5, 9, 0],     // F, A, C
  V: [7, 11, 2],     // G, B, D
  vi: [9, 0, 4],     // A, C, E
  bVII: [10, 2, 5],  // Bb, D, F
  sus: [0, 5, 7],    // C, F, G
  dim: [0, 3, 6],    // C, Eb, Gb
  '+7': [0, 4, 10]   // C, E, Bb
};

// Major scale pitch classes
export const scalePCs = new Set([0, 2, 4, 5, 7, 9, 11]);

// Chord colors
export const chordColors: Record<Chord, string> = {
  I: '#CCFF00',           // lime
  ii: '#FFF3C4',          // cream
  iii: '#FFF3C4',         // cream
  IV: '#FFF3C4',          // cream
  V: '#FF62C6',           // pink
  vi: '#FFF3C4',          // cream
  bVII: '#C4B5FD',        // purple
  sus: '#C4B5FD',         // purple
  dim: '#C4B5FD',         // purple
  '+7': '#C4B5FD'         // purple
};

// Calculate density alpha for a pitch class given a chord
export function densityAlpha(pc: number, chord: Chord): number {
  if (chordPCs[chord].includes(pc)) return 0.60; // Chord tone
  if (scalePCs.has(pc)) return 0.30;              // Scale tone
  return 0.10;                                     // Non-scale
}

// Convert MIDI note to pitch class (0-11)
export function midiToPitchClass(midi: number): number {
  return midi % 12;
}

// Key to semitone offset mapping
export const keyOffsets: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
};

// Transpose pitch class by key offset
export function transposePitchClass(pc: number, keyOffset: number): number {
  return (pc + keyOffset) % 12;
}
