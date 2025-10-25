import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Player, Potion, PotionType, ItemType, GameState, ItemNameMap, ScrollType, RingType, WandType } from '@game/core/core'

describe('PotionService - Poison Potion', () => {
  let potionService: PotionService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let levelingService: LevelingService
  let statusEffectService: StatusEffectService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    statusEffectService = new StatusEffectService()
    potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

    testPlayer = {
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      maxStrength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      armorClass: 10,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      hunger: 1000,
    } as Player

    // Create itemNameMap for identification
    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>([
        [PotionType.MINOR_HEAL, 'blue potion'],
        [PotionType.MEDIUM_HEAL, 'red potion'],
        [PotionType.GAIN_STRENGTH, 'green potion'],
        [PotionType.RESTORE_STRENGTH, 'purple potion'],
        [PotionType.POISON, 'sickly potion'],
      ]),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      identifiedItems: new Set(),
      itemNameMap,
    } as GameState
  })

  describe('POISON potion', () => {
    test('damages player by rolled amount', () => {
      mockRandom = new MockRandom([6]) // Roll 6 damage
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const poisonPotion: Potion = {
        id: 'potion-5',
        type: ItemType.POTION,
        name: 'Potion of Poison',
        potionType: PotionType.POISON,
        effect: 'Deals 1d6 damage',
        power: '1d6',
        descriptorName: 'sickly potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, poisonPotion, testState)

      expect(result.player.hp).toBe(44) // 50 - 6
      expect(result.message).toBe('You feel sick! (-6 HP)')
      expect(result.death).toBe(false)
    })

    test('does not reduce HP below 0', () => {
      mockRandom = new MockRandom([100]) // Massive damage
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const poisonPotion: Potion = {
        id: 'potion-5',
        type: ItemType.POTION,
        name: 'Potion of Poison',
        potionType: PotionType.POISON,
        effect: 'Deals 1d6 damage',
        power: '1d6',
        descriptorName: 'sickly potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, poisonPotion, testState)

      expect(result.player.hp).toBe(0) // Capped at 0
      expect(result.death).toBe(true)
    })

    test('sets death flag when HP reaches 0', () => {
      mockRandom = new MockRandom([50]) // Exactly kills player
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const poisonPotion: Potion = {
        id: 'potion-5',
        type: ItemType.POTION,
        name: 'Potion of Poison',
        potionType: PotionType.POISON,
        effect: 'Deals 1d6 damage',
        power: '1d6',
        descriptorName: 'sickly potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, poisonPotion, testState)

      expect(result.player.hp).toBe(0)
      expect(result.death).toBe(true)
      expect(result.message).toBe('You feel sick! (-50 HP)')
    })

    test('does not set death flag when HP is above 0', () => {
      mockRandom = new MockRandom([10]) // Only 10 damage
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const poisonPotion: Potion = {
        id: 'potion-5',
        type: ItemType.POTION,
        name: 'Potion of Poison',
        potionType: PotionType.POISON,
        effect: 'Deals 1d6 damage',
        power: '1d6',
        descriptorName: 'sickly potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, poisonPotion, testState)

      expect(result.player.hp).toBe(40)
      expect(result.death).toBe(false)
    })

    test('marks potion as identified', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const poisonPotion: Potion = {
        id: 'potion-5',
        type: ItemType.POTION,
        name: 'Potion of Poison',
        potionType: PotionType.POISON,
        effect: 'Deals 1d6 damage',
        power: '1d6',
        descriptorName: 'sickly potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, poisonPotion, testState)

      expect(result.identified).toBe(true)
    })
  })
})
