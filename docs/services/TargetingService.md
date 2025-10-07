# TargetingService

**Location**: `src/services/TargetingService/TargetingService.ts`
**Dependencies**: FOVService, MovementService
**Test Coverage**: Monster targeting (18 tests), direction targeting (27 tests), integration (10 tests), end-to-end (9 tests)

---

## Purpose

Handles all targeting logic for ranged interactions (wands, bows, spells, thrown items). Provides target selection, validation, and ray casting functionality with clean separation from UI and command layers.

**Design Philosophy**:
- ALL targeting logic in this service (no logic in UI/commands)
- Deterministic: Same inputs → same outputs
- Immutable: Returns new objects, never mutates
- Reusable: Designed for wands, but architected for future bows/spells

---

## Public API

### Main Interface

#### `selectTarget(request: TargetingRequest, state: GameState): TargetingResult`
Main targeting entry point for automated target selection (AI, auto-targeting).

**Parameters**:
- `request` - Targeting parameters (mode, range, LOS requirements)
- `state` - Current game state

**Returns**: `TargetingResult` with success status and target ID

**Example**:
```typescript
const result = targetingService.selectTarget(
  {
    mode: TargetingMode.MONSTER,
    maxRange: 7,
    requiresLOS: true
  },
  state
)

if (result.success) {
  // Use result.targetMonsterId
}
```

**Supported Modes**:
- `MONSTER`: Auto-selects nearest valid monster
- `DIRECTION`: Requires manual input (returns error)
- `POSITION`: Requires manual input (returns error)

---

### Monster Targeting

#### `getVisibleMonsters(player: Player, level: Level, fovCells: Set<string>): Monster[]`
Returns all monsters in FOV, sorted by distance (closest first).

**Distance Metric**: Manhattan distance (L1 norm) for classic roguelike feel

**Example**:
```typescript
const monsters = targetingService.getVisibleMonsters(
  state.player,
  currentLevel,
  state.visibleCells
)
// Returns: [nearOrc, midKobold, farTroll] (sorted by distance)
```

---

#### `getNextTarget(currentTargetId: string | undefined, visibleMonsters: Monster[], direction: 'next' | 'prev' | 'nearest'): Monster | null`
Cycles through visible monsters or selects nearest.

**Parameters**:
- `currentTargetId` - Currently selected target (undefined for none)
- `visibleMonsters` - Array of visible monsters (from getVisibleMonsters)
- `direction` - Cycle direction or 'nearest' for closest

**Behavior**:
- `'next'`: Cycle to next monster (wraps to start)
- `'prev'`: Cycle to previous monster (wraps to end)
- `'nearest'`: Select closest monster

**Example**:
```typescript
// Tab - cycle to next target
const nextMonster = targetingService.getNextTarget(
  currentTargetId,
  visibleMonsters,
  'next'
)

// * - select nearest target
const nearestMonster = targetingService.getNextTarget(
  undefined,
  visibleMonsters,
  'nearest'
)
```

---

#### `isValidMonsterTarget(monster: Monster, player: Player, level: Level, maxRange: number, requiresLOS: boolean, fovCells: Set<string>): TargetValidation`
Validates if monster is a valid target.

**Checks**:
1. Monster in FOV (if requiresLOS is true)
2. Distance ≤ maxRange (Manhattan distance)
3. Custom validation (if validation function provided)

**Returns**:
```typescript
interface TargetValidation {
  isValid: boolean
  reason?: string  // Error message if invalid
}
```

**Example**:
```typescript
const validation = targetingService.isValidMonsterTarget(
  monster,
  player,
  level,
  7,    // maxRange
  true, // requiresLOS
  state.visibleCells
)

if (!validation.valid) {
  console.log(validation.reason) // "That monster is too far away. (Range: 7)"
}
```

---

### Direction Targeting (Ray Casting)

#### `getDirectionVector(direction: Direction): { dx: number; dy: number } | null`
Converts direction enum to vector offset.

**Supported Directions**: N, S, E, W, NE, NW, SE, SW

**Example**:
```typescript
const vector = targetingService.getDirectionVector('NE')
// Returns: { dx: 1, dy: -1 }
```

---

#### `castRay(origin: Position, direction: Direction, maxRange: number, level: Level): Position[]`
Casts ray from origin in direction using Bresenham's line algorithm.

**Parameters**:
- `origin` - Starting position
- `direction` - Ray direction
- `maxRange` - Maximum ray length (tiles)
- `level` - Current level (for wall collision)

**Returns**: Array of positions along ray (stops at walls)

**Algorithm**: Bresenham's line algorithm

**Example**:
```typescript
const ray = targetingService.castRay(
  { x: 5, y: 5 },
  'E',   // Fire east
  8,     // 8 tile range
  level
)
// Returns: [{x:6,y:5}, {x:7,y:5}, {x:8,y:5}, ...] (until wall/range)
```

---

#### `findFirstMonsterInRay(rayPath: Position[], level: Level): Monster | null`
Finds first monster intersecting ray path.

**Example**:
```typescript
const ray = targetingService.castRay(origin, 'E', 8, level)
const target = targetingService.findFirstMonsterInRay(ray, level)

if (target) {
  // Hit monster!
}
```

---

## Usage Patterns

### Pattern 1: Wand Targeting (UI Flow)

