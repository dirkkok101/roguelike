import { GameState, ItemType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// DROP COMMAND - Drop items from inventory to the dungeon floor
// ============================================================================

export class DropCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Check if item is equipped (equipped items are not in inventory)
    if (this.inventoryService.isEquipped(state.player, this.itemId)) {
      const equippedItems = this.inventoryService.getEquippedItems(state.player)
      const equippedItem = equippedItems.find((i) => i.id === this.itemId)

      const messages = this.messageService.addMessage(
        state.messages,
        `You must unequip ${equippedItem?.name || 'that item'} before dropping it.`,
        'warning',
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

    // Prevent dropping the Amulet of Yendor
    if (item.type === ItemType.AMULET) {
      const messages = this.messageService.addMessage(
        state.messages,
        'The Amulet of Yendor cannot be dropped!',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Remove item from inventory
    const updatedPlayer = this.inventoryService.removeItem(state.player, this.itemId)

    // Add position to item and add to level
    const itemWithPosition = {
      ...item,
      position: { ...state.player.position },
    }

    const updatedItems = [...level.items, itemWithPosition]
    const updatedLevel = { ...level, items: updatedItems }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    const displayName = this.identificationService.getDisplayName(item, state)
    const messages = this.messageService.addMessage(
      state.messages,
      `You drop ${displayName}.`,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      levels: updatedLevels,
      messages,
    })
  }
}
