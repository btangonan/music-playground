# Key Code Reference - MPC Implementation

## Type Definitions

### Drag State (Index.tsx)
```typescript
type DragState =
  | { kind: 'inst'; fromId: string; cursor: { x: number; y: number } }
  | { kind: 'fx'; fromId: string; cursor: { x: number; y: number } };
```

### Track Interface (Index.tsx)
```typescript
type TrackTarget = { kind: 'instrument'|'effect'|'sampler'; id: string };
type Track = {
  id: string;
  target: TrackTarget;
  color: string;
  label: string;
  muted: boolean;
  solo: boolean;
};
```

## Port Handlers

### Instrument Output Port (Index.tsx line 356)
```typescript
onPortPointerDown={(e)=>{ 
  if (!mainRef.current) return; 
  const m = mainRef.current.getBoundingClientRect(); 
  setDrag({ 
    kind: 'inst', 
    fromId: instrument.id, 
    cursor:{x: e.clientX - m.left, y: e.clientY - m.top} 
  }); 
}}
```

### Effect Output Port (Index.tsx line 377)
```typescript
onOutputPointerDown={(e) => { 
  if (!mainRef.current) return; 
  const m = mainRef.current.getBoundingClientRect(); 
  setDrag({ 
    kind: 'fx', 
    fromId: effect.id, 
    cursor: { x: e.clientX - m.left, y: e.clientY - m.top } 
  }); 
}}
```

### Effect Input Port (Index.tsx line 376)
```typescript
onInputPointerUp={(e) => { 
  if (!drag || drag.kind !== 'inst') return; 
  connectEffectToInstrument(drag.fromId, effect.id); 
  setDrag(null); 
}}
```

## Drop Zone Logic

### Helper Function (Index.tsx line 136)
```typescript
const getTargetName = (drag: DragState) => {
  if (drag.kind === 'inst') {
    return instrumentsRef.current.get(drag.fromId)?.kind.toUpperCase();
  } else {
    return effectsRef.current.get(drag.fromId)?.type.toUpperCase() + ' EFFECT';
  }
};
```

### Drop Handler (Index.tsx line 145)
```typescript
const handleLoopSectionDrop = useCallback((e: React.PointerEvent) => {
  if (!drag) return;
  e.stopPropagation();
  
  const targetKind = drag.kind === 'inst' ? 'instrument' : 'effect';
  const targetId = drag.fromId;
  
  // Check duplicate
  const hasDup = tracksRef.current.some(t => 
    t.target.kind === targetKind && t.target.id === targetId
  );
  
  if (hasDup) {
    toast({ title: '⚠️ Track already exists' });
    setDrag(null);
    setDropZoneHovered(false);
    return;
  }
  
  addTrack({ kind: targetKind, id: targetId });
  toast({ title: `✅ ${getTargetName(drag)} added to loop` });
  
  setDrag(null);
  setDropZoneHovered(false);
}, [drag, addTrack]);
```

### Drop Zone JSX (Index.tsx line 395)
```typescript
<div
  ref={dropZoneRef}
  className={cn(
    "relative border-2 border-dashed rounded-lg p-4 transition-all duration-200",
    !drag && "opacity-50 border-border",
    drag && "opacity-100 border-primary bg-primary/10 animate-pulse",
    dropZoneHovered && "border-primary bg-primary/20 scale-[1.02] shadow-lg"
  )}
  onPointerUp={handleLoopSectionDrop}
  onPointerEnter={() => drag && setDropZoneHovered(true)}
  onPointerLeave={() => setDropZoneHovered(false)}
>
  <div className="text-center text-sm text-muted-foreground">
    {drag ? (
      <>📥 Release to add <span className="font-bold">{getTargetName(drag)}</span> to loop section</>
    ) : (
      '📥 Drop instrument or effect cable here'
    )}
  </div>
</div>
```

## Fat Button Grid

### Grid Layout (Index.tsx line 417)
```typescript
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
  {tracks.map(track => {
    const instrument = track.target.kind === 'instrument'
      ? instruments.find(i => i.id === track.target.id)
      : undefined;

    return (
      <LoopButton
        key={track.id}
        track={track}
        instrument={instrument}
        isSelected={selectedTrackId === track.id}
        onClick={() => setSelectedTrackId(track.id)}
        onToggleMute={() => toggleMute(track.id)}
        onToggleSolo={() => toggleSolo(track.id)}
        onRemove={() => removeTrack(track.id)}
      />
    );
  })}
</div>
```

