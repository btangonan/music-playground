# LOC Complexity Hotspots

## Top 20 Files by Line Count

| Rank | LOC | File | Severity | Recommendation |
|------|-----|------|----------|----------------|
| 1 | 762 | `packages/engine/src/audio-engine.ts` | 🔴 CRITICAL | Split into 4+ modules: init, scheduling, effects, state |
| 2 | 726 | `apps/composer/src/components/ui/sidebar.tsx` | 🔴 CRITICAL | Duplicate of packages/ui - remove |
| 3 | 726 | `apps/composer/src/components/IconSequencerWithDensity.tsx` | 🔴 CRITICAL | Extract density logic, grid rendering, interaction handlers |
| 4 | 637 | `packages/ui/src/components/sidebar.tsx` | 🔴 CRITICAL | Extract sub-components, use composition |
| 5 | 467 | `apps/composer/src/components/IconSequencer.tsx` | 🟡 HIGH | Extract grid logic, event handlers |
| 6 | 453 | `apps/composer/src/views/LoopLabView.tsx` | 🟡 HIGH | Extract macros, transport, state management |
| 7 | 414 | `apps/composer/src/audio/iconSounds.ts` | 🟡 HIGH | Data file - consider JSON extraction |
| 8 | 384 | `packages/engine/src/reverse-reverb.ts` | 🟡 HIGH | Split reverb algorithm from IR loading |
| 9 | 377 | `packages/engine/src/presets.ts` | 🟡 HIGH | Data file - consider JSON extraction |
| 10 | 353 | `apps/composer/src/components/ui/chart.tsx` | 🟢 MEDIUM | UI library - acceptable if from shadcn |
| 11 | 348 | `packages/engine/src/param-curves.ts` | 🟢 MEDIUM | Extract curve types, validators |
| 12 | 337 | `apps/composer/src/__tests__/loopApi.e2e.test.ts` | 🟢 MEDIUM | Test file - consider splitting by feature |
| 13 | 329 | `packages/engine/src/bus-fx.ts` | 🟢 MEDIUM | Extract FX types, routing logic |
| 14 | 303 | `packages/ui/src/components/chart.tsx` | 🟢 MEDIUM | UI library component |
| 15 | 281 | `packages/engine/src/gain-staging.ts` | ✅ OK | Just under threshold |
| 16 | 276 | `apps/composer/src/components/ui/menubar.tsx` | ✅ OK | Under threshold |
| 17 | 267 | `apps/composer/src/components/SoundIcons.tsx` | ✅ OK | Icon definitions - may be data-heavy |
| 18 | 257 | `apps/composer/src/components/ui/dropdown-menu.tsx` | ✅ OK | UI library component |
| 19 | 252 | `apps/composer/src/components/ui/context-menu.tsx` | ✅ OK | UI library component |
| 20 | 241 | `apps/composer/src/components/ui/carousel.tsx` | ✅ OK | UI library component |

## Priority Refactoring Targets

### 🔴 Critical (Immediate Action Required)

1. **audio-engine.ts (762 LOC)**
   - Violates SRP - handles initialization, scheduling, effects, state
   - Recommendation: Split into modules
     - `audio-init.ts` - Context setup, IR loading
     - `audio-scheduler.ts` - Note scheduling, timing
     - `audio-fx.ts` - Effects routing, parameter mapping
     - `audio-state.ts` - Playback state management

2. **IconSequencerWithDensity.tsx (726 LOC)**
   - Complex UI component with multiple concerns
   - Recommendation: Extract
     - `DensityControls.tsx` - Density UI logic
     - `SequencerGrid.tsx` - Grid rendering
     - `SequencerInteractions.tsx` - Drag/drop handlers
     - `useSequencerState.ts` - State management hook

3. **sidebar.tsx duplicates (726 + 637 LOC)**
   - Code duplication across packages
   - Recommendation: Consolidate to `packages/ui`, remove app copy

### 🟡 High Priority (Next Sprint)

4. **IconSequencer.tsx (467 LOC)**
5. **LoopLabView.tsx (453 LOC)**
6. **reverse-reverb.ts (384 LOC)**

## LOC Discipline Score: 1/3

**Rationale:**
- 16 files exceed 300 LOC threshold (5.7% of codebase)
- 2 files exceed 700 LOC (severe SRP violations)
- Largest file is 762 LOC (2.5x threshold)
- Some violations justified (UI library components, data files)
- Core logic files (engine) need immediate attention

**Target:** Reduce to <5 files over 300 LOC (1.8%)
