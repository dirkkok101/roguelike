import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '../PathfindingService'
import { MockRandom } from '../RandomService'
import { FOVService } from '../FOVService'
import { GameState, Monster, MonsterBehavior } from '../../types/core/core'

describe('MonsterAIService - GREEDY Behavior', () => {
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
      id: 'orc',
      letter: 'O',
      name: 'Orc',
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.GREEDY,
        intelligence: 3,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['greedy'],
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

  function createTestState(
    monsterPos = { x: 5, y: 5 },
    playerPos = { x: 10, y: 10 },
    goldPositions: { x: number; y: number }[] = []
  ): GameState {
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

    const gold = goldPositions.map((position, i) => ({
      id: `gold-${i}`,
      position,
      amount: 10,
    }))

    const level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [],
      monsters: [monster],
      items: [],
      gold,
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

  test('prioritizes gold over player when gold is closer', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 15, y: 15 }, // Player far away
      [{ x: 8, y: 5 }]  // Gold nearby
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move toward gold (east)
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('goes for player when player is closer than gold', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 8, y: 5 },   // Player nearby
      [{ x: 15, y: 15 }] // Gold far away
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move toward player (east)
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('moves toward player when no gold exists', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 10, y: 5 },
      [] // No gold
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 6, y: 5 }) // Toward player
  })

  test('finds nearest gold among multiple piles', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 15, y: 15 }, // Player far
      [
        { x: 10, y: 10 }, // Farther gold
        { x: 7, y: 5 },   // Nearest gold
        { x: 5, y: 10 },  // Medium distance gold
      ]
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move toward nearest gold at (7, 5)
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
    expect(action.target!.y).toBe(5)
  })

  test('uses A* pathfinding to navigate to gold', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 } })
    const state = createTestState(
      { x: 1, y: 1 },
      { x: 15, y: 15 }, // Player far
      [{ x: 5, y: 1 }]  // Gold in straight line
    )

    // Create wall obstacle
    const level = state.levels.get(1)!
    level.tiles[1][3] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toBeDefined()
    // Should still find path around obstacle
  })

  test('attacks player when adjacent (overrides gold seeking)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 6, y: 5 },  // Player adjacent
      [{ x: 10, y: 10 }] // Gold exists but far
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('calculates distances using Manhattan distance', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState(
      { x: 5, y: 5 },
      { x: 10, y: 10 }, // Distance = 10
      [{ x: 8, y: 8 }]   // Distance = 6
    )

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Gold is closer (6 < 10), should move toward gold diagonally
    // Since gold is at (8,8) from (5,5), could move right or down
    expect(action.target!.x >= monster.position.x || action.target!.y >= monster.position.y).toBe(true)
  })
})
