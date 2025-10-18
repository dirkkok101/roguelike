# Replay System

## Overview

The replay system records all player and AI commands during gameplay, enabling:
- **Bug reproduction** for debugging non-determinism issues
- **Deterministic replay** for analysis and testing
- **Validation** of game logic to catch desyncs early

This system uses an **event sourcing** pattern where commands are events that can be replayed to reconstruct any past game state.

---

## Architecture

### Dual Storage Model

The system maintains two IndexedDB object stores:

1. **`saves` store**: Full GameState snapshots
   - Fast loading (no command replay required)
   - Complete game state at save time
   - Used for normal game loading

2. **`replays` store**: Initial state + command log
   - Debugging and analysis
   - Deterministic reconstruction
   - Validation and regression testing

Both stores are updated **atomically** - if either save fails, neither is written.

### Command Recording

Every command records **before execution**:

```typescript
{
  turnNumber: number,        // When command was executed
  timestamp: number,         // Real-world time (for metadata)
  commandType: string,       // 'move', 'attack', 'rest', etc.
  actorType: 'player' | 'monster' | 'system',
  payload: object,           // Command-specific data
  rngState: string           // RNG state BEFORE execution
}
```

**Critical**: RNG state is captured **before** command execution to ensure deterministic replay.

### Replay Reconstruction

To reconstruct state at turn N:

1. Start from `initialState` (turn 0)
2. For each command up to turn N:
   - Restore RNG state from command event
   - Execute command
   - Advance turn counter
3. Result is deterministic (same commands + same RNG = same result)

### Services

**CommandRecorderService**
- Tracks initial state and command log
- Records commands with RNG state
- Clears log on game load
- Used by all commands

**GameStorageService**
- Saves game state and replay data atomically
- Extracts replay metadata (turnCount, outcome)
- Manages IndexedDB transactions

**ReplayDebuggerService**
- Loads replay data from IndexedDB
- Reconstructs state to any turn
- Validates determinism by comparing replayed vs saved state
- Detects desyncs with detailed error reporting

**CommandFactory**
- Reconstructs command instances from events
- Currently supports Phase 1 commands (MOVE, REST, SEARCH, PICKUP, DROP)
- Expandable to all 33 command types

---

## Debug Workflow

### For Claude (AI Assistant)

When a user encounters a bug:

1. **User reports**: "I found a bug at turn 142"
2. **Claude investigates**:
   ```typescript
   // Load replay data
   const replay = await replayDebugger.loadReplay(gameId)

   // Reconstruct state at turn 142
   const stateAtBug = await replayDebugger.reconstructToTurn(replay, 142)

   // Inspect state
   console.log(stateAtBug.player.hp)  // What was HP?
   console.log(stateAtBug.levels.get(1).monsters)  // Monster positions?
   ```

3. **Claude identifies root cause** by:
   - Inspecting state at bug turn
   - Reviewing command sequence leading to bug
   - Checking for non-determinism
   - Proposing fixes

### Automatic Validation (Debug Mode)

In development, `AutoSaveMiddleware` automatically validates determinism after each save:

```typescript
// Every auto-save in debug mode:
if (process.env.NODE_ENV === 'development' && replayDebugger) {
  const result = await replayDebugger.validateDeterminism(replayData, savedState)

  if (!result.valid) {
    console.error('[Replay Validation] NON-DETERMINISM DETECTED')
    result.desyncs.forEach(desync => {
      console.error(`  ${desync.field}: expected ${desync.expected}, got ${desync.actual}`)
    })
  }
}
```

