import { MovementService } from './MovementService'
import {
  Level,
  TileType,
  Position,
  Monster,
  Door,
  DoorState,
  MonsterBehavior,
  MonsterState
} from '@game/core/core'

describe('MovementService - Obstacle Detection', () => {
  let service: MovementService

  beforeEach(() => {
    service = new MovementService()
  })

  function createTestLevel(): Level {
    const tiles = Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#666',
          }))
      )

    // Add a wall at (5, 5)
    tiles[5][5] = {
      type: TileType.WALL,
      char: '#',
      walkable: false,
      transparent: false,
      colorVisible: '#888',
      colorExplored: '#444',
    }

    return {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      rooms: [],
      doors: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(10)
        .fill(null)
        .map(() => Array(10).fill(false)),
    }
  }

  const createTestMonster = (x: number, y: number, letter: string): Monster => ({
    id: `monster-${letter}`,
    letter,
    name: 'Test Monster',
    position: { x, y },
    hp: 10,
    maxHp: 10,
    ac: 5,
    damage: '1d6',
    xpValue: 10,
    aiProfile: {
      behavior: MonsterBehavior.SIMPLE,
      intelligence: 5,
      aggroRange: 5,
      fleeThreshold: 0.3,
      special: [],
    },
    isAsleep: true,
    isAwake: false,
    state: MonsterState.SLEEPING,
    visibleCells: new Set(),
    currentPath: null,
    hasStolen: false,
    level: 1,
  })

  const createTestDoor = (
    x: number,
    y: number,
    state: DoorState,
    discovered: boolean = true
  ): Door => ({
    id: `door-${x}-${y}`,
    position: { x, y },
    state,
    discovered,
  })

  describe('detectObstacle()', () => {
    test('detects monster at position', () => {
      const level = createTestLevel()
      const monster = createTestMonster(3, 3, 'T')
      level.monsters = [monster]

      const result = service.detectObstacle({ x: 3, y: 3 }, level)

      expect(result.type).toBe('monster')
      expect(result.data).toEqual(monster)
    })

    test('detects closed door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.CLOSED)
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('door')
      expect(result.data).toEqual(door)
    })

    test('detects locked door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.LOCKED)
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('door')
      expect(result.data).toEqual(door)
    })

    test('detects undiscovered secret door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.SECRET, false) // Not discovered
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('door')
      expect(result.data).toEqual(door)
    })

    test('does NOT detect discovered secret door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.SECRET, true) // Discovered
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('none') // Not blocking
    })

    test('does NOT detect open door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.OPEN)
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('none') // Not blocking
    })

    test('does NOT detect broken door as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.BROKEN)
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('none') // Not blocking
    })

    test('does NOT detect archway as blocking', () => {
      const level = createTestLevel()
      const door = createTestDoor(4, 4, DoorState.ARCHWAY)
      level.doors = [door]

      const result = service.detectObstacle({ x: 4, y: 4 }, level)

      expect(result.type).toBe('none') // Not blocking
    })

    test('detects wall at position', () => {
      const level = createTestLevel()

      const result = service.detectObstacle({ x: 5, y: 5 }, level) // Wall position

      expect(result.type).toBe('wall')
      expect(result.data).toBeUndefined()
    })

    test('returns none for empty floor', () => {
      const level = createTestLevel()

      const result = service.detectObstacle({ x: 2, y: 2 }, level)

      expect(result.type).toBe('none')
      expect(result.data).toBeUndefined()
    })

    test('prioritizes monster over door', () => {
      const level = createTestLevel()
      const monster = createTestMonster(3, 3, 'T')
      const door = createTestDoor(3, 3, DoorState.CLOSED)
      level.monsters = [monster]
      level.doors = [door]

      const result = service.detectObstacle({ x: 3, y: 3 }, level)

      expect(result.type).toBe('monster') // Monster detected first
      expect(result.data).toEqual(monster)
    })

    test('prioritizes door over wall', () => {
      const level = createTestLevel()
      const door = createTestDoor(5, 5, DoorState.CLOSED)
      level.doors = [door]
      // Position (5, 5) is a wall in our test level

      const result = service.detectObstacle({ x: 5, y: 5 }, level)

      expect(result.type).toBe('door') // Door detected before wall check
      expect(result.data).toEqual(door)
    })

    test('detects wall when out of bounds', () => {
      const level = createTestLevel()

      const result = service.detectObstacle({ x: -1, y: 5 }, level)

      expect(result.type).toBe('wall') // Out of bounds = not walkable = wall
    })

    test('detects wall when position exceeds bounds', () => {
      const level = createTestLevel()

      const result = service.detectObstacle({ x: 15, y: 5 }, level)

      expect(result.type).toBe('wall') // Out of bounds = not walkable = wall
    })
  })
})
