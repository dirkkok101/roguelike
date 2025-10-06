import { GameState, ItemType, Potion } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { PotionService } from '@services/PotionService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

// ============================================================================
// QUAFF POTION COMMAND - Drink a potion from inventory
// ============================================================================

export class QuaffPotionCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private potionService: PotionService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    // 1. Find item in inventory
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

    // 2. Type check
    if (item.type !== ItemType.POTION) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot drink that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Apply potion effect via service
    const result = this.potionService.applyPotion(
      state.player,
      item as Potion,
      state
    )

    // 4. Remove potion from inventory
    const updatedPlayer = this.inventoryService.removeItem(
      result.player,
      this.itemId
    )

    // 5. Add message and increment turn
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages,
      isGameOver: result.death || state.isGameOver,
      itemsUsed: state.itemsUsed + 1, // Track potion use for death screen
    })
  }
}
