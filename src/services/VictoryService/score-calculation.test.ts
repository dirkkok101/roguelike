import { VictoryService } from './VictoryService'
import { GameState, Player } from '@game/core/core'

describe('VictoryService - Score Calculation', () => {
  let service: VictoryService

  beforeEach(() => {
    service = new VictoryService()
  })

  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      strength: 16,
      maxStrength: 16,
      ac: 4,
      level: 10,
      xp: 2000,
      gold: 500,
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

  function createTestState(player: Player, turnCount: number): GameState {
    return {
      player,
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount,
      seed: 'test-seed',
      gameId: 'test-game',
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

  test('calculates score from gold, level, xp, turns', () => {
    const player = createTestPlayer({ gold: 500, level: 10, xp: 2000 })
    const state = createTestState(player, 1000)

    const score = service.calculateScore(state)

    // 500*10 + 10*100 + 2000*5 - 1000/10 = 5000 + 1000 + 10000 - 100 = 15900
    expect(score).toBe(15900)
  })

  test('returns 0 minimum score', () => {
    const player = createTestPlayer({ gold: 0, level: 1, xp: 0 })
    const state = createTestState(player, 100000) // Huge turn penalty

    const score = service.calculateScore(state)
    expect(score).toBe(0) // Cannot go negative
  })

  test('higher gold increases score', () => {
    const player1 = createTestPlayer({ gold: 100, level: 5, xp: 1000 })
    const player2 = createTestPlayer({ gold: 500, level: 5, xp: 1000 })
    const state1 = createTestState(player1, 500)
    const state2 = createTestState(player2, 500)

    const score1 = service.calculateScore(state1)
    const score2 = service.calculateScore(state2)

    expect(score2).toBeGreaterThan(score1)
  })

  test('higher level increases score', () => {
    const player1 = createTestPlayer({ gold: 100, level: 3, xp: 1000 })
    const player2 = createTestPlayer({ gold: 100, level: 10, xp: 1000 })
    const state1 = createTestState(player1, 500)
    const state2 = createTestState(player2, 500)

    const score1 = service.calculateScore(state1)
    const score2 = service.calculateScore(state2)

    expect(score2).toBeGreaterThan(score1)
  })

  test('higher XP increases score', () => {
    const player1 = createTestPlayer({ gold: 100, level: 5, xp: 500 })
    const player2 = createTestPlayer({ gold: 100, level: 5, xp: 5000 })
    const state1 = createTestState(player1, 500)
    const state2 = createTestState(player2, 500)

    const score1 = service.calculateScore(state1)
    const score2 = service.calculateScore(state2)

    expect(score2).toBeGreaterThan(score1)
  })

  test('more turns decreases score', () => {
    const player = createTestPlayer({ gold: 500, level: 10, xp: 2000 })
    const state1 = createTestState(player, 500)
    const state2 = createTestState(player, 5000)

    const score1 = service.calculateScore(state1)
    const score2 = service.calculateScore(state2)

    expect(score1).toBeGreaterThan(score2)
  })
})
