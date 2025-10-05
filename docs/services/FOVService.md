# FOVService

**Location**: `src/services/FOVService/FOVService.ts`
**Dependencies**: None
**Test Coverage**: Shadowcasting algorithm, radius validation, blocking checks, exploration tracking

---

## Purpose

Implements Field of View (FOV) calculation using recursive shadowcasting algorithm. Handles visibility computation and exploration tracking (fog of war).

---

## Public API

### FOV Computation

#### `computeFOV(origin: Position, radius: number, level: Level): Set<string>`
Calculates field of view from origin position.

**Parameters**:
- `origin` - Player/monster position
- `radius` - Vision range (1-3 tiles)
- `level` - Current level

**Returns**: Set of visible position keys (format: `"x,y"`)

**Algorithm**: Recursive shadowcasting (8 octants)

**Example**:
```typescript
const visibleCells = service.computeFOV(
  { x: 10, y: 5 },
  2,  // lantern radius
  level
)
// Returns: Set(['10,5', '11,5', '10,6', ...])
```

---

#### `updateFOVAndExploration(position: Position, lightRadius: number, level: Level): FOVUpdateResult`
Combined FOV computation + exploration update (convenience method).

**Returns**:
```typescript
interface FOVUpdateResult {
  visibleCells: Set<string>
  level: Level  // Updated with new explored tiles
}
```

---

### Visibility Checks

#### `isInFOV(position: Position, visibleCells: Set<string>): boolean`
Checks if position is currently visible.

---

#### `isBlocking(position: Position, level: Level): boolean`
Checks if tile blocks line of sight.

**Blocking Tiles**:
- Walls
- Closed doors
- Locked doors
- Secret doors (undiscovered)
- Out of bounds

**Non-Blocking**:
- Floors
- Open doors
- Broken doors
- Archways
- Secret doors (discovered)

---

### Exploration Tracking

#### `updateExploredTiles(level: Level, visibleCells: Set<string>): Level`
Marks all visible tiles as explored (immutable update).

**Returns**: New Level with updated `explored` array

**Example**:
```typescript
const updatedLevel = service.updateExploredTiles(level, visibleCells)
// level.explored[y][x] = true for all visible cells
```

---

### Utility Methods

#### `posToKey(pos: Position): string` (private)
Converts position to string key for Set storage.

**Format**: `"x,y"` (e.g., `"10,5"`)

---

#### `keyToPos(key: string): Position` (public)
Converts string key back to Position object.

**Example**:
```typescript
const pos = service.keyToPos('10,5')
// Returns: { x: 10, y: 5 }
```

---

## Shadowcasting Algorithm

**Recursive shadowcasting** - industry standard FOV algorithm:

1. **Origin always visible**: Player position always included
2. **8 Octants**: Processes 8 directional sections independently
3. **Recursive Rays**: Casts rays recursively, stopping at blocking tiles
4. **Shadow Casting**: Blocked tiles cast "shadows" that hide tiles behind them
5. **Euclidean Distance**: Uses true distance for radius check

### Octant Transformation

```typescript
Octant 0: { x + dx, y - dy }  // NE
Octant 1: { x + dy, y - dx }  // ENE
Octant 2: { x + dy, y + dx }  // ESE
Octant 3: { x + dx, y + dy }  // SE
Octant 4: { x - dx, y + dy }  // SW
Octant 5: { x - dy, y + dx }  // WSW
Octant 6: { x - dy, y - dx }  // WNW
Octant 7: { x - dx, y - dy }  // NW
```

---

## Light Radii

| Light Source | Radius | Tiles Visible |
|--------------|--------|---------------|
| **Torch** | 1 | ~12 tiles |
| **Lantern** | 2 | ~28 tiles |
| **Artifact** | 3 | ~48 tiles |

---

## Exploration (Fog of War)

**Three Visibility States**:
1. **Visible** (in FOV) - Full color, entities shown
2. **Explored** (seen before) - Dimmed, no entities
3. **Unexplored** - Black, hidden

**Persistence**: Explored tiles stay explored forever (saved in level state)

---

## Usage in Commands

### MoveCommand
```typescript
// After moving player
const lightRadius = this.lightingService.getLightRadius(player.equipment.lightSource)
const fovResult = this.fovService.updateFOVAndExploration(
  newPosition,
  lightRadius,
  level
)

// Update state
return {
  ...state,
  visibleCells: fovResult.visibleCells,
  levels: new Map(state.levels).set(currentLevel, fovResult.level)
}
```

---

## Testing

**Test Files**:
- `shadowcasting.test.ts` - Algorithm correctness
- `radius.test.ts` - Radius calculations
- `blocking.test.ts` - Vision blocking
- `exploration-tracking.test.ts` - Fog of war

**Example Test**:
```typescript
describe('FOVService - Shadowcasting', () => {
  test('walls block vision', () => {
    // Place wall between player and target
    const visible = service.computeFOV(origin, 3, level)
    expect(visible.has('15,5')).toBe(false)  // Behind wall
  })
})
```

---

## Related Services

- **LightingService** - Provides vision radius
- **RenderingService** - Uses FOV for visibility states
- **MonsterAIService** - Monsters use FOV for player detection
