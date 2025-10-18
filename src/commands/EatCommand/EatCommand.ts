import { GameState, ItemType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { HungerService } from '@services/HungerService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// EAT COMMAND - Consume food to restore hunger
// ============================================================================

export class EatCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private hungerService: HungerService,
    private messageService: MessageService,
    private turnService: TurnService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.EAT,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
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

    // 3. Consume food via service (handles all logic)
    const result = this.hungerService.consumeFood(playerWithoutFood)

    // 4. Add messages
    let messages = state.messages
    result.messages.forEach(msg => {
      messages = this.messageService.addMessage(
        messages,
        msg.text,
        msg.type,
        state.turnCount
      )
    })

    // 5. Return with turn increment
    return this.turnService.incrementTurn({
      ...state,
      player: result.player,
      messages
    })
  }
}
