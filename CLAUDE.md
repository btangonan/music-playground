# CLAUDE.md - Project-Specific Instructions

**For Claude Code instances working on Music Playground**

---

## CRITICAL: Read These Files First

Before doing ANYTHING on this project:

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, critical don'ts
2. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Common pitfalls, debugging
3. **[RULES_PROGRESS_REPORTING.md](.claude/RULES_PROGRESS_REPORTING.md)** - Never claim "fixed" without validation

---

## Project-Specific Rules

### 🔴 NEVER Violate Headless Architecture

**The engine package MUST NOT have DOM dependencies.**

```bash
# Before ANY engine changes, verify:
grep -i "dom" packages/engine/tsconfig.json
# Output should be EMPTY

grep -r "window\." packages/engine/src/
# Output should be EMPTY (use globalThis instead)
```

**If you need browser APIs:**
- Move functionality to app layer (apps/composer, apps/lab)
- Keep engine headless for Node.js/testing compatibility

---

### 🔴 NEVER Mix Tone.js Versions

**All apps MUST use the same Tone major version.**

```bash
# Check versions before any Tone changes:
jq '.dependencies.tone' apps/*/package.json

# Should all show: "^14.8.49" (or same major)
```

**If changing Tone version:**
1. Update ALL apps simultaneously
2. Test harmonizer/shimmer effects (may degrade in v15)
3. Update documentation with behavior changes

---

### 🔴 NEVER Forget vite-tsconfig-paths

**Apps MUST have vite-tsconfig-paths plugin.**

```bash
# Verify before any Vite config changes:
grep "tsconfigPaths" apps/*/vite.config.ts

# Should show plugin in both composer and lab
```

**Without it:** Build fails with "Cannot find module '@music/engine'"

---

### 🔴 NEVER Skip Size-Limit Check

**Bundle must stay under 150 KB gzipped.**

```bash
# Run before committing:
pnpm size

# CI will fail if exceeded
```

**If over budget:**
- Check for large new dependencies
- Add NODE_ENV guards to debug logs
- Run `npx vite-bundle-visualizer apps/composer/dist`

---

### 🔴 NEVER Claim "Fixed" Without Full Validation

**Read [RULES_PROGRESS_REPORTING.md](.claude/RULES_PROGRESS_REPORTING.md)**

Required validation:
1. ✅ Backend tests pass
2. ✅ App loads without errors
3. ✅ UI renders correctly
4. ✅ Audio actually plays (if audio feature)
5. ✅ User confirms it works

Don't say "fixed" - say "Ready for testing"

---

## Project Context

### Current State (2025-10-15)

