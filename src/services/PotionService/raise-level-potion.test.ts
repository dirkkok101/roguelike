import { PotionService } from './PotionService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import {
  Player,
  Potion,
  PotionType,
  ItemType,
  GameState,
  ItemNameMap,
  ScrollType,
  RingType,
  WandType,
} from '@game/core/core'

describe('PotionService - Raise Level Potion', () => {
  let potionService: PotionService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let levelingService: LevelingService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    levelingService = new LevelingService(mockRandom)
    potionService = new PotionService(
      mockRandom,
      identificationService,
      levelingService
    )

    testPlayer = {
      position: { x: 5, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      maxStrength: 16,
      level: 3,
      xp: 75,
      gold: 0,
      ac: 10,
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
        [PotionType.RAISE_LEVEL, 'golden potion'],
      ]),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      player: testPlayer,
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: '12345',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap,
      identifiedItems: new Set<string>(),
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    } as GameState
  })

  describe('applyPotion - RAISE_LEVEL', () => {
    test('increases player level by 1', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Set HP roll to 8
      mockRandom.setValues([8])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.level).toBe(4) // 3 → 4
    })

    test('increases max HP by 1d8', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Set HP roll to 5
      mockRandom.setValues([5])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.maxHp).toBe(105) // 100 + 5
    })

    test('fully heals player on level up', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Player at half HP
      testPlayer = { ...testPlayer, hp: 50, maxHp: 100 }

      // Set HP roll to 6
      mockRandom.setValues([6])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.hp).toBe(106) // Fully healed to new max (100 + 6)
      expect(result.player.maxHp).toBe(106)
    })

    test('returns appropriate message with new level', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      mockRandom.setValues([7])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.message).toBe('You feel more experienced! (Level 4)')
    })

    test('handles XP carry-over correctly', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Player at level 3 with 75 XP (level 3 needs 60 XP, carry-over = 15)
      testPlayer = { ...testPlayer, level: 3, xp: 75 }

      mockRandom.setValues([8])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      // Level 4 needs 100 XP, carry-over should be 75 - 60 = 15
      expect(result.player.level).toBe(4)
      expect(result.player.xp).toBe(15)
    })

    test('does not level up if already at max level (10)', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Player at max level
      testPlayer = { ...testPlayer, level: 10, xp: 500, hp: 200, maxHp: 200 }

      const result = potionService.applyPotion(testPlayer, potion, testState)

      // Should not level up
      expect(result.player.level).toBe(10)
      expect(result.player.maxHp).toBe(200) // No HP increase
      expect(result.player.hp).toBe(200) // No change
    })

    test('works correctly for low-level player', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      // Player at level 1
      testPlayer = { ...testPlayer, level: 1, xp: 5, hp: 20, maxHp: 20 }

      mockRandom.setValues([3])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.player.level).toBe(2) // 1 → 2
      expect(result.player.maxHp).toBe(23) // 20 + 3
      expect(result.player.hp).toBe(23) // Fully healed
    })

    test('auto-identifies potion when consumed', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      mockRandom.setValues([6])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.identified).toBe(true) // Was unidentified before use
    })

    test('does not kill player', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Raise Level',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.RAISE_LEVEL,
        effect: 'raise_level',
        power: '1',
        descriptorName: 'golden potion',
      }

      mockRandom.setValues([8])

      const result = potionService.applyPotion(testPlayer, potion, testState)

      expect(result.death).toBeFalsy() // No death
    })
  })
})
