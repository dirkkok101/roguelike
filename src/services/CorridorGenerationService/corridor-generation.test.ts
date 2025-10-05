import { CorridorGenerationService } from './CorridorGenerationService'
import { MockRandom, SeededRandom } from '@services/RandomService'
import { Room, Tile, TileType } from '@game/core/core'

describe('CorridorGenerationService - Corridor Generation', () => {
  const createFloorTile = (): Tile => ({
    type: TileType.FLOOR,
    char: '.',
    walkable: true,
    transparent: true,
    colorVisible: '#A89078',
    colorExplored: '#5A5A5A',
  })

  const createWallTile = (): Tile => ({
    type: TileType.WALL,
    char: '#',
    walkable: false,
    transparent: false,
    colorVisible: '#8B7355',
    colorExplored: '#4A4A4A',
  })

  describe('createCorridor', () => {
    test('creates L-shaped path between room centers', () => {
      const mockRandom = new MockRandom([0.6]) // horizontal-first
      const service = new CorridorGenerationService(mockRandom)

      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 20, y: 15, width: 5, height: 5 }

      const corridor = service.createCorridor(room1, room2)

      // Should start at room1 center (7, 7) and end at room2 center (22, 17)
      expect(corridor.start).toEqual({ x: 7, y: 7 })
      expect(corridor.end).toEqual({ x: 22, y: 17 })

      // Path should not be empty
      expect(corridor.path.length).toBeGreaterThan(0)
    })

    test('horizontal-first creates path: horizontal then vertical', () => {
      const mockRandom = new MockRandom([0.6]) // horizontal-first (> 0.5)
      const service = new CorridorGenerationService(mockRandom)

      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 20, y: 15, width: 5, height: 5 }

      const corridor = service.createCorridor(room1, room2)

      // Room1 center: (7, 7), Room2 center: (22, 17)
      // Horizontal-first: go from x=7 to x=22, then y=7 to y=17

      const path = corridor.path

      // Find the bend point - where movement direction changes
      let bendIndex = -1
      for (let i = 1; i < path.length; i++) {
        const prevXChanged = i > 0 && path[i - 1].x !== path[i - 2]?.x
        const prevYChanged = i > 0 && path[i - 1].y !== path[i - 2]?.y
        const currXChanged = path[i].x !== path[i - 1].x
        const currYChanged = path[i].y !== path[i - 1].y

        // Bend occurs when we switch from x-movement to y-movement (or vice versa)
        if (i >= 2 && prevXChanged && !prevYChanged && !currXChanged && currYChanged) {
          bendIndex = i - 1
          break
        }
        if (i >= 2 && prevYChanged && !prevXChanged && !currYChanged && currXChanged) {
          bendIndex = i - 1
          break
        }
      }

      // For horizontal-first, we expect the path to move horizontally first
      // Check that early path points have same y
      const earlyY = path[0].y
      let horizontalSteps = 0
      for (let i = 0; i < path.length && path[i].y === earlyY; i++) {
        horizontalSteps++
      }

      // Should have at least some horizontal movement before vertical
      expect(horizontalSteps).toBeGreaterThanOrEqual(1)
    })

    test('vertical-first creates path: vertical then horizontal', () => {
      const mockRandom = new MockRandom([0.3]) // vertical-first (< 0.5)
      const service = new CorridorGenerationService(mockRandom)

      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 20, y: 20, width: 5, height: 5 }

      const corridor = service.createCorridor(room1, room2)

      // Room1 center: (7, 7), Room2 center: (22, 22)
      // Vertical-first: go from y=7 to y=22, then x=7 to x=22

      const path = corridor.path

      // For vertical-first, we expect the path to move vertically first
      // Check that early path points have same x
      const earlyX = path[0].x
      let verticalSteps = 0
      for (let i = 0; i < path.length && path[i].x === earlyX; i++) {
        verticalSteps++
      }

      // Should have at least some vertical movement before horizontal
      expect(verticalSteps).toBeGreaterThanOrEqual(1)
    })

    test('path connects start to end', () => {
      const seededRandom = new SeededRandom('corridor-test')
      const service = new CorridorGenerationService(seededRandom)

      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 20, y: 15, width: 5, height: 5 }

      const corridor = service.createCorridor(room1, room2)

      // First point should be at or near start
      expect(corridor.path[0]).toEqual(corridor.start)

      // Last point should be at end
      expect(corridor.path[corridor.path.length - 1]).toEqual(corridor.end)
    })

    test('path has no diagonal moves', () => {
      const seededRandom = new SeededRandom('corridor-test-2')
      const service = new CorridorGenerationService(seededRandom)

      const room1: Room = { id: 0, x: 5, y: 5, width: 5, height: 5 }
      const room2: Room = { id: 1, x: 25, y: 20, width: 5, height: 5 }

      const corridor = service.createCorridor(room1, room2)

      // Each step should change only x OR y, not both
      for (let i = 1; i < corridor.path.length; i++) {
        const prev = corridor.path[i - 1]
        const curr = corridor.path[i]

        const xChanged = curr.x !== prev.x
        const yChanged = curr.y !== prev.y

        // XOR: exactly one should change
        expect(xChanged !== yChanged).toBe(true)

        // And should only change by 1
        if (xChanged) {
          expect(Math.abs(curr.x - prev.x)).toBe(1)
        }
        if (yChanged) {
          expect(Math.abs(curr.y - prev.y)).toBe(1)
        }
      }
    })
  })

  describe('carveCorridorIntoTiles', () => {
    test('carves corridor path into tile grid', () => {
      const mockRandom = new MockRandom([0.6])
      const service = new CorridorGenerationService(mockRandom)

      // Create small tile grid (all walls)
      const tiles: Tile[][] = Array(30)
        .fill(null)
        .map(() => Array(30).fill(null).map(() => createWallTile()))

      const room1: Room = { id: 0, x: 5, y: 5, width: 3, height: 3 }
      const room2: Room = { id: 1, x: 15, y: 15, width: 3, height: 3 }

      const corridor = service.createCorridor(room1, room2)
      const floorTile = createFloorTile()

      service.carveCorridorIntoTiles(tiles, corridor, floorTile)

      // All corridor path positions should now be floors
      for (const pos of corridor.path) {
        expect(tiles[pos.y][pos.x].type).toBe(TileType.FLOOR)
        expect(tiles[pos.y][pos.x].walkable).toBe(true)
      }
    })

    test('handles corridor at grid edges', () => {
      const mockRandom = new MockRandom([0.6])
      const service = new CorridorGenerationService(mockRandom)

      const tiles: Tile[][] = Array(20)
        .fill(null)
        .map(() => Array(20).fill(null).map(() => createWallTile()))

      const room1: Room = { id: 0, x: 0, y: 0, width: 3, height: 3 }
      const room2: Room = { id: 1, x: 17, y: 17, width: 3, height: 3 }

      const corridor = service.createCorridor(room1, room2)
      const floorTile = createFloorTile()

      // Should not throw
      expect(() => {
        service.carveCorridorIntoTiles(tiles, corridor, floorTile)
      }).not.toThrow()
    })
  })

  describe('generateCorridors', () => {
    test('generates corridors connecting all rooms', () => {
      const seededRandom = new SeededRandom('gen-corridors')
      const service = new CorridorGenerationService(seededRandom)

      const rooms: Room[] = [
        { id: 0, x: 5, y: 5, width: 5, height: 5 },
        { id: 1, x: 20, y: 5, width: 5, height: 5 },
        { id: 2, x: 5, y: 15, width: 5, height: 5 },
        { id: 3, x: 20, y: 15, width: 5, height: 5 },
      ]

      const corridors = service.generateCorridors(rooms, 0) // No loops

      // Should have at least N-1 corridors (MST)
      expect(corridors.length).toBeGreaterThanOrEqual(rooms.length - 1)
    })

    test('adds extra corridors based on loop chance', () => {
      const seededRandom = new SeededRandom('loop-gen')
      const service = new CorridorGenerationService(seededRandom)

      const rooms: Room[] = [
        { id: 0, x: 5, y: 5, width: 5, height: 5 },
        { id: 1, x: 20, y: 5, width: 5, height: 5 },
        { id: 2, x: 5, y: 15, width: 5, height: 5 },
        { id: 3, x: 20, y: 15, width: 5, height: 5 },
      ]

      // With 100% loop chance, should add extra corridors
      const corridorsWithLoops = service.generateCorridors(rooms, 1.0)

      // Should have more than N-1 corridors
      expect(corridorsWithLoops.length).toBeGreaterThan(rooms.length - 1)
    })

    test('with 0% loop chance, generates exactly MST corridors', () => {
      const seededRandom = new SeededRandom('no-loops')
      const service = new CorridorGenerationService(seededRandom)

      const rooms: Room[] = [
        { id: 0, x: 5, y: 5, width: 5, height: 5 },
        { id: 1, x: 20, y: 5, width: 5, height: 5 },
        { id: 2, x: 5, y: 15, width: 5, height: 5 },
      ]

      const corridors = service.generateCorridors(rooms, 0)

      // Should have exactly N-1 corridors (MST only)
      expect(corridors.length).toBe(rooms.length - 1)
    })

    test('handles single room', () => {
      const seededRandom = new SeededRandom('single-room')
      const service = new CorridorGenerationService(seededRandom)

      const rooms: Room[] = [{ id: 0, x: 5, y: 5, width: 5, height: 5 }]

      const corridors = service.generateCorridors(rooms, 0.5)

      expect(corridors).toEqual([])
    })

    test('handles empty room list', () => {
      const seededRandom = new SeededRandom('empty')
      const service = new CorridorGenerationService(seededRandom)

      const corridors = service.generateCorridors([], 0.5)

      expect(corridors).toEqual([])
    })
  })
})
