import { IGameState, Input } from '@game/core/core'

/**
 * BaseState - Abstract base class for game states
 *
 * Purpose: Reduce boilerplate by providing sensible defaults for common state behavior.
 * Most states are paused (don't update lower states) and opaque (don't show lower states).
 *
 * Default Behavior:
 * - isPaused() = true (pause lower states - most states are modal)
 * - isTransparent() = false (hide lower states - most states are full-screen)
 * - enter() = no-op (override if state needs initialization)
 * - exit() = no-op (override if state needs cleanup)
 *
 * Abstract Methods (must implement):
 * - update(_deltaTime: number): Game tick logic
 * - render(): Drawing logic
 * - handleInput(_input: Input): Input processing
 *
 * @example
 * class MainMenuState extends BaseState {
 *   update(_deltaTime: number) {
 *     // Menu doesn't need updates
 *   }
 *
 *   render() {
 *     // Draw menu UI
 *   }
 *
 *   handleInput(_input: Input) {
 *     // Handle menu navigation
 *   }
 * }
 *
 * @example
 * // Transparent state (shows game underneath)
 * class InventoryState extends BaseState {
 *   isTransparent() { return true } // Override to show game behind
 *
 *   update(_deltaTime: number) { }
 *   render() { // Draw inventory overlay }
 *   handleInput(_input: Input) { // Handle inventory commands }
 * }
 */
export abstract class BaseState implements IGameState {
  /**
   * Called when state becomes active
   * Override if state needs initialization (e.g., reset cursor position)
   */
  enter(): void {
    // Default: no initialization needed
  }

  /**
   * Called when state is removed or paused
   * Override if state needs cleanup (e.g., save temporary data)
   */
  exit(): void {
    // Default: no cleanup needed
  }

  /**
   * Game tick logic - called every frame if state is not paused
   * Must be implemented by concrete states
   *
   * @param deltaTime - Time elapsed since last update (in milliseconds)
   */
  abstract update(_deltaTime: number): void

  /**
   * Drawing logic - called for all visible states
   * Must be implemented by concrete states
   */
  abstract render(): void

  /**
   * Input processing - only called for top state
   * Must be implemented by concrete states
   *
   * @param input - Input event with key and modifiers
   */
  abstract handleInput(_input: Input): void

  /**
   * Should lower states in stack continue updating?
   * Default: true (pause lower states)
   *
   * Override to false for non-modal states (e.g., playing state shouldn't pause anything below)
   *
   * @returns true if lower states should be paused (default)
   */
  isPaused(): boolean {
    return true
  }

  /**
   * Should lower states in stack be visible (dimmed)?
   * Default: false (hide lower states - full-screen state)
   *
   * Override to true for transparent states (e.g., inventory shows game behind)
   *
   * @returns false if state is opaque/full-screen (default)
   */
  isTransparent(): boolean {
    return false
  }
}
