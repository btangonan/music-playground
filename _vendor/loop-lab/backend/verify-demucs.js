#!/usr/bin/env node
/**
 * Demucs Installation Verification Script
 *
 * Checks:
 * 1. Demucs binary is accessible
 * 2. ffprobe is installed (for duration detection)
 * 3. Node.js dependencies are installed
 * 4. Temp directory is writable
 *
 * Usage: node verify-demucs.js
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

/**
 * Check if a command exists and is executable
 */
async function checkCommand(command, args = ['--version']) {
  return new Promise((resolve) => {
    const process = spawn(command, args);
    let output = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      output += data.toString();
    });

    process.on('close', (code) => {
      resolve({ success: code === 0, output: output.trim() });
    });

    process.on('error', () => {
      resolve({ success: false, output: '' });
    });
  });
}

/**
 * Check if directory is writable
 */
async function checkDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const testFile = path.join(dirPath, '.write-test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main verification flow
 */
async function verify() {
  console.log('\n' + '='.repeat(60));
  log('🔍 Demucs Backend Verification', 'blue');
  console.log('='.repeat(60) + '\n');

  let allChecks = true;

  // 1. Check Demucs
  log('Checking Demucs installation...', 'blue');
  const demucsResult = await checkCommand('demucs', ['--help']);

  if (demucsResult.success) {
    log(`${checkmark()} Demucs is installed and accessible`, 'green');

    // Extract version if available
    const versionMatch = demucsResult.output.match(/demucs\s+([\d.]+)/i);
    if (versionMatch) {
      log(`   Version: ${versionMatch[1]}`, 'reset');
    }
  } else {
    log(`${crossmark()} Demucs not found`, 'red');
    log('   Install with: pip install demucs', 'yellow');
    allChecks = false;
  }
  console.log();

  // 2. Check ffprobe
  log('Checking ffprobe installation...', 'blue');
  const ffprobeResult = await checkCommand('ffprobe', ['-version']);

  if (ffprobeResult.success) {
    log(`${checkmark()} ffprobe is installed and accessible`, 'green');

    // Extract version
    const versionMatch = ffprobeResult.output.match(/ffprobe version ([\d.]+)/i);
    if (versionMatch) {
      log(`   Version: ${versionMatch[1]}`, 'reset');
    }
  } else {
    log(`${crossmark()} ffprobe not found`, 'red');
    log('   Install with: brew install ffmpeg (macOS)', 'yellow');
    log('   or: sudo apt-get install ffmpeg (Linux)', 'yellow');
    allChecks = false;
  }
  console.log();

  // 3. Check Node.js dependencies
  log('Checking Node.js dependencies...', 'blue');
  const packageJsonPath = path.join(__dirname, 'package.json');

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const dependencies = Object.keys(packageJson.dependencies || {});

    let missingDeps = [];
    for (const dep of dependencies) {
      try {
        await import(dep);
      } catch {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length === 0) {
      log(`${checkmark()} All Node.js dependencies installed`, 'green');
      log(`   Total packages: ${dependencies.length}`, 'reset');
    } else {
      log(`${crossmark()} Missing dependencies: ${missingDeps.join(', ')}`, 'red');
      log('   Run: npm install', 'yellow');
      allChecks = false;
    }
  } catch (error) {
    log(`${crossmark()} Could not read package.json`, 'red');
    allChecks = false;
  }
  console.log();

  // 4. Check temp directory
  log('Checking temporary storage directory...', 'blue');
  const tmpDir = process.env.TMP_DIR || '/tmp/demucs-stems';
  const writable = await checkDirectory(tmpDir);

  if (writable) {
    log(`${checkmark()} Temp directory is writable`, 'green');
    log(`   Path: ${tmpDir}`, 'reset');
  } else {
    log(`${crossmark()} Cannot write to temp directory`, 'red');
    log(`   Path: ${tmpDir}`, 'yellow');
    log('   Create with: mkdir -p ' + tmpDir, 'yellow');
    allChecks = false;
  }
  console.log();

  // 5. Check TypeScript compiler
  log('Checking TypeScript setup...', 'blue');
  const tsConfigPath = path.join(__dirname, 'tsconfig.json');

  try {
    await fs.access(tsConfigPath);
    log(`${checkmark()} tsconfig.json found`, 'green');
  } catch {
    log(`${crossmark()} tsconfig.json not found`, 'red');
    allChecks = false;
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  if (allChecks) {
    log('✅ All checks passed! Backend is ready to run.', 'green');
    console.log();
    log('Start the server with:', 'blue');
    log('  npm run dev    (development with auto-reload)', 'reset');
    log('  npm start      (production)', 'reset');
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
    console.log();
    log('Quick fixes:', 'blue');
    log('  1. Install Demucs: pip install demucs', 'yellow');
    log('  2. Install ffmpeg: brew install ffmpeg', 'yellow');
    log('  3. Install Node deps: npm install', 'yellow');
    log('  4. Create temp dir: mkdir -p /tmp/demucs-stems', 'yellow');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allChecks ? 0 : 1);
}

// Run verification
verify().catch((error) => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});
