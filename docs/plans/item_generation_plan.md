# Cursed Item Generation & Complete Item System Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Items](../game-design/05-items.md) | [Scroll Plan](./scroll_implementation_plan.md) | [Architecture](../architecture.md)

---

## 1. Objectives

### Primary Goal
Implement cursed item generation (weapons, armor, rings) with negative enchantments and complete the missing item systems (wands, rings verification), bringing the item system to 100% feature parity with original Rogue.

### Design Philosophy
- **Authentic Rogue Experience**: Follow 1980 Rogue curse mechanics (negative enchantments, auto-stick on equip)
- **Balanced Risk/Reward**: Cursed items spawn frequently enough to matter (5-12%), rare enough to not dominate gameplay
- **Player Discovery**: Curses identified on equip (surprise factor), visual warnings post-identification
- **Complete Item Roster**: All Rogue items functional (weapons, armor, potions ✅, scrolls ✅, rings, wands, food ✅)

### Success Criteria
- [ ] Cursed weapons/armor/rings spawn with -1 to -3 enchantments
- [ ] Ring of Teleportation always cursed (Rogue tradition)
- [ ] Curse discovered on equip with warning message
- [ ] Enchant scrolls remove curses (Rogue behavior)
- [ ] Visual indicators for identified cursed items
- [ ] Wand system 100% functional (all 10 types)
- [ ] Ring system verified/completed
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles
- [ ] Documentation updated

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Items (05-items.md)](../game-design/05-items.md) - All item types and mechanics
- [Identification (07-identification.md)](../game-design/07-identification.md) - Curse discovery
- [Scroll Plan](./scroll_implementation_plan.md) - Task 14 deferred (cursed item generation)

### Related Systems
- **CurseService**: Exists (curse detection/removal) ✅
- **ScrollService**: REMOVE_CURSE scroll functional ✅
- **EquipCommand/UnequipCommand**: Curse prevention exists ✅
- **DungeonService**: Item spawning (needs cursed item logic) ❌
- **WandService**: Stub implementation (needs completion) ❌
- **RingService**: May need implementation verification ❓

### Research Summary

**Original Rogue (1980)**:
- Cursed items: Weapons, armor, rings with -1 to -3 enchantments
- Cannot unequip until Remove Curse scroll used
- Enchant Weapon/Armor scrolls also remove curses
- Ring of Teleportation always cursed

**NetHack BUC System**:
- Blessed/Uncursed/Cursed states
- Cursed items weld to player
- Holy water removes curses
- More complex than needed for our implementation

**Angband**:
- Normal/Heavy/Permanent curse levels
- Cursed ego items (Boots of Slowness, etc.)
- Breaking curses via enchanting
- Too complex for v1

**Decision**: Follow Rogue (simplest, most authentic)

---

## 3. Phases & Tasks

### Phase 1: Cursed Item Generation (Priority: HIGH)

**Objective**: Implement cursed item spawning with negative enchantments in DungeonService

#### Task 1.1: Add Curse Generation Helper Methods ⬜

**Context**: DungeonService needs utility methods to determine curse status and generate negative enchantments

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts`

##### Subtasks:
- [ ] Add `rollCursedStatus(rarity: string): boolean` method
  - Common: 5% curse chance
  - Uncommon: 8% curse chance
  - Rare: 12% curse chance (risk/reward)
- [ ] Add `rollEnchantment(rarity: string, isCursed: boolean): number` method
  - If cursed: returns -1 to -3 (negative bonus)
  - If not cursed: returns 0 (common) or +1 to +2 (rare)
- [ ] Add JSDoc comments explaining curse probability design
- [ ] Git commit: "feat: add curse generation helpers to DungeonService (Phase 1.1)"

---

#### Task 1.2: Update Weapon Spawning with Curses ⬜

**Context**: Weapons currently only spawn with 0 or positive bonuses, need to support cursed variants

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts` (line 712-728)

