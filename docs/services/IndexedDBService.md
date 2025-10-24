# IndexedDBService

**Location**: `src/services/IndexedDBService/IndexedDBService.ts`
**Dependencies**: None (browser IndexedDB API)
**Test Coverage**: Database initialization, CRUD operations, queries, quota checking

---

## Purpose

Wraps browser IndexedDB API with Promise-based async interface for game save storage. Manages database initialization, schema versioning, CRUD operations, and storage quota checking.

---

## Public API

### Database Initialization

#### `initDatabase(): Promise<IDBDatabase>`
Creates or upgrades database with schema.

**Returns**:
```typescript
Promise<IDBDatabase>  // Initialized database connection
```

**Schema**:
- **Database**: `roguelike_db` (version 2)
- **Object Store**: `saves` (keyPath: `gameId`)
- **Indexes**:
  - `timestamp` - Sort by save time
  - `characterName` - Filter by character
  - `status` - Filter by game status (ongoing/died/won)
  - `score` - Sort by score

**Migration**:
- Version 2 removed deprecated `replays` store (unified storage)

**Example**:
```typescript
const db = await service.initDatabase()
// db.name: 'roguelike_db'
// db.version: 2
// db.objectStoreNames: ['saves']
```

---

#### `openDatabase(): Promise<IDBDatabase>`
Opens database connection, initializing if needed.

**Returns**:
```typescript
Promise<IDBDatabase>  // Database connection (reuses existing if open)
```

**Rules**:
- Reuses existing connection if already open
- Calls `initDatabase()` if not initialized

**Example**:
```typescript
const db = await service.openDatabase()
// Returns cached connection on subsequent calls
```

---

### CRUD Operations

#### `put(storeName: string, key: string, value: any): Promise<void>`
Inserts or updates data in object store.

**Parameters**:
- `storeName` - Object store name (`'saves'`)
- `key` - Primary key (gameId)
- `value` - Data to store (will be merged with `gameId` key)

**Returns**:
```typescript
Promise<void>  // Resolves on success
```

**Rules**:
- Automatically adds `gameId` to value object
- Overwrites existing record with same key
- Creates readwrite transaction

**Example**:
```typescript
await service.put('saves', 'game-123', {
  gameState: { ... },
  metadata: { characterName: 'Hero', turnCount: 42 }
})
// Stored as: { gameId: 'game-123', gameState: {...}, metadata: {...} }
```

---

#### `get(storeName: string, key: string): Promise<any>`
Retrieves data from object store by key.

**Parameters**:
- `storeName` - Object store name
- `key` - Primary key (gameId)

**Returns**:
```typescript
Promise<any>  // Record data or null if not found
```

**Example**:
```typescript
const save = await service.get('saves', 'game-123')
// save: { gameId: 'game-123', gameState: {...}, ... } or null
```

---

#### `delete(storeName: string, key: string): Promise<void>`
Deletes data from object store.

**Parameters**:
- `storeName` - Object store name
- `key` - Primary key (gameId)

**Returns**:
```typescript
Promise<void>  // Resolves on success (even if key didn't exist)
```

**Example**:
```typescript
await service.delete('saves', 'game-123')
// Record removed from database
```

---

#### `getAll(storeName: string): Promise<any[]>`
Retrieves all records from object store.

**Parameters**:
- `storeName` - Object store name

**Returns**:
```typescript
Promise<any[]>  // Array of all records (empty if none)
```

**Example**:
```typescript
const allSaves = await service.getAll('saves')
// allSaves: [{ gameId: 'game-1', ... }, { gameId: 'game-2', ... }]
```

---

### Query Operations

#### `query(storeName: string, indexName: string, query: IDBKeyRange | IDBValidKey): Promise<any[]>`
Queries data using an index.

**Parameters**:
- `storeName` - Object store name
- `indexName` - Index name (`'timestamp'`, `'characterName'`, `'status'`, `'score'`)
- `query` - IDBKeyRange or specific value

