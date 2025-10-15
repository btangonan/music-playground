import { PadButton } from './PadButton';
import { MPCPad } from '@/lib/pad-manager';

interface MPCGridProps {
  pads: MPCPad[];
  selectedPadId: string | null;
  onSelectPad: (padId: string) => void;
  onToggleMute: (padId: string) => void;
  onToggleSolo: (padId: string) => void;
  onInputPointerUp: (padId: string, e: React.PointerEvent) => void;
  padBtnRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export function MPCGrid({
  pads,
  selectedPadId,
  onSelectPad,
  onToggleMute,
  onToggleSolo,
  onInputPointerUp,
  padBtnRefs
}: MPCGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {pads.map(pad => (
        <PadButton
          key={pad.id}
          ref={(el: HTMLDivElement | null) => {
            padBtnRefs.current[pad.id] = el;
          }}
          pad={pad}
          isSelected={selectedPadId === pad.id}
          onClick={() => onSelectPad(pad.id)}
          onToggleMute={() => onToggleMute(pad.id)}
          onToggleSolo={() => onToggleSolo(pad.id)}
          onInputPointerUp={(e) => onInputPointerUp(pad.id, e)}
        />
      ))}
    </div>
  );
}
