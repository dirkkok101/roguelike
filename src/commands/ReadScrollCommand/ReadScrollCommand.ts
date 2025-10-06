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

    // 4. Handle fizzle (scroll failed - no turn consumed, scroll not removed)
    if (result.fizzled) {
      const messages = this.messageService.addMessage(
        state.messages,
        result.message,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 5. Use updated state if scroll modified it (e.g., MAGIC_MAPPING, TELEPORTATION)
    const baseState = result.state || state

    // 6. Use updated player if scroll modified it (e.g., enchantments, status effects)
    const updatedPlayer = result.player || baseState.player

    // 7. Handle scroll consumption
    let finalPlayer = updatedPlayer
    if (result.consumed) {
      // Normal: Remove scroll from inventory
      finalPlayer = this.inventoryService.removeItem(updatedPlayer, this.itemId)
    } else {
      // SCARE_MONSTER: Drop scroll at player position instead of consuming
      // TODO: Implement scroll dropping when SCARE_MONSTER is added
      finalPlayer = this.inventoryService.removeItem(updatedPlayer, this.itemId)
    }

    // 8. Add message and increment turn
    const messages = this.messageService.addMessage(
      baseState.messages,
      result.message,
      'info',
      baseState.turnCount
    )

    return this.turnService.incrementTurn({
      ...baseState,
      player: finalPlayer,
      messages,
      itemsUsed: baseState.itemsUsed + 1, // Track scroll use for death screen
    })
  }
}
