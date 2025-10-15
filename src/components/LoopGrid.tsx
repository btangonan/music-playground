import { cn } from '@/lib/utils';

interface LoopGridProps {
  instrumentId: string;
  instrumentKind: string;
  color: string;
  steps: boolean[];
  playheadIndex: number;
  onStepToggle: (index: number) => void;
}

export function LoopGrid({
  instrumentId,
  instrumentKind,
  color,
  steps,
  playheadIndex,
  onStepToggle
}: LoopGridProps) {
  return (
    <div className="flex items-center gap-4 py-4 border-t border-border">
      <div className="w-32 flex-shrink-0">
        <div className="text-sm font-bold uppercase tracking-wider">{instrumentKind}</div>
        <div className="text-xs text-muted-foreground">Loop 1</div>
      </div>
      
      <div className="grid grid-cols-8 gap-2 flex-1">
        {steps.slice(0, 8).map((isOn, index) => (
          <button
            key={index}
            onClick={() => onStepToggle(index)}
            className={cn(
              'aspect-square rounded-xl border-2 border-black',
              'flex items-center justify-center',
              'text-xs font-bold transition-all duration-200',
              'hover:scale-105 active:scale-95',
              isOn ? 'text-black' : 'bg-muted text-muted-foreground',
              playheadIndex === index && 'ring-4 ring-white animate-pulse-glow'
            )}
            style={{
              backgroundColor: isOn ? color : undefined
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-8 gap-2 flex-1">
        {steps.slice(8, 16).map((isOn, index) => (
          <button
            key={index + 8}
            onClick={() => onStepToggle(index + 8)}
            className={cn(
              'aspect-square rounded-xl border-2 border-black',
              'flex items-center justify-center',
              'text-xs font-bold transition-all duration-200',
              'hover:scale-105 active:scale-95',
              isOn ? 'text-black' : 'bg-muted text-muted-foreground',
              playheadIndex === index + 8 && 'ring-4 ring-white animate-pulse-glow'
            )}
            style={{
              backgroundColor: isOn ? color : undefined
            }}
          >
            {index + 9}
          </button>
        ))}
      </div>
    </div>
  );
}
