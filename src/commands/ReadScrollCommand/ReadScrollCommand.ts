import { GameState, ItemType, Scroll } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { ScrollService } from '@services/ScrollService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

// ============================================================================
// READ SCROLL COMMAND - Read a scroll from inventory
// ============================================================================

export class ReadScrollCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private scrollService: ScrollService,
    private messageService: MessageService,
    private turnService: TurnService,
    private targetItemId?: string
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
    if (item.type !== ItemType.SCROLL) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot read that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Apply scroll effect via service
    const result = this.scrollService.applyScroll(
      state.player,
      item as Scroll,
      state,
      this.targetItemId
    )

    // 4. Remove scroll from inventory (consumed)
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
    })
  }
}
