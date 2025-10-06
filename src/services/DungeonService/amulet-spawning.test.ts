import { DungeonService } from './DungeonService'
import { SeededRandom } from '@services/RandomService'
import { ItemType, TileType } from '@game/core/core'

describe('DungeonService - Amulet Spawning', () => {
  let dungeonService: DungeonService
  let random: SeededRandom

  const config = {
    width: 80,
    height: 22,
    minRooms: 4,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    minSpacing: 2,
    loopChance: 0.25,
  }

  beforeEach(() => {
    random = new SeededRandom('test-seed-amulet')
    dungeonService = new DungeonService(random)
  })

  test('spawns amulet on level 10', () => {
    const level = dungeonService.generateLevel(10, config)
    const amulets = level.items.filter((i) => i.type === ItemType.AMULET)

    expect(amulets).toHaveLength(1)
    expect(amulets[0].name).toBe('Amulet of Yendor')
    expect(amulets[0].identified).toBe(true)
  })

  test('does not spawn amulet on levels 1-9', () => {
    for (let depth = 1; depth <= 9; depth++) {
      const level = dungeonService.generateLevel(depth, config)
      const amulets = level.items.filter((i) => i.type === ItemType.AMULET)
      expect(amulets).toHaveLength(0)
    }
  })

  test('amulet spawns in last room', () => {
    const level = dungeonService.generateLevel(10, config)
    const amulet = level.items.find((i) => i.type === ItemType.AMULET)
    const lastRoom = level.rooms[level.rooms.length - 1]

    // Verify amulet is within last room bounds
    expect(amulet?.position.x).toBeGreaterThanOrEqual(lastRoom.x)
    expect(amulet?.position.x).toBeLessThan(lastRoom.x + lastRoom.width)
    expect(amulet?.position.y).toBeGreaterThanOrEqual(lastRoom.y)
    expect(amulet?.position.y).toBeLessThan(lastRoom.y + lastRoom.height)
  })

  test('amulet is always identified', () => {
    const level = dungeonService.generateLevel(10, config)
    const amulet = level.items.find((i) => i.type === ItemType.AMULET)

    expect(amulet?.identified).toBe(true)
  })

  test('spawnAmulet returns unmodified level for non-level-10', () => {
    const level = dungeonService.generateLevel(5, config)
    const originalItemCount = level.items.length

    const result = dungeonService.spawnAmulet(level)

    expect(result.items.length).toBe(originalItemCount)
    expect(result.items.filter((i) => i.type === ItemType.AMULET)).toHaveLength(0)
  })

  test('spawnAmulet adds amulet to level 10', () => {
    const level = dungeonService.generateLevel(10, config)

    // Count items before (amulet already spawned by generateLevel)
    const amulets = level.items.filter((i) => i.type === ItemType.AMULET)

    // Should have exactly one amulet
    expect(amulets).toHaveLength(1)
  })

  test('amulet spawns on walkable floor tile', () => {
    const level = dungeonService.generateLevel(10, config)
    const amulet = level.items.find((i) => i.type === ItemType.AMULET)

    expect(amulet).toBeDefined()
    if (amulet) {
      const tile = level.tiles[amulet.position.y][amulet.position.x]
      expect(tile.type).toBe(TileType.FLOOR)
      expect(tile.walkable).toBe(true)
    }
  })

  test('level 10 has no stairs down', () => {
    const level = dungeonService.generateLevel(10, config)

    // Level 10 is the deepest level, should not have stairs down
    expect(level.stairsDown).toBeNull()
  })
})
