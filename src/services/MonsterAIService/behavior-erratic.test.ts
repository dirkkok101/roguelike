import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '@services/PathfindingService'
import { LevelService } from '@services/LevelService'
import { MockRandom } from '@services/RandomService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Monster, MonsterBehavior } from '@game/core/core'

describe('MonsterAIService - ERRATIC Behavior', () => {
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
      id: 'bat',
      letter: 'B',
      name: 'Bat',
      spriteName: 'Bat',
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
      speed: 10,
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

  test('always moves randomly (100% erratic)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    // pickRandom returns array[0] which is { x: 0, y: -1 } (up)
    // Matches original Rogue where Bats "always moved as if confused"
    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toEqual({ x: 5, y: 4 }) // Moved up randomly (array[0])
  })

  test('never moves toward player (no player-seeking)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Even with player directly to the right, monster moves randomly
    // pickRandom always returns array[0] (up direction)
    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move up (random), NOT right toward player
    expect(action.target).toEqual({ x: 5, y: 4 })
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

    // pickRandom returns array[0] = up (blocked)
    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('can move randomly in any cardinal direction', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    // pickRandom always returns array[0] which is up direction
    // In real game, pickRandom would vary based on RNG
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

  test('movement is always random (100% unpredictable)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 } })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Simulate multiple decisions - all should be random (never toward player)
    // With MockRandom, pickRandom always returns array[0] (up direction)
    let randomMoves = 0

    for (let i = 0; i < 10; i++) {
      const action = service.decideAction(monster, state)

      if (action.type === 'move') {
        // MockRandom's pickRandom always returns array[0] (up)
        if (action.target!.y < monster.position.y) {
          randomMoves++ // Moved up (random, array[0])
        }
      }
    }

    // All 10 moves should be random (up direction)
    expect(randomMoves).toBe(10)
  })
})
