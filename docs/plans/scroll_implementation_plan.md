# Scroll Implementation - Analysis & Design

**Version**: 2.0
**Date**: 2025-10-06
**Status**: Implementation Complete - Polish Phase
**Related Docs**: [Items](../game-design/05-items.md) | [Identification](../game-design/07-identification.md) | [ScrollService](../services/ScrollService.md)

---

## Executive Summary

This document provides a comprehensive analysis and design for implementing all 11 scroll types in the ASCII Roguelike.

**Current State**: 11/11 scroll types implemented (100%) ✅
**Target State**: ACHIEVED - All scrolls functional, polish phase in progress

**Progress Summary**:
- ✅ Phase 1: Foundation (Complete - StatusEffectService, LevelService, MonsterAI extensions)
- ✅ Phase 2: Simple Scrolls (Complete - TELEPORTATION, CREATE_MONSTER)
- ✅ Phase 3: Medium Scrolls (Complete - MAGIC_MAPPING, LIGHT, HOLD_MONSTER)
- ✅ Phase 4: Complex Scrolls (Complete - SLEEP ✅, SCARE_MONSTER ✅)
- ✅ Phase 5: Curse System (Complete - CurseService, REMOVE_CURSE scroll, except Task 14)
- 🔄 Phase 6: Polish & Integration (In progress)

**Implementation Complete**: All 11 scroll types functional with 1885 tests passing. SCARE_MONSTER was the final and most complex scroll, involving 6 implementation phases across PathfindingService, MonsterAIService, TurnService, and LevelService integration.

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

### 2.2 ScrollEffectResult Type Definition

**Purpose**: Define a consistent return type for all scroll effects, following the proven pattern from PotionEffectResult.

```typescript
export interface ScrollEffectResult {
  player?: Player          // Updated player (for status effects like SLEEP, HOLD_MONSTER)
  state?: GameState        // Updated state (for level modifications like MAGIC_MAPPING, TELEPORTATION)
  message: string          // Effect description message
  identified: boolean      // Was scroll unidentified before use?
  fizzled?: boolean        // Did scroll fail to work? (e.g., LIGHT in corridor, no target)
  consumed: boolean        // Should scroll be removed? (false for SCARE_MONSTER)
}
```

**When to Use Each Field**:

| Field | Usage | Examples |
|-------|-------|----------|
| `player` | Scroll modifies player directly | SLEEP (adds status effect), direct stat changes |
| `state` | Scroll modifies game state | MAGIC_MAPPING (updates level), TELEPORTATION (moves player), CREATE_MONSTER (adds monster) |
| `player` + `state` | Scroll affects both | TELEPORTATION (updates player position + FOV state) |
| `fizzled` | Scroll had no effect | LIGHT in corridor, HOLD_MONSTER with no adjacent enemy |
| `consumed: false` | Scroll not removed | SCARE_MONSTER (dropped on ground, not consumed) |

**Pattern**:
```typescript
// Service method returns result
applyScroll(scroll: Scroll, state: GameState, target?: Target): ScrollEffectResult {
  // Apply effect logic...

  return {
    state: updatedState,
    message: "The dungeon layout is revealed!",
    identified: true,
    consumed: true
  }
}

// Command handles result
const result = this.scrollService.applyScroll(scroll, state, target)
if (result.fizzled) {
  // Handle fizzle, no turn consumed
}
// Update state, remove scroll if consumed, etc.
```

---

### 2.3 ReadScrollCommand Architecture

**Purpose**: Define the command structure and responsibilities for scroll reading, following QuaffPotionCommand pattern.

**Command Structure**:
```typescript
export class ReadScrollCommand implements ICommand {
  constructor(
    private scrollId: string,

    // Services (injected)
    private scrollService: ScrollService,
    private identificationService: IdentificationService,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,

    // Targeting (provided by UI layer)
    private target?: ItemTarget | DirectionTarget
  ) {}

  execute(state: GameState): GameState {
    // 1. Find scroll in inventory
    // 2. Validate it's a scroll
    // 3. Apply scroll effect via service
    // 4. Handle identification
    // 5. Remove scroll (or drop if SCARE_MONSTER)
    // 6. Update state
    // 7. Increment turn
  }
}
```

**Target Types**:
```typescript
type ItemTarget = {
  type: 'item'
  itemId: string
}

type DirectionTarget = {
  type: 'direction'
  dx: number
  dy: number
}
```

**Responsibility Boundaries**:

| Layer | Responsibilities | Examples |
|-------|-----------------|----------|
| **UI** | Detect targeting need, prompt user, create command | Show item modal, direction prompt |
| **Command** | Orchestrate services, handle results, update state | Find scroll, call service, remove item |
| **Service** | Apply effect logic, validate targets, return result | Check if in room, apply mapping, calculate teleport position |

