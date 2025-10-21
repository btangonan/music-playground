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
  // Match grid's content width (768px for 4 bars) - borders on labels are internal
  const totalWidth = columnWidth * stepsPerBar * barChords.length;

  return (
    <div
      style={{
        width: `${totalWidth}px`,
        height: '28px',
        display: 'flex',
        gap: 0,
        margin: 0,
        padding: 0,
        outline: debug ? '2px solid green' : 'none',
      }}
    >
      {barChords.map((chord, index) => {
        const barWidth = columnWidth * stepsPerBar;
        const bgColor = chord ? chordColors[chord] : 'transparent';
        const isFirst = index === 0;
        const isLast = index === barChords.length - 1;
        
        return (
          <div
            key={index}
            style={{
              width: `${barWidth}px`,
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bgColor,
              border: '1px solid rgba(0,0,0,0.15)',
              borderRight: isLast ? '1px solid rgba(0,0,0,0.15)' : 'none',
              borderTopLeftRadius: isFirst ? '8px' : '0',
              borderBottomLeftRadius: isFirst ? '8px' : '0',
              borderTopRightRadius: isLast ? '8px' : '0',
              borderBottomRightRadius: isLast ? '8px' : '0',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: 700,
              color: chord ? '#000000' : 'rgba(0,0,0,0.2)'
            }}
          >
            {chord || '—'}
          </div>
        );
      })}
    </div>
  );
}
