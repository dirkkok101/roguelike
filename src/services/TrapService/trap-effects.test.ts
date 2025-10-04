import { TrapService } from './TrapService'
import { MockRandom } from '@services/RandomService'
import { Player, Trap, TrapType, GameState } from '@game/core/core'

describe('TrapService - Trap Effects', () => {
  let service: TrapService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new TrapService(mockRandom)
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
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
    }
  }

  function createTestState(): GameState {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      player: createTestPlayer(),
      levels: new Map([[1, {
        depth: 1,
        width: 20,
        height: 20,
        tiles,
        rooms: [],
        monsters: [],
        items: [],
        gold: [],
        traps: [],
        doors: [],
        upStairs: null,
        downStairs: null,
      }]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  function createTestTrap(type: TrapType): Trap {
    return {
      id: 'trap-1',
      position: { x: 5, y: 5 },
      type,
      discovered: false,
      triggered: false,
    }
  }

  describe('Bear Trap', () => {
    test('deals 1d4 damage', () => {
      const trap = createTestTrap(TrapType.BEAR)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([3]) // 1d4 = 3

      const result = service.triggerTrap(trap, player, state)

      expect(result.damage).toBe(3)
    })

    test('applies held status effect', () => {
      const trap = createTestTrap(TrapType.BEAR)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([2])

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBe('held')
    })

    test('includes damage in message', () => {
      const trap = createTestTrap(TrapType.BEAR)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([4])

      const result = service.triggerTrap(trap, player, state)

      expect(result.message).toContain('4 damage')
      expect(result.message).toContain('bear trap')
    })

    test('marks trap as triggered and discovered', () => {
      const trap = createTestTrap(TrapType.BEAR)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([2])

      service.triggerTrap(trap, player, state)

      expect(trap.triggered).toBe(true)
      expect(trap.discovered).toBe(true)
    })
  })

  describe('Dart Trap', () => {
    test('deals 1d6 damage', () => {
      const trap = createTestTrap(TrapType.DART)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([5, 0]) // 1d6 = 5, no poison

      const result = service.triggerTrap(trap, player, state)

      expect(result.damage).toBe(5)
    })

    test('applies poison 30% of the time', () => {
      const trap = createTestTrap(TrapType.DART)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([4, 1]) // 1d6 = 4, poison succeeds

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBe('poisoned')
      expect(result.message).toContain('poisoned')
    })

    test('no poison when chance fails', () => {
      const trap = createTestTrap(TrapType.DART)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([3, 0]) // 1d6 = 3, no poison

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBeUndefined()
      expect(result.message).not.toContain('poisoned')
    })
  })

  describe('Teleport Trap', () => {
    test('deals no damage', () => {
      const trap = createTestTrap(TrapType.TELEPORT)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.damage).toBe(0)
    })

    test('applies teleport status effect', () => {
      const trap = createTestTrap(TrapType.TELEPORT)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBe('teleport')
    })

    test('has teleport message', () => {
      const trap = createTestTrap(TrapType.TELEPORT)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.message).toContain('lurch')
      expect(result.message).toContain('elsewhere')
    })
  })

  describe('Sleep Trap', () => {
    test('deals no damage', () => {
      const trap = createTestTrap(TrapType.SLEEP)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.damage).toBe(0)
    })

    test('applies asleep status effect', () => {
      const trap = createTestTrap(TrapType.SLEEP)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBe('asleep')
    })

    test('has sleep message', () => {
      const trap = createTestTrap(TrapType.SLEEP)
      const player = createTestPlayer()
      const state = createTestState()

      const result = service.triggerTrap(trap, player, state)

      expect(result.message).toContain('gas')
      expect(result.message).toContain('drowsy')
    })
  })

  describe('Pit Trap', () => {
    test('deals 2d6 damage', () => {
      const trap = createTestTrap(TrapType.PIT)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([9, 0]) // roll returns 9, no fall through

      const result = service.triggerTrap(trap, player, state)

      expect(result.damage).toBe(9)
    })

    test('applies fall_through 20% of the time', () => {
      const trap = createTestTrap(TrapType.PIT)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([7, 1]) // roll returns 7, fall through succeeds

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBe('fall_through')
      expect(result.message).toContain('plummet to the level below')
    })

    test('no fall through when chance fails', () => {
      const trap = createTestTrap(TrapType.PIT)
      const player = createTestPlayer()
      const state = createTestState()

      mockRandom.setValues([5, 0]) // roll returns 5, no fall through

      const result = service.triggerTrap(trap, player, state)

      expect(result.statusEffect).toBeUndefined()
      expect(result.message).not.toContain('plummet')
      expect(result.message).toContain('fall into a pit')
    })
  })

  describe('All trap types', () => {
    test('all traps mark as triggered and discovered', () => {
      const trapTypes = [TrapType.BEAR, TrapType.DART, TrapType.TELEPORT, TrapType.SLEEP, TrapType.PIT]
      const player = createTestPlayer()
      const state = createTestState()

      for (const type of trapTypes) {
        const trap = createTestTrap(type)
        mockRandom.setValues([3, 3, 0]) // Generic values

        service.triggerTrap(trap, player, state)

        expect(trap.triggered).toBe(true)
        expect(trap.discovered).toBe(true)
      }
    })

    test('all traps return valid TrapEffect', () => {
      const trapTypes = [TrapType.BEAR, TrapType.DART, TrapType.TELEPORT, TrapType.SLEEP, TrapType.PIT]
      const player = createTestPlayer()
      const state = createTestState()

      for (const type of trapTypes) {
        const trap = createTestTrap(type)
        mockRandom.setValues([3, 3, 0])

        const result = service.triggerTrap(trap, player, state)

        expect(result.damage).toBeGreaterThanOrEqual(0)
        expect(result.message).toBeDefined()
        expect(result.message.length).toBeGreaterThan(0)
      }
    })
  })
})
