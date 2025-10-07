import { GameStateManager } from './GameStateManager'
import { IGameState, Input } from '@game/core/core'

/**
 * Integration tests for state transitions
 * Tests complete user flows through multiple states
 */

// Mock states for integration testing
class MockPlayingState implements IGameState {
  public enterCount = 0
  public exitCount = 0

  enter(): void {
    this.enterCount++
  }
  exit(): void {
    this.exitCount++
  }
  update(deltaTime: number): void {}
  render(): void {}
  handleInput(input: Input): void {}
  isPaused(): boolean {
    return false
  }
  isTransparent(): boolean {
    return false
  }
}

class MockInventoryState implements IGameState {
  public enterCount = 0
  public exitCount = 0

  enter(): void {
    this.enterCount++
  }
  exit(): void {
    this.exitCount++
  }
  update(deltaTime: number): void {}
  render(): void {}
  handleInput(input: Input): void {}
  isPaused(): boolean {
    return true
  }
  isTransparent(): boolean {
    return true
  }
}

class MockItemSelectionState implements IGameState {
  public enterCount = 0
  public exitCount = 0

  enter(): void {
    this.enterCount++
  }
  exit(): void {
    this.exitCount++
  }
  update(deltaTime: number): void {}
  render(): void {}
  handleInput(input: Input): void {}
  isPaused(): boolean {
    return true
  }
  isTransparent(): boolean {
    return true
  }
}

class MockDeathScreenState implements IGameState {
  public enterCount = 0
  public exitCount = 0

  enter(): void {
    this.enterCount++
  }
  exit(): void {
    this.exitCount++
  }
  update(deltaTime: number): void {}
  render(): void {}
  handleInput(input: Input): void {}
  isPaused(): boolean {
    return true
  }
  isTransparent(): boolean {
    return false
  }
}

