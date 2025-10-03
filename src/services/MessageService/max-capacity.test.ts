import { MessageService } from './MessageService'
import { Message } from '@types/core/core'

describe('MessageService - Max Capacity', () => {
  let service: MessageService

  beforeEach(() => {
    service = new MessageService()
  })

  function createMessages(count: number, startTurn: number = 1): Message[] {
    return Array.from({ length: count }, (_, i) => ({
      text: `Message ${startTurn + i}`,
      type: 'info' as const,
      turn: startTurn + i,
    }))
  }

  describe('100 message limit', () => {
    test('allows exactly 100 messages', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 100; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      expect(messages).toHaveLength(100)
    })

    test('drops oldest message when exceeding 100', () => {
      let messages = createMessages(100)

      messages = service.addMessage(messages, 'Message 101', 'info', 101)

      expect(messages).toHaveLength(100)
      expect(messages[0].text).toBe('Message 2') // First message dropped
      expect(messages[99].text).toBe('Message 101')
    })

    test('drops multiple oldest messages when adding bulk', () => {
      let messages = createMessages(95)

      const newMessages = [
        { text: 'Bulk 1', type: 'info' as const },
        { text: 'Bulk 2', type: 'info' as const },
        { text: 'Bulk 3', type: 'info' as const },
        { text: 'Bulk 4', type: 'info' as const },
        { text: 'Bulk 5', type: 'info' as const },
        { text: 'Bulk 6', type: 'info' as const },
      ]

      messages = service.addMessages(messages, newMessages, 96)

      expect(messages).toHaveLength(100)
      expect(messages[0].text).toBe('Message 2') // First message dropped
      expect(messages[99].text).toBe('Bulk 6')
    })

    test('maintains chronological order after dropping', () => {
      let messages = createMessages(100)

      messages = service.addMessage(messages, 'Message 101', 'info', 101)
      messages = service.addMessage(messages, 'Message 102', 'info', 102)

      expect(messages).toHaveLength(100)
      expect(messages[0].turn).toBe(3)
      expect(messages[99].turn).toBe(102)

      // Verify order is maintained
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].turn).toBeLessThan(messages[i + 1].turn)
      }
    })

    test('handles adding many messages at once', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 150; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      expect(messages).toHaveLength(100)
      expect(messages[0].text).toBe('Message 51')
      expect(messages[99].text).toBe('Message 150')
    })

    test('limit applies after bulk add', () => {
      let messages = createMessages(50)

      const newMessages = Array.from({ length: 60 }, (_, i) => ({
        text: `Bulk ${i + 1}`,
        type: 'info' as const,
      }))

      messages = service.addMessages(messages, newMessages, 51)

      expect(messages).toHaveLength(100)
    })
  })

  describe('capacity edge cases', () => {
    test('handles exactly at capacity', () => {
      const messages = createMessages(100)

      expect(messages).toHaveLength(100)

      const updated = service.addMessage(
        messages,
        'One more',
        'info',
        101
      )

      expect(updated).toHaveLength(100)
    })

    test('handles far exceeding capacity in single addMessages call', () => {
      let messages: Message[] = []

      const newMessages = Array.from({ length: 200 }, (_, i) => ({
        text: `Message ${i + 1}`,
        type: 'info' as const,
      }))

      messages = service.addMessages(messages, newMessages, 1)

      expect(messages).toHaveLength(100)
      expect(messages[0].text).toBe('Message 101')
      expect(messages[99].text).toBe('Message 200')
    })

    test('preserves message types when dropping', () => {
      let messages: Message[] = []

      // Add 100 info messages
      for (let i = 1; i <= 100; i++) {
        messages = service.addMessage(messages, `Info ${i}`, 'info', i)
      }

      // Add combat message (should drop first info)
      messages = service.addMessage(messages, 'Combat!', 'combat', 101)

      expect(messages).toHaveLength(100)
      expect(messages[0].text).toBe('Info 2')
      expect(messages[99].text).toBe('Combat!')
      expect(messages[99].type).toBe('combat')
    })

    test('maintains immutability when dropping', () => {
      const original = createMessages(100)

      const updated = service.addMessage(original, 'New', 'info', 101)

      expect(original).toHaveLength(100)
      expect(original[0].text).toBe('Message 1')
      expect(updated).toHaveLength(100)
      expect(updated[0].text).toBe('Message 2')
    })
  })

  describe('capacity with retrieval', () => {
    test('getRecentMessages works after hitting capacity', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 150; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const recent = service.getRecentMessages(messages, 5)

      expect(recent).toHaveLength(5)
      expect(recent[0].text).toBe('Message 146')
      expect(recent[4].text).toBe('Message 150')
    })

    test('all messages retrievable after hitting capacity', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 150; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const all = service.getRecentMessages(messages, 100)

      expect(all).toHaveLength(100)
      expect(all[0].text).toBe('Message 51')
      expect(all[99].text).toBe('Message 150')
    })
  })

  describe('performance considerations', () => {
    test('handles rapid message additions efficiently', () => {
      let messages: Message[] = []

      const startTime = Date.now()

      for (let i = 1; i <= 500; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const duration = Date.now() - startTime

      expect(messages).toHaveLength(100)
      expect(duration).toBeLessThan(100) // Should complete in <100ms
    })

    test('bulk add is efficient', () => {
      let messages: Message[] = []

      const newMessages = Array.from({ length: 200 }, (_, i) => ({
        text: `Message ${i + 1}`,
        type: 'info' as const,
      }))

      const startTime = Date.now()
      messages = service.addMessages(messages, newMessages, 1)
      const duration = Date.now() - startTime

      expect(messages).toHaveLength(100)
      expect(duration).toBeLessThan(100) // Should complete in <100ms
    })
  })
})
