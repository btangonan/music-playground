import { Play, Square, Circle, Plus, Trash2, Music, Disc3, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EffectPicker, type EffectType } from '@/components/EffectPicker';
import { PresetPicker, type PresetName } from '@/components/PresetPicker';

export type AppMode = 'live' | 'stem' | 'song';

interface ToolbarProps {
  isPlaying: boolean;
  isRecording: boolean;
  tempo: number;
  timeSig: string;
  mode: AppMode;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onTempoChange: (tempo: number) => void;
  onTimeSigChange: (sig: string) => void;
  onModeChange: (mode: AppMode) => void;
  onAddInstrument: () => void;
  onPickEffect: (type: EffectType) => void;
  onPickPreset: (preset: PresetName) => void;
  onClearAllEffects: () => void;
  hasActiveInstrument: boolean;
}

export function Toolbar({
  isPlaying,
  isRecording,
  tempo,
  timeSig,
  mode,
  onPlay,
  onStop,
  onRecord,
  onTempoChange,
  onTimeSigChange,
  onModeChange,
  onAddInstrument,
  onPickEffect,
  onPickPreset,
  onClearAllEffects,
  hasActiveInstrument
}: ToolbarProps) {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-background/50 rounded-md p-1">
          <Button
            size="sm"
            variant={mode === 'live' ? 'default' : 'ghost'}
            onClick={() => onModeChange('live')}
            className="gap-2 h-7 px-3"
          >
            <Music className="w-3 h-3" />
            Live
          </Button>
          <Button
            size="sm"
            variant={mode === 'song' ? 'default' : 'ghost'}
            onClick={() => onModeChange('song')}
            className="gap-2 h-7 px-3"
          >
            <Music2 className="w-3 h-3" />
            Song
          </Button>
          <Button
            size="sm"
            variant={mode === 'stem' ? 'default' : 'ghost'}
            onClick={() => onModeChange('stem')}
            className="gap-2 h-7 px-3"
          >
            <Disc3 className="w-3 h-3" />
            Stems
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button size="sm" onClick={onPlay} className="gap-2">
              <Play className="w-4 h-4" />
              Play
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onStop} className="gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          )}

          <Button size="sm" variant={isRecording ? 'destructive' : 'outline'} onClick={onRecord} className="gap-2">
            <Circle className={`w-3 h-3 ${isRecording ? 'fill-current' : ''}`} />
            {isRecording ? 'Recording' : 'Record'}
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tempo</label>
          <Input type="number" min="40" max="200" value={tempo} onChange={(e) => onTempoChange(parseInt(e.target.value) || 90)} className="w-20 h-8" />
          <span className="text-xs text-muted-foreground">BPM</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Time</label>
          <Select value={timeSig} onValueChange={onTimeSigChange}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="4/4">4/4</SelectItem>
              <SelectItem value="3/4">3/4</SelectItem>
              <SelectItem value="6/8">6/8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Live Mode Controls */}
        {mode === 'live' && (
          <>
            <Button size="sm" variant="outline" onClick={onAddInstrument} className="gap-2">
              <Plus className="w-4 h-4" />
              Instrument
            </Button>

            <EffectPicker onPick={onPickEffect} />

            <Button size="sm" variant="destructive" onClick={onClearAllEffects} className="gap-2" disabled={!hasActiveInstrument} title={hasActiveInstrument ? "Clear all effects from active instrument" : "Select an instrument first"}>
              <Trash2 className="w-4 h-4" />
              Clear Effects
            </Button>

            <PresetPicker onPick={onPickPreset} disabled={!hasActiveInstrument} />
          </>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {mode === 'live'
            ? 'Press A–L to play active instrument • Alt+Drag to adjust effect intensity'
            : mode === 'song'
            ? 'Upload MP3/WAV to convert to MIDI and play through instruments'
            : 'Upload audio to split into stems'}
        </div>
      </div>
    </div>
  );
}
