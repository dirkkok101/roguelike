import { Item, Player, Weapon, Armor, Ring } from '@game/core/core'

// ============================================================================
// CURSE SERVICE - Curse detection and removal
// ============================================================================

export class CurseService {
  /**
   * Check if an item is cursed
   * Returns true if item has cursed field set to true
   */
  isCursed(item: Item | null | undefined): boolean {
    if (!item) return false

    // TypeScript type guard: check if item has cursed property
    if ('cursed' in item) {
      return item.cursed === true
    }

    return false
  }

  /**
   * Remove curse from a single equipment item
   * Returns new item with cursed set to false (immutable)
   */
  removeCurse<T extends Weapon | Armor | Ring>(item: T): T {
    return { ...item, cursed: false }
  }

  /**
   * Remove curses from all equipped items
   * Returns new player with all equipment uncursed (immutable)
   */
  removeCursesFromEquipment(player: Player): Player {
    const updatedEquipment = {
      weapon: player.equipment.weapon && 'cursed' in player.equipment.weapon
        ? this.removeCurse(player.equipment.weapon as Weapon)
        : player.equipment.weapon,
      armor: player.equipment.armor && 'cursed' in player.equipment.armor
        ? this.removeCurse(player.equipment.armor as Armor)
        : player.equipment.armor,
      leftRing: player.equipment.leftRing && 'cursed' in player.equipment.leftRing
        ? this.removeCurse(player.equipment.leftRing as Ring)
        : player.equipment.leftRing,
      rightRing: player.equipment.rightRing && 'cursed' in player.equipment.rightRing
        ? this.removeCurse(player.equipment.rightRing as Ring)
        : player.equipment.rightRing,
      lightSource: player.equipment.lightSource, // Light sources cannot be cursed
    }

    return { ...player, equipment: updatedEquipment }
  }

  /**
   * Check if player has any cursed items equipped
   * Returns true if any equipped item is cursed
   */
  hasAnyCursedItems(player: Player): boolean {
    return (
      this.isCursed(player.equipment.weapon) ||
      this.isCursed(player.equipment.armor) ||
      this.isCursed(player.equipment.leftRing) ||
      this.isCursed(player.equipment.rightRing)
    )
  }

  /**
   * Get list of cursed equipment names for messaging
   * Returns array of item names that are cursed
   */
  getCursedItemNames(player: Player): string[] {
    const cursedItems: string[] = []

    if (this.isCursed(player.equipment.weapon)) {
      cursedItems.push(player.equipment.weapon!.name)
    }
    if (this.isCursed(player.equipment.armor)) {
      cursedItems.push(player.equipment.armor!.name)
    }
    if (this.isCursed(player.equipment.leftRing)) {
      cursedItems.push(player.equipment.leftRing!.name)
    }
    if (this.isCursed(player.equipment.rightRing)) {
      cursedItems.push(player.equipment.rightRing!.name)
    }

    return cursedItems
  }
}
