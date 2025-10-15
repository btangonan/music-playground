# CLAUDE.md — Project Contract

**Purpose**: Follow this in every session for this repo. Keep memory sharp. Keep outputs concrete. Cut rework.

## 🧠 Project Memory (Chroma)
Use server `chroma`. Collection `loop_lab_memory`.

Log after any confirmed fix, decision, gotcha, or preference.

**Schema:**
- **documents**: 1–2 sentences. Under 300 chars.
- **metadatas**: `{ "type":"decision|fix|tip|preference", "tags":"comma,separated", "source":"file|PR|spec|issue" }`
- **ids**: stable string if updating the same fact.

### Chroma Calls
```javascript
// Create once:
mcp__chroma__chroma_create_collection { "collection_name": "loop_lab_memory" }

// Add:
mcp__chroma__chroma_add_documents {
  "collection_name": "loop_lab_memory",
  "documents": ["<text>"],
  "metadatas": [{"type":"<type>","tags":"a,b,c","source":"<src>"}],
  "ids": ["<stable-id>"]
}

// Query (start with 5; escalate only if <3 strong hits):
mcp__chroma__chroma_query_documents {
  "collection_name": "loop_lab_memory",
  "query_texts": ["<query>"],
  "n_results": 5
}
```

## 🔍 Retrieval Checklist Before Coding
1. Query Chroma for related memories.
2. Check repo files that match the task.
3. List open PRs or issues that touch the same area.
4. Only then propose changes.

## ⚡ Activation
Read this file at session start.
Then read `.chroma/context/*.md` (titles + first bullets) and list which ones you used.
Run `bin/chroma-stats.py` and announce: **Contract loaded. Using Chroma loop_lab_memory. Found [N] memories (by type ...).**

## 🧹 Session Hygiene
Prune to last 20 turns if context gets heavy. Save long outputs in `./backups/` and echo paths.

## 📁 Output Policy
For code, return unified diff or patchable files. For scripts, include exact commands and paths.

## 🛡️ Safety
No secrets in `.chroma` or transcripts. Respect rate limits. Propose batching if needed.

## ⚠️ CRITICAL: Never Claim "Fixed" Without Verification
**MANDATORY RULE**: Do NOT say something is "fixed" until it has been tested and verified working.

### Forbidden Phrases Before Verification:
- ❌ "Fixed"
- ❌ "All issues resolved"
- ❌ "This should work now"
- ❌ "Problem solved"

### Required Process:
1. Make code changes
2. Test in browser/application
3. Verify specific behavior works
4. ONLY THEN say "Verified working" with evidence

### Acceptable Status Updates:
- ✅ "Changes applied, awaiting testing"
- ✅ "Code updated, needs verification"
- ✅ "Implemented, ready for user testing"

## 🎵 Audio-Specific Patterns

### Adaptive Pitch Shift (Blake Shimmer Fix)
**Problem**: Pitch shifters create dissonance above ~1500 Hz
**Solution**: Per-note adaptive pitch shift in `src/lib/pitch-shift-rules.ts`
- Frequency zones: Safe <1200Hz→+7, Transition <1400Hz→+5, High <1600Hz→+3, Danger >1600Hz→+0
- Applied in `Index.tsx` handleKeyDown before note trigger
- Debug flag: `window.LL_DEBUG_PITCH_ADAPT = true`
- Uses immediate Signal.value assignment (not ramp) for shimmer pitch changes

### Effect Parameter Application
**Pattern**: Use `applyEffectParams()` from `effect-param-mapper.ts`
- Automatically handles Signal ramping for click-free parameter changes
- Shimmer pitch uses immediate .value assignment (exception to ramping)
- Supports both musical time strings ('8n') and numeric values (Hz/seconds)

### Audio Engine Structure
- Shimmer effect: PitchShift windowSize = 0.035 (reduced from 0.06 to minimize artifacts)
- Feedback gain: 0.05 (reduced from 0.2 to prevent artifact amplification)
- All effects created via `makeEffect()` in `audio-engine.ts`