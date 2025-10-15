import { Music2, Piano, Drum, Waves } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';
import { type Orientation } from '@/lib/ui-layout';

interface InstrumentNodeProps {
  id: string;
  kind: 'keys' | 'bass' | 'drums' | 'pad_gate';
  color: string;
  position: { x: number; y: number };
  isActive: boolean;
  orientation?: Orientation; // Phase 3: Orientation for port positioning
  octaveOffset?: number; // Octave shift indicator
  onSelect: () => void;
  onDrag: (pos: { x: number; y: number }) => void;
  onPortPointerDown: (e: React.PointerEvent)=>void;
}

const iconMap = {
  keys: Piano,
  bass: Music2,
  drums: Drum,
  pad_gate: Waves
};

export const InstrumentNode = forwardRef(function InstrumentNode({
  id,
  kind,
  color,
  position,
  isActive,
  orientation = 'horizontal', // Phase 3: Default to horizontal
  octaveOffset = 0,
  onSelect,
  onDrag,
  onPortPointerDown
}: InstrumentNodeProps, ref) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const portRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => ({
    getOutPortRect: () => portRef.current?.getBoundingClientRect()
  }));

  const Icon = iconMap[kind];

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.port')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    onDrag({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={cn(
        'absolute cursor-move select-none transition-all duration-200',
        'w-32 h-28 animate-bounce-in',
        isActive && 'z-10'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={onSelect}
    >
      <div
        className={cn(
          'relative w-full h-full rounded-3xl border-2 border-black',
          'flex flex-col items-center justify-center gap-2 p-3',
          'transition-all duration-300',
          isActive && 'ring-4 ring-white/50 node-glow'
        )}
        style={{
          backgroundColor: color,
          color: '#000'
        }}
      >
        <Icon className="w-8 h-8" strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider">{kind}</span>

        {/* Octave badge - shown when active and octaveOffset is non-zero */}
        {isActive && octaveOffset !== 0 && kind !== 'drums' && (
          <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
            Oct {octaveOffset > 0 ? '+' : ''}{octaveOffset}
          </div>
        )}

        {/* Output port - Phase 3: Right for horizontal, bottom for vertical */}
        <button
          data-port="output"
          className={cn(
            'port absolute',
            'w-4 h-4 rounded-full border-2 border-black bg-white',
            'hover:scale-125 hover:port-glow transition-all duration-200',
            'cursor-pointer z-20',
            orientation === 'horizontal'
              ? '-right-2 top-1/2 -translate-y-1/2'
              : 'left-1/2 -translate-x-1/2 -bottom-2'
          )}
          ref={portRef}
          onPointerDown={(e)=>{ e.stopPropagation(); onPortPointerDown(e); }}
          title="Connect to effect"
        />
      </div>
    </div>
  );
});
