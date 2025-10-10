# NotificationService

**Location**: `src/services/NotificationService/NotificationService.ts`
**Dependencies**: IdentificationService
**Test Coverage**: Deduplication, proximity detection, resource warnings

---

## Purpose

Generates **contextual auto-notifications** for player awareness. Proactively alerts player about items, monsters, resources, and environment changes without explicit commands.

---

## Public API

### Notification Generation

#### `generateNotifications(state: GameState, previousPosition?: Position): string[]`
Generates contextual notifications based on player position and game state.

**Parameters**:
- `state`: Current game state
- `previousPosition`: Previous player position (for deduplication reset)

**Returns**: Array of notification strings (ready for MessageService)

**Example**:
```typescript
const notifications = service.generateNotifications(state, oldPosition)
// Returns: [
//   "You see a torch here.",
//   "The Orc is nearby!",
//   "⚠ Your pack is full! (26/26 items)"
// ]

// Add to message log
notifications.forEach(msg => {
  messages = messageService.addMessage(messages, msg, 'info', state.turnCount)
})
```

---

## Notification Types

### 1. Item Detection

**Single Item**:
```typescript
// Player steps on tile with torch
"You see a torch here."
"You see an oil flask here."
```

**Multiple Items**:
```typescript
// Player steps on tile with 3+ items
"You see several items here. Press [,] to pick up."
```

**Deduplication**: Only notifies once per item until player moves

---

### 2. Gold Detection

**Gold Pile**:
```typescript
// Player steps on gold
"You see 47 gold pieces here."
"You see 1 gold piece here."  // Singular handling
```

---

### 3. Nearby Doors

**Closed Door Adjacent**:
```typescript
// Closed door in adjacent tile
"There is a closed door nearby."
```

**Note**: Only triggers for CLOSED state, not open/broken/archway

---

### 4. Inventory Status

**Full Inventory Warning**:
```typescript
// Player has 26/26 items
"⚠ Your pack is full! (26/26 items)"
```

**Trigger**: When inventory reaches maximum capacity (26 items)

---

### 5. Monster Proximity

**Adjacent Monster Alert**:
```typescript
// Awake monster in adjacent tile
"The Orc is nearby!"
"The Dragon is nearby!"
```

**Conditions**:
- Monster must be in adjacent tile (4-directional)
- Monster must be awake (`isAwake === true`)

---

### 6. Monster Sighting Messages

#### `checkMonsterSightings(state: GameState): string[]`
Generates "You see..." messages when monsters first enter player's FOV.

**Parameters**:
- `state`: Current game state (with updated visibleCells)

**Returns**: Array of sighting message strings

**Tracking**:
```typescript
interface NotificationContext {
  // ... existing fields
  monstersSeen: Set<string>    // Track first sightings (monster IDs)
  lastLevelSeen?: number       // Reset monstersSeen when level changes
}
```

**Logic**:
1. Check if player changed levels → clear `monstersSeen` set
2. Find monsters in `visibleCells` that haven't been seen yet
3. Generate sighting message based on count (1, 2, or 3+)
4. Mark monsters as seen (add IDs to `monstersSeen`)

**Message Formats**:

**Single Monster**:
```typescript
"You see a Dragon!"
"You see an Orc!"
```

**Two Monsters**:
```typescript
"You see a Bat and an Orc!"
"You see a Dragon and a Hobgoblin!"
```

**Three or More Monsters**:
```typescript
"You see a Snake, a Hobgoblin, and a Troll!"
"You see an Orc, a Bat, and a Dragon!"
```

**Deduplication**:
- Each monster tracked by ID in `monstersSeen` set
- No repeat sighting messages for same monster
- Reset when player changes levels (new dungeon = new context)

**Example**:
```typescript
// First time Dragon enters FOV
const sightings = service.checkMonsterSightings(state)
// Returns: ["You see a Dragon!"]

// Next turn (Dragon still visible)
const sightings2 = service.checkMonsterSightings(state)
// Returns: [] (already seen)

// Player goes to next level
const sightings3 = service.checkMonsterSightings(stateLevel2)
// monstersSeen cleared, new sightings can occur
```

**Integration**:
```typescript
// Called after FOV update in MoveCommand
const sightings = this.notificationService.checkMonsterSightings(stateWithFOV)
sightings.forEach(msg => {
  messages = this.messageService.addMessage(messages, msg, 'info', state.turnCount)
})
```

---

### 7. Wake-Up Messages

#### `checkWakeUpMessages(currentMonsters: Monster[], previousMonsters: Monster[]): string[]`
Generates wake-up messages when sleeping monsters transition to awake state.

**Parameters**:
- `currentMonsters`: Monster array after AI processing
- `previousMonsters`: Monster array before AI processing

**Returns**: Array of wake-up message strings

**Detection**:
```typescript
// Find monsters that just woke up
const wokeUpMonsters = currentMonsters.filter((currentMonster) => {
  const previousMonster = previousStates.get(currentMonster.id)
  if (!previousMonster) return false

  // Detect transition from asleep to awake
  return previousMonster.isAsleep && !currentMonster.isAsleep
})
```

