# Storage and Replay Debug System Implementation Plan

**Status**: In Progress (Phase 1 & 2 Partial)
**Created**: 2025-10-18
**Refined**: 2025-10-18
**Last Updated**: 2025-10-18
**Target Version**: 5.0
**Estimated Duration**: 8-12 days
**Progress**: 5/15 tasks complete (33%)

---

## Executive Summary

This plan implements a dual-storage system for debugging game state issues through deterministic replay. The system records all commands with RNG state, stores them in IndexedDB alongside full game state snapshots, and provides visual replay with live state inspection for debugging.

**Key Objectives:**
1. **Solve localStorage quota limits** - Migrate to IndexedDB (gigabytes of storage)
2. **Enable debug workflow** - Record commands, replay deterministically, inspect state
3. **Maintain reliability** - Dual storage (full state + command log) for safety
4. **Fresh start** - No migration from localStorage v4 (breaking change acceptable)

**Simplified Scope (Debug Focus):**
- ❌ No user-facing replay viewer with full playback controls
- ❌ No main menu replay list
- ❌ No migration from localStorage
- ❌ No periodic snapshots (replay from turn 0)
- ❌ No preferences migration (stays in localStorage)
- ✅ Focus: Debug workflow for Claude to analyze bugs from replays

---

## Implementation Progress

**Overall**: 5/15 tasks complete (33%)

### Completed Tasks
- ✅ **Task 1.1**: IndexedDBService - Full CRUD operations with 20 tests passing
- ✅ **Task 1.2**: GameStorageService - IndexedDB backend with compression, 22 tests passing
- ✅ **Task 2.1**: Command Event Schema - Complete type definitions, 8 tests passing
- ✅ **Task 2.2**: CommandRecorderService - In-memory command tracking, 17 tests passing
- ✅ **Task 2.3**: RandomService determinism - getState/setState with 10 tests passing

### In Progress
- ⏳ **Task 2.4**: Integrate recording into ~40 command classes
  - **Progress**: 2/~40 commands complete
    - MoveCommand ✅ (80 tests passing)
    - AttackCommand ✅ (16 tests passing)
  - **Next**: PickupCommand
- ⏳ **Task 2.5**: Update GameStorageService to use CommandRecorder

### Pending
- **Phase 3**: Replay Debugging System (Tasks 3.1-3.4)
- **Phase 4**: Testing & Validation (Tasks 4.1-4.3)
- **Phase 5**: Documentation & Polish (Task 5.1)

### Test Results
- **Total Tests**: 67/67 passing ✅
- **Coverage**: IndexedDB (20), GameStorage (22), ReplayTypes (8), CommandRecorder (17)

---

## Architecture Overview

### Dual Storage Model

```
IndexedDB Database: "roguelike_db"
├── Object Store: "saves"
│   ├── Key: gameId (string)
│   └── Value: Full GameState snapshot (for fast loading)
│
└── Object Store: "replays"
    ├── Key: gameId (string)
    └── Value: Initial state + command log (for debugging)
```

### Game Flow

**Save Flow:**
```
1. Player plays game (commands auto-recorded in memory)
2. Auto-save triggers every 10 turns
3. Atomic transaction writes BOTH:
   - Full GameState to "saves" store
   - Initial state + command log to "replays" store
4. If either fails, both rollback
```

**Load Flow:**
```
1. Load full GameState from "saves" store
2. Instant loading (no replay needed)
3. Command log sits unused until debugging
```

**Debug Flow:**
```
1. User: "Find my latest replay and debug this issue"
2. Claude reads from "replays" store
3. Triggers visual replay:
   - Reconstructs state by replaying commands
   - Game renders visually on screen
   - State inspector shows live GameState JSON
4. Claude can jump to specific turn
5. Validates replayed state matches saved state (detects non-determinism)
```

---

## Data Structures

### Command Event

```typescript
// src/types/replay/replay.ts

export interface CommandEvent {
  turnNumber: number        // When command executed
  timestamp: number         // Real-world time (ms)
  commandType: string       // 'move', 'attack', 'use-item', etc.
  actorType: 'player' | 'monster'
  actorId?: string          // Monster ID if AI command
  payload: any              // Command-specific data
  rngState: string          // RNG internal state BEFORE execution
}
```

**Example:**
```typescript
{
  turnNumber: 42,
  timestamp: 1729267891234,
  commandType: 'move',
  actorType: 'player',
  payload: { direction: 'north' },
  rngState: '0.12345,0.67890,...'
}
```

### Replay Data

```typescript
export interface ReplayData {
  gameId: string
  version: number           // Replay format version
  initialState: GameState   // State at turn 0
  seed: string              // RNG seed
  commands: CommandEvent[]  // All recorded commands
  metadata: ReplayMetadata
}

export interface ReplayMetadata {
  createdAt: number
  turnCount: number
  characterName: string
  currentLevel: number
  outcome?: 'won' | 'died' | 'ongoing'
}
```

### Validation Result

```typescript
export interface ValidationResult {
  valid: boolean
  desyncs: DesyncError[]
}

export interface DesyncError {
  turn: number
  field: string           // e.g., "player.hp"
  expected: any
  actual: any
}
```

### IndexedDB Schema

```typescript
const DB_NAME = 'roguelike_db'
const DB_VERSION = 1

const OBJECT_STORES = {
  saves: {
    keyPath: 'gameId',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'characterName', keyPath: 'metadata.characterName', unique: false }
    ]
  },
  replays: {
    keyPath: 'gameId',
    indexes: [
      { name: 'timestamp', keyPath: 'metadata.createdAt', unique: false },
      { name: 'turnCount', keyPath: 'metadata.turnCount', unique: false }
    ]
  }
}
```

---

## Implementation Plan

### Phase 1: IndexedDB Storage Layer (Days 1-3)

**Goal**: Replace localStorage with IndexedDB for game saves and replays.
**Status**: ✅ COMPLETE

#### Task 1.1: Create IndexedDBService ✅ COMPLETE

**File**: `src/services/IndexedDBService/IndexedDBService.ts`

**Responsibilities:**
- Database initialization and version management
- Create two object stores: `saves`, `replays`
- Add indexes for efficient querying
- CRUD operations with Promise-based async API
- Transaction handling
- Quota checking via `navigator.storage.estimate()`

**Key Methods:**
```typescript
class IndexedDBService {
  private db: IDBDatabase | null = null

  async initDatabase(): Promise<IDBDatabase>
  async openDatabase(): Promise<IDBDatabase>
  async put(storeName: string, key: string, value: any): Promise<void>
  async get(storeName: string, key: string): Promise<any>
  async delete(storeName: string, key: string): Promise<void>
  async getAll(storeName: string): Promise<any[]>
  async query(storeName: string, indexName: string, query: IDBKeyRange): Promise<any[]>
  async checkQuota(): Promise<{ usage: number, quota: number, percentUsed: number }>
}
```

**Error Handling:**
- Handle `QuotaExceededError` (rare with IndexedDB)
- Handle `VersionError` (database upgrade failures)
- Handle `NotFoundError` (missing data)
- Retry logic for transient failures

