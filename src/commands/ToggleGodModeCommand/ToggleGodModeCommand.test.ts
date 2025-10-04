import { ToggleGodModeCommand } from './ToggleGodModeCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('ToggleGodModeCommand', () => {
  let debugService: DebugService
  let command: ToggleGodModeCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new ToggleGodModeCommand(debugService)
  })

  test('executes debugService.toggleGodMode', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.godMode).toBe(true)
  })

  test('toggles god mode on', () => {
    const mockState = {
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.godMode).toBe(true)
    expect(result.messages).toHaveLength(1)
  })

  test('toggles god mode off when already enabled', () => {
    const mockState = {
      messages: [],
      debug: {
        ...debugService.initializeDebugState(),
        godMode: true,
      },
    } as GameState

    const result = command.execute(mockState)

    expect(result.debug?.godMode).toBe(false)
  })
})
