import { GameState, ItemType, OilFlask } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { LightingService } from '@services/LightingService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// REFILL LANTERN COMMAND - Use oil flask to refill lantern
// ============================================================================

export class RefillLanternCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private lightingService: LightingService,
    private messageService: MessageService,
    private _turnService: TurnService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.REFILL,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
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
    if (item.type !== ItemType.OIL_FLASK) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot use that to refill a lantern.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Refill lantern
    const oilFlask = item as OilFlask
    const result = this.lightingService.refillPlayerLantern(
      state.player,
      oilFlask.fuelAmount
    )

    // 4. Only remove oil if refill was successful
    const updatedPlayer = result.success
      ? this.inventoryService.removeItem(result.player, this.itemId)
      : result.player

    // 5. Add message and increment turn
    const messageType = result.success ? 'success' : 'warning'
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      messageType,
      state.turnCount
    )

    return {
      ...state,
      player: updatedPlayer,
      messages,
    }
  }
}
