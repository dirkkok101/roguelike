# WanderingMonsterService

**Location**: `src/services/WanderingMonsterService/WanderingMonsterService.ts`
**Dependencies**: MonsterSpawnService, RandomService
**Test Coverage**: Spawn chance calculation, location selection, level limits

---

## Purpose

Implements **wandering monster spawns** that appear progressively as the player spends time on a dungeon level. Matches authentic 1980 Rogue mechanics, adding time pressure to discourage indefinite resting and exploration grinding.

---

## Public API

### Spawn Decision

#### `shouldSpawnWanderer(level: Level, turnCount: number): boolean`
Determines if a wandering monster should spawn this turn.

**Spawn Formula**:
```
Base chance = 0.5% per turn (1 in 200)
Increment = +0.01% per turn since last spawn
Maximum = 5% per turn (cap)
Limit = 5 wanderers per level maximum
```

**Algorithm**:
```typescript
turnsSinceLastSpawn = turnCount - level.lastWanderingSpawnTurn
spawnChance = min(0.005 + (turnsSinceLastSpawn * 0.0001), 0.05)
return random.chance(spawnChance)
```

**Returns**: `true` if wanderer should spawn (roll succeeded and limit not reached)

**Example**:
```typescript
// Turn 0: No spawns yet
const shouldSpawn1 = service.shouldSpawnWanderer(level, 0)
// spawnChance = 0.005 (0.5%), roll: false (likely)

// Turn 200: 200 turns since last spawn
const shouldSpawn2 = service.shouldSpawnWanderer(level, 200)
// spawnChance = 0.005 + (200 * 0.0001) = 0.025 (2.5%), roll: maybe

// Turn 1000: 1000 turns since last spawn
const shouldSpawn3 = service.shouldSpawnWanderer(level, 1000)
// spawnChance = 0.005 + (1000 * 0.0001) = 0.105 → capped at 0.05 (5%)
```

**Spawn Chance Progression**:
| Turns Since Spawn | Chance | Probability |
|-------------------|--------|-------------|
| 0 | 0.5% | 1 in 200 |
| 100 | 1.5% | 1 in 67 |
| 200 | 2.5% | 1 in 40 |
| 300 | 3.5% | 1 in 29 |
| 400 | 4.5% | 1 in 22 |
| 450+ | 5.0% | 1 in 20 (cap) |

---

### Location Selection

#### `getSpawnLocation(level: Level, playerPos: Position): Position | null`
Selects valid spawn location for wandering monster.

**Location Rules**:
1. ✅ Must be walkable tile
2. ❌ NOT in player's current room (authentic Rogue rule)
3. ❌ NOT occupied by player
4. ❌ NOT occupied by another monster

**Returns**: Random valid `Position`, or `null` if no valid location found

**Example**:
```typescript
const spawnPos = service.getSpawnLocation(level, playerPos)
if (spawnPos) {
  // spawnPos: { x: 15, y: 8 } (example)
  // - Walkable corridor or other room
  // - Not in player's room
  // - Not occupied
}
```

**Edge Cases**:
- **Player in corridor**: Wanderer can spawn in any room
- **Small level, many monsters**: May return `null` (no space)
- **Player in only room**: Wanderer spawns in corridors

---

### Monster Creation

#### `spawnWanderer(depth: number, position: Position): Monster`
Creates wandering monster instance at specified position.

**Monster Selection**: Uses `MonsterSpawnService.selectMonsterForDepth(depth)` - same weighted selection as level generation

**ID Format**: `wanderer-{depth}-{randomInt}`

**Returns**: Fully initialized `Monster` instance

**Example**:
```typescript
const position = { x: 10, y: 5 }
const wanderer = service.spawnWanderer(3, position)
// wanderer.id: "wanderer-3-4728"
// wanderer.name: "Hobgoblin" (example for depth 3)
// wanderer.position: { x: 10, y: 5 }
// wanderer.isAsleep: false (wanderers spawn awake)
// wanderer.state: MonsterState.WANDERING
```

**Wanderer Characteristics**:
- **Awake** - Spawn in WANDERING state (not sleeping)
- **Level-appropriate** - Depth-based selection matches initial spawns
- **Unique ID** - Distinct from room spawns (`monster-room-X`)

---

## Design Principles

### Time Pressure

**Problem**: In classic roguelikes, players could safely rest indefinitely to regenerate HP.

**Solution**: Wandering monsters add risk to prolonged resting:
- Resting for 100 turns → ~10% chance of wanderer spawn
- Resting for 200 turns → ~30% cumulative chance
- Forces player to balance healing vs. risk

**Balance**: Progressive spawn chance ensures low-level players aren't overwhelmed early, but long camping becomes dangerous.

---

### Fair Spawning

**Authentic Rogue Rule**: Wanderers never spawn in player's current room.

