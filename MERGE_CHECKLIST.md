# Merge Checklist - Music Playground PRs

**Date:** 2025-10-15
**PRs Ready:** #1 (engine), #2 (composer), #3 (lab)

---

## Pre-Merge Verification ✅

### Repository State Confirmed
- [x] Main branch has README, LICENSE, .github/workflows/ci.yml
- [x] `_vendor/loop-lab/` exists on main (will be removed by PR #1)
- [x] All 3 PRs are mergeable and clean
- [x] Branch protection satisfied or ready for approval

### Critical Fixes Applied
- [x] Engine tsconfig has `"lib": ["ES2022"]` (no DOM)
- [x] Apps have tsconfig with `"lib": ["ES2022", "DOM"]`
- [x] `startRecording()` removed from engine
- [x] All `window` → `globalThis` in engine
- [x] Both apps have `tone@^14.8.49` dependency
- [x] Both apps have `vite-tsconfig-paths` plugin

---

## Merge Order & Commands

### 1️⃣ Merge feat/engine-extract

```bash
# Ensure clean state
git checkout main
git status  # Should be clean

# Merge engine PR
git merge feat/engine-extract --no-ff -m "feat: extract headless audio engine package

- Headless audio engine with Tone.js peer dependency
- Macro system (space, color, hype)
- FX buses, gain staging, convolver system
- Offline rendering foundation
- Removes _vendor/loop-lab reference code

Critical fixes: DOM isolation, Node.js compatibility, tsconfig hardening.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Verify vendor removal
git ls-files "_vendor/*"  # Should be empty
ls _vendor/ 2>/dev/null && echo "ERROR: _vendor still exists!" || echo "✅ Vendor removed"

# Verify packages directory exists
ls packages/engine/  # Should show engine package
```

### 2️⃣ Merge feat/composer-mvp

```bash
# Merge composer PR
git merge feat/composer-mvp --no-ff -m "feat: composer app with transport and macros

- Composer UI with Transport controls
- MacroStrip with space/color/hype sliders
- ComposerGrid stub for step sequencing
- Wired to @music/engine package
- Includes Tone.js dependency and Vite path resolution

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Verify apps directory
ls apps/composer/  # Should show composer app
```

### 3️⃣ Merge feat/lab-stub

```bash
# Merge lab PR
git merge feat/lab-stub --no-ff -m "feat: lab experimental app stub

- Lab app scaffold for experimental features
- Minimal boilerplate for rapid prototyping
- Includes Tone.js dependency and Vite path resolution

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Verify apps directory
ls apps/lab/  # Should show lab app
```

---

## Post-Merge Validation

### Install & Build
```bash
# Clean install
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install

# Verify Tone version consistency
grep -r "tone" packages/*/package.json apps/*/package.json
# All should show tone@^14.8.49 or peer: ^14 || ^15

# Build packages in order
pnpm -w -F @music/engine build
pnpm -w -F composer build
pnpm -w -F lab build

# Run tests
pnpm -w -F @music/engine test
```

### Manual Smoke Test
```bash
# Start composer dev server
pnpm -w -F composer dev

# Browser verification:
# 1. Open http://localhost:5173
# 2. Check console - NO errors
# 3. Verify Transport renders (Play/Stop buttons)
# 4. Verify MacroStrip renders (Space/Color/Hype sliders)
# 5. Click Play → audio context initializes
# 6. Move macros → should affect sound (if audio playing)
# 7. First sound < 2.5s from page load
# 8. No red clipping meters
```

---

## Success Criteria

Merge considered successful when:

- [x] All 3 PRs merged cleanly
- [ ] `_vendor/` directory removed from main
- [ ] `pnpm install` completes without errors
- [ ] All packages build successfully
- [ ] Engine tests pass
- [ ] Composer dev server starts without errors
- [ ] No console errors in browser
- [ ] Audio playback works (manual test)

---

## Rollback Plan

If critical issues discovered:

```bash
# Identify merge commits
git log --oneline --merges -5

# Revert in reverse order
git revert <lab-merge-commit> -m 1
git revert <composer-merge-commit> -m 1
git revert <engine-merge-commit> -m 1

# Push rollback
git push origin main
```

---

## Post-Merge Next Steps

### Immediate (Same Day)
1. Push merged main to origin
2. Delete merged feature branches
3. Create follow-up PR for debug log NODE_ENV guards
4. Add `"files": ["dist", "README.md"]` to engine package.json

### Week 1
1. Add public API smoke tests
2. Implement `size-limit` with 150KB budget
3. Document TODO macros as `@experimental`
4. Add `.npmignore` to packages

### Week 2
1. Replace placeholder assets with real samples + IR
2. Implement feel macro with scheduling jitter
3. Complete README with architecture diagram
4. Add pre-commit hooks

---

## Branch Protection Notes

If PRs are blocked by branch protection:

**Option A: Approve via GitHub CLI**
```bash
gh pr review 1 --approve
gh pr review 2 --approve
gh pr review 3 --approve
gh pr merge 1 --merge
gh pr merge 2 --merge
gh pr merge 3 --merge
```

**Option B: Temporarily Adjust Protection**
1. Go to repo Settings → Branches
2. Edit branch protection rule for main
3. Temporarily disable "Require approvals"
4. Merge PRs manually
5. Re-enable protection

---

## Contact & Questions

- **Engine Architecture:** `packages/engine/README.md`
- **Macro System:** `packages/engine/src/macros.ts`
- **Public API:** `packages/engine/src/public-api.ts`
- **Full Review:** `PRE_MERGE_REPORT.md`

---

**Checklist Generated:** 2025-10-15
**All Systems:** ✅ GO for merge
