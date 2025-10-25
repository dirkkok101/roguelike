import { IdentificationService } from './IdentificationService'
import { SeededRandom } from '@services/RandomService'
import {
  GameState,
  Potion,
  Scroll,
  Ring,
  Wand,
  Weapon,
  PotionType,
  ScrollType,
  RingType,
  WandType,
  ItemType,
} from '@game/core/core'

describe('IdentificationService - Identification', () => {
  let service: IdentificationService
  let random: SeededRandom
  let gameState: GameState

  beforeEach(() => {
    random = new SeededRandom('test-seed')
    service = new IdentificationService(random)

    const itemNameMap = service.generateItemNames()

    gameState = {
      player: {} as any,
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      itemNameMap,
      identifiedItems: new Set<string>(),
    }
  })

  describe('identifyItem()', () => {
    test('marks item type as identified', () => {
      const result = service.identifyItem(PotionType.MINOR_HEAL, gameState)

      expect(result.identifiedItems.has(PotionType.MINOR_HEAL)).toBe(true)
    })

    test('does not modify original game state', () => {
      service.identifyItem(PotionType.MINOR_HEAL, gameState)

      expect(gameState.identifiedItems.has(PotionType.MINOR_HEAL)).toBe(false)
    })

    test('preserves other identified items', () => {
      let result = service.identifyItem(PotionType.MINOR_HEAL, gameState)
      result = service.identifyItem(ScrollType.IDENTIFY, result)

      expect(result.identifiedItems.has(PotionType.MINOR_HEAL)).toBe(true)
      expect(result.identifiedItems.has(ScrollType.IDENTIFY)).toBe(true)
    })
  })

  describe('isIdentified()', () => {
    test('returns false for unidentified item', () => {
      expect(service.isIdentified(PotionType.MINOR_HEAL, gameState)).toBe(false)
    })

    test('returns true for identified item', () => {
      const result = service.identifyItem(PotionType.MINOR_HEAL, gameState)

      expect(service.isIdentified(PotionType.MINOR_HEAL, result)).toBe(true)
    })
  })

  describe('getDisplayName()', () => {
    test('returns descriptive name for unidentified potion', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Healing',
        type: ItemType.POTION,
        identified: false,
        position: { x: 0, y: 0 },
        potionType: PotionType.MINOR_HEAL,
        effect: 'restore_hp',
        power: '1d8',
        descriptorName: 'blue',
      }

      const displayName = service.getDisplayName(potion, gameState)
      const descriptiveName = gameState.itemNameMap.potions.get(PotionType.MINOR_HEAL)

      expect(displayName).toBe(descriptiveName)
      expect(displayName).not.toBe('Potion of Healing')
    })

    test('returns real name for identified potion', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Healing',
        type: ItemType.POTION,
        identified: false,
        position: { x: 0, y: 0 },
        potionType: PotionType.MINOR_HEAL,
        effect: 'restore_hp',
        power: '1d8',
        descriptorName: 'blue',
      }

      const identifiedState = service.identifyItem(PotionType.MINOR_HEAL, gameState)
      const displayName = service.getDisplayName(potion, identifiedState)

      expect(displayName).toBe('Potion of Healing')
    })

    test('returns descriptive name for unidentified scroll', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        name: 'Scroll of Identify',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 0, y: 0 },
        scrollType: ScrollType.IDENTIFY,
        effect: 'identify_item',
        labelName: 'XYZZY',
      }

      const displayName = service.getDisplayName(scroll, gameState)
      const descriptiveName = gameState.itemNameMap.scrolls.get(ScrollType.IDENTIFY)

      expect(displayName).toBe(descriptiveName)
      expect(displayName).not.toBe('Scroll of Identify')
    })

    test('returns real name for identified scroll', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        name: 'Scroll of Identify',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 0, y: 0 },
        scrollType: ScrollType.IDENTIFY,
        effect: 'identify_item',
        labelName: 'XYZZY',
      }

      const identifiedState = service.identifyItem(ScrollType.IDENTIFY, gameState)
      const displayName = service.getDisplayName(scroll, identifiedState)

      expect(displayName).toBe('Scroll of Identify')
    })

    test('returns descriptive name for unidentified ring', () => {
      const ring: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: false,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'ac_bonus',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const displayName = service.getDisplayName(ring, gameState)
      const descriptiveName = gameState.itemNameMap.rings.get(RingType.PROTECTION)

      expect(displayName).toBe(descriptiveName)
    })

    test('returns real name for identified ring', () => {
      const ring: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: false,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'ac_bonus',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const identifiedState = service.identifyItem(RingType.PROTECTION, gameState)
      const displayName = service.getDisplayName(ring, identifiedState)

      expect(displayName).toBe('Ring of Protection')
    })

    test('returns descriptive name for unidentified wand', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Lightning',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 10,
        woodName: 'oak',
      }

      const displayName = service.getDisplayName(wand, gameState)
      const descriptiveName = gameState.itemNameMap.wands.get(WandType.LIGHTNING)

      expect(displayName).toBe(descriptiveName)
    })

    test('returns real name for identified wand', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Lightning',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.LIGHTNING,
        damage: '3d6',
        charges: 10,
        currentCharges: 10,
        woodName: 'oak',
      }

      const identifiedState = service.identifyItem(WandType.LIGHTNING, gameState)
      const displayName = service.getDisplayName(wand, identifiedState)

      expect(displayName).toBe('Wand of Lightning (10 charges)')
    })

    test('always returns real name for weapons (no identification needed)', () => {
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        identified: false,
        position: { x: 0, y: 0 },
        damage: '1d12',
        bonus: 0,
      }

      const displayName = service.getDisplayName(weapon, gameState)

      expect(displayName).toBe('Long Sword')
    })
  })

  describe('getItemTypeKey()', () => {
    test('returns potion type key for potions', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Healing',
        type: ItemType.POTION,
        identified: false,
        position: { x: 0, y: 0 },
        potionType: PotionType.MINOR_HEAL,
        effect: 'restore_hp',
        power: '1d8',
        descriptorName: 'blue',
      }

      expect(service.getItemTypeKey(potion)).toBe(PotionType.MINOR_HEAL)
    })

    test('returns scroll type key for scrolls', () => {
      const scroll: Scroll = {
        id: 'scroll-1',
        name: 'Scroll of Identify',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 0, y: 0 },
        scrollType: ScrollType.IDENTIFY,
        effect: 'identify_item',
        labelName: 'XYZZY',
      }

      expect(service.getItemTypeKey(scroll)).toBe(ScrollType.IDENTIFY)
    })

    test('returns null for weapons (no identification needed)', () => {
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        identified: false,
        position: { x: 0, y: 0 },
        damage: '1d12',
        bonus: 0,
      }

      expect(service.getItemTypeKey(weapon)).toBeNull()
    })
  })

  describe('identifyByUse()', () => {
    test('identifies item when used', () => {
      const potion: Potion = {
        id: 'potion-1',
        name: 'Potion of Healing',
        type: ItemType.POTION,
        identified: false,
        position: { x: 0, y: 0 },
        potionType: PotionType.MINOR_HEAL,
        effect: 'restore_hp',
        power: '1d8',
        descriptorName: 'blue',
      }

      const result = service.identifyByUse(potion, gameState)

      expect(result.identifiedItems.has(PotionType.MINOR_HEAL)).toBe(true)
    })

    test('returns unchanged state for items that do not need identification', () => {
      const weapon: Weapon = {
        id: 'sword-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        identified: false,
        position: { x: 0, y: 0 },
        damage: '1d12',
        bonus: 0,
      }

      const result = service.identifyByUse(weapon, gameState)

      expect(result).toEqual(gameState)
    })
  })

  describe('wand charge visibility', () => {
    test('hides charge count for unidentified wands', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Fire',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.FIRE,
        damage: '6d6',
        charges: 10,
        currentCharges: 7,
        woodName: 'oak',
      }

      const displayName = service.getDisplayName(wand, gameState)

      // Should show only descriptive name (no charges)
      expect(displayName).not.toContain('charges')
      expect(displayName).not.toContain('7')
    })

    test('shows charge count for identified wands', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Fire',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.FIRE,
        damage: '6d6',
        charges: 10,
        currentCharges: 7,
        woodName: 'oak',
      }

      const identifiedState = service.identifyItem(WandType.FIRE, gameState)
      const displayName = service.getDisplayName(wand, identifiedState)

      // Should show true name with charge count
      expect(displayName).toBe('Wand of Fire (7 charges)')
    })

    test('uses singular "charge" for wand with 1 charge', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Cold',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.COLD,
        damage: '6d6',
        charges: 10,
        currentCharges: 1,
        woodName: 'pine',
      }

      const identifiedState = service.identifyItem(WandType.COLD, gameState)
      const displayName = service.getDisplayName(wand, identifiedState)

      // Should use singular "charge"
      expect(displayName).toBe('Wand of Cold (1 charge)')
    })

    test('updates charge count as wand is used', () => {
      const wand: Wand = {
        id: 'wand-1',
        name: 'Wand of Lightning',
        type: ItemType.WAND,
        identified: false,
        position: { x: 0, y: 0 },
        wandType: WandType.LIGHTNING,
        damage: '6d6',
        charges: 5,
        currentCharges: 5,
        woodName: 'crystal',
      }

      const identifiedState = service.identifyItem(WandType.LIGHTNING, gameState)

      // Full charges
      let displayName = service.getDisplayName(wand, identifiedState)
      expect(displayName).toBe('Wand of Lightning (5 charges)')

      // After one use
      wand.currentCharges = 4
      displayName = service.getDisplayName(wand, identifiedState)
      expect(displayName).toBe('Wand of Lightning (4 charges)')

      // After more uses
      wand.currentCharges = 2
      displayName = service.getDisplayName(wand, identifiedState)
      expect(displayName).toBe('Wand of Lightning (2 charges)')

      // Last charge
      wand.currentCharges = 1
      displayName = service.getDisplayName(wand, identifiedState)
      expect(displayName).toBe('Wand of Lightning (1 charge)')

      // No charges
      wand.currentCharges = 0
      displayName = service.getDisplayName(wand, identifiedState)
      expect(displayName).toBe('Wand of Lightning (0 charges)')
    })

    test('hides charges for different wand types when unidentified', () => {
      const wandTypes = [
        { type: WandType.FIRE, name: 'Wand of Fire' },
        { type: WandType.COLD, name: 'Wand of Cold' },
        { type: WandType.LIGHTNING, name: 'Wand of Lightning' },
        { type: WandType.MAGIC_MISSILE, name: 'Wand of Magic Missile' },
        { type: WandType.SLEEP, name: 'Wand of Sleep' },
      ]

      wandTypes.forEach(({ type, name }) => {
        const wand: Wand = {
          id: `wand-${type}`,
          name,
          type: ItemType.WAND,
          identified: false,
          position: { x: 0, y: 0 },
          wandType: type,
          damage: '6d6',
          charges: 10,
          currentCharges: 7,
          woodName: 'oak',
        }

        const displayName = service.getDisplayName(wand, gameState)

        // All unidentified wands should hide charges
        expect(displayName).not.toContain('charges')
        expect(displayName).not.toContain('charge')
        expect(displayName).not.toContain('7')
      })
    })
  })
})
