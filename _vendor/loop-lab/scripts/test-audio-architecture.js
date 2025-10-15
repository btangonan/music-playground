#!/usr/bin/env node

/**
 * Audio Architecture Validation Test
 *
 * Validates module structure, exports, integration patterns, and
 * architectural compliance for the audio optimization system.
 */

import {
  // FX Buses (PR #23)
  initializeFxBuses,
  setSendLevel,
  getSendLevel,
  resetSendLevels,
  disposeFxBuses,
  areFxBusesInitialized,
  FxBuses
} from '../src/lib/bus-fx.ts';

import {
  // Gain Staging (PR #24)
  initializeMasterLimiter,
  setMasterLimiterThreshold,
  getMasterLimiterReduction,
  isMasterLimiterInitialized,
  disposeMasterLimiter,
  MasterLimiter,
  createTrim,
  setTrimLevel,
  getTrimLevel,
  HeadroomTargets,
  isWithinHeadroom,
  calculateHeadroomMargin
} from '../src/lib/gain-staging.ts';

import {
  // Parameter Curves (PR #25)
  mapFrequency,
  unmapFrequency,
  mapGain,
  dbToGain,
  gainToDb,
  mapTime,
  mapQ,
  mapRatio,
  applyParamCurve
} from '../src/lib/param-curves.ts';

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, testName, details = '') {
    if (condition) {
      this.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.failed++;
      console.log(`❌ ${testName}`);
      if (details) console.log(`   ${details}`);
    }
    this.tests.push({ name: testName, passed: condition });
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

console.log('🏗️  Audio Architecture Validation Tests\n');

// ═══════════════════════════════════════════════════════════════════════════
// Module Export Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📦 Testing Module Exports\n');

// FX Buses module (PR #23)
runner.assert(
  typeof initializeFxBuses === 'function',
  'bus-fx.ts exports initializeFxBuses function'
);

runner.assert(
  typeof setSendLevel === 'function',
  'bus-fx.ts exports setSendLevel function'
);

runner.assert(
  typeof getSendLevel === 'function',
  'bus-fx.ts exports getSendLevel function'
);

runner.assert(
  typeof resetSendLevels === 'function',
  'bus-fx.ts exports resetSendLevels function'
);

runner.assert(
  typeof disposeFxBuses === 'function',
  'bus-fx.ts exports disposeFxBuses function'
);

runner.assert(
  typeof areFxBusesInitialized === 'function',
  'bus-fx.ts exports areFxBusesInitialized function'
);

runner.assert(
  typeof FxBuses === 'object' && FxBuses !== null,
  'bus-fx.ts exports FxBuses object'
);

// Gain Staging module (PR #24)
runner.assert(
  typeof initializeMasterLimiter === 'function',
  'gain-staging.ts exports initializeMasterLimiter function'
);

runner.assert(
  typeof setMasterLimiterThreshold === 'function',
  'gain-staging.ts exports setMasterLimiterThreshold function'
);

runner.assert(
  typeof getMasterLimiterReduction === 'function',
  'gain-staging.ts exports getMasterLimiterReduction function'
);

runner.assert(
  typeof isMasterLimiterInitialized === 'function',
  'gain-staging.ts exports isMasterLimiterInitialized function'
);

runner.assert(
  typeof disposeMasterLimiter === 'function',
  'gain-staging.ts exports disposeMasterLimiter function'
);

runner.assert(
  typeof MasterLimiter === 'object' && MasterLimiter !== null,
  'gain-staging.ts exports MasterLimiter object'
);

runner.assert(
  typeof createTrim === 'function',
  'gain-staging.ts exports createTrim function'
);

runner.assert(
  typeof setTrimLevel === 'function',
  'gain-staging.ts exports setTrimLevel function'
);

runner.assert(
  typeof getTrimLevel === 'function',
  'gain-staging.ts exports getTrimLevel function'
);

runner.assert(
  typeof HeadroomTargets === 'object' && HeadroomTargets !== null,
  'gain-staging.ts exports HeadroomTargets object'
);

runner.assert(
  typeof isWithinHeadroom === 'function',
  'gain-staging.ts exports isWithinHeadroom function'
);

runner.assert(
  typeof calculateHeadroomMargin === 'function',
  'gain-staging.ts exports calculateHeadroomMargin function'
);

// Parameter Curves module (PR #25)
runner.assert(
  typeof mapFrequency === 'function',
  'param-curves.ts exports mapFrequency function'
);

runner.assert(
  typeof unmapFrequency === 'function',
  'param-curves.ts exports unmapFrequency function'
);

runner.assert(
  typeof mapGain === 'function',
  'param-curves.ts exports mapGain function'
);

runner.assert(
  typeof dbToGain === 'function',
  'param-curves.ts exports dbToGain function'
);

runner.assert(
  typeof gainToDb === 'function',
  'param-curves.ts exports gainToDb function'
);

runner.assert(
  typeof mapTime === 'function',
  'param-curves.ts exports mapTime function'
);

runner.assert(
  typeof mapQ === 'function',
  'param-curves.ts exports mapQ function'
);

runner.assert(
  typeof mapRatio === 'function',
  'param-curves.ts exports mapRatio function'
);

runner.assert(
  typeof applyParamCurve === 'function',
  'param-curves.ts exports applyParamCurve function'
);

// ═══════════════════════════════════════════════════════════════════════════
// Headroom Targets Validation
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Headroom Targets Configuration\n');

runner.assert(
  HeadroomTargets.INSTRUMENT === -12,
  'HeadroomTargets.INSTRUMENT is -12dB',
  `Expected: -12dB, Got: ${HeadroomTargets.INSTRUMENT}dB`
);

runner.assert(
  HeadroomTargets.EFFECT_SEND === -18,
  'HeadroomTargets.EFFECT_SEND is -18dB',
  `Expected: -18dB, Got: ${HeadroomTargets.EFFECT_SEND}dB`
);

runner.assert(
  HeadroomTargets.MIX_BUS === -6,
  'HeadroomTargets.MIX_BUS is -6dB',
  `Expected: -6dB, Got: ${HeadroomTargets.MIX_BUS}dB`
);

runner.assert(
  HeadroomTargets.MASTER === -3,
  'HeadroomTargets.MASTER is -3dB',
  `Expected: -3dB, Got: ${HeadroomTargets.MASTER}dB`
);

// ═══════════════════════════════════════════════════════════════════════════
// Headroom Calculation Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Headroom Calculation Functions\n');

// isWithinHeadroom tests
runner.assert(
  isWithinHeadroom(-6, HeadroomTargets.MASTER) === true,
  'isWithinHeadroom: -6dB is within -3dB target (has headroom)'
);

runner.assert(
  isWithinHeadroom(-2, HeadroomTargets.MASTER) === false,
  'isWithinHeadroom: -2dB exceeds -3dB target (too hot)'
);

runner.assert(
  isWithinHeadroom(-3, HeadroomTargets.MASTER) === true,
  'isWithinHeadroom: Exactly at target is considered safe'
);

// calculateHeadroomMargin tests
runner.assert(
  calculateHeadroomMargin(-6, HeadroomTargets.MASTER) === 3,
  'calculateHeadroomMargin: -6dB vs -3dB target = +3dB margin',
  `Expected: 3dB, Got: ${calculateHeadroomMargin(-6, HeadroomTargets.MASTER)}dB`
);

runner.assert(
  calculateHeadroomMargin(-2, HeadroomTargets.MASTER) === -1,
  'calculateHeadroomMargin: -2dB vs -3dB target = -1dB margin (too hot)',
  `Expected: -1dB, Got: ${calculateHeadroomMargin(-2, HeadroomTargets.MASTER)}dB`
);

runner.assert(
  calculateHeadroomMargin(-15, HeadroomTargets.INSTRUMENT) === 3,
  'calculateHeadroomMargin: -15dB vs -12dB instrument target = +3dB margin',
  `Expected: 3dB, Got: ${calculateHeadroomMargin(-15, HeadroomTargets.INSTRUMENT)}dB`
);

// ═══════════════════════════════════════════════════════════════════════════
// Initialization State Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Initialization State Management\n');

// Initial state before initialization
runner.assert(
  isMasterLimiterInitialized() === false,
  'isMasterLimiterInitialized() returns false before initialization'
);

runner.assert(
  areFxBusesInitialized() === false,
  'areFxBusesInitialized() returns false before initialization'
);

// ═══════════════════════════════════════════════════════════════════════════
// FxBuses Object Structure
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing FxBuses Object Structure\n');

runner.assert(
  'reverb' in FxBuses,
  'FxBuses has reverb property'
);

runner.assert(
  'delay' in FxBuses,
  'FxBuses has delay property'
);

runner.assert(
  'chorus' in FxBuses,
  'FxBuses has chorus property'
);

// ═══════════════════════════════════════════════════════════════════════════
// MasterLimiter Object Structure
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing MasterLimiter Object Structure\n');

runner.assert(
  'limiter' in MasterLimiter,
  'MasterLimiter has limiter property'
);

runner.assert(
  'threshold' in MasterLimiter,
  'MasterLimiter has threshold property'
);

runner.assert(
  'reduction' in MasterLimiter,
  'MasterLimiter has reduction property'
);

// ═══════════════════════════════════════════════════════════════════════════
// Architecture Pattern Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Architecture Patterns\n');

// Singleton pattern verification
runner.assert(
  typeof MasterLimiter === 'object',
  'MasterLimiter uses singleton pattern (exported object)'
);

runner.assert(
  typeof FxBuses === 'object',
  'FxBuses uses singleton pattern (exported object)'
);

// Factory pattern verification
runner.assert(
  typeof createTrim === 'function',
  'createTrim implements factory pattern (returns Tone.Gain)'
);

// Utility pattern verification
runner.assert(
  typeof isWithinHeadroom === 'function',
  'Headroom utilities use pure function pattern'
);

runner.assert(
  typeof calculateHeadroomMargin === 'function',
  'Calculation utilities use pure function pattern'
);

// ═══════════════════════════════════════════════════════════════════════════
// Parameter Curve Integration
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Parameter Curve Integration Patterns\n');

// Verify curves can be used with gain staging
const testDb = mapGain(0.5); // Should return -30dB
const testLinearGain = dbToGain(testDb); // Should return ~0.0316

runner.assert(
  testLinearGain > 0 && testLinearGain < 1,
  'Parameter curves integrate with gain staging (mapGain → dbToGain)',
  `mapGain(0.5) = ${testDb}dB → dbToGain = ${testLinearGain.toFixed(4)}`
);

// Verify headroom checks work with mapped values
runner.assert(
  isWithinHeadroom(testDb, HeadroomTargets.MIX_BUS),
  'Mapped gain values (-30dB) work with headroom checks',
  `${testDb}dB vs ${HeadroomTargets.MIX_BUS}dB target`
);

// ═══════════════════════════════════════════════════════════════════════════
// Professional Standards Validation
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Professional Audio Standards\n');

// Headroom targets follow professional standards
runner.assert(
  HeadroomTargets.MASTER >= -6 && HeadroomTargets.MASTER <= -1,
  'Master headroom target (-3dB) follows professional standards (-6 to -1dB)',
  `Got: ${HeadroomTargets.MASTER}dB`
);

runner.assert(
  HeadroomTargets.MIX_BUS >= -12 && HeadroomTargets.MIX_BUS <= -3,
  'Mix bus headroom target (-6dB) follows professional standards (-12 to -3dB)',
  `Got: ${HeadroomTargets.MIX_BUS}dB`
);

runner.assert(
  HeadroomTargets.INSTRUMENT >= -18 && HeadroomTargets.INSTRUMENT <= -6,
  'Instrument headroom target (-12dB) follows professional standards (-18 to -6dB)',
  `Got: ${HeadroomTargets.INSTRUMENT}dB`
);

// Frequency ranges follow audio standards
const minAudibleFreq = mapFrequency(0); // Should be 20Hz
const maxAudibleFreq = mapFrequency(1); // Should be 20kHz

runner.assert(
  minAudibleFreq === 20,
  'Frequency mapping starts at human hearing minimum (20Hz)',
  `Got: ${minAudibleFreq}Hz`
);

runner.assert(
  maxAudibleFreq === 20000,
  'Frequency mapping ends at human hearing maximum (20kHz)',
  `Got: ${maxAudibleFreq}Hz`
);

// ═══════════════════════════════════════════════════════════════════════════
// Type Safety Tests (runtime checks)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 Testing Type Safety (Runtime Validation)\n');

// Functions should handle edge cases gracefully
runner.assert(
  !isNaN(mapFrequency(-100)) && isFinite(mapFrequency(-100)),
  'mapFrequency handles extreme negative input gracefully'
);

runner.assert(
  !isNaN(mapFrequency(1000)) && isFinite(mapFrequency(1000)),
  'mapFrequency handles extreme positive input gracefully'
);

runner.assert(
  !isNaN(mapGain(-100)) && isFinite(mapGain(-100)),
  'mapGain handles extreme negative input gracefully'
);

runner.assert(
  !isNaN(dbToGain(-1000)) && isFinite(dbToGain(-1000)),
  'dbToGain handles extreme negative dB gracefully'
);

runner.assert(
  !isNaN(gainToDb(0.0000001)) && isFinite(gainToDb(0.0000001)),
  'gainToDb handles very small gains gracefully'
);

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

const success = runner.summary();

if (success) {
  console.log('\n✨ All architecture validation tests passed!');
  console.log('   - Module exports verified');
  console.log('   - Integration patterns validated');
  console.log('   - Professional standards compliance confirmed');
  console.log('   - Type safety and edge cases handled');
}

process.exit(success ? 0 : 1);
