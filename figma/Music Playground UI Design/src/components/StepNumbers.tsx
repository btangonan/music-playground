export default function StepNumbers() {
  const COLUMN_WIDTH = 48; // Match piano roll
  const TIME_STEPS = 16;
  
  return (
    <div 
      className="flex"
      style={{ 
        height: '10px',
        width: `${COLUMN_WIDTH * TIME_STEPS}px`
      }}
    >
      {Array.from({ length: TIME_STEPS }).map((_, index) => {
        // Show numbers at steps 1, 5, 9, 13 (every 4th step, 1-indexed)
        const showNumber = index % 4 === 0;
        
        return (
          <div
            key={index}
            className="flex items-center justify-center text-[rgba(0,0,0,0.55)]"
            style={{
              width: `${COLUMN_WIDTH}px`,
              fontFamily: 'Inter',
              fontSize: '12px',
              lineHeight: '16px',
              fontWeight: 500
            }}
          >
            {showNumber ? index + 1 : ''}
          </div>
        );
      })}
    </div>
  );
}
