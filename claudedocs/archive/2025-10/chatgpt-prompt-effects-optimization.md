# ChatGPT/Claude Prompt: Optimize and Improve Loop-Lab Effects and Presets

## Executive Summary

**Project**: Loop-Lab - A browser-based music production app with left-to-right signal flow
**Goal**: Optimize and improve audio effects and presets to achieve professional, high-end sound quality
**Branch**: `main` (recently merged from feat/functional-pass-1)
**Tech Stack**: TypeScript, React, Tone.js (Web Audio API wrapper)

## Project Context

Loop-Lab is a music production application featuring:
- 4 instrument types (keys, bass, drums, pad_gate)
- 22 audio effects (including shimmer, convolution reverb, reverse reverb, stereo width)
- 10+ artist-inspired presets (James Blake, Fred again.., Jamie xx, Radiohead)
- Left-to-right workflow with visual cable routing
- Real-time audio processing with Tone.Transport sequencing

## Current Branch and Recent Changes

**Branch**: `main`
**Last Merge**: feat/functional-pass-1 (89 files, 5922 insertions, 540 deletions)
**Recent Work**:
- Implemented LTR (left-to-right) layout with vertical columns
- Added horizontal Bézier cable routing
- Moved ports to sides for horizontal signal flow
- Fixed effect positioning and cable cleanup bugs

## Key Files and Architecture

### Core Audio Files

1. **src/lib/audio-engine.ts** (610 lines)
   - `makeInstrument()` - Factory for 4 instrument types
   - `makeEffect()` - Factory for 22 effect types
   - `connectChain()` - Signal routing and chain management
   - `Bus` object - Master bus with kick/ambient taps for sidechain

2. **src/lib/presets.ts** (495 lines)
   - `buildEffectChain()` - Preset effect chain builder
   - `Presets` object - 10+ artist-inspired preset configurations
   - Effect parameter specifications for each preset

3. **src/lib/artist-presets.ts** (148 lines)
   - High-level preset application functions
   - `applyBlakeSound()`, `applyFredPump()`, `applyJamieMallet()`, etc.
   - Direct Tone.js node manipulation for artist sounds

4. **src/lib/synth-advanced.ts** (63 lines)
   - `makeInstrumentV2()` - Advanced instrument factory
   - Currently only implements `pad_gate` with filter envelope
   - Uses MonoSynth with filterEnvelope for per-voice filtering

5. **src/lib/reverse-reverb.ts** (225 lines)
   - Buffer recording and sample-by-sample reversal
   - Configurable predelay (0-100ms)
   - Radiohead-style swelling effects

6. **src/lib/ambient-layer.ts** (178 lines)
   - Pink noise generator with low-pass filtering
   - Volume control (-60 to 0 dB)
   - Wet/dry balance for atmospheric textures

7. **src/lib/width.ts** (152 lines)
   - Mid/Side stereo width control
   - True stereo field manipulation (0=mono, 1=stereo, 2=enhanced)
   - Uses M/S matrix encoding/decoding

8. **src/lib/effect-param-mapper.ts**
   - Parameter mapping logic for effect nodes
   - Handles special cases (shimmer, convolver, reverse_reverb, width, ambient)

9. **src/lib/ir-manifest.ts**
   - Impulse response manifest for convolution reverb
   - M7 Hall and EMT-140 Plate IR metadata

10. **src/lib/ducking.ts**
    - Sidechain ducking infrastructure (not yet integrated)
    - `makeDucker()` uses Tone.Follower for kick-driven pumping

11. **src/lib/macros.ts**
    - Effect macro system (if implemented)

## Current Effects Inventory (22 Effects)

### Basic Effects (7)
1. **space** - Reverb (decay 3s, wet 0.35)
2. **echo** - FeedbackDelay (8n, feedback 0.35, wet 0.4)
3. **fuzz** - Distortion (0.6 distortion, wet 0.5)
4. **crush** - BitCrusher (4 bits)
5. **ring** - Distortion (0.5 distortion)
6. **filter** - Lowpass filter (1200Hz, Q:1)
7. **vibrato** - Vibrato (4Hz, depth 0.4)

