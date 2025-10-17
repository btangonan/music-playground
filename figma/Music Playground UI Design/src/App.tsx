import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import ChordPalette from './components/ChordPalette';
import IconGallery from './components/IconGallery';
import IconSequencerWithDensity from './components/IconSequencerWithDensity';
import StepNumbers from './components/StepNumbers';
import ChordLabels from './components/ChordLabels';
import { type Chord } from './components/chordData';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState('C');
  const [draggingSound, setDraggingSound] = useState<string | null>(null);
  const [barChords, setBarChords] = useState<(Chord | null)[]>(['I', 'I', 'V', 'vi']);
  const [assignmentMode, setAssignmentMode] = useState<Chord | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSave = () => {
    console.log('Saving loop to pad...');
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

  // Playhead animation - continuous movement
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const msPerLoop = (60000 / bpm) * 16; // 16 beats (4 bars) total
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % msPerLoop) / msPerLoop; // 0 to 1
      const position = progress * 16; // 0 to 16 (continuous)
      
      setCurrentStep(position);
      
      if (isPlaying) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, bpm]);

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
