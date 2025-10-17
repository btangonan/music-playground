# Figma AI Prompt - Music Playground Composer UI (Light Mode)

Create a Figma design file for a music production web app with a cute, playful, pixel-toy aesthetic.

## Project Context
- **App**: Music Playground Composer (step sequencer)
- **Repo**: btangonan/music-playground
- **Tech**: React + Tailwind CSS
- **Target**: 1200px desktop width, responsive to 720px
- **Bundle budget**: 150 KB gzipped (no raster images)

## Design Principles
- Cute, toy-like, confident
- Big rounded shapes with thin black outlines
- Pixel/voxel sticker energy
- High contrast active states (white ↔ black flip)
- Quick tactile motion (120-180ms), not flashy
- NO EMOJI - use Streamline icons from free set
- NO BITMAPS - inline SVG only

---

## File Structure

Create 3 pages:
1. **Foundations** - Tokens, colors, type, spacing, motion
2. **Components** - 9 reusable components with variants
3. **Screens** - 2 complete layouts (Default, Empty State)

Use Auto Layout everywhere. Name all layers with dev-friendly names.

---

## Page 1: Foundations

### Color Variables (Light Mode Only)

Create Figma color variables:

**Backgrounds:**
- `bg/sky`: #8EE1FF
- `surface/paper`: #FFFFFF

**Text:**
- `ink/solid`: #111111
- `ink/muted`: rgba(0,0,0,0.55)

**Tiles:**
- `tile/default`: #FFFFFF
- `tile/border`: rgba(0,0,0,0.10)
- `tile/active`: #111111
- `tile/activeText`: #FFFFFF

**Focus:**
- `ring/soft`: rgba(0,0,0,0.18)

**Accents:**
- `accent/star`: #FFD11A
- `accent/pink`: #FF62C6
- `accent/lime`: #CCFF00
- `accent/cobalt`: #3B82F6

### Size Tokens

**Border Radius:**
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- full: 999px

**Spacing Scale:**
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px

**Stroke:**
- tile: 1px
- icon: 1.5px

### Typography Styles

- **Title**: 18px / 24px line height, Semibold, Inter
- **Body**: 14px / 20px, Regular, Inter
- **Label**: 12px / 16px, Medium, Inter

### Motion Tokens

Document these keyframe names (for dev reference):
- `fast`: 120ms ease
- `normal`: 180ms ease
- Keyframes: `wiggle`, `pop`, `breath`, `comet`

### Export

Create a text layer named "tokens.json" with this structure:
```json
{
  "colors": {
    "bg": { "sky": "#8EE1FF" },
    "surface": { "paper": "#FFFFFF" },
    "ink": { "solid": "#111111", "muted": "rgba(0,0,0,0.55)" },
    "tile": {
      "default": "#FFFFFF",
      "border": "rgba(0,0,0,0.10)",
      "active": "#111111",
      "activeText": "#FFFFFF"
    },
    "ring": { "soft": "rgba(0,0,0,0.18)" },
    "accent": {
      "star": "#FFD11A",
      "pink": "#FF62C6",
      "lime": "#CCFF00",
      "cobalt": "#3B82F6"
    }
  },
  "radii": { "sm": "8px", "md": "12px", "lg": "16px", "xl": "20px", "full": "999px" },
  "spacing": { "xs": "4px", "sm": "8px", "md": "12px", "lg": "16px", "xl": "24px" },
  "motion": { "fast": "120ms", "normal": "180ms" }
}
```

---

## Page 2: Components

