// Sidechain Ducking Utility for Fred Again.. style pumping
// Uses Tone.Follower to track trigger signal and applies inverse gain modulation

import * as Tone from 'tone';

/**
 * Creates a sidechain ducking effect that modulates target gain based on trigger signal
 *
 * @param trigger - Audio signal to track (typically kick drum)
 * @param targetGain - Gain node to modulate (pad bus, reverb return, etc.)
 * @param ratio - Duck amount (0-1, default 0.7 = 70% reduction)
 * @param attack - How quickly ducking engages (seconds, default 0.01)
 * @param release - How quickly ducking releases (seconds, default 0.15)
 * @returns Object with setRatio() method and cleanup() function
 */
export function makeDucker(
  trigger: Tone.ToneAudioNode,
  targetGain: Tone.Gain,
  ratio = 0.7,
  attack = 0.01,
  release = 0.15
) {
  // Envelope follower tracks amplitude of trigger signal
  const follower = new Tone.Follower({
    smoothing: attack
  });

  // Signal chain: Follower → Multiply(−ratio) → Add(1) → targetGain.gain
  // Example: follower output 0.8 → multiply by -0.7 = -0.56 → add 1 = 0.44 (56% duck)
  const multiply = new Tone.Multiply(-ratio);
  const add = new Tone.Add(1);

  // Route trigger through follower
  trigger.connect(follower);

  // Create modulation chain
  follower.chain(multiply, add);

  // Connect to target gain (modulates gain parameter)
  add.connect(targetGain.gain);

  // Debug logging (controlled by LL_DEBUG_DUCK flag)
  if (typeof window !== 'undefined' && (window as any).LL_DEBUG_DUCK) {
    console.log('[Ducker] Created:', {
      ratio,
      attack,
      release,
      targetGain: targetGain.gain.value
    });
  }

  /**
   * Adjust ducking ratio smoothly at runtime
   * @param next - New duck amount (0-1)
   */
  const setRatio = (next: number) => {
    const r = Math.max(0, Math.min(1, next));

    // Access multiply's factor parameter safely
    const factor: any = (multiply as any).factor ?? multiply;

    if (factor?.rampTo) {
      factor.rampTo(-r, 0.05);
    } else if ('value' in factor) {
      factor.value = -r;
    }

    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_DUCK) {
      console.log('[Ducker] Ratio updated:', r);
    }
  };

  /**
   * Cleanup function to dispose all nodes safely
   */
  const cleanup = () => {
    try { follower.dispose(); } catch {}
    try { multiply.dispose(); } catch {}
    try { add.dispose(); } catch {}

    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_DUCK) {
      console.log('[Ducker] Disposed');
    }
  };

  return { setRatio, cleanup };
}
