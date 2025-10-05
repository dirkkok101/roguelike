# MessageService

**Location**: `src/services/MessageService/MessageService.ts`
**Dependencies**: None
**Test Coverage**: Message grouping, importance filtering, history management

---

## Purpose

Manages **combat log and action messages** with smart grouping and importance-based filtering. Handles message history, deduplication, and retrieval for UI display.

---

## Public API

### Message Management

#### `addMessage(messages: Message[], text: string, type: Message['type'], turn: number, importance?: number): Message[]`
Adds a new message with automatic grouping and importance tracking.

**Parameters**:
- `messages`: Current message array
- `text`: Message content
- `type`: Message category (`'info'`, `'combat'`, `'warning'`, `'critical'`)
- `turn`: Turn number when message occurred
- `importance`: Priority level (1-5, default: 3)

**Returns**: New message array with added message

**Grouping Logic**:
- If identical message already exists on same turn → increment count
- Otherwise → add new message

**Example**:
```typescript
const messages = service.addMessage(
  state.messages,
  'You hit the Orc for 8 damage.',
  'combat',
  state.turnCount,
  4  // High importance
)
// Returns: [...messages, { text, type: 'combat', turn, importance: 4 }]

// Same message again on same turn:
const grouped = service.addMessage(
  messages,
  'You hit the Orc for 8 damage.',
  'combat',
  state.turnCount,
  4
)
// Returns: [...messages] with count: 2 on last message
```

---

#### `addMessages(messages: Message[], newMessages: Array<{text, type, importance?}>, turn: number): Message[]`
Adds multiple messages in batch.

**Example**:
```typescript
const messages = service.addMessages(
  state.messages,
  [
    { text: 'You are getting hungry.', type: 'warning', importance: 3 },
    { text: 'Your torch is flickering!', type: 'warning', importance: 4 }
  ],
  state.turnCount
)
```

---

### Message Retrieval

#### `getRecentMessages(messages: Message[], count: number = 8): Message[]`
Retrieves most recent messages with grouping applied.

**Returns**: Last N messages with formatted count indicators

**Example**:
```typescript
const recent = service.getRecentMessages(state.messages, 5)
// Returns: [
//   { text: 'You hit the Bat.', type: 'combat', turn: 10, importance: 3 },
//   { text: 'The Bat hits you. (x3)', type: 'combat', turn: 11, importance: 4, count: 3 }
// ]
```

**Grouping Display**:
- Single occurrence: `"You hit the Bat."`
- Multiple: `"You hit the Bat. (x3)"`

---

#### `getImportantMessages(messages: Message[], minImportance: number = 4): Message[]`
Filters messages by importance threshold.

**Use Case**: Display only critical warnings in separate UI panel

**Example**:
```typescript
const critical = service.getImportantMessages(state.messages, 4)
// Returns only messages with importance >= 4 (warnings, combat, death, etc.)
```

---

#### `clearMessages(): Message[]`
Clears all messages (returns empty array).

**Example**:
```typescript
const cleared = service.clearMessages()
// Returns: []
```

---

## Message Structure

```typescript
interface Message {
  text: string           // Message content
  type: MessageType      // Category for styling
  turn: number           // When message occurred
  importance?: number    // Priority (1-5, default: 3)
  count?: number         // Grouping count (if > 1)
}

type MessageType = 'info' | 'combat' | 'warning' | 'critical'
```

---

## Message Types

| Type | Purpose | Examples | Default Importance |
|------|---------|----------|-------------------|
| **info** | General actions | "You picked up a torch.", "You opened the door." | 2 |
| **combat** | Combat events | "You hit the Orc for 8 damage.", "The Bat misses." | 3 |
| **warning** | Resource warnings | "You are hungry.", "Your torch is low!" | 4 |
| **critical** | Death, victory, major events | "You died!", "You win!", "Amulet stolen!" | 5 |

---

## Importance Levels

| Level | Priority | Use Cases |
|-------|----------|-----------|
| **1** | Very Low | Ambient/flavor text |
| **2** | Low | Minor actions (movement, door opening) |
| **3** | Medium | Standard combat, item pickup |
| **4** | High | Warnings, level-up, hunger, fuel |
| **5** | Critical | Death, victory, amulet retrieval |

**Usage**: Filter UI display by importance threshold
- Message log: Show all (importance >= 1)
- Warning panel: Show high-priority (importance >= 4)

---

## Message Grouping

### Automatic Deduplication

**Same message on same turn** → Increment count:

```typescript
// Turn 10: Player attacks repeatedly
service.addMessage(messages, 'You miss the Bat.', 'combat', 10)
service.addMessage(messages, 'You miss the Bat.', 'combat', 10)
service.addMessage(messages, 'You miss the Bat.', 'combat', 10)

// Result: Single message with count: 3
// Display: "You miss the Bat. (x3)"
```

**Different turns** → Separate messages:

```typescript
service.addMessage(messages, 'You hit the Bat.', 'combat', 10)
service.addMessage(messages, 'You hit the Bat.', 'combat', 11)  // Different turn

// Result: Two separate messages (no grouping)
```

---

## History Management

**Max Messages**: 1000 (configurable via `maxMessages` property)

