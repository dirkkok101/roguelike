# SerializationWorkerService

**Location**: `src/services/SerializationWorkerService/SerializationWorkerService.ts`
**Dependencies**: None (browser Web Worker API)
**Test Coverage**: None (uses Web Worker, difficult to test in Node)

---

## Purpose

Off-thread JSON serialization using Web Worker to prevent main thread blocking during large game state serialization. Handles Map-to-Array conversions and Set-to-Array transformations for JSON compatibility.

---

## Public API

### Serialization Operations

#### `serialize(state: any, saveVersion: number): Promise<string>`
Serializes game state to JSON string using Web Worker.

**Parameters**:
- `state` - Game state object to serialize
- `saveVersion` - Save format version number

**Returns**:
```typescript
Promise<string>  // JSON-serialized game state
```

**Rules**:
- Uses Web Worker for non-blocking serialization
- Converts Maps to Arrays `[key, value][]`
- Converts Sets to Arrays
- Adds `version` field to serialized output
- 30-second timeout to prevent hanging
- Falls back to synchronous if worker unavailable

**Transformations**:
- `state.levels` (Map) → `[[depth, level], ...]`
- `state.visibleCells` (Set) → `[...cells]`
- `state.identifiedItems` (Set) → `[...items]`
- `state.detectedMonsters` (Set) → `[...monsters]`
- `state.detectedMagicItems` (Set) → `[...items]`
- `state.itemNameMap.potions` (Map) → `[[key, value], ...]`
- Monster `visibleCells` (Set) → Array

**Example**:
```typescript
const service = new SerializationWorkerService()

const jsonString = await service.serialize(gameState, 6)
// jsonString: '{"version":6,"player":{...},"levels":[[1,{...}],[2,{...}]],...}'

// Can now compress and store
const compressed = await compressionService.compress(jsonString)
```

---

### Worker Management

#### `terminateWorker(): void`
Terminates Web Worker and cleans up resources.

**Rules**:
- Rejects all pending serialization requests
- Clears pending request queue
- Should be called on app shutdown
- Safe to call multiple times
- Automatically called on page unload

**Example**:
```typescript
// Cleanup on shutdown
window.addEventListener('beforeunload', () => {
  service.terminateWorker()
})
```

---

### Test Mode

#### `enableTestMode(): void`
Enables synchronous test mode (no worker).

**Rules**:
- Terminates worker if active
- All operations become synchronous
- Used by tests to avoid worker overhead
- Serialization still works correctly

**Example**:
```typescript
// In tests
const service = new SerializationWorkerService()
service.enableTestMode()

const json = await service.serialize(gameState, 6)  // Synchronous, no worker
```

---

#### `disableTestMode(): void`
Disables test mode and reinitializes worker.

**Rules**:
- Initializes worker if not already running
- Returns to async worker-based serialization

**Example**:
```typescript
service.disableTestMode()
// Worker reinitialized for async operations
```

---

## Integration Notes

**Used By**:
- GameStorageService (serialize game state before compression)
- AutoSaveMiddleware (serialize state during autosave)
- DownloadService (serialize for export)

**Usage Pattern**:
```typescript
const serializationService = new SerializationWorkerService()
const compressionService = new CompressionWorkerService()

// Save workflow
const SAVE_VERSION = 6
const jsonString = await serializationService.serialize(gameState, SAVE_VERSION)
const compressed = await compressionService.compress(jsonString)
await indexedDB.put('saves', gameId, { compressed, version: SAVE_VERSION })

// Load workflow (deserialization happens synchronously)
const record = await indexedDB.get('saves', gameId)
const decompressed = await compressionService.decompress(record.compressed)
const gameState = JSON.parse(decompressed)
// Convert arrays back to Maps/Sets manually

// Cleanup on shutdown
window.addEventListener('beforeunload', () => {
  serializationService.terminateWorker()
})
```

---

## Testing

**Test Files**: None (Web Worker requires browser environment)

**Coverage**: Manually tested via integration

**Note**: Test mode allows synchronous testing without worker overhead, but full worker behavior requires browser environment.

---

## Related Services

- [CompressionWorkerService](./CompressionWorkerService.md) - Compresses serialized output
- [GameStorageService](./GameStorageService.md) - Uses serialization for save operations
- [AutoSaveMiddleware](./AutoSaveMiddleware.md) - Uses serialization for autosave
- [DownloadService](./DownloadService.md) - Uses serialization for export

---

## Technical Details

**Serialization Process**:
1. Prepare state (convert Maps/Sets → Arrays)
2. Add version field
3. JSON.stringify() in worker (off main thread)
4. Return JSON string

**Map/Set Transformations**:
```typescript
// Before serialization (in-memory)
state.levels = Map { 1 => {...}, 2 => {...} }
state.visibleCells = Set { 'pos:10:5', 'pos:11:5' }

// After serialization (JSON)
state.levels = [[1, {...}], [2, {...}]]
state.visibleCells = ['pos:10:5', 'pos:11:5']
```

**Why Use Worker?**:
- Large game states (100KB - 1MB+) can block main thread for 50-200ms
- Worker moves serialization off main thread
- Keeps UI responsive during save operations
- Critical for autosave (happens during gameplay)

**Worker Architecture**:
```typescript
// Service creates worker
this.worker = new Worker(
  new URL('../../workers/serializationWorker.ts', import.meta.url),
  { type: 'module' }
)

// Service sends request
this.worker.postMessage({
  type: 'serialize',
  state: gameState,
  saveVersion: 6,
  id: 'req-123'
})

// Worker responds
this.worker.onmessage = (event) => {
  const { id, success, result, error } = event.data
  // Resolve/reject corresponding promise
}
```

**Error Handling**:
- **Worker crash**: Rejects all pending requests, attempts reinitialize (max 3 attempts)
- **Timeout**: Rejects after 30 seconds to prevent hanging
- **Worker unavailable**: Falls back to synchronous serialization (setTimeout for non-blocking)
- **Test mode**: Synchronous operations without worker

**Memory Management**:
- Automatically terminates worker on page unload
- Clears pending request queue on termination
- Prevents memory leaks from abandoned promises

**Synchronous Fallback**:
- Uses `prepareStateForSerializationSync()` method
- Duplicates worker logic (unfortunate but necessary)
- Ensures serialization works even if workers unavailable

**Browser Compatibility**:
- Requires Web Worker support (all modern browsers)
- Fallback to synchronous serialization if workers unavailable
- Test mode for Node.js/Jest environments

**Performance**:
- Typical serialization time: 10-50ms for medium game (off main thread)
- Fallback synchronous: blocks main thread but deferred with setTimeout(0)
- Combined with CompressionWorkerService for full save pipeline
