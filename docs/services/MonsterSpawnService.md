# MonsterSpawnService

**Version**: 1.0
**Last Updated**: 2025-10-06
**Location**: `src/services/MonsterSpawnService/MonsterSpawnService.ts`
**Dependencies**: RandomService
**Test Coverage**: Data loading (5 tests), monster creation (8 tests), spawn logic (10 tests), weighted selection (11 tests), integration (15 tests)
**Related Docs**: [DungeonService](./DungeonService.md) | [Monster AI](../systems-advanced.md#monster-ai) | [Game Design: Monsters](../game-design/04-monsters.md)

---

## Purpose

**Data-driven monster spawning** service for dungeon level generation. Loads monster templates from JSON, implements weighted spawning based on dungeon depth and rarity, and creates appropriately leveled monsters with variable speeds for the energy system.

**Key Features**:
- Load and validate monster data from `public/data/monsters.json`
- Progressive difficulty scaling (5 monsters at depth 1 → 20 at depth 10)
- Weighted spawning by rarity (common 50%, uncommon 30%, rare 20%)
- Level-based filtering (prevents Dragons spawning at depth 1)
- Boss monster restrictions (level 10+ monsters only at deep levels)
- Variable monster speeds (5-18 range) for energy system
- Deterministic placement (no overlaps, valid positions only)

---

## Public API

### Data Loading

#### `loadMonsterData(): Promise<void>`
Loads and validates monster templates from JSON file.

**Behavior**:
- Fetches `/data/monsters.json`
- Validates all required fields and types
- Caches data in memory (subsequent calls are no-op)
- Throws error if fetch fails or data is malformed

**Must be called** before `spawnMonsters()` or service will throw error.

**Example**:
```typescript
const random = new SeededRandom('dungeon-seed')
const monsterSpawnService = new MonsterSpawnService(random)

// Load data once at game initialization
await monsterSpawnService.loadMonsterData()
```

---

### Monster Spawning

#### `spawnMonsters(rooms: Room[], tiles: Tile[][], depth: number): Monster[]`
Spawns monsters for a dungeon level with weighted selection.

**Parameters**:
- `rooms`: Array of room structures (for valid spawn positions)
- `tiles`: 2D tile grid (for walkability checks)
- `depth`: Dungeon level (1-10), determines spawn count and monster selection

**Returns**: Array of spawned Monster instances

**Algorithm**:
1. Calculate spawn count: `Math.min((depth * 2) + 3, 20)`
2. Filter monsters by depth (level <= depth + 2, boss restrictions)
3. For each spawn:
   - Select weighted monster template (by rarity)
   - Find valid spawn position (inside room, walkable, unoccupied)
   - Create Monster from template (roll HP, initialize energy, set state)
   - Track occupied positions to prevent overlaps

**Example**:
```typescript
const depth = 5
const monsters = monsterSpawnService.spawnMonsters(rooms, tiles, depth)

console.log(`Spawned ${monsters.length} monsters`)
// Expected: 13 monsters for depth 5 ((5*2)+3)

for (const monster of monsters) {
  console.log(`${monster.name} (level ${monster.level}, speed ${monster.speed})`)
}
```

---

#### `spawnMonstersWithVorpalRange(rooms: Room[], tiles: Tile[][], depth: number, minVorpal: number, maxVorpal: number): Monster[]`
Spawns monsters with custom vorpal range (advanced spawning control).

**Use Case**: Special spawning scenarios like Amulet return journey where cumulative vorpal range [0, depth+3] makes ascent more challenging.

**Parameters**:
- `rooms`: Array of room structures (for valid spawn positions)
- `tiles`: 2D tile grid (for walkability checks)
- `depth`: Dungeon level (1-26), determines spawn count only
- `minVorpal`: Minimum vorpalness value (inclusive) - e.g., 0 for cumulative pool
- `maxVorpal`: Maximum vorpalness value (inclusive) - e.g., depth+3

**Returns**: Array of spawned Monster instances

**Difference from `spawnMonsters()`**:
- `spawnMonsters()`: Uses automatic vorpal range [depth-6, depth+3]
- `spawnMonstersWithVorpalRange()`: Uses custom vorpal range (you specify min/max)

**Example (Amulet Ascent)**:
```typescript
// Ascending to level 10 with Amulet
// Use cumulative pool [0, depth+3] instead of normal [4, 13]
const monsters = monsterSpawnService.spawnMonstersWithVorpalRange(
  rooms,
  tiles,
  10,    // depth (determines spawn count: 20 monsters)
  0,     // minVorpal (cumulative: includes ALL low-level monsters)
  13     // maxVorpal (depth+3)
)

// Result: Spawns 20 monsters from vorpal 0-13
// This includes Bats, Snakes, Orcs, Trolls, etc. (more variety than normal)
```

**Example (Custom Difficulty)**:
```typescript
// Spawn only high-tier monsters on level 5
const hardMonsters = monsterSpawnService.spawnMonstersWithVorpalRange(
  rooms,
  tiles,
  5,    // depth (13 monsters)
  10,   // minVorpal (exclude early monsters)
  15    // maxVorpal (mid-tier range)
)
```

---

#### `getSpawnCount(depth: number): number`
Calculates number of monsters to spawn for a given depth.

**Formula**: `Math.min((depth * 2) + 3, 20)`

**Examples**:
- Depth 1: 5 monsters
- Depth 5: 13 monsters
- Depth 10: 20 monsters (capped)
- Depth 100: 20 monsters (capped)

---

## Monster Template Structure

**File**: `public/data/monsters.json`

```typescript
interface MonsterTemplate {
  letter: string              // Display character (A-Z)
  name: string               // Monster name
  hp: string                 // Dice notation (e.g., "2d8", "10d10")
  ac: number                 // Armor class
  damage: string             // Damage dice (e.g., "1d6", "3d10")
  xpValue: number            // Experience points when killed
  level: number              // Monster level (1-10)
  speed: number              // Energy gain rate (5=slow, 10=normal, 15=fast, 18=very fast)
  rarity: 'common' | 'uncommon' | 'rare'
  mean: boolean              // If true: starts awake/hunting; if false: starts asleep
  aiProfile: MonsterAIProfile
}
```

**Example**:
```json
{
  "letter": "K",
  "name": "Kobold",
  "hp": "1d8",
  "ac": 7,
  "damage": "1d4",
  "xpValue": 5,
  "level": 1,
  "speed": 10,
  "rarity": "common",
  "mean": false,
  "aiProfile": {
    "behavior": "SIMPLE",
    "intelligence": 1,
    "aggroRange": 5,
    "fleeThreshold": 0.0,
    "special": []
  }
}
```

---

## Spawning Algorithm Details

### Spawn Count Scaling

Progressive difficulty increase with depth:

| Depth | Formula | Count | Notes |
|-------|---------|-------|-------|
| 1 | (1 * 2) + 3 | 5 | Early game |
| 5 | (5 * 2) + 3 | 13 | Mid game |
| 10 | min((10 * 2) + 3, 20) | 20 | Endgame (capped) |

**Rationale**: Prevents overwhelming early levels while ensuring challenge at deeper levels.

---

### Level-Based Filtering

**Rule**: Monsters with `level <= depth + 2` are eligible to spawn.

**Examples**:
- **Depth 1**: Allows level 1-3 monsters
- **Depth 5**: Allows level 1-7 monsters
- **Depth 10**: Allows level 1-12 monsters (all current monsters)

**Boss Restriction**: Monsters with `level >= 10` have additional check:
- Only spawn if `depth >= monster.level - 1`
- **Dragon (level 10)**: Only spawns at depth 9-10

**Rationale**: Prevents Dragons spawning at depth 1, ensures appropriate difficulty curve.

---

### Weighted Rarity Selection

**Weights**:
- **Common**: Weight 5 (50% of spawns)
- **Uncommon**: Weight 3 (30% of spawns)
- **Rare**: Weight 2 (20% of spawns)

**Algorithm**:
1. Calculate total weight from filtered templates
2. Generate random value: `random.nextInt(1, totalWeight)`
3. Iterate templates, accumulating weights until random value reached
4. Return selected template

**Example Distribution** (10 spawns from mix of rarities):
- ~5 common monsters
- ~3 uncommon monsters
- ~2 rare monsters

---

### Position Selection

**Requirements**:
- Inside room bounds (not on walls)
- Walkable tile
- Not already occupied by another monster

**Algorithm**:
```typescript
for (attempt = 0; attempt < 10; attempt++) {
  room = random.pickRandom(rooms)
  x = random.nextInt(room.x + 1, room.x + room.width - 2)
  y = random.nextInt(room.y + 1, room.y + room.height - 2)

  if (tiles[y][x].walkable && !occupied.has(`${x},${y}`)) {
    return { x, y }
  }
}
return null // Could not find valid position
```

**Max Attempts**: 10 (prevents infinite loop in crowded dungeons)

---

### Monster Creation

**From Template to Instance**:
```typescript
1. Roll HP from dice notation (e.g., "1d8" → 6 HP)
2. Copy stats from template (ac, damage, xpValue, level, speed)
3. Initialize energy randomly (0-99) for staggered action timing
4. Set awake state based on "mean" flag:
   - mean=true → isAwake=true, state=HUNTING
   - mean=false → isAwake=false, state=SLEEPING
5. Copy aiProfile from template
6. Set isInvisible=false (default, Phantoms override)
7. Generate unique ID: `monster-{depth}-{index}-{random}`
```

**Result**: Fully initialized Monster ready for game logic.

---

## Speed Variety

**Why Variable Speeds?**
The energy system uses monster speed to determine action frequency:
```typescript
// Every game tick
monster.energy += monster.speed

// When energy >= 100
monster.takeTurn()
monster.energy -= 100
```

**Speed Categories**:
- **5-7**: Slow (Zombie, Troll) - acts every ~15-20 turns
- **10**: Normal (Kobold, Orc) - acts every ~10 turns
- **12-15**: Fast (Snake, Bat) - acts every ~7-8 turns
- **18**: Very Fast (Dragon) - acts every ~5-6 turns

**Before This Refactor**: All monsters had speed=10 (hardcoded), making energy system ineffective.

**After**: Speed varies by monster type, creating tactical differences.

---

## Design Rationale

### Why Separate from DungeonService?

**Before** (Phase 0):
- DungeonService had 133 lines of hardcoded monster spawning
- Hardcoded templates (7 monster types)
- All monsters had speed=10
- Violated Single Responsibility Principle

**After** (Phase 6):
- MonsterSpawnService: 390 lines focused on monster spawning
- Data-driven from `monsters.json` (26 monster types)
- Variable speeds (5-18 range)
- Clean separation: DungeonService handles layout, MonsterSpawnService handles monsters

**Benefits**:
- Easier to modify monster balance (edit JSON, not code)
- Better testability (48 tests for spawn logic)
- Clearer responsibilities
- Supports future features (special monster events, dynamic spawning)

---

### Why Weighted Spawning?

**Problem**: Random selection would spawn Dragons as often as Kobolds at all depths.

**Solution**: Rarity weights + level filtering:
- Common monsters (Kobold, Orc) spawn frequently
- Rare monsters (Dragon, Lich) spawn infrequently
- Deep levels have higher chance of rare spawns (more templates eligible)

**Result**: Natural difficulty progression without hardcoded logic.

---

## Testing

**Test Files**:
1. `data-loading.test.ts` (5 tests) - JSON loading and validation
2. `monster-creation.test.ts` (8 tests) - Template to Monster conversion
3. `spawn-logic.test.ts` (10 tests) - Spawn count formula and placement
4. `weighted-selection.test.ts` (11 tests) - Filtering and weighting
5. `src/__integration__/monster-spawning.test.ts` (15 tests) - Full integration with DungeonService

**Coverage**:
- Statements: 80.73%
- Functions: 92.85%
- Lines: 80.39%
- Branches: 71.64% (validation errors hard to test)

**Test Strategy**:
- **Unit tests**: MockRandom for deterministic behavior
- **Integration tests**: SeededRandom for realistic scenarios
- **Mocked fetch**: Tests don't require actual file reads

---

## Related Services

- **DungeonService**: Calls `spawnMonsters()` during level generation
- **RandomService**: Provides dice rolls, weighted selection, random integers
- **MonsterAIService**: Uses monster stats and aiProfile for behavior
- **CombatService**: Uses monster stats (hp, ac, damage) for combat
- **EnergyService**: Uses monster speed for turn timing

---

## Migration Notes

**Phase 6 Changes** (DungeonService Integration):
1. MonsterSpawnService injected into DungeonService constructor
2. `loadMonsterData()` called once at game initialization
3. Old `spawnMonsters()` method deleted (133 lines removed)
4. New call: `this.monsterSpawnService.spawnMonsters(rooms, tiles, depth)`

**Breaking Changes**: None (internal refactor, no public API changes)

---

## Future Enhancements

Possible improvements:
1. **Dynamic spawn tables**: Different monster sets per biome (forest, cave, crypt)
2. **Pack spawning**: Group related monsters together
3. **Elite variants**: Buffed versions of common monsters
4. **Special events**: "Monster den" rooms with 2x spawns
5. **Seasonal variations**: Different templates based on game time

**Extensibility**: JSON-driven design makes these features easy to add without code changes.

---

**Last Updated**: 2025-10-06
**Introduced**: Phase 1-6 of monster spawn refactor
**Status**: Production-ready, fully tested
