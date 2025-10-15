import { useState, useEffect, useRef, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MidiPlayerProps {
  midiUrl: string;
  onLoadError?: (error: Error) => void;
}

export function MidiPlayer({ midiUrl, onLoadError }: MidiPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [midiData, setMidiData] = useState<Midi | null>(null);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partsRef = useRef<Tone.Part[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const { toast } = useToast();

  // Initialize synth
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      }
    }).toDestination();

    // Set reasonable volume
    synthRef.current.volume.value = -6;

    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  // Load and parse MIDI file
  useEffect(() => {
    let mounted = true;

    async function loadMidi() {
      try {
        setIsLoading(true);

        const response = await fetch(midiUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch MIDI file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        if (!mounted) return;

        setMidiData(midi);
        setDuration(midi.duration);

        toast({
          title: 'MIDI Loaded',
          description: `Duration: ${midi.duration.toFixed(2)}s, ${midi.tracks.length} tracks`
        });
      } catch (error) {
        console.error('[MidiPlayer] Load error:', error);
        const err = error instanceof Error ? error : new Error('Unknown error');

        if (mounted) {
          toast({
            title: 'Failed to load MIDI',
            description: err.message,
            variant: 'destructive'
          });
          onLoadError?.(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMidi();

    return () => {
      mounted = false;
    };
  }, [midiUrl, onLoadError, toast]);

  // Create Tone.Part objects from MIDI data
  useEffect(() => {
    if (!midiData || !synthRef.current) return;

    // Dispose existing parts
    partsRef.current.forEach(part => part.dispose());
    partsRef.current = [];

    // Create parts for each track
    midiData.tracks.forEach((track, trackIndex) => {
      if (track.notes.length === 0) return;

      const events = track.notes.map(note => ({
        time: note.time,
        note: note.name,
        duration: note.duration,
        velocity: note.velocity
      }));

      const part = new Tone.Part((time, event) => {
        if (!synthRef.current) return;
        synthRef.current.triggerAttackRelease(
          event.note,
          event.duration,
          time,
          event.velocity
        );
      }, events);

      part.loop = false;
      partsRef.current.push(part);
    });

    console.log(`[MidiPlayer] Created ${partsRef.current.length} parts from ${midiData.tracks.length} tracks`);
  }, [midiData]);

  // Progress animation
  const updateProgress = useCallback(() => {
    if (!isPlaying || !midiData) return;

    const elapsed = Tone.Transport.seconds - startTimeRef.current;
    const progressPercent = Math.min((elapsed / midiData.duration) * 100, 100);

    setProgress(progressPercent);

    if (progressPercent >= 100) {
      handleStop();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, midiData]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  const handlePlay = async () => {
    if (!midiData || partsRef.current.length === 0) {
      toast({
        title: 'Cannot play',
        description: 'MIDI data not loaded',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Initialize audio context
      await Tone.start();

      // If resuming from pause
      if (pausedAtRef.current > 0) {
        startTimeRef.current = Tone.Transport.seconds - pausedAtRef.current;
        partsRef.current.forEach(part => {
          part.start(0, pausedAtRef.current);
        });
      } else {
        // Fresh start
        startTimeRef.current = Tone.Transport.seconds;
        partsRef.current.forEach(part => {
          part.start(0);
        });
      }

      Tone.Transport.start();
      setIsPlaying(true);

      toast({
        title: 'Playback started'
      });
    } catch (error) {
      console.error('[MidiPlayer] Play error:', error);
      toast({
        title: 'Playback failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handlePause = () => {
    pausedAtRef.current = Tone.Transport.seconds - startTimeRef.current;

    Tone.Transport.pause();
    partsRef.current.forEach(part => part.stop());

    setIsPlaying(false);

    toast({
      title: 'Playback paused'
    });
  };

  const handleStop = () => {
    Tone.Transport.stop();
    partsRef.current.forEach(part => part.stop());

    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    setProgress(0);
    setIsPlaying(false);

    toast({
      title: 'Playback stopped'
    });
  };

  const handleSeek = (value: number[]) => {
    if (!midiData) return;

    const newProgress = value[0];
    const seekTime = (newProgress / 100) * midiData.duration;

    const wasPlaying = isPlaying;

    if (wasPlaying) {
      handlePause();
    }

    pausedAtRef.current = seekTime;
    setProgress(newProgress);

    if (wasPlaying) {
      setTimeout(() => handlePlay(), 50);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = (progress / 100) * duration;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          MIDI Player
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Slider */}
        <div className="space-y-2">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            disabled={isLoading || !midiData}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button
              onClick={handlePlay}
              disabled={isLoading || !midiData}
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Play
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              size="sm"
              variant="secondary"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}

          <Button
            onClick={handleStop}
            disabled={!isPlaying && pausedAtRef.current === 0}
            size="sm"
            variant="outline"
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>

        {/* MIDI Info */}
        {midiData && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div>Tracks: {midiData.tracks.length}</div>
            <div>Total Notes: {midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0)}</div>
            <div>Duration: {duration.toFixed(2)}s</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
