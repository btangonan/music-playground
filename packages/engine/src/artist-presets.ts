import { makeEffect, connectChain, type EffectConfig } from './audio-engine';
import * as Tone from 'tone';

// ════════════════════════════════════════════════════════════════════════════
// Artist Preset Functions - High-Level Sound Design
// ════════════════════════════════════════════════════════════════════════════

/**
 * James Blake Signature: Shimmer reverb + subtle chorus + compression
 * Creates ethereal, spacious vocal-like textures
 */
export async function applyBlakeSound(instrumentOut: Tone.Gain): Promise<EffectConfig[]> {
  const chain: EffectConfig[] = [];

  // Shimmer reverb for ethereal quality
  const shimmer = await makeEffect('shimmer');
  if (shimmer.node.wet) shimmer.node.wet.rampTo(0.45, 0.05);
  chain.push(shimmer);

  // Subtle chorus for width
  const chorus = await makeEffect('chorus');
  if (chorus.node.wet) chorus.node.wet.rampTo(0.3, 0.05);
  chain.push(chorus);

  // Gentle compression to glue
  const comp = await makeEffect('compressor');
  chain.push(comp);

  connectChain(instrumentOut, chain);
  return chain;
}

/**
 * Fred Again.. Style: Pumping sidechain compression + autopanner + tight delay
 * Creates rhythmic, dynamic, dance-floor textures
 */
export async function applyFredPump(instrumentOut: Tone.Gain): Promise<EffectConfig[]> {
  const chain: EffectConfig[]  = [];

  // Autopanner for rhythmic movement
  const panner = await makeEffect('autopanner');
  if (panner.node.wet) panner.node.wet.rampTo(0.6, 0.05);
  chain.push(panner);

  // Heavy compression for pump effect
  const comp = await makeEffect('compressor');
  if (comp.node.threshold) comp.node.threshold.rampTo(-25, 0.05);
  if (comp.node.ratio) comp.node.ratio.rampTo(6, 0.05);
  chain.push(comp);

  // Tight delay for depth
  const echo = await makeEffect('echo');
  if (echo.node.wet) echo.node.wet.rampTo(0.25, 0.05);
  chain.push(echo);

  connectChain(instrumentOut, chain);
  return chain;
}

/**
 * Jamie xx Mallet: Bright EQ + phaser + ping-pong delay
 * Creates percussive, crystalline, rhythmic textures
 */
export async function applyJamieMallet(instrumentOut: Tone.Gain): Promise<EffectConfig[]> {
  const chain: EffectConfig[] = [];

  // Bright EQ boost
  const eq = await makeEffect('eq3');
  if (eq.node.high) eq.node.high.rampTo(4, 0.05);
  if (eq.node.mid) eq.node.mid.rampTo(3, 0.05);
  if (eq.node.low) eq.node.low.rampTo(-6, 0.05);
  chain.push(eq);

  // Phaser for movement
  const phaser = await makeEffect('phaser');
  if (phaser.node.wet) phaser.node.wet.rampTo(0.4, 0.05);
  chain.push(phaser);

  // Ping-pong delay for stereo width
  const pingpong = await makeEffect('pingpong');
  if (pingpong.node.wet) pingpong.node.wet.rampTo(0.4, 0.05);
  chain.push(pingpong);

  connectChain(instrumentOut, chain);
  return chain;
}

/**
 * Radiohead Tape: Lo-fi crush + autofilter + subtle distortion
 * Creates degraded, analog, nostalgic textures
 */
export async function applyRadioheadTape(instrumentOut: Tone.Gain): Promise<EffectConfig[]> {
  const chain: EffectConfig[] = [];

  // Bit crushing for lo-fi character
  const crush = await makeEffect('crush');
  chain.push(crush);

  // Autofilter for tape-like movement
  const autofilter = await makeEffect('autofilter');
  if (autofilter.node.wet) autofilter.node.wet.rampTo(0.6, 0.05);
  chain.push(autofilter);

  // Light fuzz for warmth
  const fuzz = await makeEffect('fuzz');
  if (fuzz.node.wet) fuzz.node.wet.rampTo(0.35, 0.05);
  chain.push(fuzz);

  // Tape delay
  const echo = await makeEffect('echo');
  if (echo.node.feedback) echo.node.feedback.rampTo(0.45, 0.05);
  if (echo.node.wet) echo.node.wet.rampTo(0.3, 0.05);
  chain.push(echo);

  connectChain(instrumentOut, chain);
  return chain;
}

/**
 * Ambient Atmosphere: Lush reverb + tremolo + subtle chorus
 * Creates expansive, evolving, atmospheric textures
 */
export async function applyAtmosphere(instrumentOut: Tone.Gain): Promise<EffectConfig[]> {
  const chain: EffectConfig[] = [];

  // Lush reverb
  const space = await makeEffect('space');
  if (space.node.wet) space.node.wet.rampTo(0.5, 0.05);
  chain.push(space);

  // Tremolo for movement
  const tremolo = await makeEffect('tremolo');
  if (tremolo.node.wet) tremolo.node.wet.rampTo(0.4, 0.05);
  chain.push(tremolo);

  // Chorus for width
  const chorus = await makeEffect('chorus');
  if (chorus.node.wet) chorus.node.wet.rampTo(0.45, 0.05);
  chain.push(chorus);

  // Compression to control dynamics
  const comp = await makeEffect('compressor');
  chain.push(comp);

  connectChain(instrumentOut, chain);
  return chain;
}
