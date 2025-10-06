# Scroll Implementation - Analysis & Design

**Version**: 1.0
**Date**: 2025-10-06
**Status**: Planning Phase
**Related Docs**: [Items](../game-design/05-items.md) | [Identification](../game-design/07-identification.md) | [ScrollService](../services/ScrollService.md)

---

## Executive Summary

This document provides a comprehensive analysis and design for implementing all 11 scroll types in the ASCII Roguelike. Currently, only 3 scroll types are implemented (IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR). We need to implement the remaining 8 scroll types while maintaining SOLID principles and the existing architecture.

**Current State**: 3/11 scroll types implemented (27%)
**Target State**: 11/11 scroll types fully functional (100%)

---

## Table of Contents

1. [Current Implementation Analysis](#1-current-implementation-analysis)
2. [Scroll Type Specifications](#2-scroll-type-specifications)
3. [Architecture & Dependencies](#3-architecture--dependencies)
4. [Implementation Phases](#4-implementation-phases)
5. [Testing Strategy](#5-testing-strategy)
6. [Design Decisions](#6-design-decisions)

---

## 1. Current Implementation Analysis

### 1.1 What's Already Built

**ScrollService** (`src/services/ScrollService/ScrollService.ts`):
- ✅ Core architecture in place
- ✅ Dependency injection (IdentificationService, InventoryService)
- ✅ Result type pattern (`ScrollEffectResult`)
- ✅ Auto-identification on use
- ✅ Item targeting system
- ✅ Immutability maintained

**Implemented Scroll Types** (3/11):
1. ✅ **IDENTIFY** - Reveals item type (requires target)
2. ✅ **ENCHANT_WEAPON** - +1 weapon bonus (requires target, max +3)
3. ✅ **ENCHANT_ARMOR** - +1 armor bonus (requires target, max +3)

**Supporting Infrastructure**:
- ✅ ReadScrollCommand orchestrates scroll usage
- ✅ IdentificationService handles unidentified scroll names
- ✅ ScrollType enum defines all 11 types (core.ts:308-320)
- ✅ items.json has all 11 scroll definitions with labels
- ✅ Tests for implemented scrolls (identify-scroll.test.ts, enchant-scrolls.test.ts)

### 1.2 What Needs Implementation

**Remaining Scroll Types** (8/11):

| Scroll | Effect | Complexity | Dependencies |
|--------|--------|------------|--------------|
| **MAGIC_MAPPING** | Reveal entire level map | Medium | Level exploration state |
| **TELEPORTATION** | Move player to random location | Low | MovementService, LevelService |
| **REMOVE_CURSE** | Free cursed equipment | Low | Curse system (not yet implemented) |
| **CREATE_MONSTER** | Spawn monster nearby | Low | DungeonService (monster spawning) |
| **SCARE_MONSTER** | Drop scroll, monsters flee | High | Monster AI (fear state), positioning |
| **LIGHT** | Light current room | Medium | Room detection, FOV update |
| **SLEEP** | Put reader to sleep | Low | Status effect system (not yet implemented) |
| **HOLD_MONSTER** | Freeze adjacent monsters | Medium | Monster state (frozen/held) |

### 1.3 Missing Systems Analysis

Several scrolls require systems that don't exist yet:

**Status Effects System** (HIGH PRIORITY):
- Needed for: SLEEP (self), confusion (potions)
- Would track: Confused, Sleeping, Blinded, Hasted, Held
- Turn-based duration tracking
- Effect on player input / monster AI

**Curse System** (MEDIUM PRIORITY):
- Needed for: REMOVE_CURSE, cursed items
- Equipment with `cursed: boolean` flag
- Prevent unequipping cursed items
- Visual indicator for cursed items

**Monster State Extensions** (MEDIUM PRIORITY):
- Needed for: HOLD_MONSTER, SCARE_MONSTER
- Add states: HELD (frozen), FLEEING (scared)
- Duration tracking
- AI behavior modifications

**Room Detection** (LOW PRIORITY):
- Needed for: LIGHT scroll
- Identify which room player is in
- Flood-fill room boundaries
- Already exists in dungeon generation, needs exposure

---

## 2. Scroll Type Specifications

### 2.1 Already Implemented

#### IDENTIFY
```typescript
Type: Targeted (requires item selection)
Effect: Reveals true nature of target item (type-wide identification)
Message: "You read scroll labeled XYZZY. This is Potion of Healing!"
Dependencies: IdentificationService, InventoryService
Risk: None
```

#### ENCHANT_WEAPON
```typescript
Type: Targeted (requires weapon selection)
Effect: Increases weapon bonus by +1 (max +3)
Formula: damage = roll(weapon.damage) + weapon.bonus
Message: "You read scroll labeled ELBERETH. Long Sword glows brightly! (+1)"
Dependencies: InventoryService
Risk: None (beneficial only)
Max Cap: +3 enchantment limit
```

#### ENCHANT_ARMOR
```typescript
Type: Targeted (requires armor selection)
Effect: Increases armor bonus by +1 (max +3)
Formula: effectiveAC = armor.ac - armor.bonus (lower is better)
Message: "You read scroll labeled NR 9. Chain Mail glows with protection! [AC 4]"
Dependencies: InventoryService
Risk: None (beneficial only)
Max Cap: +3 enchantment limit
```

---

### 2.2 Needs Implementation - Simple (Low Complexity)

#### TELEPORTATION
```typescript
Type: Instant (no target)
Effect: Teleport player to random walkable location on current level
Rogue Original: "You feel a pull, then a mighty wrenching!" (teleport message)
Algorithm:
  1. Get all walkable tiles on current level
  2. Filter out tiles with monsters
  3. Random select from valid tiles
  4. Update player position
  5. Recompute FOV at new location
Message: "You read scroll labeled FOOBAR. You feel a wrenching sensation!"
Dependencies: LevelService (find walkable tiles), FOVService (recompute)
Risk: Can teleport into danger (monster rooms, surrounded)
Strategy: Emergency escape, but risky
```

#### CREATE_MONSTER
```typescript
Type: Instant (no target)
Effect: Spawn a random monster adjacent to player
Rogue Original: "You hear a faint cry of anguish in the distance"
Algorithm:
  1. Find all empty walkable adjacent tiles (8 directions)
  2. If none available, scroll fizzles
  3. Select random adjacent position
  4. Spawn monster appropriate for current level
  5. Monster starts WANDERING (default state)
Message: "You read scroll labeled HACKEM MUCHE. You hear a faint cry of anguish!"
Dependencies: DungeonService (monster spawning), LevelService (adjacent tiles)
Risk: HIGH - Creates new threat (cursed scroll)
Strategy: Almost never useful (avoid reading unidentified scrolls in combat)
```

---

### 2.3 Needs Implementation - Medium (Moderate Complexity)

#### MAGIC_MAPPING
```typescript
Type: Instant (no target)
Effect: Reveal entire level layout (walls, doors, corridors, stairs)
Rogue Original: "Oh, now this scroll has a map on it"
Important: Does NOT reveal items, monsters, or traps
Algorithm:
  1. Iterate through all tiles on current level
  2. Mark all floor/wall/door/stairs tiles as explored
  3. Update level.exploredTiles set
  4. Do NOT update FOV (only reveals map, not visibility)
  5. Monsters still only visible in FOV
Message: "You read scroll labeled VAS CORP BET MANI. The dungeon layout is revealed!"
Dependencies: Level state (exploredTiles)
Risk: None (beneficial only)
Strategy: Extremely valuable - find stairs, secret rooms, plan routes
Visual: Explored tiles render dimmed (gray) until player enters FOV
```

#### LIGHT
```typescript
Type: Instant (no target)
Effect: Light the entire room player is currently in
Rogue Original: "The room is lit by a shimmering blue light"
Algorithm:
  1. Detect which room player is in (flood-fill from player position)
  2. Mark all tiles in room as explored AND visible
  3. Reveal items/monsters in room
  4. Update FOV to include entire room
Message: "You read scroll labeled READ ME. The room floods with light!"
Failure: "You read scroll labeled READ ME, but you're in a corridor." (no room)
Dependencies: Room detection (flood-fill), FOVService
Risk: None (beneficial), but useless in corridors
Strategy: Useful in dark rooms with unknown threats
```

#### HOLD_MONSTER
```typescript
Type: Targeted (requires adjacent monster)
Effect: Freeze target monster for 3-6 turns
Rogue Original: "The monster freezes in place"
Algorithm:
  1. Player selects adjacent monster (direction prompt)
  2. If no monster adjacent, scroll fizzles
  3. Apply HELD status to monster
  4. Set heldTurns = random(3, 6)
  5. Monster skips all turns while held
  6. Decrement heldTurns each monster turn
Message: "You read scroll labeled LOREM IPSUM. The Orc freezes in place!"
Failure: "You read scroll labeled LOREM IPSUM, but nothing happens." (no adjacent monster)
Dependencies: Monster state (HELD status), turn tracking
Risk: None (beneficial only)
Strategy: Tactical - freeze dangerous monster, escape or attack safely
MonsterAI: Skip turn if monster.state === HELD and heldTurns > 0
```

---

### 2.4 Needs Implementation - Complex (High Complexity)

#### SCARE_MONSTER
```typescript
Type: Special (drop scroll on ground)
Effect: Monsters cannot move onto tile with scroll, flee if adjacent
Rogue Original: "You hear maniacal laughter in the distance"
Important: This scroll is NOT consumed on read - it's dropped on ground!
Algorithm:
  1. When read, scroll is NOT removed from inventory
  2. Instead, drop scroll at player's current position
  3. Mark tile as "has scare scroll" (special terrain flag)
  4. Monsters cannot pathfind through this tile
  5. Adjacent monsters switch to FLEEING behavior
  6. Scroll can be picked up and moved
  7. Scroll deteriorates after 100 turns on ground (turns to dust)
Message: "You read scroll labeled ELBERETH. You hear maniacal laughter and drop the scroll!"
Dependencies:
  - Monster AI (FLEEING state)
  - Pathfinding (tile blocking)
  - Item on ground state
  - Turn-based deterioration tracking
Risk: None (defensive tool)
Strategy: Drop at doorway to create safe zone, block pursuit
Special: Only scroll that isn't consumed on use
```

#### SLEEP
```typescript
Type: Instant (affects reader - cursed scroll)
Effect: Put player to sleep for 4-8 turns (cannot act)
Rogue Original: "You fall asleep and cannot move!"
Algorithm:
  1. Apply SLEEPING status to player
  2. Set sleepTurns = random(4, 8)
  3. Player cannot input commands (all inputs ignored)
  4. Monster turns continue (very dangerous!)
  5. Player wakes if damaged (optional mercy mechanic)
  6. Decrement sleepTurns each turn
Message: "You read scroll labeled XYZZY. You fall into a deep sleep!"
Dependencies: Player status effects (SLEEPING), input blocking
Risk: VERY HIGH - Defenseless for 4-8 turns
Strategy: Never read unidentified scrolls in dangerous situations
Death Risk: High - monsters get free attacks
Wake on Damage: Recommended mercy rule (Rogue didn't have this, but it's brutal)
```

#### REMOVE_CURSE
```typescript
Type: Targeted (requires cursed equipment) OR Instant (all equipped cursed items)
Effect: Remove curse from equipment, allowing removal
Rogue Original: "You feel as if somebody is watching over you"
Prerequisites: REQUIRES curse system implementation first
Algorithm (Option A - Targeted):
  1. Prompt for equipment slot
  2. If item is cursed, remove curse flag
  3. Item can now be unequipped normally
Algorithm (Option B - Instant, simpler):
  1. Remove curse from ALL equipped items
  2. More generous, easier to implement
Message: "You read scroll labeled HACKEM MUCHE. You feel as if somebody is watching over you."
No Effect: "You read scroll labeled HACKEM MUCHE, but nothing happens." (no cursed items)
Dependencies: Curse system (cursed flag on equipment), equipment state
Risk: None (beneficial only)
Strategy: Essential for recovering from cursed item mishaps
Curse System Needed:
  - Equipment.cursed: boolean flag
  - Prevent unequip if cursed: true
  - Visual indicator in inventory
  - Cursed items from negative enchantments or random spawns
```

---

## 3. Architecture & Dependencies

### 3.1 Service Layer Integration

**ScrollService Dependencies** (Current + Planned):

```typescript
export class ScrollService {
  constructor(
    // EXISTING
    private identificationService: IdentificationService,
    private inventoryService: InventoryService,

    // NEW - REQUIRED FOR SCROLL IMPLEMENTATION
    private levelService: LevelService,        // Teleportation, room detection
    private fovService: FOVService,            // Magic mapping, light, teleportation FOV update
    private dungeonService: DungeonService,    // Create monster
    private randomService: IRandomService,     // Teleportation target, monster spawning, sleep duration

    // NEW - OPTIONAL (for advanced scrolls)
    private monsterAIService?: MonsterAIService,  // Scare monster (FLEEING state)
    private statusEffectService?: StatusEffectService // Sleep, hold monster (if we build this)
  ) {}
}
```

### 3.2 New Services Needed

#### StatusEffectService (NEW - High Priority)

```typescript
export enum StatusEffect {
  CONFUSED = 'CONFUSED',
  SLEEPING = 'SLEEPING',
  BLINDED = 'BLINDED',
  HASTED = 'HASTED',
  HELD = 'HELD',
  FLEEING = 'FLEEING',
}

export interface StatusEffectState {
  effect: StatusEffect
  duration: number // turns remaining
  source: string // "Scroll of Sleep", "Potion of Confusion"
}

export class StatusEffectService {
  // Apply status effect
  applyEffect(target: Player | Monster, effect: StatusEffect, duration: number): Player | Monster

  // Tick status effects (decrement duration)
  tickEffects(target: Player | Monster): { target: Player | Monster, expiredEffects: StatusEffect[] }

  // Check if target has effect
  hasEffect(target: Player | Monster, effect: StatusEffect): boolean

  // Remove effect immediately
  removeEffect(target: Player | Monster, effect: StatusEffect): Player | Monster
}
```

**Why Needed**: SLEEP scroll, HOLD_MONSTER scroll, potion effects (confusion, blindness)

**Scope**: Broader than scrolls - affects potions, wands, monster abilities

**Priority**: HIGH - Enables multiple scroll types and potion effects

---

#### CurseService (NEW - Medium Priority)

```typescript
export interface CursedItem extends Weapon | Armor | Ring {
  cursed: boolean
  curseStrength?: number // -1, -2, -3 (negative enchantment)
}

export class CurseService {
  // Check if item is cursed
  isCursed(item: Item): boolean

  // Apply curse to item
  curseItem(item: Item, strength?: number): Item

  // Remove curse from item
  removeCurse(item: Item): Item

  // Can player unequip cursed item?
  canUnequip(item: Item): { allowed: boolean, reason?: string }
}
```

**Why Needed**: REMOVE_CURSE scroll, cursed items mechanic

**Scope**: Equipment system extension

**Priority**: MEDIUM - Only needed for REMOVE_CURSE and cursed item generation

---

### 3.3 Existing Services to Extend

#### LevelService

**Current**: Basic level utilities (`getSpawnPosition`)

**Needs**:
```typescript
// Find all walkable tiles on level
getAllWalkableTiles(level: Level): Position[]

// Find empty adjacent tiles (no monsters)
getEmptyAdjacentTiles(position: Position, level: Level): Position[]

// Get room tiles (flood-fill from position)
getRoomTiles(position: Position, level: Level): Position[]

// Is position inside a room? (vs corridor)
isInRoom(position: Position, level: Level): boolean
```

#### MonsterAIService / Monster State

**Current**: AI behaviors (SMART, SIMPLE, GREEDY, ERRATIC, THIEF, STATIONARY, COWARD)

**Needs**:
```typescript
// Monster state additions
export interface Monster {
  // ... existing fields
  statusEffects: StatusEffectState[]  // NEW
  heldTurns?: number                  // HOLD_MONSTER duration
  scaredTurns?: number                // SCARE_MONSTER duration
}

// AI behavior modifications
processMonsterTurn(monster: Monster, player: Player, level: Level): MonsterAction {
  // Skip turn if HELD
  if (hasStatusEffect(monster, StatusEffect.HELD)) {
    return { type: 'WAIT' }
  }

  // Flee if FLEEING (scared)
  if (hasStatusEffect(monster, StatusEffect.FLEEING)) {
    return fleeFromPlayer(monster, player)
  }

  // ... existing AI logic
}
```

---

## 4. Implementation Phases

### Phase 1: Foundation (Prerequisite Systems)

**Goal**: Build missing infrastructure needed for scroll effects

**Tasks**:

1. **StatusEffectService** (NEW SERVICE)
   - [ ] Create `StatusEffectService.ts`
   - [ ] Define `StatusEffect` enum and `StatusEffectState` interface
   - [ ] Implement `applyEffect`, `tickEffects`, `hasEffect`, `removeEffect`
   - [ ] Add `statusEffects: StatusEffectState[]` to Player and Monster interfaces
   - [ ] Write comprehensive tests (status-effects.test.ts)

2. **LevelService Extensions**
   - [ ] Implement `getAllWalkableTiles(level: Level): Position[]`
   - [ ] Implement `getEmptyAdjacentTiles(position: Position, level: Level): Position[]`
   - [ ] Implement `getRoomTiles(position: Position, level: Level): Position[]`
   - [ ] Implement `isInRoom(position: Position, level: Level): boolean`
   - [ ] Write tests for new methods

3. **MonsterAIService Extensions**
   - [ ] Add HELD status check (skip turn if held)
   - [ ] Add FLEEING status check (flee from player)
   - [ ] Implement `fleeFromPlayer(monster, player)` pathfinding
   - [ ] Write tests for new behaviors

**Deliverable**: Infrastructure ready for scroll implementation

**Estimated Effort**: 3-4 tasks, ~200 lines of code, ~150 lines of tests

---

### Phase 2: Simple Scrolls (Low Complexity)

**Goal**: Implement scrolls that use existing or Phase 1 infrastructure

**Tasks**:

4. **TELEPORTATION Scroll**
   - [ ] Add `applyTeleportation()` method to ScrollService
   - [ ] Use `LevelService.getAllWalkableTiles()` to find valid targets
   - [ ] Random select position, update player.position
   - [ ] Recompute FOV at new location
   - [ ] Add message: "You feel a wrenching sensation!"
   - [ ] Write tests (teleportation-scroll.test.ts)

5. **CREATE_MONSTER Scroll**
   - [ ] Add `applyCreateMonster()` method to ScrollService
   - [ ] Use `LevelService.getEmptyAdjacentTiles()` to find spawn location
   - [ ] Use `DungeonService.spawnMonster()` to create monster
   - [ ] Add message: "You hear a faint cry of anguish!"
   - [ ] Write tests (create-monster-scroll.test.ts)

**Deliverable**: 2 additional scrolls functional (5/11 total)

**Estimated Effort**: 2 tasks, ~80 lines of code, ~60 lines of tests

---

### Phase 3: Medium Scrolls (Moderate Complexity)

**Goal**: Implement scrolls requiring map manipulation and room detection

**Tasks**:

6. **MAGIC_MAPPING Scroll**
   - [ ] Add `applyMagicMapping()` method to ScrollService
   - [ ] Iterate all tiles, mark as explored (do NOT mark as visible)
   - [ ] Update `level.exploredTiles` set with all floor/wall/door tiles
   - [ ] Add message: "The dungeon layout is revealed!"
   - [ ] Write tests (magic-mapping-scroll.test.ts)

7. **LIGHT Scroll**
   - [ ] Add `applyLight()` method to ScrollService
   - [ ] Use `LevelService.getRoomTiles()` to find current room
   - [ ] If in corridor, scroll fizzles ("you're in a corridor")
   - [ ] Mark all room tiles as explored AND visible
   - [ ] Update FOV to include entire room
   - [ ] Add message: "The room floods with light!"
   - [ ] Write tests (light-scroll.test.ts)

8. **HOLD_MONSTER Scroll**
   - [ ] Add `applyHoldMonster()` method to ScrollService
   - [ ] Prompt for direction (UI integration needed)
   - [ ] Apply HELD status to target monster
   - [ ] Set `monster.heldTurns = random(3, 6)`
   - [ ] Monster AI skips turn while held
   - [ ] Add message: "The [Monster] freezes in place!"
   - [ ] Write tests (hold-monster-scroll.test.ts)

**Deliverable**: 3 additional scrolls functional (8/11 total)

**Estimated Effort**: 3 tasks, ~120 lines of code, ~90 lines of tests

---

### Phase 4: Complex Scrolls (High Complexity)

**Goal**: Implement scrolls with special mechanics or new systems

**Tasks**:

9. **SLEEP Scroll (Cursed)**
   - [ ] Add `applySleep()` method to ScrollService
   - [ ] Apply SLEEPING status to player
   - [ ] Set `player.statusEffects = [{ effect: SLEEPING, duration: random(4, 8) }]`
   - [ ] Block player input in `InputHandler` if SLEEPING
   - [ ] Monster turns continue (dangerous!)
   - [ ] Optional: Wake on damage (mercy mechanic)
   - [ ] Add message: "You fall into a deep sleep!"
   - [ ] Write tests (sleep-scroll.test.ts)

10. **SCARE_MONSTER Scroll (Special)**
    - [ ] Add `applyScareMonster()` method to ScrollService
    - [ ] Drop scroll at player position (do NOT consume)
    - [ ] Mark tile as "has scare scroll"
    - [ ] Add `scareScrollPosition?: Position` to Level state
    - [ ] Modify pathfinding to avoid scare scroll tile
    - [ ] Adjacent monsters get FLEEING status
    - [ ] Scroll deteriorates after 100 turns (turn to dust)
    - [ ] Add message: "You hear maniacal laughter and drop the scroll!"
    - [ ] Write tests (scare-monster-scroll.test.ts)

**Deliverable**: 2 additional scrolls functional (10/11 total)

**Estimated Effort**: 2 tasks, ~150 lines of code, ~100 lines of tests

---

### Phase 5: Curse System & Final Scroll

**Goal**: Implement curse system and REMOVE_CURSE scroll

**Tasks**:

11. **CurseService** (NEW SERVICE)
    - [ ] Create `CurseService.ts`
    - [ ] Add `cursed: boolean` flag to Weapon, Armor, Ring interfaces
    - [ ] Implement `isCursed()`, `curseItem()`, `removeCurse()`
    - [ ] Implement `canUnequip()` (check cursed flag)
    - [ ] Write tests (curse-service.test.ts)

12. **Unequip Command Extensions**
    - [ ] Update UnequipCommand to check `CurseService.canUnequip()`
    - [ ] Block unequip if cursed, show message "The [item] is cursed!"
    - [ ] Write tests for cursed equipment prevention

13. **REMOVE_CURSE Scroll**
    - [ ] Add `applyRemoveCurse()` method to ScrollService
    - [ ] Remove curse from all equipped items (simpler than targeted)
    - [ ] Use `CurseService.removeCurse()` on each equipment slot
    - [ ] Add message: "You feel as if somebody is watching over you."
    - [ ] Write tests (remove-curse-scroll.test.ts)

14. **Cursed Item Generation**
    - [ ] Update DungeonService to spawn cursed items (5% chance?)
    - [ ] Negative enchantments (-1, -2, -3) automatically cursed
    - [ ] Add visual indicator in inventory (red color, "cursed" label)

**Deliverable**: All 11 scrolls functional (11/11 total) + curse system

**Estimated Effort**: 4 tasks, ~180 lines of code, ~120 lines of tests

---

### Phase 6: Polish & Integration

**Goal**: UI improvements, edge cases, documentation

**Tasks**:

15. **UI Enhancements**
    - [ ] Add direction prompts for HOLD_MONSTER (select adjacent monster)
    - [ ] Add item selection UI for targeted scrolls (already exists)
    - [ ] Add visual indicator for scare scroll on ground
    - [ ] Add status effect icons in player stats (sleeping, confused, etc.)

16. **Edge Case Handling**
    - [ ] TELEPORTATION into walls (should never happen with proper validation)
    - [ ] CREATE_MONSTER with no adjacent space (scroll fizzles)
    - [ ] LIGHT in corridor (scroll fizzles)
    - [ ] SCARE_MONSTER deterioration tracking
    - [ ] SLEEP wake-on-damage mechanic

17. **Documentation**
    - [ ] Update docs/services/ScrollService.md with all 11 scroll types
    - [ ] Update docs/game-design/05-items.md with complete scroll table
    - [ ] Create scroll effect reference table
    - [ ] Add gameplay tips for each scroll type

**Deliverable**: Production-ready scroll system with full documentation

**Estimated Effort**: 3 tasks, documentation updates

---

## 5. Testing Strategy

### 5.1 Test Organization

**Pattern**: One test file per scroll type (scenario-based testing)

```
src/services/ScrollService/
├── ScrollService.ts
├── identify-scroll.test.ts           ✅ EXISTING
├── enchant-scrolls.test.ts           ✅ EXISTING
├── teleportation-scroll.test.ts      ⬜ NEW
├── create-monster-scroll.test.ts     ⬜ NEW
├── magic-mapping-scroll.test.ts      ⬜ NEW
├── light-scroll.test.ts              ⬜ NEW
├── hold-monster-scroll.test.ts       ⬜ NEW
├── sleep-scroll.test.ts              ⬜ NEW
├── scare-monster-scroll.test.ts      ⬜ NEW
├── remove-curse-scroll.test.ts       ⬜ NEW
└── index.ts
```

### 5.2 Test Coverage Goals

**ScrollService**: Aim for 100% coverage (pure logic)

**Key Test Scenarios per Scroll**:

1. **Successful Effect** - Scroll works as intended
2. **No Target / Invalid Target** - Scroll fizzles (targeted scrolls)
3. **Auto-Identification** - Scroll becomes identified after use
4. **Immutability** - Original state unchanged, new objects returned
5. **Edge Cases** - Boundary conditions, empty spaces, etc.

### 5.3 MockRandom Usage

**Deterministic Testing** for random effects:

```typescript
describe('TELEPORTATION Scroll', () => {
  let mockRandom: MockRandom
  let service: ScrollService

  beforeEach(() => {
    // Predetermine random teleportation target (index 5 of walkable tiles)
    mockRandom = new MockRandom([5])
    service = new ScrollService(
      identificationService,
      inventoryService,
      levelService,
      fovService,
      dungeonService,
      mockRandom
    )
  })

  test('teleports player to predetermined random location', () => {
    const result = service.applyScroll(player, teleportScroll, state)

    // MockRandom returns index 5, so player should be at walkableTiles[5]
    expect(result.player.position).toEqual({ x: 15, y: 8 })
    expect(result.message).toContain('wrenching sensation')
  })
})
```

### 5.4 Integration Tests

**ReadScrollCommand Integration**:

Test full flow: inventory → scroll usage → state update → FOV update

```typescript
describe('ReadScrollCommand - Integration', () => {
  test('MAGIC_MAPPING reveals entire level', () => {
    const command = new ReadScrollCommand(scrollId, services...)
    const result = command.execute(state)

    // Check that all floor tiles are now explored
    const floorTiles = getAllFloorTiles(result.currentLevel)
    floorTiles.forEach(pos => {
      expect(result.currentLevel.exploredTiles.has(posKey(pos))).toBe(true)
    })
  })
})
```

---

## 6. Design Decisions

### 6.1 Status Effects: Centralized Service vs Local State

**Decision**: Create centralized `StatusEffectService`

**Rationale**:
- **DRY**: Many scrolls, potions, wands, monster abilities use status effects
- **Consistency**: Single source of truth for effect duration, stacking rules
- **Testability**: Easier to test status effects in isolation
- **Future-Proof**: Supports expansion (paralysis, disease, levitation, etc.)

**Alternative Considered**: Add status effect logic directly to ScrollService
- ❌ Violates Single Responsibility
- ❌ Code duplication when potions need same effects
- ❌ Harder to extend

---

### 6.2 REMOVE_CURSE: Targeted vs Instant

**Decision**: Instant (remove curse from ALL equipped items)

**Rationale**:
- **Simplicity**: No UI for selecting equipment slot
- **Generosity**: More player-friendly (original Rogue was very punishing)
- **Rarity**: REMOVE_CURSE is uncommon, should be powerful when found
- **Implementation**: Simpler, faster to implement

**Alternative Considered**: Targeted (select which item to uncurse)
- ❌ Requires equipment selection UI
- ❌ More complex, slower to implement
- ✅ More strategic (save scroll for worst cursed item)
- ✅ Closer to original Rogue

**Verdict**: Start with instant, can add targeting later if desired

---

### 6.3 SLEEP Scroll: Wake on Damage?

**Decision**: Implement wake-on-damage mercy mechanic

**Rationale**:
- **Fairness**: Original Rogue SLEEP was brutally punishing (often = death)
- **Modern Design**: Most modern roguelikes wake on damage
- **Playtesting**: Can disable if too forgiving
- **Balance**: Still dangerous (1-2 free attacks before waking)

**Alternative Considered**: No wake-on-damage (original Rogue behavior)
- ❌ Sleep for 4-8 turns = almost guaranteed death in combat
- ❌ Extremely punishing, frustrating for new players
- ✅ Authentic to original Rogue

**Implementation**: Add flag `wakeOnDamage: boolean` to StatusEffect, enable for SLEEPING

---

### 6.4 SCARE_MONSTER: Deterioration Timing

**Decision**: 100 turns before scroll turns to dust

**Rationale**:
- **Balance**: Prevents permanent safe zones
- **Original Rogue**: Scroll deteriorated over time
- **Strategy**: Forces tactical use (not "set and forget")
- **Dungeon Tempo**: 100 turns ≈ clearing 1-2 rooms

**Alternative Considered**: Permanent scroll
- ❌ Too powerful (create unkillable fortress)
- ❌ Breaks game balance

**Implementation**: Track `turnDropped` on scroll item, check `currentTurn - turnDropped >= 100`

---

### 6.5 MAGIC_MAPPING: Reveal Items/Monsters?

**Decision**: NO - only reveal map layout (floors, walls, doors, stairs)

**Rationale**:
- **Original Rogue**: Only revealed map, not items/monsters
- **Balance**: Still need to explore to find loot
- **FOV System**: Monsters only visible in FOV (core mechanic)
- **Strategy**: Provides strategic intel without removing exploration

**Alternative Considered**: Reveal items too
- ❌ Too powerful (removes exploration)
- ❌ Trivializes item hunting

---

### 6.6 Scroll Rarity Balance

**Current Distribution** (from items.json):

| Rarity | Count | Scrolls |
|--------|-------|---------|
| Common | 3 | IDENTIFY, TELEPORTATION, LIGHT |
| Uncommon | 6 | ENCHANT_WEAPON, ENCHANT_ARMOR, MAGIC_MAPPING, REMOVE_CURSE, CREATE_MONSTER, HOLD_MONSTER |
| Rare | 2 | SCARE_MONSTER, SLEEP |

**Design Notes**:
- **Beneficial scrolls** (IDENTIFY, MAGIC_MAPPING, ENCHANT_*) = Common/Uncommon
- **Cursed scrolls** (CREATE_MONSTER, SLEEP) = Uncommon/Rare (less common = less danger)
- **Tactical scrolls** (SCARE_MONSTER, HOLD_MONSTER) = Rare (powerful utility)

**Balance Recommendation**: Current distribution looks good, no changes needed

---

### 6.7 Dependency Injection Strategy

**Decision**: Inject all dependencies via constructor, mark some as optional

```typescript
export class ScrollService {
  constructor(
    // REQUIRED (core scrolls)
    private identificationService: IdentificationService,
    private inventoryService: InventoryService,
    private levelService: LevelService,
    private fovService: FOVService,
    private randomService: IRandomService,

    // OPTIONAL (advanced scrolls, may not exist yet)
    private dungeonService?: DungeonService,
    private monsterAIService?: MonsterAIService,
    private statusEffectService?: StatusEffectService,
    private curseService?: CurseService
  ) {}
}
```

**Rationale**:
- **Incremental Implementation**: Can implement scrolls in phases as dependencies become available
- **Graceful Degradation**: Scrolls requiring missing services can show "not yet implemented" message
- **Testability**: Can mock dependencies or pass `undefined` in tests
- **SOLID**: Dependency Inversion Principle (depend on interfaces, not concrete implementations)

---

## 7. Implementation Checklist

### Phase 1: Foundation ✅ = Complete | ⬜ = Pending

- [ ] Create StatusEffectService
  - [ ] Define StatusEffect enum
  - [ ] Define StatusEffectState interface
  - [ ] Implement applyEffect()
  - [ ] Implement tickEffects()
  - [ ] Implement hasEffect()
  - [ ] Implement removeEffect()
  - [ ] Write tests

- [ ] Extend LevelService
  - [ ] Implement getAllWalkableTiles()
  - [ ] Implement getEmptyAdjacentTiles()
  - [ ] Implement getRoomTiles()
  - [ ] Implement isInRoom()
  - [ ] Write tests

- [ ] Extend MonsterAIService
  - [ ] Add HELD status check
  - [ ] Add FLEEING behavior
  - [ ] Write tests

### Phase 2: Simple Scrolls

- [ ] Implement TELEPORTATION
- [ ] Implement CREATE_MONSTER

### Phase 3: Medium Scrolls

- [ ] Implement MAGIC_MAPPING
- [ ] Implement LIGHT
- [ ] Implement HOLD_MONSTER

### Phase 4: Complex Scrolls

- [ ] Implement SLEEP
- [ ] Implement SCARE_MONSTER

### Phase 5: Curse System

- [ ] Create CurseService
- [ ] Extend Unequip Command
- [ ] Implement REMOVE_CURSE
- [ ] Add cursed item generation

### Phase 6: Polish

- [ ] UI enhancements
- [ ] Edge case handling
- [ ] Documentation updates

---

## 8. Success Metrics

**Completion Criteria**:

- ✅ All 11 scroll types functional
- ✅ 100% test coverage for ScrollService
- ✅ All scrolls auto-identify on use
- ✅ Immutability maintained (no state mutation)
- ✅ Documentation updated (services, game design)
- ✅ No regressions (existing scrolls still work)

**Quality Gates**:

- All tests passing (`npm test`)
- No TypeScript errors (`npm run type-check`)
- Code coverage >80% (`npm run test:coverage`)
- Architecture review passed (no logic in commands)

---

## 9. Future Enhancements (Post-v1)

**Additional Scroll Types** (not in original Rogue):

- **ENCHANT_RING** - Increase ring bonus
- **DETECT_TRAPS** - Reveal all traps on level
- **DETECT_TREASURE** - Reveal all valuable items
- **SUMMON_ELEMENTAL** - Spawn friendly elemental ally
- **WORD_OF_RECALL** - Instant return to town (if town added)
- **GENOCIDE** - Remove all monsters of one type from game

**System Enhancements**:

- **Stacking Rules**: Can status effects stack? (2x confusion = longer duration?)
- **Resistance System**: Can player resist status effects? (high level, rings, etc.)
- **Scroll Combining**: Combine multiple scrolls for stronger effects?
- **Scroll Burning**: Fire damage destroys scrolls in inventory?

---

## 10. References

**Game Design Documentation**:
- [Items Design](../game-design/05-items.md) - Scroll types and effects
- [Identification System](../game-design/07-identification.md) - Unidentified scroll mechanics

**Service Documentation**:
- [ScrollService](../services/ScrollService.md) - Current implementation
- [IdentificationService](../services/IdentificationService.md) - Item identification
- [Services Overview](../services/README.md) - All services reference

**Original Rogue References**:
- [Rogue Items - StrategyWiki](https://strategywiki.org/wiki/Rogue/Items) - Original scroll effects
- Original Rogue scrolls: 13 types (we're implementing 11 core types)

**Architecture**:
- [Architecture Guide](../architecture.md) - SOLID principles, immutability
- [Testing Strategy](../testing-strategy.md) - Test organization, MockRandom

---

**Last Updated**: 2025-10-06
**Author**: Claude Code
**Status**: Ready for Implementation
