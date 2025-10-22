export const HotdogIconSVG = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* Abstract waveform/signal - futuristic bass visualization */}
    <rect x="8" y="15" width="24" height="10" rx="1" fill="#9945FF" stroke="#000" strokeWidth="2.5"/>
    
    {/* Wave lines inside */}
    <path d="M10 20 L13 17 L16 23 L19 17 L22 23 L25 17 L28 23 L30 20" 
      stroke="#FFD11A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* Side panels */}
    <rect x="6" y="17" width="3" height="6" fill="#7000CC" stroke="#000" strokeWidth="2"/>
    <rect x="31" y="17" width="3" height="6" fill="#7000CC" stroke="#000" strokeWidth="2"/>
  </svg>
);