## Modal Rendering

### Modal Logic (Index.tsx line 439)
```typescript
{selectedTrackId && (() => {
  const track = tracks.find(t => t.id === selectedTrackId);
  if (!track || track.target.kind !== 'instrument') return null;
  const inst = instruments.find(i => i.id === track.target.id);
  if (!inst) return null;

  return (
    <StepEditorModal
      track={track}
      steps={inst.loop.steps}
      playheadIndex={inst.loop.playheadIndex}
      onStepToggle={(idx) => toggleLoopStep(inst.id, idx)}
      onClose={() => setSelectedTrackId(null)}
      onToggleMute={() => toggleMute(track.id)}
      onToggleSolo={() => toggleSolo(track.id)}
      onRemove={() => removeTrack(track.id)}
    />
  );
})()}
```

## Cable Rendering

### Updated Cable Logic (Index.tsx line 334)
```typescript
{drag && (() => {
  if (drag.kind === 'inst') {
    const fGetter = ()=> centerOf(instRefs.current[drag.fromId]?.getOutPortRect?.());
    const tGetter = ()=> drag.cursor;
    const inst = instruments.find(i=>i.id===drag.fromId);
    return inst ? <Cable from={fGetter} to={tGetter} color={inst.color} /> : null;
  } else {
    const fGetter = ()=> centerOf(fxRefs.current[drag.fromId]?.getOutPortRect?.());
    const tGetter = ()=> drag.cursor;
    return <Cable from={fGetter} to={tGetter} color="hsl(var(--secondary))" />;
  }
})()}
```

## Component Highlights

### LoopButton Mini Preview (LoopButton.tsx line 67)
```typescript
{instrument && (
  <div className="grid grid-cols-4 gap-0.5 mb-2">
    {instrument.loop.steps.map((active, idx) => (
      <div
        key={idx}
        className={cn(
          "w-2 h-2 rounded-sm border border-border",
          active && "bg-current",
          !active && "bg-background/50"
        )}
        style={{ color: track.color }}
      />
    ))}
  </div>
)}
```

### StepEditorModal Grid (StepEditorModal.tsx line 84)
```typescript
<div className="space-y-2">
  {/* Row 1: Steps 1-8 */}
  <div className="grid grid-cols-8 gap-2">
    {steps.slice(0, 8).map((active, idx) => (
      <button
        key={idx}
        className={cn(
          "aspect-square rounded-lg border-2 transition-all",
          "hover:scale-105 active:scale-95",
          active && "border-primary shadow-lg",
          !active && "border-border bg-background/50",
          playheadIndex === idx && "ring-2 ring-primary ring-offset-2"
        )}
        style={{
          backgroundColor: active ? track.color : undefined
        }}
        onClick={() => onStepToggle(idx)}
      >
        {idx + 1}
      </button>
    ))}
  </div>
  
  {/* Row 2: Steps 9-16 */}
  <div className="grid grid-cols-8 gap-2">
    {steps.slice(8, 16).map((active, idx) => (/* same pattern */))}
  </div>
</div>
```

## Audio Integration Preserved

### shouldTrigger Callback (Index.tsx line 242)
```typescript
const shouldTrigger = (stepIndex:number) => {
  const anySolo = tracksRef.current.some(t => t.solo);
  const track = tracksRef.current.find(t => t.target.kind==='instrument' && t.target.id===inst.id);
  if (!track) return true;
  return anySolo ? track.solo : !track.muted;
};
```

This callback is used in audio loop creation to respect mute/solo state without re-rendering.

## Key CSS Classes

### Tailwind Utilities Used
- `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` - Responsive grid
- `aspect-square` - Square buttons
- `ring-2 ring-primary ring-offset-2` - Playhead indicator
- `animate-pulse` - Drop zone animation
- `hover:scale-105 active:scale-95` - Interactive feedback
- `backdrop-blur-sm` - Frosted glass effect

### Custom Animations
- `animate-pulse` - Built-in Tailwind (drop zone)
- `transition-all duration-200` - Smooth state changes
- `hover:shadow-lg` - Elevation on hover

