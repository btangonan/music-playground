# MPC-Style Drop Zone Implementation Plan

## Phase 1: Create New Components
1. Create LoopButton.tsx - Fat button with mini preview
2. Create StepEditorModal.tsx - 2x8 step grid modal

## Phase 2: Fix Type Safety
1. Define DragState discriminated union
2. Update drag state throughout Index.tsx

## Phase 3: Update Index.tsx
1. Fix instrument port handler
2. Add effect output port handler
3. Add drop zone state and handlers
4. Replace dialog UI with drop zone component
5. Replace track rows with fat button grid
6. Add modal state and component

## Phase 4: Testing
1. Drag instrument to drop zone
2. Drag effect to drop zone (for Phase B readiness)
3. Click fat button to open modal
4. Toggle steps in modal
5. Test mute/solo/remove controls
6. Verify duplicate prevention
7. Test orphan cleanup

## Dependencies Preserved
- Track model and DeviceTrackRef
- Mute/solo logic with shouldTrigger
- Invariant checks
- Audio engine integration
