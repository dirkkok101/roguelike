import { GameState, ItemType, Wand, StatusEffectType, Position } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { TargetingService } from '@services/TargetingService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// ZAP WAND COMMAND - Use a wand from inventory
// ============================================================================

const DEFAULT_WAND_RANGE = 5

export class ZapWandCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private wandService: WandService,
    private messageService: MessageService,
    private turnService: TurnService,
    private statusEffectService: StatusEffectService,
    private targetingService: TargetingService,
    private targetPosition: Position | undefined,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.ZAP,
      actorType: 'player',
      payload: { itemId: this.itemId, targetPosition: this.targetPosition },
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)

    // 0. Check if player can use wands (not confused)
    // Note: Blind players CAN zap wands (they can point in a direction)
    // but confused players cannot (too disoriented to aim properly)
    if (this.statusEffectService.hasStatusEffect(state.player, StatusEffectType.CONFUSED)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You are too confused to use a wand!',
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
    if (item.type !== ItemType.WAND) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot zap that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const wand = item as Wand

    // 3. Validate target position is provided
    if (!this.targetPosition) {
      const messages = this.messageService.addMessage(
        state.messages,
        'No target selected.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 4. Validate target position is within range
    const wandRange = wand.range || DEFAULT_WAND_RANGE
    const rangeCheck = this.targetingService.isTargetInRange(
      state.player.position,
      this.targetPosition,
      wandRange
    )

    if (!rangeCheck.inRange) {
      const messages = this.messageService.addMessage(
        state.messages,
        `Target out of range (${rangeCheck.distance} > ${wandRange}).`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 8. Apply wand effect with projectile logic (decrements charges)
    // Uses ray-casting to find first obstacle (monster or wall)
    const result = this.wandService.applyWandAtPosition(
      state.player,
      wand,
      state,
      this.targetPosition
    )

    // 9. Update wand in inventory (charges changed)
    let updatedPlayer = this.inventoryService.removeItem(result.player, item.id)
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, result.wand)

    // 10. Add message and increment turn
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    // 11. Use updated state from wand effect if provided, otherwise use original state
    const baseState = result.state || state

    return this.turnService.incrementTurn({
      ...baseState,
      player: updatedPlayer,
      messages,
      itemsUsed: state.itemsUsed + 1, // Track wand use for death screen
    })
  }
}
