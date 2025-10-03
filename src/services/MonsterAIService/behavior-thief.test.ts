import { MonsterAIService } from './MonsterAIService'
import { PathfindingService } from '../PathfindingService'
import { MockRandom } from '../RandomService'
import { FOVService } from '../FOVService'
import { GameState, Monster, MonsterBehavior } from '../../types/core/core'

describe('MonsterAIService - THIEF Behavior', () => {
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
      id: 'leprechaun',
      letter: 'L',
      name: 'Leprechaun',
      position: { x: 5, y: 5 },
      hp: 8,
      maxHp: 8,
      ac: 8,
      damage: '1d4',
      xpValue: 15,
      aiProfile: {
        behavior: MonsterBehavior.THIEF,
        intelligence: 5,
        aggroRange: 10,
        fleeThreshold: 0,
        special: ['steals'],
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

  test('approaches player using A* before stealing', () => {
    const monster = createTestMonster({ position: { x: 1, y: 1 }, hasStolen: false })
    const state = createTestState({ x: 1, y: 1 }, { x: 5, y: 1 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    expect(action.target).toBeDefined()
    // Should move toward player
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('flees from player after stealing', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move away from player (west)
    expect(action.target!.x).toBeLessThan(monster.position.x)
  })

  test('continues fleeing after stealing', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 2, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Should move away (east, opposite of player)
    expect(action.target!.x).toBeGreaterThan(monster.position.x)
  })

  test('flees vertically when closer in y-axis', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 10 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('move')
    // Player is south, should flee north
    expect(action.target!.y).toBeLessThan(monster.position.y)
  })

  test('tries perpendicular direction when primary flee blocked', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Block westward flee
    const level = state.levels.get(1)!
    level.tiles[5][4] = {
      type: 'WALL',
      walkable: false,
      transparent: false,
      visible: false,
      explored: false,
      lit: false,
    }

    const action = service.decideAction(monster, state)

    if (action.type === 'move') {
      // Should try perpendicular (north or south)
      expect(action.target!.y).not.toBe(monster.position.y)
    } else {
      expect(action.type).toBe('wait')
    }
  })

  test('waits when completely trapped', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: true })
    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 5 })

    // Surround monster with walls
    const level = state.levels.get(1)!
    const surroundingPositions = [
      { x: 4, y: 5 }, { x: 6, y: 5 }, // left, right
      { x: 5, y: 4 }, { x: 5, y: 6 }, // up, down
      { x: 4, y: 4 }, { x: 5, y: 4 }, // diagonals (not used but block perpendicular)
    ]

    for (const pos of surroundingPositions) {
      level.tiles[pos.y][pos.x] = {
        type: 'WALL',
        walkable: false,
        transparent: false,
        visible: false,
        explored: false,
        lit: false,
      }
    }

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('wait')
  })

  test('attacks when adjacent before stealing (steal happens in combat)', () => {
    const monster = createTestMonster({ position: { x: 5, y: 5 }, hasStolen: false })
    const state = createTestState({ x: 5, y: 5 }, { x: 6, y: 5 })

    const action = service.decideAction(monster, state)

    expect(action.type).toBe('attack')
    expect(action.target).toEqual({ x: 6, y: 5 })
  })

  test('state transitions to FLEEING after stealing', () => {
    const monster = createTestMonster({
      position: { x: 5, y: 5 },
      hasStolen: true,
      state: 'HUNTING',
    })

    const state = createTestState({ x: 5, y: 5 }, { x: 10, y: 10 })

    const updated = service.updateMonsterState(monster, state)

    expect(updated.state).toBe('FLEEING')
  })
})