**Implementation Notes:**
- Use Promises with `onsuccess`/`onerror` handlers
- Implement transaction wrapper for atomic operations
- Cache database connection after init

**Test Coverage:**
```typescript
describe('IndexedDBService', () => {
  it('should create database with correct schema')
  it('should save and retrieve data')
  it('should handle transactions atomically')
  it('should handle quota exceeded errors')
  it('should delete data correctly')
  it('should query by index')
  it('should check quota correctly')
})
```

**Dependencies**: None (foundation)

**Estimated Time**: 1 day

**Completion Notes**:
- ✅ Created IndexedDBService with full CRUD operations
- ✅ Implemented 'saves' and 'replays' object stores with indexes
- ✅ Added quota checking via Storage API
- ✅ All 20 tests passing
- ✅ Installed `fake-indexeddb` for testing
- ✅ Added `structuredClone` polyfill for Node.js compatibility

---

#### Task 1.2: Create GameStorageService ✅ COMPLETE

**File**: `src/services/GameStorageService/GameStorageService.ts`

**Responsibilities:**
- Replace `LocalStorageService` with IndexedDB backend
- Handle game save/load operations
- Compress data with LZ-string (keep existing compression)
- Manage atomic saves to both stores (saves + replays)
- Serialize/deserialize GameState (Maps/Sets → Arrays)

**Key Methods:**
```typescript
class GameStorageService {
  constructor(
    private indexedDB: IndexedDBService,
    private compressionWorker: CompressionWorkerService,
    private serializationWorker: SerializationWorkerService
  ) {}

  async saveGame(state: GameState, commands: CommandEvent[]): Promise<void>
  async loadGame(gameId: string): Promise<GameState | null>
  async listGames(): Promise<SaveMetadata[]>
  async deleteGame(gameId: string): Promise<void>
  async getContinueGameId(): Promise<string | null>
  async setContinueGameId(gameId: string): Promise<void>

  // Private serialization methods (from LocalStorageService)
  private async serializeGameState(state: GameState): Promise<string>
  private async deserializeGameState(data: string): Promise<GameState>
  private extractMetadata(state: GameState): SaveMetadata
}
```

**Save Flow:**
```typescript
async saveGame(state: GameState, commands: CommandEvent[]): Promise<void> {
  // 1. Serialize and compress game state
  const serialized = await this.serializeGameState(state)
  const compressed = await this.compressionWorker.compress(serialized)

  // 2. Prepare save data
  const saveData = {
    gameId: state.gameId,
    gameState: compressed,
    metadata: this.extractMetadata(state),
    version: SAVE_VERSION,
    timestamp: Date.now()
  }

  // 3. Prepare replay data
  const replayData = {
    gameId: state.gameId,
    version: REPLAY_VERSION,
    initialState: this.getInitialState(state.gameId), // Cached at game start
    seed: state.seed,
    commands: commands,
    metadata: {
      createdAt: Date.now(),
      turnCount: state.turnCount,
      characterName: state.player.name,
      currentLevel: state.currentLevel,
      outcome: this.getOutcome(state)
    }
  }

  // 4. Atomic transaction to both stores
  const transaction = db.transaction(['saves', 'replays'], 'readwrite')

  try {
    await transaction.objectStore('saves').put(saveData)
    await transaction.objectStore('replays').put(replayData)
    await transaction.complete()
    await this.setContinueGameId(state.gameId)
  } catch (error) {
    transaction.abort()
    throw error
  }
}
```

**Load Flow:**
```typescript
async loadGame(gameId: string): Promise<GameState | null> {
  // 1. Get from IndexedDB
  const data = await this.indexedDB.get('saves', gameId)
  if (!data) return null

  // 2. Decompress and deserialize
  const decompressed = await this.compressionWorker.decompress(data.gameState)
  const state = await this.deserializeGameState(decompressed)

  // 3. Validate
  if (!this.validateGameState(state)) {
    throw new Error('Corrupted save data')
  }

  return state
}
```

**Migration from LocalStorageService:**
- Reuse compression logic (LZ-string)
- Reuse serialization logic (Maps/Sets conversion)
- Reuse validation logic
- Keep retry/error handling patterns
- **NO automatic migration** (fresh start)

**Implementation Notes:**
- Cache initial state when game starts (for replay)
- Track outcome ('won' / 'died' / 'ongoing') for metadata
- Continue pointer stored in IndexedDB 'saves' store with key 'continue_pointer'

**Test Coverage:**
```typescript
describe('GameStorageService', () => {
  it('should save game to both stores atomically')
  it('should load game from saves store')
  it('should compress/decompress correctly')
  it('should handle Maps/Sets serialization')
  it('should preserve all game state through save/load cycle')
  it('should rollback on transaction failure')
  it('should list games sorted by timestamp')
  it('should delete game from both stores')
  it('should handle continue pointer')
  it('should detect corrupted saves')
})
```

**Dependencies**: IndexedDBService, CompressionWorkerService, SerializationWorkerService

**Estimated Time**: 2 days

**Completion Notes**:
- ✅ Created GameStorageService with IndexedDB backend
- ✅ Implemented save/load operations with compression
- ✅ Serialization/deserialization for Maps and Sets
- ✅ Continue pointer management
- ✅ All 22 tests passing
- ⚠️ NOTE: Command recording integration deferred to Task 2.5 (by design)

---

### Phase 2: Command Recording Infrastructure (Days 4-6)

**Goal**: Capture all player and AI commands with RNG state for replay.
**Status**: ✅ 2/5 tasks complete (Task 2.1, 2.2 done)

#### Task 2.1: Define Command Event Schema ✅ COMPLETE

**File**: `src/types/replay/replay.ts`

**Create Types:**
- `CommandEvent` interface
- `ReplayData` interface
- `ReplayMetadata` interface
- `ValidationResult` interface
- `DesyncError` interface

**Create Command Type Registry:**
```typescript
export const COMMAND_TYPES = {
  // Player commands
  MOVE: 'move',
  ATTACK: 'attack',
  PICKUP: 'pickup',
  DROP: 'drop',
  USE_ITEM: 'use-item',
  EQUIP: 'equip',
  UNEQUIP: 'unequip',
  QUAFF: 'quaff',
  READ: 'read',
  ZAP: 'zap',
  THROW: 'throw',
  REST: 'rest',
  SEARCH: 'search',
  DESCEND: 'descend',
  ASCEND: 'ascend',

  // Monster AI commands
  AI_MOVE: 'ai-move',
  AI_ATTACK: 'ai-attack',
  AI_FLEE: 'ai-flee',
  AI_WANDER: 'ai-wander',
  AI_STEAL: 'ai-steal',

  // System commands
  LIGHT_FUEL: 'light-fuel',
  HUNGER_TICK: 'hunger-tick',
  AUTO_SAVE: 'auto-save'
} as const

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES]
```

