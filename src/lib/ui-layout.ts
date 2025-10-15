// ════════════════════════════════════════════════════════════════════════════
// UI Layout System - Left-to-Right Workflow Configuration
// ════════════════════════════════════════════════════════════════════════════

export type Orientation = 'vertical' | 'horizontal';

// Default orientation for the workspace
export const ORIENTATION: Orientation = 'horizontal';

// Left-to-Right layout configuration
export const LTR = {
  guides: [160, 420, 700, 940], // x positions in main space for visual columns
  minPull: 36, // cable curve min control distance (px)
  k: 0.35,     // cable curve factor (control point distance multiplier)
};

/**
 * Single source of truth for responsive orientation behavior.
 *
 * @param width - Current window width in pixels
 * @returns Orientation based on responsive breakpoint (768px)
 *
 * Below 768px: vertical orientation (mobile)
 * Above 768px: horizontal orientation (desktop)
 */
export function computeOrientation(width: number): Orientation {
  return width < 768 ? 'vertical' : 'horizontal';
}
