# Parallel Routing Limitation

## Current Status: NOT SUPPORTED

The current architecture does not support parallel effect routing. This document explains the limitation and future implementation options.

## User Request
User wants to route audio like this:
```
keys → effect1 → pad1
  AND
keys → effect1 → effect2 → pad2
```

This would allow branching from the middle of an effect chain to different destinations.

## Root Cause: Linear Chain Architecture

### Current Data Model
```typescript
Instrument {
  id: string;
  effects: Effect[];  // Linear array, exclusive to ONE instrument
  config: { out: Tone.Gain; synth: Synth }
}
```

### Current Behavior
- Effects are owned exclusively by one instrument (`instrument.effects` array)
- `connectChain()` creates a single serial path: `instrument → effect1 → effect2 → master`
- Pads connect to instrument's entire effect chain, not individual effects
- No mechanism for effect sharing or parallel outputs

### Architectural Limitations
1. **Effect Ownership** (Index.tsx:242): Effects copied into instrument's array, become exclusive property
2. **Linear Chain Enforcement** (audio-engine.ts:235-245): `connectChain` rebuilds entire chain as single path
3. **Pad Connection Model** (Index.tsx:143-149): Pads store only `instrumentId`, always play through full chain
4. **Single Destination** (audio-engine.ts:243): `prev.connect(Bus.master)` - only one output

## Future Implementation Options

### Option A: Graph-Based Routing (Recommended)
**Flexibility**: Maximum
**Complexity**: High (~500-800 LOC)
**Maintainability**: Best long-term

```typescript
// New data model
type Connection = {
  sourceId: string;      // instrument or effect ID
  sourcePort: 'out';
  targetId: string;      // effect, pad, or master ID
  targetPort: 'in';
};

type MPCPadConnection = {
  sourceId: string;      // can be instrument OR effect ID
  sourceType: 'instrument' | 'effect';
};
```

**Changes Required:**
- Remove `instrument.effects` array
- Add global `connections: Connection[]` array
- Add `sourceId` + `sourceType` to pad connection
- Rewrite `connectChain` to support multiple outputs per node
- Add connection validation to prevent cycles
- Update cable rendering for graph visualization

**Audio Routing:**
```typescript
// Tone.js nodes can connect to multiple destinations
effect1.output.connect(pad1.input);
effect1.output.connect(effect2.input);
effect2.output.connect(pad2.input);
```

### Option B: Clone Effect Chains (Simpler)
**Flexibility**: Medium
**Complexity**: Low (~200-300 LOC)
**Maintainability**: Moderate (duplicates audio processing)

```typescript
type MPCPadConnection = {
  instrumentId: string;
  effectIds: string[];  // IDs of effects to apply
};

// Each pad gets its own effect chain copy
// Pro: Simple to implement
// Con: Duplicates CPU/memory for each pad
```

### Option C: Effect Buses (Industry Standard)
**Flexibility**: Medium-High
**Complexity**: Medium (~300-400 LOC)
**Maintainability**: Good (matches DAW patterns)

```typescript
type EffectBus = {
  id: string;
  effectChain: EffectConfig[];
  input: Tone.Gain;
  output: Tone.Gain;
};

type MPCPadConnection = {
  instrumentId: string;
  busId?: string;  // optional effect bus
};

// Instruments send to buses, pads receive from buses
// Pro: Industry-standard pattern, efficient
// Con: Additional abstraction layer
```

## Recommendation

**For MVP**: Document limitation, defer implementation
**For v2.0**: Implement Option C (Effect Buses) as stepping stone
**For v3.0**: Consider Option A (Graph-Based) if user feedback demands full flexibility

## Files Requiring Changes

**Core Architecture:**
1. `/Users/bradleytangonan/Desktop/my apps/loop-lab/src/pages/Index.tsx` (lines 15-35, 236-264, 288-334)
2. `/Users/bradleytangonan/Desktop/my apps/loop-lab/src/lib/audio-engine.ts` (lines 235-245, 99-118)
3. `/Users/bradleytangonan/Desktop/my apps/loop-lab/src/lib/pad-manager.ts` (lines 3-5, 43-55)

**UI Components:**
4. Cable rendering logic (Index.tsx:364-456)
5. Pad connection handler (Index.tsx:116-155)

## Decision Log

**2025-10-12**: Identified limitation during cleanup phase
**Priority**: Low (no critical user workflow blocked)
**Estimated Effort**: 1-2 weeks for Option C, 3-4 weeks for Option A
