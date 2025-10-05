import {
  GameState,
  ItemType,
  Potion,
  Scroll,
  Wand,
  Food,
  OilFlask,
} from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { HungerService } from '@services/HungerService'
import { LightingService } from '@services/LightingService'
import { TurnService } from '@services/TurnService'

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
    private potionService: PotionService,
    private scrollService: ScrollService,
    private wandService: WandService,
    private hungerService: HungerService,
    private lightingService: LightingService,
    private turnService: TurnService,
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
    const validationResult = this.validateAction(item.type)
    if (!validationResult.valid) {
      const messages = this.messageService.addMessage(
        state.messages,
        validationResult.message!,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Delegate to appropriate domain service
    let updatedState = state
    let effectMessage = ''
    let isGameOver = false

    switch (this.action) {
      case 'quaff':
        {
          const result = this.potionService.applyPotion(
            state.player,
            item as Potion,
            state
          )
          updatedState = {
            ...state,
            player: this.inventoryService.removeItem(result.player, this.itemId),
          }
          effectMessage = result.message
          isGameOver = result.death || false
        }
        break

      case 'read':
        {
          const result = this.scrollService.applyScroll(
            state.player,
            item as Scroll,
            state,
            this.targetItemId
          )
          updatedState = {
            ...state,
            player: this.inventoryService.removeItem(result.player, this.itemId),
          }
          effectMessage = result.message
        }
        break

      case 'zap':
        {
          const result = this.wandService.applyWand(
            state.player,
            item as Wand,
            state,
            this.targetItemId
          )

          // Update wand in inventory with new charges
          let updatedPlayer = this.inventoryService.removeItem(result.player, item.id)
          updatedPlayer = this.inventoryService.addItem(updatedPlayer, result.wand)

          updatedState = {
            ...state,
            player: updatedPlayer,
          }
          effectMessage = result.message
        }
        break

      case 'eat':
        {
          const food = item as Food
          const result = this.hungerService.consumeFood(state.player, food.nutrition)
          updatedState = {
            ...state,
            player: this.inventoryService.removeItem(result.player, this.itemId),
          }
          effectMessage = result.message
        }
        break

      case 'refill':
        {
          const oilFlask = item as OilFlask
          const result = this.lightingService.refillPlayerLantern(
            state.player,
            oilFlask.fuelAmount
          )

          if (result.success) {
            updatedState = {
              ...state,
              player: this.inventoryService.removeItem(result.player, this.itemId),
            }
          } else {
            updatedState = {
              ...state,
              player: result.player,
            }
          }
          effectMessage = result.message
        }
        break

      default:
        return state
    }

    // Add effect message and increment turn
    const messages = this.messageService.addMessage(
      updatedState.messages,
      effectMessage,
      'info',
      state.turnCount
    )

    const finalState = this.turnService.incrementTurn({
      ...updatedState,
      messages,
    })

    return {
      ...finalState,
      isGameOver: isGameOver || finalState.isGameOver,
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateAction(itemType: ItemType): { valid: boolean; message?: string } {
    switch (this.action) {
      case 'quaff':
        if (itemType !== ItemType.POTION) {
          return { valid: false, message: 'You cannot drink that.' }
        }
        break
      case 'read':
        if (itemType !== ItemType.SCROLL) {
          return { valid: false, message: 'You cannot read that.' }
        }
        break
      case 'zap':
        if (itemType !== ItemType.WAND) {
          return { valid: false, message: 'You cannot zap that.' }
        }
        break
      case 'eat':
        if (itemType !== ItemType.FOOD) {
          return { valid: false, message: 'You cannot eat that.' }
        }
        break
      case 'refill':
        if (itemType !== ItemType.OIL_FLASK) {
          return { valid: false, message: 'You cannot use that to refill a lantern.' }
        }
        break
    }
    return { valid: true }
  }
}
