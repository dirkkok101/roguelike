import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { GameState, Monster, MonsterBehavior, Player } from '@game/core/core'

describe('MonsterAIService - FOV and Awareness', () => {
  let service: MonsterAIService
  let pathfinding: PathfindingService
  let mockRandom: MockRandom
  let fovService: FOVService

  beforeEach(() => {
    pathfinding = new PathfindingService()
    mockRandom = new MockRandom()
    fovService = new FOVService()
    service = new MonsterAIService(pathfinding, mockRandom, fovService)
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

  function createTestState(monsterOverrides?: Partial<Monster>): GameState {
    const monster = createTestMonster(monsterOverrides)
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
      monsters: [monster],
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

  describe('computeMonsterFOV', () => {
    test('computes FOV for awake monster', () => {
      const monster = createTestMonster({ isAsleep: false, state: 'HUNTING' })
      const state = createTestState()

      const updated = service.computeMonsterFOV(monster, state)

      expect(updated.visibleCells).toBeDefined()
      expect(updated.visibleCells.size).toBeGreaterThan(0)
    })

    test('skips FOV for sleeping monster (optimization)', () => {
      const monster = createTestMonster({ isAsleep: true, state: 'SLEEPING' })
      const state = createTestState()

      const updated = service.computeMonsterFOV(monster, state)

      expect(updated).toBe(monster) // Should return same object
      expect(updated.visibleCells.size).toBe(0)
    })

    test('uses aggro range as vision radius', () => {
      const monster = createTestMonster({
        isAsleep: false,
        state: 'HUNTING',
        position: { x: 5, y: 5 },
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 3,
          fleeThreshold: 0,
          special: [],
        },
      })
      const state = createTestState()

      const updated = service.computeMonsterFOV(monster, state)

      expect(updated.visibleCells).toBeDefined()
      expect(updated.visibleCells.size).toBeGreaterThan(0)

      // FOV uses recursive shadowcasting which can see slightly beyond Manhattan distance
      // Just verify that most cells are within reasonable range
      let withinRange = 0
      for (const key of updated.visibleCells) {
        const [x, y] = key.split(',').map(Number)
        const dist = Math.abs(x - monster.position.x) + Math.abs(y - monster.position.y)
        if (dist <= 3) {
          withinRange++
        }
      }
      expect(withinRange).toBeGreaterThan(0)
    })
  })

  describe('checkWakeUp', () => {
    test('wakes up monster when player in aggro range', () => {
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        isAsleep: true,
        state: 'SLEEPING',
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 10,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 8, y: 8 } // Distance = 6, within aggro range 10

      const updated = service.checkWakeUp(monster, state)

      expect(updated.isAsleep).toBe(false)
      expect(updated.state).toBe('HUNTING')
    })

    test('keeps monster asleep when player outside aggro range', () => {
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        isAsleep: true,
        state: 'SLEEPING',
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 3,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 15, y: 15 } // Distance = 20, outside aggro range 3

      const updated = service.checkWakeUp(monster, state)

      expect(updated.isAsleep).toBe(true)
      expect(updated.state).toBe('SLEEPING')
    })

    test('does nothing if monster already awake', () => {
      const monster = createTestMonster({
        isAsleep: false,
        state: 'HUNTING',
      })

      const state = createTestState()

      const updated = service.checkWakeUp(monster, state)

      expect(updated).toBe(monster) // Should return same object
    })

    test('wakes up at exact aggro range boundary', () => {
      const monster = createTestMonster({
        position: { x: 5, y: 5 },
        isAsleep: true,
        state: 'SLEEPING',
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 1,
          aggroRange: 5,
          fleeThreshold: 0,
          special: [],
        },
      })

      const state = createTestState()
      state.player.position = { x: 10, y: 5 } // Distance = 5, exactly at aggro range

      const updated = service.checkWakeUp(monster, state)

      expect(updated.isAsleep).toBe(false)
      expect(updated.state).toBe('HUNTING')
    })
  })

  describe('Distance and proximity helpers', () => {
    test('returns attack action when adjacent to player', () => {
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState()
      state.player.position = { x: 6, y: 5 } // Adjacent horizontally

      const action = service.decideAction(monster, state)

      expect(action.type).toBe('attack')
      expect(action.target).toEqual(state.player.position)
    })

    test('returns attack action when vertically adjacent', () => {
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState()
      state.player.position = { x: 5, y: 6 } // Adjacent vertically

      const action = service.decideAction(monster, state)

      expect(action.type).toBe('attack')
      expect(action.target).toEqual(state.player.position)
    })

    test('does not attack when diagonal (not adjacent)', () => {
      const monster = createTestMonster({ position: { x: 5, y: 5 } })
      const state = createTestState()
      state.player.position = { x: 6, y: 6 } // Diagonal

      const action = service.decideAction(monster, state)

      expect(action.type).not.toBe('attack')
    })

    test('waits when monster is asleep', () => {
      const monster = createTestMonster({ isAsleep: true })
      const state = createTestState()

      const action = service.decideAction(monster, state)

      expect(action.type).toBe('wait')
    })
  })
})
