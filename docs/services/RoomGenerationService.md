# RoomGenerationService

**Location**: `src/services/RoomGenerationService/RoomGenerationService.ts`
**Dependencies**: RandomService
**Test Coverage**: Non-overlapping placement, spacing constraints

---

## Purpose

Generates **non-overlapping rectangular rooms** for dungeons. Ensures rooms don't overlap with configurable spacing buffer. Used by DungeonService during level generation.

---

## Public API

### Room Generation

#### `generateRooms(config: RoomGenerationConfig): Room[]`
Generates N random non-overlapping rooms.

**Parameters**:
```typescript
interface RoomGenerationConfig {
  dungeonWidth: number       // Total dungeon width
  dungeonHeight: number      // Total dungeon height
  minRoomCount: number       // Minimum rooms to generate
  maxRoomCount: number       // Maximum rooms to generate
  minRoomSize: number        // Minimum room dimension (width/height)
  maxRoomSize: number        // Maximum room dimension
  minSpacing: number         // Minimum wall spacing between rooms
}
```

**Returns**: Array of rooms (may be less than maxRoomCount if placement fails)

**Example**:
```typescript
const config = {
  dungeonWidth: 80,
  dungeonHeight: 24,
  minRoomCount: 6,
  maxRoomCount: 9,
  minRoomSize: 4,
  maxRoomSize: 10,
  minSpacing: 2,
}

const rooms = service.generateRooms(config)
// Returns: 6-9 rooms, each 4x4 to 10x10, with 2-tile spacing
```

---

## Algorithm

### Generation Process

```typescript
generateRooms(config: RoomGenerationConfig): Room[] {
  const rooms: Room[] = []
  const numRooms = this.random.nextInt(minRoomCount, maxRoomCount)
  const maxAttempts = 100

  for (let i = 0; i < numRooms; i++) {
    let placed = false
    let attempts = 0

    while (!placed && attempts < maxAttempts) {
      // 1. Roll random room dimensions
      const width = this.random.nextInt(minRoomSize, maxRoomSize)
      const height = this.random.nextInt(minRoomSize, maxRoomSize)

      // 2. Check if room can fit in dungeon
      const maxX = dungeonWidth - width - 1
      const maxY = dungeonHeight - height - 1

      if (maxX < 1 || maxY < 1) {
        attempts++
        continue  // Room too big, skip
      }

      // 3. Roll random position
      const x = this.random.nextInt(1, maxX)
      const y = this.random.nextInt(1, maxY)

      const newRoom: Room = { id: i, x, y, width, height }

      // 4. Check if room overlaps with existing rooms
      if (this.canPlaceRoom(newRoom, rooms, minSpacing)) {
        rooms.push(newRoom)
        placed = true
      }

      attempts++
    }
  }

  return rooms
}
```

---

### Placement Rules

**Attempt Limit**: 100 attempts per room

**Boundaries**: Rooms placed at least 1 tile from edge (prevents rooms touching dungeon border)

**Overlap Check**: Each new room checked against all existing rooms

**Spacing Buffer**: Configurable minimum wall spacing between rooms

---

## Overlap Detection

### canPlaceRoom

```typescript
canPlaceRoom(room: Room, existingRooms: Room[], minSpacing: number): boolean {
  for (const existing of existingRooms) {
    if (this.roomsOverlap(room, existing, minSpacing)) {
      return false
    }
  }
  return true
}
```

**Returns**: `true` if room doesn't overlap with any existing room

---

### roomsOverlap

```typescript
roomsOverlap(room1: Room, room2: Room, spacing: number): boolean {
  return (
    room1.x - spacing < room2.x + room2.width + spacing &&
    room1.x + room1.width + spacing > room2.x - spacing &&
    room1.y - spacing < room2.y + room2.height + spacing &&
    room1.y + room1.height + spacing > room2.y - spacing
  )
}
```

**Axis-Aligned Bounding Box (AABB) Collision** with spacing buffer.

**Spacing Parameter**: Adds buffer around each room for minimum wall thickness.

---

## Spacing Behavior

### Without Spacing (spacing = 0)

```
########
#......#
#......#  ← Room 1
########
########
#......#
#......#  ← Room 2 (shares wall with Room 1)
########
```

**Problem**: Shared walls, no corridor space.

---

### With Spacing (spacing = 2)

```
########
#......#
#......#  ← Room 1
########
   ↓ 2-tile spacing buffer
   ↓
########
#......#
#......#  ← Room 2
########
```

