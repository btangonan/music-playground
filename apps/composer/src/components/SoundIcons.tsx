// 16 kawaii sound icons - flat 2D pixel style inspired by reference image
// Bold outlines, simple shapes, 2-3 colors, recognizable at 40×40px

export const LeadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M8 20 Q12 12, 20 20 Q28 28, 32 20" 
      stroke="#FF62C6" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="28" cy="12" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
  </svg>
);

export const PadSynthIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="22" rx="14" ry="10" fill="#E0B0FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="14" cy="18" r="2.5" fill="#FF62C6"/>
    <circle cx="20" cy="16" r="2.5" fill="#FF62C6"/>
    <circle cx="26" cy="18" r="2.5" fill="#FF62C6"/>
  </svg>
);

export const PluckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Frog body */}
    <ellipse cx="20" cy="24" rx="12" ry="10" fill="#7ED321" stroke="#000" strokeWidth="2.5"/>
    {/* Eyes */}
    <circle cx="15" cy="18" r="4" fill="#FFFFFF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="25" cy="18" r="4" fill="#FFFFFF" stroke="#000" strokeWidth="2.5"/>
    {/* Pupils */}
    <circle cx="16" cy="19" r="2" fill="#000"/>
    <circle cx="26" cy="19" r="2" fill="#000"/>
    {/* Eye highlights */}
    <circle cx="15" cy="17" r="1" fill="#FFFFFF"/>
    <circle cx="25" cy="17" r="1" fill="#FFFFFF"/>
    {/* Smile */}
    <path d="M16 28 Q20 30, 24 28" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
    {/* Cheek blushes */}
    <circle cx="10" cy="24" r="2" fill="#FF62C6" opacity="0.5"/>
    <circle cx="30" cy="24" r="2" fill="#FF62C6" opacity="0.5"/>
  </svg>
);

export const ArpIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="10" cy="28" r="4" fill="#FF62C6" stroke="#000" strokeWidth="2.5"/>
    <circle cx="20" cy="20" r="4" fill="#E0B0FF" stroke="#000" strokeWidth="2.5"/>
    <circle cx="30" cy="12" r="4" fill="#FFD11A" stroke="#000" strokeWidth="2.5"/>
    <path d="M13 26 L17 22 M23 18 L27 14" 
      stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const KickIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="12" fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M6 20 L2 20 M34 20 L38 20 M20 6 L20 2 M20 34 L20 38" 
      stroke="#000" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="5" fill="#000" opacity="0.2"/>
  </svg>
);

export const SnareIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="10" y="14" width="20" height="16" rx="2" fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M13 22 L27 22" stroke="#000" strokeWidth="2"/>
    <path d="M13 26 L17 26 M23 26 L27 26" stroke="#000" strokeWidth="2"/>
    <path d="M14 12 L26 30 M26 12 L14 30" 
      stroke="#FFD11A" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
);

export const HiHatIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="14" rx="10" ry="4" fill="#D0D0D0" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="20" rx="10" ry="4" fill="#A8A8A8" stroke="#000" strokeWidth="2.5"/>
    <ellipse cx="20" cy="26" rx="10" ry="4" fill="#808080" stroke="#000" strokeWidth="2.5"/>
  </svg>
);

export const ClapIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M10 22 Q10 14, 14 12 L16 18 L12 26 Z" 
      fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <path d="M30 22 Q30 14, 26 12 L24 18 L28 26 Z" 
      fill="#CCFF00" stroke="#000" strokeWidth="2.5"/>
    <circle cx="15" cy="28" r="2" fill="#FFD11A"/>
    <circle cx="20" cy="29" r="2" fill="#FFD11A"/>
    <circle cx="25" cy="28" r="2" fill="#FFD11A"/>
  </svg>
);

export const SubBassIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g transform="rotate(-30 20 20)">
      {/* Bottom bun */}
      <ellipse cx="20" cy="25" rx="11" ry="6" fill="#E8A03A" stroke="#000" strokeWidth="2.5"/>
      {/* Sausage */}
      <ellipse cx="20" cy="19" rx="10" ry="5" fill="#FF3B3F" stroke="#000" strokeWidth="2.5"/>
      {/* Top bun */}
      <path d="M9 18 Q9 13, 13 11 L27 11 Q31 13, 31 18" 
        fill="#E8A03A" stroke="#000" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Yellow mustard squiggle */}
      <path d="M12 19 L15 17.5 L18 19 L21 17.5 L24 19 L27 17.5 L29 19" 
        stroke="#FFE234" strokeWidth="2.5" fill="none" 
        strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

export const WobbleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M4 20 Q6 10, 10 20 T18 20 T26 20 T34 20" 
      stroke="#FFA500" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
    <path d="M4 20 Q6 30, 10 20 T18 20 T26 20 T34 20" 
      stroke="#FFD700" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
  </svg>
);

