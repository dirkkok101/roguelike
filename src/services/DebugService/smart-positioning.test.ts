import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, Room, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('DebugService - Smart Positioning', () => {
  let debugService: DebugService
  let mockRandom: MockRandom
  let originalFetch: typeof global.fetch

  // Mock monster data
  const mockMonsterData = [
    {
      letter: 'D',
      name: 'Dragon',
      hp: '10d8',
      ac: -1,
      damage: '1d8+3d10',
      xpValue: 5000,
      level: 10,
      speed: 18,
      rarity: 'rare',
      mean: true,
      aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 15, fleeThreshold: 0.15, special: [] },
    },
  ]

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMonsterData,
    } as Response)
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  beforeEach(async () => {
    const messageService = new MessageService()
    mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)
  })

  // Helper to create a simple level with rooms
  function createTestLevel(rooms: Room[]): Level {
    const width = 40
    const height = 20

    // Initialize floor tiles
    const tiles = Array(height)
      .fill(null)
      .map((_, y) =>
        Array(width)
          .fill(null)
          .map((_, x) => ({
            type: TileType.FLOOR,
            walkable: true,
            transparent: true,
            position: { x, y },
            char: '.',
            colorVisible: '#fff',
            colorExplored: '#888',
          }))
      )

    const explored = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false))

    return {
      depth: 1,
      width,
      height,
      tiles,
      explored,
      rooms,
      monsters: [],
      items: [],
      doors: [],
      traps: [],
      stairs: { up: null, down: { x: 10, y: 10 } },
    }
  }

  describe('findPlayerRoom', () => {
    test('returns room when player is inside room', () => {
      const rooms: Room[] = [
        { x: 5, y: 5, width: 10, height: 8 },
        { x: 20, y: 10, width: 8, height: 6 },
      ]
      const level = createTestLevel(rooms)
      const playerPos = { x: 10, y: 10 } // Inside first room

      // Access private method via any cast
      const room = (debugService as any).findPlayerRoom(level, playerPos)

      expect(room).toEqual(rooms[0])
    })

    test('returns null when player is in corridor', () => {
      const rooms: Room[] = [
        { x: 5, y: 5, width: 10, height: 8 },
        { x: 20, y: 10, width: 8, height: 6 },
      ]
      const level = createTestLevel(rooms)
      const playerPos = { x: 18, y: 10 } // Between rooms (corridor)

      const room = (debugService as any).findPlayerRoom(level, playerPos)

      expect(room).toBeNull()
    })

    test('returns correct room when player at room edge', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const playerPos = { x: 5, y: 5 } // Top-left corner

      const room = (debugService as any).findPlayerRoom(level, playerPos)

      expect(room).toEqual(rooms[0])
    })

    test('returns null when player outside all rooms', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const playerPos = { x: 0, y: 0 } // Far from any room

      const room = (debugService as any).findPlayerRoom(level, playerPos)

      expect(room).toBeNull()
    })
  })

  describe('findNearestRoom', () => {
    test('finds nearest room by Manhattan distance', () => {
      const rooms: Room[] = [
        { x: 5, y: 5, width: 10, height: 8 }, // Center at (10, 9)
        { x: 25, y: 10, width: 8, height: 6 }, // Center at (29, 13)
      ]
      const level = createTestLevel(rooms)
      const playerPos = { x: 12, y: 10 } // Closer to first room

      const room = (debugService as any).findNearestRoom(level, playerPos)

      expect(room).toEqual(rooms[0])
    })

    test('finds second room when closer', () => {
      const rooms: Room[] = [
        { x: 5, y: 5, width: 10, height: 8 },
        { x: 25, y: 10, width: 8, height: 6 },
      ]
      const level = createTestLevel(rooms)
      const playerPos = { x: 30, y: 12 } // Closer to second room

      const room = (debugService as any).findNearestRoom(level, playerPos)

      expect(room).toEqual(rooms[1])
    })

    test('returns first room when multiple rooms at same distance', () => {
      const rooms: Room[] = [
        { x: 5, y: 10, width: 8, height: 6 },
        { x: 20, y: 10, width: 8, height: 6 },
      ]
      const level = createTestLevel(rooms)
      const playerPos = { x: 15, y: 12 } // Equidistant from both

      const room = (debugService as any).findNearestRoom(level, playerPos)

      // Should return first room (deterministic behavior)
      expect(room).toEqual(rooms[0])
    })

    test('returns null when no rooms exist', () => {
      const rooms: Room[] = []
      const level = createTestLevel(rooms)
      const playerPos = { x: 10, y: 10 }

      const room = (debugService as any).findNearestRoom(level, playerPos)

      expect(room).toBeNull()
    })
  })

  describe('isValidSpawnPosition', () => {
    test('returns true for valid floor position', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const pos = { x: 10, y: 10 }

      const isValid = (debugService as any).isValidSpawnPosition(level, pos)

      expect(isValid).toBe(true)
    })

    test('returns false for position with monster', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      level.monsters = [
        {
          id: 'test-monster',
          position: { x: 10, y: 10 },
        } as any,
      ]
      const pos = { x: 10, y: 10 }

      const isValid = (debugService as any).isValidSpawnPosition(level, pos)

      expect(isValid).toBe(false)
    })

    test('returns false for position with item', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      level.items = [
        {
          id: 'test-item',
          position: { x: 10, y: 10 },
        } as any,
      ]
      const pos = { x: 10, y: 10 }

      const isValid = (debugService as any).isValidSpawnPosition(level, pos)

      expect(isValid).toBe(false)
    })

    test('returns false for non-floor tile', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      level.tiles[10][10].type = TileType.WALL
      const pos = { x: 10, y: 10 }

      const isValid = (debugService as any).isValidSpawnPosition(level, pos)

      expect(isValid).toBe(false)
    })

    test('returns false for out of bounds position', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const pos = { x: -1, y: 10 }

      const isValid = (debugService as any).isValidSpawnPosition(level, pos)

      expect(isValid).toBe(false)
    })
  })

  describe('findRandomPositionInRoom', () => {
    test('returns position inside room', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)

      // MockRandom.pickRandom returns first element
      const pos = (debugService as any).findRandomPositionInRoom(level, rooms[0])

      expect(pos).toBeDefined()
      expect(pos!.x).toBeGreaterThanOrEqual(5)
      expect(pos!.x).toBeLessThan(15)
      expect(pos!.y).toBeGreaterThanOrEqual(5)
      expect(pos!.y).toBeLessThan(13)
    })

    test('returns null when room has no valid positions', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 3, height: 3 }]
      const level = createTestLevel(rooms)

      // Fill room with monsters
      for (let y = 5; y < 8; y++) {
        for (let x = 5; x < 8; x++) {
          level.monsters.push({
            id: `monster-${x}-${y}`,
            position: { x, y },
          } as any)
        }
      }

      const pos = (debugService as any).findRandomPositionInRoom(level, rooms[0])

      expect(pos).toBeNull()
    })
  })

  describe('getPositionsInRadius', () => {
    test('returns positions within Manhattan distance 1', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const center = { x: 10, y: 10 }

      const positions = (debugService as any).getPositionsInRadius(center, 1, level)

      // Manhattan distance 1 should give 4 positions (up, down, left, right)
      expect(positions.length).toBe(4)
      expect(positions).toContainEqual({ x: 9, y: 10 })
      expect(positions).toContainEqual({ x: 11, y: 10 })
      expect(positions).toContainEqual({ x: 10, y: 9 })
      expect(positions).toContainEqual({ x: 10, y: 11 })
    })

    test('returns positions within Manhattan distance 2', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const center = { x: 10, y: 10 }

      const positions = (debugService as any).getPositionsInRadius(center, 2, level)

      // Manhattan distance 2 should give 12 positions
      expect(positions.length).toBe(12)
      expect(positions).toContainEqual({ x: 8, y: 10 })
      expect(positions).toContainEqual({ x: 12, y: 10 })
      expect(positions).toContainEqual({ x: 10, y: 8 })
      expect(positions).toContainEqual({ x: 10, y: 12 })
    })

    test('excludes center position', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const center = { x: 10, y: 10 }

      const positions = (debugService as any).getPositionsInRadius(center, 2, level)

      expect(positions).not.toContainEqual(center)
    })

    test('respects level boundaries', () => {
      const rooms: Room[] = [{ x: 0, y: 0, width: 5, height: 5 }]
      const level = createTestLevel(rooms)
      const center = { x: 0, y: 0 } // At corner

      const positions = (debugService as any).getPositionsInRadius(center, 2, level)

      // All positions should be within bounds
      positions.forEach((pos: any) => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThan(level.width)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThan(level.height)
      })
    })
  })

  describe('findSpawnPosition (integration)', () => {
    test('spawns near player when player in room', () => {
      const rooms: Room[] = [{ x: 5, y: 5, width: 10, height: 8 }]
      const level = createTestLevel(rooms)
      const player = {
        position: { x: 10, y: 10 },
      } as any

      const state: GameState = {
        currentLevel: 1,
        levels: new Map([[1, level]]),
        player,
      } as GameState

      // Set radius to 2 for nextInt(1, 3) call
      mockRandom.setValues([2])

      const pos = (debugService as any).findSpawnPosition(state)

      expect(pos).toBeDefined()
      // Should be within 2 tiles of player (the radius we set)
      const distance = Math.abs(pos!.x - 10) + Math.abs(pos!.y - 10)
      expect(distance).toBeLessThanOrEqual(2)
    })

    test('spawns in nearest room when player in corridor', () => {
      const rooms: Room[] = [
        { x: 5, y: 5, width: 10, height: 8 },
        { x: 25, y: 10, width: 8, height: 6 },
      ]
      const level = createTestLevel(rooms)
      const player = {
        position: { x: 18, y: 10 }, // In corridor between rooms
      } as any

      const state: GameState = {
        currentLevel: 1,
        levels: new Map([[1, level]]),
        player,
      } as GameState

      // MockRandom.pickRandom returns first valid position in room

      const pos = (debugService as any).findSpawnPosition(state)

      expect(pos).toBeDefined()
      // Should be in one of the rooms (closer room preferred)
      const inRoom1 = pos!.x >= 5 && pos!.x < 15 && pos!.y >= 5 && pos!.y < 13
      const inRoom2 = pos!.x >= 25 && pos!.x < 33 && pos!.y >= 10 && pos!.y < 16
      expect(inRoom1 || inRoom2).toBe(true)
    })

    test('returns null when no valid positions available', () => {
      const rooms: Room[] = []
      const level = createTestLevel(rooms)
      const player = {
        position: { x: 10, y: 10 },
      } as any

      const state: GameState = {
        currentLevel: 1,
        levels: new Map([[1, level]]),
        player,
      } as GameState

      const pos = (debugService as any).findSpawnPosition(state)

      expect(pos).toBeNull()
    })
  })
})
