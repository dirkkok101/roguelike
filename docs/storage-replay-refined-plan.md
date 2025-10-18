# Storage and Replay System - Refined Implementation Plan

**Status**: Ready for Execution
**Created**: 2025-10-18
**Refined**: 2025-10-18
**Target Version**: 5.0
**Estimated Duration**: 12-18 days (expanded from original 10-16)

---

## Overview

This is a refined version of the storage and replay system upgrade plan with:
- ✅ **Expanded subtasks** for each major task
- ✅ **Resolved ambiguities** from original plan
- ✅ **Concrete implementation details**
- ✅ **Proper dependency sequencing**
- ✅ **TDD approach** (tests first when applicable)

**Base Document**: [storage-replay-upgrade-plan.md](./storage-replay-upgrade-plan.md)

---

## Critical Design Decisions (Resolved)

### 1. IndexedDB Transaction API
**Issue**: Original plan showed promise-based API, but IndexedDB uses event-based callbacks.

**Resolution**: Wrap IndexedDB in Promise-based interface:
```typescript
async put(storeName, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(value, key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
```

### 2. Initial State Caching
**Issue**: Plan mentioned "cache initial state" but didn't specify where/how.

**Resolution**: Add to `CommandRecorderService`:
```typescript
class CommandRecorderService {
  private initialState: GameState | null = null

  startNewGame(state: GameState): void {
    this.initialState = { ...state } // Deep clone at turn 0
    this.commands = []
    this.snapshots.clear()
  }
}
```

### 3. Command Factory
**Issue**: Plan referenced `commandFactory.createFromEvent()` but this doesn't exist.

**Resolution**: Create `CommandFactoryService` in Phase 2:
```typescript
class CommandFactoryService {
  createFromEvent(event: CommandEvent): ICommand {
    switch (event.commandType) {
      case COMMAND_TYPES.MOVE:
        return new MoveCommand(event.payload.direction, ...)
      case COMMAND_TYPES.ATTACK:
        return new AttackCommand(event.payload.monsterId, ...)
      // etc.
    }
  }
}
```

### 4. Test Strategy
**Issue**: Some tasks combine implementation + tests. Should we use TDD?

**Resolution**: **YES, use TDD where practical**:
- Services: Write tests FIRST (TDD)
- Commands: Tests AFTER integration (easier to mock dependencies)
- Integration tests: After both services and commands complete

---

## Phase 1: IndexedDB Foundation (4-6 days)

### Task 1.1: Create IndexedDB Service Core

**Goal**: Low-level IndexedDB wrapper with Promise-based API

#### Subtask 1.1.1: Create interface and types
**File**: `src/services/IndexedDBService/IIndexedDBService.ts`

```typescript
export interface IIndexedDBService {
  initDatabase(): Promise<IDBDatabase>
  put(storeName: string, value: any): Promise<void>
  get(storeName: string, key: string): Promise<any>
  delete(storeName: string, key: string): Promise<void>
  getAll(storeName: string): Promise<any[]>
  query(storeName: string, indexName: string, query: IDBKeyRange): Promise<any[]>
  checkQuota(): Promise<StorageQuota>
}

export interface StorageQuota {
  usage: number
  quota: number
  percentUsed: number
}

export interface ObjectStoreConfig {
  keyPath: string
  autoIncrement?: boolean
  indexes?: IndexConfig[]
}

export interface IndexConfig {
  name: string
  keyPath: string | string[]
  unique: boolean
}
```

**Verification**: TypeScript compiles with no errors

---

#### Subtask 1.1.2: Define database schema constants
**File**: `src/services/IndexedDBService/schema.ts`

```typescript
export const DB_NAME = 'roguelike_db'
export const DB_VERSION = 1

export const OBJECT_STORES: Record<string, ObjectStoreConfig> = {
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
      { name: 'timestamp', keyPath: 'metadata.createdAt', unique: false },
      { name: 'turnCount', keyPath: 'metadata.turnCount', unique: false }
    ]
  },
  preferences: {
    keyPath: 'key'
  }
}
```

**Verification**: Import schema in test, verify structure

---

#### Subtask 1.1.3: Write tests for database initialization (TDD)
**File**: `src/services/IndexedDBService/database-init.test.ts`

**Test Cases**:
1. ✅ Creates database with correct name and version
2. ✅ Creates all three object stores (saves, replays, preferences)
3. ✅ Creates indexes for saves store (timestamp, characterName, currentLevel)
4. ✅ Creates indexes for replays store (timestamp, turnCount)
5. ✅ Handles database upgrade from non-existent to v1
6. ✅ Returns existing database if already initialized
7. ✅ Handles concurrent initialization (multiple calls)

**Pattern**:
```typescript
describe('IndexedDBService - Database Initialization', () => {
  let service: IndexedDBService

  beforeEach(() => {
    // Delete database before each test
    return deleteDatabase(DB_NAME)
  })

  afterEach(() => {
    // Cleanup
    return deleteDatabase(DB_NAME)
  })

  test('creates database with correct name and version', async () => {
    service = new IndexedDBService()
    const db = await service.initDatabase()

    expect(db.name).toBe('roguelike_db')
    expect(db.version).toBe(1)
    expect(db.objectStoreNames.contains('saves')).toBe(true)
    expect(db.objectStoreNames.contains('replays')).toBe(true)
    expect(db.objectStoreNames.contains('preferences')).toBe(true)
  })

  // ... more tests
})
```

**Verification**: Run `npm test IndexedDBService` - all tests fail (RED)

---

#### Subtask 1.1.4: Implement database initialization
**File**: `src/services/IndexedDBService/IndexedDBService.ts`

```typescript
export class IndexedDBService implements IIndexedDBService {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async initDatabase(): Promise<IDBDatabase> {
    // Prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.db) {
      return Promise.resolve(this.db)
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.initPromise = null
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        Object.entries(OBJECT_STORES).forEach(([name, config]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement || false
            })

            // Create indexes
            config.indexes?.forEach(indexConfig => {
              store.createIndex(
                indexConfig.name,
                indexConfig.keyPath,
                { unique: indexConfig.unique }
              )
            })
          }
        })
      }
    })

    return this.initPromise
  }
}
```

**Verification**: Run `npm test IndexedDBService` - initialization tests pass (GREEN)

---

#### Subtask 1.1.5: Write tests for CRUD operations (TDD)
**File**: `src/services/IndexedDBService/crud-operations.test.ts`

