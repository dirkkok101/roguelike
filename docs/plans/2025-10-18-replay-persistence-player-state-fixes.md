# Replay Persistence & Player State Fixes Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Fix replay data persistence to IndexedDB and resolve Player state initialization bugs discovered during Playwright testing.

**Architecture:** Event-driven persistence using existing AutoSaveMiddleware trigger points. PlayerFactory ensures consistent initialization. Defensive validation in TurnService catches missing fields early.

**Tech Stack:** TypeScript, Jest, Playwright, IndexedDB, CommandRecorderService

**Context:** Playwright testing revealed:
1. Commands record to CommandRecorderService but never persist to IndexedDB
2. Runtime errors: `Player.energy` and `Player.statusEffects` undefined in some code paths

---

## Task 1: Create PlayerFactory for Consistent Player Initialization

**Goal:** Single source of truth for Player creation with all required fields

**Files:**
- Create: `src/factories/PlayerFactory.ts`
- Create: `src/factories/PlayerFactory.test.ts`
- Create: `src/factories/index.ts`

### Step 1: Write failing test for PlayerFactory

Create `src/factories/PlayerFactory.test.ts`:

```typescript
import { PlayerFactory } from './PlayerFactory'
import { Position } from '@game/core/core'

describe('PlayerFactory', () => {
  describe('create', () => {
    it('should create player with all required fields', () => {
      const position: Position = { x: 10, y: 10 }
      const player = PlayerFactory.create(position)

      // Core stats
      expect(player.position).toEqual(position)
      expect(player.hp).toBe(12)
      expect(player.maxHp).toBe(12)
      expect(player.strength).toBe(16)
      expect(player.maxStrength).toBe(16)
      expect(player.ac).toBe(8)
      expect(player.level).toBe(1)
      expect(player.xp).toBe(0)
      expect(player.gold).toBe(0)
      expect(player.hunger).toBe(1300)

      // Fields that were missing (causing runtime errors)
      expect(player.energy).toBe(0)
      expect(player.statusEffects).toEqual([])
      expect(player.isRunning).toBe(false)
      expect(player.runState).toBeNull()

      // Equipment
      expect(player.equipment).toEqual({
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      })

      // Inventory
      expect(player.inventory).toEqual([])
    })

    it('should use provided position', () => {
      const position: Position = { x: 42, y: 99 }
      const player = PlayerFactory.create(position)

      expect(player.position).toEqual(position)
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test PlayerFactory`
Expected: FAIL - "Cannot find module './PlayerFactory'"

### Step 3: Implement PlayerFactory

Create `src/factories/PlayerFactory.ts`:

```typescript
import { Player, Position } from '@game/core/core'

/**
 * Factory for creating Player objects with all required fields initialized.
 *
 * This is the single source of truth for Player creation to prevent runtime
 * errors from missing fields (energy, statusEffects, etc.)
 *
 * @example
 * const player = PlayerFactory.create({ x: 10, y: 10 })
 */
export class PlayerFactory {
  /**
   * Create a new Player with all required fields properly initialized
   *
   * @param position - Starting position for the player
   * @returns Fully initialized Player object
   */
  static create(position: Position): Player {
    return {
      // Position
      position,

      // Core stats
      hp: 12,
      maxHp: 12,
      strength: 16,
      maxStrength: 16,
      ac: 8,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,

      // Turn system (FIX: These were missing, causing runtime errors)
      energy: 0,
      statusEffects: [],
      isRunning: false,
      runState: null,

      // Equipment
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },

      // Inventory
      inventory: [],
    }
  }
}
```

### Step 4: Create barrel export

Create `src/factories/index.ts`:

```typescript
export { PlayerFactory } from './PlayerFactory'
```

### Step 5: Run tests to verify they pass

Run: `npm test PlayerFactory`
Expected: PASS (2 tests)

### Step 6: Commit

```bash
git add src/factories/
git commit -m "feat: add PlayerFactory for consistent Player initialization

- Single source of truth for Player creation
- Ensures all required fields initialized (energy, statusEffects, etc.)
- Prevents runtime errors from missing Player fields
- 100% test coverage

Fixes runtime errors discovered in Playwright testing where Player.energy
and Player.statusEffects were undefined in some code paths."
```

---

## Task 2: Add CommandRecorderService.persistToIndexedDB() Method

**Goal:** Enable replay data persistence to IndexedDB with proper error handling

**Files:**
- Modify: `src/services/CommandRecorderService/CommandRecorderService.ts`
- Create: `src/services/CommandRecorderService/CommandRecorderService.persistence.test.ts`

