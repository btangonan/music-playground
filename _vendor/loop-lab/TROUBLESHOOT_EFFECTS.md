# ChatGPT Troubleshooting Prompt: New Audio Effects Not Working

## Problem
User reports that new audio effects (shimmer, convolver, reverse_reverb, width, ambient) are not producing audible changes when applied to instruments. The effects appear to load without errors, but the audio output sounds unchanged.

## Context
- **Framework**: Tone.js v15.1.22 for Web Audio API
- **App**: React-based loop station with instrument → effect chains → audio output
- **Working Effects**: Basic effects (delay, reverb, chorus, etc.) work correctly
- **Non-Working Effects**: shimmer, convolver, reverse_reverb, width, ambient (added in recent PRs)

## Key Implementation Files

### Core Audio Engine
- `src/lib/audio-engine.ts` - Main effect factory with `makeEffect()` and `connectChain()`
  - Lines 226-269: shimmer implementation (PitchShift + Reverb + feedback)
  - Lines 270-285: reverse_reverb implementation (imported from reverse-reverb.ts)
  - Lines 308-350: convolver implementation (IR-based reverb with predelay)
  - Lines 395-406: width implementation (imported from width.ts)
  - Lines 411-425: ambient implementation (imported from ambient-layer.ts)
  - Lines 432: Skip connection list for custom routing effects

### Effect Implementation Files
- `src/lib/reverse-reverb.ts` - Reverse reverb with buffer recording/reversal
- `src/lib/width.ts` - Mid/side stereo width processor
- `src/lib/ambient-layer.ts` - Continuous pink noise texture layer
- `src/lib/ir-manifest.ts` - IR metadata for convolution reverb

### UI Integration
- `src/pages/Index.tsx` - Main app with preset application logic (lines 274-320)
- `src/lib/presets.ts` - Artist preset definitions using new effects
- `src/components/PresetPicker.tsx` - UI for applying presets

## Suspected Issues

### 1. Custom Routing Not Connected Properly
**Lines 432 in audio-engine.ts:**
```typescript
if (type !== 'harmonizer' && type !== 'shimmer' && type !== 'convolver' && type !== 'reverse_reverb' && type !== 'width' && type !== 'ambient') {
  input.connect(node);
  node.connect(output);
}
```
- Effects with custom routing skip default connection
- Possible issue: input/output not properly exposed or connected

### 2. Set() Method Not Delegating to Custom Effects
**Lines 447-485 in audio-engine.ts:**
- shimmer has custom wet/dry handling (lines 445-451)
- convolver has custom wet/dry handling (lines 454-458)
- reverse_reverb delegates to effect.setWet() (lines 461-464)
- width maps 0-1 input to 0-2 range (lines 474-478)
- ambient delegates to layer.setWet() (lines 481-485)

**Question**: Are these set() handlers being called when user rotates effect nodes?

### 3. Async Effect Initialization Not Awaited
- shimmer: `await shimmerReverb.ready` (line 230)
- convolver: `await convolver.ready` (line 321)
- reverse_reverb: `await reverseReverbEffect.initialize()` (line 275)
- width/ambient: No async initialization

**Question**: Is `makeEffect()` properly awaited in preset application?

### 4. Effect Parameters Not Applied from Presets
**Example from presets.ts (lines 322-327):**
```typescript
{
  type: 'shimmer',
  params: {
    wet: 0.5,
    decay: 6,
    pitchShift: 12
  }
}
```

**In buildEffectChain() (lines 43-57 in presets.ts):**
```typescript
for (const { type, params } of preset) {
  const config = await makeEffect(type);
  if (params) {
    applyParams(config.node, params);
  }
  chain.push(config);
}
```

**Question**: Is `applyParams()` correctly handling custom effect structures?

### 5. Reverse Reverb Needs Manual Trigger
**From reverse-reverb.ts documentation:**
- Effect records audio, then user must call `triggerReverse()` to hear the effect
- No automatic triggering mechanism exists in UI

