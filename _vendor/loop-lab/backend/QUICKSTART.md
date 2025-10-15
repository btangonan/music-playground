# Demucs Backend - Quick Start

Get the backend running in 5 minutes.

## 1. Install Demucs

```bash
pip install demucs
```

Verify:
```bash
demucs --help
```

## 2. Install ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

Verify:
```bash
ffprobe -version
```

## 3. Install Dependencies

```bash
cd backend
npm install
```

## 4. Configure Environment

Create `.env` in project root:

```bash
PORT=3001
DEMUCS_BIN=demucs
TMP_DIR=/tmp/demucs-stems
FRONTEND_URL=http://localhost:5173
```

## 5. Verify Installation

```bash
npm run verify
```

Expected output:
```
✓ Demucs is installed and accessible
✓ ffprobe is installed and accessible
✓ All Node.js dependencies installed
✓ Temp directory is writable
✓ tsconfig.json found

✅ All checks passed! Backend is ready to run.
```

## 6. Start Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**From project root:**
```bash
npm run backend:dev
```

## 7. Test

Health check:
```bash
curl http://localhost:3001/api/health
```

Upload test (if you have an audio file):
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3"
```

## 8. Access from Frontend

Backend will be available at: `http://localhost:3001`

CORS is enabled for all origins by default.

## Troubleshooting

**"Demucs not found"**
```bash
# Find Demucs location
which demucs

# Add to .env
DEMUCS_BIN=/full/path/to/demucs
```

**"Permission denied"**
```bash
mkdir -p /tmp/demucs-stems
chmod 755 /tmp/demucs-stems
```

**"Port already in use"**
```bash
# Change port in .env
PORT=3002
```

## Next Steps

- Read [README.md](./README.md) for full documentation
- See [API-TESTING.md](./API-TESTING.md) for testing guide
- Check backend logs for errors: `npm run dev`

## One-Line Commands

Verify everything:
```bash
npm run verify && npm run dev
```

Test upload (with audio file):
```bash
npm run test:upload /path/to/song.mp3
```

Full stack (from project root):
```bash
npm run backend:dev & npm run dev
```
