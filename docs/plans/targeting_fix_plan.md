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
- [x] **TESTED**: Wand selection modal appears correctly
- [x] **TESTED**: Targeting cursor moves with arrow keys and shows real-time visual feedback
- [x] **TESTED**: Targeting line draws from player through cursor
- [x] **TESTED**: Contextual menu shows options: "Enter to zap / ESC to cancel"
- [x] **TESTED**: Pressing ESC cancels targeting and returns to normal gameplay
- [ ] **BUG #3**: Targeting cursor appears immediately on game map (currently invisible until first move)
- [ ] **BUG #4**: Pressing Enter fires the wand at target position (currently does nothing)
- [ ] Wand fires at empty tiles (projectile travels in direction until hitting obstacle)
- [ ] Wand effect applies to first monster hit along projectile path
- [ ] Wand stops at walls with appropriate message
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

## 2b. Playwright Test Results (2025-10-09)

### Test Summary

Comprehensive end-to-end testing was performed using Playwright MCP to validate the targeting system fixes. The tests revealed **the fixes are partially working**, but uncovered **critical bugs** in the wand firing logic.

### ✅ **Passing Tests:**

1. **Game Initialization** - Game loaded and rendered correctly
2. **Wand Selection Modal** - Modal appeared correctly when pressing 'z'
3. **Cursor Movement** - Arrow keys successfully moved the targeting cursor, distance updated in real-time
4. **Targeting Line Rendering** - Yellow asterisk '*' line rendered between player and cursor
5. **Contextual Menu** - All controls displayed correctly (hjkl/arrows, Tab, Enter, ESC)
6. **ESC Cancellation** - ESC properly cancelled targeting and returned to normal gameplay
7. **Enter Key Behavior** - Enter key exited targeting mode cleanly

### ❌ **Critical Bugs Discovered:**

#### Bug #3: Initial Cursor Not Visible

**Symptom:** When first entering targeting mode after wand selection, the cursor 'X' does NOT appear on the map until you move it with arrow keys.

**Expected:** Cursor should appear immediately on map after wand selection
**Actual:** Cursor only appears after first arrow key press

**Root Cause:** Missing initial render call when `TargetSelectionState` is first pushed onto the state stack. The `GameStateManager.pushState()` calls `state.enter()` but doesn't call `render()`. The first render only happens after the first input event.

**Location:** `src/services/GameStateManager/GameStateManager.ts` - `pushState()` method
**Impact:** HIGH - Poor UX, player thinks targeting mode failed
**Fix Required:** Call `renderAllVisibleStates()` immediately after `pushState()` completes

**Visual Evidence:**
- `targeting-after-wand-selection.png` - Shows NO cursor visible initially
- `targeting-after-cursor-move.png` - Shows cursor 'X' appeared AFTER moving

---

#### Bug #4: Wand Effect Not Firing

**Symptom:** When pressing Enter on a target position, no wand damage message appeared in the log. The targeting mode exited, but no visible effect occurred on the target monster.

**Expected:** Wand should fire at the targeted position, traveling in that direction until hitting a monster or wall, then applying the effect
**Actual:** Nothing happens, targeting mode silently exits

**Root Cause Analysis:**

1. **TargetSelectionState.confirmTarget()** (lines 344-355) only calls the callback if:
   - There's a monster at the cursor position (`if (!monster || !this.isValidTarget()`)
   - The target is valid (in FOV and within range)
   - Otherwise it just returns without calling the callback

```typescript
// src/states/TargetSelectionState/TargetSelectionState.ts:344-355
private confirmTarget(): void {
  const monster = this.getMonsterAtCursor()

  // ❌ BUG: Only fires if there's a monster AND it's valid
  if (!monster || !this.isValidTarget()) {
    return // Silently exits without calling callback
  }

  // Only called if monster exists and is valid
  this.onTarget(monster.id)
}
```

2. **ZapWandCommand** expects a `targetMonsterId` (line 23, 67-75):
   - It validates the monster ID exists
   - It passes the monster ID to `wandService.applyWand()`
   - It doesn't support firing at empty tiles or positions

