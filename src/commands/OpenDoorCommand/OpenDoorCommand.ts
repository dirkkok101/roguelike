import { GameState, Position, DoorState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'

// ============================================================================
// OPEN DOOR COMMAND - Open closed or locked doors
// ============================================================================

export class OpenDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private messageService: MessageService,
    private doorService: DoorService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    // Find door at target position
    const door = this.doorService.getDoorAt(level, targetPos)

    // Validate door can be opened
    const validation = this.doorService.canOpenDoor(door)
    if (!validation.canOpen) {
      const messages = this.messageService.addMessage(
        state.messages,
        validation.reason!,
        validation.reason?.includes('locked') ? 'warning' : 'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Open door using DoorService (gets message and updated level)
    const result = this.doorService.openDoorWithResult(level, door!)
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, result.level)

    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      levels: updatedLevels,
      messages,
    })
  }
}
