# Storage and Replay System Upgrade Plan

**Status**: Planning
**Created**: 2025-10-18
**Target Version**: 5.0
**Estimated Duration**: 10-16 days

---

## Executive Summary

This document outlines a major upgrade to the roguelike's save system and the addition of a comprehensive command recording/replay feature. The dual storage approach solves current localStorage quota limitations while enabling powerful testing, debugging, and user-facing replay capabilities.

**Key Objectives:**
1. **Solve 5MB localStorage quota limit** by migrating to IndexedDB (gigabytes of storage)
2. **Enable command recording** for all player and AI actions
3. **Build replay system** for testing, debugging, and user-facing replay viewer
4. **Maintain reliability** with dual storage (full state + command log)

---

## Current State Analysis

### Existing Save System

**Storage Backend**: Browser localStorage
**Current Version**: v4
**Typical Save Size**: 0.5-1.5 MB (compressed), 2-5 MB (uncompressed)
**Auto-Save Interval**: Every 10 turns

**Architecture:**
```
localStorage (5-10MB quota)
├── roguelike_save_${gameId}     // Compressed GameState
└── roguelike_continue            // Last played game pointer
```

**Serialization Pipeline:**
1. State Preparation (Web Worker) - Convert Maps/Sets → Arrays (5-15ms)
2. JSON Stringify (Web Worker) - Serialize object (10-20ms)
3. Compression (Web Worker) - LZ-string compression, 60-80% reduction (20-50ms)
4. Storage - Synchronous localStorage write with retry logic

**Services Involved:**
- `LocalStorageService` - Main save/load orchestration (682 lines)
- `SerializationWorkerService` - Manages serialization Web Worker (226 lines)
- `CompressionWorkerService` - Manages compression Web Worker (250 lines)
- `AutoSaveMiddleware` - Triggers auto-save every N turns (36 lines)
- `PreferencesService` - User settings (163 lines)

**Total Lines of Code**: ~1,500 lines

### Limitations & Pain Points

1. **Storage Quota**
   - 5-10MB localStorage limit per domain
   - 26-level games approaching quota limits
   - Multiple saves compete for space
   - Quota exceeded errors during save

2. **Synchronous Operations**
   - `localStorage.setItem()` blocks main thread
   - Mitigated by Web Workers for prep/compression

3. **No Replay Capability**
   - Cannot reproduce bugs deterministically
   - No regression testing with saved games
   - No user-facing replay viewer

4. **Version Incompatibility**
   - Old saves deleted on version upgrade
   - No forward/backward compatibility

---

## Research Findings

### Storage Alternatives Comparison

| Feature | localStorage | IndexedDB | OPFS |
|---------|-------------|-----------|------|
| **Capacity** | 5-10 MB | Gigabytes (50% disk) | Gigabytes |
| **Operations** | Synchronous | Asynchronous | Asynchronous |
| **Data Types** | Strings only | Any structured data | Binary files |
| **Querying** | None | Indexes, cursors | None |
| **Browser Support** | Universal | Universal (modern) | Limited (2023+) |
| **Service Workers** | ❌ Not accessible | ✅ Accessible | ✅ Accessible |
| **Complexity** | Low | Medium | High |

**Recommendation**: IndexedDB for structured game data (saves, replays, preferences)

### Event Sourcing & Replay Patterns

**Event Sourcing Pattern:**
- Store append-only sequence of events/commands
- Reconstruct state by replaying events from beginning
- Enables perfect audit trail and time travel

**Key Insights from Research:**
1. **Determinism is critical** - Any RNG, timing, or floating-point variance breaks replay
2. **Command vs Event** - Record commands (inputs), not events (outcomes)
3. **Snapshots required** - Store periodic state checkpoints for fast seeking
4. **Fragility** - Code changes can break old replays (versioning essential)
5. **Validation** - Compare replayed state vs saved state to detect desyncs

**Roguelike-Specific Considerations:**
- Turn-based = naturally deterministic (no timing issues)
- Discrete grid = no floating-point drift
- Seeded RNG = reproducible random values
- Pure functions = state transitions are predictable

---

## Chosen Approach: Dual Storage (Hybrid)

### Architecture Overview

```
IndexedDB Database: "roguelike_db"
├── Object Store: "saves"           // Full GameState snapshots
│   ├── Key: gameId (string)
│   ├── Value: {
│   │     gameState: GameState,
│   │     metadata: SaveMetadata,
│   │     version: number,
│   │     timestamp: number
│   │   }
│   └── Indexes: timestamp, characterName, currentLevel
│
├── Object Store: "replays"         // Command event logs
│   ├── Key: gameId (string)
│   ├── Value: {
│   │     gameId: string,
│   │     version: number,
│   │     initialState: GameState,    // Turn 0 state
│   │     seed: string,                // RNG seed
│   │     commands: CommandEvent[],    // All commands
│   │     snapshots: Map<turn, GameState>  // Every 100 turns
│   │   }
│   └── Indexes: timestamp, turnCount
│
└── Object Store: "preferences"     // User settings
    └── Key: "user_preferences"
```

### Why Dual Storage?

**Advantages:**
1. ✅ **Reliability** - Full state save as fallback if replay breaks
2. ✅ **Validation** - Compare replayed state vs saved state to detect non-determinism
3. ✅ **Less Fragile** - Can load game even if replay system broken
4. ✅ **Incremental Development** - Can build replay feature separately from save migration
5. ✅ **Multiple Use Cases** - Normal play uses saves, testing/debugging uses replays
6. ✅ **Storage Quota Solved** - IndexedDB = gigabytes of space

**Trade-offs:**
- ⚠️ Uses more storage (both representations, but IndexedDB handles it easily)
- ⚠️ Some duplication (same game in two formats)
- ⚠️ More complex save logic (atomic transaction to both stores)

