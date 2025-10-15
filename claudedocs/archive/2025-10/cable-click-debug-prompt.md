# Cable Click Delete Issue - Debug Prompt for ChatGPT

## Problem Statement
Cable click-to-delete functionality is not working in Loop Lab application. User clicks on cables (SVG paths connecting nodes) but onClick events do not fire, preventing cable deletion.

## Technical Context

**Application**: Loop Lab - Web-based modular audio synthesis playground
**Stack**: React 18, TypeScript, Vite, Tone.js, SVG for cable rendering
**Branch**: `main`
**Files Modified**:
- `src/components/Cable.tsx` - Cable rendering component with click handlers
- `src/pages/Index.tsx` - Main app with cable rendering and deletion logic
- `src/components/Toolbar.tsx` - UI toolbar with "Clear Effects" button

## Architecture Overview

### Cable System
Cables are SVG `<path>` elements rendered inside a parent `<svg>` with `pointer-events-none`:

```tsx
<svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
  <Cable
    from={() => startPoint}
    to={() => endPoint}
    onClick={() => disconnectEffectFromInstrument(instId, fxId)}
  />
</svg>
```

### Cable Component Structure (Cable.tsx)
```tsx
<g className="pointer-events-none">
  {/* Invisible 16px hit area */}
  <path
    stroke="transparent"
    strokeWidth={16}
    className="pointer-events-auto"
    onClick={onClick} // Should delete cable
  />

  {/* Visible 3px cable */}
  <path
    stroke={color}
    strokeWidth={3}
    style={{ pointerEvents: 'none' }}
  />
</g>
```

### Three Cable Types (Index.tsx lines 558-629)
1. **Instrument → Effect**: `disconnectEffectFromInstrument(inst.id, firstFx.id)`
2. **Effect → Effect**: `disconnectEffectFromInstrument(inst.id, toFx.id)`
3. **Pad cables**: `setPads(...); toast({ title: '🔌 Pad disconnected' })`

## Investigation History

### Attempt 1: Added onPointerDown Handler
**Hypothesis**: Prevent drag operations from starting when clicking cables
**Implementation**: Added `onPointerDown={(e) => e.stopPropagation()}` to invisible hit area
**Result**: ❌ FAILED - onClick events completely blocked
**Root Cause**: `stopPropagation()` on `pointerdown` prevents subsequent `click` events

### Attempt 2: Removed onPointerDown Handler
**Hypothesis**: Removing conflicting pointer handler will allow onClick to fire
**Implementation**: Deleted onPointerDown handler, kept onClick with stopPropagation
**Result**: ⚠️ **STILL NOT WORKING** (user reports issue persists)
**Current Code**:
```tsx
onClick={(e) => {
  console.log('[Cable Click] onClick fired - deleting cable');
  e.stopPropagation();
  e.preventDefault();
  onClick();
}}
```

## Questions for ChatGPT Review

### 1. Event Propagation Analysis
- Is there another event handler blocking onClick from firing?
- Should we check if parent's `onPointerMove` handler (Index.tsx:554) is interfering?
- Could the `z-0` z-index on parent SVG be causing click interception issues?

### 2. Pointer Events Configuration
- Parent SVG: `pointer-events-none`
- Cable group `<g>`: `pointer-events-none`
- Invisible hit path: `pointer-events-auto`
- Visible cable: `pointer-events: 'none'`

**Is this the correct pointer-events hierarchy for SVG click handling?**

### 3. React Event System
- Are we using synthetic events correctly?
- Should we use native DOM events instead (`addEventListener`)?
- Could React event pooling be causing issues?

### 4. Alternative Approaches
- Should we implement click detection via `onPointerUp` + movement threshold?
- Would switching to native DOM event listeners fix the issue?
- Should we add visual debugging (highlight on hover to confirm hit area works)?

## Debugging Checklist

### To Verify in Browser DevTools:
1. [ ] Open console and click cable - does `[Cable Click] onClick fired` appear?
2. [ ] Inspect cable element - does it have `pointer-events: auto` computed style?
3. [ ] Check Event Listeners panel - is onClick handler attached?
4. [ ] Add `onMouseDown` and `onMouseUp` to test basic click detection
5. [ ] Verify parent SVG doesn't have conflicting event handlers
6. [ ] Check if clicking empty space vs cable behaves differently

### Code Review Focus Areas:
1. **Index.tsx:554** - `onPointerMove` handler on main container
2. **Index.tsx:557** - Parent SVG with `pointer-events-none`
3. **Cable.tsx:59-91** - Full cable rendering with event handlers
4. **InstrumentNode.tsx** & **EffectNode.tsx** - Port click handlers that might interfere

## Expected Behavior
1. User clicks on any cable (16px hit area around visible 3px line)
2. Console logs: `[Cable Click] onClick fired - deleting cable`
3. Deletion function called (e.g., `disconnectEffectFromInstrument`)
4. Cable disappears from UI
5. Toast notification: "🔌 Effect disconnected"

## Current Behavior
1. User clicks cable
2. Nothing happens (no console log, no deletion, no toast)
3. Cable remains visible
4. No error messages in console

## Request for ChatGPT
Please analyze the architecture and suggest:
1. **Root cause** of why onClick is not firing
2. **Specific code changes** needed to fix the issue
3. **Testing approach** to verify the fix works
4. **Alternative solutions** if primary approach doesn't work

Focus on SVG event handling, React synthetic events, and pointer-events CSS interaction patterns.
