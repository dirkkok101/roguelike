import { ICommand } from '@commands/ICommand'
import { MoveCommand } from '@commands/MoveCommand'
import { OpenDoorCommand } from '@commands/OpenDoorCommand'
import { CloseDoorCommand } from '@commands/CloseDoorCommand'
import { SearchCommand } from '@commands/SearchCommand'
import { MoveStairsCommand } from '@commands/MoveStairsCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'

// ============================================================================
// INPUT HANDLER - Keyboard input to commands
// ============================================================================

type InputMode = 'normal' | 'open_door' | 'close_door'

export class InputHandler {
  private mode: InputMode = 'normal'

  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private random: IRandomService,
    private dungeonService: DungeonService,
    private dungeonConfig: DungeonConfig
  ) {}

  /**
   * Handle keyboard event and return command (if any)
   */
  handleKeyPress(event: KeyboardEvent): ICommand | null {
    // Handle modal input (waiting for direction)
    if (this.mode === 'open_door' || this.mode === 'close_door') {
      const direction = this.getDirectionFromKey(event.key)
      if (direction) {
        event.preventDefault()
        const command =
          this.mode === 'open_door'
            ? new OpenDoorCommand(direction, this.messageService)
            : new CloseDoorCommand(direction, this.messageService)
        this.mode = 'normal'
        return command
      }
      // Cancel on Escape
      if (event.key === 'Escape') {
        event.preventDefault()
        this.mode = 'normal'
        return null
      }
      return null
    }

    // Normal mode - handle regular commands
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        return new MoveCommand(
          'up',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowDown':
        event.preventDefault()
        return new MoveCommand(
          'down',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowLeft':
        event.preventDefault()
        return new MoveCommand(
          'left',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'ArrowRight':
        event.preventDefault()
        return new MoveCommand(
          'right',
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService
        )

      case 'o':
        event.preventDefault()
        this.mode = 'open_door'
        // TODO: Show message "Open door in which direction?"
        return null

      case 'c':
        event.preventDefault()
        this.mode = 'close_door'
        // TODO: Show message "Close door in which direction?"
        return null

      case 's':
        event.preventDefault()
        return new SearchCommand(this.messageService, this.random)

      case '>':
      case '.':
        event.preventDefault()
        return new MoveStairsCommand(
          'down',
          this.dungeonService,
          this.dungeonConfig,
          this.fovService,
          this.lightingService,
          this.messageService
        )

      case '<':
      case ',':
        event.preventDefault()
        return new MoveStairsCommand(
          'up',
          this.dungeonService,
          this.dungeonConfig,
          this.fovService,
          this.lightingService,
          this.messageService
        )

      default:
        return null
    }
  }

  /**
   * Convert arrow key to direction vector
   */
  private getDirectionFromKey(key: string): { x: number; y: number } | null {
    switch (key) {
      case 'ArrowUp':
        return { x: 0, y: -1 }
      case 'ArrowDown':
        return { x: 0, y: 1 }
      case 'ArrowLeft':
        return { x: -1, y: 0 }
      case 'ArrowRight':
        return { x: 1, y: 0 }
      default:
        return null
    }
  }
}
