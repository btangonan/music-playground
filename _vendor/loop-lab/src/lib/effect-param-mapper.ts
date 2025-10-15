import type { EffectConfig } from './audio-engine';

// Map high-level preset params to the actual internal Tone nodes per effect type.
export function applyEffectParams(config: EffectConfig, params: Record<string, any>) {
  const { type, node } = config as any;
  if (!node) return;

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const ramp = (param: any, val: any, t = 0.05) => {
    // Handle null/undefined or primitives - can't ramp these
    if (param == null || typeof param !== 'object') return false;

    // Try rampTo for Tone Signal objects (smooth parameter changes)
    if (param.rampTo) {
      param.rampTo(val, t);
      return true;
    }

    // Try direct value assignment for Signal-like objects
    if ('value' in param) {
      (param as any).value = val;
      return true;
    }

    // Can't apply parameter
    return false;
  };

  switch (type) {
    case 'shimmer': {
      if (params.decay != null && node.reverb) node.reverb.decay = params.decay;
      // FIX: Tone.PitchShift.pitch is a Signal; ramp instead of direct assignment
      if (params.pitchShift != null && node.pitchShift?.pitch) {
        ramp(node.pitchShift.pitch, Number(params.pitchShift));
      }
      if (params.wet != null && node.wetGain?.gain && node.dryGain?.gain) {
        const wet = clamp01(params.wet);
        ramp(node.wetGain.gain, wet);
        ramp(node.dryGain.gain, 1 - wet);
      }
      if (params.predelay != null && node.predelay?.delayTime) {
        ramp(node.predelay.delayTime, (Number(params.predelay) || 0) / 1000);
      }
      if (params.pitchDry != null && node.pitchDryGain?.gain) {
        ramp(node.pitchDryGain.gain, clamp01(params.pitchDry));
      }
      if (params.hpfHz != null && node.hpf?.frequency) {
        ramp(node.hpf.frequency, Number(params.hpfHz) || 240);
      }
      if (params.feedback != null && node.feedbackGain?.gain) {
        ramp(node.feedbackGain.gain, clamp01(params.feedback));
      }
      break;
    }
    case 'convolver': {
      if (params.predelay != null && node.predelay?.delayTime) {
        ramp(node.predelay.delayTime, (Number(params.predelay) || 0) / 1000);
      }
      if (params.wet != null && node.wetGain?.gain && node.dryGain?.gain) {
        const wet = clamp01(params.wet);
        ramp(node.wetGain.gain, wet);
        ramp(node.dryGain.gain, 1 - wet);
      }
      break;
    }
    case 'space': {
      if (params.decay != null && node.decay != null) node.decay = Number(params.decay);
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'echo':
    case 'pingpong': {
      if (params.delayTime != null && node.delayTime) {
        if (typeof params.delayTime === 'string') {
          // Musical time strings must use .value property (delayTime is read-only)
          (node.delayTime as any).value = params.delayTime;
        } else {
          ramp(node.delayTime, Number(params.delayTime));
        }
      }
      if (params.feedback != null && node.feedback) ramp(node.feedback, clamp01(params.feedback));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'compressor': {
      if (params.threshold != null && node.threshold) ramp(node.threshold, Number(params.threshold));
      if (params.ratio != null && node.ratio) ramp(node.ratio, Number(params.ratio));
      if (params.attack != null && node.attack) ramp(node.attack, Number(params.attack));
      if (params.release != null && node.release) ramp(node.release, Number(params.release));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'eq3': {
      if (params.low != null && node.low) ramp(node.low, Number(params.low));
      if (params.mid != null && node.mid) ramp(node.mid, Number(params.mid));
      if (params.high != null && node.high) ramp(node.high, Number(params.high));
      if (params.lowFrequency != null && node.lowFrequency) ramp(node.lowFrequency, Number(params.lowFrequency));
      if (params.highFrequency != null && node.highFrequency) ramp(node.highFrequency, Number(params.highFrequency));
      break;
    }
    case 'fuzz': {
      if (params.distortion != null && typeof node.distortion === 'number') node.distortion = Number(params.distortion);
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'autofilter': {
      if (params.frequency != null && node.frequency) {
        // Autofilter frequency can be musical time string ('4n') or number (Hz)
        if (typeof params.frequency === 'string') {
          (node.frequency as any).value = params.frequency;
        } else {
          ramp(node.frequency, Number(params.frequency));
        }
      }
      if (params.baseFrequency != null && node.baseFrequency) ramp(node.baseFrequency, Number(params.baseFrequency));
      if (params.octaves != null && node.octaves) ramp(node.octaves, Number(params.octaves));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'chorus': {
      if (params.frequency != null && node.frequency) ramp(node.frequency, Number(params.frequency));
      if (params.delayTime != null && node.delayTime) ramp(node.delayTime, Number(params.delayTime));
      if (params.depth != null && node.depth) ramp(node.depth, clamp01(params.depth));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'tremolo': {
      if (params.frequency != null && node.frequency) ramp(node.frequency, Number(params.frequency));
      if (params.depth != null && node.depth) ramp(node.depth, clamp01(params.depth));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'filter': {
      if (params.type && node.type) node.type = params.type;
      if (params.frequency != null && node.frequency) ramp(node.frequency, Number(params.frequency));
      if (params.Q != null && node.Q) ramp(node.Q, Number(params.Q));
      if (params.wet != null && node.wet) ramp(node.wet, clamp01(params.wet));
      break;
    }
    case 'reverse_reverb': {
      if (params.wet != null && node.effect?.setWet) node.effect.setWet(clamp01(params.wet));
      if (params.predelayMs != null && node.effect?.setPredelay) node.effect.setPredelay(Number(params.predelayMs));
      if (params.recordLength != null && node.effect?.setRecordLength) node.effect.setRecordLength(Number(params.recordLength));
      if (params.reverbDecay != null && node.effect?.setReverbDecay) node.effect.setReverbDecay(Number(params.reverbDecay));
      break;
    }
    case 'width': {
      if (params.width != null && node.processor?.setWidth) node.processor.setWidth(Number(params.width));
      break;
    }
    case 'ambient': {
      if (params.wet != null && node.layer?.setWet) node.layer.setWet(clamp01(params.wet));
      if (params.volume != null && node.layer?.setVolume) node.layer.setVolume(Number(params.volume));
      if (params.filterFreq != null && node.layer?.setFilterFreq) node.layer.setFilterFreq(Number(params.filterFreq));
      break;
    }
    default: {
      // leave standard engine `set(amount)` and legacy param applier to handle simple nodes
    }
  }
}
