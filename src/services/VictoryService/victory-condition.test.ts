import { VictoryService } from './VictoryService'
import { GameState, Player } from '@game/core/core'

describe('VictoryService - Victory Condition', () => {
  let service: VictoryService

  beforeEach(() => {
    service = new VictoryService()
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      strength: 16,
      maxStrength: 16,
      ac: 4,
      level: 10,
      xp: 5000,
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
    }
  }

  function createTestState(currentLevel: number, hasAmulet: boolean): GameState {
    return {
      player: createTestPlayer(),
      currentLevel,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 1000,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  }

  test('returns true when on level 1 with amulet', () => {
    const state = createTestState(1, true)

    expect(service.checkVictory(state)).toBe(true)
  })

  test('returns false when on level 1 without amulet', () => {
    const state = createTestState(1, false)

    expect(service.checkVictory(state)).toBe(false)
  })

  test('returns false when on level 2+ with amulet', () => {
    const state = createTestState(5, true)

    expect(service.checkVictory(state)).toBe(false)
  })

  test('returns false when on level 10 with amulet', () => {
    const state = createTestState(10, true)

    expect(service.checkVictory(state)).toBe(false)
  })

  test('returns false when on level 2 without amulet', () => {
    const state = createTestState(2, false)

    expect(service.checkVictory(state)).toBe(false)
  })
})
