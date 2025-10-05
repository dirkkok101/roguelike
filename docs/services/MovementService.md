# MovementService

**Location**: `src/services/MovementService/MovementService.ts`
**Dependencies**: None
**Test Coverage**: Position calculation, bounds validation, entity detection

---

## Purpose

Handles position validation, collision detection, and movement logic. Provides utilities for checking walkability, detecting obstacles (monsters, doors, walls), and moving entities.

---

## Public API

### Position Validation

#### `isWalkable(position: Position, level: Level): boolean`
Checks if a position is walkable (not wall, within bounds).

**Parameters:**
- `position` - Target position
- `level` - Current level

**Returns**: `true` if walkable, `false` otherwise

**Example:**
```typescript
const walkable = service.isWalkable({ x: 10, y: 5 }, level)
// true if floor tile, false if wall
```

---

#### `isInBounds(position: Position, level: Level): boolean`
Checks if position is within level boundaries.

**Parameters:**
- `position` - Position to check
- `level` - Current level

**Returns**: `true` if within `0 ≤ x < width` and `0 ≤ y < height`

---

### Obstacle Detection

#### `detectObstacle(position: Position, level: Level): ObstacleResult`
Detects what obstacle (if any) exists at a position.

**Returns**: `ObstacleResult`
```typescript
interface ObstacleResult {
  type: 'none' | 'monster' | 'door' | 'wall'
  data?: Monster | Door
}
```

**Detection Order:**
1. **Monster** - Returns if monster at position
2. **Door** - Returns if blocking door (closed/locked/secret)
3. **Wall** - Returns if not walkable
4. **None** - Returns if clear

**Example:**
```typescript
const obstacle = service.detectObstacle({ x: 10, y: 5 }, level)
if (obstacle.type === 'monster') {
  // Attack the monster
} else if (obstacle.type === 'door') {
  // Open the door
}
```

---

### Entity Queries

#### `getMonsterAt(position: Position, level: Level): Monster | undefined`
Finds monster at exact position.

**Returns**: Monster instance or `undefined`

---

#### `hasItem(position: Position, level: Level): boolean`
Checks if any item exists at position.

**Returns**: `true` if item present

---

#### `hasGold(position: Position, level: Level): boolean`
Checks if gold exists at position.

**Returns**: `true` if gold present

---

### Movement

#### `movePlayer(player: Player, newPosition: Position): Player`
Moves player to new position (immutable update).

**Parameters:**
- `player` - Current player state
- `newPosition` - Target position

**Returns**: New `Player` object with updated position

**Example:**
```typescript
const movedPlayer = service.movePlayer(player, { x: 11, y: 5 })
// Returns new player object: { ...player, position: { x: 11, y: 5 } }
```

---

#### `applyDirection(position: Position, direction: 'up' | 'down' | 'left' | 'right'): Position`
Calculates new position from direction vector.

**Direction Mapping:**
- `'up'` → `{ x, y: y - 1 }`
- `'down'` → `{ x, y: y + 1 }`
- `'left'` → `{ x: x - 1, y }`
- `'right'` → `{ x: x + 1, y }`

**Example:**
```typescript
const newPos = service.applyDirection({ x: 10, y: 5 }, 'up')
// Returns: { x: 10, y: 4 }
```

---

## Result Types

### `ObstacleResult`
```typescript
interface ObstacleResult {
  type: 'none' | 'monster' | 'door' | 'wall'
  data?: Monster | Door  // Present if type is 'monster' or 'door'
}
```

---

## Immutability Pattern

All methods follow immutability:
- **Read-only operations**: `isWalkable`, `detectObstacle`, `getMonsterAt` don't modify inputs
- **Update operations**: `movePlayer` returns new object, never mutates input

```typescript
// ❌ Bad (mutation)
function movePlayer(player: Player, pos: Position): Player {
  player.position = pos  // MUTATION!
  return player
}

// ✅ Good (immutable)
function movePlayer(player: Player, pos: Position): Player {
  return { ...player, position: pos }
}
```

---

## Door Blocking Logic

**Blocking Doors** (movement stopped):
- `CLOSED` - Must be opened first
- `LOCKED` - Cannot pass without key
- `SECRET` (undiscovered) - Appears as wall

**Non-Blocking Doors** (movement allowed):
- `OPEN` - Can walk through
- `BROKEN` - Permanently open
- `ARCHWAY` - No door, just opening
- `SECRET` (discovered) - Can be opened/passed

---

## Usage in Commands

### MoveCommand
```typescript
execute(state: GameState): GameState {
  // 1. Calculate target position
  const newPosition = this.movementService.applyDirection(
    state.player.position,
    this.direction
  )

  // 2. Detect obstacle
  const obstacle = this.movementService.detectObstacle(newPosition, level)

  // 3. Route based on obstacle type
  if (obstacle.type === 'monster') {
    return attackCommand.execute(state)  // Bump-to-attack
  } else if (obstacle.type === 'wall') {
    return state  // Blocked
  } else {
    // Move player
    const movedPlayer = this.movementService.movePlayer(player, newPosition)
    return { ...state, player: movedPlayer }
  }
}
```

---

## Testing

**Test Files:**
- `position-calculation.test.ts` - Direction calculations
- `bounds-validation.test.ts` - Boundary checks
- `entity-detection.test.ts` - Obstacle detection

**Example Test:**
```typescript
describe('MovementService - Position Calculation', () => {
  test('applyDirection moves up correctly', () => {
    const result = service.applyDirection({ x: 10, y: 5 }, 'up')
    expect(result).toEqual({ x: 10, y: 4 })
  })
})
```

---

## Related Services

- **DoorService** - Door state management (used for blocking check)
- **FOVService** - Uses position validation for visibility checks
- **CombatService** - Uses `getMonsterAt` for attack resolution

---

**Architecture**: Pure service, no dependencies, 100% stateless. All methods are pure functions.
