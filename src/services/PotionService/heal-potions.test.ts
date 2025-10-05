import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { Player, Potion, PotionType, ItemType, GameState, ItemNameMap, ScrollType, RingType, WandType } from '@game/core/core'

describe('PotionService - Heal Potions', () => {
  let potionService: PotionService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    potionService = new PotionService(mockRandom, identificationService)

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
        [PotionType.HEAL, 'blue potion'],
        [PotionType.EXTRA_HEAL, 'red potion'],
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

  describe('HEAL potion', () => {
    test('heals player by rolled amount (within max HP)', () => {
      mockRandom = new MockRandom([8]) // Roll 8 HP
      potionService = new PotionService(mockRandom, identificationService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.player.hp).toBe(58) // 50 + 8
      expect(result.message).toBe('You feel better. (+8 HP)')
      expect(result.death).toBe(false)
    })

    test('caps healing at max HP', () => {
      mockRandom = new MockRandom([100]) // Roll 100 HP (way over max)
      potionService = new PotionService(mockRandom, identificationService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.player.hp).toBe(100) // Capped at maxHp
      expect(result.message).toBe('You feel better. (+50 HP)') // Actual heal was 50
    })

    test('marks potion as identified', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.identified).toBe(true)
    })
  })

  describe('EXTRA_HEAL potion', () => {
    test('heals player by rolled amount with better message', () => {
      mockRandom = new MockRandom([15]) // Roll 15 HP
      potionService = new PotionService(mockRandom, identificationService)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.EXTRA_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, extraHealPotion, testState)

      expect(result.player.hp).toBe(65) // 50 + 15
      expect(result.message).toBe('You feel much better! (+15 HP)')
      expect(result.death).toBe(false)
    })

    test('caps healing at max HP', () => {
      mockRandom = new MockRandom([100])
      potionService = new PotionService(mockRandom, identificationService)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.EXTRA_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, extraHealPotion, testState)

      expect(result.player.hp).toBe(100) // Capped
      expect(result.message).toBe('You feel much better! (+50 HP)')
    })
  })
})
