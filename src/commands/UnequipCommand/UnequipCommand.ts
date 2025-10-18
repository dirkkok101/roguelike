import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { CurseService } from '@services/CurseService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// UNEQUIP COMMAND - Unequip rings (weapons/armor swap automatically)
// ============================================================================

export class UnequipCommand implements ICommand {
  constructor(
    private ringSlot: 'left' | 'right',
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private curseService: CurseService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.UNEQUIP,
      actorType: 'player',
      payload: { ringSlot: this.ringSlot },
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    const ring =
      this.ringSlot === 'left'
        ? state.player.equipment.leftRing
        : state.player.equipment.rightRing

    if (!ring) {
      const messages = this.messageService.addMessage(
        state.messages,
        `You are not wearing a ring on your ${this.ringSlot} hand.`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Check if cursed
    if (this.curseService.isCursed(ring)) {
      const messages = this.messageService.addMessage(
        state.messages,
        `The ${ring.name} is cursed! You cannot remove it.`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Check if inventory has space
    if (!this.inventoryService.canCarry(state.player.inventory)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Your pack is full. You cannot unequip that ring.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Unequip ring to inventory
    const updatedPlayer = this.inventoryService.unequipRing(state.player, this.ringSlot)

    const messages = this.messageService.addMessage(
      state.messages,
      `You remove ${ring.name} from your ${this.ringSlot} hand.`,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages,
    })
  }
}
