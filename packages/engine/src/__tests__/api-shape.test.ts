/**
 * API Shape Test
 * Verifies engine package structure and module resolution
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Engine Package Structure', () => {
  it('should have package.json with correct main entry', () => {
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(pkg.name).toBe('@music/engine');
    expect(pkg.main).toBeDefined();
    expect(pkg.types).toBeDefined();
  });

  it('should have audio-engine.ts as main export', () => {
    const audioEnginePath = resolve(__dirname, '../audio-engine.ts');
    const content = readFileSync(audioEnginePath, 'utf-8');

    // Verify key exports exist in source
    expect(content).toContain('export const Engine');
    expect(content).toContain('export function makeInstrument');
    expect(content).toContain('export const Bus');
  });

  it('should have stub implementations in place', () => {
    const synthAdvancedPath = resolve(__dirname, '../synth-advanced.ts');
    const ambientLayerPath = resolve(__dirname, '../ambient-layer.ts');
    const effectWiringPath = resolve(__dirname, '../effect-wiring.ts');

    expect(readFileSync(synthAdvancedPath, 'utf-8')).toContain('@stub');
    expect(readFileSync(ambientLayerPath, 'utf-8')).toContain('@stub');
    expect(readFileSync(effectWiringPath, 'utf-8')).toContain('@stub');
  });

  it('should have reverse-reverb effect', () => {
    const reverseReverbPath = resolve(__dirname, '../reverse-reverb.ts');
    const content = readFileSync(reverseReverbPath, 'utf-8');

    expect(content).toContain('export function makeReverseReverb');
    expect(content).toContain('triggerReverse');
  });

  it('should have tsconfig with headless lib restriction', () => {
    const tsconfigPath = resolve(__dirname, '../../tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

    expect(tsconfig.compilerOptions.lib).toEqual(['ES2022']);
    expect(tsconfig.compilerOptions.lib).not.toContain('DOM');
  });
});
