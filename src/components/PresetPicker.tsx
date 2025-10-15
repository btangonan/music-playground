import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Presets } from '@/lib/presets';

export type PresetName = keyof typeof Presets;

interface Props {
  onPick: (presetName: PresetName) => void;
  disabled?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════
// Category Configuration
// ═════════════════════════════════════════════════════════════════════════

type CategoryConfig = {
  name: string;
  matcher: (presetKey: string) => boolean;
};

const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Classic Presets',
    matcher: (key) => !key.match(/^(Blake|Fred|Jamie|Jon|Radiohead)/)
  },
  {
    name: 'James Blake',
    matcher: (key) => key.startsWith('Blake')
  },
  {
    name: 'Fred again..',
    matcher: (key) => key.startsWith('Fred')
  },
  {
    name: 'Jamie xx',
    matcher: (key) => key.startsWith('Jamie')
  },
  {
    name: 'Jon Hopkins',
    matcher: (key) => key.startsWith('Jon')
  },
  {
    name: 'Radiohead',
    matcher: (key) => key.startsWith('Radiohead')
  }
];

// ═════════════════════════════════════════════════════════════════════════
// Display Name Conversion
// ═════════════════════════════════════════════════════════════════════════

function formatPresetDisplayName(presetKey: string): string {
  // Handle camelCase and underscores: convert to spaces
  let formatted = presetKey
    // Insert space before capital letters (camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores with spaces
    .replace(/_/g, ' ');

  return formatted;
}

// ═════════════════════════════════════════════════════════════════════════
// Dynamic Preset Organization
// ═════════════════════════════════════════════════════════════════════════

function organizePresets(): Map<string, PresetName[]> {
  const presetKeys = Object.keys(Presets) as PresetName[];
  const organized = new Map<string, PresetName[]>();

  // Initialize all categories
  CATEGORIES.forEach(category => {
    organized.set(category.name, []);
  });

  // Categorize each preset
  presetKeys.forEach(presetKey => {
    const category = CATEGORIES.find(cat => cat.matcher(presetKey));
    if (category) {
      organized.get(category.name)?.push(presetKey);
    }
  });

  // Remove empty categories
  CATEGORIES.forEach(category => {
    if (organized.get(category.name)?.length === 0) {
      organized.delete(category.name);
    }
  });

  return organized;
}

// ═════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════

export function PresetPicker({ onPick, disabled }: Props) {
  const organizedPresets = organizePresets();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2" disabled={disabled}>
          <Sparkles className="w-4 h-4" />
          Preset
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Apply artist preset</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {Array.from(organizedPresets.entries()).map(([categoryName, presets], categoryIndex) => (
          <div key={categoryName}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">
                {categoryName}
              </DropdownMenuLabel>
              {presets.map(presetKey => (
                <DropdownMenuItem key={presetKey} onSelect={() => onPick(presetKey)}>
                  {formatPresetDisplayName(presetKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            {categoryIndex < organizedPresets.size - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
