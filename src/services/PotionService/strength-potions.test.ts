import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Player, Potion, PotionType, ItemType, GameState, ItemNameMap, ScrollType, RingType, WandType } from '@game/core/core'

describe('PotionService - Strength Potions', () => {
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

  describe('GAIN_STRENGTH potion', () => {
    test('increases both strength and max strength by 1', () => {
      const gainStrengthPotion: Potion = {
        id: 'potion-3',
        type: ItemType.POTION,
        name: 'Potion of Gain Strength',
        potionType: PotionType.GAIN_STRENGTH,
        effect: 'Increases strength by 1',
        power: '',
        descriptorName: 'green potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, gainStrengthPotion, testState)

      expect(result.player.strength).toBe(17)
      expect(result.player.maxStrength).toBe(17)
      expect(result.message).toBe('You feel stronger! (Strength: 17)')
      expect(result.death).toBe(false)
    })

    test('marks potion as identified', () => {
      const gainStrengthPotion: Potion = {
        id: 'potion-3',
        type: ItemType.POTION,
        name: 'Potion of Gain Strength',
        potionType: PotionType.GAIN_STRENGTH,
        effect: 'Increases strength by 1',
        power: '',
        descriptorName: 'green potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, gainStrengthPotion, testState)

      expect(result.identified).toBe(true)
    })
  })

  describe('RESTORE_STRENGTH potion', () => {
    test('restores strength to max strength', () => {
      const weakenedPlayer = {
        ...testPlayer,
        strength: 12, // Reduced from 16
        maxStrength: 16,
      }

      const restoreStrengthPotion: Potion = {
        id: 'potion-4',
        type: ItemType.POTION,
        name: 'Potion of Restore Strength',
        potionType: PotionType.RESTORE_STRENGTH,
        effect: 'Restores strength to maximum',
        power: '',
        descriptorName: 'purple potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(weakenedPlayer, restoreStrengthPotion, testState)

      expect(result.player.strength).toBe(16) // Restored to max
      expect(result.player.maxStrength).toBe(16) // Unchanged
      expect(result.message).toBe('Your strength is restored. (Strength: 16)')
      expect(result.death).toBe(false)
    })

    test('has no effect if strength already at max', () => {
      const restoreStrengthPotion: Potion = {
        id: 'potion-4',
        type: ItemType.POTION,
        name: 'Potion of Restore Strength',
        potionType: PotionType.RESTORE_STRENGTH,
        effect: 'Restores strength to maximum',
        power: '',
        descriptorName: 'purple potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, restoreStrengthPotion, testState)

      expect(result.player.strength).toBe(16) // Already at max
      expect(result.player.maxStrength).toBe(16)
      expect(result.message).toBe('Your strength is restored. (Strength: 16)')
    })
  })
})
