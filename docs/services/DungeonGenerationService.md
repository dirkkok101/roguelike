# DungeonGenerationService

**Location**: `src/services/DungeonGenerationService/DungeonGenerationService.ts`
**Dependencies**: IRandomService, RoomGenerationService, CorridorGenerationService, MonsterSpawnService, ItemSpawnService
**Test Coverage**: Level generation, connectivity, placement

---

## Purpose

Orchestrates procedural dungeon generation using room+corridor algorithm with MST connectivity. Handles room generation, corridor pathfinding, monster/item spawning, and stairs placement.

---

## Public API

### generateLevel(depth: number): Level
Generates complete dungeon level at specified depth using:
- Room generation (variable count)
- MST corridor generation
- Loop addition (30% chance)
- Monster spawning (vorpal system)
- Item spawning (rarity-based)
- Stairs placement (up/down)

---

## Related Services
- [RoomGenerationService](./RoomGenerationService.md) - Generates rooms
- [CorridorGenerationService](./CorridorGenerationService.md) - Connects rooms
- [MonsterSpawnService](./MonsterSpawnService.md) - Spawns monsters
- [ItemSpawnService](./ItemSpawnService.md) - Spawns items