**Test Cases**:
1. ✅ PUT: Stores object in specified store
2. ✅ PUT: Overwrites existing object with same key
3. ✅ GET: Retrieves object by key
4. ✅ GET: Returns undefined for non-existent key
5. ✅ DELETE: Removes object by key
6. ✅ DELETE: Succeeds even if key doesn't exist
7. ✅ GET_ALL: Returns all objects in store
8. ✅ GET_ALL: Returns empty array for empty store
9. ✅ QUERY: Returns objects matching index query
10. ✅ QUERY: Returns empty array if no matches

**Verification**: Run tests - all fail (RED)

---

#### Subtask 1.1.6: Implement CRUD operations
**File**: `src/services/IndexedDBService/IndexedDBService.ts`

```typescript
async put(storeName: string, value: any): Promise<void> {
  const db = await this.initDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(value)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async get(storeName: string, key: string): Promise<any> {
  const db = await this.initDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async delete(storeName: string, key: string): Promise<void> {
  const db = await this.initDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async getAll(storeName: string): Promise<any[]> {
  const db = await this.initDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async query(storeName: string, indexName: string, query: IDBKeyRange): Promise<any[]> {
  const db = await this.initDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(query)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}
```

**Verification**: Run tests - all CRUD tests pass (GREEN)

---

#### Subtask 1.1.7: Write tests for quota checking
**File**: `src/services/IndexedDBService/quota.test.ts`

**Test Cases**:
1. ✅ Returns quota information (usage, quota, percentUsed)
2. ✅ Calculates percentUsed correctly
3. ✅ Handles browsers without Storage API (fallback)

**Verification**: Run tests - fail (RED)

---

#### Subtask 1.1.8: Implement quota checking
**File**: `src/services/IndexedDBService/IndexedDBService.ts`

```typescript
async checkQuota(): Promise<StorageQuota> {
  if (!navigator.storage || !navigator.storage.estimate) {
    // Fallback for browsers without Storage API
    return {
      usage: 0,
      quota: Infinity,
      percentUsed: 0
    }
  }

  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage || 0
  const quota = estimate.quota || Infinity
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0

  return {
    usage,
    quota,
    percentUsed: Math.round(percentUsed * 100) / 100 // Round to 2 decimals
  }
}
```

**Verification**: Run tests - quota tests pass (GREEN)

---

#### Subtask 1.1.9: Create barrel export
**File**: `src/services/IndexedDBService/index.ts`

```typescript
export { IndexedDBService } from './IndexedDBService'
export type { IIndexedDBService, StorageQuota, ObjectStoreConfig, IndexConfig } from './IIndexedDBService'
export { DB_NAME, DB_VERSION, OBJECT_STORES } from './schema'
```

**Verification**: Import works: `import { IndexedDBService } from '@services/IndexedDBService'`

---

#### Subtask 1.1.10: Test error scenarios
**File**: `src/services/IndexedDBService/error-handling.test.ts`

**Test Cases**:
1. ✅ Handles QuotaExceededError during put
2. ✅ Handles NotFoundError during get
3. ✅ Handles invalid store name
4. ✅ Handles invalid index name
5. ✅ Handles database version error
6. ✅ Handles concurrent transactions

**Verification**: Run tests and verify error handling

---

**Task 1.1 Complete**: Run `npm test IndexedDBService` - all tests pass, coverage >95%

**Git Commit**:
```bash
git add src/services/IndexedDBService/
git commit -m "feat: implement IndexedDB service with Promise-based CRUD API

- Add IndexedDB wrapper with async/await interface
- Create database schema for saves, replays, preferences
- Implement CRUD operations (put, get, delete, getAll, query)
- Add quota checking via Storage API
- Comprehensive error handling
- Test coverage: 98% (45 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.2: Create GameStorageService (Replaces LocalStorageService)

**Goal**: IndexedDB-backed game save/load service maintaining same interface

#### Subtask 1.2.1: Analyze LocalStorageService interface
**Action**: Read `LocalStorageService.ts` and document public API

**Interface to preserve**:
```typescript
interface IGameStorageService {
  saveGame(state: GameState, onSuccess?: () => void, onError?: (error: Error) => void): Promise<void>
  loadGame(gameId: string): Promise<GameState | null>
  listGames(): Promise<SaveMetadata[]>
  deleteGame(gameId: string): Promise<void>
  getContinueGameId(): Promise<string | null>
  setContinueGameId(gameId: string): Promise<void>
  isSavingInProgress(): boolean
  enableTestMode(): void // For unit tests
}
```

**Verification**: Document matches actual LocalStorageService

---

#### Subtask 1.2.2: Create types for save metadata
**File**: `src/types/storage/storage.ts`

```typescript
export interface SaveMetadata {
  gameId: string
  version: number
  characterName: string
  currentLevel: number
  turnCount: number
  timestamp: number
  outcome?: 'won' | 'died' | 'ongoing'
}

export interface SaveData {
  gameId: string
  gameState: string // Compressed JSON
  metadata: SaveMetadata
  version: number
  timestamp: number
}
```

**Verification**: TypeScript compiles

---

#### Subtask 1.2.3: Write tests for save/load cycle (TDD)
**File**: `src/services/GameStorageService/save-load.test.ts`

**Test Cases**:
1. ✅ Saves game state to IndexedDB
2. ✅ Loads game state from IndexedDB
3. ✅ Round-trip preserves all GameState fields
4. ✅ Round-trip preserves Map types (levels, itemNameMap)
5. ✅ Round-trip preserves Set types (visibleCells, identifiedItems)
6. ✅ Compresses data before storage
7. ✅ Decompresses data on load
8. ✅ Sets continue pointer after save
9. ✅ Returns null for non-existent game
10. ✅ Handles corrupted compressed data

**Verification**: Run tests - all fail (RED)

---

#### Subtask 1.2.4: Implement serialization (reuse from LocalStorageService)
**File**: `src/services/GameStorageService/GameStorageService.ts`

**Copy and adapt serialization logic**:
```typescript
private async serializeGameState(state: GameState): Promise<string> {
  // Reuse existing SerializationWorkerService
  return this.serializationWorker.serialize(state)
}