**Alternatives Considered:**

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| **Event Sourcing First** | Smallest saves, replay built-in | Requires perfect determinism, fragile | 🔴 HIGH (9/10) |
| **Dual Storage** ✅ | Best reliability, validation, less fragile | More storage, duplication | 🟡 MEDIUM (6/10) |
| **Incremental Migration** | Lowest risk, one change at a time | Longer timeline, replay feels like add-on | 🟢 LOW (4/10) |

---

## Data Structures

### CommandEvent Type

```typescript
interface CommandEvent {
  turnNumber: number        // Turn when command executed
  timestamp: number         // Real-world time (ms)
  commandType: string       // 'move', 'attack', 'use-item', 'ai-move', etc.
  actorType: 'player' | 'monster'
  actorId?: string          // Monster ID if AI command
  payload: any              // Command-specific data (direction, target, item, etc.)
  rngState?: string         // RNG state before command execution
}
```

**Examples:**
```typescript
// Player movement
{
  turnNumber: 42,
  timestamp: 1729267891234,
  commandType: 'move',
  actorType: 'player',
  payload: { direction: 'north' },
  rngState: '0.12345,0.67890,...'
}

// Monster AI attack
{
  turnNumber: 43,
  timestamp: 1729267891456,
  commandType: 'attack',
  actorType: 'monster',
  actorId: 'monster_123',
  payload: { targetPosition: { x: 10, y: 5 } },
  rngState: '0.23456,0.78901,...'
}
```

### ReplayData Type

```typescript
interface ReplayData {
  gameId: string
  version: number                           // Replay format version
  initialState: GameState                   // State at turn 0
  seed: string                              // RNG seed
  commands: CommandEvent[]                  // All recorded commands
  snapshots: Map<number, GameState>         // Periodic state checkpoints (every 100 turns)
  metadata: {
    createdAt: number                       // Timestamp
    turnCount: number                       // Total turns
    characterName: string
    outcome?: 'won' | 'died' | 'ongoing'   // Final outcome
    maxDepth: number
    monstersKilled: number
  }
}
```

### SaveMetadata Type

```typescript
interface SaveMetadata {
  gameId: string
  version: number
  characterName: string
  currentLevel: number
  turnCount: number
  timestamp: number
  outcome?: 'won' | 'died' | 'ongoing'
}
```

---

## Implementation Plan

### Phase 1: IndexedDB Storage Layer (Foundation)

**Goal**: Replace localStorage with IndexedDB for game saves and preferences.

#### Task 1.1: Create IndexedDBService

**File**: `src/services/IndexedDBService/IndexedDBService.ts`

**Responsibilities:**
- Database initialization and version management
- Create three object stores: `saves`, `replays`, `preferences`
- Add indexes for efficient querying
- CRUD operations with Promise-based async API
- Transaction handling
- Quota checking via `navigator.storage.estimate()`

**Key Methods:**
```typescript
class IndexedDBService {
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

**Database Schema:**
```typescript
const DB_NAME = 'roguelike_db'
const DB_VERSION = 1

const OBJECT_STORES = {
  saves: {
    keyPath: 'gameId',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'characterName', keyPath: 'metadata.characterName', unique: false },
      { name: 'currentLevel', keyPath: 'metadata.currentLevel', unique: false }
    ]
  },
  replays: {
    keyPath: 'gameId',
    indexes: [
      { name: 'timestamp', keyPath: 'metadata.timestamp', unique: false },
      { name: 'turnCount', keyPath: 'metadata.turnCount', unique: false }
    ]
  },
  preferences: {
    keyPath: 'key'
  }
}
```

**Error Handling:**
- Handle `QuotaExceededError` (should be rare with IndexedDB)
- Handle `VersionError` (database upgrade failures)
- Handle `NotFoundError` (missing data)
- Retry logic for transient failures

**Test Coverage:**
- Database creation and upgrade
- All CRUD operations
- Transaction commit and rollback
- Concurrent access
- Quota checking
- Error scenarios

---

#### Task 1.2: Create GameStorageService

**File**: `src/services/GameStorageService/GameStorageService.ts`

**Responsibilities:**
- Replace `LocalStorageService` with IndexedDB backend
- Maintain same interface for easy migration
- Handle game save/load operations
- Compress data with LZ-string (keep existing compression)
- Manage continue game pointer

**Key Methods:**
```typescript
class GameStorageService {
  async saveGame(state: GameState): Promise<void>
  async loadGame(gameId: string): Promise<GameState | null>
  async listGames(): Promise<SaveMetadata[]>
  async deleteGame(gameId: string): Promise<void>
  async getContinueGameId(): Promise<string | null>
  async setContinueGameId(gameId: string): Promise<void>

  // Serialization methods (from LocalStorageService)
  private async serializeGameState(state: GameState): Promise<string>
  private async deserializeGameState(data: string): Promise<GameState>
}
```

**Save Flow:**
```
saveGame(state)
  → serializeGameState(state)  // Maps/Sets → Arrays
  → compress(json)              // LZ-string compression
  → indexedDB.put('saves', { gameState: compressed, metadata, version, timestamp })
  → setContinueGameId(gameId)
```

**Load Flow:**
```
loadGame(gameId)
  → indexedDB.get('saves', gameId)
  → decompress(data.gameState)
  → deserializeGameState(json)  // Arrays → Maps/Sets
  → validate(state)
  → return GameState
