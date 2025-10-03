import { GameState, Position, DoorState } from '../types/core/core'
import { ICommand } from './ICommand'
import { MessageService } from '../services/MessageService'

// ============================================================================
// CLOSE DOOR COMMAND - Close open doors
// ============================================================================

export class CloseDoorCommand implements ICommand {
  constructor(
    private direction: Position,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const targetPos = {
      x: state.player.position.x + this.direction.x,
      y: state.player.position.y + this.direction.y,
    }

    // Find door at target position
    const door = level.doors.find(
      (d) => d.position.x === targetPos.x && d.position.y === targetPos.y
    )

    if (!door) {
      const messages = this.messageService.addMessage(
        state.messages,
        'There is no door there.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Handle different door states
    switch (door.state) {
      case DoorState.CLOSED:
      case DoorState.LOCKED:
        const closedMessages = this.messageService.addMessage(
          state.messages,
          'That door is already closed.',
          'info',
          state.turnCount
        )
        return { ...state, messages: closedMessages }

      case DoorState.BROKEN:
        const brokenMessages = this.messageService.addMessage(
          state.messages,
          'The door is broken and cannot be closed.',
          'info',
          state.turnCount
        )
        return { ...state, messages: brokenMessages }

      case DoorState.ARCHWAY:
        const archwayMessages = this.messageService.addMessage(
          state.messages,
          'There is no door to close, only an archway.',
          'info',
          state.turnCount
        )
        return { ...state, messages: archwayMessages }

      case DoorState.OPEN:
        // Check if monster is blocking
        const monsterBlocking = level.monsters.some(
          (m) => m.position.x === targetPos.x && m.position.y === targetPos.y
        )
        if (monsterBlocking) {
          const blockedMessages = this.messageService.addMessage(
            state.messages,
            'There is a monster in the way!',
            'warning',
            state.turnCount
          )
          return { ...state, messages: blockedMessages }
        }

        return this.closeDoor(state, door, level)

      default:
        return state
    }
  }

  private closeDoor(state: GameState, door: any, level: any): GameState {
    // Update door state
    const updatedDoor = { ...door, state: DoorState.CLOSED }
    const updatedDoors = level.doors.map((d: any) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    // Update tile transparency for FOV
    const updatedTiles = level.tiles.map((row: any) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = '+'
    tile.walkable = true
    tile.transparent = false

    const updatedLevel = { ...level, doors: updatedDoors, tiles: updatedTiles }
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
      turnCount: state.turnCount + 1,
    }
  }
}
