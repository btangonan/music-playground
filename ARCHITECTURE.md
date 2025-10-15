# Music Playground - Architecture

**Last Updated:** 2025-10-15
**Status:** Post pre-merge review, ready for PR merge

---

## Core Principles

### 1. Headless Engine Architecture

**Rule:** The engine package MUST NOT depend on DOM APIs.

**Why:** Enables offline rendering, Node.js usage, and testing without browser.

**Enforcement:**
- `packages/engine/tsconfig.json` has `"lib": ["ES2022"]` (NO DOM)
- Apps have `"lib": ["ES2022", "DOM"]` to keep DOM types isolated
- Use `globalThis` instead of `window` in engine code
- Never import browser-specific APIs (MediaRecorder, AudioContext creation handled by Tone.js)

**Critical Files:**
- `packages/engine/tsconfig.json` - Must keep `"lib": ["ES2022"]`
- `packages/engine/src/audio-engine.ts` - Removed `startRecording()` (was DOM-specific)
- All engine files use `globalThis` not `window`

---

## 2. Tone.js Dependency Strategy

**Rule:** Engine declares Tone as peer dependency, apps install specific version.

**Current Setup:**
```json
// packages/engine/package.json
{
  "peerDependencies": {
    "tone": "^14 || ^15"
  },
  "devDependencies": {
    "tone": "^14.8.49"  // For development/testing only
  }
}

// apps/composer/package.json
// apps/lab/package.json
{
  "dependencies": {
    "tone": "^14.8.49"  // MUST match across all apps
  }
}
```

**Why v14 over v15:**
- v14 has full PitchShift support (shimmer, harmonizer work perfectly)
- v15 deprecated PitchShift (harmonizer uses graceful fallback)
- Lock to v14 for best audio quality

**If switching to v15:**
1. Test harmonizer fallback behavior
2. Document shimmer/harmonizer degradation
3. Update all apps simultaneously to same major version

---

## 3. Path Resolution Strategy

**Rule:** TypeScript path aliases MUST be resolved by Vite in apps.

**Setup:**
```json
// tsconfig.base.json
{
  "paths": {
    "@music/engine": ["packages/engine/src"],
    "@music/ui": ["packages/ui/src"],
    "@music/types": ["shared/types"]
  }
}

// apps/composer/vite.config.ts
// apps/lab/vite.config.ts
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [react(), tsconfigPaths()]  // CRITICAL: Must have tsconfigPaths
})
```

**Without vite-tsconfig-paths:**
- Build fails with "Cannot find module '@music/engine'"
- TypeScript sees paths, but Vite doesn't resolve them

---

## 4. Bundle Size Discipline

**Rule:** Composer app JS bundle must stay under 150 KB gzipped.

**Enforcement:**
```json
// Root package.json
{
  "size-limit": [
    {
      "name": "composer bundle",
      "path": "apps/composer/dist/assets/*.js",
      "limit": "150 KB"
    }
  ]
}
```

**CI Check:**
```yaml
# .github/workflows/ci.yml
- name: Check bundle size with size-limit
  run: pnpm size
```

**CI fails if bundle exceeds limit** - prevents regressions.

**Assets (samples, IRs) NOT included** in size budget - only JS code.

---

## 5. Macro System Design

**Implemented Macros:**
- `space` - Reverb/convolver wetness
- `color` - Filter frequency and timbre
- `hype` - Drive/saturation/energy

**Stubbed (TODO):**
- `feel` - Swing, humanize, timing jitter
- `width` - Stereo width control
- `magic` - Ambient layer and texture

**Public API:**
```typescript
engine.setMacro('space', 0.7)  // 0-1 range
```

**Implementation Location:** Engine, not app
- Apps call `setMacro()`
- Engine maps macro value → effect parameter curves
- Perceptual curves in `packages/engine/src/param-curves.ts`

---

## 6. Effect Bus Architecture

**Master Bus Flow:**
```
Instruments → Effect Chains → Bus.master → Destination
                    ↓
            FX Send Buses (reverb, delay)
```

**Key Objects:**
```typescript
// packages/engine/src/audio-engine.ts
export const Bus = {
  master: Tone.Gain(1).toDestination(),
  recordTap: Tone.Gain(1),
  kick: Tone.Gain(1),      // Sidechain trigger
  ambient: Tone.Gain(1)    // Ducking target
}
```

**FX Buses:**
- Managed by `packages/engine/src/bus-fx.ts`
- Send/return architecture for reverb, delay, etc.
- Per-track send levels controlled by engine

