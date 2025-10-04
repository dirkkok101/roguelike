import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { LocalStorageService } from '@services/LocalStorageService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// SAVE COMMAND - Manual game save
// ============================================================================

export class SaveCommand implements ICommand {
  constructor(
    private localStorageService: LocalStorageService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    // Don't save if game is over
    if (state.isGameOver) {
      return state
    }

    try {
      this.localStorageService.saveGame(state)

      const messages = this.messageService.addMessage(
        state.messages,
        'Game saved successfully.',
        'success',
        state.turnCount
      )

      return { ...state, messages }
    } catch (error) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Failed to save game. Storage may be full.',
        'warning',
        state.turnCount
      )

      return { ...state, messages }
    }
  }
}