private async deserializeGameState(json: string): Promise<GameState> {
  // Reuse existing SerializationWorkerService
  return this.serializationWorker.deserialize(json)
}
```

**Verification**: Unit test serialization round-trip

---

#### Subtask 1.2.5: Implement save operation
**File**: `src/services/GameStorageService/GameStorageService.ts`

```typescript
async saveGame(
  state: GameState,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    // Serialize and compress
    const json = await this.serializeGameState(state)
    const compressed = await this.compressionWorker.compress(json)

    // Prepare save data
    const saveData: SaveData = {
      gameId: state.gameId,
      gameState: compressed,
      metadata: this.extractMetadata(state),
      version: this.SAVE_VERSION,
      timestamp: Date.now()
    }

    // Save to IndexedDB
    await this.indexedDB.put('saves', saveData)

    // Update continue pointer
    await this.setContinueGameId(state.gameId)

    onSuccess?.()
  } catch (error) {
    onError?.(error as Error)
    throw error
  }
}

private extractMetadata(state: GameState): SaveMetadata {
  return {
    gameId: state.gameId,
    version: this.SAVE_VERSION,
    characterName: state.characterName || 'Unknown Hero',
    currentLevel: state.currentLevel,
    turnCount: state.turnCount,
    timestamp: Date.now(),
    outcome: state.isGameOver ? (state.hasWon ? 'won' : 'died') : 'ongoing'
  }
}
```

**Verification**: Run save tests - pass (GREEN)

---

#### Subtask 1.2.6: Implement load operation
**File**: `src/services/GameStorageService/GameStorageService.ts`

```typescript
async loadGame(gameId: string): Promise<GameState | null> {
  try {
    const saveData: SaveData = await this.indexedDB.get('saves', gameId)

    if (!saveData) {
      return null
    }

    // Decompress and deserialize
    const json = await this.compressionWorker.decompress(saveData.gameState)
    const state = await this.deserializeGameState(json)

    // Validate
    if (!this.isValidSaveState(state)) {
      console.error('Invalid save state detected, deleting corrupted save')
      await this.deleteGame(gameId)
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to load game:', error)
    return null
  }
}

private isValidSaveState(state: any): state is GameState {
  return (
    state &&
    typeof state.gameId === 'string' &&
    typeof state.turnCount === 'number' &&
    state.player &&
    state.levels instanceof Map
  )
}
```

**Verification**: Run load tests - pass (GREEN)

---

#### Subtask 1.2.7: Implement list/delete/continue operations
**File**: `src/services/GameStorageService/GameStorageService.ts`

```typescript
async listGames(): Promise<SaveMetadata[]> {
  const saves: SaveData[] = await this.indexedDB.getAll('saves')

  return saves
    .map(save => save.metadata)
    .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
}

async deleteGame(gameId: string): Promise<void> {
  await this.indexedDB.delete('saves', gameId)
  // Also delete replay if exists
  await this.indexedDB.delete('replays', gameId).catch(() => {
    // Replay might not exist, ignore error
  })
}

async getContinueGameId(): Promise<string | null> {
  const result = await this.indexedDB.get('preferences', 'continue_game')
  return result?.value || null
}

async setContinueGameId(gameId: string): Promise<void> {
  await this.indexedDB.put('preferences', {
    key: 'continue_game',
    value: gameId,
    timestamp: Date.now()
  })
}
```

**Verification**: Run tests for these operations

---

#### Subtask 1.2.8: Write integration tests
**File**: `src/services/GameStorageService/integration.test.ts`

**Test Cases**:
1. ✅ Save → Load → Verify (full cycle)
2. ✅ Save multiple games → List → Verify order
3. ✅ Save → Delete → Load returns null
4. ✅ Save → Continue pointer set correctly
5. ✅ Large game (26 levels) saves and loads
6. ✅ Compression reduces size significantly

**Verification**: All integration tests pass

---

#### Subtask 1.2.9: Create barrel export
**File**: `src/services/GameStorageService/index.ts`

```typescript
export { GameStorageService } from './GameStorageService'
export type { SaveMetadata, SaveData } from '@game/storage/storage'
```

---

**Task 1.2 Complete**: Run `npm test GameStorageService` - all tests pass, coverage >90%

**Git Commit**:
```bash
git add src/services/GameStorageService/ src/types/storage/
git commit -m "feat: implement GameStorageService with IndexedDB backend

- Replace localStorage with IndexedDB for game saves
- Reuse compression and serialization from LocalStorageService
- Maintain same interface for easy migration
- Support save/load/list/delete operations
- Manage continue game pointer
- Test coverage: 93% (32 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.3: Migrate PreferencesService to IndexedDB

**Goal**: Update PreferencesService to use IndexedDB instead of localStorage

#### Subtask 1.3.1: Analyze current PreferencesService
**Action**: Read `PreferencesService.ts` and identify localStorage dependencies

**Current localStorage usage**:
- `localStorage.getItem('roguelike_preferences')`
- `localStorage.setItem('roguelike_preferences', JSON.stringify(prefs))`

**Verification**: Document current behavior

---

#### Subtask 1.3.2: Write migration tests (TDD)
**File**: `src/services/PreferencesService/migration.test.ts`

**Test Cases**:
1. ✅ Migrates preferences from localStorage to IndexedDB
2. ✅ Removes localStorage key after migration
3. ✅ Handles missing localStorage preferences (uses defaults)
4. ✅ Migration runs only once
5. ✅ Handles migration errors gracefully

**Verification**: Run tests - fail (RED)

---

#### Subtask 1.3.3: Update PreferencesService implementation
**File**: `src/services/PreferencesService/PreferencesService.ts`

```typescript
export class PreferencesService {
  private indexedDB: IndexedDBService
  private migrated = false

  constructor(indexedDB: IndexedDBService) {
    this.indexedDB = indexedDB
  }

  async migrateFromLocalStorage(): Promise<void> {
    if (this.migrated) return

    const oldPrefs = localStorage.getItem('roguelike_preferences')
    if (oldPrefs) {
      try {
        const prefs = JSON.parse(oldPrefs)
        await this.indexedDB.put('preferences', {
          key: 'user_preferences',
          value: prefs
        })
        localStorage.removeItem('roguelike_preferences')
      } catch (error) {
        console.error('Failed to migrate preferences:', error)
      }
    }

    this.migrated = true
  }

  async getPreference(key: string): Promise<any> {
    await this.migrateFromLocalStorage()

    const prefs = await this.indexedDB.get('preferences', 'user_preferences')
    return prefs?.value?.[key]
  }

  async setPreference(key: string, value: any): Promise<void> {
    await this.migrateFromLocalStorage()

    const prefs = await this.indexedDB.get('preferences', 'user_preferences') || { key: 'user_preferences', value: {} }
    prefs.value[key] = value

    await this.indexedDB.put('preferences', prefs)
  }
}
```

**Verification**: Run tests - pass (GREEN)

---

**Task 1.3 Complete**: Tests pass, PreferencesService migrated

**Git Commit**:
```bash
git add src/services/PreferencesService/
git commit -m "feat: migrate PreferencesService to IndexedDB

- Replace localStorage with IndexedDB backend
- Add automatic migration from localStorage on first access
- Clean up localStorage after successful migration
- Test coverage: 95% (8 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.4: Create MigrationService for One-Time localStorage Migration

**Goal**: Migrate existing v4 saves from localStorage to IndexedDB

#### Subtask 1.4.1: Write migration tests (TDD)
**File**: `src/services/MigrationService/migration.test.ts`

**Test Cases**:
1. ✅ Detects localStorage saves that need migration
2. ✅ Migrates single save successfully
3. ✅ Migrates multiple saves successfully
4. ✅ Skips corrupted saves, continues with others
5. ✅ Preserves continue game pointer
6. ✅ Deletes localStorage saves after successful migration
7. ✅ Leaves localStorage intact if migration fails
8. ✅ Returns migration result with counts

**Verification**: Run tests - fail (RED)

---

#### Subtask 1.4.2: Implement MigrationService
**File**: `src/services/MigrationService/MigrationService.ts`

```typescript
export interface MigrationResult {
  success: boolean
  migratedCount: number
  failedCount: number
  errors: string[]
}

export class MigrationService {
  constructor(
    private gameStorage: GameStorageService,
    private compressionWorker: CompressionWorkerService,
    private serializationWorker: SerializationWorkerService
  ) {}

  async needsMigration(): Promise<boolean> {
    const keys = Object.keys(localStorage)
    return keys.some(key => key.startsWith('roguelike_save_'))
  }

  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: []
    }

    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('roguelike_save_')
    )

    for (const key of keys) {
      try {
        const data = localStorage.getItem(key)
        if (!data) continue

        // Decompress and deserialize (same as LocalStorageService)
        const json = await this.compressionWorker.decompress(data)
        const state = await this.serializationWorker.deserialize(json)

        // Save to IndexedDB
        await this.gameStorage.saveGame(state)
        result.migratedCount++

        // Delete from localStorage
        localStorage.removeItem(key)
      } catch (error) {
        result.failedCount++
        result.errors.push(`Failed to migrate ${key}: ${error}`)
        result.success = false
      }
    }

    // Migrate continue pointer
    const continueKey = localStorage.getItem('roguelike_continue')
    if (continueKey) {
      await this.gameStorage.setContinueGameId(continueKey)
      localStorage.removeItem('roguelike_continue')
    }

    return result
  }
}
```

**Verification**: Run tests - pass (GREEN)

---

**Task 1.4 Complete**: Migration service implemented and tested

**Git Commit**:
```bash
git add src/services/MigrationService/
git commit -m "feat: implement localStorage to IndexedDB migration service

