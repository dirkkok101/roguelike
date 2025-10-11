import { FOVService } from './FOVService'
import { RoomDetectionService } from '@services/RoomDetectionService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Level, Position, Player, GameConfig } from '@game/core/core'

describe('FOVService - Room Reveal Mode', () => {
  let fovService: FOVService
  let roomDetectionService: RoomDetectionService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    roomDetectionService = new RoomDetectionService()
    fovService = new FOVService(statusEffectService, roomDetectionService)
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

  function createCorridor(level: Level, x: number, y: number, length: number, horizontal: boolean) {
    for (let i = 0; i < length; i++) {
      const pos = horizontal ? { x: x + i, y } : { x, y: y + i }
      level.tiles[pos.y][pos.x] = {
        char: '#',
        walkable: true,
        transparent: true,
        isRoom: false
      }
    }
  }

  const mockPlayer: Player = {
    position: { x: 5, y: 5 },
    hp: 20,
    maxHp: 20,
    strength: 16,
    level: 1,
    exp: 0,
    gold: 0,
    armor: 0,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      light: null
    },
    statusEffects: [],
    hunger: 500,
    maxHunger: 1000
  }

  describe('radius mode (default)', () => {
    it('should use radius-based FOV only', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 10, 10)

      const config: GameConfig = { fovMode: 'radius' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2, // radius
        level,
        mockPlayer,
        config
      )

      // Should only see within radius 2 (roughly 12-15 tiles)
      expect(result.visibleCells.size).toBeLessThan(30)
      expect(result.visibleCells.size).toBeGreaterThan(5)
    })
  })

  describe('room-reveal mode', () => {
    it('should reveal entire room when player enters', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6) // 36 tiles

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2, // lightRadius
        level,
        mockPlayer,
        config
      )

      // Should see entire 6x6 room (36 tiles) + origin
      expect(result.visibleCells.size).toBe(36)
    })

    it('should combine room tiles + radius tiles', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)
      // Room goes from x=5 to x=10, y=5 to y=10
      // Create corridor starting at x=11 (outside room)
      createCorridor(level, 11, 8, 5, true)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 9, y: 8 }, // Move player closer to edge (x=9, can see to x=11 with radius 2)
        2, // Can see 2 tiles into corridor
        level,
        mockPlayer,
        config
      )

      // Room (36) + partial corridor visibility (at least 1 corridor tile at x=11)
      expect(result.visibleCells.size).toBeGreaterThan(36)
    })

    it('should require lightRadius > 0 to reveal room', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        0, // No light
        level,
        mockPlayer,
        config
      )

      // No light = no room reveal, only origin visible
      expect(result.visibleCells.size).toBe(1) // Just the origin
      expect(result.visibleCells.has('8,8')).toBe(true)
    })

    it('should use radius-only when in corridor', () => {
      const level = createTestLevel(20, 20)
      createCorridor(level, 5, 5, 10, true)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 5 },
        2,
        level,
        mockPlayer,
        config
      )

      // Corridor uses radius-based FOV (no room detection)
      expect(result.visibleCells.size).toBeLessThan(15)
    })

    it('should mark explored tiles correctly', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const config: GameConfig = { fovMode: 'room-reveal' }
      const result = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        config
      )

      // All visible room tiles should be marked explored
      result.visibleCells.forEach((key) => {
        const [x, y] = key.split(',').map(Number)
        expect(result.level.explored[y][x]).toBe(true)
      })
    })
  })

  describe('mode switching', () => {
    it('should switch modes correctly mid-game', () => {
      const level = createTestLevel(20, 20)
      createRoom(level, 5, 5, 6, 6)

      const radiusConfig: GameConfig = { fovMode: 'radius' }
      const radiusResult = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        radiusConfig
      )

      const roomRevealConfig: GameConfig = { fovMode: 'room-reveal' }
      const roomResult = fovService.updateFOVAndExploration(
        { x: 8, y: 8 },
        2,
        level,
        mockPlayer,
        roomRevealConfig
      )

      // Room reveal should see more tiles
      expect(roomResult.visibleCells.size).toBeGreaterThan(radiusResult.visibleCells.size)
    })
  })
})