### Step 1: Write failing test for persistToIndexedDB

Create `src/services/CommandRecorderService/CommandRecorderService.persistence.test.ts`:

```typescript
import { CommandRecorderService } from './CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'
import { createTestGameState } from '@test-utils/fixtures'
import { MoveCommand } from '@commands/MoveCommand'

describe('CommandRecorderService - Persistence', () => {
  let service: CommandRecorderService
  let mockIndexedDB: jest.Mocked<IndexedDBService>
  let gameState: ReturnType<typeof createTestGameState>

  beforeEach(() => {
    mockIndexedDB = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      query: jest.fn(),
      checkQuota: jest.fn(),
      deleteDatabase: jest.fn(),
      initDatabase: jest.fn(),
      openDatabase: jest.fn(),
    } as any

    service = new CommandRecorderService(mockIndexedDB)
    gameState = createTestGameState()
  })

  describe('persistToIndexedDB', () => {
    it('should persist replay data to IndexedDB', async () => {
      const gameId = 'game-123'
      service.startRecording(gameState, gameId)

      // Record some commands
      service.recordCommand({
        commandType: 'move',
        direction: { x: 1, y: 0 },
        rngState: 'seed-123-0',
        actorType: 'player',
        turnNumber: 1,
        timestamp: Date.now(),
      })

      await service.persistToIndexedDB(gameId)

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        'replays',
        gameId,
        expect.objectContaining({
          gameId,
          commands: expect.arrayContaining([
            expect.objectContaining({
              commandType: 'move',
              actorType: 'player',
            }),
          ]),
          initialState: gameState,
          metadata: expect.objectContaining({
            totalTurns: 1,
            seed: gameState.seed,
          }),
        })
      )
    })

    it('should handle empty command list gracefully', async () => {
      const gameId = 'game-empty'
      service.startRecording(gameState, gameId)

      await service.persistToIndexedDB(gameId)

      // Should warn but not throw
      expect(mockIndexedDB.put).not.toHaveBeenCalled()
    })

    it('should handle IndexedDB errors gracefully', async () => {
      const gameId = 'game-error'
      service.startRecording(gameState, gameId)
      service.recordCommand({
        commandType: 'move',
        direction: { x: 1, y: 0 },
        rngState: 'seed-123',
        actorType: 'player',
        turnNumber: 1,
        timestamp: Date.now(),
      })

      mockIndexedDB.put.mockRejectedValue(new Error('IndexedDB not available'))

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Should not throw
      await expect(service.persistToIndexedDB(gameId)).resolves.not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not persist replay data'),
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })

    it('should not persist if not initialized', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Don't call startRecording
      await service.persistToIndexedDB('game-uninit')

      expect(mockIndexedDB.put).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('not properly initialized')
      )

      consoleErrorSpy.mockRestore()
    })

    it('should include metadata with timestamps', async () => {
      const gameId = 'game-meta'
      const startTime = Date.now()

      service.startRecording(gameState, gameId)
      service.recordCommand({
        commandType: 'move',
        direction: { x: 1, y: 0 },
        rngState: 'seed-123',
        actorType: 'player',
        turnNumber: 1,
        timestamp: startTime,
      })

      await service.persistToIndexedDB(gameId)

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        'replays',
        gameId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            totalTurns: 1,
            seed: gameState.seed,
          }),
        })
      )
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test CommandRecorderService.persistence`
Expected: FAIL - "persistToIndexedDB is not a function"

### Step 3: Implement persistToIndexedDB method

Modify `src/services/CommandRecorderService/CommandRecorderService.ts`:

Add import at top:
```typescript
import { ReplayData } from '@game/replay/replay'
```

Add private field for tracking start time:
```typescript
export class CommandRecorderService {
  private commands: CommandRecord[] = []
  private initialState: GameState | null = null
  private finalState: GameState | null = null
  private startTime: number = 0  // ← ADD THIS

  constructor(private indexedDBService: IndexedDBService) {}
```

Update startRecording to capture start time:
```typescript
startRecording(initialState: GameState, gameId: string): void {
  this.commands = []
  this.initialState = initialState
  this.finalState = null
  this.startTime = Date.now()  // ← ADD THIS
  console.log(`📼 Started recording for game: ${gameId}`)
}
```

