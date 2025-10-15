import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { forwardRef, useRef, useImperativeHandle } from 'react';
import { MPCPad, isPadEmpty } from '@/lib/pad-manager';

interface PadButtonProps {
  pad: MPCPad;
  isSelected: boolean;
  onClick: () => void;
  onInputPointerUp: (e: React.PointerEvent) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}

export const PadButton = forwardRef<HTMLDivElement, PadButtonProps>(
  function PadButton(
    { pad, isSelected, onClick, onInputPointerUp, onToggleMute, onToggleSolo },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isEmpty = isPadEmpty(pad);

    // Expose container ref for cable positioning
    useImperativeHandle(ref, () => containerRef.current!);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative border-2 rounded-none aspect-square p-2 transition-all",
          "max-w-[140px]",
          isEmpty && "opacity-30 scale-90",  // Empty: grayed + minimized
          !isEmpty && "cursor-pointer hover:scale-105 hover:shadow-lg",
          isSelected && !isEmpty && "border-primary ring-2 ring-primary/50",
          !isSelected && "border-border",
          pad.muted && !isEmpty && "opacity-50",
          pad.solo && !isEmpty && "ring-2 ring-yellow-500"
        )}
        style={{ backgroundColor: isEmpty ? 'transparent' : `${pad.color}15` }}
        onClick={isEmpty ? undefined : onClick}
      >
        {/* Input port at top - ALWAYS visible */}
        <button
          className="absolute left-1/2 -translate-x-1/2 -top-[8px] w-4 h-4 rounded-full border-2 border-black bg-white z-20 hover:scale-125 hover:port-glow transition-all cursor-pointer"
          data-port="input"
          title={isEmpty ? "Connect instrument here" : `Disconnect ${pad.label}`}
          aria-label="Connect to pad"
          onPointerUp={(e) => {
            e.stopPropagation();
            onInputPointerUp(e);
          }}
        />

        {/* Pad Label */}
        <div className="flex items-center gap-2 mb-2">
          {!isEmpty && (
            <div
              className="w-3 h-3 rounded-full border border-black"
              style={{ backgroundColor: pad.color }}
            />
          )}
          <span className={cn(
            "text-xs font-bold truncate",
            isEmpty && "text-muted-foreground"
          )}>
            {pad.label}
          </span>
        </div>

        {/* Mini 16-step preview (4x4 grid) - only when connected */}
        {!isEmpty && (
          <div className="grid grid-cols-4 gap-0.5 mb-2">
            {pad.loop.steps.map((active, idx) => (
              <div
                key={idx}
                className={cn(
                  "aspect-square rounded-sm border border-border",
                  active && "bg-current",
                  !active && "bg-muted/40",
                  pad.loop.playheadIndex === idx && "ring-1 ring-white"
                )}
                style={{ color: pad.color }}
              />
            ))}
          </div>
        )}

        {/* Controls - only when connected */}
        {!isEmpty && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant={pad.muted ? "secondary" : "ghost"}
              className="h-6 px-2 text-[10px]"
              onClick={onToggleMute}
            >
              M
            </Button>
            <Button
              type="button"
              size="sm"
              variant={pad.solo ? "secondary" : "ghost"}
              className="h-6 px-2 text-[10px]"
              onClick={onToggleSolo}
            >
              S
            </Button>
          </div>
        )}
      </div>
    );
  }
);
