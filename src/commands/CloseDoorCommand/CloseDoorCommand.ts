import { GameState, Position } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// CLOSE DOOR COMMAND - Close open doors
// ============================================================================

export class CloseDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private messageService: MessageService,
    private doorService: DoorService,
    private turnService: TurnService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.CLOSE_DOOR,
      actorType: 'player',
      payload: { direction: this.direction },
      rngState: this.randomService.getState(),
    }

    // STEP 2: Execute normally (existing logic unchanged)

    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    // Find door at target position
    const door = this.doorService.getDoorAt(level, targetPos)

    // Validate door can be closed
    const validation = this.doorService.canCloseDoor(door, level, targetPos)
    if (!validation.canClose) {
      const messages = this.messageService.addMessage(
        state.messages,
        validation.reason!,
        validation.reason?.includes('monster') ? 'warning' : 'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Close door using DoorService
    const updatedLevel = this.doorService.closeDoor(level, door!)
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      'You close the door.',
      'info',
      state.turnCount
    )

    return {
      ...state,
      levels: updatedLevels,
      messages,
    }
  }
}
