# GameStateManager

**Purpose**: Manages the game state stack (pushdown automaton pattern) for screens, dialogs, and modals.

**Pattern**: Pushdown Automaton (state stack)
**Location**: `src/services/GameStateManager/`
**Tests**: `state-transitions.test.ts`, `integration.test.ts`

---

## Overview

GameStateManager implements a **pushdown automaton** (state stack) to manage game states such as:
- Screens (main menu, playing, death, victory, leaderboard)
- Modal dialogs (inventory, item selection, targeting)
- UI overlays (help, settings)

This pattern provides:
- **Automatic state memory**: Popping a state automatically restores the previous state
- **Clean return paths**: No manual tracking of "where to go back to"
- **Composable nested dialogs**: Inventory → Item Selection → Confirmation
- **Transparent rendering**: Modal states can show dimmed backgrounds

---

## State Stack Pattern

```
Stack (top = active state):
┌─────────────────┐
│ Item Selection  │ ← Handles input, renders on top
├─────────────────┤
│ Inventory       │ ← Paused, renders dimmed
├─────────────────┤
│ Playing         │ ← Paused, not visible (covered by inventory)
└─────────────────┘
```

**Key Concepts**:
- **Top state** is active (receives input)
- **Push** = open new state (menu, dialog, overlay)
- **Pop** = close current state, restore previous
- **Replace** = transition between major states (menu → playing)
- **Transparent states** show dimmed backgrounds
- **Opaque states** completely cover lower states

---

## API Reference

### Core Methods

#### `pushState(state: IGameState): void`
Push a new state onto the stack.
- Calls `exit()` on current state (pause it)
- Adds new state to top of stack
- Calls `enter()` on new state (activate it)

```typescript
// Open inventory from playing state
stateManager.pushState(new InventoryState())
// Stack: [PlayingState, InventoryState] ← active
```

#### `popState(): IGameState | null`
Remove the top state from the stack.
- Calls `exit()` on current state (clean up)
- Removes state from stack
- Calls `enter()` on previous state (restore it)
- Returns the popped state

```typescript
// Close inventory with ESC
stateManager.popState()
// Stack: [PlayingState] ← active (automatically restored)
```

#### `getCurrentState(): IGameState | null`
Get the current active state without removing it.

```typescript
const currentState = stateManager.getCurrentState()
if (currentState) {
  currentState.render()
}
```

#### `replaceState(state: IGameState): void`
Replace the current state with a new one.
- Pops current state
- Pushes new state
- Useful for major transitions (main menu → playing)

```typescript
// Start new game from main menu
stateManager.replaceState(new PlayingState(gameState, ...))
```

#### `clearStack(): void`
Remove all states from the stack.
- Calls `exit()` on all states
- Clears the stack completely
- Useful for quit/restart scenarios

```typescript
// Return to main menu from anywhere
stateManager.clearStack()
stateManager.pushState(new MainMenuState(...))
```

### Helper Methods

#### `getStackDepth(): number`
Get the current depth of the state stack.
- Useful for debugging
- Can enforce depth limits

```typescript
if (stateManager.getStackDepth() > 5) {
  console.warn('State stack is very deep!')
}
```

#### `getVisibleStates(): IGameState[]`
Get all visible states for rendering (bottom-to-top order).
- Walks backwards from top until finding first non-transparent state
- Returns states in rendering order (bottom to top)
- Used for stack-based transparent rendering

```typescript
// Render all visible states with dimming
const visibleStates = stateManager.getVisibleStates()
visibleStates.forEach((state, index) => {
  const isTopState = index === visibleStates.length - 1
  state.render() // Top state full opacity, lower states dimmed by CSS
})
```

---

## IGameState Interface

All states must implement the `IGameState` interface:

```typescript
interface IGameState {
  enter(): void                     // Called when state becomes active
  exit(): void                      // Called when state is removed/paused
  update(deltaTime: number): void   // Game tick logic
  render(): void                    // Drawing logic
  handleInput(input: Input): void   // Input processing
  isPaused(): boolean               // Should lower states update?
  isTransparent(): boolean          // Should lower states render?
}
```

### Lifecycle Methods

**`enter()`** - Called when state becomes active
- Initialize state
- Show UI elements
- Start animations

**`exit()`** - Called when state is removed or paused
- Clean up resources
- Hide UI elements
- Save temporary data

### Game Loop Methods

**`update(deltaTime: number)`** - Game tick logic
- Only called if state is not paused
- Update animations, timers, etc.
- Turn-based games may not use this

**`render()`** - Drawing logic
- Called for all visible states (via `getVisibleStates()`)
- Render UI elements
- Update DOM

**`handleInput(input: Input)`** - Input processing
- Only called for top state
- Process keyboard/mouse input
- Execute commands

### State Properties

**`isPaused(): boolean`** - Should lower states update?
- `false` = Lower states continue updating (playing state)
- `true` = Lower states are paused (modals, menus)

**`isTransparent(): boolean`** - Should lower states render?
- `false` = Opaque state, nothing visible below (death screen, main menu)
- `true` = Transparent state, show dimmed background (inventory, targeting)

---

## State Types

