import 'fake-indexeddb/auto'
import { GameStorageService } from './GameStorageService'
import { GameState } from '@game/core/core'
import { IndexedDBService } from '@services/IndexedDBService'
import { CommandRecorderService } from '@services/CommandRecorderService'

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
  let recorder: CommandRecorderService

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    recorder = new CommandRecorderService()

    service = new GameStorageService(recorder, indexedDB)
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
      expect(games[0].level).toBe(5)
      expect(games[0].turnCount).toBe(100)
      expect(games[0].timestamp).toBeGreaterThan(0)
    })

    it('should return empty array when no games', async () => {
      const games = await service.listGames()
      expect(games).toEqual([])
    })

    it('should return saves sorted by score descending', async () => {
      const saves = [
        createTestGameState({
          gameId: 'game-1',
          characterName: 'Alice',
          player: { ...createTestGameState().player, gold: 100 },
          monstersKilled: 9,
          maxDepth: 5,
        }),
        createTestGameState({
          gameId: 'game-2',
          characterName: 'Bob',
          player: { ...createTestGameState().player, gold: 500 },
          monstersKilled: 45,
          maxDepth: 26,
        }),
      ]

      await service.saveGame(saves[0])
      await service.saveGame(saves[1])

      const games = await service.listGames()

      // Sorted by score descending (Bob first with 5000, Alice second with 1000)
      // Bob: 500 + (45 * 100) + (26 * 1000) = 500 + 4500 + 26000 = 31000
      // Alice: 100 + (9 * 100) + (5 * 1000) = 100 + 900 + 5000 = 6000
      expect(games).toHaveLength(2)
      expect(games[0].characterName).toBe('Bob')
      expect(games[0].score).toBe(31000)
      expect(games[1].characterName).toBe('Alice')
      expect(games[1].score).toBe(6000)
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

  describe('Replay Integration', () => {
    it('should embed replay data in save when commands are recorded', async () => {
      const state = createTestGameState()

      // Set initial state and record some commands
      recorder.setInitialState(state)
      recorder.recordCommand({
        type: 'move',
        direction: 'right',
        turnCount: 0,
        rngState: 'test-rng-state',
      })
      recorder.recordCommand({
        type: 'move',
        direction: 'down',
        turnCount: 1,
        rngState: 'test-rng-state-2',
      })

      await service.saveGame(state)

      // Check that replay data was embedded in save object
      const saveData = await indexedDB.get('saves', 'test-game-1')

      expect(saveData).not.toBeNull()
      expect(saveData.replayData).not.toBeNull()
      expect(saveData.replayData.seed).toBe('test-seed')
      expect(saveData.replayData.commands).toHaveLength(2)
      expect(saveData.replayData.commands[0].type).toBe('move')
      expect(saveData.replayData.commands[0].direction).toBe('right')
      expect(saveData.replayData.initialState).toBeDefined()
      expect(saveData.replayData.initialState.gameId).toBe('test-game-1')
    })

    it('should not embed replay data when no commands recorded', async () => {
      const state = createTestGameState()

      // Don't set initial state or record any commands
      await service.saveGame(state)

      // Check that replay data is null
      const saveData = await indexedDB.get('saves', 'test-game-1')

      expect(saveData).not.toBeNull()
      expect(saveData.replayData).toBeNull()
    })

    it('should restore commands from save on load', async () => {
      const state = createTestGameState()

      // Record some commands before save
      recorder.setInitialState(state)
      recorder.recordCommand({
        type: 'move',
        direction: 'right',
        turnCount: 0,
        rngState: 'test-rng-state',
      })

      await service.saveGame(state)

      // Record more commands after save (simulating continued play)
      recorder.recordCommand({
        type: 'move',
        direction: 'down',
        turnCount: 1,
        rngState: 'test-rng-state-2',
      })

      // Load game
      const loaded = await service.loadGame('test-game-1')

      expect(loaded).not.toBeNull()

      // Recorder should have commands restored from save (only 1, not 2)
      const commands = recorder.getCommandLog()
      expect(commands).toHaveLength(1)
      expect(commands[0].type).toBe('move')
      expect(commands[0].direction).toBe('right')

      // Recorder should have initial state restored
      const initialState = recorder.getInitialState()
      expect(initialState).toBeDefined()
      expect(initialState?.gameId).toBe('test-game-1')
    })

    it('should store initialState in embedded replay data', async () => {
      const state = createTestGameState()

      recorder.setInitialState(state)
      recorder.recordCommand({
        type: 'move',
        direction: 'right',
        turnCount: 0,
        rngState: 'test-rng-state',
      })

      await service.saveGame(state)

      const saveData = await indexedDB.get('saves', 'test-game-1')

      // Initial state should be embedded
      expect(saveData.replayData.initialState).toBeDefined()
      expect(saveData.replayData.initialState.gameId).toBe('test-game-1')
      expect(saveData.replayData.initialState.player).toBeDefined()
    })

    it('should restore replay data on load (full cycle test)', async () => {
      // Phase 1: Create game and record some commands
      const initialState = createTestGameState({ turnCount: 0 })
      recorder.setInitialState(initialState)

      recorder.recordCommand({
        type: 'move',
        direction: 'north',
        turnCount: 0,
        rngState: 'rng-1',
      })
      recorder.recordCommand({
        type: 'move',
        direction: 'east',
        turnCount: 1,
        rngState: 'rng-2',
      })
      recorder.recordCommand({
        type: 'attack',
        target: { x: 11, y: 5 },
        turnCount: 2,
        rngState: 'rng-3',
      })

      // Phase 2: Save game at turn 20
      const currentState = createTestGameState({ turnCount: 20 })
      await service.saveGame(currentState)

      // Verify save has replay data embedded
      const saveData = await indexedDB.get('saves', 'test-game-1')
      expect(saveData.replayData).not.toBeNull()
      expect(saveData.replayData.commands).toHaveLength(3)

      // Phase 3: Simulate new session - clear recorder
      recorder.clearLog()
      expect(recorder.getCommandLog()).toHaveLength(0)
      expect(recorder.getInitialState()).toBeNull()

      // Phase 4: Load game
      const loaded = await service.loadGame('test-game-1')

      expect(loaded).not.toBeNull()
      expect(loaded?.turnCount).toBe(20)

      // Phase 5: Verify replay data was restored
      const restoredCommands = recorder.getCommandLog()
      const restoredInitialState = recorder.getInitialState()

      expect(restoredCommands).toHaveLength(3)
      expect(restoredCommands[0].type).toBe('move')
      expect(restoredCommands[0].direction).toBe('north')
      expect(restoredCommands[1].type).toBe('move')
      expect(restoredCommands[1].direction).toBe('east')
      expect(restoredCommands[2].type).toBe('attack')

      expect(restoredInitialState).not.toBeNull()
      expect(restoredInitialState?.gameId).toBe('test-game-1')
      expect(restoredInitialState?.turnCount).toBe(0)
    })

    it('should handle load when no replay data exists', async () => {
      const state = createTestGameState()

      // Save WITHOUT setting initial state or recording commands
      await service.saveGame(state)

      // Verify no replay data in save
      const saveData = await indexedDB.get('saves', 'test-game-1')
      expect(saveData.replayData).toBeNull()

      // Load game
      const loaded = await service.loadGame('test-game-1')

      expect(loaded).not.toBeNull()

      // Recorder should have loaded state as initial state, but no commands
      const restoredInitialState = recorder.getInitialState()
      const restoredCommands = recorder.getCommandLog()

      expect(restoredInitialState).not.toBeNull()
      expect(restoredInitialState?.gameId).toBe('test-game-1')
      expect(restoredCommands).toHaveLength(0)
    })

    it('should save at turn 40, load at turn 40, and replay from turn 0 to turn 40', async () => {
      // Phase 1: Start game at turn 0
      const turn0State = createTestGameState({
        turnCount: 0,
        player: { ...createTestGameState().player, hp: 100 },
      })
      recorder.setInitialState(turn0State)

      // Phase 2: Simulate playing 40 turns (record 40 commands)
      for (let turn = 0; turn < 40; turn++) {
        recorder.recordCommand({
          type: 'move',
          direction: turn % 2 === 0 ? 'north' : 'east',
          turnCount: turn,
          rngState: `rng-${turn}`,
        })
      }

      // Verify we have 40 commands recorded
      expect(recorder.getCommandLog()).toHaveLength(40)

      // Phase 3: Save game at turn 40
      const turn40State = createTestGameState({
        turnCount: 40,
        player: { ...createTestGameState().player, hp: 75 }, // Player took damage
      })
      await service.saveGame(turn40State)

      // Verify save structure
      const saveData = await indexedDB.get('saves', 'test-game-1')
      expect(saveData).not.toBeNull()
      expect(saveData.replayData).not.toBeNull()
      expect(saveData.replayData.commands).toHaveLength(40)
      expect(saveData.replayData.initialState.turnCount).toBe(0) // Initial state at turn 0

      // Phase 4: Simulate new session - clear recorder
      recorder.clearLog()
      expect(recorder.getCommandLog()).toHaveLength(0)
      expect(recorder.getInitialState()).toBeNull()

      // Phase 5: Load the game
      const loadedState = await service.loadGame('test-game-1')

      // VERIFY: Loaded state is at turn 40
      expect(loadedState).not.toBeNull()
      expect(loadedState?.turnCount).toBe(40)
      expect(loadedState?.player.hp).toBe(75)

      // VERIFY: Replay data restored - can replay from turn 0 to turn 40
      const restoredCommands = recorder.getCommandLog()
      const restoredInitialState = recorder.getInitialState()

      // Should have all 40 commands
      expect(restoredCommands).toHaveLength(40)

      // Initial state should be at turn 0
      expect(restoredInitialState).not.toBeNull()
      expect(restoredInitialState?.turnCount).toBe(0)
      expect(restoredInitialState?.player.hp).toBe(100) // Full health at start

      // Verify command sequence
      expect(restoredCommands[0].turnCount).toBe(0)
      expect(restoredCommands[0].direction).toBe('north')
      expect(restoredCommands[1].turnCount).toBe(1)
      expect(restoredCommands[1].direction).toBe('east')
      expect(restoredCommands[39].turnCount).toBe(39)
      expect(restoredCommands[39].direction).toBe('east')

      // VERIFY: Game continues from turn 40
      // Next command would be turn 40
      recorder.recordCommand({
        type: 'move',
        direction: 'south',
        turnCount: 40,
        rngState: 'rng-40',
      })
      expect(recorder.getCommandLog()).toHaveLength(41)
    })
  })

  describe('calculateStatus', () => {
    it('should return "ongoing" for active game', () => {
      const state = createTestGameState({ isGameOver: false })
      const status = (service as any).calculateStatus(state)
      expect(status).toBe('ongoing')
    })

    it('should return "won" for victory', () => {
      const state = createTestGameState({ isGameOver: true, hasWon: true })
      const status = (service as any).calculateStatus(state)
      expect(status).toBe('won')
    })

    it('should return "died" for death', () => {
      const state = createTestGameState({ isGameOver: true, hasWon: false })
      const status = (service as any).calculateStatus(state)
      expect(status).toBe('died')
    })
  })

  describe('calculateScore', () => {
    it('should calculate score from gold + monsters + depth', () => {
      const state = createTestGameState({
        player: { ...createTestGameState().player, gold: 500 },
        monstersKilled: 10,
        maxDepth: 5,
      })
      const score = (service as any).calculateScore(state)
      // 500 + (10 * 100) + (5 * 1000) = 500 + 1000 + 5000 = 6500
      expect(score).toBe(6500)
    })

    it('should handle zero values', () => {
      const state = createTestGameState({
        player: { ...createTestGameState().player, gold: 0 },
        monstersKilled: 0,
        maxDepth: 0,
      })
      const score = (service as any).calculateScore(state)
      expect(score).toBe(0)
    })
  })
})
