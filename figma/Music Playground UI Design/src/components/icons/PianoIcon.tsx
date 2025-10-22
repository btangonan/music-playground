// Piano icon - lunar eclipse style with black circle overtaking white circle
export function PianoIcon() {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* White circle (moon) */}
      <circle 
        cx="19" 
        cy="20" 
        r="11" 
        fill="white" 
        stroke="black" 
        strokeWidth="2"
      />
      
      {/* Black circle (eclipse shadow) - offset to create crescent, same diameter */}
      <circle 
        cx="24" 
        cy="20" 
        r="11" 
        fill="black"
      />
      
      {/* Re-draw the outline over the eclipse for clean edges */}
      <circle 
        cx="19" 
        cy="20" 
        r="11" 
        fill="none" 
        stroke="black" 
        strokeWidth="2"
      />
    </svg>
  );
}