**Returns**:
```typescript
Promise<any[]>  // Array of matching records
```

**Example**:
```typescript
// Query by status
const ongoingGames = await service.query('saves', 'status', 'ongoing')

// Query by character name
const heroSaves = await service.query('saves', 'characterName', 'Hero')

// Range query (all saves from last 7 days)
const recent = await service.query(
  'saves',
  'timestamp',
  IDBKeyRange.lowerBound(Date.now() - 7 * 24 * 60 * 60 * 1000)
)
```

---

### Storage Management

#### `checkQuota(): Promise<{ usage: number; quota: number; percentUsed: number }>`
Checks storage quota using Storage API.

**Returns**:
```typescript
interface QuotaInfo {
  usage: number        // Bytes used
  quota: number        // Bytes available
  percentUsed: number  // Percentage (0-100)
}
```

**Rules**:
- Returns zeros if Storage API not available (older browsers)
- Includes all storage (not just IndexedDB)

**Example**:
```typescript
const quota = await service.checkQuota()
// quota: { usage: 5242880, quota: 52428800, percentUsed: 10.0 }

if (quota.percentUsed > 90) {
  console.warn('Storage nearly full!')
}
```

---

#### `close(): void`
Closes database connection.

**Rules**:
- Should be called on app shutdown
- Safe to call multiple times
- Sets internal connection to null

**Example**:
```typescript
service.close()
// Connection closed, next openDatabase() will reinitialize
```

---

#### `deleteDatabase(): Promise<void>`
Deletes entire database (WARNING: destroys all data).

**Returns**:
```typescript
Promise<void>  // Resolves when database deleted
```

**Rules**:
- Closes connection first
- Deletes all object stores and data
- Useful for testing or factory reset

**Example**:
```typescript
await service.deleteDatabase()
// All saves and data permanently deleted
```

---

## Integration Notes

**Used By**:
- GameStorageService (save/load operations)
- LeaderboardStorageService (leaderboard queries)
- ReplayDebuggerService (replay data access)

**Usage Pattern**:
```typescript
const indexedDB = new IndexedDBService()

// Initialize on app startup
await indexedDB.initDatabase()

// Save game
await indexedDB.put('saves', gameId, saveData)

// Load game
const save = await indexedDB.get('saves', gameId)

// Query leaderboard
const topScores = await indexedDB.query(
  'saves',
  'score',
  IDBKeyRange.upperBound(10000)
)

// Cleanup on shutdown
indexedDB.close()
```

---

## Testing

**Test Files**:
- `IndexedDBService.test.ts` - Database initialization, CRUD operations, queries, quota checking

**Coverage**: Comprehensive (database lifecycle, all CRUD operations, error handling)

**Note**: Tests use `fake-indexeddb` for Node.js compatibility

---

## Related Services

- [GameStorageService](./GameStorageService.md) - High-level save/load using IndexedDB
- [LeaderboardStorageService](./LeaderboardStorageService.md) - Leaderboard queries using IndexedDB indexes
- [ReplayDebuggerService](./ReplayDebuggerService.md) - Loads replay data from saves

---

## Technical Details

**Database Schema** (Version 2):
```typescript
{
  name: 'roguelike_db',
  version: 2,
  stores: {
    saves: {
      keyPath: 'gameId',
      indexes: {
        timestamp: { unique: false },
        characterName: { unique: false, keyPath: 'metadata.characterName' },
        status: { unique: false, keyPath: 'metadata.status' },
        score: { unique: false, keyPath: 'metadata.score' }
      }
    }
  }
}
```

**Migration Notes**:
- Version 1→2: Removed `replays` store (unified storage architecture)
- Replay data now embedded in save files under `replayData` field

**Browser Support**:
- All modern browsers support IndexedDB
- Storage API (quota checking) available in Chrome 52+, Firefox 51+, Safari 11.1+
- Gracefully degrades if Storage API unavailable (returns zeros)
