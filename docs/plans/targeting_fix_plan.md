# Targeting System Rendering Fix - Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Architecture](../architecture.md) | [State Management](../services/GameStateManager.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Fix the wand targeting system so that after selecting a wand, the targeting cursor appears on the game map with visual feedback (cursor, targeting line, and contextual menu), allowing the player to select a target with arrow keys.

### Design Philosophy
- **State-Based Rendering**: All visible states should render themselves through the state manager
- **Separation of Concerns**: PlayingState should not render when paused by another state
- **Centralized Rendering Loop**: Main loop should orchestrate rendering of all visible states

### Success Criteria
- [x] Diagnostic complete: Root cause identified
- [ ] After selecting a wand, targeting cursor appears immediately on game map
- [ ] Targeting cursor moves with arrow keys and shows real-time visual feedback
- [ ] Targeting line draws from player through cursor until hitting wall
- [ ] Contextual menu shows options: "Enter to zap / ESC to cancel"
- [ ] Pressing Enter zaps the wand at target
- [ ] Pressing ESC cancels targeting and returns to normal gameplay
- [ ] All existing tests pass
- [ ] Manual testing completed for full zap-wand-target-confirm flow

---

## 2. Root Cause Analysis

### Bug Discovery Timeline

**Reported Symptoms:**
1. User presses 'z' to zap wand ✅ Works
2. Wand selection dialog appears ✅ Works
3. User selects wand from list ✅ Works
4. Expected: Targeting cursor appears on map ❌ **BROKEN**
5. Actual: Nothing visible, feels like invisible modal blocking input ❌ **BROKEN**
6. Cursor movement and visual feedback never appear ❌ **BROKEN**

### Execution Flow (CURRENT - BROKEN)

```
1. User presses 'z' (zap wand)
   ↓
2. main.ts keydown handler → stateManager.getCurrentState().handleInput()
   ↓
3. Current state: PlayingState
   ↓
4. PlayingState.handleInput() → inputHandler.handleKeyPress(event, gameState)
   ↓
5. InputHandler case 'z' → modalController.showItemSelection('wand', callback)
   ↓
6. Modal displayed (DOM element added)
   ↓
7. InputHandler returns null (no command yet)
   ↓
8. PlayingState skips command execution
   ↓
9. PlayingState.handleInput() line 130: this.renderer.render(this.gameState)
   ↓ [Modal now visible on screen] ✅

--- User presses 'a' (select first wand) ---

10. main.ts keydown handler → PlayingState.handleInput()
    ↓
11. PlayingState → inputHandler.handleKeyPress()
    ↓
12. InputHandler line 158: modalController.handleInput(event) returns true
    ↓
13. Inside ModalController: Selection callback invoked
    ↓
14. Callback line 467: modalController.hide() [Modal removed from DOM]
    ↓
15. Callback line 470-474: Creates TargetSelectionState
    ↓
16. Callback line 501: stateManager.pushState(targetingState)
    ↓
17. GameStateManager.pushState() → targetingState.enter()
    ↓
18. TargetSelectionState.enter() initializes cursor position
    ↓
19. Callback returns → modalController.handleInput() returns true
    ↓
20. InputHandler.handleKeyPress() returns null (no pending command)
    ↓
21. ⚠️ BUG #1: PlayingState.handleInput() line 130: this.renderer.render(this.gameState)
    ↓ [Game rendered WITHOUT targeting overlay!] ❌

--- User presses ArrowRight (move cursor) ---

22. main.ts keydown handler → stateManager.getCurrentState()
    ↓
23. Returns: TargetSelectionState ✅ (Correct!)
    ↓
24. TargetSelectionState.handleInput(input) → moveCursor(1, 0)
    ↓
25. Cursor position updated internally
    ↓
26. ⚠️ BUG #2: No render() call after handleInput()!
    ↓ [Cursor moved but screen never updates!] ❌
```

### Root Cause: TWO Rendering Bugs

