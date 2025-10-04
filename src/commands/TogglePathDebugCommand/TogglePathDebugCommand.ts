import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * TogglePathDebugCommand - Toggle pathfinding debug overlay
 *
 * Effects:
 * - Shows/hides A* pathfinding paths
 * - Renders paths as dotted lines
 * - Shows target positions
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class TogglePathDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.togglePathDebug(state)
  }
}