**Command Flow**:
```
1. Find scroll in inventory
   ├─ Not found → "You don't have that." (no turn)
   ├─ Not a scroll → "You can't read that." (no turn)
   └─ Valid scroll → Continue

2. Check if already identified
   ├─ Identified → Get real name
   └─ Unidentified → Get descriptor ("scroll labeled XYZZY")

3. Apply scroll via service
   result = scrollService.applyScroll(scroll, state, target)

4. Handle fizzle
   if (result.fizzled):
     ├─ Show message
     └─ Return state (no turn, scroll not consumed)

5. Update identification
   if (result.identified):
     └─ state = identificationService.identifyByUse(scroll, state)

6. Update state
   ├─ Apply result.player if present
   ├─ Apply result.state if present
   └─ Show result.message

7. Handle scroll consumption
   if (result.consumed):
     ├─ Remove scroll from inventory
   else:
     └─ Drop scroll at player position (SCARE_MONSTER)

8. Increment turn
```

**Auto-Identification Pattern** (reused from potions):
```typescript
const identified = !this.identificationService.isIdentified(scroll, state)
const displayName = this.identificationService.getDisplayName(scroll, state)

// Apply effect...
const result = this.scrollService.applyScroll(scroll, state, target)

// Update identification if was unidentified
let updatedState = state
if (result.identified) {
  updatedState = this.identificationService.identifyByUse(scroll, state)
}
```

---

### 2.4 Targeting Flow Documentation

**Purpose**: Document how targeting works across UI/Command/Service layers for different scroll types.

#### No-Target Scrolls (Instant Effect)

**Examples**: MAGIC_MAPPING, TELEPORTATION, CREATE_MONSTER

**Flow**:
1. Player presses `r` (read scroll)
2. Inventory modal shows scrolls
3. Player selects scroll
4. **No targeting needed** → UI immediately creates command
5. `ReadScrollCommand(scrollId, target: undefined)`
6. ScrollService applies effect
7. Result returned

**UI Responsibility**: None (instant execution)

---

#### Item-Targeted Scrolls

**Examples**: IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR

**Flow**:
1. Player presses `r` (read scroll)
2. Inventory modal shows scrolls
3. Player selects scroll (e.g., ENCHANT_WEAPON)
4. **UI detects scroll needs item target** (reads scroll type from data)
5. UI shows **second modal**: "Select weapon to enchant"
6. Player selects weapon
7. UI creates `ReadScrollCommand(scrollId, target: { type: 'item', itemId: weaponId })`
8. Command passes target to ScrollService
9. Service validates weapon, applies enchantment

**UI Responsibility**:
- Detect targeting requirement from scroll type
- Filter items by requirement (weapons only for ENCHANT_WEAPON)
- Show appropriate modal
- Create command with target

**Service Responsibility**:
- Validate target is correct type (weapon, armor, etc.)
- Apply enchantment logic
- Return result with updated player/state

**Example**:
```typescript
// In ReadScrollCommand
execute(state: GameState): GameState {
  const scroll = findScrollInInventory(state.player, this.scrollId)

  // Target validation
  if (scroll.type === ScrollType.ENCHANT_WEAPON) {
    if (!this.target || this.target.type !== 'item') {
      return { ...state, messages: addMessage(messages, "No target selected.") }
    }

    const targetItem = findItemInInventory(state.player, this.target.itemId)
    if (!isWeapon(targetItem)) {
      return { ...state, messages: addMessage(messages, "That's not a weapon.") }
    }
  }

  const result = this.scrollService.applyScroll(scroll, state, this.target)
  // Handle result...
}
```

---

#### Direction-Targeted Scrolls

**Examples**: HOLD_MONSTER

**Flow**:
1. Player presses `r` (read scroll)
2. Inventory modal shows scrolls
3. Player selects HOLD_MONSTER scroll
4. **UI detects scroll needs direction**
5. UI prompts: **"Which direction?"**
6. Player presses arrow key (e.g., ↑ for north)
7. UI creates `ReadScrollCommand(scrollId, target: { type: 'direction', dx: 0, dy: -1 })`
8. Command passes target to ScrollService
9. Service checks for monster at `(player.x + dx, player.y + dy)`
10. If monster found → Apply HELD status
11. If no monster → Scroll fizzles

**UI Responsibility**:
- Show direction prompt
- Convert arrow key to `dx/dy` offset
- Create command with direction target

**Service Responsibility**:
- Calculate target position from player position + direction
- Check if monster exists at target
- Apply HELD status if valid
- Return fizzle result if no monster

**Example**:
```typescript
// In ScrollService
applyHoldMonster(state: GameState, target: DirectionTarget): ScrollEffectResult {
  const targetPos = {
    x: state.player.position.x + target.dx,
    y: state.player.position.y + target.dy
  }

  const monster = findMonsterAtPosition(state.currentLevel, targetPos)

  if (!monster) {
    return {
      message: "There's nothing there to hold!",
      identified: true,
      fizzled: true,
      consumed: false  // Scroll not consumed on fizzle
    }
  }

  const heldMonster = this.statusEffectService.addStatusEffect(
    monster,
    StatusEffectType.HELD,
    this.random.nextInt(3, 6)  // 3-6 turns
  )

  const updatedLevel = replaceMonster(state.currentLevel, heldMonster)

  return {
    state: { ...state, currentLevel: updatedLevel },
    message: `The ${monster.name} freezes in place!`,
    identified: true,
    consumed: true
  }
}
```

