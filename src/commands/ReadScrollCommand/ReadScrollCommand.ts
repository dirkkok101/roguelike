import { GameState, ItemType, Scroll, StatusEffectType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { ScrollService } from '@services/ScrollService'
import { IdentificationService } from '@services/IdentificationService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// READ SCROLL COMMAND - Read a scroll from inventory
// ============================================================================

export class ReadScrollCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private scrollService: ScrollService,
    private identificationService: IdentificationService,
    private messageService: MessageService,
    private _turnService: TurnService,
    private statusEffectService: StatusEffectService,
    private targetItemId: string | undefined,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.READ,
      actorType: 'player',
      payload: { itemId: this.itemId, targetItemId: this.targetItemId },
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)

    // 0. Check if player can read (not blind or confused)
    if (this.statusEffectService.hasStatusEffect(state.player, StatusEffectType.BLIND)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot read while blind!',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    if (this.statusEffectService.hasStatusEffect(state.player, StatusEffectType.CONFUSED)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You are too confused to read!',
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
    let baseState = result.state || state

    // 6. Mark scroll as identified if this was first use
    if (result.identified) {
      baseState = this.identificationService.identifyByUse(item as Scroll, baseState)
    }

    // 7. Use updated player if scroll modified it (e.g., enchantments, status effects)
    const updatedPlayer = result.player || baseState.player

    // 8. Handle scroll consumption
    let finalPlayer = updatedPlayer
    if (result.consumed) {
      // Normal: Remove scroll from inventory
      finalPlayer = this.inventoryService.removeItem(updatedPlayer, this.itemId)
    }
    // If not consumed (SCARE_MONSTER), scroll stays in inventory
    // Player must manually drop it to activate the scare effect

    // 9. Add message and increment turn
    const messages = this.messageService.addMessage(
      baseState.messages,
      result.message,
      'info',
      baseState.turnCount
    )

    return {
      ...baseState,
      player: finalPlayer,
      messages,
      itemsUsed: baseState.itemsUsed + 1, // Track scroll use for death screen
    }
  }
}
