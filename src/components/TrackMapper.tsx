/**
 * TrackMapper Component
 *
 * Maps MIDI tracks from backend to Loop Lab instruments
 * Allows user to assign each track (vocals, drums, bass, other) to an instrument
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MIDITrack } from '@/lib/midi-player';

interface Instrument {
  id: string;
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate';
  name: string;
}

interface TrackMapperProps {
  tracks: MIDITrack[];
  instruments: Instrument[];
  mapping: Map<number, string>; // track_id → instrument_id
  onMappingChange: (mapping: Map<number, string>) => void;
}

export function TrackMapper({ tracks, instruments, mapping, onMappingChange }: TrackMapperProps) {
  const handleMapChange = (trackId: number, instrumentId: string) => {
    const newMapping = new Map(mapping);

    if (instrumentId === 'none') {
      newMapping.delete(trackId);
    } else {
      newMapping.set(trackId, instrumentId);
    }

    onMappingChange(newMapping);
  };

  // Auto-suggest instrument based on track name
  const suggestInstrument = (trackInstrument: string): string => {
    switch (trackInstrument.toLowerCase()) {
      case 'vocals':
        return instruments.find(i => i.kind === 'keys')?.id || 'none';
      case 'drums':
        return instruments.find(i => i.kind === 'drums')?.id || 'none';
      case 'bass':
        return instruments.find(i => i.kind === 'bass')?.id || 'none';
      case 'other':
        return instruments.find(i => i.kind === 'pad_gate')?.id || 'none';
      default:
        return 'none';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map MIDI Tracks to Instruments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Assign each MIDI track to a Loop Lab instrument. Unmapped tracks will be skipped.
        </p>
      </div>

      <div className="space-y-3">
        {tracks.map((track) => {
          const currentMapping = mapping.get(track.track_id) || suggestInstrument(track.instrument);
          const noteCount = track.notes.length;

          return (
            <div
              key={track.track_id}
              className="flex items-center gap-4 p-3 border border-border rounded-lg"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{track.instrument}</span>
                  <span className="text-xs text-muted-foreground">
                    Track {track.track_id}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {noteCount} notes
                </div>
              </div>

              <div className="w-48">
                <Select
                  value={currentMapping}
                  onValueChange={(value) => handleMapChange(track.track_id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select instrument" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No instrument</span>
                    </SelectItem>
                    {instruments.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name} ({inst.kind.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Tips:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Vocals → Keys (melodic instrument)</li>
          <li>Drums → Drums (percussion)</li>
          <li>Bass → Bass (low-end instrument)</li>
          <li>Other → Pad/Gate (ambient/texture)</li>
          <li>Instruments will use their current effect chains</li>
        </ul>
      </div>
    </div>
  );
}
