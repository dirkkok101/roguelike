# StairsNavigationService

**Location**: `src/services/StairsNavigationService/StairsNavigationService.ts`
**Dependencies**: MonsterSpawnService
**Test Coverage**: Descent, ascent, respawning, Amulet mechanics

---

## Purpose

Handles stairs traversal for 26-level dungeon with bidirectional travel. Manages level persistence, monster respawning on ascent with Amulet, and respawn tracking.

---

## Public API

### canDescend(state: GameState): boolean

Returns true if not at maximum depth (26).

**Example**:
```typescript
if (stairsService.canDescend(gameState)) {
  // Player can go deeper
  newState = stairsService.descend(gameState)
}
```

---

### canAscend(state: GameState): boolean

Returns true if not at surface level (1).

**Example**:
```typescript
if (stairsService.canAscend(gameState)) {
  // Player can go up
  newState = stairsService.ascend(gameState)
}
```

---

### descend(state: GameState): GameState

Descends one level. Saves current level, loads next level. **No monster respawning.**

**Behavior**:
1. Validate can descend (not at level 26)
2. Save current level state to map (persistent)
3. Load next level from map (depth + 1)
4. Update player position to upstairs
5. Return updated state

**Throws**: Error if already at maximum depth

**Example**:
```typescript
const stairsService = new StairsNavigationService(monsterSpawnService)

// Player descends from level 5 → 6
const newState = stairsService.descend(gameState)
// newState.currentLevel === 6
// Level 5 saved exactly as left
```

---

### ascend(state: GameState): GameState

Ascends one level. Triggers monster respawn on FIRST visit with Amulet using cumulative vorpal pool.

**Behavior**:
1. Validate can ascend (not at level 1)
2. Save current level state to map (persistent)
3. Load previous level from map (depth - 1)
4. **Check Amulet respawn conditions**:
   - If `state.hasAmulet === true` AND
   - First visit to this level with Amulet (`!levelsVisitedWithAmulet.has(depth)`)
   - **Then**: Respawn monsters with cumulative vorpal pool [0, depth+3]
   - **Else**: Load level as-is (no respawning)
5. Update `levelsVisitedWithAmulet` set
6. Update player position to downstairs
7. Return updated state

**Throws**: Error if already at surface level

**Example**:
```typescript
// Player has Amulet, ascending from level 10 → 9
const newState = stairsService.ascend(gameState)

// First visit to level 9 with Amulet?
// → Monsters respawned (harder than original spawn)
// → levelsVisitedWithAmulet.add(9)

// Second visit to level 9 with Amulet?
// → Level loaded as-is (no respawning, monsters already cleared)
```

---

## Integration Notes

### The Amulet Quest

**Quest Structure** (52 total levels):

**Descent Phase** (Levels 1 → 26):
- Free bidirectional travel (can go up/down freely)
- Levels persist exactly as left
- Amulet spawns on Level 26
- Normal monster spawning via vorpal system

**Amulet Retrieval**:
```typescript
// On Level 26, pick up Amulet
newState = {
  ...state,
  hasAmulet: true,
  levelsVisitedWithAmulet: new Set()  // Reset tracking
}
```

**Return Phase** (Levels 26 → 1 with Amulet):
- **First ascent to each level**: Monsters respawn (harder)
- **Subsequent visits**: Level as-is (no respawning)
- Victory condition: Reach Level 1 with Amulet

### Monster Respawn Mechanics

**When Monsters Respawn**:
```typescript
const needsRespawn =
  isAscending &&                              // Moving up (not down)
  state.hasAmulet &&                          // Has Amulet of Yendor
  !state.levelsVisitedWithAmulet.has(depth)   // First visit with Amulet
```

**Respawn Difficulty**:
- Normal descent: Vorpal range [depth-6, depth+3]
- **Amulet ascent: Cumulative range [0, depth+3]**
  - More permissive range = harder monsters
  - Increases return journey difficulty
  - Authentic 1980 Rogue mechanic

**Example Respawn**:
```
Level 10 (first ascent with Amulet):
- Normal spawn:  Monsters from vorpalness 4-13
- Ascent spawn:  Monsters from vorpalness 0-13  (HARDER)
```

**Respawn Tracking**:
```typescript
// Game state tracks visited levels
interface GameState {
  hasAmulet: boolean                  // Player has Amulet?
  levelsVisitedWithAmulet: Set<number> // Levels already respawned
}

// First visit to level 5 with Amulet
ascend(state)  // → Respawns monsters, adds 5 to set

// Second visit to level 5 with Amulet
ascend(state)  // → No respawn (5 already in set)
```

### Level Persistence

**Full Persistence**: Levels saved exactly as left
```typescript
// Player descends 1 → 2, clears room, descends 2 → 3
// Later: Player ascends 3 → 2
// Result: Level 2 exactly as left (room still cleared, items still there)
```

**State Preserved**:
- Monster positions and HP
- Item positions
- Door states (open/closed)
- Explored tiles
- Trap states

**NOT Preserved** (reset on respawn):
- Monster list (replaced with new spawns)
- Monster HP/positions (all fresh)

### Victory Condition

```typescript
// Check for victory
if (state.currentLevel === 1 && state.hasAmulet) {
  // Victory! Player escaped with Amulet
  return { ...state, isVictory: true }
}
```

---

## Testing

**Test Files**:
- `StairsNavigationService.test.ts` - Descent, ascent, respawning, Amulet mechanics

**Coverage**: Comprehensive (canDescend/canAscend, level persistence, respawn triggers, levelsVisitedWithAmulet tracking)

---

## Technical Details

### Dungeon Depth Configuration

```typescript
state.maxDepth = 26  // Maximum dungeon depth (Rogue 1980 authentic)
```

**Level Range**: 1 (surface) to 26 (deepest)

### Respawn Implementation

**Respawn Method**:
```typescript
private respawnMonstersForLevel(level: Level, depth: number): Level {
  // Use MonsterSpawnService with normal spawn logic
  const newMonsters = this.monsterSpawnService.spawnMonsters(
    level.rooms,
    level.tiles,
    depth  // Vorpal system applies cumulative range [0, depth+3]
  )

  return {
    ...level,
    monsters: newMonsters  // Replace old monsters entirely
  }
}
```

**Why Cumulative Range?**
- Makes return journey more challenging
- Authentic Rogue mechanic (higher-level monsters on ascent)
- Risk/reward balance (Amulet retrieval = harder escape)

### State Immutability

**All operations return new state** (no mutations):
```typescript
// ✅ Correct: Return new state
return {
  ...state,
  currentLevel: newDepth,
  levels: new Map(state.levels),  // New Map instance
  levelsVisitedWithAmulet: new Set(state.levelsVisitedWithAmulet)  // New Set
}

// ❌ Wrong: Mutate state
state.currentLevel = newDepth  // NEVER do this
```

---

## Related Services

- [MonsterSpawnService](./MonsterSpawnService.md) - Respawns monsters during ascent
- [VictoryService](./VictoryService.md) - Checks victory condition (Level 1 + Amulet)
- [DungeonService](./DungeonService.md) - Generates initial 26 levels
