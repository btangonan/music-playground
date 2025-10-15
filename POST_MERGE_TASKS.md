# Post-Merge Tasks - Music Playground

**Priority:** Complete within 1-2 hours of merge
**Purpose:** Lock in quality gates and intentional API surface

---

## 1️⃣ MUST-DO: Size-limit in CI ✅

**Status:** ✅ COMPLETE (commit on main)

Already implemented:
- Added `size-limit@^11.1.4` to root package.json
- Configured 150KB budget for Composer bundle
- CI step added: `pnpm size` runs on every build
- Replaces manual shell size check with automated tool

**IR > 1**: Prevents entire class of bundle size regressions with 15 minutes of work.

---

## 2️⃣ SHOULD-DO: UI Package Surface

**Status:** ⏳ DEFERRED (UI package not on main yet)

**When to do:** After merging all 3 PRs, if `packages/ui/` exists

### Create Intentional Export Surface

**packages/ui/src/index.ts:**
```typescript
// Export only what Composer actually uses
// Don't export everything - keep API intentional

export * from './components/button'
export * from './components/slider'
export * from './components/grid-cell'

// Add new exports only when needed by apps
```

### Add Publish Hygiene

**packages/ui/package.json:**
```json
{
  "name": "@music/ui",
  "files": [
    "dist",
    "src/index.ts",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "sideEffects": false
}
```

**Why:**
- Keeps design tight and intentional
- Prevents API sprawl
- Helps tree-shaking (sideEffects: false)
- IR > 1 for maintainability

**Time:** ~10 minutes

---

## 3️⃣ Engine Package Publish Config

**packages/engine/package.json:**
```json
{
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

Or create **packages/engine/.npmignore:**
```
src
tests
tsconfig.json
*.test.ts
*.spec.ts
.DS_Store
```

**Time:** 5 minutes

---

## 4️⃣ Add Public API Smoke Tests

**packages/engine/tests/public-api.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/public-api';

describe('Public API Surface', () => {
  it('exports createEngine function', () => {
    expect(typeof createEngine).toBe('function');
  });

  it('creates engine with required methods', async () => {
    const engine = await createEngine();

    expect(engine).toHaveProperty('start');
    expect(engine).toHaveProperty('play');
    expect(engine).toHaveProperty('stop');
    expect(engine).toHaveProperty('setTempo');
    expect(engine).toHaveProperty('setMacro');
    expect(engine).toHaveProperty('loadKit');
    expect(engine).toHaveProperty('renderOffline');

    expect(typeof engine.start).toBe('function');
    expect(typeof engine.play).toBe('function');
    expect(typeof engine.stop).toBe('function');
  });
});
```

**Time:** 10 minutes

---

## 5️⃣ NODE_ENV Guards for Debug Logs

**Create utility:** `packages/engine/src/debug.ts`
```typescript
export function debugLog(flag: string, ...args: any[]): void {
  if (
    process.env.NODE_ENV === 'development' &&
    typeof globalThis !== 'undefined' &&
    (globalThis as any)[flag] === true
  ) {
    console.log(...args);
  }
}
```

**Replace all debug logging:**
```typescript
// Before:
if (typeof globalThis !== 'undefined' && (globalThis as any).LL_DEBUG_AUDIO) {
  console.log('[Audio] Debug info');
}

// After:
import { debugLog } from './debug';
debugLog('LL_DEBUG_AUDIO', '[Audio] Debug info');
```

**Files to update:** 18+ files with 30+ console statements

**Time:** 30-45 minutes

---

## 6️⃣ Mark Experimental API

**packages/engine/src/public-api.ts:**
```typescript
export interface EngineHandle {
  start(): Promise<void>;
  play(): void;
  stop(): void;
  setTempo(bpm: number): void;
  setMacro(name: MacroName, value: number): void;
  loadKit(manifest: KitManifest): Promise<void>;

  /**
   * Offline rendering (experimental)
   * @experimental Currently returns silent buffer
   */
  renderOffline(state: SongState): Promise<AudioBuffer>;
}
```

**Time:** 5 minutes

---

## 7️⃣ README Architecture Diagram

Add to root README.md:

```markdown
## Architecture

┌─────────────────────────────────────────────┐
│            Applications Layer               │
├──────────────────┬──────────────────────────┤
│  apps/composer   │      apps/lab            │
│  (Step Sequencer)│  (Experimental)          │
│  - Transport     │  - Rapid prototyping     │
│  - MacroStrip    │  - Feature testing       │
│  - ComposerGrid  │                          │
└────────┬─────────┴───────────┬──────────────┘
         │                     │
         │   @music/engine     │
         │   @music/ui         │
         └─────────────────────┘
                   │
         ┌─────────┴──────────┐
         │  Headless Engine   │
         │  ----------------  │
         │  - No DOM deps     │
         │  - Tone.js peer    │
         │  - Macro system    │
         │  - FX buses        │
         └────────────────────┘
                   │
              Tone.js v14
              (peer dependency)
```
**Time:** 10 minutes

---

## Timeline

**Immediate (within 1 hour):**
- [x] Size-limit CI (already done)
- [ ] Engine publish config (5 min)
- [ ] Mark renderOffline @experimental (5 min)

**Same Day (within 2-3 hours):**
- [ ] UI package surface (if package exists - 10 min)
- [ ] Public API smoke tests (10 min)
- [ ] README architecture diagram (10 min)

**Week 1 (4-6 hours total):**
- [ ] NODE_ENV guards (45 min)
- [ ] Replace placeholder assets with real samples
- [ ] Document Tone v14 vs v15 behavior
- [ ] Add .gitattributes for audio files

---

## Success Metrics

After completing these tasks:
- ✅ CI fails on bundle size regressions
- ✅ Engine publish-ready with clean surface
- ✅ Public API tested and stable
- ✅ Debug logs production-safe
- ✅ Documentation complete

---

**ChatGPT's Verdict:** Both recommendations are IR>1 (Impact/Effort > 1)
- Size-limit: Clear winner, prevents regressions cheaply
- UI surface: Keeps design tight, avoids future churn

**Status:** Size-limit DONE, UI deferred until package exists post-merge.
