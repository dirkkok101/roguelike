import 'fake-indexeddb/auto'
import { LaunchReplayDebuggerCommand } from './LaunchReplayDebuggerCommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { GameState, Player, Level } from '@game/core/core'
import { ReplayData } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('LaunchReplayDebuggerCommand', () => {
  let command: LaunchReplayDebuggerCommand
  let replayDebugger: ReplayDebuggerService
  let stateManager: GameStateManager
  let mockLoadReplay: jest.SpyInstance
  let mockPushState: jest.SpyInstance
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    replayDebugger = {} as ReplayDebuggerService
    stateManager = new GameStateManager()

    mockLoadReplay = jest.fn()
    replayDebugger.loadReplay = mockLoadReplay

    mockPushState = jest.spyOn(stateManager, 'pushState').mockImplementation(() => {})

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    command = new LaunchReplayDebuggerCommand(replayDebugger, stateManager)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
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
      equipment: { weapon: null, armor: null, light: null },
      energy: 100,
      statusEffects: [],
      hunger: 1000,
      maxHunger: 2000,
    }

    const level: Level = {
      depth: 1,
      tiles: [],
      rooms: [],
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
      turnCount: 5,
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

  describe('execute', () => {
    it('should launch replay debugger when replay exists', async () => {
      const gameState = createTestGameState()
      const replayData = createTestReplay()
      mockLoadReplay.mockResolvedValue(replayData)

      const result = await command.execute(gameState)

      // Should check if replay exists
      expect(mockLoadReplay).toHaveBeenCalledWith('test-game-123')

      // Should push ReplayDebugState onto stack
      expect(mockPushState).toHaveBeenCalledTimes(1)
      expect(mockPushState).toHaveBeenCalledWith(expect.objectContaining({
        // ReplayDebugState instance
      }))

      // Should log success
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Launching replay debugger'),
        expect.any(String)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Replay debugger launched'))

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle missing replay data', async () => {
      const gameState = createTestGameState()
      mockLoadReplay.mockResolvedValue(null)

      const result = await command.execute(gameState)

      // Should show error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No replay data found'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('only available for games started fresh'))

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle errors during launch', async () => {
      const gameState = createTestGameState()
      mockLoadReplay.mockRejectedValue(new Error('Database error'))

      const result = await command.execute(gameState)

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error launching replay debugger'),
        expect.any(Error)
      )

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should use correct gameId from state', async () => {
      const gameState = createTestGameState()
      gameState.gameId = 'custom-game-id-456'
      const replayData = createTestReplay()
      mockLoadReplay.mockResolvedValue(replayData)

      await command.execute(gameState)

      // Should use gameId from state
      expect(mockLoadReplay).toHaveBeenCalledWith('custom-game-id-456')
    })
  })
})