---

#### Special: SCARE_MONSTER (Drop, Don't Consume)

**Flow**:
1. Player selects SCARE_MONSTER scroll
2. **No targeting needed**
3. ScrollService returns `consumed: false`
4. Command **drops scroll at player position** instead of removing it
5. Scroll item added to `level.items` at player position
6. Tile marked with `scareScrollPosition` flag
7. Monsters avoid tile, flee if adjacent

**Unique Behavior**:
- Only scroll that isn't consumed on use
- Service returns `consumed: false`
- Command drops scroll on ground
- Scroll deteriorates after 100 turns

**Example**:
```typescript
// In ReadScrollCommand
const result = this.scrollService.applyScroll(scroll, state)

if (result.consumed) {
  // Normal: Remove from inventory
  updatedPlayer = this.inventoryService.removeItem(player, scroll.id)
} else {
  // SCARE_MONSTER: Drop at player position
  updatedPlayer = this.inventoryService.removeItem(player, scroll.id)
  updatedLevel = this.inventoryService.addItemToGround(
    level,
    scroll,
    player.position
  )
}
```

---

### 2.5 Needs Implementation - Simple (Low Complexity)

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

**ScrollService Dependencies** (Organized by Implementation Phase):

```typescript
export class ScrollService {
  constructor(
    // PHASE 1 - CORE (Required immediately)
    private identificationService: IdentificationService,
    private inventoryService: InventoryService,
    private randomService: IRandomService,

    // PHASE 2 - LEVEL MANIPULATION (Simple scrolls)
    private levelService: LevelService,        // Teleportation, room detection
    private fovService: FOVService,            // Magic mapping, light, teleportation FOV update

    // PHASE 2 - MONSTER INTERACTION (Simple scrolls)
    private dungeonService: DungeonService,    // Create monster

    // PHASE 4 - STATUS EFFECTS (Complex scrolls - optional until implemented)
    private statusEffectService?: StatusEffectService, // Sleep, hold monster

    // PHASE 5 - CURSE SYSTEM (Final scrolls - optional until implemented)
    private curseService?: CurseService        // Remove curse
  ) {}
}
```

**State Modification Pattern**

Scrolls that modify GameState (MAGIC_MAPPING, TELEPORTATION, CREATE_MONSTER) follow this immutability pattern:

```typescript
// Pattern 1: Level modification (MAGIC_MAPPING)
private applyMagicMapping(state: GameState): ScrollEffectResult {
  // 1. Get all tiles on current level
  const allTiles = this.levelService.getAllTiles(state.currentLevel)

  // 2. Create new explored tiles set
  const newExploredTiles = new Set([
    ...state.currentLevel.exploredTiles,
    ...allTiles.map(pos => `${pos.x},${pos.y}`)
  ])

  // 3. Create updated level (immutable)
  const updatedLevel = {
    ...state.currentLevel,
    exploredTiles: newExploredTiles
  }

  // 4. Create updated levels array (immutable)
  const updatedLevels = state.levels.map(level =>
    level.id === state.currentLevel.id ? updatedLevel : level
  )

  // 5. Create updated state (immutable)
  const updatedState = {
    ...state,
    levels: updatedLevels
  }

  // 6. Return result (service doesn't apply state, just returns it)
  return {
    state: updatedState,
    message: "The dungeon layout is revealed!",
    identified: true,
    consumed: true
  }
}

// Pattern 2: Player position modification (TELEPORTATION)
private applyTeleportation(state: GameState): ScrollEffectResult {
  // 1. Find all walkable tiles
  const walkableTiles = this.levelService.getAllWalkableTiles(state.currentLevel)

  // 2. Random select target
  const targetPos = this.randomService.choice(walkableTiles)

  // 3. Update player position (immutable)
  const updatedPlayer = {
    ...state.player,
    position: targetPos
  }

  // 4. Recompute FOV at new location
  const fovResult = this.fovService.updateFOVAndExploration(
    targetPos,
    this.getLightRadius(updatedPlayer),
    state.currentLevel
  )

  // 5. Create updated state with new FOV
  const updatedState = {
    ...state,
    player: updatedPlayer,
    currentLevel: fovResult.level,
    visibleCells: fovResult.visibleCells
  }

  // 6. Return both player and state
  return {
    player: updatedPlayer,    // Player changed
    state: updatedState,      // State changed (FOV)
    message: "You feel a wrenching sensation!",
    identified: true,
    consumed: true
  }
}

// Pattern 3: Level entity addition (CREATE_MONSTER)
private applyCreateMonster(state: GameState): ScrollEffectResult {
  // 1. Find adjacent empty tiles
  const adjacentTiles = this.levelService.getEmptyAdjacentTiles(
    state.player.position,
    state.currentLevel
  )

  if (adjacentTiles.length === 0) {
    // Scroll fizzles - no space
    return {
      message: "Nothing happens.",
      identified: true,
      fizzled: true,
      consumed: false
    }
  }

  // 2. Random select spawn position
  const spawnPos = this.randomService.choice(adjacentTiles)

  // 3. Spawn monster (DungeonService handles creation)
  const newMonster = this.dungeonService.spawnMonster(
    state.currentLevel.depth,
    spawnPos
  )

  // 4. Add monster to level (immutable)
  const updatedLevel = {
    ...state.currentLevel,
    monsters: [...state.currentLevel.monsters, newMonster]
  }

  // 5. Update state
  const updatedState = {
    ...state,
    levels: state.levels.map(level =>
      level.id === updatedLevel.id ? updatedLevel : level
    )
  }

  return {
    state: updatedState,
    message: "You hear a faint cry of anguish!",
    identified: true,
    consumed: true
  }
}
```