**Message Formats**:

**Single Monster**:
```typescript
"The Dragon wakes up!"
"The Orc wakes up!"
```

**Two Monsters**:
```typescript
"The Bat and Orc wake up!"
"The Dragon and Hobgoblin wake up!"
```

**Three or More Monsters**:
```typescript
"The Snake, Hobgoblin, and Troll wake up!"
"The Orc, Bat, and Dragon wake up!"
```

**Example**:
```typescript
// Before monster AI processing
const previousMonsters = level.monsters.map(m => ({ ...m }))  // Deep copy

// After monster AI processing (monsters woke up from aggro range)
const currentMonsters = updatedLevel.monsters

// Generate wake-up messages
const wakeMessages = service.checkWakeUpMessages(currentMonsters, previousMonsters)
// Returns: ["The Orc and Hobgoblin wake up!"]
```

**Integration**:
```typescript
// In TurnService or MonsterTurnService
const previousMonsters = level.monsters.map(m => ({ ...m }))

// Process monster AI (may wake monsters)
const updatedMonsters = monsterAIService.processMonsterTurns(level.monsters, state)

// Check for wake-ups
const wakeMessages = notificationService.checkWakeUpMessages(updatedMonsters, previousMonsters)

wakeMessages.forEach(msg => {
  messages = messageService.addMessage(messages, msg, 'info', state.turnCount)
})
```

**Use Cases**:
1. **Proximity Wake**: Player moves within aggro range
2. **Running Detection**: Player running increases effective range
3. **Door Slam**: Player slams door, waking connected room monsters
4. **Wandering Spawn**: Wandering monster spawns awake (no wake message needed)

**Note**: Door slam wake has custom message: `"Your loud entrance wakes the monsters!"` (handled in MoveCommand, not this method)

---

### 8. Resource Warnings

**No Food + Hungry**:
```typescript
// Player has 0 food rations and hunger < 500
"⚠ You have no food rations!"
```

**Trigger**: Both conditions must be true (no food AND hungry)

---

## Smart Deduplication

### Context Tracking

**Internal State**:
```typescript
interface NotificationContext {
  lastPosition?: Position
  lastItemSeen?: string
  lastGoldSeen?: number
  recentNotifications: Set<string>  // Deduplication keys
  monstersSeen: Set<string>  // Track first sightings (monster IDs)
  lastLevelSeen?: number  // Track level changes to reset monstersSeen
}
```

**Deduplication Keys**:
- Items: `item-${item.id}`
- Gold: `gold-${amount}`
- Doors: `door-nearby`
- Inventory: `inventory-full`
- Monsters: `monster-${monster.id}`
- Resources: `no-food`

---

### Reset Logic

**When player moves** → Clear deduplication cache:

```typescript
if (previousPosition && !this.positionsEqual(currentPos, previousPosition)) {
  this.context.recentNotifications.clear()
}
```

**Rationale**: New position = new context, allow re-notifications

---

### Persistent Notifications

**Same Position** → No repeat notifications:

```typescript
// Player stands on torch without moving
// First: "You see a torch here."
// Next turn: (no notification - deduplicated)
```

**Player moves away and returns** → Notification repeats:

```typescript
// Player steps on torch
"You see a torch here."

// Player moves north
(deduplication cleared)

// Player moves back south to torch
"You see a torch here."  // Notifies again (new context)
```

---

## Item Name Integration

**Uses IdentificationService for display names**:

```typescript
const displayName = this.identificationService.getDisplayName(item, state)
const notification = `You see ${this.getArticle(displayName)} ${displayName} here.`
```

**Examples**:
- Identified: `"You see a Potion of Healing here."`
- Unidentified: `"You see a blue potion here."`
- Weapon: `"You see a Long Sword here."`

---

## Article Generation

**Automatic a/an selection**:

```typescript
private getArticle(name: string): string {
  const firstChar = name[0].toLowerCase()
  return ['a', 'e', 'i', 'o', 'u'].includes(firstChar) ? 'an' : 'a'
}
```

**Examples**:
- `"a torch"` (consonant)
- `"an oil flask"` (vowel)
- `"a Potion of Healing"` (consonant)
- `"an Amulet of Yendor"` (vowel)

---

## Proximity Detection

### Adjacent Positions

**4-directional adjacency** (no diagonals):

```typescript
const adjacentPositions = [
  { x: pos.x, y: pos.y - 1 },  // North
  { x: pos.x, y: pos.y + 1 },  // South
  { x: pos.x - 1, y: pos.y },  // West
  { x: pos.x + 1, y: pos.y },  // East
]
```

**Used for**:
- Door detection
- Monster proximity alerts

---

## Usage in Commands

### MoveCommand Integration

