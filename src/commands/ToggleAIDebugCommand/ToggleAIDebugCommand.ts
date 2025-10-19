import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

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
  constructor(
    private debugService: DebugService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.toggleAIDebug(state)
  }
}
