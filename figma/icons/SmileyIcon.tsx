export const SmileyIconSVG = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    {/* 3D Cube - futuristic geometric */}
    {/* Top face */}
    <path d="M20 8 L30 13 L30 23 L20 28 L10 23 L10 13 Z" 
      fill="#00D9FF" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>
    
    {/* Left face */}
    <path d="M20 8 L10 13 L10 23 L20 28 Z" 
      fill="#0099CC" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>
    
    {/* Right face */}
    <path d="M20 8 L30 13 L30 23 L20 28 Z" 
      fill="#33E6FF" stroke="#000" strokeWidth="2.5" strokeLinejoin="miter"/>
    
    {/* Inner detail */}
    <rect x="17" y="16" width="6" height="6" fill="#FFFFFF" stroke="#000" strokeWidth="1.5"/>
  </svg>
);
