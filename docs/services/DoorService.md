# DoorService

**Location**: `src/services/DoorService/DoorService.ts`
**Dependencies**: None
**Test Coverage**: Door opening, closing, secret door revealing

---

## Purpose

Manages all door operations: opening, closing, revealing secret doors, and validation. Updates both door state and tile properties for FOV integration.

---

## Public API

### Door Operations

#### `openDoor(level: Level, door: Door): Level`
Opens a door (low-level method).

**Effects**:
1. Door state: `CLOSED` → `OPEN` (or `SECRET` → `OPEN`)
2. Tile character: `+` → `'`
3. Tile properties: `walkable = true`, `transparent = true`

**Returns**: New level with updated door and tile

---

#### `openDoorWithResult(level: Level, door: Door): DoorOpenResult`
Opens door with message (high-level method).

**Returns**:
```typescript
interface DoorOpenResult {
  level: Level
  message: string
  doorOpened: boolean
}
```

**Messages**:
- Normal door: "You open the door."
- Secret door: "You open the secret door."

---

#### `closeDoor(level: Level, door: Door): Level`
Closes an open door.

**Effects**:
1. Door state: `OPEN` → `CLOSED`
2. Tile character: `'` → `+`
3. Tile properties: `walkable = true`, `transparent = false`

**Note**: Closed doors block vision but remain walkable (auto-open on move).

---

### Secret Doors

#### `revealSecretDoor(level: Level, door: Door): Level`
Reveals a secret door (makes it visible).

**Effects**:
1. Door: `discovered = true`
2. Tile character: (wall) → `+`
3. Tile properties: `walkable = true`, `transparent = false`

**Use Case**: SearchCommand finds secret doors

---

### Door Queries

#### `getDoorAt(level: Level, position: Position): Door | null`
Finds door at specific position.

**Returns**: Door object or `null` if no door

---

### Validation

#### `canOpenDoor(door: Door | null): { canOpen: boolean; reason?: string }`
Validates if door can be opened.

**Results**:

| Door State | Can Open? | Reason |
|------------|-----------|---------|
| **No door** | No | "There is no door there." |
| **OPEN** | No | "That door is already open." |
| **CLOSED** | Yes | - |
| **LOCKED** | No | "The door is locked. You need a key." |
| **SECRET** (undiscovered) | No | "There is no door there." |
| **SECRET** (discovered) | Yes | - |
| **BROKEN** | No | "That door is already open." |
| **ARCHWAY** | No | "That door is already open." |

---

#### `canCloseDoor(door: Door | null, level: Level, position: Position): { canClose: boolean; reason?: string }`
Validates if door can be closed.

**Checks**:
1. Door exists?
2. Door is open?
3. Monster blocking doorway?

**Results**:

| Situation | Can Close? | Reason |
|-----------|------------|---------|
| **No door** | No | "There is no door there." |
| **OPEN** (clear) | Yes | - |
| **OPEN** (monster blocking) | No | "There is a monster in the way!" |
| **CLOSED** | No | "That door is already closed." |
| **LOCKED** | No | "That door is already closed." |
| **BROKEN** | No | "The door is broken and cannot be closed." |
| **ARCHWAY** | No | "There is no door to close, only an archway." |

---

## Door States

```typescript
enum DoorState {
  OPEN = 'OPEN',          // Can walk through, transparent
  CLOSED = 'CLOSED',      // Blocks vision, auto-opens on move
  LOCKED = 'LOCKED',      // Blocks movement (need key)
  SECRET = 'SECRET',      // Hidden (until discovered)
  BROKEN = 'BROKEN',      // Permanently open (cannot close)
  ARCHWAY = 'ARCHWAY'     // No door, just opening
}
```

---

## Tile Property Updates

**Critical**: Door operations update both door state AND tile properties:

```typescript
openDoor(level: Level, door: Door): Level {
  // 1. Update door state
  const updatedDoor = { ...door, state: DoorState.OPEN }

  // 2. Update tile for FOV
  const tile = level.tiles[door.position.y][door.position.x]
  tile.char = "'"  // Open door character
  tile.walkable = true
  tile.transparent = true  // FOV can see through

  return updatedLevel
}
```

**Why?** FOV system checks `tile.transparent` for line of sight.

---

## Door Blocking Rules

### Vision Blocking
- **CLOSED**: Blocks vision (`transparent = false`)
- **LOCKED**: Blocks vision
- **SECRET** (undiscovered): Blocks vision (appears as wall)
- **OPEN/BROKEN/ARCHWAY**: Transparent (`transparent = true`)

### Movement Blocking
- **LOCKED**: Blocks movement
- **SECRET** (undiscovered): Blocks movement (appears as wall)
- **CLOSED**: Auto-opens when player moves into it
- **OPEN/BROKEN/ARCHWAY**: Walkable

---

## Usage in Commands

### OpenDoorCommand
```typescript
execute(state: GameState): GameState {
  const door = this.doorService.getDoorAt(level, targetPos)

  // Validate
  const validation = this.doorService.canOpenDoor(door)
  if (!validation.canOpen) {
    // Show error message
    return state
  }

  // Open door
  const result = this.doorService.openDoorWithResult(level, door)
  const updatedLevels = new Map(state.levels).set(currentLevel, result.level)

  return { ...state, levels: updatedLevels }
}
```

### CloseDoorCommand
```typescript
execute(state: GameState): GameState {
  const door = this.doorService.getDoorAt(level, targetPos)

  // Validate (checks for blocking monsters)
  const validation = this.doorService.canCloseDoor(door, level, targetPos)
  if (!validation.canClose) {
    return state
  }

  // Close door
  const updatedLevel = this.doorService.closeDoor(level, door)
  return { ...state, levels: new Map(state.levels).set(currentLevel, updatedLevel) }
}
```

### SearchCommand
```typescript
// When secret door found
const updatedLevel = this.doorService.revealSecretDoor(level, secretDoor)
// Door.discovered: false → true
// Tile now shows '+' instead of wall
```

---

## Testing

**Test Files**:
- `door-opening.test.ts` - Opening mechanics
- `door-closing.test.ts` - Closing validation
- `door-revealing.test.ts` - Secret door discovery

**Example Test**:
```typescript
describe('DoorService - Opening', () => {
  test('opens closed door and updates tile', () => {
    const closedDoor = { ...door, state: DoorState.CLOSED }
    const result = service.openDoor(level, closedDoor)

    const updatedDoor = service.getDoorAt(result, door.position)
    expect(updatedDoor.state).toBe(DoorState.OPEN)

    const tile = result.tiles[door.position.y][door.position.x]
    expect(tile.transparent).toBe(true)
  })
})
```

---

## Related Services

- **MovementService** - Checks door blocking in `detectObstacle()`
- **FOVService** - Uses `tile.transparent` for vision calculations
- **SearchService** - Reveals secret doors via `revealSecretDoor()`