Add new method at end of class:
```typescript
/**
 * Persist recorded commands to IndexedDB for replay debugging
 *
 * This is called by:
 * - AutoSaveMiddleware (every 10 turns)
 * - SaveCommand (manual save)
 * - QuitCommand (on quit)
 *
 * Fails gracefully if IndexedDB unavailable (e.g., private browsing)
 */
async persistToIndexedDB(gameId: string): Promise<void> {
  // Guard: No commands to persist
  if (this.commands.length === 0) {
    console.warn('⚠️ No commands to persist (game just started)')
    return
  }

  // Guard: Not properly initialized
  if (!this.initialState) {
    console.error('❌ Cannot persist: CommandRecorder not properly initialized')
    return
  }

  try {
    const replayData: ReplayData = {
      gameId,
      commands: this.commands,
      initialState: this.initialState,
      finalState: this.finalState || this.initialState, // Use initial if no final yet
      metadata: {
        startTime: this.startTime,
        endTime: Date.now(),
        totalTurns: this.commands.length,
        seed: this.initialState.seed,
      },
    }

    await this.indexedDBService.put('replays', gameId, replayData)
    console.log(`💾 Persisted ${this.commands.length} commands for game ${gameId}`)
  } catch (error) {
    // Fail gracefully - replay persistence is non-critical
    console.warn('⚠️ Could not persist replay data (IndexedDB unavailable):', error)
  }
}
```

### Step 4: Run tests to verify they pass

Run: `npm test CommandRecorderService.persistence`
Expected: PASS (5 tests)

### Step 5: Commit

```bash
git add src/services/CommandRecorderService/
git commit -m "feat: add CommandRecorderService.persistToIndexedDB() method

- Persist replay data to IndexedDB for debugging
- Called by autosave, manual save, and quit
- Graceful error handling for IndexedDB unavailability
- Includes metadata (timestamps, turn count, seed)
- Guards against uninitialized state and empty commands
- 100% test coverage

Fixes replay persistence discovered in Playwright testing where commands
were recorded but never saved to IndexedDB."
```

---

## Task 3: Add TurnService Defensive Validation

**Goal:** Catch missing Player fields early with clear error messages

**Files:**
- Modify: `src/services/TurnService/TurnService.ts`
- Create: `src/services/TurnService/TurnService.validation.test.ts`

### Step 1: Write failing tests for validation

Create `src/services/TurnService/TurnService.validation.test.ts`:

```typescript
import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { RingService } from '@services/RingService'
import { createTestPlayer } from '@test-utils/fixtures'

describe('TurnService - Validation', () => {
  let service: TurnService
  let statusEffect: StatusEffectService
  let level: LevelService
  let ring: RingService

  beforeEach(() => {
    statusEffect = new StatusEffectService()
    level = new LevelService()
    ring = new RingService()
    service = new TurnService(statusEffect, level, ring)
  })

  describe('Player validation', () => {
    it('should throw clear error when player.energy is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), energy: undefined as any }

      expect(() => service.consumeEnergy(invalidPlayer, 100))
        .toThrow('Player.energy is undefined - check Player initialization')
    })

    it('should throw clear error when player.statusEffects is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), statusEffects: undefined as any }

      expect(() => service.getPlayerSpeed(invalidPlayer))
        .toThrow('Player.statusEffects is undefined - check Player initialization')
    })

    it('should throw clear error when player.isRunning is undefined', () => {
      const invalidPlayer = { ...createTestPlayer(), isRunning: undefined as any }

      expect(() => service.getPlayerSpeed(invalidPlayer))
        .toThrow('Player.isRunning is undefined - check Player initialization')
    })

    it('should not throw when player is properly initialized', () => {
      const validPlayer = createTestPlayer()

      expect(() => service.consumeEnergy(validPlayer, 100)).not.toThrow()
      expect(() => service.getPlayerSpeed(validPlayer)).not.toThrow()
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test TurnService.validation`
Expected: FAIL - Tests expect errors but none are thrown

### Step 3: Add validation method to TurnService

Modify `src/services/TurnService/TurnService.ts`:

Add private validation method after constructor:

```typescript
export class TurnService {
  constructor(
    private statusEffectService: StatusEffectService,
    private levelService: LevelService,
    private ringService: RingService
  ) {}

  /**
   * Validate Player has all required fields initialized
   *
   * Throws early with clear error message if fields are missing.
   * This catches initialization bugs before they cause cryptic runtime errors.
   *
   * @throws Error with field name and fix suggestion
   */
  private validatePlayer(player: Player): void {
    const missing: string[] = []

    if (player.energy === undefined) missing.push('energy')
    if (!player.statusEffects) missing.push('statusEffects')
    if (player.isRunning === undefined) missing.push('isRunning')

    if (missing.length > 0) {
      throw new Error(
        `Player missing required fields: ${missing.join(', ')}. ` +
        `Check Player initialization in DungeonService or use PlayerFactory.`
      )
    }
  }
```

