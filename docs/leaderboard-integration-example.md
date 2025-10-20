# LeaderboardState Integration Example

This document shows how to create and wire up `LeaderboardState` with the required factory functions.

## Factory Function Requirements

`LeaderboardState` requires two factory functions to integrate with the game lifecycle:

1. **startGame(gameState: GameState): void**
   - Loads a saved game and transitions to PlayingState
   - Clears state stack and initializes all game dependencies

2. **startReplay(gameId: string): Promise<void>**
   - Launches replay debugger for a saved game
   - Creates ReplayDebugState with all required dependencies

## Example Implementation

```typescript
import { LeaderboardState } from '@states/LeaderboardState'
import { PlayingState } from '@states/PlayingState'
import { ReplayDebugState } from '@states/ReplayDebugState'
import { GameState } from '@game/core/core'

// Assuming you have these services available in your scope:
// - gameStorageService: GameStorageService
// - stateManager: GameStateManager
// - replayDebuggerService: ReplayDebuggerService
// - commandRecorderService: CommandRecorderService
// - renderer: GameRenderer
// - All other game services (monsterTurnService, turnService, etc.)

// Factory function 1: Start game from loaded state
function startGame(gameState: GameState): void {
  // Clear state stack (removes main menu, etc.)
  stateManager.clearStack()

  // Create PlayingState with all required dependencies
  // (See PlayingState constructor for full dependency list)
  const playingState = new PlayingState(
    gameState,
    renderer,
    inputHandler,
    monsterTurnService,
    turnService,
    autoSaveMiddleware,
    preferencesService,
    messageService,
    commandRecorderService,
    random
  )

  // Push onto state stack
  stateManager.pushState(playingState)
}

// Factory function 2: Start replay debugger
async function startReplay(gameId: string): Promise<void> {
  // ReplayDebugState will load the replay data internally
  // using the provided gameId and ReplayDebuggerService

  const replayState = new ReplayDebugState(
    gameId,
    replayDebuggerService,
    stateManager,
    commandRecorderService,
    renderer
    // Optional: initialTurn (defaults to 0)
    // Optional: inMemoryReplayData (loads from DB if not provided)
  )

  // Push onto state stack
  // This will show replay debugger on top of leaderboard
  stateManager.pushState(replayState)
}

// Create LeaderboardState with factory functions
const leaderboardState = new LeaderboardState(
  gameStorageService,
  stateManager,
  startGame,      // Factory function 1
  startReplay     // Factory function 2
)

// Push to state stack to show leaderboard
stateManager.pushState(leaderboardState)
```

## Integration Flow

### User Selects "Load" (L)

```
LeaderboardState (Enter pressed)
  ↓
SaveActionMenuState (L pressed)
  ↓
loadGame() → gameStorage.loadGame(gameId)
  ↓
startGame(gameState) factory
  ↓
stateManager.clearStack() + pushState(PlayingState)
  ↓
User continues playing from saved state
```

### User Selects "Replay" (R)

```
LeaderboardState (Enter pressed)
  ↓
SaveActionMenuState (R pressed)
  ↓
replayGame() → calls startReplay(gameId) factory
  ↓
Creates ReplayDebugState with gameId
  ↓
stateManager.pushState(ReplayDebugState)
  ↓
Replay debugger loads data and shows transport controls
```

### User Selects "Delete" (D)

```
LeaderboardState (Enter pressed)
  ↓
SaveActionMenuState (D pressed)
  ↓
deleteGame() → gameStorage.deleteSave(gameId)
  ↓
stateManager.popState() → closes SaveActionMenuState
  ↓
onDelete() callback → refreshLeaderboard()
  ↓
LeaderboardState reloads save list and re-renders
```

## State Stack Visualization

### Before Opening Action Menu
```
┌─────────────────┐
│ LeaderboardState│ ← Active (handles input)
└─────────────────┘
```

### After Pressing Enter on Save
```
┌─────────────────────┐
│ SaveActionMenuState │ ← Active (handles input)
├─────────────────────┤
│ LeaderboardState    │ ← Visible underneath (transparent overlay)
└─────────────────────┘
```

### After Selecting "Load"
```
┌─────────────────┐
│ PlayingState    │ ← Active (game running)
└─────────────────┘
(LeaderboardState and SaveActionMenuState cleared by stateManager.clearStack())
```

### After Selecting "Replay"
```
┌─────────────────────┐
│ ReplayDebugState    │ ← Active (replay controls)
├─────────────────────┤
│ SaveActionMenuState │ ← Paused
├─────────────────────┤
│ LeaderboardState    │ ← Paused
└─────────────────────┘
```

## Notes

- The factory functions encapsulate all the complexity of creating states with dependencies
- This pattern keeps LeaderboardState and SaveActionMenuState dependency-free
- The parent context (e.g., main.ts) provides the factories with access to all services
- This follows the Dependency Inversion Principle (depend on abstractions, not concrete implementations)

## See Also

- `src/states/LeaderboardState/LeaderboardState.ts` - Full implementation with JSDoc
- `src/states/SaveActionMenuState/SaveActionMenuState.ts` - Action menu implementation
- `src/states/PlayingState/PlayingState.ts` - PlayingState constructor signature
- `src/states/ReplayDebugState/ReplayDebugState.ts` - ReplayDebugState constructor signature
- `src/main.ts` line 557 - Reference implementation of `startGame()` function
