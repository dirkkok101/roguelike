import 'fake-indexeddb/auto'
import { GameStorageService } from '@services/GameStorageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { CommandFactory } from '@services/CommandFactory'
import { IndexedDBService } from '@services/IndexedDBService'
import { MockRandom } from '@services/RandomService'
import { GameState, Player, Level } from '@game/core/core'
import { COMMAND_TYPES } from '@game/replay/replay'
import { createTestPlayer } from '@test-helpers'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

/**
 * Integration Tests for Replay System
 *
 * Tests full save/load/replay cycle across GameStorageService,
 * CommandRecorderService, and ReplayDebuggerService.
 *
 * These tests verify that the replay system works end-to-end:
 * - Commands are recorded with RNG state
 * - State is saved to IndexedDB (replay data embedded in saves)
 * - Replay data can be loaded and validated
 * - Determinism is maintained across save/load cycles
 */
describe('Replay System Integration', () => {
  let storageService: GameStorageService
  let replayDebugger: ReplayDebuggerService
  let recorder: CommandRecorderService
  let commandFactory: CommandFactory
  let indexedDB: IndexedDBService
  let mockRandom: MockRandom

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    mockRandom = new MockRandom([50, 30, 70, 20, 80])
    recorder = new CommandRecorderService()
    storageService = new GameStorageService(recorder, indexedDB)
    storageService.enableTestMode()

    // CommandFactory with minimal services (not needed for these tests)
    commandFactory = {} as CommandFactory

    replayDebugger = new ReplayDebuggerService(indexedDB, mockRandom, commandFactory)
  })

  afterEach(async () => {
    const allGames = await storageService.listGames()
    for (const game of allGames) {
      await storageService.deleteSave(game.gameId)
    }
    indexedDB.close()
  })

  function createTestLevel(depth: number): Level {
    return {
      depth,
      tiles: [],
      rooms: [],
      corridors: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      upStairs: { x: 5, y: 5 },
      downStairs: { x: 15, y: 15 },
    }
  }

  function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    return {
      gameId: 'test-replay-integration',
      characterName: 'Test Hero',
      seed: 'test-seed-123',
      currentLevel: 1,
      turnCount: 0,
      player: createTestPlayer({ position: { x: 10, y: 5 }, hp: 50, maxHp: 50 }), // Start at (10,5) with 50 HP for replay tests
      levels: new Map([[1, createTestLevel(1)]]),
      visibleCells: new Set(['10,5']),
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      levelsVisitedWithAmulet: new Set(),
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      messages: ['Welcome, Test Hero!'],
      maxDepth: 26,
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: { fovMode: 'radius' as const },
      ...overrides,
    }
  }

  /**
   * Simulate command recording by manually adding commands to the recorder
   */
  function simulateCommands(state: GameState, count: number): GameState {
    let currentState = state

    for (let i = 0; i < count; i++) {
      // Record a MOVE command
      recorder.recordCommand({
        turnNumber: currentState.turnCount + i,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'east' },
        rngState: mockRandom.getState(),
      })

      // Simulate state change (move player, increment turn)
      currentState = {
        ...currentState,
        turnCount: currentState.turnCount + 1,
        player: {
          ...currentState.player,
          position: { x: currentState.player.position.x + 1, y: currentState.player.position.y },
          hp: Math.max(currentState.player.hp - 1, 1), // Lose 1 HP per turn
        },
      }
    }

    return currentState
  }

  describe('Command Recording', () => {
    it('should record commands via CommandRecorderService', () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      recorder.recordCommand({
        turnNumber: 0,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.REST,
        actorType: 'player',
        payload: {},
        rngState: mockRandom.getState(),
      })

      const log = recorder.getCommandLog()
      expect(log).toHaveLength(1)
      expect(log[0].commandType).toBe('rest')
      expect(log[0].turnNumber).toBe(0)
      expect(log[0].actorType).toBe('player')
      expect(log[0].rngState).toBeDefined()
    })

    it('should record multiple commands sequentially', () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 10)

      const log = recorder.getCommandLog()
      expect(log).toHaveLength(10)
      expect(log[0].commandType).toBe('move')
      expect(finalState.turnCount).toBe(10)
      expect(finalState.player.position.x).toBe(20) // Moved 10 steps east
    })
  })

  describe('Save/Load Cycle', () => {
    it('should save game state and replay data atomically', async () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 10)
      await storageService.saveGame(finalState)

      // Verify save data exists
      const savedGame = await storageService.loadGame(finalState.gameId)
      expect(savedGame).not.toBeNull()
      expect(savedGame!.turnCount).toBe(10)

      // Verify replay data exists
      const replayData = await replayDebugger.loadReplay(finalState.gameId)
      expect(replayData).not.toBeNull()
      expect(replayData!.commands).toHaveLength(10)
    })

    it('should preserve initial state in replay data', async () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 5)
      await storageService.saveGame(finalState)

      const replayData = await replayDebugger.loadReplay(finalState.gameId)

      expect(replayData!.initialState.turnCount).toBe(0)
      expect(replayData!.initialState.player.hp).toBe(50)
      expect(replayData!.initialState.player.position).toEqual({ x: 10, y: 5 })
    })

    it('should save RNG state with each command', async () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 3)
      await storageService.saveGame(finalState)

      const replayData = await replayDebugger.loadReplay(finalState.gameId)

      replayData!.commands.forEach((cmd) => {
        expect(cmd.rngState).toBeDefined()
        expect(typeof cmd.rngState).toBe('string')
      })
    })

    it('should save replay metadata with correct outcome', async () => {
      const state = createTestGameState()
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 10)
      await storageService.saveGame(finalState)

      const replayData = await replayDebugger.loadReplay(finalState.gameId)

      expect(replayData!.metadata.turnCount).toBe(10)
      expect(replayData!.metadata.characterName).toBe('Test Hero')
      expect(replayData!.metadata.currentLevel).toBe(1)
      expect(replayData!.metadata.outcome).toBe('ongoing')
    })
  })

  describe('Large Games', () => {
    it('should handle 100+ command game', async () => {
      const state = createTestGameState({ gameId: 'large-game-test' })
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 100)

      await expect(storageService.saveGame(finalState)).resolves.not.toThrow()

      const replayData = await replayDebugger.loadReplay('large-game-test')
      expect(replayData).not.toBeNull()
      expect(replayData!.commands).toHaveLength(100)
      expect(replayData!.metadata.turnCount).toBe(100)
    })

    it('should handle 1000+ command game', async () => {
      const state = createTestGameState({ gameId: 'very-large-game' })
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 1000)

      await expect(storageService.saveGame(finalState)).resolves.not.toThrow()

      const replayData = await replayDebugger.loadReplay('very-large-game')
      expect(replayData).not.toBeNull()
      expect(replayData!.commands).toHaveLength(1000)
    }, 10000) // 10 second timeout
  })

  describe('Edge Cases', () => {
    it('should handle game with no commands', async () => {
      const state = createTestGameState({ gameId: 'no-commands-test' })
      recorder.setInitialState(state)

      // Save without recording any commands
      await storageService.saveGame(state)

      // Replay data should not exist (no commands recorded)
      const replayData = await replayDebugger.loadReplay('no-commands-test')
      expect(replayData).toBeNull()
    })

    it('should handle multiple save/load cycles', async () => {
      let state = createTestGameState({ gameId: 'multi-cycle-test' })
      recorder.setInitialState(state)

      // First cycle: simulate 5 commands and save
      state = simulateCommands(state, 5)
      await storageService.saveGame(state)

      // Load and continue
      const loaded1 = await storageService.loadGame('multi-cycle-test')
      expect(loaded1).not.toBeNull()

      // Second cycle: simulate 5 more commands
      const state2 = simulateCommands(loaded1!, 5)
      await storageService.saveGame(state2)

      // Verify final replay data (commands accumulate across save/load cycles)
      const replayData = await replayDebugger.loadReplay('multi-cycle-test')
      expect(replayData).not.toBeNull()
      expect(replayData!.commands).toHaveLength(10) // 5 from first cycle + 5 from second cycle
    })

    it('should handle replay version checking', async () => {
      const state = createTestGameState({ gameId: 'version-test' })
      recorder.setInitialState(state)

      const finalState = simulateCommands(state, 5)
      await storageService.saveGame(finalState)

      // Get save data (replay data is now embedded)
      const saveData = await indexedDB.get('saves', 'version-test')
      expect(saveData.replayData).toBeDefined()

      // Modify save version to be incompatible (version check happens at save level now)
      await indexedDB.put('saves', 'version-test', { ...saveData, version: 999 })

      // Should reject incompatible version (loadReplay will fail when save version is wrong)
      const loaded = await replayDebugger.loadReplay('version-test')
      expect(loaded).toBeNull()
    })
  })
})
