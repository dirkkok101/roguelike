import { MessageService } from './MessageService'
import { Message } from '@game/core/core'

describe('MessageService - Message Management', () => {
  let service: MessageService

  beforeEach(() => {
    service = new MessageService()
  })

  describe('addMessage()', () => {
    test('adds message to empty array', () => {
      const messages: Message[] = []

      const updated = service.addMessage(messages, 'Test message', 'info', 1)

      expect(updated).toHaveLength(1)
      expect(updated[0]).toEqual({
        text: 'Test message',
        type: 'info',
        turn: 1,
      })
    })

    test('adds message to existing array', () => {
      const messages: Message[] = [
        { text: 'First message', type: 'info', turn: 1 },
      ]

      const updated = service.addMessage(
        messages,
        'Second message',
        'combat',
        2
      )

      expect(updated).toHaveLength(2)
      expect(updated[1]).toEqual({
        text: 'Second message',
        type: 'combat',
        turn: 2,
      })
    })

    test('does not mutate original array', () => {
      const messages: Message[] = [
        { text: 'Original message', type: 'info', turn: 1 },
      ]
      const originalLength = messages.length

      service.addMessage(messages, 'New message', 'info', 2)

      expect(messages).toHaveLength(originalLength)
    })

    test('handles different message types', () => {
      const messages: Message[] = []

      const updated1 = service.addMessage(messages, 'Info message', 'info', 1)
      const updated2 = service.addMessage(updated1, 'Combat message', 'combat', 2)
      const updated3 = service.addMessage(updated2, 'Warning message', 'warning', 3)

      expect(updated3[0].type).toBe('info')
      expect(updated3[1].type).toBe('combat')
      expect(updated3[2].type).toBe('warning')
    })

    test('preserves turn numbers', () => {
      const messages: Message[] = []

      const updated1 = service.addMessage(messages, 'Turn 1', 'info', 1)
      const updated2 = service.addMessage(updated1, 'Turn 5', 'info', 5)
      const updated3 = service.addMessage(updated2, 'Turn 10', 'info', 10)

      expect(updated3[0].turn).toBe(1)
      expect(updated3[1].turn).toBe(5)
      expect(updated3[2].turn).toBe(10)
    })

    test('handles empty text', () => {
      const messages: Message[] = []

      const updated = service.addMessage(messages, '', 'info', 1)

      expect(updated[0].text).toBe('')
    })

    test('handles long text', () => {
      const messages: Message[] = []
      const longText = 'A'.repeat(1000)

      const updated = service.addMessage(messages, longText, 'info', 1)

      expect(updated[0].text).toBe(longText)
    })
  })

  describe('addMessages()', () => {
    test('adds multiple messages at once', () => {
      const messages: Message[] = []
      const newMessages = [
        { text: 'Message 1', type: 'info' as const },
        { text: 'Message 2', type: 'combat' as const },
        { text: 'Message 3', type: 'warning' as const },
      ]

      const updated = service.addMessages(messages, newMessages, 5)

      expect(updated).toHaveLength(3)
      expect(updated[0]).toEqual({ text: 'Message 1', type: 'info', turn: 5 })
      expect(updated[1]).toEqual({ text: 'Message 2', type: 'combat', turn: 5 })
      expect(updated[2]).toEqual({ text: 'Message 3', type: 'warning', turn: 5 })
    })

    test('adds to existing messages', () => {
      const messages: Message[] = [
        { text: 'Existing', type: 'info', turn: 1 },
      ]
      const newMessages = [
        { text: 'New 1', type: 'info' as const },
        { text: 'New 2', type: 'combat' as const },
      ]

      const updated = service.addMessages(messages, newMessages, 2)

      expect(updated).toHaveLength(3)
      expect(updated[0].text).toBe('Existing')
      expect(updated[1].text).toBe('New 1')
      expect(updated[2].text).toBe('New 2')
    })

    test('handles empty array', () => {
      const messages: Message[] = []
      const newMessages: Array<{ text: string; type: Message['type'] }> = []

      const updated = service.addMessages(messages, newMessages, 1)

      expect(updated).toHaveLength(0)
    })

    test('does not mutate original array', () => {
      const messages: Message[] = [
        { text: 'Original', type: 'info', turn: 1 },
      ]
      const originalLength = messages.length
      const newMessages = [{ text: 'New', type: 'info' as const }]

      service.addMessages(messages, newMessages, 2)

      expect(messages).toHaveLength(originalLength)
    })

    test('all messages get same turn number', () => {
      const messages: Message[] = []
      const newMessages = [
        { text: 'A', type: 'info' as const },
        { text: 'B', type: 'info' as const },
        { text: 'C', type: 'info' as const },
      ]

      const updated = service.addMessages(messages, newMessages, 42)

      expect(updated.every((msg) => msg.turn === 42)).toBe(true)
    })
  })

  describe('immutability', () => {
    test('addMessage returns new array', () => {
      const messages: Message[] = []

      const updated = service.addMessage(messages, 'Test', 'info', 1)

      expect(updated).not.toBe(messages)
    })

    test('addMessages returns new array', () => {
      const messages: Message[] = []
      const newMessages = [{ text: 'Test', type: 'info' as const }]

      const updated = service.addMessages(messages, newMessages, 1)

      expect(updated).not.toBe(messages)
    })

    test('nested calls preserve immutability', () => {
      const messages: Message[] = []

      const updated1 = service.addMessage(messages, 'First', 'info', 1)
      const updated2 = service.addMessage(updated1, 'Second', 'info', 2)
      const updated3 = service.addMessage(updated2, 'Third', 'info', 3)

      expect(messages).toHaveLength(0)
      expect(updated1).toHaveLength(1)
      expect(updated2).toHaveLength(2)
      expect(updated3).toHaveLength(3)
    })
  })
})
