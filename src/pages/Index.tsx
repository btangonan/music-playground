import { useState, useEffect, useCallback, useRef } from 'react';
import { InstrumentNode } from '@/components/InstrumentNode';
import { EffectNode } from '@/components/EffectNode';
import { LoopGrid } from '@/components/LoopGrid';
import { Cable } from '@/components/Cable';
import { Toolbar, type AppMode } from '@/components/Toolbar';
import { UploadAndPlay } from '@/components/UploadAndPlay';
import { SongUpload } from '@/components/SongUpload';
import { TrackMapper } from '@/components/TrackMapper';
import { SongControls } from '@/components/SongControls';
import { createMIDIPlayback, type MIDIData, type MIDIPlayback } from '@/lib/midi-player';
import { useToast } from '@/hooks/use-toast';
import * as AudioEngine from '@/lib/audio-engine';
import * as Tone from 'tone';
import { MPCPad, initialEightPads, connectPad, disconnectPad, isPadEmpty } from '@/lib/pad-manager';
import { MPCGrid } from '@/components/MPCGrid';
import { StepEditorModal } from '@/components/StepEditorModal';
import { cn } from '@/lib/utils';
import { type EffectType } from '@/components/EffectPicker';
import { type PresetName } from '@/components/PresetPicker';
import { Presets, buildEffectChain } from '@/lib/presets';
import { type Orientation, computeOrientation } from '@/lib/ui-layout';
import { adaptiveShimmerForFreq } from '@/lib/pitch-shift-rules';
import { applyEffectParams } from '@/lib/effect-param-mapper';

interface Instrument {
  id: string;
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate';
  color: string;
  position: { x: number; y: number };
  config: AudioEngine.InstrumentConfig;
  effects: Effect[];
  loop: {
    steps: boolean[];
    playheadIndex: number;
  };
}

interface Effect {
  id: string;
  type: string;
  position: { x: number; y: number };
  intensity: number;
  config: AudioEngine.EffectConfig;
  // effect loops will come later
}

// Note: Track system removed - replaced with MPC pad system

const SCALE = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5'];
const KEYS = ['A', 'W', 'S', 'E', 'D', 'R', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'I', 'K', 'O', 'L'];

// Drag state type
type DragState =
  | { kind: 'inst'; fromId: string; cursor: { x: number; y: number } }
  | { kind: 'fx'; fromId: string; cursor: { x: number; y: number } };

