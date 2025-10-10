import { WanderingMonsterService } from './WanderingMonsterService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { MockRandom } from '@services/RandomService'
import { Level, Room, TileType } from '@game/core/core'

describe('WanderingMonsterService - Core Functionality', () => {
  let wanderingService: WanderingMonsterService
  let monsterSpawnService: MonsterSpawnService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    monsterSpawnService = new MonsterSpawnService(mockRandom)
    wanderingService = new WanderingMonsterService(monsterSpawnService, mockRandom)
  })

  // Helper to create minimal level
  function createLevel(overrides?: Partial<Level>): Level {
    const rooms: Room[] = [
      { id: 0, x: 1, y: 1, width: 8, height: 8 },
      { id: 1, x: 15, y: 1, width: 8, height: 8 },
    ]

    const tiles = Array(25)
      .fill(null)
      .map(() =>
        Array(25)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#ffffff',
            colorExplored: '#888888',
          }))
      )

    return {
      depth: 1,
      width: 25,
      height: 25,
      tiles,
      rooms,
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 12, y: 12 },
      explored: Array(25)
        .fill(null)
        .map(() => Array(25).fill(false)),
      wanderingMonsterCount: 0,
      lastWanderingSpawnTurn: 0,
      ...overrides,
    }
  }

  describe('shouldSpawnWanderer', () => {
    test('returns false when wanderer limit reached', () => {
      const level = createLevel({ wanderingMonsterCount: 5 })

      const result = wanderingService.shouldSpawnWanderer(level, 1000)

      expect(result).toBe(false)
    })

    test('spawn chance increases over time', () => {
      const level = createLevel({ lastWanderingSpawnTurn: 0 })

      // Simulate spawn failing (nextInt returns 0, chance returns false)
      mockRandom.setValues([0])
      expect(wanderingService.shouldSpawnWanderer(level, 0)).toBe(false)

      // Simulate spawn succeeding (nextInt returns 1, chance returns true)
      mockRandom.setValues([1])
      expect(wanderingService.shouldSpawnWanderer(level, 0)).toBe(true)
    })

    test('handles undefined wanderingMonsterCount', () => {
      const level = createLevel({ wanderingMonsterCount: undefined })

      mockRandom.setValues([1])
      expect(wanderingService.shouldSpawnWanderer(level, 0)).toBe(true)
    })
  })

  describe('getSpawnLocation', () => {
    test('returns a valid position outside player room', () => {
      const level = createLevel()
      const playerPos = { x: 5, y: 5 } // In room 0

      const location = wanderingService.getSpawnLocation(level, playerPos)

      expect(location).not.toBeNull()
      if (location) {
        // Should not be in room 0 (x:1-8, y:1-8)
        const inRoom0 = location.x >= 1 && location.x < 9 && location.y >= 1 && location.y < 9
        expect(inRoom0).toBe(false)
      }
    })

    test('returns null when no valid locations', () => {
      const level = createLevel()
      const playerPos = { x: 5, y: 5 }

      // Make all tiles unwalkable
      for (let y = 0; y < 25; y++) {
        for (let x = 0; x < 25; x++) {
          level.tiles[y][x].walkable = false
        }
      }

      const location = wanderingService.getSpawnLocation(level, playerPos)

      expect(location).toBeNull()
    })

    test('excludes occupied monster positions', () => {
      const level = createLevel({
        monsters: [{ id: 'm1', position: { x: 20, y: 20 } } as any],
      })
      const playerPos = { x: 5, y: 5 }

      // Make only (20,20) walkable
      for (let y = 0; y < 25; y++) {
        for (let x = 0; x < 25; x++) {
          level.tiles[y][x].walkable = x === 20 && y === 20
        }
      }

      const location = wanderingService.getSpawnLocation(level, playerPos)

      expect(location).toBeNull() // Can't spawn on occupied tile
    })
  })
})
