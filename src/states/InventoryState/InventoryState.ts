import { BaseState } from '@states/BaseState'
import { Input, GameState } from '@game/core/core'
import { ModalController } from '@ui/ModalController'

/**
 * InventoryState - Full inventory display with context commands
 *
 * Purpose: Shows player's complete inventory with:
 * - All items (a-z, A-Z identification)
 * - Context commands (drop, use, wear, examine)
 * - Item selection and highlighting
 * - Navigation (arrows, page up/down)
 * - ESC to close
 *
 * State Properties:
 * - isPaused(): true (inventory pauses gameplay)
 * - isTransparent(): true (game visible underneath, dimmed)
 *
 * Architecture:
 * - Currently wraps ModalController's inventory display
 * - Phase 4 will refactor to own inventory commands directly
 * - Transparent overlay shows game behind
 *
 * @example
 * const inventoryState = new InventoryState(
 *   modalController,
 *   gameState,
 *   () => stateManager.popState() // Close callback
 * )
 * stateManager.pushState(inventoryState)
 */
export class InventoryState extends BaseState {
  constructor(
    private modalController: ModalController,
    private gameState: GameState,
    private onClose: () => void
  ) {
    super()
  }

  /**
   * Called when state becomes active
   * Show the inventory modal
   */
  enter(): void {
    this.modalController.showInventory(this.gameState)
  }

  /**
   * Called when state is paused or removed
   * Hide the inventory modal
   */
  exit(): void {
    // ModalController handles its own modal cleanup via handleInput
    // This will be refactored in Phase 4 to properly close the modal
  }

  /**
   * Game tick logic (inventory is static)
   * @param deltaTime - Unused for static display
   */
  update(deltaTime: number): void {
    // Inventory is static - no updates needed
  }

  /**
   * Render the inventory
   * ModalController handles its own rendering via DOM
   */
  render(): void {
    // ModalController manages its own DOM rendering
  }

  /**
   * Handle input for inventory navigation
   * ModalController has its own keydown handler for now
   * Future Phase 4: Will move command registration here
   *
   * Commands:
   * - a-z, A-Z: Select item
   * - d: Drop selected item
   * - u: Use selected item (quaff, read, zap, etc.)
   * - w: Wear selected item (armor, ring)
   * - e: Examine selected item
   * - ESC: Close inventory (calls onClose)
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // ModalController currently handles its own input via keydown listeners
    // When ESC is pressed, it will call onClose callback
    // This is a transition state - Phase 4 will refactor to handle input here
  }

  /**
   * Inventory is a paused state (gameplay pauses while viewing inventory)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Inventory is transparent (shows dimmed game underneath)
   * Players can see their surroundings while managing inventory
   */
  isTransparent(): boolean {
    return true
  }
}
