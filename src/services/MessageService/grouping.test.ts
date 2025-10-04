import { MessageService } from './MessageService'
import { Message } from '@game/core/core'

// ============================================================================
// MESSAGE SERVICE TESTS - Grouping and Importance
// ============================================================================

describe('MessageService - Grouping and Importance', () => {
  let service: MessageService

  beforeEach(() => {
    service = new MessageService()
  })

  describe('Message Grouping', () => {
    test('groups identical messages on same turn', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)

      // Assert
      expect(messages.length).toBe(1)
      expect(messages[0].count).toBe(3)
    })

    test('does not group different messages', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You miss the Orc.', 'combat', 1)

      // Assert
      expect(messages.length).toBe(2)
      expect(messages[0].count).toBeUndefined()
      expect(messages[1].count).toBeUndefined()
    })

    test('does not group messages from different turns', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 2)

      // Assert
      expect(messages.length).toBe(2)
      expect(messages[0].count).toBeUndefined()
      expect(messages[1].count).toBeUndefined()
    })

    test('displays grouped messages with count', () => {
      // Arrange
      let messages: Message[] = []
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)
      messages = service.addMessage(messages, 'You hit the Orc.', 'combat', 1)

      // Act
      const recent = service.getRecentMessages(messages, 5)

      // Assert
      expect(recent[0].text).toBe('You hit the Orc. (x3)')
    })
  })

  describe('Importance Levels', () => {
    test('adds message with default importance', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      messages = service.addMessage(messages, 'Test message', 'info', 1)

      // Assert
      expect(messages[0].importance).toBe(3) // Default medium
    })

    test('adds message with custom importance', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      messages = service.addMessage(messages, 'Critical alert!', 'critical', 1, 5)

      // Assert
      expect(messages[0].importance).toBe(5)
    })

    test('filters messages by importance threshold', () => {
      // Arrange
      let messages: Message[] = []
      messages = service.addMessage(messages, 'Low priority', 'info', 1, 2)
      messages = service.addMessage(messages, 'Medium priority', 'info', 1, 3)
      messages = service.addMessage(messages, 'High priority', 'warning', 1, 4)
      messages = service.addMessage(messages, 'Critical!', 'critical', 1, 5)

      // Act
      const important = service.getImportantMessages(messages, 4)

      // Assert
      expect(important.length).toBe(2)
      expect(important[0].text).toBe('High priority')
      expect(important[1].text).toBe('Critical!')
    })
  })

  describe('getRecentMessages', () => {
    test('returns last N messages with default count 8', () => {
      // Arrange
      let messages: Message[] = []
      for (let i = 0; i < 10; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      // Act
      const recent = service.getRecentMessages(messages)

      // Assert
      expect(recent.length).toBe(8)
      expect(recent[0].text).toBe('Message 2')
      expect(recent[7].text).toBe('Message 9')
    })

    test('returns last N messages with custom count', () => {
      // Arrange
      let messages: Message[] = []
      for (let i = 0; i < 10; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      // Act
      const recent = service.getRecentMessages(messages, 5)

      // Assert
      expect(recent.length).toBe(5)
      expect(recent[0].text).toBe('Message 5')
      expect(recent[4].text).toBe('Message 9')
    })

    test('returns empty array for count <= 0', () => {
      // Arrange
      let messages: Message[] = []
      messages = service.addMessage(messages, 'Test', 'info', 1)

      // Act
      const recent = service.getRecentMessages(messages, 0)

      // Assert
      expect(recent).toEqual([])
    })
  })

  describe('Message History Limit', () => {
    test('stores up to 1000 messages', () => {
      // Arrange
      let messages: Message[] = []

      // Act
      for (let i = 0; i < 1100; i++) {
        messages = service.addMessage(messages, `Message ${i}`, 'info', i)
      }

      // Assert
      expect(messages.length).toBe(1000)
      expect(messages[0].text).toBe('Message 100') // First 100 removed
      expect(messages[999].text).toBe('Message 1099')
    })
  })
})
