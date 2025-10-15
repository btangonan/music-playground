import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuSub, DropdownMenuPortal, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export type EffectType = 'space'|'echo'|'pingpong'|'chorus'|'phaser'|'autofilter'|'autopanner'|'tremolo'|'filter'|'eq3'|'compressor'|'fuzz'|'crush'|'shimmer'|'vibrato'|'convolver'|'reverse_reverb'|'width'|'ambient';

interface Props { onPick: (type: EffectType) => void; }

export function EffectPicker({ onPick }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Effect
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Add effect</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">Space</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onPick('space')}>Reverb (Space)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('shimmer')}>Shimmer</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('convolver')}>Convolver (IR)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('reverse_reverb')}>Reverse Reverb</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('width')}>Stereo Width</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('ambient')}>Ambient Texture</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">Delay / Mod</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onPick('echo')}>Delay</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('pingpong')}>Ping-Pong Delay</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('chorus')}>Chorus</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('phaser')}>Phaser</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('vibrato')}>Vibrato</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">Motion</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onPick('tremolo')}>Tremolo (Pump)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('autofilter')}>Auto-Filter</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('autopanner')}>Auto-Panner</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">Color</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onPick('filter')}>Filter</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('fuzz')}>Fuzz</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('crush')}>Bitcrusher</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('eq3')}>EQ (3-band)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPick('compressor')}>Compressor</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
