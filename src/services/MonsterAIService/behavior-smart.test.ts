import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Monster, MonsterBehavior } from '@game/core/core'

describe('MonsterAIService - SMART Behavior', () => {
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
      id: 'smart-monster',
      letter: 'S',
      name: 'Smart Monster',
      spriteName: 'Smart Monster',
      position: { x: 1, y: 1 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d6',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SMART,
        intelligence: 10,
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
      speed: 10,
      ...overrides,
    }
  }

  function createTestState(monsterPos = { x: 1, y: 1 }, playerPos = { x: 5, y: 5 }): GameState {
    const monster = createTestMonster({ position: monsterPos })

    const tiles = Array(10)
      .fill(null)
      .map(() =>
        Array(10)
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
      width: 10,
      height: 10,
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

  test('uses A* pathfinding to navigate toward player', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 } })
    const state = createTestState({ x: 1, y: 1 }, { x: 5, y: 1 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toBeDefined()
    // Should move one step toward player
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
    expect(action.target!.y).toBe(monster.position.y)
  })

  test('navigates around obstacles using A*', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 } })
    const state = createTestState({ x: 1, y: 1 }, { x: 3, y: 1 })

    // Create wall obstacle
    const level = state.levels.get(1)!
    level.tiles[1][2] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    const action = service.decideAction(monster, state)

    // Should still find a path around the wall
    expect(action.type).toBe('move')
    expect(action.target).toBeDefined()
  })

  test('waits when no path to player exists', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 } })
    const state = createTestState({ x: 1, y: 1 }, { x: 5, y: 5 })

    // Surround player with walls
    const level = state.levels.get(1)!
    for (let x = 4; x <= 6; x++) {
      for (let y = 4; y <= 6; y++) {
        if (x === 5 && y === 5) continue // Player position
        level.tiles[y][x] = {
          type: 'WALL',
          walkable: false,
          transparent: false,
          visible: false,
          explored: false,
          lit: false,
        }
      }
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

  test('finds shortest path in open area', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 } })
    const state = createTestState({ x: 1, y: 1 }, { x: 4, y: 4 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toBeDefined()

    // Should move one cardinal step toward player
    const dx = Math.abs(action.target!.x - monster.position.x)
    const dy = Math.abs(action.target!.y - monster.position.y)
    expect(dx + dy).toBe(1)
  })
})
