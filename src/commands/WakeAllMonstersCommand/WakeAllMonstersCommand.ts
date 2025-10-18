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
  constructor(private debugService: DebugService) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.DEBUG_WAKE_ALL,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    return this.debugService.wakeAllMonsters(state)
  }
}
