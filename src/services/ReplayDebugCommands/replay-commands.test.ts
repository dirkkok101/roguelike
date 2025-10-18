import 'fake-indexeddb/auto'
import { ReplayDebugCommands } from './ReplayDebugCommands'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { IndexedDBService } from '@services/IndexedDBService'
import { MockRandom } from '@services/RandomService'
import { CommandFactory } from '@services/CommandFactory'
import { GameState, Player, Level } from '@game/core/core'
import { ReplayData } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('ReplayDebugCommands', () => {
  let commands: ReplayDebugCommands
  let replayDebugger: ReplayDebuggerService
  let stateManager: GameStateManager
  let indexedDB: IndexedDBService
  let mockRandom: MockRandom
  let commandFactory: CommandFactory

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    mockRandom = new MockRandom([50, 30, 70])
    commandFactory = {} as CommandFactory

    replayDebugger = new ReplayDebuggerService(indexedDB, mockRandom, commandFactory)
    stateManager = new GameStateManager()

    commands = new ReplayDebugCommands(replayDebugger, stateManager, indexedDB)
  })

  afterEach(() => {
    indexedDB.close()
  })

  function createTestGameState(): GameState {
    const player: Player = {
      id: 'player-1',
      name: 'Test Hero',
      position: { x: 10, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      ac: 5,
      inventory: [],
      equipment: { weapon: null, armor: null, rings: [], light: null },
      energy: 100,
      statusEffects: [],
      hunger: 1000,
      maxHunger: 2000,
    }

    const level: Level = {
      depth: 1,
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

    return {
      gameId: 'test-game-123',
      characterName: 'Test Hero',
      seed: 'test-seed',
      currentLevel: 1,
      turnCount: 0,
      player,
      levels: new Map([[1, level]]),
      visibleCells: new Set(['10,5']),
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      levelsVisitedWithAmulet: new Set(),
      itemNameMap: { potions: new Map(), scrolls: new Map(), rings: new Map(), wands: new Map() },
      messages: ['Welcome!'],
      maxDepth: 26,
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: { fovMode: 'radius' as const },
    }
  }

  function createTestReplay(): ReplayData {
    const initialState = createTestGameState()

    return {
      gameId: 'test-game-123',
      version: 1,
      initialState,
      seed: 'test-seed',
      commands: [],
      metadata: {
        createdAt: Date.now(),
        turnCount: 0,
        characterName: 'Test Hero',
        currentLevel: 1,
        outcome: 'ongoing',
      },
    }
  }

  describe('exportReplay', () => {
    it('should export replay to console', async () => {
      const replayData = createTestReplay()
      await indexedDB.put('replays', replayData.gameId, replayData)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await commands.exportReplay('test-game-123')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Replay Export'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Hero'))

      consoleSpy.mockRestore()
    })

    it('should handle missing replay data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await commands.exportReplay('nonexistent-game')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No replay data found')
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('handleKey', () => {
    it('should handle "e" key to export replay', async () => {
      const replayData = createTestReplay()
      await indexedDB.put('replays', replayData.gameId, replayData)

      const state = createTestGameState()
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const handled = await commands.handleKey('e', state)

      expect(handled).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Replay Export'))

      consoleSpy.mockRestore()
    })

    it('should return false for unhandled keys', async () => {
      const state = createTestGameState()

      const handled = await commands.handleKey('x', state)

      expect(handled).toBe(false)
    })
  })

  describe('launchReplayForCurrentGame', () => {
    it('should detect missing replay data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await commands.launchReplayForCurrentGame('nonexistent-game')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No replay data found')
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
