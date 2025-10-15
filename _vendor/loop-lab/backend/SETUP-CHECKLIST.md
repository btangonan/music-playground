# Backend Setup Checklist

Complete checklist for getting the Demucs backend running.

## Prerequisites

### 1. System Requirements

- [ ] Node.js 18+ installed
- [ ] macOS/Linux (or WSL on Windows)
- [ ] 4GB+ RAM available
- [ ] 10GB+ free disk space

### 2. Python Environment

- [ ] Python 3.8+ installed
- [ ] pip or conda available

### 3. Install Demucs

Choose one method:

**Option A: pip (Recommended)**
```bash
pip install demucs
```

**Option B: conda**
```bash
conda install -c conda-forge demucs
```

**Option C: pipx**
```bash
pipx install demucs
```

Verify:
```bash
demucs --help
```

Expected output: Demucs help text

### 4. Install ffmpeg

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

Expected output: ffprobe version info

## Backend Setup

### 5. Install Node Dependencies

```bash
cd backend
npm install
```

Expected: No errors, all packages installed

### 6. Configure Environment

Create `.env` in project root:

```bash
PORT=3001
DEMUCS_BIN=demucs
TMP_DIR=/tmp/demucs-stems
FRONTEND_URL=http://localhost:5173
```

Or copy from example:
```bash
cp backend/.env.example .env
```

### 7. Create Temp Directory

```bash
mkdir -p /tmp/demucs-stems
chmod 755 /tmp/demucs-stems
```

### 8. Verify Installation

```bash
cd backend
npm run verify
```

Expected output:
```
✓ Demucs is installed and accessible
✓ ffprobe is installed and accessible
✓ All Node.js dependencies installed
✓ Temp directory is writable
✓ tsconfig.json found

✅ All checks passed!
```

If any checks fail, see troubleshooting section below.

## Testing

### 9. Start Backend Server

**Terminal 1:**
```bash
cd backend
npm run dev
```

Expected output:
```
🎵 Demucs Stem Separation Server
📍 Listening on http://localhost:3001
📦 Demucs binary: demucs
💾 Temp directory: /tmp/demucs-stems
⏱️  Request timeout: 480s
📊 Max file size: 100MB
```

### 10. Health Check

**Terminal 2:**
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "demucs": "demucs",
  "tmpDir": "/tmp/demucs-stems"
}
```

### 11. Test Upload (Optional)

If you have an audio file:

```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3"
```

Or use the test script:
```bash
npm run test:upload /path/to/song.mp3
```

Expected: JSON response with stem URLs after processing

## Integration

### 12. Start Frontend (Optional)

**Terminal 3:**
```bash
npm run dev
```

Expected: Frontend at http://localhost:5173

### 13. Verify CORS

```bash
curl -I http://localhost:3001/api/health
```

Expected headers include:
```
Access-Control-Allow-Origin: *
```

## Troubleshooting

### Demucs Not Found

**Symptom:**
```
Error: Failed to spawn Demucs: spawn demucs ENOENT
```

**Fix 1:** Add to PATH
```bash
# Find Demucs location
which demucs

# Add to .env
DEMUCS_BIN=/full/path/to/demucs
```

**Fix 2:** Reinstall
```bash
pip uninstall demucs
pip install demucs
```

### ffprobe Not Found

**Symptom:**
```
Error: Failed to get audio duration
```

**Fix:**
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### Permission Denied on TMP_DIR

**Symptom:**
```
Error: EACCES: permission denied, mkdir '/tmp/demucs-stems'
```

**Fix:**
```bash
mkdir -p /tmp/demucs-stems
chmod 755 /tmp/demucs-stems
```

Or change to user directory:
```bash
# In .env
TMP_DIR=~/demucs-stems
```

### Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Fix 1:** Kill existing process
```bash
lsof -ti:3001 | xargs kill
```

**Fix 2:** Use different port
```bash
# In .env
PORT=3002
```

### Node Modules Missing

**Symptom:**
```
Cannot find module 'express'
```

**Fix:**
```bash
cd backend
rm -rf node_modules
npm install
```

### TypeScript Errors

**Symptom:**
```
TSError: Unable to compile TypeScript
```

**Fix:**
```bash
cd backend
npm install --save-dev typescript tsx
```

## Verification Commands

Quick checks for common issues:

```bash
# Check Demucs
demucs --help

# Check ffprobe
ffprobe -version

# Check Node version
node --version

# Check npm packages
cd backend && npm list --depth=0

# Check temp directory
ls -la /tmp/demucs-stems

# Check backend is running
curl http://localhost:3001/api/health

# Check logs
cd backend && npm run dev 2>&1 | tee backend.log
```

## Next Steps

After successful setup:

1. **Read Documentation**
   - [README.md](./README.md) - Full backend documentation
   - [API-TESTING.md](./API-TESTING.md) - API testing guide
   - [QUICKSTART.md](./QUICKSTART.md) - Quick reference

2. **Test Integration**
   - [example-client.ts](./example-client.ts) - Frontend integration example

3. **Performance Tuning**
   - Monitor first upload processing time
   - Adjust `REQUEST_TIMEOUT` if needed
   - Consider GPU acceleration for production

4. **Production Considerations**
   - Add authentication
   - Set up queue system (Redis + Bull)
   - Configure cloud storage (S3)
   - Add monitoring and logging

## Quick Reference

### Start Backend
```bash
npm run backend:dev    # From project root
npm run dev            # From backend/
```

### Run Tests
```bash
npm run backend:verify    # Verify installation
npm run backend:test      # Test upload
```

### Common Commands
```bash
# Health check
curl http://localhost:3001/api/health

# Upload file
curl -X POST http://localhost:3001/api/demucs -F "file=@song.mp3"

# Cleanup old files
curl -X POST http://localhost:3001/api/cleanup

# Stop server
Ctrl+C in terminal
```

## Support

If you encounter issues not covered here:

1. Check backend logs for detailed error messages
2. Verify all prerequisites are installed correctly
3. Try the verification script: `npm run verify`
4. Review the troubleshooting section above
5. Check Demucs documentation: https://github.com/facebookresearch/demucs

## Success Criteria

You're ready to use the backend when:

- ✅ `npm run verify` passes all checks
- ✅ Backend starts without errors
- ✅ Health check returns `{"status":"ok"}`
- ✅ Test upload completes successfully (if tested)
- ✅ Stems are downloadable from returned URLs
