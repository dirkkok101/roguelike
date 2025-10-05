import { GameState, ItemType, Weapon, Armor, Ring } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// EQUIP COMMAND - Equip weapons, armor, and rings
// ============================================================================

export class EquipCommand implements ICommand {
  constructor(
    private itemId: string,
    private ringSlot: 'left' | 'right' | null,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
    // Check if already equipped (equipped items are not in inventory)
    if (this.inventoryService.isEquipped(state.player, this.itemId)) {
      const equippedItems = this.inventoryService.getEquippedItems(state.player)
      const equippedItem = equippedItems.find((i) => i.id === this.itemId)

      const messages = this.messageService.addMessage(
        state.messages,
        `${equippedItem?.name || 'That item'} is already equipped.`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Find item in inventory
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Equip based on item type
    let updatedPlayer = state.player
    let equipMessage = ''
    const displayName = this.identificationService.getDisplayName(item, state)

    switch (item.type) {
      case ItemType.WEAPON:
        updatedPlayer = this.inventoryService.equipWeapon(state.player, item as Weapon)
        equipMessage = `You wield ${displayName}.`
        break

      case ItemType.ARMOR:
        updatedPlayer = this.inventoryService.equipArmor(state.player, item as Armor)
        equipMessage = `You put on ${displayName}.`
        break

      case ItemType.RING:
        if (!this.ringSlot) {
          const messages = this.messageService.addMessage(
            state.messages,
            'You must specify which hand (left or right) to wear the ring on.',
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }
        updatedPlayer = this.inventoryService.equipRing(
          state.player,
          item as Ring,
          this.ringSlot
        )
        equipMessage = `You put on ${displayName} on your ${this.ringSlot} hand.`
        break

      default:
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot equip that item.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
    }

    const messages = this.messageService.addMessage(
      state.messages,
      equipMessage,
      'success',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages,
    })
  }
}
