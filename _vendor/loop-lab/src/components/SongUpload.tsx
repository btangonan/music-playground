/**
 * SongUpload Component
 *
 * Handles file upload, backend processing, and MIDI result retrieval
 * for the song playback feature.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { MIDIData } from '@/lib/midi-player';

interface SongUploadProps {
  onSongLoaded: (midi: MIDIData, stemUrls: Record<string, string>) => void;
  backendUrl?: string;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    midiUrl: string;
    duration: number;
    tracks: number;
  };
}

export function SongUpload({ onSongLoaded, backendUrl = 'http://localhost:3001' }: SongUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  /**
   * Poll job status until completion or failure
   */
  const pollJobStatus = async (jobId: string): Promise<void> => {
    const maxAttempts = 120; // 4 minutes max (2s interval)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${backendUrl}/api/status/${jobId}`);

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const status: JobStatus = await response.json();

        setProgress(status.progress);

        if (status.status === 'completed') {
          setStatusMessage('Loading MIDI data...');

          // Fetch final result
          const resultResponse = await fetch(`${backendUrl}/api/result/${jobId}`);
          if (!resultResponse.ok) {
            throw new Error('Failed to fetch MIDI result');
          }

          const result = await resultResponse.json();

          setStatusMessage('MIDI loaded successfully!');
          onSongLoaded(result.midi, result.stems);

          toast({
            title: 'Song Loaded',
            description: `${result.midi.tracks.length} tracks ready to play`,
          });

          setIsProcessing(false);
          setProgress(0);
          setStatusMessage('');
          return;
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Processing failed');
        }

        // Update status message based on progress
        if (status.progress < 50) {
          setStatusMessage('Separating stems with Demucs...');
        } else {
          setStatusMessage('Generating MIDI with basic-pitch...');
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

      } catch (error) {
        console.error('[SongUpload] Poll error:', error);
        toast({
          variant: 'destructive',
          title: 'Processing Error',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage('');
        return;
      }
    }

    // Timeout
    toast({
      variant: 'destructive',
      title: 'Processing Timeout',
      description: 'Processing took too long. Please try again with a shorter clip.',
    });
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
  };

  /**
   * Handle file selection and upload
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload an MP3 or WAV file',
      });
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: `File must be less than 100MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Uploading file...');

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${backendUrl}/api/generate`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { jobId, estimatedTime } = await uploadResponse.json();

      console.log('[SongUpload] Job ID:', jobId, 'Estimated time:', estimatedTime, 'seconds');

      toast({
        title: 'Upload Complete',
        description: `Processing... (estimated ${Math.floor(estimatedTime / 60)} minutes)`,
      });

      setStatusMessage('Processing audio...');

      // Start polling for status
      await pollJobStatus(jobId);

    } catch (error) {
      console.error('[SongUpload] Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsProcessing(false);
      setProgress(0);
      setStatusMessage('');
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {!isProcessing ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Audio File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload an MP3 or WAV file to convert to MIDI and play through Loop Lab instruments
              </p>
            </div>

            <div>
              <input
                type="file"
                accept="audio/mp3,audio/wav,audio/mpeg,audio/wave"
                onChange={handleFileUpload}
                className="hidden"
                id="song-upload-input"
              />
              <label htmlFor="song-upload-input">
                <Button asChild className="cursor-pointer">
                  <span>Choose Audio File</span>
                </Button>
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Supported: MP3, WAV (max 100MB)</p>
              <p>Processing time: ~4 minutes for 3-minute song</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{statusMessage}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Demucs: Separating vocals, drums, bass, other (0-50%)</p>
            <p>• basic-pitch: Converting stems to MIDI (50-100%)</p>
            <p className="text-yellow-600">This may take several minutes. Please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
}
