import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { LocalStorageService } from '@services/LocalStorageService'
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
    private localStorageService: LocalStorageService,
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
      // LocalStorageService now handles debouncing (max 1 save per second)
      this.localStorageService.saveGame(
        state,
        async () => {
          // Success callback - save succeeded, now persist replay
          console.log('✅ Save completed successfully')
          toastService.success('Game saved successfully')

          // Persist replay data to IndexedDB
          if (state.gameId) {
            await recorder.persistToIndexedDB(state.gameId)
          }
        },
        (error) => {
          // Error callback
          console.error('❌ Save failed:', error)
          toastService.error(`Save failed: ${error.message}`)
        }
      )
    }, 0)

    return { ...state, messages }
  }
}
