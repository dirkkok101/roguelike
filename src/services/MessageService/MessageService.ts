import { Message } from '@game/core/core'

// ============================================================================
// MESSAGE SERVICE - Combat log and message management
// ============================================================================

export class MessageService {
  private maxMessages = 1000 // Store full history

  /**
   * Add a new message with smart grouping
   */
  addMessage(
    messages: Message[],
    text: string,
    type: Message['type'],
    turn: number,
    importance: number = 3 // Default medium importance
  ): Message[] {
    // Check if last message is identical (for grouping)
    const lastMessage = messages[messages.length - 1]

    if (lastMessage && lastMessage.text === text && lastMessage.turn === turn) {
      // Group identical messages
      const count = (lastMessage.count || 1) + 1
      const updatedMessages = [...messages]
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        count,
      }
      return updatedMessages
    }

    // Add new message
    const newMessage: Message = { text, type, turn, importance }
    const updated = [...messages, newMessage]

    // Trim to max length
    if (updated.length > this.maxMessages) {
      return updated.slice(-this.maxMessages)
    }

    return updated
  }

  /**
   * Add multiple messages
   */
  addMessages(
    messages: Message[],
    newMessages: Array<{ text: string; type: Message['type']; importance?: number }>,
    turn: number
  ): Message[] {
    let result = messages
    for (const msg of newMessages) {
      result = this.addMessage(result, msg.text, msg.type, turn, msg.importance)
    }
    return result
  }

  /**
   * Get recent messages with grouping applied
   */
  getRecentMessages(messages: Message[], count: number = 8): Message[] {
    if (count <= 0) return []
    return messages.slice(-count).map((msg) => {
      if (msg.count && msg.count > 1) {
        return {
          ...msg,
          text: `${msg.text} (x${msg.count})`,
        }
      }
      return msg
    })
  }

  /**
   * Get messages by importance threshold
   */
  getImportantMessages(messages: Message[], minImportance: number = 4): Message[] {
    return messages.filter((msg) => (msg.importance || 3) >= minImportance)
  }

  /**
   * Clear all messages
   */
  clearMessages(): Message[] {
    return []
  }
}
