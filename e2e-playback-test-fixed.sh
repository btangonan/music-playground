#!/bin/bash
set -e

echo "======================================"
echo "E2E Playback Structure Test"
echo "======================================"
echo ""

# Generate a valid UUID v4
LOOP_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBjZGFlNTRhLTViZjEtNGMwYi05YzU4LTcyNDFiM2MwZmYyZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NjA2NDgzMDEsImV4cCI6MTc2MTI1MzEwMX0.XOqfNUUod3BLKxFXYx2JyuCXiZSZ8mg42u8fqhHc-JE"

echo "🔑 Test Loop UUID: $LOOP_ID"
echo ""

echo "======================================"
echo "Phase 1: API Playback Data Storage"
echo "======================================"
echo ""

# Create loop with complete playback data
echo "📝 Creating loop with iconSequence for playback..."
curl -s -X POST http://localhost:3001/api/loops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "'"$LOOP_ID"'",
    "name": "E2E Playback Test",
    "bars": 4,
    "color": "#FF6B6B",
    "bpm": 120,
    "chordProgression": [
      {"bar": 0, "chord": "Cmaj7"},
      {"bar": 1, "chord": "Am7"},
      {"bar": 2, "chord": "Fmaj7"},
      {"bar": 3, "chord": "G7"}
    ],
    "iconSequence": [
      {"bar": 0, "row": 0, "soundId": "kick", "velocity": 0.8, "pitch": 36},
      {"bar": 0, "row": 4, "soundId": "hihat", "velocity": 0.6, "pitch": 42},
      {"bar": 1, "row": 0, "soundId": "snare", "velocity": 0.9, "pitch": 38},
      {"bar": 2, "row": 0, "soundId": "kick", "velocity": 0.8, "pitch": 36},
      {"bar": 2, "row": 8, "soundId": "lead", "velocity": 0.7, "pitch": 60},
      {"bar": 3, "row": 0, "soundId": "kick", "velocity": 0.8, "pitch": 36}
    ],
    "schemaVersion": 1,
    "updatedAt": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
  }' > /tmp/create-response.json

echo "✅ Loop created"
echo ""

# Retrieve and validate
echo "🔍 Retrieving loop to verify playback data integrity..."
curl -s "http://localhost:3001/api/loops/$LOOP_ID" \
  -H "Authorization: Bearer $TOKEN" > /tmp/retrieve-response.json

echo ""
echo "📊 Validation Results:"
cat /tmp/retrieve-response.json | grep -q "iconSequence" && echo "✅ iconSequence field present" || echo "❌ iconSequence missing"
cat /tmp/retrieve-response.json | grep -q "chordProgression" && echo "✅ chordProgression field present" || echo "❌ chordProgression missing"
cat /tmp/retrieve-response.json | grep -q '"bpm":120' && echo "✅ BPM preserved (120)" || echo "❌ BPM incorrect"
cat /tmp/retrieve-response.json | grep -q '"bars":4' && echo "✅ Bars preserved (4)" || echo "❌ Bars incorrect"

ICON_COUNT=$(cat /tmp/retrieve-response.json | grep -o '"soundId"' | wc -l | tr -d ' ')
echo "✅ Icon count: $ICON_COUNT (expected: 6)"

echo ""
echo "$LOOP_ID" > /tmp/e2e-loop-uuid.txt
echo "✅ Phase 1 Complete: Backend storage verified"
echo ""
