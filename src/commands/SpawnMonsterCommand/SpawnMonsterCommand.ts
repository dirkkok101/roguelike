import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * SpawnMonsterCommand - Spawn monster for testing
 *
 * Shows monster selection UI (A-Z), spawns at player position or nearby
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class SpawnMonsterCommand implements ICommand {
  constructor(
    private letter: string,
    private debugService: DebugService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.spawnMonster(state, this.letter)
  }
}
