import { TogglePathDebugCommand } from './TogglePathDebugCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('TogglePathDebugCommand', () => {
  let debugService: DebugService
  let command: TogglePathDebugCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new TogglePathDebugCommand(debugService)
  })

  test('executes debugService.togglePathDebug', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.pathOverlay).toBe(true)
  })

  test('toggles pathfinding overlay on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.pathOverlay).toBe(true)
  })

  test('toggles pathfinding overlay off', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        pathOverlay: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.pathOverlay).toBe(false)
  })
})