const Index = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [cables, setCables] = useState<any[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tempo, setTempo] = useState(90);
  const [timeSig, setTimeSig] = useState('4/4');
  const [initialized, setInitialized] = useState(false);
  const [mode, setMode] = useState<AppMode>('live');
  const { toast } = useToast();

  // Song mode state
  const [songMidi, setSongMidi] = useState<MIDIData | null>(null);
  const [songStemUrls, setSongStemUrls] = useState<Record<string, string>>({});
  const [songTrackMapping, setSongTrackMapping] = useState<Map<number, string>>(new Map());
  const [songPlayback, setSongPlayback] = useState<MIDIPlayback | null>(null);
  const [songDuration, setSongDuration] = useState(0);
  const [isSongPlaying, setIsSongPlaying] = useState(false);

  // Phase 1: Orientation tracking (foundation - no layout changes yet)
  const [orientation, setOrientation] = useState<Orientation>('horizontal');

  // Phase 1: Responsive orientation tracking (no layout changes yet)
  useEffect(() => {
    const onResize = () => setOrientation(computeOrientation(window.innerWidth));
    onResize(); // Initialize orientation on mount
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // MPC Pad state + refs
  const [pads, setPads] = useState<MPCPad[]>(initialEightPads());
  const padsRef = useRef<MPCPad[]>(pads);
  useEffect(()=>{ padsRef.current = pads; }, [pads]);

  const instrumentsRef = useRef<Map<string, Instrument>>(new Map());
  const effectsRef = useRef<Map<string, Effect>>(new Map());

  const mainRef = useRef<HTMLElement>(null);
  const heldKeys = useRef<Set<string>>(new Set());

  // Initialize UI immediately (don't wait for audio)
  useEffect(() => {
    // Phase 4: Vertical stacking in Column 1 (instruments)
    const defaultInstruments: Instrument[] = [
      { id: crypto.randomUUID(), kind: 'pad_gate', color: '#c77dff', position: { x: 50,  y: 50 }, config: AudioEngine.makeInstrument('pad_gate', { label: 'EXPANSIVE PAD' }), effects: [], loop: { steps: Array(16).fill(false), playheadIndex: -1 } },
      { id: crypto.randomUUID(), kind: 'keys',  color: '#54d7ff', position: { x: 50,  y: 200 },  config: AudioEngine.makeInstrument('keys'),  effects: [], loop: { steps: Array(16).fill(false), playheadIndex: -1 } },
      { id: crypto.randomUUID(), kind: 'bass',  color: '#ffe45e', position: { x: 50, y: 350 },  config: AudioEngine.makeInstrument('bass'),  effects: [], loop: { steps: Array(16).fill(false), playheadIndex: -1 } },
      { id: crypto.randomUUID(), kind: 'drums', color: '#7cffcb', position: { x: 50, y: 500 },  config: AudioEngine.makeInstrument('drums'), effects: [], loop: { steps: Array(16).fill(false), playheadIndex: -1 } }
    ];
    defaultInstruments.forEach(inst => { AudioEngine.connectChain(inst.config.out, []); });
    setInstruments(defaultInstruments);
    setActiveInstrumentId(defaultInstruments[0].id);
    setInitialized(true);
    AudioEngine.setTempo(tempo);
    AudioEngine.setTimeSig(timeSig);
    toast({ title: '🎵 Harmonic Sketchpad Ready', description: 'Press A–L to play. Hold keys for pads.' });
  }, []);

  // Update refs when state changes
  useEffect(() => { instrumentsRef.current.clear(); instruments.forEach(inst => instrumentsRef.current.set(inst.id, inst)); }, [instruments]);
  useEffect(() => { effectsRef.current.clear(); effects.forEach(eff => effectsRef.current.set(eff.id, eff)); }, [effects]);

  // Helper to find instrument ID for an effect (walks the chain)
  function findInstrumentIdForEffect(effectId: string): string | null {
    const inst = instruments.find(i => i.effects.some(e => e.id === effectId));
    return inst?.id ?? null;
  }

  // Pad control handlers
  const togglePadMute = useCallback((padId: string) => {
    setPads(prev => {
      const next = prev.map(p => p.id === padId ? { ...p, muted: !p.muted } : p);
      padsRef.current = next;
      return next;
    });
  }, []);

  const togglePadSolo = useCallback((padId: string) => {
    setPads(prev => {
      const next = prev.map(p => p.id === padId ? { ...p, solo: !p.solo } : p);
      padsRef.current = next;
      return next;
    });
  }, []);

  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);

  // Octave shift state (-2 to +2 octaves)
  const [octaveOffset, setOctaveOffset] = useState(0);

  // Pad connection handler
  const onPadInputPointerUp = useCallback((padId: string, e: React.PointerEvent) => {
    if (!drag) return;
    e.stopPropagation();

    let instrumentId: string | null = null;

    if (drag.kind === 'inst') {
      instrumentId = drag.fromId;
    } else if (drag.kind === 'fx') {
      // Find which instrument owns this effect
      instrumentId = findInstrumentIdForEffect(drag.fromId);
      if (!instrumentId) {
        toast({ title: '⚠️ Cannot connect', description: 'Effect is not part of any instrument chain' });
        setDrag(null);
        return;
      }
    }

    const inst = instrumentsRef.current.get(instrumentId);
    if (!inst) {
      setDrag(null);
      return;
    }

    setPads(prev => prev.map(p => {
      if (p.id === padId) {
        // If already connected to this instrument, disconnect
        if (p.connection?.instrumentId === instrumentId) {
          toast({ title: '🔌 Pad disconnected', description: `${p.label} cleared` });
          return disconnectPad(p);
        }
        // Otherwise connect
        toast({ title: '🔌 Pad connected', description: `${inst.kind.toUpperCase()} → ${p.label}` });
        return connectPad(p, inst.kind, instrumentId, inst.color);
      }
      return p;
    }));

    setDrag(null);
  }, [drag, findInstrumentIdForEffect]);

  // Auto-disconnect pads when instrument is removed
  useEffect(() => {
    const existingIds = new Set(instruments.map(i => i.id));
    setPads(prev => prev.map(pad => {
      if (pad.connection && !existingIds.has(pad.connection.instrumentId)) {
        toast({ title: '⚠️ Pad auto-disconnected', description: `${pad.label} instrument was deleted` });
        return disconnectPad(pad);
      }
      return pad;
    }));
  }, [instruments]);

  // Toggle pad step in step editor
  const togglePadStep = useCallback((padId: string, stepIndex: number) => {
    setPads(prev => prev.map(pad => {
      if (pad.id === padId) {
        const newSteps = [...pad.loop.steps];
        newSteps[stepIndex] = !newSteps[stepIndex];
        return { ...pad, loop: { ...pad.loop, steps: newSteps } };
      }
      return pad;
    }));
  }, []);

  // Keyboard input + Escape to cancel drag
  useEffect(() => {
    if (!initialized) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      // Escape key cancels drag
      if (key === 'ESCAPE' && drag) {
        setDrag(null);
        toast({ title: '🚫 Cable drag cancelled' });
        return;
      }

      // ArrowUp/ArrowDown: Octave shift (±2 octaves max)
      if (key === 'ARROWUP') {
        e.preventDefault();
        setOctaveOffset(prev => {
          const newOffset = Math.min(prev + 1, 2);
          if (newOffset !== prev) {
            toast({ title: `🎵 Octave ${newOffset > 0 ? '+' : ''}${newOffset}` });
          }
          return newOffset;
        });
        return;
      }
      if (key === 'ARROWDOWN') {
        e.preventDefault();
        setOctaveOffset(prev => {
          const newOffset = Math.max(prev - 1, -2);
          if (newOffset !== prev) {
            toast({ title: `🎵 Octave ${newOffset > 0 ? '+' : ''}${newOffset}` });
          }
          return newOffset;
        });
        return;
      }

      if (!activeInstrumentId) return;
      const keyIndex = KEYS.indexOf(key);
      if (keyIndex === -1) return;

      // Prevent retrigger spam
      if (heldKeys.current.has(key)) return;
      heldKeys.current.add(key);

      e.preventDefault();

      // Initialize audio context on first keyboard interaction
      await AudioEngine.Engine.start();

      // Initialize master limiter (must come before FX buses)
      if (!AudioEngine.isMasterLimiterInitialized()) {
        await AudioEngine.initializeMasterLimiter();
      }

      // Initialize shared FX buses (reverb/delay/chorus)
      if (!AudioEngine.areFxBusesInitialized()) {
        await AudioEngine.initializeFxBuses();
      }

      const instrument = instrumentsRef.current.get(activeInstrumentId);
      if (!instrument) return;

      let note = SCALE[keyIndex];
      const cfg = instrument.config as any;

      // Apply octave transposition for keys/bass/pad_gate (skip drums)
      if (instrument.kind !== 'drums' && octaveOffset !== 0) {
        note = Tone.Frequency(note).transpose(12 * octaveOffset).toNote();
      }

      // Adaptive shimmer: Adjust pitch shift based on note frequency to prevent artifacts
      if (instrument.kind !== 'drums') {
        const freqHz = Tone.Frequency(note).toFrequency();
        const { semitones, wetScale } = adaptiveShimmerForFreq(freqHz);

        // Apply adaptive pitch shift to all shimmer effects in active instrument chain
        for (const fx of instrument.effects) {
          if (fx.type === 'shimmer') {
            applyEffectParams(fx.config, { pitchShift: semitones });
            if (wetScale) {
              applyEffectParams(fx.config, { wet: wetScale });
            }
          }
        }

        // Debug logging (enable with: window.LL_DEBUG_PITCH_ADAPT = true)
        if ((window as any).LL_DEBUG_PITCH_ADAPT) {
          console.log('[PitchAdapt]', { note, freqHz: freqHz.toFixed(1), semitones, wetScale });
        }
      }

      // Gate-aware: use triggerOn if available (pad_gate)
      if (instrument.kind === 'pad_gate' && cfg.triggerOn) {
        cfg.triggerOn(note);
      } else if (instrument.kind === 'drums') {
        const drumSounds = ['kick', 'snare', 'hihat'];
        instrument.config.play(drumSounds[keyIndex % 3]);
      } else {
        instrument.config.play(note, '8n');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const keyIndex = KEYS.indexOf(key);
      if (keyIndex === -1) return;

      heldKeys.current.delete(key);

      if (!activeInstrumentId) return;
      const instrument = instrumentsRef.current.get(activeInstrumentId);
      if (!instrument) return;

      let note = SCALE[keyIndex];
      const cfg = instrument.config as any;

      // Apply octave transposition for keys/bass/pad_gate (skip drums)
      if (instrument.kind !== 'drums' && octaveOffset !== 0) {
        note = Tone.Frequency(note).transpose(12 * octaveOffset).toNote();
      }

      // Gate-aware: use triggerOff if available (pad_gate)
      if (instrument.kind === 'pad_gate' && cfg.triggerOff) {
        cfg.triggerOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeInstrumentId, initialized, drag, octaveOffset]);

  const handlePlay = async () => {
    await AudioEngine.Engine.start();

    // Initialize master limiter (must come before FX buses)
    if (!AudioEngine.isMasterLimiterInitialized()) {
      await AudioEngine.initializeMasterLimiter();
    }

    // Initialize shared FX buses (reverb/delay/chorus)
    if (!AudioEngine.areFxBusesInitialized()) {
      await AudioEngine.initializeFxBuses();
    }

    AudioEngine.Engine.play();
    setIsPlaying(true);
  };
  const handleStop = () => { AudioEngine.Engine.stop(); setIsPlaying(false); };
  const handleRecord = () => { if (isRecording) { AudioEngine.stopRec(); setIsRecording(false); toast({ title: '⏹️ Recording saved', description: 'Check your downloads folder' }); } else { AudioEngine.startRec(); setIsRecording(true); toast({ title: '⏺️ Recording started' }); } };
  const handleTempoChange = (newTempo: number) => { setTempo(newTempo); AudioEngine.setTempo(newTempo); };
  const handleTimeSigChange = (newSig: string) => { setTimeSig(newSig); AudioEngine.setTimeSig(newSig); };

  const addInstrument = useCallback(() => {
    // Phase 4: Stack vertically in Column 1
    const newInstrument: Instrument = { id: crypto.randomUUID(), kind: 'keys', color: '#54d7ff', position: { x: 50, y: 50 + instruments.length * 150 }, config: AudioEngine.makeInstrument('keys'), effects: [], loop: { steps: Array(16).fill(false), playheadIndex: -1 } };
    AudioEngine.connectChain(newInstrument.config.out, []);
    setInstruments(prev => [...prev, newInstrument]);
    toast({ title: '🎹 Instrument added' });
  }, [instruments.length]);

  const addEffect = useCallback(async (type: EffectType) => {
    const config = await AudioEngine.makeEffect(type);
    // Phase 4: Stack vertically in Column 2
    const newEffect: Effect = {
      id: crypto.randomUUID(),
      type,
      position: { x: 50, y: 50 + effects.length * 150 },
      intensity: 0.5,
      config
    };
    setEffects(prev => [...prev, newEffect]);
    toast({ title: `✨ ${type} added` });
  }, [effects.length]);

  const updateInstrumentPosition = useCallback((id: string, position: { x: number; y: number }) => { setInstruments(prev => prev.map(inst => inst.id === id ? { ...inst, position } : inst )); }, []);
  const updateEffectPosition = useCallback((id: string, position: { x: number; y: number }) => { setEffects(prev => prev.map(eff => eff.id === id ? { ...eff, position } : eff )); }, []);
  const updateEffectIntensity = useCallback((id: string, intensity: number) => { setEffects(prev => prev.map(eff => { if (eff.id === id) { eff.config.set(intensity); return { ...eff, intensity }; } return eff; })); }, []);

  const connectEffectToInstrument = useCallback((instrumentId: string, effectId: string) => {
    const instrument = instrumentsRef.current.get(instrumentId);
    const effect = effectsRef.current.get(effectId);
    if (!instrument || !effect) return;
    setInstruments(prev => prev.map(inst => {
      if (inst.id === instrumentId) {
        const newEffects = [...inst.effects, effect];
        AudioEngine.connectChain(inst.config.out, newEffects.map(e => e.config));
        return { ...inst, effects: newEffects };
      }
      return inst;
    }));
    toast({ title: '🔌 Effect connected' });
  }, []);

  const disconnectEffectFromInstrument = useCallback((instrumentId: string, effectId: string) => {
    const instrument = instrumentsRef.current.get(instrumentId);
    if (!instrument) return;

    setInstruments(prev => prev.map(inst => {
      if (inst.id === instrumentId) {
        const newEffects = inst.effects.filter(e => e.id !== effectId);
        AudioEngine.connectChain(inst.config.out, newEffects.map(e => e.config));
        return { ...inst, effects: newEffects };
      }
      return inst;
    }));
    toast({ title: '🔌 Effect disconnected' });
  }, []);

  const deleteEffect = useCallback((effectId: string) => {
    // Remove effect from global effects list
    setEffects(prev => prev.filter(e => e.id !== effectId));

    // Remove effect from all instrument chains and reconnect audio
    setInstruments(prev => prev.map(inst => {
      const hasEffect = inst.effects.some(e => e.id === effectId);
      if (!hasEffect) return inst;

      const newEffects = inst.effects.filter(e => e.id !== effectId);
      AudioEngine.connectChain(inst.config.out, newEffects.map(e => e.config));
      return { ...inst, effects: newEffects };
    }));

    toast({ title: '🗑️ Effect deleted' });
  }, [toast]);

  const clearAllEffects = useCallback(() => {
    if (!activeInstrumentId) {
      toast({ title: '⚠️ No active instrument', description: 'Select an instrument first' });
      return;
    }

    const instrument = instrumentsRef.current.get(activeInstrumentId);
    if (!instrument) return;

    const effectCount = instrument.effects.length;
    if (effectCount === 0) {
      toast({ title: '⚠️ No effects to clear', description: 'This instrument has no effects' });
      return;
    }

    // Get effect IDs to remove from active instrument only
    const effectIdsToRemove = new Set(instrument.effects.map(e => e.id));

    // Remove effects from global effects list (only those belonging to active instrument)
    setEffects(prev => prev.filter(e => !effectIdsToRemove.has(e.id)));

    // Clear effects from active instrument
    setInstruments(prev => prev.map(inst => {
      if (inst.id === activeInstrumentId) {
        // Reconnect audio chain with empty effects
        AudioEngine.connectChain(inst.config.out, []);
        return { ...inst, effects: [] };
      }
      return inst;
    }));

    toast({ title: `🗑️ Cleared ${effectCount} effect${effectCount > 1 ? 's' : ''} from ${instrument.kind}` });
  }, [activeInstrumentId, toast]);

  // Song mode handlers
  const handleSongLoaded = useCallback((midi: MIDIData, stemUrls: Record<string, string>) => {
    console.log('[Song Mode] MIDI loaded:', midi);
    setSongMidi(midi);
    setSongStemUrls(stemUrls);

    // Calculate total duration from MIDI data
    const duration = midi.tracks.reduce((max, track) => {
      const trackEnd = track.notes.reduce((maxTime, note) =>
        Math.max(maxTime, note.start_time + note.duration), 0);
      return Math.max(max, trackEnd);
    }, 0);
    setSongDuration(duration);

    toast({
      title: '🎵 MIDI Loaded',
      description: `${midi.tracks.length} tracks ready (${Math.floor(duration)}s)`,
    });
  }, [toast]);

  const handleSongMappingChange = useCallback((mapping: Map<number, string>) => {
    setSongTrackMapping(mapping);
  }, []);

  const handleSongPlay = useCallback(async () => {
    if (!songMidi) return;

    // Initialize audio context
    await AudioEngine.Engine.start();

    // Initialize audio engine
    if (!AudioEngine.isMasterLimiterInitialized()) {
      await AudioEngine.initializeMasterLimiter();
    }
    if (!AudioEngine.areFxBusesInitialized()) {
      await AudioEngine.initializeFxBuses();
    }

    // Build track → instrument map from state
    const trackMap = new Map<number, any>();
    songTrackMapping.forEach((instrumentId, trackId) => {
      const inst = instrumentsRef.current.get(instrumentId);
      if (inst) {
        trackMap.set(trackId, inst.config);
      }
    });

    // Create MIDI playback controller
    const playback = createMIDIPlayback(songMidi, trackMap);
    setSongPlayback(playback);

    // Start playback
    playback.start();
    setIsSongPlaying(true);

    toast({ title: '▶️ Song playing' });
  }, [songMidi, songTrackMapping, toast]);

  const handleSongPause = useCallback(() => {
    if (songPlayback) {
      songPlayback.pause();
      setIsSongPlaying(false);
      toast({ title: '⏸️ Song paused' });
    }
  }, [songPlayback, toast]);

  const handleSongStop = useCallback(() => {
    if (songPlayback) {
      songPlayback.stop();
      setIsSongPlaying(false);
      toast({ title: '⏹️ Song stopped' });
    }
  }, [songPlayback, toast]);

  const handleSongSeek = useCallback((position: number) => {
    if (songPlayback) {
      songPlayback.seek(position);
    }
  }, [songPlayback]);

  // Cleanup song playback when switching modes
  useEffect(() => {
    if (mode !== 'song' && songPlayback) {
      songPlayback.dispose();
      setSongPlayback(null);
      setIsSongPlaying(false);
    }
  }, [mode, songPlayback]);

  const applyPreset = useCallback(async (presetName: PresetName) => {
    if (!activeInstrumentId) {
      toast({ title: '⚠️ No active instrument', description: 'Select an instrument first' });
      return;
    }

    const instrument = instrumentsRef.current.get(activeInstrumentId);
    if (!instrument) return;

    try {
      // Build effect chain from preset
      const effectChain = await buildEffectChain(Presets[presetName]);

      // Create Effect UI objects from configs - Phase 4: Stack in Column 2
      const newEffects: Effect[] = effectChain.map((config, index) => ({
        id: crypto.randomUUID(),
        type: config.type,
        position: { x: 50, y: 50 + (effects.length + index) * 150 },
        intensity: 0.5,
        config
      }));

      // Add effects to global effects list
      setEffects(prev => [...prev, ...newEffects]);

      // Connect effects to active instrument
      setInstruments(prev => prev.map(inst => {
        if (inst.id === activeInstrumentId) {
          const updatedEffects = [...inst.effects, ...newEffects];
          AudioEngine.connectChain(inst.config.out, updatedEffects.map(e => e.config));
          return { ...inst, effects: updatedEffects };
        }
        return inst;
      }));

      toast({
        title: `✨ ${presetName} preset applied`,
        description: `Added ${newEffects.length} effects to ${instrument.kind}`
      });
    } catch (error) {
      console.error('[Preset Error]', error);
      toast({
        title: '❌ Preset failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [activeInstrumentId, effects.length, toast]);

  // ---- per-pad runtime loops ------------------------------------------------
  const padRuntimes = useRef<Map<string, Tone.Part>>(new Map());
  const isPlayingRef = useRef(false);
  useEffect(()=>{ isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const handlePadPlayhead = (e: Event) => {
      const { id, index } = (e as CustomEvent).detail;
      // Reset all playheads on stop
      if (id === null && index === -1){
        setPads(prev => prev.map(p => ({ ...p, loop: { ...p.loop, playheadIndex: -1 } })));
        return;
      }
      if (!isPlayingRef.current) return;
      if (id && index !== undefined) {
        setPads(prev => prev.map(p => p.id === id ? { ...p, loop: { ...p.loop, playheadIndex: index } } : p ));
      }
    };
    window.addEventListener('padPlayhead', handlePadPlayhead);
    return () => window.removeEventListener('padPlayhead', handlePadPlayhead);
  }, []);

  useEffect(()=>{
    // Create loop for each connected pad
    pads.forEach(pad => {
      if (isPadEmpty(pad)) {
        // Dispose runtime for disconnected pads
        const old = padRuntimes.current.get(pad.id);
        old?.dispose?.();
        padRuntimes.current.delete(pad.id);
        return;
      }

      const inst = instrumentsRef.current.get(pad.connection!.instrumentId);
      if (!inst?.config?.synth) return;

      // Dispose old runtime
      const old = padRuntimes.current.get(pad.id);
      old?.dispose?.();

      // Mute/solo gating
      const shouldTrigger = (stepIndex: number) => {
        const currentPad = padsRef.current.find(p => p.id === pad.id);
        if (!currentPad) return false;
        const anySolo = padsRef.current.some(p => p.solo);
        return anySolo ? currentPad.solo : !currentPad.muted;
      };

      const part = AudioEngine.createPadLoop(
        inst.kind,
        (inst.config as any).synth,
        pad.loop.steps,
        (idx) => {
          window.dispatchEvent(new CustomEvent('padPlayhead', { detail: { id: pad.id, index: idx } }));
        },
        shouldTrigger
      );
      part.start(0);
      padRuntimes.current.set(pad.id, part);
    });

    // Cleanup disposed pads
    const presentPadIds = new Set(pads.map(p => p.id));
    for (const [id, part] of Array.from(padRuntimes.current.entries())) {
      if (!presentPadIds.has(id)) { part.dispose?.(); padRuntimes.current.delete(id); }
    }

    return () => { /* parts left until next rebuild */ };
  }, [pads.map(p => `${p.id}:${p.connection?.instrumentId ?? 'empty'}:${p.loop.steps.join('')}:${p.muted?1:0}:${p.solo?1:0}`).join('|')]);

  // live port center getters for cables
  const instRefs = useRef<Record<string, any>>({});
  const fxRefs = useRef<Record<string, any>>({});
  const padBtnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function centerOf(rect?: DOMRect){ if(!rect || !mainRef.current) return {x:0,y:0}; const m = mainRef.current.getBoundingClientRect(); return { x: rect.left + rect.width/2 - m.left, y: rect.top + rect.height/2 - m.top }; }
  function centerOfEl(el?: Element | null){ if(!el || !mainRef.current) return {x:0,y:0}; const r = el.getBoundingClientRect(); const m = mainRef.current.getBoundingClientRect(); return { x: r.left + r.width/2 - m.left, y: r.top + r.height/2 - m.top }; }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Toolbar
        isPlaying={isPlaying}
        isRecording={isRecording}
        tempo={tempo}
        timeSig={timeSig}
        mode={mode}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        onTempoChange={handleTempoChange}
        onTimeSigChange={handleTimeSigChange}
        onModeChange={setMode}
        onAddInstrument={addInstrument}
        onPickEffect={addEffect}
        onPickPreset={applyPreset}
        onClearAllEffects={clearAllEffects}
        hasActiveInstrument={activeInstrumentId !== null}
      />

      <main ref={mainRef} className="flex-1 relative overflow-hidden flex flex-row"
        onPointerMove={(e)=>{ if(!drag || !mainRef.current) return; const m = mainRef.current.getBoundingClientRect(); setDrag({ ...drag, cursor:{ x:e.clientX - m.left, y:e.clientY - m.top } }); }}
      >
        {/* Hoisted SVG for cables */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {/* Instrument → Effect chain cables */}
          {instruments.flatMap(inst => {
            if (inst.effects.length === 0) return [];
            const cablesForInst: JSX.Element[] = [];

            // Instrument → first effect
            const firstFx = inst.effects[0];
            cablesForInst.push(
              <Cable
                key={`${inst.id}-${firstFx.id}`}
                from={() => centerOf(instRefs.current[inst.id]?.getOutPortRect?.())}
                to={() => centerOf(fxRefs.current[firstFx.id]?.getInPortRect?.())}
                color={inst.color}
                onClick={() => {
                  disconnectEffectFromInstrument(inst.id, firstFx.id);
                }}
              />
            );

            // Effect → Effect (chain)
            for (let i = 0; i < inst.effects.length - 1; i++) {
              const fromFx = inst.effects[i];
              const toFx = inst.effects[i + 1];
              cablesForInst.push(
                <Cable
                  key={`${fromFx.id}-${toFx.id}`}
                  from={() => centerOf(fxRefs.current[fromFx.id]?.getOutPortRect?.())}
                  to={() => centerOf(fxRefs.current[toFx.id]?.getInPortRect?.())}
                  color={inst.color}
                  onClick={() => {
                    disconnectEffectFromInstrument(inst.id, toFx.id);
                  }}
                />
              );
            }

            return cablesForInst;
          })}

          {/* Pad cables: instrument/effect chain → pad input port */}
          {pads.filter(pad => !isPadEmpty(pad)).map(pad => {
            const inst = instruments.find(i => i.id === pad.connection!.instrumentId);
            if (!inst) return null;

            const lastFx = inst.effects[inst.effects.length - 1];
            const fromGetter = () =>
              lastFx
                ? centerOf(fxRefs.current[lastFx.id]?.getOutPortRect?.())
                : centerOf(instRefs.current[inst.id]?.getOutPortRect?.());

            // Get center of pad's input port button
            const toGetter = () => {
              const padEl = padBtnRefs.current[pad.id];
              if (!padEl || !mainRef.current) return { x: 0, y: 0 };
              const portBtn = padEl.querySelector('[data-port="input"]');
              if (!portBtn) return centerOfEl(padEl);
              return centerOfEl(portBtn);
            };

            return (
              <Cable
                key={`pad-cable-${pad.id}`}
                from={fromGetter}
                to={toGetter}
                color={inst.color}
                onClick={() => {
                  setPads(prev => prev.map(p => p.id === pad.id ? disconnectPad(p) : p));
                  toast({ title: '🔌 Pad disconnected' });
                }}
              />
            );
          })}

          {/* Live drag cables */}
          {drag && (() => {
            if (drag.kind === 'inst') {
              const fGetter = ()=> centerOf(instRefs.current[drag.fromId]?.getOutPortRect?.());
              const tGetter = ()=> drag.cursor;
              const inst = instruments.find(i=>i.id===drag.fromId);
              return inst ? <Cable from={fGetter} to={tGetter} color={inst.color} /> : null;
            } else {
              const fGetter = ()=> centerOf(fxRefs.current[drag.fromId]?.getOutPortRect?.());
              const tGetter = ()=> drag.cursor;
              return <Cable from={fGetter} to={tGetter} color="hsl(var(--secondary))" />;
            }
          })()}
        </svg>

        {/* Conditional Rendering: Live / Song / Stem Modes */}
        {mode === 'live' ? (
          <>
            {/* Column 1: Instruments */}
            <section className="relative flex-shrink-0 w-80 bg-gradient-to-r from-background to-card/30 border-r border-border/30 pointer-events-none">
              <div className="absolute inset-0 grid-pattern opacity-30" />
              <div className="relative h-full pointer-events-auto p-6">
                {instruments.map(instrument => (
                  <InstrumentNode
                    key={instrument.id}
                    id={instrument.id}
                    kind={instrument.kind}
                    color={instrument.color}
                    position={instrument.position}
                    isActive={instrument.id === activeInstrumentId}
                    orientation={orientation}
                    octaveOffset={instrument.id === activeInstrumentId ? octaveOffset : 0}
                    onSelect={() => setActiveInstrumentId(instrument.id)}
                    onDrag={(pos) => updateInstrumentPosition(instrument.id, pos)}
                    onPortPointerDown={(e)=>{ if (!mainRef.current) return; const m = mainRef.current.getBoundingClientRect(); setDrag({ kind: 'inst', fromId: instrument.id, cursor:{x: e.clientX - m.left, y: e.clientY - m.top} }); }}
                    ref={(el:any)=>{ instRefs.current[instrument.id]=el; }}
                  />
                ))}
              </div>
            </section>

            {/* Column 2: Effects */}
            <section className="relative flex-shrink-0 w-96 bg-card/20 border-r border-border/20 pointer-events-none">
              <div className="absolute inset-0 grid-pattern opacity-20" />
              <div className="relative h-full pointer-events-auto p-6">
                {effects.map(effect => (
              <EffectNode
                key={effect.id}
                id={effect.id}
                type={effect.type}
                position={effect.position}
                intensity={effect.intensity}
                orientation={orientation}
                onDrag={(pos) => updateEffectPosition(effect.id, pos)}
                onRotate={(val) => updateEffectIntensity(effect.id, val)}
                onDelete={() => deleteEffect(effect.id)}
                onInputPointerUp={(e) => {
                  console.log('[Effect Input Drop] drag state:', drag, 'target effect:', effect.type, effect.id);
                  if (!drag) return;
                  e.stopPropagation();

                  if (drag.kind === 'inst') {
                    // Instrument → Effect (existing behavior)
                    connectEffectToInstrument(drag.fromId, effect.id);
                  } else if (drag.kind === 'fx') {
                    // Effect → Effect: Chain effects together
                    console.log('[Effect → Effect] Attempting connection');
                    const sourceEffectId = drag.fromId;
                    const targetEffectId = effect.id;

                    if (sourceEffectId === targetEffectId) {
                      toast({ title: '⚠️ Cannot connect effect to itself' });
                      setDrag(null);
                      return;
                    }

                    // Find which instruments own the source and target effects
                    const sourceInst = instruments.find(i => i.effects.some(e => e.id === sourceEffectId));
                    const targetInst = instruments.find(i => i.effects.some(e => e.id === targetEffectId));

                    console.log('[Effect → Effect] Source instrument:', sourceInst?.kind, sourceInst?.id);
                    console.log('[Effect → Effect] Target instrument:', targetInst?.kind, targetInst?.id);

                    // Case 1: Source is in a chain, target is orphaned → Append target after source
                    if (sourceInst && !targetInst) {
                      console.log('[Effect → Effect] Appending orphaned target to source chain');
                      const targetEffect = effectsRef.current.get(targetEffectId);
                      if (!targetEffect) {
                        console.log('[Effect → Effect] Target effect not found - aborting');
                        setDrag(null);
                        return;
                      }

                      setInstruments(prev => prev.map(inst => {
                        if (inst.id !== sourceInst.id) return inst;

                        // Find source position and insert target right after it
                        const sourceIndex = inst.effects.findIndex(e => e.id === sourceEffectId);
                        if (sourceIndex === -1) {
                          console.log('[Effect → Effect] Source not found in chain - aborting');
                          return inst;
                        }

                        const newEffects = [...inst.effects];
                        newEffects.splice(sourceIndex + 1, 0, targetEffect);
                        console.log('[Effect → Effect] New chain:', newEffects.map(e => e.type));
                        AudioEngine.connectChain(inst.config.out, newEffects.map(e => e.config));

                        return { ...inst, effects: newEffects };
                      }));

                      toast({ title: '🔌 Effect chained' });
                      setDrag(null);
                      return;
                    }

                    // Case 2: Both effects already in chains
                    if (!sourceInst || !targetInst) {
                      console.log('[Effect → Effect] Source not in chain - aborting');
                      toast({
                        title: '⚠️ Effect not in chain',
                        description: 'Connect source effect to an instrument first'
                      });
                      setDrag(null);
                      return;
                    }

                    if (sourceInst.id !== targetInst.id) {
                      console.log('[Effect → Effect] Cross-chain connection blocked');
                      toast({
                        title: '⚠️ Effects in different chains',
                        description: 'Cannot connect effects from different instruments'
                      });
                      setDrag(null);
                      return;
                    }

                    // Case 3: Both in same chain → Reorder (insert source before target)
                    console.log('[Effect → Effect] Reordering within same chain...');
                    setInstruments(prev => prev.map(inst => {
                      if (inst.id !== targetInst.id) return inst;

                      // Remove source from current position
                      let effects = inst.effects.filter(e => e.id !== sourceEffectId);
                      console.log('[Effect → Effect] Chain after removing source:', effects.map(e => e.type));

                      // Find target index and insert source before it
                      const targetIndex = effects.findIndex(e => e.id === targetEffectId);
                      if (targetIndex === -1) {
                        console.log('[Effect → Effect] Target not found in chain - aborting');
                        return inst;
                      }

                      const sourceEffect = effectsRef.current.get(sourceEffectId);
                      if (!sourceEffect) {
                        console.log('[Effect → Effect] Source effect not found - aborting');
                        return inst;
                      }

                      effects.splice(targetIndex, 0, sourceEffect);
                      console.log('[Effect → Effect] New chain:', effects.map(e => e.type));
                      AudioEngine.connectChain(inst.config.out, effects.map(e => e.config));

                      return { ...inst, effects };
                    }));

                    toast({ title: '🔌 Effect reordered in chain' });
                  }

                  setDrag(null);
                }}
                onOutputPointerDown={(e) => {
                  if (!mainRef.current) return;
                  console.log('[Effect Output Drag] Starting drag from effect:', effect.type, effect.id);
                  const m = mainRef.current.getBoundingClientRect();
                  setDrag({ kind: 'fx', fromId: effect.id, cursor: { x: e.clientX - m.left, y: e.clientY - m.top } });
                }}
                  ref={(el:any)=>{ fxRefs.current[effect.id]=el; }}
                />
              ))}
            </div>
          </section>

          {/* Column 3: MPC Pads */}
          <section className="relative flex-1 bg-background/50 backdrop-blur-sm p-6 space-y-4 pointer-events-none overflow-auto">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground pointer-events-auto">MPC Pads</h3>

            {/* MPC Grid */}
            <div className="pointer-events-auto">
              <MPCGrid
                pads={pads}
                selectedPadId={selectedPadId}
                onSelectPad={setSelectedPadId}
                onToggleMute={togglePadMute}
                onToggleSolo={togglePadSolo}
                onInputPointerUp={onPadInputPointerUp}
                padBtnRefs={padBtnRefs}
              />
            </div>

            {/* Step Editor Modal for Pads */}
            {selectedPadId && (() => {
              const pad = pads.find(p => p.id === selectedPadId);
              if (!pad || isPadEmpty(pad)) return null;

              return (
                <StepEditorModal
                  pad={pad}
                  steps={pad.loop.steps}
                  playheadIndex={pad.loop.playheadIndex}
                  onStepToggle={(idx) => togglePadStep(pad.id, idx)}
                  onClose={() => setSelectedPadId(null)}
                  onToggleMute={() => togglePadMute(pad.id)}
                  onToggleSolo={() => togglePadSolo(pad.id)}
                />
              );
            })()}
          </section>
        </>
        ) : mode === 'song' ? (
          /* Song Mode: MIDI Upload, Track Mapping, and Playback */
          <section className="relative flex-1 bg-background/50 backdrop-blur-sm p-8 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Song Playback</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload an audio file to convert to MIDI and play through your Loop Lab instruments
                </p>
              </div>

              {/* Step 1: Upload Audio File */}
              {!songMidi && (
                <SongUpload
                  onSongLoaded={handleSongLoaded}
                  backendUrl={import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}
                />
              )}

              {/* Step 2: Map MIDI Tracks to Instruments */}
              {songMidi && !songPlayback && (
                <>
                  <TrackMapper
                    tracks={songMidi.tracks}
                    instruments={instruments.map(inst => ({
                      id: inst.id,
                      kind: inst.kind,
                      name: `${inst.kind.toUpperCase()} (${inst.effects.length} effects)`
                    }))}
                    mapping={songTrackMapping}
                    onMappingChange={handleSongMappingChange}
                  />

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSongMidi(null);
                        setSongTrackMapping(new Map());
                        toast({ title: '🔄 Ready for new upload' });
                      }}
                      className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-card"
                    >
                      Upload Different File
                    </button>
                    <button
                      onClick={handleSongPlay}
                      disabled={songTrackMapping.size === 0}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Playback
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Playback Controls */}
              {songPlayback && (
                <>
                  <SongControls
                    isPlaying={isSongPlaying}
                    duration={songDuration}
                    onPlay={handleSongPlay}
                    onPause={handleSongPause}
                    onStop={handleSongStop}
                    onSeek={handleSongSeek}
                  />

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        songPlayback.dispose();
                        setSongPlayback(null);
                        setIsSongPlaying(false);
                        toast({ title: '🔙 Back to track mapping' });
                      }}
                      className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-card"
                    >
                      Remap Tracks
                    </button>
                    <button
                      onClick={() => {
                        songPlayback.dispose();
                        setSongPlayback(null);
                        setIsSongPlaying(false);
                        setSongMidi(null);
                        setSongTrackMapping(new Map());
                        toast({ title: '🔄 Ready for new upload' });
                      }}
                      className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-card"
                    >
                      Upload New Song
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : (
          /* Stem Mode: Full Width Upload & Playback */
          <section className="relative flex-1 bg-background/50 backdrop-blur-sm p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <UploadAndPlay />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
