import 'fake-indexeddb/auto'
import { GameStorageService } from './GameStorageService'
import { GameState } from '@game/core/core'
import { IndexedDBService } from '@services/IndexedDBService'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

// Helper to create minimal test GameState
function createTestGameState(overrides?: Partial<GameState>): GameState {
  const baseState: GameState = {
    gameId: 'test-game-1',
    characterName: 'Test Hero',
    seed: 'test-seed',
    currentLevel: 1,
    turnCount: 0,
    player: {
      id: 'player-1',
      name: 'Test Hero',
      position: { x: 10, y: 5 },
      hp: 100,
      maxHp: 100,
      strength: 16,
      level: 1,
      experience: 0,
      nextLevelExperience: 10,
      gold: 0,
      armorClass: 5,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        rings: [],
        light: null,
      },
      energy: 100,
      statusEffects: [],
      hunger: 1000,
      maxHunger: 2000,
    },
    levels: new Map([
      [
        1,
        {
          depth: 1,
          tiles: [],
          monsters: [],
          items: [],
          rooms: [],
          corridors: [],
          doors: [],
          traps: [],
          upStairs: { x: 5, y: 5 },
          downStairs: { x: 15, y: 15 },
        },
      ],
    ]),
    visibleCells: new Set(['10,5', '11,5', '9,5']),
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
    messages: ['Welcome to the dungeon!'],
    maxDepth: 26,
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
    config: { fovMode: 'radius' as const },
    ...overrides,
  }

  return baseState
}

