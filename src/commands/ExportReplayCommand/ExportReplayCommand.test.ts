import 'fake-indexeddb/auto'
import { ExportReplayCommand } from './ExportReplayCommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { DownloadService } from '@services/DownloadService'
import { GameState, Player, Level } from '@game/core/core'
import { ReplayData } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('ExportReplayCommand', () => {
  let command: ExportReplayCommand
  let replayDebugger: ReplayDebuggerService
  let downloadService: DownloadService
  let mockLoadReplay: jest.SpyInstance
  let mockDownloadJSON: jest.SpyInstance
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    replayDebugger = {} as ReplayDebuggerService
    downloadService = new DownloadService()

    mockLoadReplay = jest.fn()
    replayDebugger.loadReplay = mockLoadReplay

    mockDownloadJSON = jest.spyOn(downloadService, 'downloadJSON').mockImplementation(() => {})

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    command = new ExportReplayCommand(replayDebugger, downloadService)
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
      commands: [
        {
          turnNumber: 1,
          timestamp: Date.now(),
          commandType: 'move',
          actorType: 'player',
          payload: { direction: 'east' },
          rngState: JSON.stringify({ seed: 12345, state: 0 }),
        },
      ],
      metadata: {
        createdAt: Date.now(),
        turnCount: 1,
        characterName: 'Test Hero',
        currentLevel: 1,
        outcome: 'ongoing',
      },
    }
  }

  describe('execute', () => {
    it('should export replay to console and trigger download', async () => {
      const gameState = createTestGameState()
      const replayData = createTestReplay()
      mockLoadReplay.mockResolvedValue(replayData)

      const result = await command.execute(gameState)

      // Should load replay
      expect(mockLoadReplay).toHaveBeenCalledWith('test-game-123')

      // Should log to console
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('REPLAY EXPORT'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Hero'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Turns: 1'))

      // Should trigger download
      expect(mockDownloadJSON).toHaveBeenCalledWith(
        'replay-test-game-123.json',
        replayData
      )

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle missing replay data', async () => {
      const gameState = createTestGameState()
      mockLoadReplay.mockResolvedValue(null)

      const result = await command.execute(gameState)

      // Should show error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No replay data found'))

      // Should not trigger download
      expect(mockDownloadJSON).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle errors during export', async () => {
      const gameState = createTestGameState()
      mockLoadReplay.mockRejectedValue(new Error('Load failed'))

      const result = await command.execute(gameState)

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error exporting replay'),
        expect.any(Error)
      )

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should log replay metadata to console', async () => {
      const gameState = createTestGameState()
      const replayData = createTestReplay()
      replayData.metadata.turnCount = 42
      replayData.commands = new Array(42).fill(replayData.commands[0])
      replayData.metadata.outcome = 'victory'
      mockLoadReplay.mockResolvedValue(replayData)

      await command.execute(gameState)

      // Should display all metadata
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Turns: 42'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Commands: 42'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Outcome: victory'))
    })

    it('should serialize replay data to JSON', async () => {
      const gameState = createTestGameState()
      const replayData = createTestReplay()
      mockLoadReplay.mockResolvedValue(replayData)

      await command.execute(gameState)

      // Should log JSON string
      const jsonCalls = consoleLogSpy.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('"gameId"')
      )
      expect(jsonCalls.length).toBeGreaterThan(0)
    })
  })
})
