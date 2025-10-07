import { IGameState } from '@game/core/core'

/**
 * GameStateManager - Manages the state stack (pushdown automaton pattern)
 *
 * Purpose: Central service for managing game states (screens, dialogs, menus).
 * States are managed as a stack where:
 * - Push = open new state (menu, dialog, screen)
 * - Pop = close current state and return to previous
 * - Replace = transition between major states (main menu → playing)
 *
 * Architecture:
 * - State Stack: LIFO (Last In, First Out) - top state is active
 * - Lifecycle: Automatic enter()/exit() calls on push/pop
 * - Input: Only top state receives input
 * - Rendering: Visible states render bottom-to-top (transparent states show background)
 *
 * @example
 * // Open inventory from playing state
 * stateManager.pushState(new InventoryState())
 * // Stack: [PlayingState, InventoryState] ← active
 *
 * // Close inventory with ESC
 * stateManager.popState()
 * // Stack: [PlayingState] ← active (automatically restored)
 */
export class GameStateManager {
  private stateStack: IGameState[] = []

  /**
   * Push a new state onto the stack
   * - Calls exit() on current state (if any) to pause it
   * - Adds new state to top of stack
   * - Calls enter() on new state to activate it
   *
   * @param state - The state to push onto the stack
   *
   * @example
   * stateManager.pushState(new InventoryState())
   */
  pushState(state: IGameState): void {
    // Pause current state if exists
    if (this.stateStack.length > 0) {
      const currentState = this.stateStack[this.stateStack.length - 1]
      currentState.exit()
    }

    // Add new state and activate it
    this.stateStack.push(state)
    state.enter()
  }

  /**
   * Remove the top state from the stack
   * - Calls exit() on current state to clean up
   * - Removes state from stack
   * - Calls enter() on previous state (if any) to restore it
   *
   * @returns The popped state, or null if stack was empty
   *
   * @example
   * // Close current dialog
   * const poppedState = stateManager.popState()
   * // Previous state is now active
   */
  popState(): IGameState | null {
    if (this.stateStack.length === 0) {
      return null
    }

    // Clean up current state
    const poppedState = this.stateStack.pop()!
    poppedState.exit()

    // Restore previous state if exists
    if (this.stateStack.length > 0) {
      const newCurrentState = this.stateStack[this.stateStack.length - 1]
      newCurrentState.enter()
    }

    return poppedState
  }

  /**
   * Get the current active state without removing it
   *
   * @returns The top state, or null if stack is empty
   *
   * @example
   * const currentState = stateManager.getCurrentState()
   * if (currentState) {
   *   currentState.render()
   * }
   */
  getCurrentState(): IGameState | null {
    if (this.stateStack.length === 0) {
      return null
    }
    return this.stateStack[this.stateStack.length - 1]
  }

  /**
   * Replace the current state with a new one
   * - Pops current state
   * - Pushes new state
   * - Useful for major transitions (main menu → playing, playing → death screen)
   *
   * @param state - The new state to replace with
   *
   * @example
   * // Start new game from main menu
   * stateManager.replaceState(new PlayingState())
   */
  replaceState(state: IGameState): void {
    this.popState()
    this.pushState(state)
  }

  /**
   * Remove all states from the stack
   * - Calls exit() on all states
   * - Clears the stack
   * - Useful for quit/restart scenarios
   *
   * @example
   * // Return to main menu from anywhere
   * stateManager.clearStack()
   * stateManager.pushState(new MainMenuState())
   */
  clearStack(): void {
    // Exit all states in reverse order
    while (this.stateStack.length > 0) {
      const state = this.stateStack.pop()!
      state.exit()
    }
  }

  /**
   * Get the current depth of the state stack
   * - Useful for debugging and limits (prevent infinite nesting)
   *
   * @returns The number of states in the stack
   *
   * @example
   * if (stateManager.getStackDepth() > 5) {
   *   console.warn('State stack is very deep!')
   * }
   */
  getStackDepth(): number {
    return this.stateStack.length
  }

  /**
   * Get all visible states from the stack (for rendering)
   * - Walks backwards from top until finding first non-transparent state
   * - Returns states in bottom-to-top rendering order
   *
   * @returns Array of states to render, in order from bottom to top
   *
   * @example
   * // Render all visible states with dimming
   * const visibleStates = stateManager.getVisibleStates()
   * visibleStates.forEach((state, index) => {
   *   const isTopState = index === visibleStates.length - 1
   *   state.render(isTopState ? 1.0 : 0.5) // Dim lower states
   * })
   */
  getVisibleStates(): IGameState[] {
    if (this.stateStack.length === 0) {
      return []
    }

    // Walk backwards to find first non-transparent state
    // Default to 0 (show all) if all states are transparent
    let startIndex = 0
    for (let i = this.stateStack.length - 1; i >= 0; i--) {
      const state = this.stateStack[i]
      if (!state.isTransparent()) {
        startIndex = i
        break
      }
    }

    // Return states from first visible to top
    return this.stateStack.slice(startIndex)
  }
}
