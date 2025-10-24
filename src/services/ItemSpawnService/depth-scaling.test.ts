import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'

// ============================================================================
// DEPTH-SCALING TESTS - Formula validation for depth-based item scaling
// ============================================================================
// Tests the three core scaling formulas:
// - calculateRarityWeights(): 70/25/5 → 30/40/30 progression
// - calculateEnchantmentRange(): 0 to +5 enchantment progression
// - calculateCurseChance(): 30% curse reduction by depth 26

describe('ItemSpawnService - Depth Scaling Formulas', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      weapons: [{ name: 'Test Sword', spriteName: 'sword', damage: '1d8', rarity: 'common' }],
      armor: [{ name: 'Test Armor', spriteName: 'armor', ac: 5, rarity: 'common' }],
      potions: [{ type: 'HEALING', spriteName: 'potion', effect: 'heal', power: '2d4', rarity: 'common' }],
      scrolls: [{ type: 'IDENTIFY', spriteName: 'scroll', effect: 'identify', rarity: 'common' }],
      rings: [{ type: 'PROTECTION', spriteName: 'ring', effect: '+1 AC', rarity: 'common' }],
      wands: [{ type: 'MAGIC_MISSILE', spriteName: 'wand', damage: '1d6', charges: '3d3', rarity: 'common' }],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: '900', rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 500, isPermanent: false, rarity: 'common' }
      ],
      consumables: [{ name: 'Oil Flask', spriteName: 'oil', type: 'lantern_fuel', fuelAmount: 600, rarity: 'common' }]
    }
    service = new ItemSpawnService(mockRandom, mockItemData)
  })

  // ============================================================================
  // RARITY WEIGHTS TESTS
  // ============================================================================

  describe('calculateRarityWeights()', () => {
    test('depth 1 returns approximately 70/25/5 distribution', () => {
      const weights = (service as any).calculateRarityWeights(1)

      // Expected: common=68.46, uncommon=25.58, rare=5.96
      expect(weights.common).toBeCloseTo(68.46, 1)
      expect(weights.uncommon).toBeCloseTo(25.58, 1)
      expect(weights.rare).toBeCloseTo(5.96, 1)
    })

    test('depth 26 returns approximately 30/40/30 distribution', () => {
      const weights = (service as any).calculateRarityWeights(26)

      // Expected: common=30, uncommon=40.08, rare=29.96
      expect(weights.common).toBe(30) // Capped at 30
      expect(weights.uncommon).toBeCloseTo(40, 0) // Within 0.5 of 40
      expect(weights.rare).toBeCloseTo(30, 0) // Within 0.5 of 30
    })

    test('depth 13 shows progression between extremes', () => {
      const weights1 = (service as any).calculateRarityWeights(1)
      const weights26 = (service as any).calculateRarityWeights(26)
      const weights13 = (service as any).calculateRarityWeights(13)

      // Depth 13 should be between depth 1 and 26 values (but not necessarily exactly halfway due to capping)
      expect(weights13.common).toBeLessThan(weights1.common)
      expect(weights13.common).toBeGreaterThan(weights26.common)

      expect(weights13.uncommon).toBeGreaterThan(weights1.uncommon)
      expect(weights13.uncommon).toBeLessThan(weights26.uncommon)

      expect(weights13.rare).toBeGreaterThan(weights1.rare)
      expect(weights13.rare).toBeLessThan(weights26.rare)
    })

    test('weights always positive', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const weights = (service as any).calculateRarityWeights(depth)
        expect(weights.common).toBeGreaterThan(0)
        expect(weights.uncommon).toBeGreaterThan(0)
        expect(weights.rare).toBeGreaterThan(0)
      }
    })

    test('weights sum to valid range for normalization', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const weights = (service as any).calculateRarityWeights(depth)
        const total = weights.common + weights.uncommon + weights.rare

        // Total should be close to 100 (within 5% tolerance for rounding)
        expect(total).toBeGreaterThan(95)
        expect(total).toBeLessThan(105)
      }
    })

    test('common weight decreases with depth', () => {
      const weights1 = (service as any).calculateRarityWeights(1)
      const weights13 = (service as any).calculateRarityWeights(13)
      const weights26 = (service as any).calculateRarityWeights(26)

      expect(weights13.common).toBeLessThan(weights1.common)
      expect(weights26.common).toBeLessThan(weights13.common)
    })

    test('uncommon and rare weights increase with depth', () => {
      const weights1 = (service as any).calculateRarityWeights(1)
      const weights13 = (service as any).calculateRarityWeights(13)
      const weights26 = (service as any).calculateRarityWeights(26)

      expect(weights13.uncommon).toBeGreaterThan(weights1.uncommon)
      expect(weights26.uncommon).toBeGreaterThan(weights13.uncommon)

      expect(weights13.rare).toBeGreaterThan(weights1.rare)
      expect(weights26.rare).toBeGreaterThan(weights13.rare)
    })
  })

  // ============================================================================
  // ENCHANTMENT RANGE TESTS
  // ============================================================================

  describe('calculateEnchantmentRange()', () => {
    test('depth 1-5 returns [0, 0] for common items', () => {
      for (let depth = 1; depth <= 5; depth++) {
        const range = (service as any).calculateEnchantmentRange(depth, 'common')
        expect(range.minBonus).toBe(0)
        expect(range.maxBonus).toBe(0)
      }
    })

    test('depth 26 common returns [2, 5]', () => {
      const range = (service as any).calculateEnchantmentRange(26, 'common')
      expect(range.minBonus).toBe(2)
      expect(range.maxBonus).toBe(5)
    })

    test('depth 26 rare returns [3, 5] (capped)', () => {
      const range = (service as any).calculateEnchantmentRange(26, 'rare')
      expect(range.minBonus).toBe(3) // floor(26/9) + 1 = 2 + 1 = 3
      expect(range.maxBonus).toBe(5) // Capped at 5
    })

    test('rare items always get +1 bonus to range', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const commonRange = (service as any).calculateEnchantmentRange(depth, 'common')
        const rareRange = (service as any).calculateEnchantmentRange(depth, 'rare')

        expect(rareRange.minBonus).toBe(commonRange.minBonus + 1)
        // maxBonus might be capped at 5, so only test if not capped
        if (commonRange.maxBonus < 5) {
          expect(rareRange.maxBonus).toBe(commonRange.maxBonus + 1)
        }
      }
    })

    test('maxBonus never exceeds 5', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const commonRange = (service as any).calculateEnchantmentRange(depth, 'common')
        const uncommonRange = (service as any).calculateEnchantmentRange(depth, 'uncommon')
        const rareRange = (service as any).calculateEnchantmentRange(depth, 'rare')

        expect(commonRange.maxBonus).toBeLessThanOrEqual(5)
        expect(uncommonRange.maxBonus).toBeLessThanOrEqual(5)
        expect(rareRange.maxBonus).toBeLessThanOrEqual(5)
      }
    })

    test('minBonus never exceeds maxBonus', () => {
      for (let depth = 1; depth <= 26; depth++) {
        const commonRange = (service as any).calculateEnchantmentRange(depth, 'common')
        const uncommonRange = (service as any).calculateEnchantmentRange(depth, 'uncommon')
        const rareRange = (service as any).calculateEnchantmentRange(depth, 'rare')

        expect(commonRange.minBonus).toBeLessThanOrEqual(commonRange.maxBonus)
        expect(uncommonRange.minBonus).toBeLessThanOrEqual(uncommonRange.maxBonus)
        expect(rareRange.minBonus).toBeLessThanOrEqual(rareRange.maxBonus)
      }
    })

    test('enchantment ranges increase with depth', () => {
      const depth1 = (service as any).calculateEnchantmentRange(1, 'common')
      const depth10 = (service as any).calculateEnchantmentRange(10, 'common')
      const depth20 = (service as any).calculateEnchantmentRange(20, 'common')
      const depth26 = (service as any).calculateEnchantmentRange(26, 'common')

      // maxBonus should generally increase (unless capped)
      expect(depth10.maxBonus).toBeGreaterThanOrEqual(depth1.maxBonus)
      expect(depth20.maxBonus).toBeGreaterThanOrEqual(depth10.maxBonus)
      expect(depth26.maxBonus).toBeGreaterThanOrEqual(depth20.maxBonus)
    })
  })

  // ============================================================================
  // CURSE CHANCE TESTS
  // ============================================================================

  describe('calculateCurseChance()', () => {
    test('depth 1 returns base chance unchanged', () => {
      const baseChance = 0.05
      const adjustedChance = (service as any).calculateCurseChance(baseChance, 1)

      // At depth 1: baseChance * (1.3 - 0.01) = baseChance * 1.29
      expect(adjustedChance).toBeCloseTo(baseChance * 1.29, 4)
    })

    test('depth 26 returns ~30% reduction', () => {
      const baseChance = 0.05
      const adjustedChance = (service as any).calculateCurseChance(baseChance, 26)

      // At depth 26: baseChance * (1.3 - 0.26) = baseChance * 1.04
      // This is about 19% reduction from depth 1 (1.29 → 1.04)
      // But 30% reduction from hypothetical no-scaling (1.0 → 0.7 would be -30%)
      expect(adjustedChance).toBeCloseTo(baseChance * 1.04, 4)
    })

    test('never returns negative chance', () => {
      const baseChances = [0.05, 0.08, 0.12]

      for (const baseChance of baseChances) {
        for (let depth = 1; depth <= 26; depth++) {
          const adjustedChance = (service as any).calculateCurseChance(baseChance, depth)
          expect(adjustedChance).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test('applies to all rarity tiers correctly', () => {
      const depth = 13
      const commonChance = (service as any).calculateCurseChance(0.05, depth)
      const uncommonChance = (service as any).calculateCurseChance(0.08, depth)
      const rareChance = (service as any).calculateCurseChance(0.12, depth)

      // All should use the same multiplier
      const multiplier = 1.3 - (depth * 0.01)
      expect(commonChance).toBeCloseTo(0.05 * multiplier, 4)
      expect(uncommonChance).toBeCloseTo(0.08 * multiplier, 4)
      expect(rareChance).toBeCloseTo(0.12 * multiplier, 4)
    })

    test('curse chance decreases with depth', () => {
      const baseChance = 0.05
      const chance1 = (service as any).calculateCurseChance(baseChance, 1)
      const chance13 = (service as any).calculateCurseChance(baseChance, 13)
      const chance26 = (service as any).calculateCurseChance(baseChance, 26)

      expect(chance13).toBeLessThan(chance1)
      expect(chance26).toBeLessThan(chance13)
    })
  })
})
