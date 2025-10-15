# Demucs Backend Server

Ultra-minimal MVP for AI-powered stem separation using Demucs. Accepts audio uploads (MP3/WAV), returns 4 stems (vocals, drums, bass, other).

## Features

- **Blocking Request Pattern**: Simple synchronous processing (no Redis, no Bull, no workers)
- **4-Stem Separation**: Uses Demucs `mdx_extra` model for high-quality separation
- **Audio Duration Detection**: Automatic duration calculation via ffprobe
- **Automatic Cleanup**: Manual cleanup endpoint for managing temp files
- **CORS Enabled**: Ready for frontend integration
- **Health Checks**: Built-in health and status endpoints

## Prerequisites

### 1. Install Demucs

**Option A: Using pip (Recommended)**
```bash
pip install demucs
```

**Option B: Using conda**
```bash
conda install -c conda-forge demucs
```

**Option C: Using pipx (Isolated)**
```bash
pipx install demucs
```

Verify installation:
```bash
demucs --help
```

### 2. Install ffmpeg/ffprobe

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

Verify installation:
```bash
ffprobe -version
```

### 3. Install Node.js Dependencies

```bash
cd backend
npm install
```

## Quick Start

### 1. Configure Environment

Create `.env` file in project root (or use `.env.example`):

```bash
# Backend port
PORT=3001

# Demucs binary path (if not in PATH)
DEMUCS_BIN=demucs

# Temporary storage directory
TMP_DIR=/tmp/demucs-stems

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 2. Start Server

**Development mode (auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**From project root:**
```bash
npm run backend:dev
# or
npm run backend:start
```

### 3. Verify Server is Running

Open browser to: http://localhost:3001/api/health

Expected response:
```json
{
  "status": "ok",
  "demucs": "demucs",
  "tmpDir": "/tmp/demucs-stems"
}
```

## API Reference

### POST /api/demucs

Upload audio file for stem separation.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (audio/mpeg or audio/wav)
- Max file size: 100MB
- Timeout: 8 minutes

**Response (Success):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "stems": {
    "vocals": "http://localhost:3001/stems/550e8400.../vocals.wav",
    "drums": "http://localhost:3001/stems/550e8400.../drums.wav",
    "bass": "http://localhost:3001/stems/550e8400.../bass.wav",
    "other": "http://localhost:3001/stems/550e8400.../other.wav"
  },
  "duration": 180.5,
  "processingTime": 45.2
}
```

**Response (Error):**
```json
{
  "error": "Only MP3 and WAV files are allowed"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid file type or missing file
- `500`: Processing error (Demucs failure, timeout, etc.)

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "demucs": "demucs",
  "tmpDir": "/tmp/demucs-stems"
}
```

### POST /api/cleanup

Manually trigger cleanup of old stems (>1 hour old).

**Response:**
```json
{
  "deletedCount": 5,
  "message": "Cleaned up 5 old job directories"
}
```

## Testing

### 1. Quick Health Check

```bash
curl http://localhost:3001/api/health
```

### 2. Upload Test Audio

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3" \
  -v
```

**Using test script:**
```bash
npm run test:upload
```

### 3. Download Stems

After upload, use the returned URLs:
```bash
# Example: Download vocals stem
curl -o vocals.wav "http://localhost:3001/stems/550e8400.../vocals.wav"
```

### 4. Verify Demucs Installation

Run the verification script:
```bash
npm run verify:demucs
```

This checks:
- Demucs binary is accessible
- ffprobe is installed
- Temp directory is writable
- Node.js dependencies are installed

## Manual Testing Commands

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Upload Audio File
```bash
# Replace /path/to/song.mp3 with actual file path
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3" \
  -H "Accept: application/json"
```

### Clean Up Old Files
```bash
curl -X POST http://localhost:3001/api/cleanup
```

### Download Specific Stem
```bash
# Use jobId from upload response
curl -o vocals.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/vocals.wav"
```

## Troubleshooting

### "Demucs command not found"

**Solution 1:** Add Demucs to PATH
```bash
# Find Demucs location
which demucs

# Add to .env
DEMUCS_BIN=/full/path/to/demucs
```

**Solution 2:** Use absolute path in .env
```bash
# Example for conda environment
DEMUCS_BIN=/Users/username/miniconda3/envs/demucs/bin/demucs
```

### "ffprobe not found"

Install ffmpeg (includes ffprobe):
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### "Permission denied" on TMP_DIR

Create directory with correct permissions:
```bash
mkdir -p /tmp/demucs-stems
chmod 755 /tmp/demucs-stems
```

Or change TMP_DIR in .env to a writable location:
```bash
TMP_DIR=./tmp/demucs-stems
```

### "Request timeout"

For long audio files (>5 minutes), increase timeout in `demucs-server.ts`:
```typescript
const REQUEST_TIMEOUT = 15 * 60 * 1000; // 15 minutes
```

### CORS errors from frontend

Ensure backend is running and CORS is enabled:
```typescript
// Already configured in demucs-server.ts
app.use(cors());
```

If still having issues, specify frontend origin:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
```

## Performance Notes

- **Processing Time**: Approximately 1 minute per 3 minutes of audio on modern CPU
- **GPU Acceleration**: Not currently enabled (CPU only)
- **Memory Usage**: ~2-4GB RAM during processing
- **Disk Usage**: Stems are ~4x the original file size (4 WAV files)

## Architecture

```
┌─────────────┐
│   Frontend  │
│ (Vite/React)│
└──────┬──────┘
       │ POST /api/demucs (multipart/form-data)
       │
┌──────▼──────┐
│   Express   │
│   Server    │
│  (Port 3001)│
└──────┬──────┘
       │
       ├─ Multer (file upload)
       ├─ ffprobe (duration)
       ├─ Demucs CLI (stem separation)
       └─ Static file serving (/stems)

┌──────────────┐
│ /tmp/demucs- │
│    stems/    │
│  ├─ jobId1/  │
│  │  └─ mdx_extra/
│  │     └─ vocals.wav, drums.wav, bass.wav, other.wav
│  └─ jobId2/  │
└──────────────┘
```

## Development

### File Structure
```
backend/
├── demucs-server.ts    # Main server implementation
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

### Available Scripts

- `npm run dev` - Start with auto-reload (tsx watch)
- `npm start` - Start server (production)
- `npm run build` - Compile TypeScript to JavaScript
- `npm run lint` - Run ESLint
- `npm run verify:demucs` - Verify Demucs installation
- `npm run test:upload` - Test audio upload

### Adding Features

**Example: Add MP4 support**
```typescript
// In multer fileFilter
const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
```

**Example: Different Demucs model**
```typescript
// In runDemucs function
const args = [
  '-n', 'htdemucs',  // Change model
  '--out', outputDir,
  inputPath
];
```

## Security Notes

- File type validation (MP3/WAV only)
- File size limit (100MB default)
- Request timeout (8 minutes)
- No authentication (MVP only)
- Stems stored in /tmp (auto-cleanup recommended)

## Production Considerations

**For production use, add:**
- Authentication/API keys
- Rate limiting (e.g., express-rate-limit)
- Queue system (Bull + Redis) for async processing
- Cloud storage (S3) instead of local /tmp
- Database for job tracking
- WebSocket for progress updates
- Docker container for deployment
- Automated cleanup cron job
- Error monitoring (Sentry)
- Logging (Winston, Pino)

## License

MIT
