import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TrackControlsProps {
  color: string;
  label: string;
  muted: boolean;
  solo: boolean;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onRemove: () => void;
}

export function TrackControls({ color, label, muted, solo, onToggleMute, onToggleSolo, onRemove }: TrackControlsProps){
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: color }} />
      <div className="text-xs font-bold w-28 truncate">{label}</div>
      <Button size="sm" variant={muted ? 'secondary' : 'outline'} onClick={onToggleMute}>Mute</Button>
      <Button size="sm" variant={solo ? 'secondary' : 'outline'} onClick={onToggleSolo}>Solo</Button>
      <Button size="sm" variant="destructive" onClick={onRemove}>Remove</Button>
    </div>
  );
}