Add validation calls to methods that use these fields:

In `consumeEnergy` method (near line 137):
```typescript
consumeEnergy(player: Player, cost: number): Player {
  this.validatePlayer(player)  // ← ADD THIS

  return {
    ...player,
    energy: player.energy - cost,
  }
}
```

In `getPlayerSpeed` method (near line 148):
```typescript
getPlayerSpeed(player: Player): number {
  this.validatePlayer(player)  // ← ADD THIS

  let speed = BASE_PLAYER_SPEED

  // Apply status effect modifiers
  if (this.statusEffectService.hasStatusEffect(player, 'haste')) {
    speed *= 2
  }
  // ... rest of method
}
```

In `consumePlayerEnergy` method (near line 199):
```typescript
consumePlayerEnergy(player: Player): Player {
  this.validatePlayer(player)  // ← ADD THIS

  const energyCost = this.getPlayerSpeed(player)
  return this.consumeEnergy(player, energyCost)
}
```

### Step 4: Run tests to verify they pass

Run: `npm test TurnService.validation`
Expected: PASS (4 tests)

### Step 5: Commit

```bash
git add src/services/TurnService/
git commit -m "feat: add defensive validation to TurnService

- Validate Player has required fields (energy, statusEffects, isRunning)
- Throw early with clear error messages pointing to fix
- Called in consumeEnergy, getPlayerSpeed, consumePlayerEnergy
- 100% test coverage

Catches missing Player fields early before they cause cryptic runtime
errors like 'Cannot read properties of undefined (reading energy)'."
```

---

## Task 4: Integrate Replay Persistence with AutoSaveMiddleware

**Goal:** Auto-persist replay data every 10 turns alongside game saves

**Files:**
- Modify: `src/services/AutoSaveMiddleware/AutoSaveMiddleware.ts`
- Create: `src/services/AutoSaveMiddleware/AutoSaveMiddleware.replay-persistence.test.ts`

### Step 1: Write failing integration test

Create `src/services/AutoSaveMiddleware/AutoSaveMiddleware.replay-persistence.test.ts`:

```typescript
import { AutoSaveMiddleware } from './AutoSaveMiddleware'
import { LocalStorageService } from '@services/LocalStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IndexedDBService } from '@services/IndexedDBService'
import { createTestGameState } from '@test-utils/fixtures'

describe('AutoSaveMiddleware - Replay Persistence Integration', () => {
  let middleware: AutoSaveMiddleware
  let mockLocalStorage: jest.Mocked<LocalStorageService>
  let commandRecorder: CommandRecorderService
  let mockIndexedDB: jest.Mocked<IndexedDBService>
  let gameState: ReturnType<typeof createTestGameState>

  beforeEach(() => {
    mockLocalStorage = {
      saveGame: jest.fn().mockResolvedValue(undefined),
    } as any

    mockIndexedDB = {
      put: jest.fn().mockResolvedValue(undefined),
    } as any

    commandRecorder = new CommandRecorderService(mockIndexedDB)
    middleware = new AutoSaveMiddleware(mockLocalStorage, commandRecorder)

    gameState = createTestGameState()
    gameState.gameId = 'test-game-123'
    commandRecorder.startRecording(gameState, gameState.gameId)
  })

  it('should persist replay data when autosave triggers', async () => {
    // Set turn count to trigger autosave
    gameState.turnCount = 10

    // Record some commands
    commandRecorder.recordCommand({
      commandType: 'move',
      direction: { x: 1, y: 0 },
      rngState: 'seed-123',
      actorType: 'player',
      turnNumber: 1,
      timestamp: Date.now(),
    })

    const persistSpy = jest.spyOn(commandRecorder, 'persistToIndexedDB')

    await middleware.afterCommand(gameState)

    expect(mockLocalStorage.saveGame).toHaveBeenCalledWith(gameState)
    expect(persistSpy).toHaveBeenCalledWith('test-game-123')
  })

  it('should not persist replay when autosave does not trigger', async () => {
    gameState.turnCount = 9 // Not a multiple of 10

    const persistSpy = jest.spyOn(commandRecorder, 'persistToIndexedDB')

    await middleware.afterCommand(gameState)

    expect(mockLocalStorage.saveGame).not.toHaveBeenCalled()
    expect(persistSpy).not.toHaveBeenCalled()
  })

  it('should handle replay persistence errors gracefully', async () => {
    gameState.turnCount = 10

    commandRecorder.recordCommand({
      commandType: 'move',
      direction: { x: 1, y: 0 },
      rngState: 'seed-123',
      actorType: 'player',
      turnNumber: 1,
      timestamp: Date.now(),
    })

    mockIndexedDB.put.mockRejectedValue(new Error('IndexedDB error'))
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    // Should not throw even if replay persistence fails
    await expect(middleware.afterCommand(gameState)).resolves.not.toThrow()

    expect(mockLocalStorage.saveGame).toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not persist replay data'),
      expect.any(Error)
    )

    consoleWarnSpy.mockRestore()
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test AutoSaveMiddleware.replay-persistence`
Expected: FAIL - persistToIndexedDB not called

