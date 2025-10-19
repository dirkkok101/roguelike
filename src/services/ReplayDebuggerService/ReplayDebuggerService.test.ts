import 'fake-indexeddb/auto'
import { ReplayDebuggerService } from './ReplayDebuggerService'
import { CommandFactory } from '@services/CommandFactory'
import { IndexedDBService } from '@services/IndexedDBService'
import { MockRandom } from '@services/RandomService'
import { GameState } from '@game/core/core'
import { ReplayData, COMMAND_TYPES } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

// Helper to create minimal test GameState
function createTestGameState(overrides?: Partial<GameState>): GameState {
  const baseState: GameState = {
    gameId: 'test-replay-game',
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
      xp: 0,
      gold: 0,
      ac: 5,
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
    messages: ['Welcome!'],
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

describe('ReplayDebuggerService', () => {
  let service: ReplayDebuggerService
  let indexedDB: IndexedDBService
  let mockRandom: MockRandom
  let commandFactory: CommandFactory

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    mockRandom = new MockRandom()
    commandFactory = {} as CommandFactory // Mock for now

    service = new ReplayDebuggerService(indexedDB, mockRandom, commandFactory)
  })

  afterEach(async () => {
    // Clean up IndexedDB
    const allReplays = await indexedDB.getAll('replays')
    for (const replay of allReplays) {
      await indexedDB.delete('replays', replay.gameId)
    }
    indexedDB.close()
  })

  describe('loadReplay', () => {
    it('should load replay data from IndexedDB', async () => {
      const initialState = createTestGameState()
      const replayData: ReplayData = {
        gameId: 'test-replay-game',
        version: 1,
        initialState: initialState,
        seed: 'test-seed',
        commands: [
          {
            turnNumber: 0,
            timestamp: Date.now(),
            commandType: COMMAND_TYPES.MOVE,
            actorType: 'player',
            payload: { direction: 'right' },
            rngState: 'test-rng-state',
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

      await indexedDB.put('replays', 'test-replay-game', replayData)

      const loaded = await service.loadReplay('test-replay-game')

      expect(loaded).not.toBeNull()
      expect(loaded?.gameId).toBe('test-replay-game')
      expect(loaded?.commands).toHaveLength(1)
      expect(loaded?.version).toBe(1)
    })

    it('should deserialize initialState Maps when reconstructing state', async () => {
      // Create test state with proper Maps/Sets
      const initialState = createTestGameState()

      // Manually serialize the state (simulating what would happen in production)
      // Convert Maps/Sets to arrays
      const serializedInitialState = {
        ...initialState,
        levels: Array.from(initialState.levels.entries()),
        visibleCells: Array.from(initialState.visibleCells),
        identifiedItems: Array.from(initialState.identifiedItems),
        detectedMonsters: Array.from(initialState.detectedMonsters),
        detectedMagicItems: Array.from(initialState.detectedMagicItems),
        levelsVisitedWithAmulet: Array.from(initialState.levelsVisitedWithAmulet),
        itemNameMap: {
          potions: Array.from(initialState.itemNameMap.potions.entries()),
          scrolls: Array.from(initialState.itemNameMap.scrolls.entries()),
          rings: Array.from(initialState.itemNameMap.rings.entries()),
          wands: Array.from(initialState.itemNameMap.wands.entries()),
        },
      }

      const replayData: ReplayData = {
        gameId: 'test-deserialization',
        version: 1,
        initialState: serializedInitialState as any, // Stored as arrays
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

      // Store in IndexedDB
      await indexedDB.put('replays', 'test-deserialization', replayData)

      // Load it back (levels should be arrays)
      const loaded = await service.loadReplay('test-deserialization')
      expect(loaded).not.toBeNull()

      // Reconstruct to turn 0 (should deserialize the initialState arrays → Maps)
      const reconstructed = await service.reconstructToTurn(loaded!, 0)

      // CRITICAL: levels should be a Map, not an array
      expect(reconstructed.levels).toBeInstanceOf(Map)
      expect(reconstructed.levels.get(1)).toBeDefined()
      expect(reconstructed.visibleCells).toBeInstanceOf(Set)
      expect(reconstructed.identifiedItems).toBeInstanceOf(Set)
      expect(reconstructed.detectedMonsters).toBeInstanceOf(Set)
      expect(reconstructed.itemNameMap.potions).toBeInstanceOf(Map)
    })

    it('should return null for non-existent replay', async () => {
      const loaded = await service.loadReplay('non-existent')

      expect(loaded).toBeNull()
    })

    it('should reject incompatible replay version', async () => {
      const initialState = createTestGameState()
      const replayData: ReplayData = {
        gameId: 'test-replay-game',
        version: 999, // Incompatible version
        initialState: initialState,
        seed: 'test-seed',
        commands: [],
        metadata: {
          createdAt: Date.now(),
          turnCount: 0,
          characterName: 'Test Hero',
          currentLevel: 1,
        },
      }

      await indexedDB.put('replays', 'test-replay-game', replayData)

      const loaded = await service.loadReplay('test-replay-game')

      expect(loaded).toBeNull()
    })
  })

  describe('compareStates (validation)', () => {
    it('should return no desyncs for identical states', async () => {
      const state1 = createTestGameState()
      const state2 = createTestGameState()

      // Access private method via type casting
      const desyncs = (service as any).compareStates(state1, state2)

      expect(desyncs).toHaveLength(0)
    })

    it('should detect player HP desync', async () => {
      const state1 = createTestGameState({ player: { ...createTestGameState().player, hp: 100 } })
      const state2 = createTestGameState({ player: { ...createTestGameState().player, hp: 90 } })

      const desyncs = (service as any).compareStates(state1, state2)

      expect(desyncs.length).toBeGreaterThan(0)
      expect(desyncs.some((d: any) => d.field === 'player.hp')).toBe(true)
      expect(desyncs.find((d: any) => d.field === 'player.hp').expected).toBe(100)
      expect(desyncs.find((d: any) => d.field === 'player.hp').actual).toBe(90)
    })

    it('should detect player position desync', async () => {
      const state1 = createTestGameState({
        player: { ...createTestGameState().player, position: { x: 10, y: 5 } },
      })
      const state2 = createTestGameState({
        player: { ...createTestGameState().player, position: { x: 11, y: 5 } },
      })

      const desyncs = (service as any).compareStates(state1, state2)

      expect(desyncs.length).toBeGreaterThan(0)
      expect(desyncs.some((d: any) => d.field === 'player.position')).toBe(true)
    })

    it('should detect turn count desync', async () => {
      const state1 = createTestGameState({ turnCount: 10 })
      const state2 = createTestGameState({ turnCount: 11 })

      const desyncs = (service as any).compareStates(state1, state2)

      expect(desyncs.length).toBeGreaterThan(0)
      expect(desyncs.some((d: any) => d.field === 'turnCount')).toBe(true)
    })

    it('should detect player gold desync', async () => {
      const state1 = createTestGameState({ player: { ...createTestGameState().player, gold: 100 } })
      const state2 = createTestGameState({ player: { ...createTestGameState().player, gold: 50 } })

      const desyncs = (service as any).compareStates(state1, state2)

      expect(desyncs.length).toBeGreaterThan(0)
      expect(desyncs.some((d: any) => d.field === 'player.gold')).toBe(true)
    })
  })
})