### Screen States
Full-screen states for major game modes:
- **PlayingState**: Main gameplay (dungeons, combat)
- **MainMenuState**: Title screen and menu
- **DeathScreenState**: Game over screen
- **VictoryScreenState**: Win screen
- **LeaderboardState**: High scores (transparent)

### Modal Dialog States
Overlay states that can be pushed on top of any screen:
- **InventoryState**: Full inventory display
- **ItemSelectionState**: "Select item to X" prompts
- **TargetSelectionState**: Cursor-based targeting
- **NewGameDialogState**: Character name entry

---

## Usage Examples

### Example 1: Open Inventory

```typescript
// From PlayingState
const inventoryState = new InventoryState(
  modalController,
  gameState,
  () => stateManager.popState() // Close callback
)
stateManager.pushState(inventoryState)
```

### Example 2: Nested Modals

```typescript
// Playing → Inventory → Drop Item Selection
stateManager.pushState(new InventoryState(...)) // Open inventory
stateManager.pushState(new ItemSelectionState(
  modalController,
  gameState,
  "Drop which item?",
  (item) => item.type !== ItemType.AMULET, // Filter
  (item) => {
    // Drop the item
    inventoryService.removeItem(gameState, item)
    stateManager.popState() // Close item selection
  },
  () => stateManager.popState() // Cancel
))
```

### Example 3: Death Screen Flow

```typescript
// Player dies
const deathScreenState = new DeathScreenState(
  deathScreen,
  stats,
  gameState,
  onNewGame,
  onReplaySeed,
  () => {
    // Quit to main menu
    stateManager.clearStack()
    stateManager.pushState(new MainMenuState(...))
  }
)
stateManager.pushState(deathScreenState)
```

### Example 4: Start New Game

```typescript
// From main menu
stateManager.replaceState(new PlayingState(
  initialGameState,
  renderer,
  inputHandler,
  monsterTurnService,
  turnService,
  autoSaveMiddleware
))
```

---

## Best Practices

### 1. **Use BaseState**
Extend `BaseState` for sensible defaults:
```typescript
export class MyState extends BaseState {
  // Only implement methods you need to customize
  update(deltaTime: number) { }
  render() { /* Your rendering */ }
  handleInput(input: Input) { /* Your input handling */ }
}
```

### 2. **Keep States Stateless**
States should not store game data - only UI state:
```typescript
// ✅ Good: Pass game state as parameter
class InventoryState extends BaseState {
  constructor(private gameState: GameState) { }
}

// ❌ Bad: Store mutable game data in state
class InventoryState extends BaseState {
  private items: Item[] // Don't do this
}
```

### 3. **Use Callbacks for Actions**
Modal states should use callbacks to communicate results:
```typescript
// ✅ Good: Callback pattern
new ItemSelectionState(
  prompt,
  filter,
  (item) => { /* Handle selection */ },
  () => { /* Handle cancel */ }
)

// ❌ Bad: Direct state modification
// State should not modify game state directly
```

### 4. **Clean Up in exit()**
Always clean up resources when state is removed:
```typescript
exit(): void {
  this.modal.hide()
  this.removeEventListeners()
  this.clearTimers()
}
```

### 5. **Limit Stack Depth**
Prevent infinitely deep nesting:
```typescript
if (stateManager.getStackDepth() > 5) {
  console.error('State stack too deep!')
  return
}
```

---

## Testing

### Unit Tests
See `state-transitions.test.ts`:
- Push/pop operations
- Enter/exit lifecycle
- Empty stack edge cases
- Replace and clear operations

### Integration Tests
See `integration.test.ts`:
- Full user flows (Playing → Inventory → Item Selection)
- Death screen flow
- Transparent state rendering
- Abort/cancel flows

---

## Common Patterns

### Pattern 1: Modal Dialog
```typescript
// Show modal, return to previous state on close
stateManager.pushState(new ModalState(() => {
  stateManager.popState() // Close modal
}))
```

### Pattern 2: Confirmation Dialog
```typescript
// Nested confirmation
stateManager.pushState(new ConfirmationState(
  "Really quit?",
  () => {
    // Confirmed
    stateManager.clearStack()
    stateManager.pushState(new MainMenuState(...))
  },
  () => stateManager.popState() // Cancelled
))
```

### Pattern 3: Two-Step Selection
```typescript
// Select item, then select target
stateManager.pushState(new ItemSelectionState(
  "Zap which wand?",
  (item) => item.type === ItemType.WAND,
  (wand) => {
    // Item selected, now select target
    stateManager.pushState(new TargetSelectionState(
      range,
      (position) => {
        // Target selected, zap wand
        wandService.zap(gameState, wand, position)
        stateManager.popState() // Close targeting
        stateManager.popState() // Close item selection
      },
      () => stateManager.popState() // Cancel targeting
    ))
  },
  () => stateManager.popState() // Cancel item selection
))
```

---

## Related Documentation

- [Architecture - State Management](../architecture.md#state-management)
- [CLAUDE.md - State Patterns](../../CLAUDE.md#state-management)
- [Testing Strategy](../testing-strategy.md)
- [BaseState](../../src/states/BaseState.ts)

---

**Last Updated**: 2025-10-07
**Version**: 1.0
