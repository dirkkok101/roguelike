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
        char: ' ',
        walkable: false,
        transparent: false,
        isRoom: false
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
          char: '.',
          walkable: true,
          transparent: true,
          isRoom: true
        }
      }
    }
  }

  it('should detect all tiles in a 6x6 room from center', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6) // 6x6 room at (5,5)

    const roomTiles = service.detectRoom({ x: 8, y: 8 }, level)

    expect(roomTiles.size).toBe(36) // 6x6 = 36 tiles
  })

  it('should detect all tiles in a 6x6 room from corner', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 5, 5, 6, 6)

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    expect(roomTiles.size).toBe(36)
  })

  it('should stop at walls (not leak to adjacent rooms)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)  // Room 1
    // Wall gap at x=7
    createRoom(level, 8, 2, 5, 5)  // Room 2 (separate)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    expect(roomTiles.size).toBe(25) // Only room 1 (5x5)
    expect(roomTiles.has('10,4')).toBe(false) // Room 2 not included
  })

  it('should return empty set when in corridor', () => {
    const level = createTestLevel(20, 20)

    // Create corridor (isRoom: false)
    level.tiles[10][10] = {
      char: '#',
      walkable: true,
      transparent: true,
      isRoom: false
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
      char: '+',
      walkable: true,
      transparent: false,
      isRoom: false
    }

    const roomTiles = service.detectRoom({ x: 4, y: 5 }, level)

    // Should floodfill into adjacent room
    expect(roomTiles.size).toBe(36) // Full 6x6 room
  })

  it('should handle L-shaped rooms', () => {
    const level = createTestLevel(20, 20)

    // Create L-shape
    createRoom(level, 5, 5, 5, 5)   // Square part
    createRoom(level, 5, 10, 3, 3)  // Extension (overlaps)

    const roomTiles = service.detectRoom({ x: 7, y: 7 }, level)

    // L-shape = 5*5 + 3*3 - overlap
    // Actually, with overlap at (5,10), (6,10), we get:
    // Top part: 5*5 = 25
    // Bottom extension: 3*3 = 9
    // But they connect at row 10, so total connected tiles
    expect(roomTiles.size).toBeGreaterThan(25)
  })

  it('should handle irregular room shapes', () => {
    const level = createTestLevel(20, 20)

    // Create irregular shape manually
    level.tiles[5][5] = { char: '.', walkable: true, transparent: true, isRoom: true }
    level.tiles[5][6] = { char: '.', walkable: true, transparent: true, isRoom: true }
    level.tiles[6][5] = { char: '.', walkable: true, transparent: true, isRoom: true }

    const roomTiles = service.detectRoom({ x: 5, y: 5 }, level)

    expect(roomTiles.size).toBe(3)
    expect(roomTiles.has('5,5')).toBe(true)
    expect(roomTiles.has('6,5')).toBe(true)
    expect(roomTiles.has('5,6')).toBe(true)
  })

  it('should not cross secret doors (pre-discovery)', () => {
    const level = createTestLevel(20, 20)
    createRoom(level, 2, 2, 5, 5)

    // Secret door (looks like wall, not transparent, not room)
    level.tiles[4][7] = {
      char: ' ',
      walkable: false,
      transparent: false,
      isRoom: false
    }

    createRoom(level, 8, 2, 5, 5)

    const roomTiles = service.detectRoom({ x: 4, y: 4 }, level)

    expect(roomTiles.size).toBe(25) // Only first room
  })
})
