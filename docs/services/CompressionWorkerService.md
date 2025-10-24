# CompressionWorkerService

**Location**: `src/services/CompressionWorkerService/CompressionWorkerService.ts`
**Dependencies**: None (browser Web Worker API, lz-string library)
**Test Coverage**: None (uses Web Worker, difficult to test in Node)

---

## Purpose

Wraps compression Web Worker for non-blocking string compression/decompression using LZ-String algorithm. Manages worker lifecycle, request queuing, and provides synchronous fallback for testing.

---

## Public API

### Compression Operations

#### `compress(data: string): Promise<string>`
Compresses string data using Web Worker.

**Parameters**:
- `data` - String to compress

**Returns**:
```typescript
Promise<string>  // Compressed string (LZ-String format)
```

**Rules**:
- Uses Web Worker for non-blocking compression
- Falls back to synchronous compression if worker unavailable
- 30-second timeout to prevent hanging
- Rejects on worker crash or timeout

**Example**:
```typescript
const service = new CompressionWorkerService()

const gameState = JSON.stringify(largeGameState)
const compressed = await service.compress(gameState)
// compressed: LZ-String compressed data (smaller than original)
```

---

#### `decompress(data: string): Promise<string>`
Decompresses LZ-String data using Web Worker.

**Parameters**:
- `data` - Compressed string (LZ-String format)

**Returns**:
```typescript
Promise<string>  // Decompressed original string
```

**Rules**:
- Uses Web Worker for non-blocking decompression
- Falls back to synchronous decompression if worker unavailable
- 30-second timeout to prevent hanging
- Returns empty string on decompression failure

**Example**:
```typescript
const decompressed = await service.decompress(compressedData)
const gameState = JSON.parse(decompressed)
// gameState: Original uncompressed data
```

---

### Worker Management

#### `terminateWorker(): void`
Terminates Web Worker and cleans up resources.

**Rules**:
- Rejects all pending compression/decompression requests
- Clears pending request queue
- Should be called on app shutdown
- Safe to call multiple times

**Example**:
```typescript
// On app shutdown
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
- Compression/decompression still work correctly

**Example**:
```typescript
// In tests
const service = new CompressionWorkerService()
service.enableTestMode()

const compressed = await service.compress('test')  // Synchronous, no worker
```

---

#### `disableTestMode(): void`
Disables test mode and reinitializes worker.

**Rules**:
- Initializes worker if not already running
- Returns to async worker-based compression

**Example**:
```typescript
service.disableTestMode()
// Worker reinitialized for async operations
```

---

## Integration Notes

**Used By**:
- GameStorageService (compress save data before storing)
- SerializationWorkerService (compress serialized game state)
- ReplayDebuggerService (compress replay data)

**Usage Pattern**:
```typescript
const compressionService = new CompressionWorkerService()

// Compress before save
const saveData = JSON.stringify(gameState)
const compressed = await compressionService.compress(saveData)
await indexedDB.put('saves', gameId, { compressed })

// Decompress after load
const record = await indexedDB.get('saves', gameId)
const decompressed = await compressionService.decompress(record.compressed)
const gameState = JSON.parse(decompressed)

// Cleanup on shutdown
window.addEventListener('beforeunload', () => {
  compressionService.terminateWorker()
})
```

---

## Testing

**Test Files**: None (Web Worker requires browser environment)

**Coverage**: Manually tested via integration

**Note**: Test mode allows synchronous testing without worker overhead, but full worker behavior requires browser environment.

---

## Related Services

- [SerializationWorkerService](./SerializationWorkerService.md) - Uses compression for serialized game state
- [GameStorageService](./GameStorageService.md) - Uses compression for save data
- [ReplayDebuggerService](./ReplayDebuggerService.md) - Uses compression for replay data

---

## Technical Details

**Compression Algorithm**: LZ-String
- High compression ratio for text data
- Fast compression/decompression
- Browser-optimized implementation

**Worker Architecture**:
```typescript
// Service creates worker
this.worker = new Worker(
  new URL('../../workers/compressionWorker.ts', import.meta.url),
  { type: 'module' }
)

// Service sends request
this.worker.postMessage({
  type: 'compress' | 'decompress',
  data: string,
  id: string
})

// Worker responds
this.worker.onmessage = (event) => {
  const { id, success, result, error } = event.data
  // Resolve/reject corresponding promise
}
```

**Request Lifecycle**:
1. Service generates unique request ID
2. Creates promise and stores in `pendingRequests` Map
3. Sends request to worker with 30s timeout
4. Worker processes and returns result
5. Service resolves promise and removes from queue

**Error Handling**:
- **Worker crash**: Rejects all pending requests, attempts reinitialize (max 3 attempts)
- **Timeout**: Rejects after 30 seconds to prevent hanging
- **Worker unavailable**: Falls back to synchronous compression (setTimeout for non-blocking)
- **Test mode**: Synchronous operations without worker

**Memory Management**:
- Automatically terminates worker on page unload
- Clears pending request queue on termination
- Prevents memory leaks from abandoned promises

**Browser Compatibility**:
- Requires Web Worker support (all modern browsers)
- Fallback to synchronous compression if workers unavailable
- Test mode for Node.js/Jest environments
