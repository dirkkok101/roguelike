import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * WakeAllMonstersCommand - Wake all sleeping monsters
 *
 * Effects:
 * - Sets all monsters to awake
 * - Changes SLEEPING state to HUNTING
 * - Useful for quick combat testing
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class WakeAllMonstersCommand implements ICommand {
  constructor(
    private debugService: DebugService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.wakeAllMonsters(state)
  }
}
