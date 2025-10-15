# Spotify→MIDI Execution Plan: Detailed Implementation

## Executive Summary

**Core Challenge**: "How do we even play song?"

**Answer**: Convert MIDI notes to Tone.Part events, create playback controller UI, map MIDI tracks to existing instruments, handle multi-track playback with Transport.

**Architecture**: User uploads MP3/WAV → Backend (Demucs + basic-pitch) → MIDI JSON → Frontend converts to Tone.Part → Playback with existing instrument chains

---

## Phase 1: Understanding the Playback Gap

### Current State Analysis

**What Loop-Lab Has:**
- Keyboard-triggered notes (live performance mode)
- MPC pad loops using `Tone.Part` (16-step sequencer)
- Effect chains per instrument
- Transport-based timing (tempo, time signature)

**What's Missing for Song Playback:**
1. **MIDI Input System** - No way to load external note sequences
2. **Playback Controller** - No play/pause/seek for pre-recorded music
3. **Multi-Track Orchestration** - Current system: 1 active instrument at a time
4. **Track-to-Instrument Mapping** - No UI for assigning MIDI tracks to instruments
5. **Song State Management** - No concept of "loaded song" vs "live performance"

### The Playback Pattern (Already Exists!)

**`audio-engine.ts:122-140` - `createPadLoop()` function:**
```typescript
export function createPadLoop(
  kind: 'keys'|'bass'|'drums'|'pad_gate',
  synth: any,
  steps: boolean[],
  onStep: (index:number)=>void,
  shouldTrigger?: (index:number)=>boolean
) {
  const events = Array.from({length:16}, (_,i)=>({ time: `${i}*8n`, index:i }));
  const part = new Tone.Part((time, ev:any) => {
    onStep(ev.index);
    const ok = shouldTrigger ? shouldTrigger(ev.index) : true;
    if (ok && steps[ev.index]) {
      const defaultNote = kind === 'bass' ? 'C2' : (kind === 'keys' || kind === 'pad_gate' ? 'C4' : 'kick');
      trigger(kind, synth, defaultNote, time);
    }
  }, events);
  part.loop = true;
  part.loopEnd = '2m'; // 16 * 8n
  return part;
}
```

**Key Insight**: This pattern can be adapted for MIDI playback!

---

## Phase 2: MIDI→Tone.Part Conversion System

### MIDI Data Structure (from basic-pitch)

```typescript
interface MIDINote {
  pitch: number;        // MIDI note number (60 = C4)
  start_time: number;   // Seconds
  end_time: number;     // Seconds
  velocity: number;     // 0-127
  confidence: number;   // 0-1 (basic-pitch quality estimate)
}

interface MIDITrack {
  instrument: string;   // "piano", "bass", "drums", "other"
  notes: MIDINote[];
  track_id: number;
}

interface MIDIData {
  tracks: MIDITrack[];
  duration: number;     // Total song length in seconds
  tempo: number;        // BPM estimate
  time_signature: string; // "4/4"
}
```

### Conversion Function Design

**`src/lib/midi-player.ts` (NEW FILE)**

