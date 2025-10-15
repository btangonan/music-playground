#!/usr/bin/env node

/**
 * Parameter Curves Validation Test
 *
 * Tests all parameter curve mapping functions for correctness,
 * boundary conditions, and mathematical accuracy.
 */

// Since this is ES modules, we need to use import statements
import {
  mapFrequency,
  unmapFrequency,
  mapGain,
  dbToGain,
  gainToDb,
  mapTime,
  mapQ,
  mapRatio
} from '../src/lib/param-curves.ts';

const EPSILON = 0.0001; // Tolerance for floating point comparisons

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, testName, expected, actual) {
    if (condition) {
      this.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual: ${actual}`);
    }
    this.tests.push({ name: testName, passed: condition });
  }

  assertClose(actual, expected, testName, tolerance = EPSILON) {
    const diff = Math.abs(actual - expected);
    const close = diff < tolerance;
    this.assert(close, testName, expected, actual);
  }

  summary() {
    const total = this.passed + this.failed;
    const percentage = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.passed} (${percentage}%)`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(60));

    return this.failed === 0;
  }
}

const runner = new TestRunner();

console.log('🧪 Parameter Curves Validation Tests\n');

// ═══════════════════════════════════════════════════════════════════════════
// mapFrequency Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing mapFrequency (Exponential Frequency Scaling)\n');

// Boundary tests
runner.assertClose(
  mapFrequency(0),
  20,
  'mapFrequency(0) should return minimum frequency (20Hz)'
);

runner.assertClose(
  mapFrequency(1),
  20000,
  'mapFrequency(1) should return maximum frequency (20kHz)'
);

// Geometric mean test (at 0.5)
const geomMean = Math.sqrt(20 * 20000);
runner.assertClose(
  mapFrequency(0.5),
  geomMean,
  'mapFrequency(0.5) should return geometric mean (~632Hz)',
  1 // Allow 1Hz tolerance
);

// Custom range test
runner.assertClose(
  mapFrequency(0, 100, 4000),
  100,
  'mapFrequency with custom range (100-4000Hz) should respect minimum'
);

runner.assertClose(
  mapFrequency(1, 100, 4000),
  4000,
  'mapFrequency with custom range (100-4000Hz) should respect maximum'
);

// Clamping tests
runner.assertClose(
  mapFrequency(-0.5),
  20,
  'mapFrequency should clamp negative values to minimum'
);

runner.assertClose(
  mapFrequency(1.5),
  20000,
  'mapFrequency should clamp values > 1 to maximum'
);

// ═══════════════════════════════════════════════════════════════════════════
// unmapFrequency Tests (Inverse Mapping)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing unmapFrequency (Inverse Frequency Mapping)\n');

// Round-trip tests
runner.assertClose(
  unmapFrequency(mapFrequency(0.3)),
  0.3,
  'unmapFrequency(mapFrequency(0.3)) should return 0.3 (round-trip)',
  0.001
);

runner.assertClose(
  unmapFrequency(mapFrequency(0.7)),
  0.7,
  'unmapFrequency(mapFrequency(0.7)) should return 0.7 (round-trip)',
  0.001
);

// Boundary round-trips
runner.assertClose(
  unmapFrequency(20),
  0,
  'unmapFrequency(20Hz) should return 0'
);

runner.assertClose(
  unmapFrequency(20000),
  1,
  'unmapFrequency(20kHz) should return 1'
);

// ═══════════════════════════════════════════════════════════════════════════
// mapGain Tests (Logarithmic Gain in dB)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing mapGain (Logarithmic Gain Mapping)\n');

// Boundary tests
runner.assertClose(
  mapGain(0),
  -60,
  'mapGain(0) should return minimum gain (-60dB)'
);

runner.assertClose(
  mapGain(1),
  0,
  'mapGain(1) should return maximum gain (0dB)'
);

// Linear in dB space (halfway point)
runner.assertClose(
  mapGain(0.5),
  -30,
  'mapGain(0.5) should return -30dB (linear in dB space)'
);

// Custom range test
runner.assertClose(
  mapGain(0, -40, -10),
  -40,
  'mapGain with custom range (-40 to -10dB) should respect minimum'
);

runner.assertClose(
  mapGain(0.5, -40, -10),
  -25,
  'mapGain with custom range should be linear in dB space'
);

// Clamping tests
runner.assertClose(
  mapGain(-0.5),
  -60,
  'mapGain should clamp negative values to minimum'
);

runner.assertClose(
  mapGain(1.5),
  0,
  'mapGain should clamp values > 1 to maximum'
);

// ═══════════════════════════════════════════════════════════════════════════
// dbToGain and gainToDb Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing dbToGain and gainToDb (dB <-> Linear Conversion)\n');

// Known conversions
runner.assertClose(
  dbToGain(0),
  1.0,
  'dbToGain(0dB) should return 1.0 (unity gain)'
);

runner.assertClose(
  dbToGain(6),
  2.0,
  'dbToGain(6dB) should return ~2.0 (double amplitude)',
  0.01
);

runner.assertClose(
  dbToGain(-6),
  0.5,
  'dbToGain(-6dB) should return ~0.5 (half amplitude)',
  0.01
);

runner.assertClose(
  dbToGain(-20),
  0.1,
  'dbToGain(-20dB) should return 0.1 (10% amplitude)',
  0.01
);

// Round-trip tests
runner.assertClose(
  gainToDb(dbToGain(-12)),
  -12,
  'gainToDb(dbToGain(-12)) should return -12dB (round-trip)',
  0.01
);

runner.assertClose(
  dbToGain(gainToDb(0.5)),
  0.5,
  'dbToGain(gainToDb(0.5)) should return 0.5 (round-trip)',
  0.01
);

