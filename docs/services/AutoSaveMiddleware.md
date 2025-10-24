# AutoSaveMiddleware

**Location**: `src/services/AutoSaveMiddleware/AutoSaveMiddleware.ts`
**Dependencies**: GameStorageService, CommandRecorderService (optional), ReplayDebuggerService (optional)
**Test Coverage**: Auto-save triggers, determinism validation, throttling

---

## Purpose

Automatic game saving every N turns with fire-and-forget async persistence. In development mode, validates determinism after each save by replaying commands.

---

## Public API

### afterTurn(state: GameState): void

Called after each turn to check if auto-save should trigger.

**Behavior**:
- Saves every `saveInterval` turns (default: 10)
- Skips if `state.isGameOver === true`
- Async fire-and-forget (doesn't block gameplay)
- Persists replay data to IndexedDB
- Validates determinism in development mode

**Throttling**:
- Silently ignores throttling errors from LocalStorageService
- Logs other errors (quota, serialization failures)

**Development Mode**:
- Validates determinism after each save
- Compares replayed state against saved state
- Logs desync errors if non-determinism detected

**Example**:
```typescript
const middleware = new AutoSaveMiddleware(
  storageService,
  10,  // Save every 10 turns
  commandRecorder,
  replayDebugger
)

// Called after each turn in game loop
middleware.afterTurn(gameState)
// Async save triggered if turnCount % 10 === 0
```

---

## Integration Notes

**Usage Pattern**:
```typescript
// In game loop/turn handler
function executeTurn(state: GameState): GameState {
  // 1. Execute player command
  const newState = executeCommand(state)

  // 2. Trigger auto-save check
  autoSaveMiddleware.afterTurn(newState)

  return newState
}
```

**Determinism Validation**:
- Only runs in development mode
- Loads replay data from IndexedDB
- Replays all commands from turn 0
- Compares final state to saved state
- Logs desyncs with field names and values

---

## Related Services

- [GameStorageService](./GameStorageService.md) - Persists game state
- [CommandRecorderService](./CommandRecorderService.md) - Tracks commands for replay
- [ReplayDebuggerService](./ReplayDebuggerService.md) - Validates determinism