**Test Coverage:**
```typescript
describe('Replay Types', () => {
  it('should have valid CommandEvent structure')
  it('should have all command types defined')
})
```

**Dependencies**: None

**Estimated Time**: 0.5 days

**Completion Notes**:
- ✅ Created complete type definitions in `src/types/replay/replay.ts`
- ✅ Defined CommandEvent, ReplayData, ValidationResult, DesyncError interfaces
- ✅ Created COMMAND_TYPES registry with 30+ command types
- ✅ All 8 tests passing

---

#### Task 2.2: Create CommandRecorderService ✅ COMPLETE

**File**: `src/services/CommandRecorderService/CommandRecorderService.ts`

**Responsibilities:**
- Track current game's command log in memory
- Record each command as it executes
- Store initial state (turn 0) for replay
- Provide access to command log for saving

**Key Methods:**
```typescript
class CommandRecorderService {
  private commands: CommandEvent[] = []
  private initialState: GameState | null = null
  private currentGameId: string | null = null

  recordCommand(event: CommandEvent): void {
    this.commands.push(event)
  }

  setInitialState(state: GameState): void {
    this.initialState = { ...state }
    this.currentGameId = state.gameId
  }

  getCommandLog(): CommandEvent[] {
    return [...this.commands]
  }

  getInitialState(): GameState | null {
    return this.initialState
  }

  clearLog(): void {
    this.commands = []
    this.initialState = null
    this.currentGameId = null
  }

  getGameId(): string | null {
    return this.currentGameId
  }
}
```

**Memory Management:**
- Commands stored in memory during active game
- Flushed to IndexedDB on save
- Cleared on new game start
- Typical memory usage: ~1-5MB for 1000 turn game

**Implementation Notes:**
- Singleton service, instantiated at app startup
- Initial state captured when new game starts (turn 0)
- Commands cleared when loading existing game (start fresh recording)

**Test Coverage:**
```typescript
describe('CommandRecorderService', () => {
  it('should record commands correctly')
  it('should store initial state')
  it('should return command log copy (immutable)')
  it('should clear log on new game')
  it('should track current game ID')
})
```

**Dependencies**: None

**Estimated Time**: 0.5 days

**Completion Notes**:
- ✅ Created CommandRecorderService with in-memory tracking
- ✅ Implemented deep copying for initial state preservation
- ✅ Immutable getters prevent external mutations
- ✅ Command count tracking and recording state management
- ✅ All 17 tests passing
- ✅ Handles large command logs (1000+ commands tested)

---

#### Task 2.3: Update RandomService for Determinism

**File**: `src/services/RandomService/RandomService.ts`

**Changes:**
Add state capture and restore methods to enable deterministic replay.

**Current Implementation:**
The `RandomService` already uses a seeded RNG. We need to add:

```typescript
export class RandomService implements IRandomService {
  private rng: SeedableRNG
  private seed: string

  constructor(seed?: string) {
    this.seed = seed || this.generateSeed()
    this.rng = new SeedableRNG(this.seed)
  }

  // NEW: Capture RNG internal state
  getState(): string {
    return this.rng.serialize()
  }

  // NEW: Restore RNG internal state
  setState(state: string): void {
    this.rng.deserialize(state)
  }

  // Existing methods unchanged
  next(): number { return this.rng.next() }
  range(min: number, max: number): number { /* ... */ }
  chance(probability: number): boolean { /* ... */ }
  // etc.
}
```

**SeedableRNG Enhancement:**
```typescript
class SeedableRNG {
  private state: number // Internal state (Mulberry32 or similar)

  serialize(): string {
    // Return internal state as string
    return this.state.toString()
  }

  deserialize(state: string): void {
    // Restore internal state from string
    this.state = parseInt(state, 10)
  }

  next(): number {
    // Existing RNG algorithm
    // ...
  }
}
```

**Why This Matters:**
- Deterministic replay requires exact same random sequence
- State capture before each command ensures reproducibility
- Even if RNG called multiple times per turn, we can restore exact state

**Implementation Notes:**
- Check current RNG implementation (likely Mulberry32)
- State is single integer for most simple RNGs
- For more complex RNGs (Mersenne Twister), may be array of integers

**Test Coverage:**
```typescript
describe('RandomService Determinism', () => {
  it('should capture and restore state correctly')
  it('should produce same sequence after state restore')
  it('should handle multiple captures in sequence')
  it('should serialize/deserialize state')
  it('should work with existing seed-based tests')
})
```

**Dependencies**: None

**Estimated Time**: 0.5 days

---

#### Task 2.4: Integrate Recording into Command Layer

**Files**: Update ALL command classes in `src/commands/*/`

**Pattern for Each Command:**
```typescript
export class MoveCommand implements ICommand {
  constructor(
    private direction: Direction,
    private recorder: CommandRecorderService,  // NEW: Inject recorder
    private randomService: IRandomService,     // Existing
    private movementService: MovementService,  // Existing
    // ... other dependencies
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.MOVE,
      actorType: 'player',
      payload: { direction: this.direction },
      rngState: this.randomService.getState()  // Capture RNG state
    })

    // STEP 2: Execute normally (existing logic unchanged)
    const newState = this.movementService.movePlayer(state, this.direction)
    return newState
  }
}
```

**Commands to Update (~40 files):**

**Player Commands:**
- MoveCommand
- AttackCommand
- PickupCommand
- DropCommand
- EquipCommand
- UnequipCommand
- UseItemCommand
- QuaffCommand
- ReadCommand
- ZapCommand
- ThrowCommand
- RestCommand
- SearchCommand
- DescendCommand
- AscendCommand
- (and all other player commands)

**Monster AI Commands:**
```typescript
// In MonsterAIService or AIAction command
this.recorder.recordCommand({
  turnNumber: state.turnCount,
  timestamp: Date.now(),
  commandType: COMMAND_TYPES.AI_MOVE,
  actorType: 'monster',
  actorId: monster.id,
  payload: {
    monsterId: monster.id,
    fromPosition: monster.position,
    toPosition: targetPosition
  },
  rngState: this.randomService.getState()
})
```

**System Commands:**
- AutoSaveMiddleware
- LightFuelCommand (or service)
- HungerTickCommand (or service)

**Dependency Injection Updates:**
- Add `CommandRecorderService` to all command constructors
- Update command factories/builders
- Update dependency injection setup (if using DI container)

**Implementation Strategy:**
1. Start with one command (e.g., MoveCommand) as prototype
2. Write tests for that command
3. Create script or pattern to apply to all commands
4. Update commands in batches (player, monster, system)
5. Test each batch

**Test Updates:**
```typescript
describe('MoveCommand', () => {
  let recorder: CommandRecorderService
  let randomService: IRandomService

  beforeEach(() => {
    recorder = new CommandRecorderService()
    randomService = new MockRandom([0.5])
  })

  it('should record command before execution', () => {
    const command = new MoveCommand('north', recorder, randomService, ...)
    const state = createTestState()

    command.execute(state)

    const log = recorder.getCommandLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toEqual({
      turnNumber: state.turnCount,
      timestamp: expect.any(Number),
      commandType: COMMAND_TYPES.MOVE,
      actorType: 'player',
      payload: { direction: 'north' },
      rngState: expect.any(String)
    })
  })

  it('should execute command normally', () => {
    // Existing tests should still pass
  })
})
```