##### Subtasks:
- [ ] Call `rollCursedStatus()` in weapon spawning
- [ ] Use `rollEnchantment()` instead of hardcoded bonus logic
- [ ] Add `cursed` field to Weapon interface usage
- [ ] Update name formatting to show negative bonuses (e.g., "Long Sword -2")
- [ ] Keep `identified: false` (curse discovered on equip)
- [ ] Test: Spawn 1000 weapons, verify ~5-12% are cursed
- [ ] Git commit: "feat: add cursed weapon spawning with negative enchantments (Phase 1.2)"

---

#### Task 1.3: Update Armor Spawning with Curses ⬜

**Context**: Same as weapons - armor needs curse support

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts` (line 730-746)

##### Subtasks:
- [ ] Apply same curse logic as weapons
- [ ] Cursed armor has negative AC bonus (worse protection)
- [ ] Format: "Plate Mail -1" (makes AC 4 instead of 2)
- [ ] Test: Spawn 1000 armor, verify curse rate
- [ ] Git commit: "feat: add cursed armor spawning with negative enchantments (Phase 1.3)"

---

#### Task 1.4: Update Ring Spawning with Curses ⬜

**Context**: Rings have special case - Ring of Teleportation always cursed (Rogue tradition)

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts` (line 785-804)

##### Subtasks:
- [ ] Check if ring type is TELEPORTATION → force cursed=true
- [ ] For other rings, use `rollCursedStatus()`
- [ ] Cursed rings get negative bonus instead of positive
- [ ] Format: "Ring of Protection -2"
- [ ] Test: Ring of Teleportation spawns cursed 100% of time
- [ ] Test: Other rings ~5-12% cursed
- [ ] Git commit: "feat: add cursed ring spawning, Ring of Teleportation always cursed (Phase 1.4)"

---

#### Task 1.5: Curse Discovery on Equip ⬜

**Context**: Player discovers curse when equipping item (surprise mechanic), not when finding it

**Files to modify**:
- `src/commands/EquipCommand/EquipCommand.ts`

##### Subtasks:
- [ ] Import CurseService
- [ ] After equipping item, check `curseService.isCursed(item)`
- [ ] If cursed, add warning message: "The {item} is cursed! You cannot remove it."
- [ ] Message type: 'warning'
- [ ] Test: Equipping cursed weapon shows warning
- [ ] Test: Equipping non-cursed weapon shows no warning
- [ ] Git commit: "feat: add curse discovery notification on equip (Phase 1.5)"

---

#### Task 1.6: Enchant Scrolls Remove Curses ⬜

**Context**: Original Rogue behavior - Enchant Weapon/Armor scrolls remove curses while improving item

**Files to modify**:
- `src/services/ScrollService/ScrollService.ts`

##### Subtasks:
- [ ] In `applyEnchantWeapon()`: Set `cursed: false` when enchanting
- [ ] In `applyEnchantArmor()`: Set `cursed: false` when enchanting
- [ ] Update messages: "The {item} glows brightly! The curse is lifted."
- [ ] Test: Enchanting cursed weapon removes curse and adds +1
- [ ] Test: Enchanting already max enchantment still removes curse
- [ ] Git commit: "feat: enchant scrolls remove curses (Rogue behavior) (Phase 1.6)"

---

#### Task 1.7: Visual Indicators for Cursed Items ⬜

**Context**: Once identified, cursed items should have visual warning in inventory

**Files to modify**:
- `src/ui/GameRenderer.ts` (inventory rendering method)
- `src/services/ContextService/ContextService.ts` (if needed for color coding)

##### Subtasks:
- [ ] Import CurseService in GameRenderer
- [ ] In inventory rendering, check if item is cursed AND identified
- [ ] If cursed: Append " (cursed)" to item name
- [ ] Optional: Add red color via ANSI codes or CSS class
- [ ] Test: Cursed identified item shows "(cursed)" label
- [ ] Test: Cursed unidentified item shows normal name
- [ ] Git commit: "feat: add visual indicators for identified cursed items (Phase 1.7)"