**Bug #1: PlayingState renders after being paused**
- **Location**: `src/states/PlayingState/PlayingState.ts` line 130
- **Problem**: After `TargetSelectionState` is pushed onto the stack, `PlayingState.handleInput()` continues executing and calls `this.renderer.render(this.gameState)`
- **Impact**: The targeting overlay is overwritten with normal game rendering
- **Why it happens**: The modal callback pushes the new state synchronously during `PlayingState.handleInput()` execution, but the method continues and renders

**Bug #2: No centralized rendering after input**
- **Location**: `src/main.ts` lines 281-293
- **Problem**: After delegating input to the current state, there's no code to render visible states
- **Impact**: `TargetSelectionState.handleInput()` updates the cursor but never calls `render()`
- **Why it happens**: The main input loop only calls `handleInput()`, not `render()`
- **Evidence**: The `renderAllVisibleStates()` function is defined (line 272-277) but never called

### Why TargetSelectionState Rendering Doesn't Work

**TargetSelectionState.render()** (line 134-136):
```typescript
render(): void {
  this.gameRenderer.renderTargetingOverlay(this)
}
```

**GameRenderer.renderTargetingOverlay()** (line 643-652):
```typescript
renderTargetingOverlay(targetingState: any): void {
  // Store targeting state so it can be used in next render() call
  this.targetingState = targetingState

  // Render info panel showing target details
  const cursor = targetingState.getCursorPosition()
  const range = targetingState.getRange()
  const state = targetingState.getGameState()
  this.renderTargetingInfo(state, cursor, range)
}
```

**The problem**: `renderTargetingOverlay()` stores the targeting state and renders the info panel (contextual menu), but it doesn't trigger a full game render! The targeting cursor and line are only drawn when `GameRenderer.render()` is called (which happens in `renderDungeon()` line 206-345).

**Current flow**:
1. `TargetSelectionState.render()` → `GameRenderer.renderTargetingOverlay()`
2. Stores `this.targetingState = targetingState`
3. Renders info panel (DOM element)
4. But cursor and line are in `GameRenderer.render()` → `renderDungeon()` which is never called!

**Expected flow**:
1. Main loop should render all visible states
2. For transparent states like `TargetSelectionState`, render the base game first, then the overlay
3. `TargetSelectionState.render()` should trigger a full game render with targeting overlay

---

## 3. Phases & Tasks

### Phase 1: Implement Centralized Rendering Loop (Priority: HIGH)

**Objective**: Ensure all visible states are rendered after each input event

#### Task 1.1: Add renderAllVisibleStates() call to main input loop

**Context**: The `renderAllVisibleStates()` function exists but is never called. After each input event, we need to render all visible states to show UI changes.

**Files to modify**:
- `src/main.ts` (lines 281-293)

##### Subtasks:
- [ ] After `currentState.handleInput(input)`, call `renderAllVisibleStates()`
- [ ] Verify the function renders states bottom-to-top (base game → overlays)
- [ ] Test that transparent states (targeting, inventory) show game underneath
- [ ] Git commit: "fix: call renderAllVisibleStates after input handling"

**Code Change:**
```typescript
// src/main.ts line 281-293 (CURRENT)
currentKeydownHandler = (event: KeyboardEvent) => {
  const currentState = stateManager.getCurrentState()
  if (currentState) {
    const input: Input = {
      key: event.key,
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
    }
    currentState.handleInput(input)
    // ❌ Missing: renderAllVisibleStates()
  }
}

// src/main.ts line 281-293 (FIXED)
currentKeydownHandler = (event: KeyboardEvent) => {
  const currentState = stateManager.getCurrentState()
  if (currentState) {
    const input: Input = {
      key: event.key,
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
    }
    currentState.handleInput(input)
    renderAllVisibleStates() // ✅ Render all visible states after input
  }
}
```

---

#### Task 1.2: Remove renderer.render() call from PlayingState

**Context**: `PlayingState.handleInput()` currently calls `this.renderer.render()` at the end (line 130). This is incorrect because:
1. It renders even when PlayingState is paused by another state
2. It doesn't respect the state stack's transparent rendering
3. It's the responsibility of the main loop to render, not individual states

**Files to modify**:
- `src/states/PlayingState/PlayingState.ts` (line 130)

