import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MPCPad } from '@/lib/pad-manager';

interface StepEditorModalProps {
  pad: MPCPad;
  steps: boolean[];
  playheadIndex: number;
  onStepToggle: (index: number) => void;
  onClose: () => void;
  onToggleMute?: () => void;
  onToggleSolo?: () => void;
}

export function StepEditorModal({
  pad,
  steps,
  playheadIndex,
  onStepToggle,
  onClose,
  onToggleMute,
  onToggleSolo
}: StepEditorModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-black"
                style={{ backgroundColor: pad.color }}
              />
              {pad.label} - Step Editor
            </DialogTitle>

            {/* Optional controls */}
            {(onToggleMute || onToggleSolo) && (
              <div className="flex gap-2">
                {onToggleMute && (
                  <Button
                    type="button"
                    size="sm"
                    variant={pad.muted ? "secondary" : "outline"}
                    onClick={onToggleMute}
                  >
                    Mute
                  </Button>
                )}
                {onToggleSolo && (
                  <Button
                    type="button"
                    size="sm"
                    variant={pad.solo ? "secondary" : "outline"}
                    onClick={onToggleSolo}
                  >
                    Solo
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 2x8 Step Grid */}
        <div className="space-y-2">
          {/* Row 1: Steps 1-8 */}
          <div className="grid grid-cols-8 gap-2">
            {steps.slice(0, 8).map((active, idx) => (
              <button
                key={idx}
                type="button"
                className={cn(
                  "aspect-square rounded-lg border-2 transition-all",
                  "hover:scale-105 active:scale-95",
                  "flex items-center justify-center",
                  "text-xs font-bold",
                  active && "border-primary shadow-lg",
                  !active && "border-border bg-background/50",
                  playheadIndex === idx && "ring-2 ring-primary ring-offset-2"
                )}
                style={{
                  backgroundColor: active ? pad.color : undefined,
                  color: active ? 'black' : undefined
                }}
                onClick={() => onStepToggle(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Row 2: Steps 9-16 */}
          <div className="grid grid-cols-8 gap-2">
            {steps.slice(8, 16).map((active, idx) => (
              <button
                key={idx + 8}
                type="button"
                className={cn(
                  "aspect-square rounded-lg border-2 transition-all",
                  "hover:scale-105 active:scale-95",
                  "flex items-center justify-center",
                  "text-xs font-bold",
                  active && "border-primary shadow-lg",
                  !active && "border-border bg-background/50",
                  playheadIndex === idx + 8 && "ring-2 ring-primary ring-offset-2"
                )}
                style={{
                  backgroundColor: active ? pad.color : undefined,
                  color: active ? 'black' : undefined
                }}
                onClick={() => onStepToggle(idx + 8)}
              >
                {idx + 9}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
