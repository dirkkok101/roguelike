# ScrollService

**Location**: `src/services/ScrollService/ScrollService.ts`
**Dependencies**: IdentificationService, InventoryService, LevelService, FOVService, RandomService, DungeonService, CurseService
**Test Coverage**: All 11 scroll types, 1885 tests passing
**Status**: Complete - All scroll types implemented ✅

---

## Purpose

Implements **all 11 scroll effects** from the original Rogue: identification, enchantment, map manipulation, teleportation, monster control, and curse removal. Handles auto-identification, target validation, and complex game state modifications.

---

## Public API

### Scroll Application

#### `applyScroll(player: Player, scroll: Scroll, state: GameState, targetItemId?: string): ScrollEffectResult`
Applies scroll effect with optional item targeting.

**Returns**:
```typescript
interface ScrollEffectResult {
  player?: Player      // Updated player (status effects, enchanted items)
  state?: GameState    // Updated game state (level modifications, teleportation)
  message: string      // Effect description
  identified: boolean  // Was scroll unidentified before use?
  fizzled?: boolean    // Did scroll fail (no target, wrong location)?
  consumed: boolean    // Should scroll be removed? (false for SCARE_MONSTER)
}
```

**Process**:
1. Check if scroll is already identified
2. Validate target (if required)
3. Apply effect based on scroll type
4. Auto-identify scroll by use
5. Return result with message and state updates

---

## Scroll Types

### 1. IDENTIFY - Reveal Item Type ✅

**Requires**: Target item ID
**Effect**: Identifies the **type** of target item (not just the instance)
**Consumed**: Yes

**Example**:
```typescript
// Before: Player has "blue potion" (unidentified)
// After reading IDENTIFY on it:
//   - All "blue potions" become "Potion of Healing"
//   - state.identifiedItems: Set('HEAL')
```

**Messages**:
- Success: `"You read scroll labeled XYZZY. This is Potion of Healing!"`
- No target: `"You read scroll labeled XYZZY, but nothing happens."`

---

### 2. ENCHANT_WEAPON - Increase Weapon Bonus ✅

**Requires**: Target weapon ID
**Effect**: Increases weapon bonus by +1 (max +3)
**Consumed**: Yes

**Formula**: `damage = roll(weapon.damage) + weapon.bonus`

**Messages**:
- Success: `"You read scroll labeled ELBERETH. Long Sword glows brightly! (+1)"`
- Max enchant: `"Long Sword is already at maximum enchantment!"`

---

### 3. ENCHANT_ARMOR - Increase Armor Bonus ✅

**Requires**: Target armor ID
**Effect**: Increases armor bonus by +1 (max +3)
**Consumed**: Yes

**Formula**: `effectiveAC = armor.ac - armor.bonus` (lower AC = better)

**Messages**:
- Success: `"You read scroll labeled NR 9. Chain Mail glows with protection! [AC 4]"`
- Max enchant: `"Plate Mail is already at maximum enchantment!"`

---

### 4. TELEPORTATION - Random Teleport ✅

**Requires**: None
**Effect**: Teleport player to random walkable location on current level
**Consumed**: Yes
**State Changes**: Player position, FOV update

**Algorithm**:
1. Get all walkable tiles (no monsters, no walls)
2. Random select destination
3. Update player position
4. Recompute FOV at new location

**Messages**:
- Success: `"You read scroll labeled FOOBAR. You feel a wrenching sensation!"`
- Fizzle: `"You read scroll labeled FOOBAR, but nothing happens."` (no valid tiles)

---

### 5. CREATE_MONSTER - Spawn Monster ✅

**Requires**: None
**Effect**: Spawn random monster adjacent to player
**Consumed**: Yes
**State Changes**: Level monsters array
**Risk**: HIGH (cursed scroll - creates threat)

**Algorithm**:
1. Find empty adjacent tiles (8 directions)
2. Fizzle if no space available
3. Spawn monster appropriate for level depth
4. Add monster to level

**Messages**:
- Success: `"You read scroll labeled HACKEM MUCHE. You hear a faint cry of anguish!"`
- Fizzle: `"You read scroll labeled HACKEM MUCHE, but nothing happens."` (no space)

---

### 6. MAGIC_MAPPING - Reveal Map ✅

