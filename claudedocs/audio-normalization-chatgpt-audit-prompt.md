# ChatGPT Audio Normalization & Compression Plan Audit

**COPY-PASTE PROMPT FOR CHATGPT:**

---

I need you to audit this audio normalization and compression implementation plan for a web-based music application using Tone.js. Please review from multiple expert perspectives: audio engineering, software implementation, and performance optimization.

## REPOSITORY CONTEXT

**Repository:** https://github.com/btangonan/music-playground
**Branch:** main

**Files to Review:**
- `apps/composer/src/audio/AudioEngine.ts` - Main audio engine (current: 237 lines)
- `apps/composer/src/audio/iconSounds.ts` - Sound library with volume levels (current: 415 lines)
- `apps/composer/src/audio/index.ts` - Audio module exports
- `packages/engine/` - Headless audio engine package (if needed for context)

**Key File Locations:**
```
music-playground/
├── apps/
│   └── composer/          # Frontend music app
│       └── src/
│           └── audio/
│               ├── AudioEngine.ts    ← MODIFY THIS
│               └── iconSounds.ts     ← MODIFY THIS
└── packages/
    └── engine/            # Headless engine (reference only)
```

## CURRENT SYSTEM

**Tech Stack:**
- Tone.js v14 (Web Audio API wrapper)
- 16 synthesized instruments (synths, drums, bass, FX)
- Each instrument connects directly to audio destination
- Volume levels manually set per instrument (-12 dB to 0 dB range)

**Current Volume Distribution:**
```
Kick drum: 0 dB (loudest)
Snare, Clap, Bass-Sub, Bass-Wobble: -3 dB
Hi-hat, Glitch: -6 dB
Lead, Pluck, Arp, Impact, Sweep, Noise: -9 dB
Piano, Riser, Vocal Chop: -12 dB (quietest)
```

**Problems:**
1. No normalization - volumes are arbitrary manual adjustments
2. No master bus - instruments bypass dynamics control
3. No compression - dynamic range uncontrolled
4. Clipping risk when 3+ loud sounds play simultaneously
5. Inconsistent perceived loudness across sounds

## PROPOSED SOLUTION

### Phase 1: Volume Normalization (Baseline)

**Objective:** Establish consistent perceived loudness

**Approach:** RMS normalization with peak limiting
- RMS target: -18 dB (consistent energy)
- Peak ceiling: -6 dB (headroom for dynamics)

**Proposed Volume Adjustments:**
```typescript
// Drums - preserve natural dynamics hierarchy
'drum-kick': -6 dB (reduce from 0)
'drum-snare': -9 dB (reduce from -3)
'drum-hihat': -12 dB (reduce from -6)
'drum-clap': -9 dB (reduce from -3)

// Synths - consistent melodic level
'synth-lead': -12 dB (reduce from -9)
'synth-pad': -15 dB (reduce from -12) // piano samples
'synth-pluck': -12 dB (reduce from -9)
'synth-arp': -12 dB (reduce from -9)

// Bass - strong but controlled
'bass-sub': -9 dB (reduce from -3)
'bass-wobble': -9 dB (reduce from -3)

// FX - audible but not dominant
'fx-riser': -15 dB (reduce from -12)
'fx-impact': -12 dB (reduce from -9)
'fx-sweep': -12 dB (reduce from -9)
'fx-glitch': -15 dB (reduce from -6)
'fx-vocal-chop': -15 dB (reduce from -12)
'fx-noise': -15 dB (reduce from -9)
```

### Phase 2: Master Bus with Dynamics Processing

**New Signal Flow (CORRECTED):**
```
All Instruments → HPF (32 Hz) → Compressor → Limiter → Master Channel → Destination
```

**Note:** Original plan incorrectly showed Limiter → Compressor. Corrected per audio engineering review - limiter MUST be last in chain for final peak protection.

**Components:**

1. **Master Channel (Tone.Channel)**
   - Volume: -6 dB (headroom)
   - Purpose: Single control point for all audio

2. **High-Pass Filter (Tone.Filter)** - ADDED
   - Type: highpass
   - Frequency: 32 Hz
   - Q: 0.5
   - Purpose: Stabilize compressor detector against sub-bass energy

3. **Compressor (Tone.Compressor)** - UPDATED SETTINGS
   - Threshold: -20 dB (updated from -24)
   - Ratio: 3:1 (updated from 4:1)
   - Attack: 0.008s / 8ms (updated from 0.003s)
   - Release: 0.16s / 160ms (updated from 0.25s)
   - Knee: 20 (updated from 30)
   - Purpose: Glue mix, control dynamics, preserve transients

4. **Limiter (Tone.Limiter)** - UPDATED CEILING
   - Threshold: -1.5 dB (updated from -1 dB)
   - Purpose: Brick-wall protection, prevent intersample peaks on consumer DACs

**Implementation Changes:**

