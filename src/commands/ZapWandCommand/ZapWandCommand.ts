import { GameState, ItemType, Wand, StatusEffectType, Position } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { TargetingService } from '@services/TargetingService'

// ============================================================================
// ZAP WAND COMMAND - Use a wand from inventory
// ============================================================================

export class ZapWandCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private wandService: WandService,
    private messageService: MessageService,
    private turnService: TurnService,
    private statusEffectService: StatusEffectService,
    private targetingService: TargetingService,
    private targetPosition?: Position
  ) {}

  execute(state: GameState): GameState {
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

    // 4. Validate target position is within range (use Manhattan distance)
    const distance = Math.abs(this.targetPosition.x - state.player.position.x) +
                     Math.abs(this.targetPosition.y - state.player.position.y)
    const wandRange = wand.range || 5

    if (distance > wandRange) {
      const messages = this.messageService.addMessage(
        state.messages,
        `Target out of range (${distance} > ${wandRange}).`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 8. Apply wand effect with projectile logic (decrements charges)
    // TODO (Task 4.3): Implement wandService.applyWandAtPosition() with ray-casting
    // For now, find monster at target position and use existing applyWand method
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Invalid level state.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const targetMonster = currentLevel.monsters.find(
      m => m.position.x === this.targetPosition!.x && m.position.y === this.targetPosition!.y
    )

    if (!targetMonster) {
      const messages = this.messageService.addMessage(
        state.messages,
        'No monster at target position. (Projectile logic not yet implemented)',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const result = this.wandService.applyWand(
      state.player,
      wand,
      state,
      targetMonster.id
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
