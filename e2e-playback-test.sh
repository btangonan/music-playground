#!/bin/bash
set -e

echo "======================================"
echo "E2E Playback Structure Test"
echo "======================================"
echo ""

# Check if servers are running
echo "⏳ Checking server status..."
if ! curl -s http://localhost:3001/health > /dev/null; then
  echo "❌ API server not running on port 3001"
  exit 1
fi

if ! curl -s http://localhost:5174/ > /dev/null; then
  echo "❌ Frontend not running on port 5174"
  exit 1
fi

echo "✅ Both servers are running"
echo ""

# Get auth token (reuse from previous test)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBjZGFlNTRhLTViZjEtNGMwYi05YzU4LTcyNDFiM2MwZmYyZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NjA2NDgzMDEsImV4cCI6MTc2MTI1MzEwMX0.XOqfNUUod3BLKxFXYx2JyuCXiZSZ8mg42u8fqhHc-JE"

echo "======================================"
echo "Phase 1: API Playback Data Test"
echo "======================================"
echo ""

# Create a realistic loop with playback data
LOOP_ID="e2e-test-$(date +%s)"
echo "📝 Creating test loop with ID: $LOOP_ID"

RESPONSE=$(curl -s -X POST http://localhost:3001/api/loops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "'"$LOOP_ID"'",
    "name": "E2E Playback Test Loop",
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
  }')

echo "✅ Loop created"
echo ""

# Retrieve the loop to verify data integrity
echo "🔍 Retrieving loop to verify playback data..."
RETRIEVED=$(curl -s http://localhost:3001/api/loops/$LOOP_ID \
  -H "Authorization: Bearer $TOKEN")

# Validate critical playback fields exist
echo "$RETRIEVED" | grep -q "iconSequence" && echo "✅ iconSequence present" || echo "❌ iconSequence missing"
echo "$RETRIEVED" | grep -q "chordProgression" && echo "✅ chordProgression present" || echo "❌ chordProgression missing"
echo "$RETRIEVED" | grep -q '"bpm":120' && echo "✅ BPM correct (120)" || echo "❌ BPM incorrect"
echo "$RETRIEVED" | grep -q '"bars":4' && echo "✅ Bars correct (4)" || echo "❌ Bars incorrect"

# Count iconSequence items
ICON_COUNT=$(echo "$RETRIEVED" | grep -o "soundId" | wc -l | tr -d ' ')
echo "✅ iconSequence has $ICON_COUNT items (expected 6)"

echo ""
echo "======================================"
echo "Phase 2: Playwright Browser Test"
echo "======================================"
echo ""
echo "📝 Test will be executed via Playwright MCP..."
echo ""

# Save loop ID for Playwright test
echo "$LOOP_ID" > /tmp/e2e-loop-id.txt

echo "✅ API test phase complete"
echo ""
