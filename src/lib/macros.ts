import * as Tone from 'tone';
import { type EffectConfig } from './audio-engine';

// ════════════════════════════════════════════════════════════════════════════
// Macro System - Multi-Parameter Control
// ════════════════════════════════════════════════════════════════════════════

/**
 * Type guard for Tone.js Signal parameters (have .value and .rampTo)
 */
function isToneParam(obj: any): boolean {
  return obj && typeof obj === 'object' && 'value' in obj && 'rampTo' in obj;
}

/**
 * Safe parameter setter with rampTo for Signals, direct assignment otherwise
 * @param node - Audio node to modify
 * @param key - Parameter name
 * @param value - Target value
 * @param rampTime - Ramp duration in seconds (default 0.05 = 50ms)
 */
function safeSet(node: any, key: string, value: any, rampTime = 0.05) {
  if (!(key in node)) return;

  const target = node[key];

  if (isToneParam(target)) {
    // Use rampTo for click-free parameter changes
    target.rampTo(value, rampTime);
  } else if ('value' in target && typeof target.value !== 'undefined') {
    // Has .value property but no rampTo
    target.value = value;
  } else {
    // Plain property - direct assignment
    node[key] = value;
  }
}

/**
 * Clamp value to range [min, max]
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ════════════════════════════════════════════════════════════════════════════
// Macro Type 1: Space - Controls reverb decay and wet amount
// ════════════════════════════════════════════════════════════════════════════
export function spaceM

acro(effects: EffectConfig[], amount: number) {
  const clamped = clamp(amount, 0, 1);

  for (const fx of effects) {
    if (fx.type === 'space' || fx.type === 'shimmer') {
      const node = fx.node;
      // Decay: 1s at 0, 6s at 1
      safeSet(node, 'decay', 1 + clamped * 5);
      // Wet: 0.2 at 0, 0.6 at 1
      safeSet(node, 'wet', 0.2 + clamped * 0.4);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Macro Type 2: Time - Controls delay time and feedback
// ════════════════════════════════════════════════════════════════════════════
export function timeMacro(effects: EffectConfig[], amount: number) {
  const clamped = clamp(amount, 0, 1);

  for (const fx of effects) {
    if (fx.type === 'echo' || fx.type === 'pingpong') {
      const node = fx.node;
      // Feedback: 0.1 at 0, 0.7 at 1
      safeSet(node, 'feedback', 0.1 + clamped * 0.6);
      // Wet: 0.2 at 0, 0.5 at 1
      safeSet(node, 'wet', 0.2 + clamped * 0.3);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Macro Type 3: Color - Controls filter frequency and resonance
// ════════════════════════════════════════════════════════════════════════════
export function colorMacro(effects: EffectConfig[], amount: number) {
  const clamped = clamp(amount, 0, 1);

  for (const fx of effects) {
    if (fx.type === 'filter') {
      const node = fx.node;
      // Frequency: 400Hz at 0, 4000Hz at 1
      safeSet(node, 'frequency', 400 + clamped * 3600);
      // Q (resonance): 0.5 at 0, 4 at 1
      safeSet(node, 'Q', 0.5 + clamped * 3.5);
    } else if (fx.type === 'eq3') {
      const node = fx.node;
      // Boost highs as amount increases
      safeSet(node, 'high', -6 + clamped * 12); // -6 to +6 dB
      safeSet(node, 'mid', -3 + clamped * 6);   // -3 to +3 dB
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Macro Type 4: Drive - Controls distortion and compression
// ════════════════════════════════════════════════════════════════════════════
export function driveMacro(effects: EffectConfig[], amount: number) {
  const clamped = clamp(amount, 0, 1);

  for (const fx of effects) {
    if (fx.type === 'fuzz' || fx.type === 'ring') {
      const node = fx.node;
      // Distortion amount: 0.1 at 0, 0.9 at 1
      safeSet(node, 'distortion', 0.1 + clamped * 0.8);
      // Wet: 0.2 at 0, 0.7 at 1
      safeSet(node, 'wet', 0.2 + clamped * 0.5);
    } else if (fx.type === 'compressor') {
      const node = fx.node;
      // Threshold: -30dB at 0, -10dB at 1
      safeSet(node, 'threshold', -30 + clamped * 20);
      // Ratio: 2:1 at 0, 8:1 at 1
      safeSet(node, 'ratio', 2 + clamped * 6);
    }
  }
}

/**
 * Apply all macros at once with individual amounts
 * Useful for preset application or simultaneous multi-parameter control
 */
export function applyMacros(
  effects: EffectConfig[],
  macros: {
    space?: number;
    time?: number;
    color?: number;
    drive?: number;
  }
) {
  if (macros.space !== undefined) spaceMacro(effects, macros.space);
  if (macros.time !== undefined) timeMacro(effects, macros.time);
  if (macros.color !== undefined) colorMacro(effects, macros.color);
  if (macros.drive !== undefined) driveMacro(effects, macros.drive);
}
