/**
 * API Smoke Test
 * Guards against regressions in public API surface
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Engine API - Smoke Tests', () => {
  const audioEnginePath = resolve(__dirname, '../audio-engine.ts');
  const audioEngineContent = readFileSync(audioEnginePath, 'utf-8');

  describe('Core Function Exports', () => {
    it('should export makeInstrument function', () => {
      expect(audioEngineContent).toContain('export function makeInstrument');
      // Verify function signature includes all instrument kinds
      expect(audioEngineContent).toMatch(/kind:.*'keys'.*'bass'.*'drums'.*'pad_gate'/);
    });

    it('should export makeEffect function', () => {
      expect(audioEngineContent).toContain('export async function makeEffect');
    });

    it('should export connectChain function', () => {
      expect(audioEngineContent).toContain('export function connectChain');
    });

    it('should export setTempo function', () => {
      expect(audioEngineContent).toContain('export function setTempo');
    });

    it('should export setTimeSig function', () => {
      expect(audioEngineContent).toContain('export function setTimeSig');
    });
  });

  describe('Engine Object Export', () => {
    it('should export Engine with start method', () => {
      expect(audioEngineContent).toContain('export const Engine');
      expect(audioEngineContent).toContain('start: async ()');
    });

    it('should export Engine with play method', () => {
      expect(audioEngineContent).toContain('play: ()');
    });

    it('should export Engine with stop method', () => {
      expect(audioEngineContent).toContain('stop: ()');
    });

    it('should export Engine with getContext method', () => {
      expect(audioEngineContent).toContain('getContext: ()');
    });

    it('should export Engine with getTransport method', () => {
      expect(audioEngineContent).toContain('getTransport: ()');
    });
  });

  describe('Bus Object Export', () => {
    it('should export Bus with master tap', () => {
      expect(audioEngineContent).toContain('export const Bus');
      expect(audioEngineContent).toContain('master: new Tone.Gain');
    });

    it('should export Bus with recordTap', () => {
      expect(audioEngineContent).toContain('recordTap: new Tone.Gain');
    });

    it('should export Bus with kick tap', () => {
      expect(audioEngineContent).toContain('kick: new Tone.Gain');
    });

    it('should export Bus with ambient tap', () => {
      expect(audioEngineContent).toContain('ambient: new Tone.Gain');
    });
  });

  describe('TypeScript Interface Exports', () => {
    it('should export InstrumentConfig interface', () => {
      expect(audioEngineContent).toContain('export interface InstrumentConfig');
    });

    it('should export EffectConfig interface', () => {
      expect(audioEngineContent).toContain('export interface EffectConfig');
    });

    it('should export DeviceTrackRef interface', () => {
      expect(audioEngineContent).toContain('export interface DeviceTrackRef');
    });
  });

  describe('Removed/Deprecated APIs', () => {
    it('should NOT export startRec (removed for headless architecture)', () => {
      expect(audioEngineContent).not.toContain('export function startRec');
    });

    it('should NOT export stopRec (removed for headless architecture)', () => {
      expect(audioEngineContent).not.toContain('export function stopRec');
    });

    it('should NOT use MediaRecorder in exports', () => {
      // MediaRecorder usage should not be in exported functions
      const exportBlocks = audioEngineContent.split('export').filter(block =>
        block.includes('function') || block.includes('const')
      );

      exportBlocks.forEach(block => {
        expect(block).not.toContain('MediaRecorder');
      });
    });
  });

  describe('Effect Types Coverage', () => {
    it('should support basic effects', () => {
      // Verify makeEffect switch statement includes expected types
      expect(audioEngineContent).toContain("case 'space':");
      expect(audioEngineContent).toContain("case 'echo':");
      expect(audioEngineContent).toContain("case 'filter':");
      expect(audioEngineContent).toContain("case 'fuzz':");
    });

    it('should support artist sound pack effects', () => {
      expect(audioEngineContent).toContain("case 'chorus':");
      expect(audioEngineContent).toContain("case 'shimmer':");
      expect(audioEngineContent).toContain("case 'harmonizer':");
      expect(audioEngineContent).toContain("case 'reverse_reverb':");
    });

    it('should support width control effect', () => {
      expect(audioEngineContent).toContain("case 'width':");
    });

    it('should support ambient texture effect', () => {
      expect(audioEngineContent).toContain("case 'ambient':");
    });
  });

  describe('Instrument Types Coverage', () => {
    it('should support keys instrument', () => {
      expect(audioEngineContent).toContain("if (kind === 'keys')");
      expect(audioEngineContent).toContain('Tone.PolySynth');
    });

    it('should support bass instrument', () => {
      expect(audioEngineContent).toContain("if (kind === 'bass')");
      expect(audioEngineContent).toContain('Tone.MonoSynth');
    });

    it('should support drums instrument', () => {
      expect(audioEngineContent).toContain("if (kind === 'drums')");
      expect(audioEngineContent).toContain('Tone.Players');
    });

    it('should support pad_gate instrument', () => {
      expect(audioEngineContent).toContain("if (kind === 'pad_gate')");
      expect(audioEngineContent).toContain('makeInstrumentV2');
    });
  });
});
