import { ICommand } from '../ICommand'
import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'

/**
 * QuitCommand - Auto-saves game and quits
 * Triggered by Q key
 */
export class QuitCommand implements ICommand {
  constructor(private localStorageService: LocalStorageService) {}

  execute(state: GameState): GameState {
    // Don't save if game is over (permadeath already deleted save)
    if (state.isGameOver) {
      return state
    }

    try {
      this.localStorageService.saveGame(state)
      console.log('Auto-saved before quit')
    } catch (error) {
      console.error('Auto-save failed:', error)
    }

    // Trigger page reload to return to main menu
    window.location.reload()

    return state
  }
}