**Dependencies**: CommandRecorderService, RandomService (updated), COMMAND_TYPES

**Estimated Time**: 2 days (many files, but repetitive pattern)

---

#### Task 2.5: Update GameStorageService to Use Recorder

**File**: `src/services/GameStorageService/GameStorageService.ts`

**Changes:**
Integrate `CommandRecorderService` into save flow.

**Updated Constructor:**
```typescript
class GameStorageService {
  constructor(
    private indexedDB: IndexedDBService,
    private compressionWorker: CompressionWorkerService,
    private serializationWorker: SerializationWorkerService,
    private recorder: CommandRecorderService  // NEW
  ) {}
}
```

**Updated Save Method:**
```typescript
async saveGame(state: GameState): Promise<void> {
  // Get command log from recorder
  const commands = this.recorder.getCommandLog()
  const initialState = this.recorder.getInitialState()

  // Serialize and compress game state
  const serialized = await this.serializeGameState(state)
  const compressed = await this.compressionWorker.compress(serialized)

  // Prepare save data
  const saveData = {
    gameId: state.gameId,
    gameState: compressed,
    metadata: this.extractMetadata(state),
    version: SAVE_VERSION,
    timestamp: Date.now()
  }

  // Prepare replay data
  const replayData = {
    gameId: state.gameId,
    version: REPLAY_VERSION,
    initialState: initialState,
    seed: state.seed,
    commands: commands,
    metadata: {
      createdAt: Date.now(),
      turnCount: state.turnCount,
      characterName: state.player.name,
      currentLevel: state.currentLevel,
      outcome: this.getOutcome(state)
    }
  }

  // Atomic save to both stores
  const db = await this.indexedDB.openDatabase()
  const transaction = db.transaction(['saves', 'replays'], 'readwrite')

  try {
    await transaction.objectStore('saves').put(saveData)
    await transaction.objectStore('replays').put(replayData)
    await transaction.complete()
    await this.setContinueGameId(state.gameId)
  } catch (error) {
    transaction.abort()
    throw error
  }
}
```

**Initial State Capture:**
Update new game creation to capture initial state:

```typescript
// In main game initialization (wherever new game is created)
function startNewGame(characterName: string): GameState {
  const initialState = createNewGameState(characterName)

  // Capture initial state for replay
  this.recorder.setInitialState(initialState)

  return initialState
}
```

**Load Game Behavior:**
When loading existing game, clear recorder (start fresh recording):

```typescript
async loadGame(gameId: string): Promise<GameState | null> {
  const state = await this.loadGameFromIndexedDB(gameId)

  if (state) {
    // Clear recorder - we're resuming a game, start recording from here
    this.recorder.clearLog()
    this.recorder.setInitialState(state) // Current state becomes "initial" for new recording
  }

  return state
}
```

**Test Coverage:**
```typescript
describe('GameStorageService with Recording', () => {
  it('should save command log with game state')
  it('should save initial state in replay data')
  it('should atomic save both stores')
  it('should clear recorder on load game')
  it('should set initial state on new game')
})
```

**Dependencies**: CommandRecorderService

**Estimated Time**: 0.5 days

---

### Phase 3: Replay Debugging System (Days 7-9)

**Goal**: Build replay engine and debug interface for Claude to analyze bugs.

#### Task 3.1: Create ReplayDebuggerService

**File**: `src/services/ReplayDebuggerService/ReplayDebuggerService.ts`

**Responsibilities:**
- Load replay data from IndexedDB
- Reconstruct game state from command sequence
- Jump to specific turn for inspection
- Validate replay against saved state
- Detect non-determinism

**Key Methods:**
```typescript
class ReplayDebuggerService {
  constructor(
    private storageService: GameStorageService,
    private randomService: IRandomService,
    private commandFactory: ICommandFactory  // Creates command instances from events
  ) {}

  async loadReplay(gameId: string): Promise<ReplayData | null> {
    const replay = await this.storageService.indexedDB.get('replays', gameId)

    if (!replay) {
      console.warn('No replay data found for game', gameId)
      return null
    }

    if (replay.version !== CURRENT_REPLAY_VERSION) {
      console.warn('Replay version incompatible', replay.version)
      return null
    }

    return replay
  }

  async reconstructToTurn(
    replayData: ReplayData,
    targetTurn: number
  ): Promise<GameState> {
    // Start from initial state (turn 0)
    let currentState = replayData.initialState

    // Filter commands up to target turn
    const commandsToExecute = replayData.commands.filter(
      cmd => cmd.turnNumber <= targetTurn
    )

    // Replay each command
    for (const commandEvent of commandsToExecute) {
      // Restore RNG state before command
      this.randomService.setState(commandEvent.rngState)

      // Reconstruct and execute command
      const command = this.commandFactory.createFromEvent(commandEvent)
      currentState = command.execute(currentState)
    }

    return currentState
  }

  async validateDeterminism(
    replayData: ReplayData,
    savedState: GameState
  ): Promise<ValidationResult> {
    // Reconstruct final state from commands
    const finalTurn = replayData.metadata.turnCount
    const reconstructed = await this.reconstructToTurn(replayData, finalTurn)

    // Deep comparison
    const desyncs = this.compareStates(savedState, reconstructed)

    return {
      valid: desyncs.length === 0,
      desyncs: desyncs
    }
  }

  private compareStates(
    state1: GameState,
    state2: GameState
  ): DesyncError[] {
    const desyncs: DesyncError[] = []

    // Compare player state
    if (state1.player.hp !== state2.player.hp) {
      desyncs.push({
        turn: state1.turnCount,
        field: 'player.hp',
        expected: state1.player.hp,
        actual: state2.player.hp
      })
    }

    // Compare position
    if (!this.positionsEqual(state1.player.position, state2.player.position)) {
      desyncs.push({
        turn: state1.turnCount,
        field: 'player.position',
        expected: state1.player.position,
        actual: state2.player.position
      })
    }

    // Compare monsters (count, positions, HP)
    const level1 = state1.levels.get(state1.currentLevel)
    const level2 = state2.levels.get(state2.currentLevel)

    if (level1 && level2) {
      if (level1.monsters.length !== level2.monsters.length) {
        desyncs.push({
          turn: state1.turnCount,
          field: 'monsters.length',
          expected: level1.monsters.length,
          actual: level2.monsters.length
        })
      }

      // Deep monster comparison...
    }

    // Compare items, dungeon tiles, etc.
    // (comprehensive comparison of all game state)

    return desyncs
  }

  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y
  }
}
```

**Command Factory:**
Create a factory to reconstruct command instances from events:

