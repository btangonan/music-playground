import { Sparkles, Radio, Zap, Hash, Circle, Filter as FilterIcon, Waves, X } from 'lucide-react';
import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';
import { type Orientation } from '@/lib/ui-layout';

interface EffectNodeProps {
  id: string;
  type: string;
  position: { x: number; y: number };
  intensity: number;
  orientation?: Orientation; // Phase 3: Orientation for port positioning
  onDrag: (pos: { x: number; y: number }) => void;
  onRotate: (value: number) => void;
  onInputPointerUp: (e: React.PointerEvent) => void;
  onOutputPointerDown?: (e: React.PointerEvent) => void;
  onDelete: () => void;
}

const iconMap: Record<string, any> = {
  space: Sparkles,
  echo: Radio,
  fuzz: Zap,
  crush: Hash,
  ring: Circle,
  filter: FilterIcon,
  vibrato: Waves
};

export const EffectNode = forwardRef(function EffectNode({
  id,
  type,
  position,
  intensity,
  orientation = 'horizontal', // Phase 3: Default to horizontal
  onDrag,
  onRotate,
  onInputPointerUp,
  onOutputPointerDown,
  onDelete
}: EffectNodeProps, ref) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showIntensity, setShowIntensity] = useState(false);

  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => ({
    getInPortRect: () => inRef.current?.getBoundingClientRect(),
    getOutPortRect: () => outRef.current?.getBoundingClientRect(),
  }));

  const Icon = iconMap[type] || Radio;
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.port')) return;
    if (e.altKey) {
      setIsRotating(true);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      onDrag({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (isRotating) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const normalized = (angle + Math.PI) / (Math.PI * 2);
      onRotate(normalized);
      setShowIntensity(true);
    }
  };
  
  const handlePointerUp = () => {
    setIsDragging(false);
    setIsRotating(false);
    if (showIntensity) { setTimeout(() => setShowIntensity(false), 800); }
  };
  
  return (
    <div
      className="group absolute cursor-move select-none animate-bounce-in"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="relative">
        {/* Delete button */}
        <button
          className={cn(
            'absolute -top-1 -right-1 z-30',
            'w-6 h-6 rounded-full',
            'bg-black/60 text-white',
            'border border-white/30',
            'flex items-center justify-center',
            'opacity-0 group-hover:opacity-100',
            'hover:scale-110 transition-all duration-200',
            'cursor-pointer'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Delete effect"
        >
          <X className="w-3 h-3" strokeWidth={2} />
        </button>

        <div
          className={cn(
            'relative w-24 h-24 rounded-2xl border-2 border-black bg-card',
            'flex flex-col items-center justify-center gap-1 p-2',
            'transition-all duration-200 hover:scale-105',
            'text-secondary node-glow'
          )}
          style={{ color: 'hsl(var(--secondary))' }}
        >
          <Icon className="w-6 h-6" strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">{type}</span>

          {/* Intensity ring */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${intensity * 283} 283`} strokeDashoffset="-71" opacity="0.3" />
            </svg>
          </div>

          {/* Input port - Phase 3: Left for horizontal, top for vertical */}
          <button
            data-port="input"
            ref={inRef}
            className={cn(
              'port absolute',
              'w-4 h-4 rounded-full border-2 border-black bg-white',
              'hover:scale-125 hover:port-glow transition-all duration-200',
              'cursor-pointer z-20',
              orientation === 'horizontal'
                ? '-left-2 top-1/2 -translate-y-1/2'
                : 'left-1/2 -translate-x-1/2 -top-2'
            )}
            onPointerUp={(e)=>{ e.stopPropagation(); onInputPointerUp(e); }}
            title="Input"
          />

          {/* Output port - Phase 3: Right for horizontal, bottom for vertical */}
          <button
            data-port="output"
            ref={outRef}
            className={cn(
              'port absolute',
              'w-4 h-4 rounded-full border-2 border-black bg-white',
              'hover:scale-125 hover:port-glow transition-all duration-200',
              'cursor-pointer z-20',
              orientation === 'horizontal'
                ? '-right-2 top-1/2 -translate-y-1/2'
                : 'left-1/2 -translate-x-1/2 -bottom-2'
            )}
            onPointerDown={(e) => {
              e.stopPropagation();
              onOutputPointerDown?.(e);
            }}
            title="Output"
          />
        </div>

        {showIntensity && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-border rounded-lg text-xs font-bold whitespace-nowrap animate-slide-in">
            {Math.round(intensity * 100)}%
          </div>
        )}
      </div>
    </div>
  );
});
