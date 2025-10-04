import { GameState, ItemType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { HungerService, HungerState } from '@services/HungerService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// EAT COMMAND - Consume food to restore hunger
// ============================================================================

export class EatCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private hungerService: HungerService,
    private messageService: MessageService,
    private random: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // 1. Find food in inventory
    const food = this.inventoryService.findItemByType(
      state.player,
      ItemType.FOOD
    )

    if (!food) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You have no food to eat.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 2. Remove food from inventory
    const playerWithoutFood = this.inventoryService.removeItem(
      state.player,
      food.id
    )

    // 3. Roll random nutrition (1100-1499)
    const nutrition = this.random.nextInt(1100, 1499)

    // 4. Track old hunger state for warning generation
    const oldState = this.hungerService.getHungerState(
      playerWithoutFood.hunger
    )

    // 5. Feed player (service handles capping at 2000)
    const result = this.hungerService.feed(playerWithoutFood, nutrition)
    const newState = this.hungerService.getHungerState(result.player.hunger)

    // 6. Generate messages
    let messages = this.messageService.addMessage(
      state.messages,
      'You eat the food ration.',
      'info',
      state.turnCount
    )

    // 30% chance of "tastes awful" message
    if (this.random.chance(0.3)) {
      messages = this.messageService.addMessage(
        messages,
        'Yuck, that food tasted awful!',
        'info',
        state.turnCount
      )
    }

    // Add hunger state improvement message if applicable
    // Note: generateHungerWarning only warns when getting worse, not improving
    // So we need to check for improvement manually
    if (this.isImproving(oldState, newState)) {
      let improvementMessage = ''
      if (newState === HungerState.NORMAL) {
        improvementMessage = 'You feel satisfied.'
      } else if (newState === HungerState.HUNGRY && oldState === HungerState.WEAK) {
        improvementMessage = 'You feel a bit better.'
      } else if (newState === HungerState.WEAK && oldState === HungerState.STARVING) {
        improvementMessage = 'You feel slightly stronger.'
      }

      if (improvementMessage) {
        messages = this.messageService.addMessage(
          messages,
          improvementMessage,
          'success',
          state.turnCount
        )
      }
    }

    // 7. Return new state
    return {
      ...state,
      player: result.player,
      messages,
      turnCount: state.turnCount + 1,
    }
  }

  /**
   * Check if hunger state is improving (getting better)
   */
  private isImproving(
    oldState: HungerState,
    newState: HungerState
  ): boolean {
    const stateOrder = {
      [HungerState.STARVING]: 0,
      [HungerState.WEAK]: 1,
      [HungerState.HUNGRY]: 2,
      [HungerState.NORMAL]: 3,
    }

    return stateOrder[newState] > stateOrder[oldState]
  }
}