```

**Migration from LocalStorageService:**
- Keep compression (LZ-string) for consistency
- Reuse serialization logic (Maps/Sets conversion)
- Keep validation logic
- Keep retry/error handling patterns

**Test Coverage:**
- Save/load cycle preserves all game state
- Map/Set type preservation
- Compression/decompression
- List games with sorting
- Delete game removes from both stores
- Continue game pointer management
- Corrupted save detection

---

#### Task 1.3: Migrate PreferencesService

**File**: Update `src/services/PreferencesService/PreferencesService.ts`

**Changes:**
- Replace `localStorage` backend with `IndexedDBService`
- Store preferences in `preferences` object store
- Keep same API: `getPreference()`, `setPreference()`, `getAllPreferences()`
- One-time migration from localStorage on first load

**Migration Logic:**
```typescript
async migrateFromLocalStorage(): Promise<void> {
  const oldPrefs = localStorage.getItem('roguelike_preferences')
  if (oldPrefs) {
    const prefs = JSON.parse(oldPrefs)
    await this.indexedDB.put('preferences', 'user_preferences', prefs)
    localStorage.removeItem('roguelike_preferences')
  }
}
```

**Test Coverage:**
- Get/set preferences
- Migration from localStorage
- Default values

---

#### Task 1.4: Create MigrationService

**File**: `src/services/MigrationService/MigrationService.ts`

**Responsibilities:**
- One-time migration from localStorage v4 to IndexedDB
- Detect localStorage saves on startup
- Migrate each save to IndexedDB
- Preserve continue game pointer
- Delete localStorage saves after successful migration
- Show progress notifications

**Key Methods:**
```typescript
class MigrationService {
  async needsMigration(): Promise<boolean>
  async migrateFromLocalStorage(): Promise<MigrationResult>
  private async migrateSingleSave(key: string, data: string): Promise<void>
  private async cleanupLocalStorage(): Promise<void>
}

interface MigrationResult {
  success: boolean
  migratedCount: number
  failedCount: number
  errors: string[]
}
```

**Migration Flow:**
```
1. Check for localStorage saves (keys starting with 'roguelike_save_')
2. For each save:
   a. Load and decompress
   b. Validate version (v4 only)
   c. Deserialize GameState
   d. Save to IndexedDB 'saves' store
   e. Create empty replay entry (no commands yet)
3. Migrate continue pointer
4. Delete localStorage saves
5. Show notification: "Migrated X games to new storage system"
```

**Error Handling:**
- Corrupted saves: Skip and log error
- Migration failure: Leave localStorage intact
- Partial migration: Track which saves migrated successfully

**Test Coverage:**
- Migrate v4 saves successfully
- Handle corrupted saves
- Preserve continue pointer
- Cleanup localStorage after migration
- Handle migration failures

---

### Phase 2: Command Recording Infrastructure

**Goal**: Capture all player and AI commands for replay.

#### Task 2.1: Define Command Event Schema

**File**: `src/types/replay/replay.ts`

**Types:**
```typescript
export interface CommandEvent {
  turnNumber: number
  timestamp: number
  commandType: string
  actorType: 'player' | 'monster'
  actorId?: string
  payload: any
  rngState?: string
}

export interface ReplayData {
  gameId: string
  version: number
  initialState: GameState
  seed: string
  commands: CommandEvent[]
  snapshots: Map<number, GameState>
  metadata: ReplayMetadata
}

export interface ReplayMetadata {
  createdAt: number
  turnCount: number
  characterName: string
  outcome?: 'won' | 'died' | 'ongoing'
  maxDepth: number
  monstersKilled: number
}
```

**Command Type Registry:**
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
  AI_STEAL: 'ai-steal'
} as const
```

---

#### Task 2.2: Create CommandRecorderService

**File**: `src/services/CommandRecorderService/CommandRecorderService.ts`

**Responsibilities:**
- Track current game's command log in memory
- Record each command as it executes
- Create periodic state snapshots
- Provide access to command log for saving

**Key Methods:**
```typescript
class CommandRecorderService {
  private commands: CommandEvent[] = []
  private snapshots: Map<number, GameState> = new Map()

  recordCommand(event: CommandEvent): void
  getCommandLog(): CommandEvent[]
  clearLog(): void
  createSnapshot(state: GameState, turnNumber: number): void
  getSnapshots(): Map<number, GameState>
  shouldCreateSnapshot(turnNumber: number): boolean  // Every 100 turns
}
```

**Snapshot Strategy:**
- Create snapshot every 100 turns
- Store compressed GameState
- Used for fast seeking during replay
- Keeps memory usage bounded

**Memory Management:**
- Commands stored in memory during active game
- Flushed to IndexedDB on save
- Cleared on new game start

**Test Coverage:**
- Record commands correctly
- Create snapshots at right intervals
- Retrieve command log
- Clear log

---

#### Task 2.3: Integrate Recording into Command Layer

**Files**: Update ALL command classes in `src/commands/*/`

**Pattern for Each Command:**
```typescript
export class MoveCommand implements ICommand {
  constructor(
    private direction: Direction,
    private recorder: CommandRecorderService,  // NEW: Inject recorder
    private movementService: MovementService,
    // ... other dependencies
  ) {}

  execute(state: GameState): GameState {
    // NEW: Record command at START of execution
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.MOVE,
      actorType: 'player',
      payload: { direction: this.direction }
    })

    // Existing logic...
    const newState = this.movementService.movePlayer(state, this.direction)
    return newState
  }
}
```

**Commands to Update (40+ files):**
- Player commands: Move, Attack, Pickup, Drop, Equip, Unequip, UseItem, Quaff, Read, Zap, Throw, Rest, Search, Descend, Ascend, etc.
- Monster AI commands: AIAction (records monster moves/attacks)
- System commands: AutoSave, LightFuel, HungerTick

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
  }
})
```

**Dependency Injection Updates:**
- Add `CommandRecorderService` to all command constructors
- Update command factories/builders
- Update test mocks

**Test Updates:**
- Add mock `CommandRecorderService` to tests
- Verify `recordCommand()` called with correct data
- Verify command execution still works

---

#### Task 2.4: Update RandomService for Determinism

**File**: `src/services/RandomService/RandomService.ts`

**Current State:**
- Already uses seeded RNG
- Need to add state capture/restore

**Changes:**
```typescript
export class RandomService implements IRandomService {
  private rng: SeedableRNG
  private seed: string