**Question**: Is there any UI to trigger reverse reverb, or is it expected to be automatic?

## Debugging Steps to Perform

### Step 1: Verify Effects are Created
Open browser console and run:
```javascript
window.LL_DEBUG_IR = 1;
window.LL_DEBUG_REVERSE_REVERB = 1;
window.LL_DEBUG_WIDTH = 1;
window.LL_DEBUG_AMBIENT = 1;
```

Apply a preset (e.g., BlakeShimmer_M7) and check for:
- IR loading messages
- Effect initialization messages
- Any errors during creation

### Step 2: Check Audio Routing
In browser console:
```javascript
// After applying preset, inspect the effect chain
const activeInst = /* get active instrument */;
console.log('Effect chain:', activeInst.effects);
console.log('Effect configs:', activeInst.effects.map(e => e.config));
```

Verify:
- Effects have `input` and `output` properties
- `input` and `output` are Tone.Gain or equivalent nodes
- Effects are in the correct order

### Step 3: Test Individual Effects
Manually add each new effect type one at a time:
1. Click "Effect" button → select "Shimmer"
2. Drag from instrument to shimmer
3. Play notes (A-L keys)
4. Rotate shimmer node to adjust intensity
5. **Expected**: Octave-up sparkle/bloom should be audible

Repeat for: Convolver (IR), Reverse Reverb, Stereo Width, Ambient Texture

### Step 4: Check Parameter Application
In preset application code (`Index.tsx` lines 284-294):
```typescript
const effectChain = await buildEffectChain(Presets[presetName]);
```

Add debug logging:
```typescript
console.log('[Preset] Effect chain created:', effectChain);
console.log('[Preset] Effect types:', effectChain.map(e => e.type));
```

Verify parameters are being applied by `applyParams()` in presets.ts

## Questions to Answer

1. **Are custom routing effects properly exposing input/output nodes?**
   - Check lines 260-267 (shimmer), 277-282 (reverse_reverb), 342-349 (convolver), 404 (width), 423 (ambient)

2. **Is connectChain() handling custom effect structures?**
   - Check `connectChain()` implementation in audio-engine.ts
   - Does it expect all effects to have `.input` and `.output`?

3. **Are effect parameters being applied correctly?**
   - Does `applyParams()` work with custom effect structures like `{ type: 'shimmer', pitchShift: ..., wetGain: ... }`?

4. **Is the audio context started before effects are created?**
   - Check if `AudioEngine.Engine.start()` is called before preset application

5. **Are there any CORS issues loading IR files?**
   - Check browser network tab for failed IR file loads
   - Verify IRs are being loaded from https://tonejs.github.io/audio/ir/

## Expected Behavior

When BlakeShimmer_M7 preset is applied to keys instrument:
1. 4 effects should appear: EQ3 → Shimmer → Convolver → Compressor
2. Effects should be automatically connected in chain
3. Playing notes should produce:
   - Original note (dry signal)
   - Octave-up shimmer (wet signal from PitchShift + Reverb)
   - Spatial depth from M7 Hall IR convolver
   - Compressed, polished output

**User reports**: No audible difference from dry signal

## Files to Review (Priority Order)

1. **src/lib/audio-engine.ts** (lines 226-269, 270-285, 308-350, 395-425, 432, 445-485)
2. **src/lib/presets.ts** (lines 43-57 for buildEffectChain, lines 16-38 for applyParams)
3. **src/pages/Index.tsx** (lines 274-320 for applyPreset)
4. **src/lib/reverse-reverb.ts** (check initialize() and routing)
5. **src/lib/width.ts** (check mid/side matrix routing)
6. **src/lib/ambient-layer.ts** (check auto-start and noise generation)

## Output Format
Please provide:
1. Root cause analysis: Why are the new effects not producing audio?
2. Specific code locations where the bug exists (file:line)
3. Recommended fixes with code examples
4. Any additional debugging steps if root cause is unclear
