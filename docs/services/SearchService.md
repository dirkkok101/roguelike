# SearchService

**Location**: `src/services/SearchService/SearchService.ts`
**Dependencies**: RandomService, DoorService
**Test Coverage**: Secret detection, discovery chances

---

## Purpose

Handles searching for hidden secrets: **secret doors** and **traps**. Calculates discovery probability based on player level and uses randomization for uncertainty.

---

## Public API

### Secret Detection

#### `searchForSecrets(player: Player, playerPosition: Position, level: Level): SearchResult`
Searches adjacent tiles for secret doors and traps.

**Search Area**: 4 cardinal directions (up, down, left, right)

**Returns**:
```typescript
interface SearchResult {
  found: boolean
  type: 'door' | 'trap' | null
  position: Position | null
  message: string
  updatedLevel: Level
}
```

**Priority**: Secret doors checked first, then traps

**Example**:
```typescript
const result = service.searchForSecrets(player, { x: 10, y: 5 }, level)
// { found: true, type: 'door', position: {x: 10, y: 4}, message: 'You found a secret door!', updatedLevel: ... }
```

---

## Discovery Mechanics

### Find Chance Formula
```typescript
findChance = 0.5 + (playerLevel * 0.05)
```

**Probability by Level**:
| Player Level | Find Chance |
|--------------|-------------|
| 1 | 55% |
| 2 | 60% |
| 3 | 65% |
| 5 | 75% |
| 10 | 100% |

**Why Level-Based?** Experienced players are better at finding secrets.

---

### Search Process

1. **Get Adjacent Positions** (4 cardinal directions)
2. **Check Each for Secret Door** (undiscovered only)
   - Roll chance based on player level
   - If successful: Reveal door via DoorService
3. **Check Each for Trap** (undiscovered only)
   - Roll chance based on player level
   - If successful: Mark trap as discovered
4. **Return Result** (first found secret or "nothing found")

---

## Secret Doors

**Detection**:
- Must be `DoorState.SECRET`
- Must be `discovered: false`
- Must be adjacent to player (4 directions)

**Revealing**:
- Delegates to `DoorService.revealSecretDoor()`
- Updates door: `discovered = true`
- Updates tile: Shows `+` character
- Returns: "You found a secret door!"

**Example**:
```typescript
// Before search
door = { state: DoorState.SECRET, discovered: false }
tile.char = '#'  // Looks like wall

// After successful search
door = { state: DoorState.SECRET, discovered: true }
tile.char = '+'  // Now visible as closed door
```

---

## Traps

**Detection**:
- Must be in `level.traps` array
- Must be `discovered: false`
- Must be adjacent to player

**Revealing**:
- Marks trap: `discovered = true`
- Returns: "You found a {type} trap!"
- Trap still triggers if stepped on, but player is warned

**Trap Types**:
- Dart trap
- Poison trap
- Pit trap
- Teleport trap

---

## Adjacent Search Pattern

**Searches 4 cardinal directions only** (no diagonals):

```
      UP
       ↑
LEFT ← @ → RIGHT
       ↓
     DOWN
```

**Implementation**:
```typescript
private getAdjacentPositions(position: Position): Position[] {
  return [
    { x: position.x - 1, y: position.y }, // Left
    { x: position.x + 1, y: position.y }, // Right
    { x: position.x, y: position.y - 1 }, // Up
    { x: position.x, y: position.y + 1 }, // Down
  ]
}
```

---

## Search Results

### Found Secret Door
```typescript
{
  found: true,
  type: 'door',
  position: { x: 10, y: 4 },
  message: 'You found a secret door!',
  updatedLevel: levelWithRevealedDoor
}
```

### Found Trap
```typescript
{
  found: true,
  type: 'trap',
  position: { x: 10, y: 6 },
  message: 'You found a dart trap!',
  updatedLevel: levelWithRevealedTrap
}
```

### Nothing Found
```typescript
{
  found: false,
  type: null,
  position: null,
  message: 'You search but find nothing.',
  updatedLevel: level  // Unchanged
}
```

---

## Immutability

All methods return new objects:
- **revealTrap()**: Returns new Level with updated traps array
- **DoorService.revealSecretDoor()**: Returns new Level with updated doors/tiles

**Never mutates** input level.

---

## Usage in Commands

### SearchCommand
```typescript
execute(state: GameState): GameState {
  // Search for secrets
  const result = this.searchService.searchForSecrets(
    state.player,
    state.player.position,
    level
  )

  // Update level
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, result.updatedLevel)

  // Add message
  const messages = this.messageService.addMessage(
    state.messages,
    result.message,
    result.found ? 'success' : 'info',
    state.turnCount
  )

  return this.turnService.incrementTurn({ ...state, levels: updatedLevels, messages })
}
```

---

## Testing

**Test Scenarios**:
- Find secret door at 100% chance
- Miss secret door at 0% chance
- Find trap
- No secrets nearby
- Multiple secrets (door found first)

**Example Test**:
```typescript
describe('SearchService - Secret Doors', () => {
  test('finds secret door with 100% chance', () => {
    mockRandom.setChance(true)  // Always succeeds
    const result = service.searchForSecrets(player, playerPos, level)

    expect(result.found).toBe(true)
    expect(result.type).toBe('door')
    expect(result.message).toBe('You found a secret door!')
  })
})
```

---

## Related Services

- **DoorService** - Reveals secret doors
- **RandomService** - Discovery probability rolls
- **TurnService** - Searching consumes a turn
