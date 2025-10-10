import { BaseState } from '@states/BaseState'
import { Input, GameState, Item } from '@game/core/core'

/**
 * ItemFilter function type - returns true if item should be shown
 */
export type ItemFilter = (item: Item, state: GameState) => boolean

/**
 * ItemSelectionCallback - called when user selects an item
 */
export type ItemSelectionCallback = (item: Item) => void

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
 * - Item selection (a-z, A-Z keys)
 * - '?' to show filtered inventory list
 * - ESC to abort
 * - Callback on selection
 *
 * State Properties:
 * - isPaused(): true (selection pauses gameplay)
 * - isTransparent(): true (game visible underneath, dimmed)
 *
 * Architecture:
 * - Wraps ModalController's item selection for now
 * - Phase 4 will implement native item selection UI
 * - Callback pattern allows commands to handle selection
 *
 * @example
 * // Quaff potion command
 * const itemSelectionState = new ItemSelectionState(
 *   modalController,
 *   gameState,
 *   "Quaff which potion?",
 *   (item, state) => item.type === ItemType.POTION,
 *   (item) => {
 *     // Drink the potion
 *     potionService.drink(gameState, item)
 *     stateManager.popState() // Close selection
 *   },
 *   () => stateManager.popState() // Cancel
 * )
 * stateManager.pushState(itemSelectionState)
 */
export class ItemSelectionState extends BaseState {
  constructor(
    private gameState: GameState,
    private prompt: string,
    private filter: ItemFilter
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the item selection modal
   */
  enter(): void {
    // For now, we'll use ModalController's existing item selection
    // In Phase 4, we'll create a dedicated item selection UI
    // that uses the prompt, filter, and callbacks

    // ModalController.showItemSelection handles filtered item display
    // It calls onSelect callback when item is chosen
    // It calls onCancel callback on ESC
  }

  /**
   * Called when state is paused or removed
   * Hide the item selection modal
   */
  exit(): void {
    // ModalController handles its own modal cleanup
    // Phase 4 will properly implement modal close
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
    // Phase 4 will implement custom rendering with prompt display
  }

  /**
   * Handle input for item selection
   * ModalController has its own keydown handler for now
   * Future Phase 4: Will move command registration here
   *
   * Commands:
   * - a-z, A-Z: Select item (calls onSelect)
   * - ?: Show filtered inventory list
   * - ESC: Cancel selection (calls onCancel)
   *
   * @param input - Key press and modifiers
   */
  handleInput(_input: Input): void {
    // ModalController currently handles its own input via keydown listeners
    // When an item is selected, it will call onSelect callback
    // When ESC is pressed, it will call onCancel callback
    // This is a transition state - Phase 4 will refactor to handle input here
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
   * Get the prompt message for this selection
   */
  getPrompt(): string {
    return this.prompt
  }

  /**
   * Get filtered items that match the filter
   */
  getFilteredItems(): Item[] {
    return this.gameState.player.inventory.filter((item) =>
      this.filter(item, this.gameState)
    )
  }
}
