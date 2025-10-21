export const SEQUENCER_LAYOUT = {
  COLUMN_WIDTH: 48, // quarter note width
  ROW_HEIGHT: 10, // grid row height
  TIME_STEPS: 16, // 16 quarter notes (4 bars)
  STEPS_PER_BAR: 4,
  TOTAL_SEMITONES: 37, // 3 octaves + 1 to include both C endpoints
  WRAPPER_PADDING: 15, // invisible buffer around drop area
  GRID_BORDER_WIDTH: 2, // matches tailwind border-2
} as const;

export const GRID_WIDTH = SEQUENCER_LAYOUT.COLUMN_WIDTH * SEQUENCER_LAYOUT.TIME_STEPS; // 768px
export const GRID_TOTAL_WIDTH = GRID_WIDTH + 2 * SEQUENCER_LAYOUT.GRID_BORDER_WIDTH; // includes L/R borders

export type SequencerLayout = typeof SEQUENCER_LAYOUT;