---

## 7. Debug Logging Strategy

**Current State:** Debug logs lack `process.env.NODE_ENV` guards (30+ statements)

**TODO (Post-merge):**
```typescript
// packages/engine/src/debug.ts (to be created)
export function debugLog(flag: string, ...args: any[]): void {
  if (
    process.env.NODE_ENV === 'development' &&
    typeof globalThis !== 'undefined' &&
    (globalThis as any)[flag] === true
  ) {
    console.log(...args);
  }
}

// Usage:
import { debugLog } from './debug';
debugLog('LL_DEBUG_AUDIO', '[Audio] Debug info');
```

**Current flags in use:**
- `LL_DEBUG_IR` - IR loading
- `LL_DEBUG_AUDIO` - Audio engine
- `LL_DEBUG_REVERSE_REVERB` - Reverse reverb effect
- `LL_DEBUG_FX_BUSES` - FX bus routing
- `LL_DEBUG_GAIN_STAGING` - Gain staging
- `LL_DEBUG_PARAM_CURVES` - Parameter curves
- `LL_DEBUG_WIDTH` - Stereo width
- `LL_DEBUG_DUCK` - Ducking/sidechain

---

## 8. IR (Impulse Response) Strategy

**Current:** Using Tone.js demo URLs (placeholder)

**Default IR:**
```typescript
// packages/engine/src/ir-manifest.ts
getIR('m7_hall_a')  // Default convolver IR
```

**TODO (Post-merge):**
1. Replace with local plate IR (small file, <1 MB)
2. Start dry (no IR loaded initially)
3. Fade in reverb when IR ready
4. Don't block first sound on IR decode

**Licensing:** Ensure IR has compatible license for distribution

---

## 9. Offline Rendering

**Current State:** Placeholder (returns silent buffer)

**Public API:**
```typescript
const buffer = await engine.renderOffline({
  bars: 4,
  tempo: 120,
  instruments: [...]
})
```

**TODO:**
- Mark `@experimental` in JSDoc
- Hide from UI until functional
- Implement note scheduling from song state
- Test in Node.js environment (headless mode)

---

## 10. Recording Strategy

**Removed from engine:** `startRecording()` (was DOM-specific)

**New approach:** Apps implement browser-specific recording

**Example for future app implementation:**
```typescript
// apps/composer/src/recording.ts
async function startRecording() {
  const ctx = Tone.getContext().rawContext as AudioContext;
  const dest = ctx.createMediaStreamDestination();

  // Connect engine master to recorder
  Bus.master.connect(dest);

  const recorder = new MediaRecorder(dest.stream);
  // ... recording logic
}
```

**Why:** Keeps engine headless, moves browser APIs to app layer

---

## 11. Monorepo Structure

```
music-playground/
├── packages/
│   ├── engine/        # Headless audio engine (NO DOM)
│   │   ├── src/
│   │   │   ├── audio-engine.ts    # Core engine, buses
│   │   │   ├── macros.ts          # Macro implementations
│   │   │   ├── public-api.ts      # createEngine() facade
│   │   │   ├── param-curves.ts    # Perceptual curves
│   │   │   ├── bus-fx.ts          # FX send/return
│   │   │   └── ir-manifest.ts     # IR metadata
│   │   ├── tests/
│   │   │   └── smoke.test.ts      # Basic smoke tests
│   │   ├── package.json           # Tone as peer dependency
│   │   └── tsconfig.json          # "lib": ["ES2022"] NO DOM
│   │
│   └── ui/            # Shared React components (future)
│
├── apps/
│   ├── composer/      # Main step sequencer app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Transport.tsx       # Play/Stop/BPM
│   │   │   │   ├── MacroStrip.tsx      # Space/Color/Hype
│   │   │   │   └── ComposerGrid.tsx    # 16-step grid (stub)
│   │   │   └── App.tsx
│   │   ├── package.json           # Includes tone@^14.8.49
│   │   ├── tsconfig.json          # "lib": ["ES2022", "DOM"]
│   │   └── vite.config.ts         # Has tsconfigPaths plugin
│   │
│   └── lab/           # Experimental features app
│       └── (minimal scaffold)
│
├── shared/
│   ├── assets/        # Audio samples, IRs (future)
│   └── types/         # Shared TypeScript types
│
├── .github/workflows/ci.yml  # Includes size-limit check
├── package.json              # Workspace root, size-limit config
├── tsconfig.base.json        # Shared TS config, path aliases
└── turbo.json                # Build orchestration
```

---