```typescript
// src/services/CommandFactory/CommandFactory.ts

interface ICommandFactory {
  createFromEvent(event: CommandEvent): ICommand
}

class CommandFactory implements ICommandFactory {
  constructor(
    // Inject all services needed by commands
    private movementService: MovementService,
    private combatService: CombatService,
    private inventoryService: InventoryService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService,
    // etc.
  ) {}

  createFromEvent(event: CommandEvent): ICommand {
    switch (event.commandType) {
      case COMMAND_TYPES.MOVE:
        return new MoveCommand(
          event.payload.direction,
          this.recorder,
          this.randomService,
          this.movementService
        )

      case COMMAND_TYPES.ATTACK:
        return new AttackCommand(
          event.payload.target,
          this.recorder,
          this.randomService,
          this.combatService
        )

      // ... all other command types

      default:
        throw new Error(`Unknown command type: ${event.commandType}`)
    }
  }
}
```

**Implementation Notes:**
- Command factory must mirror original command creation
- State comparison needs to be comprehensive (all fields)
- Consider using deep equality library (lodash, fast-deep-equal)

**Test Coverage:**
```typescript
describe('ReplayDebuggerService', () => {
  it('should load replay data')
  it('should reconstruct state from commands')
  it('should restore RNG state correctly')
  it('should reconstruct to specific turn')
  it('should validate determinism (match)')
  it('should detect desyncs (player HP mismatch)')
  it('should detect desyncs (monster count mismatch)')
  it('should detect desyncs (position mismatch)')
  it('should handle missing replay gracefully')
  it('should handle incompatible version gracefully')
})
```

**Dependencies**: GameStorageService, RandomService, CommandFactory

**Estimated Time**: 2 days

---

#### Task 3.2: Create CommandFactory

**File**: `src/services/CommandFactory/CommandFactory.ts`

**Responsibilities:**
- Reconstruct command instances from `CommandEvent` objects
- Mirror original command creation logic
- Inject all necessary dependencies

**Implementation:**
See code example in Task 3.1 above.

**Key Considerations:**
- Factory needs ALL service dependencies that commands use
- Payload structure must match command constructor expectations
- Handle unknown command types gracefully

**Test Coverage:**
```typescript
describe('CommandFactory', () => {
  it('should create MoveCommand from event')
  it('should create AttackCommand from event')
  it('should create all player command types')
  it('should create all monster AI command types')
  it('should create all system command types')
  it('should throw on unknown command type')
})
```

**Dependencies**: All command classes, all services

**Estimated Time**: 1 day

---

#### Task 3.3: Create ReplayDebugState (UI)

**File**: `src/states/ReplayDebugState/ReplayDebugState.ts`

**Responsibilities:**
- UI state for debugging replays
- Render game state from replay
- Show live state inspector panel
- Handle playback controls (play, pause, jump to turn)
- Log replay progress to console

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│  REPLAY DEBUG: Character Name              │
│  Turn: 142 / 5234                           │
├─────────────────────────────────────────────┤
│                                             │
│         Game Rendering Area                 │
│       (Same as PlayingState)                │
│                                             │
├─────────────────────────────────────────────┤
│  State Inspector:                           │
│  player: { hp: 45, position: {x: 10, y: 5} }│
│  monsters: [...]                            │
│  (Live GameState JSON)                      │
└─────────────────────────────────────────────┘
```

**Key Methods:**
```typescript
export class ReplayDebugState extends BaseState {
  private replayDebugger: ReplayDebuggerService
  private replayData: ReplayData | null = null
  private currentTurn: number = 0
  private isPlaying: boolean = false
  private currentState: GameState | null = null
  private playbackSpeed: number = 100  // ms per turn

  constructor(
    private gameId: string,
    replayDebugger: ReplayDebuggerService,
    private renderer: CanvasGameRenderer
  ) {
    super()
    this.replayDebugger = replayDebugger
  }

  async enter(): Promise<void> {
    // Load replay data
    this.replayData = await this.replayDebugger.loadReplay(this.gameId)

    if (!this.replayData) {
      console.error('Failed to load replay')
      return
    }

    // Start at turn 0
    this.currentTurn = 0
    this.currentState = this.replayData.initialState

    console.log('Replay loaded:', this.replayData.metadata)
    console.log('Total turns:', this.replayData.metadata.turnCount)
  }

  update(deltaTime: number): void {
    // Auto-advance if playing
    if (this.isPlaying) {
      this.advanceOneTurn()

      if (this.currentTurn >= this.replayData.metadata.turnCount) {
        this.pause()
        console.log('Replay finished')
      }
    }
  }

  render(): void {
    if (!this.currentState) return

    // Render current game state (same as PlayingState)
    this.renderer.render(this.currentState)

    // Render state inspector panel
    this.renderStateInspector()

    // Render controls
    this.renderControls()
  }

  handleInput(input: Input): void {
    switch (input.key) {
      case 'Space':
        this.togglePlayPause()
        break

      case 'ArrowRight':
        this.advanceOneTurn()
        break

      case 'ArrowLeft':
        this.rewindOneTurn()
        break

      case 'g':
        this.jumpToTurn()  // Prompt for turn number
        break

      case 'v':
        this.validateReplay()
        break

      case 'Escape':
        this.exit()
        break
    }
  }

  private togglePlayPause(): void {
    this.isPlaying = !this.isPlaying
    console.log(this.isPlaying ? 'Playing...' : 'Paused')
  }

  private async advanceOneTurn(): Promise<void> {
    if (!this.replayData) return

    this.currentTurn++
    this.currentState = await this.replayDebugger.reconstructToTurn(
      this.replayData,
      this.currentTurn
    )

    console.log(`Turn ${this.currentTurn}:`, this.currentState.messages[0])
  }

  private async rewindOneTurn(): Promise<void> {
    if (this.currentTurn === 0) return

    this.currentTurn--
    this.currentState = await this.replayDebugger.reconstructToTurn(
      this.replayData,
      this.currentTurn
    )
  }

  private async jumpToTurn(): Promise<void> {
    const turn = prompt(`Jump to turn (0-${this.replayData.metadata.turnCount}):`)
    const targetTurn = parseInt(turn, 10)

    if (isNaN(targetTurn) || targetTurn < 0 || targetTurn > this.replayData.metadata.turnCount) {
      console.error('Invalid turn number')
      return
    }

    this.currentTurn = targetTurn
    this.currentState = await this.replayDebugger.reconstructToTurn(
      this.replayData,
      this.currentTurn
    )

    console.log(`Jumped to turn ${this.currentTurn}`)
  }

  private async validateReplay(): Promise<void> {
    console.log('Validating determinism...')

    const savedState = await this.storageService.loadGame(this.gameId)
    const result = await this.replayDebugger.validateDeterminism(
      this.replayData,
      savedState
    )

    if (result.valid) {
      console.log('✓ Validation passed - replay is deterministic')
    } else {
      console.error('✗ Validation failed - desyncs detected:')
      result.desyncs.forEach(desync => {
        console.error(`  Turn ${desync.turn}: ${desync.field}`)
        console.error(`    Expected:`, desync.expected)
        console.error(`    Actual:`, desync.actual)
      })
    }
  }

