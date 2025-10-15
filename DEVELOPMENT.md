# Development Guide - Music Playground

**For new Claude Code instances or contributors**

---

## Common Pitfalls & How to Avoid Them

### 1. "Cannot find module '@music/engine'" Error

**Symptom:** Build fails with path resolution errors

**Cause:** Missing `vite-tsconfig-paths` plugin in app Vite config

**Fix:**
```typescript
// apps/composer/vite.config.ts
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()]  // ← Must have this
})
```

**Verify:**
```bash
grep "tsconfigPaths" apps/composer/vite.config.ts apps/lab/vite.config.ts
# Should show plugin in both files
```

---

### 2. DOM Type Leakage into Engine

**Symptom:** Engine code unexpectedly has access to `window`, `document`, etc.

**Cause:** Engine tsconfig inheriting DOM types from base or apps

**Fix:**
```json
// packages/engine/tsconfig.json - MUST have this
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"]  // ← NO "DOM" here!
  }
}

// apps/composer/tsconfig.json - Apps CAN have DOM
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM"]  // ← DOM allowed in apps
  }
}
```

**Verify:**
```bash
# Should find NOTHING:
grep -i "dom" packages/engine/tsconfig.json

# Should find "window" NOWHERE in engine:
grep -r "window\." packages/engine/src/
```

---

### 3. Tone Version Mismatch

**Symptom:** Weird audio bugs, missing effects, type errors

**Cause:** Apps using different Tone major versions

**Fix:**
```bash
# Check versions
jq '.dependencies.tone' apps/composer/package.json
jq '.dependencies.tone' apps/lab/package.json
# Both should show: "^14.8.49" (or same major)

# Fix if mismatched
cd apps/composer && pnpm add tone@^14.8.49
cd apps/lab && pnpm add tone@^14.8.49
pnpm install
```

**Why it matters:**
- v14 has full PitchShift (shimmer, harmonizer work)
- v15 deprecated PitchShift (graceful fallback)
- Mixing versions causes unpredictable behavior

---

### 4. Bundle Size Regression

**Symptom:** CI fails with size-limit error

**Cause:** Added large dependency or unoptimized code

**Fix:**
```bash
# Check current size
pnpm build
pnpm size

# Identify culprits
npx vite-bundle-visualizer apps/composer/dist

# Common causes:
# - Imported large library (lodash, moment, etc.)
# - Debug logs not removed (add NODE_ENV guards)
# - Duplicate dependencies (check pnpm dedupe)
```

**Budget:** 150 KB gzipped for Composer JS (no assets)

---

### 5. "startRecording is not a function" Error

**Symptom:** Engine throwing error about missing `startRecording()`

**Cause:** Old code trying to use removed DOM API

**Context:** `startRecording()` was removed from engine (commit `9f75547`) because it used MediaRecorder (DOM-specific)

**Fix:** Implement recording in app layer:
```typescript
// apps/composer/src/recording.ts
import * as Tone from 'tone';
import { Bus } from '@music/engine/audio-engine';

async function startRecording() {
  const ctx = Tone.getContext().rawContext as AudioContext;
  const dest = ctx.createMediaStreamDestination();

  Bus.master.connect(dest);
  const recorder = new MediaRecorder(dest.stream);
  // ... implement recording logic in app
}
```

---

### 6. First Sound Takes Forever

**Symptom:** Clicking Play takes >5 seconds for audio

**Cause:** Blocking on IR (impulse response) loading

**Fix:**
```typescript
// Don't wait for IR before playing sound
// Start dry, fade reverb when ready

// In ir-manifest.ts, ensure default IR is small
// Or skip IR initially:
const convolver = makeEffect('space');
// Load IR async, don't block first sound
```

**Target:** First sound < 2.5s from app load

---

### 7. Audio Context Won't Start

**Symptom:** No sound, even after clicking Play

**Cause:** Audio context not started on user gesture

**Fix:**
```typescript
// apps/composer/src/components/Transport.tsx
async function handlePlay() {
  // MUST call engine.start() on user click
  await engine.start();  // ← Initializes audio context
  engine.play();         // ← Starts transport
}
```

**Why:** Browsers require user gesture to start audio

---

### 8. Tests Fail After Changing Engine

**Symptom:** `pnpm test` fails after engine modifications

**Common Causes:**
1. Changed public API without updating tests
2. Added DOM dependency (breaks headless tests)
3. Missing peer dependency in test environment

**Fix:**
```bash
# Run tests in watch mode
cd packages/engine
pnpm vitest

# Check for DOM usage:
grep -r "window\|document" src/

# Ensure Tone installed:
pnpm install
```

---

### 9. _vendor Directory Still Present After Merge

**Symptom:** `_vendor/loop-lab/` exists after merging PR #1

**Expected:** PR #1 (feat/engine-extract) should remove it

**Verify:**
```bash
git checkout main
git ls-files "_vendor/*"
# Should output NOTHING

# If still present:
ls _vendor/  # Check what's there
git status   # Might be untracked
```

**Fix:**
```bash
# If untracked, just remove:
rm -rf _vendor/

# If tracked, it wasn't removed by PR - manually delete:
git rm -r _vendor/
git commit -m "chore: remove vendor directory"
```

---

### 10. CI Fails But Local Build Works

**Common Causes:**

**A) Lockfile out of sync**
```bash
# CI uses frozen lockfile
pnpm install --frozen-lockfile

# If fails, update lockfile:
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
```

**B) Node version mismatch**
```bash
# Check CI node version (.github/workflows/ci.yml)
# Should be: node-version: 20

# Use same locally:
nvm use 20
pnpm build
```