## 12. Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `feat/*` - Feature branches
- Merge order for current PRs: engine → composer → lab

**Vendor Cleanup:**
- `_vendor/loop-lab/` existed as reference code
- Removed by PR #1 (feat/engine-extract)
- After merge, `git ls-files "_vendor/*"` should be empty

**Commit Standards:**
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Include 🤖 Generated with Claude Code footer
- Clear, descriptive commit messages

---

## 13. Audio Performance Targets

**Latency:**
- Desktop: < 100ms
- Mobile: < 150ms

**Look-ahead:** 0.1s (100ms) for smooth scheduling

**First Sound:** < 2.5s from app load

**Bundle Budget:** < 150 KB gzipped (Composer JS, no assets)

**Configuration:**
```typescript
// packages/engine/src/public-api.ts
const ctx = Tone.getContext();
ctx.lookAhead = 0.1;           // 100ms look-ahead
ctx.latencyHint = 'interactive'; // Low latency priority
```

---

## 14. Testing Strategy

**Current Coverage:**
- ✅ Parameter curves (smoke test)
- ❌ Public API shape
- ❌ IR manifest resolution
- ❌ Offline rendering

**TODO (Post-merge):**
```typescript
// packages/engine/tests/public-api.test.ts
describe('Public API', () => {
  it('exports createEngine', () => {
    expect(typeof createEngine).toBe('function');
  });

  it('engine has required methods', async () => {
    const engine = await createEngine();
    expect(engine).toHaveProperty('start');
    expect(engine).toHaveProperty('setMacro');
    // ...
  });
});
```

**Test Command:** `pnpm test` (runs vitest)

---

## 15. Build Process

**Build Order:**
1. Engine package (produces `dist/`)
2. Apps (depend on engine)

**Commands:**
```bash
# Build everything
pnpm build

# Build specific package
pnpm -w -F @music/engine build
pnpm -w -F composer build

# Dev mode (watch + HMR)
pnpm -w -F composer dev
```

**Turbo orchestration:** Handles dependency order automatically

---

## Critical Don'ts

❌ **Don't add DOM types to engine** - Breaks headless architecture
❌ **Don't use window in engine** - Use globalThis
❌ **Don't import MediaRecorder in engine** - Browser-specific
❌ **Don't forget vite-tsconfig-paths** - Path resolution breaks
❌ **Don't mix Tone versions** - Apps must use same major
❌ **Don't commit debug logs without guards** - Production bloat
❌ **Don't exceed 150 KB bundle** - CI will fail
❌ **Don't block first sound on IR load** - Start dry, fade verb

---

## Critical Do's

✅ **Do keep engine headless** - Test in Node.js
✅ **Do use globalThis** - Not window
✅ **Do lock Tone version** - Same across workspace
✅ **Do add size-limit checks** - Prevent regressions
✅ **Do use perceptual curves** - param-curves.ts
✅ **Do start audio on user gesture** - engine.start() in click handler
✅ **Do verify _vendor removed** - After PR #1 merge
✅ **Do run verify-merge.sh** - After all PRs merged

---

## Future Naive Claude Instructions

**When resuming this project:**

1. Read this ARCHITECTURE.md
2. Read DEVELOPMENT.md for common pitfalls
3. Check CLAUDE.md for project-specific rules
4. Verify current state: `git status && git log -5`
5. Check which PRs are merged: `git branch -a`
6. If post-merge: Run `./verify-merge.sh`
7. Before any engine changes: Verify no DOM types in tsconfig
8. Before any Tone changes: Check version consistency
9. Before committing: Run `pnpm build && pnpm test`
10. Before claiming "fixed": Read RULES_PROGRESS_REPORTING.md

**Key Files to Always Check:**
- `packages/engine/tsconfig.json` - Must have `"lib": ["ES2022"]`
- `packages/engine/package.json` - Tone peer dependency
- `apps/*/package.json` - Tone versions match
- `.github/workflows/ci.yml` - Size-limit check present

**Quick Sanity Check:**
```bash
# Verify headless isolation
grep -r "window\." packages/engine/src/  # Should find NOTHING
grep "lib.*DOM" packages/engine/tsconfig.json  # Should be EMPTY

# Verify Tone versions
jq -r '.dependencies.tone' apps/*/package.json  # Should match

# Verify build works
pnpm install && pnpm build && pnpm test
```

---

**Architecture Owner:** Bradley Tangonan
**Last Major Refactor:** 2025-10-15 (Pre-merge review)
**Next Review:** After PR merges + post-merge tasks complete
