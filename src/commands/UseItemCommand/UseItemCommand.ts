import {
  GameState,
  ItemType,
  Potion,
  Scroll,
  Wand,
  Food,
  OilFlask,
  Item,
} from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { ItemEffectService } from '@services/ItemEffectService'

// ============================================================================
// USE ITEM COMMAND - Consume items (potions, scrolls, wands, food, oil)
// ============================================================================

export type UseItemAction = 'quaff' | 'read' | 'zap' | 'eat' | 'refill'

export class UseItemCommand implements ICommand {
  constructor(
    private itemId: string,
    private action: UseItemAction,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private itemEffectService: ItemEffectService,
    private targetItemId?: string
  ) {}

  execute(state: GameState): GameState {
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

    // Validate action matches item type
    const validationResult = this.validateAction(item)
    if (!validationResult.valid) {
      const messages = this.messageService.addMessage(
        state.messages,
        validationResult.message!,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Delegate to ItemEffectService
    let result
    switch (this.action) {
      case 'quaff':
        result = this.itemEffectService.applyPotionEffect(state, item as Potion)
        break
      case 'read':
        result = this.itemEffectService.applyScrollEffect(state, item as Scroll, this.targetItemId)
        break
      case 'zap':
        result = this.itemEffectService.applyWandEffect(state, item as Wand, this.targetItemId)
        break
      case 'eat':
        result = this.itemEffectService.consumeFood(state, item as Food)
        break
      case 'refill':
        result = this.itemEffectService.refillLantern(state, item as OilFlask)
        break
      default:
        return state
    }

    // Add effect message and increment turn
    const messages = this.messageService.addMessage(
      result.updatedState.messages,
      result.effectMessage,
      'info',
      state.turnCount
    )

    return {
      ...result.updatedState,
      messages,
      turnCount: state.turnCount + 1,
      isGameOver: result.isGameOver || result.updatedState.isGameOver,
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateAction(item: Item): { valid: boolean; message?: string } {
    switch (this.action) {
      case 'quaff':
        if (item.type !== ItemType.POTION) {
          return { valid: false, message: 'You cannot drink that.' }
        }
        break
      case 'read':
        if (item.type !== ItemType.SCROLL) {
          return { valid: false, message: 'You cannot read that.' }
        }
        break
      case 'zap':
        if (item.type !== ItemType.WAND) {
          return { valid: false, message: 'You cannot zap that.' }
        }
        break
      case 'eat':
        if (item.type !== ItemType.FOOD) {
          return { valid: false, message: 'You cannot eat that.' }
        }
        break
      case 'refill':
        if (item.type !== ItemType.OIL_FLASK) {
          return { valid: false, message: 'You cannot use that to refill a lantern.' }
        }
        break
    }
    return { valid: true }
  }
}
