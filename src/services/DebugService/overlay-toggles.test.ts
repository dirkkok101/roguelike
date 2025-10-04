import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('DebugService - Overlay Toggles', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    mockState = {
      messages: [],
      turnCount: 0,
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  describe('toggleFOVDebug', () => {
    test('enables FOV overlay when disabled', () => {
      const result = debugService.toggleFOVDebug(mockState)

      expect(result.debug?.fovOverlay).toBe(true)
    })

    test('disables FOV overlay when enabled', () => {
      const enabledState = debugService.toggleFOVDebug(mockState)
      const result = debugService.toggleFOVDebug(enabledState)

      expect(result.debug?.fovOverlay).toBe(false)
    })

    test('preserves immutability', () => {
      const result = debugService.toggleFOVDebug(mockState)

      expect(result).not.toBe(mockState)
      expect(result.debug).not.toBe(mockState.debug)
      expect(mockState.debug?.fovOverlay).toBe(false) // Original unchanged
    })

    test('does nothing in production mode', () => {
      const prodService = new DebugService(new MessageService(), false)
      const result = prodService.toggleFOVDebug(mockState)

      expect(result).toBe(mockState)
    })
  })

  describe('togglePathDebug', () => {
    test('enables pathfinding overlay when disabled', () => {
      const result = debugService.togglePathDebug(mockState)

      expect(result.debug?.pathOverlay).toBe(true)
    })

    test('disables pathfinding overlay when enabled', () => {
      const enabledState = debugService.togglePathDebug(mockState)
      const result = debugService.togglePathDebug(enabledState)

      expect(result.debug?.pathOverlay).toBe(false)
    })

    test('preserves immutability', () => {
      const result = debugService.togglePathDebug(mockState)

      expect(result).not.toBe(mockState)
      expect(result.debug).not.toBe(mockState.debug)
      expect(mockState.debug?.pathOverlay).toBe(false) // Original unchanged
    })

    test('does nothing in production mode', () => {
      const prodService = new DebugService(new MessageService(), false)
      const result = prodService.togglePathDebug(mockState)

      expect(result).toBe(mockState)
    })
  })

  describe('toggleAIDebug', () => {
    test('enables AI overlay when disabled', () => {
      const result = debugService.toggleAIDebug(mockState)

      expect(result.debug?.aiOverlay).toBe(true)
    })

    test('disables AI overlay when enabled', () => {
      const enabledState = debugService.toggleAIDebug(mockState)
      const result = debugService.toggleAIDebug(enabledState)

      expect(result.debug?.aiOverlay).toBe(false)
    })

    test('preserves immutability', () => {
      const result = debugService.toggleAIDebug(mockState)

      expect(result).not.toBe(mockState)
      expect(result.debug).not.toBe(mockState.debug)
      expect(mockState.debug?.aiOverlay).toBe(false) // Original unchanged
    })

    test('does nothing in production mode', () => {
      const prodService = new DebugService(new MessageService(), false)
      const result = prodService.toggleAIDebug(mockState)

      expect(result).toBe(mockState)
    })
  })

  describe('toggleDebugConsole', () => {
    test('enables debug console when disabled', () => {
      const result = debugService.toggleDebugConsole(mockState)

      expect(result.debug?.debugConsoleVisible).toBe(true)
    })

    test('disables debug console when enabled', () => {
      const enabledState = debugService.toggleDebugConsole(mockState)
      const result = debugService.toggleDebugConsole(enabledState)

      expect(result.debug?.debugConsoleVisible).toBe(false)
    })

    test('preserves immutability', () => {
      const result = debugService.toggleDebugConsole(mockState)

      expect(result).not.toBe(mockState)
      expect(result.debug).not.toBe(mockState.debug)
      expect(mockState.debug?.debugConsoleVisible).toBe(false) // Original unchanged
    })

    test('does nothing in production mode', () => {
      const prodService = new DebugService(new MessageService(), false)
      const result = prodService.toggleDebugConsole(mockState)

      expect(result).toBe(mockState)
    })
  })

  describe('multiple overlays', () => {
    test('can enable multiple overlays simultaneously', () => {
      let state = mockState
      state = debugService.toggleFOVDebug(state)
      state = debugService.togglePathDebug(state)
      state = debugService.toggleAIDebug(state)

      expect(state.debug?.fovOverlay).toBe(true)
      expect(state.debug?.pathOverlay).toBe(true)
      expect(state.debug?.aiOverlay).toBe(true)
    })

    test('toggling one overlay does not affect others', () => {
      let state = mockState
      state = debugService.toggleFOVDebug(state)
      state = debugService.togglePathDebug(state)

      // Toggle FOV off
      state = debugService.toggleFOVDebug(state)

      expect(state.debug?.fovOverlay).toBe(false)
      expect(state.debug?.pathOverlay).toBe(true) // Still enabled
    })
  })
})