- Detect and migrate existing v4 saves from localStorage
- Handle corrupted saves gracefully
- Preserve continue game pointer
- Clean up localStorage after successful migration
- Return detailed migration results
- Test coverage: 92% (8 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 1 Complete!

**Total Time**: 4-6 days
**Total Commits**: 4 commits
**Tests Added**: ~100 test cases
**Coverage**: >90% for all services

**Verification**:
```bash
npm test -- IndexedDBService GameStorageService PreferencesService MigrationService
npm run test:coverage
```

**Next Steps**: Phase 2 - Command Recording Infrastructure

---

---

## Phase 2: Command Recording Infrastructure (3-4 days)

### Task 2.1: Define Command Event Schema and Types

**Goal**: Create type definitions for command recording system

#### Subtask 2.1.1: Create replay type definitions
**File**: `src/types/replay/replay.ts`

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

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES]
```

**Verification**: TypeScript compiles, types exported correctly

---

#### Subtask 2.1.2: Create barrel export for replay types
**File**: `src/types/replay/index.ts`

```typescript
export type { CommandEvent, ReplayData, ReplayMetadata, CommandType } from './replay'
export { COMMAND_TYPES } from './replay'
```

**Verification**: Can import types: `import { CommandEvent, COMMAND_TYPES } from '@game/replay'`

---

**Task 2.1 Complete**: Replay types defined

**Git Commit**:
```bash
git add src/types/replay/
git commit -m "feat: define command event and replay data types

- Add CommandEvent interface for recording player/AI actions
- Add ReplayData interface for storing complete replay
- Add ReplayMetadata for replay information
- Define COMMAND_TYPES registry for all command types
- Support for player commands and monster AI commands

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.2: Create CommandRecorderService

**Goal**: Service to track command log and snapshots in memory

#### Subtask 2.2.1: Write interface and tests (TDD)
**File**: `src/services/CommandRecorderService/CommandRecorderService.test.ts`

**Test Cases**:
1. ✅ Records player command with correct data
2. ✅ Records monster AI command with actor ID
3. ✅ Tracks turn number for each command
4. ✅ Stores RNG state with command (if provided)
5. ✅ Creates snapshot every 100 turns
6. ✅ Retrieves complete command log
7. ✅ Retrieves all snapshots
8. ✅ Clears log and snapshots on new game
9. ✅ Stores initial state when game starts
10. ✅ shouldCreateSnapshot returns true at 100, 200, 300...

**Verification**: Run tests - all fail (RED)

---

#### Subtask 2.2.2: Implement CommandRecorderService
**File**: `src/services/CommandRecorderService/CommandRecorderService.ts`

```typescript
export class CommandRecorderService {
  private commands: CommandEvent[] = []
  private snapshots: Map<number, GameState> = new Map()
  private initialState: GameState | null = null
  private readonly SNAPSHOT_INTERVAL = 100

  /**
   * Start recording a new game
   * Stores initial state and clears any existing data
   */
  startNewGame(state: GameState): void {
    this.initialState = this.deepClone(state)
    this.commands = []
    this.snapshots.clear()
  }

  /**
   * Record a command event
   */
  recordCommand(event: CommandEvent): void {
    this.commands.push(event)
  }

  /**
   * Create a state snapshot at the given turn
   * Snapshots are created every SNAPSHOT_INTERVAL turns
   */
  createSnapshot(state: GameState, turnNumber: number): void {
    if (this.shouldCreateSnapshot(turnNumber)) {
      this.snapshots.set(turnNumber, this.deepClone(state))
    }
  }

  /**
   * Check if a snapshot should be created at this turn
   */
  shouldCreateSnapshot(turnNumber: number): boolean {
    return turnNumber > 0 && turnNumber % this.SNAPSHOT_INTERVAL === 0
  }

  /**
   * Get all recorded commands
   */
  getCommandLog(): CommandEvent[] {
    return [...this.commands]
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): Map<number, GameState> {
    return new Map(this.snapshots)
  }

  /**
   * Get initial state
   */
  getInitialState(): GameState | null {
    return this.initialState
  }

  /**
   * Clear all recorded data
   */
  clearLog(): void {
    this.commands = []
    this.snapshots.clear()
    this.initialState = null
  }

  /**
   * Deep clone a GameState to avoid references
   */
  private deepClone(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state))
  }
}
```