  private renderStateInspector(): void {
    // Render JSON state in inspector panel
    const inspectorEl = document.getElementById('state-inspector')
    if (inspectorEl && this.currentState) {
      inspectorEl.textContent = JSON.stringify(this.currentState, null, 2)
    }
  }

  private renderControls(): void {
    const controlsEl = document.getElementById('replay-controls')
    if (controlsEl) {
      controlsEl.textContent = `
        Turn: ${this.currentTurn} / ${this.replayData.metadata.turnCount}
        [Space] Play/Pause | [→] Next | [←] Prev | [g] Jump | [v] Validate | [Esc] Exit
      `
    }
  }

  isPaused(): boolean { return true }
  isTransparent(): boolean { return false }
}
```

**HTML Elements (add to index.html):**
```html
<div id="replay-debug-ui" style="display: none;">
  <div id="replay-controls"></div>
  <div id="state-inspector"></div>
</div>
```

**Controls:**
- **Space** - Play/Pause replay
- **Arrow Right** - Advance one turn
- **Arrow Left** - Rewind one turn
- **g** - Jump to specific turn (prompt)
- **v** - Validate replay (compare with saved state)
- **Escape** - Exit to main menu

**Implementation Notes:**
- State inspector shows full GameState as formatted JSON
- Console logs show game messages as replay advances
- Playback advances one turn at a time (no speed controls for simplicity)

**Test Coverage:**
```typescript
describe('ReplayDebugState', () => {
  it('should load replay on enter')
  it('should render current state')
  it('should advance one turn')
  it('should rewind one turn')
  it('should jump to specific turn')
  it('should validate replay')
  it('should toggle play/pause')
})
```

**Dependencies**: ReplayDebuggerService, CanvasGameRenderer

**Estimated Time**: 1 day

---

#### Task 3.4: Add Debug Command to Launch Replay

**File**: Update `src/services/DebugService/DebugService.ts`

**New Debug Commands:**
```typescript
handleInput(key: string, state: GameState): void {
  // Existing debug commands...

  switch (key) {
    case 'r':  // Launch replay debugger for current game
      this.launchReplayDebugger(state.gameId)
      break

    case 'R':  // Launch replay debugger (choose from list)
      this.chooseAndLaunchReplay()
      break

    case 'e':  // Export replay to file
      this.exportReplay(state.gameId)
      break
  }
}

private launchReplayDebugger(gameId: string): void {
  console.log('Launching replay debugger for game:', gameId)

  // Push ReplayDebugState onto state stack
  this.stateManager.pushState(
    new ReplayDebugState(gameId, this.replayDebugger, this.renderer)
  )
}

private async chooseAndLaunchReplay(): Promise<void> {
  // List all replays
  const replays = await this.storageService.listReplays()

  console.log('Available replays:')
  replays.forEach((replay, index) => {
    console.log(`${index}: ${replay.characterName} - Turn ${replay.turnCount} - ${replay.outcome}`)
  })

  const choice = prompt('Choose replay number:')
  const index = parseInt(choice, 10)

  if (index >= 0 && index < replays.length) {
    this.launchReplayDebugger(replays[index].gameId)
  }
}

private async exportReplay(gameId: string): Promise<void> {
  const replayData = await this.replayDebugger.loadReplay(gameId)

  if (!replayData) {
    console.error('No replay data found')
    return
  }

  // Convert to JSON
  const json = JSON.stringify(replayData, null, 2)

  // Download as file
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `replay-${gameId}.json`
  a.click()

  console.log('Replay exported successfully')
}
```

**Usage for Claude:**
1. User plays game, encounters bug
2. User tells Claude: "Find my latest replay and debug this issue"
3. Claude uses Read tool to access exported replay JSON, OR
4. Claude tells user: "Press `R` key in debug mode to launch replay"
5. Replay plays visually, Claude reads console logs and state
6. Claude identifies bug from state inspection

**Test Coverage:**
```typescript
describe('DebugService Replay Commands', () => {
  it('should launch replay debugger')
  it('should list available replays')
  it('should export replay to file')
})
```

**Dependencies**: ReplayDebugState, ReplayDebuggerService

**Estimated Time**: 0.5 days

---

### Phase 4: Testing & Validation (Days 10-11)

**Goal**: Ensure determinism and build test suite.

#### Task 4.1: Add Automatic Validation in Debug Mode

**File**: Update `src/middleware/AutoSaveMiddleware.ts`

**Add validation check after save:**

```typescript
export class AutoSaveMiddleware implements IMiddleware {
  constructor(
    private storageService: GameStorageService,
    private replayDebugger: ReplayDebuggerService,
    private interval: number = 10
  ) {}

  async execute(state: GameState): Promise<GameState> {
    // Auto-save every N turns
    if (state.turnCount % this.interval === 0) {
      await this.storageService.saveGame(state)

      // In debug mode, validate determinism
      if (DEBUG_MODE) {
        await this.validateDeterminism(state)
      }
    }

    return state
  }