**Key Principles**:
1. **Service calculates new state** - doesn't apply it
2. **Return result with state** - command applies it
3. **Always use spread operators** - never mutate
4. **Nested updates require care** - update each level (level → levels → state)
5. **Return appropriate fields** - `player`, `state`, or both depending on what changed

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

**Goal**: Build missing infrastructure needed for scroll effects + define core architecture

**Tasks**:

0. **Core Type Definitions** (NEW - Architecture Foundation)
   - [ ] Define `ScrollEffectResult` interface in `core.ts`
   - [ ] Define `ItemTarget` type: `{ type: 'item', itemId: string }`
   - [ ] Define `DirectionTarget` type: `{ type: 'direction', dx: number, dy: number }`
   - [ ] Export target union type: `type ScrollTarget = ItemTarget | DirectionTarget`
   - [ ] Git commit: "feat: define ScrollEffectResult and targeting types (Phase 1.0)"

1. **ReadScrollCommand** (NEW - Command Architecture)
   - [ ] Create `ReadScrollCommand.ts` in `src/commands/ReadScrollCommand/`
   - [ ] Implement constructor with targeting support
   - [ ] Implement command flow (find scroll, validate, apply, identify, consume/drop)
   - [ ] Add fizzle handling (no turn consumed if scroll fizzles)
   - [ ] Add SCARE_MONSTER special case (drop scroll, don't consume)
   - [ ] Write comprehensive tests (read-scroll-command.test.ts)
   - [ ] Git commit: "feat: implement ReadScrollCommand with targeting support (Phase 1.1)"

2. **StatusEffectService** (NEW SERVICE - from original plan)
   - [ ] Create `StatusEffectService.ts`
   - [ ] Define `StatusEffect` enum and `StatusEffectState` interface
   - [ ] Implement `applyEffect`, `tickEffects`, `hasEffect`, `removeEffect`
   - [ ] Add `statusEffects: StatusEffectState[]` to Player and Monster interfaces
   - [ ] Write comprehensive tests (status-effects.test.ts)
   - [ ] Git commit: "feat: create StatusEffectService with duration tracking (Phase 1.2)"

3. **LevelService Extensions** (from original plan)
   - [ ] Implement `getAllWalkableTiles(level: Level): Position[]`
   - [ ] Implement `getEmptyAdjacentTiles(position: Position, level: Level): Position[]`
   - [ ] Implement `getRoomTiles(position: Position, level: Level): Position[]`
   - [ ] Implement `isInRoom(position: Position, level: Level): boolean`
   - [ ] Implement `getAllTiles(level: Level): Position[]` (for MAGIC_MAPPING)
   - [ ] Write tests for new methods
   - [ ] Git commit: "feat: extend LevelService with scroll utility methods (Phase 1.3)"

4. **MonsterAIService Extensions** (from original plan)
   - [ ] Add HELD status check (skip turn if held)
   - [ ] Add FLEEING status check (flee from player)
   - [ ] Implement `fleeFromPlayer(monster, player)` pathfinding
   - [ ] Write tests for new behaviors
   - [ ] Git commit: "feat: add HELD and FLEEING monster AI behaviors (Phase 1.4)"

**Deliverable**: Complete architecture (types, command, services) ready for scroll implementation

**Estimated Effort**: 5 tasks, ~350 lines of code, ~250 lines of tests

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

9. **SLEEP Scroll (Cursed)** ✅ COMPLETED
   - [x] Add `applySleep()` method to ScrollService
   - [x] Apply SLEEPING status to player
   - [x] Set `player.statusEffects = [{ effect: SLEEPING, duration: random(4, 8) }]`
   - [x] Add message: "You fall into a deep sleep!"
   - [x] Write tests (sleep-scroll.test.ts)

10. **SCARE_MONSTER Scroll (Special)** ✅ COMPLETED - See [Detailed Plan](./scare_monster_detailed_plan.md)

    **10.1 Phase 1: Core Scroll Mechanics** ✅
    - [x] Add `applyScareMonster()` method to ScrollService
    - [x] Return `consumed: false` (unique behavior)
    - [x] Add message: "You hear maniacal laughter and instinctively drop the scroll!"
    - [x] Update DropCommand to handle `droppedAtTurn` tracking
    - [x] Drop scroll at player position with turn tracking
    - [x] Write basic tests (scare-monster-scroll.test.ts) - 10 tests

    **10.2 Phase 2: LevelService Helper Methods** ✅
    - [x] Implement `LevelService.getScareScrollsOnGround(level)`
    - [x] Implement `LevelService.hasScareScrollAt(position, level)`
    - [x] Implement `LevelService.getScareScrollPositions(level)`
    - [x] Write tests (scroll-utilities.test.ts) - 13 new tests

    **10.3 Phase 3: Pathfinding Integration** ✅
    - [x] Inject LevelService into PathfindingService
    - [x] Modify `getNeighbors()` to block scare scroll tiles
    - [x] Use `getScareScrollPositions()` for O(1) lookup
    - [x] Update all PathfindingService constructor calls (20 files)

    **10.4 Phase 4: Monster AI Integration** ✅
    - [x] Inject LevelService into MonsterAIService
    - [x] Implement `getAdjacentPositions()` helper method
    - [x] Modify `decideAction()` to check scare scroll first (highest priority)
    - [x] If adjacent → trigger flee behavior
    - [x] Update all MonsterAIService constructor calls (19 files)

    **10.5 Phase 5: Deterioration System** ✅
    - [x] Implement deterioration logic in `TurnService.incrementTurn()`
    - [x] Check `turnCount - droppedAtTurn > 100`
    - [x] Remove expired scrolls from current level
    - [x] Update all TurnService constructor calls (34 files)

    **10.6 Phase 6: Integration & Polish** ✅
    - [x] End-to-end integration (all 1885 tests passing)
    - [x] DropCommand tests with scare scroll tracking (4 new tests)
    - [x] All service integrations complete and tested

**Deliverable**: ✅ Both scrolls functional (SLEEP ✅, SCARE_MONSTER ✅) = 11/11 total

**Actual Effort**:
- Task 9 (SLEEP): ✅ Complete (~50 lines of code, ~60 lines of tests)
- Task 10 (SCARE_MONSTER): ✅ Complete (6 phases, ~250 lines of code, 27 new tests, 73 files updated)

---

### Phase 5: Curse System & Final Scroll ✅ COMPLETED (except Task 14)

**Goal**: Implement curse system and REMOVE_CURSE scroll

**Tasks**:

11. **CurseService** (NEW SERVICE) ✅ COMPLETED
    - [x] Create `CurseService.ts`
    - [x] Add `cursed?: boolean` flag to Weapon, Armor, Ring interfaces
    - [x] Implement `isCursed()`, `removeCurse()`, `removeCursesFromEquipment()`
    - [x] Implement `hasAnyCursedItems()`, `getCursedItemNames()`
    - [x] Write tests (CurseService.test.ts) - 23 tests passing

12. **Equipment Command Extensions** ✅ COMPLETED
    - [x] Update UnequipCommand with curse checks
    - [x] Update EquipCommand with curse checks (weapons and armor)
    - [x] Block unequip/swap if cursed, show message "The [item] is cursed!"
    - [x] Write tests for cursed equipment prevention (12 new tests)

13. **REMOVE_CURSE Scroll** ✅ COMPLETED
    - [x] Add `applyRemoveCurse()` method to ScrollService
    - [x] Remove curse from all equipped items (instant, not targeted)
    - [x] Use `CurseService.removeCursesFromEquipment()`
    - [x] Add message: "You feel as if somebody is watching over you."
    - [x] Write tests (remove-curse-scroll.test.ts) - 13 tests passing

14. **Cursed Item Generation** ⬜ NOT IMPLEMENTED
    - [ ] Update DungeonService to spawn cursed items (5% chance?)
    - [ ] Negative enchantments (-1, -2, -3) automatically cursed
    - [ ] Add visual indicator in inventory (red color, "cursed" label)

**Deliverable**: REMOVE_CURSE scroll functional + curse system infrastructure

**Estimated Effort**:
- Tasks 11-13: ✅ Complete (~240 lines of code, ~48 tests)
- Task 14: Deferred to post-v1 (cursed generation not critical for scroll functionality)

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

### 6.8 Service/Command Boundary Checklist

**Decision**: Enforce strict separation of concerns between ScrollService and ReadScrollCommand

**Rationale**: Following CLAUDE.md architecture principles and lessons from potion implementation

#### Service Responsibilities (ScrollService)

**✅ ScrollService SHOULD:**
- Apply scroll effect logic (calculate damage, determine targets, etc.)
- Validate prerequisites (e.g., "is player in room?" for LIGHT scroll)
- Calculate new state (create updated player/state objects)
- Return `ScrollEffectResult` with all necessary data
- Handle random number generation (teleport position, duration)
- Check monster/item existence and validity
- Apply status effects via StatusEffectService
- Perform map modifications (exploredTiles, monster lists, etc.)

**❌ ScrollService SHOULD NOT:**
- Show UI prompts or modals
- Manage inventory directly (add/remove items)
- Increment turn counter
- Display messages (return message string instead)
- Call TurnService or other command-level services
- Handle user input or keyboard events
- Decide whether to show targeting prompts

**Example - Correct Service Logic**:
```typescript
// ✅ Good: Service calculates, returns result
private applyMagicMapping(state: GameState): ScrollEffectResult {
  const allTiles = this.levelService.getAllTiles(state.currentLevel)
  const newExploredTiles = new Set([...state.currentLevel.exploredTiles, ...allTiles.map(posKey)])

  const updatedLevel = { ...state.currentLevel, exploredTiles: newExploredTiles }
  const updatedState = { ...state, levels: state.levels.map(l => l.id === updatedLevel.id ? updatedLevel : l) }

  return {
    state: updatedState,
    message: "The dungeon layout is revealed!",
    identified: true,
    consumed: true
  }
}

// ❌ Bad: Service managing inventory and turns
private applyMagicMapping(state: GameState): GameState {
  // Logic...
  const newState = { ...state, ...updates }

  // ❌ Service shouldn't remove items
  player.inventory = player.inventory.filter(i => i.id !== scroll.id)

  // ❌ Service shouldn't increment turns
  newState.turn += 1

  return newState
}
```

---

#### Command Responsibilities (ReadScrollCommand)

**✅ ReadScrollCommand SHOULD:**
- Find scroll in inventory (via InventoryService)
- Validate scroll type and target presence
- Call ScrollService to apply effect
- Handle identification (via IdentificationService)
- Remove scroll from inventory (or drop for SCARE_MONSTER)
- Update game state with service results
- Increment turn (via TurnService)
- Add messages to message log (via MessageService)
- Handle death/game-over conditions

**❌ ReadScrollCommand SHOULD NOT:**
- Calculate scroll effects (that's service logic)
- Perform map modifications directly
- Apply status effects directly
- Contain loops, calculations, or business logic
- Modify monsters/items directly
- Have complex conditional logic (beyond simple routing)

**Example - Correct Command Orchestration**:
```typescript
// ✅ Good: Command orchestrates services
execute(state: GameState): GameState {
  // 1. Find scroll
  const scroll = this.inventoryService.findItem(state.player, this.scrollId)
  if (!scroll) {
    return { ...state, messages: this.messageService.addMessage(state.messages, "You don't have that.") }
  }

  // 2. Check identification
  const identified = !this.identificationService.isIdentified(scroll, state)

  // 3. Apply scroll (service handles logic)
  const result = this.scrollService.applyScroll(scroll, state, this.target)

  // 4. Handle fizzle
  if (result.fizzled) {
    return { ...state, messages: this.messageService.addMessage(state.messages, result.message) }
  }

  // 5. Update identification
  let updatedState = state
  if (identified) {
    updatedState = this.identificationService.identifyByUse(scroll, state)
  }

  // 6. Apply service results
  if (result.player) updatedState = { ...updatedState, player: result.player }
  if (result.state) updatedState = { ...updatedState, ...result.state }

  // 7. Handle consumption
  if (result.consumed) {
    updatedState = {
      ...updatedState,
      player: this.inventoryService.removeItem(updatedState.player, scroll.id)
    }
  } else {
    // SCARE_MONSTER: drop scroll
    updatedState = this.inventoryService.dropItemAtPosition(updatedState, scroll, state.player.position)
  }

  // 8. Add message and increment turn
  updatedState = { ...updatedState, messages: this.messageService.addMessage(updatedState.messages, result.message) }
  updatedState = this.turnService.incrementTurn(updatedState)

  return updatedState
}

// ❌ Bad: Command contains logic
execute(state: GameState): GameState {
  const scroll = findScroll(state.player, this.scrollId)

  // ❌ Command shouldn't calculate effects
  if (scroll.type === ScrollType.MAGIC_MAPPING) {
    const tiles = []
    for (let x = 0; x < level.width; x++) {  // ❌ Loop in command
      for (let y = 0; y < level.height; y++) {
        if (level.tiles[x][y].type === TileType.FLOOR) {  // ❌ Conditional logic
          tiles.push({ x, y })
        }
      }
    }
    // ❌ Direct state manipulation
    level.exploredTiles = new Set(tiles.map(t => `${t.x},${t.y}`))
  }

  return state
}
```

---

#### Red Flags Checklist

**🚨 Signs Command Has Too Much Logic:**
- [ ] Contains loops (`for`, `forEach`, `map`, `filter`, `reduce`)
- [ ] Contains calculations (`Math.*`, arithmetic operators)
- [ ] Contains array/object manipulation beyond spreading
- [ ] Has nested conditionals (more than 2 levels deep)
- [ ] Directly modifies level/monster/item data
- [ ] Performs pathfinding or FOV calculations
- [ ] Contains monster AI logic
- [ ] Has more than 3 `if` statements

**🚨 Signs Service Is Overstepping:**
- [ ] Imports command classes
- [ ] Imports UI/rendering classes
- [ ] Calls `TurnService.incrementTurn()`
- [ ] Calls `InventoryService.removeItem()` or `addItem()`
- [ ] Shows modals or prompts
- [ ] Handles keyboard input
- [ ] Manages message log directly
- [ ] Returns `GameState` instead of specific result type

**✅ Quick Validation Test:**
- Can you explain what the command does in 3 sentences without implementation details? → **Good orchestration**
- Does the service method have 1 clear purpose and return a result? → **Good separation**
- Can you test the service without mocking the command? → **Proper dependency direction**

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

### 7.5 Integration Examples

**Purpose**: Provide complete code examples showing how ScrollService and ReadScrollCommand work together.

#### Example 1: MAGIC_MAPPING (State Modification)

**ScrollService Implementation**:
```typescript
// In ScrollService
applyScroll(scroll: Scroll, state: GameState, target?: ScrollTarget): ScrollEffectResult {
  switch (scroll.type) {
    case ScrollType.MAGIC_MAPPING:
      return this.applyMagicMapping(state)
    // ... other scrolls
  }
}

private applyMagicMapping(state: GameState): ScrollEffectResult {
  // 1. Get all tiles
  const allTiles = this.levelService.getAllTiles(state.currentLevel)

  // 2. Mark all as explored
  const newExploredTiles = new Set([
    ...state.currentLevel.exploredTiles,
    ...allTiles.map(pos => `${pos.x},${pos.y}`)
  ])

  // 3. Create updated level
  const updatedLevel = {
    ...state.currentLevel,
    exploredTiles: newExploredTiles
  }

  // 4. Update state
  const updatedState = {
    ...state,
    levels: state.levels.map(level =>
      level.id === updatedLevel.id ? updatedLevel : level
    )
  }

  return {
    state: updatedState,
    message: "The dungeon layout is revealed!",
    identified: true,
    consumed: true
  }
}
```

**ReadScrollCommand Integration**:
```typescript
execute(state: GameState): GameState {
  const scroll = this.inventoryService.findItem(state.player, this.scrollId)

  // Apply scroll
  const result = this.scrollService.applyScroll(scroll, state)

  // Update state with service result
  let updatedState = result.state || state

  // Remove scroll
  updatedState = {
    ...updatedState,
    player: this.inventoryService.removeItem(updatedState.player, scroll.id)
  }

  // Add message and increment turn
  updatedState = {
    ...updatedState,
    messages: this.messageService.addMessage(updatedState.messages, result.message)
  }
  updatedState = this.turnService.incrementTurn(updatedState)

  return updatedState
}
```

---

#### Example 2: ENCHANT_WEAPON (Item Targeting)

**UI Flow** (for context):
```typescript
// In InputHandler (UI layer)
if (selectedScroll.type === ScrollType.ENCHANT_WEAPON) {
  // Show weapon selection modal
  showItemModal(state.player.inventory.filter(item => isWeapon(item)))

  // On weapon selected:
  const command = new ReadScrollCommand(
    scrollId,
    services,
    { type: 'item', itemId: selectedWeaponId }  // Target
  )

  gameState = command.execute(gameState)
}
```

**ScrollService Implementation**:
```typescript
private applyEnchantWeapon(
  state: GameState,
  target: ItemTarget
): ScrollEffectResult {
  const weapon = this.inventoryService.findItem(state.player, target.itemId)

  // Validate target
  if (!weapon || weapon.itemType !== 'weapon') {
    return {
      message: "That's not a weapon!",
      identified: true,
      fizzled: true,
      consumed: false
    }
  }

  // Check enchantment cap
  if (weapon.bonus >= 3) {
    return {
      message: `Your ${weapon.name} is already at maximum enchantment!`,
      identified: true,
      fizzled: true,
      consumed: false
    }
  }

  // Apply enchantment
  const enchantedWeapon = { ...weapon, bonus: weapon.bonus + 1 }
  const updatedPlayer = this.inventoryService.replaceItem(
    state.player,
    weapon.id,
    enchantedWeapon
  )

  return {
    player: updatedPlayer,
    message: `Your ${weapon.name} glows brightly! (+${enchantedWeapon.bonus})`,
    identified: true,
    consumed: true
  }
}
```

**ReadScrollCommand Integration**:
```typescript
execute(state: GameState): GameState {
  const scroll = this.inventoryService.findItem(state.player, this.scrollId)

  // Validate target provided
  if (!this.target || this.target.type !== 'item') {
    return {
      ...state,
      messages: this.messageService.addMessage(state.messages, "No target selected.")
    }
  }

  // Apply scroll with target
  const result = this.scrollService.applyScroll(scroll, state, this.target)

  // Handle fizzle (don't consume turn)
  if (result.fizzled) {
    return {
      ...state,
      messages: this.messageService.addMessage(state.messages, result.message)
    }
  }

  // Apply player update
  let updatedState = { ...state, player: result.player || state.player }

  // Remove scroll, add message, increment turn
  updatedState = {
    ...updatedState,
    player: this.inventoryService.removeItem(updatedState.player, scroll.id),
    messages: this.messageService.addMessage(updatedState.messages, result.message)
  }
  updatedState = this.turnService.incrementTurn(updatedState)

  return updatedState
}
```

---

#### Example 3: HOLD_MONSTER (Direction Targeting)

**UI Flow**:
```typescript
// In InputHandler (UI layer)
if (selectedScroll.type === ScrollType.HOLD_MONSTER) {
  // Show direction prompt: "Which direction?"
  setDirectionPromptMode()

  // On arrow key pressed (e.g., ArrowUp):
  const command = new ReadScrollCommand(
    scrollId,
    services,
    { type: 'direction', dx: 0, dy: -1 }  // North
  )

  gameState = command.execute(gameState)
}
```

**ScrollService Implementation**:
```typescript
private applyHoldMonster(
  state: GameState,
  target: DirectionTarget
): ScrollEffectResult {
  // Calculate target position
  const targetPos = {
    x: state.player.position.x + target.dx,
    y: state.player.position.y + target.dy
  }

  // Find monster at position
  const monster = state.currentLevel.monsters.find(m =>
    m.position.x === targetPos.x && m.position.y === targetPos.y
  )

  if (!monster) {
    return {
      message: "There's nothing there to hold!",
      identified: true,
      fizzled: true,
      consumed: false
    }
  }

  // Apply HELD status
  const duration = this.randomService.nextInt(3, 6)
  const heldMonster = this.statusEffectService.addStatusEffect(
    monster,
    StatusEffectType.HELD,
    duration
  )

  // Update level
  const updatedMonsters = state.currentLevel.monsters.map(m =>
    m.id === monster.id ? heldMonster : m
  )

  const updatedLevel = {
    ...state.currentLevel,
    monsters: updatedMonsters
  }

  const updatedState = {
    ...state,
    levels: state.levels.map(level =>
      level.id === updatedLevel.id ? updatedLevel : level
    )
  }

  return {
    state: updatedState,
    message: `The ${monster.name} freezes in place!`,
    identified: true,
    consumed: true
  }
}
```

---

#### Example 4: SCARE_MONSTER (Special - Not Consumed)

**ScrollService Implementation**:
```typescript
private applyScareMonster(state: GameState): ScrollEffectResult {
  // No actual effect applied (scroll is just dropped)
  return {
    message: "You hear maniacal laughter and drop the scroll!",
    identified: true,
    consumed: false  // ← Key: scroll NOT consumed
  }
}
```

**ReadScrollCommand Integration**:
```typescript
execute(state: GameState): GameState {
  const scroll = this.inventoryService.findItem(state.player, this.scrollId)
  const result = this.scrollService.applyScroll(scroll, state)

  let updatedState = state

  // Handle scroll consumption (special case)
  if (result.consumed) {
    // Normal: remove from inventory
    updatedState = {
      ...updatedState,
      player: this.inventoryService.removeItem(updatedState.player, scroll.id)
    }
  } else {
    // SCARE_MONSTER: drop scroll at player position
    updatedState = {
      ...updatedState,
      player: this.inventoryService.removeItem(updatedState.player, scroll.id),
      currentLevel: {
        ...updatedState.currentLevel,
        items: [
          ...updatedState.currentLevel.items,
          { ...scroll, position: state.player.position, droppedOnTurn: state.turn }
        ]
      }
    }
  }

  // Add message and increment turn
  updatedState = {
    ...updatedState,
    messages: this.messageService.addMessage(updatedState.messages, result.message)
  }
  updatedState = this.turnService.incrementTurn(updatedState)

  return updatedState
}
```

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

**Last Updated**: 2025-10-06 (Enhanced with potion implementation learnings)
**Author**: Claude Code
**Status**: Ready for Implementation

## Changelog

**2025-10-06 - Enhanced with Potion Implementation Learnings**:
- Added ScrollEffectResult type definition (Section 2.2)
- Added ReadScrollCommand architecture documentation (Section 2.3)
- Added comprehensive targeting flow documentation (Section 2.4)
- Enhanced Section 3.1 with state modification patterns and refactored constructor
- Updated Phase 1 tasks with new prerequisites (type definitions, command architecture)
- Added service/command boundary checklist (Section 6.8)
- Added integration examples showing complete scroll implementations (Section 7.5)
- All updates based on successful patterns from completed potion implementation
