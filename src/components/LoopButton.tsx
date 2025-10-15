import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { forwardRef, useRef, useImperativeHandle } from 'react';

interface Instrument {
  id: string;
  kind: 'keys' | 'bass' | 'drums';
  color: string;
  position: { x: number; y: number };
  loop: {
    steps: boolean[];
    playheadIndex: number;
  };
}

interface Track {
  id: string;
  target: { kind: 'instrument' | 'effect' | 'sampler'; id: string };
  color: string;
  label: string;
  muted: boolean;
  solo: boolean;
}

interface LoopButtonProps {
  track: Track;
  instrument?: Instrument;
  isSelected: boolean;
  onClick: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onRemove: () => void;
  onInputPointerUp?: (e: React.PointerEvent) => void;
}

export const LoopButton = forwardRef(function LoopButton({
  track,
  instrument,
  isSelected,
  onClick,
  onToggleMute,
  onToggleSolo,
  onRemove,
  onInputPointerUp
}: LoopButtonProps, ref) {
  const inputPortRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    getInPortRect: () => inputPortRef.current?.getBoundingClientRect()
  }));
  return (
    <div
      className={cn(
        "relative border-2 rounded-none aspect-square p-2 cursor-pointer transition-all",
        "hover:scale-105 hover:shadow-lg max-w-[140px]",
        isSelected && "border-primary ring-2 ring-primary/50",
        !isSelected && "border-border",
        track.muted && "opacity-50",
        track.solo && "ring-2 ring-yellow-500"
      )}
      style={{ backgroundColor: `${track.color}15` }}
      onClick={onClick}
    >
      {/* Input port at top */}
      <button
        ref={inputPortRef}
        className="absolute left-1/2 -translate-x-1/2 -top-[8px] w-4 h-4 rounded-full border-2 border-black bg-white z-20 hover:scale-125 hover:port-glow transition-all cursor-pointer"
        data-port="input"
        title="Connect from effect"
        aria-label="Connect to pad"
        onPointerUp={(e) => {
          e.stopPropagation();
          onInputPointerUp?.(e);
        }}
      />
      {/* Color Dot + Name */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full border border-black"
          style={{ backgroundColor: track.color }}
        />
        <span className="text-xs font-bold truncate">{track.label}</span>
      </div>

      {/* Mini 16-step preview (4x4 grid) */}
      {instrument && (
        <div className="grid grid-cols-4 gap-0.5 mb-2">
          {instrument.loop.steps.map((active, idx) => (
            <div
              key={idx}
              className={cn(
                "aspect-square rounded-sm border border-border",
                active && "bg-current",
                !active && "bg-muted/40"
              )}
              style={{ color: track.color }}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          size="sm"
          variant={track.muted ? "secondary" : "ghost"}
          className="h-6 px-2 text-[10px]"
          onClick={onToggleMute}
        >
          M
        </Button>
        <Button
          type="button"
          size="sm"
          variant={track.solo ? "secondary" : "ghost"}
          className="h-6 px-2 text-[10px]"
          onClick={onToggleSolo}
        >
          S
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={onRemove}
        >
          ×
        </Button>
      </div>
    </div>
  );
});
