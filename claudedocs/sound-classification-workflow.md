# Sound Classification Workflow

## Purpose

Map our 16 custom sounds to General MIDI (GM) instruments to improve MIDI file import quality.

Currently, MIDI files don't assign the right instruments because we're using pitch-range mapping instead of GM program semantics. Your listening expertise will create the foundation for intelligent instrument mapping.

---

## Step 1: Launch the App

```bash
cd /Users/bradleytangonan/Desktop/my\ apps/music-playground
pnpm -w -F composer dev
```

Open browser to `http://localhost:5173`

You'll see the icon gallery with **numbered badges (1-16)** in the top-right corner of each icon.

---

## Step 2: Listen to Each Sound

**For each numbered icon (1-16):**

1. **Click the icon** to select it
2. **Click anywhere on the grid** to place and hear the sound
3. **Listen carefully** - what instrument does it remind you of?
4. **Try different pitches** by placing at different vertical positions on the grid
5. **Note the characteristics**:
   - Is it melodic (pitched) or rhythmic (percussive)?
   - Short/staccato or sustained/legato?
   - Bright/sharp or warm/smooth?
   - What real-world instrument is the closest match?

---

## Step 3: Fill Out the CSV

Open `sound-classification.csv` in your preferred editor (Excel, Numbers, VSCode, etc.)

### Columns to Fill:

**`yourListeningNotes`** (Required)
- Describe what instrument this reminds you of
- Include tone quality: bright, warm, metallic, smooth, harsh, etc.
- Note if it changes character at different pitches
- Be honest - "sounds artificial" or "doesn't match any real instrument" is valid

**Example**: "Sounds like a muted trumpet with fast attack, bright and punchy"

---

**`bestMatchingGMPrograms`** (Required)
- List GM program number(s) that best match this sound (see reference below)
- Can be a single number or comma-separated list: `0`, `0,1,2`, `56-63` (range)
- Multiple programs means "any of these would work"

**Example**: `56` (for trumpet), or `0,1,2` (for piano variations)

---

**`bestMatchingGMInstruments`** (Required)
- List GM instrument name(s) matching the program numbers
- Use official GM names from reference below
- Comma-separated if multiple

**Example**: `Trumpet`, or `Acoustic Grand Piano, Bright Acoustic Piano, Electric Grand Piano`

---

**`confidence`** (Required)
- **high**: Very clear match, you're confident this is correct
- **medium**: Reasonable match, but could be debated
- **low**: Uncertain, doesn't match any GM instrument well

**Example**: `high` for obvious drums, `low` for weird synthetic sounds

---

### General MIDI Program Reference

