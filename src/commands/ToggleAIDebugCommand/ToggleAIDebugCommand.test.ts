import { ToggleAIDebugCommand } from './ToggleAIDebugCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('ToggleAIDebugCommand', () => {
  let debugService: DebugService
  let command: ToggleAIDebugCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new ToggleAIDebugCommand(debugService)
  })

  test('executes debugService.toggleAIDebug', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.aiOverlay).toBe(true)
  })

  test('toggles AI overlay on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.aiOverlay).toBe(true)
  })

  test('toggles AI overlay off', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        aiOverlay: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.aiOverlay).toBe(false)
  })
})
