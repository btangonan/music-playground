# Audio Normalization & Compression Implementation Plan

**Date:** 2025-10-20
**Status:** Ready for Implementation
**Estimated Time:** 3-4 hours total

---

## Executive Summary

Implement audio normalization and master bus compression/limiting to prevent clipping and ensure consistent loudness across all 16 instrument sounds in the Music Playground application.

**Key Benefits:**
- No more clipping when multiple sounds play together
- Consistent perceived loudness across all sounds
- Professional audio quality with controlled dynamics
- Better user experience with balanced mixes

---

## Current Problems

1. **No Normalization:** Volume levels are arbitrary (-12 dB to 0 dB)
2. **No Master Bus:** Instruments connect directly to output
3. **No Compression:** Uncontrolled dynamic range
4. **Clipping Risk:** 3+ loud sounds together can exceed 0 dBFS
5. **Inconsistent Loudness:** Kick feels much louder than piano

**Current Signal Flow:**
```
Instrument → Destination (no processing)
```

---

## Proposed Solution

### Phase 1: Volume Normalization

**Goal:** Establish -18 dB RMS baseline for consistent energy

**File:** `apps/composer/src/audio/iconSounds.ts`

**Changes:** Update `volume` property for all 16 sounds

```typescript
// Drums - preserve natural hierarchy
'drum-kick': { volume: -6 },     // was 0
'drum-snare': { volume: -9 },    // was -3
'drum-hihat': { volume: -12 },   // was -6
'drum-clap': { volume: -9 },     // was -3

// Synths - balanced melodic level
'synth-lead': { volume: -12 },   // was -9
'synth-pad': { volume: -15 },    // was -12
'synth-pluck': { volume: -12 },  // was -9
'synth-arp': { volume: -12 },    // was -9

// Bass - strong but controlled
'bass-sub': { volume: -9 },      // was -3
'bass-wobble': { volume: -9 },   // was -3

// FX - subtle but audible
'fx-riser': { volume: -15 },     // was -12
'fx-impact': { volume: -12 },    // was -9
'fx-sweep': { volume: -12 },     // was -9
'fx-glitch': { volume: -15 },    // was -6
'fx-vocal-chop': { volume: -15 }, // was -12
'fx-noise': { volume: -15 }      // was -9
```

**Rationale:**
- Drums maintain natural loudness relationships (kick > snare > hi-hat)
- Synths grouped around -12 dB for melodic consistency
- Bass reduced significantly to prevent low-frequency domination
- FX subdued to support role, not dominate

---

### Phase 2: Master Bus Dynamics

**Goal:** Add compression and limiting to prevent clipping

**File:** `apps/composer/src/audio/AudioEngine.ts`

**New Signal Flow:**
```
Instrument → Limiter → Compressor → Master Channel → Destination
```

#### Step 1: Add Class Properties

```typescript
export class AudioEngine {
  private instruments: Map<string, Instrument>
  private initialized: boolean

  // NEW: Master bus components
  private masterChannel: Tone.Channel
  private compressor: Tone.Compressor
  private limiter: Tone.Limiter

  constructor() {
    this.instruments = new Map()
    this.initialized = false
  }

  // ... rest of class
}
```

#### Step 2: Update start() Method

```typescript
async start(): Promise<void> {
  if (this.initialized) return

  await Tone.start()

  // NEW: Create master bus chain
  this.masterChannel = new Tone.Channel(-6).toDestination()
  this.compressor = new Tone.Compressor({
    threshold: -24,  // Engage when signals moderately loud
    ratio: 4,        // 4:1 compression (moderate)
    attack: 0.003,   // 3ms - catch transients fast
    release: 0.25,   // 250ms - smooth but not pumping
    knee: 30         // Soft knee for musicality
  }).connect(this.masterChannel)
  this.limiter = new Tone.Limiter(-1).connect(this.compressor)

  // Create instruments and route through limiter
  for (const sound of Object.values(ICON_SOUNDS)) {
    const instrument = this.createInstrument(sound)
    instrument.connect(this.limiter)  // NEW: Changed from toDestination()
    this.instruments.set(sound.id, instrument)
  }

  await Tone.loaded()
  Tone.Transport.start()
  this.initialized = true
}
```

