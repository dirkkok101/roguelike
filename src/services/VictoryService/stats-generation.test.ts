import { VictoryService } from './VictoryService'
import { GameState, Player, Level, TileType } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('VictoryService - Stats Generation', () => {
  let service: VictoryService

  beforeEach(() => {
    service = new VictoryService()
  })

  function createTestLevel(depth: number): Level {
    return {
      depth,
      width: 20,
      height: 20,
      tiles: Array(20).fill(null).map(() =>
        Array(20).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#FFFFFF',
          colorExplored: '#888888',
        })
      ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20).fill(null).map(() => Array(20).fill(false)),
    }
  }

  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      strength: 16,
      maxStrength: 16,
      ac: 4,
      level: 10,
      xp: 5000,
      gold: 1234,
      hunger: 1000,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      ...overrides,
    }
  }

  function createTestState(player: Player, levels: Map<number, Level>, turnCount: number): GameState {
    return {
      player,
      currentLevel: 1,
      levels,
      visibleCells: new Set(),
      messages: [],
      turnCount,
      seed: 'test-seed-123',
      gameId: 'game-456',
      isGameOver: false,
      hasWon: true,
      hasAmulet: true,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  }

  test('generates complete victory stats', () => {
    const player = createTestPlayer({ level: 10, gold: 1234, xp: 5678 })
    const levels = new Map([
      [1, createTestLevel(1)],
      [5, createTestLevel(5)],
      [10, createTestLevel(10)],
    ])
    const state = createTestState(player, levels, 9000)

    const stats = service.getVictoryStats(state)

    expect(stats.finalLevel).toBe(10)
    expect(stats.totalGold).toBe(1234)
    expect(stats.totalXP).toBe(5678)
    expect(stats.totalTurns).toBe(9000)
    expect(stats.deepestLevel).toBe(10)
    expect(stats.seed).toBe('test-seed-123')
    expect(stats.gameId).toBe('game-456')
  })

  test('calculates correct deepest level', () => {
    const player = createTestPlayer()
    const levels = new Map([
      [1, createTestLevel(1)],
      [3, createTestLevel(3)],
      [7, createTestLevel(7)],
      [10, createTestLevel(10)],
    ])
    const state = createTestState(player, levels, 5000)

    const stats = service.getVictoryStats(state)

    expect(stats.deepestLevel).toBe(10)
  })

  test('includes calculated final score', () => {
    const player = createTestPlayer({ gold: 500, level: 10, xp: 2000 })
    const levels = new Map([[1, createTestLevel(1)]])
    const state = createTestState(player, levels, 1000)

    const stats = service.getVictoryStats(state)

    // Score should match calculateScore result
    const expectedScore = service.calculateScore(state)
    expect(stats.finalScore).toBe(expectedScore)
    expect(stats.finalScore).toBe(15900) // 500*10 + 10*100 + 2000*5 - 1000/10
  })

  test('deepest level works with single level', () => {
    const player = createTestPlayer()
    const levels = new Map([[1, createTestLevel(1)]])
    const state = createTestState(player, levels, 1000)

    const stats = service.getVictoryStats(state)

    expect(stats.deepestLevel).toBe(1)
  })

  test('preserves seed and gameId', () => {
    const player = createTestPlayer()
    const levels = new Map([[1, createTestLevel(1)]])
    const state = createTestState(player, levels, 1000)
    state.seed = 'custom-seed-xyz'
    state.gameId = 'custom-game-999'

    const stats = service.getVictoryStats(state)

    expect(stats.seed).toBe('custom-seed-xyz')
    expect(stats.gameId).toBe('custom-game-999')
  })
})
