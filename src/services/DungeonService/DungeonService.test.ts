import { DungeonService, DungeonConfig } from './DungeonService'
import { CorridorGenerationService } from '@services/CorridorGenerationService'
import { SeededRandom } from '@services/RandomService'

describe('DungeonService', () => {
  const seed = 'test-dungeon-seed'
  const random = new SeededRandom(seed)
  const dungeonService = new DungeonService(random)
  const corridorService = new CorridorGenerationService(random)

  const defaultConfig: DungeonConfig = {
    width: 80,
    height: 22,
    minRooms: 4,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    minSpacing: 2,
    loopChance: 0.25,
  }

  describe('generateLevel', () => {
    test('should generate a level with the correct dimensions', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.width).toBe(defaultConfig.width)
      expect(level.height).toBe(defaultConfig.height)
      expect(level.tiles.length).toBe(defaultConfig.height)
      expect(level.tiles[0].length).toBe(defaultConfig.width)
    })

    test('should generate rooms within the min/max range', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.rooms.length).toBeGreaterThanOrEqual(defaultConfig.minRooms)
      expect(level.rooms.length).toBeLessThanOrEqual(defaultConfig.maxRooms)
    })

    test('should create rooms with correct size constraints', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      for (const room of level.rooms) {
        expect(room.width).toBeGreaterThanOrEqual(defaultConfig.minRoomSize)
        expect(room.width).toBeLessThanOrEqual(defaultConfig.maxRoomSize)
        expect(room.height).toBeGreaterThanOrEqual(defaultConfig.minRoomSize)
        expect(room.height).toBeLessThanOrEqual(defaultConfig.maxRoomSize)
      }
    })

    test('should have stairs down on level 1', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.stairsDown).not.toBeNull()
      expect(level.stairsUp).toBeNull()
    })

    test('should have both stairs on deeper levels', () => {
      const level = dungeonService.generateLevel(5, defaultConfig)

      expect(level.stairsDown).not.toBeNull()
      expect(level.stairsUp).not.toBeNull()
    })

    test('should initialize explored array correctly', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.explored.length).toBe(defaultConfig.height)
      expect(level.explored[0].length).toBe(defaultConfig.width)
      expect(level.explored[0][0]).toBe(false)
    })
  })

  // Note: Room placement tests now in RoomGenerationService
  // Note: MST and corridor tests now in CorridorGenerationService

  describe('buildRoomGraph', () => {
    test('should create edges between all room pairs', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)
      const rooms = level.rooms
      const graph = corridorService.buildRoomGraph(rooms)

      expect(graph.length).toBe(rooms.length)

      // Each node should have edges to all other nodes
      for (const node of graph) {
        expect(node.edges.length).toBe(rooms.length - 1)
      }
    })

    test('should calculate positive distances', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)
      const rooms = level.rooms
      const graph = corridorService.buildRoomGraph(rooms)

      for (const node of graph) {
        for (const edge of node.edges) {
          expect(edge.weight).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('generateMST', () => {
    test('should connect all rooms with N-1 edges', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)
      const rooms = level.rooms
      const graph = corridorService.buildRoomGraph(rooms)
      const mstEdges = corridorService.generateMST(graph)

      // MST should have exactly N-1 edges for N nodes
      expect(mstEdges.length).toBe(rooms.length - 1)
    })

    test('should create a connected tree', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)
      const rooms = level.rooms
      const graph = corridorService.buildRoomGraph(rooms)
      const mstEdges = corridorService.generateMST(graph)

      // Verify all rooms are reachable via MST
      const visited = new Set<number>()
      const queue: number[] = [0]
      visited.add(0)

      while (queue.length > 0) {
        const current = queue.shift()!

        for (const edge of mstEdges) {
          if (edge.from === current && !visited.has(edge.to)) {
            visited.add(edge.to)
            queue.push(edge.to)
          } else if (edge.to === current && !visited.has(edge.from)) {
            visited.add(edge.from)
            queue.push(edge.from)
          }
        }
      }

      expect(visited.size).toBe(rooms.length)
    })
  })

  describe('createCorridor', () => {
    test('should create a path between room centers', () => {
      const room1 = { id: 0, x: 5, y: 5, width: 4, height: 4 }
      const room2 = { id: 1, x: 15, y: 15, width: 4, height: 4 }

      const corridor = corridorService.createCorridor(room1, room2)

      expect(corridor.path.length).toBeGreaterThan(0)
      expect(corridor.start).toBeDefined()
      expect(corridor.end).toBeDefined()
    })
  })

  describe('determinism', () => {
    test('should generate identical dungeons with same seed', () => {
      const random1 = new SeededRandom('deterministic-seed')
      const random2 = new SeededRandom('deterministic-seed')
      const service1 = new DungeonService(random1)
      const service2 = new DungeonService(random2)

      const level1 = service1.generateLevel(1, defaultConfig)
      const level2 = service2.generateLevel(1, defaultConfig)

      expect(level1.rooms.length).toBe(level2.rooms.length)

      for (let i = 0; i < level1.rooms.length; i++) {
        expect(level1.rooms[i].x).toBe(level2.rooms[i].x)
        expect(level1.rooms[i].y).toBe(level2.rooms[i].y)
        expect(level1.rooms[i].width).toBe(level2.rooms[i].width)
        expect(level1.rooms[i].height).toBe(level2.rooms[i].height)
      }
    })
  })

  describe('placeDoors', () => {
    test('should place doors at room entries', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.doors.length).toBeGreaterThan(0)
    })

    test('should assign door states from available types', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      const states = level.doors.map((d) => d.state)
      expect(states.length).toBeGreaterThan(0)

      // All doors should have valid states
      for (const door of level.doors) {
        expect(['OPEN', 'CLOSED', 'SECRET', 'BROKEN', 'ARCHWAY']).toContain(door.state)
      }
    })

    test('should set discovered flag correctly', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      for (const door of level.doors) {
        if (door.state === 'SECRET') {
          expect(door.discovered).toBe(false)
        } else {
          expect(door.discovered).toBe(true)
        }
      }
    })

    test('should detect door orientation', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      for (const door of level.doors) {
        expect(['horizontal', 'vertical']).toContain(door.orientation)
      }
    })

    test('should not place duplicate doors at same position', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      const positions = new Set()
      for (const door of level.doors) {
        const key = `${door.position.x},${door.position.y}`
        expect(positions.has(key)).toBe(false)
        positions.add(key)
      }
    })

    test('should place doors on wall tiles at room boundaries, not floor tiles', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.doors.length).toBeGreaterThan(0)

      for (const door of level.doors) {
        const tile = level.tiles[door.position.y][door.position.x]

        // Door tile should be type DOOR (converted from WALL)
        expect(tile.type).toBe('DOOR')

        // Verify door is at room boundary (wall position), not inside room floor
        let isAtWallBoundary = false

        for (const room of level.rooms) {
          // Check if door is at the wall boundary of this room
          const atTopWall =
            door.position.y === room.y - 1 &&
            door.position.x >= room.x &&
            door.position.x < room.x + room.width

          const atBottomWall =
            door.position.y === room.y + room.height &&
            door.position.x >= room.x &&
            door.position.x < room.x + room.width

          const atLeftWall =
            door.position.x === room.x - 1 &&
            door.position.y >= room.y &&
            door.position.y < room.y + room.height

          const atRightWall =
            door.position.x === room.x + room.width &&
            door.position.y >= room.y &&
            door.position.y < room.y + room.height

          if (atTopWall || atBottomWall || atLeftWall || atRightWall) {
            isAtWallBoundary = true
            break
          }
        }

        expect(isAtWallBoundary).toBe(true)
      }
    })

    test('should set correct walkable flags for all door states', () => {
      const level = dungeonService.generateLevel(1, defaultConfig)

      expect(level.doors.length).toBeGreaterThan(0)

      for (const door of level.doors) {
        const tile = level.tiles[door.position.y][door.position.x]

        switch (door.state) {
          case 'OPEN':
          case 'BROKEN':
          case 'ARCHWAY':
            expect(tile.walkable).toBe(true)
            expect(tile.transparent).toBe(true)
            expect(tile.char).toBe("'")
            break

          case 'CLOSED':
          case 'LOCKED':
            expect(tile.walkable).toBe(false)
            expect(tile.transparent).toBe(false)
            expect(tile.char).toBe('+')
            break

          case 'SECRET':
            expect(tile.walkable).toBe(false)
            expect(tile.transparent).toBe(false)
            expect(tile.char).toBe('#')
            break

          default:
            fail(`Unexpected door state: ${door.state}`)
        }
      }
    })
  })
})
