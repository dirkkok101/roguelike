import { GameState, ItemType, Wand } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

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
    private targetMonsterId?: string
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

    // 3. Validate target monster ID is provided
    if (!this.targetMonsterId) {
      const messages = this.messageService.addMessage(
        state.messages,
        'No target selected.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 4. Validate target exists in current level
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

    const targetMonster = currentLevel.monsters.find((m) => m.id === this.targetMonsterId)
    if (!targetMonster) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Target no longer exists.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 5. Validate target is in FOV (line of sight)
    const targetKey = `${targetMonster.position.x},${targetMonster.position.y}`
    if (!state.visibleCells.has(targetKey)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Target no longer visible.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 6. Validate target is in range (Manhattan distance)
    const distance =
      Math.abs(state.player.position.x - targetMonster.position.x) +
      Math.abs(state.player.position.y - targetMonster.position.y)
    const wandRange = wand.range || 5 // Default to 5 if not set
    if (distance > wandRange) {
      const messages = this.messageService.addMessage(
        state.messages,
        `Target out of range. (Range: ${wandRange})`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 7. Apply wand effect (decrements charges)
    const result = this.wandService.applyWand(
      state.player,
      wand,
      state,
      this.targetMonsterId
    )

    // 8. Update wand in inventory (charges changed)
    let updatedPlayer = this.inventoryService.removeItem(result.player, item.id)
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, result.wand)

    // 9. Add message and increment turn
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    // 10. Use updated state from wand effect if provided, otherwise use original state
    const baseState = result.state || state

    return this.turnService.incrementTurn({
      ...baseState,
      player: updatedPlayer,
      messages,
      itemsUsed: state.itemsUsed + 1, // Track wand use for death screen
    })
  }
}