---

### Phase 2: Testing Cursed Item System (Priority: HIGH)

**Objective**: Comprehensive test coverage for all curse mechanics

#### Task 2.1: DungeonService Cursed Item Tests ⬜

**Context**: Verify curse generation logic works correctly

**Files to create**:
- `src/services/DungeonService/cursed-item-generation.test.ts`

##### Subtasks:
- [ ] Test: `rollCursedStatus()` returns correct percentages (MockRandom)
- [ ] Test: `rollEnchantment()` returns -1 to -3 for cursed items
- [ ] Test: Cursed weapons spawn with negative bonus
- [ ] Test: Cursed armor spawns with negative bonus
- [ ] Test: Cursed rings spawn with negative bonus
- [ ] Test: Ring of Teleportation always cursed
- [ ] Test: Curse rates match expected (5%, 8%, 12% for rarity tiers)
- [ ] Test: Name formatting correct for negative enchantments
- [ ] Expected: 15+ tests
- [ ] Git commit: "test: add cursed item generation tests (Phase 2.1)"

---

#### Task 2.2: EquipCommand Curse Discovery Tests ⬜

**Context**: Verify curse discovery message triggers correctly

**Files to modify**:
- `src/commands/EquipCommand/EquipCommand.test.ts`

##### Subtasks:
- [ ] Test: Equipping cursed weapon shows warning message
- [ ] Test: Equipping cursed armor shows warning message
- [ ] Test: Equipping cursed ring shows warning message
- [ ] Test: Equipping non-cursed item shows no warning
- [ ] Test: Message type is 'warning'
- [ ] Test: Cannot unequip cursed item (existing test, verify still passes)
- [ ] Expected: 6 new tests
- [ ] Git commit: "test: add curse discovery tests to EquipCommand (Phase 2.2)"

---

#### Task 2.3: ScrollService Curse Removal Tests ⬜

**Context**: Verify Enchant scrolls remove curses

**Files to modify**:
- `src/services/ScrollService/enchant-scrolls.test.ts`

##### Subtasks:
- [ ] Test: Enchant Weapon on cursed weapon removes curse
- [ ] Test: Enchant Armor on cursed armor removes curse
- [ ] Test: Enchanting cursed item at max enchantment still removes curse
- [ ] Test: Message indicates curse was lifted
- [ ] Test: Item can now be unequipped after enchanting
- [ ] Expected: 5 new tests
- [ ] Git commit: "test: add curse removal tests for enchant scrolls (Phase 2.3)"

---

### Phase 3: Wand System Implementation (Priority: MEDIUM)

**Objective**: Complete WandService implementation for all 10 wand types

#### Task 3.1: Add Wand Spawning to DungeonService ⬜

