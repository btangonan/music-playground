// 16 kawaii sound icons - flat 2D pixel style inspired by reference image
// Bold outlines, simple shapes, 2-3 colors, recognizable at 40×40px

export const LeadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M8 20 Q12 12, 20 20 Q28 28, 32 20"
      stroke="#FF62C6" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="26" cy="14" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">1</text>
  </svg>
);

export const PadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="20" rx="14" ry="10" fill="#E0B0FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="14" cy="16" r="2.5" fill="#FF62C6"/>
    <circle cx="20" cy="14" r="2.5" fill="#FF62C6"/>
    <circle cx="26" cy="16" r="2.5" fill="#FF62C6"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">2</text>
  </svg>
);

export const PluckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Frog body */}
    <ellipse cx="20" cy="22" rx="12" ry="10" fill="#7ED321" stroke="#000" strokeWidth="2.5"/>
    {/* Eyes */}
    <circle cx="15" cy="16" r="4" fill="#FFFFFF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="25" cy="16" r="4" fill="#FFFFFF" stroke="#000" strokeWidth="2.5"/>
    {/* Pupils */}
    <circle cx="16" cy="17" r="2" fill="#000"/>
    <circle cx="26" cy="17" r="2" fill="#000"/>
    {/* Eye highlights */}
    <circle cx="15" cy="15" r="1" fill="#FFFFFF"/>
    <circle cx="25" cy="15" r="1" fill="#FFFFFF"/>
    {/* Smile */}
    <path d="M16 26 Q20 28, 24 26" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
    {/* Cheek blushes */}
    <circle cx="10" cy="22" r="2" fill="#FF62C6" opacity="0.5"/>
    <circle cx="30" cy="22" r="2" fill="#FF62C6" opacity="0.5"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">3</text>
  </svg>
);

export const ArpIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="10" cy="26" r="4" fill="#FF62C6" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="4" fill="#E0B0FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="30" cy="14" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <path d="M13 24 L17 22 M23 18 L27 16"
      stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">4</text>
  </svg>
);

export const KickIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="12" fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M6 20 L2 20 M34 20 L38 20 M20 6 L20 2 M20 34 L20 38"
      stroke="#000" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="5" fill="#000" opacity="0.2"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">5</text>
  </svg>
);

export const SnareIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="10" y="12" width="20" height="16" rx="2" fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M13 20 L27 20" stroke="#000" strokeWidth="2"/>
    <path d="M13 24 L17 24 M23 24 L27 24" stroke="#000" strokeWidth="2"/>
    <path d="M14 10 L26 28 M26 10 L14 28"
      stroke="#FFD11A" strokeWidth="3.5" strokeLinecap="round"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">6</text>
  </svg>
);

export const HiHatIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="13" rx="10" ry="4" fill="#D0D0D0" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="19" rx="10" ry="4" fill="#A8A8A8" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="25" rx="10" ry="4" fill="#808080" stroke="#000" strokeWidth="2.5"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">7</text>
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
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">8</text>
  </svg>
);

export const SubBassIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g transform="rotate(-25 20 20)">
      {/* Bottom bun */}
      <ellipse cx="20" cy="23" rx="11" ry="6" fill="#E8A03A" stroke="#000" strokeWidth="2.5"/>
      {/* Sausage */}
      <ellipse cx="20" cy="18" rx="10" ry="5" fill="#FF3B3F" stroke="#000" strokeWidth="2.5"/>
      {/* Top bun */}
      <path d="M9 17 Q9 12, 13 10 L27 10 Q31 12, 31 17"
        fill="#E8A03A" stroke="#000" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Yellow mustard squiggle */}
      <path d="M12 18 L15 16.5 L18 18 L21 16.5 L24 18 L27 16.5 L29 18"
        stroke="#FFE234" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">9</text>
  </svg>
);

export const WobbleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M6 20 Q8 10, 12 20 T20 20 T28 20 T36 20"
      stroke="#FFA500" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
    <path d="M6 20 Q8 30, 12 20 T20 20 T28 20 T36 20"
      stroke="#FFD700" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">10</text>
  </svg>
);

export const RiserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M20 32 L20 8 L15 13 M20 8 L25 13"
      stroke="#CDB3FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="8" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
    <path d="M10 34 L14 30 M20 32 L24 28 M30 30 L34 26"
      stroke="#CDB3FF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">11</text>
  </svg>
);

export const ImpactIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M20 6 L22 18 L34 20 L22 22 L20 34 L18 22 L6 20 L18 18 Z"
      fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="5" fill="#CDB3FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="2.5" fill="#fff"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">12</text>
  </svg>
);

