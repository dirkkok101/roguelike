# ItemSpawnService

**Location**: `src/services/ItemSpawnService/ItemSpawnService.ts`
**Dependencies**: IRandomService, ItemData (data loader)
**Test Coverage**: Item spawning, rarity, cursed items, enchantments

---

## Purpose

Generates items for dungeon levels with rarity-based selection, cursed items, and enchantments. Caches templates for 10x performance improvement (50μs → 5μs per spawn).

---

## Public API

### spawnItem(level: number): Item
Spawns random item appropriate for dungeon level using rarity weights.

### spawnSpecificItem(type: ItemType, level: number): Item
Spawns specific item type with level-appropriate properties.

**Item Types**: Weapon, Armor, Potion, Scroll, Ring, Wand, Food, Torch, Lantern, Artifact, OilFlask, Amulet

---

## Related Services
- [DungeonService](./DungeonService.md) - Uses to populate levels with items