### Artist Pack Effects (9)
8. **chorus** - Chorus (1.5Hz, delayTime 3.5, depth 0.7, wet 0.5) [needs .start()]
9. **tremolo** - Tremolo (4Hz, depth 0.5, wet 0.5) [needs .start()]
10. **shimmer** - Dual-path pitch-shifted reverb (+12 semitones, HPF 240Hz, predelay 25ms)
11. **phaser** - Phaser (0.5Hz, 3 octaves, baseFreq 350Hz, wet 0.5)
12. **pingpong** - PingPongDelay (8n, feedback 0.4, wet 0.5)
13. **autofilter** - AutoFilter (4n, baseFreq 200Hz, octaves 2.5, wet 0.5) [needs .start()]
14. **autopanner** - AutoPanner (8n, depth 1, wet 0.5) [needs .start()]
15. **compressor** - Compressor (threshold -20dB, ratio 4:1, attack 30ms, release 250ms)
16. **eq3** - 3-band EQ (low/mid/high, frequencies 400Hz/2500Hz)

### Advanced Effects (6)
17. **convolver** - Convolution reverb with IR manifest (M7 Hall, EMT-140 Plate, predelay)
18. **harmonizer** - Parallel pitch shifting (+7 semitones, -5 semitones) [Tone v14 only]
19. **width** - Mid/Side stereo width (0-2 range)
20. **ambient** - Pink noise texture layer (volume, filter, wet/dry)
21. **reverse_reverb** - Buffer reversal + reverb (predelay, recordLength, reverbDecay)
22. **[future]** - Sidechain ducking (infrastructure exists, not yet exposed)

## Current Presets Inventory (10+ Presets)

### Original Presets (6)
1. **AtmosPad** - Shimmer + chorus + space + compressor
2. **DreamyKeys** - Vibrato + echo + tremolo + space
3. **BlakeShimmer** - EQ + shimmer + compressor (James Blake style)
4. **FredPumpPad** - Autopanner + heavy compression + echo + space (Fred again.. style)
5. **JamieMallet** - Bright EQ + phaser + pingpong + width (1.4) + compressor (Jamie xx style)
6. **RadioheadTape** - Crush + autofilter + fuzz + width (0.5) + echo + space (lo-fi)

### Stage 1A Presets (Convolver Integration)
7. **BlakeShimmer_M7** - EQ + shimmer + convolver (M7 Hall IR) + compressor
8. **RadioheadPlate** - EQ + convolver (EMT-140 Plate IR) + compressor

