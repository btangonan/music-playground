// 16 kawaii sound icons - flat 2D pixel style inspired by reference image
// Bold outlines, simple shapes, 2-3 colors, recognizable at 40×40px

export const LeadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M8 20 Q12 12, 20 20 Q28 28, 32 20"
      stroke="#FF62C6" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="26" cy="14" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
  </svg>
);

export const PadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Piano icon - lunar eclipse style with black circle overtaking white circle */}
    {/* White circle (moon) */}
    <circle
      cx="18.5"
      cy="20"
      r="9.5"
      fill="white"
      stroke="#000"
      strokeWidth="2"
    />

    {/* Black circle (eclipse shadow) - offset to create crescent, same diameter */}
    <circle
      cx="23"
      cy="20"
      r="9.5"
      fill="#000"
    />

    {/* Re-draw the outline over the eclipse for clean edges */}
    <circle
      cx="18.5"
      cy="20"
      r="9.5"
      fill="none"
      stroke="#000"
      strokeWidth="2"
    />
  </svg>
);

export const PluckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Abstract orbital/circular pattern - radial synth */}
    {/* Outer ring */}
    <circle cx="20" cy="20" r="14" fill="none" stroke="#00FFD9" strokeWidth="2.5"/>

    {/* Inner ring */}
    <circle cx="20" cy="20" r="9" fill="none" stroke="#00D9FF" strokeWidth="2.5"/>

    {/* Center circle */}
    <circle cx="20" cy="20" r="4" fill="#FFFFFF" stroke="#000" strokeWidth="2.5"/>

    {/* Orbital dots */}
    <circle cx="20" cy="6" r="2.5" fill="#FFD11A" stroke="#000" strokeWidth="1.5"/>
    <circle cx="34" cy="20" r="2.5" fill="#FF62C6" stroke="#000" strokeWidth="1.5"/>
    <circle cx="6" cy="20" r="2.5" fill="#CCFF00" stroke="#000" strokeWidth="1.5"/>

  </svg>
);

export const ArpIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="10" cy="26" r="4" fill="#FF62C6" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="4" fill="#E0B0FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="30" cy="14" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <path d="M13 24 L17 22 M23 18 L27 16"
      stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const KickIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="9" fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M9 20 L5 20 M35 20 L31 20 M20 9 L20 5 M20 31 L20 35"
      stroke="#000" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="4" fill="#000" opacity="0.2"/>
  </svg>
);

export const SnareIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Abstract sound burst - futuristic snare/clap */}
    {/* Center hexagon */}
    <path d="M20 10 L28 15 L28 25 L20 30 L12 25 L12 15 Z"
      fill="#CCFF00" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>

    {/* Radiating lines */}
    <path d="M20 6 L20 10" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 12 L28 15" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M34 20 L28 20" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 28 L28 25" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M20 34 L20 30" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M8 28 L12 25" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M6 20 L12 20" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M8 12 L12 15" stroke="#FFD11A" strokeWidth="2.5" strokeLinecap="round"/>

  </svg>
);

export const HiHatIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="13" rx="10" ry="4" fill="#D0D0D0" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="19" rx="10" ry="4" fill="#A8A8A8" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="25" rx="10" ry="4" fill="#808080" stroke="#000" strokeWidth="2.5"/>
  </svg>
);

export const ClapIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M10 20 Q10 12, 14 10 L16 16 L12 24 Z"
      fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M30 20 Q30 12, 26 10 L24 16 L28 24 Z"
      fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <circle cx="15" cy="26" r="2" fill="#FFD11A"/>
    <circle cx="20" cy="27" r="2" fill="#FFD11A"/>
    <circle cx="25" cy="26" r="2" fill="#FFD11A"/>
  </svg>
);

export const SubBassIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Abstract concentric rounded squares - futuristic pad */}
    <rect x="8" y="8" width="24" height="24" rx="4" fill="none" stroke="#E0B0FF" strokeWidth="2.5"/>
    <rect x="12" y="12" width="16" height="16" rx="3" fill="none" stroke="#CDB3FF" strokeWidth="2.5"/>
    <rect x="16" y="16" width="8" height="8" rx="2" fill="#9945FF" stroke="#000" strokeWidth="2.5"/>

    {/* Corner glow dots */}
    <circle cx="10" cy="10" r="2" fill="#FFD11A"/>
    <circle cx="30" cy="30" r="2" fill="#FFD11A"/>
  </svg>
);

export const WobbleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Futuristic flowing curves */}
    <path d="M8 14 Q14 8, 20 14 T32 14"
      stroke="#7AB800" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M8 20 Q14 26, 20 20 T32 20"
      stroke="#FF9900" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M8 26 Q14 20, 20 26 T32 26"
      stroke="#7AB800" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="3" fill="#000"/>
  </svg>
);

export const RiserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="12" width="3" height="3" fill="#808080"/>
    <rect x="14" y="9" width="3" height="3" fill="#606060"/>
    <rect x="20" y="14" width="3" height="3" fill="#A0A0A0"/>
    <rect x="26" y="8" width="3" height="3" fill="#707070"/>
    <rect x="32" y="12" width="3" height="3" fill="#909090"/>
    <rect x="10" y="20" width="3" height="3" fill="#707070"/>
    <rect x="16" y="18" width="3" height="3" fill="#A0A0A0"/>
    <rect x="22" y="22" width="3" height="3" fill="#606060"/>
    <rect x="28" y="20" width="3" height="3" fill="#808080"/>
    <rect x="34" y="18" width="3" height="3" fill="#909090"/>
    <rect x="12" y="28" width="3" height="3" fill="#808080"/>
    <rect x="18" y="26" width="3" height="3" fill="#A0A0A0"/>
    <rect x="24" y="30" width="3" height="3" fill="#707070"/>
    <rect x="30" y="28" width="3" height="3" fill="#606060"/>
  </svg>
);

