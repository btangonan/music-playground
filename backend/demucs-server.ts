/**
 * Demucs Stem Separation Server (Ultra-Minimal MVP)
 *
 * Accepts MP3/WAV uploads, spawns Demucs CLI, returns 4 stems.
 * No Redis, no Bull, no workers. Blocking request pattern.
 *
 * Usage: npm run backend
 */

import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const TMP_DIR = process.env.TMP_DIR || '/tmp/demucs-stems';
const DEMUCS_BIN = process.env.DEMUCS_BIN || 'demucs';
const BASIC_PITCH_BIN = process.env.BASIC_PITCH_BIN || '/Users/bradleytangonan/Desktop/my apps/loop-lab/venv-basicpitch/bin/basic-pitch';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const REQUEST_TIMEOUT = 8 * 60 * 1000; // 8 minutes

// TypeScript interfaces for MIDI data
interface MIDINote {
  pitch: number;
  start_time: number;
  end_time: number;
  velocity: number;
  confidence: number;
}

interface MIDITrack {
  track_id: number;
  instrument: 'vocals' | 'drums' | 'bass' | 'other';
  notes: MIDINote[];
}

interface MIDIData {
  tracks: MIDITrack[];
  duration: number;
  tempo: number;
  time_signature: string;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface JobResult {
  midi: MIDIData;
  stems: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static stems
app.use('/stems', express.static(TMP_DIR));

// Configure multer for file uploads
const upload = multer({
  dest: path.join(TMP_DIR, 'uploads'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 and WAV files are allowed'));
    }
  }
});

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(duration || 0);
      } else {
        reject(new Error('Failed to get audio duration'));
      }
    });

    ffprobe.on('error', reject);
  });
}

/**
 * Run Demucs stem separation
 */
async function runDemucs(inputPath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[Demucs] Starting stem separation...');
    console.log('[Demucs] Input:', inputPath);
    console.log('[Demucs] Output:', outputDir);

    // Demucs CLI command: demucs -n mdx_extra --mp3 --out <outputDir> <inputPath>
    const args = [
      '-n', 'mdx_extra',  // Model: mdx_extra (4 stems: vocals, drums, bass, other)
      '--mp3',            // Output as MP3 to avoid torchaudio WAV backend issues
      '--out', outputDir,
      inputPath
    ];

    const demucs = spawn(DEMUCS_BIN, args);

    let stdout = '';
    let stderr = '';

    demucs.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[Demucs]', data.toString().trim());
    });

    demucs.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Demucs Error]', data.toString().trim());
    });

    demucs.on('close', (code) => {
      if (code === 0) {
        console.log('[Demucs] Separation complete');
        resolve();
      } else {
        console.error('[Demucs] Failed with exit code', code);
        reject(new Error(`Demucs failed: ${stderr || 'Unknown error'}`));
      }
    });

    demucs.on('error', (err) => {
      console.error('[Demucs] Spawn error:', err);
      reject(new Error(`Failed to spawn Demucs: ${err.message}`));
    });

    // Timeout safety (8 minutes)
    setTimeout(() => {
      demucs.kill('SIGTERM');
      reject(new Error('Demucs processing timeout (8 minutes)'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Parse basic-pitch CSV output to MIDI notes
 */
function parseMidiCsv(csvPath: string): MIDINote[] {
  const content = require('fs').readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const notes: MIDINote[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [start_time, end_time, pitch, velocity] = line.split(',');
    notes.push({
      pitch: parseInt(pitch),
      start_time: parseFloat(start_time),
      end_time: parseFloat(end_time),
      velocity: parseInt(velocity),
      confidence: 1.0 // basic-pitch doesn't provide confidence in CSV
    });
  }

  // Sort notes by start_time (CRITICAL: ensures playback starts from beginning)
  notes.sort((a, b) => a.start_time - b.start_time);

  return notes;
}

/**
 * Run basic-pitch on a single stem
 */
async function runBasicPitch(stemPath: string, outputDir: string): Promise<MIDINote[]> {
  return new Promise((resolve, reject) => {
    console.log('[BasicPitch] Processing stem:', path.basename(stemPath));

    const args = [
      outputDir,
      stemPath,
      '--save-note-events'
    ];

    const basicPitch = spawn(BASIC_PITCH_BIN, args);

    let stdout = '';
    let stderr = '';

    basicPitch.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('[BasicPitch]', data.toString().trim());
    });

    basicPitch.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[BasicPitch Error]', data.toString().trim());
    });

    basicPitch.on('close', (code) => {
      if (code === 0) {
        console.log('[BasicPitch] Processing complete for', path.basename(stemPath));

        // Find the CSV file (basic-pitch outputs as <stemname>_basic_pitch.csv)
        const stemBasename = path.basename(stemPath, path.extname(stemPath));
        const csvPath = path.join(outputDir, `${stemBasename}_basic_pitch.csv`);

        try {
          const notes = parseMidiCsv(csvPath);
          console.log('[BasicPitch] Parsed', notes.length, 'notes from', path.basename(csvPath));
          resolve(notes);
        } catch (err) {
          reject(new Error(`Failed to parse CSV: ${err}`));
        }
      } else {
        console.error('[BasicPitch] Failed with exit code', code);
        reject(new Error(`BasicPitch failed: ${stderr || 'Unknown error'}`));
      }
    });

    basicPitch.on('error', (err) => {
      console.error('[BasicPitch] Spawn error:', err);
      reject(new Error(`Failed to spawn BasicPitch: ${err.message}`));
    });

    // Timeout safety (2 minutes per stem)
    setTimeout(() => {
      basicPitch.kill('SIGTERM');
      reject(new Error('BasicPitch processing timeout (2 minutes)'));
    }, 2 * 60 * 1000);
  });
}