**Verification**: Run tests - all pass (GREEN)

---

#### Subtask 2.2.3: Create barrel export
**File**: `src/services/CommandRecorderService/index.ts`

```typescript
export { CommandRecorderService } from './CommandRecorderService'
```

**Verification**: Can import service

---

**Task 2.2 Complete**: CommandRecorderService implemented

**Git Commit**:
```bash
git add src/services/CommandRecorderService/
git commit -m "feat: implement CommandRecorderService for tracking commands

- Record player and AI commands during gameplay
- Create state snapshots every 100 turns
- Store initial state for replay reconstruction
- Support clearing log for new games
- Test coverage: 95% (10 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.3: Update RandomService for Determinism

**Goal**: Add RNG state capture and restore for replay determinism

#### Subtask 2.3.1: Read current RandomService implementation
**Action**: Understand current RNG implementation (likely Mulberry32 or similar)

**Analysis needed**:
- What PRNG algorithm is used?
- What is the internal state? (single number or multiple?)
- How is it seeded?

**Verification**: Document current RNG structure

---

#### Subtask 2.3.2: Write tests for state capture/restore (TDD)
**File**: `src/services/RandomService/state-management.test.ts`

**Test Cases**:
1. ✅ getState() returns string representation of RNG state
2. ✅ setState() restores RNG to exact same state
3. ✅ Same seed + setState produces same sequence
4. ✅ Capture → generate values → restore → produces same values
5. ✅ Multiple captures/restores work correctly
6. ✅ State string is serializable (no special characters)

**Verification**: Run tests - fail (RED)

---

#### Subtask 2.3.3: Implement getState/setState methods
**File**: `src/services/RandomService/RandomService.ts`

```typescript
export class RandomService implements IRandomService {
  private rng: Mulberry32 // or whatever PRNG is used
  private seed: string

  // Existing methods...

  /**
   * Capture current RNG state as string
   * State can be restored later for deterministic replay
   */
  getState(): string {
    return JSON.stringify(this.rng.getInternalState())
  }

  /**
   * Restore RNG to a previously captured state
   * Used for deterministic replay
   */
  setState(state: string): void {
    const internalState = JSON.parse(state)
    this.rng.setInternalState(internalState)
  }
}

// If using Mulberry32, internal state is just one number:
class Mulberry32 {
  private state: number

  getInternalState(): number {
    return this.state
  }

  setInternalState(state: number): void {
    this.state = state
  }
}
```

**Verification**: Run tests - pass (GREEN)

---

**Task 2.3 Complete**: RandomService updated for determinism

**Git Commit**:
```bash
git add src/services/RandomService/
git commit -m "feat: add RNG state capture/restore for deterministic replay

