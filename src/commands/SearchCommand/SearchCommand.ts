import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { SearchService } from '@services/SearchService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

// ============================================================================
// SEARCH COMMAND - Find secret doors and traps
// ============================================================================

export class SearchCommand implements ICommand {
  constructor(
    private searchService: SearchService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
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
    return this.turnService.incrementTurn({
      ...state,
      levels: updatedLevels,
      messages,
    })
  }
}