**Copy this or reference [GM Instrument List](https://www.midi.org/specifications-old/item/gm-level-1-sound-set):**

```
PIANO (0-7):
0   Acoustic Grand Piano
1   Bright Acoustic Piano
2   Electric Grand Piano
3   Honky-tonk Piano
4   Electric Piano 1
5   Electric Piano 2
6   Harpsichord
7   Clavinet

CHROMATIC PERCUSSION (8-15):
8   Celesta
9   Glockenspiel
10  Music Box
11  Vibraphone
12  Marimba
13  Xylophone
14  Tubular Bells
15  Dulcimer

ORGAN (16-23):
16  Drawbar Organ
17  Percussive Organ
18  Rock Organ
19  Church Organ
20  Reed Organ
21  Accordion
22  Harmonica
23  Tango Accordion

GUITAR (24-31):
24  Acoustic Guitar (nylon)
25  Acoustic Guitar (steel)
26  Electric Guitar (jazz)
27  Electric Guitar (clean)
28  Electric Guitar (muted)
29  Overdriven Guitar
30  Distortion Guitar
31  Guitar Harmonics

BASS (32-39):
32  Acoustic Bass
33  Electric Bass (finger)
34  Electric Bass (pick)
35  Fretless Bass
36  Slap Bass 1
37  Slap Bass 2
38  Synth Bass 1
39  Synth Bass 2

STRINGS (40-47):
40  Violin
41  Viola
42  Cello
43  Contrabass
44  Tremolo Strings
45  Pizzicato Strings
46  Orchestral Harp
47  Timpani

ENSEMBLE (48-55):
48  String Ensemble 1
49  String Ensemble 2
50  Synth Strings 1
51  Synth Strings 2
52  Choir Aahs
53  Voice Oohs
54  Synth Voice
55  Orchestra Hit

BRASS (56-63):
56  Trumpet
57  Trombone
58  Tuba
59  Muted Trumpet
60  French Horn
61  Brass Section
62  Synth Brass 1
63  Synth Brass 2

REED (64-71):
64  Soprano Sax
65  Alto Sax
66  Tenor Sax
67  Baritone Sax
68  Oboe
69  English Horn
70  Bassoon
71  Clarinet

PIPE (72-79):
72  Piccolo
73  Flute
74  Recorder
75  Pan Flute
76  Blown Bottle
77  Shakuhachi
78  Whistle
79  Ocarina

SYNTH LEAD (80-87):
80  Lead 1 (square)
81  Lead 2 (sawtooth)
82  Lead 3 (calliope)
83  Lead 4 (chiff)
84  Lead 5 (charang)
85  Lead 6 (voice)
86  Lead 7 (fifths)
87  Lead 8 (bass + lead)

SYNTH PAD (88-95):
88  Pad 1 (new age)
89  Pad 2 (warm)
90  Pad 3 (polysynth)
91  Pad 4 (choir)
92  Pad 5 (bowed)
93  Pad 6 (metallic)
94  Pad 7 (halo)
95  Pad 8 (sweep)

SYNTH EFFECTS (96-103):
96  FX 1 (rain)
97  FX 2 (soundtrack)
98  FX 3 (crystal)
99  FX 4 (atmosphere)
100 FX 5 (brightness)
101 FX 6 (goblins)
102 FX 7 (echoes)
103 FX 8 (sci-fi)

ETHNIC (104-111):
104 Sitar
105 Banjo
106 Shamisen
107 Koto
108 Kalimba
109 Bag pipe
110 Fiddle
111 Shanai

PERCUSSIVE (112-119):
112 Tinkle Bell
113 Agogo
114 Steel Drums
115 Woodblock
116 Taiko Drum
117 Melodic Tom
118 Synth Drum
119 Reverse Cymbal

SOUND EFFECTS (120-127):
120 Guitar Fret Noise
121 Breath Noise
122 Seashore
123 Bird Tweet
124 Telephone Ring
125 Helicopter
126 Applause
127 Gunshot
```

**GM Drums (Channel 10):**
- These are mapped by MIDI note number, not program
- Already handled correctly in our system
- Don't worry about drum sounds for this exercise

---

## Step 4: Tips for Classification

### For Melodic Sounds (Synths, Bass, Pads):
- Test at different pitches - does it work better high or low?
- Consider if it's monophonic (one note at a time) or polyphonic (chords)
- Compare to GM synth categories (80-103) for synthetic sounds

### For Percussive Sounds (Drums, FX):
- These may not have GM program equivalents
- Still describe them - helps understand their role
- Can say "GM drums" if it matches standard drum kit

### For Weird FX Sounds:
- It's OK to say "no clear GM match"
- Describe the character anyway
- Note if it's more melodic or rhythmic
- Check FX categories (96-103, 120-127)

### Sound Order (1-16):
1. Lead - MonoSynth sawtooth
2. Impact - Thick pad, James Blake style
3. Sweep - Radiohead/Prophet-5 triangle wave
4. Vocal Chop - Ethereal theremin-like
5. Sub - Deep sub bass, sine wave
6. Wobble - FM bass, modulated
7. Pad - **Grand piano Sampler** (not actually a pad!)
8. Pluck - Sine bass, rich sustained
9. Arp - Square wave, staccato
10. Kick - Bass drum, pitch decay
11. Noise - Brown noise, 300ms decay
12. Snare - White noise, snare character
13. Clap - Pink noise, hand clap
14. Hi-hat - Metallic, 200Hz
15. Glitch - Metallic percussion, 100Hz
16. Riser - White noise, 1.0s attack

---

## Step 5: Return the Completed CSV

**Save the file as `sound-classification-completed.csv`** or just save over the original.

Let me know when it's ready, and I'll:
1. Read your classifications
2. Implement improved `gmProgramToSoundId()` mapping
3. Update MIDI import to use GM program semantics
4. Test with your real MIDI files (Radiohead, Justin Bieber, etc.)

---

## Example Row (Completed):

```csv
number,uiId,soundId,name,category,type,synthType,technicalDescription,yourListeningNotes,bestMatchingGMPrograms,bestMatchingGMInstruments,confidence
7,pad,synth-pad,Pad,synth,melodic,Sampler,"Grand piano Salamander samples, realistic acoustic piano","Sounds exactly like an acoustic grand piano, warm and full-bodied with natural decay","0,1","Acoustic Grand Piano, Bright Acoustic Piano","high"
```

---

## Questions?

**Q: What if a sound doesn't match ANY GM instrument?**
A: That's fine! Note it in `yourListeningNotes` as "synthetic, no GM equivalent" and leave GM columns blank. We'll handle these specially.

**Q: Can one sound match multiple GM programs?**
A: Yes! List them comma-separated: `0,1,2` for piano variations.

**Q: What if I'm not sure?**
A: Set `confidence: low` and give your best guess. We can refine later.

**Q: Should I test with headphones?**
A: Yes, especially for bass sounds (5-6) and subtle differences.

---

## Next Steps After Classification

Once you complete the CSV, I'll:

1. **Parse your classifications** - Extract GM program → soundId mappings
2. **Implement smart mapping** - Create `gmProgramToSoundId()` function:
   ```typescript
   function gmProgramToSoundId(program: number, pitch: number): string {
     // Piano (0-7) → synth-pad (our piano Sampler)
     if (program >= 0 && program <= 7) return 'synth-pad';

     // Bass (32-39) → bass-sub or bass-wobble
     if (program >= 32 && program <= 39) {
       return pitch < 36 ? 'bass-sub' : 'bass-wobble';
     }

     // ... based on your classifications ...
   }
   ```

3. **Update MIDI parser** - Use GM program numbers instead of pitch ranges
4. **Fix time signature** - Extract `midi.header.timeSignatures`
5. **Fix BPM handling** - Handle multiple tempos or warn user
6. **Test with real MIDI** - Validate improvements with your test files

---

## Success Criteria

When this is done, importing MIDI files should:
- ✅ Piano sounds like piano (uses our Sampler)
- ✅ Bass sounds bass-like (uses bass-sub/wobble)
- ✅ Drums route correctly (already working)
- ✅ 3/4 waltzes have correct bar boundaries
- ✅ Tempo detected accurately
- ✅ Melodic vs rhythmic distinction preserved

---

**Ready to start!** Launch the app, listen to the 16 sounds, and fill out the CSV. Take your time - your ears are the ground truth for this mapping.
