import { useState } from 'react';
import { MidiPlayer } from '@/components/MidiPlayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MidiTest() {
  // Default to the MIDI file in public folder (accessible via Vite dev server)
  const [midiUrl, setMidiUrl] = useState('/test-midi.mid');
  const [activeMidiUrl, setActiveMidiUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleLoadMidi = () => {
    setLoadError(null);
    setActiveMidiUrl(midiUrl);
  };

  const handleLoadError = (error: Error) => {
    setLoadError(error.message);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">MIDI Player Test</h1>
          <p className="text-muted-foreground">
            Test MIDI playback from Demucs stem extraction
          </p>
        </div>

        {/* MIDI URL Input */}
        <Card>
          <CardHeader>
            <CardTitle>Load MIDI File</CardTitle>
            <CardDescription>
              Enter the path or URL to a MIDI file to test playback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="midi-url">MIDI File Path/URL</Label>
              <div className="flex gap-2">
                <Input
                  id="midi-url"
                  value={midiUrl}
                  onChange={(e) => setMidiUrl(e.target.value)}
                  placeholder="/path/to/file.mid or https://..."
                  className="flex-1"
                />
                <Button onClick={handleLoadMidi}>
                  Load
                </Button>
              </div>
            </div>

            {/* Quick Load Presets */}
            <div className="space-y-2">
              <Label>Quick Load</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMidiUrl('/test-midi.mid');
                    setTimeout(() => handleLoadMidi(), 100);
                  }}
                >
                  Demucs Other Track (Local)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMidiUrl('https://tonejs.github.io/examples/assets/midi/bach_846.mid');
                    setTimeout(() => handleLoadMidi(), 100);
                  }}
                >
                  Bach Prelude (Demo)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Load Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* MIDI Player */}
        {activeMidiUrl && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Playback</h2>
            <MidiPlayer
              midiUrl={activeMidiUrl}
              onLoadError={handleLoadError}
            />
          </div>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold">Current Setup</h3>
              <p className="text-muted-foreground">
                The Demucs-generated MIDI file has been copied to <code className="text-xs bg-muted px-1 py-0.5 rounded">/test-midi.mid</code> for easy testing.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Adding More MIDI Files</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Copy MIDI files to the <code className="text-xs bg-muted px-1 py-0.5 rounded">public/</code> folder</li>
                <li>Access them via path: <code className="text-xs bg-muted px-1 py-0.5 rounded">/filename.mid</code></li>
                <li>Example: <code className="text-xs bg-muted px-1 py-0.5 rounded">public/my-song.mid</code> → use <code className="text-xs bg-muted px-1 py-0.5 rounded">/my-song.mid</code></li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">URL Testing</h3>
              <p className="text-muted-foreground">
                You can also test with any publicly accessible MIDI URL. The demo Bach Prelude button loads a sample from Tone.js examples.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
