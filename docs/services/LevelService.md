# LevelService

**Location**: `src/services/LevelService/LevelService.ts`
**Dependencies**: None
**Test Coverage**: Spawn position logic, boundary checks

---

## Purpose

Handles **level manipulation** and **spawn position logic** for player entering/exiting levels. Provides fallback positioning when preferred position is invalid.

---

## Public API

### Spawn Position

#### `getSpawnPosition(level: Level, preferredPosition?: Position | null): Position`
Determines where player spawns when entering a level.

**Priority**:
1. **Preferred position** (e.g., opposite stairs) - if valid
2. **Center of first room** - fallback if preferred invalid
3. **Level center** - ultimate fallback if no rooms

**Returns**: Valid walkable position for player

---

## Spawn Position Logic

### Use Case 1: Descending Stairs

**Scenario**: Player takes stairs down from Level 1 to Level 2

**Preferred Position**: `level2.stairsUp` (where up stairs are)

**Logic**:
```typescript
const spawnPos = service.getSpawnPosition(level2, level2.stairsUp)
// Returns: stairsUp position (player spawns at up stairs)
```

**Result**: Player appears next to up stairs (can immediately return to Level 1)

---

### Use Case 2: Ascending Stairs

**Scenario**: Player takes stairs up from Level 2 to Level 1

**Preferred Position**: `level1.stairsDown` (where down stairs are)

**Logic**:
```typescript
const spawnPos = service.getSpawnPosition(level1, level1.stairsDown)
// Returns: stairsDown position (player spawns at down stairs)
```

**Result**: Player appears next to down stairs (can immediately return to Level 2)

---

### Use Case 3: First Level Entry

**Scenario**: Player starts new game on Level 1

**Preferred Position**: `null` (no preferred position)

**Logic**:
```typescript
const spawnPos = service.getSpawnPosition(level1, null)
// Returns: center of first room
```

**Result**: Player spawns in starting room

---

### Use Case 4: Invalid Preferred Position