```typescript
import * as Tone from 'tone';
import { InstrumentConfig } from './audio-engine';

/**
 * Convert MIDI note number to Tone.js note string
 * @example midiToNote(60) → "C4"
 */
export function midiToNote(midiNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = noteNames[midiNumber % 12];
  return `${noteName}${octave}`;
}

/**
 * Convert MIDI notes to Tone.Part-compatible events
 */
export function midiNotesToTonePart(
  notes: MIDINote[],
  instrument: InstrumentConfig,
  filterLowConfidence: boolean = true
): Tone.Part {
  // Filter out low-confidence notes (< 0.5) if enabled
  const filteredNotes = filterLowConfidence
    ? notes.filter(n => n.confidence >= 0.5)
    : notes;

  // Convert MIDI notes to Tone.Part events
  const events = filteredNotes.map(note => ({
    time: note.start_time,        // Absolute time in seconds
    pitch: midiToNote(note.pitch), // Convert MIDI number to note string
    duration: note.end_time - note.start_time, // Note length
    velocity: note.velocity / 127  // Normalize 0-1
  }));

  // Create Tone.Part with callback
  const part = new Tone.Part((time, event: any) => {
    // Trigger note with velocity-scaled duration
    const duration = Tone.Time(event.duration).toNotation(); // Convert seconds to musical notation

    if (instrument.kind === 'drums') {
      // For drums, use drum sample based on pitch range
      const drumSound = event.pitch < 50 ? 'kick' : (event.pitch < 70 ? 'snare' : 'hihat');
      instrument.play(drumSound, undefined, time);
    } else {
      // For melodic instruments, use pitch and duration
      instrument.play(event.pitch, duration, time);
    }
  }, events);

  // Do NOT loop - this is a one-shot song playback
  part.loop = false;

  return part;
}

/**
 * Create multiple Tone.Parts for multi-track MIDI playback
 */
export function createMIDIPlayback(
  midiData: MIDIData,
  trackInstrumentMap: Map<number, InstrumentConfig>
): {
  parts: Tone.Part[];
  duration: number;
  start: () => void;
  stop: () => void;
  dispose: () => void;
} {
  const parts: Tone.Part[] = [];

  // Create a Part for each MIDI track assigned to an instrument
  for (const track of midiData.tracks) {
    const instrument = trackInstrumentMap.get(track.track_id);
    if (!instrument) continue; // Skip unmapped tracks

    const part = midiNotesToTonePart(track.notes, instrument);
    parts.push(part);
  }

  return {
    parts,
    duration: midiData.duration,
    start: () => {
      parts.forEach(part => part.start(0)); // Start all parts at Transport time 0
      Tone.Transport.start();
    },
    stop: () => {
      Tone.Transport.stop();
      Tone.Transport.position = 0; // Reset to beginning
    },
    dispose: () => {
      parts.forEach(part => part.dispose());
    }
  };
}
```

### Adaptive Shimmer Integration

**Critical**: Apply adaptive pitch shift to MIDI notes just like keyboard input!

```typescript
// In midiNotesToTonePart callback, before triggering note:
import { adaptiveShimmerForFreq } from './pitch-shift-rules';
import { applyEffectParams } from './effect-param-mapper';

const part = new Tone.Part((time, event: any) => {
  // Apply adaptive shimmer before triggering (same pattern as Index.tsx:276-295)
  if (instrument.kind !== 'drums') {
    const freqHz = Tone.Frequency(event.pitch).toFrequency();
    const { semitones, wetScale } = adaptiveShimmerForFreq(freqHz);

    // Apply to all shimmer effects in instrument's chain
    for (const fx of instrument.effects) {
      if (fx.type === 'shimmer') {
        applyEffectParams(fx.config, { pitchShift: semitones });
        if (wetScale) {
          applyEffectParams(fx.config, { wet: wetScale });
        }
      }
    }
  }

  // Then trigger note
  instrument.play(event.pitch, event.duration, time);
}, events);
```

---

## Phase 3: UI/UX Design

### Song Playback Mode (New State)

**`src/pages/Index.tsx` - New State:**
```typescript
const [playbackMode, setPlaybackMode] = useState<'live' | 'song'>('live');
const [loadedSong, setLoadedSong] = useState<MIDIData | null>(null);
const [trackMapping, setTrackMapping] = useState<Map<number, string>>(new Map());
const [songPosition, setSongPosition] = useState(0); // Current playback position in seconds
```

### UI Components Needed

#### 1. **Song Upload Panel** (`src/components/SongUpload.tsx` - NEW)

```tsx
interface SongUploadProps {
  onSongLoaded: (midiData: MIDIData) => void;
  isProcessing: boolean;
}

export function SongUpload({ onSongLoaded, isProcessing }: SongUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    // Upload to backend
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData
    });

    const { jobId, estimatedTime } = await response.json();

    // Poll for results
    const result = await pollJobStatus(jobId, (progress) => {
      setUploadProgress(progress);
    });

    onSongLoaded(result.midi);
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-6">
      {isProcessing ? (
        <div>
          <Progress value={uploadProgress} />
          <p>Processing audio... {uploadProgress}%</p>
        </div>
      ) : (
        <input type="file" accept="audio/mp3,audio/wav" onChange={handleFileUpload} />
      )}
    </div>
  );
}
```

#### 2. **Track Mapper** (`src/components/TrackMapper.tsx` - NEW)

