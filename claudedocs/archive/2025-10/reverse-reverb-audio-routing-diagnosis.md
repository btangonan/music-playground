# Reverse Reverb Audio Routing Diagnosis

## Problem
RMS logging shows `RMS: 0.000000` - analyser is not detecting any audio signal despite audio flowing through the effect.

## Current Routing (reverse-reverb.ts:195-205)
```
input.connect(dryGain)           → dry signal path
dryGain.connect(mixer)

input.connect(recorder)           → wet path (recording)
input.connect(analyser)           → monitoring path
reverb.connect(wetGain)
wetGain.connect(mixer)

mixer.connect(output)
```

## Effect Chain (audio-engine.ts:246-256)
```
instrumentOut → fx.input → fx.output → Bus.master
```

For reverse_reverb:
```
instrumentOut → reverseReverb.input → reverseReverb.output → Bus.master
```

## Test Results
- ✅ Dry signal passes through (we hear audio)
- ✅ Effect initializes correctly
- ✅ Monitoring starts
- ❌ **Analyser shows RMS: 0.000000 (no audio detected)**

## Root Cause Analysis

### Theory 1: Analyser Type Mismatch
**Issue**: Using `Tone.Analyser('waveform', 256)` which returns time-domain samples
**Test**: Try using `'fft'` type instead, or check if waveform data is valid

### Theory 2: Analyser Buffer Not Updated
**Issue**: `getValue()` might not be returning current audio data
**Possible Causes**:
- Analyser buffer size too small (256 samples)
- Polling interval (500ms) missing audio events
- AudioContext timing issue

### Theory 3: Connection Order
**Issue**: Analyser connected before audio starts flowing
**Test**: Connect analyser AFTER first audio event

### Theory 4: AudioContext Suspended
**Issue**: Despite clicking Play, AudioContext remains suspended for certain nodes
**Evidence**: Console shows "AudioContext is 'suspended'" warnings
**Test**: Call `Tone.start()` explicitly before monitoring

## Next Steps
1. **Increase analyser buffer size**: Try 1024 or 2048 samples
2. **Check analyser type**: Log `analyser.getValue()` raw output to see data structure
3. **Test with 'fft' type**: Switch from 'waveform' to 'fft' and use frequency data
4. **Add connection test**: Log when audio first flows through input node
5. **Manual trigger test**: Add button to manually call `triggerReverse()` with logging

## Alternative Approach: Manual Trigger Button
If audio detection continues to fail, implement Option A from the design doc:
- Add UI button to reverse_reverb effect node
- Button calls `triggerReverse()` when clicked
- User manually triggers when they want reverse reverb effect
- This matches how professional DAWs handle reverse reverb (manual trigger)
