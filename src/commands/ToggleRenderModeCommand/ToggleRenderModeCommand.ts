import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { PreferencesService } from '@services/PreferencesService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// TOGGLE RENDER MODE COMMAND - Switch between ASCII and sprite rendering
// ============================================================================

/**
 * ToggleRenderModeCommand - Toggle between ASCII text and sprite rendering
 *
 * Effects:
 * - Toggles renderMode preference ('ascii' ↔ 'sprites')
 * - Saves preference to localStorage (persists across sessions)
 * - Triggers GameRenderer update via PreferencesService event system
 * - Adds confirmation message to game log
 *
 * Architecture:
 * - Orchestrates PreferencesService and MessageService only
 * - No game logic in command (just preference toggle)
 * - Does not consume player turn (free action)
 */
export class ToggleRenderModeCommand implements ICommand {
  constructor(
    private preferencesService: PreferencesService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    // Get current preferences
    const prefs = this.preferencesService.getPreferences()

    // Toggle mode
    const newMode = prefs.renderMode === 'sprites' ? 'ascii' : 'sprites'

    // Save preference (triggers GameRenderer update via event)
    this.preferencesService.savePreferences({
      ...prefs,
      renderMode: newMode,
    })

    // Add confirmation message to game log
    const modeName = newMode === 'sprites' ? 'Sprite' : 'ASCII'
    const messages = this.messageService.addMessage(
      state.messages,
      `Switched to ${modeName} rendering mode`,
      'info',
      state.turnCount
    )

    return { ...state, messages }
  }
}
