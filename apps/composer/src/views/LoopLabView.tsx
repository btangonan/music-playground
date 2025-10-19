import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import TopBar from '../components/TopBar';
import ChordPalette from '../components/ChordPalette';
import IconGallery from '../components/IconGallery';
import IconSequencerWithDensity from '../components/IconSequencerWithDensity';
import StepNumbers from '../components/StepNumbers';
import ChordLabels from '../components/ChordLabels';
import MidiInfoModal from '../components/MidiInfoModal';
import { type Chord } from '../components/chordData';
import { AudioEngine } from '../audio/AudioEngine';
import { mapSoundId } from '../audio/soundIdMapper';
import { midiToNoteName } from '../audio/helpers';
import { loopsApi } from '../services/loopsApi';
import { generateUUID } from '../utils/uuid';
import { formatApiError } from '../utils/errors';
import type { Loop, ChordCell, IconStep } from '@music/types/schemas';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useUndo } from '../hooks/useUndo';
import '../fonts.css';

type GridResolution = '1/4' | '1/8' | '1/16';

export default function LoopLabView() {
  // Initialize auth token (sets test token to localStorage)
  useAuth();

  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState('C');
  const [draggingSound, setDraggingSound] = useState<string | null>(null);
  const [barChords, setBarChords] = useState<(Chord | null)[]>(['I', 'I', 'V', 'vi']);
  const [assignmentMode, setAssignmentMode] = useState<Chord | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAudioInitializing, setIsAudioInitializing] = useState(false);
  const [octaveOffset, setOctaveOffset] = useState(0);

  const [placements, setPlacements, undoPlacements, canUndo] = useUndo<any[]>([], 5);

  // Keep ref in sync with placements state for immediate access during scheduling
  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  const [currentLoopId, setCurrentLoopId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loopName, setLoopName] = useState('Untitled Loop');

  const [resolution, setResolution] = useState<GridResolution>('1/4');

  const [midiMetadata, setMidiMetadata] = useState<{
    name: string;
    bpm: number;
    iconCount: number;
    noteCount: number;
  } | null>(null);
  const [showMidiModal, setShowMidiModal] = useState(false);

  const [pitchRange, setPitchRange] = useState<{ min: number; max: number } | null>(null);

  const SNAP_DIVISOR = { '1/4': 4, '1/8': 2, '1/16': 1 } as const;
  const quantizeBar = (bar: number): number => {
    const divisor = SNAP_DIVISOR[resolution];
    return Math.round(bar / divisor) * divisor;
  };

  const barToToneTime = (bar: number): string => {
    const barNum = Math.floor(bar / 16);
    const sixteenthInBar = bar % 16;
    const quarter = Math.floor(sixteenthInBar / 4);
    const sixteenth = sixteenthInBar % 4;
    return `${barNum}:${quarter}:${sixteenth}`;
  };

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);
  const placementsRef = useRef<any[]>([]);

  const serializeLoop = (): Omit<Loop, 'id' | 'updatedAt'> => {
    const chordProgression: ChordCell[] = barChords
      .map((chord, index) => ({ bar: index, chord: chord || 'I' }))
      .filter(cell => cell.chord !== null);

    const iconSequence: IconStep[] = placements.map(p => ({
      bar: p.bar,
      row: p.row ?? 0,
      soundId: p.soundId,
      velocity: p.velocity / 100,
      pitch: p.pitch,
      // persist duration if present (back-compat default = 1 in schema)
      // @ts-ignore: IconStep from schema now supports duration16 optional default
      duration16: p.duration16 ?? 1
    }));

    return {
      name: loopName,
      bars: 4,
      color: '#FFD11A',
      bpm,
      chordProgression,
      iconSequence,
      schemaVersion: 1,
    };
  };

  const deserializeLoop = (loop: Loop) => {
    setLoopName(loop.name);
    setBpm(loop.bpm);

    const newBarChords: (Chord | null)[] = Array(4).fill(null);
    loop.chordProgression.forEach(cell => { if (cell.bar >= 0 && cell.bar < 4) newBarChords[cell.bar] = cell.chord as Chord; });
    setBarChords(newBarChords);

    const newPlacements = loop.iconSequence.map(step => ({
      bar: step.bar,
      row: step.row,
      soundId: step.soundId,
      velocity: step.velocity * 100,
      pitch: step.pitch,
      // bring duration into UI objects (schema default covers missing)
      // @ts-ignore tolerate missing during transition
      duration16: (step as any).duration16 ?? 1
    }));
    setPlacements(newPlacements);

    setCurrentLoopId(loop.id);
    setLastSaved(new Date(loop.updatedAt));
  };

  const handleSave = async () => {
    // Prevent concurrent saves
    if (isSaving) return;

    // Stop playback before saving
    if (isPlaying) {
      handlePlayPause();
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const loopData = serializeLoop();

      let savedLoop: Loop;
      if (currentLoopId) {
        // Update existing loop
        savedLoop = await loopsApi.updateLoop(currentLoopId, {
          ...loopData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new loop - backend generates id and updatedAt
        savedLoop = await loopsApi.createLoop(loopData);
        setCurrentLoopId(savedLoop.id);

        // Update URL with loopId
        const url = new URL(window.location.href);
        url.searchParams.set('loopId', savedLoop.id);
        window.history.replaceState(null, '', url.toString());
      }

      setLastSaved(new Date());
      console.log('Loop saved successfully:', savedLoop.id);
      showToast('Loop saved successfully!', 'success');
    } catch (error) {
      const { message } = formatApiError(error);
      setSaveError(message);
      console.error('Save failed:', message);
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSound = (soundId: string) => {
    setSelectedSound(soundId === selectedSound ? null : soundId);
  };

  const handleChordSelect = (chord: Chord | null) => {
    setAssignmentMode(chord);
  };

  const handlePresetSelect = (preset: string) => {
    // Preset chord progressions
    const presets: Record<string, (Chord | null)[]> = {
      Pop: ['I', 'V', 'vi', 'IV'],
      Sad: ['vi', 'IV', 'I', 'V'],
      Chill: ['I', 'iii', 'vi', 'IV'],
      Shoegaze: ['I', 'bVII', 'IV', 'I']
    };

    const progression = presets[preset];
    if (progression) {
      setBarChords(progression);
    }
  };

  const handleBarChordAssign = (barIndex: number, chord: Chord) => {
    const newBarChords = [...barChords];
    newBarChords[barIndex] = chord;
    setBarChords(newBarChords);
    // Exit assignment mode after assigning
    setAssignmentMode(null);
  };

  const handlePlayPause = async () => {
    if (!audioEngineRef.current) {
      try {
        setIsAudioInitializing(true);
        const engine = new AudioEngine();
        await engine.start();
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
        setIsAudioInitializing(false);

        // Reset playhead to beginning before first play
        Tone.Transport.position = 0;
        setCurrentStep(0);
        Tone.Transport.start();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setIsAudioInitializing(false);
      }
    } else {
      if (!isPlaying) {
        // Reset playhead and schedule events BEFORE starting transport (eliminates race condition)
        Tone.Transport.position = 0;
        setCurrentStep(0);
        scheduleAllNotes();
        Tone.Transport.start();
        setIsPlaying(true);
      } else {
        // Stop playback: clear scheduled events and release all active notes
        Tone.Transport.cancel();
        audioEngineRef.current.stopAllNotes();
        Tone.Transport.pause();
        Tone.Transport.position = 0;
        setCurrentStep(0);
        setIsPlaying(false);
      }
    }
  };

  const handlePreviewSound = async (soundId: string) => {
    if (!audioEngineRef.current) {
      try {
        const engine = new AudioEngine();
        await engine.start();
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
      } catch (err) {
        console.error('Failed to initialize audio for preview:', err);
        return;
      }
    }
    const engineSoundId = mapSoundId(soundId);
    const engine = audioEngineRef.current;

    // Use low pitch for drums to get that deep bass kick sound
    let note = 'C4';
    if (soundId === 'kick' || soundId === 'snare' ||
        soundId === 'hihat' || soundId === 'clap') {
      note = 'C1'; // Low bass frequency for all drums
    }

    engine.scheduleNote(engineSoundId, note, '+0', 0.7);
  };

  const handlePreviewNote = async (soundId: string, pitch: number) => {
    if (!audioEngineRef.current) {
      try {
        const engine = new AudioEngine();
        await engine.start();
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
      } catch (err) {
        console.error('Failed to initialize audio for preview:', err);
        return;
      }
    }
    const engineSoundId = mapSoundId(soundId);
    let note = midiToNoteName(pitch);

    // Override pitch for drum sounds during preview - always play at low frequency
    if (soundId === 'kick' || soundId === 'snare' ||
        soundId === 'hihat' || soundId === 'clap') {
      note = 'C1'; // Low bass frequency for all drums
    }

    const engine = audioEngineRef.current;
    engine.scheduleNote(engineSoundId, note, '+0', 0.7);
  };

  const ensureAudioEngine = async () => {
    if (!audioEngineRef.current) {
      const engine = new AudioEngine();
      await engine.start();
      audioEngineRef.current = engine;
      engine.setBPM(bpm);
    }
    return audioEngineRef.current;
  };

  const handlePlacementsLoaded = (placements: any[], metadata: { name: string; bpm: number; noteCount: number }) => {
    setPlacements(placements);
    setMidiMetadata({ name: metadata.name, bpm: metadata.bpm, iconCount: placements.length, noteCount: metadata.noteCount });
    if (placements.length > 0) {
      const pitches = placements.map(p => p.pitch);
      setPitchRange({ min: Math.min(...pitches), max: Math.max(...pitches) });
    } else { setPitchRange(null); }

    // Auto-switch to 1/16 resolution for MIDI imports (most MIDI uses 1/16th note timing)
    setResolution('1/16');

    showToast(`MIDI loaded: ${placements.length} icons added to grid`, 'success');
  };

  const handleSyncBpmToMidi = () => { if (midiMetadata) { setBpm(midiMetadata.bpm); showToast(`BPM synced to ${midiMetadata.bpm}`, 'success'); setShowMidiModal(false); } };

  useEffect(() => { if (audioEngineRef.current) { audioEngineRef.current.setBPM(bpm); } }, [bpm]);

  // helper: sixteenths to seconds at current BPM
  const sixteenthToSeconds = (count: number, bpmVal: number) => {
    const bps = bpmVal / 60;
    const secPerSixteenth = 1 / (bps * 4);
    return count * secPerSixteenth;
  };

  // Schedule all notes - called before Transport.start() to eliminate race condition
  const scheduleAllNotes = () => {
    if (!audioEngineRef.current) return;
    const engine = audioEngineRef.current;

    // Clear existing events
    Tone.Transport.cancel();
    scheduledEventsRef.current = [];

    // Read from ref for latest placements
    const currentPlacements = placementsRef.current;

    currentPlacements.forEach((placement) => {
      const engineSoundId = mapSoundId(placement.soundId);
      let note = midiToNoteName(placement.pitch);

      // Override pitch for drum sounds - always play at low frequency for deep bass sound
      if (placement.soundId === 'kick' || placement.soundId === 'snare' ||
          placement.soundId === 'hihat' || placement.soundId === 'clap') {
        note = 'C1';
      }

      const time = barToToneTime(placement.bar);
      const start16 = placement.bar;
      const rawLen16 = placement.duration16 ?? 1;
      const end16 = Math.min(64, start16 + rawLen16);
      const len16 = Math.max(1, end16 - start16);
      const durSeconds = sixteenthToSeconds(len16, bpm);

      const eventId = Tone.Transport.schedule((scheduleTime) => {
        engine.scheduleNote(engineSoundId, note, scheduleTime, placement.velocity / 100, durSeconds);
      }, time);

      scheduledEventsRef.current.push(eventId as any);
    });

    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = '4m';
  };

  // Re-schedule when placements/bpm change during playback
  useEffect(() => {
    if (!isPlaying) return;
    scheduleAllNotes();
  }, [isPlaying, placements, bpm]);

  useEffect(() => { if (!isPlaying) { return; } const animate = () => { const transportSeconds = Tone.Transport.seconds; const beatsPerSecond = bpm / 60; const currentBeat = (transportSeconds * beatsPerSecond) % 16; setCurrentStep(currentBeat); if (isPlaying) { requestAnimationFrame(animate); } }; const animationFrame = requestAnimationFrame(animate); return () => { cancelAnimationFrame(animationFrame); }; }, [isPlaying, bpm]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause
      if (event.code === 'Space') {
        event.preventDefault();
        handlePlayPause();
      }

      // CMD+Z or CTRL+Z: Undo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          undoPlacements();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, canUndo, undoPlacements]);

  useEffect(() => { return () => { if (audioEngineRef.current) { audioEngineRef.current.stop(); audioEngineRef.current.dispose(); } }; }, []);

  useEffect(() => { const loadLoopFromUrl = async () => { const url = new URL(window.location.href); const loopId = url.searchParams.get('loopId'); if (!loopId) { return; } try { const loop = await loopsApi.getLoop(loopId); deserializeLoop(loop); console.log('Loop loaded successfully:', loop.id); } catch (error) { const { message } = formatApiError(error); console.error('Failed to load loop:', message); showToast(`Failed to load loop: ${message}`, 'error'); const newUrl = new URL(window.location.href); newUrl.searchParams.delete('loopId'); window.history.replaceState(null, '', newUrl.toString()); } }; loadLoopFromUrl(); }, []);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: 'Satoshi, Inter, system-ui, sans-serif', fontWeight: 900, fontSize: '32px', marginBottom: '4px' }}>
            Loop Lab
          </h1>
          <p className="text-[rgba(0,0,0,0.55)]" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px' }}>
            Loop Builder with Smart Chords
          </p>
        </div>

        <TopBar isPlaying={isPlaying} bpm={bpm} onPlayPause={handlePlayPause} onSave={handleSave} onBpmChange={setBpm} selectedKey={selectedKey} onKeyChange={setSelectedKey} resolution={resolution} onResolutionChange={setResolution} midiMetadata={midiMetadata} onMidiUpload={handlePlacementsLoaded} onShowMidiModal={() => setShowMidiModal(true)} ensureAudioEngine={ensureAudioEngine} />

        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden">
          {/* Icon Gallery at top */}
          <div className="flex items-center justify-center" style={{ height: '56px', paddingTop: '8px', paddingBottom: '4px' }}>
            <IconGallery selectedSound={selectedSound} onSelectSound={handleSelectSound} onDragStart={setDraggingSound} onDragEnd={() => setDraggingSound(null)} onPreviewSound={handlePreviewSound} />
          </div>

          {/* Chord and Preset buttons row */}
          <div className="flex items-center justify-center gap-2 px-4 py-2">
            <ChordPalette selectedChord={assignmentMode} onChordSelect={handleChordSelect} onPresetSelect={handlePresetSelect} layout="horizontal" />
          </div>

          {/* Main sequencer area */}
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <IconSequencerWithDensity selectedSound={selectedSound} selectedKey={selectedKey} draggingSound={draggingSound} barChords={barChords} assignmentMode={assignmentMode} onBarChordAssign={handleBarChordAssign} currentStep={currentStep} isPlaying={isPlaying} placements={placements} onPlacementsChange={setPlacements} onPreviewNote={handlePreviewNote} resolution={resolution} quantizeBar={quantizeBar} octaveOffset={octaveOffset} onOctaveOffsetChange={setOctaveOffset} onChordSelect={handleChordSelect} onPresetSelect={handlePresetSelect} />
            <div className="mt-2"><ChordLabels barChords={barChords} /></div>
          </div>
        </div>

        <p className="text-[rgba(0,0,0,0.4)] mt-3 italic text-center" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '11px' }}>
          {assignmentMode ? `Click a bar to assign chord "${assignmentMode}"` : 'Drag sound icons from gallery onto the grid. Dark rows indicate good notes. Double-click to delete sounds.'}
        </p>

        {midiMetadata && (<MidiInfoModal isOpen={showMidiModal} onClose={() => setShowMidiModal(false)} metadata={midiMetadata} currentBpm={bpm} onSyncBpm={handleSyncBpmToMidi} />)}
      </div>
    </div>
  );
}
