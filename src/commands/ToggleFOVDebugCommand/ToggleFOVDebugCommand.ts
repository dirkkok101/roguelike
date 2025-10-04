import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleFOVDebugCommand - Toggle FOV debug overlay
 *
 * Effects:
 * - Shows/hides FOV visualization
 * - Highlights monster vision ranges
 * - Shows aggro range boundaries
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleFOVDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleFOVDebug(state)
  }
}
