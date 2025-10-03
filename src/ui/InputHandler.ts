import { ICommand } from '@commands/ICommand'
import { MoveCommand } from '@commands/MoveCommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// INPUT HANDLER - Keyboard input to commands
// ============================================================================

export class InputHandler {
  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService
  ) {}

  /**
   * Handle keyboard event and return command (if any)
   */
  handleKeyPress(event: KeyboardEvent): ICommand | null {
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

      default:
        return null
    }
  }
}