```tsx
interface TrackMapperProps {
  tracks: MIDITrack[];
  instruments: Instrument[];
  mapping: Map<number, string>; // track_id → instrument_id
  onMappingChange: (mapping: Map<number, string>) => void;
}

export function TrackMapper({ tracks, instruments, mapping, onMappingChange }: TrackMapperProps) {
  return (
    <div className="space-y-2">
      <h3>Map MIDI Tracks to Instruments</h3>
      {tracks.map(track => (
        <div key={track.track_id} className="flex items-center gap-2">
          <span>Track {track.track_id}: {track.instrument}</span>
          <select
            value={mapping.get(track.track_id) || ''}
            onChange={(e) => {
              const newMapping = new Map(mapping);
              newMapping.set(track.track_id, e.target.value);
              onMappingChange(newMapping);
            }}
          >
            <option value="">None</option>
            {instruments.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.kind.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
```

#### 3. **Song Playback Controls** (`src/components/SongControls.tsx` - NEW)

```tsx
interface SongControlsProps {
  isPlaying: boolean;
  duration: number;
  position: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
}

export function SongControls({ isPlaying, duration, position, onPlay, onPause, onSeek }: SongControlsProps) {
  return (
    <div className="bg-card p-4 rounded-lg space-y-2">
      {/* Play/Pause */}
      <div className="flex gap-2">
        {isPlaying ? (
          <Button onClick={onPause}>⏸ Pause</Button>
        ) : (
          <Button onClick={onPlay}>▶️ Play Song</Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration}
          value={position}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

#### 4. **Mode Toggle** (Add to Toolbar)

```tsx
// In Toolbar.tsx
<div className="flex gap-2">
  <Button
    variant={playbackMode === 'live' ? 'default' : 'outline'}
    onClick={() => setPlaybackMode('live')}
  >
    🎹 Live Mode
  </Button>
  <Button
    variant={playbackMode === 'song' ? 'default' : 'outline'}
    onClick={() => setPlaybackMode('song')}
  >
    🎵 Song Mode
  </Button>
