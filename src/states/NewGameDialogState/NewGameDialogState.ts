import { BaseState } from '@states/BaseState'
import { Input } from '@game/core/core'
import { CharacterNameModal } from '@ui/CharacterNameModal'

/**
 * NewGameStartCallback - called when user submits character name and starts game
 */
export type NewGameStartCallback = (characterName: string) => void

/**
 * NewGameCancelCallback - called when user cancels new game dialog
 */
export type NewGameCancelCallback = () => void

/**
 * NewGameDialogState - Character name entry dialog
 *
 * Purpose: Dialog shown when starting a new game:
 * - Character name input field
 * - Default name pre-filled (from preferences or "Anonymous")
 * - Text input (a-z, A-Z, backspace)
 * - Enter to confirm and start game
 * - ESC to cancel and return to main menu
 *
 * State Properties:
 * - isPaused(): true (dialog pauses menu)
 * - isTransparent(): true (main menu visible behind, dimmed)
 *
 * Architecture:
 * - Wraps CharacterNameModal UI component
 * - Simple text input with submit/cancel callbacks
 * - Transition state before PlayingState
 *
 * @example
 * // From main menu "New Game" option
 * const newGameDialog = new NewGameDialogState(
 *   characterNameModal,
 *   "Hero", // default name
 *   (name) => {
 *     // Start new game with character name
 *     const gameState = createInitialState(name)
 *     stateManager.replaceState(new PlayingState(gameState, ...))
 *   },
 *   () => stateManager.popState() // Cancel - return to menu
 * )
 * stateManager.pushState(newGameDialog)
 */
export class NewGameDialogState extends BaseState {
  constructor(
    private characterNameModal: CharacterNameModal,
    private defaultName: string,
    private onStart: NewGameStartCallback,
    private onCancel: NewGameCancelCallback
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the character name input dialog
   */
  enter(): void {
    this.characterNameModal.show(this.defaultName, this.onStart, this.onCancel)
  }

  /**
   * Called when state is paused or removed
   * Hide the character name dialog
   */
  exit(): void {
    this.characterNameModal.hide()
  }

  /**
   * Game tick logic (dialog is static)
   * @param deltaTime - Unused for static dialog
   */
  update(_deltaTime: number): void {
    // Dialog is static - no updates needed
  }

  /**
   * Render the character name dialog
   * CharacterNameModal handles its own rendering via DOM
   */
  render(): void {
    // CharacterNameModal manages its own DOM rendering
  }

  /**
   * Handle input for character name entry
   * CharacterNameModal has its own keydown handler for text input
   * Future Phase 4: Will move command registration here if needed
   *
   * Commands:
   * - a-z, A-Z, 0-9: Type character name
   * - Backspace: Delete character
   * - Enter: Submit name and start game (calls onStart)
   * - ESC: Cancel dialog (calls onCancel)
   *
   * @param input - Key press and modifiers
   */
  handleInput(_input: Input): void {
    // CharacterNameModal currently handles its own input via keydown listeners
    // Text input is handled natively by HTML input element
    // Enter key calls onStart callback
    // ESC key calls onCancel callback
  }

  /**
   * New game dialog is a paused state (menu doesn't update underneath)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * New game dialog is transparent (main menu visible behind, dimmed)
   */
  isTransparent(): boolean {
    return true
  }
}
