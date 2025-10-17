export const PluckIcon = () => (
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
