#!/bin/bash
# Test upload script for Demucs backend
# Usage: ./test-upload.sh [path/to/audio.mp3]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
AUDIO_FILE="${1:-}"

echo ""
echo "========================================"
echo "🎵 Demucs Backend Test Upload"
echo "========================================"
echo ""

# 1. Check if backend is running
echo -e "${BLUE}1. Checking backend health...${NC}"
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/api/health" || echo "")

if [ -z "$HEALTH_RESPONSE" ]; then
  echo -e "${RED}✗ Backend is not running${NC}"
  echo -e "${YELLOW}Start with: npm run dev${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Backend is running${NC}"
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# 2. Check if audio file is provided
if [ -z "$AUDIO_FILE" ]; then
  echo -e "${YELLOW}No audio file provided.${NC}"
  echo ""
  echo "Usage: $0 /path/to/audio.mp3"
  echo ""
  echo "Example:"
  echo "  $0 ~/Music/song.mp3"
  echo "  $0 ./test-audio.wav"
  echo ""
  exit 1
fi

# 3. Check if file exists
if [ ! -f "$AUDIO_FILE" ]; then
  echo -e "${RED}✗ File not found: $AUDIO_FILE${NC}"
  exit 1
fi

# 4. Check file type
FILE_EXT="${AUDIO_FILE##*.}"
if [[ ! "$FILE_EXT" =~ ^(mp3|wav|MP3|WAV)$ ]]; then
  echo -e "${RED}✗ Invalid file type: .$FILE_EXT${NC}"
  echo -e "${YELLOW}Only MP3 and WAV files are supported${NC}"
  exit 1
fi

echo -e "${BLUE}2. Uploading audio file...${NC}"
echo "   File: $AUDIO_FILE"
echo "   Size: $(du -h "$AUDIO_FILE" | cut -f1)"
echo ""

# 5. Upload file
echo -e "${BLUE}3. Processing with Demucs...${NC}"
echo -e "${YELLOW}⏳ This may take several minutes depending on file size${NC}"
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/demucs" \
  -F "file=@${AUDIO_FILE}" \
  -H "Accept: application/json" \
  -w "\nHTTP_STATUS:%{http_code}" || echo "")

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo ""
echo "========================================"

# 6. Check response
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Success! Stems separated${NC}"
  echo ""

  # Parse and display response
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

  echo ""
  echo "========================================"
  echo -e "${BLUE}📊 Summary${NC}"
  echo "========================================"
  echo "Upload time:     ${ELAPSED}s"

  # Extract values using jq if available
  if command -v jq &> /dev/null; then
    DURATION=$(echo "$RESPONSE_BODY" | jq -r '.duration // "N/A"')
    PROCESSING_TIME=$(echo "$RESPONSE_BODY" | jq -r '.processingTime // "N/A"')
    JOB_ID=$(echo "$RESPONSE_BODY" | jq -r '.jobId // "N/A"')

    echo "Audio duration:  ${DURATION}s"
    echo "Processing time: ${PROCESSING_TIME}s"
    echo "Job ID:          $JOB_ID"
    echo ""

    # Display stem URLs
    echo -e "${BLUE}🎵 Stem URLs:${NC}"
    echo "$RESPONSE_BODY" | jq -r '.stems | to_entries[] | "  \(.key): \(.value)"'
    echo ""

    # Provide download commands
    echo -e "${BLUE}💾 Download stems:${NC}"
    VOCALS_URL=$(echo "$RESPONSE_BODY" | jq -r '.stems.vocals')
    DRUMS_URL=$(echo "$RESPONSE_BODY" | jq -r '.stems.drums')
    BASS_URL=$(echo "$RESPONSE_BODY" | jq -r '.stems.bass')
    OTHER_URL=$(echo "$RESPONSE_BODY" | jq -r '.stems.other')

    echo "  curl -o vocals.wav \"$VOCALS_URL\""
    echo "  curl -o drums.wav \"$DRUMS_URL\""
    echo "  curl -o bass.wav \"$BASS_URL\""
    echo "  curl -o other.wav \"$OTHER_URL\""
  fi

  echo ""
  echo -e "${GREEN}✅ Test completed successfully${NC}"
else
  echo -e "${RED}✗ Upload failed (HTTP $HTTP_STATUS)${NC}"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo "  - Check file size (max 100MB)"
  echo "  - Verify file is MP3 or WAV"
  echo "  - Check backend logs for errors"
  echo "  - Ensure Demucs is installed: demucs --help"
  exit 1
fi

echo ""
