# DownloadService

**Location**: `src/services/DownloadService/DownloadService.ts`
**Dependencies**: None (browser APIs: Blob, URL, document)
**Test Coverage**: Basic download operations

---

## Purpose

Encapsulates browser file download functionality. Wraps Blob, URL, and DOM manipulation APIs to keep browser-specific code out of game logic services.

---

## Public API

### Download Operations

#### `downloadJSON(filename: string, data: any, pretty: boolean = true): void`
Downloads data as JSON file.

**Parameters**:
- `filename` - Name of download file
- `data` - Data to serialize to JSON
- `pretty` - Pretty-print with 2-space indent (default: true)

**Rules**:
- Automatically handles Map/Set serialization (converts to objects/arrays)
- Creates Blob with `application/json` MIME type
- Cleans up blob URL after download

**Example**:
```typescript
const downloadService = new DownloadService()

// Export replay data
downloadService.downloadJSON('replay-game-123.json', replayData)

// Export game state (compact)
downloadService.downloadJSON('save.json', gameState, false)
```

---

#### `downloadText(filename: string, content: string, mimeType: string = 'text/plain'): void`
Downloads text content as file.

**Parameters**:
- `filename` - Name of download file
- `content` - Text content to download
- `mimeType` - MIME type (default: 'text/plain')

**Rules**:
- Creates Blob with specified MIME type
- Triggers browser download dialog
- Cleans up blob URL after download
- Falls back to console log on error

**Example**:
```typescript
// Export game log
downloadService.downloadText('game-log.txt', logMessages.join('\n'))

// Export CSV data
downloadService.downloadText('stats.csv', csvData, 'text/csv')
```

---

#### `downloadBinary(filename: string, data: Uint8Array, mimeType: string): void`
Downloads binary data as file.

**Parameters**:
- `filename` - Name of download file
- `data` - Binary data (Uint8Array)
- `mimeType` - MIME type (e.g., 'application/octet-stream')

**Rules**:
- Creates Blob from binary data
- Triggers browser download dialog
- Cleans up blob URL after download

**Example**:
```typescript
// Export compressed save
const compressedData = new Uint8Array(buffer)
downloadService.downloadBinary('save.dat', compressedData, 'application/octet-stream')
```

---

## Integration Notes

**Used By**:
- Debug commands (export replay, export save)
- LeaderboardState (export leaderboard)
- SaveActionMenuState (export save)

**Usage Pattern**:
```typescript
const downloadService = new DownloadService()

// Export replay
const replay = await replayDebugger.loadReplay(gameId)
if (replay) {
  downloadService.downloadJSON(`replay-${gameId}.json`, replay)
}

// Export leaderboard
const entries = leaderboardStorage.getAllEntries()
downloadService.downloadJSON('leaderboard.json', entries)

// Export game log
const logText = messages.map(m => m.text).join('\n')
downloadService.downloadText('game-log.txt', logText)
```

---

## Testing

**Test Files**:
- `DownloadService.test.ts` - Basic download operations

**Coverage**: Basic (relies on browser APIs, difficult to fully test in Node)

**Note**: Tests mock DOM APIs (document, Blob, URL) for Node environment

---

## Related Services

- [ReplayDebuggerService](./ReplayDebuggerService.md) - Uses for replay export
- [LeaderboardStorageService](./LeaderboardStorageService.md) - Uses for leaderboard export
- [GameStorageService](./GameStorageService.md) - May use for save export

---

## Technical Details

**Map/Set Serialization**:
```typescript
JSON.stringify(data, (_key, value) => {
  if (value instanceof Map) {
    return Object.fromEntries(value)  // Map → object
  }
  if (value instanceof Set) {
    return Array.from(value)  // Set → array
  }
  return value
})
```

**Download Mechanism**:
1. Create Blob from data
2. Create object URL from Blob
3. Create invisible `<a>` element
4. Set href to object URL, download to filename
5. Append to body (browser compatibility)
6. Trigger click
7. Remove from body
8. Revoke object URL (cleanup)

**Error Handling**:
- Catches download errors
- Logs warning to console
- Suggests copying content manually

**MIME Types**:
| Type | MIME | Use Case |
|------|------|----------|
| JSON | `application/json` | Replay data, leaderboard |
| Text | `text/plain` | Game logs, error messages |
| CSV | `text/csv` | Statistics exports |
| Binary | `application/octet-stream` | Compressed saves |

**Browser Compatibility**:
- Blob API: All modern browsers
- URL.createObjectURL: All modern browsers
- download attribute: All modern browsers (IE 10+)
- Gracefully fails if APIs unavailable (logs to console)

**Memory Management**:
- Always revokes object URLs after download
- Prevents memory leaks from abandoned blobs
- Removes DOM elements immediately

**Security Considerations**:
- Uses blob: URLs (not data: URLs) for better CSP compatibility
- No user-provided filenames without sanitization
- MIME type specified explicitly

**UI Layer Exception**:
- This service is allowed to use browser DOM APIs
- Purpose is to encapsulate these APIs
- Keeps game logic services clean

**Future Enhancements**:
- Sanitize filename (remove special characters)
- Progress callback for large downloads
- Cancel download functionality
- Batch download (multiple files as ZIP)