export const RiserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M20 32 L20 8 L15 13 M20 8 L25 13" 
      stroke="#CDB3FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="20" cy="8" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
    <path d="M10 34 L14 30 M20 32 L24 28 M30 30 L34 26" 
      stroke="#CDB3FF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
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
    <path d="M6 26 Q16 6, 34 16" 
      stroke="#CDB3FF" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M6 26 Q16 6, 34 16" 
      stroke="#E0B0FF" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="34" cy="16" r="3" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
  </svg>
);

export const GlitchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="10" width="10" height="5" fill="#FF62C6" stroke="#000" strokeWidth="2"/>
    <rect x="22" y="10" width="8" height="5" fill="#00FFFF" stroke="#000" strokeWidth="2"/>
    <rect x="10" y="18" width="16" height="5" fill="#FFD11A" stroke="#000" strokeWidth="2"/>
    <rect x="6" y="26" width="8" height="5" fill="#CCFF00" stroke="#000" strokeWidth="2"/>
    <rect x="18" y="26" width="14" height="5" fill="#CDB3FF" stroke="#000" strokeWidth="2"/>
  </svg>
);

export const VocalChopIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <ellipse cx="20" cy="26" rx="10" ry="8" fill="#CDB3FF" stroke="#000" strokeWidth="2.5"/>
    <path d="M14 26 Q20 31, 26 26" stroke="#000" strokeWidth="2.5" fill="white"/>
    <path d="M6 10 Q12 6, 18 10 T30 10 T38 10" 
      stroke="#E0B0FF" strokeWidth="2.5" fill="none"/>
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
  </svg>
);

export const SOUND_ICONS = [
  { id: 'lead', name: 'Lead', category: 'synths', categoryLabel: '🎹 Synths', icon: LeadSynthIcon, color: '#FF62C6' },
  { id: 'pad', name: 'Pad', category: 'synths', categoryLabel: '🎹 Synths', icon: PadSynthIcon, color: '#E0B0FF' },
  { id: 'pluck', name: 'Pluck', category: 'synths', categoryLabel: '🎹 Synths', icon: PluckIcon, color: '#FF62C6' },
  { id: 'arp', name: 'Arp', category: 'synths', categoryLabel: '🎹 Synths', icon: ArpIcon, color: '#FFD11A' },
  
  { id: 'kick', name: 'Kick', category: 'drums', categoryLabel: '🥁 Drums', icon: KickIcon, color: '#CCFF00' },
  { id: 'snare', name: 'Snare', category: 'drums', categoryLabel: '🥁 Drums', icon: SnareIcon, color: '#CCFF00' },
  { id: 'hihat', name: 'Hi-hat', category: 'drums', categoryLabel: '🥁 Drums', icon: HiHatIcon, color: '#808080' },
  { id: 'clap', name: 'Clap', category: 'drums', categoryLabel: '🥁 Drums', icon: ClapIcon, color: '#CCFF00' },
  
  { id: 'sub', name: 'Sub', category: 'bass', categoryLabel: '🔊 Bass', icon: SubBassIcon, color: '#FFA500' },
  { id: 'wobble', name: 'Wobble', category: 'bass', categoryLabel: '🔊 Bass', icon: WobbleIcon, color: '#FFA500' },
  
  { id: 'riser', name: 'Riser', category: 'fx', categoryLabel: '✨ FX', icon: RiserIcon, color: '#CDB3FF' },
  { id: 'impact', name: 'Impact', category: 'fx', categoryLabel: '✨ FX', icon: ImpactIcon, color: '#FFD11A' },
  { id: 'sweep', name: 'Sweep', category: 'fx', categoryLabel: '✨ FX', icon: SweepIcon, color: '#CDB3FF' },
  { id: 'glitch', name: 'Glitch', category: 'fx', categoryLabel: '✨ FX', icon: GlitchIcon, color: '#FF62C6' },
  { id: 'vocal', name: 'Vocal', category: 'fx', categoryLabel: '✨ FX', icon: VocalChopIcon, color: '#CDB3FF' },
  { id: 'noise', name: 'Noise', category: 'fx', categoryLabel: '✨ FX', icon: NoiseIcon, color: '#808080' },
];

export const CATEGORIES = [
  { id: 'synths', label: '🎹 Synths', sounds: SOUND_ICONS.filter(s => s.category === 'synths') },
  { id: 'drums', label: '🥁 Drums', sounds: SOUND_ICONS.filter(s => s.category === 'drums') },
  { id: 'bass', label: '🔊 Bass', sounds: SOUND_ICONS.filter(s => s.category === 'bass') },
  { id: 'fx', label: '✨ FX', sounds: SOUND_ICONS.filter(s => s.category === 'fx') },
];
