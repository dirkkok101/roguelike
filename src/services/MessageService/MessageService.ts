import { Message } from '@types/core/core'

// ============================================================================
// MESSAGE SERVICE - Combat log and message management
// ============================================================================

export class MessageService {
  private maxMessages = 100

  /**
   * Add a new message
   */
  addMessage(
    messages: Message[],
    text: string,
    type: Message['type'],
    turn: number
  ): Message[] {
    const newMessage: Message = { text, type, turn }
    const updated = [...messages, newMessage]

    // Keep only last N messages
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
    newMessages: Array<{ text: string; type: Message['type'] }>,
    turn: number
  ): Message[] {
    let result = messages
    for (const msg of newMessages) {
      result = this.addMessage(result, msg.text, msg.type, turn)
    }
    return result
  }

  /**
   * Get recent messages (last N)
   */
  getRecentMessages(messages: Message[], count: number = 5): Message[] {
    if (count <= 0) return []
    return messages.slice(-count)
  }

  /**
   * Clear all messages
   */
  clearMessages(): Message[] {
    return []
  }
}