/**
 * Update job status
 */
async function updateJobStatus(jobDir: string, status: JobStatus): Promise<void> {
  const statusPath = path.join(jobDir, 'status.json');
  await fs.writeFile(statusPath, JSON.stringify(status, null, 2));
}

/**
 * Get job status
 */
async function getJobStatus(jobDir: string): Promise<JobStatus | null> {
  const statusPath = path.join(jobDir, 'status.json');
  try {
    const content = await fs.readFile(statusPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Main endpoint: POST /api/demucs
 */
app.post('/api/demucs', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const jobId = uuidv4();
  const jobDir = path.join(TMP_DIR, jobId);
  const inputPath = req.file.path;

  try {
    console.log('[Upload] Received file:', req.file.originalname, `(${req.file.size} bytes)`);

    // Create job directory
    await fs.mkdir(jobDir, { recursive: true });

    // Get audio duration
    let duration = 0;
    try {
      duration = await getAudioDuration(inputPath);
      console.log('[Audio] Duration:', duration.toFixed(2), 'seconds');
    } catch (err) {
      console.warn('[Audio] Could not determine duration:', err);
    }

    // Run Demucs
    await runDemucs(inputPath, jobDir);

    // Demucs outputs to: <jobDir>/mdx_extra/<filename-without-ext>/vocals.wav, etc.
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const stemsDir = path.join(jobDir, 'mdx_extra', inputBasename);

    // Check if stems exist (MP3 format)
    const stemFiles = {
      vocals: path.join(stemsDir, 'vocals.mp3'),
      drums: path.join(stemsDir, 'drums.mp3'),
      bass: path.join(stemsDir, 'bass.mp3'),
      other: path.join(stemsDir, 'other.mp3')
    };

    // Verify all stems exist
    for (const [stem, filePath] of Object.entries(stemFiles)) {
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Missing stem: ${stem}`);
      }
    }

    // Generate public URLs (MP3 format)
    const baseUrl = `${req.protocol}://${req.get('host')}/stems/${jobId}/mdx_extra/${inputBasename}`;
    const stems = {
      vocals: `${baseUrl}/vocals.mp3`,
      drums: `${baseUrl}/drums.mp3`,
      bass: `${baseUrl}/bass.mp3`,
      other: `${baseUrl}/other.mp3`
    };

    const processingTime = (Date.now() - startTime) / 1000;
    console.log('[Success] Processing completed in', processingTime.toFixed(2), 'seconds');

    // Cleanup uploaded file
    try {
      await fs.unlink(inputPath);
    } catch (err) {
      console.warn('[Cleanup] Failed to delete upload:', err);
    }

    res.json({
      jobId,
      stems,
      duration,
      processingTime
    });
  } catch (error) {
    console.error('[Error]', error);

    // Cleanup on error
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
      await fs.unlink(inputPath);
    } catch (cleanupErr) {
      console.warn('[Cleanup] Failed:', cleanupErr);
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    demucs: DEMUCS_BIN,
    tmpDir: TMP_DIR
  });
});

/**
 * Cleanup old stems (cron job helper)
 */
app.post('/api/cleanup', async (req, res) => {
  const maxAge = 60 * 60 * 1000; // 1 hour
  const now = Date.now();

  try {
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true });
    let deletedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(TMP_DIR, entry.name);
      const stats = await fs.stat(dirPath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.rm(dirPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    res.json({
      deletedCount,
      message: `Cleaned up ${deletedCount} old job directories`
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Cleanup failed'
    });
  }
});

/**
 * NEW ENDPOINT: POST /api/generate
 * Upload audio → trigger Demucs + basic-pitch pipeline
 */
app.post('/api/generate', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const jobId = uuidv4();
  const jobDir = path.join(TMP_DIR, jobId);
  const inputPath = req.file.path;

  try {
    console.log('[Generate] Job ID:', jobId);
    console.log('[Generate] Received file:', req.file.originalname, `(${req.file.size} bytes)`);

    // Create job directory
    await fs.mkdir(jobDir, { recursive: true });

    // Initialize job status
    await updateJobStatus(jobDir, { status: 'processing', progress: 0 });

    // Get audio duration
    let duration = 0;
    try {
      duration = await getAudioDuration(inputPath);
      console.log('[Generate] Duration:', duration.toFixed(2), 'seconds');
    } catch (err) {
      console.warn('[Generate] Could not determine duration:', err);
    }

    // Respond immediately with jobId
    res.json({
      jobId,
      estimatedTime: Math.max(60, duration * 2) // Rough estimate: 2x audio duration
    });

    // Process asynchronously
    (async () => {
      try {
        // Step 1: Run Demucs (0-50% progress)
        await updateJobStatus(jobDir, { status: 'processing', progress: 10 });
        await runDemucs(inputPath, jobDir);
        await updateJobStatus(jobDir, { status: 'processing', progress: 50 });

        // Get stems directory
        const inputBasename = path.basename(inputPath, path.extname(inputPath));
        const stemsDir = path.join(jobDir, 'mdx_extra', inputBasename);

        const stemFiles = {
          vocals: path.join(stemsDir, 'vocals.mp3'),
          drums: path.join(stemsDir, 'drums.mp3'),
          bass: path.join(stemsDir, 'bass.mp3'),
          other: path.join(stemsDir, 'other.mp3')
        };

        // Verify all stems exist
        for (const [stem, filePath] of Object.entries(stemFiles)) {
          try {
            await fs.access(filePath);
          } catch {
            throw new Error(`Missing stem: ${stem}`);
          }
        }

        // Step 2: Run basic-pitch on all stems IN PARALLEL (50-100% progress)
        const midiOutputDir = path.join(jobDir, 'midi');
        await fs.mkdir(midiOutputDir, { recursive: true });

        const stemNames: Array<'vocals' | 'drums' | 'bass' | 'other'> = ['vocals', 'drums', 'bass', 'other'];

        const midiPromises = stemNames.map(async (stemName, index) => {
          const notes = await runBasicPitch(stemFiles[stemName], midiOutputDir);
          const progress = 50 + ((index + 1) / stemNames.length) * 45;
          await updateJobStatus(jobDir, { status: 'processing', progress: Math.floor(progress) });

          return {
            track_id: index,
            instrument: stemName,
            notes
          };
        });

        const tracks = await Promise.all(midiPromises);

        // Step 3: Build MIDI data structure
        const midiData: MIDIData = {
          tracks,
          duration,
          tempo: 120, // Default tempo (could be analyzed later)
          time_signature: '4/4' // Default time signature
        };

        // Generate stem URLs
        const baseUrl = `/stems/${jobId}/mdx_extra/${inputBasename}`;
        const stemUrls = {
          vocals: `${baseUrl}/vocals.mp3`,
          drums: `${baseUrl}/drums.mp3`,
          bass: `${baseUrl}/bass.mp3`,
          other: `${baseUrl}/other.mp3`
        };

        // Save result
        const result: JobResult = {
          midi: midiData,
          stems: stemUrls
        };

        const resultPath = path.join(jobDir, 'result.json');
        await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

        // Mark as completed
        await updateJobStatus(jobDir, { status: 'completed', progress: 100 });

        // Cleanup uploaded file
        try {
          await fs.unlink(inputPath);
        } catch (err) {
          console.warn('[Generate] Failed to delete upload:', err);
        }

        console.log('[Generate] Job completed:', jobId);
      } catch (error) {
        console.error('[Generate] Job failed:', jobId, error);
        await updateJobStatus(jobDir, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Cleanup on error
        try {
          await fs.unlink(inputPath);
        } catch (cleanupErr) {
          console.warn('[Generate] Cleanup failed:', cleanupErr);
        }
      }
    })();
  } catch (error) {
    console.error('[Generate] Error:', error);

    // Cleanup on immediate error
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
      await fs.unlink(inputPath);
    } catch (cleanupErr) {
      console.warn('[Generate] Cleanup failed:', cleanupErr);
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * NEW ENDPOINT: GET /api/status/:jobId
 * Poll job status
 */
app.get('/api/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const jobDir = path.join(TMP_DIR, jobId);

  try {
    // Check if job directory exists
    try {
      await fs.access(jobDir);
    } catch {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get job status
    const status = await getJobStatus(jobDir);
    if (!status) {
      return res.status(500).json({ error: 'Status unavailable' });
    }

    // Check if result is ready
    if (status.status === 'completed') {
      const resultPath = path.join(jobDir, 'result.json');
      try {
        const resultContent = await fs.readFile(resultPath, 'utf-8');
        const result = JSON.parse(resultContent);

        return res.json({
          status: 'completed',
          progress: 100,
          result: {
            midiUrl: `/api/result/${jobId}`,
            duration: result.midi.duration,
            tracks: result.midi.tracks.length
          }
        });
      } catch {
        // Result file missing, return status only
      }
    }

    res.json(status);
  } catch (error) {
    console.error('[Status] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * NEW ENDPOINT: GET /api/result/:jobId
 * Download MIDI JSON
 */
app.get('/api/result/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const jobDir = path.join(TMP_DIR, jobId);
  const resultPath = path.join(jobDir, 'result.json');

  try {
    // Check if result exists
    try {
      await fs.access(resultPath);
    } catch {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Read and return result
    const resultContent = await fs.readFile(resultPath, 'utf-8');
    const result = JSON.parse(resultContent);

    res.json(result);
  } catch (error) {
    console.error('[Result] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🎵 Demucs Stem Separation Server (with MIDI Generation)`);
  console.log(`📍 Listening on http://localhost:${PORT}`);
  console.log(`📦 Demucs binary: ${DEMUCS_BIN}`);
  console.log(`🎹 BasicPitch binary: ${BASIC_PITCH_BIN}`);
  console.log(`💾 Temp directory: ${TMP_DIR}`);
  console.log(`⏱️  Request timeout: ${REQUEST_TIMEOUT / 1000}s`);
  console.log(`📊 Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB\n`);
});
