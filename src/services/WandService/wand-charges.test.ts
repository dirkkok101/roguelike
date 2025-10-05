import { WandService } from './WandService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import {
  Player,
  Wand,
  WandType,
  ItemType,
  GameState,
  ItemNameMap,
  PotionType,
  ScrollType,
  RingType,
} from '@game/core/core'

describe('WandService - Charge System', () => {
  let wandService: WandService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    wandService = new WandService(identificationService)

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

    const itemNameMap: ItemNameMap = {
      potions: new Map<PotionType, string>(),
      scrolls: new Map<ScrollType, string>(),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>([
        [WandType.LIGHTNING, 'oak wand'],
        [WandType.FIRE, 'pine wand'],
      ]),
    }

    testState = {
      identifiedItems: new Set(),
      itemNameMap,
    } as GameState
  })

  describe('charge depletion', () => {
    test('decrements charges by 1 when used', () => {
      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState
      )

      expect(result.wand.currentCharges).toBe(4) // 5 - 1
      expect(result.wand.charges).toBe(10) // Max unchanged
    })

    test('works when wand has 1 charge left', () => {
      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 1, // Last charge
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState
      )

      expect(result.wand.currentCharges).toBe(0)
      expect(result.message).toContain('Effect not yet implemented')
    })

    test('refuses to use wand with 0 charges', () => {
      const depletedWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 0, // Empty
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        depletedWand,
        testState
      )

      expect(result.wand.currentCharges).toBe(0) // Unchanged
      expect(result.message).toBe('The wand has no charges.')
      expect(result.identified).toBe(false) // Not identified by failed use
    })

    test('player remains unchanged when using wand', () => {
      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState
      )

      expect(result.player).toBe(testPlayer) // No modifications
    })
  })

  describe('identification', () => {
    test('marks wand as identified when used', () => {
      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState
      )

      expect(result.identified).toBe(true)
    })

    test('shows descriptive name for unidentified wand', () => {
      const lightningWand: Wand = {
        id: 'wand-1',
        type: ItemType.WAND,
        name: 'Wand of Lightning',
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 5,
        woodName: 'oak wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        lightningWand,
        testState
      )

      expect(result.message).toContain('oak wand')
    })
  })

  describe('placeholder effects', () => {
    test('returns placeholder message for all wand types', () => {
      const fireWand: Wand = {
        id: 'wand-2',
        type: ItemType.WAND,
        name: 'Wand of Fire',
        wandType: WandType.FIRE,
        damage: '2d6',
        charges: 8,
        currentCharges: 8,
        woodName: 'pine wand',
        isIdentified: false,
      }

      const result = wandService.applyWand(
        testPlayer,
        fireWand,
        testState
      )

      expect(result.message).toBe('You zap pine wand. (Effect not yet implemented)')
    })
  })
})
