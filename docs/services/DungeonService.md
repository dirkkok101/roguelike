# DungeonService

**Location**: `src/services/DungeonService/DungeonService.ts`
**Dependencies**: RandomService, RoomGenerationService, CorridorGenerationService, MonsterSpawnService, ItemSpawnService, GoldService, GuaranteeTracker
**Test Coverage**: Room placement, corridor generation, door placement, spawning, guarantee enforcement

---

## Purpose

**Main orchestrator** for procedural dungeon generation. Generates complete 26-level dungeon with rooms, corridors (MST + loops), doors, traps, monsters, items, gold, stairs, and the Amulet of Yendor.

**Key Responsibilities**:
- Generate all 26 dungeon levels at game initialization
- Enforce item guarantee system via GuaranteeTracker
- Manage fixed 7 items per level for predictable progression
- Force spawn deficit items on boundary levels (5, 10, 15, 20, 26)

---

## Public API

### Level Generation

#### `generateAllLevels(config: DungeonConfig): Level[]`
Generates all 26 dungeon levels at once with guarantee enforcement.

**Parameters**:
```typescript
interface DungeonConfig {
  width: number          // Dungeon width (default: 80)
  height: number         // Dungeon height (default: 24)
  minRooms: number       // Minimum rooms (default: 6)
  maxRooms: number       // Maximum rooms (default: 9)
  minRoomSize: number    // Minimum room dimension (default: 4)
  maxRoomSize: number    // Maximum room dimension (default: 10)
  minSpacing: number     // Minimum wall spacing between rooms (default: 2)
  loopChance: number     // Probability of extra corridors (default: 0.3)
}
```

**Returns**: Array of 26 Level instances (depths 1-26)

**Guarantee Enforcement Pipeline**:
1. Initialize GuaranteeTracker for first depth range (1-5)
2. For each depth (1-26):
   - Generate level normally with fixed 7 items
   - Items tracked automatically via ItemSpawnService
   - On boundary levels (5, 10, 15, 20, 26):
     - Check if quotas met for current range
     - If deficits exist, force spawn missing items
     - Reset tracker for next range (except after level 26)
3. Return all 26 levels

**Example**:
```typescript
const dungeonService = new DungeonService(random, monsterSpawnService, itemData, guarantees)
const levels = dungeonService.generateAllLevels(config)

// All 26 levels generated with:
// - Fixed 7 items per level
// - Guaranteed resource availability per range
// - Depth-appropriate category weights
// - Power tier filtering by depth
```

---

#### `generateLevel(depth: number, config: DungeonConfig): Level`
Generates a single dungeon level (called by `generateAllLevels()`).

**Generation Pipeline**:
1. Create empty tile grid (all walls)
2. Generate rooms (RoomGenerationService)
3. Generate corridors with MST + loops (CorridorGenerationService)
4. Carve corridors into tiles
5. Carve rooms into tiles
6. Place doors at room/corridor junctions
7. Place traps (2-4 per level)
8. Determine stairs positions
9. Spawn monsters (depth + 1, max 8)
10. **Spawn items (fixed 7 per level)** ← UPDATED
11. Spawn gold (3-9 piles per level)
12. Spawn Amulet of Yendor (Level 26 only)

**Returns**: Complete Level object

**Note**: Typically not called directly. Use `generateAllLevels()` to ensure guarantee enforcement.

---

## Generation Steps

### 1. Empty Tiles

```typescript
private createEmptyTiles(width: number, height: number): Tile[][]
```

Creates 2D grid filled with wall tiles.

**Wall Tile**:
```typescript
{
  type: TileType.WALL,
  char: '#',
  walkable: false,
  transparent: false,
  colorVisible: '#8B7355',   // Brown
  colorExplored: '#4A4A4A',  // Dark gray
}
```

---

### 2. Room Generation

Delegates to **RoomGenerationService**:
```typescript
const rooms = this.roomGenerationService.generateRooms(roomConfig)
```

**Constraints**:
- Random count (minRooms to maxRooms)
- Non-overlapping with spacing buffer
- Random sizes (minRoomSize to maxRoomSize)
- Max 100 attempts per room