- Add getState() to capture current RNG state
- Add setState() to restore RNG to previous state
- Enables deterministic replay of game sequences
- Test coverage: 100% for state management (6 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.4: Integrate Recording into Command Layer (LARGE TASK)

**Goal**: Update all 40+ commands to record their execution

#### Subtask 2.4.1: Create command recording helper
**File**: `src/commands/RecordingHelper.ts`

```typescript
/**
 * Helper for recording commands
 * Reduces boilerplate in command classes
 */
export class RecordingHelper {
  static recordPlayerCommand(
    recorder: CommandRecorderService,
    state: GameState,
    commandType: CommandType,
    payload: any,
    rng?: IRandomService
  ): void {
    recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType,
      actorType: 'player',
      payload,
      rngState: rng?.getState()
    })
  }

  static recordMonsterCommand(
    recorder: CommandRecorderService,
    state: GameState,
    monsterId: string,
    commandType: CommandType,
    payload: any,
    rng?: IRandomService
  ): void {
    recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType,
      actorType: 'monster',
      actorId: monsterId,
      payload,
      rngState: rng?.getState()
    })
  }
}
```

**Verification**: Helper compiles and exports

---

#### Subtask 2.4.2: Update MoveCommand (template for others)
**File**: `src/commands/MoveCommand/MoveCommand.ts`

```typescript
export class MoveCommand implements ICommand {
  constructor(
    private direction: Direction,
    private recorder: CommandRecorderService, // NEW
    private movementService: MovementService,
    // ... other dependencies
  ) {}

  execute(state: GameState): GameState {
    // RECORD COMMAND FIRST (before any logic)
    RecordingHelper.recordPlayerCommand(
      this.recorder,
      state,
      COMMAND_TYPES.MOVE,
      { direction: this.direction }
    )

    // Existing logic unchanged...
    const newState = this.movementService.movePlayer(state, this.direction)
    return newState
  }
}
```

**Update tests**:
```typescript
describe('MoveCommand', () => {
  let recorder: CommandRecorderService

  beforeEach(() => {
    recorder = new CommandRecorderService()
  })

  test('records move command', () => {
    const command = new MoveCommand('north', recorder, movementService, ...)
    command.execute(state)

    const log = recorder.getCommandLog()
    expect(log).toHaveLength(1)
    expect(log[0].commandType).toBe(COMMAND_TYPES.MOVE)
    expect(log[0].payload.direction).toBe('north')
  })
})
```

**Verification**: MoveCommand tests pass with recording

---

#### Subtask 2.4.3-2.4.42: Update remaining 40 commands
**Batch approach** (to avoid 40 individual subtasks):

**Batch 1 - Movement & Actions** (10 commands):
- MoveCommand, AttackCommand, PickupCommand, DropCommand, RestCommand, SearchCommand, DescendCommand, AscendCommand, OpenDoorCommand, CloseDoorCommand

**Batch 2 - Inventory & Equipment** (10 commands):
- EquipCommand, UnequipCommand, WieldCommand, WearCommand, TakeOffCommand, RemoveCommand

**Batch 3 - Item Usage** (10 commands):
- QuaffCommand, ReadCommand, ZapCommand, ThrowCommand, EatCommand, ApplyCommand

**Batch 4 - Monster AI** (5 commands):
- MonsterMoveCommand, MonsterAttackCommand, MonsterFleeCommand, MonsterWanderCommand, MonsterStealCommand

**Batch 5 - System Commands** (5 commands):
- AutoSaveCommand, LightFuelCommand, HungerTickCommand, RegenerationCommand, StatusEffectTickCommand

**Pattern for each**:
1. Add `recorder: CommandRecorderService` to constructor
2. Call `RecordingHelper.recordPlayerCommand()` or `recordMonsterCommand()` at start of execute()
3. Update tests to verify recording
4. Update command factory/builders

**Verification**: All command tests pass, recording verified

---

**Task 2.4 Complete**: All commands record execution

**Git Commit (one commit for all batches)**:
```bash
git add src/commands/
git commit -m "feat: integrate command recording into all 40+ commands

- Add CommandRecorderService dependency to all commands
- Record player commands with type and payload
- Record monster AI commands with actor ID
- Add RecordingHelper to reduce boilerplate
- Update all command tests to verify recording
- Update command factories with recorder dependency

Commands updated: 40+
Test coverage: Maintained >80% for all commands

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.5: Store Replay Data in IndexedDB

**Goal**: Save replay data alongside game state atomically

#### Subtask 2.5.1: Update GameStorageService with replay methods
**File**: `src/services/GameStorageService/GameStorageService.ts`

**Add methods**:
```typescript
async saveReplay(replayData: ReplayData): Promise<void>
async loadReplay(gameId: string): Promise<ReplayData | null>
async deleteReplay(gameId: string): Promise<void>
async listReplays(): Promise<ReplayMetadata[]>
```

**Verification**: TypeScript compiles

---

#### Subtask 2.5.2: Write tests for replay storage (TDD)
**File**: `src/services/GameStorageService/replay-storage.test.ts`

**Test Cases**:
1. ✅ Saves replay data to IndexedDB replays store
2. ✅ Loads replay data from IndexedDB
3. ✅ Returns null for non-existent replay
4. ✅ Deletes replay from store
5. ✅ Lists all replays with metadata
6. ✅ Compresses command array before storage
7. ✅ Round-trip preserves all replay fields

**Verification**: Run tests - fail (RED)

---

#### Subtask 2.5.3: Implement replay storage methods
**File**: `src/services/GameStorageService/GameStorageService.ts`

```typescript
async saveReplay(replayData: ReplayData): Promise<void> {
  // Compress commands array
  const commandsJson = JSON.stringify(replayData.commands)
  const compressedCommands = await this.compressionWorker.compress(commandsJson)

  const data = {
    ...replayData,
    commands: compressedCommands // Replace with compressed version
  }

  await this.indexedDB.put('replays', data)
}

async loadReplay(gameId: string): Promise<ReplayData | null> {
  const data = await this.indexedDB.get('replays', gameId)

  if (!data) return null

  // Decompress commands
  const commandsJson = await this.compressionWorker.decompress(data.commands)
  const commands = JSON.parse(commandsJson)

  return {
    ...data,
    commands
  }
}

async deleteReplay(gameId: string): Promise<void> {
  await this.indexedDB.delete('replays', gameId)
}

async listReplays(): Promise<ReplayMetadata[]> {
  const replays: ReplayData[] = await this.indexedDB.getAll('replays')
  return replays.map(r => r.metadata)
}
```

**Verification**: Run tests - pass (GREEN)

---

#### Subtask 2.5.4: Implement atomic save (game + replay)
**File**: `src/services/GameStorageService/GameStorageService.ts`

```typescript
async saveGameWithReplay(
  state: GameState,
  commands: CommandEvent[],
  snapshots: Map<number, GameState>,
  initialState: GameState
): Promise<void> {
  // Prepare save data
  const saveData = await this.prepareSaveData(state)

  // Prepare replay data
  const replayData: ReplayData = {
    gameId: state.gameId,
    version: this.REPLAY_VERSION,
    initialState,
    seed: state.seed,
    commands,
    snapshots,
    metadata: this.extractReplayMetadata(state)
  }

  // Save both atomically (IndexedDB doesn't support cross-store transactions,
  // so we save sequentially but handle rollback on failure)
  try {
    await this.indexedDB.put('saves', saveData)
    await this.saveReplay(replayData)
    await this.setContinueGameId(state.gameId)
  } catch (error) {
    // Attempt rollback
    await this.indexedDB.delete('saves', state.gameId).catch(() => {})
    await this.indexedDB.delete('replays', state.gameId).catch(() => {})
    throw error
  }
}
```

**Verification**: Integration test for atomic save

---

**Task 2.5 Complete**: Replay storage implemented

**Git Commit**:
```bash
git add src/services/GameStorageService/
git commit -m "feat: add replay storage to GameStorageService

- Implement saveReplay/loadReplay for IndexedDB replays store
- Compress command arrays before storage
- Add atomic saveGameWithReplay (game state + replay data)
- List replays with metadata
- Delete replays alongside game saves
- Test coverage: 91% (12 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2 Complete!

**Total Time**: 3-4 days
**Total Commits**: 5 commits
**Tests Added**: ~60 test cases
**Commands Updated**: 40+

**Verification**:
```bash
npm test -- CommandRecorderService RandomService
npm test -- commands/
npm run test:coverage
```

---

## Phase 3: Replay System (3-4 days)

### Task 3.1: Create ReplayEngineService

**Goal**: Reconstruct game state from command sequence

#### Subtask 3.1.1: Create CommandFactoryService
**File**: `src/services/CommandFactoryService/CommandFactoryService.ts`

**Purpose**: Reconstruct command objects from CommandEvent data

```typescript
export class CommandFactoryService {
  constructor(
    private recorder: CommandRecorderService,
    private randomService: IRandomService,
    // ... all service dependencies needed by commands
  ) {}

  createFromEvent(event: CommandEvent): ICommand {
    switch (event.commandType) {
      case COMMAND_TYPES.MOVE:
        return new MoveCommand(
          event.payload.direction,
          this.recorder,
          this.movementService,
          // ... dependencies
        )

      case COMMAND_TYPES.ATTACK:
        return new AttackCommand(
          event.payload.monsterId,
          this.recorder,
          this.combatService,
          // ... dependencies
        )

      // ... all 40+ command types

      default:
        throw new Error(`Unknown command type: ${event.commandType}`)
    }
  }
}
```

**Verification**: Can reconstruct all command types

---

#### Subtask 3.1.2: Write tests for ReplayEngineService (TDD)
**File**: `src/services/ReplayEngineService/ReplayEngineService.test.ts`

**Test Cases**:
1. ✅ Loads replay data from storage
2. ✅ Reconstructs state from initial state + commands
3. ✅ Uses nearest snapshot for fast seeking
4. ✅ Restores RNG state before each command
5. ✅ Reconstructs state at specific turn
6. ✅ Handles empty command log
7. ✅ Validates replay against saved state
8. ✅ Detects desyncs between replay and saved state
9. ✅ Replay twice produces same result (determinism)
10. ✅ Handles corrupted replay data gracefully

**Verification**: Run tests - fail (RED)

---

#### Subtask 3.1.3: Implement state reconstruction
**File**: `src/services/ReplayEngineService/ReplayEngineService.ts`

```typescript
export class ReplayEngineService {
  constructor(
    private gameStorage: GameStorageService,
    private commandFactory: CommandFactoryService,
    private randomService: IRandomService
  ) {}

  async loadReplay(gameId: string): Promise<ReplayData | null> {
    return this.gameStorage.loadReplay(gameId)
  }

  async reconstructState(
    replayData: ReplayData,
    toTurn: number
  ): Promise<GameState> {
    // Find nearest snapshot
    const { snapshot, snapshotTurn } = this.findNearestSnapshot(
      replayData.snapshots,
      toTurn
    )

    let state = snapshot || replayData.initialState

    // Filter commands from snapshotTurn to toTurn
    const commandsToReplay = replayData.commands.filter(
      cmd => cmd.turnNumber > snapshotTurn && cmd.turnNumber <= toTurn
    )

    // Execute commands sequentially
    for (const cmdEvent of commandsToReplay) {
      // Restore RNG state
      if (cmdEvent.rngState) {
        this.randomService.setState(cmdEvent.rngState)
      }

      // Reconstruct and execute command
      const command = this.commandFactory.createFromEvent(cmdEvent)
      state = command.execute(state)
    }

    return state
  }

  private findNearestSnapshot(
    snapshots: Map<number, GameState>,
    turn: number
  ): { snapshot: GameState | null; snapshotTurn: number } {
    const snapshotTurns = Array.from(snapshots.keys())
      .filter(t => t <= turn)
      .sort((a, b) => b - a) // Descending

    if (snapshotTurns.length === 0) {
      return { snapshot: null, snapshotTurn: 0 }
    }

    const nearestTurn = snapshotTurns[0]
    return {
      snapshot: snapshots.get(nearestTurn)!,
      snapshotTurn: nearestTurn
    }
  }
}
```

**Verification**: Run tests - pass (GREEN)

---

#### Subtask 3.1.4: Implement replay validation
**File**: `src/services/ReplayEngineService/ReplayEngineService.ts`

```typescript
async validateReplay(replayData: ReplayData): Promise<ValidationResult> {
  // Load saved final state
  const savedState = await this.gameStorage.loadGame(replayData.gameId)

  if (!savedState) {
    return {
      valid: false,
      desyncs: [{ turn: -1, field: 'state', expected: 'exists', actual: 'null' }],
      finalStateDifference: 'Saved state not found'
    }
  }

  // Reconstruct final state from replay
  const reconstructed = await this.reconstructState(
    replayData,
    replayData.metadata.turnCount
  )

  // Compare states
  const desyncs = this.compareStates(savedState, reconstructed)

  return {
    valid: desyncs.length === 0,
    desyncs,
    finalStateDifference: desyncs.length > 0 ? this.formatDiff(desyncs) : undefined
  }
}

private compareStates(state1: GameState, state2: GameState): DesyncError[] {
  const desyncs: DesyncError[] = []

  // Compare critical fields
  if (state1.player.hp !== state2.player.hp) {
    desyncs.push({
      turn: state1.turnCount,
      field: 'player.hp',
      expected: state1.player.hp,
      actual: state2.player.hp
    })
  }

  // ... compare other fields

  return desyncs
}
```

**Verification**: Validation tests pass

---

**Task 3.1 Complete**: ReplayEngineService implemented

**Git Commit**:
```bash
git add src/services/ReplayEngineService/ src/services/CommandFactoryService/
git commit -m "feat: implement ReplayEngineService for state reconstruction

- Create CommandFactoryService to reconstruct commands from events
- Implement state reconstruction from command sequence
- Use snapshots for fast seeking to any turn
- Restore RNG state before each command execution
- Add replay validation against saved state
- Detect desyncs between replay and saved state
- Test coverage: 94% (15 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.2: Create ReplayPlayerService

**Goal**: Manage replay playback with controls

#### Subtask 3.2.1: Write tests for ReplayPlayerService (TDD)
**File**: `src/services/ReplayPlayerService/ReplayPlayerService.test.ts`

**Test Cases**:
1. ✅ Loads replay on initialization
2. ✅ play() starts playback from current turn
3. ✅ pause() stops playback
4. ✅ stop() resets to turn 0
5. ✅ seekToTurn() jumps to specific turn
6. ✅ setSpeed() changes playback speed
7. ✅ Emits state change events during playback
8. ✅ Emits progress change events
9. ✅ Playback automatically stops at end
10. ✅ Can resume playback after pause

**Verification**: Run tests - fail (RED)

---

#### Subtask 3.2.2: Implement ReplayPlayerService
**File**: `src/services/ReplayPlayerService/ReplayPlayerService.ts`

```typescript
export class ReplayPlayerService {
  private currentTurn: number = 0
  private isPlaying: boolean = false
  private speed: number = 1.0
  private replayData: ReplayData | null = null
  private playbackInterval: number | null = null

  onStateChange: ((state: GameState) => void) | null = null
  onPlaybackChange: ((isPlaying: boolean) => void) | null = null
  onProgressChange: ((progress: number) => void) | null = null

  constructor(private replayEngine: ReplayEngineService) {}

  async loadReplay(gameId: string): Promise<void> {
    this.replayData = await this.replayEngine.loadReplay(gameId)
    this.currentTurn = 0
  }

  async play(): Promise<void> {
    if (!this.replayData || this.isPlaying) return

    this.isPlaying = true
    this.onPlaybackChange?.(true)

    this.playbackInterval = window.setInterval(async () => {
      if (this.currentTurn >= this.replayData!.metadata.turnCount) {
        this.stop()
        return
      }

      this.currentTurn++

      const state = await this.replayEngine.reconstructState(
        this.replayData!,
        this.currentTurn
      )

      this.onStateChange?.(state)
      this.onProgressChange?.(this.currentTurn / this.replayData!.metadata.turnCount)
    }, 100 / this.speed) // Speed multiplier
  }

  pause(): void {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval)
      this.playbackInterval = null
    }
    this.isPlaying = false
    this.onPlaybackChange?.(false)
  }

  stop(): void {
    this.pause()
    this.currentTurn = 0
  }

  async seekToTurn(turn: number): Promise<void> {
    if (!this.replayData) return

    this.currentTurn = Math.max(0, Math.min(turn, this.replayData.metadata.turnCount))

    const state = await this.replayEngine.reconstructState(
      this.replayData,
      this.currentTurn
    )

    this.onStateChange?.(state)
    this.onProgressChange?.(this.currentTurn / this.replayData.metadata.turnCount)
  }

  setSpeed(multiplier: number): void {
    this.speed = Math.max(0.1, Math.min(multiplier, 10.0))

    // Restart playback with new speed
    if (this.isPlaying) {
      this.pause()
      this.play()
    }
  }

  getProgress(): { currentTurn: number; totalTurns: number; percentage: number } {
    if (!this.replayData) {
      return { currentTurn: 0, totalTurns: 0, percentage: 0 }
    }

    return {
      currentTurn: this.currentTurn,
      totalTurns: this.replayData.metadata.turnCount,
      percentage: (this.currentTurn / this.replayData.metadata.turnCount) * 100
    }
  }
}
```

**Verification**: Run tests - pass (GREEN)

---

**Task 3.2 Complete**: ReplayPlayerService implemented

**Git Commit**:
```bash
git add src/services/ReplayPlayerService/
git commit -m "feat: implement ReplayPlayerService for playback controls