**Context**: Wands defined in items.json but never spawn in dungeon

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts` (add case 'wand' after case 'ring')

##### Subtasks:
- [ ] Add wand to category pool (weight: 8, similar to rings)
- [ ] Implement case 'wand' in item spawning switch
- [ ] Parse charges from dice notation (e.g., "3d3" → 3-9 charges)
- [ ] Create Wand object with all fields
- [ ] Set woodName to 'unknown' (IdentificationService handles this)
- [ ] Test: Wands spawn in dungeon
- [ ] Test: Charges vary correctly (3-9 for "3d3")
- [ ] Git commit: "feat: add wand spawning to DungeonService (Phase 3.1)"

---

#### Task 3.2: Implement Targeting System ⬜

**Context**: Wands require targeting (which monster to zap), need UI prompt flow

**Files to create/modify**:
- `src/services/TargetingService/TargetingService.ts` (NEW)
- `src/services/TargetingService/targeting.test.ts` (NEW)
- `src/services/TargetingService/index.ts` (NEW)

##### Subtasks:
- [ ] Create TargetingService with `getAdjacentMonsters()` method
- [ ] Create `selectTargetMonster(monsters: Monster[], player: Position): Monster | null`
- [ ] For now: Return first adjacent monster (direction prompts = Phase 4)
- [ ] Write tests for targeting logic
- [ ] Git commit: "feat: implement basic targeting system for wands (Phase 3.2)"

---

#### Task 3.3: Implement Damage Wands (LIGHTNING, FIRE, COLD, MAGIC_MISSILE) ⬜

**Context**: 4 wands deal direct damage to monsters

**Files to modify**:
- `src/services/WandService/WandService.ts`

##### Subtasks:
- [ ] Inject RandomService, CombatService dependencies
- [ ] Implement `applyLightning()`: 6d6 damage
- [ ] Implement `applyFire()`: 6d6 damage
- [ ] Implement `applyCold()`: 6d6 damage
- [ ] Implement `applyMagicMissile()`: 2d6 damage (never misses)
- [ ] Update main `applyWand()` switch statement
- [ ] Return updated monster with reduced HP
- [ ] Test: Each wand type deals correct damage
- [ ] Git commit: "feat: implement damage wands (LIGHTNING, FIRE, COLD, MAGIC_MISSILE) (Phase 3.3)"

---

#### Task 3.4: Implement Status Effect Wands (SLEEP, SLOW_MONSTER, HASTE_MONSTER) ⬜

**Context**: 3 wands apply status effects to monsters

**Files to modify**:
- `src/services/WandService/WandService.ts`

##### Subtasks:
- [ ] Implement `applySleep()`: Add SLEEPING status effect (3-6 turns)
- [ ] Implement `applySlowMonster()`: Reduce monster speed by 50%
- [ ] Implement `applyHasteMonster()`: Increase monster speed by 2x
- [ ] Return updated monster with status effects
- [ ] Test: SLEEP puts monster to sleep
- [ ] Test: SLOW reduces monster speed
- [ ] Test: HASTE increases monster speed (dangerous!)
- [ ] Git commit: "feat: implement status effect wands (SLEEP, SLOW, HASTE) (Phase 3.4)"

---

#### Task 3.5: Implement Utility Wands (POLYMORPH, TELEPORT_AWAY, CANCELLATION) ⬜

**Context**: 3 wands with special effects

**Files to modify**:
- `src/services/WandService/WandService.ts`

##### Subtasks:
- [ ] Implement `applyPolymorph()`: Change monster to random type (same depth)
- [ ] Implement `applyTeleportAway()`: Teleport monster to random location
- [ ] Implement `applyCancellation()`: Remove all monster buffs/abilities
- [ ] Inject MonsterSpawnService for POLYMORPH
- [ ] Inject LevelService for TELEPORT_AWAY
- [ ] Test: Each wand effect works correctly
- [ ] Git commit: "feat: implement utility wands (POLYMORPH, TELEPORT_AWAY, CANCELLATION) (Phase 3.5)"

---

#### Task 3.6: Wand Integration & Testing ⬜

**Context**: Wire up WandService to ZapWandCommand, comprehensive testing

**Files to modify**:
- `src/commands/ZapWandCommand/ZapWandCommand.ts`
- `src/commands/ZapWandCommand/ZapWandCommand.test.ts`

##### Subtasks:
- [ ] Inject WandService into ZapWandCommand
- [ ] Call `wandService.applyWand()` with target monster
- [ ] Update wand charges after use
- [ ] Display appropriate messages
- [ ] Test: All 10 wand types functional
- [ ] Test: Wand charges decrement correctly
- [ ] Test: Wand with 0 charges shows "no charges" message
- [ ] Test: Monster HP/status updated correctly
- [ ] Expected: 20+ tests
- [ ] Git commit: "feat: integrate wands into ZapWandCommand with full testing (Phase 3.6)"

---

### Phase 4: Ring System Verification (Priority: LOW)

**Objective**: Verify rings are fully functional or implement missing pieces

#### Task 4.1: Audit Ring Implementation ⬜

**Context**: Rings defined in items.json, need to verify all effects work

**Files to review**:
- `src/services/RingService/` (may not exist)
- `src/services/EquipmentService/` or related
- `src/commands/PutOnRingCommand/` and `RemoveRingCommand/`

##### Subtasks:
- [ ] Check if RingService exists
- [ ] Verify all 10 ring types have effect implementations
- [ ] Check ring hunger modifiers applied correctly
- [ ] Verify ring bonuses affect combat/AC/etc.
- [ ] Document findings in this plan
- [ ] Git commit: "docs: audit ring system implementation status (Phase 4.1)"

---

#### Task 4.2: Implement Missing Ring Effects (if needed) ⬜

**Context**: Complete any missing ring implementations found in audit

**Files to create/modify**:
- TBD based on audit results

##### Subtasks:
- [ ] TBD - will be defined after Task 4.1 audit
- [ ] Git commit: "feat: implement missing ring effects (Phase 4.2)"

---

## 4. Technical Design

### Data Structures

**No new interfaces** - using existing types:

```typescript
// Weapon interface (already has cursed field)
interface Weapon extends Item {
  damage: string
  bonus: number  // Can now be negative (-3 to +3)
  cursed?: boolean
}