**Main Branch:**
- ✅ Has README, LICENSE, CI
- ✅ Has size-limit protection
- ⚠️ Has `_vendor/loop-lab/` (reference code - to be removed by PR #1)

**Pending PRs (ready to merge):**
1. PR #1 (feat/engine-extract) - Headless engine package + removes _vendor
2. PR #2 (feat/composer-mvp) - Composer app with macros
3. PR #3 (feat/lab-stub) - Lab experimental app

**Critical Fixes Applied:**
- ✅ Engine tsconfig has `"lib": ["ES2022"]` (no DOM)
- ✅ Apps have tsconfig with `"lib": ["ES2022", "DOM"]`
- ✅ `startRecording()` removed from engine (was DOM-specific)
- ✅ All `window` → `globalThis` in engine
- ✅ Both apps have `tone@^14.8.49` dependency
- ✅ Both apps have `vite-tsconfig-paths` plugin

---

## When You First Open This Project

```bash
# 1. Check project state
git status
git log --oneline -5

# 2. Verify which PRs are merged
git branch -a | grep feat/

# 3. If post-merge, run verification
if [ ! -d "_vendor" ]; then
  echo "PRs merged - running post-merge checks"
  ./verify-merge.sh
fi

# 4. Check critical files haven't regressed
grep -i "dom" packages/engine/tsconfig.json  # Should be empty
jq '.dependencies.tone' apps/*/package.json  # Should match
```

---

## Common Tasks

### Making Engine Changes

```bash
# 1. Verify headless isolation BEFORE editing
grep -r "window\." packages/engine/src/  # Must be empty

# 2. Make changes to packages/engine/src/

# 3. Build + test
pnpm -w -F @music/engine build
pnpm -w -F @music/engine test

# 4. Verify no DOM leakage
grep -r "window\|document\|MediaRecorder\|localStorage" packages/engine/src/

# 5. Test in app
pnpm -w -F composer dev
# Manual verification required!
```

### Adding New Feature

```bash
# 1. Read ARCHITECTURE.md for design decisions
# 2. Read DEVELOPMENT.md for common pitfalls
# 3. Determine if feature belongs in engine or app
# 4. If in engine: verify no DOM usage
# 5. Add tests
# 6. Update documentation
# 7. Run pre-commit checks:
pnpm build && pnpm test && pnpm size
```

### Debugging Audio Issues

```bash
# 1. Enable debug logging in browser console:
globalThis.LL_DEBUG_AUDIO = true
globalThis.LL_DEBUG_IR = true

# 2. Check audio context state:
console.log(Tone.getContext().state)  # Should be "running"

# 3. Verify engine initialized:
# In browser console, after clicking Play:
window.engineInstance  # Should exist

# 4. Check for errors in DevTools console
# 5. Verify user gesture triggered audio:
# engine.start() MUST be called in click handler
```

---

## Pre-Commit Checklist

**ALWAYS run before committing:**

```bash
# 1. Build succeeds
pnpm build

# 2. Tests pass
pnpm test

# 3. Bundle size OK
pnpm size

# 4. No DOM in engine
grep -r "window\." packages/engine/src/

# 5. Tone versions aligned
jq '.dependencies.tone' apps/*/package.json

# 6. Manual smoke test
pnpm -w -F composer dev
# - Click Play → audio starts < 2.5s
# - Move macros → audible changes
# - No console errors
```

---

## ChromaDB Memory (Future)

**Not currently active** - Using markdown documentation instead.

**If ChromaDB enabled in future:**
- Collection name: `music_playground_memory`
- Schema: decision/fix/tip/preference
- Log after completing tasks or making critical decisions

---

## Emergency Contacts

**If you're stuck:**

1. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for pitfall solutions
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for design rationale
3. Check [PRE_MERGE_REPORT.md](./PRE_MERGE_REPORT.md) for known issues
4. Read [POST_MERGE_TASKS.md](./POST_MERGE_TASKS.md) for next steps

**If build broken:**
```bash
# Nuclear option:
rm -rf node_modules packages/*/node_modules apps/*/node_modules
rm -rf packages/*/dist apps/*/dist
pnpm install
pnpm build
```

---

## Quality Gates

**CI enforces:**
- ✅ All packages build
- ✅ All tests pass
- ✅ Bundle size < 150 KB (Composer JS only)

**Manual verification required:**
- Audio plays correctly
- Macros affect sound
- No console errors
- First sound < 2.5s

---

## Workflow Expectations

### Starting Work

1. Read this file
2. Read ARCHITECTURE.md
3. Read DEVELOPMENT.md
4. Check project state (`git status`, `git log`)
5. Verify PRs merged or pending
6. Run `pnpm build && pnpm test`

### Making Changes

1. Understand which layer (engine vs app)
2. Check for DOM usage if touching engine
3. Add tests for new functionality
4. Run pre-commit checks
5. Manual smoke test
6. Write clear commit message

### Before Claiming Done

1. **NEVER say "fixed"** without full validation
2. Run all automated checks
3. Manual smoke test in browser
4. Verify with user if possible
5. Document any limitations

---

## Success Metrics

**You've done well if:**
- ✅ Build passes
- ✅ Tests pass
- ✅ No DOM in engine
- ✅ Bundle under 150 KB
- ✅ Audio works in browser
- ✅ No console errors
- ✅ Documentation updated
- ✅ User confirms fix (if applicable)

**Red flags:**
- ❌ Build fails
- ❌ Tests skipped
- ❌ Size-limit exceeded
- ❌ DOM types in engine
- ❌ Tone version mismatch
- ❌ Claimed "fixed" without validation
- ❌ Console errors in browser

---

## Final Reminders

1. **Headless engine is sacred** - no DOM, ever
2. **Tone versions must match** across workspace
3. **Bundle size matters** - CI enforces 150 KB
4. **Don't claim "fixed"** - say "ready to test"
5. **Manual testing required** - audio is interactive
6. **Read the docs first** - ARCHITECTURE.md, DEVELOPMENT.md

---

**Project Owner:** Bradley Tangonan
**Last Updated:** 2025-10-15
**Next Review:** After PR merges + post-merge tasks complete
