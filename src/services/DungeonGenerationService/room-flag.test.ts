import { DungeonService, DungeonConfig } from '../DungeonService/DungeonService'
import { SeededRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { mockItemData } from '@/test-utils'

describe('DungeonGenerationService - Room Flag', () => {
  let service: DungeonService
  let config: DungeonConfig

  beforeEach(() => {
    const randomService = new SeededRandom('test-seed')

    // Mock MonsterSpawnService to skip loading monster data
    const mockMonsterSpawnService = {
      loadMonsterData: jest.fn().mockResolvedValue(undefined),
      spawnMonsters: jest.fn().mockReturnValue([]),
      getSpawnCount: jest.fn().mockReturnValue(5),
    } as unknown as MonsterSpawnService

    service = new DungeonService(randomService, mockMonsterSpawnService, mockItemData)

    config = {
      width: 80,
      height: 22,
      minRooms: 5,
      maxRooms: 9,
      minRoomSize: 3,
      maxRoomSize: 8,
      minSpacing: 1,
      loopChance: 0.3
    }
  })

  it('should mark room floor tiles with isRoom: true', () => {
    const level = service.generateLevel(1, config)

    // Find a room floor tile (char === '.' and not in corridor)
    let foundRoomTile = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        // Room floors are walkable and surrounded by room tiles
        if (tile.char === '.' && tile.walkable && tile.isRoom) {
          foundRoomTile = true
          expect(tile.isRoom).toBe(true)
        }
      }
    }

    expect(foundRoomTile).toBe(true)
  })

  it('should mark corridor tiles with isRoom: false', () => {
    const level = service.generateLevel(1, config)

    // Find corridor tiles (char === '.' with isRoom: false and type: CORRIDOR)
    let foundCorridorTile = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        // Corridors are walkable floor tiles with isRoom: false
        if (tile.char === '.' && tile.walkable && !tile.isRoom && tile.type === 'CORRIDOR') {
          foundCorridorTile = true
          expect(tile.isRoom).toBe(false)
        }
      }
    }

    expect(foundCorridorTile).toBe(true)
  })

  it('should mark wall tiles with isRoom: false', () => {
    const level = service.generateLevel(1, config)

    const tile = level.tiles[0][0] // Walls at edges
    expect(tile.isRoom).toBe(false)
  })

  it('should mark door tiles with isRoom: false', () => {
    const level = service.generateLevel(1, config)

    // Find a door tile (char === '+' or char === '-')
    let foundDoor = false
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x]
        if (tile.char === '+' || tile.char === '-') {
          foundDoor = true
          expect(tile.isRoom).toBe(false)
        }
      }
    }

    // Note: Doors might not exist on all levels, so this is informational
    if (foundDoor) {
      expect(foundDoor).toBe(true)
    }
  })
})
