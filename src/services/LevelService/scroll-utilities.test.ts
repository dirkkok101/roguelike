import { LevelService } from './LevelService'
import { Level, Position, Monster, TileType } from '@game/core/core'

describe('LevelService - Scroll Utility Methods', () => {
  let levelService: LevelService
  let testLevel: Level

  beforeEach(() => {
    levelService = new LevelService()

    // Create a test level with:
    // - A 10x10 grid
    // - A room from (2,2) to (6,6)
    // - Walls around edges
    // - Some monsters

    const tiles = []
    for (let y = 0; y < 10; y++) {
      const row = []
      for (let x = 0; x < 10; x++) {
        // Walls on edges
        if (x === 0 || y === 0 || x === 9 || y === 9) {
          row.push({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#666',
            colorExplored: '#333',
          })
        }
        // Room floor (2,2) to (6,6)
        else if (x >= 2 && x <= 6 && y >= 2 && y <= 6) {
          row.push({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ddd',
            colorExplored: '#888',
          })
        }
        // Corridors/walkable areas
        else {
          row.push({
            type: TileType.CORRIDOR,
            char: '#',
            walkable: true,
            transparent: true,
            colorVisible: '#aaa',
            colorExplored: '#555',
          })
        }
      }
      tiles.push(row)
    }

    testLevel = {
      depth: 1,
      width: 10,
      height: 10,
      tiles,
      rooms: [
        {
          id: 1,
          x: 2,
          y: 2,
          width: 5,
          height: 5,
        },
      ],
      doors: [],
      traps: [],
      monsters: [
        {
          id: 'monster-1',
          name: 'Orc',
          char: 'O',
          position: { x: 3, y: 3 },
        } as Monster,
        {
          id: 'monster-2',
          name: 'Kobold',
          char: 'K',
          position: { x: 7, y: 7 },
        } as Monster,
      ],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
      explored: [],
    } as Level
  })

  describe('getAllWalkableTiles', () => {
    test('returns all walkable tiles without monsters', () => {
      const walkableTiles = levelService.getAllWalkableTiles(testLevel)

      // Should include walkable tiles but exclude monster positions
      expect(walkableTiles.length).toBeGreaterThan(0)

      // Should not include monster positions
      const hasMonster1 = walkableTiles.some(
        (pos) => pos.x === 3 && pos.y === 3
      )
      const hasMonster2 = walkableTiles.some(
        (pos) => pos.x === 7 && pos.y === 7
      )
      expect(hasMonster1).toBe(false)
      expect(hasMonster2).toBe(false)
    })

    test('excludes wall tiles', () => {
      const walkableTiles = levelService.getAllWalkableTiles(testLevel)

      // Should not include any edge walls
      const hasEdgeWall = walkableTiles.some(
        (pos) => pos.x === 0 || pos.y === 0 || pos.x === 9 || pos.y === 9
      )
      expect(hasEdgeWall).toBe(false)
    })

    test('includes both floor and corridor tiles', () => {
      const walkableTiles = levelService.getAllWalkableTiles(testLevel)

      // Should include room floor tile (not monster position)
      const hasFloorTile = walkableTiles.some(
        (pos) => pos.x === 4 && pos.y === 4
      )
      expect(hasFloorTile).toBe(true)

      // Should include corridor tile
      const hasCorridorTile = walkableTiles.some(
        (pos) => pos.x === 1 && pos.y === 1
      )
      expect(hasCorridorTile).toBe(true)
    })
  })

  describe('getEmptyAdjacentTiles', () => {
    test('returns empty adjacent tiles around position', () => {
      const position = { x: 5, y: 5 }
      const adjacentTiles = levelService.getEmptyAdjacentTiles(
        position,
        testLevel
      )

      // Should have some adjacent tiles
      expect(adjacentTiles.length).toBeGreaterThan(0)

      // All should be adjacent (distance 1)
      adjacentTiles.forEach((tile) => {
        const dx = Math.abs(tile.x - position.x)
        const dy = Math.abs(tile.y - position.y)
        expect(dx <= 1 && dy <= 1).toBe(true)
        expect(dx + dy > 0).toBe(true) // Not the same position
      })
    })

    test('excludes tiles with monsters', () => {
      // Position next to monster at (3,3)
      const position = { x: 2, y: 3 }
      const adjacentTiles = levelService.getEmptyAdjacentTiles(
        position,
        testLevel
      )

      // Should not include monster position (3,3)
      const hasMonster = adjacentTiles.some(
        (tile) => tile.x === 3 && tile.y === 3
      )
      expect(hasMonster).toBe(false)
    })

    test('excludes non-walkable tiles', () => {
      // Position next to wall
      const position = { x: 1, y: 1 }
      const adjacentTiles = levelService.getEmptyAdjacentTiles(
        position,
        testLevel
      )

      // Should not include wall positions
      const hasWall = adjacentTiles.some(
        (tile) => tile.x === 0 || tile.y === 0
      )
      expect(hasWall).toBe(false)
    })

    test('returns empty array when surrounded by walls/monsters', () => {
      // Create a level where position is surrounded
      const blockedLevel = { ...testLevel }
      blockedLevel.monsters = [
        { id: 'm1', position: { x: 4, y: 4 } } as Monster,
        { id: 'm2', position: { x: 5, y: 4 } } as Monster,
        { id: 'm3', position: { x: 6, y: 4 } } as Monster,
        { id: 'm4', position: { x: 4, y: 5 } } as Monster,
        { id: 'm5', position: { x: 6, y: 5 } } as Monster,
        { id: 'm6', position: { x: 4, y: 6 } } as Monster,
        { id: 'm7', position: { x: 5, y: 6 } } as Monster,
        { id: 'm8', position: { x: 6, y: 6 } } as Monster,
      ]

      const adjacentTiles = levelService.getEmptyAdjacentTiles(
        { x: 5, y: 5 },
        blockedLevel
      )

      expect(adjacentTiles.length).toBe(0)
    })
  })

  describe('getAllTiles', () => {
    test('returns all tiles on level', () => {
      const allTiles = levelService.getAllTiles(testLevel)

      // Should return exactly width * height tiles
      expect(allTiles.length).toBe(10 * 10)
    })

    test('includes all positions', () => {
      const allTiles = levelService.getAllTiles(testLevel)

      // Check corners
      const hasTopLeft = allTiles.some((pos) => pos.x === 0 && pos.y === 0)
      const hasTopRight = allTiles.some((pos) => pos.x === 9 && pos.y === 0)
      const hasBottomLeft = allTiles.some((pos) => pos.x === 0 && pos.y === 9)
      const hasBottomRight = allTiles.some((pos) => pos.x === 9 && pos.y === 9)

      expect(hasTopLeft).toBe(true)
      expect(hasTopRight).toBe(true)
      expect(hasBottomLeft).toBe(true)
      expect(hasBottomRight).toBe(true)
    })

    test('includes walls and floors', () => {
      const allTiles = levelService.getAllTiles(testLevel)

      // Should include wall position
      const hasWall = allTiles.some((pos) => pos.x === 0 && pos.y === 0)
      expect(hasWall).toBe(true)

      // Should include floor position
      const hasFloor = allTiles.some((pos) => pos.x === 3 && pos.y === 3)
      expect(hasFloor).toBe(true)
    })
  })

  describe('isInRoom', () => {
    test('returns true when position is inside room', () => {
      const positionInRoom = { x: 4, y: 4 }
      const result = levelService.isInRoom(positionInRoom, testLevel)

      expect(result).toBe(true)
    })

    test('returns false when position is in corridor', () => {
      const positionInCorridor = { x: 1, y: 1 }
      const result = levelService.isInRoom(positionInCorridor, testLevel)

      expect(result).toBe(false)
    })

    test('returns true for room edge positions', () => {
      // Room is at (2,2) to (6,6)
      const edgePosition = { x: 2, y: 2 }
      const result = levelService.isInRoom(edgePosition, testLevel)

      expect(result).toBe(true)
    })

    test('returns false just outside room boundary', () => {
      const outsideRoom = { x: 7, y: 4 }
      const result = levelService.isInRoom(outsideRoom, testLevel)

      expect(result).toBe(false)
    })
  })

  describe('getRoomTiles', () => {
    test('returns all tiles in room when position is inside', () => {
      const positionInRoom = { x: 4, y: 4 }
      const roomTiles = levelService.getRoomTiles(positionInRoom, testLevel)

      // Room is 5x5 = 25 tiles
      expect(roomTiles.length).toBe(25)
    })

    test('returns empty array when position not in room', () => {
      const positionInCorridor = { x: 1, y: 1 }
      const roomTiles = levelService.getRoomTiles(positionInCorridor, testLevel)

      expect(roomTiles.length).toBe(0)
    })

    test('only includes floor tiles, not corridors', () => {
      const positionInRoom = { x: 4, y: 4 }
      const roomTiles = levelService.getRoomTiles(positionInRoom, testLevel)

      // All tiles should be floor type
      roomTiles.forEach((pos) => {
        const tile = testLevel.tiles[pos.y][pos.x]
        expect(tile.type).toBe(TileType.FLOOR)
      })
    })

    test('uses flood-fill to find connected room tiles', () => {
      const positionInRoom = { x: 4, y: 4 }
      const roomTiles = levelService.getRoomTiles(positionInRoom, testLevel)

      // Should include all room positions
      const hasCenter = roomTiles.some((pos) => pos.x === 4 && pos.y === 4)
      const hasCorner = roomTiles.some((pos) => pos.x === 2 && pos.y === 2)
      const hasEdge = roomTiles.some((pos) => pos.x === 6 && pos.y === 4)

      expect(hasCenter).toBe(true)
      expect(hasCorner).toBe(true)
      expect(hasEdge).toBe(true)
    })
  })
})