**Requires**: None
**Effect**: Reveal entire level layout (walls, doors, corridors, stairs)
**Consumed**: Yes
**State Changes**: Level explored tiles
**Important**: Does NOT reveal items, monsters, or traps

**Algorithm**:
1. Get all tiles on current level
2. Mark all as explored (not visible)
3. Update level.explored array
4. FOV remains unchanged

**Messages**:
- Success: `"You read scroll labeled VAS CORP BET MANI. The dungeon layout is revealed!"`

---

### 7. LIGHT - Illuminate Room ✅

**Requires**: None (must be in room, not corridor)
**Effect**: Light entire room, reveal contents
**Consumed**: Yes
**State Changes**: Room tiles marked explored AND visible

**Algorithm**:
1. Check if player in room (flood-fill detection)
2. Fizzle if in corridor
3. Mark all room tiles as explored and visible
4. Update FOV to include entire room
5. Reveal items/monsters in room

**Messages**:
- Success: `"You read scroll labeled READ ME. The room floods with light!"`
- Fizzle: `"You read scroll labeled READ ME, but you're in a corridor."`

---

### 8. HOLD_MONSTER - Freeze Monster ✅

**Requires**: Target monster ID (adjacent)
**Effect**: Freeze target monster for 3-6 turns
**Consumed**: Yes
**State Changes**: Monster status effects

**Algorithm**:
1. Find monster by target ID
2. Fizzle if no monster or not adjacent
3. Apply HELD status effect
4. Set duration = random(3, 6)
5. Monster skips all turns while held

**Messages**:
- Success: `"You read scroll labeled LOREM IPSUM. The Orc freezes in place!"`
- Fizzle: `"You read scroll labeled LOREM IPSUM, but nothing happens."` (no adjacent monster)

---

### 9. SLEEP - Curse Reader ✅

**Requires**: None
**Effect**: Put player to sleep for 4-8 turns
**Consumed**: Yes
**State Changes**: Player status effects
**Risk**: VERY HIGH (cursed scroll - defenseless)

**Algorithm**:
1. Apply SLEEPING status to player
2. Set duration = random(4, 8)
3. Player cannot act during sleep
4. Monsters continue taking turns

**Messages**:
- Success: `"You read scroll labeled XYZZY. You fall into a deep sleep!"`

---

### 10. REMOVE_CURSE - Free Cursed Items ✅

**Requires**: None (affects all equipped cursed items)
**Effect**: Remove curse from all equipped items
**Consumed**: Yes
**State Changes**: Player equipment curse flags

**Algorithm**:
1. Check if player has any cursed items
2. Fizzle if no cursed items
3. Remove curse flag from all equipped items
4. Items can now be unequipped normally

**Messages**:
- Success: `"You read scroll labeled HACKEM MUCHE. You feel as if somebody is watching over you. The Cursed Ring glows briefly."`
- Multiple items: `"Your equipment glows briefly."`
- Fizzle: `"You read scroll labeled HACKEM MUCHE, but nothing happens."` (no cursed items)

---

### 11. SCARE_MONSTER - Drop Scroll, Monsters Flee ✅

**Requires**: None
**Effect**: Drop scroll on ground, monsters avoid tile and flee if adjacent
**Consumed**: **NO** (unique - only scroll not consumed!)
**State Changes**: Scroll dropped on ground with `droppedAtTurn` tracking

**Special Mechanics**:
- NOT consumed on read (returned to DropCommand)
- Dropped at player position with turn tracking
- Monsters cannot pathfind through scare scroll tiles
- Adjacent monsters flee (FLEEING state)
- Scroll deteriorates after 100 turns

**Algorithm**:
1. Service returns `consumed: false` (unique)
2. DropCommand drops scroll at player position
3. LevelService tracks scare scroll positions
4. PathfindingService blocks tiles with scare scrolls
5. MonsterAIService checks adjacent tiles (highest priority)
6. If adjacent → trigger flee behavior
7. TurnService removes scrolls >100 turns old

**Messages**:
- Success: `"You read scroll labeled ELBERETH. You hear a loud roar and the scroll glows with an ominous light! You should drop this on the ground."`