describe('GameStateManager - Integration Tests', () => {
  let stateManager: GameStateManager

  beforeEach(() => {
    stateManager = new GameStateManager()
  })

  describe('Flow: Playing → Inventory → Item Selection', () => {
    it('should handle nested modal states correctly', () => {
      // Arrange
      const playingState = new MockPlayingState()
      const inventoryState = new MockInventoryState()
      const itemSelectionState = new MockItemSelectionState()

      // Act: Start game
      stateManager.pushState(playingState)
      expect(playingState.enterCount).toBe(1)
      expect(stateManager.getStackDepth()).toBe(1)

      // Act: Open inventory
      stateManager.pushState(inventoryState)
      expect(playingState.exitCount).toBe(1) // Paused
      expect(inventoryState.enterCount).toBe(1)
      expect(stateManager.getStackDepth()).toBe(2)

      // Act: Open item selection (e.g., "Drop which item?")
      stateManager.pushState(itemSelectionState)
      expect(inventoryState.exitCount).toBe(1) // Paused
      expect(itemSelectionState.enterCount).toBe(1)
      expect(stateManager.getStackDepth()).toBe(3)

      // Assert: All three states in stack
      const visibleStates = stateManager.getVisibleStates()
      expect(visibleStates).toHaveLength(3) // All transparent, so all visible
      expect(visibleStates[0]).toBe(playingState)
      expect(visibleStates[1]).toBe(inventoryState)
      expect(visibleStates[2]).toBe(itemSelectionState)

      // Act: Close item selection (ESC or item selected)
      stateManager.popState()
      expect(itemSelectionState.exitCount).toBe(1)
      expect(inventoryState.enterCount).toBe(2) // Restored
      expect(stateManager.getStackDepth()).toBe(2)

      // Act: Close inventory
      stateManager.popState()
      expect(inventoryState.exitCount).toBe(2)
      expect(playingState.enterCount).toBe(2) // Restored
      expect(stateManager.getStackDepth()).toBe(1)
    })
  })

  describe('Flow: Playing → Death Screen → Main Menu', () => {
    it('should handle game over flow correctly', () => {
      // Arrange
      const playingState = new MockPlayingState()
      const deathScreenState = new MockDeathScreenState()

      // Act: Start game
      stateManager.pushState(playingState)
      expect(stateManager.getCurrentState()).toBe(playingState)

      // Act: Player dies, show death screen
      stateManager.pushState(deathScreenState)
      expect(playingState.exitCount).toBe(1)
      expect(deathScreenState.enterCount).toBe(1)
      expect(stateManager.getStackDepth()).toBe(2)

      // Assert: Only death screen visible (opaque)
      const visibleStates = stateManager.getVisibleStates()
      expect(visibleStates).toHaveLength(1)
      expect(visibleStates[0]).toBe(deathScreenState)

      // Act: Quit to main menu (clearStack then push MainMenuState)
      stateManager.clearStack()
      expect(deathScreenState.exitCount).toBe(1)
      expect(playingState.exitCount).toBe(2) // Also cleaned up
      expect(stateManager.getStackDepth()).toBe(0)
    })
  })

  describe('Flow: Replace state (Main Menu → Playing)', () => {
    it('should replace state correctly for major transitions', () => {
      // Arrange
      const mainMenuState = new MockInventoryState() // Reusing mock, behavior is similar
      const playingState = new MockPlayingState()

      // Act: Show main menu
      stateManager.pushState(mainMenuState)
      expect(mainMenuState.enterCount).toBe(1)

      // Act: Start new game (replace menu with playing)
      stateManager.replaceState(playingState)
      expect(mainMenuState.exitCount).toBe(1)
      expect(playingState.enterCount).toBe(1)
      expect(stateManager.getStackDepth()).toBe(1)
      expect(stateManager.getCurrentState()).toBe(playingState)
    })
  })

  describe('Flow: Transparent state rendering', () => {
    it('should show all transparent states for rendering', () => {
      // Arrange
      const playingState = new MockPlayingState() // Opaque
      const inventoryState = new MockInventoryState() // Transparent
      const itemSelectionState = new MockItemSelectionState() // Transparent

      // Act
      stateManager.pushState(playingState)
      stateManager.pushState(inventoryState)
      stateManager.pushState(itemSelectionState)

      // Assert: All states visible because top states are transparent
      const visibleStates = stateManager.getVisibleStates()
      expect(visibleStates).toHaveLength(3)
      expect(visibleStates[0]).toBe(playingState)
      expect(visibleStates[1]).toBe(inventoryState)
      expect(visibleStates[2]).toBe(itemSelectionState)
    })

    it('should only show from last opaque state forward', () => {
      // Arrange
      const mainMenuState = new MockDeathScreenState() // Opaque
      const playingState = new MockPlayingState() // Opaque
      const inventoryState = new MockInventoryState() // Transparent

      // Act
      stateManager.pushState(mainMenuState)
      stateManager.pushState(playingState)
      stateManager.pushState(inventoryState)

      // Assert: Only playing + inventory visible (menu hidden by playing)
      const visibleStates = stateManager.getVisibleStates()
      expect(visibleStates).toHaveLength(2)
      expect(visibleStates[0]).toBe(playingState)
      expect(visibleStates[1]).toBe(inventoryState)
    })
  })

  describe('Flow: Abort sequence', () => {
    it('should handle ESC cancel flow correctly', () => {
      // Arrange
      const playingState = new MockPlayingState()
      const itemSelectionState = new MockItemSelectionState()

      // Act: Playing, then prompt for item
      stateManager.pushState(playingState)
      stateManager.pushState(itemSelectionState)

      // User presses ESC to cancel
      const poppedState = stateManager.popState()

      // Assert: Back to playing state
      expect(poppedState).toBe(itemSelectionState)
      expect(itemSelectionState.exitCount).toBe(1)
      expect(playingState.enterCount).toBe(2) // Restored
      expect(stateManager.getCurrentState()).toBe(playingState)
    })
  })
})
