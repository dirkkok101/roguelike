import { ScrollService } from './ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { InventoryService } from '@services/InventoryService'
import { MockRandom } from '@services/RandomService'
import {
  Player,
  Scroll,
  ScrollType,
  Potion,
  PotionType,
  ItemType,
  GameState,
  ItemNameMap,
  RingType,
  WandType,
} from '@game/core/core'

describe('ScrollService - Identify Scroll', () => {
  let scrollService: ScrollService
  let mockRandom: MockRandom
  let identificationService: IdentificationService
  let inventoryService: InventoryService
  let testPlayer: Player
  let testState: GameState

  beforeEach(() => {
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
    inventoryService = new InventoryService()
    scrollService = new ScrollService(identificationService, inventoryService)

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
      ]),
      scrolls: new Map<ScrollType, string>([
        [ScrollType.IDENTIFY, 'scroll labeled XYZZY'],
        [ScrollType.ENCHANT_WEAPON, 'scroll labeled ELBERETH'],
        [ScrollType.ENCHANT_ARMOR, 'scroll labeled NR 9'],
      ]),
      rings: new Map<RingType, string>(),
      wands: new Map<WandType, string>(),
    }

    testState = {
      identifiedItems: new Set(),
      itemNameMap,
    } as GameState
  })

  describe('IDENTIFY scroll', () => {
    test('identifies target item', () => {
      const unidentifiedPotion: Potion = {
        id: 'potion-1',
        type: ItemType.POTION,
        name: 'Potion of Healing',
        potionType: PotionType.HEAL,
        effect: 'Heals HP',
        power: '1d8',
        descriptorName: 'blue potion',
        isIdentified: false,
      }

      testPlayer.inventory = [unidentifiedPotion]

      const identifyScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Identify',
        scrollType: ScrollType.IDENTIFY,
        effect: 'Identifies an item',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        identifyScroll,
        testState,
        'potion-1'
      )

      expect(result.player).toBe(testPlayer) // Player unchanged
      expect(result.message).toBe('You read scroll labeled XYZZY. This is Potion of Healing!')
      expect(result.identified).toBe(true)
    })

    test('handles missing target item', () => {
      const identifyScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Identify',
        scrollType: ScrollType.IDENTIFY,
        effect: 'Identifies an item',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        identifyScroll,
        testState,
        'nonexistent-item'
      )

      expect(result.message).toBe('You read scroll labeled XYZZY, but the item is gone.')
    })

    test('handles no target specified', () => {
      const identifyScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Identify',
        scrollType: ScrollType.IDENTIFY,
        effect: 'Identifies an item',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        identifyScroll,
        testState
      )

      expect(result.message).toBe('You read scroll labeled XYZZY, but nothing happens.')
    })

    test('marks scroll as identified', () => {
      const identifyScroll: Scroll = {
        id: 'scroll-1',
        type: ItemType.SCROLL,
        name: 'Scroll of Identify',
        scrollType: ScrollType.IDENTIFY,
        effect: 'Identifies an item',
        labelName: 'scroll labeled XYZZY',
        isIdentified: false,
      }

      const result = scrollService.applyScroll(
        testPlayer,
        identifyScroll,
        testState
      )

      expect(result.identified).toBe(true)
    })
  })
})
