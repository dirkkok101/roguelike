import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Player, Potion, PotionType, ItemType, GameState, ItemNameMap, ScrollType, RingType, WandType, StatusEffectType } from '@game/core/core'

describe('PotionService - Heal Potions', () => {
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
      statusEffects: [],
      energy: 100,
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

  describe('MINOR_HEAL potion', () => {
    test('heals player by rolled amount (within max HP)', () => {
      mockRandom = new MockRandom([8]) // Roll 8 HP
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
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
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
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
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.identified).toBe(true)
    })
  })

  describe('MEDIUM_HEAL potion', () => {
    test('heals player by rolled amount with better message', () => {
      mockRandom = new MockRandom([15]) // Roll 15 HP
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.MEDIUM_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, extraHealPotion, testState)

      expect(result.player.hp).toBe(65) // 50 + 15
      expect(result.message).toBe('You feel better. (+15 HP)')
      expect(result.death).toBe(false)
    })

    test('caps healing at max HP', () => {
      mockRandom = new MockRandom([100])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.MEDIUM_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, extraHealPotion, testState)

      expect(result.player.hp).toBe(100) // Capped
      expect(result.message).toBe('You feel better. (+50 HP)')
    })
  })

  describe('Overheal - Max HP Increase', () => {
    test('HEAL potion: no max HP increase when not at full HP', () => {
      mockRandom = new MockRandom([10]) // Roll 10 HP
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      // Player at 50/100 HP
      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.player.hp).toBe(60) // 50 + 10
      expect(result.player.maxHp).toBe(100) // No change
      expect(result.message).toBe('You feel better. (+10 HP)')
      expect(result.message).not.toContain('permanently stronger')
    })

    test('HEAL potion: +1 max HP when healing at full HP', () => {
      mockRandom = new MockRandom([5]) // Roll 5 HP (overheal)
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const playerAtFullHp = {
        ...testPlayer,
        hp: 100,
        maxHp: 100,
      }

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(playerAtFullHp, healPotion, testState)

      expect(result.player.hp).toBe(101) // Healed to new max
      expect(result.player.maxHp).toBe(101) // Increased by 1
      expect(result.message).toContain('You feel better. (+1 HP)')
      expect(result.message).toContain('You feel permanently stronger! (Max HP +1)')
    })

    test('HEAL potion: heals correctly to new maximum', () => {
      mockRandom = new MockRandom([8]) // Roll 8 HP (overheal)
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const playerAtFullHp = {
        ...testPlayer,
        hp: 100,
        maxHp: 100,
      }

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(playerAtFullHp, healPotion, testState)

      expect(result.player.hp).toBe(101) // Capped at new max (100 + 1)
      expect(result.player.maxHp).toBe(101) // Increased by 1
      expect(result.message).toContain('permanently stronger')
    })

    test('EXTRA_HEAL potion: +1 max HP when healing at full HP', () => {
      mockRandom = new MockRandom([12]) // Roll 12 HP (overheal)
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const playerAtFullHp = {
        ...testPlayer,
        hp: 100,
        maxHp: 100,
      }

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.MEDIUM_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(playerAtFullHp, extraHealPotion, testState)

      expect(result.player.hp).toBe(101) // Healed to new max
      expect(result.player.maxHp).toBe(101) // Increased by 1
      expect(result.message).toContain('You feel better. (+1 HP)')
      expect(result.message).toContain('You feel permanently stronger! (Max HP +1)')
    })

    test('EXTRA_HEAL potion: no max HP increase when not at full HP', () => {
      mockRandom = new MockRandom([15])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.MEDIUM_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      // Player at 50/100 HP
      const result = potionService.applyPotion(testPlayer, extraHealPotion, testState)

      expect(result.player.hp).toBe(65) // 50 + 15
      expect(result.player.maxHp).toBe(100) // No change
      expect(result.message).toBe('You feel better. (+15 HP)')
      expect(result.message).not.toContain('permanently stronger')
    })

    test('overheal only triggers when already at full HP', () => {
      mockRandom = new MockRandom([100]) // Massive overheal
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const playerAlmostFull = {
        ...testPlayer,
        hp: 99, // 1 HP below max
        maxHp: 100,
      }

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(playerAlmostFull, healPotion, testState)

      expect(result.player.hp).toBe(100) // Healed to max
      expect(result.player.maxHp).toBe(100) // NO increase (wasn't at full HP)
      expect(result.message).not.toContain('permanently stronger')
    })
  })

  describe('Status Effect Cure', () => {
    test('HEAL potion cures confusion', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      let player = testPlayer
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, healPotion, testState)

      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(result.message).toContain('Your head clears!')
    })

    test('HEAL potion cures blindness', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      let player = testPlayer
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, healPotion, testState)

      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.message).toContain('You can see again!')
    })

    test('HEAL potion cures both confusion and blindness', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      let player = testPlayer
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, healPotion, testState)

      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.message).toContain('Your head clears!')
      expect(result.message).toContain('You can see again!')
    })

    test('EXTRA_HEAL potion cures confusion and blindness', () => {
      mockRandom = new MockRandom([12])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      let player = testPlayer
      player = statusEffectService.addStatusEffect(player, StatusEffectType.CONFUSED, 10)
      player = statusEffectService.addStatusEffect(player, StatusEffectType.BLIND, 40)

      const extraHealPotion: Potion = {
        id: 'potion-2',
        type: ItemType.POTION,
        name: 'Potion of Extra Healing',
        potionType: PotionType.MEDIUM_HEAL,
        effect: 'Heals 2d8 HP',
        power: '2d8',
        descriptorName: 'red potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(player, extraHealPotion, testState)

      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.CONFUSED)).toBe(false)
      expect(statusEffectService.hasStatusEffect(result.player, StatusEffectType.BLIND)).toBe(false)
      expect(result.message).toContain('Your head clears!')
      expect(result.message).toContain('You can see again!')
    })

    test('HEAL potion does not add cure messages when no status effects present', () => {
      mockRandom = new MockRandom([5])
      potionService = new PotionService(mockRandom, identificationService, levelingService, statusEffectService)

      const healPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.MINOR_HEAL,
        effect: 'Heals 1d8 HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      const result = potionService.applyPotion(testPlayer, healPotion, testState)

      expect(result.message).not.toContain('Your head clears!')
      expect(result.message).not.toContain('You can see again!')
    })
  })
})