```typescript
// AudioEngine.ts modifications:

// Add class properties
private masterChannel: Tone.Channel
private compressor: Tone.Compressor
private limiter: Tone.Limiter

// Update start() method
async start(): Promise<void> {
  await Tone.start()

  // Create master bus chain
  this.masterChannel = new Tone.Channel(-6).toDestination()
  this.compressor = new Tone.Compressor({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30
  }).connect(this.masterChannel)
  this.limiter = new Tone.Limiter(-1).connect(this.compressor)

  // Create instruments and connect to limiter (instead of toDestination)
  for (const sound of Object.values(ICON_SOUNDS)) {
    const instrument = this.createInstrument(sound)
    instrument.connect(this.limiter) // NEW ROUTING
    this.instruments.set(sound.id, instrument)
  }

  await Tone.loaded()
  Tone.Transport.start()
  this.initialized = true
}

// Update createInstrument() - remove .toDestination()
private createInstrument(sound: IconSound): Instrument {
  // ... existing instrument creation logic ...

  // REMOVE THIS LINE:
  // instrument.toDestination()

  return instrument  // Will be connected in start()
}

// Update dispose() - cleanup new nodes
dispose(): void {
  Tone.Transport.clear(0)
  for (const instrument of this.instruments.values()) {
    instrument.dispose()
  }
  this.instruments.clear()

  // NEW CLEANUP:
  this.limiter?.dispose()
  this.compressor?.dispose()
  this.masterChannel?.dispose()

  this.initialized = false
}
```

## TESTING STRATEGY

**Test Scenarios:**
1. Single sound at various velocities (verify consistent loudness)
2. Dense mix: 6+ sounds simultaneously (verify no clipping)
3. Velocity range: 0.2 to 1.0 (verify dynamics preserved)
4. Transient test: rapid drum hits (verify no pumping artifacts)

**Validation Metrics:**
- Peak level never exceeds -1 dBFS
- RMS level averages -14 to -18 dB
- Dynamic range: 6-12 dB (not over-compressed)
- THD <0.1% (no digital clipping)

**User Acceptance:**
- 5+ sounds play without clipping/distortion
- Sounds balanced and audible in mix
- No pumping or obvious compression artifacts
- Consistent volume across sound types

## POTENTIAL CONCERNS

1. **Over-compression artifacts:** Pumping/breathing if settings too aggressive
2. **Bass + Limiter interaction:** Heavy bass may trigger limiter too much
3. **Velocity curve flattening:** Compression may reduce dynamic expression
4. **CPU performance:** Additional processing nodes increase load
5. **Browser compatibility:** Different audio handling across platforms
6. **Piano sample loading:** CDN samples may delay initialization

## YOUR AUDIT TASKS

Please analyze this plan from the following perspectives:

### 1. Audio Engineering Correctness
- Are the compressor settings appropriate for electronic music?
- Is the signal flow (Limiter → Compressor → Channel) optimal?
- Are the target levels (-18 dB RMS, -1 dB peak) industry-standard?
- Will this prevent clipping while maintaining musicality?
- Any missing audio processing steps (EQ, saturation, etc.)?

### 2. Implementation Feasibility
- Are the Tone.js APIs being used correctly?
- Is the routing change (connect to limiter vs toDestination) valid?
- Any race conditions or initialization order issues?
- Is the dispose() cleanup sufficient?
- Any edge cases not handled?

### 3. Volume Adjustment Accuracy
- Do the proposed volume levels make sense relative to each other?
- Should drums maintain more dynamic spread?
- Is -15 dB appropriate for piano samples vs synthesized sounds?
- Any sounds that might still clip or be too quiet?

### 4. Performance Optimization
- Will this increase CPU usage significantly?
- Are there more efficient alternatives?
- Should compression be optional/configurable?
- Any mobile performance concerns?

### 5. Testing Completeness
- Are the test scenarios sufficient?
- What edge cases are missing?
- How to measure success objectively?
- What monitoring/debugging tools should be added?

### 6. Risk Assessment
- What's the worst-case failure mode?
- How to rollback if this doesn't work?
- What user-facing issues might arise?
- Any accessibility concerns (hearing-impaired users)?

### 7. Alternative Approaches
- Should we consider per-category buses (drums, synths, etc.)?
- Is sidechain compression needed (kick ducking bass)?
- Would adaptive gain reduction be simpler?
- Any modern Web Audio API features we're missing?

## DELIVERABLES

Please provide:

1. **Overall Assessment:** Is this plan sound (pun intended)?
2. **Critical Issues:** Must-fix problems before implementation
3. **Recommended Changes:** Improvements to settings, flow, or approach
4. **Implementation Order:** Should phases be combined/split differently?
5. **Additional Tests:** Missing test scenarios or validation steps
6. **Documentation Needs:** What else should be documented?
7. **Tuning Guidance:** How to adjust if initial settings don't work?

---

**END OF AUDIT PROMPT**

Thank you for your detailed audio engineering and implementation review!
