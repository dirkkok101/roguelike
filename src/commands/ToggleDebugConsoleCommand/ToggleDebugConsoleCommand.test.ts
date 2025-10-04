import { ToggleDebugConsoleCommand } from './ToggleDebugConsoleCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('ToggleDebugConsoleCommand', () => {
  let debugService: DebugService
  let command: ToggleDebugConsoleCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new ToggleDebugConsoleCommand(debugService)
  })

  test('executes debugService.toggleDebugConsole', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(true)
  })

  test('toggles debug console visibility on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(true)
  })

  test('toggles debug console visibility off when already visible', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        debugConsoleVisible: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.debugConsoleVisible).toBe(false)
  })
})
