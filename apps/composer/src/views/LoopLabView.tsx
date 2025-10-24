import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import TopBar from '../components/TopBar';
import ChordPalette from '../components/ChordPalette';
import IconGallery from '../components/IconGallery';
import IconSequencerWithDensity from '../components/IconSequencerWithDensity';
import StepNumbers from '../components/StepNumbers';
import MidiInfoModal from '../components/MidiInfoModal';
import ShareButton from '../components/ShareButton';
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
import { useGistImport } from '../hooks/useGistImport';
import '../fonts.css';

type GridResolution = '1/4' | '1/8' | '1/16';

export default function LoopLabView() {
  // Initialize auth token (sets test token to localStorage)
  useAuth();

  const { showToast } = useToast();

  // Handle gist import from URL
  const gistImport = useGistImport();
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

  // Mobile detection and tap-to-place states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedSoundForPlacement, setSelectedSoundForPlacement] = useState<string | null>(null);
  const [selectedIconForDeletion, setSelectedIconForDeletion] = useState<any | null>(null);

  // Update isMobile on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      bpm: Math.round(bpm) || 120,
      chordProgression,
      iconSequence,
      schemaVersion: 1,
    };
  };

  const deserializeLoop = (loop: Loop) => {
    setLoopName(loop.name);
    setBpm(Math.round(loop.bpm) || 120);

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

  // Tap-to-place handlers
  const handleSelectSoundForPlacement = (soundId: string) => {
    // Select sound for placement mode
    setSelectedSoundForPlacement(soundId);
    setSelectedSound(soundId); // Also set regular selectedSound for visual feedback
    setSelectedIconForDeletion(null); // Clear any selected icon for deletion
  };

  const handleGridCellClick = (bar: number, pitch: number) => {
    // If we have a sound selected for placement, place it
    if (selectedSoundForPlacement) {
      const newPlacement = {
        soundId: selectedSoundForPlacement,
        bar: quantizeBar(bar),
        pitch,
        row: 0,
        velocity: 80,
        duration16: 1
      };
      setPlacements([...placements, newPlacement]);
      // Don't clear selection - allow multiple placements
      // User can tap another sound to switch
    }
  };

  const handleIconClick = (placement: any) => {
    // Select icon for deletion
    setSelectedIconForDeletion(placement);
  };

  const handleDeleteSelectedIcon = () => {
    if (selectedIconForDeletion) {
      setPlacements(placements.filter(p => p !== selectedIconForDeletion));
      setSelectedIconForDeletion(null);
    }
  };

  const handleClearAll = () => {
    // Stop playback if playing
    if (isPlaying) {
      handlePlayPause();
    }

    // Clear all state
    setPlacements([]);
    setBarChords([null, null, null, null]);
    setMidiMetadata(null);
    setCurrentLoopId(null);
    setLoopName('Untitled Loop');
    setLastSaved(null);

    // Clear URL param if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('loopId')) {
      url.searchParams.delete('loopId');
      window.history.replaceState(null, '', url.toString());
    }

    showToast('All notes and chords cleared', 'success');
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
        console.log('[LoopLabView] Starting audio initialization...');
        setIsAudioInitializing(true);
        const engine = new AudioEngine();
        console.log('[LoopLabView] AudioEngine created, calling start()...');
        await engine.start();  // This now includes ensureContextRunning()
        console.log('[LoopLabView] AudioEngine.start() completed');
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
        setIsAudioInitializing(false);
        console.log('[LoopLabView] Audio initialization complete, starting playback');

        // Reset playhead to beginning before first play
        Tone.Transport.position = 0;
        setCurrentStep(0);
        Tone.Transport.start();
        setIsPlaying(true);
        console.log('[LoopLabView] Playback started');
      } catch (err) {
        console.error('[LoopLabView] Failed to initialize audio:', err);
        setIsAudioInitializing(false);
        alert(`Audio initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        return;  // Don't start playback if audio failed
      }
    } else {
      if (!isPlaying) {
        console.log('[LoopLabView] Resuming playback...');
        // Ensure context is running before each play (handles tab switching, sleep mode)
        try {
          await audioEngineRef.current.ensureContextRunning();
          console.log('[LoopLabView] Audio context resumed');
        } catch (err) {
          console.error('[LoopLabView] Failed to resume audio:', err);
          alert(`Audio resume failed: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }

        // Reset playhead and schedule events BEFORE starting transport (eliminates race condition)
        Tone.Transport.position = 0;
        setCurrentStep(0);
        scheduleAllNotes();
        Tone.Transport.start();
        setIsPlaying(true);
        console.log('[LoopLabView] Playback resumed');
      } else {
        console.log('[LoopLabView] Stopping playback...');
        // Stop playback: clear scheduled events and release all active notes
        Tone.Transport.cancel();
        audioEngineRef.current.stopAllNotes();
        Tone.Transport.pause();
        Tone.Transport.position = 0;
        setCurrentStep(0);
        setIsPlaying(false);
        console.log('[LoopLabView] Playback stopped');
      }
    }
  };

  const handlePreviewSound = async (soundId: string) => {
    console.log('[LoopLabView] Preview sound requested:', soundId);
    if (!audioEngineRef.current) {
      try {
        console.log('[LoopLabView] Initializing audio for preview...');
        const engine = new AudioEngine();
        await engine.start();
        audioEngineRef.current = engine;
        engine.setBPM(bpm);
        console.log('[LoopLabView] Audio initialized for preview');
      } catch (err) {
        console.error('[LoopLabView] Failed to initialize audio for preview:', err);
        alert(`Preview audio failed: ${err instanceof Error ? err.message : String(err)}`);
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

    console.log('[LoopLabView] Scheduling preview note:', engineSoundId, note);
    const success = engine.scheduleNote(engineSoundId, note, '+0', 0.7);
    console.log('[LoopLabView] Preview note scheduled:', success);
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
      await engine.start();  // Includes ensureContextRunning()
      audioEngineRef.current = engine;
      engine.setBPM(bpm);
    } else {
      // Ensure context is running for preview sounds (handles suspended state)
      await audioEngineRef.current.ensureContextRunning();
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

    // Auto-sync BPM from MIDI file
    setBpm(Math.round(metadata.bpm) || 120);

    // Clear chord progression on MIDI import (chords don't match MIDI content)
    setBarChords([null, null, null, null]);

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

  // Handle gist import
  useEffect(() => {
    if (gistImport.loop) {
      deserializeLoop(gistImport.loop);
      showToast(`Loaded shared loop: ${gistImport.loop.name}`, 'success');
    } else if (gistImport.error) {
      showToast(`Failed to load shared loop: ${gistImport.error}`, 'error');
    }
  }, [gistImport.loop, gistImport.error]);

  return (
    <div className={`min-h-screen flex ${isMobile ? 'items-start' : 'items-center'} p-6`} style={{ position: 'relative', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '40px', paddingBottom: '200px' }}>
      {/* Background: Video on desktop, gradient on mobile */}
      {!isMobile ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            minWidth: '100%',
            minHeight: '100%',
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -1
          }}
        >
          <source src="/sky3.mp4" type="video/mp4" />
        </video>
      ) : (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
          zIndex: -1
        }} />
      )}

      <div className="max-w-[900px] mx-auto w-full">
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: 'Satoshi, Inter, system-ui, sans-serif', fontWeight: 900, fontSize: '32px', marginBottom: '4px' }}>
            Loop Lab
          </h1>
          <p className="text-[rgba(0,0,0,0.55)]" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px' }}>
            Loop Builder with Smart Chords
          </p>
        </div>

        <div>
          <TopBar isPlaying={isPlaying} bpm={bpm} onPlayPause={handlePlayPause} onSave={handleSave} onClearAll={handleClearAll} onBpmChange={setBpm} selectedKey={selectedKey} onKeyChange={setSelectedKey} resolution={resolution} onResolutionChange={setResolution} midiMetadata={midiMetadata} onMidiUpload={handlePlacementsLoaded} onShowMidiModal={() => setShowMidiModal(true)} ensureAudioEngine={ensureAudioEngine} />

        {/* Share Button */}
        {currentLoopId && (
          <div className="flex justify-end mb-2">
            <ShareButton loop={{
              ...serializeLoop(),
              id: currentLoopId,
              updatedAt: lastSaved?.toISOString() || new Date().toISOString()
            }} />
          </div>
        )}

        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden">
          {/* Chord and Preset buttons row */}
          <div className="flex items-center justify-center gap-2 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            <ChordPalette selectedChord={assignmentMode} onChordSelect={handleChordSelect} onPresetSelect={handlePresetSelect} layout="horizontal" isMobile={isMobile} />
          </div>

          {/* Icon Gallery */}
          <div className="flex items-center justify-center">
            <IconGallery
              selectedSound={selectedSound}
              onSelectSound={handleSelectSound}
              onSelectSoundForPlacement={handleSelectSoundForPlacement}
              onDragStart={setDraggingSound}
              onDragEnd={() => setDraggingSound(null)}
              onPreviewSound={handlePreviewSound}
              isMobile={isMobile}
            />
          </div>

          {/* Main sequencer area */}
          <div className={`px-4 pb-4 flex flex-col ${isMobile ? 'items-center' : 'items-start'}`} style={{ paddingLeft: isMobile ? '0' : '56px', paddingRight: isMobile ? '0' : '16px', marginTop: '-2px' }}>
            <IconSequencerWithDensity
              selectedSound={selectedSound}
              selectedKey={selectedKey}
              draggingSound={draggingSound}
              barChords={barChords}
              assignmentMode={assignmentMode}
              onBarChordAssign={handleBarChordAssign}
              currentStep={currentStep}
              isPlaying={isPlaying}
              placements={placements}
              onPlacementsChange={setPlacements}
              onPreviewNote={handlePreviewNote}
              resolution={resolution}
              quantizeBar={quantizeBar}
              octaveOffset={octaveOffset}
              onOctaveOffsetChange={setOctaveOffset}
              onChordSelect={handleChordSelect}
              onPresetSelect={handlePresetSelect}
              isMobile={isMobile}
              onGridCellClick={handleGridCellClick}
              onIconClick={handleIconClick}
              selectedIconForDeletion={selectedIconForDeletion}
              selectedSoundForPlacement={selectedSoundForPlacement}
            />
          </div>
        </div>

        {/* Delete button - shown when icon selected */}
        {selectedIconForDeletion && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleDeleteSelectedIcon}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 active:scale-95 transition-all"
              style={{ fontFamily: 'Inter', fontSize: '14px', minWidth: '120px', minHeight: '44px' }}
            >
              Delete Sound
            </button>
          </div>
        )}

        <p className="text-[rgba(0,0,0,0.4)] mt-2 italic text-center" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '11px' }}>
          {assignmentMode
            ? `${isMobile ? 'Tap' : 'Click'} a bar to assign chord "${assignmentMode}"`
            : isMobile
              ? 'Tap a sound icon, then tap the grid to place it. Tap an icon to select, then tap Delete.'
              : 'Drag sound icons from gallery onto the grid, or tap to place. Dark rows indicate good notes. Double-click to delete sounds.'}
        </p>
      </div>

        {midiMetadata && (<MidiInfoModal isOpen={showMidiModal} onClose={() => setShowMidiModal(false)} metadata={midiMetadata} currentBpm={bpm} onSyncBpm={handleSyncBpmToMidi} />)}
      </div>
    </div>
  );
}
