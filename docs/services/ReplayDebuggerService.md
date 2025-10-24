# ReplayDebuggerService

**Location**: `src/services/ReplayDebuggerService/ReplayDebuggerService.ts`
**Dependencies**: IndexedDBService, IRandomService, ICommandFactory
**Test Coverage**: Load replay, reconstruct state, validate determinism

---

## Purpose

Deterministic replay and validation system. Loads replay data from saves, reconstructs game state from command sequence, and validates determinism by comparing replayed vs saved state.

---

## Public API

### Replay Loading

#### `loadReplay(gameId: string): Promise<ReplayData | null>`
Loads replay data from IndexedDB (embedded in save files).

**Parameters**:
- `gameId` - Game ID to load replay for

**Returns**:
```typescript
Promise<ReplayData | null>  // Replay data or null if not found/incompatible
```

**Rules**:
- Loads from `saves` store (replays embedded since save version 6)
- Returns null if save version incompatible
- Returns null if no replay data in save

**Example**:
```typescript
const debugger = new ReplayDebuggerService(indexedDB, randomService, commandFactory)

const replay = await debugger.loadReplay('game-123')
if (replay) {
  console.log(`Loaded ${replay.commands.length} commands`)
}
```

---

### State Reconstruction

#### `reconstructToTurn(replayData: ReplayData, targetTurn: number): Promise<GameState>`
Reconstructs game state by replaying commands to specific turn.

**Parameters**:
- `replayData` - Replay data with initial state and commands
- `targetTurn` - Turn number to reconstruct to

**Returns**:
```typescript
Promise<GameState>  // Reconstructed state at targetTurn
```

**Process**:
1. Start from initial state (turn 0)
2. Filter commands ≤ targetTurn
3. For each command:
   - Restore RNG state (if available)
   - Reconstruct command from event
   - Execute command
   - Await if async
4. Return final state

**Example**:
```typescript
// Jump to turn 42 to inspect state
const stateAtTurn42 = await debugger.reconstructToTurn(replay, 42)

console.log(`Player HP at turn 42: ${stateAtTurn42.player.hp}`)
console.log(`Position: ${stateAtTurn42.player.position.x}, ${stateAtTurn42.player.position.y}`)
```

---

### Determinism Validation

#### `validateDeterminism(replayData: ReplayData, savedState: GameState): Promise<ValidationResult>`
Validates replay produces deterministic results.

**Parameters**:
- `replayData` - Replay data to validate
- `savedState` - Saved final state to compare against

**Returns**:
```typescript
interface ValidationResult {
  valid: boolean           // true if deterministic
  desyncs: DesyncError[]   // Array of desyncs (empty if valid)
}

interface DesyncError {
  turn: number
  field: string           // e.g., "player.hp", "monsters[3].position"
  expected: any
  actual: any
}
```

**Process**:
1. Reconstruct state to final turn
2. Deep compare with saved state
3. Report all differences as desyncs

**Compared Fields**:
- Turn count
- Player: HP, position, gold, level, XP
- Monsters: count, positions, HP
- Items: positions, counts

**Example**:
```typescript
const validation = await debugger.validateDeterminism(replay, savedState)

if (validation.valid) {
  console.log('✅ Game is fully deterministic')
} else {
  console.log(`❌ ${validation.desyncs.length} desyncs detected:`)
  validation.desyncs.forEach(desync => {
    console.log(`  ${desync.field}: expected ${desync.expected}, got ${desync.actual}`)
  })
}
```

---

## Integration Notes

**Used By**:
- Debug commands (load and validate replays)
- AutoSaveMiddleware (automatic validation in dev mode)
- Testing (regression tests with canonical replays)

**Usage Pattern**:
```typescript
const debugger = new ReplayDebuggerService(
  indexedDBService,
  randomService,
  commandFactory
)

// Load replay
const replay = await debugger.loadReplay('game-123')
if (!replay) {
  console.error('No replay data found')
  return
}

// Inspect specific turn
const stateAtBug = await debugger.reconstructToTurn(replay, 142)
console.log('State at bug:', stateAtBug.player.hp)

// Validate determinism
const result = await debugger.validateDeterminism(replay, savedState)
if (!result.valid) {
  console.error('Non-determinism detected!')
  result.desyncs.forEach(desync => {
    console.error(`  ${desync.field}: ${desync.expected} != ${desync.actual}`)
  })
}
```

---

## Testing

**Test Files**:
- `ReplayDebuggerService.test.ts` - Load, reconstruct, validate operations

**Coverage**: Comprehensive (loading, reconstruction, validation, desyncs)

---

## Related Services

- [CommandRecorderService](./CommandRecorderService.md) - Records commands during gameplay
- [CommandFactory](./CommandFactory.md) - Reconstructs commands from events
- [GameStorageService](./GameStorageService.md) - Stores replay data in saves
- [IndexedDBService](./IndexedDBService.md) - Database access for replays

---

## Technical Details

**Replay Version**: 1

**Compatible Save Version**: 6 (replays embedded in saves)

**ReplayData Structure**:
```typescript
interface ReplayData {
  gameId: string
  version: number
  initialState: GameState
  seed: string
  commands: CommandEvent[]
  metadata: {
    createdAt: number
    turnCount: number
    characterName: string
    currentLevel: number
    outcome: 'ongoing' | 'won' | 'died'
  }
}
```

**Determinism Requirements**:
- All game logic uses `IRandomService` (never `Math.random()`)
- RNG state captured before each command
- No timing-dependent logic (`Date.now()` only for metadata)
- No browser API randomness
- Controlled iteration order (arrays, not unordered Sets/Maps)

**State Deserialization**:
```typescript
// Converts JSON arrays back to Maps/Sets
deserializeGameState(state) {
  // levels: [[1, {...}], [2, {...}]] → Map { 1 => {...}, 2 => {...} }
  // visibleCells: ['pos:x:y', ...] → Set { 'pos:x:y', ... }
  // identifiedItems: ['item1', ...] → Set { 'item1', ... }
}
```

**Validation Depth**:
- **Critical fields**: HP, position, gold, XP, level, turn count
- **Monster state**: count, positions, HP
- **Item state**: count, positions
- **Not compared**: UI state, temporary calculations, cache

**Performance**:
- Reconstruction: ~100-200ms per 100 turns
- Validation: reconstruction time + comparison (~10ms)
- Suitable for 1000+ turn games

**Common Desyncs**:
- `Math.random()` usage → Use `IRandomService`
- Missing RNG state capture → Record before execution
- Floating-point accumulation → Use integers
- Async race conditions → Ensure sequential execution

**Debug Workflow**:
1. User reports bug at turn N
2. Load replay: `await debugger.loadReplay(gameId)`
3. Jump to bug: `await debugger.reconstructToTurn(replay, N)`
4. Inspect state at bug turn
5. Validate determinism to confirm not random

**Browser Compatibility**:
- Requires IndexedDB support (all modern browsers)
- Uses async/await (ES2017+)
- structuredClone used for deep copy (Chrome 98+, fallback available)
