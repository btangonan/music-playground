import { useRef, useState } from 'react';
import type { Placement } from '../stores/useSequencerStore';
import { midiClipToPlacements } from '../utils/midiToPlacement';

interface MidiUploaderProps {
  onPlacements?: (placements: Placement[], metadata: { name: string; bpm: number; noteCount: number }) => void;
  onMetadata?: (metadata: { name: string; bpm: number }) => void;
  ensureAudioEngine: () => Promise<any>; // Function to ensure AudioEngine exists
  compact?: boolean; // Suppress inline status display
}

export default function MidiUploader({ onPlacements, onMetadata, ensureAudioEngine, compact = false }: MidiUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    try {
      setIsLoading(true);
      setStatus('Loading...');

      // Ensure AudioEngine is initialized
      const audioEngine = await ensureAudioEngine();

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Parse MIDI without scheduling playback (parse-only approach)
      const clip = await audioEngine.parseMIDI(arrayBuffer, file.name);

      // Convert to sequencer placements
      const placements = midiClipToPlacements(clip);

      setStatus(`Loaded: ${file.name} @ ${clip.bpm} BPM, ${placements.length} icons (${clip.notes.length} notes)`);

      // Pass placements and metadata to parent
      const metadata = { name: clip.name, bpm: clip.bpm, noteCount: clip.notes.length };
      onPlacements?.(placements, metadata);
      onMetadata?.(metadata);
    } catch (err: any) {
      console.error('MIDI load error:', err);
      setStatus(`Failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Import MIDI'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi,audio/midi"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            await handleFile(f);
          }
          // Reset file input to allow re-upload of same file
          if (e.target) {
            e.target.value = '';
          }
        }}
      />
      {!compact && status && (
        <span className="text-sm opacity-70">{status}</span>
      )}
    </div>
  );
}
