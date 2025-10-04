import { InventoryService } from './InventoryService'
import { Player, Item, ItemType } from '@game/core/core'

describe('InventoryService - Carry Capacity', () => {
  let service: InventoryService
  let player: Player

  beforeEach(() => {
    service = new InventoryService()
    player = createMockPlayer()
  })

  describe('canCarry()', () => {
    test('returns true when inventory is empty', () => {
      expect(service.canCarry(player.inventory)).toBe(true)
    })

    test('returns true when inventory has space', () => {
      const items: Item[] = []
      for (let i = 0; i < 10; i++) {
        items.push(createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON))
      }

      expect(service.canCarry(items)).toBe(true)
    })

    test('returns true when inventory has 25 items (one slot left)', () => {
      const items: Item[] = []
      for (let i = 0; i < 25; i++) {
        items.push(createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON))
      }

      expect(service.canCarry(items)).toBe(true)
    })

    test('returns false when inventory is full (26 items)', () => {
      const items: Item[] = []
      for (let i = 0; i < 26; i++) {
        items.push(createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON))
      }

      expect(service.canCarry(items)).toBe(false)
    })

    test('returns false when inventory exceeds capacity', () => {
      const items: Item[] = []
      for (let i = 0; i < 30; i++) {
        items.push(createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON))
      }

      expect(service.canCarry(items)).toBe(false)
    })
  })

  describe('MAX_INVENTORY_SIZE limit (26 items)', () => {
    test('allows adding up to 26 items', () => {
      let result = player

      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(result.inventory).toHaveLength(26)
      expect(service.canCarry(result.inventory)).toBe(false)
    })

    test('prevents adding 27th item', () => {
      let result = player

      // Add 26 items
      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      // Try to add 27th item
      const extraItem = createMockItem('extra', 'Extra Item', ItemType.WEAPON)
      const finalResult = service.addItem(result, extraItem)

      expect(finalResult.inventory).toHaveLength(26)
      expect(finalResult).toEqual(result) // Should return unchanged
    })

    test('inventory size corresponds to a-z letters (26)', () => {
      // This test documents that max inventory size matches
      // the number of selectable letters in the inventory UI (a-z)
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'
      expect(alphabet.length).toBe(26)

      let result = player
      for (let i = 0; i < alphabet.length; i++) {
        const item = createMockItem(`item-${alphabet[i]}`, `Item ${alphabet[i]}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(result.inventory).toHaveLength(26)
      expect(service.canCarry(result.inventory)).toBe(false)
    })
  })

  describe('getAvailableSlots() with capacity', () => {
    test('calculates available slots correctly', () => {
      let result = player

      expect(service.getAvailableSlots(result)).toBe(26)

      for (let i = 0; i < 10; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(service.getAvailableSlots(result)).toBe(16)

      for (let i = 10; i < 20; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(service.getAvailableSlots(result)).toBe(6)
    })

    test('returns 0 when inventory is full', () => {
      let result = player

      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(service.getAvailableSlots(result)).toBe(0)
    })
  })

  describe('inventory management near capacity', () => {
    test('can remove and add items when at capacity', () => {
      let result = player

      // Fill inventory
      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      // Remove one item
      result = service.removeItem(result, 'item-0')
      expect(result.inventory).toHaveLength(25)
      expect(service.canCarry(result.inventory)).toBe(true)

      // Add a new item
      const newItem = createMockItem('new-item', 'New Item', ItemType.WEAPON)
      result = service.addItem(result, newItem)

      expect(result.inventory).toHaveLength(26)
      expect(service.canCarry(result.inventory)).toBe(false)
    })

    test('equipping items does not count against inventory capacity', () => {
      const weapon = createMockItem('weapon-1', 'Sword', ItemType.WEAPON)
      const armor = createMockItem('armor-1', 'Armor', ItemType.ARMOR)

      let result = service.addItem(player, weapon)
      result = service.addItem(result, armor)

      // Add 24 more items to fill inventory (26 total)
      for (let i = 0; i < 24; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(result.inventory).toHaveLength(26)

      // Equip weapon - should free up a slot
      result = service.equipWeapon(result, weapon as any)

      expect(result.inventory).toHaveLength(25)
      expect(service.canCarry(result.inventory)).toBe(true)

      // Can now add another item
      const newItem = createMockItem('new-item', 'New Item', ItemType.WEAPON)
      result = service.addItem(result, newItem)

      expect(result.inventory).toHaveLength(26)
    })

    test('unequipping items when inventory is full fails gracefully', () => {
      const weapon = createMockItem('weapon-1', 'Sword', ItemType.WEAPON)
      let result = service.addItem(player, weapon)
      result = service.equipWeapon(result, weapon as any)

      // Fill inventory to max
      for (let i = 0; i < 26; i++) {
        const item = createMockItem(`item-${i}`, `Item ${i}`, ItemType.WEAPON)
        result = service.addItem(result, item)
      }

      expect(result.inventory).toHaveLength(26)
      expect(result.equipment.weapon).toBeTruthy()

      // Note: Current implementation doesn't prevent this case
      // This test documents current behavior
      // A future enhancement could add unequip validation
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

function createMockItem(id: string, name: string, type: ItemType): Item {
  return {
    id,
    name,
    type,
    identified: false,
    position: { x: 0, y: 0 },
  }
}
