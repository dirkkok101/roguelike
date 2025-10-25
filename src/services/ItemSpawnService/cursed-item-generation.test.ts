import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { Room, Tile, TileType, RingType, ItemType } from '@game/core/core'
import { mockItemData, mockGuaranteeConfig } from '@/test-utils'

// ============================================================================
// ITEM SPAWN SERVICE - Cursed Item Generation Tests
// ============================================================================

describe('ItemSpawnService - Cursed Item Generation', () => {
  let tiles: Tile[][]
  let rooms: Room[]

  beforeEach(() => {
    // Create large tile grid (80x80 walkable floor) to support 1000+ item spawns
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

  // ==========================================================================
  // Curse Mechanic Tests
  // ==========================================================================

  describe('Curse Mechanics', () => {
    test('items can be spawned as cursed', () => {
      // Arrange: Use seeded random to spawn many items
      // Note: Weapons/armor are ~20% of spawns, curse rate is ~6.6%
      // So need ~1000 items to ensure cursed weapons/armor
      const random = new SeededRandom('test-cursed-items')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items to get cursed ones
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Should have some cursed items
      const cursedItems = items.filter((item) => 'cursed' in item && item.cursed)
      expect(cursedItems.length).toBeGreaterThan(0)
    })

    test('items can be spawned as non-cursed', () => {
      // Arrange
      const random = new SeededRandom('test-non-cursed')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Should have non-cursed items (weapons/armor with cursed=false)
      const nonCursedItems = items.filter((item) => 'cursed' in item && !item.cursed)
      expect(nonCursedItems.length).toBeGreaterThan(0)
    })

    test('cursed items have negative enchantment -1 to -3', () => {
      // Arrange
      const random = new SeededRandom('test-negative-enchantment')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: All cursed items should have bonus between -1 and -3
      const cursedItems = items.filter((item) => 'cursed' in item && item.cursed && 'bonus' in item)
      expect(cursedItems.length).toBeGreaterThan(0)

      cursedItems.forEach((item) => {
        if ('bonus' in item) {
          expect(item.bonus).toBeGreaterThanOrEqual(-3)
          expect(item.bonus).toBeLessThanOrEqual(-1)
        }
      })
    })

    test('cursed weapons do not show bonus in name until identified', () => {
      // Arrange
      const random = new SeededRandom('test-cursed-names')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Cursed weapons should NOT show negative bonus in name (hidden until identified)
      const cursedWeapons = items.filter(
        (item) => 'cursed' in item && item.cursed && 'damage' in item && 'bonus' in item
      )
      expect(cursedWeapons.length).toBeGreaterThan(0)

      cursedWeapons.forEach((weapon) => {
        // Cursed items hide their negative bonus until identified
        expect(weapon.name).not.toMatch(/-\d+/)
      })
    })

    test('non-cursed common items have 0 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-common-items')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items at low depth (more common items)
      const items = service.spawnItems(rooms, 1000, tiles, [], 1)

      // Assert: Many non-cursed items should have 0 bonus
      const commonItems = items.filter(
        (item) => 'bonus' in item && !('cursed' in item && item.cursed) && item.bonus === 0
      )
      expect(commonItems.length).toBeGreaterThan(0)

      // Check names have no bonus indicator
      commonItems.forEach((item) => {
        expect(item.name).not.toMatch(/[+-]\d+/)
      })
    })
  })

  // ==========================================================================
  // Statistical Curse Rate Tests
  // ==========================================================================

  describe('Curse Rate Distribution (Statistical)', () => {
    test('curse rate is approximately 5-12% across many spawns', () => {
      // Arrange
      const random = new SeededRandom('test-curse-rate')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn 1000 items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Count cursed items among cursable items (weapons/armor/rings)
      const cursableItems = items.filter((item) => 'cursed' in item)
      const cursedCount = cursableItems.filter((item) => item.cursed).length

      const curseRate = cursedCount / cursableItems.length

      // Expect curse rate between 3% and 15% (allowing variance)
      // Actual rates: 5% common (60%), 8% uncommon (30%), 12% rare (10%)
      // Weighted average: 0.60*0.05 + 0.30*0.08 + 0.10*0.12 = 0.03 + 0.024 + 0.012 = 0.066 (6.6%)
      expect(curseRate).toBeGreaterThan(0.03) // At least 3%
      expect(curseRate).toBeLessThan(0.15) // At most 15%
    })
  })

  // ==========================================================================
  // Ring of Teleportation Special Case
  // ==========================================================================

  describe('Ring of Teleportation Always Cursed', () => {
    test('Ring of Teleportation is always cursed regardless of roll', () => {
      // Arrange
      const random = new SeededRandom('test-teleport-ring')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items to get Ring of Teleportation
      const items = service.spawnItems(rooms, 500, tiles, [], 5)

      // Assert: Find all teleportation rings
      const teleportRings = items.filter(
        (item) =>
          item.type === ItemType.RING &&
          'ringType' in item &&
          item.ringType === RingType.TELEPORTATION
      )

      // If we found any, they should ALL be cursed
      if (teleportRings.length > 0) {
        teleportRings.forEach((ring) => {
          expect('cursed' in ring && ring.cursed).toBe(true)
        })
      }
    })
  })

  // ==========================================================================
  // Enchantment Value Tests
  // ==========================================================================

  describe('Enchantment Values', () => {
    test('cursed items can have -1 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-cursed-minus-1')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Should find at least one cursed item with -1 bonus
      const cursedMinus1 = items.filter(
        (item) => 'bonus' in item && 'cursed' in item && item.cursed && item.bonus === -1
      )
      expect(cursedMinus1.length).toBeGreaterThan(0)
    })

    test('cursed items can have -2 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-cursed-minus-2')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Should find at least one cursed item with -2 bonus
      const cursedMinus2 = items.filter(
        (item) => 'bonus' in item && 'cursed' in item && item.cursed && item.bonus === -2
      )
      expect(cursedMinus2.length).toBeGreaterThan(0)
    })

    test('cursed items can have -3 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-cursed-minus-3')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items
      const items = service.spawnItems(rooms, 1000, tiles, [], 5)

      // Assert: Should find at least one cursed item with -3 bonus
      const cursedMinus3 = items.filter(
        (item) => 'bonus' in item && 'cursed' in item && item.cursed && item.bonus === -3
      )
      expect(cursedMinus3.length).toBeGreaterThan(0)
    })

    test('rare non-cursed items can have +1 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-blessed-items')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items at high depth (more rare items)
      const items = service.spawnItems(rooms, 1000, tiles, [], 10)

      // Assert: Find items with +1 bonus
      const blessedItems = items.filter(
        (item) => 'bonus' in item && item.bonus === 1 && !('cursed' in item && item.cursed)
      )

      expect(blessedItems.length).toBeGreaterThan(0)
    })

    test('rare non-cursed items can have +2 enchantment', () => {
      // Arrange
      const random = new SeededRandom('test-blessed-items-2')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items at high depth (more rare items)
      const items = service.spawnItems(rooms, 1000, tiles, [], 10)

      // Assert: Find items with +2 bonus
      const blessedItems = items.filter(
        (item) => 'bonus' in item && item.bonus === 2 && !('cursed' in item && item.cursed)
      )

      expect(blessedItems.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // Item Name Formatting
  // ==========================================================================

  describe('Item Name Formatting', () => {
    test('blessed items (weapons/armor) show positive bonus in name', () => {
      // Arrange
      const random = new SeededRandom('blessed-weapon-test')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items at high depth to get blessed items
      const items = service.spawnItems(rooms, 1000, tiles, [], 10)

      // Assert: Find items with positive bonuses (weapons or armor)
      const blessedItems = items.filter(
        (item) => 'bonus' in item && item.bonus > 0
      )

      expect(blessedItems.length).toBeGreaterThan(0)

      // All blessed items should show bonus in name (e.g., "Long Sword +2", "Plate Mail +1")
      blessedItems.forEach((item) => {
        expect(item.name).toMatch(/\+\d+/)
      })
    })

    test('normal weapon has no bonus in name', () => {
      // Arrange
      const random = new SeededRandom('normal-weapon-test')
      const service = new ItemSpawnService(random, mockItemData, mockGuaranteeConfig)

      // Act: Spawn many items at low depth (more common items)
      const items = service.spawnItems(rooms, 1000, tiles, [], 1)

      // Assert: Find weapons with 0 bonus
      const normalWeapons = items.filter(
        (item) => 'damage' in item && 'bonus' in item && item.bonus === 0
      )

      expect(normalWeapons.length).toBeGreaterThan(0)
      normalWeapons.forEach((weapon) => {
        expect(weapon.name).not.toMatch(/[+-]\d+/)
      })
    })
  })
})