```typescript
// 1. User presses 'z' (zap wand)
// 2. InputHandler shows wand selection modal
// 3. User selects wand
// 4. Show targeting modal with TargetingService

const wandRange = selectedWand.range || 5
const visibleMonsters = targetingService.getVisibleMonsters(
  state.player,
  currentLevel,
  state.visibleCells
)

// Auto-select nearest valid target
let currentTarget = targetingService.getNextTarget(
  undefined,
  visibleMonsters,
  'nearest'
)

// User presses Tab to cycle
currentTarget = targetingService.getNextTarget(
  currentTarget.id,
  visibleMonsters,
  'next'
)

// Validate final selection
const validation = targetingService.isValidMonsterTarget(
  currentTarget,
  state.player,
  currentLevel,
  wandRange,
  true, // requiresLOS
  state.visibleCells
)

if (validation.valid) {
  // Create ZapWandCommand with currentTarget.id
}
```

---

### Pattern 2: Auto-Targeting (AI)

```typescript
// AI monster uses wand on player
const result = targetingService.selectTarget(
  {
    mode: TargetingMode.MONSTER,
    maxRange: wand.range,
    requiresLOS: true
  },
  state
)

if (result.success) {
  // Execute wand effect on result.targetMonsterId
}
```

---

### Pattern 3: Lightning Wand (Ray Casting)

```typescript
// Future implementation for beam wands
const ray = targetingService.castRay(
  player.position,
  direction,  // User-selected direction
  8,          // Lightning wand range
  level
)

const target = targetingService.findFirstMonsterInRay(ray, level)

if (target) {
  // Apply damage to first monster in beam
}
```

---

## Range Validation

The TargetingService uses **Manhattan distance** (L1 norm) for range checks:

```typescript
distance = |playerX - monsterX| + |playerY - monsterY|
```

**Example**:
- Player at (5, 5)
- Monster at (8, 7)
- Distance = |5-8| + |5-7| = 3 + 2 = **5 tiles**

**Why Manhattan?**
- Classic roguelike standard
- Matches 4-directional movement
- Simple, fast calculation
- Intuitive for tile-based games

---

## Integration with Commands

**ZapWandCommand Flow**:

1. **UI Layer**: TargetingModal shows targets, handles cycling
2. **Command Layer**: ZapWandCommand validates target
3. **Service Layer**: TargetingService provides validation logic

**Validation Order** (defense in depth):
1. **UI**: Pre-validation (visual feedback)
2. **Command**: Full validation (prevent invalid actions)
3. **Service**: Logic encapsulation (reusable validation)

**Example Command Validation**:
```typescript
// ZapWandCommand.execute()

// 1. Validate target exists
const monster = level.monsters.find(m => m.id === targetId)
if (!monster) return error('Target no longer exists.')

// 2. Validate in FOV
const key = `${monster.position.x},${monster.position.y}`
if (!state.visibleCells.has(key)) return error('Target no longer visible.')

// 3. Validate range
const dist = Math.abs(player.position.x - monster.position.x) +
             Math.abs(player.position.y - monster.position.y)
if (dist > wand.range) return error(`Target out of range. (Range: ${wand.range})`)

// 4. Execute wand effect
```

---

## Design Decisions

### Why separate from FOVService?

**FOVService**: "What can the player see?"
**TargetingService**: "What can the player target?"

While related, these are distinct concerns:
- FOV is visual/lighting based
- Targeting adds range limits, validation, interaction logic
- Future: Targeting might allow out-of-FOV targets (telepathy, area spells)

### Why not in WandService?

**Separation of Concerns**:
- TargetingService: Generic targeting (wands, bows, spells)
- WandService: Wand-specific effects (damage, status, teleport)

This allows future ranged weapons to reuse targeting logic.

### Why Manhattan distance?

**Alternatives Considered**:
- Euclidean: `sqrt((x2-x1)² + (y2-y1)²)` - More realistic, but expensive
- Chebyshev: `max(|x2-x1|, |y2-y1|)` - Allows diagonal, but unrealistic

**Manhattan Benefits**:
- Fast (no sqrt, no max)
- Classic roguelike standard (Rogue, NetHack, DCSS)
- Matches 4-directional movement model
- Intuitive for players

---

## Future Extensions

### Planned Features (Not Yet Implemented):

1. **Position Targeting** (scrolls, area spells):
   ```typescript
   selectTarget({
     mode: TargetingMode.POSITION,
     maxRange: 10,
     requiresLOS: false,
     validationFn: (pos) => level.tiles[pos.y][pos.x].walkable
   }, state)
   ```

2. **Area Effect Validation** (fireball radius):
   ```typescript
   getAffectedPositions(center: Position, radius: number): Position[]
   ```

3. **Beam Targeting** (already implemented via ray casting):
   - Lightning wands (hit all in line)
   - Confusion beams (affect all in ray)

4. **Smart Targeting Filters**:
   - Exclude friendly monsters
   - Prioritize wounded targets
   - Target by monster type

---

## Related Documentation

- **[FOVService](./FOVService.md)**: Visibility computation
- **[WandService](./WandService.md)**: Wand effects and mechanics
- **[ZapWandCommand](../commands/ZapWandCommand.md)**: Wand usage command
- **[TargetingModal](../ui/TargetingModal.md)**: UI component for target selection
- **[Targeting System Plan](../../docs/plans/targeting_system_plan.md)**: Full implementation plan
