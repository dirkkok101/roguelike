import { InventoryService } from './InventoryService'
import { Player, Weapon, Armor, Ring, ItemType, RingType } from '@game/core/core'

describe('InventoryService - Equipment Management', () => {
  let service: InventoryService
  let player: Player

  beforeEach(() => {
    service = new InventoryService()
    player = createMockPlayer()
  })

  describe('equipWeapon()', () => {
    test('equips weapon from inventory', () => {
      const sword = createMockWeapon('sword-1', 'Long Sword', '1d12', 0)
      const playerWithItem = service.addItem(player, sword)

      const result = service.equipWeapon(playerWithItem, sword)

      expect(result.equipment.weapon).toEqual(sword)
      expect(result.inventory).not.toContainEqual(sword)
    })

    test('unequips old weapon to inventory when equipping new one', () => {
      const oldSword = createMockWeapon('sword-1', 'Short Sword', '1d8', 0)
      const newSword = createMockWeapon('sword-2', 'Long Sword', '1d12', 1)

      let result = service.addItem(player, oldSword)
      result = service.equipWeapon(result, oldSword)
      result = service.addItem(result, newSword)
      result = service.equipWeapon(result, newSword)

      expect(result.equipment.weapon?.id).toBe('sword-2')
      expect(result.inventory.find((i) => i.id === 'sword-1')).toBeDefined()
      expect(result.inventory.find((i) => i.id === 'sword-2')).toBeUndefined()
    })

    test('does not modify original player', () => {
      const sword = createMockWeapon('sword-1', 'Sword', '1d8', 0)
      const playerWithItem = service.addItem(player, sword)

      service.equipWeapon(playerWithItem, sword)

      expect(playerWithItem.equipment.weapon).toBeNull()
    })
  })

  describe('equipArmor()', () => {
    test('equips armor from inventory', () => {
      const armor = createMockArmor('armor-1', 'Chain Mail', 5, 0)
      const playerWithItem = service.addItem(player, armor)

      const result = service.equipArmor(playerWithItem, armor)

      expect(result.equipment.armor).toEqual(armor)
      expect(result.inventory).not.toContainEqual(armor)
    })

    test('updates player AC when equipping armor', () => {
      const armor = createMockArmor('armor-1', 'Chain Mail', 5, 0)
      const playerWithItem = service.addItem(player, armor)

      const result = service.equipArmor(playerWithItem, armor)

      expect(result.ac).toBe(5)
    })

    test('applies armor bonus to AC', () => {
      const enchantedArmor = createMockArmor('armor-1', 'Chain Mail +1', 5, 1)
      const playerWithItem = service.addItem(player, enchantedArmor)

      const result = service.equipArmor(playerWithItem, enchantedArmor)

      expect(result.ac).toBe(4) // AC 5 - 1 bonus = 4
    })

    test('unequips old armor to inventory when equipping new one', () => {
      const oldArmor = createMockArmor('armor-1', 'Leather', 8, 0)
      const newArmor = createMockArmor('armor-2', 'Plate Mail', 3, 0)

      let result = service.addItem(player, oldArmor)
      result = service.equipArmor(result, oldArmor)
      result = service.addItem(result, newArmor)
      result = service.equipArmor(result, newArmor)

      expect(result.equipment.armor?.id).toBe('armor-2')
      expect(result.ac).toBe(3)
      expect(result.inventory.find((i) => i.id === 'armor-1')).toBeDefined()
    })
  })

  describe('equipRing()', () => {
    test('equips ring to left slot', () => {
      const ring = createMockRing('ring-1', 'Ruby Ring', RingType.PROTECTION, 1)
      const playerWithItem = service.addItem(player, ring)

      const result = service.equipRing(playerWithItem, ring, 'left')

      expect(result.equipment.leftRing).toEqual(ring)
      expect(result.equipment.rightRing).toBeNull()
      expect(result.inventory).not.toContainEqual(ring)
    })

    test('equips ring to right slot', () => {
      const ring = createMockRing('ring-1', 'Sapphire Ring', RingType.REGENERATION, 1)
      const playerWithItem = service.addItem(player, ring)

      const result = service.equipRing(playerWithItem, ring, 'right')

      expect(result.equipment.rightRing).toEqual(ring)
      expect(result.equipment.leftRing).toBeNull()
    })

    test('can equip different rings in both slots', () => {
      const leftRing = createMockRing('ring-1', 'Ring 1', RingType.PROTECTION, 1)
      const rightRing = createMockRing('ring-2', 'Ring 2', RingType.REGENERATION, 1)

      let result = service.addItem(player, leftRing)
      result = service.addItem(result, rightRing)
      result = service.equipRing(result, leftRing, 'left')
      result = service.equipRing(result, rightRing, 'right')

      expect(result.equipment.leftRing?.id).toBe('ring-1')
      expect(result.equipment.rightRing?.id).toBe('ring-2')
      expect(result.inventory).toHaveLength(0)
    })

    test('unequips old ring to inventory when equipping new one', () => {
      const oldRing = createMockRing('ring-1', 'Old Ring', RingType.PROTECTION, 1)
      const newRing = createMockRing('ring-2', 'New Ring', RingType.REGENERATION, 1)

      let result = service.addItem(player, oldRing)
      result = service.equipRing(result, oldRing, 'left')
      result = service.addItem(result, newRing)
      result = service.equipRing(result, newRing, 'left')

      expect(result.equipment.leftRing?.id).toBe('ring-2')
      expect(result.inventory.find((i) => i.id === 'ring-1')).toBeDefined()
    })
  })

  describe('unequipRing()', () => {
    test('unequips ring from left slot to inventory', () => {
      const ring = createMockRing('ring-1', 'Ring', RingType.PROTECTION, 1)
      let result = service.addItem(player, ring)
      result = service.equipRing(result, ring, 'left')

      result = service.unequipRing(result, 'left')

      expect(result.equipment.leftRing).toBeNull()
      expect(result.inventory.find((i) => i.id === 'ring-1')).toBeDefined()
    })

    test('unequips ring from right slot to inventory', () => {
      const ring = createMockRing('ring-1', 'Ring', RingType.PROTECTION, 1)
      let result = service.addItem(player, ring)
      result = service.equipRing(result, ring, 'right')

      result = service.unequipRing(result, 'right')

      expect(result.equipment.rightRing).toBeNull()
      expect(result.inventory.find((i) => i.id === 'ring-1')).toBeDefined()
    })

    test('returns player unchanged if no ring equipped in slot', () => {
      const result = service.unequipRing(player, 'left')

      expect(result).toEqual(player)
    })

    test('does not affect other ring slot', () => {
      const leftRing = createMockRing('ring-1', 'Left Ring', RingType.PROTECTION, 1)
      const rightRing = createMockRing('ring-2', 'Right Ring', RingType.REGENERATION, 1)

      let result = service.addItem(player, leftRing)
      result = service.addItem(result, rightRing)
      result = service.equipRing(result, leftRing, 'left')
      result = service.equipRing(result, rightRing, 'right')

      result = service.unequipRing(result, 'left')

      expect(result.equipment.leftRing).toBeNull()
      expect(result.equipment.rightRing?.id).toBe('ring-2')
    })
  })

  // Note: Light sources are managed by LightingService and don't go through
  // inventory as regular items. They're equipped directly from the dungeon floor
  // or created by LightingService methods (createTorch, createLantern, etc.)

  describe('isEquipped()', () => {
    test('returns true if item is equipped as weapon', () => {
      const weapon = createMockWeapon('sword-1', 'Sword', '1d8', 0)
      let result = service.addItem(player, weapon)
      result = service.equipWeapon(result, weapon)

      expect(service.isEquipped(result, 'sword-1')).toBe(true)
    })

    test('returns true if item is equipped as armor', () => {
      const armor = createMockArmor('armor-1', 'Armor', 5, 0)
      let result = service.addItem(player, armor)
      result = service.equipArmor(result, armor)

      expect(service.isEquipped(result, 'armor-1')).toBe(true)
    })

    test('returns true if item is equipped as ring', () => {
      const ring = createMockRing('ring-1', 'Ring', RingType.PROTECTION, 1)
      let result = service.addItem(player, ring)
      result = service.equipRing(result, ring, 'left')

      expect(service.isEquipped(result, 'ring-1')).toBe(true)
    })

    test('returns false if item is in inventory but not equipped', () => {
      const weapon = createMockWeapon('sword-1', 'Sword', '1d8', 0)
      const result = service.addItem(player, weapon)

      expect(service.isEquipped(result, 'sword-1')).toBe(false)
    })

    test('returns false if item not found', () => {
      expect(service.isEquipped(player, 'nonexistent')).toBe(false)
    })
  })

  describe('getEquippedItems()', () => {
    test('returns all equipped items', () => {
      const weapon = createMockWeapon('sword-1', 'Sword', '1d8', 0)
      const armor = createMockArmor('armor-1', 'Armor', 5, 0)
      const ring = createMockRing('ring-1', 'Ring', RingType.PROTECTION, 1)

      let result = service.addItem(player, weapon)
      result = service.addItem(result, armor)
      result = service.addItem(result, ring)
      result = service.equipWeapon(result, weapon)
      result = service.equipArmor(result, armor)
      result = service.equipRing(result, ring, 'left')

      const equipped = service.getEquippedItems(result)

      expect(equipped).toHaveLength(3)
      expect(equipped.map((i) => i.id)).toContain('sword-1')
      expect(equipped.map((i) => i.id)).toContain('armor-1')
      expect(equipped.map((i) => i.id)).toContain('ring-1')
    })

    test('returns empty array if nothing equipped', () => {
      const equipped = service.getEquippedItems(player)

      expect(equipped).toEqual([])
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

function createMockWeapon(id: string, name: string, damage: string, bonus: number): Weapon {
  return {
    id,
    name,
    type: ItemType.WEAPON,
    identified: false,
    position: { x: 0, y: 0 },
    damage,
    bonus,
  }
}

function createMockArmor(id: string, name: string, ac: number, bonus: number): Armor {
  return {
    id,
    name,
    type: ItemType.ARMOR,
    identified: false,
    position: { x: 0, y: 0 },
    ac,
    bonus,
  }
}

function createMockRing(id: string, name: string, ringType: RingType, bonus: number): Ring {
  return {
    id,
    name,
    type: ItemType.RING,
    identified: false,
    position: { x: 0, y: 0 },
    ringType,
    effect: 'test_effect',
    bonus,
    materialName: 'ruby',
    hungerModifier: 1.5,
  }
}