**Benefits**:
- Catches non-determinism bugs early during development
- No manual validation needed
- Fire-and-forget (doesn't block game loop)

### Debug Commands (Future - UI deferred)

Planned debug commands for interactive replay:
- **`r`** - Launch replay debugger for current game
- **`R`** - Choose replay from list
- **`e`** - Export replay to JSON file
- **`v`** - Validate determinism

Replay debug controls:
- **Space** - Play/Pause
- **Arrow Right** - Next turn
- **Arrow Left** - Previous turn
- **`g`** - Jump to turn
- **`v`** - Validate replay
- **Escape** - Exit

---

## Determinism Requirements

### Critical Rules

1. **Always use `IRandomService`** - Never use `Math.random()`
   ```typescript
   // ❌ WRONG - Non-deterministic
   const damage = Math.floor(Math.random() * 10)

   // ✅ CORRECT - Deterministic
   const damage = this.randomService.nextInt(1, 10)
   ```

2. **Capture RNG state before commands**
   ```typescript
   execute(state: GameState): GameState {
     // STEP 1: Record BEFORE execution
     this.recorder.recordCommand({
       ...,
       rngState: this.randomService.getState()  // Current RNG state
     })

     // STEP 2: Execute command (may use RNG)
     const newState = this.service.doSomething(state)
     return newState
   }
   ```

3. **No timing-dependent logic** - Turn-based only
   - Don't use `Date.now()` for game logic (OK for metadata)
   - Don't use `setTimeout`/`setInterval` for gameplay

4. **No browser API randomness** - Use seeded RNG only
   - Don't use `crypto.getRandomValues()`
   - Don't use uncontrolled iteration order

### Common Sources of Non-Determinism

| Issue | Problem | Solution |
|-------|---------|----------|
| `Math.random()` | Different result on replay | Use `IRandomService` |
| `Date.now()` in logic | Time changes between runs | Use turn counter instead |
| Set/Map iteration | Uncontrolled order | Use arrays for critical order |
| Floating-point math | Rounding errors accumulate | Use integers when possible |
| External APIs | Network, browser APIs | Avoid in game logic |

### Validation

**Automatic** (debug mode):
- Validates after every auto-save
- Compares replayed state vs saved state
- Reports field-level desyncs

**Manual**:
- Debug command `v` (when UI is implemented)
- Direct call to `replayDebugger.validateDeterminism()`

**Regression tests**:
- Canonical replays ensure no breaking changes
- Run in CI/CD pipeline

---

## Testing

### Unit Tests

All services have comprehensive unit tests:
- **CommandRecorderService**: 17 tests (command recording, lifecycle)
- **GameStorageService**: 28 tests (dual storage, compression, serialization)
- **ReplayDebuggerService**: 8 tests (load, reconstruct, validate, desyncs)
- **AutoSaveMiddleware**: 14 tests (11 basic + 3 validation)

### Integration Tests

**Location**: `src/__tests__/integration/replay-system.test.ts`

**Coverage** (11 tests):
1. **Command Recording** (2 tests)
   - Single command recording
   - Multiple commands sequentially

2. **Save/Load Cycle** (4 tests)
   - Atomic save of game state and replay data
   - Initial state preservation
   - RNG state preservation
   - Replay metadata extraction

3. **Large Games** (2 tests)
   - 100+ commands
   - 1000+ commands

4. **Edge Cases** (3 tests)
   - Games with no commands
   - Multiple save/load cycles
   - Replay version checking

**Approach**:
- Simulated commands (not full execution)
- Focuses on service integration
- Validates atomic dual-storage model

### Regression Tests (Future - Task 4.3)

**Purpose**: Catch breaking changes via canonical replays

**Workflow**:
1. Play test game to completion (manually or scripted)
2. Export replay to `tests/fixtures/replays/canonical-game-N.json`
3. Add to regression test suite
4. CI runs on every commit

**Example**:
```typescript
it('should replay canonical-game-1 without desyncs', async () => {
  const replayData = loadFixture('canonical-game-1.json')
  const reconstructed = await replayDebugger.reconstructToTurn(
    replayData,
    replayData.metadata.turnCount
  )
  const result = await replayDebugger.validateDeterminism(replayData, reconstructed)

  expect(result.valid).toBe(true)
  expect(result.desyncs).toHaveLength(0)
})
```

---

## Troubleshooting

### "Non-determinism detected"

**Symptom**: Console shows desync errors after auto-save

**Debug steps**:
1. Check console for which field desynced
   ```
   [Replay Validation] player.hp: expected 100, got 95
   ```
2. Trace back to command that modified `player.hp`
3. Check if command uses `Math.random()` instead of `RandomService`
4. Check if RNG state was captured before command execution
5. Look for floating-point accumulation errors

**Common fixes**:
- Replace `Math.random()` with `this.randomService.nextInt()`
- Ensure `recorder.recordCommand()` is called **before** command logic
- Use integer math instead of floating-point when possible

### "Replay version incompatible"

**Symptom**: `Replay version incompatible: found vX, expected vY`

**Cause**: Old replay format from previous version

**Resolution**:
- Old replays cannot be replayed (graceful degradation)
- Game can still be loaded from `saves` store
- New replays will use current version
- Consider migrating replay format if version change is intentional

### "No replay data found"

**Symptom**: `No replay data found for game: <gameId>`

**Causes**:
1. Game was loaded (not started fresh)
   - Recording starts from load point
   - No initial state available
   - Export replay from this point forward

2. No commands recorded yet
   - Player hasn't taken any actions
   - Normal for fresh games

3. Recording disabled
   - CommandRecorderService not injected
   - Check service dependency injection

**Resolution**:
- This is often expected behavior
- Replay data only exists when commands are recorded
- For debugging, ensure commands are being recorded via `recorder.recordCommand()`

### Performance Issues

**Symptom**: Slow save/load times or replay reconstruction

**Benchmarks** (expected performance):
- Save operation: <200ms
- Load operation: <200ms
- Replay reconstruction (100 turns): <100ms
- Handles 1000+ turn games

**Troubleshooting**:
1. Check IndexedDB transaction size
2. Verify compression is working (`enableTestMode()` disables it)
3. Profile command factory performance
4. Consider chunking very large replays (10,000+ commands)

---

## Data Structures

### ReplayData

```typescript
interface ReplayData {
  gameId: string
  version: number                    // Replay format version
  initialState: GameState            // State at turn 0
  seed: string                       // Game seed
  commands: CommandEvent[]           // All commands
  metadata: ReplayMetadata           // Summary info
}
```

### CommandEvent

```typescript
interface CommandEvent {
  turnNumber: number
  timestamp: number
  commandType: string                // From COMMAND_TYPES registry
  actorType: 'player' | 'monster' | 'system'
  payload: Record<string, any>
  rngState: string                   // JSON-serialized RNG state
}
```

### ReplayMetadata

```typescript
interface ReplayMetadata {
  createdAt: number                  // Timestamp
  turnCount: number                  // Total turns
  characterName: string
  currentLevel: number
  outcome?: 'won' | 'died' | 'ongoing'
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  desyncs: DesyncError[]
}

interface DesyncError {
  turn: number
  field: string                      // e.g., "player.hp"
  expected: any
  actual: any
}
```

---

## Implementation Status

**Completed** (67% of plan):
- ✅ Command recording infrastructure
- ✅ Dual storage model (IndexedDB)
- ✅ Replay debugging service
- ✅ Automatic validation in debug mode
- ✅ Integration tests (11 tests, all passing)

**Deferred** (optional for MVP):
- ⏸️ Visual replay UI (Tasks 3.3/3.4)
  - Core replay functionality complete
  - UI not essential for debug workflow
  - Can be added later if needed

**Remaining** (optional):
- ⏸️ Regression tests with canonical fixtures (Task 4.3)
  - Core validation works
  - Would add protection against breaking changes

**Test Results**:
- 265/265 test suites passing
- 3,279/3,279 tests passing
- All core functionality tested and working

---

## Best Practices

### For Command Authors

1. **Always record commands**:
   ```typescript
   this.recorder.recordCommand({
     turnNumber: state.turnCount,
     timestamp: Date.now(),
     commandType: COMMAND_TYPES.YOUR_COMMAND,
     actorType: 'player',
     payload: { yourData: value },
     rngState: this.randomService.getState()
   })
   ```

2. **Record BEFORE execution** (not after)

3. **Use IRandomService** (never Math.random())

4. **Include all command data in payload**:
   - Don't rely on external state
   - Payload should fully describe the command

### For Service Authors

1. **Accept IRandomService** (not concrete RandomService)

2. **Use turn counter** for time-based logic (not Date.now())

3. **Prefer integers** over floating-point when possible

4. **Document non-deterministic behavior** if unavoidable

### For Testers

1. **Enable debug mode** (`NODE_ENV=development`) during development

2. **Check console** for automatic validation results

3. **Create regression tests** for critical game paths

4. **Export replays** when bugs are found (for reproduction)

---

## Future Enhancements

### Visual Replay Debugger (Deferred)

**Goal**: Interactive UI for stepping through replays

**Features** (planned):
- Play/pause/step through replay
- Jump to specific turn
- State inspector panel
- Side-by-side comparison (expected vs actual)

**Implementation** (if needed):
- `ReplayDebugState` (game state for replay UI)
- Debug commands (`r`, `R`, `e`, `v`)
- Keyboard controls for playback

### Command Factory Expansion

**Current**: Supports 5 Phase 1 commands (MOVE, REST, SEARCH, PICKUP, DROP)

**Future**: Expand to all 33 command types
- Phase 2: Combat commands (ATTACK, THROW, ZAP)
- Phase 3: Inventory commands (EQUIP, UNEQUIP, QUAFF, READ)
- Phase 4: System commands (DESCEND, ASCEND, AI commands)

### Performance Optimization

**Ideas**:
- Incremental saves (delta compression)
- Replay streaming for very large games
- Parallel reconstruction for batch validation
- Command log pruning for old games

---

## References

- **Implementation Plan**: `docs/storage-replay-upgrade-plan.md`
- **Session Summaries**: `docs/SESSION_SUMMARY.md`, `docs/SESSION_SUMMARY_2.md`
- **Architecture**: `docs/architecture.md`
- **Testing Strategy**: `docs/testing-strategy.md`

## Related Services

- `CommandRecorderService`: `src/services/CommandRecorderService/`
- `GameStorageService`: `src/services/GameStorageService/`
- `ReplayDebuggerService`: `src/services/ReplayDebuggerService/`
- `CommandFactory`: `src/services/CommandFactory/`
- `AutoSaveMiddleware`: `src/services/AutoSaveMiddleware/`

---

**Last Updated**: 2025-10-18
**Status**: Production-ready (core functionality complete)
**Test Coverage**: 265/265 suites passing, 3,279/3,279 tests passing
