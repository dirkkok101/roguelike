import { ICommand } from '@commands/ICommand'
import { GameState } from '@game/core/core'
import { DebugService } from '@services/DebugService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

/**
 * IdentifyAllItemsCommand - Identify all item types in the game
 *
 * Effects:
 * - Marks all potions, scrolls, rings, and wands as identified
 * - Shows real names instead of appearance descriptions
 * - Debug command for testing item mechanics
 *
 * Architecture:
 * - Orchestrates DebugService only
 * - No logic in command
 */
export class IdentifyAllItemsCommand implements ICommand {
  constructor(
    private debugService: DebugService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.DEBUG_IDENTIFY,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    return this.debugService.identifyAll(state)
  }
}