**Integration**:
- **PathfindingService**: Monsters won't path through scare scroll tiles
- **MonsterAIService**: Adjacent monsters flee (checked before all other AI)
- **TurnService**: Removes expired scrolls (>100 turns)
- **LevelService**: `getScareScrollsOnGround()`, `hasScareScrollAt()`, `getScareScrollPositions()`

---

## Result Type

```typescript
interface ScrollEffectResult {
  player?: Player      // Updated player (status effects, enchanted items, position)
  state?: GameState    // Updated game state (level modifications, monster changes)
  message: string      // User-friendly message
  identified: boolean  // Was scroll unidentified before use?
  fizzled?: boolean    // Did scroll fail to work? (no target, wrong location)
  consumed: boolean    // Should scroll be removed? (false for SCARE_MONSTER)
}
```

**When to Use Each Field**:
- `player` - Scroll modifies player directly (SLEEP, enchantment, REMOVE_CURSE)
- `state` - Scroll modifies game state (MAGIC_MAPPING, TELEPORTATION, CREATE_MONSTER)
- `player` + `state` - Both affected (TELEPORTATION updates position + FOV)
- `fizzled` - Scroll had no effect, no turn consumed
- `consumed: false` - SCARE_MONSTER only (dropped on ground)

---

## Item Targeting

### Targeted Scrolls

**Item-Targeted**: IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR
**Monster-Targeted**: HOLD_MONSTER (adjacent monster ID)

**User Flow**:
1. Player presses `r` (read scroll)
2. UI prompts: `"Read which scroll? [a-z]"`
3. Player selects scroll
4. If scroll needs target:
   - UI prompts: `"Identify which item?"` or `"Enchant which weapon?"`
5. Command executes with `targetItemId`

**No Target Handling**: Scroll fizzles, `consumed: false`, no turn consumed

---

## State Modification Patterns

### Pattern 1: Level Modification (MAGIC_MAPPING)
```typescript
private applyMagicMapping(state: GameState): ScrollEffectResult {
  const level = state.levels.get(state.currentLevel)
  const allTiles = this.levelService.getAllTiles(level)

  const newExplored = level.explored.map(row => [...row])
  for (const tile of allTiles) {
    newExplored[tile.y][tile.x] = true
  }

  const updatedLevel = { ...level, explored: newExplored }
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, updatedLevel)

  return {
    state: { ...state, levels: updatedLevels },
    message: "The dungeon layout is revealed!",
    identified: true,
    consumed: true
  }
}
```

### Pattern 2: Player Position (TELEPORTATION)
```typescript
private applyTeleportation(state: GameState): ScrollEffectResult {
  const walkableTiles = this.levelService.getAllWalkableTiles(level)
  const targetPos = this.randomService.pickRandom(walkableTiles)

  const updatedPlayer = { ...player, position: targetPos }
  const fovResult = this.fovService.updateFOVAndExploration(targetPos, radius, level)

  return {
    player: updatedPlayer,
    state: { ...state, visibleCells: fovResult.visibleCells },
    message: "You feel a wrenching sensation!",
    identified: true,
    consumed: true
  }
}
```

### Pattern 3: Level Entity Addition (CREATE_MONSTER)
```typescript
private applyCreateMonster(state: GameState): ScrollEffectResult {
  const adjacentTiles = this.levelService.getEmptyAdjacentTiles(player.position, level)

  if (adjacentTiles.length === 0) {
    return {
      message: "Nothing happens.",
      identified: true,
      fizzled: true,
      consumed: false
    }
  }

  const spawnPos = this.randomService.pickRandom(adjacentTiles)
  const newMonster = this.dungeonService.spawnSingleMonster(spawnPos, level.depth)

  const updatedLevel = {
    ...level,
    monsters: [...level.monsters, newMonster]
  }

  return {
    state: { ...state, levels: updateLevelsMap(state.levels, updatedLevel) },
    message: "You hear a faint cry of anguish!",
    identified: true,
    consumed: true
  }
}
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
// ✅ Good: Create new objects with spread operators
const enchantedWeapon = { ...weapon, bonus: weapon.bonus + 1 }
const updatedPlayer = { ...player, inventory: [...player.inventory.filter(i => i.id !== weapon.id), enchantedWeapon] }

// ❌ Bad: Direct mutation
weapon.bonus += 1
player.inventory.push(enchantedWeapon)
```

