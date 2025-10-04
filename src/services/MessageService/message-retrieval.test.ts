import { MessageService } from './MessageService'
import { Message } from '@game/core/core'

describe('MessageService - Message Retrieval', () => {
  let service: MessageService

  beforeEach(() => {
    service = new MessageService()
  })

  function createMessages(count: number): Message[] {
    return Array.from({ length: count }, (_, i) => ({
      text: `Message ${i + 1}`,
      type: 'info' as const,
      turn: i + 1,
    }))
  }

  describe('getRecentMessages()', () => {
    test('returns last 8 messages by default', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages)

      expect(recent).toHaveLength(8)
      expect(recent[0].text).toBe('Message 3')
      expect(recent[7].text).toBe('Message 10')
    })

    test('returns requested number of messages', () => {
      const messages = createMessages(20)

      const recent = service.getRecentMessages(messages, 10)

      expect(recent).toHaveLength(10)
      expect(recent[0].text).toBe('Message 11')
      expect(recent[9].text).toBe('Message 20')
    })

    test('returns all messages if count exceeds length', () => {
      const messages = createMessages(3)

      const recent = service.getRecentMessages(messages, 10)

      expect(recent).toHaveLength(3)
      expect(recent).toEqual(messages)
    })

    test('returns empty array for empty input', () => {
      const messages: Message[] = []

      const recent = service.getRecentMessages(messages)

      expect(recent).toEqual([])
    })

    test('returns single message when count is 1', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages, 1)

      expect(recent).toHaveLength(1)
      expect(recent[0].text).toBe('Message 10')
    })

    test('handles count of 0', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages, 0)

      expect(recent).toEqual([])
    })

    test('does not mutate original array', () => {
      const messages = createMessages(10)
      const originalLength = messages.length

      service.getRecentMessages(messages, 3)

      expect(messages).toHaveLength(originalLength)
    })

    test('returns messages in order', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages, 5)

      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].turn).toBeLessThan(recent[i + 1].turn)
      }
    })

    test('preserves message properties', () => {
      const messages: Message[] = [
        { text: 'Combat!', type: 'combat', turn: 1 },
        { text: 'Warning!', type: 'warning', turn: 2 },
        { text: 'Info', type: 'info', turn: 3 },
      ]

      const recent = service.getRecentMessages(messages, 2)

      expect(recent[0]).toEqual({ text: 'Warning!', type: 'warning', turn: 2 })
      expect(recent[1]).toEqual({ text: 'Info', type: 'info', turn: 3 })
    })
  })

  describe('clearMessages()', () => {
    test('returns empty array', () => {
      const cleared = service.clearMessages()

      expect(cleared).toEqual([])
    })

    test('returns new empty array each time', () => {
      const cleared1 = service.clearMessages()
      const cleared2 = service.clearMessages()

      expect(cleared1).toEqual([])
      expect(cleared2).toEqual([])
      expect(cleared1).not.toBe(cleared2)
    })
  })

  describe('retrieval integration', () => {
    test('get recent after adding messages', () => {
      let messages: Message[] = []

      messages = service.addMessage(messages, 'Message 1', 'info', 1)
      messages = service.addMessage(messages, 'Message 2', 'info', 2)
      messages = service.addMessage(messages, 'Message 3', 'info', 3)

      const recent = service.getRecentMessages(messages, 2)

      expect(recent).toHaveLength(2)
      expect(recent[0].text).toBe('Message 2')
      expect(recent[1].text).toBe('Message 3')
    })

    test('get recent with mixed types', () => {
      let messages: Message[] = []

      messages = service.addMessage(messages, 'Info', 'info', 1)
      messages = service.addMessage(messages, 'Combat', 'combat', 2)
      messages = service.addMessage(messages, 'Warning', 'warning', 3)

      const recent = service.getRecentMessages(messages, 2)

      expect(recent[0].type).toBe('combat')
      expect(recent[1].type).toBe('warning')
    })

    test('clear does not affect original messages', () => {
      const messages = createMessages(5)

      const cleared = service.clearMessages()

      expect(messages).toHaveLength(5)
      expect(cleared).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    test('negative count returns empty array', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages, -5)

      expect(recent).toEqual([])
    })

    test('very large count returns all messages', () => {
      const messages = createMessages(10)

      const recent = service.getRecentMessages(messages, 1000)

      expect(recent).toHaveLength(10)
    })

    test('handles single message array', () => {
      const messages: Message[] = [{ text: 'Only one', type: 'info', turn: 1 }]

      const recent = service.getRecentMessages(messages)

      expect(recent).toHaveLength(1)
      expect(recent[0]).toEqual(messages[0])
    })
  })
})
