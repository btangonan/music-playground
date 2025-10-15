import * as Tone from 'tone';

/**
 * Mid/Side Stereo Width Control
 *
 * Technical Implementation:
 * - Mid/Side (M/S) matrix encoding/decoding
 * - Mid = (L + R) / 2 (mono sum)
 * - Side = (L - R) / 2 (stereo difference)
 * - Decode: L = M + S, R = M - S
 * - Width control scales the Side signal
 *
 * Usage:
 * - width = 0 → mono (Side gain = 0)
 * - width = 1 → full stereo (Side gain = 1)
 * - width > 1 → enhanced width (Side gain > 1, up to 2)
 *
 * Audio Flow:
 * Input → Mid/Side Encode → Width Scale → Mid/Side Decode → Output
 */

declare global {
  interface Window {
    LL_DEBUG_WIDTH?: number;
  }
}

function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.LL_DEBUG_WIDTH) {
    console.log('[Width]', ...args);
  }
}

export interface WidthProcessor {
  input: Tone.Gain;
  output: Tone.Gain;
  setWidth: (amount: number) => void;
  dispose: () => void;
}

/**
 * Create Mid/Side stereo width processor
 *
 * @param initialWidth - Initial width amount (0-2, default 1)
 * @returns Width processor with input/output and setWidth control
 */
export function makeWidthProcessor(initialWidth = 1): WidthProcessor {
  debugLog('Creating width processor with initial width:', initialWidth);

  // IO nodes
  const input = new Tone.Gain(1);
  const output = new Tone.Gain(1);

  // Mid/Side encoding - split stereo into mid and side components
  const splitter = new Tone.Split();
  const midMerge = new Tone.Merge();
  const sideMerge = new Tone.Merge();

  // Mid = (L + R) / 2
  const leftToMid = new Tone.Gain(0.5);
  const rightToMid = new Tone.Gain(0.5);
  const midSum = new Tone.Add();

  // Side = (L - R) / 2
  const leftToSide = new Tone.Gain(0.5);
  const rightToSide = new Tone.Gain(-0.5); // Inverted for subtraction

  // Width control scales the Side signal
  const sideGain = new Tone.Gain(initialWidth);

  // Mid/Side decoding - reconstruct stereo
  // L = Mid + Side
  // R = Mid - Side
  const midToLeft = new Tone.Gain(1);
  const midToRight = new Tone.Gain(1);
  const sideToLeft = new Tone.Gain(1);
  const sideToRight = new Tone.Gain(-1); // Inverted for subtraction

  const leftSum = new Tone.Add();
  const rightSum = new Tone.Add();
  const merger = new Tone.Merge();

  // Encoding routing
  input.connect(splitter);

  // Left and right to Mid
  splitter.connect(leftToMid, 0);
  splitter.connect(rightToMid, 1);
  leftToMid.connect(midSum);
  rightToMid.connect(midSum);

  // Left and right to Side
  splitter.connect(leftToSide, 0);
  splitter.connect(rightToSide, 1);
  const sideSum = new Tone.Add();
  leftToSide.connect(sideSum);
  rightToSide.connect(sideSum);

  // Apply width scaling to Side
  sideSum.connect(sideGain);

  // Decoding routing
  // Left channel = Mid + Side
  midSum.connect(midToLeft);
  sideGain.connect(sideToLeft);
  midToLeft.connect(leftSum);
  sideToLeft.connect(leftSum);
  leftSum.connect(merger, 0, 0);

  // Right channel = Mid - Side
  midSum.connect(midToRight);
  sideGain.connect(sideToRight);
  midToRight.connect(rightSum);
  sideToRight.connect(rightSum);
  rightSum.connect(merger, 0, 1);

  // Output
  merger.connect(output);

  function setWidth(amount: number) {
    // Clamp to safe range 0-2
    const safeAmount = Math.max(0, Math.min(2, amount));
    debugLog('Setting width to:', safeAmount);
    sideGain.gain.rampTo(safeAmount, 0.05);
  }

  function dispose() {
    debugLog('Disposing width processor');
    input.dispose();
    output.dispose();
    splitter.dispose();
    midMerge.dispose();
    sideMerge.dispose();
    leftToMid.dispose();
    rightToMid.dispose();
    midSum.dispose();
    leftToSide.dispose();
    rightToSide.dispose();
    sideSum.dispose();
    sideGain.dispose();
    midToLeft.dispose();
    midToRight.dispose();
    sideToLeft.dispose();
    sideToRight.dispose();
    leftSum.dispose();
    rightSum.dispose();
    merger.dispose();
  }

  return { input, output, setWidth, dispose };
}
