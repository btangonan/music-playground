/**
 * Audio Helper Functions
 */

/**
 * Converts a MIDI note number to a note name with octave
 * @param midiNote - MIDI note number (0-127)
 * @returns Note name with octave (e.g., 'C4', 'A#5')
 */
export function midiToNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((midiNote - 12) / 12);
  const note = noteNames[midiNote % 12];
  return `${note}${octave}`;
}

/**
 * Converts a note name with octave to a MIDI note number
 * @param noteName - Note name with octave (e.g., 'C4', 'A#5')
 * @returns MIDI note number (0-127)
 */
export function noteNameToMidi(noteName: string): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + noteMap[note];
}
