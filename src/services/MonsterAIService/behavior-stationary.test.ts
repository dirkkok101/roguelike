import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '../PathfindingService'
import { MockRandom } from '../RandomService'
import { FOVService } from '../FOVService'
import { GameState, Monster, MonsterBehavior } from '../../types/core/core'

describe('MonsterAIService - STATIONARY Behavior', () => {
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
      id: 'venus-flytrap',
      letter: 'V',
      name: 'Venus Flytrap',
      position: { x: 5, y: 5 },
      hp: 15,
      maxHp: 15,
      ac: 7,
      damage: '2d6',
      xpValue: 20,
      aiProfile: {
        behavior: MonsterBehavior.STATIONARY,
        intelligence: 1,
        aggroRange: 1,
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
      ...overrides,
    }
  }

  function createTestState(monsterPos = { x: 5, y: 5 }, playerPos = { x: 10, y: 10 }): GameState {
    const monster = createTestMonster({ position: monsterPos })

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
      player: {
        position: playerPos,
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
      },
      levels: new Map([[1, level]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  test('never moves when player is far away', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 15, y: 15 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('never moves when player is nearby', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 7, y: 7 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('attacks when player is adjacent', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('waits in all cardinal directions when player not adjacent', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })

    const playerPositions = [
      { x: 5, y: 3 }, // 2 tiles north
      { x: 5, y: 7 }, // 2 tiles south
      { x: 3, y: 5 }, // 2 tiles west
      { x: 7, y: 5 }, // 2 tiles east
    ]

    for (const playerPos of playerPositions) {
      const state = createTestState({ x: 5, y: 5 }, playerPos)
      const action = service.decideAction(monster, state)

      expect(action.type).toBe('wait')
    }
  })

  test('attacks from all adjacent positions', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })

    const adjacentPositions = [
      { x: 5, y: 4 }, // north
      { x: 5, y: 6 }, // south
      { x: 4, y: 5 }, // west
      { x: 6, y: 5 }, // east
    ]

    for (const playerPos of adjacentPositions) {
      const state = createTestState({ x: 5, y: 5 }, playerPos)
      const action = service.decideAction(monster, state)

      expect(action.type).toBe('attack')
      expect(action.target).toEqual(playerPos)
    }
  })

  test('never moves regardless of HP', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hp: 1, maxHp: 15 })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('never moves when asleep', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, isAsleep: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 6 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('always returns wait action for STATIONARY behavior', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })

    // Test multiple turns
    for (let i = 0; i < 10; i++) {
      const playerPos = { x: 10 + i, y: 10 + i }
      const state = createTestState({ x: 5, y: 5 }, playerPos)
      const action = service.decideAction(monster, state)

      expect(action.type).toBe('wait')
    }
  })
})
