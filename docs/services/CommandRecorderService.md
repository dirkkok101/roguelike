# CommandRecorderService

**Location**: `src/services/CommandRecorderService/CommandRecorderService.ts`
**Dependencies**: IndexedDBService
**Test Coverage**: Recording lifecycle, command logging, persistence

---

## Purpose

In-memory command tracking for replay system. Records all player/AI commands during gameplay for deterministic replay debugging and validation.

---

## Public API

### Recording Lifecycle

#### `startRecording(initialState: GameState, gameId: string): void`
Starts recording for new game session.

**Parameters**:
- `initialState` - Game state at turn 0
- `gameId` - Unique game identifier

**Rules**:
- Clears previous commands
- Deep copies initial state (prevents mutations)
- Uses `structuredClone()` if available, fallback for Jest
- Preserves Map/Set instances

**Example**:
```typescript
const recorder = new CommandRecorderService(indexedDB)

// Start new game
recorder.startRecording(gameState, 'game-123')
// 📼 Started recording for game: game-123
```

---

#### `recordCommand(event: CommandEvent): void`
Records command event.

**Parameters**:
- `event` - Command event to record

**Rules**:
- Call BEFORE command execution (captures RNG state before changes)
- Appends to in-memory command log
- No limit on command count (memory grows with game length)

**Example**:
```typescript
// BEFORE executing command
recorder.recordCommand({
  turnNumber: state.turnCount,
  timestamp: Date.now(),
  commandType: 'MOVE',
  actorType: 'player',
  payload: { direction: { dx: 1, dy: 0 } },
  rngState: randomService.getState()
})

// THEN execute command
const newState = command.execute(state)
```

---

#### `clearLog(): void`
Clears all recorded data.

**Rules**:
- Clears commands array
- Resets initial state
- Resets game ID
- Call when starting new game or loading existing game

**Example**:
```typescript
recorder.clearLog()
// Ready for new recording session
```

---

### Data Access

#### `getCommandLog(): CommandEvent[]`
Gets all recorded commands.

**Returns**:
```typescript
CommandEvent[]  // Copy of command log (prevents external mutation)
```

**Example**:
```typescript
const commands = recorder.getCommandLog()
// commands: [{ turnNumber: 1, commandType: 'MOVE', ... }, ...]
```

---

#### `getInitialState(): GameState | null`
Gets initial game state (turn 0).

**Returns**:
```typescript
GameState | null  // Deep copy or null if not set
```

**Rules**:
- Returns deep copy (prevents mutation)
- Returns null if no recording started

**Example**:
```typescript
const initialState = recorder.getInitialState()
// initialState: GameState at turn 0 or null
```

---

#### `getGameId(): string | null`
Gets current game ID being recorded.

**Returns**:
```typescript
string | null  // Game ID or null if not recording
```

**Example**:
```typescript
const gameId = recorder.getGameId()
// gameId: 'game-123' or null
```

---

#### `getCommandCount(): number`
Gets number of recorded commands.

**Returns**:
```typescript
number  // Command count
```

**Example**:
```typescript
const count = recorder.getCommandCount()
// count: 500 (500 commands recorded)
```

---

#### `isRecording(): boolean`
Checks if recording is active.

**Returns**:
```typescript
boolean  // true if recording, false otherwise
```

**Example**:
```typescript
if (recorder.isRecording()) {
  recorder.recordCommand(event)
}
```

---

### Replay Restoration

#### `restoreCommandLog(commands: CommandEvent[]): void`
Restores command log from loaded save.

**Parameters**:
- `commands` - Array of command events to restore

**Rules**:
- Deep copies commands (prevents mutation)
- Used when loading game to preserve full replay history
- Allows replaying from turn 0 instead of load point

**Example**:
```typescript
// Load game with embedded replay data
const save = await gameStorage.loadGame(gameId)
recorder.startRecording(save.replayData.initialState, gameId)
recorder.restoreCommandLog(save.replayData.commands)
// Can now replay from turn 0
```

---

### Deprecated Methods

#### `setInitialState(state: GameState): void` (deprecated)
Sets initial game state.

**Deprecated**: Use `startRecording()` instead.

---

#### `persistToIndexedDB(gameId: string): Promise<void>` (deprecated)
Persists commands to IndexedDB.

**Deprecated**: No-op. Replay data now embedded in save files automatically by GameStorageService.

---

## Integration Notes

**Used By**:
- All commands (record before execution)
- GameStorageService (embeds replay data in saves)
- ReplayDebuggerService (loads commands for replay)
- AutoSaveMiddleware (triggers save with embedded replay)

**Usage Pattern**:
```typescript
const recorder = new CommandRecorderService(indexedDB)

// New game
recorder.startRecording(initialState, gameId)

// During gameplay (in commands)
recorder.recordCommand({
  turnNumber: state.turnCount,
  timestamp: Date.now(),
  commandType: COMMAND_TYPES.MOVE,
  actorType: 'player',
  payload: { direction },
  rngState: randomService.getState()
})

// On save (GameStorageService)
const replayData = {
  initialState: recorder.getInitialState(),
  commands: recorder.getCommandLog(),
  seed: randomService.getSeed(),
  metadata: { ... }
}

// On load
const save = await gameStorage.loadGame(gameId)
recorder.startRecording(save.replayData.initialState, gameId)
recorder.restoreCommandLog(save.replayData.commands)
```

---

## Testing

**Test Files**:
- `CommandRecorderService.test.ts` - Recording lifecycle, command logging
- `CommandRecorderService.persistence.test.ts` - Persistence operations

**Coverage**: Comprehensive (recording, retrieval, clearing, restoration)

---

## Related Services

- [ReplayDebuggerService](./ReplayDebuggerService.md) - Uses recorded commands for replay
- [GameStorageService](./GameStorageService.md) - Embeds replay data in saves
- [CommandFactory](./CommandFactory.md) - Reconstructs commands from events

---

## Technical Details

**Memory Usage**:
- Typical command: ~200 bytes
- 1000 turn game: ~200KB commands
- Initial state: ~500KB-2MB (depends on level count)
- Total: ~1-5MB per game session

**Deep Copy Strategy**:
- Uses native `structuredClone()` if available (browser)
- Falls back to custom implementation for Jest
- Preserves Map and Set instances (JSON can't handle these)

**CommandEvent Structure**:
```typescript
interface CommandEvent {
  turnNumber: number
  timestamp: number
  commandType: string
  actorType: 'player' | 'monster' | 'system'
  payload: Record<string, any>
  rngState: string  // Captured BEFORE execution
}
```

**Why Record Before Execution?**:
- Captures RNG state before command modifies it
- Ensures deterministic replay (same RNG = same results)
- Critical for replay validation

**Unified Storage Architecture** (v6):
- Replay data embedded in save files
- No separate `replays` store needed
- `persistToIndexedDB()` is now no-op
- GameStorageService handles persistence automatically

**Browser Compatibility**:
- `structuredClone()` available in Chrome 98+, Firefox 94+, Safari 15.4+
- Graceful fallback for older browsers/Jest
