import { BaseState } from '@states/BaseState'
import { Input, GameState, Position } from '@game/core/core'
import { ModalController } from '@ui/ModalController'

/**
 * TargetConfirmCallback - called when user confirms target
 */
export type TargetConfirmCallback = (position: Position) => void

/**
 * TargetCancelCallback - called when user cancels targeting
 */
export type TargetCancelCallback = () => void

/**
 * TargetSelectionState - Cursor-based targeting for wands, spells, ranged attacks
 *
 * Purpose: Interactive cursor mode for selecting target positions:
 * - Wand zapping (select monster or tile to zap)
 * - Spell casting (select area or target)
 * - Throwing items (select target)
 * - Ranged attacks (select enemy)
 *
 * Features:
 * - Cursor movement (h,j,k,l,y,u,b,n keys)
 * - Range validation (can't target beyond range)
 * - Line-of-sight checking (optional)
 * - Monster cycling (Tab key)
 * - Target confirmation (Enter/Space)
 * - Cancel (ESC)
 * - Visual cursor overlay
 * - Target info display (monster name, distance, etc.)
 *
 * State Properties:
 * - isPaused(): true (targeting pauses gameplay)
 * - isTransparent(): true (game visible with cursor overlay)
 *
 * Architecture:
 * - Wraps ModalController's targeting system for now
 * - Phase 4 will implement native targeting UI
 * - Callback pattern allows commands to handle target selection
 *
 * @example
 * // Zap wand command
 * const targetingState = new TargetSelectionState(
 *   modalController,
 *   gameState,
 *   7, // range
 *   (position) => {
 *     // Zap the wand at target position
 *     wandService.zap(gameState, wand, position)
 *     stateManager.popState() // Close targeting
 *   },
 *   () => stateManager.popState() // Cancel
 * )
 * stateManager.pushState(targetingState)
 */
export class TargetSelectionState extends BaseState {
  private cursorPosition: Position

  constructor(
    private modalController: ModalController,
    private gameState: GameState,
    private range: number,
    private onTarget: TargetConfirmCallback,
    private onCancel: TargetCancelCallback
  ) {
    super()
    // Initialize cursor at player position
    this.cursorPosition = { ...gameState.player.position }
  }

  /**
   * Called when state becomes active
   * Show the targeting cursor
   */
  enter(): void {
    // For now, we'll use ModalController's existing targeting system
    // In Phase 4, we'll create a dedicated targeting UI
    // that shows cursor, validates range, and cycles monsters

    // ModalController.showTargeting handles cursor display and input
    // It calls onTarget callback when target is confirmed
    // It calls onCancel callback on ESC
  }

  /**
   * Called when state is paused or removed
   * Hide the targeting cursor
   */
  exit(): void {
    // ModalController handles its own modal cleanup
    // Phase 4 will properly implement cursor removal
  }

  /**
   * Game tick logic (targeting is static, but cursor could animate)
   * @param deltaTime - Unused for now
   */
  update(deltaTime: number): void {
    // Targeting is mostly static
    // Could animate cursor blinking here in future
  }

  /**
   * Render the targeting cursor and info
   * ModalController handles its own rendering via DOM
   */
  render(): void {
    // ModalController manages its own DOM rendering
    // Phase 4 will implement custom rendering with:
    // - Cursor overlay on dungeon
    // - Target info panel (name, distance, HP)
    // - Range indicator
  }

  /**
   * Handle input for targeting
   * ModalController has its own keydown handler for now
   * Future Phase 4: Will move command registration here
   *
   * Commands:
   * - h,j,k,l,y,u,b,n: Move cursor (vim-style)
   * - Arrow keys: Move cursor
   * - Enter/Space: Confirm target (calls onTarget)
   * - Tab: Cycle to next visible monster
   * - Shift+Tab: Cycle to previous visible monster
   * - ESC: Cancel targeting (calls onCancel)
   *
   * @param input - Key press and modifiers
   */
  handleInput(input: Input): void {
    // ModalController currently handles its own input via keydown listeners
    // When target is confirmed, it will call onTarget callback
    // When ESC is pressed, it will call onCancel callback
    // This is a transition state - Phase 4 will refactor to handle input here
  }

  /**
   * Targeting is a paused state (gameplay pauses during targeting)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Targeting is transparent (shows game with cursor overlay)
   * Players can see the dungeon and monsters while targeting
   */
  isTransparent(): boolean {
    return true
  }

  /**
   * Get current cursor position
   */
  getCursorPosition(): Position {
    return this.cursorPosition
  }

  /**
   * Get maximum targeting range
   */
  getRange(): number {
    return this.range
  }

  /**
   * Move cursor in a direction (helper for Phase 4)
   * @param dx - X offset (-1, 0, 1)
   * @param dy - Y offset (-1, 0, 1)
   */
  moveCursor(dx: number, dy: number): void {
    const newX = this.cursorPosition.x + dx
    const newY = this.cursorPosition.y + dy

    // Validate position is within range and on map
    const level = this.gameState.levels.get(this.gameState.currentLevel)
    if (!level) return

    if (newX >= 0 && newX < level.width && newY >= 0 && newY < level.height) {
      // Calculate distance from player
      const dist = Math.sqrt(
        Math.pow(newX - this.gameState.player.position.x, 2) +
          Math.pow(newY - this.gameState.player.position.y, 2)
      )

      if (dist <= this.range) {
        this.cursorPosition = { x: newX, y: newY }
      }
    }
  }
}