**Benefit**: Guaranteed corridor space between rooms.

---

## Room Structure

```typescript
interface Room {
  id: number      // Unique room ID (0, 1, 2, ...)
  x: number       // Top-left X position
  y: number       // Top-left Y position
  width: number   // Room width
  height: number  // Room height
}
```

**Coordinates**: Top-left corner of room

**Dimensions**: Width and height (includes walls in final dungeon)

---

## Failure Handling

**If Placement Fails After 100 Attempts**:
- Room is skipped
- Algorithm continues with next room
- Final room count may be less than `maxRoomCount`

**Typical Failure Causes**:
- Dungeon too small for room count
- Large rooms with tight spacing
- Bad RNG (all random positions overlap)

**Example**:
```typescript
// Config requests 9 rooms
const config = { ..., minRooms: 6, maxRooms: 9 }

// Service may return 7 rooms if placement fails
const rooms = service.generateRooms(config)
console.log(rooms.length)  // 7 (acceptable, >= minRooms)
```

---

## Testing

**Test Files**:
- `non-overlapping.test.ts` - Overlap detection
- `spacing-constraints.test.ts` - Minimum spacing enforcement
- `boundary-constraints.test.ts` - Dungeon edge constraints

**Example Test**:
```typescript
describe('RoomGenerationService - Overlap', () => {
  test('rooms do not overlap with spacing buffer', () => {
    const rooms = service.generateRooms(config)

    // Check all pairs of rooms
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const overlap = service.roomsOverlap(rooms[i], rooms[j], config.minSpacing)
        expect(overlap).toBe(false)
      }
    }
  })

  test('respects dungeon boundaries', () => {
    const rooms = service.generateRooms(config)

    for (const room of rooms) {
      expect(room.x).toBeGreaterThanOrEqual(1)
      expect(room.y).toBeGreaterThanOrEqual(1)
      expect(room.x + room.width).toBeLessThan(config.dungeonWidth)
      expect(room.y + room.height).toBeLessThan(config.dungeonHeight)
    }
  })
})
```

---

## Related Services

- **DungeonService** - Consumes rooms for level generation
- **CorridorGenerationService** - Connects rooms with corridors
- **RandomService** - Randomizes room count, size, and position

---

## Design Rationale

### Why AABB Collision?

**Efficiency** - O(1) per pair check (simple arithmetic comparisons).

**Simplicity** - Rooms are axis-aligned rectangles, AABB is natural fit.

**Alternatives**:
- BSP (Binary Space Partitioning): More complex, guarantees placement
- Poisson Disk Sampling: Uniform distribution, overkill for rooms

---

### Why 100 Attempt Limit?

**Performance** - Prevents infinite loops with impossible configurations.

**Balance** - Usually sufficient for typical dungeons (80×24, 6-9 rooms).

**Graceful Degradation** - Falls back to fewer rooms instead of crashing.

---

### Why Spacing Parameter?

**Corridor Space** - Ensures walls between rooms for corridor placement.

**Visual Clarity** - Prevents dungeon from becoming single open space.

**Gameplay** - Rooms feel distinct, not merged into one area.

---

## Configuration Examples

### Tight Dungeon (Many Small Rooms)
```typescript
const tightConfig = {
  dungeonWidth: 60,
  dungeonHeight: 20,
  minRoomCount: 8,
  maxRoomCount: 12,
  minRoomSize: 3,
  maxRoomSize: 5,
  minSpacing: 1,
}
```

**Result**: Many small rooms, tight corridors

---

### Spacious Dungeon (Few Large Rooms)
```typescript
const spaciousConfig = {
  dungeonWidth: 100,
  dungeonHeight: 30,
  minRoomCount: 4,
  maxRoomCount: 6,
  minRoomSize: 8,
  maxRoomSize: 15,
  minSpacing: 3,
}
```

**Result**: Large rooms with wide corridors

---

## Performance

**Complexity**: O(n² × a) where:
- n = number of rooms
- a = max attempts per room (100)

**Typical Performance**: < 10ms for 9 rooms

**Worst Case**: 100 × 9 × 8 = 7200 overlap checks (still fast)

---

## Future Enhancements

- BSP tree for guaranteed room placement
- Non-rectangular room shapes (L-shaped, circular)
- Room templates (predefined layouts)
- Themed room sizes (treasure vaults = large, closets = small)