### Stage 1B Presets (Dual-Path Shimmer)
9. **BlakeShimmer_Clear** - EQ + dual-path shimmer (pitched-dry + reverb'd-pitched) + compressor

### Stage 2A Presets (Reverse Reverb)
10. **Radiohead_ReversePlate** - EQ + reverse_reverb + compressor

### Stage 3 Presets (Ambient Texture)
11. **Radiohead_AmbPlate** - EQ + ambient layer + space + compressor

## What Makes Sounds "High-End"?

### Production Quality Benchmarks
- **Clarity** - Clean transients, no muddiness, well-defined frequency separation
- **Depth** - Spacious reverb tails, layered textures, dimensional soundstage
- **Warmth** - Analog-style saturation, gentle harmonic distortion, smooth filtering
- **Dynamics** - Controlled peaks, consistent loudness, professional compression
- **Stereo Image** - Wide but focused stereo field, mono compatibility, phase coherence
- **Artifact-Free** - No clicks, pops, aliasing, or digital harshness

### Artist Sound References
- **James Blake** - Crystalline shimmer reverb, spacious pads, subtle saturation
- **Fred again..** - Pumping sidechain compression, tight delays, dynamic movement
- **Jamie xx** - Percussive clarity, enhanced stereo width, bright high-end
- **Radiohead** - Lo-fi tape saturation, swelling reverse reverbs, textured ambience

## Optimization Goals

### 1. Signal Chain Optimization
**Current Issues**:
- No gain staging between effects (line 577-586 in audio-engine.ts)
- Effects connected without headroom management
- No clipping prevention on master bus

**Improvements Needed**:
- Add makeup gain after compression (-3dB typical)
- Insert trim gains between effects for optimal levels
- Implement soft clipping on master bus (Tone.Limiter)

### 2. Effect Parameter Refinement
**Current Issues**:
- Generic parameter ranges (e.g., frequency: 100 + v * 4000)
- Linear mappings don't match perceptual curves
- No anti-aliasing on pitch shifting

**Improvements Needed**:
- Use exponential scaling for frequency parameters (20-20000Hz)
- Implement logarithmic curves for volume/gain controls
- Add oversampling to shimmer/harmonizer for cleaner pitch shifting

### 3. Preset Design Enhancement
**Current Issues**:
- Simple linear effect chains (no parallel routing)
- No frequency-dependent processing (multiband)
- Limited dynamic control (static parameters)

**Improvements Needed**:
- Implement parallel compression (NY compression)
- Add multiband processing for surgical EQ
- Use envelope followers for dynamic effects

### 4. CPU Performance Optimization
**Current Issues**:
- Multiple reverb instances (expensive)
- No effect reuse across instruments
- Unbounded node creation

**Improvements Needed**:
- Implement effect bus system (send/receive pattern from Context7)
- Share expensive effects (reverb, convolver) via sends
- Dispose unused effects properly

### 5. Artifact Reduction
**Current Issues**:
- Potential clicks on parameter changes
- No fade-in/fade-out on buffer switching
- Aliasing on pitch shifting

**Improvements Needed**:
- Use `rampTo()` consistently (already using 0.05s ramps)
- Add anti-aliasing filters before pitch shifting
- Implement crossfades for buffer switching (reverse_reverb.ts already does this)

## Specific Improvement Areas

### File: src/lib/audio-engine.ts

#### Lines 202-574: makeEffect() Function
**Current**: 22 effect cases with varying quality levels
**Improvements**:
1. Add gain staging between effects
2. Implement effect bus system (send/receive pattern)
3. Add soft clipping/limiting on master bus
4. Use exponential scaling for frequency parameters
5. Add oversampling to pitch shifters

**Example Code** (from Context7 Tone.js docs):
```typescript
// Effect bus pattern (lines 32-40 could be expanded)
export const Bus = {
  master: new Tone.Gain(1).toDestination(),
  recordTap: new Tone.Gain(1),
  kick: new Tone.Gain(1),
  ambient: new Tone.Gain(1),
  // ADD: Effect buses for shared effects
  reverbSend: new Tone.Channel({ volume: -60 }),
  delaySend: new Tone.Channel({ volume: -60 }),
  chorusSend: new Tone.Channel({ volume: -60 })
};

// In makeEffect(), create bus-connected effects
case 'space': {
  const reverb = new Tone.Reverb({ decay: 3, wet: 1 }).toDestination();
  await reverb.ready;
  Bus.reverbSend.connect(reverb);
  // Return send control instead of direct effect
  node = { type: 'bus_send', channel: Bus.reverbSend };
  break;
}
```

#### Lines 483-572: set() Method Parameter Mapping
**Current**: Linear mappings for most parameters
**Improvements**:
1. Use exponential scaling for frequency (see line 532-533)
2. Use logarithmic scaling for gain/volume
3. Add parameter smoothing with longer ramps for musical changes

**Example**:
```typescript
// CURRENT (line 532-533):
if ('frequency' in node && node.frequency && typeof node.frequency === 'object' && 'value' in node.frequency) {
  node.frequency.value = 100 + v * 4000; // Linear: 100-4100Hz
}

// IMPROVED (exponential scaling for perceptual linearity):
if ('frequency' in node && node.frequency && typeof node.frequency === 'object' && 'value' in node.frequency) {
  const minFreq = 20;
  const maxFreq = 20000;
  const exponentialValue = minFreq * Math.pow(maxFreq / minFreq, v);
  node.frequency.rampTo(exponentialValue, 0.05);
}
```

#### Lines 243-309: Shimmer Effect
**Current**: Dual-path shimmer with HPF and predelay (excellent foundation)
**Improvements**:
1. Add oversampling for cleaner pitch shifting
2. Implement formant preservation
3. Add chorus/detune to thicken shimmer tail

**Technical Details**:
- Current pitch shift uses Tone.PitchShift (line 249-254)
- Already has HPF at 240Hz (good) and predelay 25ms (good)
- Feedback limited to 0.25 to prevent runaway (line 293, good)

**Suggested Enhancements**:
```typescript
// Add subtle detuning for thickness
const detune = new Tone.Chorus({ frequency: 0.2, depth: 0.15, wet: 0.3 });
pitchShift.connect(detune);
detune.connect(hpf);

// Add formant preservation (pitch shift without "chipmunk" effect)
const formantShift = new (Tone as any).PitchShift({
  pitch: 12,
  windowSize: 0.03, // Smaller for better transient response
  feedback: 0
});
```

### File: src/lib/presets.ts

#### Lines 69-107: AtmosPad Preset
**Current**: Shimmer + chorus + space + compressor
**Improvements**:
1. Add subtle saturation before compressor (warmth)
2. Use multiband compression for clarity
3. Add stereo width control (width: 1.2-1.4)

#### Lines 148-176: BlakeShimmer Preset
**Current**: EQ + shimmer + compressor
**Improvements**:
1. Add parallel compression (NY compression technique)
2. Insert tape saturation for analog warmth
3. Add gentle limiting for loudness

**Example Enhancement**:
```typescript
BlakeShimmer_Enhanced: [
  {
    type: 'eq3',
    params: { low: -3, mid: 2, high: 0 }
  },
  // NEW: Subtle tape saturation for warmth
  {
    type: 'fuzz',
    params: { distortion: 0.15, wet: 0.2 }
  },
  {
    type: 'shimmer',
    params: { wet: 0.5, decay: 6, pitchShift: 12 }
  },
  // NEW: Parallel compression (requires implementation)
  {
    type: 'parallel_compressor',
    params: { threshold: -20, ratio: 4, parallel: 0.5 }
  },
  {
    type: 'compressor',
    params: { threshold: -18, ratio: 3, attack: 0.03, release: 0.25 }
  }
]
```

### File: src/lib/synth-advanced.ts

#### Lines 9-58: pad_gate Instrument
**Current**: MonoSynth wrapped in PolySynth, vibrato, chorus, airLP
**Improvements**:
1. Add subtle detuning for thickness (supersaw-style)
2. Implement unison voices with spread
3. Add envelope-controlled filter resonance

**Example**:
```typescript
// Add detuned unison voices
const voices = new Tone.PolySynth(Tone.MonoSynth, {
  oscillator: {
    type: 'triangle',
    count: 3, // Unison voices
    spread: 20 // Cents detuning
  },
  filter: {
    type: 'lowpass',
    Q: 0.5,
    rolloff: -24
  },
  filterEnvelope: {
    attack: 0.12,
    decay: 0.5,
    sustain: 0.8,
    release: 1.8,
    baseFrequency: 250,
    octaves: 3
  },
  envelope: { attack: 0.12, decay: 0.25, sustain: 0.9, release: 2.2 }
});
```

## Context7 Integration Strategy

### Tone.js Documentation Integration
**Context7 Library**: `/tonejs/tone.js` (183 code snippets, Trust Score 8.1)

**Key Documentation Topics**:
1. **Effect Buses** - Implement send/receive pattern for shared effects
2. **Signal Ramping** - Use exponentialRampToValueAtTime for natural parameter changes
3. **Chain Method** - Simplify effect routing with `source.chain(fx1, fx2, Tone.Destination)`
4. **Parallel Routing** - Connect sources to multiple effects simultaneously
5. **Offline Rendering** - Pre-render expensive effect chains for CPU efficiency

**Usage Example**:
```bash
# When implementing improvements, query Context7 for specific patterns
context7 resolve "tone.js"
context7 get-library-docs "/tonejs/tone.js" --topic "effect buses send receive"
context7 get-library-docs "/tonejs/tone.js" --topic "parallel compression routing"
context7 get-library-docs "/tonejs/tone.js" --topic "signal parameter automation curves"
```

### Web Audio API Documentation
**Context7 Library**: `/webaudio/web-audio-api` (27 code snippets, Trust Score 8.7)

**Key Documentation Topics**:
1. **Gain Staging** - Proper gain management between nodes
2. **Dynamic Range** - Compression and limiting best practices
3. **Filter Design** - Advanced filtering techniques
4. **Stereo Processing** - Panning, width, and spatial effects

## Testing and Validation Approach

### Objective Metrics
1. **Frequency Response** - Use Tone.FFT to analyze frequency content
2. **Dynamic Range** - Measure peak-to-RMS ratio (target: 8-12dB)
3. **Stereo Width** - Analyze correlation meter (target: 0.7-0.9)
4. **CPU Usage** - Monitor node count and processing load
5. **Latency** - Measure round-trip latency (target: <50ms)

### Subjective Quality Tests
1. **A/B Comparison** - Compare presets before/after optimization
2. **Reference Matching** - Compare to professional tracks (Blake, Fred, Jamie, Radiohead)
3. **Mono Compatibility** - Ensure presets work in mono (no phase cancellation)
4. **Mix Context** - Test presets in full mix (not just solo)

### Debug Flags
- `window.LL_DEBUG_AMBIENT` - Ambient layer debug logging
- `window.LL_DEBUG_REVERSE_REVERB` - Reverse reverb debug logging
- `window.LL_DEBUG_WIDTH` - Stereo width debug logging
- `window.LL_DEBUG_IR` - Impulse response loading debug logging
- `window.LL_DEBUG_DUCK` - Ducking effect debug logging

## Action Items for Optimization

### Priority 1: Core Infrastructure
- [ ] Implement effect bus system (send/receive pattern)
- [ ] Add gain staging throughout audio-engine.ts
- [ ] Implement soft clipping/limiting on master bus
- [ ] Add parameter smoothing with exponential curves

### Priority 2: Effect Enhancements
- [ ] Add oversampling to shimmer and harmonizer
- [ ] Implement parallel compression
- [ ] Add multiband processing (EQ, compression)
- [ ] Create dynamic effects (envelope followers)

### Priority 3: Preset Refinement
- [ ] Enhance all 11 presets with better parameter choices
- [ ] Add 3-5 new presets targeting specific genres
- [ ] Implement preset A/B comparison system
- [ ] Add preset tagging (genre, mood, intensity)

### Priority 4: Performance Optimization
- [ ] Implement effect reuse via buses
- [ ] Add node pooling for frequent creation/disposal
- [ ] Profile CPU usage and optimize hot paths
- [ ] Implement progressive enhancement (simple → complex)

### Priority 5: Quality Assurance
- [ ] Add automated frequency response tests
- [ ] Implement dynamic range metering
- [ ] Create stereo width visualization
- [ ] Add mono compatibility checks

## Code Style and Conventions

### Existing Patterns to Follow
- Use Tone.js wrapper classes (don't access Web Audio API directly)
- Implement debug logging with window flags
- Use rampTo() for smooth parameter changes (0.05s default)
- Dispose nodes properly in cleanup functions
- Use TypeScript strict mode with explicit types

### Naming Conventions
- Effect types: lowercase with underscores (e.g., `reverse_reverb`, `ping_pong`)
- Preset names: PascalCase with underscores (e.g., `BlakeShimmer_M7`)
- Function names: camelCase (e.g., `makeEffect`, `buildEffectChain`)
- Debug flags: ALL_CAPS with prefix (e.g., `LL_DEBUG_AMBIENT`)

## Deliverables

1. **Optimized audio-engine.ts** - Enhanced effect implementations with proper gain staging
2. **Refined presets.ts** - Improved preset configurations with better parameter choices
3. **Performance Analysis** - CPU usage report with before/after comparisons
4. **Quality Metrics** - Frequency response, dynamic range, and stereo width measurements
5. **Documentation** - Updated comments explaining optimization choices
6. **Test Suite** - Automated tests for effect quality and performance

## Expected Outcomes

### Sound Quality Improvements
- **+20% clarity** - Better frequency separation and transient definition
- **+30% depth** - More spacious reverb tails and layered textures
- **+15% warmth** - Analog-style saturation and smooth filtering
- **+25% dynamics** - Professional compression and consistent loudness

### Performance Improvements
- **-30% CPU usage** - Effect bus system and node reuse
- **-50% memory allocations** - Node pooling and proper disposal
- **+40% scalability** - More instruments and effects simultaneously

### User Experience Improvements
- **Faster preset switching** - Pre-built effect chains
- **Better preset quality** - Professional-grade sound out of the box
- **More creative options** - Enhanced presets and new effect combinations

---

## Usage Instructions for ChatGPT/Claude

1. **Read this entire prompt** - Understand the project context and goals
2. **Use Context7 for reference** - Query Tone.js and Web Audio API docs as needed
3. **Start with Priority 1 tasks** - Infrastructure improvements first
4. **Test incrementally** - Validate each change before moving to next
5. **Document decisions** - Explain why specific optimizations were chosen
6. **Measure impact** - Provide before/after metrics for each improvement

## Resources

- **Tone.js Docs**: https://tonejs.github.io/docs/
- **Web Audio API Spec**: https://www.w3.org/TR/webaudio/
- **Context7 Tone.js**: `/tonejs/tone.js` (183 snippets)
- **Context7 Web Audio**: `/webaudio/web-audio-api` (27 snippets)
- **Project Branch**: `main`
- **Key Files**: audio-engine.ts (610L), presets.ts (495L), artist-presets.ts (148L)

---

**Generated for**: loop-lab effects and presets optimization
**Target Audience**: ChatGPT/Claude with Context7 access
**Created**: 2025-10-13
**Branch**: main
**Status**: Ready for optimization work