// Edge cases
runner.assert(
  !isNaN(gainToDb(0.000001)) && isFinite(gainToDb(0.000001)),
  'gainToDb should handle very small gains without -Infinity',
  'finite number',
  gainToDb(0.000001)
);

// ═══════════════════════════════════════════════════════════════════════════
// mapTime Tests (Exponential Time Curves)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing mapTime (Exponential Time Mapping)\n');

// Boundary tests
runner.assertClose(
  mapTime(0),
  0.001,
  'mapTime(0) should return minimum time (1ms)'
);

runner.assertClose(
  mapTime(1),
  10,
  'mapTime(1) should return maximum time (10s)'
);

// Geometric mean test
const timeMean = Math.sqrt(0.001 * 10);
runner.assertClose(
  mapTime(0.5),
  timeMean,
  'mapTime(0.5) should return geometric mean (~0.1s)',
  0.001
);

// Custom range test
runner.assertClose(
  mapTime(0, 0.01, 2),
  0.01,
  'mapTime with custom range (10ms-2s) should respect minimum'
);

runner.assertClose(
  mapTime(1, 0.01, 2),
  2,
  'mapTime with custom range (10ms-2s) should respect maximum'
);

// Clamping tests
runner.assertClose(
  mapTime(-0.5),
  0.001,
  'mapTime should clamp negative values to minimum'
);

runner.assertClose(
  mapTime(1.5),
  10,
  'mapTime should clamp values > 1 to maximum'
);

// ═══════════════════════════════════════════════════════════════════════════
// mapQ Tests (Logarithmic Q Factor)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing mapQ (Logarithmic Q Factor Mapping)\n');

// Boundary tests
runner.assertClose(
  mapQ(0),
  0.1,
  'mapQ(0) should return minimum Q (0.1)'
);

runner.assertClose(
  mapQ(1),
  30,
  'mapQ(1) should return maximum Q (30)'
);

// Geometric mean test
const qMean = Math.sqrt(0.1 * 30);
runner.assertClose(
  mapQ(0.5),
  qMean,
  'mapQ(0.5) should return geometric mean (~1.73)',
  0.01
);

// Custom range test
runner.assertClose(
  mapQ(0, 0.5, 20),
  0.5,
  'mapQ with custom range (0.5-20) should respect minimum'
);

runner.assertClose(
  mapQ(1, 0.5, 20),
  20,
  'mapQ with custom range (0.5-20) should respect maximum'
);

// ═══════════════════════════════════════════════════════════════════════════
// mapRatio Tests (Logarithmic Compression Ratio)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing mapRatio (Logarithmic Ratio Mapping)\n');

// Boundary tests
runner.assertClose(
  mapRatio(0),
  1,
  'mapRatio(0) should return minimum ratio (1:1, no compression)'
);

runner.assertClose(
  mapRatio(1),
  20,
  'mapRatio(1) should return maximum ratio (20:1, heavy limiting)'
);

// Common compression ratios
const ratio_025 = mapRatio(0.25);
runner.assert(
  ratio_025 > 1 && ratio_025 < 4,
  'mapRatio(0.25) should return gentle compression (1-4:1)',
  '1-4:1',
  `${ratio_025.toFixed(2)}:1`
);

const ratio_050 = mapRatio(0.5);
runner.assert(
  ratio_050 > 4 && ratio_050 < 6,
  'mapRatio(0.5) should return medium compression (4-6:1)',
  '4-6:1',
  `${ratio_050.toFixed(2)}:1`
);

const ratio_075 = mapRatio(0.75);
runner.assert(
  ratio_075 > 8 && ratio_075 < 12,
  'mapRatio(0.75) should return heavy compression (8-12:1)',
  '8-12:1',
  `${ratio_075.toFixed(2)}:1`
);

// Custom range test
runner.assertClose(
  mapRatio(0, 1, 12),
  1,
  'mapRatio with custom range (1-12:1) should respect minimum'
);

runner.assertClose(
  mapRatio(1, 1, 12),
  12,
  'mapRatio with custom range (1-12:1) should respect maximum'
);

// ═══════════════════════════════════════════════════════════════════════════
// Perceptual Linearity Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Perceptual Linearity (Equal Steps Feel Equal)\n');

// For exponential curves, equal input steps should result in equal ratio steps
const freq1 = mapFrequency(0.2);
const freq2 = mapFrequency(0.4);
const freq3 = mapFrequency(0.6);
const freq4 = mapFrequency(0.8);

const ratio1 = freq2 / freq1;
const ratio2 = freq3 / freq2;
const ratio3 = freq4 / freq3;

runner.assertClose(
  ratio1,
  ratio2,
  'Frequency steps should have equal ratios (perceptual linearity)',
  0.01
);

runner.assertClose(
  ratio2,
  ratio3,
  'Frequency steps should maintain equal ratios across range',
  0.01
);

// For logarithmic gain curves (linear in dB), equal input steps should result in equal dB steps
const gain1 = mapGain(0.2);
const gain2 = mapGain(0.4);
const gain3 = mapGain(0.6);
const gain4 = mapGain(0.8);

const diffDb1 = gain2 - gain1;
const diffDb2 = gain3 - gain2;
const diffDb3 = gain4 - gain3;

runner.assertClose(
  diffDb1,
  diffDb2,
  'Gain steps should have equal dB differences (linear in dB space)',
  0.01
);

runner.assertClose(
  diffDb2,
  diffDb3,
  'Gain steps should maintain equal dB differences across range',
  0.01
);

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

const success = runner.summary();
process.exit(success ? 0 : 1);
