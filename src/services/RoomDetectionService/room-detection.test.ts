import { RoomDetectionService } from './RoomDetectionService'
import { Level, Position } from '@game/core/core'

describe('RoomDetectionService - Room Detection', () => {
  let service: RoomDetectionService

  beforeEach(() => {
    service = new RoomDetectionService()
  })

  function createTestLevel(width: number, height: number): Level {
    const tiles = Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({
        type: 'WALL' as const,
        char: ' ',
        walkable: false,
        transparent: false,
        isRoom: false,
        colorVisible: '#808080',
        colorExplored: '#404040'
      }))
    )

    return {
      depth: 1,
      width,
      height,
      tiles,
      monsters: [],
      items: [],
      doors: [],
      traps: [],
      explored: Array(height).fill(null).map(() => Array(width).fill(false)),
      stairsUp: null,
      stairsDown: { x: 5, y: 5 }
    }
  }

  function createRoom(level: Level, x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        level.tiles[row][col] = {
          type: 'FLOOR' as const,
          char: '.',
          walkable: true,
          transparent: true,
          isRoom: true,
          colorVisible: '#ffffff',
          colorExplored: '#808080'
        }
      }
    }
  }

  it('should detect all tiles in a 6x6 room from center', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6) // 6x6 room at (5,5)

    const roomTiles = service.detectRoom({ x: 8, y: 8 }, level)

    // 6x6 room = 36 floor tiles + boundary walls
    // Boundary forms 8x8 perimeter: 64 - 36 = 28 wall tiles
    expect(roomTiles.size).toBe(64) // 36 floor + 28 boundary walls
  })

  it('should detect all tiles in a 6x6 room from corner', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6)

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    expect(roomTiles.size).toBe(64) // 36 floor + 28 boundary walls
  })

  it('should stop at walls (not leak to adjacent rooms)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)  // Room 1
    // Wall gap at x=7
    createRoom(level, 8, 2, 5, 5)  // Room 2 (separate)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    // Room 1: 5x5 floor (25) + boundary walls (7x7 perimeter = 49 - 25 = 24)
    expect(roomTiles.size).toBe(49) // 25 floor + 24 boundary walls
    expect(roomTiles.has('10,4')).toBe(false) // Room 2 floor not included
    expect(roomTiles.has('7,4')).toBe(true) // Wall between rooms IS included
  })

  it('should return empty set when in corridor', () => {
    const level = createTestLevel(20, 20)

    // Create corridor (isRoom: false)
    level.tiles[10][10] = {
      type: 'CORRIDOR' as const,
      char: '#',
      walkable: true,
      transparent: true,
      isRoom: false,
      colorVisible: '#808080',
      colorExplored: '#404040'
    }

    const roomTiles = service.detectRoom({ x: 10, y: 10 }, level)

    expect(roomTiles.size).toBe(0)
  })

  it('should return empty set when on wall', () => {
    const level = createTestLevel(20, 20)

    const roomTiles = service.detectRoom({ x: 0, y: 0 }, level)

    expect(roomTiles.size).toBe(0)
  })

  it('should detect room from doorway (adjacent to room)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6)

    // Door at edge of room
    level.tiles[5][4] = {
      type: 'DOOR' as const,
      char: '+',
      walkable: true,
      transparent: false,
      isRoom: false,
      colorVisible: '#8B4513',
      colorExplored: '#654321'
    }

    const roomTiles = service.detectRoom({ x: 4, y: 5 }, level)

    // Should floodfill into adjacent room and include boundaries
    // 6x6 floor (36) + boundary walls/doors (28 walls - 1 replaced by door + 1 door = 28)
    expect(roomTiles.size).toBe(64) // Full 6x6 room + boundaries (includes the door)
    expect(roomTiles.has('4,5')).toBe(true) // Door is included in boundary
  })

  it('should handle L-shaped rooms', () => {
    const level = createTestLevel(20, 20)

    // Create L-shape
    createRoom(level, 5, 5, 5, 5)   // Square part
    createRoom(level, 5, 10, 3, 3)  // Extension (overlaps)

    const roomTiles = service.detectRoom({ x: 7, y: 7 }, level)

    // L-shape = 5*5 + 3*3 - overlap = floor tiles
    // Plus boundary walls around the entire L-shape
    // Total should be significantly more than just floor tiles (25 + 9 - 3*3 overlap)
    expect(roomTiles.size).toBeGreaterThan(34) // More than floor tiles only (includes boundaries)
  })

  it('should handle irregular room shapes', () => {
    const level = createTestLevel(20, 20)

    // Create irregular shape manually
    level.tiles[5][5] = {
      type: 'FLOOR' as const,
      char: '.',
      walkable: true,
      transparent: true,
      isRoom: true,
      colorVisible: '#ffffff',
      colorExplored: '#808080'
    }
    level.tiles[5][6] = {
      type: 'FLOOR' as const,
      char: '.',
      walkable: true,
      transparent: true,
      isRoom: true,
      colorVisible: '#ffffff',
      colorExplored: '#808080'
    }
    level.tiles[6][5] = {
      type: 'FLOOR' as const,
      char: '.',
      walkable: true,
      transparent: true,
      isRoom: true,
      colorVisible: '#ffffff',
      colorExplored: '#808080'
    }

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    // 3 floor tiles + boundary walls around the L-shape
    expect(roomTiles.size).toBeGreaterThan(3) // Includes boundary walls
    expect(roomTiles.has('5,5')).toBe(true)
    expect(roomTiles.has('6,5')).toBe(true)
    expect(roomTiles.has('5,6')).toBe(true)
    // Check some boundary walls are included
    expect(roomTiles.has('4,4')).toBe(true) // Northwest corner wall
    expect(roomTiles.has('7,5')).toBe(true) // East wall
  })

  it('should not cross secret doors (pre-discovery)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)

    // Secret door (looks like wall, not transparent, not room)
    level.tiles[4][7] = {
      type: 'WALL' as const,
      char: ' ',
      walkable: false,
      transparent: false,
      isRoom: false,
      colorVisible: '#808080',
      colorExplored: '#404040'
    }

    createRoom(level, 8, 2, 5, 5)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    // First room: 5x5 floor (25) + boundary walls (7x7 = 49 - 25 = 24)
    expect(roomTiles.size).toBe(49) // Only first room + boundaries
  })
})
