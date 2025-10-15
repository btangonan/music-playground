# API Testing Guide

Complete manual testing reference for the Demucs backend API.

## Prerequisites

- Backend server running on http://localhost:3001
- curl installed (comes with macOS/Linux)
- jq installed for pretty JSON output (optional): `brew install jq`

## Quick Start

```bash
# 1. Verify backend is running
curl http://localhost:3001/api/health

# 2. Upload audio file
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3"

# 3. Clean up old files
curl -X POST http://localhost:3001/api/cleanup
```

## Detailed API Tests

### 1. Health Check

**Purpose**: Verify backend is running and configured correctly

```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "demucs": "demucs",
  "tmpDir": "/tmp/demucs-stems"
}
```

**With pretty formatting (using jq):**
```bash
curl -s http://localhost:3001/api/health | jq '.'
```

---

### 2. Upload Audio File

**Purpose**: Upload MP3/WAV for stem separation

**Basic Upload:**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@/Users/username/Music/song.mp3" \
  -H "Accept: application/json"
```

**With verbose output:**
```bash
curl -v -X POST http://localhost:3001/api/demucs \
  -F "file=@/path/to/song.mp3"
```

**Save response to file:**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@song.mp3" \
  -o response.json
```

**With progress bar:**
```bash
curl -# -X POST http://localhost:3001/api/demucs \
  -F "file=@song.mp3"
```

**Expected Success Response:**
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

**Expected Error Responses:**

Missing file:
```json
{
  "error": "No file uploaded"
}
```

Invalid file type:
```json
{
  "error": "Only MP3 and WAV files are allowed"
}
```

Processing timeout:
```json
{
  "error": "Demucs processing timeout (8 minutes)"
}
```

---

### 3. Download Stems

**Purpose**: Download separated audio stems

**Download all stems:**
```bash
# Replace {jobId} and {filename} with actual values from upload response

curl -o vocals.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/vocals.wav"
curl -o drums.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/drums.wav"
curl -o bass.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/bass.wav"
curl -o other.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/other.wav"
```

**Example with actual values:**
```bash
# jobId: 550e8400-e29b-41d4-a716-446655440000
# filename: song

curl -o vocals.wav "http://localhost:3001/stems/550e8400-e29b-41d4-a716-446655440000/mdx_extra/song/vocals.wav"
curl -o drums.wav "http://localhost:3001/stems/550e8400-e29b-41d4-a716-446655440000/mdx_extra/song/drums.wav"
curl -o bass.wav "http://localhost:3001/stems/550e8400-e29b-41d4-a716-446655440000/mdx_extra/song/bass.wav"
curl -o other.wav "http://localhost:3001/stems/550e8400-e29b-41d4-a716-446655440000/mdx_extra/song/other.wav"
```

**Download with progress:**
```bash
curl -# -o vocals.wav "http://localhost:3001/stems/{jobId}/mdx_extra/{filename}/vocals.wav"
```

---

### 4. Cleanup Old Files

**Purpose**: Remove stems older than 1 hour

```bash
curl -X POST http://localhost:3001/api/cleanup
```

**Expected Response:**
```json
{
  "deletedCount": 3,
  "message": "Cleaned up 3 old job directories"
}
```

---

## Advanced Testing

### Test with Different File Types

**MP3 file:**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@test.mp3"
```

**WAV file:**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@test.wav"
```

**Invalid file type (should fail):**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@test.mp4"
```

---

### Test File Size Limits

**Check file size:**
```bash
# Max size: 100MB
ls -lh song.mp3
```

**Upload large file (may timeout):**
```bash
curl -X POST http://localhost:3001/api/demucs \
  -F "file=@large-song.mp3" \
  --max-time 480  # 8 minutes timeout
```

---

### Test CORS Headers

**Check CORS headers:**
```bash
curl -I -X OPTIONS http://localhost:3001/api/demucs \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

**Expected headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

---

### Performance Testing

**Measure request time:**
```bash
time curl -X POST http://localhost:3001/api/demucs \
  -F "file=@song.mp3" \
  -o response.json
```

**Get detailed timing:**
```bash
curl -w "\nTime Total: %{time_total}s\nTime Connect: %{time_connect}s\n" \
  -X POST http://localhost:3001/api/demucs \
  -F "file=@song.mp3"
```

---

## Automated Test Scripts

### Complete Upload-Download Flow

```bash
#!/bin/bash
# test-flow.sh

# 1. Upload file
RESPONSE=$(curl -s -X POST http://localhost:3001/api/demucs \
  -F "file=@song.mp3")

echo "Upload response:"
echo "$RESPONSE" | jq '.'

# 2. Extract URLs
VOCALS_URL=$(echo "$RESPONSE" | jq -r '.stems.vocals')
DRUMS_URL=$(echo "$RESPONSE" | jq -r '.stems.drums')
BASS_URL=$(echo "$RESPONSE" | jq -r '.stems.bass')
OTHER_URL=$(echo "$RESPONSE" | jq -r '.stems.other')

# 3. Download stems
echo "Downloading stems..."
curl -o vocals.wav "$VOCALS_URL"
curl -o drums.wav "$DRUMS_URL"
curl -o bass.wav "$BASS_URL"
curl -o other.wav "$OTHER_URL"

echo "✓ Download complete"
ls -lh *.wav
```

### Batch Upload Multiple Files

```bash
#!/bin/bash
# batch-upload.sh

for file in *.mp3; do
  echo "Processing: $file"
  curl -X POST http://localhost:3001/api/demucs \
    -F "file=@$file" \
    -o "${file%.mp3}-response.json"
  echo ""
done
```

### Health Check with Retry

```bash
#!/bin/bash
# wait-for-backend.sh

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✓ Backend is ready"
    exit 0
  fi

  echo "Waiting for backend... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "✗ Backend failed to start"
exit 1
```

---

## Troubleshooting

### Connection Refused

```bash
curl: (7) Failed to connect to localhost port 3001: Connection refused
```

**Solution**: Start the backend server
```bash
npm run backend:dev
```

---

### File Upload Fails

```bash
{"error": "No file uploaded"}
```

**Solution**: Check file path is absolute
```bash
# Wrong
curl -F "file=@song.mp3" ...

# Right
curl -F "file=@/Users/username/Music/song.mp3" ...
```

---

### CORS Error in Browser

**Solution**: Verify CORS headers
```bash
curl -I http://localhost:3001/api/health
```

Should include: `Access-Control-Allow-Origin: *`

---

### Timeout Errors

```bash
{"error": "Demucs processing timeout (8 minutes)"}
```

**Solution**: Use shorter audio files or increase timeout in server config

---

## Integration with Frontend

### Fetch API Example

```javascript
// Upload from frontend
const formData = new FormData();
formData.append('file', audioFile);

const response = await fetch('http://localhost:3001/api/demucs', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.stems);
```

### Axios Example

```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', audioFile);

const response = await axios.post('http://localhost:3001/api/demucs', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

console.log(response.data.stems);
```

---

## Summary of Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/demucs` | Upload & process audio | No |
| POST | `/api/cleanup` | Clean old stems | No |
| GET | `/stems/{path}` | Download stems | No |

---

## Performance Benchmarks

Typical processing times on modern CPU:

| Audio Length | Processing Time | Stems Size |
|--------------|----------------|------------|
| 1 minute | ~20-30s | ~40MB |
| 3 minutes | ~60-90s | ~120MB |
| 5 minutes | ~100-150s | ~200MB |
| 10 minutes | ~200-300s | ~400MB |

Note: Times vary based on CPU, model, and audio complexity.