See [RoomGenerationService](./RoomGenerationService.md) for algorithm.

---

### 3. Corridor Generation

Delegates to **CorridorGenerationService**:
```typescript
const corridors = this.corridorGenerationService.generateCorridors(rooms, loopChance)
```

**Algorithm**:
- Minimum Spanning Tree (Prim's) for guaranteed connectivity
- Random extra corridors (loopChance = 30%) for alternate paths
- L-shaped corridors (horizontal-first or vertical-first)

See [CorridorGenerationService](./CorridorGenerationService.md) for algorithm.

---

### 4. Carving

**Corridors**:
```typescript
for (const corridor of corridors) {
  this.corridorGenerationService.carveCorridorIntoTiles(tiles, corridor, floorTile)
}
```

**Rooms**:
```typescript
private carveRoomIntoTiles(tiles: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      tiles[y][x] = this.createFloorTile()
    }
  }
}
```

**Floor Tile**:
```typescript
{
  type: TileType.FLOOR,
  char: '.',
  walkable: true,
  transparent: true,
  colorVisible: '#A89078',   // Light brown
  colorExplored: '#5A5A5A',  // Medium gray
}
```

---

## Door Placement

### Algorithm

```typescript
placeDoors(rooms: Room[], corridors: Corridor[], tiles: Tile[][]): Door[]
```

**Process**:
1. For each room, find corridor entry points
2. Entry = edge tile where corridor (walkable) meets room wall
3. Create door at each unique entry position
4. Update tile to reflect door state

---

### Finding Room Entries

```typescript
private findRoomEntries(room: Room, tiles: Tile[][]): Position[]
```

**Checks 4 edges**:
- **Top edge** (`y = room.y - 1`): If corridor above is walkable
- **Bottom edge** (`y = room.y + height`): If corridor below is walkable
- **Left edge** (`x = room.x - 1`): If corridor left is walkable
- **Right edge** (`x = room.x + width`): If corridor right is walkable

**Result**: Array of positions where corridors meet room

---

### Door Type Probabilities

```typescript
private randomDoorType(): DoorState
```

| Type | Probability | Character |
|------|-------------|-----------|
| **OPEN** | 50% | `'` |
| **CLOSED** | 30% | `+` |
| **SECRET** | 10% | `#` |
| **BROKEN** | 5% | `'` |
| **ARCHWAY** | 5% | `'` |

---

### Door Orientation

```typescript
private detectOrientation(position: Position, room: Room): 'horizontal' | 'vertical'
```

**Logic**:
- If door on left/right edge of room → `vertical`
- Otherwise → `horizontal`

---

### Tile Updates

```typescript
private updateTileForDoor(tiles: Tile[][], door: Door): void
```

| Door State | Character | Walkable | Transparent |
|------------|-----------|----------|-------------|
| **OPEN, BROKEN, ARCHWAY** | `'` | true | true |
| **CLOSED, LOCKED** | `+` | false | false |
| **SECRET** | `#` | false | false |

---

## Trap Placement

```typescript
placeTraps(rooms: Room[], count: number, tiles: Tile[][]): Trap[]
```

**Trap Count**: 2-4 per level

**Trap Types**:
- BEAR (bear trap)
- DART (dart trap)
- TELEPORT (teleport trap)
- SLEEP (sleeping gas)
- PIT (pit trap)

**Placement**:
- Random positions in rooms (avoid edges)
- Max 10 attempts per trap
- Only on walkable tiles
- No duplicate positions
- `discovered: false` (hidden until found)

---

## Gold Spawning

```typescript
private spawnGold(rooms: Room[], count: number, tiles: Tile[][], depth: number): GoldPile[]
```

**Gold Count**: 3-9 piles per level (randomized)

**Gold Amount**: Uses authentic **Rogue 1980 GOLDCALC** formula:
```
GOLDCALC = random(50 + 10 * depth) + 2

Examples:
- Level 1: 2-61 gold per pile
- Level 5: 2-101 gold per pile
- Level 10: 2-151 gold per pile
```

**Placement Algorithm**:
1. Pick random room
2. Pick random floor position in room (avoid edges)
3. Validate position:
   - Not already occupied by gold
   - Walkable floor tile (not wall or door)
   - Type is FLOOR
4. Calculate gold amount using GoldService
5. Create GoldPile at position
6. Repeat until count reached (max 20 attempts per pile)

**Integration**:
- Uses **GoldService** for amount calculation
- Gold spawned after items, before Amulet
- All rooms eligible (including starting room)

**Dependencies**: GoldService

---

## Monster Spawning

```typescript
spawnMonsters(rooms: Room[], count: number, tiles: Tile[][], depth: number): Monster[]
```

**Monster Count**: `depth + 1` (capped at 8)
- Level 1: 2 monsters
- Level 5: 6 monsters
- Level 10: 8 monsters

**Spawn Rooms**: All except first (player starts in first room)

**Depth-Based Selection**:
```typescript
const availableTemplates = templates.filter((t) => t.level <= depth)
```

**Example Progression**:
- Level 1: Bat, Kobold, Snake
- Level 2: Bat, Kobold, Snake, Orc, Zombie
- Level 6: All above + Troll

---

### Monster Templates

**Hardcoded Templates** (subset):
```typescript
const templates = [
  {
    letter: 'B',
    name: 'Bat',
    hpDice: '1d8',
    ac: 3,
    damage: '1d2',
    xpValue: 1,
    level: 1,
    behavior: MonsterBehavior.SIMPLE,
  },
  {
    letter: 'T',
    name: 'Troll',
    hpDice: '6d8',
    ac: 4,
    damage: '1d8+1d8',
    xpValue: 120,
    level: 6,
    behavior: MonsterBehavior.SMART,
  },
  // ... more
]
```

**Future**: Load from `data/monsters.json`

---

### Monster Placement

- Random position in random room
- Only on walkable tiles
- No duplicate positions
- 50% chance to start asleep
- Initial state: `SLEEPING`
- Aggro range: `5 + monster.level`

---

## Item Spawning with Guarantees

```typescript
// In generateLevel()
const itemCount = 7  // Fixed count for all levels
const spawnRooms = depth === 1 ? rooms : rooms.slice(1)  // Skip first room (player starts there)
const items = this.itemSpawnService.spawnItems(
  spawnRooms,
  itemCount,
  tiles,
  monsters,
  depth,
  this.tracker  // Pass tracker for recording
)
```

**Item Count**: **Fixed 7 per level** (35 per range) for predictable progression

**Category Selection**: Delegated to ItemSpawnService with depth-based weights from `data/guarantees.json`

**Tracked Categories**:
- Healing potions, identify scrolls, enchant scrolls
- Weapons, armors, rings, wands
- Food, light sources, lanterns, artifacts
- Utility potions, utility scrolls, advanced items

**Power Tier Filtering**: ItemSpawnService filters items by depth:
- Depth 1-8: Basic only
- Depth 9-16: Basic + Intermediate
- Depth 17-26: All tiers

---

### Guarantee Enforcement

On boundary levels (5, 10, 15, 20, 26), DungeonService enforces quotas:

```typescript
if (boundaryLevels.includes(depth)) {
  // Check if we met quotas for this range
  const deficits = this.tracker.getDeficits(depth)

  if (deficits.length > 0) {
    // Force spawn missing items to meet range guarantees
    level = this.itemSpawnService.forceSpawnForGuarantees(level, deficits)
  }

  // Reset tracker for next range (except after level 26)
  if (depth < 26) {
    this.tracker.resetRange(depth + 1)
  }
}
```

**Deficit Example**:
```typescript
// On level 5, if only 8 healing potions spawned naturally (quota is 10)
const deficits = tracker.getDeficits(5)
// Returns: [{ category: 'healingPotions', count: 2, powerTiers: [PowerTier.BASIC] }]

// Force spawn 2 additional healing potions on level 5
level = itemSpawnService.forceSpawnForGuarantees(level, deficits)
```

---

### Depth-Based Category Weights

**Early Game (1-5)**:
- Potion: 20 weight (healing focus)
- Scroll: 20 weight (identification)
- Weapon: 15 weight (combat upgrades)
- Armor: 15 weight (defense upgrades)
- Food: 12 weight (hunger management)
- Light: 8 weight (vision)
- Ring: 5 weight (rare utility)
- Wand: 5 weight (rare utility)

**Late Game (21-26)**:
- Ring: 18 weight (dominant utility)
- Wand: 18 weight (dominant utility)
- Food: 16 weight (critical resource)
- Potion: 14 weight (powerful consumables)
- Scroll: 14 weight (powerful consumables)
- Light: 8 weight (stable supply)
- Weapon: 6 weight (very rare)
- Armor: 6 weight (very rare)

See [ItemSpawnService](./ItemSpawnService.md) for complete weight tables.

---

## Stairs Placement

```typescript
const stairsUpPos = depth > 1 ? this.getRandomRoomCenter(rooms[0]) : null
const stairsDownPos = this.getRandomRoomCenter(rooms[lastRoomIndex])
```

**Stairs Up**:
- Center of first room
- Only on Level 2-10 (Level 1 has no up stairs)

**Stairs Down**:
- Center of last room
- All levels have down stairs

**Characters**:
- Up stairs: `<`
- Down stairs: `>`

---

## Amulet of Yendor

```typescript
spawnAmulet(level: Level): Level
```

**Spawns only on Level 10** in center of last room.

**Amulet Item**:
```typescript
{
  id: `amulet_${Date.now()}`,
  name: 'Amulet of Yendor',
  type: ItemType.AMULET,
  identified: true,
  position: { x: centerX, y: centerY },
}
```

**Win Condition**: Pick up Amulet on Level 10, return to Level 1 stairs up.

---

## Level Structure

**Generated Level**:
```typescript
interface Level {
  depth: number                 // 1-10
  width: number                 // 80
  height: number                // 24
  tiles: Tile[][]               // 2D grid
  rooms: Room[]                 // 6-9 rooms
  doors: Door[]                 // Variable (depends on corridors)
  traps: Trap[]                 // 2-4 traps
  monsters: Monster[]           // depth + 1 (max 8)
  items: Item[]                 // 5-8 items (50% more food weight)
  gold: GoldPile[]              // Empty initially (drops from monsters)
  stairsUp: Position | null     // null on Level 1
  stairsDown: Position          // Always present
  explored: boolean[][]         // All false initially
}
```

---

## Testing

**Test Files**:
- `room-placement.test.ts` - Non-overlapping room generation
- `corridor-connectivity.test.ts` - MST ensures all rooms connected
- `door-placement.test.ts` - Doors at room/corridor junctions
- `trap-placement.test.ts` - Valid trap positions
- `monster-spawning.test.ts` - Depth-based monster selection
- `item-spawning.test.ts` - Rarity distribution, depth weights
- `amulet-spawning.test.ts` - Level 10 only

**Example Test**:
```typescript
describe('DungeonService - Level Generation', () => {
  test('generates level with all components', () => {
    const level = service.generateLevel(1, config)

    expect(level.depth).toBe(1)
    expect(level.rooms.length).toBeGreaterThanOrEqual(6)
    expect(level.doors.length).toBeGreaterThan(0)
    expect(level.traps.length).toBeGreaterThanOrEqual(2)
    expect(level.monsters.length).toBe(2)  // depth + 1
    expect(level.items.length).toBeGreaterThanOrEqual(3)
    expect(level.stairsUp).toBeNull()  // Level 1
    expect(level.stairsDown).toBeDefined()
  })

  test('spawns Amulet only on Level 10', () => {
    const level10 = service.generateLevel(10, config)
    const amulet = level10.items.find((i) => i.type === ItemType.AMULET)

    expect(amulet).toBeDefined()
    expect(amulet.name).toBe('Amulet of Yendor')

    const level1 = service.generateLevel(1, config)
    const noAmulet = level1.items.find((i) => i.type === ItemType.AMULET)
    expect(noAmulet).toBeUndefined()
  })
})
```

---

## Related Services

- [GuaranteeTracker](./GuaranteeTracker.md) - Tracks item spawns across depth ranges, calculates deficits
- [ItemSpawnService](./ItemSpawnService.md) - Spawns items with depth-based weights, enforces guarantees
- [MonsterSpawnService](./MonsterSpawnService.md) - Spawns monsters with vorpal system
- [GoldService](./GoldService.md) - Calculates gold pile amounts
- **RoomGenerationService** - Generates non-overlapping rooms
- **CorridorGenerationService** - MST + loop corridor generation
- **RandomService** - All randomization (room placement, item spawning, etc.)
- **ItemData** - Loads item templates from JSON

---

## Design Rationale

### Why Generate All Levels at Once?

**Problem**: Generating levels on-the-fly when player descends stairs makes guarantee enforcement impossible.

**Solution**: Generate all 26 levels at game initialization:
- Enables guarantee tracking across depth ranges
- Allows deficit correction on boundary levels
- Ensures predictable resource availability
- Simplifies save/load (all levels exist in GameState)

### Why Guarantee System?

**Problem**: Purely random spawning can result in critical resource droughts:
- 10 levels without healing potions (death likely)
- No identify scrolls in early game (equipment unknown)
- Insufficient food in late game (starvation death)

**Solution**: Three-layer guarantee system:
1. **Fixed 7 items per level**: Predictable progression baseline
2. **Range quotas**: Minimum category counts per 5-level range
3. **Boundary enforcement**: Deficit correction on levels 5, 10, 15, 20, 26

**Benefits**:
- Eliminates unlucky deaths from item droughts
- Maintains natural randomness within ranges
- Predictable testing (known enforcement points)
- Balanced difficulty curve across all runs

### Why MST for Corridors?

**Guaranteed connectivity** - Every room reachable from starting room.

**Minimal corridors** - Tree structure prevents excessive corridors.

**Loops for gameplay** - Extra corridors (30% chance) add alternate paths for tactical play.

---

### Why Depth-Based Spawning?

**Difficulty curve** - Early levels have weak monsters, late levels have bosses.

**Resource scarcity** - Lanterns unavailable early, forcing torch management.

**Progression** - Player gradually encounters stronger enemies.

---

### Why Random Door Types?

**Variety** - Different door types create different tactical situations:
- **Secret doors**: Exploration challenge
- **Locked doors**: Need keys (future phase)
- **Open/Archway**: Free passage
- **Closed**: Auto-open but block vision

**Original Rogue** - Had varied door types for replayability.

---

## Configuration Examples

### Small Dungeon (Testing)
```typescript
const testConfig: DungeonConfig = {
  width: 40,
  height: 20,
  minRooms: 3,
  maxRooms: 5,
  minRoomSize: 3,
  maxRoomSize: 6,
  minSpacing: 1,
  loopChance: 0.2,
}
```

### Standard Dungeon (Production)
```typescript
const standardConfig: DungeonConfig = {
  width: 80,
  height: 24,
  minRooms: 6,
  maxRooms: 9,
  minRoomSize: 4,
  maxRoomSize: 10,
  minSpacing: 2,
  loopChance: 0.3,
}
```

### Large Dungeon (Challenge Mode)
```typescript
const largeConfig: DungeonConfig = {
  width: 100,
  height: 30,
  minRooms: 10,
  maxRooms: 15,
  minRoomSize: 5,
  maxRoomSize: 12,
  minSpacing: 3,
  loopChance: 0.4,
}
```

---

## Performance

**Complexity**:
- Room generation: O(n × attempts) where n = room count
- MST generation: O(e log e) where e = edge count
- Corridor carving: O(c × p) where c = corridors, p = path length
- Total: O(n²) for typical dungeon

**Typical Generation Time**: < 50ms for 80×24 dungeon with 9 rooms

---

## Future Enhancements

- Load monster/item templates from JSON
- Themed levels (ice, fire, dungeon, cave)
- Special rooms (treasure vaults, monster zoos)
- Water/lava features
- Level prefabs (predefined room layouts)
