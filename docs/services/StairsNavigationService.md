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

### canAscend(state: GameState): boolean
Returns true if not at surface level (1).

### descend(state: GameState): GameState
Descends one level. Saves current level, loads next level. No monster respawning.

### ascend(state: GameState): GameState
Ascends one level. Triggers monster respawn on FIRST visit with Amulet using cumulative vorpal pool.

---

## Related Services
- [MonsterSpawnService](./MonsterSpawnService.md) - Respawns monsters during ascent
