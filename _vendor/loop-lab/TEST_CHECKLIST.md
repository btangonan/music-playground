# MPC-Style Drop Zone Testing Checklist

## Setup
1. Open http://localhost:8080 in browser
2. Open DevTools Console (check for errors)
3. Default state: 3 instruments (KEYS, BASS, DRUMS) visible at top

## Phase 1: Drop Zone Interaction

### Test 1.1: Drop Zone Visual States
- [ ] Drop zone visible with dashed border and dim opacity
- [ ] Text reads: "📥 Drop instrument or effect cable here"

### Test 1.2: Drag Instrument to Drop Zone
1. Click and hold the output port (bottom circle) on KEYS instrument
2. Observe:
   - [ ] Cable appears from port to cursor (blue color)
   - [ ] Drop zone lights up with primary color
   - [ ] Drop zone text changes to "📥 Release to add KEYS to loop section"
3. Drag over drop zone:
   - [ ] Drop zone highlights brighter with scale effect
4. Release:
   - [ ] Toast notification: "✅ KEYS added to loop"
   - [ ] Fat button appears in grid below drop zone
   - [ ] Cable disappears

### Test 1.3: Verify Fat Button Appearance
After adding KEYS:
- [ ] Button shows blue color dot
- [ ] Button shows "KEYS" label
- [ ] Button shows 4x4 mini grid (all empty/inactive)
- [ ] Button shows M, S, × controls at bottom
- [ ] Button has hover effect (scale up, shadow)

### Test 1.4: Add More Instruments
Repeat 1.2 for BASS and DRUMS:
- [ ] BASS (yellow) adds successfully
- [ ] DRUMS (green) adds successfully
- [ ] Grid shows 3 buttons in responsive layout
- [ ] No overlap or layout issues

### Test 1.5: Duplicate Prevention
Try adding KEYS again:
- [ ] Drop zone accepts drag
- [ ] Release shows warning: "⚠️ Track already exists"
- [ ] No duplicate button created

## Phase 2: Step Editor Modal

### Test 2.1: Open Modal
Click on KEYS fat button:
- [ ] Modal opens with backdrop
- [ ] Header shows blue color dot + "KEYS - Step Editor"
- [ ] 2 rows of 8 step buttons visible (16 total)
- [ ] All steps show numbers 1-16
- [ ] All steps inactive (gray border, no fill)

### Test 2.2: Toggle Steps
Click step buttons 1, 5, 9, 13:
- [ ] Step 1: Fills with blue, thick border
- [ ] Step 5: Fills with blue, thick border
- [ ] Step 9: Fills with blue, thick border
- [ ] Step 13: Fills with blue, thick border
- [ ] Other steps remain inactive

### Test 2.3: Close Modal
Click X or outside modal:
- [ ] Modal closes
- [ ] Fat button now shows mini preview with 4 filled squares (steps 1,5,9,13)
- [ ] Button remains in grid

### Test 2.4: Verify Preview Updates
Reopen modal, toggle step 1 off:
- [ ] Step 1 becomes inactive
- [ ] Close modal
- [ ] Mini preview shows only 3 filled squares now

## Phase 3: Audio Playback

### Test 3.1: Basic Playback
1. Click PLAY button in toolbar
2. Observe KEYS track:
   - [ ] Playhead ring appears on active steps as they play
   - [ ] Audio triggers for steps 5, 9, 13
   - [ ] Playhead moves smoothly through all 16 steps
   - [ ] No console errors

### Test 3.2: Multiple Tracks Playing
1. Add BASS and DRUMS to loop section
2. In BASS modal: Enable steps 2, 6, 10, 14
3. In DRUMS modal: Enable steps 1, 3, 5, 7, 9, 11, 13, 15
4. Click PLAY:
   - [ ] All three tracks play simultaneously
   - [ ] Each track shows correct playhead
   - [ ] Audio is synchronized
   - [ ] No crackling or timing issues

## Phase 4: Mute/Solo Controls

### Test 4.1: Mute from Fat Button
With KEYS/BASS/DRUMS playing:
1. Click M button on KEYS fat button:
   - [ ] Button shows secondary style (highlighted)
   - [ ] Button dims (50% opacity)
   - [ ] KEYS audio stops
   - [ ] BASS and DRUMS continue playing
   - [ ] Playhead still moves on KEYS (visual only)

