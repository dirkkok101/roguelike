import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('DebugService - God Mode', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    mockState = {
      messages: [],
      turnCount: 0,
      debug: debugService.initializeDebugState(),
      player: {
        hp: 8,
        maxHp: 12,
      },
    } as GameState
  })

  test('toggleGodMode enables god mode when disabled', () => {
    const result = debugService.toggleGodMode(mockState)

    expect(result.debug?.godMode).toBe(true)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('God mode ENABLED')
  })

  test('toggleGodMode disables god mode when enabled', () => {
    const enabledState = debugService.toggleGodMode(mockState)
    const result = debugService.toggleGodMode(enabledState)

    expect(result.debug?.godMode).toBe(false)
    expect(result.messages[result.messages.length - 1].text).toContain('DISABLED')
  })

  test('isGodModeActive returns correct status', () => {
    expect(debugService.isGodModeActive(mockState)).toBe(false)

    const enabled = debugService.toggleGodMode(mockState)
    expect(debugService.isGodModeActive(enabled)).toBe(true)
  })

  test('toggleGodMode does nothing in production mode', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.toggleGodMode(mockState)

    expect(result).toBe(mockState) // Returns unchanged
  })

  test('toggleGodMode preserves immutability', () => {
    const result = debugService.toggleGodMode(mockState)

    expect(result).not.toBe(mockState)
    expect(result.debug).not.toBe(mockState.debug)
    expect(mockState.debug?.godMode).toBe(false) // Original unchanged
  })
})
