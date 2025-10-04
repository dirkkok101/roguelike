import { MessageService } from './MessageService'
import { Message } from '@game/core/core'

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

  describe('1000 message limit', () => {
    test('allows exactly 1000 messages', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 1000; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      expect(messages).toHaveLength(1000)
    })

    test('drops oldest message when exceeding 1000', () => {
      let messages = createMessages(1000)

      messages = service.addMessage(messages, 'Message 1001', 'info', 1001)

      expect(messages).toHaveLength(1000)
      expect(messages[0].text).toBe('Message 2') // First message dropped
      expect(messages[999].text).toBe('Message 1001')
    })

    test('drops multiple oldest messages when adding bulk', () => {
      let messages = createMessages(995)

      const newMessages = [
        { text: 'Bulk 1', type: 'info' as const },
        { text: 'Bulk 2', type: 'info' as const },
        { text: 'Bulk 3', type: 'info' as const },
        { text: 'Bulk 4', type: 'info' as const },
        { text: 'Bulk 5', type: 'info' as const },
        { text: 'Bulk 6', type: 'info' as const },
      ]

      messages = service.addMessages(messages, newMessages, 996)

      expect(messages).toHaveLength(1000)
      expect(messages[0].text).toBe('Message 2') // First message dropped
      expect(messages[999].text).toBe('Bulk 6')
    })

    test('maintains chronological order after dropping', () => {
      let messages = createMessages(1000)

      messages = service.addMessage(messages, 'Message 1001', 'info', 1001)
      messages = service.addMessage(messages, 'Message 1002', 'info', 1002)

      expect(messages).toHaveLength(1000)
      expect(messages[0].turn).toBe(3)
      expect(messages[999].turn).toBe(1002)

      // Verify order is maintained
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].turn).toBeLessThan(messages[i + 1].turn)
      }
    })

    test('handles adding many messages at once', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 1500; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      expect(messages).toHaveLength(1000)
      expect(messages[0].text).toBe('Message 501')
      expect(messages[999].text).toBe('Message 1500')
    })

    test('limit applies after bulk add', () => {
      let messages = createMessages(500)

      const newMessages = Array.from({ length: 600 }, (_, i) => ({
        text: `Bulk ${i + 1}`,
        type: 'info' as const,
      }))

      messages = service.addMessages(messages, newMessages, 501)

      expect(messages).toHaveLength(1000)
    })
  })

  describe('capacity edge cases', () => {
    test('handles exactly at capacity', () => {
      const messages = createMessages(1000)

      expect(messages).toHaveLength(1000)

      const updated = service.addMessage(
        messages,
        'One more',
        'info',
        1001
      )

      expect(updated).toHaveLength(1000)
    })

    test('handles far exceeding capacity in single addMessages call', () => {
      let messages: Message[] = []

      const newMessages = Array.from({ length: 2000 }, (_, i) => ({
        text: `Message ${i + 1}`,
        type: 'info' as const,
      }))

      messages = service.addMessages(messages, newMessages, 1)

      expect(messages).toHaveLength(1000)
      expect(messages[0].text).toBe('Message 1001')
      expect(messages[999].text).toBe('Message 2000')
    })

    test('preserves message types when dropping', () => {
      let messages: Message[] = []

      // Add 1000 info messages
      for (let i = 1; i <= 1000; i++) {
        messages = service.addMessage(messages, `Info ${i}`, 'info', i)
      }

      // Add combat message (should drop first info)
      messages = service.addMessage(messages, 'Combat!', 'combat', 1001)

      expect(messages).toHaveLength(1000)
      expect(messages[0].text).toBe('Info 2')
      expect(messages[999].text).toBe('Combat!')
      expect(messages[999].type).toBe('combat')
    })

    test('maintains immutability when dropping', () => {
      const original = createMessages(1000)

      const updated = service.addMessage(original, 'New', 'info', 1001)

      expect(original).toHaveLength(1000)
      expect(original[0].text).toBe('Message 1')
      expect(updated).toHaveLength(1000)
      expect(updated[0].text).toBe('Message 2')
    })
  })

  describe('capacity with retrieval', () => {
    test('getRecentMessages works after hitting capacity', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 1500; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const recent = service.getRecentMessages(messages, 5)

      expect(recent).toHaveLength(5)
      expect(recent[0].text).toBe('Message 1496')
      expect(recent[4].text).toBe('Message 1500')
    })

    test('all messages retrievable after hitting capacity', () => {
      let messages: Message[] = []

      for (let i = 1; i <= 1500; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const all = service.getRecentMessages(messages, 1000)

      expect(all).toHaveLength(1000)
      expect(all[0].text).toBe('Message 501')
      expect(all[999].text).toBe('Message 1500')
    })
  })

  describe('performance considerations', () => {
    test('handles rapid message additions efficiently', () => {
      let messages: Message[] = []

      const startTime = Date.now()

      for (let i = 1; i <= 5000; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      const duration = Date.now() - startTime

      expect(messages).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should complete in <100ms
    })

    test('bulk add is efficient', () => {
      let messages: Message[] = []

      const newMessages = Array.from({ length: 2000 }, (_, i) => ({
        text: `Message ${i + 1}`,
        type: 'info' as const,
      }))

      const startTime = Date.now()
      messages = service.addMessages(messages, newMessages, 1)
      const duration = Date.now() - startTime

      expect(messages).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should complete in <100ms
    })
  })
})