**Settings Explained:**
- **Threshold -24 dB:** Compressor activates when mix gets moderately loud
- **Ratio 4:1:** For every 4 dB over threshold, output increases 1 dB (gentle)
- **Attack 3ms:** Fast enough to catch drum hits, slow enough to preserve transients
- **Release 250ms:** Returns to normal quickly but smoothly (no pumping)
- **Knee 30:** Gradual compression curve (musical, not abrupt)
- **Limiter -1 dB:** Absolute ceiling, never exceeds (prevents clipping)

#### Step 3: Update createInstrument()

```typescript
private createInstrument(sound: IconSound): Instrument {
  const { synthType, options } = sound.toneConfig

  let instrument: Instrument

  // ... existing instrument creation logic ...

  // Apply volume if specified
  if (typeof sound.volume === 'number') {
    instrument.volume.value = sound.volume
  }

  // REMOVE THIS LINE (no longer needed):
  // instrument.toDestination()

  return instrument  // Will be connected in start() method
}
```

#### Step 4: Update dispose() Method

```typescript
dispose(): void {
  Tone.Transport.clear(0)

  for (const instrument of this.instruments.values()) {
    instrument.dispose()
  }
  this.instruments.clear()

  // NEW: Dispose master bus components
  this.limiter?.dispose()
  this.compressor?.dispose()
  this.masterChannel?.dispose()

  this.initialized = false
}
```

---

## Implementation Roadmap

### Step 1: Preparation (15 minutes)
- [ ] Backup current `iconSounds.ts` and `AudioEngine.ts`
- [ ] Document current volume levels for reference
- [ ] Create testing checklist

### Step 2: Phase 1 Implementation (30 minutes)
- [ ] Update all 16 volume values in `iconSounds.ts`
- [ ] Test each sound individually (consistent loudness?)
- [ ] Verify build succeeds
- [ ] Commit: `feat(audio): normalize sound volumes to -18 dB RMS baseline`

### Step 3: Phase 1 Testing (30 minutes)
- [ ] Play each sound at velocity 0.5 and 1.0
- [ ] Compare perceived loudness across categories
- [ ] Check console for errors
- [ ] Test in Chrome, Firefox, Safari

### Step 4: Phase 2 Implementation (45 minutes)
- [ ] Add master bus properties to AudioEngine class
- [ ] Update start() method with new routing
- [ ] Update createInstrument() to remove toDestination()
- [ ] Update dispose() to cleanup new nodes
- [ ] Verify TypeScript compiles
- [ ] Commit: `feat(audio): add master bus with compression and limiting`

### Step 5: Phase 2 Testing (1-2 hours)
- [ ] **Single Sound Test:** Each sound at various velocities
- [ ] **Dense Mix Test:** 6+ sounds simultaneously (worst case)
- [ ] **Velocity Test:** Same sound at 0.2, 0.5, 0.8, 1.0
- [ ] **Transient Test:** Rapid drum hits (16th notes)
- [ ] **Cross-Browser:** Chrome, Firefox, Safari
- [ ] **Mobile:** iOS Safari, Android Chrome (if available)

### Step 6: Validation (30 minutes)
- [ ] Check peak level never exceeds -1 dBFS (use Web Audio API meter)
- [ ] Verify no audible clipping or distortion
- [ ] Confirm no pumping artifacts
- [ ] Listen for musical compression (subtle glue effect)
- [ ] Get user/stakeholder feedback

### Step 7: Documentation (30 minutes)
- [ ] Update ARCHITECTURE.md with signal flow diagram
- [ ] Document compressor/limiter settings and rationale
- [ ] Add troubleshooting guide
- [ ] Create tuning guide for future adjustments

---

## Testing Checklist

### Functional Tests

**Single Sound:**
- [ ] Kick drum at v=0.5 and v=1.0 (no clipping)
- [ ] Piano at v=0.5 and v=1.0 (audible, balanced)
- [ ] Hi-hat at v=0.5 and v=1.0 (not too quiet)
- [ ] Bass-Sub at v=0.5 and v=1.0 (not overwhelming)

**Dense Mix (Worst Case):**
- [ ] Play: Kick + Snare + Hi-hat + Bass-Sub + Lead + Pad simultaneously
- [ ] Verify no clipping (check browser audio meter)
- [ ] All sounds audible in mix?
- [ ] No distortion or artifacts?

