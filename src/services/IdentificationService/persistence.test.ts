import { IdentificationService } from './IdentificationService'
import { SeededRandom } from '@services/RandomService'
import {
  GameState,
  Potion,
  Scroll,
  PotionType,
  ScrollType,
  ItemType,
} from '@game/core/core'

describe('IdentificationService - Persistence', () => {
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

  describe('identification persistence across items of same type', () => {
    test('identifying one potion identifies all potions of that type', () => {
      const potion1: Potion = {
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

      const potion2: Potion = {
        id: 'potion-2',
        name: 'Potion of Healing',
        type: ItemType.POTION,
        identified: false,
        position: { x: 5, y: 5 },
        potionType: PotionType.MINOR_HEAL,
        effect: 'restore_hp',
        power: '1d8',
        descriptorName: 'blue',
      }

      // Identify first potion
      const identifiedState = service.identifyByUse(potion1, gameState)

      // Both potions should now show real name
      expect(service.getDisplayName(potion1, identifiedState)).toBe('Potion of Healing')
      expect(service.getDisplayName(potion2, identifiedState)).toBe('Potion of Healing')
    })

    test('identifying one scroll type does not identify other scroll types', () => {
      const identifyScroll: Scroll = {
        id: 'scroll-1',
        name: 'Scroll of Identify',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 0, y: 0 },
        scrollType: ScrollType.IDENTIFY,
        effect: 'identify_item',
        labelName: 'XYZZY',
      }

      const teleportScroll: Scroll = {
        id: 'scroll-2',
        name: 'Scroll of Teleportation',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 5, y: 5 },
        scrollType: ScrollType.TELEPORTATION,
        effect: 'teleport',
        labelName: 'ELBERETH',
      }

      // Identify first scroll
      const identifiedState = service.identifyByUse(identifyScroll, gameState)

      // First scroll identified, second still descriptive
      expect(service.getDisplayName(identifyScroll, identifiedState)).toBe(
        'Scroll of Identify'
      )
      expect(service.getDisplayName(teleportScroll, identifiedState)).not.toBe(
        'Scroll of Teleportation'
      )
    })
  })

  describe('identification state persistence', () => {
    test('identified items remain identified through game state updates', () => {
      let state = service.identifyItem(PotionType.MINOR_HEAL, gameState)

      // Simulate state updates (turn progression, etc.)
      state = {
        ...state,
        turnCount: 100,
      }

      state = {
        ...state,
        currentLevel: 5,
      }

      // Identification should persist
      expect(state.identifiedItems.has(PotionType.MINOR_HEAL)).toBe(true)
      expect(service.isIdentified(PotionType.MINOR_HEAL, state)).toBe(true)
    })

    test('identification state accumulates over time', () => {
      let state = gameState

      // Identify items progressively
      state = service.identifyItem(PotionType.MINOR_HEAL, state)
      expect(state.identifiedItems.size).toBe(1)

      state = service.identifyItem(ScrollType.IDENTIFY, state)
      expect(state.identifiedItems.size).toBe(2)

      state = service.identifyItem(PotionType.POISON, state)
      expect(state.identifiedItems.size).toBe(3)

      // All should remain identified
      expect(service.isIdentified(PotionType.MINOR_HEAL, state)).toBe(true)
      expect(service.isIdentified(ScrollType.IDENTIFY, state)).toBe(true)
      expect(service.isIdentified(PotionType.POISON, state)).toBe(true)
    })

    test('identifying already identified item does not duplicate', () => {
      let state = service.identifyItem(PotionType.MINOR_HEAL, gameState)
      expect(state.identifiedItems.size).toBe(1)

      // Identify same item again
      state = service.identifyItem(PotionType.MINOR_HEAL, state)
      expect(state.identifiedItems.size).toBe(1)

      // Still identified correctly
      expect(service.isIdentified(PotionType.MINOR_HEAL, state)).toBe(true)
    })
  })

  describe('item name map persistence', () => {
    test('item name map remains constant throughout game', () => {
      const initialNameMap = gameState.itemNameMap
      const healPotionName = initialNameMap.potions.get(PotionType.MINOR_HEAL)

      // Perform various state updates
      let state = service.identifyItem(PotionType.MINOR_HEAL, gameState)
      state = {
        ...state,
        turnCount: 500,
      }

      // Name map should be unchanged
      expect(state.itemNameMap).toEqual(initialNameMap)
      expect(state.itemNameMap.potions.get(PotionType.MINOR_HEAL)).toBe(healPotionName)
    })

    test('different games have different name maps', () => {
      const service1 = new IdentificationService(new SeededRandom('seed-1'))
      const service2 = new IdentificationService(new SeededRandom('seed-2'))

      const game1NameMap = service1.generateItemNames()
      const game2NameMap = service2.generateItemNames()

      const game1HealPotion = game1NameMap.potions.get(PotionType.MINOR_HEAL)
      const game2HealPotion = game2NameMap.potions.get(PotionType.MINOR_HEAL)

      // Names should differ between games (with high probability)
      // We check that at least one name differs
      const game1IdentifyScroll = game1NameMap.scrolls.get(ScrollType.IDENTIFY)
      const game2IdentifyScroll = game2NameMap.scrolls.get(ScrollType.IDENTIFY)

      const allSame =
        game1HealPotion === game2HealPotion && game1IdentifyScroll === game2IdentifyScroll

      expect(allSame).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('handles empty identified items set', () => {
      expect(gameState.identifiedItems.size).toBe(0)
      expect(service.isIdentified(PotionType.MINOR_HEAL, gameState)).toBe(false)

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
      expect(displayName).not.toBe('Potion of Healing')
    })

    test('handles multiple identifications in sequence', () => {
      let state = gameState

      // Identify all potion types
      Object.values(PotionType).forEach((type) => {
        state = service.identifyItem(type, state)
      })

      // All should be identified
      Object.values(PotionType).forEach((type) => {
        expect(service.isIdentified(type, state)).toBe(true)
      })

      expect(state.identifiedItems.size).toBe(Object.values(PotionType).length)
    })
  })
})
