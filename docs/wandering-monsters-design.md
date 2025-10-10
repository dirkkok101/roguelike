# Wandering Monster Spawn System Design

**Author**: Dirk Kok
**Date**: 2025-10-09
**Status**: Design
**Related**: [Monster Behaviour Plan](./plans/monster_behaviour_plan.md) | [MonsterSpawnService](./services/MonsterSpawnService.md)

---

## 1. Overview

### Purpose
Implement wandering monster spawns that progressively appear as the player spends time on a dungeon level, adding time pressure and tactical urgency to exploration (authentic 1980 Rogue mechanic).

### Design Goals
1. **Authentic Rogue Feel**: Match original 1980 Rogue wandering spawn behavior
2. **Time Pressure**: Discourage indefinite resting/grinding on a single level
3. **Fair Difficulty**: Spawns should challenge but not overwhelm the player
4. **Predictable Randomness**: Spawn chance increases over time but caps at reasonable limit

---

## 2. Research: Authentic Rogue Behavior

### Original Rogue (1980) Findings

From source code analysis of Decoded Rogue project:

**Spawn Mechanics**:
- Wandering monsters spawn randomly as player stays on level
- **Cannot spawn in player's current room** (prevents unfair spawns)
- Spawn in random walkable location in corridors or other rooms
- Use same monster selection table as initial level generation (level-appropriate)

**Spawn Rate**:
- Original Rogue had **~1% chance per turn** to spawn a wanderer
- No maximum cap on wanderers (could theoretically fill level)
- Player encouraged to descend quickly rather than grind

**Balance Implications**:
- Creates urgency: staying too long = more monsters
- Encourages efficient exploration and descent
- Risk/reward: stay longer for items vs. flee from accumulating monsters

---

## 3. Design Decisions

### 3.1 Spawn Chance Formula

**Base Chance**: 0.5% per turn (1 in 200 turns)
**Progressive Increase**: +0.01% per turn since last spawn
**Maximum Cap**: 5% per turn (prevents runaway spawning)

```typescript
turnsSinceLastSpawn = currentTurn - level.lastWanderingSpawnTurn
spawnChance = min(0.005 + (turnsSinceLastSpawn * 0.0001), 0.05)

if (random(0, 1) < spawnChance) {
  spawnWanderer()
}
```