##### Subtasks:
- [ ] Remove `this.renderer.render(this.gameState)` call from `PlayingState.handleInput()`
- [ ] Verify PlayingState still renders via `renderAllVisibleStates()` in main loop
- [ ] Test that modals, inventory, and targeting still render correctly
- [ ] Git commit: "refactor: remove direct render call from PlayingState.handleInput"

**Code Change:**
```typescript
// src/states/PlayingState/PlayingState.ts line 94-131 (CURRENT)
handleInput(input: Input): void {
  // ... (input handling code)

  const command = this.inputHandler.handleKeyPress(keyboardEvent, this.gameState)
  if (command) {
    this.gameState = command.execute(this.gameState)
    // ... (command execution)
  }

  // Always re-render (handles modal closes, inventory updates, etc.)
  this.renderer.render(this.gameState) // ❌ REMOVE THIS
}

// src/states/PlayingState/PlayingState.ts line 94-131 (FIXED)
handleInput(input: Input): void {
  // ... (input handling code)

  const command = this.inputHandler.handleKeyPress(keyboardEvent, this.gameState)
  if (command) {
    this.gameState = command.execute(this.gameState)
    // ... (command execution)
  }

  // ✅ Rendering now handled by main loop's renderAllVisibleStates()
  // No need to call renderer.render() here
}
```

---

### Phase 2: Fix TargetSelectionState Rendering (Priority: HIGH)

**Objective**: Make `TargetSelectionState.render()` trigger a full game render with targeting overlay

#### Task 2.1: Update TargetSelectionState.render() to render game + overlay

**Context**: Currently, `TargetSelectionState.render()` only stores targeting state and renders the info panel. It needs to render the full game with targeting overlay.

**Files to modify**:
- `src/states/TargetSelectionState/TargetSelectionState.ts` (lines 134-136)
- `src/ui/GameRenderer.ts` (lines 643-652)

##### Subtasks:
- [ ] Update `TargetSelectionState.render()` to call both `gameRenderer.render()` and `renderTargetingOverlay()`
- [ ] Ensure targeting overlay (cursor, line, info panel) renders on top of game
- [ ] Verify cursor and targeting line appear correctly
- [ ] Verify contextual command bar shows targeting controls
- [ ] Git commit: "fix: render full game with targeting overlay in TargetSelectionState"

**Code Change:**
```typescript
// src/states/TargetSelectionState/TargetSelectionState.ts line 134-136 (CURRENT)
render(): void {
  this.gameRenderer.renderTargetingOverlay(this)
  // ❌ Only stores state and renders info panel, doesn't render game!
}

// src/states/TargetSelectionState/TargetSelectionState.ts line 134-136 (FIXED)
render(): void {
  // First render the base game (dungeon, stats, messages)
  const gameState = this.gameState
  this.gameRenderer.render(gameState)

  // Then render targeting overlay (cursor, line, info panel)
  this.gameRenderer.renderTargetingOverlay(this)
}
```

---

#### Task 2.2: Verify GameRenderer.renderDungeon() uses targetingState

**Context**: Confirm that `GameRenderer.renderDungeon()` correctly uses `this.targetingState` to draw cursor and line.

**Files to verify**:
- `src/ui/GameRenderer.ts` (lines 206-345)

##### Subtasks:
- [ ] Review `renderDungeon()` code (lines 216-318)
- [ ] Verify targeting cursor ('X') renders at cursor position (lines 308-318)
- [ ] Verify targeting line ('*') renders between player and cursor (lines 302-305)
- [ ] Verify cursor color: green if valid target, red if invalid (lines 309-317)
- [ ] Test cursor rendering with multiple monsters in FOV
- [ ] Git commit: (No changes needed if code is correct, mark task complete)

**Current Code (VERIFY THIS IS CORRECT):**
```typescript
// src/ui/GameRenderer.ts line 216-318
// Get targeting data if active
let targetingLine: Set<string> | null = null
let cursorPos: Position | null = null
if (targetingState) {
  cursorPos = targetingState.getCursorPosition()
  targetingLine = this.calculateTargetingLine(state.player.position, cursorPos, level)
}

// ... (in render loop) ...

// Targeting line (render before player but after entities)
if (targetingLine && targetingLine.has(`${x},${y}`) && ...) {
  char = '*'
  color = '#FFFF00' // Yellow
}

// Targeting cursor (render before player)
if (cursorPos && pos.x === cursorPos.x && pos.y === cursorPos.y) {
  // Check if target is valid
  const isValid = inFOV && !!monster
  char = 'X'
  color = isValid ? '#00FF00' : '#FF0000' // Green if valid, red if invalid
}
```