export const SweepIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M6 28 Q16 8, 34 18"
      stroke="#CDB3FF" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M6 28 Q16 8, 34 18"
      stroke="#E0B0FF" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="34" cy="18" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">13</text>
  </svg>
);

export const GlitchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="8" width="10" height="5" fill="#FF62C6" stroke="#000" strokeWidth="2"/>
    <rect x="22" y="8" width="8" height="5" fill="#00FFFF" stroke="#000" strokeWidth="2"/>
    <rect x="10" y="16" width="16" height="5" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
    <rect x="6" y="24" width="8" height="5" fill="#CCFF00" stroke="#000" strokeWidth="2"/>
    <rect x="18" y="24" width="14" height="5" fill="#CDB3FF" stroke="#000" strokeWidth="2"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">14</text>
  </svg>
);

export const VocalChopIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="24" rx="10" ry="8" fill="#CDB3FF" stroke="#000" strokeWidth="2.5"/>
    <path d="M14 24 Q20 29, 26 24" stroke="#000" strokeWidth="2.5" fill="white"/>
    <path d="M6 10 Q12 6, 18 10 T30 10 T38 10"
      stroke="#E0B0FF" strokeWidth="2.5" fill="none"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">15</text>
  </svg>
);

export const NoiseIcon = () => (
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
    <ellipse cx="20" cy="20" rx="14" ry="12" stroke="#000" strokeWidth="2.5" fill="none"/>
    <text x="3" y="10" fontSize="9" fontWeight="bold" fill="#000">16</text>
  </svg>
);

export const SOUND_ICONS = [
  { id: 'lead', name: 'Lead', category: 'synths', categoryLabel: '🎹 Synths', icon: LeadSynthIcon, color: '#FF62C6' },
  { id: 'impact', name: 'Impact', category: 'fx', categoryLabel: '✨ FX', icon: ImpactIcon, color: '#FFD11A' },
  { id: 'sweep', name: 'Sweep', category: 'fx', categoryLabel: '✨ FX', icon: SweepIcon, color: '#CDB3FF' },
  { id: 'vocal', name: 'Vocal', category: 'fx', categoryLabel: '✨ FX', icon: VocalChopIcon, color: '#CDB3FF' },
  { id: 'sub', name: 'Sub', category: 'bass', categoryLabel: '🔊 Bass', icon: SubBassIcon, color: '#FFA500' },
  { id: 'wobble', name: 'Wobble', category: 'bass', categoryLabel: '🔊 Bass', icon: WobbleIcon, color: '#FFA500' },
  { id: 'pad', name: 'Pad', category: 'synths', categoryLabel: '🎹 Synths', icon: PadSynthIcon, color: '#E0B0FF' },
  { id: 'pluck', name: 'Pluck', category: 'synths', categoryLabel: '🎹 Synths', icon: PluckIcon, color: '#FF62C6' },
  { id: 'arp', name: 'Arp', category: 'synths', categoryLabel: '🎹 Synths', icon: ArpIcon, color: '#FFD11A' },

  { id: 'kick', name: 'Kick', category: 'drums', categoryLabel: '🥁 Drums', icon: KickIcon, color: '#CCFF00' },
  { id: 'snare', name: 'Snare', category: 'drums', categoryLabel: '🥁 Drums', icon: SnareIcon, color: '#CCFF00' },
  { id: 'hihat', name: 'Hi-hat', category: 'drums', categoryLabel: '🥁 Drums', icon: HiHatIcon, color: '#808080' },
  { id: 'clap', name: 'Clap', category: 'drums', categoryLabel: '🥁 Drums', icon: ClapIcon, color: '#CCFF00' },

  { id: 'riser', name: 'Riser', category: 'fx', categoryLabel: '✨ FX', icon: RiserIcon, color: '#CDB3FF' },
  { id: 'glitch', name: 'Glitch', category: 'fx', categoryLabel: '✨ FX', icon: GlitchIcon, color: '#FF62C6' },
  { id: 'noise', name: 'Noise', category: 'fx', categoryLabel: '✨ FX', icon: NoiseIcon, color: '#808080' },
];

export const CATEGORIES = [
  { id: 'synths', label: '🎹 Synths', sounds: SOUND_ICONS.filter(s => s.category === 'synths') },
  { id: 'drums', label: '🥁 Drums', sounds: SOUND_ICONS.filter(s => s.category === 'drums') },
  { id: 'bass', label: '🔊 Bass', sounds: SOUND_ICONS.filter(s => s.category === 'bass') },
  { id: 'fx', label: '✨ FX', sounds: SOUND_ICONS.filter(s => s.category === 'fx') },
];
