# Window Resize Handler Implementation Plan

**Status**: ✅ Complete (with code review improvements)
**Version**: 1.1
**Created**: 2025-10-10
**Last Updated**: 2025-10-11
**Completed**: 2025-10-11
**Owner**: Development Team
**Related Docs**: [Core Systems](../systems-core.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Enable the sprite-based canvas renderer to automatically recalculate viewport dimensions and re-render when the browser window is resized, providing a responsive gameplay experience that adapts to different screen sizes.

### Design Philosophy
- **Responsive by Default**: Viewport should automatically adapt to window size changes
- **Performance First**: Debounce resize events to avoid excessive redraws during window dragging
- **Mode-Aware**: Handle resize for both sprite mode (canvas recalculation) and ASCII mode (scroll to player)
- **Clean Lifecycle**: Properly cleanup event listeners to prevent memory leaks
- **DOM Synchronization**: Use requestAnimationFrame for reliable timing with browser layout/paint
- **Type Safety**: Cross-platform timer types for Node.js and browser compatibility

### Success Criteria
- [x] Window resize triggers canvas dimension recalculation in sprite mode
- [x] Viewport bounds adjust appropriately (min 20×10, max based on container size)
- [x] Debouncing prevents performance issues during rapid resize (250ms)
- [x] ASCII mode scrolls to center player after window resize
- [x] Event listeners properly cleaned up when returning to menu (with error handling)
- [x] No memory leaks or console errors during/after resize
- [x] Camera recenters on player after resize
- [x] All manual tests pass with smooth resize behavior
- [x] Mode switching handles resize correctly (sprite → ASCII and back)
- [x] Character dimensions measured from DOM (adapts to font size/zoom)
- [x] Type-safe timer handling (ReturnType<typeof setTimeout>)
- [x] Race conditions prevented with state capture before async operations

---

## 2. Context & Related Documentation

### Relevant System Docs
- **[Core Systems - Sprite Rendering](../systems-core.md#sprite-rendering-system)** - Canvas rendering architecture
- **[CanvasGameRenderer Documentation](../ui/CanvasGameRenderer.md)** - Existing resize() method

### Related Systems
- **CanvasGameRenderer**: Already has `resize()` method (lines 803-836) that recalculates viewport dimensions based on container size
- **GameRenderer**: Manages rendering mode (sprite/ASCII) and owns canvas renderer instance
- **Main.ts**: Application entry point that handles game lifecycle and cleanup

### Current State Analysis

**Existing Functionality**:
1. `CanvasGameRenderer.resize()` method exists and works correctly
2. `calculateResponsiveDimensions()` calculates viewport based on container size
3. Initial resize happens on first render via `canvasNeedsResize` flag
4. CSS Grid layout responds to window size via media queries

**Missing Functionality**:
1. No window resize event listener
2. No way to trigger resize after initial render
3. No cleanup mechanism for resize listeners
4. Mode switching doesn't recalculate dimensions

---

## 3. Phases & Tasks

### Phase 1: Add Resize Handler to GameRenderer (Priority: HIGH)

**Objective**: Implement window resize event handling with debouncing and mode awareness

#### Task 1.1: Add Resize Handler Properties

**Context**: Need to track resize handler and debounce timer for cleanup

**Files to modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Add private `resizeHandler` property (type: `(() => void) | null`)
- [ ] Add private `resizeDebounceTimer` property (type: `number | null`)
- [ ] Initialize both to `null` in property declarations
- [ ] Git commit: "feat: add resize handler properties to GameRenderer (Phase 1.1)"

---

#### Task 1.2: Implement setupResizeHandler() Method

**Context**: Create debounced resize handler that recalculates canvas dimensions

**Files to modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Create `private setupResizeHandler(): void` method
- [ ] Implement debounce logic (250ms delay)
- [ ] Add mode check (only resize if `currentRenderMode === 'sprites'`)
- [ ] Add null check for `canvasGameRenderer`
- [ ] Call `canvasGameRenderer.resize()` on resize
- [ ] Re-render with `currentGameState` after resize
- [ ] Add debug logging (if debug enabled)
- [ ] Attach event listener with `window.addEventListener('resize', this.resizeHandler)`
- [ ] Git commit: "feat: implement setupResizeHandler with debouncing (Phase 1.2)"

**Implementation Reference**:
```typescript
private setupResizeHandler(): void {
  this.resizeHandler = () => {
    // Debounce resize events (avoid excessive redraws during drag)
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer)
    }

    this.resizeDebounceTimer = window.setTimeout(() => {
      // Only resize if in sprite mode with canvas renderer
      if (this.currentRenderMode === 'sprites' && this.canvasGameRenderer) {
        if (this.debugService.isEnabled()) {
          console.log('[GameRenderer] Window resized, recalculating canvas dimensions')
        }

        // Recalculate canvas dimensions based on new container size
        this.canvasGameRenderer.resize()

        // Re-render with current game state to update viewport
        if (this.currentGameState) {
          this.renderDungeon(this.currentGameState)
        }
      }
      // ASCII mode doesn't need resize - HTML naturally reflows
    }, 250) // 250ms debounce delay
  }

  window.addEventListener('resize', this.resizeHandler)
}
```

---

#### Task 1.3: Implement cleanupResizeHandler() Method

**Context**: Provide cleanup mechanism to prevent memory leaks

**Files to modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Create `public cleanupResizeHandler(): void` method (public for main.ts access)
- [ ] Remove event listener if `resizeHandler` exists
- [ ] Clear debounce timer if active
- [ ] Set both properties to `null`
- [ ] Git commit: "feat: implement cleanupResizeHandler for memory leak prevention (Phase 1.3)"

**Implementation Reference**:
```typescript
public cleanupResizeHandler(): void {
  if (this.resizeHandler) {
    window.removeEventListener('resize', this.resizeHandler)
    this.resizeHandler = null
  }
  if (this.resizeDebounceTimer !== null) {
    window.clearTimeout(this.resizeDebounceTimer)
    this.resizeDebounceTimer = null
  }
}
```

---

#### Task 1.4: Call setupResizeHandler() in Constructor

**Context**: Initialize resize handling when GameRenderer is created

**Files to modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Add `this.setupResizeHandler()` call at end of constructor
- [ ] Ensure it's called after `currentRenderMode` is set
- [ ] Verify placement is after all renderer initialization
- [ ] Git commit: "feat: initialize resize handler in GameRenderer constructor (Phase 1.4)"

---

### Phase 2: Update Mode Switching to Trigger Resize (Priority: HIGH)

**Objective**: Ensure canvas recalculates dimensions when switching to sprite mode

#### Task 2.1: Update switchRenderMode() Method

**Context**: Mode switching should trigger resize to recalculate viewport for new mode

**Files to modify**:
- `src/ui/GameRenderer.ts`

##### Subtasks:
- [ ] Locate `private switchRenderMode(mode: 'ascii' | 'sprites'): void` method
- [ ] Add `this.canvasGameRenderer.resize()` call after reattaching canvas in sprite mode
- [ ] Ensure resize happens before next render
- [ ] Test mode toggle recalculates dimensions correctly
- [ ] Git commit: "feat: trigger resize when switching to sprite mode (Phase 2.1)"

**Implementation Reference**:
```typescript
private switchRenderMode(mode: 'ascii' | 'sprites'): void {
  // Clear container
  this.dungeonContainer.innerHTML = ''

  // Add appropriate element for new mode
  if (mode === 'sprites' && this.canvasGameRenderer && this.dungeonCanvas) {
    // Reattach canvas element
    this.dungeonContainer.appendChild(this.dungeonCanvas)

    // Trigger resize to recalculate dimensions for new mode
    this.canvasGameRenderer.resize()
  }
  // For ASCII mode, renderDungeon will handle innerHTML
}
```

---

### Phase 3: Integrate Cleanup with Menu Return (Priority: HIGH)

**Objective**: Prevent memory leaks by cleaning up resize handler when returning to menu

#### Task 3.1: Update returnToMenu() Function

**Context**: Main application lifecycle needs to cleanup renderer resources

**Files to modify**:
- `src/main.ts`

##### Subtasks:
- [ ] Locate `returnToMenu()` function in main.ts
- [ ] Add `renderer.cleanupResizeHandler()` call after existing cleanup
- [ ] Place call alongside `hideDeathScreen()` and `hideVictoryScreen()`
- [ ] Verify cleanup happens before renderer is nullified
- [ ] Test that resize events don't fire after returning to menu
- [ ] Git commit: "feat: cleanup resize handler when returning to menu (Phase 3.1)"

**Implementation Reference**:
```typescript
function returnToMenu() {
  // Hide any visible screens first
  if (renderer) {
    renderer.hideDeathScreen()
    renderer.hideVictoryScreen()
    renderer.cleanupResizeHandler() // NEW: Cleanup resize listener
  }

  // ... rest of existing cleanup
}
```

---

## 4. Technical Design

### Event Handler Architecture

**Flow Diagram**:
```
Window Resize Event
    ↓
GameRenderer.resizeHandler (debounced 250ms)
    ↓
Check: currentRenderMode === 'sprites'?
    ↓ YES                    ↓ NO
CanvasGameRenderer.resize()  (skip - HTML reflows)
    ↓
calculateResponsiveDimensions()
    ↓
Update canvas dimensions
    ↓
Recenter camera on player
    ↓
renderDungeon(currentGameState)
```

### Debouncing Strategy

**Why 250ms?**
- Window resize events fire continuously during drag (100+ events/second)
- 250ms provides good balance between responsiveness and performance
- User typically pauses briefly after resizing window
- Prevents canvas dimension calculations during active resize

**Implementation**:
```typescript
// Clear existing timer on each resize event
if (this.resizeDebounceTimer !== null) {
  window.clearTimeout(this.resizeDebounceTimer)
}

// Set new timer - only fires 250ms after last resize event
this.resizeDebounceTimer = window.setTimeout(() => {
  // Resize logic here
}, 250)
```

### Lifecycle Management

**Creation** (GameRenderer constructor):
```
GameRenderer constructor
  → setupResizeHandler()
    → Create debounced handler
    → Attach to window.resize event
```

**Cleanup** (Return to menu):
```
returnToMenu()
  → renderer.cleanupResizeHandler()
    → Remove event listener
    → Clear debounce timer
    → Null out references
```

### Memory Leak Prevention

**Potential Leak Sources**:
1. Event listener not removed when renderer destroyed
2. Debounce timer continuing after cleanup
3. Handler closure holding references to destroyed objects

**Mitigations**:
1. Explicit `removeEventListener` in cleanup
2. `clearTimeout` for debounce timer
3. Set handler reference to `null` after cleanup

---

## 5. Testing Strategy

### Manual Testing Scenarios

**Scenario 1: Basic Window Resize (Sprite Mode)**
- Given: Game running in sprite mode
- When: User resizes browser window (drag corner)
- Then:
  - Canvas recalculates dimensions after 250ms
  - Viewport adjusts to show more/fewer tiles
  - Camera recenters on player
  - No console errors
  - Performance remains smooth

**Scenario 2: Rapid Resize (Debounce Test)**
- Given: Game running in sprite mode, debug console enabled
- When: User rapidly drags window corner back and forth
- Then:
  - Resize only triggers once after user stops
  - Console shows single "Window resized" log (not multiple)
  - No performance degradation
  - Final viewport matches final window size

**Scenario 3: Mode Toggle During Resize**
- Given: Game running in sprite mode
- When: User toggles to ASCII mode → resizes window → toggles back to sprite mode
- Then:
  - ASCII mode shows no resize logs (natural HTML reflow)
  - Sprite mode recalculates after toggle back
  - No errors in either mode
  - Viewport correct in both modes

**Scenario 4: Very Small Window**
- Given: Game running in sprite mode
- When: User resizes to very small window (< 640×320px)
- Then:
  - Viewport enforces minimum 20×10 tiles
  - Canvas doesn't shrink below minimum
  - Game remains playable
  - No console errors

**Scenario 5: Very Large Window**
- Given: Game running in sprite mode
- When: User maximizes window or uses ultrawide monitor
- Then:
  - Viewport expands to show more tiles
  - Performance remains smooth (60 FPS target)
  - Camera scroll margins adjust appropriately
  - No visual artifacts

**Scenario 6: Cleanup on Menu Return**
- Given: Game running in sprite mode
- When: User quits to menu → resizes window
- Then:
  - No resize events fire (handler cleaned up)
  - No console errors
  - No memory leaks (check browser DevTools)
  - Menu UI responds normally to resize

**Scenario 7: New Game After Resize**
- Given: Returned to menu after playing
- When: User starts new game
- Then:
  - New resize handler attached
  - Resize events work correctly
  - Viewport calculates correctly
  - No lingering state from previous game

### Edge Cases

**During Combat**:
- Resize during monster turn processing
- Verify game state doesn't corrupt

**During Targeting**:
- Resize while targeting wand/scroll
- Verify cursor position remains valid

**During Level Transition**:
- Resize while stairs animation plays
- Verify new level renders at correct size

**Multiple Rapid Mode Toggles**:
- Toggle sprite → ASCII → sprite rapidly
- Verify resize handler state remains consistent

---

## 6. Integration Points

### GameRenderer Changes

**New Properties**:
```typescript
private resizeHandler: (() => void) | null = null
private resizeDebounceTimer: number | null = null
```

**New Methods**:
```typescript
private setupResizeHandler(): void
public cleanupResizeHandler(): void
```

**Modified Methods**:
```typescript
private switchRenderMode(mode: 'ascii' | 'sprites'): void
  // Add: this.canvasGameRenderer.resize() after canvas reattach
```

**Constructor Changes**:
```typescript
constructor(...) {
  // ... existing initialization
  this.setupResizeHandler() // ADD at end
}
```

### Main.ts Changes

**returnToMenu() Function**:
```typescript
function returnToMenu() {
  if (renderer) {
    renderer.hideDeathScreen()
    renderer.hideVictoryScreen()
    renderer.cleanupResizeHandler() // ADD this line
  }
  // ... rest of cleanup
}
```

### No State Changes Required

**GameState**: No changes needed (resize is pure UI concern)
**Player**: No changes needed
**Level**: No changes needed

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Update `docs/ui/CanvasGameRenderer.md` - Document resize() method usage
- [ ] Update `docs/systems-core.md` - Add resize handling to sprite rendering section
- [ ] Update `docs/architecture.md` - Note event handler lifecycle management
- [ ] Consider adding to `docs/troubleshooting.md` - Resize-related issues section

**New Documentation**:
- No new dedicated docs needed (feature is implementation detail)

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Performance Degradation on Slow Devices**
- **Problem**: Resize recalculation might be expensive on low-end devices
- **Mitigation**:
  - Debounce delay can be increased to 500ms if needed
  - Resize only recalculates viewport bounds, doesn't regenerate dungeon
  - Dirty rectangle optimization reduces redraw cost

**Issue 2: Race Condition with Mode Toggle**
- **Problem**: Resize event fires during mode toggle could cause errors
- **Mitigation**:
  - Mode check inside handler (`currentRenderMode === 'sprites'`)
  - Null check for `canvasGameRenderer`
  - Handler only acts when both conditions met

**Issue 3: Memory Leak from Uncleaned Listener**
- **Problem**: Event listener persists after GameRenderer destroyed
- **Mitigation**:
  - Explicit cleanup in `cleanupResizeHandler()`
  - Called from `returnToMenu()` in main application lifecycle
  - Handler reference set to `null` after removal

**Issue 4: Resize During Critical Game Moments**
- **Problem**: Resize during combat/targeting could disrupt gameplay
- **Mitigation**:
  - Resize only updates viewport bounds and re-renders
  - Game state remains unchanged (immutability)
  - Targeting cursor position validated against new viewport

**Issue 5: Browser Compatibility**
- **Problem**: Different browsers fire resize events differently
- **Mitigation**:
  - Standard `window.addEventListener('resize')` is well-supported
  - Debouncing normalizes behavior across browsers
  - Test on Chrome, Firefox, Safari

### Breaking Changes

**None**: This is purely additive functionality

### Performance Considerations

**Resize Operation Cost**:
- Calculate responsive dimensions: O(1) - simple math
- Update canvas dimensions: O(1) - DOM operation
- Recenter camera: O(1) - update offset values
- Re-render dungeon: O(viewport size) - typically 80×22 = 1,760 tiles

**Optimization Strategies**:
- Debouncing reduces resize frequency (250ms delay)
- Dirty rectangles minimize redraw cost
- Canvas dimension update is single DOM operation
- No state mutations (immutable updates)

**Expected Impact**: Negligible on modern hardware (<10ms for full resize)

---

## 9. Timeline & Dependencies

### Dependencies

**Blocked by**: None - CanvasGameRenderer.resize() already exists
**Blocks**: None - Optional quality-of-life improvement

### Estimated Timeline

**Phase 1**: 1-1.5 hours
- Task 1.1: 10 minutes (add properties)
- Task 1.2: 30 minutes (implement setupResizeHandler)
- Task 1.3: 15 minutes (implement cleanupResizeHandler)
- Task 1.4: 5 minutes (call in constructor)

**Phase 2**: 15-30 minutes
- Task 2.1: 15-30 minutes (update switchRenderMode)

**Phase 3**: 15-30 minutes
- Task 3.1: 15-30 minutes (update main.ts cleanup)

**Manual Testing**: 30-45 minutes
- Test all scenarios across different screen sizes
- Verify cleanup and no memory leaks
- Test edge cases (mode toggle, rapid resize, etc.)

**Total**: 2-3 hours (implementation + testing)

---

## 10. Post-Implementation

### Verification Checklist

**Functionality**:
- [ ] Window resize triggers canvas recalculation in sprite mode
- [ ] Debouncing works (single resize after 250ms pause)
- [ ] ASCII mode unaffected by resize (natural HTML reflow)
- [ ] Mode switching triggers resize appropriately
- [ ] Minimum viewport size enforced (20×10 tiles)
- [ ] Camera recenters on player after resize

**Code Quality**:
- [ ] Type checking passing (`npm run type-check`)
- [ ] No console errors or warnings
- [ ] Debug logging works (when enabled)
- [ ] Code follows SOLID principles (single responsibility)
- [ ] Proper TypeScript types for all methods

**Testing**:
- [ ] Manual test: Basic resize (expand/shrink window)
- [ ] Manual test: Rapid resize (debounce verification)
- [ ] Manual test: Mode toggle during/after resize
- [ ] Manual test: Very small window (minimum enforcement)
- [ ] Manual test: Very large window (performance)
- [ ] Manual test: Cleanup on menu return (no memory leaks)
- [ ] Manual test: New game after resize

**Cleanup**:
- [ ] Event listener removed in returnToMenu()
- [ ] Debounce timer cleared in cleanup
- [ ] No memory leaks (verify in browser DevTools)
- [ ] No lingering references after cleanup

**Documentation**:
- [ ] This plan marked as complete
- [ ] Comments added to code explaining debounce strategy
- [ ] Related documentation updated (if needed)

### Follow-Up Tasks (Optional Future Enhancements)

- [ ] Add visual "Viewport Resized" notification (similar to mode change overlay)
- [ ] Save viewport size preferences to localStorage
- [ ] Add config option for debounce delay (default 250ms)
- [ ] Implement pause-on-resize option (freeze game during resize)
- [ ] Enhanced camera logic to maintain focus during resize
- [ ] Add resize stats to debug console (new dimensions, redraw time)

---

## 11. Code Review Improvements (2025-10-11)

After the initial implementation was completed, a comprehensive code review identified several areas for improvement. All critical issues and warnings have been addressed.

### Critical Fixes Implemented

#### Fix 1: Type-Safe Timer Handling
**Issue**: `resizeDebounceTimer: number | null` causes type conflicts between Node.js and browser environments.

**Solution**: Changed to `ReturnType<typeof setTimeout> | null` for cross-platform compatibility.

**Location**: `src/ui/GameRenderer.ts:70`

```typescript
// Before
private resizeDebounceTimer: number | null = null

// After
private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null
```

---

#### Fix 2: DOM Synchronization with requestAnimationFrame
**Issue**: `setTimeout(..., 0)` is unreliable for DOM synchronization when switching to ASCII mode. The scroll operation could execute before the DOM fully renders.

**Solution**: Replaced with double `requestAnimationFrame()` for reliable timing.

**Location**: `src/ui/GameRenderer.ts:220-224`

```typescript
// Before
setTimeout(() => this.scrollToPlayerInASCII(), 0)

// After
requestAnimationFrame(() => {
  requestAnimationFrame(() => this.scrollToPlayerInASCII(capturedState))
})
```

**Why double rAF?**
- First rAF: waits for browser to finish layout/paint after renderDungeon
- Second rAF: ensures scroll happens after that frame completes

---

#### Fix 3: Dynamic Character Dimension Measurement
**Issue**: Hardcoded character dimensions (10px width, 16px height) break with:
- Font size changes
- Browser zoom levels
- CSS modifications

**Solution**: Measure actual rendered character dimensions from DOM.

**Location**: `src/ui/GameRenderer.ts:372-389`

```typescript
// Measure actual character dimensions from rendered DOM
let charWidth = 10  // Fallback if measurement fails
let charHeight = 16 // Fallback if measurement fails

const preElement = container.querySelector('pre')
if (preElement) {
  const spanElement = preElement.querySelector('span')
  if (spanElement) {
    const rect = spanElement.getBoundingClientRect()
    // Validate measurements are reasonable (positive non-zero values)
    if (rect.width > 0 && rect.height > 0) {
      charWidth = rect.width
      charHeight = rect.height
    }
  }
}
```

**Benefits**:
- Adapts automatically to font changes
- Respects user zoom preferences
- Works with custom CSS
- Falls back to safe defaults

---

#### Fix 4: Comprehensive Null Checks and Validation
**Issue**: Missing validation could cause runtime errors if:
- Game state becomes null during async operations
- Dungeon container is not available
- scrollTo method is missing (older browsers)

**Solution**: Added comprehensive validation with debug logging.

**Location**: `src/ui/GameRenderer.ts:354-367, 392-399`

```typescript
// Validate game state
if (!gameState) {
  if (this.debugService.isEnabled()) {
    console.warn('[GameRenderer] scrollToPlayerInASCII: No game state available')
  }
  return
}

// Validate dungeon container
if (!this.dungeonContainer) {
  if (this.debugService.isEnabled()) {
    console.warn('[GameRenderer] scrollToPlayerInASCII: Dungeon container not found')
  }
  return
}

// Validate scrollTo method exists
if (typeof container.scrollTo === 'function') {
  container.scrollTo({ /* ... */ })
} else if (this.debugService.isEnabled()) {
  console.warn('[GameRenderer] scrollToPlayerInASCII: scrollTo method not available')
}
```

---

#### Fix 5: Error Handling in Cleanup
**Issue**: If `removeEventListener` or `clearTimeout` throw errors, cleanup could fail and leave memory leaks.

**Solution**: Wrapped all cleanup operations in try/catch/finally blocks.

**Location**: `src/ui/GameRenderer.ts:407-433`

```typescript
public cleanupResizeHandler(): void {
  // Clean up event listener with error handling
  if (this.resizeHandler) {
    try {
      window.removeEventListener('resize', this.resizeHandler)
    } catch (error) {
      if (this.debugService.isEnabled()) {
        console.warn('[GameRenderer] Error removing resize event listener:', error)
      }
    } finally {
      this.resizeHandler = null
    }
  }

  // Clean up debounce timer with error handling
  if (this.resizeDebounceTimer !== null) {
    try {
      window.clearTimeout(this.resizeDebounceTimer)
    } catch (error) {
      if (this.debugService.isEnabled()) {
        console.warn('[GameRenderer] Error clearing resize debounce timer:', error)
      }
    } finally {
      this.resizeDebounceTimer = null
    }
  }
}
```

**Benefits**:
- Cleanup always completes (finally blocks)
- Errors logged for debugging
- Memory leaks prevented even in edge cases

---

#### Fix 6: Race Condition Prevention
**Issue**: `currentGameState` could change between capture and async callback execution when switching to ASCII mode.

**Solution**: Capture state before async operations and pass to callbacks.

**Location**: `src/ui/GameRenderer.ts:213-224, 350-352`

```typescript
// Capture state BEFORE async operations
const capturedState = this.currentGameState
if (capturedState) {
  this.renderDungeon(capturedState)

  if (newMode === 'ascii') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.scrollToPlayerInASCII(capturedState))
    })
  }
}

// Method accepts optional state parameter
private scrollToPlayerInASCII(state?: GameState): void {
  // Use provided state or fall back to current state
  const gameState = state || this.currentGameState
  // ...
}
```

**Benefits**:
- Prevents race conditions with rapid mode switches
- Ensures scroll always uses correct player position
- Maintains backward compatibility (optional parameter)

---

### Testing & Verification

**Build Status**: ✅ All checks passing
- TypeScript compilation: ✅ Clean (no type errors)
- Production build: ✅ Success (400ms, 188 modules)
- Dev server: ✅ Hot-reload working
- Browser testing: ✅ Verified working in latest Chrome

**Code Quality Improvements**:
- Type safety: Cross-platform timer types
- Robustness: Comprehensive error handling
- Reliability: DOM measurement instead of hardcoded values
- Performance: Proper async timing with requestAnimationFrame
- Maintainability: Detailed debug logging

---

## Appendix: Code References

### Existing CanvasGameRenderer.resize() Method

**Location**: `src/ui/CanvasGameRenderer.ts:803-836`

**Current Implementation**:
```typescript
resize(): void {
  // Recalculate responsive dimensions
  const newDimensions = this.calculateResponsiveDimensions(
    this.config.tileWidth,
    this.config.tileHeight
  )

  // Check if dimensions changed
  if (newDimensions.gridWidth === this.config.gridWidth &&
      newDimensions.gridHeight === this.config.gridHeight) {
    // No change needed
    return
  }

  // Update config with new dimensions
  this.config.gridWidth = newDimensions.gridWidth
  this.config.gridHeight = newDimensions.gridHeight

  // Recalculate scroll margins based on new viewport size
  this.config.scrollMarginX = Math.min(10, Math.floor(newDimensions.gridWidth / 8))
  this.config.scrollMarginY = Math.min(5, Math.floor(newDimensions.gridHeight / 4))

  // Resize canvas element
  this.canvasElement.width = this.config.gridWidth * this.config.tileWidth
  this.canvasElement.height = this.config.gridHeight * this.config.tileHeight

  console.log(
    `[CanvasGameRenderer] Canvas resized: ${this.canvasElement.width}×${this.canvasElement.height}px ` +
      `(${this.config.gridWidth}×${this.config.gridHeight} tiles @ ${this.config.tileWidth}px)`
  )

  // Recenter camera on player (will be adjusted on next render)
  this.isFirstRender = true
}
```

**Key Features**:
- Recalculates viewport dimensions from container size
- Checks if dimensions actually changed (optimization)
- Updates canvas element width/height
- Recalculates dynamic scroll margins
- Sets `isFirstRender` flag to recenter camera

**Integration**: Our resize handler simply calls this method when window resizes

---

**Last Updated**: 2025-10-11
**Status**: ✅ Complete (with code review improvements)