---

### Phase 3: Testing & Verification (Priority: HIGH)

**Objective**: Ensure the complete zap-wand-target flow works end-to-end

#### Task 3.1: Manual Testing Checklist

**Context**: Test the full targeting workflow with various scenarios

##### Test Cases:
- [ ] **Happy Path**: Press 'z' → select wand → cursor appears → move cursor → press Enter → wand zaps
- [ ] **Cancel Targeting**: Press 'z' → select wand → cursor appears → press ESC → returns to normal gameplay
- [ ] **Invalid Target**: Move cursor out of range or to empty tile → cursor shows red → Enter does nothing
- [ ] **Multiple Monsters**: Cursor initializes on nearest monster in FOV
- [ ] **Tab Cycling**: Press Tab to cycle through visible monsters
- [ ] **Targeting Line**: Line draws from player through cursor, stops at walls
- [ ] **Info Panel**: Shows target name, HP, distance, range, and controls
- [ ] **State Stack**: Targeting pushes new state, ESC pops it correctly

---

#### Task 3.2: Run Existing Tests

**Context**: Ensure no regressions in existing test suite

##### Subtasks:
- [ ] Run `npm test` → all tests pass
- [ ] Run `npm run type-check` → no TypeScript errors
- [ ] Check ZapWandCommand tests still pass
- [ ] Check TargetingService tests still pass
- [ ] Git commit: (No changes if tests pass, or fix any broken tests)

---

### Phase 4: Edge Cases & Polish (Priority: MEDIUM)

**Objective**: Handle edge cases and improve UX

#### Task 4.1: Handle no monsters visible case

**Context**: If no monsters are in FOV, cursor should still appear (at player position or nearest explored tile)

##### Subtasks:
- [ ] Test targeting when no monsters visible
- [ ] Verify cursor appears at player position
- [ ] Verify info panel shows "No target" message
- [ ] Verify pressing Enter does nothing (no invalid target selected)
- [ ] Git commit: "fix: handle targeting with no visible monsters"

---

#### Task 4.2: Handle wand with 0 charges

**Context**: Ensure wands with 0 charges don't enter targeting mode

##### Subtasks:
- [ ] Verify WandService checks charges before entering targeting
- [ ] Verify message "The wand has no charges!" appears
- [ ] Verify targeting state is not pushed
- [ ] Add test case for 0-charge wand
- [ ] Git commit: "fix: prevent targeting with 0-charge wands"

---

## 4. Technical Design

### State Stack Flow (CORRECT)

```
Before 'z' press:
┌─────────────────┐
│ PlayingState    │ ← Active (handles input)
└─────────────────┘

After 'z' press (modal shown):
┌─────────────────┐
│ PlayingState    │ ← Active (modal is DOM-based, not state-based)
└─────────────────┘

After wand selected:
┌─────────────────┐
│ TargetSelection │ ← Active (handles input)
├─────────────────┤
│ PlayingState    │ ← Paused (visible through transparent overlay)
└─────────────────┘

After Enter (zap) or ESC (cancel):
┌─────────────────┐
│ PlayingState    │ ← Active (handles input)
└─────────────────┘
```

### Rendering Architecture (CORRECTED)

**Main Loop Responsibilities:**
1. Delegate input to current state
2. Render all visible states (bottom-to-top)

**PlayingState Responsibilities:**
1. Handle gameplay input (movement, inventory, commands)
2. Render game when it's the active state

**TargetSelectionState Responsibilities:**
1. Handle targeting input (cursor movement, confirm, cancel)
2. Render game + targeting overlay when active

**GameRenderer Responsibilities:**
1. `render(state)`: Render full game (dungeon, stats, messages)
2. `renderTargetingOverlay(state)`: Render targeting cursor, line, and info panel
3. Store `targetingState` for use in `renderDungeon()`

