import { GameStateManager } from './GameStateManager'
import { IGameState, Input } from '@game/core/core'

/**
 * Mock state for testing - tracks lifecycle calls
 */
class MockState implements IGameState {
  public enterCalled = 0
  public exitCalled = 0
  public updateCalled = 0
  public renderCalled = 0
  public handleInputCalled = 0

  constructor(
    public name: string,
    private paused: boolean = true,
    private transparent: boolean = false
  ) {}

  enter(): void {
    this.enterCalled++
  }

  exit(): void {
    this.exitCalled++
  }

  update(deltaTime: number): void {
    this.updateCalled++
  }

  render(): void {
    this.renderCalled++
  }

  handleInput(input: Input): void {
    this.handleInputCalled++
  }

  isPaused(): boolean {
    return this.paused
  }

  isTransparent(): boolean {
    return this.transparent
  }
}

describe('GameStateManager - State Transitions', () => {
  let stateManager: GameStateManager

  beforeEach(() => {
    stateManager = new GameStateManager()
  })

  describe('pushState', () => {
    it('should push state and call enter()', () => {
      // Arrange
      const state = new MockState('TestState')

      // Act
      stateManager.pushState(state)

      // Assert
      expect(state.enterCalled).toBe(1)
      expect(stateManager.getCurrentState()).toBe(state)
      expect(stateManager.getStackDepth()).toBe(1)
    })

    it('should call exit() on previous state when pushing new state', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')

      // Act
      stateManager.pushState(state1)
      stateManager.pushState(state2)

      // Assert
      expect(state1.exitCalled).toBe(1)
      expect(state2.enterCalled).toBe(1)
      expect(stateManager.getCurrentState()).toBe(state2)
      expect(stateManager.getStackDepth()).toBe(2)
    })

    it('should allow pushing multiple states', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      const state3 = new MockState('State3')

      // Act
      stateManager.pushState(state1)
      stateManager.pushState(state2)
      stateManager.pushState(state3)

      // Assert
      expect(stateManager.getStackDepth()).toBe(3)
      expect(stateManager.getCurrentState()).toBe(state3)
    })
  })

  describe('popState', () => {
    it('should pop state and call exit()', () => {
      // Arrange
      const state = new MockState('TestState')
      stateManager.pushState(state)

      // Act
      const poppedState = stateManager.popState()

      // Assert
      expect(poppedState).toBe(state)
      expect(state.exitCalled).toBe(1)
      expect(stateManager.getCurrentState()).toBeNull()
      expect(stateManager.getStackDepth()).toBe(0)
    })

    it('should return null when popping empty stack', () => {
      // Act
      const poppedState = stateManager.popState()

      // Assert
      expect(poppedState).toBeNull()
      expect(stateManager.getStackDepth()).toBe(0)
    })

    it('should call enter() on previous state after pop', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      stateManager.pushState(state1)
      stateManager.pushState(state2)

      // Reset enter call count (was called once on first push)
      state1.enterCalled = 0

      // Act
      stateManager.popState()

      // Assert
      expect(state2.exitCalled).toBe(1)
      expect(state1.enterCalled).toBe(1) // Called again when restored
      expect(stateManager.getCurrentState()).toBe(state1)
      expect(stateManager.getStackDepth()).toBe(1)
    })

    it('should handle multiple pops correctly', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      const state3 = new MockState('State3')
      stateManager.pushState(state1)
      stateManager.pushState(state2)
      stateManager.pushState(state3)

      // Act
      stateManager.popState() // Pop state3
      stateManager.popState() // Pop state2

      // Assert
      expect(stateManager.getCurrentState()).toBe(state1)
      expect(stateManager.getStackDepth()).toBe(1)
    })
  })

  describe('getCurrentState', () => {
    it('should return null for empty stack', () => {
      // Act
      const currentState = stateManager.getCurrentState()

      // Assert
      expect(currentState).toBeNull()
    })

    it('should return top state without modifying stack', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      stateManager.pushState(state1)
      stateManager.pushState(state2)

      // Act
      const currentState = stateManager.getCurrentState()

      // Assert
      expect(currentState).toBe(state2)
      expect(stateManager.getStackDepth()).toBe(2) // Stack unchanged
    })
  })

  describe('replaceState', () => {
    it('should replace current state with new state', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      stateManager.pushState(state1)

      // Act
      stateManager.replaceState(state2)

      // Assert
      expect(state1.exitCalled).toBe(1)
      expect(state2.enterCalled).toBe(1)
      expect(stateManager.getCurrentState()).toBe(state2)
      expect(stateManager.getStackDepth()).toBe(1)
    })

    it('should handle replace on empty stack', () => {
      // Arrange
      const state = new MockState('TestState')

      // Act
      stateManager.replaceState(state)

      // Assert
      expect(state.enterCalled).toBe(1)
      expect(stateManager.getCurrentState()).toBe(state)
      expect(stateManager.getStackDepth()).toBe(1)
    })

    it('should preserve lower stack states when replacing', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      const state3 = new MockState('State3')
      stateManager.pushState(state1)
      stateManager.pushState(state2)

      // Act
      stateManager.replaceState(state3)

      // Assert
      expect(stateManager.getStackDepth()).toBe(2)
      expect(stateManager.getCurrentState()).toBe(state3)
      // Pop state3 to verify state1 is still there
      stateManager.popState()
      expect(stateManager.getCurrentState()).toBe(state1)
    })
  })

  describe('clearStack', () => {
    it('should clear all states and call exit() on each', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')
      const state3 = new MockState('State3')
      stateManager.pushState(state1)
      stateManager.pushState(state2) // state1.exit() called (paused)
      stateManager.pushState(state3) // state2.exit() called (paused)

      // Act
      stateManager.clearStack()

      // Assert
      // state1: exit() called when state2 pushed + clearStack = 2
      // state2: exit() called when state3 pushed + clearStack = 2
      // state3: exit() called only in clearStack = 1
      expect(state1.exitCalled).toBe(2)
      expect(state2.exitCalled).toBe(2)
      expect(state3.exitCalled).toBe(1)
      expect(stateManager.getStackDepth()).toBe(0)
      expect(stateManager.getCurrentState()).toBeNull()
    })

    it('should handle clearing empty stack', () => {
      // Act
      stateManager.clearStack()

      // Assert
      expect(stateManager.getStackDepth()).toBe(0)
    })
  })

  describe('getStackDepth', () => {
    it('should return 0 for empty stack', () => {
      expect(stateManager.getStackDepth()).toBe(0)
    })

    it('should return correct depth after pushes', () => {
      stateManager.pushState(new MockState('State1'))
      expect(stateManager.getStackDepth()).toBe(1)

      stateManager.pushState(new MockState('State2'))
      expect(stateManager.getStackDepth()).toBe(2)

      stateManager.pushState(new MockState('State3'))
      expect(stateManager.getStackDepth()).toBe(3)
    })

    it('should return correct depth after pops', () => {
      stateManager.pushState(new MockState('State1'))
      stateManager.pushState(new MockState('State2'))
      stateManager.pushState(new MockState('State3'))

      stateManager.popState()
      expect(stateManager.getStackDepth()).toBe(2)

      stateManager.popState()
      expect(stateManager.getStackDepth()).toBe(1)
    })
  })

  describe('getVisibleStates', () => {
    it('should return empty array for empty stack', () => {
      // Act
      const visibleStates = stateManager.getVisibleStates()

      // Assert
      expect(visibleStates).toEqual([])
    })

    it('should return only top state if non-transparent', () => {
      // Arrange
      const state1 = new MockState('State1', true, false) // Opaque
      const state2 = new MockState('State2', true, false) // Opaque
      stateManager.pushState(state1)
      stateManager.pushState(state2)

      // Act
      const visibleStates = stateManager.getVisibleStates()

      // Assert
      expect(visibleStates).toEqual([state2])
    })

    it('should return transparent states above last opaque state', () => {
      // Arrange
      const state1 = new MockState('State1', false, false) // Opaque (playing)
      const state2 = new MockState('State2', true, true) // Transparent (inventory)
      const state3 = new MockState('State3', true, true) // Transparent (item selection)
      stateManager.pushState(state1)
      stateManager.pushState(state2)
      stateManager.pushState(state3)

      // Act
      const visibleStates = stateManager.getVisibleStates()

      // Assert
      expect(visibleStates).toEqual([state1, state2, state3])
    })

    it('should handle all transparent states', () => {
      // Arrange
      const state1 = new MockState('State1', true, true) // Transparent
      const state2 = new MockState('State2', true, true) // Transparent
      const state3 = new MockState('State3', true, true) // Transparent
      stateManager.pushState(state1)
      stateManager.pushState(state2)
      stateManager.pushState(state3)

      // Act
      const visibleStates = stateManager.getVisibleStates()

      // Assert
      expect(visibleStates).toEqual([state1, state2, state3])
    })

    it('should stop at first opaque state in middle of stack', () => {
      // Arrange
      const state1 = new MockState('State1', false, false) // Opaque (main menu)
      const state2 = new MockState('State2', false, false) // Opaque (playing)
      const state3 = new MockState('State3', true, true) // Transparent (inventory)
      stateManager.pushState(state1)
      stateManager.pushState(state2)
      stateManager.pushState(state3)

      // Act
      const visibleStates = stateManager.getVisibleStates()

      // Assert
      expect(visibleStates).toEqual([state2, state3]) // State1 not visible
    })
  })

  describe('Lifecycle Integration', () => {
    it('should maintain correct lifecycle order for push/push/pop/pop', () => {
      // Arrange
      const state1 = new MockState('State1')
      const state2 = new MockState('State2')

      // Act & Assert
      stateManager.pushState(state1)
      expect(state1.enterCalled).toBe(1)
      expect(state1.exitCalled).toBe(0)

      stateManager.pushState(state2)
      expect(state1.exitCalled).toBe(1) // Paused
      expect(state2.enterCalled).toBe(1)

      stateManager.popState()
      expect(state2.exitCalled).toBe(1)
      expect(state1.enterCalled).toBe(2) // Restored

      stateManager.popState()
      expect(state1.exitCalled).toBe(2) // Final cleanup
    })

    it('should not call enter() twice without exit() in between', () => {
      // Arrange
      const state = new MockState('TestState')

      // Act
      stateManager.pushState(state)
      const enterCount1 = state.enterCalled

      // Try to get current state multiple times
      stateManager.getCurrentState()
      stateManager.getCurrentState()

      // Assert
      expect(state.enterCalled).toBe(enterCount1) // No additional enter calls
    })
  })
})