```typescript
// src/commands/ZapWandCommand/ZapWandCommand.ts:67-75
if (!this.targetMonsterId) {
  const messages = this.messageService.addMessage(
    state.messages,
    'No target selected.',
    'warning',
    state.turnCount
  )
  return { ...state, messages }
}
```

**Architectural Issue:** The targeting system currently passes **monster ID** to the callback, but it should pass **target POSITION**. This prevents:
- Firing wands at empty tiles (projectile should travel in that direction)
- Firing at monsters outside FOV (wand should still fire, projectile travels toward position)
- Supporting area-of-effect targeting (need position, not monster)

**Location:**
- `src/states/TargetSelectionState/TargetSelectionState.ts:344-355` - `confirmTarget()`
- `src/commands/ZapWandCommand/ZapWandCommand.ts:23,67-75,99` - Monster ID validation
**Impact:** **CRITICAL** - Wands are completely non-functional
**Fix Required:**
1. Change `TargetConfirmCallback` signature from `(targetMonsterId: string | null) => void` to `(targetPosition: Position) => void`
2. Update `confirmTarget()` to always call callback with cursor position (remove monster validation)
3. Update `ZapWandCommand` to accept target position instead of monster ID
4. Implement projectile logic in `WandService.applyWand()` to:
   - Calculate ray from player to target position
   - Travel along ray until hitting first obstacle (monster or wall)
   - Apply wand effect to monster if hit, or stop at wall

**User Requirement:** *"We should be able to press enter on any tile on the map, regardless of whether there is a monster or not. The game should zap the wand in the direction the player targeted when pressing enter. The wand should zap in that direction until we hit an obstacle (monster) or wall. If it hits a monster we do the wand effect on the monster."*

---

### Test Environment
- **Browser:** Playwright MCP (Chromium)
- **Test Date:** 2025-10-09
- **Screenshots:** `.playwright-mcp/targeting-*.png`
- **Console:** No JavaScript errors detected

---

## 2c. Original Rogue Wand Mechanics Research (2025-10-09)

### Research Objective

User requested: *"some wands might go through monsters. we need to research original rogue to study the behaviour"*

The goal was to determine:
1. Do wand bolts stop at the first monster or pass through multiple targets?
2. Do different wand types have different projectile behaviors?
3. Do bolts bounce off walls?

### Source Code Analysis

Examined the original Rogue (1980) source code from GitHub repositories:
- `github.com/mpwillson/rogue/blob/master/zap.c`
- `github.com/thedarkb/Rogue/blob/master/zap.c`

### Key Findings

#### 1. **Bolts STOP at First Monster** ✅

The `get_zapped_monster()` function clearly shows bolts stop at the first obstacle:

```c
get_zapped_monster(short dir, short *row, short *col)
{
    for (;;) {
        get_dir_rc(dir, row, col, 0);

        // Stop if: wall, empty space, or start position
        if (((*row == orow) && (*col == ocol))
         || (dungeon[*row][*col] & (HORWALL | VERTWALL))
         || (dungeon[*row][*col] == NOTHING))
        {
            return(0);  // No monster hit
        }

        // Stop at first monster found
        if (dungeon[*row][*col] & MONSTER)
        {
            if (!imitating(*row, *col))
            {
                return(object_at(&level_monsters, *row, *col));
            }
        }
    }
}
```

**Behavior:** The function iterates along the bolt's path and **returns the first monster** encountered. It does NOT continue to check for additional monsters.

#### 2. **No Pass-Through Mechanics** ❌

The source code shows NO evidence of:
- Bolts passing through monsters
- Different behavior for fire/cold/lightning vs other wands
- Area-of-effect damage

**All wand types** use the same bolt-tracing logic via `get_zapped_monster()`.

#### 3. **No Bouncing Mechanics** ❌

While earlier research mentioned "bouncing bolts," the actual source code shows:
- Bolts stop when hitting walls: `(dungeon[*row][*col] & (HORWALL | VERTWALL))`
- No code for reflecting or bouncing trajectories
- The "6 tiles" description likely refers to maximum range, not bouncing behavior