</div>
```

---

## Phase 4: Backend API Contract

### Endpoint: POST /api/generate

**Request:**
```typescript
multipart/form-data {
  file: File (MP3/WAV, max 100MB)
}
```

**Response:**
```typescript
{
  jobId: string,           // UUID for polling
  estimatedTime: number    // Seconds (60-100s)
}
```

### Endpoint: GET /api/status/:jobId

**Response:**
```typescript
{
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,        // 0-100
  message: string,
  result?: {
    midiUrl: string,       // Download link for MIDI JSON
    metadata: {
      duration: number,
      tempo: number,
      tracks: number
    }
  }
}
```

### Endpoint: GET /api/result/:jobId

**Response:**
```typescript
{
  midi: MIDIData,          // Full MIDI JSON structure
  stems: {
    vocals: string,        // Optional: audio URL
    drums: string,
    bass: string,
    other: string
  },
  metadata: {
    duration: number,
    tempo: number,
    time_signature: string,
    track_count: number
  }
}
```

---

## Phase 5: Implementation Roadmap

### Week 1: Core MIDI Playback (Frontend Only)

**Goal**: Prove MIDI→Tone.Part conversion works with mock data

**Tasks:**
1. Create `src/lib/midi-player.ts` with conversion functions
2. Add mock MIDI data for testing (simple melody)
3. Implement `SongControls` component
4. Test single-track playback with existing keyboard instrument
5. Verify adaptive shimmer applies to MIDI notes

**Success Criteria:**
- Mock MIDI file plays through existing instrument
- Play/pause/seek controls work
- Adaptive shimmer prevents high-frequency dissonance
- No Transport timing issues

### Week 2: Multi-Track & UI

**Goal**: Handle multiple MIDI tracks simultaneously

**Tasks:**
1. Implement `TrackMapper` component
2. Create multi-track playback orchestration
3. Add `SongUpload` component (UI only, mock backend)
4. Add mode toggle (Live vs Song)
5. Implement progress bar with Transport position tracking

**Success Criteria:**
- 3+ MIDI tracks play simultaneously
- Each track routes to correct instrument
- Effect chains apply per-instrument
- UI shows clear track→instrument mapping

### Week 3: Backend Integration (MVP)

**Goal**: Real audio→MIDI conversion pipeline

**Tasks:**
1. Set up Express + Bull + Redis backend
2. Implement Python worker (Demucs + basic-pitch)
3. Create `/api/generate`, `/api/status`, `/api/result` endpoints
4. Implement frontend polling logic
5. Add error handling and retry logic

**Success Criteria:**
- User uploads MP3 → receives MIDI JSON
- Processing completes in 60-100s
- Failed jobs show clear error messages
- Results cached for 24h

### Week 4: Polish & Edge Cases

**Goal**: Production-ready MVP

**Tasks:**
1. Add confidence filtering UI (slider: 0.3-0.9)
2. Implement polyphony limiting (max 32 concurrent notes)
3. Add visual waveform display for uploaded audio
4. Implement "Export MIDI" feature (download .mid file)
5. Add keyboard shortcuts (Space = play/pause, Arrow keys = seek)
6. Error recovery: retry failed processing, handle timeout

**Success Criteria:**
- 90%+ successful conversions
- Clear error messages for failures
- Export works for all browsers
- No memory leaks during long sessions

---

## Phase 6: Advanced Features (Post-MVP)

### A. Stem-Specific Playback

**Feature**: Play only vocals, drums, bass, or "other" stem

**Implementation:**
- Add stem selector in UI
- Filter MIDI tracks by basic-pitch's instrument classification
- Solo/mute controls per stem

### B. MIDI Editing

**Feature**: Edit note timing, pitch, velocity in UI

**Implementation:**
- Piano roll visualization
- Click to add/remove notes
- Drag to adjust timing/pitch
- Export edited MIDI

### C. Loop Regions

**Feature**: Loop specific sections of song

**Implementation:**
- Drag to select loop region
- Transport loops between start/end markers
- Useful for practice/remixing

### D. Tempo/Pitch Shift

**Feature**: Change song tempo without pitch change (and vice versa)

**Implementation:**
- Tone.js time-stretching (already supported via Transport.bpm)
- Pitch shift all MIDI notes by N semitones

---

## Critical Design Decisions

### 1. **Transport vs Manual Scheduling**

**Decision**: Use `Tone.Transport` (already in use for MPC pads)

**Rationale:**
- Consistent with existing architecture
- Supports tempo changes
- Built-in looping/seeking
- Synchronizes multiple Parts automatically

**Alternative Rejected**: Manual `Tone.now()` scheduling
- Would require custom timing logic
- Harder to implement seek/pause
- Incompatible with existing MPC pad system

### 2. **Live Mode vs Song Mode**

**Decision**: Two distinct modes with toggle

**Rationale:**
- Clear separation of concerns
- Prevents accidental keyboard triggers during playback
- Allows different UI layouts per mode

**Alternative Rejected**: Hybrid mode (keyboard + song)
- Confusing UX (which sound is from keyboard vs MIDI?)
- Difficult to implement recording of hybrid sessions
- Unclear how octave shift affects MIDI notes

### 3. **Track Mapping Strategy**

**Decision**: Manual user mapping (not automatic)

**Rationale:**
- User knows best what instrument fits each track
- Automatic mapping unreliable (basic-pitch instrument classification ~70% accurate)
- Allows creative remixing (map piano track to bass instrument)

**Alternative Rejected**: Automatic mapping by instrument type
- High error rate
- No user control
- Difficult to override bad mappings

### 4. **Polyphony Handling**

**Decision**: Reduce to top 32 notes by velocity when >32 concurrent

**Rationale:**
- Loop-lab instruments max polyphony: 32 (configurable in Tone.PolySynth)
- Prevents note dropping (silent failures)
- Maintains most important notes (highest velocity)

**Alternative Rejected**: Increase polyphony to 64+
- Higher CPU usage
- Diminishing returns (human can't perceive >32 simultaneous notes in most music)
- Risk of performance degradation

### 5. **Caching Strategy**

**Decision**: Cache MIDI results for 24h, stems for 1h

**Rationale:**
- MIDI JSON is tiny (~100KB), cheap to cache long-term
- Audio stems are large (~50MB), expensive to store
- 24h allows re-uploads without reprocessing
- 1h stems cache for immediate re-downloads

**Alternative Rejected**: No caching
- Wastes compute (same song processed multiple times)
- Poor UX (2min wait every time)
- Higher costs

---

## Edge Cases & Error Handling

### 1. **Empty MIDI Output**

**Scenario**: basic-pitch returns 0 notes (silence, noise, or speech)

**Handling:**
- Show warning: "No musical content detected. Try a different file."
- Allow user to adjust confidence threshold (lower = more notes, more false positives)
- Suggest uploading instrumental music (not podcasts/speech)

### 2. **Extreme Polyphony (>100 concurrent notes)**

**Scenario**: Dense orchestral music or MIDI explosion

**Handling:**
- Reduce to top 32 notes by velocity
- Show warning: "Dense music detected. Reduced to 32 notes for performance."
- Offer "Export Full MIDI" option (download all notes, play elsewhere)

### 3. **Processing Timeout (>120s)**

**Scenario**: Very long song (>10min) or slow GPU

**Handling:**
- Cancel job after 120s
- Suggest: "Try a shorter clip (first 3 minutes)"
- Offer retry with Spleeter (faster, lower quality)

### 4. **Unsupported File Format**

**Scenario**: User uploads .flac, .ogg, .aac

**Handling:**
- Reject with error: "Only MP3/WAV supported"
- Show supported formats in upload UI
- Consider adding ffmpeg conversion in backend (future)

### 5. **File Size Limit (>100MB)**

**Scenario**: High-quality WAV or long song

**Handling:**
- Reject with error: "File too large (max 100MB)"
- Suggest: "Try converting to MP3 or trimming to first 3 minutes"
- Show current file size in upload UI

---

## Performance Considerations

### Frontend

**Memory:**
- MIDI JSON: ~100KB per song (negligible)
- Tone.Part events: ~1KB per 100 notes (negligible)
- **Risk**: Long songs (>1000 notes) create large Parts
- **Mitigation**: Chunk into smaller Parts, dispose when not in use

**CPU:**
- MIDI playback: Minimal overhead (Tone.js handles scheduling)
- **Risk**: >32 concurrent notes cause audio glitches
- **Mitigation**: Polyphony limiting, warn user

### Backend

**Memory:**
- Demucs: ~4GB RAM per job (GPU) or ~8GB (CPU)
- basic-pitch: ~2GB RAM
- **Risk**: Multiple concurrent jobs OOM crash
- **Mitigation**: Queue system (Bull), max 1 concurrent job for MVP

**Disk:**
- Audio stems: ~50MB per job
- MIDI JSON: ~100KB per job
- **Risk**: Disk fills up with cached files
- **Mitigation**: TTL cleanup (1h stems, 24h MIDI), LRU eviction

---

## Testing Strategy

### Unit Tests

**`midi-player.test.ts`:**
```typescript
describe('midiToNote', () => {
  it('converts MIDI 60 to C4', () => {
    expect(midiToNote(60)).toBe('C4');
  });

  it('converts MIDI 21 to A0', () => {
    expect(midiToNote(21)).toBe('A0');
  });
});