  constructor(seed?: string) {
    this.seed = seed || generateSeed()
    this.rng = new SeedableRNG(this.seed)
  }

  // NEW: Capture RNG state
  getState(): string {
    return this.rng.getState()
  }

  // NEW: Restore RNG state
  setState(state: string): void {
    this.rng.setState(state)
  }

  // Existing methods...
  next(): number { return this.rng.next() }
  range(min: number, max: number): number { /* ... */ }
  // etc.
}
```

**SeedableRNG Implementation:**
- Use existing implementation (likely Mulberry32 or similar)
- Add state serialization (capture internal state variables)
- Add state deserialization (restore internal state)

**Why This Matters:**
- Deterministic replay requires exact same random sequence
- State capture before each command ensures reproducibility
- Even if RNG called multiple times per turn, we can restore exact state

**Test Coverage:**
- State capture and restore
- Deterministic sequence with same seed + state
- Multiple captures/restores in sequence

---

#### Task 2.5: Store Replay Data in IndexedDB

**File**: Update `src/services/GameStorageService/GameStorageService.ts`

**New Methods:**
```typescript
class GameStorageService {
  // Existing methods...

  // NEW: Replay storage
  async saveReplay(replayData: ReplayData): Promise<void>
  async loadReplay(gameId: string): Promise<ReplayData | null>
  async deleteReplay(gameId: string): Promise<void>
  async listReplays(): Promise<ReplayMetadata[]>

  // NEW: Atomic save of both game state and replay
  async saveGameWithReplay(
    state: GameState,
    commands: CommandEvent[],
    snapshots: Map<number, GameState>
  ): Promise<void>
}
```

**Atomic Save Transaction:**
```typescript
async saveGameWithReplay(state, commands, snapshots) {
  const transaction = db.transaction(['saves', 'replays'], 'readwrite')

  try {
    // Save full game state
    const saveData = {
      gameId: state.gameId,
      gameState: await this.serializeGameState(state),
      metadata: this.extractMetadata(state),
      version: SAVE_VERSION,
      timestamp: Date.now()
    }
    await transaction.objectStore('saves').put(saveData)

    // Save replay data
    const replayData = {
      gameId: state.gameId,
      version: REPLAY_VERSION,
      initialState: this.getInitialState(state.gameId),  // Cached from game start
      seed: state.seed,
      commands: commands,
      snapshots: snapshots,
      metadata: this.extractReplayMetadata(state)
    }
    await transaction.objectStore('replays').put(replayData)

    await transaction.complete()
  } catch (error) {
    transaction.abort()
    throw error
  }
}
```

**Initial State Caching:**
- Cache GameState at turn 0 when game starts
- Include in replay data
- Required for replay reconstruction

**Test Coverage:**
- Atomic transaction (both save or neither)
- Replay save/load
- List replays with metadata
- Delete replay removes from store

---

### Phase 3: Replay System

**Goal**: Build replay engine and user-facing viewer.

#### Task 3.1: Create ReplayEngineService

**File**: `src/services/ReplayEngineService/ReplayEngineService.ts`

**Responsibilities:**
- Reconstruct game state from command sequence
- Use snapshots for fast seeking
- Validate replay against saved state
- Detect non-determinism

**Key Methods:**
```typescript
class ReplayEngineService {
  async loadReplay(gameId: string): Promise<ReplayData | null>

  async reconstructState(
    replayData: ReplayData,
    toTurn: number
  ): Promise<GameState>

  async validateReplay(replayData: ReplayData): Promise<ValidationResult>

  private findNearestSnapshot(snapshots: Map<number, GameState>, turn: number): {
    snapshot: GameState,
    snapshotTurn: number
  }

  private executeCommand(
    state: GameState,
    command: CommandEvent
  ): GameState
}

interface ValidationResult {
  valid: boolean
  desyncs: DesyncError[]
  finalStateDifference?: string
}

interface DesyncError {
  turn: number
  field: string
  expected: any
  actual: any
}
```

**Reconstruction Algorithm:**
```
reconstructState(replayData, toTurn):
  1. Find nearest snapshot ≤ toTurn
     - If toTurn = 250, use snapshot at turn 200
     - If no snapshot, use initialState (turn 0)

  2. Filter commands from snapshotTurn to toTurn

  3. For each command:
     a. Restore RNG state (if recorded)
     b. Execute command
     c. Advance turn counter

  4. Return reconstructed GameState
```

**Command Execution:**
```typescript
private executeCommand(state: GameState, command: CommandEvent): GameState {
  // Restore RNG state
  if (command.rngState) {
    this.randomService.setState(command.rngState)
  }

  // Reconstruct command object
  const cmd = this.commandFactory.createFromEvent(command)

  // Execute command
  return cmd.execute(state)
}
```

**Validation:**
```typescript
async validateReplay(replayData: ReplayData): Promise<ValidationResult> {
  // Load saved final state
  const savedState = await this.storageService.loadGame(replayData.gameId)

  // Reconstruct final state from commands
  const finalTurn = replayData.metadata.turnCount
  const reconstructedState = await this.reconstructState(replayData, finalTurn)

  // Compare states
  const desyncs = this.compareStates(savedState, reconstructedState)

  return {
    valid: desyncs.length === 0,
    desyncs: desyncs,
    finalStateDifference: desyncs.length > 0 ? this.formatDiff(desyncs) : undefined
  }
}
```

**Test Coverage:**
- Reconstruct state from commands (simple game)
- Use snapshots for seeking
- Validate determinism (replay twice = same result)
- Detect desyncs
- Handle missing commands
- Handle corrupted replay data

---

#### Task 3.2: Create ReplayPlayerService

**File**: `src/services/ReplayPlayerService/ReplayPlayerService.ts`

**Responsibilities:**
- Manage replay playback UI state
- Control playback (play/pause/stop)
- Seek to specific turn
- Speed control (0.5x, 1x, 2x, 4x)
- Emit events for UI updates

**Key Methods:**
```typescript
class ReplayPlayerService {
  private currentTurn: number = 0
  private isPlaying: boolean = false
  private speed: number = 1.0  // Multiplier
  private replayData: ReplayData | null = null