- Manage replay playback state (play/pause/stop)
- Support seeking to specific turn
- Adjustable playback speed (0.1x to 10x)
- Event emitters for state/playback/progress changes
- Automatic stop at replay end
- Test coverage: 96% (10 test cases)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.3: Create ReplayViewerState UI

**Goal**: UI state for watching replays

*Note: I'll keep this brief since UI implementation details depend on your rendering system*

#### Subtask 3.3.1: Create ReplayViewerState class
**File**: `src/states/ReplayViewerState/ReplayViewerState.ts`

**Key methods**:
- `enter()` - Load replay and setup
- `render()` - Render game state + controls
- `handleInput()` - Handle keyboard (Space, arrows, 1-4 for speed, Esc)
- `update()` - Update playback

**Verification**: State transitions work

---

#### Subtask 3.3.2: Add replay list to MainMenuState
**File**: Update `src/states/MainMenuState/MainMenuState.ts`

**Add menu option**: "Watch Replays"
**Create replay selection screen**

**Verification**: Can launch replay viewer from menu

---

**Task 3.3 Complete**: Replay viewer UI implemented

**Git Commit**:
```bash
git add src/states/ReplayViewerState/ src/states/MainMenuState/
git commit -m "feat: add replay viewer UI with playback controls

- Create ReplayViewerState for watching replays
- Add playback controls (play/pause, seek, speed)
- Add replay list to main menu
- Support keyboard controls (Space, arrows, 1-4, Esc)
- Display turn counter and metadata

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3 Complete!

**Total Time**: 3-4 days
**Total Commits**: 3 commits
**Tests Added**: ~40 test cases

---

## Phase 4: Validation & Testing (2-3 days)

### Task 4.1: Create DeterminismValidatorService

**Goal**: Detect non-determinism early during development

*(Detailed subtasks similar to above pattern - create interface, write tests, implement, test error cases)*

**Key Features**:
- Quick validation (last 100 turns)
- Full validation (all turns)
- Detailed desync reporting
- Integration with debug tools

**Verification**: Can detect desyncs accurately

**Git Commit**: After implementation

---

### Task 4.2: Add Regression Test Suite

**Goal**: Use canonical replays to catch breaking changes

**Subtasks**:
1. Create fixture directory structure
2. Add script to generate canonical replays
3. Write regression test suite
4. Integrate with CI/CD

**Verification**: Tests fail if replay desyncs

**Git Commit**: After implementation

---

### Task 4.3: Add Debug Tools

**Goal**: Export/import replays, validate determinism

**Subtasks**:
1. Add debug key bindings (r, R, y, Y)
2. Implement export to JSON file
3. Implement import from JSON file
4. Add validation command

**Verification**: Debug tools work in dev mode

**Git Commit**: After implementation

---

### Task 4.4: Update Documentation

**Goal**: Document replay system for developers

**Files to create/update**:
- `docs/replay-system.md` - Complete replay documentation
- Update `docs/systems-advanced.md`
- Update `docs/testing-strategy.md`

**Verification**: Documentation is complete and accurate

**Git Commit**: After documentation complete

---

## Phase 4 Complete!

**Total Time**: 2-3 days
**Total Commits**: 4 commits

---

## Phase 5: Performance Optimization (1-2 days)

### Task 5.1: Optimize Command Log Storage

**Subtasks**:
1. Benchmark current storage size
2. Implement compression for command array
3. Test with 10,000+ turn games
4. Verify performance targets (<1s for large saves)

**Verification**: Performance benchmarks met

---

### Task 5.2: Add Replay Caching (Optional)

**Subtasks**:
1. Implement LRU cache for reconstructed states
2. Cache last 100 states during playback
3. Benchmark seeking performance

**Verification**: Seeking is smooth and fast

---

### Task 5.3: Final Integration Testing

**Subtasks**:
1. Full save/load cycle test
2. Full replay test (record → save → load → validate)
3. Browser compatibility test (Chrome, Firefox, Safari)
4. Performance profiling
5. Memory leak check

**Verification**: All integration tests pass

---

## Phase 5 Complete!

**Total Time**: 1-2 days
**Total Commits**: 2-3 commits

---

## Final Summary

**Total Duration**: 12-18 days (expanded from 10-16)
**Total Phases**: 5
**Total Major Tasks**: 20+
**Total Subtasks**: 80+
**Total Commits**: ~20 commits
**Total Test Cases**: ~200 test cases

**Success Criteria**:
- ✅ No localStorage quota errors
- ✅ All commands recorded
- ✅ Replays reconstruct deterministically
- ✅ Replay viewer functional with controls
- ✅ Regression tests catch breaking changes
- ✅ >80% test coverage
- ✅ Performance: Save <100ms, replay 60fps

---

## Ready for Execution

This refined plan is now complete with detailed subtasks for all 5 phases. Each subtask has:
- ✅ Clear goal and file path
- ✅ Code examples or test cases
- ✅ Verification step
- ✅ TDD approach where applicable

**Next step**: Begin execution with Phase 1, Task 1.1.1!