### Conclusion

**Projectile Implementation Strategy:**
1. Calculate ray from player position to target position
2. Iterate along ray to find first obstacle
3. Stop at first monster OR first wall encountered
4. Apply wand effect only to the single monster hit (if any)
5. No pass-through, no bouncing, no area effects

**Implementation Reference:**
- See Phase 4, Task 4.3 for detailed projectile logic implementation
- All 10 wand types share the same bolt mechanics (stop at first obstacle)
- Only the wand EFFECT differs (damage, sleep, teleport, etc.), not the bolt behavior

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

### Phase 3: Fix Initial Cursor Rendering (Priority: HIGH)

**Objective**: Ensure targeting cursor appears immediately when entering targeting mode

#### Task 3.1: Add render call after pushState

**Context**: When `GameStateManager.pushState()` is called, it calls `state.enter()` but doesn't trigger a render. The first render only happens after the first input event, causing the cursor to be invisible initially.

**Files to modify**:
- `src/services/GameStateManager/GameStateManager.ts` - `pushState()` method
- `src/ui/InputHandler.ts` - Wand selection callback (line 470-501)

##### Subtasks:
- [ ] After `stateManager.pushState(targetingState)`, call `renderAllVisibleStates()` to trigger initial render
- [ ] Verify cursor appears immediately without needing to move it
- [ ] Test with multiple state transitions (inventory → targeting, etc.)
- [ ] Git commit: "fix: render targeting cursor immediately after entering targeting mode"

**Code Change:**
```typescript
// src/ui/InputHandler.ts line 470-501 (in wand selection callback)
// CURRENT
const targetingState = new TargetSelectionState(
  // ... constructor args
)
stateManager.pushState(targetingState)
// ❌ No render call - cursor invisible until first input

// FIXED
const targetingState = new TargetSelectionState(
  // ... constructor args
)
stateManager.pushState(targetingState)
renderAllVisibleStates() // ✅ Trigger initial render
```

**Alternative Approach**: Modify `GameStateManager.pushState()` to automatically call render after state transition:
```typescript
// src/services/GameStateManager/GameStateManager.ts
pushState(state: IState): void {
  this.states.push(state)
  state.enter()
  // ✅ Automatically render after state change
  this.triggerRender() // Calls a registered render callback
}
```

---

### Phase 4: Refactor Targeting to Use Positions Instead of Monster IDs (Priority: CRITICAL)

**Objective**: Enable wands to fire at any position, not just monsters

#### Task 4.1: Change TargetConfirmCallback signature to accept Position

**Context**: Currently the callback receives `targetMonsterId: string | null`, but it should receive `targetPosition: Position` to support firing at empty tiles and implementing projectile logic.

**Files to modify**:
- `src/states/TargetSelectionState/TargetSelectionState.ts:9,23,354` - Type and usage
- `src/ui/InputHandler.ts:467-501` - Callback implementation
- `src/commands/ZapWandCommand/ZapWandCommand.ts` - Constructor and execute method

##### Subtasks:
- [ ] Update `TargetConfirmCallback` type: `(targetMonsterId: string | null) => void` → `(targetPosition: Position) => void`
- [ ] Update `confirmTarget()` to always call callback with cursor position (remove monster validation)
- [ ] Update all callback implementations to accept Position
- [ ] Git commit: "refactor: change targeting callback to pass Position instead of monsterId"

**Code Change:**
```typescript
// src/states/TargetSelectionState/TargetSelectionState.ts

// CURRENT
export type TargetConfirmCallback = (targetMonsterId: string | null) => void

private confirmTarget(): void {
  const monster = this.getMonsterAtCursor()
  if (!monster || !this.isValidTarget()) {
    return // ❌ Silently fails on empty tiles
  }
  this.onTarget(monster.id) // ❌ Passes monster ID only
}

// FIXED
export type TargetConfirmCallback = (targetPosition: Position) => void

private confirmTarget(): void {
  // ✅ Always call callback with cursor position
  this.onTarget({ ...this.cursorPosition })
}
```

---