### Step 3: Update AutoSaveMiddleware to accept CommandRecorderService

Modify `src/services/AutoSaveMiddleware/AutoSaveMiddleware.ts`:

Update imports:
```typescript
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'  // ← ADD THIS
```

Update constructor:
```typescript
export class AutoSaveMiddleware {
  constructor(
    private localStorageService: LocalStorageService,
    private commandRecorderService: CommandRecorderService  // ← ADD THIS
  ) {}
```

Update afterCommand method to persist replay data:
```typescript
async afterCommand(state: GameState): Promise<void> {
  const { turnCount } = state

  // Auto-save every 10 turns
  if (turnCount > 0 && turnCount % 10 === 0) {
    await this.localStorageService.saveGame(state)

    // Also persist replay data to IndexedDB
    if (state.gameId) {
      await this.commandRecorderService.persistToIndexedDB(state.gameId)
    }

    console.log(`✅ Auto-saved at turn ${turnCount}`)
  }
}
```

### Step 4: Update AutoSaveMiddleware instantiation in main.ts

Modify `src/main.ts` to pass CommandRecorderService:

Find the AutoSaveMiddleware instantiation (around line 400-500) and update:
```typescript
// Before:
const autoSaveMiddleware = new AutoSaveMiddleware(localStorageService)

// After:
const autoSaveMiddleware = new AutoSaveMiddleware(
  localStorageService,
  commandRecorderService
)
```

### Step 5: Run tests to verify they pass

Run: `npm test AutoSaveMiddleware.replay-persistence`
Expected: PASS (3 tests)

### Step 6: Commit

```bash
git add src/services/AutoSaveMiddleware/ src/main.ts
git commit -m "feat: integrate replay persistence with AutoSaveMiddleware

- AutoSaveMiddleware now accepts CommandRecorderService
- Persist replay data to IndexedDB every 10 turns (alongside game save)
- Graceful error handling if replay persistence fails
- Integration tests verify autosave + replay persistence together
- Updated main.ts to pass commandRecorderService to middleware

Implements automatic replay persistence during normal gameplay."
```

---

## Task 5: Integrate Replay Persistence with SaveCommand

**Goal:** Persist replay data when player manually saves (S key)

**Files:**
- Modify: `src/commands/SaveCommand/SaveCommand.ts`
- Modify: `src/commands/SaveCommand/SaveCommand.test.ts`

### Step 1: Write failing test for replay persistence in SaveCommand

Modify `src/commands/SaveCommand/SaveCommand.test.ts`:

Add new test:
```typescript
it('should persist replay data when saving', async () => {
  const mockCommandRecorder = {
    persistToIndexedDB: jest.fn().mockResolvedValue(undefined),
  } as any

  const command = new SaveCommand(
    mockLocalStorage,
    mockToastNotification,
    mockCommandRecorder,
    jest.fn()
  )

  state.gameId = 'game-save-replay'

  await command.execute(state)

  expect(mockCommandRecorder.persistToIndexedDB).toHaveBeenCalledWith('game-save-replay')
})
```

### Step 2: Run test to verify it fails

Run: `npm test SaveCommand`
Expected: FAIL - SaveCommand constructor doesn't accept CommandRecorderService

### Step 3: Update SaveCommand to accept CommandRecorderService

Modify `src/commands/SaveCommand/SaveCommand.ts`:

Update imports:
```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'
import { ToastNotificationService } from '@services/ToastNotificationService'
import { CommandRecorderService } from '@services/CommandRecorderService'  // ← ADD THIS
```

Update constructor:
```typescript
export class SaveCommand implements ICommand {
  constructor(
    private localStorageService: LocalStorageService,
    private toastNotificationService: ToastNotificationService,
    private commandRecorderService: CommandRecorderService,  // ← ADD THIS
    private onSaveComplete: () => void
  ) {}
```

