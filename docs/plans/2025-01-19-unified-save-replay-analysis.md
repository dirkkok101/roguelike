# Unified Save/Replay Storage - Detailed Analysis

**Created**: 2025-01-19
**Status**: Analysis Complete - Ready for Implementation
**Goal**: Merge replay data into save files for unified storage

---

## Executive Summary

**Problem**: Current architecture uses separate storage for saves and replays, causing:
- After loading a save, replay data is cleared (can't replay loaded games)
- Dual storage increases complexity and potential for inconsistency
- User expects: "Save contains everything, load restores everything"

**Solution**: Embed replay data directly in save files, restore on load.

---

## 1. Current Architecture (Problematic)

### Storage Structure

**Two Separate Object Stores**:
```typescript
IndexedDB: 'roguelike_db'
├── 'saves' object store
│   └── { gameId, gameState (compressed), metadata, version, timestamp }
└── 'replays' object store
    └── { gameId, initialState, seed, commands[], metadata, version }
```

**Save Operation** (`GameStorageService.saveGame()`):
```typescript
// 1. Compress game state
const compressed = compress(state)

// 2. Save to 'saves' store
await indexedDB.put('saves', gameId, { gameState: compressed, ... })

// 3. Save to 'replays' store (separate write)
await indexedDB.put('replays', gameId, { initialState, commands, ... })
```

**Load Operation** (`GameStorageService.loadGame()`):
```typescript
// 1. Load from 'saves' store
const data = await indexedDB.get('saves', gameId)

// 2. Decompress and restore state
const state = deserialize(decompress(data.gameState))

// 3. CLEAR replay data (PROBLEM!)
recorder.clearLog()
recorder.setInitialState(state) // Sets current state as NEW turn 0

// Result: Can only replay from load point forward, not from original turn 0
```

### In-Memory State

**CommandRecorderService** (in memory):
```typescript
{
  initialState: GameState,  // Turn 0
  commands: CommandEvent[], // All commands since turn 0
  currentGameId: string
}
```

**Current Flow**:
1. **New game**: `startRecording(initialState, gameId)` → initialState = turn 0
2. **Play 50 turns**: commands[] grows to 50 entries
3. **Save**: Writes both 'saves' and 'replays' stores
4. **Load**: **CLEARS commands[]**, sets loaded state as new turn 0
5. **Result**: Lost original 50 commands, can only replay from turn 50 forward

---

## 2. Expected Architecture (User's Design)

### Unified Storage Structure

**Single Object Store with Embedded Replay**:
```typescript
IndexedDB: 'roguelike_db'
└── 'saves' object store
    └── {
         gameId: string,
         gameState: string (compressed),    // Current turn snapshot
         replayData: {                       // Embedded replay
           initialState: GameState,          // Turn 0
           seed: string,
           commands: CommandEvent[]          // All commands from 0 to current
         },
         metadata: SaveMetadata,
         version: number,
         timestamp: number
       }
```

**Save Operation** (simplified):
```typescript
// 1. Get replay data from CommandRecorderService
const replayData = {
  initialState: recorder.getInitialState(),
  commands: recorder.getCommandLog(),
  seed: state.seed
}

// 2. Compress game state
const compressed = compress(state)

// 3. Save EVERYTHING to ONE store
await indexedDB.put('saves', gameId, {
  gameId,
  gameState: compressed,
  replayData,  // Embedded, not separate!
  metadata,
  version,
  timestamp
})
```

**Load Operation** (restore everything):
```typescript
// 1. Load from 'saves' store
const data = await indexedDB.get('saves', gameId)

// 2. Decompress and restore game state
const state = deserialize(decompress(data.gameState))

// 3. RESTORE replay data (NEW!)
recorder.clearLog()  // Clear current session
recorder.setInitialState(data.replayData.initialState)  // Original turn 0
recorder.restoreCommandLog(data.replayData.commands)    // All original commands

// Result: Can replay from turn 0 through entire history!
```

### Benefits

✅ **Atomic saves**: One write operation, no inconsistency
✅ **Complete restore**: Load restores game + replay history
✅ **Replay loaded games**: Can debug from turn 0 of any loaded save
✅ **Simpler code**: No dual store coordination
✅ **User expectation**: "Save contains everything"

---

## 3. Gap Analysis

### What Needs to Change

| Component | Current Behavior | Required Change |
|-----------|------------------|-----------------|
| **IndexedDBService** | Two stores: 'saves', 'replays' | Remove 'replays' store (keep saves only) |
| **GameStorageService.saveGame()** | Writes to both stores | Embed replayData in save object |
| **GameStorageService.loadGame()** | Clears replay, sets loaded state as turn 0 | Restore initialState + commands from replayData |
| **CommandRecorderService** | Has `clearLog()`, `setInitialState()` | Add `restoreCommandLog(commands[])` |
| **Save Object Structure** | `{ gameState, metadata }` | Add `replayData: { initialState, seed, commands }` |
| **SAVE_VERSION** | Currently 5 | Bump to 6 (breaking change) |
| **ChooseReplayCommand** | Loads from 'replays' store | Load from 'saves' store, extract replayData |
| **ReplayDebuggerService** | Loads from 'replays' store | Load from 'saves' store, extract replayData |

---

## 4. Files to Modify

### Core Changes (Required)

1. **IndexedDBService.ts**
   - Remove 'replays' object store creation
   - Update DB_VERSION to 2 (migration strategy needed)
   - Add migration to copy existing replays into saves

2. **GameStorageService.ts**
   - Modify `saveGame()`: embed replayData in save object
   - Modify `loadGame()`: restore replay data from embedded structure
   - Update SAVE_VERSION to 6
   - Remove separate `indexedDB.put('replays', ...)` call

3. **CommandRecorderService.ts**
   - Add `restoreCommandLog(commands: CommandEvent[])` method
   - Modify `setInitialState()` to accept optional commands array
   - Add getter for current state (for debugging)

4. **Save Data Types**
   - Update save object interface to include `replayData`
   - Ensure serialization handles nested GameState in replayData

### Secondary Changes (Cleanup)

5. **ChooseReplayCommand.ts**
   - Change from `indexedDB.get('replays', gameId)` to `indexedDB.get('saves', gameId)`
   - Extract `replayData` from save object
   - Update UI to show saves with replay data

6. **ReplayDebuggerService.ts**
   - Change `loadReplay()` to extract from saves instead of replays store
   - Handle saves without replay data (legacy/migration)

7. **ExportReplayCommand.ts**
   - Export replayData from save object instead of separate store

### Testing Updates

8. **GameStorageService.test.ts**
   - Update save/load roundtrip tests
   - Test replay data preservation
   - Test backward compatibility (load old saves without replay data)

9. **Integration tests**
   - Test full save → load → replay → verify determinism flow
   - Test migration from old format

---

## 5. Implementation Plan

### Phase 1: Add restoreCommandLog to CommandRecorderService

**File**: `CommandRecorderService.ts`

```typescript
/**
 * Restore command log from loaded save file
 * Used when loading a game to restore full replay history
 */
restoreCommandLog(commands: CommandEvent[]): void {
  this.commands = [...commands]  // Deep copy
  console.log(`Restored ${commands.length} commands from save`)
}
```

**Why First**: No dependencies, enables next phases

---

### Phase 2: Update Save Object Structure

**File**: `GameStorageService.ts`

Add replayData to save object:

```typescript
interface SaveObject {
  gameId: string
  gameState: string  // compressed
  replayData: {
    initialState: GameState
    seed: string
    commands: CommandEvent[]
  } | null  // null if no recording active
  metadata: SaveMetadata
  version: number  // 6
  timestamp: number
}
```

**Why Second**: Defines new structure before implementing save/load

---

### Phase 3: Modify saveGame() to Embed Replay Data

**File**: `GameStorageService.ts`

```typescript
async saveGame(state: GameState): Promise<void> {
  this.activeSaveCount++
  try {
    // Serialize and compress game state
    const serialized = await this.serializeGameState(state)
    const compressed = await this.compressionWorker.compress(serialized)

    // Get replay data from recorder
    const commands = this.recorder.getCommandLog()
    const initialState = this.recorder.getInitialState()

    // Embed replay data in save object
    let replayData = null
    if (initialState && commands.length > 0) {
      replayData = {
        initialState: initialState,
        seed: state.seed,
        commands: commands
      }
    }

    // Prepare unified save data
    const saveData = {
      gameId: state.gameId,
      gameState: compressed,
      replayData: replayData,  // EMBEDDED!
      metadata: this.extractMetadata(state),
      version: 6,  // BUMPED
      timestamp: Date.now(),
    }

    // Save to ONE store
    await this.indexedDB.put('saves', state.gameId, saveData)

    // Remove separate replay write
    // OLD: await this.indexedDB.put('replays', state.gameId, replayData)

    // Update continue pointer
    await this.setContinueGameId(state.gameId)

    console.log(`Game saved: ${state.gameId} (${commands.length} commands recorded)`)
  } finally {
    this.activeSaveCount--
  }
}
```

**Testing**: Save a game, inspect IndexedDB, verify replayData is embedded

---

### Phase 4: Modify loadGame() to Restore Replay Data

**File**: `GameStorageService.ts`

```typescript
async loadGame(gameId?: string): Promise<GameState | null> {
  try {
    const targetId = gameId || (await this.getContinueGameId())
    if (!targetId) return null

    // Get from IndexedDB
    const data = await this.indexedDB.get('saves', targetId)
    if (!data) return null

    // Check version compatibility
    if (data.version < 6) {
      console.warn(
        `Old save version: v${data.version}. Replay data not available.`
      )
      // Fall through - still load game, just no replay
    }

    // Decompress and deserialize
    const decompressed = await this.compressionWorker.decompress(data.gameState)
    const state = await this.deserializeGameState(decompressed)

    // Validate
    if (!this.isValidSaveState(state)) {
      console.warn(`Save validation failed for ${targetId}`)
      return null
    }

    // RESTORE replay data if available
    if (data.replayData) {
      this.recorder.clearLog()
      this.recorder.setInitialState(data.replayData.initialState)
      this.recorder.restoreCommandLog(data.replayData.commands)
      console.log(
        `Save loaded: ${targetId} (restored ${data.replayData.commands.length} commands from turn 0)`
      )
    } else {
      // No replay data (old save or fresh game)
      this.recorder.clearLog()
      this.recorder.setInitialState(state)
      console.log(`Save loaded: ${targetId} (no replay data, starting fresh recording)`)
    }

    return state
  } catch (error) {
    console.error('Failed to load game:', error)
    return null
  }
}
```

**Testing**:
- Save game with 20 turns
- Load game
- Open replay debugger
- Verify can step back to turn 0

---

### Phase 5: Update IndexedDB Schema (Migration)

**File**: `IndexedDBService.ts`

**Option A: Soft Migration (Recommended)**
- Keep DB_VERSION = 1 (no schema change)
- Keep 'replays' store for backward compatibility
- New saves go to 'saves' only
- Old replays remain accessible via ChooseReplayCommand
- Eventually deprecate 'replays' store

**Option B: Hard Migration (Clean Slate)**
- Bump DB_VERSION to 2
- Delete 'replays' store
- Migrate data: copy replays into saves as replayData
- Complex migration logic, risk of data loss

**Recommendation**: Use Option A initially, plan Option B for future major version

**Implementation (Option A)**:
```typescript
// No changes needed to IndexedDBService for Option A
// Keep both stores, gradually phase out 'replays'
```

---

### Phase 6: Update ChooseReplayCommand

**File**: `ChooseReplayCommand.ts`

```typescript
async execute(state: GameState): Promise<GameState> {
  try {
    // Get all saves (replays are now embedded)
    const saveKeys = await this.indexedDB.getAll('saves')

    // Filter saves that have replay data
    const replays = saveKeys
      .filter(save => save.replayData && save.gameId !== 'continue_pointer')
      .map((save, index) => ({
        index,
        gameId: save.gameId,
        metadata: save.metadata,
        replayData: save.replayData
      }))

    if (replays.length === 0) {
      console.log('⚠️  No replays found')
      return state
    }

    // ... rest of command (choose, launch debugger)
    // Extract replayData from save instead of separate store
  }
}
```

**Testing**: Verify can choose and launch historical replays

---

### Phase 7: Update ReplayDebuggerService

**File**: `ReplayDebuggerService.ts`

```typescript
async loadReplay(gameId: string): Promise<ReplayData | null> {
  try {
    // Load from 'saves' store instead of 'replays'
    const save = await this.indexedDB.get('saves', gameId)

    if (!save) {
      console.error(`Save not found: ${gameId}`)
      return null
    }

    if (!save.replayData) {
      console.error(`No replay data in save: ${gameId}`)
      return null
    }

    // Extract embedded replay data
    return {
      gameId: save.gameId,
      version: save.version,
      initialState: save.replayData.initialState,
      seed: save.replayData.seed,
      commands: save.replayData.commands,
      metadata: save.metadata  // Reuse save metadata
    }
  } catch (error) {
    console.error('Failed to load replay:', error)
    return null
  }
}
```

---

## 6. Risks and Edge Cases

### Risk 1: Backward Compatibility

**Problem**: Old saves (version ≤ 5) don't have replayData

**Mitigation**:
- Check `data.replayData` existence before restoring
- Fall back to old behavior: set loaded state as turn 0
- Log warning: "Old save format, replay from load point only"

**Code**:
```typescript
if (data.version >= 6 && data.replayData) {
  // New path: restore full history
  recorder.restoreCommandLog(data.replayData.commands)
} else {
  // Old path: start recording from loaded state
  recorder.setInitialState(state)
}
```

---

### Risk 2: Save File Size Increase

**Problem**: Embedding replay data increases save file size

**Analysis**:
- **Current**: Game state ~500KB compressed
- **Commands**: ~100 bytes per command × 1000 turns = ~100KB
- **InitialState**: ~500KB (duplicate of turn 0 state)
- **Total**: ~1.1MB vs 500KB (2.2× increase)

**Mitigation**:
- Commands are small (mostly directions, item IDs)
- InitialState compresses well (duplicate of early game state)
- IndexedDB quota: 50% of available disk (~GBs)
- Acceptable trade-off for functionality

**Future Optimization**:
- Delta compression: store diffs instead of full commands
- Remove redundant data from initialState
- Not needed for MVP

---

### Risk 3: Serialization Failures

**Problem**: initialState contains Maps/Sets, needs serialization

**Mitigation**:
- CommandRecorderService already does `JSON.parse(JSON.stringify(state))`
- GameStorageService has `serializeGameState()` for Maps/Sets → Arrays
- Need to serialize replayData.initialState before save
- Deserialize when restoring

**Code**:
```typescript
// In saveGame()
if (initialState) {
  const serializedInitialState = await this.serializeGameState(initialState)
  replayData = {
    initialState: JSON.parse(serializedInitialState),  // Already plain object
    seed: state.seed,
    commands: commands
  }
}

// In loadGame()
if (data.replayData) {
  const deserializedInitialState = this.restoreStateFromSerialization(
    data.replayData.initialState
  )
  recorder.setInitialState(deserializedInitialState)
}
```

---

### Risk 4: Migration Complexity

**Problem**: Moving from dual-store to single-store requires data migration

**Mitigation**: Use **soft migration** (Option A)
- No schema changes
- Keep 'replays' store for old data
- New saves only write to 'saves'
- ChooseReplayCommand checks both stores (fallback)

**Future Hard Migration**:
- Schedule for major version bump
- Tool to convert old saves → new format
- Delete 'replays' store after verification

---

## 7. Testing Strategy

### Unit Tests

**CommandRecorderService**:
```typescript
describe('restoreCommandLog', () => {
  it('should restore commands from array', () => {
    const commands = [/* ... */]
    recorder.restoreCommandLog(commands)
    expect(recorder.getCommandLog()).toEqual(commands)
  })

  it('should clear old commands before restoring', () => {
    recorder.recordCommand(cmd1)
    recorder.restoreCommandLog([cmd2, cmd3])
    expect(recorder.getCommandLog()).toEqual([cmd2, cmd3])
  })
})
```

**GameStorageService**:
```typescript
describe('save with embedded replay', () => {
  it('should embed replayData in save object', async () => {
    await service.saveGame(state)
    const save = await indexedDB.get('saves', state.gameId)
    expect(save.replayData).toBeDefined()
    expect(save.replayData.initialState).toBeDefined()
    expect(save.replayData.commands).toHaveLength(10)
  })
})

describe('load with replay restoration', () => {
  it('should restore command log on load', async () => {
    // Save with 10 commands
    recorder.startRecording(initialState, gameId)
    for (let i = 0; i < 10; i++) {
      recorder.recordCommand(makeCommand(i))
    }
    await service.saveGame(state)

    // Clear recorder (simulate new session)
    recorder.clearLog()

    // Load
    const loaded = await service.loadGame(gameId)

    // Verify commands restored
    expect(recorder.getCommandLog()).toHaveLength(10)
    expect(recorder.getInitialState()).toEqual(initialState)
  })
})
```

---

### Integration Tests

**Full Save/Load/Replay Cycle**:
```typescript
it('should replay loaded game from turn 0', async () => {
  // 1. Start new game
  const game = createNewGame()
  recorder.startRecording(game.getState(), gameId)

  // 2. Play 20 turns
  for (let i = 0; i < 20; i++) {
    game.executeCommand(makeMoveCommand())
  }
  const stateTurn20 = game.getState()

  // 3. Save
  await storage.saveGame(stateTurn20)

  // 4. Load (simulate new session)
  const loadedState = await storage.loadGame(gameId)
  expect(loadedState.turnCount).toBe(20)

  // 5. Open replay debugger
  const replay = recorder.buildReplayData()
  expect(replay.commands).toHaveLength(20)

  // 6. Replay from turn 0
  const replayDebugger = new ReplayDebuggerService(indexedDB)
  const stateTurn0 = await replayDebugger.reconstructToTurn(replay, 0)
  expect(stateTurn0.turnCount).toBe(0)

  // 7. Replay to turn 10
  const stateTurn10 = await replayDebugger.reconstructToTurn(replay, 10)
  expect(stateTurn10.turnCount).toBe(10)

  // 8. Verify determinism
  const replayedTurn20 = await replayDebugger.reconstructToTurn(replay, 20)
  expect(replayedTurn20).toMatchObject(stateTurn20)
})
```

---

## 8. Implementation Checklist

### Pre-Implementation

- [x] Detailed analysis complete
- [ ] Review with stakeholders
- [ ] Decide on migration strategy (Option A vs B)
- [ ] Create feature branch: `feature/unified-save-replay`

### Phase 1: Foundation (No Breaking Changes)

- [ ] Add `restoreCommandLog()` to CommandRecorderService
- [ ] Add unit tests for restoreCommandLog
- [ ] Commit: "feat: add restoreCommandLog method"

### Phase 2: Save Structure (Backward Compatible)

- [ ] Update SAVE_VERSION to 6
- [ ] Modify saveGame() to embed replayData
- [ ] Keep old replay store writes (dual write for safety)
- [ ] Add tests for embedded replayData
- [ ] Commit: "feat: embed replay data in save files (dual write)"

### Phase 3: Load Restoration (Backward Compatible)

- [ ] Modify loadGame() to check for replayData
- [ ] Restore commands if replayData exists
- [ ] Fall back to old behavior if missing
- [ ] Add tests for restoration
- [ ] Test with old saves (no replayData)
- [ ] Commit: "feat: restore replay data on load"

### Phase 4: Integration Testing

- [ ] Test full save/load/replay cycle
- [ ] Test backward compatibility with v5 saves
- [ ] Test replay debugger with loaded games
- [ ] Manual testing: play → save → load → replay
- [ ] Commit: "test: add integration tests for unified storage"

### Phase 5: Cleanup (Remove Dual Write)

- [ ] Remove `indexedDB.put('replays', ...)` from saveGame
- [ ] Update ChooseReplayCommand to use 'saves' store
- [ ] Update ReplayDebuggerService to use 'saves' store
- [ ] Update ExportReplayCommand
- [ ] Commit: "refactor: remove separate replays store writes"

### Phase 6: Documentation

- [ ] Update CLAUDE.md with new save structure
- [ ] Update architecture docs
- [ ] Add migration guide for developers
- [ ] Commit: "docs: update for unified save/replay storage"

### Phase 7: Release

- [ ] Merge feature branch to main
- [ ] Tag release: v6.0.0 (breaking change: save format)
- [ ] Monitor for issues

---

## 9. Success Criteria

✅ **User can replay loaded games from turn 0**
✅ **Save files are self-contained (no separate replay store)**
✅ **Backward compatible with old saves (graceful fallback)**
✅ **All tests pass (unit + integration)**
✅ **No data loss during migration**
✅ **Documentation updated**

---

## 10. Future Enhancements (Out of Scope)

**After unified storage is working**:

1. **Delta Compression**: Store command diffs instead of full commands
2. **Lazy Loading**: Load replay data on demand, not during game load
3. **Hard Migration Tool**: Batch convert old saves to new format
4. **Replay Pruning**: Option to discard replay data for space savings
5. **Replay Sharing**: Export replay data for sharing with others

---

## Appendix A: Data Structure Comparison

### Current (Problematic)

```typescript
// 'saves' store
{
  gameId: "game-123",
  gameState: "<compressed-json>",
  metadata: { ... },
  version: 5,
  timestamp: 1234567890
}

// 'replays' store (SEPARATE!)
{
  gameId: "game-123",
  initialState: { ... },
  seed: "seed-abc",
  commands: [ ... ],
  metadata: { ... },
  version: 1
}
```

### Expected (Unified)

```typescript
// 'saves' store (EVERYTHING!)
{
  gameId: "game-123",
  gameState: "<compressed-json>",
  replayData: {                    // EMBEDDED
    initialState: { ... },
    seed: "seed-abc",
    commands: [ ... ]
  },
  metadata: { ... },
  version: 6,
  timestamp: 1234567890
}
```

---

## Appendix B: Migration Code Sketch

### Soft Migration (Recommended for MVP)

```typescript
// GameStorageService.loadGame()

// Try new format first
const save = await this.indexedDB.get('saves', gameId)
if (save && save.replayData) {
  // New format - restore from embedded data
  this.recorder.setInitialState(save.replayData.initialState)
  this.recorder.restoreCommandLog(save.replayData.commands)
  return deserialize(save.gameState)
}

// Fallback: try old format
const oldReplay = await this.indexedDB.get('replays', gameId)
if (save && oldReplay) {
  // Old format - restore from separate store
  this.recorder.setInitialState(oldReplay.initialState)
  this.recorder.restoreCommandLog(oldReplay.commands)
  return deserialize(save.gameState)
}

// No replay data available
if (save) {
  this.recorder.setInitialState(deserialize(save.gameState))
  return deserialize(save.gameState)
}

return null
```

---

**End of Analysis**

This analysis provides a complete roadmap for implementing unified save/replay storage. The phased approach minimizes risk while delivering the expected user experience.
