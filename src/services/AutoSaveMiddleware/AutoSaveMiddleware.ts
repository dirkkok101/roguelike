import { GameState } from '@game/core/core'
import { LocalStorageService } from '@services/LocalStorageService'

/**
 * AutoSaveMiddleware - Automatically saves game every N turns
 * Default: saves every 10 turns
 */
export class AutoSaveMiddleware {
  constructor(
    private localStorageService: LocalStorageService,
    private saveInterval: number = 10
  ) {}

  /**
   * Called after each turn to check if auto-save should trigger
   */
  afterTurn(state: GameState): void {
    // Don't auto-save if game is over
    if (state.isGameOver) {
      return
    }

    // Check if turn count is a multiple of save interval
    if (state.turnCount % this.saveInterval === 0 && state.turnCount > 0) {
      try {
        this.localStorageService.saveGame(state)
        console.log(`Auto-saved at turn ${state.turnCount}`)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }
  }
}
