// Reverse Reverb for Radiohead-style swelling effects
// Uses buffer recording and reversal for predelay + backwards bloom

import * as Tone from 'tone';

/**
 * Creates a reverse reverb effect with configurable predelay
 *
 * How it works:
 * 1. Records input into buffer (recordLength seconds)
 * 2. Reverses buffer
 * 3. Applies reverb to reversed audio
 * 4. Optional predelay for early reflection separation
 *
 * @param predelayMs - Predelay in milliseconds (0-100ms)
 * @param recordLength - Buffer record length in seconds (default 2s)
 * @param reverbDecay - Reverb decay time in seconds (default 4s)
 * @param wet - Wet/dry mix (0-1, default 0.4)
 * @returns Effect config with reverse reverb node and controls
 */
export function makeReverseReverb(
  predelayMs = 30,
  recordLength = 2,
  reverbDecay = 4,
  wet = 0.4
) {
  // Input/output gains for routing
  const input = new Tone.Gain(1);
  const output = new Tone.Gain(1);

  // Wet/dry mixer
  const dryGain = new Tone.Gain(1 - wet);
  const wetGain = new Tone.Gain(wet);
  const mixer = new Tone.Gain(1);

  // Predelay
  const predelay = new Tone.Delay(predelayMs / 1000);

  // Reverb for reversed signal
  const reverb = new Tone.Reverb({ decay: reverbDecay, wet: 1 });

  // Recorder for buffer capture
  const recorder = new Tone.Recorder();

  // Audio level analyser for auto-trigger (larger buffer for stability)
  const analyser = new Tone.Analyser('waveform', 2048);

  // DEBUG: Test analyser on input node directly
  const inputAnalyser = new Tone.Analyser('waveform', 2048);

  // Reverse reverb state
  let isRecording = false;
  let reversedPlayer: Tone.Player | null = null;
  let headFade: Tone.Gain | null = null;
  let isEnabled = true;
  let monitorInterval: NodeJS.Timeout | null = null;
  let lastTriggerTime = 0;
  const triggerCooldown = 3000; // 3 seconds between triggers
  const amplitudeThreshold = 0.01; // Minimum amplitude to trigger

  /**
   * Trigger reverse reverb effect
   * Records audio, reverses it, applies reverb, and plays back
   */
  async function triggerReverse() {
    if (isRecording || !isEnabled) return;

    isRecording = true;

    try {
      // Start recording
      recorder.start();

      // Record for specified length
      await new Promise(resolve => setTimeout(resolve, recordLength * 1000));

      // Stop recording and get buffer
      const recording = await recorder.stop();

      // Check if recording has data
      const blob = recording;
      if (blob.size === 0) {
        if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
          console.log('[Reverse Reverb] Empty recording, skipping');
        }
        isRecording = false;
        return;
      }

      // Create buffer from recording
      const audioBuffer = await Tone.getContext().decodeAudioData(await blob.arrayBuffer());

      // Check if buffer has audio
      let hasAudio = false;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          if (Math.abs(data[i]) > 0.001) {
            hasAudio = true;
            break;
          }
        }
        if (hasAudio) break;
      }

      if (!hasAudio) {
        if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
          console.log('[Reverse Reverb] Silent recording, skipping');
        }
        isRecording = false;
        return;
      }

      // Reverse buffer
      const reversed = reverseBuffer(audioBuffer);

      // Reentrancy guard: dispose previous instance before creating new
      if (reversedPlayer) {
        reversedPlayer.stop();
        reversedPlayer.dispose();
      }
      if (headFade) {
        headFade.dispose();
      }

      // Create player for reversed audio
      reversedPlayer = new Tone.Player(reversed);

      // Create fade gain for clickless onset/offset
      headFade = new Tone.Gain(0);
      reversedPlayer.connect(headFade);
      headFade.connect(predelay);
      predelay.connect(reverb);

      // Clickless onset: 10ms fade-in
      headFade.gain.setValueAtTime(0, Tone.now());
      headFade.gain.linearRampTo(1, 0.01);

      // Clickless offset: 10ms fade-out at playback end
      reversedPlayer.onstop = () => {
        if (headFade) {
          const t = Tone.now();
          headFade.gain.cancelAndHoldAtTime(t);
          headFade.gain.linearRampTo(0, 0.01);
        }
      };

      // Play reversed audio through reverb
      reversedPlayer.start();

      // Debug logging
      if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
        console.log('[Reverse Reverb] Triggered successfully:', {
          recordLength,
          predelayMs,
          reverbDecay,
          bufferDuration: reversed.duration
        });
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
        console.error('[Reverse Reverb] Error:', error);
      }
    }

    isRecording = false;
  }

  /**
   * Reverse audio buffer
   */
  function reverseBuffer(buffer: AudioBuffer): AudioBuffer {
    const reversed = Tone.getContext().createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const reversedData = reversed.getChannelData(channel);

      // Reverse the samples
      for (let i = 0; i < buffer.length; i++) {
        reversedData[i] = sourceData[buffer.length - 1 - i];
      }
    }

    return reversed;
  }

  /**
   * Initialize reverb, routing, and audio-level monitoring
   */
  async function initialize() {
    await reverb.ready;

    // Routing: input -> [dry path, recorder for wet path] -> mixer -> output
    input.connect(dryGain);
    dryGain.connect(mixer);

    // Wet path: connect recorder for capture
    input.connect(recorder);
    reverb.connect(wetGain);
    wetGain.connect(mixer);

    mixer.connect(output);

    // DEBUG: Log initial gain values
    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
      console.log('[Reverse Reverb] Initial routing:', {
        dryGain: dryGain.gain.value,
        wetGain: wetGain.gain.value,
        mixerGain: mixer.gain.value
      });
    }

    // Connect analyser to mixer (AFTER mixing) to detect actual audio flow
    mixer.connect(analyser);

    // DEBUG: Connect input analyser to input node directly
    input.connect(inputAnalyser);

    // Start audio-level monitoring for auto-trigger
    startAudioMonitoring();

    // Debug logging
    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
      console.log('[Reverse Reverb] Initialized with audio-level auto-trigger:', {
        predelayMs,
        recordLength,
        reverbDecay,
        wet,
        threshold: amplitudeThreshold,
        cooldown: triggerCooldown
      });
    }
  }

  /**
   * Start monitoring audio levels for auto-trigger
   */
  function startAudioMonitoring() {
    if (monitorInterval) return;

    monitorInterval = setInterval(() => {
      if (!isEnabled || isRecording) return;

      // Get waveform data from analyser
      const waveform = analyser.getValue() as Float32Array;

      // Calculate RMS (root mean square) amplitude
      let sum = 0;
      for (let i = 0; i < waveform.length; i++) {
        const sample = waveform[i] as number;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / waveform.length);

      // DEBUG: Calculate RMS from input analyser for comparison
      const inputWaveform = inputAnalyser.getValue() as Float32Array;
      let inputSum = 0;
      for (let i = 0; i < inputWaveform.length; i++) {
        const sample = inputWaveform[i] as number;
        inputSum += sample * sample;
      }
      const inputRMS = Math.sqrt(inputSum / inputWaveform.length);

      // Debug: Log RMS values continuously to diagnose audio detection
      if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
        console.log('[Reverse Reverb] Mixer RMS:', rms.toFixed(6), '| Input RMS:', inputRMS.toFixed(6), '| Threshold:', amplitudeThreshold, '| Exceeded:', rms > amplitudeThreshold);
      }

      // Check if enough time has passed since last trigger (cooldown)
      const now = Date.now();
      if (now - lastTriggerTime < triggerCooldown) return;

      // Trigger if amplitude exceeds threshold
      if (rms > amplitudeThreshold) {
        lastTriggerTime = now;

        if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
          console.log('[Reverse Reverb] Audio detected, triggering:', {
            rms: rms.toFixed(4),
            threshold: amplitudeThreshold
          });
        }

        triggerReverse();
      }
    }, 500); // Check every 500ms

    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
      console.log('[Reverse Reverb] Audio monitoring started');
    }
  }

  /**
   * Stop audio monitoring
   */
  function stopAudioMonitoring() {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;

      if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
        console.log('[Reverse Reverb] Audio monitoring stopped');
      }
    }
  }


  /**
   * Update wet/dry mix
   */
  function setWet(value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    wetGain.gain.rampTo(clamped, 0.05);
    dryGain.gain.rampTo(1 - clamped, 0.05);
  }

  /**
   * Update predelay
   */
  function setPredelay(ms: number) {
    const clamped = Math.max(0, Math.min(100, ms));
    predelay.delayTime.rampTo(clamped / 1000, 0.05);
  }

  /**
   * Cleanup
   */
  function dispose() {
    isEnabled = false;
    stopAudioMonitoring();

    input.dispose();
    output.dispose();
    dryGain.dispose();
    wetGain.dispose();
    mixer.dispose();
    predelay.dispose();
    reverb.dispose();
    recorder.dispose();
    analyser.dispose();
    inputAnalyser.dispose();

    if (reversedPlayer) {
      reversedPlayer.dispose();
    }

    if (headFade) {
      headFade.dispose();
    }

    if (typeof window !== 'undefined' && (window as any).LL_DEBUG_REVERSE_REVERB) {
      console.log('[Reverse Reverb] Disposed');
    }
  }

  /**
   * Get current RMS level from analyser for diagnostics
   */
  function getRMS(): number {
    const waveform = analyser.getValue() as Float32Array;
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const sample = waveform[i] as number;
      sum += sample * sample;
    }
    return Math.sqrt(sum / waveform.length);
  }

  return {
    input,
    output,
    triggerReverse,
    setWet,
    setPredelay,
    initialize,
    dispose,
    getRMS  // Export for diagnostics
  };
}
