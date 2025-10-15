import type { EffectConfig } from './audio-engine';

// Ensure custom-routed effects are actually in-path without touching engine internals.
export function postWireEffect(config: EffectConfig) {
  const anyCfg: any = config;
  if (anyCfg.type === 'reverse_reverb') {
    const eff = anyCfg.node?.effect;
    if (eff?.input && eff?.output && config.input && config.output) {
      try {
        // Top-level IO → internal IO → Top-level out
        config.input.connect(eff.input);
        eff.output.connect(config.output);
      } catch {}
    }
  }
}