// Armor interface
interface Armor extends Item {
  ac: number
  bonus: number  // Can now be negative
  cursed?: boolean
}

// Ring interface
interface Ring extends Item {
  ringType: RingType
  bonus: number  // Can now be negative
  cursed?: boolean
}

// Wand interface (complete)
interface Wand extends Item {
  wandType: WandType
  damage: string
  charges: number
  currentCharges: number
  woodName: string
}
```

### Service Architecture

**Modified Services**:
- **DungeonService**: Add curse generation logic, wand spawning
- **ScrollService**: Enchant scrolls remove curses
- **WandService**: Complete implementation (currently stub)
- **TargetingService** (NEW): Monster targeting for wands

**Service Dependencies**:
```
DungeonService
  └─ uses → CurseService (for spawning)

ScrollService
  └─ modifies cursed items

WandService
  ├─ depends on → TargetingService
  ├─ depends on → RandomService
  ├─ depends on → CombatService
  └─ depends on → MonsterSpawnService (POLYMORPH)

EquipCommand
  └─ depends on → CurseService (discovery)
```

### Algorithms & Formulas

**Curse Probability**:
```
curseChance = {
  common: 5%,
  uncommon: 8%,
  rare: 12%
}
isCursed = random() < curseChance[rarity]
```

**Enchantment Generation**:
```
if (isCursed) {
  bonus = -(random(1, 3))  // -1 to -3
} else if (rarity === 'rare') {
  bonus = random(1, 2)  // +1 to +2
} else {
  bonus = 0  // Common items unenchanted
}
```

**Wand Damage Formula**:
```
LIGHTNING/FIRE/COLD: 6d6 = 6-36 damage
MAGIC_MISSILE: 2d6 = 2-12 damage (never misses)
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- DungeonService: >85% (complex spawning logic)
- WandService: >90% (pure logic, highly testable)
- Commands: >80%
- Overall: >80%

**Test Files**:
- `cursed-item-generation.test.ts` - Curse spawning logic (15 tests)
- `EquipCommand.test.ts` - Curse discovery (6 new tests)
- `enchant-scrolls.test.ts` - Curse removal (5 new tests)
- `wand-effects.test.ts` - All wand types (20 tests)
- `targeting.test.ts` - Monster targeting (8 tests)

**Total New Tests**: ~54 tests

### Test Scenarios

**Scenario 1: Cursed Weapon Discovery**
- Given: Player picks up unidentified Long Sword -2 (cursed)
- When: Player equips the sword
- Then: Message "The Long Sword -2 is cursed! You cannot remove it."
- Then: Cannot unequip sword