### Rendering Call Flow (FIXED)

```
User presses key
  ↓
main.ts keydown handler
  ↓
stateManager.getCurrentState().handleInput(input)
  ↓
(State processes input)
  ↓
renderAllVisibleStates() ← ✅ NEW
  ↓
stateManager.getVisibleStates()
  ↓
For each visible state (bottom-to-top):
  state.render()
    ↓
    (For PlayingState: renderer.render(gameState))
    ↓
    (For TargetSelectionState: renderer.render(gameState) + renderTargetingOverlay(this))
```

---

## 5. Testing Strategy

### Manual Test Scenarios

**Scenario 1: Happy Path**
- Given: Player has wand in inventory, monster in FOV
- When: Press 'z' → select wand → move cursor to monster → press Enter
- Then: Wand effect applied to monster, targeting exits, returns to gameplay

**Scenario 2: Cancel Targeting**
- Given: Player in targeting mode
- When: Press ESC
- Then: Targeting cancelled, no wand effect, returns to gameplay

**Scenario 3: Invalid Target**
- Given: Player in targeting mode, cursor on invalid tile (out of range or no monster)
- When: Press Enter
- Then: Nothing happens (or message: "Invalid target"), cursor remains active

**Scenario 4: Multiple Monsters**
- Given: Player has wand, 3 monsters in FOV
- When: Press 'z' → select wand
- Then: Cursor initializes on nearest monster

**Scenario 5: Tab Cycling**
- Given: Player in targeting mode, 3 monsters visible
- When: Press Tab repeatedly
- Then: Cursor cycles through monsters (nearest → 2nd → 3rd → nearest)

---

## 6. Integration Points

### Modified Files

**src/main.ts**
- Add `renderAllVisibleStates()` call after input handling

**src/states/PlayingState/PlayingState.ts**
- Remove `this.renderer.render()` call from `handleInput()`

**src/states/TargetSelectionState/TargetSelectionState.ts**
- Update `render()` to call `gameRenderer.render()` + `renderTargetingOverlay()`

**src/ui/GameRenderer.ts**
- Verify `renderDungeon()` correctly uses `this.targetingState`
- Verify `renderTargetingOverlay()` stores state correctly

---

## 7. Risk & Considerations

### Potential Issues

**Issue 1: Performance**
- **Problem**: Rendering entire game + overlay on every keypress might be slow
- **Mitigation**: GameRenderer already renders full game on every turn, so no performance change
- **Monitoring**: If FPS drops, consider dirty-rectangle optimization

**Issue 2: State Stack Desync**
- **Problem**: If state push/pop fails, rendering might break
- **Mitigation**: GameStateManager has robust enter()/exit() lifecycle
- **Testing**: Verify state stack depth after targeting cancellation

**Issue 3: Modal vs State Confusion**
- **Problem**: Wand selection uses modal (DOM), targeting uses state (pushdown automaton)
- **Mitigation**: This is intentional - modals are temporary, states are persistent
- **Future**: Consider refactoring modals to states in Phase 4

---

## 8. Post-Implementation Verification

### Verification Checklist
- [ ] Press 'z' → wand selection appears
- [ ] Select wand → targeting cursor appears on map
- [ ] Arrow keys move cursor → cursor moves and targeting line updates in real-time
- [ ] Cursor on valid target → cursor shows green
- [ ] Cursor on invalid target → cursor shows red
- [ ] Press Enter on valid target → wand zaps, returns to gameplay
- [ ] Press ESC → targeting cancelled, returns to gameplay
- [ ] Press Tab → cycles through visible monsters
- [ ] Targeting line draws from player through cursor, stops at walls
- [ ] Info panel shows target details and controls
- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)

### Follow-Up Tasks
- [ ] Consider refactoring wand selection modal to ItemSelectionState (Phase 4)
- [ ] Add animation for cursor blinking (future enhancement)
- [ ] Add sound effect for targeting confirm/cancel (future enhancement)

---

**Last Updated**: 2025-10-09
**Status**: 🚧 In Progress (Diagnostic Complete, Implementation Pending)
