import {
  Player,
  Item,
  Weapon,
  Armor,
  Ring,
  Torch,
  Lantern,
  Artifact,
  ItemType,
} from '@game/core/core'

// ============================================================================
// INVENTORY SERVICE - Item management and equipment
// ============================================================================

export class InventoryService {
  private readonly MAX_INVENTORY_SIZE = 26 // a-z letters

  /**
   * Add item to player's inventory
   */
  addItem(player: Player, item: Item): Player {
    if (!this.canCarry(player.inventory)) {
      return player // Inventory full, cannot add
    }

    // Remove position from item when adding to inventory
    const { position, ...itemWithoutPosition } = item

    return {
      ...player,
      inventory: [...player.inventory, itemWithoutPosition as Item],
    }
  }

  /**
   * Remove item from player's inventory
   */
  removeItem(player: Player, itemId: string): Player {
    return {
      ...player,
      inventory: player.inventory.filter((item) => item.id !== itemId),
    }
  }

  /**
   * Equip weapon
   */
  equipWeapon(player: Player, weapon: Weapon): Player {
    const oldWeapon = player.equipment.weapon

    // Unequip old weapon back to inventory if exists
    let newInventory = player.inventory.filter((item) => item.id !== weapon.id)
    if (oldWeapon) {
      newInventory = [...newInventory, oldWeapon]
    }

    return {
      ...player,
      inventory: newInventory,
      equipment: {
        ...player.equipment,
        weapon,
      },
    }
  }

  /**
   * Equip armor
   */
  equipArmor(player: Player, armor: Armor): Player {
    const oldArmor = player.equipment.armor

    // Unequip old armor back to inventory if exists
    let newInventory = player.inventory.filter((item) => item.id !== armor.id)
    if (oldArmor) {
      newInventory = [...newInventory, oldArmor]
    }

    // Update player AC from new armor
    const newAC = armor.ac - armor.bonus

    return {
      ...player,
      inventory: newInventory,
      ac: newAC,
      equipment: {
        ...player.equipment,
        armor,
      },
    }
  }

  /**
   * Equip ring in specified slot
   */
  equipRing(player: Player, ring: Ring, slot: 'left' | 'right'): Player {
    const oldRing = slot === 'left' ? player.equipment.leftRing : player.equipment.rightRing

    // Unequip old ring back to inventory if exists
    let newInventory = player.inventory.filter((item) => item.id !== ring.id)
    if (oldRing) {
      newInventory = [...newInventory, oldRing]
    }

    return {
      ...player,
      inventory: newInventory,
      equipment: {
        ...player.equipment,
        [slot === 'left' ? 'leftRing' : 'rightRing']: ring,
      },
    }
  }

  /**
   * Unequip ring from specified slot
   */
  unequipRing(player: Player, slot: 'left' | 'right'): Player {
    const ring = slot === 'left' ? player.equipment.leftRing : player.equipment.rightRing

    if (!ring) {
      return player // No ring to unequip
    }

    return {
      ...player,
      inventory: [...player.inventory, ring],
      equipment: {
        ...player.equipment,
        [slot === 'left' ? 'leftRing' : 'rightRing']: null,
      },
    }
  }

  /**
   * Equip light source (torch, lantern, or artifact)
   * Auto-drops burnt-out torches (fuel = 0) instead of returning to inventory
   */
  equipLightSource(player: Player, lightSource: Torch | Lantern | Artifact): Player {
    const oldLight = player.equipment.lightSource

    // Remove new light source from inventory
    let newInventory = player.inventory.filter((item) => item.id !== lightSource.id)

    // Return old light source to inventory if it should not be auto-dropped
    if (oldLight && !this.shouldAutoDropLight(oldLight)) {
      newInventory = [...newInventory, oldLight]
    }

    return {
      ...player,
      inventory: newInventory,
      equipment: {
        ...player.equipment,
        lightSource,
      },
    }
  }

  /**
   * Unequip light source (returns to inventory)
   */
  unequipLightSource(player: Player): Player {
    const lightSource = player.equipment.lightSource

    if (!lightSource) {
      return player // No light source to unequip
    }

    return {
      ...player,
      inventory: [...player.inventory, lightSource],
      equipment: {
        ...player.equipment,
        lightSource: null,
      },
    }
  }

  /**
   * Check if light source should be auto-dropped (burnt out)
   * - Torches with fuel = 0: auto-drop
   * - Lanterns: never auto-drop (can be refilled)
   * - Artifacts: never auto-drop (permanent)
   */
  private shouldAutoDropLight(light: Torch | Lantern | Artifact): boolean {
    // Permanent lights never drop
    if (light.isPermanent) return false

    // Lanterns can be refilled, so never drop
    if (light.type === ItemType.LANTERN) return false

    // Torches with no fuel should be dropped
    if (light.type === ItemType.TORCH && 'fuel' in light) {
      return light.fuel <= 0
    }

    return false
  }

  /**
   * Check if player can carry more items
   */
  canCarry(inventory: Item[]): boolean {
    return inventory.length < this.MAX_INVENTORY_SIZE
  }

  /**
   * Find item in inventory by ID
   */
  findItem(player: Player, itemId: string): Item | undefined {
    return player.inventory.find((item) => item.id === itemId)
  }

  /**
   * Find item in inventory by type
   */
  findItemByType(player: Player, type: ItemType): Item | undefined {
    return player.inventory.find((item) => item.type === type)
  }

  /**
   * Get equipped items list
   */
  getEquippedItems(player: Player): Item[] {
    const equipped: Item[] = []

    if (player.equipment.weapon) equipped.push(player.equipment.weapon)
    if (player.equipment.armor) equipped.push(player.equipment.armor)
    if (player.equipment.leftRing) equipped.push(player.equipment.leftRing)
    if (player.equipment.rightRing) equipped.push(player.equipment.rightRing)
    if (player.equipment.lightSource) {
      equipped.push(player.equipment.lightSource as unknown as Item)
    }

    return equipped
  }

  /**
   * Check if item is equipped
   */
  isEquipped(player: Player, itemId: string): boolean {
    return this.getEquippedItems(player).some((item) => item.id === itemId)
  }

  /**
   * Get inventory item count
   */
  getInventoryCount(player: Player): number {
    return player.inventory.length
  }

  /**
   * Get available inventory slots
   */
  getAvailableSlots(player: Player): number {
    return this.MAX_INVENTORY_SIZE - player.inventory.length
  }
}
