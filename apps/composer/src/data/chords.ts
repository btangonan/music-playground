// Chord palette data - 10 chord functions with colors

export interface ChordFunction {
  roman: string
  name: string
  color: string // Tailwind color class
}

export const CHORD_PALETTE: ChordFunction[] = [
  { roman: 'I', name: 'Tonic', color: 'bg-[#CCFF00]' }, // Lime (green-ish)
  { roman: 'ii', name: 'Subdominant', color: 'bg-amber-100' }, // Cream
  { roman: 'iii', name: 'Mediant', color: 'bg-amber-100' }, // Cream
  { roman: 'IV', name: 'Subdominant', color: 'bg-amber-100' }, // Cream
  { roman: 'V', name: 'Dominant', color: 'bg-[#FF62C6]' }, // Pink
  { roman: 'vi', name: 'Submediant', color: 'bg-amber-100' }, // Cream
  { roman: 'bVII', name: 'Subtonic', color: 'bg-purple-300' }, // Purple
  { roman: 'sus', name: 'Suspended', color: 'bg-purple-300' }, // Purple
  { roman: 'dim', name: 'Diminished', color: 'bg-purple-300' }, // Purple
  { roman: '+7', name: 'Augmented 7th', color: 'bg-purple-300' } // Purple
]

export interface ChordPreset {
  name: string
  progression: string[] // Roman numerals for 4-bar pattern
}

export const CHORD_PRESETS: ChordPreset[] = [
  { name: 'Pop', progression: ['I', 'V', 'vi', 'IV'] },
  { name: 'Sad', progression: ['vi', 'IV', 'I', 'V'] },
  { name: 'Chill', progression: ['I', 'iii', 'vi', 'IV'] },
  { name: 'Shoegaze', progression: ['bVII', 'IV', 'I', 'V'] }
]
