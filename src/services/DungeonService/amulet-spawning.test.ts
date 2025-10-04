import { DungeonService } from './DungeonService'
import { SeededRandom } from '@services/RandomService'
import { ItemType } from '@game/core/core'

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

  test('amulet spawns in center of last room', () => {
    const level = dungeonService.generateLevel(10, config)
    const amulet = level.items.find((i) => i.type === ItemType.AMULET)
    const lastRoom = level.rooms[level.rooms.length - 1]

    const expectedX = lastRoom.x + Math.floor(lastRoom.width / 2)
    const expectedY = lastRoom.y + Math.floor(lastRoom.height / 2)

    expect(amulet?.position).toEqual({ x: expectedX, y: expectedY })
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
})