Update execute method to persist replay:
```typescript
async execute(state: GameState): Promise<GameState> {
  try {
    await this.localStorageService.saveGame(state)

    // Persist replay data to IndexedDB
    if (state.gameId) {
      await this.commandRecorderService.persistToIndexedDB(state.gameId)
    }

    this.toastNotificationService.show('Game saved successfully!', 'success')
    this.onSaveComplete()
  } catch (error) {
    console.error('Failed to save game:', error)
    this.toastNotificationService.show('Failed to save game', 'error')
  }

  return state
}
```

### Step 4: Update SaveCommand instantiation in InputHandler

Modify `src/ui/InputHandler.ts`:

Find SaveCommand instantiation and update:
```typescript
// Around line 800-900
case 'S': // Save
  if (this.modalController.handleInput(event)) return null
  return new SaveCommand(
    this.localStorage,
    this.toastNotification,
    this.commandRecorder,  // ← ADD THIS
    () => this.toastNotification.show('Game saved', 'success')
  )
```

### Step 5: Run tests to verify they pass

Run: `npm test SaveCommand`
Expected: PASS (all tests including new one)

### Step 6: Commit

```bash
git add src/commands/SaveCommand/ src/ui/InputHandler.ts
git commit -m "feat: persist replay data on manual save (S key)

- SaveCommand now accepts CommandRecorderService
- Persist replay to IndexedDB when player manually saves
- Updated InputHandler to pass commandRecorderService
- Test verifies replay persistence on save

Completes manual save integration for replay persistence."
```

---

## Task 6: Integrate Replay Persistence with QuitCommand

**Goal:** Persist replay data before quitting game

**Files:**
- Modify: `src/commands/QuitCommand/QuitCommand.ts`
- Modify: `src/commands/QuitCommand/QuitCommand.test.ts`

### Step 1: Write failing test for replay persistence in QuitCommand

Modify `src/commands/QuitCommand/QuitCommand.test.ts`:

Add new test:
```typescript
it('should persist replay data before quitting', async () => {
  const mockCommandRecorder = {
    persistToIndexedDB: jest.fn().mockResolvedValue(undefined),
  } as any

  const command = new QuitCommand(
    mockLocalStorage,
    mockCommandRecorder,
    mockReturnToMenu
  )

  state.gameId = 'game-quit-replay'

  await command.execute(state)

  expect(mockCommandRecorder.persistToIndexedDB).toHaveBeenCalledWith('game-quit-replay')
  expect(mockReturnToMenu).toHaveBeenCalled()
})
```

### Step 2: Run test to verify it fails

Run: `npm test QuitCommand`
Expected: FAIL - QuitCommand constructor doesn't accept CommandRecorderService

### Step 3: Update QuitCommand to accept CommandRecorderService

Modify `src/commands/QuitCommand/QuitCommand.ts`:

Update imports:
```typescript
import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'  // ← ADD THIS
```

Update constructor:
```typescript
export class QuitCommand implements ICommand {
  constructor(
    private localStorageService: LocalStorageService,
    private commandRecorderService: CommandRecorderService,  // ← ADD THIS
    private onReturnToMenu: () => void
  ) {}
```

Update execute method to persist replay before quitting:
```typescript
async execute(state: GameState): Promise<GameState> {
  try {
    // Persist replay data before quitting
    if (state.gameId) {
      await this.commandRecorderService.persistToIndexedDB(state.gameId)
      console.log('💾 Replay data persisted before quit')
    }

    // Save game state if not game over
    if (!state.isGameOver) {
      await this.localStorageService.saveGame(state)
      console.log('Saving before quit...')
      console.log('✅ Saved successfully, returning to menu')
    }

    this.onReturnToMenu()
  } catch (error) {
    console.error('Error during quit:', error)
    // Still return to menu even if save fails
    this.onReturnToMenu()
  }

  return state
}
```

### Step 4: Update QuitCommand instantiation in InputHandler

Modify `src/ui/InputHandler.ts`:

Find QuitCommand instantiation and update:
```typescript
// Around line 850-950
case 'Q': // Quit
  if (this.modalController.handleInput(event)) return null
  return new QuitCommand(
    this.localStorage,
    this.commandRecorder,  // ← ADD THIS
    this.onReturnToMenu
  )
```

### Step 5: Run tests to verify they pass

Run: `npm test QuitCommand`
Expected: PASS (all tests including new one)

### Step 6: Commit

```bash
git add src/commands/QuitCommand/ src/ui/InputHandler.ts
git commit -m "feat: persist replay data on quit (Q key)

- QuitCommand now accepts CommandRecorderService
- Persist replay to IndexedDB before returning to menu
- Updated InputHandler to pass commandRecorderService
- Test verifies replay persistence on quit

Completes quit integration for replay persistence."
```

