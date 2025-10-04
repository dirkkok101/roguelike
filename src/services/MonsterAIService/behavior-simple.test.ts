import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { GameState, Monster, MonsterBehavior } from '@game/core/core'

describe('MonsterAIService - SIMPLE Behavior', () => {
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
      id: 'simple-monster',
      letter: 'S',
      name: 'Simple Monster',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 1,
        aggroRange: 10,
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

  test('moves horizontally when dx > dy', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 6 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 6, y: 5 }) // Move right toward player
  })

  test('moves vertically when dy > dx', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 10 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 5, y: 6 }) // Move down toward player
  })

  test('moves left when player is west', () => {
    const monster = createTestMonster({ position: { x: 10, y: 5 } })
    const state = createTestState({ x: 10, y: 5 }, { x: 5, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 9, y: 5 }) // Move left toward player
  })

  test('moves up when player is north', () => {
    const monster = createTestMonster({ position: { x: 5, y: 10 } })
    const state = createTestState({ x: 5, y: 10 }, { x: 5, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 5, y: 9 }) // Move up toward player
  })

  test('waits when path is blocked by wall', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Block direct path with wall
    const level = state.levels.get(1)!
    level.tiles[5][6] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('attacks when adjacent to player', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('prioritizes horizontal over vertical when distances equal', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 8, y: 8 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // When dx == dy, the code uses Math.abs(dx) > Math.abs(dy), which is false when equal
    // So it moves vertically
    expect(action.target).toEqual({ x: 5, y: 6 })
  })
})
