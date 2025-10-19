import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * ToggleFOVModeCommand - Toggle FOV mode between radius and room-reveal
 *
 * Effects:
 * - Switches between radius-based FOV (default) and room-reveal mode
 * - Room-reveal mode reveals entire rooms upon entry (like 1980 Rogue)
 * - Shows confirmation message
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class ToggleFOVModeCommand implements ICommand {
  constructor(
    private debugService: DebugService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.toggleFOVMode(state)
  }
}