describe('midiNotesToTonePart', () => {
  it('creates Tone.Part with correct event count', () => {
    const notes: MIDINote[] = [
      { pitch: 60, start_time: 0, end_time: 1, velocity: 100, confidence: 0.9 },
      { pitch: 64, start_time: 1, end_time: 2, velocity: 80, confidence: 0.8 }
    ];
    const part = midiNotesToTonePart(notes, mockInstrument);
    expect(part._events.length).toBe(2);
  });

  it('filters low-confidence notes', () => {
    const notes: MIDINote[] = [
      { pitch: 60, start_time: 0, end_time: 1, velocity: 100, confidence: 0.9 },
      { pitch: 64, start_time: 1, end_time: 2, velocity: 80, confidence: 0.3 } // Low confidence
    ];
    const part = midiNotesToTonePart(notes, mockInstrument, true);
    expect(part._events.length).toBe(1); // Only high-confidence note
  });
});
```

### Integration Tests

**`song-playback.test.ts`:**
```typescript
describe('Song Playback', () => {
  it('plays multi-track MIDI through instruments', async () => {
    const midiData = loadMockMIDI('simple-song.json');
    const mapping = new Map([[0, 'keys-inst-id'], [1, 'bass-inst-id']]);
    const playback = createMIDIPlayback(midiData, mapping);

    playback.start();
    await waitForTransport(midiData.duration);

    expect(Tone.Transport.state).toBe('stopped'); // Finished playing
  });
});
```

### E2E Tests (Playwright)

**`midi-upload.spec.ts`:**
```typescript
test('user uploads MP3 and plays MIDI', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Switch to Song mode
  await page.click('text=🎵 Song Mode');

  // Upload file
  await page.setInputFiles('input[type="file"]', 'test-audio.mp3');

  // Wait for processing
  await page.waitForSelector('text=Processing complete', { timeout: 120000 });

  // Map tracks
  await page.selectOption('select >> nth=0', 'keys-inst-id');

  // Play song
  await page.click('text=▶️ Play Song');

  // Verify playback
  await page.waitForSelector('text=⏸ Pause'); // Play button changed to Pause
});
```

---

## Success Metrics

### MVP Launch (Week 3)

- [ ] 90%+ upload success rate
- [ ] <100s average processing time
- [ ] 0 crashes during playback
- [ ] 5+ test users successfully play uploaded songs
- [ ] Adaptive shimmer prevents dissonance in MIDI playback

### Post-MVP (Week 8)

- [ ] 95%+ upload success rate
- [ ] <60s average processing time (GPU optimization)
- [ ] MIDI editing feature used by 50%+ users
- [ ] Export MIDI feature used by 30%+ users
- [ ] <5% polyphony-related complaints

---

## Dependencies

### NPM Packages (Frontend)

```json
{
  "dependencies": {
    "tone": "^14.7.77",  // Already installed
    "react": "^18.x",    // Already installed
    // No new dependencies needed for MVP!
  }
}
```

### Python Packages (Backend)

```python
# requirements.txt
demucs==4.0.1
basic-pitch==0.2.5
torch==2.0.1
torchaudio==2.0.2
numpy==1.24.3
scipy==1.10.1
```

### Infrastructure

- **Redis**: For Bull queue (Docker or AWS ElastiCache)
- **Node.js 18+**: For Express backend
- **Python 3.9+**: For Demucs/basic-pitch workers
- **Storage**: S3 or local disk for caching

---

## Risk Assessment

### HIGH RISK

1. **Processing Latency (60-100s)**
   - **Risk**: Users abandon during processing
   - **Mitigation**: Clear progress bar, accurate time estimates, allow browsing while processing

2. **MIDI Quality**
   - **Risk**: basic-pitch transcription errors (wrong notes, missing notes)
   - **Mitigation**: Confidence filtering, manual editing (post-MVP), clear expectations ("This is a sketch, not perfect transcription")

### MEDIUM RISK

1. **Multi-Track Sync**
   - **Risk**: Tracks drift out of sync during playback
   - **Mitigation**: Use Transport for all Parts (automatic sync), test with long songs (>5min)

2. **Backend Scalability**
   - **Risk**: Multiple users overwhelm single worker
   - **Mitigation**: Start with 1 worker, scale to 3 based on demand, add queue wait time estimates

### LOW RISK

1. **Browser Compatibility**
   - **Risk**: Tone.js issues in Safari/Firefox
   - **Mitigation**: Already tested with existing features, minimal new Tone.js usage

2. **File Upload Size**
   - **Risk**: 100MB uploads slow on poor connections
   - **Mitigation**: Show upload progress, allow cancellation, suggest MP3 compression

---

## Open Questions for User

1. **Auto-play after processing?**
   - Option A: Automatically start playing after MIDI loads
   - Option B: User must click Play button manually
   - **Recommendation**: Option B (less surprising, gives user control)

2. **Default track mapping?**
   - Option A: Auto-assign first N tracks to first N instruments
   - Option B: User must map all tracks manually before playing
   - **Recommendation**: Option A for speed, but allow manual override

3. **Stem audio playback?**
   - Option A: Play original audio + MIDI simultaneously
   - Option B: MIDI-only playback (silent stems)
   - **Recommendation**: Option B for MVP (simpler), Option A post-MVP

4. **Recording MIDI playback?**
   - Option A: Allow recording MIDI playback with effects (like live performance)
   - Option B: MIDI playback not recordable
   - **Recommendation**: Option A (reuse existing recording infrastructure)

5. **Keyboard input during Song mode?**
   - Option A: Disable keyboard (song-only)
   - Option B: Allow keyboard overdubs on top of MIDI playback
   - **Recommendation**: Option A for MVP (simpler UX), Option B post-MVP for jamming

---

## Next Steps

1. **User Decision**: Review this plan, answer open questions, approve/modify approach
2. **Create GitHub Issue**: Break down Week 1 tasks into individual tickets
3. **Set Up Backend Repo**: Decide on monorepo vs separate backend repo
4. **Mock Data Creation**: Create 3 test MIDI files (simple, medium, complex)
5. **Begin Week 1**: Start with `midi-player.ts` implementation

---

**Document Status**: Ready for review
**Last Updated**: 2025-10-14
**Next Review**: After user feedback
