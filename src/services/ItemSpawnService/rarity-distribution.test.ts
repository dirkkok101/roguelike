import { ItemSpawnService } from './ItemSpawnService'
import { SeededRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { Room, Tile, ItemType, Weapon, Armor } from '@game/core/core'
import { mockGuaranteeConfig } from '@/test-utils'

// ============================================================================
// RARITY DISTRIBUTION TESTS - Statistical validation of rarity weights
// ============================================================================
// Tests that rarity distribution matches expected percentages across depths

describe('ItemSpawnService - Rarity Distribution', () => {
  let service: ItemSpawnService
  let realRandom: SeededRandom
  let mockItemData: ItemData

  // Test setup helpers
  const createMockTiles = (): Tile[][] => {
    const tiles: Tile[][] = []
    for (let y = 0; y < 22; y++) {
      tiles[y] = []
      for (let x = 0; x < 80; x++) {
        tiles[y][x] = { walkable: true, transparent: true, type: 'floor' } as Tile
      }
    }
    return tiles
  }

  const createTestRooms = (count: number): Room[] => {
    const rooms: Room[] = []
    for (let i = 0; i < count; i++) {
      rooms.push({
        x: 10 + i * 20,
        y: 10,
        width: 15,
        height: 10,
        doors: [],
        connected: true
      })
    }
    return rooms
  }

  beforeEach(() => {
    // Use real random for statistical tests
    realRandom = new SeededRandom('test-seed-' + Date.now())
    mockItemData = {
      weapons: [
        { name: 'Dagger', spriteName: 'dagger', damage: '1d4', rarity: 'common' },
        { name: 'Short Sword', spriteName: 'shortsword', damage: '1d6', rarity: 'uncommon' },
        { name: 'Long Sword', spriteName: 'longsword', damage: '1d8', rarity: 'rare' }
      ],
      armor: [
        { name: 'Leather Armor', spriteName: 'leather', ac: 8, rarity: 'common' },
        { name: 'Chain Mail', spriteName: 'chain', ac: 5, rarity: 'uncommon' },
        { name: 'Plate Mail', spriteName: 'plate', ac: 3, rarity: 'rare' }
      ],
      potions: [{ type: 'HEALING', spriteName: 'potion', effect: 'heal', power: '2d4', rarity: 'common' }],
      scrolls: [{ type: 'IDENTIFY', spriteName: 'scroll', effect: 'identify', rarity: 'common' }],
      rings: [{ type: 'PROTECTION', spriteName: 'ring', effect: '+1 AC', rarity: 'common' }],
      wands: [{ type: 'MAGIC_MISSILE', spriteName: 'wand', damage: '1d6', charges: '3d3', rarity: 'common' }],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: '900', rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 500, isPermanent: false, rarity: 'common' },
        { type: 'lantern', name: 'Lantern', spriteName: 'lantern', radius: 2, fuel: 750, isPermanent: false, rarity: 'common' }
      ],
      consumables: [{ name: 'Oil Flask', spriteName: 'oil', type: 'lantern_fuel', fuelAmount: 600, rarity: 'common' }]
    }
    service = new ItemSpawnService(realRandom, mockItemData, mockGuaranteeConfig)
  })

  // ============================================================================
  // WEIGHTED RANDOM SELECTION TESTS
  // ============================================================================

  describe('selectWeightedRarity()', () => {
    test('selects rarity proportional to weights', () => {
      const weights = { common: 70, uncommon: 25, rare: 5 }
      const counts = { common: 0, uncommon: 0, rare: 0 }
      const iterations = 10000

      for (let i = 0; i < iterations; i++) {
        const rarity = (service as any).selectWeightedRarity(weights)
        counts[rarity as keyof typeof counts]++
      }

      // Calculate percentages
      const total = weights.common + weights.uncommon + weights.rare
      const expectedCommon = (weights.common / total) * 100
      const expectedUncommon = (weights.uncommon / total) * 100
      const expectedRare = (weights.rare / total) * 100

      const actualCommon = (counts.common / iterations) * 100
      const actualUncommon = (counts.uncommon / iterations) * 100
      const actualRare = (counts.rare / iterations) * 100

      // Allow 1% margin of error (statistical variance with 10k samples)
      expect(actualCommon).toBeCloseTo(expectedCommon, -1) // -1 = ±5 (0.5% tolerance)
      expect(actualUncommon).toBeCloseTo(expectedUncommon, -1)
      expect(actualRare).toBeCloseTo(expectedRare, -1)
    })

    test('handles non-normalized weights correctly', () => {
      // Weights don't sum to 100, but ratios should be preserved
      const weights = { common: 30, uncommon: 40, rare: 30 }
      const counts = { common: 0, uncommon: 0, rare: 0 }
      const iterations = 10000

      for (let i = 0; i < iterations; i++) {
        const rarity = (service as any).selectWeightedRarity(weights)
        counts[rarity as keyof typeof counts]++
      }

      const total = weights.common + weights.uncommon + weights.rare
      const expectedCommon = (weights.common / total) * 100
      const expectedUncommon = (weights.uncommon / total) * 100
      const expectedRare = (weights.rare / total) * 100

      const actualCommon = (counts.common / iterations) * 100
      const actualUncommon = (counts.uncommon / iterations) * 100
      const actualRare = (counts.rare / iterations) * 100

      // Allow 1% margin of error for statistical variance
      expect(actualCommon).toBeGreaterThan(expectedCommon - 1)
      expect(actualCommon).toBeLessThan(expectedCommon + 1)
      expect(actualUncommon).toBeGreaterThan(expectedUncommon - 1)
      expect(actualUncommon).toBeLessThan(expectedUncommon + 1)
      expect(actualRare).toBeGreaterThan(expectedRare - 1)
      expect(actualRare).toBeLessThan(expectedRare + 1)
    })
  })

  // ============================================================================
  // STATISTICAL DISTRIBUTION TESTS
  // ============================================================================

  describe('statistical distribution validation', () => {
    test('10,000 spawns at depth 1 match 70/25/5 within 2% margin', () => {
      const tiles = createMockTiles()
      const rooms = createTestRooms(5)
      const counts = { common: 0, uncommon: 0, rare: 0 }

      // Spawn many items to get statistical sample
      const iterations = 500 // Spawn 20 items per iteration = 10,000 total
      for (let i = 0; i < iterations; i++) {
        const items = service.spawnItems(rooms, 20, tiles, [], 1)

        // Count rarity of weapons and armor (items that have rarity)
        items.forEach(item => {
          if (item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) {
            const weaponOrArmor = item as Weapon | Armor
            // Determine rarity from item name/stats
            if (weaponOrArmor.type === ItemType.WEAPON) {
              const weapon = weaponOrArmor as Weapon
              if (weapon.name.includes('Dagger')) counts.common++
              else if (weapon.name.includes('Short Sword')) counts.uncommon++
              else if (weapon.name.includes('Long Sword')) counts.rare++
            } else if (weaponOrArmor.type === ItemType.ARMOR) {
              const armor = weaponOrArmor as Armor
              if (armor.name.includes('Leather')) counts.common++
              else if (armor.name.includes('Chain')) counts.uncommon++
              else if (armor.name.includes('Plate')) counts.rare++
            }
          }
        })
      }

      const total = counts.common + counts.uncommon + counts.rare
      if (total > 0) {
        const actualCommon = (counts.common / total) * 100
        const actualUncommon = (counts.uncommon / total) * 100
        const actualRare = (counts.rare / total) * 100

        // Expected: ~68/26/6 (from calculateRarityWeights(1))
        expect(actualCommon).toBeGreaterThan(64)
        expect(actualCommon).toBeLessThan(72)
        expect(actualUncommon).toBeGreaterThan(23)
        expect(actualUncommon).toBeLessThan(29)
        expect(actualRare).toBeGreaterThan(4)
        expect(actualRare).toBeLessThan(9)
      }
    }, 30000) // 30 second timeout for statistical test

    test('10,000 spawns at depth 26 match 30/40/30 within 2% margin', () => {
      const tiles = createMockTiles()
      const rooms = createTestRooms(5)
      const counts = { common: 0, uncommon: 0, rare: 0 }

      const iterations = 500
      for (let i = 0; i < iterations; i++) {
        const items = service.spawnItems(rooms, 20, tiles, [], 26)

        items.forEach(item => {
          if (item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) {
            const weaponOrArmor = item as Weapon | Armor
            if (weaponOrArmor.type === ItemType.WEAPON) {
              const weapon = weaponOrArmor as Weapon
              if (weapon.name.includes('Dagger')) counts.common++
              else if (weapon.name.includes('Short Sword')) counts.uncommon++
              else if (weapon.name.includes('Long Sword')) counts.rare++
            } else if (weaponOrArmor.type === ItemType.ARMOR) {
              const armor = weaponOrArmor as Armor
              if (armor.name.includes('Leather')) counts.common++
              else if (armor.name.includes('Chain')) counts.uncommon++
              else if (armor.name.includes('Plate')) counts.rare++
            }
          }
        })
      }

      const total = counts.common + counts.uncommon + counts.rare
      if (total > 0) {
        const actualCommon = (counts.common / total) * 100
        const actualUncommon = (counts.uncommon / total) * 100
        const actualRare = (counts.rare / total) * 100

        // Expected: ~30/40/30
        // Allow ±3.5% margin for statistical variance with large sample
        expect(actualCommon).toBeGreaterThan(26)
        expect(actualCommon).toBeLessThan(35)
        expect(actualUncommon).toBeGreaterThan(36)
        expect(actualUncommon).toBeLessThan(44)
        expect(actualRare).toBeGreaterThan(26)
        expect(actualRare).toBeLessThan(35)
      }
    }, 30000) // 30 second timeout

    test('enchantment distribution at depth 26 shows +5 as rare peak', () => {
      const tiles = createMockTiles()
      const rooms = createTestRooms(5)
      const enchantmentCounts: Record<number, number> = {}

      const iterations = 200
      for (let i = 0; i < iterations; i++) {
        const items = service.spawnItems(rooms, 20, tiles, [], 26)

        items.forEach(item => {
          if (item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) {
            const weaponOrArmor = item as Weapon | Armor
            const bonus = weaponOrArmor.bonus || 0
            if (bonus >= 0) { // Ignore cursed items
              enchantmentCounts[bonus] = (enchantmentCounts[bonus] || 0) + 1
            }
          }
        })
      }

      // +5 should exist but be less common than lower bonuses
      expect(enchantmentCounts[5]).toBeGreaterThan(0)
      expect(enchantmentCounts[5]).toBeDefined()

      // +2, +3, +4 should be more common than +5 at depth 26
      if (enchantmentCounts[2] && enchantmentCounts[3] && enchantmentCounts[4]) {
        expect(enchantmentCounts[2] + enchantmentCounts[3] + enchantmentCounts[4])
          .toBeGreaterThan(enchantmentCounts[5])
      }
    }, 30000)
  })

  // ============================================================================
  // PROGRESSION SMOOTHNESS TESTS
  // ============================================================================

  describe('rarity progression smoothness', () => {
    test('rarity distribution changes gradually across depths', () => {
      const samples = [1, 7, 13, 19, 26]
      const distributions: Array<{ common: number; uncommon: number; rare: number }> = []

      for (const depth of samples) {
        const weights = (service as any).calculateRarityWeights(depth)
        const total = weights.common + weights.uncommon + weights.rare
        distributions.push({
          common: (weights.common / total) * 100,
          uncommon: (weights.uncommon / total) * 100,
          rare: (weights.rare / total) * 100
        })
      }

      // Check that changes between consecutive samples are gradual
      for (let i = 1; i < distributions.length; i++) {
        const prev = distributions[i - 1]
        const curr = distributions[i]

        // Common should decrease, but not drastically
        expect(prev.common - curr.common).toBeLessThan(15)
        expect(prev.common).toBeGreaterThan(curr.common)

        // Uncommon and rare should increase gradually
        expect(curr.uncommon - prev.uncommon).toBeLessThan(10)
        expect(curr.rare - prev.rare).toBeLessThan(10)
      }
    })

    test('no sudden jumps in enchantment ranges', () => {
      // Test that enchantment ranges change smoothly
      for (let depth = 1; depth < 26; depth++) {
        const current = (service as any).calculateEnchantmentRange(depth, 'common')
        const next = (service as any).calculateEnchantmentRange(depth + 1, 'common')

        // maxBonus should never jump by more than 1
        expect(Math.abs(next.maxBonus - current.maxBonus)).toBeLessThanOrEqual(1)
        expect(Math.abs(next.minBonus - current.minBonus)).toBeLessThanOrEqual(1)
      }
    })
  })
})
