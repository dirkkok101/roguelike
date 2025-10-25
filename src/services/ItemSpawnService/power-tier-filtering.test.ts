import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { PowerTier, PotionType } from '@game/core/core'

describe('ItemSpawnService - Power Tier Filtering', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: any
  let mockGuarantees: any

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      potions: [
        {
          type: 'MINOR_HEAL',
          spriteName: 'potion_red',
          effect: 'restore_hp',
          power: '1d8',
          rarity: 'common',
          powerTier: 'basic'
        },
        {
          type: 'HASTE_SELF',
          spriteName: 'potion_pink',
          effect: 'haste_self',
          power: '4-8',
          rarity: 'uncommon',
          powerTier: 'advanced'
        }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [],
      lightSources: [],
      consumables: []
    }
    mockGuarantees = {
      categoryWeights: { '1-5': {} },
      rangeGuarantees: {}
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)
  })

  test('filters advanced tier items for depth 1-8', () => {
    const templates = service['potionTemplates']
    const filtered = service['filterByPowerTier'](templates, 5)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe(PotionType.MINOR_HEAL)
  })

  test('allows basic and intermediate for depth 9-16', () => {
    const basicPotion = {
      type: PotionType.MINOR_HEAL,
      powerTier: PowerTier.BASIC
    }
    const intermediatePotion = {
      type: PotionType.MEDIUM_HEAL,
      powerTier: PowerTier.INTERMEDIATE
    }
    const advancedPotion = {
      type: PotionType.HASTE_SELF,
      powerTier: PowerTier.ADVANCED
    }

    const items = [basicPotion, intermediatePotion, advancedPotion] as any
    const filtered = service['filterByPowerTier'](items, 12)

    expect(filtered).toHaveLength(2)
    expect(filtered.map(i => i.type)).toEqual([
      PotionType.MINOR_HEAL,
      PotionType.MEDIUM_HEAL
    ])
  })

  test('allows all tiers for depth 17+', () => {
    const items = [
      { powerTier: PowerTier.BASIC },
      { powerTier: PowerTier.INTERMEDIATE },
      { powerTier: PowerTier.ADVANCED }
    ] as any

    const filtered = service['filterByPowerTier'](items, 20)
    expect(filtered).toHaveLength(3)
  })
})
