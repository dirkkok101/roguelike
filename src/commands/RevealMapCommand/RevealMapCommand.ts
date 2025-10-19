import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * RevealMapCommand - Reveal entire current level
 *
 * Effects:
 * - Marks all tiles as explored
 * - Useful for testing dungeon generation
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class RevealMapCommand implements ICommand {
  constructor(
    private debugService: DebugService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.revealMap(state)
  }
}
