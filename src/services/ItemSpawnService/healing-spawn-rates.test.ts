import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'
import { mockGuaranteeConfig } from '@/test-utils'

describe('ItemSpawnService - Healing Spawn Rates', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      weapons: [],
      armor: [],
      potions: [
        { type: 'MINOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '5d8', rarity: 'common', powerTier: 'basic', minDepth: 1, maxDepth: 10, descriptors: [] },
        { type: 'MEDIUM_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '8d10', rarity: 'uncommon', powerTier: 'intermediate', minDepth: 8, maxDepth: 18, descriptors: [] },
        { type: 'MAJOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '12d10', rarity: 'uncommon', powerTier: 'advanced', minDepth: 15, maxDepth: 26, descriptors: [] },
        { type: 'SUPERIOR_HEAL', spriteName: 'potion', effect: 'restore_hp', power: '15d12', rarity: 'rare', powerTier: 'advanced', minDepth: 20, maxDepth: 26, descriptors: [] }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuaranteeConfig)
  })

  describe('calculateHealingSpawnRate()', () => {
    test('Minor Heal: depth 1 returns 10.8%', () => {
      const rate = (service as any).calculateHealingSpawnRate(1, 'MINOR_HEAL')
      expect(rate).toBeCloseTo(0.108, 3)
    })

    test('Minor Heal: depth 5 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(5, 'MINOR_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Minor Heal: depth 10 returns 0% (phased out)', () => {
      const rate = (service as any).calculateHealingSpawnRate(10, 'MINOR_HEAL')
      expect(rate).toBe(0)
    })

    test('Medium Heal: depth 8 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(8, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Medium Heal: depth 13 returns 10% (peak)', () => {
      const rate = (service as any).calculateHealingSpawnRate(13, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.10, 3)
    })

    test('Medium Heal: depth 18 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(18, 'MEDIUM_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Major Heal: depth 15 returns 1%', () => {
      const rate = (service as any).calculateHealingSpawnRate(15, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.01, 3)
    })

    test('Major Heal: depth 20 returns 6%', () => {
      const rate = (service as any).calculateHealingSpawnRate(20, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.06, 3)
    })

    test('Major Heal: depth 26 returns 12%', () => {
      const rate = (service as any).calculateHealingSpawnRate(26, 'MAJOR_HEAL')
      expect(rate).toBeCloseTo(0.12, 3)
    })

    test('Superior Heal: depth 20 returns 0.5%', () => {
      const rate = (service as any).calculateHealingSpawnRate(20, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.005, 3)
    })

    test('Superior Heal: depth 23 returns 2%', () => {
      const rate = (service as any).calculateHealingSpawnRate(23, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.02, 3)
    })

    test('Superior Heal: depth 26 returns 3.5%', () => {
      const rate = (service as any).calculateHealingSpawnRate(26, 'SUPERIOR_HEAL')
      expect(rate).toBeCloseTo(0.035, 3)
    })
  })
})
