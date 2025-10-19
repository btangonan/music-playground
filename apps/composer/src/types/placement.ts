// Placement type for icon sequencer
// Matches IconPlacement interface used in IconSequencerWithDensity

export interface Placement {
  soundId: string;
  bar: number; // 0-63 (sixteenth note positions across 4 bars)
  pitch: number; // MIDI note number
  velocity: number; // 0-100
  duration16?: number; // Duration in sixteenths (defaults to 1 if not specified)
}
