import { type Chord, chordColors } from './chordData';

interface ChordLabelsProps {
  barChords: (Chord | null)[];
  columnWidth?: number;
  stepsPerBar?: number;
  gridBorderWidth?: number; // to mirror grid total width incl. borders
  debug?: boolean;
}

export default function ChordLabels({ barChords, columnWidth = 48, stepsPerBar = 4, gridBorderWidth = 2, debug = false }: ChordLabelsProps) {
  const innerWidth = columnWidth * stepsPerBar * barChords.length; // exact grid content width
  const totalWidth = innerWidth + 2 * gridBorderWidth; // match grid total width incl. borders

  return (
    <div style={{ width: `${totalWidth}px`, height: '28px', boxSizing: 'content-box', paddingLeft: `${gridBorderWidth}px`, paddingRight: `${gridBorderWidth}px`, outline: debug ? '1px solid green' : 'none' }}>
      <div style={{ width: `${innerWidth}px`, height: '100%', display: 'flex', gap: 0, margin: 0, padding: 0 }}>
        {barChords.map((chord, index) => {
          const barWidth = columnWidth * stepsPerBar;
          const bgColor = chord ? chordColors[chord] : 'transparent';
          const isFirst = index === 0;
          const isLast = index === barChords.length - 1;
          return (
            <div key={index} style={{ width: `${barWidth}px`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, border: '1px solid rgba(0,0,0,0.15)', borderRight: isLast ? '1px solid rgba(0,0,0,0.15)' : 'none', borderTopLeftRadius: isFirst ? '8px' : '0', borderBottomLeftRadius: isFirst ? '8px' : '0', borderTopRightRadius: isLast ? '8px' : '0', borderBottomRightRadius: isLast ? '8px' : '0', fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: chord ? '#000000' : 'rgba(0,0,0,0.2)' }}>{chord || '—'}</div>
          );
        })}
      </div>
    </div>
  );
}
