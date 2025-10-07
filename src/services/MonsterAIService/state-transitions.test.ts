import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Monster, MonsterBehavior, Player } from '@game/core/core'

describe('MonsterAIService - State Transitions', () => {
  let service: MonsterAIService
  let pathfinding: PathfindingService
  let mockRandom: MockRandom
  let fovService: FOVService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    const levelService = new LevelService()
    pathfinding = new PathfindingService(levelService)
    mockRandom = new MockRandom()
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    service = new MonsterAIService(pathfinding, mockRandom, fovService, levelService)
  })

  function createTestMonster(overrides?: Partial<Monster>): Monster {
    return {
      id: 'test-monster',
      letter: 'T',
      name: 'Test Monster',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
      ...overrides,
    }
  }

  function createTestState(): GameState {
    const player: Player = {
      position: { x: 10, y: 10 },
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

    const level = {
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
    }

    return {
      player,
      levels: new Map([[1, level]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  describe('SLEEPING to HUNTING', () => {
    test('transitions from SLEEPING to HUNTING when player in aggro range', () => {
      const monster = createTestMonster({
        state: 'SLEEPING',
        isAsleep: true,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 8, y: 8 } // Within aggro range

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('HUNTING')
      expect(updated.isAsleep).toBe(false)
    })

    test('stays SLEEPING when player outside aggro range', () => {
      const monster = createTestMonster({
        state: 'SLEEPING',
        isAsleep: true,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 3,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 15, y: 15 } // Outside aggro range

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('SLEEPING')
      expect(updated.isAsleep).toBe(true)
    })
  })

  describe('WANDERING to HUNTING', () => {
    test('transitions from WANDERING to HUNTING when player in aggro range', () => {
      const monster = createTestMonster({
        state: 'WANDERING',
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 8, y: 8 } // Within aggro range

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('HUNTING')
    })

    test('stays WANDERING when player outside aggro range', () => {
      const monster = createTestMonster({
        state: 'WANDERING',
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 3,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 15, y: 15 } // Outside aggro range

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('WANDERING')
    })
  })

  describe('HUNTING to FLEEING', () => {
    test('COWARD transitions to FLEEING when HP below flee threshold', () => {
      const monster = createTestMonster({
        state: 'HUNTING',
        hp: 2,
        maxHp: 10,
        aiProfile: {
          behavior: MonsterBehavior.COWARD,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0.3,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('FLEEING')
    })

    test('COWARD stays HUNTING when HP above flee threshold', () => {
      const monster = createTestMonster({
        state: 'HUNTING',
        hp: 8,
        maxHp: 10,
        aiProfile: {
          behavior: MonsterBehavior.COWARD,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0.3,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('HUNTING')
    })

    test('THIEF transitions to FLEEING after stealing', () => {
      const monster = createTestMonster({
        state: 'HUNTING',
        hasStolen: true,
        aiProfile: {
          behavior: MonsterBehavior.THIEF,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('FLEEING')
    })

    test('THIEF stays HUNTING before stealing', () => {
      const monster = createTestMonster({
        state: 'HUNTING',
        hasStolen: false,
        aiProfile: {
          behavior: MonsterBehavior.THIEF,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('HUNTING')
    })
  })

  describe('FLEEING to HUNTING', () => {
    test('COWARD returns to HUNTING when HP recovered', () => {
      const monster = createTestMonster({
        state: 'FLEEING',
        hp: 5,
        maxHp: 10,
        aiProfile: {
          behavior: MonsterBehavior.COWARD,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0.3,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      // HP is 50%, threshold is 30%, so should return to hunting (30% + 10% = 40%)
      expect(updated.state).toBe('HUNTING')
    })

    test('COWARD stays FLEEING when HP not recovered enough', () => {
      const monster = createTestMonster({
        state: 'FLEEING',
        hp: 3,
        maxHp: 10,
        aiProfile: {
          behavior: MonsterBehavior.COWARD,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0.3,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      // HP is 30%, needs to be > 40% (30% + 10%) to return to hunting
      expect(updated.state).toBe('FLEEING')
    })

    test('THIEF continues FLEEING after stealing (does not return)', () => {
      const monster = createTestMonster({
        state: 'FLEEING',
        hp: 10,
        maxHp: 10,
        hasStolen: true,
        aiProfile: {
          behavior: MonsterBehavior.THIEF,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()

      const updated = service.updateMonsterState(monster, state)

      expect(updated.state).toBe('FLEEING')
    })
  })

  describe('State immutability', () => {
    test('returns new monster object when state changes', () => {
      const monster = createTestMonster({
        state: 'SLEEPING',
        isAsleep: true,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 8, y: 8 } // Trigger transition

      const updated = service.updateMonsterState(monster, state)

      expect(updated).not.toBe(monster)
      expect(monster.state).toBe('SLEEPING')
      expect(updated.state).toBe('HUNTING')
    })

    test('returns same object when no state change', () => {
      const monster = createTestMonster({
        state: 'HUNTING',
      })

      const state = createTestState()
      state.player.position = { x: 15, y: 15 } // Far away

      const updated = service.updateMonsterState(monster, state)

      expect(updated).toBe(monster)
    })
  })
})
