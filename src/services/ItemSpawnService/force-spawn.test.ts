import { ItemSpawnService } from './ItemSpawnService'
import { MockRandom } from '@services/RandomService'
import { PowerTier, ItemType, Level, Potion, PotionType } from '@game/core/core'
import { ItemDeficit } from '@services/GuaranteeTracker'

describe('ItemSpawnService - Force Spawn', () => {
  let mockLevel: Level
  let mockItemData: any
  let mockGuarantees: any

  beforeEach(() => {
    mockItemData = {
      potions: [
        {
          type: 'MINOR_HEAL',
          spriteName: 'potion_red',
          effect: 'restore_hp',
          power: '1d8',
          rarity: 'common',
          powerTier: 'basic'
        }
      ],
      scrolls: [],
      rings: [],
      wands: [],
      weapons: [],
      armor: [],
      food: [{ name: 'Food Ration', spriteName: 'food', nutrition: 1300, rarity: 'common' }],
      lightSources: [
        { type: 'torch', name: 'Torch', spriteName: 'torch', radius: 2, fuel: 650, isPermanent: false, rarity: 'common' }
      ],
      consumables: []
    }
    mockGuarantees = {
      categoryWeights: { '1-5': {} },
      rangeGuarantees: {}
    }

    mockLevel = {
      depth: 5,
      width: 80,
      height: 22,
      tiles: Array(22).fill(null).map(() =>
        Array(80).fill({ type: 'FLOOR', walkable: true } as any)
      ),
      rooms: [{
        id: 0,
        x: 10,
        y: 10,
        width: 10,
        height: 8
      }],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(22).fill(null).map(() => Array(80).fill(false))
    } as any
  })

  test('spawns healing potions for deficit', () => {
    // Create service with mock random for this test
    // Each potion spawn needs: room index, x coord, y coord, template index, item ID suffix
    const mockRandom = new MockRandom([
      0, 15, 15, 0, 1234,  // Potion 1: room 0, pos (15,15), template 0, ID 1234
      0, 16, 15, 0, 5678,  // Potion 2: room 0, pos (16,15), template 0, ID 5678
      0, 17, 15, 0, 9012   // Potion 3: room 0, pos (17,15), template 0, ID 9012
    ])
    const service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)

    const deficits: ItemDeficit[] = [
      {
        category: 'healingPotions',
        count: 3,
        powerTiers: [PowerTier.BASIC]
      }
    ]

    const result = service.forceSpawnForGuarantees(mockLevel, deficits)

    expect(result.items).toHaveLength(3)
    expect(result.items.every(i => i.type === ItemType.POTION)).toBe(true)
  })

  test('spawns multiple deficit categories', () => {
    // Create service with mock random for this test
    // Each item spawn needs: room index, x coord, y coord, template index, item ID suffix
    const mockRandom = new MockRandom([
      0, 15, 15, 0, 1234,  // Potion 1: room 0, pos (15,15), template 0, ID 1234
      0, 16, 15, 0, 5678,  // Potion 2: room 0, pos (16,15), template 0, ID 5678
      0, 17, 15, 0, 9012   // Food: room 0, pos (17,15), template 0, ID 9012
    ])
    const service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)

    const deficits: ItemDeficit[] = [
      { category: 'healingPotions', count: 2, powerTiers: [PowerTier.BASIC] },
      { category: 'food', count: 1, powerTiers: [PowerTier.BASIC] }
    ]

    const result = service.forceSpawnForGuarantees(mockLevel, deficits)

    expect(result.items).toHaveLength(3)
    const potions = result.items.filter(i => i.type === ItemType.POTION)
    const food = result.items.filter(i => i.type === ItemType.FOOD)
    expect(potions).toHaveLength(2)
    expect(food).toHaveLength(1)
  })

  test('returns unchanged level for empty deficits', () => {
    const mockRandom = new MockRandom([])
    const service = new ItemSpawnService(mockRandom, mockItemData, mockGuarantees)

    const result = service.forceSpawnForGuarantees(mockLevel, [])
    expect(result.items).toHaveLength(0)
  })

  test('respects power tier filtering for healing potions', () => {
    // Add multiple healing potion tiers to test data
    const testItemData = {
      ...mockItemData,
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
          type: 'MEDIUM_HEAL',
          spriteName: 'potion_blue',
          effect: 'restore_hp',
          power: '2d8',
          rarity: 'uncommon',
          powerTier: 'advanced'
        },
        {
          type: 'MAJOR_HEAL',
          spriteName: 'potion_green',
          effect: 'restore_hp',
          power: '4d8',
          rarity: 'rare',
          powerTier: 'elite'
        }
      ]
    }

    // Mock random for spawning 3 healing potions
    const mockRandom = new MockRandom([
      0, 15, 15, 0, 1234,  // Potion 1: room 0, pos (15,15), template 0, ID 1234
      0, 16, 15, 0, 5678,  // Potion 2: room 0, pos (16,15), template 0, ID 5678
      0, 17, 15, 0, 9012   // Potion 3: room 0, pos (17,15), template 0, ID 9012
    ])
    const service = new ItemSpawnService(mockRandom, testItemData, mockGuarantees)

    // Request only BASIC tier healing potions
    const deficits: ItemDeficit[] = [
      {
        category: 'healingPotions',
        count: 3,
        powerTiers: [PowerTier.BASIC]
      }
    ]

    const result = service.forceSpawnForGuarantees(mockLevel, deficits)

    // Verify all spawned potions are BASIC tier (MINOR_HEAL)
    expect(result.items).toHaveLength(3)
    const potions = result.items as Potion[]
    expect(potions.every(p => p.type === ItemType.POTION)).toBe(true)
    expect(potions.every(p => p.potionType === PotionType.MINOR_HEAL)).toBe(true)
  })
})