  async loadReplay(gameId: string): Promise<void>
  play(): void
  pause(): void
  stop(): void
  seekToTurn(turn: number): Promise<void>
  setSpeed(multiplier: number): void

  getCurrentState(): GameState
  getMetadata(): ReplayMetadata
  getProgress(): { currentTurn: number, totalTurns: number, percentage: number }

  // Event emitters
  onStateChange: (state: GameState) => void
  onPlaybackChange: (isPlaying: boolean) => void
  onProgressChange: (progress: number) => void
}
```

**Playback Loop:**
```typescript
async play() {
  this.isPlaying = true

  while (this.isPlaying && this.currentTurn < this.replayData.metadata.turnCount) {
    // Reconstruct state at current turn
    const state = await this.replayEngine.reconstructState(
      this.replayData,
      this.currentTurn
    )

    // Emit to UI
    this.onStateChange(state)
    this.onProgressChange(this.currentTurn / this.totalTurns)

    // Advance turn
    this.currentTurn++

    // Delay based on speed (e.g., 100ms / speed)
    await this.delay(100 / this.speed)
  }

  this.isPlaying = false
}
```

**Seeking Optimization:**
- Use snapshots for fast seeking
- Cache recently reconstructed states
- Throttle UI updates during fast playback

**Test Coverage:**
- Load replay
- Play/pause/stop controls
- Seek to specific turn
- Speed adjustment
- Progress tracking
- Event emission

---

#### Task 3.3: Create ReplayViewerState

**File**: `src/states/ReplayViewerState/ReplayViewerState.ts`

**Responsibilities:**
- UI state for watching replays
- Render game state from replay
- Show playback controls
- Handle user input

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│  REPLAY: Character Name (Victory/Death)     │
├─────────────────────────────────────────────┤
│                                             │
│         Game Rendering Area                 │
│       (Same as PlayingState)                │
│                                             │
├─────────────────────────────────────────────┤
│  Turn: 1234 / 5000                          │
│  [◀◀] [◀] [▶/⏸] [▶▶]    Speed: 2.0x       │
│  ═════════════════════════════════          │
│                                  (scrubber) │
└─────────────────────────────────────────────┘
```

**Key Methods:**
```typescript
export class ReplayViewerState extends BaseState {
  private replayPlayer: ReplayPlayerService
  private currentState: GameState

  constructor(gameId: string, replayPlayer: ReplayPlayerService) {
    super()
    this.replayPlayer = replayPlayer
  }

  async enter(): Promise<void> {
    await this.replayPlayer.loadReplay(this.gameId)
    this.replayPlayer.onStateChange = (state) => {
      this.currentState = state
    }
  }

  update(deltaTime: number): void {
    // Update playback if needed
  }

  render(): void {
    // Render current game state (same as PlayingState)
    this.renderer.render(this.currentState)

    // Render replay controls
    this.renderControls()
  }

  handleInput(input: Input): void {
    switch (input.key) {
      case 'Space': this.togglePlayPause(); break
      case 'ArrowLeft': this.seekBackward(); break
      case 'ArrowRight': this.seekForward(); break
      case '1': this.replayPlayer.setSpeed(0.5); break
      case '2': this.replayPlayer.setSpeed(1.0); break
      case '3': this.replayPlayer.setSpeed(2.0); break
      case '4': this.replayPlayer.setSpeed(4.0); break
      case 'Escape': this.exit(); break
    }
  }

  isPaused(): boolean { return true }
  isTransparent(): boolean { return false }
}
```

**Controls:**
- **Space** - Play/Pause
- **Arrow Left** - Seek backward 10 turns
- **Arrow Right** - Seek forward 10 turns
- **1-4** - Speed control (0.5x, 1x, 2x, 4x)
- **Home** - Jump to start
- **End** - Jump to end
- **Escape** - Exit to replay list

**Test Coverage:**
- Replay viewer initialization
- Control input handling
- Rendering updates
- State transitions

---

#### Task 3.4: Add Replay List to Main Menu

**File**: Update `src/states/MainMenuState/MainMenuState.ts`

**Changes:**
- Add "Watch Replays" menu option
- Create replay selection screen
- List games with metadata (character name, outcome, turn count)
- Launch `ReplayViewerState` on selection

**UI Flow:**
```
Main Menu
  ├─ New Game
  ├─ Continue
  ├─ Watch Replays  ← NEW
  └─ Settings

Watch Replays Screen
  ├─ List of replays:
  │  ├─ "Hero (Victory) - 5234 turns - Level 26"
  │  ├─ "Warrior (Died) - 1023 turns - Level 8"
  │  └─ "Mage (Victory) - 4567 turns - Level 26"
  └─ ESC to return
```

**Implementation:**
```typescript
private async showReplayList() {
  const replays = await this.storageService.listReplays()

  // Sort by timestamp (most recent first)
  replays.sort((a, b) => b.timestamp - a.timestamp)

  // Render list
  this.renderReplayList(replays)

  // Handle selection
  const selected = await this.waitForSelection()
  if (selected) {
    this.stateManager.pushState(new ReplayViewerState(selected.gameId))
  }
}
```

**Test Coverage:**
- Replay list display
- Replay selection
- Launch viewer

---

### Phase 4: Validation & Testing

**Goal**: Ensure determinism and build regression test suite.

#### Task 4.1: Create DeterminismValidatorService

**File**: `src/services/DeterminismValidatorService/DeterminismValidatorService.ts`

