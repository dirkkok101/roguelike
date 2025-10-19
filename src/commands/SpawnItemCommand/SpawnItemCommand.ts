import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * SpawnItemCommand - Spawn item for testing
 *
 * Spawns specific item type at player position or nearby using smart positioning
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class SpawnItemCommand implements ICommand {
  constructor(
    private itemType: string,
    private subType: string | undefined,
    private debugService: DebugService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // Debug commands are NOT recorded - they don't affect game state
    // and cannot be replayed (CommandFactory doesn't support them)
    return this.debugService.spawnItem(state, this.itemType, this.subType)
  }
}