---

## Task 7: Replace Ad-Hoc Player Creation with PlayerFactory

**Goal:** Use PlayerFactory everywhere to prevent missing field bugs

**Files:**
- Modify: `src/services/DungeonService/DungeonService.ts`
- Modify: `src/ui/test-helpers/InputHandlerTestHelpers.ts`
- Search and replace any other ad-hoc Player creation

### Step 1: Update DungeonService to use PlayerFactory

Modify `src/services/DungeonService/DungeonService.ts`:

Add import:
```typescript
import { PlayerFactory } from '@factories/PlayerFactory'
```

Find the player creation in `generateNewGame` method (around line 100-150):

Replace:
```typescript
const player: Player = {
  position: playerStart,
  hp: 12,
  maxHp: 12,
  strength: 16,
  maxStrength: 16,
  ac: 8,
  level: 1,
  xp: 0,
  gold: 0,
  hunger: 1300,
  equipment: {
    weapon: null,
    armor: null,
    leftRing: null,
    rightRing: null,
    lightSource: null,
  },
  inventory: [],
}
```

With:
```typescript
const player = PlayerFactory.create(playerStart)
```

### Step 2: Update InputHandlerTestHelpers to use PlayerFactory

Modify `src/ui/test-helpers/InputHandlerTestHelpers.ts`:

Add import:
```typescript
import { PlayerFactory } from '@factories/PlayerFactory'
```

Replace `createTestPlayer` function:
```typescript
export function createTestPlayer(): Player {
  return PlayerFactory.create({ x: 10, y: 10 })
}
```

### Step 3: Search for other ad-hoc Player creation

Run: `grep -r "position.*hp.*maxHp.*strength" src/ --include="*.ts" --exclude-dir=node_modules`

If any other files create Player objects manually, update them to use PlayerFactory.

### Step 4: Run all tests to verify nothing broke

Run: `npm test`
Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/DungeonService/ src/ui/test-helpers/
git commit -m "refactor: use PlayerFactory for all Player creation

- Replace ad-hoc Player object creation with PlayerFactory.create()
- Updated DungeonService.generateNewGame()
- Updated InputHandlerTestHelpers.createTestPlayer()
- Ensures all Player objects have required fields (energy, statusEffects)
- Prevents runtime errors from missing fields

Single source of truth for Player creation."
```

---

## Task 8: Add E2E Playwright Test for Replay Persistence

**Goal:** Verify end-to-end replay persistence in real browser

**Files:**
- Create: `tests/e2e/replay-persistence.spec.ts`
- Create: `tests/e2e/playwright.config.ts` (if doesn't exist)

### Step 1: Install Playwright if needed

Run: `npm install -D @playwright/test`

### Step 2: Create Playwright config

Create `tests/e2e/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Step 3: Create E2E test

Create `tests/e2e/replay-persistence.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Replay Persistence', () => {
  test('should persist replay data to IndexedDB during gameplay', async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:3001')

    // Start new game
    await page.press('body', 'n')
    await page.press('body', 'Enter')

    // Wait for game to initialize
    await page.waitForSelector('text=Welcome to the dungeon')

    // Make 5 moves (turn 0 → turn 10)
    for (let i = 0; i < 5; i++) {
      await page.press('body', 'ArrowRight')
      await page.waitForTimeout(100)
    }

    for (let i = 0; i < 5; i++) {
      await page.press('body', 'ArrowDown')
      await page.waitForTimeout(100)
    }

    // Wait for autosave at turn 10
    await page.waitForTimeout(500)

    // Open debug console
    await page.press('body', '~')

    // Launch replay debugger
    await page.press('body', 'L')

    // Wait for console output
    await page.waitForTimeout(500)

    // Get console messages
    const messages = await page.evaluate(() => {
      return (window as any).consoleMessages || []
    })

    // Verify replay data was found (not "No replay data found")
    const hasReplayData = !messages.some((msg: string) =>
      msg.includes('No replay data found')
    )

    expect(hasReplayData).toBe(true)
  })

  test('should persist replay data on manual save', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Start new game
    await page.press('body', 'n')
    await page.press('body', 'Enter')

    // Make a few moves
    await page.press('body', 'ArrowRight')
    await page.press('body', 'ArrowRight')
    await page.press('body', 'ArrowDown')

    // Manual save (Shift+S)
    await page.press('body', 'S')

    // Wait for save to complete
    await page.waitForTimeout(500)

    // Verify IndexedDB has replay data
    const hasReplayInDB = await page.evaluate(async () => {
      const db = await indexedDB.open('roguelike-replays')
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction(['replays'], 'readonly')
          const store = transaction.objectStore('replays')
          const request = store.getAll()

          request.onsuccess = () => {
            resolve(request.result.length > 0)
          }
        }
      })
    })

    expect(hasReplayInDB).toBe(true)
  })
})
```

