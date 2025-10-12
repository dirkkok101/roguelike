import { BaseState } from '@states/BaseState'
import { Input, GameState, Item } from '@game/core/core'
import { ModalController } from '@ui/ModalController'

/**
 * ItemFilter type - string-based filter for ModalController compatibility
 */
export type ItemFilter =
  | 'all'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'food'
  | 'weapon'
  | 'armor'
  | 'ring'
  | 'oil_flask'
  | 'equipment' // weapons + light sources
  | 'unidentified'

/**
 * ItemSelectionCallback - called when user selects an item
 */
export type ItemSelectionCallback = (item: Item | null) => void

/**
 * ItemSelectionState - Reusable modal for "select item to X" prompts
 *
 * Purpose: Generic item selection dialog used by many commands:
 * - "Quaff which potion?" (filters to potions only)
 * - "Read which scroll?" (filters to scrolls only)
 * - "Zap which wand?" (filters to wands only)
 * - "Drop which item?" (shows all items)
 * - "Wear which armor?" (filters to wearable items)
 *
 * Features:
 * - Prompt message ("Quaff which potion?")
 * - Item filtering (only show relevant items)
 * - Item selection (a-z keys)
 * - ESC to abort
 * - Callback on selection/cancel
 * - Input filtering (only a-z and ESC allowed - prevents opening nested dialogs)
 *
 * State Properties:
 * - isPaused(): true (selection pauses gameplay)
 * - isTransparent(): true (game visible underneath, dimmed)
 * - getAllowedKeys(): ['Escape', 'a'-'z'] (blocks other keys)
 *
 * Architecture:
 * - Integrates with GameStateManager (pushes/pops state properly)
 * - Uses ModalController for DOM rendering (backward compatibility)
 * - Prevents input bleeding (won't open another dialog when 'w' pressed)
 *
 * @example
 * // Quaff potion command
 * const itemSelectionState = new ItemSelectionState(
 *   stateManager,
 *   modalController,
 *   gameState,
 *   "Quaff which potion?",
 *   "potion",
 *   (item) => {
 *     if (item) {
 *       // Drink the potion
 *       pendingCommand = new QuaffPotionCommand(item.id, ...)
 *     }
 *   },
 *   () => {} // Cancel - just close
 * )
 * stateManager.pushState(itemSelectionState)
 */
export class ItemSelectionState extends BaseState {
  private readonly allowedKeys: string[]

  constructor(
    private modalController: ModalController,
    private gameState: GameState,
    private prompt: string,
    private filter: ItemFilter,
    private onSelect: ItemSelectionCallback,
    private onCancel: () => void,
    private excludeItemId?: string
  ) {
    super()

    // Generate allowed keys: ESC + a-z
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
    this.allowedKeys = ['Escape', ...letters]
  }

  /**
   * Called when state becomes active
   * Show the item selection modal via ModalController
   */
  enter(): void {
    // Use existing ModalController for DOM rendering (backward compatibility)
    // Future: Could create custom modal rendering here
    this.modalController.showItemSelection(
      this.filter,
      this.prompt,
      this.gameState,
      (item) => {
        // Item selected - delegate to callback
        this.onSelect(item)
        // Note: Don't pop state here - let callback control state management
      },
      this.excludeItemId
    )
  }

  /**
   * Called when state is paused or removed
   * Hide the item selection modal
   */
  exit(): void {
    // Close modal if it's still open
    if (this.modalController.isOpen()) {
      this.modalController.hide()
    }
  }

  /**
   * Game tick logic (selection is static)
   * @param deltaTime - Unused for static display
   */
  update(_deltaTime: number): void {
    // Item selection is static - no updates needed
  }

  /**
   * Render the item selection prompt
   * ModalController handles its own rendering via DOM
   */
  render(): void {
    // ModalController manages its own DOM rendering
    // No additional rendering needed
  }

  /**
   * Handle input for item selection
   *
   * Commands:
   * - a-z: Select item (calls onSelect)
   * - ESC: Cancel selection (calls onCancel)
   * - All other keys: BLOCKED (prevented by getAllowedKeys())
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // ESC to cancel
    if (input.key === 'Escape') {
      this.onCancel()
      return
    }

    // a-z to select item
    const index = this.getItemIndexFromLetter(input.key)
    if (index !== null) {
      // Check if ModalController is still open
      // (It might have been closed by callback opening another modal)
      if (this.modalController.isOpen()) {
        // Let ModalController handle the selection
        // It will call our onSelect callback
        const mockEvent = new KeyboardEvent('keydown', { key: input.key })
        this.modalController.handleInput(mockEvent)
      }
      return
    }

    // All other keys are blocked by getAllowedKeys() in main.ts
    // This ensures 'w', 'd', 'q', etc. don't open nested dialogs
  }

  /**
   * Item selection is a paused state (gameplay pauses during selection)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Item selection is transparent (shows dimmed game underneath)
   * Players can see their surroundings while selecting items
   */
  isTransparent(): boolean {
    return true
  }

  /**
   * Only allow ESC and a-z keys
   * This prevents input bleeding (e.g., 'w' in wield modal won't open another wield modal)
   */
  getAllowedKeys(): string[] | null {
    return this.allowedKeys
  }

  /**
   * Get the prompt message for this selection
   */
  getPrompt(): string {
    return this.prompt
  }

  /**
   * Convert letter key to item index
   * @param key - Keyboard key
   * @returns Index (0-25) or null if not a letter
   */
  private getItemIndexFromLetter(key: string): number | null {
    const code = key.charCodeAt(0)
    // a = 97, z = 122
    if (code >= 97 && code <= 122) {
      return code - 97
    }
    return null
  }
}