**Trimming**: When messages exceed 1000, oldest messages are removed:

```typescript
private maxMessages = 1000

if (updated.length > this.maxMessages) {
  return updated.slice(-this.maxMessages)  // Keep last 1000
}
```

**Rationale**: Prevent memory bloat in long games while preserving recent history

---

## Debug Logging

**Auto-logging for important messages**:

```typescript
if (type === 'warning' || type === 'critical' || type === 'combat' || importance >= 4) {
  console.log(`[MSG:${type}] ${text}`)
}
```

**Purpose**: Debug visibility for critical game events

---

## Usage in Commands

### Standard Pattern

```typescript
// In MoveCommand.ts
const messages = this.messageService.addMessage(
  state.messages,
  'You moved north.',
  'info',
  state.turnCount + 1,
  2  // Low importance
)

return { ...state, messages }
```

### Batch Messages

```typescript
// In HungerService (via result object)
const hungerResult = this.hungerService.tickHunger(player)

// hungerResult.messages: Array<{ text, type, importance }>
hungerResult.messages.forEach(msg => {
  finalMessages = this.messageService.addMessage(
    finalMessages,
    msg.text,
    msg.type,
    state.turnCount + 1,
    msg.importance
  )
})
```

---

## Immutability

All methods return **new arrays**, never mutate inputs:

```typescript
addMessage(messages: Message[], text: string, type, turn, importance): Message[] {
  // Check for grouping
  if (lastMessage && lastMessage.text === text && lastMessage.turn === turn) {
    const updatedMessages = [...messages]  // New array
    updatedMessages[updatedMessages.length - 1] = {
      ...lastMessage,  // New object
      count: (lastMessage.count || 1) + 1,
    }
    return updatedMessages
  }

  // Add new message
  return [...messages, { text, type, turn, importance }]  // New array
}
```

---

## Testing

**Test Files**:
- `message-grouping.test.ts` - Deduplication logic
- `importance-filtering.test.ts` - Priority-based retrieval
- `history-management.test.ts` - Trimming, max messages

**Example Test**:
```typescript
describe('MessageService - Grouping', () => {
  test('groups identical messages on same turn', () => {
    let messages: Message[] = []

    messages = service.addMessage(messages, 'You miss.', 'combat', 10, 3)
    messages = service.addMessage(messages, 'You miss.', 'combat', 10, 3)
    messages = service.addMessage(messages, 'You miss.', 'combat', 10, 3)

    expect(messages.length).toBe(1)
    expect(messages[0].count).toBe(3)
  })

  test('does not group messages from different turns', () => {
    let messages: Message[] = []

    messages = service.addMessage(messages, 'You hit.', 'combat', 10, 3)
    messages = service.addMessage(messages, 'You hit.', 'combat', 11, 3)

    expect(messages.length).toBe(2)
    expect(messages[0].count).toBeUndefined()
    expect(messages[1].count).toBeUndefined()
  })
})

describe('MessageService - Importance Filtering', () => {
  test('filters messages by importance threshold', () => {
    let messages: Message[] = []

    messages = service.addMessage(messages, 'You move.', 'info', 10, 2)
    messages = service.addMessage(messages, 'You attack.', 'combat', 10, 3)
    messages = service.addMessage(messages, 'Warning!', 'warning', 10, 4)
    messages = service.addMessage(messages, 'Critical!', 'critical', 10, 5)

    const important = service.getImportantMessages(messages, 4)

    expect(important.length).toBe(2)  // Only warning and critical
    expect(important[0].text).toBe('Warning!')
    expect(important[1].text).toBe('Critical!')
  })
})
```

---

## Related Services

- **All Commands** - Add messages for player actions
- **CombatService** - Combat messages via result objects
- **HungerService** - Hunger warnings via result objects
- **LightingService** - Fuel warnings via result objects
- **NotificationService** - Auto-notifications for items/monsters

---

## Design Rationale

### Why Message Grouping?

**Problem**: Repetitive actions create spam

```
You miss the Bat.
You miss the Bat.
You miss the Bat.
You miss the Bat.
You miss the Bat.
```

**Solution**: Group by turn

```
You miss the Bat. (x5)
```

**Benefits**:
- Cleaner message log
- Easier to read combat flow
- Reduces visual noise

---

### Why Importance Levels?

**Flexible UI Display**:
- Main log: Show all messages
- Warning panel: Show only importance >= 4
- Critical alerts: Show only importance = 5

**Priority-Based Filtering**:
- Player can focus on critical events
- Debug mode can show verbose logs
- UI can adapt to screen size

---

### Why Turn-Based Grouping?

**Turn-based game mechanics** mean actions cluster by turn:

```
Turn 10:
  - You attack Bat (miss)
  - Bat attacks you (hits)
  - You are hungry

Turn 11:
  - You attack Bat (hit)
  - Bat dies
  - You gain 5 XP
```

**Grouping by turn preserves event chronology** while reducing spam

---

## Future Enhancements

- **Message Color Coding**: CSS classes by type/importance
- **Message History Search**: Filter by type, turn range, keyword
- **Message Templates**: Parameterized messages for consistency
- **Message Replay**: Replay messages for debugging/speedruns
