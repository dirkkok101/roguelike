import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { ItemData } from '../../data/ItemDataLoader'

describe('ItemSpawnService - Category Weights', () => {
  let service: ItemSpawnService
  let mockRandom: MockRandom
  let mockItemData: ItemData
  let mockGuarantees: any

  beforeEach(() => {
    mockRandom = new MockRandom()
    mockItemData = {
      potions: [],
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
      categoryWeights: {
        '1-5': {
          potion: 20,
          scroll: 20,
          ring: 5,
          wand: 5,
          weapon: 15,
          armor: 15,
          food: 12,
          light: 8
        },
        '6-10': {
          potion: 18,
          scroll: 18,
          ring: 10,
          wand: 10,
          weapon: 12,
          armor: 12,
          food: 12,
          light: 8
        }
      },
      rangeGuarantees: {}
    }
    service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)
  })

  test('returns early game weights for depth 1-5', () => {
    const weights = service['getCategoryWeights'](3)

    expect(weights.potion).toBe(20)
    expect(weights.scroll).toBe(20)
    expect(weights.ring).toBe(5)
    expect(weights.wand).toBe(5)
  })

  test('returns mid-early weights for depth 6-10', () => {
    const weights = service['getCategoryWeights'](8)

    expect(weights.potion).toBe(18)
    expect(weights.ring).toBe(10)
    expect(weights.wand).toBe(10)
  })

  test('uses correct range for boundary depths', () => {
    expect(service['getCategoryWeights'](5).potion).toBe(20) // Still 1-5
    expect(service['getCategoryWeights'](6).potion).toBe(18) // Now 6-10
  })
})
