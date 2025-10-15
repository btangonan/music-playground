/**
 * SongControls Component
 *
 * Playback controls for MIDI song playback
 * Play/Pause/Stop buttons and seek slider
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square } from 'lucide-react';
import * as Tone from 'tone';

interface SongControlsProps {
  isPlaying: boolean;
  duration: number; // Total duration in seconds
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (position: number) => void;
}

export function SongControls({
  isPlaying,
  duration,
  onPlay,
  onPause,
  onStop,
  onSeek,
}: SongControlsProps) {
  const [position, setPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Update position from Transport every 60fps
  useEffect(() => {
    if (!isPlaying || isSeeking) return;

    const intervalId = setInterval(() => {
      setPosition(Tone.Transport.seconds);

      // Auto-stop when song ends
      if (Tone.Transport.seconds >= duration) {
        onStop();
      }
    }, 1000 / 60); // 60fps

    return () => clearInterval(intervalId);
  }, [isPlaying, isSeeking, duration, onStop]);

  const handleSeekChange = (value: number[]) => {
    const newPosition = value[0];
    setPosition(newPosition);
    setIsSeeking(true);
  };

  const handleSeekCommit = (value: number[]) => {
    const newPosition = value[0];
    onSeek(newPosition);
    setIsSeeking(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Play/Pause/Stop Buttons */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <Button
            onClick={onPlay}
            size="lg"
            className="gap-2"
          >
            <Play className="h-5 w-5" />
            Play Song
          </Button>
        ) : (
          <Button
            onClick={onPause}
            size="lg"
            variant="secondary"
            className="gap-2"
          >
            <Pause className="h-5 w-5" />
            Pause
          </Button>
        )}

        <Button
          onClick={onStop}
          size="lg"
          variant="outline"
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>

      {/* Progress Slider */}
      <div className="space-y-2">
        <Slider
          value={[position]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleSeekChange}
          onValueCommit={handleSeekCommit}
          className="cursor-pointer"
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-muted-foreground">
          {isPlaying ? 'Playing' : 'Stopped'}
        </span>
      </div>
    </div>
  );
}