### Step 4: Add E2E test script to package.json

Modify `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test tests/e2e/",
    "test:e2e:ui": "playwright test tests/e2e/ --ui"
  }
}
```

### Step 5: Run E2E tests

Run: `npm run test:e2e`
Expected: PASS (2 tests)

### Step 6: Commit

```bash
git add tests/e2e/ package.json
git commit -m "test: add E2E Playwright tests for replay persistence

- Verify replay data persists to IndexedDB during autosave
- Verify replay data persists on manual save
- Test in real browser with real IndexedDB
- Configured Playwright with dev server integration

Provides end-to-end confidence that replay persistence works in production."
```

---

## Task 9: Update Test Helpers to Ensure Proper Initialization

**Goal:** Ensure all test fixtures use properly initialized Players

**Files:**
- Verify: `src/__test-utils__/fixtures.ts`
- Verify: `src/ui/test-helpers/InputHandlerTestHelpers.ts`
- Update any other test utility files

### Step 1: Verify fixtures use PlayerFactory

Check `src/__test-utils__/fixtures.ts`:

If it has a `createTestPlayer` function, update it:
```typescript
import { PlayerFactory } from '@factories/PlayerFactory'

export function createTestPlayer(overrides = {}): Player {
  const player = PlayerFactory.create({ x: 10, y: 10 })
  return { ...player, ...overrides }
}
```

### Step 2: Run all tests to verify fixtures work

Run: `npm test`
Expected: All tests PASS

### Step 3: Commit if changes were needed

```bash
git add src/__test-utils__/
git commit -m "refactor: ensure all test fixtures use PlayerFactory

- Update createTestPlayer to use PlayerFactory.create()
- Ensures test Players have all required fields
- Prevents test failures from missing Player fields"
```

---

## Task 10: Manual Verification & Documentation

**Goal:** Verify fixes work in real browser, update documentation

### Step 1: Start dev server and test manually

Run: `npm run dev`

Open browser to http://localhost:3001

1. Start new game
2. Make 10+ moves to trigger autosave
3. Open debug console (~)
4. Launch replay debugger (Shift+L)
5. Verify replay data loads (no "No replay data found" error)

### Step 2: Update CLAUDE.md if needed

If PlayerFactory or replay persistence are significant patterns, document them in CLAUDE.md:

Add to CLAUDE.md:
```markdown
## Player Initialization

**Always use PlayerFactory** to create Player objects:

```typescript
import { PlayerFactory } from '@factories/PlayerFactory'

const player = PlayerFactory.create({ x: 10, y: 10 })
```

This ensures all required fields (energy, statusEffects, isRunning) are initialized.

## Replay Persistence

Replay data automatically persists to IndexedDB:
- Every 10 turns (via AutoSaveMiddleware)
- On manual save (S key)
- On quit (Q key)

Access with debug commands:
- Shift+L: Launch replay debugger
- Shift+E: Export replay to JSON
```

### Step 3: Final commit

```bash
git add CLAUDE.md
git commit -m "docs: document PlayerFactory and replay persistence patterns

- Document PlayerFactory as single source of truth for Player creation
- Document automatic replay persistence trigger points
- Document debug commands for accessing replays"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] E2E Playwright tests pass (`npm run test:e2e`)
- [ ] Manual browser testing shows replay data persisting
- [ ] No console errors during gameplay
- [ ] Player.energy and Player.statusEffects errors are gone
- [ ] Replay debugger (Shift+L) loads data successfully
- [ ] All commits follow conventional commit format
- [ ] Code follows project patterns (SOLID, DRY, YAGNI)

---

## Success Criteria

✅ **Replay Persistence**: Replay data persists to IndexedDB every 10 turns, on save, and on quit
✅ **Player State**: No more runtime errors for missing Player fields
✅ **E2E Tests**: Playwright tests verify end-to-end replay persistence
✅ **Code Quality**: 100% test coverage for new code, defensive validation in place
✅ **Documentation**: PlayerFactory and replay patterns documented in CLAUDE.md

**Resolves:** Runtime errors discovered during Playwright testing (Player.energy undefined, Player.statusEffects undefined, replay data not persisting)