**Rationale**:
- 0.5% base is conservative (half of original Rogue's 1%)
- Progressive increase ensures spawns eventually happen (no infinite stalling)
- 5% cap prevents level from being overrun

**Example Timeline**:
- Turn 0: 0.5% chance
- Turn 100: 1.5% chance (0.5% + 100 * 0.01%)
- Turn 200: 2.5% chance
- Turn 450: 5.0% chance (capped)

### 3.2 Spawn Location Rules

**Valid Spawn Locations**:
1. Must be a walkable tile (`tile.walkable === true`)
2. **Cannot be in player's current room** (authentic Rogue rule)
3. Cannot be occupied by another monster
4. Cannot be occupied by player
5. Prefer corridors and distant rooms (fair difficulty)

**Algorithm**:
```typescript
function getSpawnLocation(level: Level, playerPos: Position): Position | null {
  // Get player's current room (if any)
  const playerRoom = level.rooms.find(room =>
    isPositionInRoom(playerPos, room)
  )

  // Collect all walkable tiles NOT in player's room
  const candidates: Position[] = []
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const tile = level.tiles[y][x]
      if (!tile.walkable) continue

      const pos = { x, y }

      // Skip if in player's room
      if (playerRoom && isPositionInRoom(pos, playerRoom)) continue

      // Skip if occupied
      if (isPositionOccupied(pos, level)) continue

      candidates.push(pos)
    }
  }

  // No valid locations
  if (candidates.length === 0) return null

  // Pick random location
  return pickRandom(candidates)
}
```

**Rationale**:
- Player's room exclusion prevents unfair "monster appears behind you" moments
- Random selection across entire level creates unpredictability
- Fallback to null if no valid locations (graceful failure)

### 3.3 Monster Selection

**Rule**: Use same spawn table as initial level generation

**Implementation**:
```typescript
function spawnWanderer(level: Level, depth: number): Monster {
  // Reuse MonsterSpawnService.selectMonsterForDepth(depth)
  // This ensures level-appropriate difficulty
  return monsterSpawnService.createMonster(depth)
}
```

**Rationale**:
- Consistent difficulty with rest of level
- Reuses existing, tested spawn logic (DRY principle)
- No special "wandering monster only" table needed

### 3.4 Maximum Wanderers Per Level

**Limit**: 5 wandering monsters per level (in addition to initial spawns)

**Tracking**:
```typescript
interface Level {
  wanderingMonsterCount?: number // Track how many wanderers spawned
  lastWanderingSpawnTurn?: number // Track last spawn turn
}
```

**Algorithm**:
```typescript
function shouldSpawnWanderer(level: Level, turnCount: number): boolean {
  // Check limit
  const wandererCount = level.wanderingMonsterCount ?? 0
  if (wandererCount >= 5) return false

  // Calculate spawn chance
  const lastSpawn = level.lastWanderingSpawnTurn ?? 0
  const turnsSinceLastSpawn = turnCount - lastSpawn
  const spawnChance = Math.min(0.005 + (turnsSinceLastSpawn * 0.0001), 0.05)

  // Roll for spawn
  return random(0, 1) < spawnChance
}
```

**Rationale**:
- 5 wanderers is significant pressure without being overwhelming
- Original Rogue had no cap, but modern balance suggests limiting
- Prevents edge case of player staying 10,000 turns and level filled with monsters
- Initial spawns (10-15 monsters) + 5 wanderers = 15-20 total (reasonable)

### 3.5 Reset Conditions

**When to Reset Wanderer Count**:
- Player changes levels (up or down stairs)
- Player returns to previously visited level (fresh wanderer count)

**Implementation**:
Level data is persistent in `GameState.levels` Map, so wanderer count persists.
No reset needed - count accumulates per level permanently.

**Rationale**:
- If player returns to previous level, wanderers already spawned should still be there
- Prevents infinite wanderer farming by going up/down stairs repeatedly

---

## 4. Integration Points

### 4.1 TurnService Integration

**Call Site**: After all monster turns processed, before ending turn

```typescript
function processTurn(state: GameState): GameState {
  // ... existing turn processing (player action, monster turns)

  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  // Check for wandering monster spawn
  if (wanderingService.shouldSpawnWanderer(level, state.turnCount)) {
    const spawnLocation = wanderingService.getSpawnLocation(level, state.player.position)

    if (spawnLocation) {
      const wanderer = wanderingService.spawnWanderer(level, state.currentLevel)

      // Add to level
      level.monsters.push(wanderer)
      level.wanderingMonsterCount = (level.wanderingMonsterCount ?? 0) + 1
      level.lastWanderingSpawnTurn = state.turnCount

      // Generate atmospheric notification
      state.messages.push("You hear a faint noise in the distance...")
    }
  }

  return state
}
```

### 4.2 NotificationService Integration

**Message**: "You hear a faint noise in the distance..."

**Trigger**: Immediately after wanderer spawns (before player sees it)

**Rationale**:
- Atmospheric hint that something spawned
- Not a direct spoiler (player doesn't know exact location or type)
- Matches roguelike tradition of sound-based hints

---

## 5. Data Structures

### 5.1 Level Interface Changes

```typescript
interface Level {
  // ... existing fields
  wanderingMonsterCount?: number // Number of wanderers spawned (max 5)
  lastWanderingSpawnTurn?: number // Turn number of last wanderer spawn
}
```

**Backward Compatibility**: Optional fields, default to undefined (treated as 0)

### 5.2 WanderingMonsterService Interface

```typescript
export class WanderingMonsterService {
  constructor(
    private monsterSpawnService: MonsterSpawnService,
    private random: IRandomService
  ) {}

  /**
   * Check if a wanderer should spawn this turn
   */
  shouldSpawnWanderer(level: Level, turnCount: number): boolean

  /**
   * Get valid spawn location (not in player's room, walkable, unoccupied)
   */
  getSpawnLocation(level: Level, playerPos: Position): Position | null

  /**
   * Spawn a wandering monster at given location
   */
  spawnWanderer(level: Level, depth: number, position: Position): Monster
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**spawn-chance.test.ts**:
- [ ] Spawn chance increases over time (0.5% → 5%)
- [ ] Spawn chance caps at 5%
- [ ] No spawn when wandererCount >= 5
- [ ] Random roll determines spawn (MockRandom)

**spawn-location.test.ts**:
- [ ] Cannot spawn in player's room
- [ ] Can spawn in other rooms
- [ ] Can spawn in corridors
- [ ] Cannot spawn on occupied tiles
- [ ] Returns null if no valid locations

**spawn-monster.test.ts**:
- [ ] Uses level-appropriate monster selection
- [ ] Monster spawned at correct position
- [ ] Monster starts awake (WANDERING state)

### 6.2 Integration Tests

**wandering-integration.test.ts**:
- [ ] Wanderer spawns after N turns
- [ ] Wanderer count increments
- [ ] lastWanderingSpawnTurn updates
- [ ] Message "You hear a faint noise..." appears
- [ ] No spawn when limit reached

---

## 7. Performance Considerations

**Spawn Check Overhead**: Called once per turn
**Expected Cost**: O(1) for chance calculation, early exit most turns

**Location Search Overhead**: Only when spawn succeeds (~1% of turns)
**Expected Cost**: O(w * h) where w=width, h=height (80x22 = 1,760 tiles)
**Optimization**: Early exit when valid location found

**Impact**: Negligible - 1% of turns incur location search (< 2ms on modern hardware)

---

## 8. Balance Tuning Parameters

**Adjustable Parameters** (for playtesting):
```typescript
const SPAWN_CHANCE_BASE = 0.005        // 0.5% base chance
const SPAWN_CHANCE_INCREMENT = 0.0001  // +0.01% per turn
const SPAWN_CHANCE_CAP = 0.05          // 5% maximum
const MAX_WANDERERS_PER_LEVEL = 5      // Limit per level
```

**Playtesting Goals**:
- Players should feel time pressure by turn 200-300
- Players should not be overwhelmed by spawns
- Players should descend before hitting 5-wanderer cap

**Adjustment Scenarios**:
- Too easy: Increase `SPAWN_CHANCE_INCREMENT` to 0.0002 (faster ramp)
- Too hard: Decrease `MAX_WANDERERS_PER_LEVEL` to 3
- Too slow: Increase `SPAWN_CHANCE_BASE` to 0.01 (1% base)

---

## 9. Future Enhancements

**Potential Features** (not in initial implementation):
- [ ] Different spawn rates per depth (deeper = more frequent)
- [ ] Wanderer-specific monster types (e.g., "wandering wraith")
- [ ] Sound effects for spawn ("You hear footsteps...")
- [ ] Visual indicator (monster highlighted on first sighting)
- [ ] Achievement: "Survived 5 wanderers on one level"

---

## 10. Risk Analysis

### Risk 1: Players Camp Forever
**Probability**: Medium
**Impact**: High (breaks game balance)
**Mitigation**: 5-wanderer cap forces eventual descent

### Risk 2: Spawn Rate Too Aggressive
**Probability**: Low
**Impact**: Medium (frustrating gameplay)
**Mitigation**: Conservative 0.5% base, playtesting will tune

### Risk 3: Performance Issues (Location Search)
**Probability**: Very Low
**Impact**: Low (slight lag on spawn)
**Mitigation**: Early exit optimization, infrequent calls (1% of turns)

---

## 11. Acceptance Criteria

- [x] Design document complete with formulas and rationale
- [ ] WanderingMonsterService implemented
- [ ] TurnService integration complete
- [ ] All unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Playtesting confirms balanced difficulty
- [ ] No performance degradation (<5ms per turn average)

---

**Last Updated**: 2025-10-09
**Status**: Design Complete, Ready for Implementation
