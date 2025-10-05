# LocalStorageService

**Location**: `src/services/LocalStorageService/LocalStorageService.ts`
**Dependencies**: None (browser LocalStorage API)
**Test Coverage**: Save/load, serialization, permadeath handling
**Platform**: Browser only

---

## Purpose

Manages **game state persistence** using browser LocalStorage. Handles save/load operations, serialization, and permadeath save deletion.

---

## Public API

### `saveGame(state: GameState): void`
Saves current game state to LocalStorage.

**Storage Keys**:
- Save data: `roguelike_save_${gameId}`
- Continue pointer: `roguelike_continue` (stores most recent gameId)

**Error Handling**: Throws if storage quota exceeded

**Usage**:
```typescript
this.localStorageService.saveGame(state)
// Auto-saves on each turn (via middleware)
```

---

### `loadGame(gameId?: string): GameState | null`
Loads game state from LocalStorage.

**Parameters**:
- `gameId` (optional): Specific save to load
- If omitted, loads most recent save (from continue pointer)

**Returns**: `GameState` if found, `null` if not found or corrupted

**Usage**:
```typescript
const state = service.loadGame()  // Load most recent
const state = service.loadGame('game-123')  // Load specific save
```

---

### `deleteSave(gameId: string): void`
Deletes save file (for permadeath).

**Permadeath Handling**:
- Called when player dies
- Removes save data
- Clears continue pointer if it matches deleted save

**Usage**:
```typescript
if (state.isGameOver && state.deathCause) {
  service.deleteSave(state.gameId)
}
```

---

### `hasSave(gameId?: string): boolean`
Checks if save exists.

**Usage**:
```typescript
if (service.hasSave()) {
  showContinueButton()
}
```

---

### `getContinueGameId(): string | null`
Gets game ID of most recent save.

**Usage**:
```typescript
const continueId = service.getContinueGameId()
if (continueId) {
  const state = service.loadGame(continueId)
}
```

---

### `listSaves(): string[]`
Lists all save game IDs.

**Usage**: Display saved games menu

---

## Serialization

### GameState Serialization

**Challenge**: GameState contains complex structures (Maps, Sets)

**Solution**: Custom serialization with type preservation

**Key Transformations**:
```typescript
// Maps → Arrays of [key, value] pairs
levels: Map<number, Level> → levels: [[1, level1], [2, level2]]

// Sets → Arrays
identifiedItems: Set<string> → identifiedItems: ['HEAL', 'SWORD']
visibleCells: Set<string> → visibleCells: ['5,10', '6,10']
```

**See**: `serializeGameState()` and `deserializeGameState()` methods

---

## Storage Quota

**LocalStorage Limit**: ~5-10 MB per origin (varies by browser)

**GameState Size**: ~500 KB - 2 MB (depends on explored levels)

**Quota Handling**:
- Catch quota errors on save
- Throw descriptive error for UI handling
- Consider implementing save rotation (delete oldest saves)

---

## Auto-Save Strategy

**Current**: Manual save (player presses 'S')

**Recommended** (Phase 6):
- Auto-save on turn increment (via middleware)
- Save on level transition
- Save on major events (level-up, amulet retrieval)

---

## Permadeath Mechanics

**Death Flow**:
```
Player dies
  ↓
isGameOver = true, deathCause set
  ↓
Death screen displays
  ↓
User presses key to exit
  ↓
LocalStorageService.deleteSave(gameId)
  ↓
Save removed (permadeath enforced)
```

**Prevents Save Scumming**: No reloading from last save after death

---

## Related Services

- **Game Loop** - Calls `saveGame()` on turn increment (auto-save)
- **Death Screen** - Calls `deleteSave()` on player death
- **Main Menu** - Calls `hasSave()` and `loadGame()` for continue button

---

## Implementation Reference

See `src/services/LocalStorageService/LocalStorageService.ts` (~150 lines)

---

## Future Enhancements

- **Cloud Sync**: Sync saves across devices (Firebase/AWS)
- **Save Compression**: Reduce storage footprint with LZ compression
- **Save Versioning**: Handle schema migrations across game versions
- **Multiple Save Slots**: Support 3-5 concurrent saves
- **Backup/Export**: Export save as JSON file for backup