#### Task 4.2: Update ZapWandCommand to accept target position

**Context**: ZapWandCommand currently expects `targetMonsterId` and validates the monster exists. It should accept `targetPosition` and pass it to WandService for projectile logic.

**Files to modify**:
- `src/commands/ZapWandCommand/ZapWandCommand.ts:23,67-75,99`
- `src/ui/InputHandler.ts:467-501` - Update callback to create command with position

##### Subtasks:
- [ ] Change constructor parameter: `targetMonsterId?: string` → `targetPosition?: Position`
- [ ] Remove monster ID validation (lines 67-75)
- [ ] Pass position to `wandService.applyWand()` instead of monster ID
- [ ] Update callback in InputHandler to pass position instead of monster ID
- [ ] Git commit: "refactor: update ZapWandCommand to accept target position"

**Code Change:**
```typescript
// src/commands/ZapWandCommand/ZapWandCommand.ts

// CURRENT
constructor(
  private itemId: string,
  // ... services
  private targetMonsterId?: string // ❌ Monster ID
) {}

execute(state: GameState): GameState {
  // ❌ Validates monster ID exists
  if (!this.targetMonsterId) {
    return { ...state, messages: addError('No target selected') }
  }

  // ❌ Validates monster exists in level
  const validation = this.targetingService.validateWandTarget(
    this.targetMonsterId,
    wand.range,
    state
  )

  // ❌ Passes monster ID to wand service
  const result = this.wandService.applyWand(
    state.player,
    wand,
    state,
    this.targetMonsterId
  )
}

// FIXED
constructor(
  private itemId: string,
  // ... services
  private targetPosition?: Position // ✅ Target position
) {}

execute(state: GameState): GameState {
  // ✅ Validate position is provided
  if (!this.targetPosition) {
    return { ...state, messages: addError('No target selected') }
  }

  // ✅ Validate position is within range
  const distance = this.targetingService.distance(
    state.player.position,
    this.targetPosition
  )
  if (distance > wand.range) {
    return { ...state, messages: addError('Target out of range') }
  }

  // ✅ Pass position to wand service (projectile logic)
  const result = this.wandService.applyWandAtPosition(
    state.player,
    wand,
    state,
    this.targetPosition
  )
}
```

---

#### Task 4.3: Implement projectile logic in WandService

**Context**: WandService needs a new method `applyWandAtPosition()` that calculates a ray from player to target, finds the first obstacle (monster or wall), and applies the wand effect. Based on original Rogue source code research (see Section 2c), bolts should:
- Stop at the **first monster** encountered
- Stop at the **first wall** encountered
- **No pass-through** mechanics
- **No bouncing** mechanics
- **All wand types** use the same bolt mechanics (only effect differs)

**Files to modify**:
- `src/services/WandService/WandService.ts` - Add new method
- `src/services/TargetingService/TargetingService.ts` - Add ray-casting utility method

##### Subtasks:
- [ ] Add `TargetingService.calculateRay(from: Position, to: Position, level: Level): Position[]` - Returns positions along line using Bresenham's algorithm
- [ ] Add `WandService.applyWandAtPosition(player, wand, state, targetPos)` - Projectile logic (based on original Rogue `get_zapped_monster()`):
  1. Calculate ray from player to target position
  2. Iterate along ray positions in order
  3. For each position:
     - Check if wall → stop, return "beam hits the wall" message, decrement charges
     - Check if monster → stop, apply wand effect to that monster, decrement charges
     - Continue to next position if empty
  4. If ray completes without hitting anything → "beam fizzles out", decrement charges
- [ ] Keep existing `applyWand(player, wand, state, monsterId)` for backward compatibility
- [ ] Add tests for projectile logic:
  - Test: Bolt hits first monster in path (ignores monsters beyond first)
  - Test: Bolt hits wall before reaching target
  - Test: Bolt fizzles if no obstacles in range
  - Test: Bolt applies correct wand effect to hit monster
- [ ] Git commit: "feat: implement projectile logic for wand targeting (original Rogue behavior)"

