/**
 * Shared layout constants for IconSequencerWithDensity and ChordLabels
 *
 * This file provides a single source of truth for all sequencer layout dimensions,
 * ensuring pixel-perfect alignment between:
 * - Pitch markers (left sidebar)
 * - Sequencer grid (main 16×37 grid)
 * - Chord labels (bottom bar)
 *
 * Critical: GRID_TOTAL_WIDTH includes border width, ensuring ChordLabels
 * matches the grid's actual rendered width (content + borders).
 */

export const SEQUENCER_LAYOUT = {
  COLUMN_WIDTH: 48,       // Width of one quarter note column on desktop (px)
  COLUMN_WIDTH_MOBILE: 17, // Width of one quarter note column on mobile (px) - 17×16=272 + 4px borders = 276px (fits 320px with 44px margin)
  ROW_HEIGHT: 10,         // Height of one semitone row on desktop (px)
  ROW_HEIGHT_MOBILE: 24,  // Height of one semitone row on mobile (px) - meets 44px touch target with icon
  TIME_STEPS: 16,         // 16 quarter notes = 4 bars
  STEPS_PER_BAR: 4,       // 4 quarter notes per bar
  TOTAL_SEMITONES: 37,    // 3 octaves + 1 (C to C inclusive)
  WRAPPER_PADDING: 15,    // Buffer zone around grid for edge drop detection (px)
  GRID_BORDER_WIDTH: 2,   // Grid border width - must match Tailwind border-2 class
} as const;

/**
 * Get responsive column width based on viewport width
 */
export const getColumnWidth = (isMobile: boolean): number => {
  return isMobile ? SEQUENCER_LAYOUT.COLUMN_WIDTH_MOBILE : SEQUENCER_LAYOUT.COLUMN_WIDTH;
};

/**
 * Get responsive row height based on viewport width
 */
export const getRowHeight = (isMobile: boolean): number => {
  return isMobile ? SEQUENCER_LAYOUT.ROW_HEIGHT_MOBILE : SEQUENCER_LAYOUT.ROW_HEIGHT;
};

/**
 * Grid content width (excluding borders)
 * Calculation: COLUMN_WIDTH × TIME_STEPS = 48 × 16 = 768px
 */
export const GRID_WIDTH = SEQUENCER_LAYOUT.COLUMN_WIDTH * SEQUENCER_LAYOUT.TIME_STEPS;

/**
 * Grid total rendered width (including left and right borders)
 * Calculation: GRID_WIDTH + (2 × GRID_BORDER_WIDTH) = 768 + 4 = 772px
 *
 * This is the value ChordLabels must use to align with the grid's actual width.
 */
export const GRID_TOTAL_WIDTH = GRID_WIDTH + 2 * SEQUENCER_LAYOUT.GRID_BORDER_WIDTH;

export type SequencerLayout = typeof SEQUENCER_LAYOUT;
