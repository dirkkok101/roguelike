import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { SearchService } from '@services/SearchService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// SEARCH COMMAND - Find secret doors and traps
// ============================================================================

export class SearchCommand implements ICommand {
  constructor(
    private searchService: SearchService,
    private messageService: MessageService,
    private _turnService: TurnService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.SEARCH,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Delegate to SearchService
    const result = this.searchService.searchForSecrets(
      state.player,
      state.player.position,
      level
    )

    // Update level in state
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, result.updatedLevel)

    // Add message
    const messageType = result.found ? 'success' : 'info'
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      messageType,
      state.turnCount
    )

    // Increment turn and return
    return {
      ...state,
      levels: updatedLevels,
      messages,
    }
  }
}
