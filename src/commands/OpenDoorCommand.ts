import { GameState, Position, DoorState } from '../types/core/core'
import { ICommand } from './ICommand'
import { MessageService } from '../services/MessageService'

// ============================================================================
// OPEN DOOR COMMAND - Open closed or locked doors
// ============================================================================

export class OpenDoorCommand implements ICommand {
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
      case DoorState.OPEN:
      case DoorState.BROKEN:
      case DoorState.ARCHWAY:
        const openMessages = this.messageService.addMessage(
          state.messages,
          'That door is already open.',
          'info',
          state.turnCount
        )
        return { ...state, messages: openMessages }

      case DoorState.LOCKED:
        // Check for key in inventory (Phase 5)
        const lockedMessages = this.messageService.addMessage(
          state.messages,
          'The door is locked. You need a key.',
          'warning',
          state.turnCount
        )
        return { ...state, messages: lockedMessages }

      case DoorState.SECRET:
        if (!door.discovered) {
          const secretMessages = this.messageService.addMessage(
            state.messages,
            'There is no door there.',
            'info',
            state.turnCount
          )
          return { ...state, messages: secretMessages }
        }
        // If discovered, treat as closed door
        return this.openDoor(state, door, level)

      case DoorState.CLOSED:
        return this.openDoor(state, door, level)

      default:
        return state
    }
  }

  private openDoor(state: GameState, door: any, level: any): GameState {
    // Update door state
    const updatedDoor = { ...door, state: DoorState.OPEN }
    const updatedDoors = level.doors.map((d: any) =>
      d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
    )

    // Update tile transparency for FOV
    const updatedTiles = level.tiles.map((row: any) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = "'"
    tile.walkable = true
    tile.transparent = true

    const updatedLevel = { ...level, doors: updatedDoors, tiles: updatedTiles }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      'You open the door.',
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
