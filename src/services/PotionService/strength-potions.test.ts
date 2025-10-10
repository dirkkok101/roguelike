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

    test('increases from 17 to 18 without adding percentile', () => {
      const playerWith17Str = {
        ...testPlayer,
        strength: 17,
        maxStrength: 17,
        strengthPercentile: undefined,
      }

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

      const result = potionService.applyPotion(playerWith17Str, gainStrengthPotion, testState)

      expect(result.player.strength).toBe(18)
      expect(result.player.maxStrength).toBe(18)
      expect(result.player.strengthPercentile).toBeUndefined()
      expect(result.message).toBe('You feel stronger! (Strength: 18)')
    })

    test('adds exceptional strength percentile when at 18', () => {
      const playerWith18Str = {
        ...testPlayer,
        strength: 18,
        maxStrength: 18,
        strengthPercentile: undefined,
      }

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

      // Mock random to roll 7 for percentile
      mockRandom.setValues([7])

      const result = potionService.applyPotion(playerWith18Str, gainStrengthPotion, testState)

      expect(result.player.strength).toBe(18)
      expect(result.player.maxStrength).toBe(18)
      expect(result.player.strengthPercentile).toBe(7)
      expect(result.message).toBe('You feel stronger! (Strength: 18/07)')
    })

    test('increases exceptional strength percentile by d10', () => {
      const playerWithExceptionalStr = {
        ...testPlayer,
        strength: 18,
        maxStrength: 18,
        strengthPercentile: 50,
      }

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

      // Mock random to roll 8 for increase
      mockRandom.setValues([8])

      const result = potionService.applyPotion(playerWithExceptionalStr, gainStrengthPotion, testState)

      expect(result.player.strength).toBe(18)
      expect(result.player.maxStrength).toBe(18)
      expect(result.player.strengthPercentile).toBe(58) // 50 + 8
      expect(result.message).toBe('You feel stronger! (Strength: 18/58)')
    })

    test('caps exceptional strength percentile at 100', () => {
      const playerNearMaxStr = {
        ...testPlayer,
        strength: 18,
        maxStrength: 18,
        strengthPercentile: 96,
      }

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

      // Mock random to roll 10 (would exceed 100)
      mockRandom.setValues([10])

      const result = potionService.applyPotion(playerNearMaxStr, gainStrengthPotion, testState)

      expect(result.player.strength).toBe(18)
      expect(result.player.maxStrength).toBe(18)
      expect(result.player.strengthPercentile).toBe(100) // Capped at 100
      expect(result.message).toBe('You feel stronger! (Strength: 18/100)')
    })

    test('handles damaged exceptional strength (current < max)', () => {
      const damagedExceptionalPlayer = {
        ...testPlayer,
        strength: 16, // Drained from 18
        maxStrength: 18,
        strengthPercentile: 75,
      }

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

      // Mock random to roll 5 for increase
      mockRandom.setValues([5])

      const result = potionService.applyPotion(damagedExceptionalPlayer, gainStrengthPotion, testState)

      // Should increase percentile (max strength logic)
      expect(result.player.strength).toBe(16) // Current remains unchanged
      expect(result.player.maxStrength).toBe(18)
      expect(result.player.strengthPercentile).toBe(80) // 75 + 5
      expect(result.message).toBe('You feel stronger! (Strength: 16)') // Shows current, not percentile
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
