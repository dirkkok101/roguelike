import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { PreferencesService } from '@services/PreferencesService'
import { MessageService } from '@services/MessageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

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
    private messageService: MessageService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.TOGGLE_RENDER_MODE,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
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