**Dynamic Range:**
- [ ] Play same sound at velocities: 0.2, 0.5, 0.8, 1.0
- [ ] Louder velocities should be noticeably louder
- [ ] But not excessively (over-compressed)

**Transients:**
- [ ] Rapid kick drum hits (16th notes at 140 BPM)
- [ ] Rapid snare hits
- [ ] Verify clean transients, no pumping/breathing
- [ ] Compressor should be transparent

### Browser Compatibility

- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Safari iOS (mobile)
- [ ] Chrome Android (mobile)

### Performance

- [ ] Monitor CPU usage with 10 simultaneous sounds
- [ ] Check audio playback latency (<100ms?)
- [ ] Verify no audio dropouts or glitches
- [ ] Memory usage stable over time?

---

## Success Criteria

✅ **Primary Goals:**
1. No clipping when 5+ sounds play together
2. Consistent perceived loudness across sound types
3. All sounds audible in dense mixes
4. Professional audio quality with controlled dynamics

✅ **Technical Metrics:**
- Peak level ≤ -1 dBFS (limiter working)
- RMS level -14 to -18 dB (good loudness)
- Dynamic range 6-12 dB (not over-compressed)
- THD <0.1% (no digital clipping)

✅ **User Experience:**
- Can create complex arrangements without clipping
- Volume balance feels natural and musical
- No obvious compression artifacts
- Sounds work well together in various combinations

---

## Potential Issues & Mitigations

### Issue 1: Over-Compression Artifacts
**Problem:** Pumping or breathing sounds
**Mitigation:** Moderate settings (ratio 4:1, soft knee 30), monitor during testing
**Adjustment:** If needed, increase threshold to -20 dB or reduce ratio to 3:1

### Issue 2: Bass + Limiter Interaction
**Problem:** Heavy bass triggers limiter too aggressively
**Mitigation:** Reduced bass volumes in Phase 1 (-9 dB)
**Adjustment:** Consider adding gentle high-pass filter at 30 Hz on master

### Issue 3: Velocity Curve Flattening
**Problem:** Compression reduces dynamic expression
**Mitigation:** Moderate ratio, compressor only above -24 dB
**Adjustment:** If dynamics feel flat, increase threshold or reduce ratio

### Issue 4: CPU Performance
**Problem:** Additional nodes increase processing load
**Mitigation:** Tone.js nodes are optimized, should be minimal impact
**Adjustment:** Monitor with 10+ simultaneous sounds, profile if needed

### Issue 5: Mobile Performance
**Problem:** Lower-powered devices may struggle
**Mitigation:** Test on actual devices early
**Adjustment:** Consider making compression optional via feature flag

---

## Rollback Plan

If implementation causes issues:

1. **Phase 2 Rollback:** Revert AudioEngine.ts changes, keep Phase 1 volumes
2. **Phase 1 Rollback:** Revert iconSounds.ts to original volumes
3. **Full Rollback:** Git revert both commits

**Safety:** Both phases are non-breaking changes. Existing functionality preserved.

---

## Future Enhancements

**Not in MVP, consider later:**

1. **Per-Category Buses:** Separate compression for drums, synths, bass, FX
2. **Sidechain Compression:** Kick ducks bass (EDM/house style)
3. **Master EQ:** Gentle shelving filters for tonal balance
4. **Saturation/Warmth:** Subtle harmonic coloring
5. **Stereo Imaging:** Width control for spatial depth
6. **Metering UI:** Visual peak/RMS meters for users
7. **User Controls:** Adjustable compression amount

---

## References

- Tone.js Compressor Docs: https://tonejs.github.io/docs/Compressor
- Tone.js Limiter Docs: https://tonejs.github.io/docs/Limiter
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Audio Mastering Best Practices: https://producelikeapro.com/blog/mastering-chain/

---

## ChatGPT Audit Prompt

For expert review of this plan, use the prompt in:
`claudedocs/audio-normalization-chatgpt-audit-prompt.md`

---

**Implementation Start Date:** TBD
**Target Completion:** TBD
**Owner:** Bradley Tangonan
**Reviewer:** ChatGPT Audio Engineering Audit
