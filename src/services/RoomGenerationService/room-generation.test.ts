import { RoomGenerationService, RoomGenerationConfig } from './RoomGenerationService'
import { MockRandom, SeededRandom } from '@services/RandomService'
import { Room } from '@game/core/core'

describe('RoomGenerationService - Room Generation', () => {
  let service: RoomGenerationService
  let seededRandom: SeededRandom

  beforeEach(() => {
    // Use SeededRandom for generateRooms tests (need actual random values)
    seededRandom = new SeededRandom('test-room-gen')
    service = new RoomGenerationService(seededRandom)
  })

  const createTestConfig = (overrides?: Partial<RoomGenerationConfig>): RoomGenerationConfig => ({
    dungeonWidth: 80,
    dungeonHeight: 22,
    minRoomCount: 4,
    maxRoomCount: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    minSpacing: 2,
    ...overrides,
  })

  describe('generateRooms', () => {
    test('generates rooms within specified count range', () => {
      const config = createTestConfig()
      const rooms = service.generateRooms(config)

      expect(rooms.length).toBeGreaterThanOrEqual(config.minRoomCount)
      expect(rooms.length).toBeLessThanOrEqual(config.maxRoomCount)
    })

    test('generates rooms with unique IDs', () => {
      const config = createTestConfig()
      const rooms = service.generateRooms(config)

      const ids = rooms.map((r) => r.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(rooms.length)
    })

    test('generates rooms within dungeon bounds', () => {
      const config = createTestConfig()
      const rooms = service.generateRooms(config)

      for (const room of rooms) {
        expect(room.x).toBeGreaterThanOrEqual(1)
        expect(room.y).toBeGreaterThanOrEqual(1)
        expect(room.x + room.width).toBeLessThan(config.dungeonWidth)
        expect(room.y + room.height).toBeLessThan(config.dungeonHeight)
      }
    })

    test('generates rooms with sizes in specified range', () => {
      const config = createTestConfig()
      const rooms = service.generateRooms(config)

      for (const room of rooms) {
        expect(room.width).toBeGreaterThanOrEqual(config.minRoomSize)
        expect(room.width).toBeLessThanOrEqual(config.maxRoomSize)
        expect(room.height).toBeGreaterThanOrEqual(config.minRoomSize)
        expect(room.height).toBeLessThanOrEqual(config.maxRoomSize)
      }
    })

    test('generates non-overlapping rooms', () => {
      const config = createTestConfig()
      const rooms = service.generateRooms(config)

      // Check all pairs of rooms
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          const overlap = service.roomsOverlap(rooms[i], rooms[j], config.minSpacing)
          expect(overlap).toBe(false)
        }
      }
    })

    test('respects minimum spacing between rooms', () => {
      const config = createTestConfig({ minSpacing: 3 })
      const rooms = service.generateRooms(config)

      // Check all pairs have at least minSpacing between them
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          // Manually check spacing
          const room1 = rooms[i]
          const room2 = rooms[j]

          const horizontalGap = Math.min(
            Math.abs(room1.x - (room2.x + room2.width)),
            Math.abs(room2.x - (room1.x + room1.width))
          )

          const verticalGap = Math.min(
            Math.abs(room1.y - (room2.y + room2.height)),
            Math.abs(room2.y - (room1.y + room1.height))
          )

          // At least one dimension should have spacing
          const hasSpacing = horizontalGap >= config.minSpacing || verticalGap >= config.minSpacing
          expect(hasSpacing).toBe(true)
        }
      }
    })

    test('handles small dungeon gracefully', () => {
      const config = createTestConfig({
        dungeonWidth: 20,
        dungeonHeight: 10,
        minRoomCount: 2,
        maxRoomCount: 4,
        minRoomSize: 3,
        maxRoomSize: 5,
      })

      const rooms = service.generateRooms(config)

      expect(rooms.length).toBeGreaterThan(0)
      expect(rooms.length).toBeLessThanOrEqual(config.maxRoomCount)
    })

    test('returns empty array when no rooms can fit', () => {
      const config = createTestConfig({
        dungeonWidth: 5,
        dungeonHeight: 5,
        minRoomCount: 10,
        maxRoomCount: 20,
        minRoomSize: 10,
        maxRoomSize: 15,
      })

      const rooms = service.generateRooms(config)

      expect(rooms).toEqual([])
    })
  })

  describe('canPlaceRoom', () => {
    // Unit tests - no random needed, create fresh service
    let unitTestService: RoomGenerationService

    beforeEach(() => {
      const mockRandom = new MockRandom([])
      unitTestService = new RoomGenerationService(mockRandom)
    })

    test('allows placing first room', () => {
      const room: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const existingRooms: Room[] = []

      const result = unitTestService.canPlaceRoom(room, existingRooms, 2)

      expect(result).toBe(true)
    })

    test('rejects room that overlaps existing room', () => {
      const existingRoom: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const overlappingRoom: Room = { id: 1, x: 7, y: 7, width: 5, height: 5 }
      const existingRooms = [existingRoom]

      const result = unitTestService.canPlaceRoom(overlappingRoom, existingRooms, 2)

      expect(result).toBe(false)
    })

    test('allows room with sufficient spacing', () => {
      const existingRoom: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const newRoom: Room = { id: 1, x: 15, y: 15, width: 5, height: 5 }
      const existingRooms = [existingRoom]

      const result = unitTestService.canPlaceRoom(newRoom, existingRooms, 2)

      expect(result).toBe(true)
    })

    test('checks against all existing rooms', () => {
      const existingRooms: Room[] = [
        { id: 0, x: 5, y: 5, width: 5, height: 5 },
        { id: 1, x: 20, y: 5, width: 5, height: 5 },
        { id: 2, x: 35, y: 5, width: 5, height: 5 },
      ]
      const overlappingRoom: Room = { id: 3, x: 22, y: 7, width: 5, height: 5 }

      const result = unitTestService.canPlaceRoom(overlappingRoom, existingRooms, 2)

      expect(result).toBe(false)
    })
  })

  describe('roomsOverlap', () => {
    // Unit tests - no random needed, create fresh service
    let unitTestService: RoomGenerationService

    beforeEach(() => {
      const mockRandom = new MockRandom([])
      unitTestService = new RoomGenerationService(mockRandom)
    })

    test('detects exact overlap', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 5, y: 5, width: 5, height: 5 }

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(true)
    })

    test('detects partial overlap', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 8, y: 8, width: 5, height: 5 }

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(true)
    })

    test('detects no overlap when rooms are separated', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 15, y: 15, width: 5, height: 5 }

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(false)
    })

    test('respects spacing buffer', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 11, y: 5, width: 5, height: 5 } // 1 tile gap

      // With no spacing, they don't overlap
      expect(unitTestService.roomsOverlap(room1, room2, 0)).toBe(false)

      // With spacing of 2, they overlap
      expect(unitTestService.roomsOverlap(room1, room2, 2)).toBe(true)
    })

    test('detects overlap in horizontal direction only', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 7, y: 20, width: 5, height: 5 }

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(false)
    })

    test('detects overlap in vertical direction only', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 20, y: 7, width: 5, height: 5 }

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(false)
    })

    test('handles adjacent rooms (touching edges)', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 10, y: 5, width: 5, height: 5 } // Touches right edge

      const result = unitTestService.roomsOverlap(room1, room2, 0)

      expect(result).toBe(false)
    })

    test('enforces spacing with adjacent rooms', () => {
      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 10, y: 5, width: 5, height: 5 } // Touches right edge

      const result = unitTestService.roomsOverlap(room1, room2, 1)

      expect(result).toBe(true)
    })
  })
})