**Responsibilities:**
- Validate game determinism during development
- Detect replay desyncs early
- Log discrepancies for debugging

**Key Methods:**
```typescript
class DeterminismValidatorService {
  async validateCurrentGame(
    state: GameState,
    replayData: ReplayData
  ): Promise<ValidationResult>

  async quickValidation(
    state: GameState,
    replayData: ReplayData
  ): Promise<boolean>  // Last 100 turns only

  private compareStates(
    state1: GameState,
    state2: GameState
  ): DesyncError[]

  private formatDiff(desyncs: DesyncError[]): string
}
```

**Validation Trigger:**
- Run on every save in debug mode
- Run periodically in production (every 100 turns)
- Run manually via debug key

**Comparison Logic:**
```typescript
private compareStates(state1: GameState, state2: GameState): DesyncError[] {
  const desyncs: DesyncError[] = []

  // Compare player state
  if (!this.deepEqual(state1.player, state2.player)) {
    desyncs.push(this.findPlayerDifferences(state1.player, state2.player))
  }

  // Compare monsters
  if (!this.deepEqual(state1.levels.get(state1.currentLevel)?.monsters,
                      state2.levels.get(state2.currentLevel)?.monsters)) {
    desyncs.push(this.findMonsterDifferences(...))
  }

  // Compare items, dungeon, etc.

  return desyncs
}
```

**Logging:**
```typescript
if (desyncs.length > 0) {
  console.error('DESYNC DETECTED at turn', state.turnCount)
  desyncs.forEach(desync => {
    console.error(`  Field: ${desync.field}`)
    console.error(`  Expected:`, desync.expected)
    console.error(`  Actual:`, desync.actual)
  })
}
```

**Test Coverage:**
- Detect desyncs correctly
- Pass for deterministic games
- Format diff output

---

#### Task 4.2: Add Regression Test Suite

**File**: `tests/regression/replay-regression.test.ts`

**Goal**: Use canonical replays to detect breaking changes.

**Structure:**
```typescript
describe('Replay Regression Tests', () => {
  const FIXTURES = [
    'victory-game-1.json',
    'death-game-1.json',
    'long-game-1.json'
  ]

  FIXTURES.forEach(fixture => {
    it(`should replay ${fixture} without desyncs`, async () => {
      // Load canonical replay
      const replayData = loadFixture(fixture)

      // Reconstruct final state
      const reconstructed = await replayEngine.reconstructState(
        replayData,
        replayData.metadata.turnCount
      )

      // Load expected final state
      const expected = replayData.expectedFinalState

      // Compare
      const desyncs = validator.compareStates(expected, reconstructed)

      expect(desyncs).toEqual([])
    })
  })
})
```

**Canonical Replay Creation:**
```typescript
// Run once to create fixture
npm run create-fixture -- --game-id=abc123 --output=victory-game-1.json
```

**CI Integration:**
- Run on every pull request
- Fail if any replay desyncs
- Indicates breaking change to game logic

**Test Coverage:**
- Multiple game scenarios (victory, death, long games)
- Different monster behaviors
- Different item usage patterns

---

#### Task 4.3: Add Debug Tools

**File**: Update `src/services/DebugService/DebugService.ts`

**New Debug Commands:**
```typescript
handleInput(key: string, state: GameState): void {
  // Existing debug commands...

  switch (key) {
    case 'r':  // Export replay
      this.exportReplay(state.gameId)
      break

    case 'R':  // Import replay
      this.importReplay()
      break

    case 'y':  // Validate determinism
      this.validateDeterminism(state)
      break

    case 'Y':  // Full validation (all turns)
      this.fullValidation(state)
      break
  }
}
```

**Export Replay:**
```typescript
async exportReplay(gameId: string) {
  const replayData = await this.storageService.loadReplay(gameId)

  // Convert to JSON
  const json = JSON.stringify(replayData, null, 2)

  // Download as file
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `replay-${gameId}.json`
  a.click()

  this.log('Replay exported successfully')
}
```

**Validate Determinism:**
```typescript
async validateDeterminism(state: GameState) {
  this.log('Validating determinism (last 100 turns)...')

  const replayData = await this.storageService.loadReplay(state.gameId)
  const result = await this.validator.quickValidation(state, replayData)

  if (result) {
    this.log('✓ Validation passed - game is deterministic')
  } else {
    this.log('✗ Validation failed - desync detected')
    this.log('Check console for details')
  }
}
```

**Test Coverage:**
- Export replay to file
- Import replay from file
- Validation command execution

---

#### Task 4.4: Update Documentation

**Files to Update:**

**1. `docs/systems-advanced.md`** - Add Replay System section
```markdown
## Replay System

### Overview
The replay system records all player and AI commands during gameplay, enabling:
- Bug reproduction for debugging
- Regression testing with canonical replays
- User-facing replay viewer for watching past games

### Architecture
[Dual storage explanation]
[Command recording flow]
[Replay reconstruction algorithm]

### Command Recording
[How commands are captured]
[CommandEvent structure]
[RNG state management]

### Replay Viewer
[UI controls]
[Seeking]
[Speed control]

### Determinism Requirements
[Why determinism matters]
[Common sources of non-determinism]
[How to maintain determinism]
```

**2. `docs/testing-strategy.md`** - Add Regression Testing section
```markdown
## Regression Testing with Replays

### Creating Canonical Replays
1. Play test game to completion
2. Export replay: Press `r` in debug mode
3. Save to `tests/fixtures/replays/`
4. Add to regression test suite

### Running Regression Tests
```bash
npm run test:regression
```

### Interpreting Results
- Desync = breaking change to game logic
- Check which field differs
- Determine if intentional or bug

### Updating Canonical Replays
- After intentional game logic change
- Re-export replays with new behavior
- Update expected states
```

**3. Create `docs/replay-system.md`** - Dedicated replay documentation
- Complete guide to replay system
- Developer guide (maintaining determinism)
- User guide (watching replays)
- Troubleshooting