  private async validateDeterminism(state: GameState): Promise<void> {
    const replayData = await this.replayDebugger.loadReplay(state.gameId)

    if (!replayData) {
      console.warn('No replay data to validate')
      return
    }

    const result = await this.replayDebugger.validateDeterminism(replayData, state)

    if (!result.valid) {
      console.error('NON-DETERMINISM DETECTED at turn', state.turnCount)
      result.desyncs.forEach(desync => {
        console.error(`  ${desync.field}: expected ${desync.expected}, got ${desync.actual}`)
      })
    } else {
      console.log('✓ Determinism validated at turn', state.turnCount)
    }
  }
}
```

**Why This Matters:**
- Catches non-determinism bugs early during development
- Validates replay system is working correctly
- No manual validation needed

**Test Coverage:**
```typescript
describe('AutoSaveMiddleware Validation', () => {
  it('should validate determinism after save in debug mode')
  it('should log errors on desync')
  it('should pass on deterministic game')
})
```

**Dependencies**: ReplayDebuggerService

**Estimated Time**: 0.5 days

---

#### Task 4.2: Create Integration Test Suite

**File**: `tests/integration/replay-system.test.ts`

**Goal**: Test full save/load/replay cycle.

**Test Cases:**
```typescript
describe('Replay System Integration', () => {
  let storageService: GameStorageService
  let replayDebugger: ReplayDebuggerService
  let recorder: CommandRecorderService

  beforeEach(async () => {
    // Setup services
    storageService = new GameStorageService(...)
    recorder = new CommandRecorderService()
    replayDebugger = new ReplayDebuggerService(...)
  })

  it('should record commands during gameplay', () => {
    const state = createNewGame()
    recorder.setInitialState(state)

    // Execute commands
    const moveCmd = new MoveCommand('north', recorder, ...)
    const newState = moveCmd.execute(state)

    // Verify recording
    const log = recorder.getCommandLog()
    expect(log).toHaveLength(1)
    expect(log[0].commandType).toBe('move')
  })

  it('should save and load replay data', async () => {
    const state = createTestGame()
    recorder.setInitialState(state)

    // Play some turns
    const finalState = playNTurns(state, 10)

    // Save
    await storageService.saveGame(finalState)

    // Load replay
    const replayData = await replayDebugger.loadReplay(finalState.gameId)

    expect(replayData).toBeDefined()
    expect(replayData.commands).toHaveLength(10)
    expect(replayData.metadata.turnCount).toBe(10)
  })

  it('should replay deterministically', async () => {
    const state = createTestGame()
    recorder.setInitialState(state)

    // Play 100 turns
    const finalState = playNTurns(state, 100)

    // Save
    await storageService.saveGame(finalState)

    // Load and replay
    const replayData = await replayDebugger.loadReplay(finalState.gameId)
    const reconstructed = await replayDebugger.reconstructToTurn(replayData, 100)

    // Should match exactly
    expect(reconstructed.player.hp).toBe(finalState.player.hp)
    expect(reconstructed.player.position).toEqual(finalState.player.position)
    expect(reconstructed.turnCount).toBe(100)
  })

  it('should validate determinism', async () => {
    const state = createTestGame()
    recorder.setInitialState(state)

    const finalState = playNTurns(state, 50)
    await storageService.saveGame(finalState)

    const replayData = await replayDebugger.loadReplay(finalState.gameId)
    const result = await replayDebugger.validateDeterminism(replayData, finalState)

    expect(result.valid).toBe(true)
    expect(result.desyncs).toHaveLength(0)
  })

  it('should handle 1000+ turn game', async () => {
    const state = createTestGame()
    recorder.setInitialState(state)

    const finalState = playNTurns(state, 1000)

    // Save should succeed (no quota errors)
    await expect(storageService.saveGame(finalState)).resolves.not.toThrow()

    // Replay should succeed
    const replayData = await replayDebugger.loadReplay(finalState.gameId)
    const reconstructed = await replayDebugger.reconstructToTurn(replayData, 1000)

    expect(reconstructed.turnCount).toBe(1000)
  })
})
```

**Helper Functions:**
```typescript
function playNTurns(state: GameState, n: number): GameState {
  let currentState = state

  for (let i = 0; i < n; i++) {
    // Execute random command
    const command = pickRandomCommand()
    currentState = command.execute(currentState)
  }

  return currentState
}
```

**Test Coverage:**
- Full save/load cycle
- Command recording
- Deterministic replay
- Validation
- Large games (1000+ turns)

**Dependencies**: All services

**Estimated Time**: 1 day

---

#### Task 4.3: Create Determinism Regression Tests

**File**: `tests/regression/determinism.test.ts`

**Goal**: Use canonical replays to catch breaking changes.

**Setup:**
1. Play test game to completion (manually or scripted)
2. Export replay: `exportReplay(gameId)`
3. Save to `tests/fixtures/replays/canonical-game-1.json`
4. Add to regression suite

**Test Cases:**
```typescript
describe('Determinism Regression Tests', () => {
  const FIXTURES = [
    'canonical-game-1.json',  // Victory game
    'canonical-game-2.json',  // Death game
    'canonical-game-3.json',  // Long game (1000+ turns)
  ]

  FIXTURES.forEach(fixture => {
    it(`should replay ${fixture} without desyncs`, async () => {
      // Load canonical replay
      const replayData = loadFixture(fixture)

      // Reconstruct final state
      const reconstructed = await replayDebugger.reconstructToTurn(
        replayData,
        replayData.metadata.turnCount
      )

      // Load expected final state (embedded in fixture)
      const expected = replayData.expectedFinalState

      // Compare
      const result = await replayDebugger.validateDeterminism(replayData, expected)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        console.error('Desyncs detected:', result.desyncs)
      }
    })
  })
})
```

**CI Integration:**
Add to `.github/workflows/test.yml` (or equivalent):
```yaml
- name: Run regression tests
  run: npm run test:regression
```

**When to Update Fixtures:**
- After intentional game logic change
- Re-export replays with new behavior
- Update expected states

**Test Coverage:**
- Multiple game scenarios (victory, death, long games)
- Different command patterns
- Edge cases (monster AI, item usage, etc.)

**Dependencies**: Canonical replay fixtures

**Estimated Time**: 0.5 days

---

### Phase 5: Documentation & Polish (Day 12)

**Goal**: Document the system and clean up.

#### Task 5.1: Update Documentation

**Files to Create/Update:**

**1. Create `docs/replay-system.md`**

```markdown
# Replay System

## Overview
The replay system records all player and AI commands during gameplay, enabling:
- Bug reproduction for debugging
- Deterministic replay for analysis
- Validation of game logic

## Architecture

### Dual Storage
- **saves** store: Full GameState snapshots (for fast loading)
- **replays** store: Initial state + command log (for debugging)

### Command Recording
Every command records before execution:
- Turn number
- Command type
- Actor (player/monster)
- Payload (command data)
- RNG state (for determinism)

### Replay Reconstruction
1. Start from initial state (turn 0)
2. Restore RNG state before each command
3. Execute command
4. Advance turn counter
5. Result is deterministic

## Debug Workflow

### For Claude
1. User encounters bug during gameplay
2. User says: "Find my latest replay and debug this issue"
3. Claude reads replay data from IndexedDB
4. Claude triggers replay debugger (or analyzes data directly)
5. Claude identifies bug from state inspection

### Debug Commands
- **r** - Launch replay debugger for current game
- **R** - Choose replay from list
- **e** - Export replay to JSON file
- **v** - Validate determinism

### Replay Debug Controls
- **Space** - Play/Pause
- **Arrow Right** - Next turn
- **Arrow Left** - Previous turn
- **g** - Jump to turn
- **v** - Validate replay
- **Escape** - Exit

## Determinism Requirements

### Critical Rules
1. **Always use `IRandomService`** - Never use `Math.random()`
2. **Capture RNG state before commands** - Ensures reproducibility
3. **No timing-dependent logic** - Turn-based only
4. **No browser API randomness** - Use seeded RNG only

### Common Sources of Non-Determinism
- `Math.random()` instead of `RandomService`
- `Date.now()` for game logic (OK for metadata)
- Uncontrolled iteration order (use arrays, not Sets/Maps for critical order)
- Floating-point arithmetic (minimize, use integers when possible)

### Validation
- Automatic validation in debug mode (every auto-save)
- Manual validation via debug command (`v`)
- Regression tests with canonical replays

## Testing

### Integration Tests
- Full save/load/replay cycle
- Determinism validation
- Large games (1000+ turns)

### Regression Tests
- Canonical replays detect breaking changes
- Run in CI/CD pipeline
- Update fixtures after intentional changes

## Troubleshooting

### "Non-determinism detected"
1. Check console for which field desynced
2. Trace back to command that modified that field
3. Check if command uses `Math.random()` instead of `RandomService`
4. Check if RNG state was captured correctly

### "Replay version incompatible"
- Old replay format from previous version
- Cannot be replayed (graceful degradation)
- Game can still be loaded from saves store