```typescript
// After movement, fuel tick, FOV update
const notifications = this.notificationService.generateNotifications(
  stateWithUpdatedLevel,
  oldPosition  // Previous position for deduplication reset
)

// Add to message log
let finalMessages = state.messages
notifications.forEach(msg => {
  finalMessages = this.messageService.addMessage(
    finalMessages,
    msg,
    'info',
    state.turnCount + 1
  )
})

return { ...state, messages: finalMessages }
```

**Timing**: Called after FOV/exploration update (so player can "see" new items)

---

## Debug Logging

**Auto-logging for visibility**:

```typescript
console.log(`[NOTIFICATION] ${notification}`)
```

**Purpose**: Debug visibility for notification triggering

---

## Immutability

Service **maintains internal state** for deduplication (exception to pure function pattern):

```typescript
private context: NotificationContext = {
  recentNotifications: new Set(),
}
```

**Rationale**: Deduplication requires state persistence across calls

**Note**: This is **service-level state**, not game state (doesn't affect serialization)

---

## Testing

**Test Files**:
- `item-notifications.test.ts` - Item/gold detection
- `monster-proximity.test.ts` - Adjacent monster alerts
- `monster-sighting.test.ts` - Monster first sighting messages
- `wake-up-messages.test.ts` - Monster wake-up notifications
- `deduplication.test.ts` - Context tracking and reset
- `resource-warnings.test.ts` - Inventory/food warnings

**Example Test**:
```typescript
describe('NotificationService - Item Detection', () => {
  test('notifies about single item at position', () => {
    const torch = createItem('torch', { x: 5, y: 5 })
    const level = createLevel({ items: [torch] })
    const state = { ...baseState, player: { position: { x: 5, y: 5 } }, levels: new Map([[1, level]]) }

    const notifications = service.generateNotifications(state)

    expect(notifications).toContain('You see a torch here.')
  })

  test('notifies about multiple items', () => {
    const items = [
      createItem('torch', { x: 5, y: 5 }),
      createItem('potion', { x: 5, y: 5 }),
      createItem('scroll', { x: 5, y: 5 }),
    ]
    const level = createLevel({ items })
    const state = { ...baseState, player: { position: { x: 5, y: 5 } }, levels: new Map([[1, level]]) }

    const notifications = service.generateNotifications(state)

    expect(notifications).toContain('You see several items here. Press [,] to pick up.')
  })
})

describe('NotificationService - Deduplication', () => {
  test('does not repeat notification for same item at same position', () => {
    const torch = createItem('torch', { x: 5, y: 5 })
    const level = createLevel({ items: [torch] })
    const state = { ...baseState, player: { position: { x: 5, y: 5 } }, levels: new Map([[1, level]]) }

    const first = service.generateNotifications(state)
    const second = service.generateNotifications(state)  // Same position

    expect(first.length).toBe(1)
    expect(second.length).toBe(0)  // Deduplicated
  })

  test('resets deduplication when player moves', () => {
    const torch = createItem('torch', { x: 5, y: 5 })
    const level = createLevel({ items: [torch] })
    const state1 = { ...baseState, player: { position: { x: 5, y: 5 } }, levels: new Map([[1, level]]) }

    const first = service.generateNotifications(state1)

    // Player moves away and back
    const state2 = { ...state1, player: { position: { x: 5, y: 6 } } }
    service.generateNotifications(state2, { x: 5, y: 5 })  // Clears cache

    const state3 = { ...state1, player: { position: { x: 5, y: 5 } } }
    const second = service.generateNotifications(state3, { x: 5, y: 6 })  // New position context

    expect(first.length).toBe(1)
    expect(second.length).toBe(1)  // Notifies again
  })
})
```

---

## Related Services

- **IdentificationService** - Item display names
- **MessageService** - Adds notifications to message log
- **MoveCommand** - Calls service after movement

---

## Design Rationale

### Why Auto-Notifications?

**Player Awareness**:
- Original Rogue displayed item/monster info automatically
- Reduces tedium (no manual "look" command spam)
- Helps new players learn game mechanics

**Quality of Life**:
- Alerts about full inventory before picking up items
- Warns about nearby monsters before walking into danger
- Reminds about resource shortages

---

### Why Deduplication?

**Problem**: Repetitive notifications create spam

```
You see a torch here.
You see a torch here.
You see a torch here.
(Player standing still, notifications repeating)
```

**Solution**: Context-based deduplication

```
You see a torch here.
(No more notifications until player moves away and returns)
```

---

### Why Position-Based Reset?

**Context Change = New Information**:
- Player leaves tile → deduplication clears
- Player returns → notification repeats (new context)

**Prevents Missing Information**:
- Player forgets about item after exploring
- Returns to tile → gets reminder

---

## Future Enhancements

- **Configurable Verbosity**: Player can toggle auto-notifications on/off
- **Smart Filtering**: Only notify about valuable items (configurable threshold)
- **Monster Threat Level**: Color-code monster alerts by danger (green/yellow/red)
- **Item Rarity Alerts**: Special notifications for rare/legendary items
- **Directional Hints**: "The Orc is to the north!" (instead of "nearby")