**Test Coverage:**
- Documentation completeness
- Code examples are correct
- Links are valid

---

### Phase 5: Performance Optimization

**Goal**: Ensure smooth performance with large games.

#### Task 5.1: Optimize Command Log Storage

**Approaches:**

1. **Compression** (Easy win)
   ```typescript
   async saveReplay(replayData: ReplayData) {
     // Compress commands array before storage
     const compressed = await this.compressionWorker.compress(
       JSON.stringify(replayData.commands)
     )

     const optimized = {
       ...replayData,
       commands: compressed
     }

     await this.indexedDB.put('replays', optimized)
   }
   ```

2. **Binary Format** (Advanced)
   - Encode commands as binary (ArrayBuffer)
   - Smaller size, faster serialization
   - More complex to implement

3. **Pruning Old Turns** (Optional)
   - Keep only last N turns in full detail
   - Older turns: keep snapshots only
   - Reduces storage for very long games

**Benchmark Target:**
- 10,000 turn game should store/load in <1 second
- Replay playback should maintain 60fps

**Test Coverage:**
- Large game (5000+ turns) save/load performance
- Compression ratio
- Memory usage

---

#### Task 5.2: Add Background Saving (Optional)

**If needed**, move IndexedDB writes to Web Worker:
```typescript
class IndexedDBWorkerService {
  private worker: Worker

  async saveInBackground(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ action: 'save', data })
      this.worker.onmessage = (e) => {
        if (e.data.success) resolve()
        else reject(e.data.error)
      }
    })
  }
}
```

**Benefits:**
- Main thread stays responsive
- No frame drops during save
- Better UX for large saves

**Trade-offs:**
- More complexity
- Harder to debug
- May not be needed if IndexedDB already fast enough

---

#### Task 5.3: Add Replay Caching

**Cache recently reconstructed states:**
```typescript
class ReplayPlayerService {
  private stateCache: Map<number, GameState> = new Map()
  private cacheSize: number = 100  // Keep last 100 states

  async seekToTurn(turn: number): Promise<void> {
    // Check cache first
    if (this.stateCache.has(turn)) {
      this.currentState = this.stateCache.get(turn)
      return
    }

    // Reconstruct and cache
    const state = await this.replayEngine.reconstructState(this.replayData, turn)
    this.cacheState(turn, state)
    this.currentState = state
  }

  private cacheState(turn: number, state: GameState): void {
    this.stateCache.set(turn, state)

    // Evict oldest if over limit
    if (this.stateCache.size > this.cacheSize) {
      const oldest = Math.min(...this.stateCache.keys())
      this.stateCache.delete(oldest)
    }
  }
}
```

**Benefits:**
- Faster seeking within recently viewed range
- Smoother scrubbing
- Better UX for replay viewer

**Test Coverage:**
- Cache hit/miss
- Cache eviction
- Seeking performance

---

## Verification & Testing Strategy

### Test Pyramid

```
           /\
          /  \      E2E Tests (Regression)
         /____\     - Canonical replay tests
        /      \    Integration Tests
       /        \   - Full save/load cycle
      /          \  - Replay reconstruction
     /____________\ Unit Tests
                    - Individual services
                    - Command recording
                    - State comparison
```

### Coverage Goals

| Layer | Target Coverage | Critical Areas |
|-------|----------------|----------------|
| **Services** | 100% | IndexedDB, Replay Engine, Validator |
| **Commands** | >80% | Command recording integration |
| **Integration** | >90% | Save/load, Replay reconstruction |
| **Regression** | 100% | All canonical replays pass |

### Manual Testing Checklist

After each phase:
- [ ] Play game for 100+ turns
- [ ] Save and load successfully
- [ ] No quota errors
- [ ] Replay reconstruction matches saved state
- [ ] Watch replay in viewer
- [ ] All playback controls work
- [ ] No performance issues
- [ ] Check IndexedDB in DevTools
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

### Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|------------|
| **Save game** (full state) | <50ms | <100ms |
| **Load game** | <100ms | <200ms |
| **Save replay** | <100ms | <200ms |
| **Reconstruct state** (100 turns) | <50ms | <100ms |
| **Replay playback** (FPS) | 60fps | 30fps |
| **Seek operation** | <100ms | <200ms |

---

## Success Criteria

### Functional Requirements
- ✅ No localStorage quota errors (gigabytes available)
- ✅ Save/load games with same UX as before
- ✅ All player and AI commands recorded during gameplay
- ✅ Replays reconstruct game state deterministically
- ✅ Replay viewer shows game playback with full controls
- ✅ Regression tests use replays to catch breaking changes
- ✅ Determinism validator detects desyncs
- ✅ Debug tools for replay export/import/validation

### Performance Requirements
- ✅ Save operation <100ms
- ✅ Load operation <200ms
- ✅ Replay playback 60fps
- ✅ Seeking <100ms
- ✅ Handles 10,000+ turn games without issues

### Quality Requirements
- ✅ All tests pass (>80% coverage overall)
- ✅ No regression in existing functionality
- ✅ Documentation complete and accurate
- ✅ Code follows architectural patterns (SOLID, immutability)
- ✅ Works in all modern browsers (Chrome, Firefox, Safari, Edge)

---

## Risks & Mitigations

### Risk 1: Non-Determinism Breaks Replays

**Likelihood**: MEDIUM
**Impact**: HIGH

**Sources of Non-Determinism:**
- Floating-point arithmetic variations
- Timing-dependent logic (setTimeout, Date.now())
- Uncontrolled randomness (Math.random() instead of seeded RNG)
- Race conditions (async operations)
- Browser API variations (different browsers, different results)

