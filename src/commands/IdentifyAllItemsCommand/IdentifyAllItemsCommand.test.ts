import { IdentifyAllItemsCommand } from './IdentifyAllItemsCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState } from '@game/core/core'

describe('IdentifyAllItemsCommand', () => {
  let debugService: DebugService
  let command: IdentifyAllItemsCommand

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    command = new IdentifyAllItemsCommand(debugService)
  })

  test('executes debugService.identifyAll', () => {
    const mockState = {
      messages: [],
      turnCount: 0,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.identifiedItems.size).toBeGreaterThan(0)
  })

  test('marks all item types as identified', () => {
    const mockState = {
      messages: [],
      turnCount: 0,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    // Should identify many item types (potions, scrolls, rings, wands)
    expect(result.identifiedItems.size).toBeGreaterThan(10)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Identified all')
    expect(result.messages[0].text).toContain('item types')
  })

  test('preserves existing messages', () => {
    const mockState = {
      messages: [{ text: 'Previous message', type: 'info' as const, turnCount: 0 }],
      turnCount: 1,
      identifiedItems: new Set<string>(),
      debug: debugService.initializeDebugState(),
    } as GameState

    const result = command.execute(mockState)

    expect(result.messages.length).toBe(2)
    expect(result.messages[0].text).toBe('Previous message')
  })
})
