import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'

/**
 * ToggleAIDebugCommand - Toggle AI debug overlay
 *
 * Effects:
 * - Shows/hides AI state visualization
 * - Displays monster states (SLEEPING/HUNTING/FLEEING)
 * - Shows behavior types (SMART/SIMPLE/etc.)
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleAIDebugCommand implements ICommand {
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    return this.debugService.toggleAIDebug(state)
  }
}