**C) Size-limit failure**
```bash
# Check locally:
pnpm size

# If over budget, reduce bundle or increase limit
```

---

## Development Workflow

### Daily Development

```bash
# 1. Start dev server
pnpm -w -F composer dev

# 2. Make changes to engine
# Changes hot reload automatically

# 3. If adding new public API:
# - Update packages/engine/src/public-api.ts
# - Update packages/engine/src/index.ts exports
# - Add test in packages/engine/tests/

# 4. Before committing:
pnpm build    # Ensure builds
pnpm test     # Ensure tests pass
pnpm size     # Check bundle size
```

### Adding New Effect

```bash
# 1. Add effect to makeEffect() in audio-engine.ts
case 'myeffect':
  node = new Tone.SomeEffect({ ... });
  break;

# 2. Add to effect type unions
type EffectType = '...' | 'myeffect';

# 3. Add macro mapping if needed (macros.ts)
export function myMacro(effects: EffectConfig[], value: number) {
  const fx = effects.find(e => e.type === 'myeffect');
  if (fx) fx.set(value);
}

# 4. Test:
cd packages/engine
pnpm vitest
```

### Adding New Macro

```bash
# 1. Add to MacroName type (public-api.ts)
export type MacroName = '...' | 'mymacro';

# 2. Implement in macros.ts
export function myMacro(effects: EffectConfig[], value: number) {
  // Map macro value to effect parameters
}

# 3. Wire in public-api.ts setMacroValue()
case 'mymacro':
  myMacro(activeEffects, clamped);
  break;

# 4. Expose in UI (apps/composer/src/components/MacroStrip.tsx)
<Slider
  label="My Macro"
  value={macros.mymacro}
  onChange={(v) => setMacros({...macros, mymacro: v})}
/>
```

---

## Debugging Tips

### Audio Not Working

```bash
# 1. Check console for errors
# 2. Verify audio context started:
console.log(Tone.getContext().state)  # Should be "running"

# 3. Check if instruments connected:
console.log(Bus.master)  # Should have connections

# 4. Enable audio debug logging:
# In browser console:
globalThis.LL_DEBUG_AUDIO = true
```

### Build Failures

```bash
# 1. Clean build
rm -rf packages/*/dist apps/*/dist
pnpm build

# 2. Clean install
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install

# 3. Check TypeScript errors
pnpm -w -F @music/engine tsc --noEmit
pnpm -w -F composer tsc --noEmit
```

### Type Errors

```bash
# 1. Ensure engine built first (generates .d.ts files)
pnpm -w -F @music/engine build

# 2. Check path aliases resolved:
grep "@music/engine" apps/composer/vite.config.ts
# Should show tsconfigPaths plugin

# 3. Restart TS server in editor
```

---

## Before Claiming "Fixed"

**From RULES_PROGRESS_REPORTING.md:**

❌ **NEVER say:**
- "Fixed!"
- "Should work now"
- "Try it now"

✅ **DO say:**
- "Changed X to Y. Ready to test."
- "Updated code. Needs user testing to confirm."
- "Applied fix. Awaiting validation."

**Why:** Backend tests ≠ end-to-end verification

**Full validation:**
1. Backend tests pass
2. App loads without errors
3. UI renders correctly
4. Audio actually plays
5. User confirms it works

---

## Git Pre-Flight Checklist

Before committing:

```bash
# 1. Build succeeds
pnpm build

# 2. Tests pass
pnpm test

# 3. Bundle size OK
pnpm size

# 4. No console errors
pnpm -w -F composer dev
# Open browser, check DevTools console

# 5. Lint/format (if configured)
pnpm lint

# 6. Meaningful commit message
git commit -m "feat(engine): add myfeature

- Clear description of what changed
- Why it changed
- Any breaking changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Emergency Rollback

If merge causes issues:

```bash
# 1. Identify merge commits
git log --oneline --merges -5

# 2. Revert in reverse order
git revert <commit-sha> -m 1

# 3. Push rollback
git push origin main

# 4. Fix issue on feature branch
# 5. Re-merge when ready
```

---

## Resources

- **Architecture details:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Pre-merge review:** [PRE_MERGE_REPORT.md](./PRE_MERGE_REPORT.md)
- **Merge checklist:** [MERGE_CHECKLIST.md](./MERGE_CHECKLIST.md)
- **Post-merge tasks:** [POST_MERGE_TASKS.md](./POST_MERGE_TASKS.md)
- **Progress reporting rules:** [RULES_PROGRESS_REPORTING.md](.claude/RULES_PROGRESS_REPORTING.md)

---

## Quick Reference

**Common Commands:**
```bash
# Dev server
pnpm -w -F composer dev

# Build everything
pnpm build

# Build specific package
pnpm -w -F @music/engine build

# Run tests
pnpm test

# Check bundle size
pnpm size

# Verify post-merge
./verify-merge.sh
```

**Critical Files:**
- `packages/engine/tsconfig.json` - Must NOT have "DOM" in lib
- `apps/*/vite.config.ts` - Must have tsconfigPaths plugin
- `package.json` (root) - size-limit configuration
- `.github/workflows/ci.yml` - CI with size check

**Debug Flags:**
```javascript
// Enable in browser console:
globalThis.LL_DEBUG_AUDIO = true
globalThis.LL_DEBUG_IR = true
globalThis.LL_DEBUG_REVERSE_REVERB = true
```

---

**Last Updated:** 2025-10-15
**Maintainer:** Bradley Tangonan
