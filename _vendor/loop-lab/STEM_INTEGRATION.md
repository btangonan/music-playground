# Stem Separation Integration - Testing Guide

## Overview
UploadAndPlay component has been integrated into loop-lab with a Live/Stem mode toggle.

## What Was Changed

### 1. New Files
- `.env` - Frontend environment variables with backend URL (`VITE_BACKEND_URL`)

### 2. Modified Files
- `src/components/Toolbar.tsx` - Added mode toggle (Live/Stem)
- `src/pages/Index.tsx` - Conditional rendering based on mode

### 3. Features
- **Live Mode** (default): Original MPC pads, instruments, effects interface
- **Stem Mode**: UploadAndPlay component for audio file stem separation
- Shared Tone.js Transport between modes
- Clean mode switching without breaking existing functionality

## Testing Instructions

### Prerequisites
1. Backend server running on `http://localhost:3001` with Demucs endpoint
2. Frontend dev server: `npm run dev`

### Test Cases

#### 1. Mode Switching
- [ ] Application loads in "Live" mode by default
- [ ] Click "Stems" button - UI switches to upload interface
- [ ] Click "Live" button - UI switches back to MPC pads
- [ ] Mode toggle maintains playback state correctly

#### 2. Live Mode (Regression Test)
- [ ] Press A-L keys to play instruments
- [ ] MPC pads still connect to instruments
- [ ] Effects can be added and connected
- [ ] Transport controls (Play/Stop/Record) work
- [ ] Octave shift (Arrow Up/Down) works
- [ ] All existing features intact

#### 3. Stem Mode
- [ ] Click "Upload Audio" button
- [ ] Select MP3 or WAV file (max 100MB)
- [ ] Processing indicator shows "Processing (1-2 min)..."
- [ ] After processing: 4 stems displayed (vocals, drums, bass, other)
- [ ] Play/Pause/Stop controls work
- [ ] Seek bar scrubs through audio
- [ ] Volume sliders control individual stem levels
- [ ] Mute buttons silence individual stems
- [ ] Solo buttons isolate individual stems
- [ ] Position counter updates in real-time

#### 4. Transport Sync
- [ ] Start Transport in Live mode, switch to Stem mode - Transport remains synced
- [ ] Play stems in Stem mode, switch to Live mode - Transport state preserved
- [ ] No audio glitches when switching modes

#### 5. Environment Configuration
- [ ] `.env` exists with `VITE_BACKEND_URL=http://localhost:3001`
- [ ] Backend URL can be changed without code modification
- [ ] Invalid backend URL shows appropriate error toast

## Known Limitations
1. Stem mode and Live mode use separate audio contexts (isolated)
2. Backend must be running separately for stem separation
3. Large files (>100MB) will be rejected
4. Processing time depends on audio length (typically 1-2 minutes)

## Architecture Notes

### Isolation Strategy
- **Live Mode**: Uses existing AudioEngine, MPC pads, effects chains
- **Stem Mode**: Uses standalone Tone.Player instances in UploadAndPlay
- **Shared**: Tone.Transport timeline for both modes
- **Clean Switch**: Conditional rendering prevents conflicts

### File Organization
```
src/
├── components/
│   ├── UploadAndPlay.tsx      # Stem upload/playback component
│   ├── Toolbar.tsx             # Added mode toggle
│   └── ui/slider.tsx           # Used by UploadAndPlay
├── pages/
│   └── Index.tsx               # Mode switching logic
.env                            # Backend URL configuration
```

## Troubleshooting

### Issue: "Processing failed" error
**Solution**: Verify backend is running on port 3001 and Demucs is installed

### Issue: Mode toggle doesn't switch UI
**Solution**: Check browser console for React errors, ensure AppMode type is imported

### Issue: Stems don't play
**Solution**: Check browser console for Tone.js errors, verify audio files are served correctly

### Issue: Environment variable not loading
**Solution**: Restart Vite dev server (`npm run dev`) after creating/editing `.env`

## Next Steps (Optional Enhancements)
1. Add loading state during mode switch
2. Persist mode preference in localStorage
3. Add visual indicator for active mode
4. Allow routing stems through Live mode effects
5. Add waveform visualization for stems
6. Export mixed stems as single audio file
