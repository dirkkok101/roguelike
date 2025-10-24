# LeaderboardStorageService

**Location**: `src/services/LeaderboardStorageService/LeaderboardStorageService.ts`
**Dependencies**: None (browser localStorage API)
**Test Coverage**: Storage operations, quota management, serialization, export/import

---

## Purpose

Persist leaderboard entries to browser localStorage with automatic quota management, duplicate prevention, and import/export functionality. Keeps all victories and top deaths sorted by score.

---

## Public API

### Entry Management

#### `addEntry(entry: LeaderboardEntry): void`
Adds new entry to leaderboard with automatic sorting and cleanup.

**Parameters**:
- `entry` - Leaderboard entry to add

**Rules**:
- Automatically sorts entries by score (descending)
- Triggers auto-cleanup at 400+ entries
- Handles storage quota exceeded errors

**Example**:
```typescript
const service = new LeaderboardStorageService()

const entry: LeaderboardEntry = {
  id: 'game-123',
  characterName: 'Hero',
  score: 5000,
  level: 10,
  isVictory: false,
  turnCount: 500,
  timestamp: Date.now()
}

service.addEntry(entry)
// Entry added, sorted, and persisted to localStorage
```

---

#### `getAllEntries(): LeaderboardEntry[]`
Gets all leaderboard entries sorted by score.

**Returns**:
```typescript
LeaderboardEntry[]  // Sorted by score descending
```

**Example**:
```typescript
const entries = service.getAllEntries()
// entries: [{ score: 10000, ... }, { score: 5000, ... }, ...]
```

---

#### `getEntry(id: string): LeaderboardEntry | null`
Gets specific entry by ID.

**Parameters**:
- `id` - Game/entry ID

**Returns**:
```typescript
LeaderboardEntry | null  // Entry or null if not found
```

**Example**:
```typescript
const entry = service.getEntry('game-123')
// entry: { id: 'game-123', characterName: 'Hero', ... } or null
```

---

#### `deleteEntry(id: string): void`
Deletes entry by ID.

**Parameters**:
- `id` - Game/entry ID to delete

**Example**:
```typescript
service.deleteEntry('game-123')
// Entry removed from leaderboard
```

---

#### `clearAll(): void`
Clears all leaderboard entries.

**Rules**:
- Removes entire leaderboard from localStorage
- Cannot be undone
- Used for factory reset or testing

**Example**:
```typescript
service.clearAll()
// All entries deleted
```

---

#### `getCount(): number`
Gets total entry count.

**Returns**:
```typescript
number  // Total number of entries
```

**Example**:
```typescript
const count = service.getCount()
// count: 42
```

---

### Import/Export

#### `exportToJSON(): string`
Exports leaderboard as formatted JSON string.

**Returns**:
```typescript
string  // JSON-formatted leaderboard (pretty-printed with 2-space indent)
```

**Example**:
```typescript
const json = service.exportToJSON()
// json: '[{\n  "id": "game-1",\n  "characterName": "Hero",\n  ...\n}, ...]'

// Save to file
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
```

---

#### `importFromJSON(json: string): { imported: number; skipped: number }`
Imports leaderboard from JSON string with duplicate detection.

**Parameters**:
- `json` - JSON string (array of LeaderboardEntry objects)

**Returns**:
```typescript
interface ImportResult {
  imported: number  // Count of new entries added
  skipped: number   // Count of duplicate entries skipped
}
```