---

## Testing

**Test Files** (One per scroll type):
- `identify-scroll.test.ts` - Item identification (13 tests)
- `enchant-scrolls.test.ts` - Weapon/armor enchantment (20 tests)
- `teleportation-scroll.test.ts` - Teleportation mechanics (15 tests)
- `create-monster-scroll.test.ts` - Monster spawning (12 tests)
- `magic-mapping-scroll.test.ts` - Map revelation (10 tests)
- `light-scroll.test.ts` - Room illumination (13 tests)
- `hold-monster-scroll.test.ts` - Monster freezing (18 tests)
- `sleep-scroll.test.ts` - Player sleep curse (14 tests)
- `remove-curse-scroll.test.ts` - Curse removal (13 tests)
- `scare-monster-scroll.test.ts` - Monster scaring (10 tests)

**Total Coverage**: 138+ tests across all scroll types

---

## Edge Cases Handled

1. **TELEPORTATION** - Fizzles if no walkable tiles available
2. **CREATE_MONSTER** - Fizzles if no adjacent space
3. **LIGHT** - Fizzles if player in corridor (not room)
4. **HOLD_MONSTER** - Fizzles if no monster at target position
5. **REMOVE_CURSE** - Fizzles if no cursed items equipped
6. **SCARE_MONSTER** - Deteriorates after 100 turns, removed by TurnService

---

## Scroll Summary Table

| Scroll | Target? | Effect | Consumed | Complexity |
|--------|---------|--------|----------|------------|
| **IDENTIFY** | Item | Reveal item type | Yes | Low |
| **ENCHANT_WEAPON** | Weapon | +1 damage bonus (max +3) | Yes | Low |
| **ENCHANT_ARMOR** | Armor | +1 AC bonus (max +3) | Yes | Low |
| **TELEPORTATION** | None | Random teleport | Yes | Low |
| **CREATE_MONSTER** | None | Spawn monster (cursed) | Yes | Low |
| **MAGIC_MAPPING** | None | Reveal level map | Yes | Medium |
| **LIGHT** | None | Illuminate room | Yes | Medium |
| **HOLD_MONSTER** | Monster | Freeze 3-6 turns | Yes | Medium |
| **SLEEP** | None | Sleep 4-8 turns (cursed) | Yes | Medium |
| **REMOVE_CURSE** | None | Remove all curses | Yes | Medium |
| **SCARE_MONSTER** | None | Drop scroll, monsters flee | **NO** | High |

---

## Related Services

- **IdentificationService** - Item name display and auto-identification
- **InventoryService** - Find items, remove/add enchanted items
- **LevelService** - Walkable tiles, room detection, scare scroll tracking
- **FOVService** - Field of view updates after teleportation/light
- **DungeonService** - Monster spawning
- **CurseService** - Curse detection and removal
- **PathfindingService** - Scare scroll avoidance
- **MonsterAIService** - Flee behavior from scare scrolls
- **TurnService** - Scare scroll deterioration

---

## Design Rationale

### Why +3 Enchantment Cap?
**Balance** - Prevents overpowered weapons/armor late game.

### Why SCARE_MONSTER Not Consumed?
**Original Rogue** - Only scroll that drops on ground for tactical positioning.

### Why 100 Turn Deterioration?
**Balance** - Prevents permanent safe zones, forces tactical use.

### Why MAGIC_MAPPING Doesn't Reveal Items/Monsters?
**Balance** - Still need exploration, maintains FOV importance.

### Why SLEEP Wake-on-Damage Not Implemented?
**Deferred** - Original Rogue didn't have this, can add later if too punishing.

---

## Dependencies Diagram

```
ScrollService
├── IdentificationService (item names)
├── InventoryService (item manipulation)
├── LevelService (walkable tiles, room detection, scare scroll tracking)
├── FOVService (visibility updates)
├── RandomService (teleport position, duration rolls)
├── DungeonService (monster spawning)
└── CurseService (curse detection/removal)
```

---

## Implementation Complete ✅

**Status**: All 11 scroll types implemented and tested
**Tests**: 1885 tests passing
**Date**: 2025-10-06

See `/docs/plans/scroll_implementation_plan.md` for complete implementation history.