**Code Implementation:**
```typescript
// src/services/WandService/WandService.ts

/**
 * Apply wand at target position with projectile logic
 * Based on original Rogue get_zapped_monster() behavior:
 * - Bolts stop at first obstacle (monster or wall)
 * - No pass-through or bouncing mechanics
 * - All wand types use same bolt behavior
 */
applyWandAtPosition(
  player: Player,
  wand: Wand,
  state: GameState,
  targetPosition: Position
): WandEffectResult {
  // Check charges
  if (wand.currentCharges === 0) {
    return {
      player,
      wand,
      message: 'The wand has no charges.',
      identified: false,
    }
  }

  // Get current level
  const level = state.levels.get(state.currentLevel)
  if (!level) {
    return {
      player,
      wand,
      message: 'Invalid level state.',
      identified: false,
    }
  }

  // Calculate ray from player to target position
  const ray = this.targetingService.calculateRay(
    player.position,
    targetPosition,
    level
  )

  // Find first obstacle along ray (based on original Rogue logic)
  let hitMonster: Monster | null = null
  let hitWall = false

  for (const pos of ray) {
    // Skip player's starting position
    if (pos.x === player.position.x && pos.y === player.position.y) {
      continue
    }

    // Check for wall (HORWALL | VERTWALL in original Rogue)
    const tile = level.tiles[pos.y][pos.x]
    if (!tile.walkable) {
      hitWall = true
      break
    }

    // Check for monster (MONSTER flag in original Rogue)
    const monster = level.monsters.find(
      m => m.position.x === pos.x && m.position.y === pos.y
    )
    if (monster) {
      hitMonster = monster
      break  // ✅ Stop at FIRST monster (no pass-through)
    }
  }

  // Identify wand by use
  const identified = !this.identificationService.isIdentified(wand.wandType, state)
  const displayName = this.identificationService.getDisplayName(wand, state)

  // Decrement charges
  const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }

  // Apply effect based on what was hit
  if (hitMonster) {
    // Hit a monster - apply wand effect
    const result = this.applyWandEffect(wand, hitMonster, level, state, displayName)
    return {
      player,
      wand: updatedWand,
      state: result.state,
      message: result.message,
      identified,
    }
  } else if (hitWall) {
    // Hit a wall - no effect
    return {
      player,
      wand: updatedWand,
      message: `You zap ${displayName}. The beam hits the wall.`,
      identified,
    }
  } else {
    // Nothing hit - beam fizzles out
    return {
      player,
      wand: updatedWand,
      message: `You zap ${displayName}. The beam fizzles out.`,
      identified,
    }
  }
}
```

---

### Phase 5: Testing & Verification (Priority: HIGH)

**Objective**: Ensure the complete zap-wand-target flow works end-to-end

#### Task 5.1: Manual Testing Checklist

**Context**: Test the full targeting workflow with various scenarios

##### Test Cases:
- [x] **Wand Selection Modal**: Press 'z' → wand selection modal appears
- [x] **Cursor Movement**: Arrow keys move cursor, distance updates in real-time
- [x] **Targeting Line**: Yellow line ('*') draws from player through cursor
- [x] **Contextual Menu**: Info panel shows targeting controls
- [x] **ESC Cancellation**: Press ESC → targeting cancelled, returns to normal gameplay
- [ ] **Immediate Cursor**: Cursor appears immediately after wand selection (Bug #3)
- [ ] **Fire at Monster**: Press Enter on monster → wand fires, monster takes damage
- [ ] **Fire at Empty Tile**: Press Enter on empty tile → projectile travels in direction
- [ ] **Hit First Monster**: Fire through empty tile → projectile hits first monster in path
- [ ] **Hit Wall**: Fire at wall → wand beam stops, message "beam hits the wall"
- [ ] **Out of Range**: Fire beyond range → wand beam fizzles out
- [ ] **Tab Cycling**: Press Tab to cycle through visible monsters
- [ ] **State Stack**: Targeting pushes new state, ESC pops it correctly

---

#### Task 5.2: Run Existing Tests

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
**Status**: 🚧 In Progress (Testing Complete, Bugs Identified, Fixes Pending)
