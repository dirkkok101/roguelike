import { GameState, ItemType, Potion, StatusEffectType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { PotionService } from '@services/PotionService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'

// ============================================================================
// QUAFF POTION COMMAND - Drink a potion from inventory
// ============================================================================

export class QuaffPotionCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private potionService: PotionService,
    private messageService: MessageService,
    private turnService: TurnService,
    private statusEffectService: StatusEffectService
  ) {}

  execute(state: GameState): GameState {
    // 0. Check if player can drink (not confused)
    if (this.statusEffectService.hasStatusEffect(state.player, StatusEffectType.CONFUSED)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You are too confused to drink!',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

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

    // 4. Use updated state if potion modified it (detection potions)
    const baseState = result.state || state

    // 5. Remove potion from inventory
    const updatedPlayer = this.inventoryService.removeItem(
      result.player,
      this.itemId
    )

    // 6. Add message and increment turn
    const messages = this.messageService.addMessage(
      baseState.messages,
      result.message,
      'info',
      baseState.turnCount
    )

    return this.turnService.incrementTurn({
      ...baseState,
      player: updatedPlayer,
      messages,
      isGameOver: result.death || state.isGameOver,
      itemsUsed: baseState.itemsUsed + 1, // Track potion use for death screen
    })
  }
}
