# MIDI Player Component - Testing Guide

## Overview

A complete MIDI playback component has been created for Loop Lab, enabling playback of MIDI files generated from Demucs stem separation using Tone.js.

## Files Created

### 1. MidiPlayer Component
**Location**: `/src/components/MidiPlayer.tsx`

**Features**:
- Loads and parses MIDI files using @tonejs/midi
- Plays MIDI notes using Tone.js PolySynth
- Full playback controls (Play, Pause, Stop)
- Progress slider with seek functionality
- Displays MIDI info (tracks, notes, duration)
- Error handling with user feedback

**Props**:
```typescript
interface MidiPlayerProps {
  midiUrl: string;              // Path or URL to MIDI file
  onLoadError?: (error: Error) => void;  // Optional error callback
}
```

### 2. Test Page
**Location**: `/src/pages/MidiTest.tsx`

A dedicated test page with:
- MIDI file URL input
- Quick load buttons for local and demo files
- Complete MidiPlayer integration
- Error display alerts
- Testing instructions

**Route**: `http://localhost:8080/midi-test`

### 3. Updated Files
- `package.json` - Added `@tonejs/midi` dependency
- `src/App.tsx` - Added route for `/midi-test`
- `public/test-midi.mid` - Copied Demucs-generated MIDI for testing

## Installation

The required dependency has been installed:

```bash
npm install
```

This adds `@tonejs/midi@^2.0.28` to your dependencies.

## Testing Instructions

### Quick Start (Recommended)

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:8080/midi-test
   ```

3. **Click "Demucs Other Track (Local)"** button to load your generated MIDI file

4. **Test playback controls**:
   - Click Play to start playback
   - Use Pause to pause
   - Click Stop to reset to beginning
   - Drag the progress slider to seek

### Alternative Testing Methods

#### Method 1: Load from Public Folder
The MIDI file has been copied to `public/test-midi.mid` and is accessible at `/test-midi.mid`.

To add more MIDI files:
```bash
cp /path/to/your-file.mid public/my-midi.mid
```

Then use URL: `/my-midi.mid` in the player.

#### Method 2: Load from External URL
Use the "Bach Prelude (Demo)" button to test with a remote MIDI file, or enter any publicly accessible MIDI URL.

#### Method 3: Backend Integration (Future)
For production use, you'll likely want to serve MIDI files through your backend endpoint.

## Component Usage Example

To use the MidiPlayer in your own components:

```tsx
import { MidiPlayer } from '@/components/MidiPlayer';

function MyComponent() {
  return (
    <MidiPlayer
      midiUrl="/test-midi.mid"
      onLoadError={(error) => {
        console.error('MIDI load failed:', error);
      }}
    />
  );
}
```

## Technical Details

### Architecture

1. **MIDI Parsing**: Uses `@tonejs/midi` to parse MIDI files into a structured format
2. **Audio Synthesis**: Uses `Tone.PolySynth` with `Tone.Synth` for multi-voice playback
3. **Scheduling**: Uses `Tone.Part` for precise note scheduling
4. **Transport**: Uses `Tone.Transport` for playback timing

### Playback Flow

```
MIDI File → Fetch → Parse (Midi) → Create Parts → Schedule Notes → PolySynth → Audio Output
```

### Key Features Implemented

- **Smooth seeking**: Pauses, updates position, and resumes if needed
- **Progress tracking**: RAF-based progress updates at 60fps
- **Cleanup**: Proper disposal of Tone.js objects on unmount
- **Error handling**: User-friendly error messages via toast notifications
- **Multi-track support**: Handles multiple MIDI tracks automatically

## Current Test File Details

**File**: `public/test-midi.mid` (Demucs "other" stem)
- **Source**: Generated from Demucs stem separation using basic_pitch
- **Size**: 8.7KB
- **Generated**: October 14, 2025

## Known Limitations

1. **Synth Type**: Currently uses a simple triangle wave synth. Can be customized for different instruments.
2. **Velocity**: Note velocity is preserved but the synth envelope may need tuning.
3. **Timing**: Uses Tone.js Transport which is sample-accurate but may have browser audio latency.
4. **File Size**: No current limit on MIDI file size, but very large files may impact performance.

## Next Steps / Future Enhancements

1. **Backend Integration**: Add endpoint to serve MIDI files from `/tmp/midi-output/`
2. **Synth Selection**: Allow users to choose different instrument sounds
3. **Multi-stem Playback**: Load multiple MIDI files (one per stem) and play synchronized
4. **Visual Piano Roll**: Add visual representation of MIDI notes
5. **Tempo/Pitch Control**: Add playback speed and pitch shift controls
6. **Export**: Add ability to render MIDI to audio file

## Troubleshooting

### MIDI file not loading
- **Check browser console** for fetch errors
- **Verify file path** is correct (remember Vite serves from `/` for public folder)
- **Check CORS** if loading from external URL

### No audio output
- **Check browser audio permissions** - some browsers require user interaction before audio
- **Check volume** - component sets volume to -6dB by default
- **Check Transport** - ensure Tone.Transport is started

### Playback issues
- **Check MIDI file** - ensure it's a valid MIDI file with note events
- **Check browser support** - requires modern browser with Web Audio API

## Development Notes

### Component State Management
- Uses React hooks for state (useState, useEffect, useRef)
- Synth is created once and reused (ref)
- Parts are recreated when MIDI data changes
- Animation frame is properly cleaned up

### Performance Considerations
- Parts are disposed and recreated when MIDI changes (not on every render)
- Progress animation uses RAF for smooth 60fps updates
- Synth is a singleton per component instance

## File Paths Reference

- Component: `src/components/MidiPlayer.tsx`
- Test Page: `src/pages/MidiTest.tsx`
- Route Config: `src/App.tsx`
- Test MIDI: `public/test-midi.mid`
- Source MIDI: `/tmp/midi-output/other_basic_pitch.mid`

## Testing Checklist

- [ ] MIDI file loads without errors
- [ ] Play button starts playback
- [ ] Audio is heard from speakers
- [ ] Pause button pauses playback
- [ ] Stop button resets to beginning
- [ ] Progress slider shows current position
- [ ] Seeking via slider works correctly
- [ ] MIDI info is displayed (tracks, notes, duration)
- [ ] Error handling works (test with invalid URL)
- [ ] Multiple plays work without issues

---

**Status**: Ready for testing
**Last Updated**: October 14, 2025
