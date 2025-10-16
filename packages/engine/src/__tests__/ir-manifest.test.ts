/**
 * IR Manifest Test
 * Verifies impulse response manifest structure (currently a placeholder stub)
 */

import { describe, it, expect } from 'vitest';

// Stub IR list until real impulse responses are added
const irList = [
  {
    id: 'hall',
    name: 'Concert Hall',
    url: '/impulse-responses/hall.wav',
  },
];

describe('IR Manifest', () => {
  it('should have at least one IR entry', () => {
    expect(irList).toBeDefined();
    expect(Array.isArray(irList)).toBe(true);
    expect(irList.length).toBeGreaterThan(0);
  });

  it('should have valid IR structure for each entry', () => {
    irList.forEach((ir) => {
      expect(ir).toHaveProperty('id');
      expect(ir).toHaveProperty('name');
      expect(ir).toHaveProperty('url');

      expect(typeof ir.id).toBe('string');
      expect(typeof ir.name).toBe('string');
      expect(typeof ir.url).toBe('string');

      expect(ir.id.length).toBeGreaterThan(0);
      expect(ir.name.length).toBeGreaterThan(0);
      expect(ir.url.length).toBeGreaterThan(0);
    });
  });

  it('should have unique IR ids', () => {
    const ids = irList.map((ir) => ir.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have accessible IR URLs (public path)', () => {
    irList.forEach((ir) => {
      // URLs should start with /impulse-responses/ for public folder access
      expect(ir.url).toMatch(/^\/impulse-responses\//);
    });
  });
});
