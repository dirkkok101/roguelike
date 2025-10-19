import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { GameStorageService } from '@services/GameStorageService'
import { MessageService } from '@services/MessageService'
import { ToastNotificationService } from '@services/ToastNotificationService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// SAVE COMMAND - Manual game save
// ============================================================================

export class SaveCommand implements ICommand {
  constructor(
    private gameStorageService: GameStorageService,
    private messageService: MessageService,
    private toastNotificationService: ToastNotificationService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.SAVE,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    // Don't save if game is over
    if (state.isGameOver) {
      return state
    }

    // Show "Saving..." message immediately
    const messages = this.messageService.addMessage(
      state.messages,
      'Saving game...',
      'info',
      state.turnCount
    )

    // Capture references to avoid `this` context issues after command is garbage collected
    const toastService = this.toastNotificationService

    // Capture recorder reference to avoid `this` context issues
    const recorder = this.recorder

    // PERFORMANCE: Defer save to next tick to avoid blocking game loop
    // This gives control back to the UI immediately
    setTimeout(async () => {
      // Fire-and-forget save with callbacks for user feedback
      // IMPORTANT: Do NOT await this! It will run in the background
      // GameStorageService handles async save with compression
      this.gameStorageService.saveGame(state)
        .then(async () => {
          // Success - game and replay data both saved (dual storage)
          console.log('✅ Save completed successfully')
          toastService.success('Game saved successfully')
        })
        .catch((error) => {
          // Error callback
          console.error('❌ Save failed:', error)
          toastService.error(`Save failed: ${error.message}`)
        })
    }, 0)

    return { ...state, messages }
  }
}
