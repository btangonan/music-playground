#!/usr/bin/env node

/**
 * Static Analysis and Code Quality Tests
 *
 * Validates code structure, patterns, and quality metrics without
 * requiring module execution.
 */

import fs from 'fs';
import path from 'path';

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

console.log('🔍 Static Analysis and Code Quality Tests\n');

// ═══════════════════════════════════════════════════════════════════════════
// File Structure Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📁 Testing File Structure\n');

const basePath = process.cwd();
const files = {
  'param-curves': path.join(basePath, 'src/lib/param-curves.ts'),
  'bus-fx': path.join(basePath, 'src/lib/bus-fx.ts'),
  'gain-staging': path.join(basePath, 'src/lib/gain-staging.ts'),
  'audio-engine': path.join(basePath, 'src/lib/audio-engine.ts')
};

for (const [name, filePath] of Object.entries(files)) {
  runner.assert(
    fs.existsSync(filePath),
    `${name}.ts exists in src/lib/`,
    `Path: ${filePath}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Module Export Pattern Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📦 Testing Export Patterns\n');

function checkExports(filePath, moduleName, expectedExports) {
  if (!fs.existsSync(filePath)) {
    runner.assert(false, `${moduleName} file not found for export check`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  for (const exportName of expectedExports) {
    const hasExport =
      content.includes(`export function ${exportName}`) ||
      content.includes(`export const ${exportName}`) ||
      content.includes(`export { ${exportName}`) ||
      content.includes(`${exportName},`) ||
      content.includes(`${exportName} }`);

    runner.assert(
      hasExport,
      `${moduleName} exports ${exportName}`,
      `Looking for: export function/const ${exportName}`
    );
  }
}

// Check param-curves exports
checkExports(files['param-curves'], 'param-curves', [
  'mapFrequency',
  'unmapFrequency',
  'mapGain',
  'dbToGain',
  'gainToDb',
  'mapTime',
  'mapQ',
  'mapRatio'
]);

// Check bus-fx exports
checkExports(files['bus-fx'], 'bus-fx', [
  'initializeFxBuses',
  'setSendLevel',
  'getSendLevel',
  'resetSendLevels',
  'disposeFxBuses',
  'areFxBusesInitialized',
  'FxBuses'
]);

// Check gain-staging exports
checkExports(files['gain-staging'], 'gain-staging', [
  'initializeMasterLimiter',
  'setMasterLimiterThreshold',
  'getMasterLimiterReduction',
  'isMasterLimiterInitialized',
  'disposeMasterLimiter',
  'MasterLimiter',
  'createTrim',
  'setTrimLevel',
  'getTrimLevel',
  'HeadroomTargets'
]);

// ═══════════════════════════════════════════════════════════════════════════
// Documentation Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📚 Testing Documentation Quality\n');

function checkDocumentation(filePath, moduleName) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for module-level documentation
  runner.assert(
    content.includes('/**') && content.includes('*/'),
    `${moduleName} has JSDoc comments`
  );

  // Check for usage examples
  runner.assert(
    content.includes('@example') || content.includes('Example:') || content.includes('Usage:'),
    `${moduleName} includes usage examples`
  );

  // Check for parameter documentation
  runner.assert(
    content.includes('@param') || content.includes('@parameter'),
    `${moduleName} documents function parameters`
  );

  // Check for return documentation
  runner.assert(
    content.includes('@returns') || content.includes('@return'),
    `${moduleName} documents return values`
  );
}

checkDocumentation(files['param-curves'], 'param-curves.ts');
checkDocumentation(files['bus-fx'], 'bus-fx.ts');
checkDocumentation(files['gain-staging'], 'gain-staging.ts');

// ═══════════════════════════════════════════════════════════════════════════
// Code Quality Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n✨ Testing Code Quality Patterns\n');

function checkCodeQuality(filePath, moduleName) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for debug logging support
  runner.assert(
    content.includes('LL_DEBUG') || !content.includes('debugLog'),
    `${moduleName} uses debug logging pattern correctly`,
    'Should have window.LL_DEBUG flag or no debug logging'
  );

  // Check for input validation
  runner.assert(
    content.includes('Math.max') || content.includes('Math.min') || content.includes('clamp'),
    `${moduleName} includes input validation/clamping`
  );

  // Check for error handling
  runner.assert(
    content.includes('try') || content.includes('catch') || content.includes('throw') || content.includes('console.warn'),
    `${moduleName} includes error handling`
  );

  // Check for TypeScript types
  runner.assert(
    content.includes('interface') || content.includes('type ') || content.includes(': number') || content.includes(': string'),
    `${moduleName} uses TypeScript type annotations`
  );
}

checkCodeQuality(files['param-curves'], 'param-curves.ts');
checkCodeQuality(files['bus-fx'], 'bus-fx.ts');
checkCodeQuality(files['gain-staging'], 'gain-staging.ts');

// ═══════════════════════════════════════════════════════════════════════════
// Integration Pattern Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🔗 Testing Integration Patterns\n');

// Check audio-engine integration
if (fs.existsSync(files['audio-engine'])) {
  const audioEngineContent = fs.readFileSync(files['audio-engine'], 'utf-8');

  // Check for param-curves import
  runner.assert(
    audioEngineContent.includes("from './param-curves'"),
    'audio-engine.ts imports param-curves module'
  );

  // Check for bus-fx import
  runner.assert(
    audioEngineContent.includes("from './bus-fx'"),
    'audio-engine.ts imports bus-fx module'
  );

  // Check for gain-staging import
  runner.assert(
    audioEngineContent.includes("from './gain-staging'"),
    'audio-engine.ts imports gain-staging module'
  );

  // Check for parameter curve usage in set() method
  runner.assert(
    audioEngineContent.includes('mapFrequency') && audioEngineContent.includes('mapGain'),
    'audio-engine.ts uses parameter curves in set() method'
  );

  // Check for FX bus exports
  runner.assert(
    audioEngineContent.includes('export {') && audioEngineContent.includes('initializeFxBuses'),
    'audio-engine.ts re-exports FX bus functions'
  );

  // Check for gain staging exports
  runner.assert(
    audioEngineContent.includes('export {') && audioEngineContent.includes('initializeMasterLimiter'),
    'audio-engine.ts re-exports gain staging functions'
  );

  // Check for parameter curve exports (PR #25)
  runner.assert(
    audioEngineContent.includes('Parameter Curves System Exports'),
    'audio-engine.ts includes PR #25 export section'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Consistency Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🎯 Testing Code Consistency\n');

function checkConsistency(filePath, moduleName) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check for consistent export pattern
  const exportLines = lines.filter(line => line.includes('export'));
  runner.assert(
    exportLines.length > 0,
    `${moduleName} has export statements`
  );

  // Check for PR comments
  const hasPRComment = content.includes('PR #') || content.includes('PR#');
  runner.assert(
    hasPRComment || moduleName === 'audio-engine.ts',
    `${moduleName} includes PR tracking comments`,
    'Should have PR # comments for traceability'
  );
}

checkConsistency(files['param-curves'], 'param-curves.ts');
checkConsistency(files['bus-fx'], 'bus-fx.ts');
checkConsistency(files['gain-staging'], 'gain-staging.ts');

// ═══════════════════════════════════════════════════════════════════════════
// Security and Safety Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🛡️  Testing Security and Safety Patterns\n');

function checkSafety(filePath, moduleName) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for no eval() usage
  runner.assert(
    !content.includes('eval('),
    `${moduleName} does not use eval() (security risk)`
  );

  // Check for safe number handling
  runner.assert(
    content.includes('isNaN') || content.includes('isFinite') || !content.includes('parseFloat'),
    `${moduleName} handles numbers safely`
  );

  // Check for safe default values
  runner.assert(
    content.includes('= ') && (content.includes('||') || content.includes('??')),
    `${moduleName} uses safe defaults`
  );
}

checkSafety(files['param-curves'], 'param-curves.ts');
checkSafety(files['bus-fx'], 'bus-fx.ts');
checkSafety(files['gain-staging'], 'gain-staging.ts');

// ═══════════════════════════════════════════════════════════════════════════
// Performance Pattern Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n⚡ Testing Performance Patterns\n');

function checkPerformance(filePath, moduleName) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for smooth parameter ramping
  runner.assert(
    content.includes('rampTo') || content.includes('ramp'),
    `${moduleName} uses smooth parameter ramping`,
    'Should use rampTo() for artifact-free changes'
  );

  // Check for singleton pattern (efficiency)
  runner.assert(
    content.includes('let ') && content.includes('null') && content.includes('if (!'),
    `${moduleName} uses lazy initialization pattern`
  );
}

checkPerformance(files['param-curves'], 'param-curves.ts');
checkPerformance(files['bus-fx'], 'bus-fx.ts');
checkPerformance(files['gain-staging'], 'gain-staging.ts');

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

const success = runner.summary();

if (success) {
  console.log('\n✨ All static analysis tests passed!');
  console.log('   - File structure verified');
  console.log('   - Export patterns validated');
  console.log('   - Documentation quality confirmed');
  console.log('   - Code quality patterns present');
  console.log('   - Integration patterns correct');
  console.log('   - Security and safety checks passed');
  console.log('   - Performance patterns validated');
}

process.exit(success ? 0 : 1);