**Scenario 2: Remove Curse via Enchant**
- Given: Player has cursed Plate Mail -1 equipped
- When: Player uses Scroll of Enchant Armor on it
- Then: Curse removed, armor becomes Plate Mail +0
- Then: Can now unequip armor

**Scenario 3: Ring of Teleportation Always Cursed**
- Given: DungeonService spawning rings
- When: Spawn 100 Ring of Teleportation
- Then: All 100 are cursed=true

**Scenario 4: Wand of Lightning**
- Given: Monster with 20 HP, player has Wand of Lightning (3 charges)
- When: Player zaps monster
- Then: Monster takes 6d6 damage, wand has 2 charges left

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **EquipCommand**: Add curse discovery notification
- **ZapWandCommand**: Complete wand effect integration
- **ReadScrollCommand**: Enchant scrolls remove curses (ScrollService change, no command change needed)

### UI Changes

**Renderer Updates**:
- Inventory display: Show "(cursed)" label for identified cursed items
- Optional: Red color for cursed items

**Input Handling**:
- No new inputs needed
- Wand targeting uses existing monster selection (simplified for v1)

### State Updates

**GameState Changes**:
```typescript
// No changes to GameState - using existing structures
```

**Item Changes**:
```typescript
// Weapon, Armor, Ring: bonus can now be negative
// All items: cursed field used more extensively
```

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Update `docs/game-design/05-items.md` - Add cursed item mechanics section
- [ ] Create `docs/services/WandService.md` - Full wand service documentation
- [ ] Create `docs/services/TargetingService.md` - Targeting system documentation
- [ ] Update `docs/services/DungeonService.md` - Document curse generation
- [ ] Update `docs/services/ScrollService.md` - Note enchant scrolls remove curses
- [ ] Create `docs/plans/item_generation_plan.md` - This plan file ✅

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Cursed Item Identification Before Equip**
- **Problem**: Player might identify cursed item via Scroll of Identify before equipping
- **Mitigation**: This is fine - gives value to Identify scrolls. Player can avoid cursed items if smart.

**Issue 2: Wand Targeting Complexity**
- **Problem**: Full directional targeting is complex (Phase 5+ feature)
- **Mitigation**: V1 uses "first adjacent monster" targeting, directional in future

**Issue 3: Too Many Cursed Items**
- **Problem**: 12% curse rate for rare items might feel punishing
- **Mitigation**: Balance via playtesting, can reduce to 8-10% if needed

**Issue 4: Ring System Unknown Status**
- **Problem**: Don't know if rings are fully implemented until audit
- **Mitigation**: Phase 4 audit will reveal scope, can defer if too large

### Breaking Changes
- **None** - All changes additive to existing item system

### Performance Considerations
- **Curse generation**: O(1) per item spawn (negligible)
- **Wand effects**: O(1) per zap (negligible)
- **No performance concerns**

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (CurseService already exists)
- **Blocks**: None (optional feature)

### Estimated Timeline
- Phase 1 (Cursed Items): 4-6 hours
- Phase 2 (Testing): 2-3 hours
- Phase 3 (Wands): 5-7 hours
- Phase 4 (Rings Audit): 1-2 hours
- **Total**: 12-18 hours

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed
- [ ] Documentation updated
- [ ] Manual playtesting: Find and identify cursed item
- [ ] Manual playtesting: Use Remove Curse scroll
- [ ] Manual playtesting: Zap all 10 wand types

### Follow-Up Tasks
- [ ] Directional wand targeting (Phase 5+)
- [ ] Cursed artifact generation (if needed)
- [ ] Additional visual polish for cursed items (color coding, icons)
- [ ] Blessed items (NetHack-style, post-v1)

---

**Last Updated**: 2025-10-06
**Status**: 🚧 In Progress
