interface OctaveControlsProps {
  octaveOffset: number;
  onOctaveChange: (offset: number) => void;
}

export default function OctaveControls({ octaveOffset, onOctaveChange }: OctaveControlsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Octave Up button */}
      <button
        onClick={() => onOctaveChange(Math.min(octaveOffset + 1, 3))}
        disabled={octaveOffset >= 3}
        style={{
          fontSize: '20px',
          opacity: octaveOffset < 3 ? 1 : 0.3,
          cursor: octaveOffset < 3 ? 'pointer' : 'not-allowed',
          background: 'none',
          border: 'none',
          padding: '4px',
          color: '#000000',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={`Octave Up (C${3 + octaveOffset} to B${5 + octaveOffset})`}
      >
        ↑
      </button>

      {/* Octave Down button */}
      <button
        onClick={() => onOctaveChange(Math.max(octaveOffset - 1, -3))}
        disabled={octaveOffset <= -3}
        style={{
          fontSize: '20px',
          opacity: octaveOffset > -3 ? 1 : 0.3,
          cursor: octaveOffset > -3 ? 'pointer' : 'not-allowed',
          background: 'none',
          border: 'none',
          padding: '4px',
          color: '#000000',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={`Octave Down (C${3 + octaveOffset} to B${5 + octaveOffset})`}
      >
        ↓
      </button>
    </div>
  );
}