**Scenario**: Preferred position is a wall (shouldn't happen, but safety check)

**Logic**:
```typescript
const invalidPos = { x: 0, y: 0 }  // Wall tile
const spawnPos = service.getSpawnPosition(level, invalidPos)
// Returns: center of first room (fallback)
```

**Result**: Player spawns in safe location instead of wall

---

## Validation

### isValidSpawnPosition

```typescript
private isValidSpawnPosition(level: Level, position: Position): boolean {
  if (!this.isInBounds(position, level)) {
    return false
  }

  const tile = level.tiles[position.y][position.x]
  return tile.walkable
}
```

**Checks**:
1. Position within level bounds
2. Tile is walkable (floor, not wall)

---

### isInBounds

```typescript
private isInBounds(position: Position, level: Level): boolean {
  return (
    position.x >= 0 &&
    position.x < level.width &&
    position.y >= 0 &&
    position.y < level.height
  )
}
```

**Returns**: `true` if position within `[0, width) × [0, height)`

---

## Fallback Strategy

```
┌─────────────────────────────────────┐
│ Preferred position provided?        │
│   ↓ Yes                              │
│ Is position valid (walkable)?       │
│   ↓ Yes                              │
│ ✅ Return preferred position         │
└─────────────────────────────────────┘
           ↓ No (invalid or null)
┌─────────────────────────────────────┐
│ Level has rooms?                    │
│   ↓ Yes                              │
│ ✅ Return center of first room       │
└─────────────────────────────────────┘
           ↓ No
┌─────────────────────────────────────┐
│ ✅ Return level center (width/2, height/2)│
└─────────────────────────────────────┘
```

---

## Helper Methods

### getRoomCenter

```typescript
private getRoomCenter(room: Room): Position {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  }
}
```

**Returns**: Center position of room (rounded down if odd dimensions)

**Example**:
```typescript
// Room: { x: 5, y: 10, width: 6, height: 8 }
const center = getRoomCenter(room)
// Returns: { x: 8, y: 14 }
//   (5 + floor(6/2) = 5 + 3 = 8)
//   (10 + floor(8/2) = 10 + 4 = 14)
```

---

## Usage in Commands

### StairsCommand (Descending)

```typescript
execute(state: GameState): GameState {
  const currentLevel = state.levels.get(state.currentLevel)!
  const nextDepth = state.currentLevel + 1

  // Get or generate next level
  let nextLevel = state.levels.get(nextDepth)
  if (!nextLevel) {
    nextLevel = this.dungeonService.generateLevel(nextDepth, config)
  }

  // Determine spawn position (preferred: stairsUp)
  const spawnPos = this.levelService.getSpawnPosition(nextLevel, nextLevel.stairsUp)

  return {
    ...state,
    currentLevel: nextDepth,
    player: { ...state.player, position: spawnPos },
  }
}
```

---

### StairsCommand (Ascending)

```typescript
execute(state: GameState): GameState {
  const previousDepth = state.currentLevel - 1
  const previousLevel = state.levels.get(previousDepth)!

  // Determine spawn position (preferred: stairsDown)
  const spawnPos = this.levelService.getSpawnPosition(previousLevel, previousLevel.stairsDown)

  return {
    ...state,
    currentLevel: previousDepth,
    player: { ...state.player, position: spawnPos },
  }
}
```

---

## Testing

**Test Files**:
- `spawn-position.test.ts` - Preferred position logic
- `fallback-logic.test.ts` - Room center and level center fallbacks
- `validation.test.ts` - Boundary and walkability checks

**Example Test**:
```typescript
describe('LevelService - Spawn Position', () => {
  test('uses preferred position if valid', () => {
    const preferredPos = { x: 10, y: 5 }
    const level = createTestLevel()
    level.tiles[5][10].walkable = true

    const spawnPos = service.getSpawnPosition(level, preferredPos)

    expect(spawnPos).toEqual(preferredPos)
  })

  test('falls back to room center if preferred invalid', () => {
    const invalidPos = { x: 0, y: 0 }  // Wall
    const level = createTestLevel()
    const firstRoom = level.rooms[0]

    const spawnPos = service.getSpawnPosition(level, invalidPos)

    const expectedCenter = {
      x: firstRoom.x + Math.floor(firstRoom.width / 2),
      y: firstRoom.y + Math.floor(firstRoom.height / 2),
    }
    expect(spawnPos).toEqual(expectedCenter)
  })

  test('falls back to level center if no rooms', () => {
    const level = createEmptyLevel()
    level.rooms = []

    const spawnPos = service.getSpawnPosition(level, null)

    expect(spawnPos).toEqual({
      x: Math.floor(level.width / 2),
      y: Math.floor(level.height / 2),
    })
  })
})
```

---

## Related Services

- **DungeonService** - Generates levels with stairs positions
- **StairsCommand** - Uses spawn position when changing levels

---

## Design Rationale

### Why Preferred Position?

**Stairs Symmetry** - Player spawns next to opposite stairs when changing levels.

**User Experience** - Predictable spawn location (always near stairs).

**Escape Routes** - Player can immediately return to previous level if needed.

---

### Why Room Center Fallback?

**Safety** - Room centers are guaranteed to be walkable floors.

**Consistency** - Player always starts in a room (not corridor).

**Gameplay** - Starting in room gives space to orient before exploring.

---

### Why Level Center Ultimate Fallback?

**Robustness** - Handles edge cases (no rooms, corrupted level).

**Should Never Happen** - DungeonService always generates rooms.

**Defensive Programming** - Better to spawn in wall than crash.

---

## Edge Cases

### Empty Level (No Rooms)

**Should Never Happen**: DungeonService always generates rooms.

**If It Does**: Player spawns at level center (may be wall, but avoids crash).

---

### Preferred Position Out of Bounds

**Example**: `preferredPos = { x: -1, y: 100 }`

**Result**: Fails validation, falls back to room center.

---

### Preferred Position on Wall

**Example**: Stairs accidentally placed on wall (bug in DungeonService).

**Result**: Fails walkability check, falls back to room center.

---

## Future Enhancements

- Random spawn in room (not always center)
- Spawn away from monsters (safety buffer)
- Themed spawn (special starting rooms)
- Multiplayer spawn (multiple spawn points)
