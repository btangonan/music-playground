# ChatGPT Code Review: Post-Merge Build Failures

## Repository Context

**Repo**: `btangonan/music-playground`
**Branch**: `main`
**Status**: Three PRs successfully merged, but build fails due to incomplete vendor code extraction

## What Just Happened

Successfully merged three PRs in order:
1. **PR #1** (feat/engine-extract) - Regular merge with `--no-ff` to preserve history
2. **PR #2** (feat/composer-mvp) - Squash merge for cleaner commit
3. **PR #3** (feat/lab-stub) - Squash merge for cleaner commit

Post-merge, applied fixes:
- ✅ Added `pnpm-workspace.yaml` for monorepo
- ✅ Fixed `turbo.json`: `pipeline` → `tasks` (Turbo 2.x compatibility)
- ✅ Fixed `packages/engine/src/macros.ts`: Repaired split function name `spaceM\nacro` → `spaceMacro`
- ✅ Added Tone.js peer + dev dependency to `packages/engine/package.json`

## Critical Problem: Build Still Fails

**Error**: Engine package references non-existent vendor files that weren't migrated during extraction.

### Missing Files Referenced

1. **`./synth-advanced`**
   - Referenced in: `packages/engine/src/audio-engine.ts:2`
   - Function used: `makeInstrumentV2('pad_gate', opts)` at line 148
   - Purpose: Advanced synthesizer instrument creation

2. **`./ambient-layer`**
   - Referenced in: `packages/engine/src/audio-engine.ts:512` (dynamic import)
   - Function used: `makeAmbientLayer('noise', undefined, -24, 800, 0.3)` at line 513
   - Purpose: Ambient texture generation

3. **`./effect-wiring`**
   - Referenced in: `packages/engine/src/presets.ts:4`
   - Function used: `postWireEffect(config)` at line 52
   - Purpose: Post-effect configuration and routing

### Architecture Context

From `ARCHITECTURE.md`:

**Critical Rule**: The engine package MUST NOT have DOM dependencies.
- `packages/engine/tsconfig.json` has `"lib": ["ES2022"]` (NO DOM)
- Apps have `"lib": ["ES2022", "DOM"]` to keep DOM types isolated
- Use `globalThis` instead of `window` in engine code

**Tone.js Strategy**:
- Engine declares Tone as peer dependency (`^14 || ^15`)
- Apps install specific version (`^14.8.49` currently)
- v14 has full PitchShift support (harmonizer works perfectly)

**Monorepo Structure**:
```
music-playground/
├── packages/
│   ├── engine/        # Headless audio engine (@music/engine)
│   └── ui/            # Shared React components
├── apps/
│   ├── composer/      # Step sequencer with macros
│   └── lab/           # Experimental sandbox
└── shared/
    └── assets/        # Audio samples and IRs
```

## Key Files for Review

### Critical Files with Errors

1. **`packages/engine/src/audio-engine.ts`**
   - Lines 2, 148: `makeInstrumentV2` from non-existent `./synth-advanced`
   - Lines 512-513: `makeAmbientLayer` from non-existent `./ambient-layer`
   - Line 212: References `_debugAnalyser` property not in `InstrumentConfig` type

2. **`packages/engine/src/presets.ts`**
   - Line 4: `postWireEffect` from non-existent `./effect-wiring`
   - Line 52: Usage of `postWireEffect(config)`

### Supporting Files

3. **`packages/engine/tsconfig.json`** - Must maintain `"lib": ["ES2022"]` (no DOM)
4. **`packages/engine/package.json`** - Now has Tone peer dependency
5. **`packages/engine/src/macros.ts`** - Fixed, macro system works
6. **`ARCHITECTURE.md`** - Headless architecture rules
7. **`CLAUDE.md`** - Project-specific rules and critical don'ts

## Your Mission

**Goal**: Make the engine package build successfully while maintaining headless architecture.

### Option 1: Stub Out Missing Features (Recommended)
- Comment out or remove references to `synth-advanced`, `ambient-layer`, `effect-wiring`
- Remove usages of `makeInstrumentV2`, `makeAmbientLayer`, `postWireEffect`
- Keep engine minimal and focused on core macro system (space, color, hype)
- Mark features as "TODO: Future implementation"

### Option 2: Create Minimal Stubs
- Create placeholder files that satisfy TypeScript compilation
- Implement minimal no-op versions that don't break runtime
- Throw "Not implemented" errors if called

### Option 3: Deep Analysis
- Analyze if these features are actually needed for MVP
- Determine if they can be safely removed entirely
- Check if any apps depend on them

## Success Criteria

1. ✅ `pnpm install` succeeds
2. ✅ `pnpm build` succeeds (all packages build)
3. ✅ `pnpm test` passes (if tests exist)
4. ✅ No DOM types leaked into engine package
5. ✅ Headless architecture maintained
6. ✅ Tone.js versions aligned across workspace

## Constraints

**NEVER DO**:
- ❌ Add DOM types to `packages/engine/tsconfig.json`
- ❌ Use `window` in engine code (use `globalThis`)
- ❌ Import MediaRecorder or browser-specific APIs in engine
- ❌ Mix Tone.js versions across apps
- ❌ Exceed 150 KB bundle size for Composer app

**ALWAYS DO**:
- ✅ Keep engine headless (works in Node.js and browser)
- ✅ Use perceptual curves from `param-curves.ts`
- ✅ Verify no DOM leakage: `grep -r "window\." packages/engine/src/`
- ✅ Run full build + test before claiming success

## Output Format

Please provide:

1. **Analysis**: What's the best approach and why?
2. **Changes Required**: Specific edits to make (file paths + line numbers)
3. **Testing Steps**: How to verify the fix works
4. **Trade-offs**: What functionality is lost (if any)
5. **Future Work**: What needs to be done later (if stubbing)

## Additional Context

**Vendor Code Cleanup**: The `_vendor/loop-lab/` directory was removed by PR #1. The engine extraction was supposed to pull out only the essential audio engine code, but it accidentally included references to features that weren't migrated.

**Current Macro System**: Implemented and working:
- `space` - Reverb/convolver wetness
- `color` - Filter frequency and timbre
- `hype` - Drive/saturation/energy

**Stubbed Macros** (not yet implemented):
- `feel` - Swing, humanize, timing jitter
- `width` - Stereo width control
- `magic` - Ambient layer and texture (related to `ambient-layer` issue!)

## Relevant Files to Clone/Inspect

```bash
git clone https://github.com/btangonan/music-playground.git
cd music-playground
git log --oneline -10  # See recent merge commits

# Critical files to review:
cat packages/engine/src/audio-engine.ts
cat packages/engine/src/presets.ts
cat packages/engine/tsconfig.json
cat ARCHITECTURE.md
cat CLAUDE.md

# Try building:
pnpm install
pnpm build  # Will fail - this is what needs fixing
```

## Summary

Three PRs successfully merged, but the engine package has stale imports to vendor code that wasn't migrated. Need to clean up these references while maintaining the headless architecture and keeping the engine focused on the core macro system.

**Your task**: Provide specific code changes to make `pnpm build` succeed without violating architectural constraints.