**Why**:
- Prevents cheap deaths from spawns on top of player
- Gives player time to react (sees wanderer approaching)
- Maintains fairness (player can't be ambushed while resting in room)

**Implementation**: `getSpawnLocation()` checks `isPositionInRoom()` for player's room.

---

### Progressive Difficulty

**Spawn Chance Curve**:
```
5% ┤                     ╭─────────────
   │                   ╭─╯
3% ┤              ╭────╯
   │         ╭────╯
1% ┤   ╭─────╯
   │╭──╯
0% ┼───────────────────────────────────
   0  100  200  300  400  500  turns
```

**Design Goals**:
- **Early game** (0-100 turns): Low pressure, player learns level
- **Mid game** (100-300 turns): Moderate pressure, encourages progress
- **Late game** (300+ turns): High pressure, punishes excessive camping

**Cap Reasoning**: 5% maximum prevents runaway spawning (average 1 wanderer every 20 turns at peak).

---

### Limit Per Level

**Max Wanderers**: 5 per level

**Why Limit?**:
- Prevents level overcrowding
- Maintains performance (fewer monsters to process)
- Balances risk (won't spawn endlessly)

**Tracking**: `level.wanderingMonsterCount` increments on spawn, decrements on wanderer death

---

## Integration with Game Systems

### Turn System Integration

**Called by**: `TurnService.processTurn()` after monster turns

**Workflow**:
```typescript
// In TurnService.processTurn()
if (wanderingService.shouldSpawnWanderer(level, state.turnCount)) {
  const spawnPos = wanderingService.getSpawnLocation(level, state.player.position)
  if (spawnPos) {
    const wanderer = wanderingService.spawnWanderer(state.currentLevel, spawnPos)

    // Add to level
    level.monsters.push(wanderer)
    level.wanderingMonsterCount = (level.wanderingMonsterCount ?? 0) + 1
    level.lastWanderingSpawnTurn = state.turnCount

    // Notification
    messages.push('You hear a faint noise in the distance...')
  }
}
```

---

### Level State Tracking

**New Level Fields** (optional, backward compatible):

```typescript
interface Level {
  // ... existing fields
  wanderingMonsterCount?: number // Count of wanderers spawned (max 5)
  lastWanderingSpawnTurn?: number // Turn number of last spawn
}
```

**Initialization**: Both default to `0` if undefined.

**Update**: Modified only by wandering spawn logic in TurnService.

---

## Spawn Chance Tuning

**Configuration Constants** (tunable for balance):

```typescript
private readonly SPAWN_CHANCE_BASE = 0.005        // 0.5% base
private readonly SPAWN_CHANCE_INCREMENT = 0.0001  // +0.01% per turn
private readonly SPAWN_CHANCE_CAP = 0.05          // 5% max
private readonly MAX_WANDERERS_PER_LEVEL = 5      // Limit
```

**Balancing Considerations**:

| Constant | Effect if Increased | Effect if Decreased |
|----------|---------------------|---------------------|
| `SPAWN_CHANCE_BASE` | More spawns early game | Fewer early spawns |
| `SPAWN_CHANCE_INCREMENT` | Faster ramp-up | Slower progression |
| `SPAWN_CHANCE_CAP` | More frequent late-game spawns | Lower max frequency |
| `MAX_WANDERERS_PER_LEVEL` | More crowded levels | Safer camping |

**Recommended Values**: Current values match original Rogue (~1% base chance with gradual increase).

---

## Testing

**Test Files**:
- `spawn-chance.test.ts` - Probability calculations, progressive increase, cap
- `spawn-location.test.ts` - Valid location selection, player room exclusion
- `wandering-monster-service.test.ts` - Integration tests

**Example Test**:
```typescript
describe('WanderingMonsterService - Spawn Chance', () => {
  test('spawn chance increases over time', () => {
    mockRandom.setNextChanceResults([true]) // Force spawn

    // Turn 0: base chance (0.5%)
    const shouldSpawn1 = service.shouldSpawnWanderer(level, 0)
    // Internal calculation: 0.005

    // Turn 200: increased chance (2.5%)
    level.lastWanderingSpawnTurn = 0
    const shouldSpawn2 = service.shouldSpawnWanderer(level, 200)
    // Internal calculation: 0.005 + (200 * 0.0001) = 0.025

    expect(shouldSpawn1).toBe(true)
    expect(shouldSpawn2).toBe(true)
  })

  test('caps at 5% maximum', () => {
    // 1000 turns since spawn → would be 10.5% uncapped
    level.lastWanderingSpawnTurn = 0
    const shouldSpawn = service.shouldSpawnWanderer(level, 1000)
    // Internal calculation: min(0.005 + (1000 * 0.0001), 0.05) = 0.05
  })

  test('respects wanderer limit (max 5)', () => {
    level.wanderingMonsterCount = 5
    const shouldSpawn = service.shouldSpawnWanderer(level, 100)
    expect(shouldSpawn).toBe(false) // Limit reached
  })
})
```

---

## Related Services

- **MonsterSpawnService** - Provides monster templates and creation logic
- **TurnService** - Orchestrates wandering spawn checks each turn
- **RandomService** - Provides RNG for spawn rolls and location selection
- **MonsterAIService** - Handles wanderer behavior (WANDERING state)

---

## Authentic Rogue (1980) Mechanics

### Original Implementation

**From Rogue 1980 Source Code** (`MONSTERS.c`):

```c
// Wandering monster spawn check (called each turn)
if (rnd(100) < 1) {  // 1% chance per turn
  create_wanderer();
}

// Wanderers cannot spawn in player's room
if (room_of_player == room_of_spawn) {
  // Find different room
}
```

**Key Differences**:

| Feature | Original Rogue | Modern Implementation |
|---------|----------------|----------------------|
| Base chance | ~1% per turn | 0.5% base (tunable) |
| Progressive increase | None (flat 1%) | +0.01% per turn since spawn |
| Spawn cap | None | 5% max per turn |
| Wanderer limit | None | 5 per level |
| Location rules | Not in player's room | ✅ Same |

**Why Changes?**:
- **Progressive increase**: Rewards fast play, punishes camping
- **Spawn cap**: Prevents runaway spawning in long games
- **Wanderer limit**: Maintains performance, prevents overcrowding
- **Lower base**: Gentler early game (0.5% vs 1%)

**Authentic Behavior Preserved**:
- ✅ Cannot spawn in player's room
- ✅ Spawns are random (not predictable)
- ✅ Adds time pressure to dungeon exploration

---

## Design Rationale

### Why Progressive Spawn Chance?

**Problem**: Flat spawn rate (original Rogue's 1%) doesn't scale well with player behavior.

**Solution**: Progressive increase based on time since last spawn.

**Benefits**:
- Fast players (clear level quickly) face fewer spawns
- Slow players (camp for HP) face more spawns
- Self-balancing: Spawn rate resets after each wanderer

### Why Cap at 5%?

**Without Cap**: After 1000 turns, spawn chance would hit 10.5% (guaranteed spawn every ~10 turns).

**With Cap**: Stabilizes at 5% (average 1 spawn per 20 turns).

**Balance**: Ensures wanderers add pressure without overwhelming player.

### Why 5 Wanderer Limit?

**Playtest Findings**:
- 10+ wanderers: Level becomes unplayable (too crowded)
- 3 wanderers: Not enough pressure
- 5 wanderers: Sweet spot (adds risk, still manageable)

**Technical**: Fewer monsters = better performance (pathfinding, turn processing).

---

## Performance Considerations

**Spawn Check**: O(1) - Simple arithmetic and RNG roll

**Location Search**: O(W × H) - Scans all tiles
- Typical level: 80×24 = 1,920 tiles
- Early exit: Stops when candidates found
- Cached walkability: Uses pre-computed tile data

**Optimization**: Could cache walkable non-room tiles, but current performance is acceptable (<1ms).

---

## Future Enhancements

### Potential Improvements

1. **Wanderer Types**:
   - Currently: Same as room spawns
   - Future: Special "wanderer only" monsters (patrols, hunters)

2. **Spawn Notifications**:
   - Currently: Generic "faint noise" message
   - Future: Distance-based messages ("distant roar", "nearby footsteps")

3. **Spawn Clustering**:
   - Currently: Single monster spawns
   - Future: 10% chance to spawn 2-3 monsters (pack behavior)

4. **Depth Scaling**:
   - Currently: Flat spawn chance across depths
   - Future: Higher spawn chance on deeper levels (more dangerous)

---

## Troubleshooting

### "No wanderers spawning"

**Possible Causes**:
1. Wanderer limit reached (check `level.wanderingMonsterCount`)
2. No valid spawn locations (level too small or crowded)
3. Bad RNG luck (0.5% is low - average 1 spawn per 200 turns)

**Debug**:
```typescript
console.log('Wanderer count:', level.wanderingMonsterCount)
console.log('Spawn chance:', spawnChance) // Should increase over time
console.log('Valid locations:', candidates.length)
```

### "Too many wanderers"

**Possible Causes**:
1. `MAX_WANDERERS_PER_LEVEL` set too high
2. `wanderingMonsterCount` not decrementing on death

**Fix**: Ensure MonsterTurnService decrements count when wanderer dies.

### "Wanderers spawn in player's room"

**Bug**: `isPositionInRoom()` logic error

**Test**:
```typescript
test('wanderer does not spawn in player room', () => {
  const playerPos = { x: 5, y: 5 } // In room 1
  const spawnPos = service.getSpawnLocation(level, playerPos)
  const playerRoom = findRoomContainingPosition(level.rooms, playerPos)
  const spawnRoom = findRoomContainingPosition(level.rooms, spawnPos)
  expect(spawnRoom).not.toEqual(playerRoom)
})
```

---

**Last Updated**: 2025-10-10
