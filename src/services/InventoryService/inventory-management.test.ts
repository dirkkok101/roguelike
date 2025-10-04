import { InventoryService } from './InventoryService'
import { Player, Item, ItemType, Weapon } from '@game/core/core'

describe('InventoryService - Inventory Management', () => {
  let service: InventoryService
  let player: Player

  beforeEach(() => {
    service = new InventoryService()
    player = createMockPlayer()
  })

  describe('addItem()', () => {
    test('adds item to inventory', () => {
      const item = createMockItem('sword-1', 'Short Sword', ItemType.WEAPON)
      const result = service.addItem(player, item)

      expect(result.inventory).toHaveLength(1)
      expect(result.inventory[0].id).toBe('sword-1')
      expect(result.inventory[0].name).toBe('Short Sword')
    })

    test('removes position property from item when adding to inventory', () => {
      const item = createMockItem('potion-1', 'Healing Potion', ItemType.POTION, {
        x: 10,
        y: 5,
      })

      const result = service.addItem(player, item)

      expect(result.inventory[0]).not.toHaveProperty('position')
    })

    test('adds multiple items to inventory', () => {
      const item1 = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const item2 = createMockItem('armor-1', 'Armor', ItemType.ARMOR)
      const item3 = createMockItem('potion-1', 'Potion', ItemType.POTION)

      let result = service.addItem(player, item1)
      result = service.addItem(result, item2)
      result = service.addItem(result, item3)

      expect(result.inventory).toHaveLength(3)
      expect(result.inventory.map((i) => i.id)).toEqual(['sword-1', 'armor-1', 'potion-1'])
    })

    test('does not modify original player object', () => {
      const item = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const originalLength = player.inventory.length

      service.addItem(player, item)

      expect(player.inventory).toHaveLength(originalLength)
    })

    test('returns original player when inventory is full', () => {
      // Fill inventory to max (26 items)
      let fullPlayer = player
      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        fullPlayer = service.addItem(fullPlayer, item)
      }

      const extraItem = createMockItem('extra', 'Extra Item', ItemType.WEAPON)
      const result = service.addItem(fullPlayer, extraItem)

      expect(result.inventory).toHaveLength(26)
      expect(result).toEqual(fullPlayer)
    })
  })

  describe('removeItem()', () => {
    test('removes item from inventory by ID', () => {
      const item1 = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const item2 = createMockItem('armor-1', 'Armor', ItemType.ARMOR)

      let result = service.addItem(player, item1)
      result = service.addItem(result, item2)
      result = service.removeItem(result, 'sword-1')

      expect(result.inventory).toHaveLength(1)
      expect(result.inventory[0].id).toBe('armor-1')
    })

    test('returns player unchanged if item not found', () => {
      const item = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      let result = service.addItem(player, item)

      result = service.removeItem(result, 'nonexistent-id')

      expect(result.inventory).toHaveLength(1)
      expect(result.inventory[0].id).toBe('sword-1')
    })

    test('does not modify original player object', () => {
      const item = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const playerWithItem = service.addItem(player, item)
      const originalLength = playerWithItem.inventory.length

      service.removeItem(playerWithItem, 'sword-1')

      expect(playerWithItem.inventory).toHaveLength(originalLength)
    })
  })

  describe('findItem()', () => {
    test('finds item by ID in inventory', () => {
      const item1 = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const item2 = createMockItem('armor-1', 'Armor', ItemType.ARMOR)

      let result = service.addItem(player, item1)
      result = service.addItem(result, item2)

      const found = service.findItem(result, 'armor-1')

      expect(found).toBeDefined()
      expect(found?.name).toBe('Armor')
    })

    test('returns undefined if item not found', () => {
      const found = service.findItem(player, 'nonexistent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('findItemByType()', () => {
    test('finds first item of specified type', () => {
      const sword = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const armor = createMockItem('armor-1', 'Armor', ItemType.ARMOR)
      const potion = createMockItem('potion-1', 'Potion', ItemType.POTION)

      let result = service.addItem(player, sword)
      result = service.addItem(result, armor)
      result = service.addItem(result, potion)

      const found = service.findItemByType(result, ItemType.ARMOR)

      expect(found).toBeDefined()
      expect(found?.name).toBe('Armor')
    })

    test('returns undefined if type not found', () => {
      const sword = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const result = service.addItem(player, sword)

      const found = service.findItemByType(result, ItemType.POTION)

      expect(found).toBeUndefined()
    })
  })

  describe('getInventoryCount()', () => {
    test('returns correct inventory count', () => {
      expect(service.getInventoryCount(player)).toBe(0)

      const item1 = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const item2 = createMockItem('armor-1', 'Armor', ItemType.ARMOR)

      let result = service.addItem(player, item1)
      expect(service.getInventoryCount(result)).toBe(1)

      result = service.addItem(result, item2)
      expect(service.getInventoryCount(result)).toBe(2)
    })
  })

  describe('getAvailableSlots()', () => {
    test('returns available inventory slots', () => {
      expect(service.getAvailableSlots(player)).toBe(26)

      const item = createMockItem('sword-1', 'Sword', ItemType.WEAPON)
      const result = service.addItem(player, item)

      expect(service.getAvailableSlots(result)).toBe(25)
    })

    test('returns 0 when inventory is full', () => {
      let fullPlayer = player
      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        fullPlayer = service.addItem(fullPlayer, item)
      }

      expect(service.getAvailableSlots(fullPlayer)).toBe(0)
    })
  })
})

// ============================================================================
// Test Helpers
// ============================================================================

function createMockPlayer(): Player {
  return {
    position: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    strength: 16,
    level: 1,
    xp: 0,
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
    hunger: 1300,
    visibleCells: new Set(),
  }
}

function createMockItem(
  id: string,
  name: string,
  type: ItemType,
  position?: { x: number; y: number }
): Item {
  return {
    id,
    name,
    type,
    identified: false,
    position: position || { x: 0, y: 0 },
  }
}
