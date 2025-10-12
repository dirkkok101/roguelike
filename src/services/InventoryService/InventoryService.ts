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

/**
 * Represents a stacked item (for display purposes)
 * Used to group identical light sources together in inventory
 */
export interface StackedItem {
  item: Item
  quantity: number
  totalFuel: number // Total fuel across all items in stack
}

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

  /**
   * Stack light sources by type and fuel amount
   *
   * Groups torches/oil flasks with identical fuel values into stacks.
   * Each stack tracks quantity and total available fuel.
   * Non-stackable items are returned as individual stacks with quantity = 1.
   *
   * @param inventory - Player's inventory
   * @returns Array of stacked items for display
   */
  stackLightSources(inventory: Item[]): StackedItem[] {
    const stacks = new Map<string, StackedItem>()

    for (const item of inventory) {
      // Only stack torches and oil flasks
      if (item.type !== ItemType.TORCH && item.type !== ItemType.OIL_FLASK) {
        stacks.set(item.id, { item, quantity: 1, totalFuel: 0 })
        continue
      }

      // Get fuel amount for this item
      let fuel = 0
      if (item.type === ItemType.TORCH && 'fuel' in item) {
        fuel = item.fuel as number
      } else if (item.type === ItemType.OIL_FLASK && 'fuelAmount' in item) {
        fuel = item.fuelAmount as number
      }

      // Create stack key: type + fuel amount
      const stackKey = `${item.type}-${fuel}`

      if (stacks.has(stackKey)) {
        // Add to existing stack
        const stack = stacks.get(stackKey)!
        stack.quantity += 1
        stack.totalFuel += fuel
      } else {
        // Create new stack
        stacks.set(stackKey, {
          item,
          quantity: 1,
          totalFuel: fuel,
        })
      }
    }

    return Array.from(stacks.values())
  }

  /**
   * Get display name for item with optional stacking info
   *
   * Format for stacked items: "Torch (×3, 1950 turns)"
   * Format for single items: "Torch"
   *
   * @param item - Item to format
   * @param quantity - Number of items in stack (default: 1)
   * @returns Formatted display name
   */
  getDisplayName(item: Item, quantity: number = 1): string {
    if (quantity === 1) {
      return item.name
    }

    // Get fuel amount for this item type
    let fuelPerItem = 0
    if (item.type === ItemType.TORCH && 'fuel' in item) {
      fuelPerItem = item.fuel as number
    } else if (item.type === ItemType.OIL_FLASK && 'fuelAmount' in item) {
      fuelPerItem = item.fuelAmount as number
    }

    const totalFuel = fuelPerItem * quantity

    return `${item.name} (×${quantity}, ${totalFuel} turns)`
  }
}