**Rules**:
- Merges with existing entries (doesn't replace)
- Skips entries with duplicate IDs
- Validates JSON structure (must be array)
- Throws on invalid JSON or format
- Sorts and persists after import

**Example**:
```typescript
const jsonString = '[ ... ]'  // From file upload

try {
  const result = service.importFromJSON(jsonString)
  console.log(`Imported ${result.imported}, skipped ${result.skipped} duplicates`)
} catch (error) {
  console.error('Import failed:', error.message)
}
```

---

## Integration Notes

**Used By**:
- LeaderboardService (high-level leaderboard operations)
- LeaderboardState (UI state for leaderboard screen)
- SaveActionMenuState (may delete individual game saves/entries)

**Usage Pattern**:
```typescript
const storageService = new LeaderboardStorageService()

// Add entry after game ends
const entry: LeaderboardEntry = {
  id: gameId,
  characterName: player.name,
  score: scoreService.calculate(gameState),
  level: gameState.currentLevel,
  isVictory: victoryService.checkVictory(gameState),
  turnCount: gameState.turnCount,
  timestamp: Date.now()
}
storageService.addEntry(entry)

// Display leaderboard
const entries = storageService.getAllEntries()
renderLeaderboard(entries.slice(0, 10))  // Top 10

// Export leaderboard
const json = storageService.exportToJSON()
downloadFile(json, 'leaderboard.json')

// Import leaderboard
const result = storageService.importFromJSON(uploadedJSON)
showToast(`Imported ${result.imported} new entries`)
```

---

## Testing

**Test Files**:
- `storage-operations.test.ts` - Add/get/delete/clear operations
- `quota-management.test.ts` - Auto-cleanup and quota handling
- `serialization.test.ts` - JSON serialization/deserialization
- `export-import.test.ts` - Export and import with duplicate detection

**Coverage**: Comprehensive (all public methods, error handling, quota limits)

---

## Related Services

- [LeaderboardService](./LeaderboardService.md) - High-level leaderboard operations using this service
- [ScoreCalculationService](./ScoreCalculationService.md) - Calculates scores for entries
- [GameStorageService](./GameStorageService.md) - Stores full game saves (separate from leaderboard)

---

## Technical Details

**Storage Key**: `'roguelike_leaderboard'`

**LeaderboardEntry Interface**:
```typescript
interface LeaderboardEntry {
  id: string           // Game ID (unique)
  characterName: string
  score: number        // Calculated score (gold + monsters + depth)
  level: number        // Deepest level reached
  isVictory: boolean   // Won game (retrieved Amulet)?
  turnCount: number    // Total turns played
  timestamp: number    // Unix timestamp (Date.now())
}
```

**Auto-Cleanup Strategy**:
```typescript
// Triggered at 400+ entries
autoCleanup(entries, aggressive = false) {
  1. Keep ALL victories (always preserved)
  2. Keep top 100 deaths (or top 50 if aggressive)
  3. Discard remaining low-score deaths
  4. Sort by score descending
}
```

**Quota Management**:
- **Cleanup threshold**: 400 entries
- **Normal cleanup**: Keep top 100 deaths
- **Aggressive cleanup**: Keep top 50 deaths (on quota error)
- **Retry logic**: Retry with aggressive cleanup on QuotaExceededError

**Storage Size Estimates**:
- Typical entry: ~200 bytes JSON
- 400 entries: ~80KB
- localStorage limit: 5-10MB per origin (browser-dependent)

**Import Deduplication**:
```typescript
// Uses Set for O(1) lookup
const existingIds = new Set(existingEntries.map(e => e.id))
for (const entry of importedEntries) {
  if (existingIds.has(entry.id)) {
    skipped++
  } else {
    imported++
  }
}
```

**Error Handling**:
- **Load failure**: Returns empty array (logs error)
- **QuotaExceededError**: Triggers aggressive cleanup, retries save
- **Import JSON error**: Throws descriptive error
- **Invalid format**: Throws "expected array of entries"

**Browser Compatibility**:
- All modern browsers support localStorage
- 5-10 MB storage limit per origin (browser-dependent)
- Data persists until explicitly cleared

**Performance**:
- Read: O(1) localStorage access + O(n log n) sort
- Write: O(n log n) sort + O(1) localStorage write
- Cleanup: O(n) filter + O(n log n) sort
- Suitable for 100-1000 entries