### IMPORTANT: Icon Source
**Use Streamline Icons Plugin** (https://home.streamlinehq.com/)
- Install the Streamline plugin in Figma
- Use FREE icons only from the free set
- Search for: play, stop, music, piano, drum, guitar, cloud, sparkle, wand, palette, slider, lightning, arrows
- Style: Bold or Regular weight
- Size: 24px default
- Color: Apply token colors after inserting

---

## Component 1: Toolbar

**Frame size**: 1200×80px
**Layout**: Horizontal, space-between, padding 16px
**Background**: `surface/paper`

**Left section**: Play + Stop buttons
- **Play button**:
  - Size: 120×48px
  - Border radius: `full` (pill shape)
  - Background: `tile/active` (#111111)
  - Text: "Play" in white, Body style
  - **Icon**: Streamline "play-circle" or "play" icon (20px, white), 8px left of text
  - States: idle, hover (scale 1.02), active (scale 0.98), disabled (opacity 0.5)

- **Stop button**:
  - Size: 100×48px
  - Same pill style
  - Background: `tile/default` with 1px `tile/border`
  - Text: "Stop" in `ink/solid`
  - **Icon**: Streamline "stop" icon (20px, black), 8px left of text

**Center section**: BPM control
- Label "BPM" in Label style
- Number display: 120 (Body style, Semibold)
- Thin horizontal slider below (100px wide, 4px height)
- Range annotation: "60-180"

**Right section**: Kit button
- Size: 48×48px circle
- **Icon**: Streamline "music-note" or "disc" icon (24px, `accent/star`)
- Background: `tile/default`
- Border: 1px `tile/border`

Create variants:
- Property "playing": false, true

---

## Component 2: MacroPill

**Frame size**: 160×200px
**Layout**: Vertical, centered, padding 16px
**Background**: `tile/default`
**Border**: 1px solid `tile/border`
**Border radius**: `lg` (16px)

**Content (top to bottom)**:
1. **Icon**: Streamline icon (32px, `accent/cobalt`)
   - **Feel**: Search "slider-horizontal" or "tune"
   - **Color**: Search "palette" or "color-picker"
   - **Space**: Search "sparkle" or "star"
   - **Hype**: Search "lightning" or "zap"
   - **Width**: Search "arrows-horizontal" or "expand"
   - **Magic**: Search "wand" or "magic"

2. Label text (Label style, `ink/solid`): "Feel", "Color", "Space", "Hype", "Width", "Magic"

3. Value display (Title style, `ink/solid`): "50" (center-aligned)

4. Vertical slider:
   - Height: 80px
   - Width: 8px, rounded ends
   - Track: `tile/border` background
   - Thumb: 16×16 circle, `tile/active`
   - Active track (below thumb): `tile/active`

**States**:
- idle
- hover (shows `ring/soft` 2px)
- dragging (scale 0.98, ring visible)
- disabled (opacity 0.4, grayscale)

Create variants:
- Property "macro": feel, color, space, hype, width, magic (affects icon and label)
- Property "state": idle, hover, dragging, disabled
- Property "value": 0, 50, 100 (affects slider thumb position)

---

## Component 3: MacroStrip

**Frame size**: 1200×240px
**Layout**: Horizontal grid, 6 columns, gap 16px, padding 16px
**Background**: transparent

Contains 6 × MacroPill instances:
1. Feel (value: 50, state: idle)
2. Color (value: 30, state: idle)
3. Space (value: 70, state: idle)
4. Hype (value: 90, state: idle)
5. Width (value: 50, state: disabled)
6. Magic (value: 50, state: disabled)

---

## Component 4: TrackBadge

**Frame size**: 180×40px
**Layout**: Horizontal, gap 8px, padding 8px 12px
**Background**: `tile/default`
**Border**: 1px `tile/border`
**Border radius**: `md` (12px)

**Content (left to right)**:
1. **Icon**: Streamline icon (20px, `ink/solid`)
   - **Keys**: Search "piano" or "keyboard"
   - **Drums**: Search "drum" or "percussion"
   - **Bass**: Search "guitar" or "music"
   - **Pad**: Search "cloud" or "mist"

2. Label text (Body style, `ink/solid`): "Keys", "Drums", "Bass", "Pad"

3. Mute button:
   - 20×20 circle
   - **Icon**: Streamline "volume-off" or "mute" (12px)
   - Background: transparent (off) or `accent/pink` (on)

4. Solo button:
   - 20×20 circle
   - **Icon**: Streamline "headphones" or "speaker" (12px)
   - Background: transparent (off) or `accent/lime` (on)

Create variants:
- Property "instrument": keys, drums, bass, pad (affects icon and label)
- Property "mute": false, true
- Property "solo": false, true

---

## Component 5: GridCell

**Frame size**: 40×40px
**Background**: `tile/default`
**Border**: 1px solid `tile/border`
**Border radius**: `xl` (20px)
**Content**: Empty or step number "1" (Label style, centered)

**States**:
1. **empty**: white tile, thin border, no content
2. **hover**: add `ring/soft` 2px ring
3. **active**: background → `tile/active` (#111), text → white, scale 0.95
4. **playing**: active state +
   - Top accent bar: 2px height, full width, `accent/cobalt`, rounded top
   - Corner sparkle: Streamline "sparkle" icon (12px, `accent/lime`) in top-right

Create variants:
- Property "state": empty, hover, active, playing
- Property "step": empty, "1", "5", "9", "13" (step numbers)

---

## Component 6: CuteGrid

**Frame size**: 1200×400px
**Layout**: Grid with labels
**Gap**: 4px horizontal, 8px vertical
**Padding**: 16px
**Background**: transparent

**Structure**:
- **Left column**: 4 × TrackBadge (Keys, Drums, Bass, Pad) vertically stacked, gap 8px
- **Top row**: Step numbers 1-16 (Label style, `ink/muted`, centered above columns)
- **Grid body**: 4 rows × 16 columns of GridCell

**Playhead indicator**:
- Vertical accent line (3px width, `accent/cobalt`, rounded)
- Extends full grid height
- Positioned at column 4 (between cells 3 and 4)

Create variants:
- Property "playhead": 0, 4, 8, 12 (which column is highlighted)

---

## Component 7: Toast

**Frame size**: 280×60px
**Layout**: Horizontal, gap 12px, padding 12px 16px
**Background**: `surface/paper`
**Border**: 2px solid `ink/solid`
**Border radius**: `lg` (16px)
**Shadow**: 0 4px 8px rgba(0,0,0,0.1)

**Content**:
1. **Icon**: Streamline "check-circle" or "thumb-up" icon (24px, `accent/lime`)
2. Text: "Saved" or "Loop on" (Body style, `ink/solid`)

Create variants:
- Property "message": saved, loop-on

---

## Component 8: Coachmark

**Frame size**: 320×80px
**Layout**: Vertical, gap 8px, padding 16px
**Background**: `accent/star` (#FFD11A)
**Border**: 2px solid `ink/solid`
**Border radius**: `xl` (20px)
**Pointer**: Small triangle (16×8px, same background and border) pointing down

**Content**:
1. **Icon**: Streamline "star" icon (40px, `ink/solid`, centered)
2. Text: "Click to play!" (Body style, `ink/solid`, centered, bold)

---

## Page 3: Screens

### Screen 1: Composer — Default

**Canvas size**: 1200×900px
**Background**: `bg/sky` (#8EE1FF)

**Layout (vertical stack, gap 24px, centered horizontally)**:

1. **Toolbar** (top)
   - playing: false

2. **MacroStrip**
   - Shows all 6 macros
   - Feel, Color, Space, Hype: idle state with varying values
   - Width, Magic: disabled state

3. **CuteGrid** (4×16)
   - playhead: 4 (4th column highlighted)
   - Sample pattern showing a musical sequence:
     - **Keys row**: steps 1, 5, 9, 13 active (shows "1", "5", "9", "13")
     - **Bass row**: steps 1, 3, 5, 7, 9, 11, 13, 15 active
     - **Drums row**: steps 1, 5, 9, 13 active (same as keys)
     - **Pad row**: steps 1, 2, 5, 6, 9, 10, 13, 14 active (pairs)
   - Cell at playhead position (column 4): show in "playing" state

4. **Coachmark** (floating, top-right of Play button)
   - Text: "Click to play!"
   - Arrow pointing to Play button

### Screen 2: Empty State

**Canvas size**: 1200×600px
**Background**: `bg/sky` (#8EE1FF)

**Layout (vertical stack, gap 24px)**:

1. **Toolbar** (playing: false)

2. **Empty grid section**:
   - Single row: 1 × TrackBadge (Keys) + 16 empty GridCells
   - Centered below: Large "Add Track" button
     - Size: 200×48px pill
     - Background: `tile/default`, border: 1px `tile/border`
     - **Icon**: Streamline "plus-circle" (20px, `ink/solid`)
     - Text: "Add Track" (Body style, `ink/solid`)

---

## Export Deliverables

### 1. tokens.json
Create a text layer with the JSON structure from Foundations section.

### 2. Tailwind Config Snippet
Create a text layer named "tailwind-extend.js":
```js
// Add to apps/composer/tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        sky: '#8EE1FF',
        paper: '#FFFFFF',
        ink: { solid: '#111111', muted: 'rgba(0,0,0,0.55)' },
        tile: {
          DEFAULT: '#FFFFFF',
          border: 'rgba(0,0,0,0.10)',
          active: '#111111',
          activeText: '#FFFFFF'
        },
        ring: { soft: 'rgba(0,0,0,0.18)' },
        accent: {
          star: '#FFD11A',
          pink: '#FF62C6',
          lime: '#CCFF00',
          cobalt: '#3B82F6'
        }
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px'
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' }
        },
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.94)' }
        },
        breath: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' }
        },
        comet: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        wiggle: 'wiggle 0.18s ease',
        pop: 'pop 0.12s ease',
        breath: 'breath 1.8s ease-in-out infinite',
        comet: 'comet 0.15s linear'
      }
    }
  }
}
```

### 3. Component Specs
Add Dev Mode annotations to each component frame:
- **Dimensions**: Width × Height
- **Padding**: All sides
- **Gap**: Between children
- **Border radius**: Token name
- **Colors**: Token names (not hex values)
- **States**: Description of state changes
- **Props**: Component API

Example annotation for GridCell:
```
Props: state ('empty' | 'hover' | 'active' | 'playing'), step (string)
Base: 40×40, border-radius xl, border 1px tile/border
States:
  - empty: bg tile/default
  - hover: + ring-2 ring/soft
  - active: bg tile/active, text tile/activeText, scale-95
  - playing: active + top bar (accent/cobalt) + sparkle icon
```

### 4. Icon Export List
Create a text layer listing all Streamline icons used:
```
Play button: play-circle-1 (20px)
Stop button: stop-1 (20px)
Kit: music-note-1 (24px)
Feel macro: slider-horizontal-1 (32px)
Color macro: palette-1 (32px)
Space macro: sparkle-1 (32px)
Hype macro: lightning-bolt-1 (32px)
Width macro: arrows-horizontal-1 (32px)
Magic macro: magic-wand-1 (32px)
Keys badge: piano-1 (20px)
Drums badge: drum-1 (20px)
Bass badge: guitar-1 (20px)
Pad badge: cloud-1 (20px)
Mute: volume-off-1 (12px)
Solo: headphones-1 (12px)
Playing sparkle: sparkle-1 (12px)
Toast success: check-circle-1 (24px)
Coachmark: star-1 (40px)
Add track: plus-circle-1 (20px)
```

---

## Implementation Notes

Add these as Figma text layers for dev reference:

**GridCell Tailwind Classes**:
```
Base:
relative h-10 w-10 rounded-xl border border-tile-border bg-tile
text-sm flex items-center justify-center select-none transition-all

Hover:
ring-2 ring-ring-soft

Active:
bg-tile-active text-tile-activeText scale-95

Playing:
bg-tile-active text-tile-activeText scale-95
after:absolute after:-top-0.5 after:h-0.5 after:w-full
after:bg-accent-cobalt after:rounded-t-xl
```

**Accessibility**:
- All buttons: `<button>` element with proper type
- Keyboard: Space/Enter for toggle, Arrow keys for sliders
- Focus rings: `focus:ring-2 focus:ring-ring-soft`
- ARIA labels: Every interactive element
- Contrast: 18.67:1 ratio (exceeds WCAG AAA)

**Performance**:
- GridCell: Use `React.memo` for 64 cell instances
- Animations: CSS-only (no JS)
- Icons: Inline SVG (exported from Streamline)
- Bundle: Keep under 150 KB gzipped

---

## Success Criteria

✅ Light mode only (no dark mode)
✅ All icons from Streamline free set
✅ Cute, playful, toy-like aesthetic
✅ Complete token system for Tailwind
✅ Every visual as vector (no raster)
✅ 1200px width layout
✅ Dev Mode annotations on all components
✅ Clear component variants and states
✅ Tailwind class mappings documented
✅ Musical pattern visible in default screen

**Design for immediate implementation** - every spec maps 1:1 to React + Tailwind code.
