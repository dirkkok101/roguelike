import { ToggleFOVDebugCommand } from './ToggleFOVDebugCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('ToggleFOVDebugCommand', () => {
  let debugService: DebugService
  let command: ToggleFOVDebugCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new ToggleFOVDebugCommand(debugService)
  })

  test('executes debugService.toggleFOVDebug', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(true)
  })

  test('toggles FOV overlay on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(true)
  })

  test('toggles FOV overlay off', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        fovOverlay: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.fovOverlay).toBe(false)
  })
})
