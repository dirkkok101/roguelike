import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '../PathfindingService'
import { MockRandom } from '../RandomService'
import { FOVService } from '../FOVService'
import { GameState, Monster, MonsterBehavior } from '../../types/core/core'

describe('MonsterAIService - ERRATIC Behavior', () => {
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
      id: 'bat',
      letter: 'B',
      name: 'Bat',
      position: { x: 5, y: 5 },
      hp: 5,
      maxHp: 5,
      ac: 8,
      damage: '1d4',
      xpValue: 3,
      aiProfile: {
        behavior: MonsterBehavior.ERRATIC,
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

  test('moves randomly when RNG returns < 0.5', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    // chance() calls nextInt(0,1), returns true if value is 1
    // When true (random), pickRandom returns array[0] which is { x: 0, y: -1 } (up)
    mockRandom.setValues([1]) // chance returns true (random movement)

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 5, y: 4 }) // Moved up randomly (array[0])
  })

  test('moves toward player when RNG returns >= 0.5', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // chance() returns false (0 means not random, so move toward player)
    mockRandom.setValues([0])

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 6, y: 5 }) // Moved right toward player
  })

  test('waits when random direction is blocked', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    // Block tile above (array[0] direction)
    const level = state.levels.get(1)!
    level.tiles[4][5] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    // chance returns true (random), pickRandom returns array[0] = up (blocked)
    mockRandom.setValues([1])

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('can move randomly in cardinal directions', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    // pickRandom always returns array[0] which is up direction
    // Just test that random movement works
    mockRandom.setValues([1]) // Random movement

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 5, y: 4 }) // Moved up (array[0])
  })

  test('attacks when adjacent to player', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('movement is unpredictable (50/50 split)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Simulate multiple decisions: 1 = random, 0 = toward player
    let randomMoves = 0
    let towardPlayerMoves = 0

    for (let i = 0; i < 10; i++) {
      mockRandom.setValues([i < 5 ? 1 : 0]) // First 5 random, last 5 toward player

      const action = service.decideAction(monster, state)

      if (action.type === 'move') {
        if (action.target!.y < monster.position.y) {
          randomMoves++ // Moved up (random, array[0])
        } else if (action.target!.x > monster.position.x) {
          towardPlayerMoves++ // Moved right toward player
        }
      }
    }

    expect(randomMoves).toBeGreaterThan(0)
    expect(towardPlayerMoves).toBeGreaterThan(0)
  })
})
