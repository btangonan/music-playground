import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import TopBar from '../components/TopBar';
import ChordPalette from '../components/ChordPalette';
import IconGallery from '../components/IconGallery';
import IconSequencerWithDensity from '../components/IconSequencerWithDensity';
import StepNumbers from '../components/StepNumbers';
import ChordLabels from '../components/ChordLabels';
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

  // Store placements from IconSequencerWithDensity
  const [placements, setPlacements] = useState<any[]>([]);

  // Save/Load state
  const [currentLoopId, setCurrentLoopId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loopName, setLoopName] = useState('Untitled Loop');

  // Audio engine instance
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);

  /**
   * Serialize current UI state to Loop schema format
   */
  const serializeLoop = (): Omit<Loop, 'id' | 'updatedAt'> => {
    // Convert barChords array to chordProgression with bar indices
    const chordProgression: ChordCell[] = barChords
      .map((chord, index) => ({
        bar: index,
        chord: chord || 'I', // Default to 'I' if null
      }))
      .filter(cell => cell.chord !== null);

    // Convert placements to iconSequence
    // Note: row field is derived from UI - need to preserve it from placements
    const iconSequence: IconStep[] = placements.map(p => ({
      bar: p.bar,
      row: p.row ?? 0, // Use row from placement or default to 0
      soundId: p.soundId,
      velocity: p.velocity / 100, // Convert from 0-100 UI to 0-1 API
      pitch: p.pitch,
    }));

    return {
      name: loopName,
      bars: 4, // Fixed to 4 bars for now
      color: '#FFD11A', // Default color
      bpm,
      chordProgression,
      iconSequence,
      schemaVersion: 1,
    };
  };

  /**
   * Deserialize Loop schema format to UI state
   */
  const deserializeLoop = (loop: Loop) => {
    setLoopName(loop.name);
    setBpm(loop.bpm);

    // Convert chordProgression to barChords array
    const newBarChords: (Chord | null)[] = Array(4).fill(null);
    loop.chordProgression.forEach(cell => {
      if (cell.bar >= 0 && cell.bar < 4) {
        newBarChords[cell.bar] = cell.chord as Chord;
      }
    });
    setBarChords(newBarChords);

    // Convert iconSequence to placements
    const newPlacements = loop.iconSequence.map(step => ({
      bar: step.bar,
      row: step.row,
      soundId: step.soundId,
      velocity: step.velocity * 100, // Convert from 0-1 API to 0-100 UI
      pitch: step.pitch,
    }));
    setPlacements(newPlacements);

    setCurrentLoopId(loop.id);
    setLastSaved(new Date(loop.updatedAt));
  };

  const handlePlayPause = async () => {
    if (!audioEngineRef.current) {
      // First time: initialize audio engine
      try {
        setIsAudioInitializing(true);
        const engine = new AudioEngine();
        await engine.start();
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
        setIsAudioInitializing(false);
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setIsAudioInitializing(false);
        // TODO: Show error to user
      }
    } else {
      // Toggle playback
      if (!isPlaying) {
        Tone.Transport.start();
        setIsPlaying(true);
      } else {
        Tone.Transport.pause();
        Tone.Transport.position = 0; // Reset to beginning
        setCurrentStep(0); // Reset visual playhead
        setIsPlaying(false);
      }
    }
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

  const handlePreviewSound = async (soundId: string) => {
    // Initialize audio engine if needed
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

    // Play preview note (C4 - middle C)
    const engineSoundId = mapSoundId(soundId);
    const engine = audioEngineRef.current;
    engine.scheduleNote(engineSoundId, 'C4', '+0', 0.7);
  };

  const handlePreviewNote = async (soundId: string, pitch: number) => {
    // Initialize audio engine if needed
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

    // Play preview note with actual pitch
    const engineSoundId = mapSoundId(soundId);
    const note = midiToNoteName(pitch);
    const engine = audioEngineRef.current;
    engine.scheduleNote(engineSoundId, note, '+0', 0.7);
  };

  // BPM synchronization
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setBPM(bpm);
    }
  }, [bpm]);

  // Note scheduling system
  useEffect(() => {
    if (!isPlaying || !audioEngineRef.current || placements.length === 0) {
      return;
    }

    const engine = audioEngineRef.current;

    // Clear previous scheduled events
    Tone.Transport.cancel();
    scheduledEventsRef.current = [];

    // Schedule all notes in the loop
    placements.forEach((placement) => {
      const engineSoundId = mapSoundId(placement.soundId);
      const note = midiToNoteName(placement.pitch);

      // Convert step position (0-15) to bar:quarter:sixteenth format
      // Grid has 16 steps across 4 bars (4 steps per bar)
      // placement.bar is 0-15, representing position across 4 bars
      const bar = Math.floor(placement.bar / 4); // Which bar (0-3)
      const stepInBar = placement.bar % 4; // Which step within that bar (0-3)

      // Tone.js time format: "bar:quarter:sixteenth"
      // Each bar has 4 quarter notes, each quarter has 4 sixteenths
      // Since we have 4 steps per bar, each step is 1 quarter note
      const time = `${bar}:${stepInBar}:0`;

      // Schedule note with Tone.js Transport
      const eventId = Tone.Transport.schedule((scheduleTime) => {
        engine.scheduleNote(
          engineSoundId,
          note,
          scheduleTime,
          placement.velocity / 100 // Normalize to 0-1
        );
      }, time);

      scheduledEventsRef.current.push(eventId as any);
    });

    // Set up loop: 4 measures (4 bars) in 4/4 time
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = '4m'; // 4 measures = 4 bars

  }, [isPlaying, placements]);

  // Playhead animation - synchronized with Tone.Transport
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const animate = () => {
      // Use Tone.Transport.seconds for precise synchronization
      // Transport seconds represents current playback time
      const transportSeconds = Tone.Transport.seconds;

      // Calculate beats per second from BPM
      const beatsPerSecond = bpm / 60;

      // Calculate current beat position (0-16 across 4 bars)
      const currentBeat = (transportSeconds * beatsPerSecond) % 16;

      setCurrentStep(currentBeat);

      if (isPlaying) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, bpm]);

  // Spacebar shortcut for play/pause
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]); // Include isPlaying to ensure handlePlayPause closure is current

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Load loop from URL query param on mount
  useEffect(() => {
    const loadLoopFromUrl = async () => {
      const url = new URL(window.location.href);
      const loopId = url.searchParams.get('loopId');

      if (!loopId) {
        return; // No loopId in URL, start with blank loop
      }

      try {
        const loop = await loopsApi.getLoop(loopId);
        deserializeLoop(loop);
        console.log('Loop loaded successfully:', loop.id);
      } catch (error) {
        const { message } = formatApiError(error);
        console.error('Failed to load loop:', message);
        showToast(`Failed to load loop: ${message}`, 'error');

        // Remove invalid loopId from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('loopId');
        window.history.replaceState(null, '', newUrl.toString());
      }
    };

    loadLoopFromUrl();
  }, []); // Run only on mount

  return (
    <div
      className="min-h-screen p-6"
      style={{
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div className="max-w-[900px] mx-auto">
        {/* App Title */}
        <div className="text-center mb-6">
          <h1
            style={{
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: '32px',
              marginBottom: '4px'
            }}
          >
            Loop Lab
          </h1>
          <p
            className="text-[rgba(0,0,0,0.55)]"
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px' }}
          >
            Loop Builder with Smart Chords
          </p>
        </div>

        {/* Top Bar - 60px (outside main interface) */}
        <TopBar
          isPlaying={isPlaying}
          bpm={bpm}
          onPlayPause={handlePlayPause}
          onSave={handleSave}
          onBpmChange={setBpm}
          selectedKey={selectedKey}
          onKeyChange={setSelectedKey}
        />

        {/* Main Interface Container - 450px total */}
        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden">
          {/* Chord Palette Strip - 32px */}
          <ChordPalette
            selectedChord={assignmentMode}
            onChordSelect={handleChordSelect}
            onPresetSelect={handlePresetSelect}
          />

          {/* Icon Gallery - 48px */}
          <div className="flex items-center justify-center" style={{ height: '56px', paddingTop: '8px', paddingBottom: '4px' }}>
            <IconGallery
              selectedSound={selectedSound}
              onSelectSound={handleSelectSound}
              onDragStart={setDraggingSound}
              onDragEnd={() => setDraggingSound(null)}
              onPreviewSound={handlePreviewSound}
            />
          </div>

          {/* Piano Roll + Density - 360px + Step Numbers 10px */}
          <div className="px-4 pb-4 pt-0 flex flex-col items-center">
            {/* Chord Labels - shows which chord is assigned to each bar */}
            <div className="mb-2">
              <ChordLabels barChords={barChords} />
            </div>

            <IconSequencerWithDensity
              selectedSound={selectedSound}
              selectedKey={selectedKey}
              draggingSound={draggingSound}
              barChords={barChords}
              assignmentMode={assignmentMode}
              onBarChordAssign={handleBarChordAssign}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onPlacementsChange={setPlacements}
              onPreviewNote={handlePreviewNote}
            />

            {/* Step Numbers - 10px */}
            <div className="mt-2">
              <StepNumbers />
            </div>
          </div>
        </div>

        {/* Instructions - centered below panel */}
        <p
          className="text-[rgba(0,0,0,0.4)] mt-3 italic text-center"
          style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '11px' }}
        >
          {assignmentMode
            ? `Click a bar to assign chord "${assignmentMode}"`
            : 'Drag sound icons from gallery onto the grid. Dark rows indicate good notes. Double-click to delete sounds.'}
        </p>
      </div>
    </div>
  );
}
