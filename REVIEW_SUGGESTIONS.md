# Code Review Suggestions: Save Frequency Reduction

## Quick Fix: Consolidate Save Logic in PlayingState

### Remove save from MoveStairsCommand

```typescript
// src/commands/MoveStairsCommand/MoveStairsCommand.ts
// REMOVE lines 180-183:
// Save game after level transition
if (this.autoSaveMiddleware) {
  this.autoSaveMiddleware.forceSave(newState, `level ${newState.currentLevel}`)
}

// REMOVE from constructor parameter (line 35):
private autoSaveMiddleware?: AutoSaveMiddleware
```

### Consolidate all saves in PlayingState

```typescript
// src/states/PlayingState/PlayingState.ts

export class PlayingState extends BaseState {
  private lastSavedLevel: number = 1
  private hasGameEnded: boolean = false

  async handleInput(_input: Input): Promise<void> {
    // ... existing game loop code ...

    // SINGLE SAVE CHECK at end of input handling
    this.checkAndSave()

    // Re-render after command execution
    this.renderer.render(this.gameState)
  }

  /**
   * Check for save triggers and save if needed
   * Triggers: level transition, death, victory
   */
  private checkAndSave(): void {
    const state = this.gameState

    // Save on death/victory (only once)
    if (state.isGameOver && !this.hasGameEnded) {
      const reason = state.hasWon ? 'victory' : 'death'
      this.autoSaveMiddleware.forceSave(state, reason)
      this.hasGameEnded = true
      return
    }

    // Save on level transition
    if (state.currentLevel !== this.lastSavedLevel) {
      this.autoSaveMiddleware.forceSave(state, `level ${state.currentLevel}`)
      this.lastSavedLevel = state.currentLevel
    }
  }
}
```

## Benefits of This Approach

1. **Single Responsibility**: All save logic in one place (PlayingState)
2. **No Duplicates**: Flags prevent multiple saves for same event
3. **No Command Side Effects**: Commands remain pure orchestrators
4. **Consistent Location**: All save triggers checked in same method
5. **Easy to Test**: Single method to test all save triggers
6. **Easy to Extend**: Want to add new save trigger? Add one condition

## Alternative: Event-Based System (Future Enhancement)

If we need more decoupling, consider event system:

```typescript
// Create event emitter service
class GameEventService {
  private listeners: Map<string, Function[]> = new Map()

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }
}

// In main.ts setup:
gameEvents.on('level:changed', (state) => autoSaveMiddleware.forceSave(state, 'level'))
gameEvents.on('game:over', (state) => autoSaveMiddleware.forceSave(state, 'death'))

// In PlayingState:
if (state.currentLevel !== this.lastLevel) {
  this.gameEvents.emit('level:changed', state)
}
```

This is cleaner but adds complexity. Only implement if we need multiple listeners per event.
