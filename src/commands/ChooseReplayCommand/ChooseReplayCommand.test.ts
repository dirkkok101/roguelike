import 'fake-indexeddb/auto'
import { ChooseReplayCommand } from './ChooseReplayCommand'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { IndexedDBService } from '@services/IndexedDBService'
import { GameState, Player, Level } from '@game/core/core'
import { ReplayData } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('ChooseReplayCommand', () => {
  let command: ChooseReplayCommand
  let replayDebugger: ReplayDebuggerService
  let stateManager: GameStateManager
  let indexedDB: IndexedDBService
  let mockGetAll: jest.SpyInstance
  let mockGet: jest.SpyInstance
  let mockPushState: jest.SpyInstance
  let mockPrompt: jest.SpyInstance
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    replayDebugger = {} as ReplayDebuggerService
    stateManager = new GameStateManager()

    mockGetAll = jest.spyOn(indexedDB, 'getAll')
    mockGet = jest.spyOn(indexedDB, 'get')
    mockPushState = jest.spyOn(stateManager, 'pushState').mockImplementation(() => {})
    mockPrompt = jest.spyOn(window, 'prompt')

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    command = new ChooseReplayCommand(replayDebugger, stateManager, indexedDB)
  })

  afterEach(() => {
    indexedDB.close()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    mockPrompt.mockRestore()
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

  function createTestReplay(gameId: string, characterName: string, turnCount: number): ReplayData {
    const initialState = createTestGameState()
    initialState.gameId = gameId
    initialState.characterName = characterName

    return {
      gameId,
      version: 1,
      initialState,
      seed: 'test-seed',
      commands: [],
      metadata: {
        createdAt: Date.now(),
        turnCount,
        characterName,
        currentLevel: 1,
        outcome: 'ongoing',
      },
    }
  }

  // Helper to create save data with embedded replay (unified storage format)
  function createSaveWithReplay(replayData: ReplayData) {
    return {
      gameId: replayData.gameId,
      gameState: JSON.stringify(replayData.initialState), // Compressed state
      replayData: {
        initialState: replayData.initialState,
        seed: replayData.seed,
        commands: replayData.commands,
      },
      metadata: replayData.metadata,
      version: 6, // Save version with embedded replay data
      timestamp: replayData.metadata.createdAt,
    }
  }

  describe('execute', () => {
    it('should list replays and launch chosen one', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Hero A', 10)
      const replay2 = createTestReplay('game-2', 'Hero B', 20)

      // Mock saves with embedded replay data
      const save1 = createSaveWithReplay(replay1)
      const save2 = createSaveWithReplay(replay2)

      mockGetAll.mockResolvedValue([save1, save2])
      mockPrompt.mockReturnValue('1') // Choose second replay

      const result = await command.execute(gameState)

      // Should load all saves (replays embedded in saves now)
      expect(mockGetAll).toHaveBeenCalledWith('saves')

      // Should display list
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AVAILABLE REPLAYS'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[0] Hero A'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[1] Hero B'))

      // Should prompt for choice
      expect(mockPrompt).toHaveBeenCalledWith(expect.stringContaining('Choose replay number'))

      // Should push state for chosen replay
      expect(mockPushState).toHaveBeenCalledTimes(1)

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle empty replay list', async () => {
      const gameState = createTestGameState()
      mockGetAll.mockResolvedValue([])

      const result = await command.execute(gameState)

      // Should show warning
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No replays found'))

      // Should not prompt
      expect(mockPrompt).not.toHaveBeenCalled()

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle cancelled prompt', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Hero A', 10)
      const save1 = createSaveWithReplay(replay1)

      mockGetAll.mockResolvedValue([save1])
      mockPrompt.mockReturnValue(null) // User cancelled

      const result = await command.execute(gameState)

      // Should show cancelled message
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cancelled'))

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should validate invalid input (non-number)', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Hero A', 10)
      const save1 = createSaveWithReplay(replay1)

      mockGetAll.mockResolvedValue([save1])
      mockPrompt.mockReturnValue('abc') // Invalid input

      const result = await command.execute(gameState)

      // Should show error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid input'))
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"abc" is not a number'))

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should validate out of range index', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Hero A', 10)
      const save1 = createSaveWithReplay(replay1)

      mockGetAll.mockResolvedValue([save1])
      mockPrompt.mockReturnValue('5') // Out of range (only 0 is valid)

      const result = await command.execute(gameState)

      // Should show error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('out of range'))

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle negative index', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Hero A', 10)
      const save1 = createSaveWithReplay(replay1)

      mockGetAll.mockResolvedValue([save1])
      mockPrompt.mockReturnValue('-1') // Negative

      const result = await command.execute(gameState)

      // Should show error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('out of range'))

      // Should not push state
      expect(mockPushState).not.toHaveBeenCalled()

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should handle errors during listing', async () => {
      const gameState = createTestGameState()
      mockGetAll.mockRejectedValue(new Error('Database error'))

      const result = await command.execute(gameState)

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error listing replays'),
        expect.any(Error)
      )

      // Should return unchanged state
      expect(result).toBe(gameState)
    })

    it('should display replay metadata correctly', async () => {
      const gameState = createTestGameState()
      const replay1 = createTestReplay('game-1', 'Legendary Hero', 100)
      replay1.metadata.currentLevel = 5
      replay1.metadata.outcome = 'victory'
      const save1 = createSaveWithReplay(replay1)

      mockGetAll.mockResolvedValue([save1])
      mockPrompt.mockReturnValue(null) // Cancel to exit

      await command.execute(gameState)

      // Should display full metadata (except outcome which is not shown in list)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[0\].*Legendary Hero.*Turn 100.*Level 5/)
      )
    })
  })
})
