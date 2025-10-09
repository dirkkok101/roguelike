import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { Room, Tile, TileType, WandType, ItemType, Wand } from '@game/core/core'
import { mockItemData } from '@/test-utils'

// ============================================================================
// WAND RANGE ASSIGNMENT TESTS
// ============================================================================

describe('ItemSpawnService - Wand Range Assignment', () => {
  let tiles: Tile[][]
  let rooms: Room[]

  beforeEach(() => {
    // Create large tile grid (80x80 walkable floor) to support many item spawns
    tiles = Array(80)
      .fill(null)
      .map(() =>
        Array(80)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#A89078',
            colorExplored: '#5A5A5A',
          }))
      )

    // Create large room for spawning many items
    rooms = [
      {
        id: 1,
        x: 2,
        y: 2,
        width: 76,
        height: 76,
      },
    ]
  })

  // ============================================================================
  // RANGE PROPERTY PRESENCE
  // ============================================================================

  describe('Range Property Presence', () => {
    it('should include range property on all spawned wands', () => {
      // Arrange: Use seeded random to spawn many items
      // Wands are ~8% of spawns, so spawn 500 items to get good wand coverage
      const random = new SeededRandom('test-wand-ranges')
      const service = new ItemSpawnService(random, mockItemData)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 500, tiles, [], 5)

      // Assert: Filter to wands only
      const wands = items.filter((item) => item.type === ItemType.WAND) as Wand[]

      // Should have spawned at least some wands
      expect(wands.length).toBeGreaterThan(0)

      // All wands should have range property defined
      wands.forEach((wand) => {
        expect(wand.range).toBeDefined()
        expect(typeof wand.range).toBe('number')
        expect(wand.range).toBeGreaterThanOrEqual(5)
        expect(wand.range).toBeLessThanOrEqual(8)
      })
    })
  })

  // ============================================================================
  // RANGE VALUES BY WAND TYPE
  // ============================================================================

  describe('Range Values by Wand Type', () => {
    it('should assign correct ranges for all wand types', () => {
      // Arrange: Spawn many items to get variety of wand types
      const random = new SeededRandom('test-wand-type-ranges')
      const service = new ItemSpawnService(random, mockItemData)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)
      const wands = items.filter((item) => item.type === ItemType.WAND) as Wand[]

      // Assert: Group wands by type and verify ranges
      const expectedRanges: Record<WandType, number> = {
        [WandType.LIGHTNING]: 8,
        [WandType.FIRE]: 8,
        [WandType.COLD]: 8,
        [WandType.MAGIC_MISSILE]: 7,
        [WandType.SLEEP]: 6,
        [WandType.HASTE_MONSTER]: 5,
        [WandType.SLOW_MONSTER]: 6,
        [WandType.POLYMORPH]: 5,
        [WandType.TELEPORT_AWAY]: 7,
        [WandType.CANCELLATION]: 6,
      }

      const wandsByType = wands.reduce((acc, wand) => {
        if (!acc[wand.wandType]) {
          acc[wand.wandType] = []
        }
        acc[wand.wandType].push(wand)
        return acc
      }, {} as Record<WandType, Wand[]>)

      // Verify each wand type has correct range
      Object.entries(wandsByType).forEach(([type, typeWands]) => {
        const wandType = type as WandType
        const expectedRange = expectedRanges[wandType]

        typeWands.forEach((wand) => {
          expect(wand.range).toBe(expectedRange)
        })
      })

      // Should have found multiple wand types
      expect(Object.keys(wandsByType).length).toBeGreaterThan(3)
    })
  })

  // ============================================================================
  // BEAM WANDS LONG RANGE
  // ============================================================================

  describe('Beam Wands Long Range', () => {
    it('should assign range 8 to beam wands (LIGHTNING, FIRE, COLD)', () => {
      // Arrange
      const random = new SeededRandom('test-beam-wands')
      const service = new ItemSpawnService(random, mockItemData)

      // Act
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)
      const wands = items.filter((item) => item.type === ItemType.WAND) as Wand[]

      // Assert
      const beamWands = wands.filter(
        (w) =>
          w.wandType === WandType.LIGHTNING ||
          w.wandType === WandType.FIRE ||
          w.wandType === WandType.COLD
      )

      // Should have spawned at least one beam wand
      expect(beamWands.length).toBeGreaterThan(0)

      // All beam wands should have range 8
      beamWands.forEach((wand) => {
        expect(wand.range).toBe(8)
      })
    })
  })

  // ============================================================================
  // SHORT RANGE UTILITY WANDS
  // ============================================================================

  describe('Short Range Utility Wands', () => {
    it('should assign range 5 to utility wands (HASTE_MONSTER, POLYMORPH)', () => {
      // Arrange
      const random = new SeededRandom('test-utility-wands')
      const service = new ItemSpawnService(random, mockItemData)

      // Act
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)
      const wands = items.filter((item) => item.type === ItemType.WAND) as Wand[]

      // Assert
      const utilityWands = wands.filter(
        (w) => w.wandType === WandType.HASTE_MONSTER || w.wandType === WandType.POLYMORPH
      )

      // Should have spawned at least one utility wand
      expect(utilityWands.length).toBeGreaterThan(0)

      // All utility wands should have range 5
      utilityWands.forEach((wand) => {
        expect(wand.range).toBe(5)
      })
    })
  })

  // ============================================================================
  // MODERATE RANGE WANDS
  // ============================================================================

  describe('Moderate Range Wands', () => {
    it('should assign appropriate moderate ranges (6-7) to other wands', () => {
      // Arrange
      const random = new SeededRandom('test-moderate-wands')
      const service = new ItemSpawnService(random, mockItemData)

      // Act
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)
      const wands = items.filter((item) => item.type === ItemType.WAND) as Wand[]

      // Assert
      const moderateWands = wands.filter(
        (w) =>
          w.wandType === WandType.MAGIC_MISSILE ||
          w.wandType === WandType.SLEEP ||
          w.wandType === WandType.SLOW_MONSTER ||
          w.wandType === WandType.TELEPORT_AWAY ||
          w.wandType === WandType.CANCELLATION
      )

      // Should have spawned at least one moderate range wand
      expect(moderateWands.length).toBeGreaterThan(0)

      // All moderate wands should have range 6 or 7
      moderateWands.forEach((wand) => {
        expect(wand.range).toBeGreaterThanOrEqual(6)
        expect(wand.range).toBeLessThanOrEqual(7)
      })
    })
  })
})