export const ImpactIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M20 6 L22 18 L34 20 L22 22 L20 34 L18 22 L6 20 L18 18 Z"
      fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="5" fill="#CDB3FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="2.5" fill="#fff"/>
  </svg>
);

export const SweepIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M6 28 Q16 8, 34 18"
      stroke="#CDB3FF" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M6 28 Q16 8, 34 18"
      stroke="#E0B0FF" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="34" cy="18" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
  </svg>
);

export const GlitchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Abstract crystal/gem - futuristic geometric */}
    {/* Top triangle */}
    <path d="M20 6 L30 18 L20 14 Z" fill="#FF62C6" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>
    <path d="M20 6 L10 18 L20 14 Z" fill="#E0B0FF" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>

    {/* Middle section */}
    <path d="M10 18 L20 14 L30 18 L20 32 Z" fill="#CDB3FF" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>

    {/* Inner facets */}
    <path d="M20 14 L20 32" stroke="#000" strokeWidth="1.5"/>
    <path d="M10 18 L20 32 L30 18" stroke="#000" strokeWidth="1.5" fill="none"/>

    {/* Highlight dots */}
    <circle cx="20" cy="10" r="1.5" fill="#FFFFFF"/>
    <circle cx="16" cy="20" r="1.5" fill="#FFFFFF"/>
  </svg>
);

export const VocalChopIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="24" rx="10" ry="8" fill="#CDB3FF" stroke="#000" strokeWidth="2.5"/>
    <path d="M14 24 Q20 29, 26 24" stroke="#000" strokeWidth="2.5" fill="white"/>
    <path d="M6 10 Q12 6, 18 10 T30 10 T38 10"
      stroke="#E0B0FF" strokeWidth="2.5" fill="none"/>
  </svg>
);

export const NoiseIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M20 32 L20 8 L15 13 M20 8 L25 13"
      stroke="#CDB3FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="8" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
  </svg>
);

export const SOUND_ICONS = [
  { id: 'lead', name: 'Round', category: 'synths', categoryLabel: '🎹 Synths', icon: LeadSynthIcon, color: '#FF62C6' }, // Pink stroke - soft not bright, very round
  { id: 'impact', name: 'Saw', category: 'fx', categoryLabel: '✨ FX', icon: ImpactIcon, color: '#FFD11A' }, // Yellow star - serrated knife sound, harsh
  { id: 'sweep', name: 'Warm', category: 'fx', categoryLabel: '✨ FX', icon: SweepIcon, color: '#CDB3FF' }, // Purple curve - round and warm like plastic tube
  { id: 'vocal', name: 'Bell', category: 'fx', categoryLabel: '✨ FX', icon: VocalChopIcon, color: '#CDB3FF' }, // Purple ellipse - really wide, like a bell
  { id: 'sub', name: 'Sub', category: 'bass', categoryLabel: '🔊 Bass', icon: SubBassIcon, color: '#9945FF' }, // Purple center square - bass with slight pluck
  { id: 'wobble', name: 'Bass', category: 'bass', categoryLabel: '🔊 Bass', icon: WobbleIcon, color: '#7AB800' }, // Green curves - synth bass
  { id: 'pad', name: 'Piano', category: 'synths', categoryLabel: '🎹 Synths', icon: PadSynthIcon, color: '#000000' }, // Black lunar eclipse - grand piano
  { id: 'pluck', name: 'Sine', category: 'synths', categoryLabel: '🎹 Synths', icon: PluckIcon, color: '#00FFD9' }, // Cyan circles - clean sine tone
  { id: 'arp', name: '8-bit', category: 'synths', categoryLabel: '🎹 Synths', icon: ArpIcon, color: '#FFD11A' }, // Yellow top circle - video game synth

  { id: 'kick', name: 'Kick', category: 'drums', categoryLabel: '🥁 Drums', icon: KickIcon, color: '#CCFF00' }, // Lime green circle - kick drum
  { id: 'noise', name: 'Electro', category: 'fx', categoryLabel: '✨ FX', icon: NoiseIcon, color: '#CDB3FF' }, // Purple arrow - noise for electro/video game
  { id: 'snare', name: 'Snare', category: 'drums', categoryLabel: '🥁 Drums', icon: SnareIcon, color: '#CCFF00' }, // Lime green hexagon - noise slap snare
  { id: 'clap', name: 'Clap', category: 'drums', categoryLabel: '🥁 Drums', icon: ClapIcon, color: '#CCFF00' }, // Lime green hands - high pitched punch

  { id: 'hihat', name: 'Hat', category: 'drums', categoryLabel: '🥁 Drums', icon: HiHatIcon, color: '#808080' }, // Gray ellipses - metal hi hat
  { id: 'glitch', name: 'Tick', category: 'fx', categoryLabel: '✨ FX', icon: GlitchIcon, color: '#FF62C6' }, // Pink triangle - closed hi hat tick
  { id: 'riser', name: 'Riser', category: 'fx', categoryLabel: '✨ FX', icon: RiserIcon, color: '#808080' }, // Gray squares - white noise riser
];

export const CATEGORIES = [
  { id: 'synths', label: '🎹 Synths', sounds: SOUND_ICONS.filter(s => s.category === 'synths') },
  { id: 'drums', label: '🥁 Drums', sounds: SOUND_ICONS.filter(s => s.category === 'drums') },
  { id: 'bass', label: '🔊 Bass', sounds: SOUND_ICONS.filter(s => s.category === 'bass') },
  { id: 'fx', label: '✨ FX', sounds: SOUND_ICONS.filter(s => s.category === 'fx') },
];