**Mitigations:**
1. ✅ **Turn-based game** = naturally deterministic (no timing issues)
2. ✅ **Seeded RNG** with state capture = reproducible randomness
3. ✅ **Pure functions** = predictable state transitions
4. ✅ **Validation layer** = catches desyncs early during development
5. ✅ **Snapshot fallback** = can recover from desyncs
6. ✅ **Regression tests** = detect breaking changes immediately

---

### Risk 2: IndexedDB Browser Compatibility

**Likelihood**: LOW
**Impact**: MEDIUM

**Potential Issues:**
- Safari auto-deletes IndexedDB if storage low
- Quota limits vary by browser
- Private browsing mode restrictions
- Older browsers may not support IndexedDB

**Mitigations:**
1. ✅ All modern browsers support IndexedDB (2024+)
2. ✅ Detect quota and warn user before save
3. ✅ Graceful degradation (localStorage fallback if needed)
4. ✅ Clear error messages if IndexedDB unavailable
5. ✅ Test on multiple browsers (Chrome, Firefox, Safari, Edge)

---

### Risk 3: Large Command Logs Exceed Performance Budgets

**Likelihood**: MEDIUM
**Impact**: MEDIUM

**Scenarios:**
- Very long games (5000+ turns)
- Many monsters = many AI commands per turn
- Storage size grows large
- Reconstruction becomes slow

**Mitigations:**
1. ✅ **Compression** = 60-80% size reduction
2. ✅ **Snapshots** = fast seeking without full replay
3. ✅ **Binary format** (if needed) = smaller, faster
4. ✅ **Pruning** (optional) = keep only recent turns in full detail
5. ✅ **Benchmarking** = test with 10,000 turn games
6. ✅ **IndexedDB handles large data** = designed for this

---

### Risk 4: Code Changes Break Old Replays

**Likelihood**: HIGH
**Impact**: LOW

**Scenarios:**
- Refactor game logic = old commands may not execute correctly
- Change monster AI = different behavior
- Add new features = old replays missing data

**Mitigations:**
1. ✅ **Version replays** = mark with game version
2. ✅ **Graceful degradation** = show "incompatible version" message
3. ✅ **Focus on recent replays** = old replays less critical
4. ✅ **Full state save as backup** = can always load game normally
5. ✅ **Migration logic** (if needed) = upgrade old replays to new format
6. ⚠️ **Accept breakage** = replays are best-effort, not guaranteed forever

---

### Risk 5: Migration Failures

**Likelihood**: LOW
**Impact**: MEDIUM

**Scenarios:**
- Corrupted localStorage saves
- Migration script bugs
- User closes browser mid-migration

**Mitigations:**
1. ✅ **Validate before migration** = check save is valid v4 format
2. ✅ **Don't delete localStorage until success** = rollback capability
3. ✅ **Skip corrupted saves** = migrate others successfully
4. ✅ **Show progress** = user knows what's happening
5. ✅ **Thorough testing** = test migration with real v4 saves

---

## Timeline & Milestones

### Week 1: Foundation (Phase 1)
- Days 1-2: IndexedDBService + tests
- Days 3-4: GameStorageService + tests
- Day 5: PreferencesService migration + MigrationService

**Milestone**: Can save/load games via IndexedDB, localStorage migration working

---

### Week 2: Recording (Phase 2)
- Day 1: Define command event schema
- Day 2: CommandRecorderService + tests
- Days 3-4: Integrate into all 40+ commands
- Day 5: RandomService updates + replay storage

**Milestone**: All commands recorded, saved to IndexedDB alongside game state

---

### Week 3: Replay (Phase 3)
- Days 1-2: ReplayEngineService + tests
- Day 3: ReplayPlayerService + tests
- Days 4-5: ReplayViewerState UI + main menu integration

**Milestone**: Can watch replays in full-featured viewer

---

### Week 4: Polish (Phases 4-5)
- Days 1-2: DeterminismValidatorService + regression tests
- Day 3: Debug tools + documentation
- Days 4-5: Performance optimization + final testing

**Milestone**: Production-ready with validation, tests, docs, and performance tuning

---

## Open Questions

1. **Command Payload Format**: Should we define strict TypeScript types for each command's payload, or keep it flexible with `any`?
   - **Recommendation**: Start with `any`, refactor to strict types if needed

2. **Snapshot Interval**: 100 turns seems reasonable, but may need tuning. Too frequent = large storage, too infrequent = slow seeking.
   - **Recommendation**: Start with 100, benchmark, adjust if needed

3. **Binary Format**: Worth the complexity for smaller size?
   - **Recommendation**: Start with JSON + compression, add binary if needed

4. **Replay Viewer Polish**: How much UI polish needed? (progress bar styling, metadata display, etc.)
   - **Recommendation**: Start with functional UI, polish later if user-facing feature

5. **Migration Timing**: Should migration happen on first startup, or provide manual trigger?
   - **Recommendation**: Automatic on first startup with progress notification

---

## Future Enhancements (Out of Scope)

These are potential future improvements, but NOT part of initial implementation:

1. **Replay Sharing** - Export/import replays to share with other players
2. **Replay Annotations** - Add comments/notes to specific turns
3. **Replay Comparison** - Compare two replays side-by-side
4. **Replay Search** - Find replays by criteria (won games, specific monster kills, etc.)
5. **Cloud Sync** - Sync saves/replays across devices
6. **Replay Highlights** - Auto-detect interesting moments (boss fights, close calls)
7. **Replay Statistics** - Aggregate stats across all replays (win rate, avg turns, etc.)

---

## References

### External Resources
- [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Deterministic Game Design](https://gafferongames.com/post/deterministic_lockstep/)

### Internal Documentation
- [Architecture](./architecture.md)
- [Testing Strategy](./testing-strategy.md)
- [Core Systems](./systems-core.md)
- [Advanced Systems](./systems-advanced.md)

---

**Last Updated**: 2025-10-18
**Author**: Dirk Kok
**Status**: Planning → Ready for Implementation