describe('GameStorageService', () => {
  let service: GameStorageService
  let indexedDB: IndexedDBService

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    service = new GameStorageService(indexedDB)
    service.enableTestMode()
  })

  afterEach(async () => {
    // Clean up: delete all data
    const allGames = await service.listGames()
    for (const game of allGames) {
      await service.deleteSave(game.gameId)
    }

    // Delete continue pointer
    try {
      await indexedDB.delete('saves', 'continue_pointer')
    } catch {
      // Ignore error if not exists
    }

    indexedDB.close()
  })

  describe('Save and Load', () => {
    it('should save and load game state', async () => {
      const state = createTestGameState()

      await service.saveGame(state)
      const loaded = await service.loadGame('test-game-1')

      expect(loaded).not.toBeNull()
      expect(loaded?.gameId).toBe('test-game-1')
      expect(loaded?.player.hp).toBe(100)
      expect(loaded?.currentLevel).toBe(1)
    })

    it('should preserve player data through save/load cycle', async () => {
      const state = createTestGameState({
        player: {
          ...createTestGameState().player,
          hp: 75,
          maxHp: 100,
          gold: 500,
        },
      })

      await service.saveGame(state)
      const loaded = await service.loadGame('test-game-1')

      expect(loaded?.player.hp).toBe(75)
      expect(loaded?.player.maxHp).toBe(100)
      expect(loaded?.player.gold).toBe(500)
    })

    it('should preserve Maps and Sets through save/load cycle', async () => {
      const state = createTestGameState({
        visibleCells: new Set(['10,5', '11,5', '9,5']),
        identifiedItems: new Set(['potion-healing', 'scroll-teleport']),
      })

      await service.saveGame(state)
      const loaded = await service.loadGame('test-game-1')

      expect(loaded?.visibleCells).toBeInstanceOf(Set)
      expect(loaded?.visibleCells.size).toBe(3)
      expect(loaded?.visibleCells.has('10,5')).toBe(true)

      expect(loaded?.identifiedItems).toBeInstanceOf(Set)
      expect(loaded?.identifiedItems.size).toBe(2)
      expect(loaded?.identifiedItems.has('potion-healing')).toBe(true)
    })

    it('should preserve levels Map through save/load cycle', async () => {
      const state = createTestGameState()

      await service.saveGame(state)
      const loaded = await service.loadGame('test-game-1')

      expect(loaded?.levels).toBeInstanceOf(Map)
      expect(loaded?.levels.size).toBe(1)
      expect(loaded?.levels.has(1)).toBe(true)

      const level1 = loaded?.levels.get(1)
      expect(level1?.depth).toBe(1)
    })

    it('should return null for non-existent game', async () => {
      const loaded = await service.loadGame('non-existent')
      expect(loaded).toBeNull()
    })

    it('should reject incompatible save version', async () => {
      const state = createTestGameState()
      await service.saveGame(state)

      // Manually corrupt the version
      const data = await indexedDB.get('saves', 'test-game-1')
      data.version = 999
      await indexedDB.put('saves', 'test-game-1', data)

      const loaded = await service.loadGame('test-game-1')
      expect(loaded).toBeNull()
    })
  })

  describe('Continue Pointer', () => {
    it('should set continue game ID on save', async () => {
      const state = createTestGameState({ gameId: 'game-1' })

      await service.saveGame(state)
      const continueId = await service.getContinueGameId()

      expect(continueId).toBe('game-1')
    })

    it('should load most recent game when no gameId specified', async () => {
      const state1 = createTestGameState({ gameId: 'game-1' })
      const state2 = createTestGameState({ gameId: 'game-2' })

      await service.saveGame(state1)
      await service.saveGame(state2)

      const loaded = await service.loadGame() // No gameId

      expect(loaded?.gameId).toBe('game-2') // Most recent
    })

    it('should update continue pointer on each save', async () => {
      const state1 = createTestGameState({ gameId: 'game-1' })
      const state2 = createTestGameState({ gameId: 'game-2' })

      await service.saveGame(state1)
      expect(await service.getContinueGameId()).toBe('game-1')

      await service.saveGame(state2)
      expect(await service.getContinueGameId()).toBe('game-2')
    })
  })

  describe('Delete Save', () => {
    it('should delete save correctly', async () => {
      const state = createTestGameState()

      await service.saveGame(state)
      expect(await service.hasSave('test-game-1')).toBe(true)

      await service.deleteSave('test-game-1')
      expect(await service.hasSave('test-game-1')).toBe(false)
    })

    it('should clear continue pointer when deleting current game', async () => {
      const state = createTestGameState({ gameId: 'game-1' })

      await service.saveGame(state)
      expect(await service.getContinueGameId()).toBe('game-1')

      await service.deleteSave('game-1')
      expect(await service.getContinueGameId()).toBeNull()
    })

    it('should not clear continue pointer when deleting other game', async () => {
      const state1 = createTestGameState({ gameId: 'game-1' })
      const state2 = createTestGameState({ gameId: 'game-2' })

      await service.saveGame(state1)
      await service.saveGame(state2) // game-2 is now continue pointer

      await service.deleteSave('game-1')
      expect(await service.getContinueGameId()).toBe('game-2')
    })
  })

  describe('List Games', () => {
    it('should list all saved games', async () => {
      const state1 = createTestGameState({
        gameId: 'game-1',
        characterName: 'Hero 1',
      })
      const state2 = createTestGameState({
        gameId: 'game-2',
        characterName: 'Hero 2',
      })

      await service.saveGame(state1)
      await service.saveGame(state2)

      const games = await service.listGames()

      expect(games).toHaveLength(2)
      expect(games.map((g) => g.gameId)).toEqual(
        expect.arrayContaining(['game-1', 'game-2'])
      )
    })

    it('should include metadata in game list', async () => {
      const state = createTestGameState({
        gameId: 'game-1',
        characterName: 'Test Hero',
        currentLevel: 5,
        turnCount: 100,
      })

      await service.saveGame(state)
      const games = await service.listGames()

      expect(games[0].gameId).toBe('game-1')
      expect(games[0].characterName).toBe('Test Hero')
      expect(games[0].currentLevel).toBe(5)
      expect(games[0].turnCount).toBe(100)
      expect(games[0].timestamp).toBeGreaterThan(0)
    })

    it('should return empty array when no games', async () => {
      const games = await service.listGames()
      expect(games).toEqual([])
    })
  })

  describe('Has Save', () => {
    it('should return true for existing save', async () => {
      const state = createTestGameState({ gameId: 'game-1' })

      await service.saveGame(state)
      const hasSave = await service.hasSave('game-1')

      expect(hasSave).toBe(true)
    })

    it('should return false for non-existent save', async () => {
      const hasSave = await service.hasSave('non-existent')
      expect(hasSave).toBe(false)
    })

    it('should check continue pointer when no gameId provided', async () => {
      const state = createTestGameState({ gameId: 'game-1' })

      await service.saveGame(state)
      const hasSave = await service.hasSave() // No gameId

      expect(hasSave).toBe(true)
    })
  })

  describe('Quota Checking', () => {
    it('should return quota information', async () => {
      const quota = await service.getQuota()

      expect(quota).toHaveProperty('usage')
      expect(quota).toHaveProperty('quota')
      expect(quota).toHaveProperty('percentUsed')
      expect(typeof quota.usage).toBe('number')
    })
  })

  describe('Compression', () => {
    it('should compress game state', async () => {
      const state = createTestGameState()

      // Save (compresses internally)
      await service.saveGame(state)

      // Get raw data from IndexedDB
      const data = await indexedDB.get('saves', 'test-game-1')

      // Compressed data should be shorter than JSON
      const uncompressedLength = JSON.stringify(state).length
      const compressedLength = data.gameState.length

      // LZ-string typically achieves 60-80% compression
      expect(compressedLength).toBeLessThan(uncompressedLength)
    })
  })

  describe('Validation', () => {
    it('should validate game state structure', async () => {
      const state = createTestGameState()

      await service.saveGame(state)
      const loaded = await service.loadGame('test-game-1')

      // Should successfully load valid state
      expect(loaded).not.toBeNull()
    })

    it('should reject corrupted save data', async () => {
      const state = createTestGameState()
      await service.saveGame(state)

      // Corrupt the data
      const data = await indexedDB.get('saves', 'test-game-1')
      data.gameState = 'corrupted-data-not-json'
      await indexedDB.put('saves', 'test-game-1', data)

      const loaded = await service.loadGame('test-game-1')

      // Should fail gracefully
      expect(loaded).toBeNull()
    })
  })
})
