import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState } from '@game/core/core'

describe('TurnService', () => {
  let service: TurnService

  beforeEach(() => {
    const statusEffectService = new StatusEffectService()
    service = new TurnService(statusEffectService)
  })

  function createTestState(turnCount: number = 0): GameState {
    return {
      player: {
        position: { x: 5, y: 5 },
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 10,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
        statusEffects: [],
        energy: 100,
      },
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    } as GameState
  }

  describe('incrementTurn()', () => {
    test('increments turn count by 1', () => {
      const state = createTestState(0)

      const result = service.incrementTurn(state)

      expect(result.turnCount).toBe(1)
    })

    test('increments from any starting value', () => {
      const state = createTestState(42)

      const result = service.incrementTurn(state)

      expect(result.turnCount).toBe(43)
    })

    test('returns new GameState object (immutability)', () => {
      const state = createTestState(10)

      const result = service.incrementTurn(state)

      expect(result).not.toBe(state)
      expect(state.turnCount).toBe(10) // Original unchanged
      expect(result.turnCount).toBe(11)
    })

    test('preserves all other state properties', () => {
      const state = createTestState(5)

      const result = service.incrementTurn(state)

      // Player is updated (status effects ticked), but properties preserved
      expect(result.player).not.toBe(state.player) // New object due to immutability
      expect(result.player.position).toStrictEqual(state.player.position)
      expect(result.player.hp).toBe(state.player.hp)
      expect(result.player.level).toBe(state.player.level)

      // Other state properties are unchanged (same reference)
      expect(result.currentLevel).toBe(state.currentLevel)
      expect(result.levels).toBe(state.levels)
      expect(result.messages).toBe(state.messages)
      expect(result.seed).toBe(state.seed)
      expect(result.gameId).toBe(state.gameId)
    })

    test('handles multiple increments', () => {
      let state = createTestState(0)

      state = service.incrementTurn(state)
      expect(state.turnCount).toBe(1)

      state = service.incrementTurn(state)
      expect(state.turnCount).toBe(2)

      state = service.incrementTurn(state)
      expect(state.turnCount).toBe(3)
    })
  })

  describe('getCurrentTurn()', () => {
    test('returns current turn count', () => {
      const state = createTestState(42)

      const turn = service.getCurrentTurn(state)

      expect(turn).toBe(42)
    })

    test('returns 0 for initial state', () => {
      const state = createTestState(0)

      const turn = service.getCurrentTurn(state)

      expect(turn).toBe(0)
    })

    test('does not modify state', () => {
      const state = createTestState(10)

      service.getCurrentTurn(state)

      expect(state.turnCount).toBe(10) // Unchanged
    })
  })
})
