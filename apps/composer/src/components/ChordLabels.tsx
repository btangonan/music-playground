import { type Chord, chordColors } from './chordData';

interface ChordLabelsProps {
  barChords: (Chord | null)[];
  columnWidth?: number;
  stepsPerBar?: number;
  gridBorderWidth?: number; // Border width to match grid's total width (default: 2 for border-2)
  debug?: boolean; // Enable debug outline for alignment verification
}

export default function ChordLabels({
  barChords,
  columnWidth = 48,
  stepsPerBar = 4,
  gridBorderWidth = 2,
  debug = false
}: ChordLabelsProps) {
  // Match grid's content width (768px for 4 bars) - ChordLabels align with grid content, not borders
  const totalWidth = columnWidth * stepsPerBar * barChords.length;
  const sixteenthWidth = columnWidth / 4;
  const sixteenthsPerBar = stepsPerBar * 4;

  return (
    <div
      style={{
        width: `${totalWidth}px`,
        height: '28px',
        position: 'relative',
        display: 'flex',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.1)',
        outline: debug ? '2px solid green' : 'none',
        marginBottom: '8px'
      }}
    >
      {/* Background bars with original chord colors */}
      {barChords.map((chord, index) => {
        const barWidth = columnWidth * stepsPerBar;
        const bgColor = chord ? chordColors[chord] : 'transparent';

        return (
          <div
            key={`bg-${index}`}
            style={{
              width: `${barWidth}px`,
              height: '100%',
              backgroundColor: bgColor,
              flexShrink: 0
            }}
          />
        );
      })}

      {/* Vertical grid lines (match sequencer style) */}
      {Array.from({ length: barChords.length * sixteenthsPerBar + 1 }).map((_, bar) => {
        const xPos = bar * sixteenthWidth;
        const isBarBoundary = bar % sixteenthsPerBar === 0;

        // Skip the first line at x=0 (covered by border)
        if (bar === 0) return null;

        return (
          <div
            key={`line-${bar}`}
            style={{
              position: 'absolute',
              left: `${xPos}px`,
              top: 0,
              width: isBarBoundary ? '2px' : '0px', // Only show bar boundaries (2px like sequencer)
              height: '100%',
              backgroundColor: isBarBoundary ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)', // Match sequencer colors
              pointerEvents: 'none'
            }}
          />
        );
      })}

      {/* Chord labels overlaid on top */}
      {barChords.map((chord, index) => {
        const barWidth = columnWidth * stepsPerBar;

        return (
          <div
            key={`label-${index}`}
            style={{
              position: 'absolute',
              left: `${index * barWidth}px`,
              width: `${barWidth}px`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 700,
              color: chord ? '#000000' : 'rgba(0,0,0,0.2)',
              pointerEvents: 'none'
            }}
          >
            {chord || '—'}
          </div>
        );
      })}
    </div>
  );
}