### Test 4.2: Solo from Fat Button
With all playing and KEYS muted:
1. Click S button on BASS fat button:
   - [ ] BASS S button highlights (secondary)
   - [ ] BASS shows yellow ring
   - [ ] Only BASS plays
   - [ ] KEYS and DRUMS silent (even unmuting KEYS doesn't play)
2. Click S again on BASS:
   - [ ] Solo off
   - [ ] BASS and DRUMS play
   - [ ] KEYS remains muted

### Test 4.3: Controls from Modal
Open DRUMS modal:
1. Click Mute button in modal header:
   - [ ] Modal button highlights
   - [ ] Fat button in background dims
   - [ ] DRUMS stops playing
2. Click Solo button:
   - [ ] Modal button highlights
   - [ ] Only DRUMS plays
   - [ ] Can still toggle steps while modal open

## Phase 5: Remove Track

### Test 5.1: Remove Empty Track
1. Create new KEYS instrument (+ Instrument button)
2. Add to loop section (no steps enabled)
3. Click × on fat button:
   - [ ] Track removes immediately (no confirmation)
   - [ ] Button disappears from grid

### Test 5.2: Remove Track with Active Steps
With BASS track having active steps:
1. Click × button on BASS:
   - [ ] Browser confirmation dialog: "This track has active steps. Remove anyway?"
2. Click Cancel:
   - [ ] Track remains
3. Click × again, then OK:
   - [ ] Track removes
   - [ ] Grid updates layout

### Test 5.3: Remove from Modal
Open KEYS modal:
1. Click Remove button in header:
   - [ ] Confirmation if steps active
   - [ ] Modal closes
   - [ ] Track removed from grid

## Phase 6: Orphan Cleanup

### Test 6.1: Delete Instrument with Track
1. Add KEYS to loop section
2. Enable some steps in modal
3. Close modal
4. In Layer 1 (top), drag KEYS instrument off screen or delete it
5. Observe:
   - [ ] Toast: "⚠️ Track removed - KEYS target was deleted"
   - [ ] Fat button automatically removed from grid
   - [ ] No console errors

## Phase 7: Effect Drag (Phase B Prep)

### Test 7.1: Effect Output Drag
1. Add an effect (+ Effect button)
2. Click and hold effect output port (bottom circle):
   - [ ] Cable appears (secondary color)
   - [ ] Drop zone activates
   - [ ] Text shows effect name (e.g., "ECHO EFFECT")
3. Release on drop zone:
   - [ ] Fat button appears for effect
   - [ ] Button shows secondary color dot
   - [ ] Label shows effect type
   - [ ] No mini preview (effects have no steps yet)
4. Click effect button:
   - [ ] Modal does not open (effect tracks not instrument type)

## Phase 8: Responsive Layout

### Test 8.1: Grid Responsiveness
1. Add 6+ tracks to loop section
2. Resize browser window:
   - [ ] Desktop (>1024px): 4 columns
   - [ ] Tablet (768-1024px): 3 columns
   - [ ] Mobile (<768px): 2 columns
   - [ ] Buttons maintain aspect ratio
   - [ ] No overflow or clipping

### Test 8.2: Modal Responsiveness
1. Resize window while modal open:
   - [ ] Modal scales appropriately
   - [ ] Step grid maintains 2x8 layout
   - [ ] Buttons remain clickable
   - [ ] No layout breaks

## Phase 9: Edge Cases

### Test 9.1: Rapid Interactions
1. Quickly toggle 10 steps in modal:
   - [ ] All toggles register
   - [ ] No state desync
   - [ ] Mini preview updates correctly

### Test 9.2: Empty State
1. Remove all tracks:
   - [ ] Only drop zone visible
   - [ ] No layout issues
   - [ ] Can add tracks again normally

### Test 9.3: Browser Refresh
1. Set up multiple tracks with steps
2. Refresh page:
   - [ ] All state resets (expected - no persistence yet)
   - [ ] App loads without errors
   - [ ] Default instruments present

## Phase 10: Visual Polish

### Test 10.1: Animations
- [ ] Drop zone pulse animation smooth
- [ ] Fat button hover/click animations smooth
- [ ] Modal fade in/out smooth
- [ ] Step button transitions smooth
- [ ] Playhead ring animation smooth

### Test 10.2: Colors
- [ ] Track colors consistent (instrument → fat button → modal)
- [ ] Color dots clear and visible
- [ ] Text readable on all backgrounds
- [ ] Border colors distinct

### Test 10.3: Touch Devices (if available)
- [ ] Drag works with touch
- [ ] Fat buttons clickable with touch
- [ ] Modal steps toggleable with touch
- [ ] No double-tap zoom issues

## Success Criteria

All checkboxes must be checked for complete verification.

**Critical Issues** (must fix before merge):
- Any console errors
- Audio not playing
- Drag/drop not working
- Modal not opening/closing

**Minor Issues** (can address in follow-up):
- Visual polish refinements
- Animation timing adjustments
- Responsive layout fine-tuning
- Accessibility improvements

## Notes

Add observations, bugs, or suggestions here:

---

**Tester Name**: _____________
**Date**: _____________
**Browser**: _____________
**OS**: _____________
**Result**: PASS / FAIL (circle one)