### "No replay data found"
- Game was loaded (not started fresh)
- Recording started from load point (no initial state)
- Export current replay for debugging from this point forward
```

**2. Update `docs/architecture.md`**

Add section on replay system:
```markdown
## Replay System

The replay system uses **event sourcing** pattern:
- Commands are events
- State reconstructed by replaying events
- Dual storage for safety (full state + event log)

See [Replay System](./replay-system.md) for details.
```

**3. Update `docs/testing-strategy.md`**

Add section on regression testing:
```markdown
## Regression Testing with Replays

Canonical replays ensure game logic doesn't break:
1. Export replay after manual testing
2. Save to `tests/fixtures/replays/`
3. Add to `determinism.test.ts`
4. CI runs on every commit

See [Replay System - Testing](./replay-system.md#testing) for details.
```

**4. Update `CLAUDE.md`**

Add to Quick Links and Common Pitfalls:
```markdown
## Quick Links
- **[Replay System](./docs/replay-system.md)** - Command recording and debugging

## Common Pitfalls

### Using Math.random() Instead of RandomService
**Violates**: Determinism (breaks replay)

✅ **Solution**: Always inject and use `IRandomService`

**Details**: [Replay System - Determinism](./docs/replay-system.md#determinism-requirements)
```

**Test Coverage:**
- Documentation completeness
- Code examples are correct
- Links are valid

**Dependencies**: None

**Estimated Time**: 1 day

---

## Success Criteria

### Functional Requirements
- ✅ No localStorage quota errors (gigabytes available in IndexedDB)
- ✅ Save/load games with same auto-save interval (10 turns)
- ✅ All player and AI commands recorded with RNG state
- ✅ Replays reconstruct game state deterministically
- ✅ Replay debugger shows visual playback + state inspector
- ✅ Jump to specific turn capability
- ✅ Validation detects desyncs (debug mode)
- ✅ Debug commands for replay export/launch

### Performance Requirements
- ✅ Save operation <200ms
- ✅ Load operation <200ms
- ✅ Replay reconstruction (100 turns) <100ms
- ✅ Handles 1000+ turn games without issues

### Quality Requirements
- ✅ All tests pass (>85% coverage overall)
- ✅ No regression in existing functionality
- ✅ Documentation complete and accurate
- ✅ Code follows architectural patterns (SOLID, immutability)
- ✅ Works in modern browsers (Chrome, Firefox, Safari, Edge)

---

## Risks & Mitigations

### Risk 1: Non-Determinism Breaks Replays

**Likelihood**: MEDIUM
**Impact**: HIGH

**Sources:**
- `Math.random()` instead of seeded RNG
- Timing-dependent logic
- Browser API variations

**Mitigations:**
1. ✅ Turn-based game (no timing issues)
2. ✅ Seeded RNG with state capture
3. ✅ Pure functions
4. ✅ Validation layer (catches desyncs early)
5. ✅ Dual storage (full state as fallback)
6. ✅ Regression tests (detect breaking changes)

---

### Risk 2: IndexedDB Browser Compatibility

**Likelihood**: LOW
**Impact**: MEDIUM

**Issues:**
- Safari auto-deletes IndexedDB if storage low
- Private browsing restrictions
- Quota limits vary

**Mitigations:**
1. ✅ All modern browsers support IndexedDB
2. ✅ Detect quota and warn user
3. ✅ Clear error messages
4. ✅ Test on multiple browsers

---

### Risk 3: Large Command Logs Performance

**Likelihood**: MEDIUM
**Impact**: LOW

**Scenarios:**
- Very long games (5000+ turns)
- Many monsters = many commands per turn
- Reconstruction becomes slow

**Mitigations:**
1. ✅ Compression (60-80% size reduction)
2. ✅ IndexedDB handles large data well
3. ✅ Benchmarking (test 1000+ turn games)
4. ✅ Reconstruction is one-time (not real-time)

---

### Risk 4: Code Changes Break Old Replays

**Likelihood**: HIGH
**Impact**: LOW

**Scenarios:**
- Refactor game logic
- Change command structure
- Add new features

**Mitigations:**
1. ✅ Version replays
2. ✅ Graceful degradation ("incompatible version")
3. ✅ Full state save as backup
4. ✅ Focus on recent replays (old ones less critical)
5. ⚠️ Accept breakage (replays are best-effort)

---

## Timeline & Milestones

### Days 1-3: IndexedDB Foundation
- IndexedDBService
- GameStorageService
- Initial tests

**Milestone**: Can save/load games via IndexedDB

---

### Days 4-6: Command Recording
- Command event schema
- CommandRecorderService
- Update all commands
- RandomService determinism

**Milestone**: All commands recorded and saved to IndexedDB

---

### Days 7-9: Replay Debugging
- ReplayDebuggerService
- CommandFactory
- ReplayDebugState UI
- Debug commands

**Milestone**: Can visually replay games with state inspection

---

### Days 10-11: Testing & Validation
- Automatic validation
- Integration tests
- Regression tests

**Milestone**: Determinism validated, test suite complete

---

### Day 12: Documentation & Polish
- Documentation updates
- Code cleanup
- Final testing

**Milestone**: Production-ready system

---

## Implementation Order

**Critical Path:**
1. IndexedDBService (foundation)
2. GameStorageService (storage layer)
3. CommandRecorderService (recording)
4. Update RandomService (determinism)
5. Update all commands (integration)
6. ReplayDebuggerService (reconstruction)
7. CommandFactory (command recreation)
8. ReplayDebugState (UI)
9. Testing & validation
10. Documentation

**Parallel Work (if multiple developers):**
- IndexedDB layer + Command recording can happen in parallel
- Testing can start early with incremental integration

---

## Open Questions

1. **Command Payload Format**: Strict TypeScript types or flexible `any`?
   - **Recommendation**: Start with `any`, refactor if needed

2. **State Comparison Depth**: Deep equality on entire GameState or selective fields?
   - **Recommendation**: Deep equality, use library (fast-deep-equal)

3. **Replay Viewer Polish**: How much UI investment?
   - **Recommendation**: Minimal (functional debug tool, not polished feature)

4. **Export Format**: JSON only or support binary?
   - **Recommendation**: JSON only (human-readable for Claude)

---

## Future Enhancements (Out of Scope)

NOT part of initial implementation:
- Replay sharing (export/import)
- User-facing replay list in main menu
- Playback speed controls (0.5x, 2x, etc.)
- Periodic snapshots for fast seeking
- Replay annotations
- Cloud sync
- Replay statistics

---

## References

### External Resources
- [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Deterministic Game Design](https://gafferongames.com/post/deterministic_lockstep/)

### Internal Documentation
- [Architecture](./architecture.md)
- [Testing Strategy](./testing-strategy.md)
- [Replay System](./replay-system.md) (to be created)

### Original Plan
- [Storage Replay Upgrade Plan (Original)](./archive/storage-replay-upgrade-plan.md)

---

**Last Updated**: 2025-10-18
**Author**: Dirk Kok
**Status**: Ready for Implementation
