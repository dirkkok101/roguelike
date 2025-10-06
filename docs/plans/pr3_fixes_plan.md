# PR #3 Code Review Fixes Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Item Generation Plan](./item_generation_plan.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md) | [Architectural Review](../ARCHITECTURAL_REVIEW.md)

---

## 1. Objectives

### Primary Goal
Fix 3 critical architectural violations, 2 medium-priority bugs, and 3 low-priority polish issues identified in PR #3 code review to ensure the codebase maintains architectural integrity, achieves >80% test coverage, and delivers a polished user experience.

### Design Philosophy
- **Architectural Integrity**: Commands orchestrate only, all logic lives in services
- **Test Coverage Excellence**: Services >90%, Commands >80%, Overall >80%
- **User Experience Polish**: Consistent messaging, accurate item information, clear documentation

### Success Criteria
- [x] RestCommand architectural violation fixed (logic extracted to RestService)
- [x] WandService coverage improved from 48.86% to >80%
- [x] ItemSpawnService cursed item generation tests added
- [x] Enchant scroll name updating bug fixed
- [x] PickUpCommand filter logic moved to LevelService
- [x] Polymorph limitation documented
- [x] Curse message consistency fixed
- [x] Missing JSDoc added to public methods
- [x] All tests pass with >80% coverage
- [x] Architecture follows CLAUDE.md principles
- [x] Documentation updated

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Items - Cursed Items](../game-design/05-items.md#cursed-items)
- [Items - Wands](../game-design/05-items.md#wands)
- [Items - Enchantment](../game-design/05-items.md#enchantment)

### Related Systems
- **RestService** (NEW): Handles rest loop logic with hunger, regeneration, fuel, FOV
- **WandService**: Implements all 10 wand types with status effects and utility
- **ItemSpawnService**: Generates items with curse mechanics
- **InventoryService**: Manages item name formatting with enchantments
- **LevelService**: Handles level state modifications

### Code Review Summary
PR #3 code review identified 8 issues across 3 priority levels:
- **3 Critical Issues**: RestCommand violation, WandService coverage gap, ItemSpawnService untested
- **2 Medium Issues**: Enchant name bug, PickUpCommand filter logic
- **3 Low Issues**: Polymorph docs, message consistency, JSDoc gaps

**Review Score**: 94% (Excellent with noted violations)

---

## 3. Phases & Tasks

### Phase 1: Critical Architectural Fixes (Priority: HIGH)

**Objective**: Fix architectural violations and achieve required test coverage (>80%)

#### Task 1.1: Extract RestCommand Logic to RestService

**Context**: RestCommand contains a `while` loop (lines 46-147) with complex game logic violating the Command Layer principle. Commands should ONLY orchestrate services, not implement business logic.

**Architectural Violation**:
- ❌ Loops (`while`)
- ❌ Calculations (turn counting, HP gains)
- ❌ Complex conditionals (interrupt logic)
- ❌ Array iteration (`monsters.some()`)

**Files to create/modify**:
- `src/services/RestService/RestService.ts` (NEW)
- `src/services/RestService/rest-loop.test.ts` (NEW)
- `src/services/RestService/index.ts` (NEW)
- `src/commands/RestCommand/RestCommand.ts` (MODIFY - simplify to orchestration)
- `src/commands/RestCommand/RestCommand.test.ts` (MODIFY - update tests)
- `src/main.ts` (MODIFY - instantiate RestService)
- `src/ui/InputHandler.ts` (MODIFY - inject RestService)

##### Subtasks:
- [ ] Create `RestService` interface and type definitions
  - `RestResult` interface: `{ player: Player, state: GameState, messages: Message[], turnsRested: number, interrupted: boolean, interruptReason: string }`
  - `executeRest(player: Player, state: GameState): RestResult` method signature
- [ ] Implement `RestService.executeRest()` with all rest loop logic
  - Move while loop from RestCommand (lines 46-147)
  - Inject dependencies: HungerService, RegenerationService, LightingService, FOVService, MessageService, TurnService
  - Return RestResult with all computed values
- [ ] Write comprehensive unit tests for RestService
  - Test: Rests until full HP
  - Test: Interrupted by hunger (starving)
  - Test: Interrupted by enemy appearing in FOV
  - Test: Death from starvation during rest
  - Test: Safety limit prevents infinite loops (1000 turns)
  - Test: Fuel consumption during rest
  - Test: Regeneration ticks correctly
  - Test: Combat detection prevents regeneration
  - Expected: 15+ tests, >90% coverage
- [ ] Simplify RestCommand to orchestration only
  - Remove while loop and all business logic
  - Call `this.restService.executeRest(state.player, state)`
  - Return updated state from RestResult
  - Command should be <30 lines total
- [ ] Update RestCommand tests to reflect new orchestration pattern
- [ ] Create barrel export (`src/services/RestService/index.ts`)
- [ ] Update main.ts and InputHandler.ts to inject RestService
- [ ] Run tests: `npm test RestService` and `npm test RestCommand`
- [ ] Verify coverage: `npm run test:coverage`
- [ ] Git commit: "refactor: extract RestCommand logic to RestService (Phase 1.1)"

**Architecture Verification**:
- ✅ RestCommand has ZERO loops
- ✅ RestCommand has ZERO calculations
- ✅ RestCommand has ZERO array manipulation
- ✅ All logic in RestService

---

#### Task 1.2: Add WandService Test Coverage for Missing Wand Types

**Context**: WandService is at 48.86% coverage. Lines 211-363 (6 wand types) lack test coverage: SLEEP, SLOW_MONSTER, HASTE_MONSTER, TELEPORT_AWAY, POLYMORPH, CANCELLATION.

**Uncovered Functionality**:
- SLEEP: Adds SLEEPING status for 3-6 turns (lines 205-230)
- SLOW_MONSTER: Reduces speed by 50% (lines 235-253)
- HASTE_MONSTER: Doubles speed (lines 258-276)
- TELEPORT_AWAY: Teleports to random walkable tile (lines 281-311)
- POLYMORPH: Changes monster (simplified - renames and resets HP) (lines 316-342)
- CANCELLATION: Removes all status effects (lines 347-363)

**Files to create/modify**:
- `src/services/WandService/wand-status-effects.test.ts` (NEW)
- `src/services/WandService/wand-utility-effects.test.ts` (NEW)

##### Subtasks:
- [ ] Create `wand-status-effects.test.ts` for SLEEP, SLOW, HASTE, CANCELLATION
  - Test: SLEEP adds SLEEPING status effect for 3-6 turns
  - Test: SLEEP sets isAsleep flag to true
  - Test: SLOW_MONSTER reduces speed by 50% (rounds down)
  - Test: SLOW_MONSTER minimum speed is 1
  - Test: HASTE_MONSTER doubles speed
  - Test: HASTE_MONSTER shows warning message "(Careful!)"
  - Test: CANCELLATION removes all status effects
  - Test: CANCELLATION resets speed to original
  - Test: CANCELLATION with no effects works gracefully
  - Expected: 9+ tests
- [ ] Create `wand-utility-effects.test.ts` for TELEPORT_AWAY, POLYMORPH
  - Test: TELEPORT_AWAY moves monster to random walkable tile
  - Test: TELEPORT_AWAY with no walkable tiles shows "Nothing happens"
  - Test: TELEPORT_AWAY position changes from original
  - Test: POLYMORPH resets HP to maxHp
  - Test: POLYMORPH updates monster name to "Polymorphed {name}"
  - Test: POLYMORPH maintains monster position
  - Expected: 6+ tests
- [ ] Use MockRandom for deterministic position selection
- [ ] Follow AAA pattern (Arrange-Act-Assert)
- [ ] Create helper factories for monsters with status effects
- [ ] Run tests: `npm test WandService`
- [ ] Verify coverage improved: `npm run test:coverage` (target >80%)
- [ ] Git commit: "test: add comprehensive WandService tests for all 10 wand types (Phase 1.2)"

**Coverage Goal**: WandService from 48.86% → >80%

---

#### Task 1.3: Add ItemSpawnService Cursed Item Generation Tests

**Context**: ItemSpawnService contains curse generation logic (lines 48-82) but lacks dedicated tests. The curse rate verification (5%/8%/12%) and Ring of Teleportation always-cursed behavior are untested.

**Critical Functionality Untested**:
- `rollCursedStatus(rarity)`: 5% common, 8% uncommon, 12% rare (lines 48-57)
- `rollEnchantment(rarity, isCursed)`: -1 to -3 cursed, +1 to +2 rare (lines 69-82)
- Ring of Teleportation always cursed (line 390)

**Files to create/modify**:
- `src/services/ItemSpawnService/cursed-item-generation.test.ts` (NEW)

##### Subtasks:
- [ ] Create `cursed-item-generation.test.ts` with curse rate tests
  - Test: Common items have 5% curse chance (MockRandom 0.04 = cursed, 0.06 = not cursed)
  - Test: Uncommon items have 8% curse chance
  - Test: Rare items have 12% curse chance
  - Test: Cursed items get -1 to -3 enchantment
  - Test: Rare non-cursed items get +1 to +2 enchantment
  - Test: Common non-cursed items get 0 enchantment
  - Test: Ring of Teleportation is ALWAYS cursed (even with 0.99 roll)
  - Test: Cursed weapon name formatted correctly (e.g., "Long Sword -2")
  - Test: Cursed armor name formatted correctly (e.g., "Plate Mail -1")
  - Test: Cursed ring name formatted correctly (e.g., "Ring of Protection -2")
  - Test: Enchantment range verification (-1, -2, -3 all possible)
  - Test: Positive enchantment range verification (+1, +2 all possible)
  - Expected: 13+ tests
- [ ] Use MockRandom with setSequence() for deterministic curse rolls
- [ ] Test spawn 1000 items to verify curse rate distribution (statistical test)
- [ ] Follow AAA pattern
- [ ] Run tests: `npm test ItemSpawnService`
- [ ] Verify coverage: `npm run test:coverage`
- [ ] Git commit: "test: add cursed item generation tests to ItemSpawnService (Phase 1.3)"

**Success Criteria**: All curse mechanics verified with deterministic tests

---

### Phase 2: Item Enhancement Bug Fixes (Priority: MEDIUM)

**Objective**: Fix item name updating and command layer logic violations

#### Task 2.1: Fix Enchant Scroll Name Updating Bug

**Context**: When enchanting items, the bonus increases but the name doesn't update. "Long Sword +1" stays "+1" even when enchanted to +2. This causes player confusion about actual item bonuses.

**Current Behavior**:
```typescript
// ScrollService.ts line 218
const enchantedWeapon: Weapon = { ...weapon, bonus: weapon.bonus + 1, cursed: false }
// Name still shows old bonus!
```

**Files to modify**:
- `src/services/InventoryService/InventoryService.ts` (ADD new method)
- `src/services/InventoryService/item-name-formatting.test.ts` (NEW)
- `src/services/ScrollService/ScrollService.ts` (MODIFY - use new method)
- `src/services/ScrollService/enchant-scrolls.test.ts` (MODIFY - add name verification)

##### Subtasks:
- [ ] Add `InventoryService.updateItemName(item: Item, newBonus: number): string` method
  - Extract base name (remove existing "+X" or "-X")
  - Append new bonus if non-zero: `${baseName} +${newBonus}` or `${baseName} ${newBonus}` (negative already has -)
  - Handle edge cases: unenchanted items (bonus 0), negative to positive transition
  - Return updated name string
- [ ] Write tests for `updateItemName()` in `item-name-formatting.test.ts`
  - Test: "Long Sword +1" → +2 = "Long Sword +2"
  - Test: "Long Sword +2" → +3 = "Long Sword +3"
  - Test: "Long Sword -1" → +0 = "Long Sword"
  - Test: "Long Sword -1" → +1 = "Long Sword +1"
  - Test: "Long Sword" → +1 = "Long Sword +1"
  - Test: "Plate Mail +1" → +2 = "Plate Mail +2"
  - Test: "Ring of Protection +1" → +2 = "Ring of Protection +2"
  - Expected: 7+ tests
- [ ] Update `ScrollService.applyEnchantWeapon()` to use `inventoryService.updateItemName()`
  - Calculate new bonus
  - Call updateItemName() for name
  - Return updated weapon with new name and bonus
- [ ] Update `ScrollService.applyEnchantArmor()` similarly
- [ ] Add tests to `enchant-scrolls.test.ts` verifying name updates
  - Test: Enchanting weapon updates name to reflect new bonus
  - Test: Enchanting armor updates name to reflect new bonus
  - Test: Enchanting cursed item removes "(cursed)" and updates bonus
  - Expected: 3+ new tests
- [ ] Run tests: `npm test InventoryService` and `npm test ScrollService`
- [ ] Git commit: "fix: enchant scrolls now update item names to reflect new bonuses (Phase 2.1)"

**User Impact**: Players will see accurate item names after enchanting

---

#### Task 2.2: Extract PickUpCommand Filter Logic to LevelService

**Context**: PickUpCommand contains array filtering logic (line 56) which violates the Command Layer principle. Array manipulation is business logic that belongs in a service.

**Current Code**:
```typescript
// PickUpCommand.ts line 56
const updatedItems = level.items.filter((item) => item.id !== itemAtPosition.id)
```

**Files to modify**:
- `src/services/LevelService/LevelService.ts` (ADD new method)
- `src/services/LevelService/item-removal.test.ts` (NEW)
- `src/commands/PickUpCommand/PickUpCommand.ts` (MODIFY - use service method)

##### Subtasks:
- [ ] Add `LevelService.removeItemFromLevel(level: Level, itemId: string): Level` method
  - Filter items array to exclude item with matching ID
  - Return new Level object with updated items array (immutable)
  - Handle edge case: item not found (return original level unchanged)
- [ ] Write tests for `removeItemFromLevel()` in `item-removal.test.ts`
  - Test: Removing existing item returns level without that item
  - Test: Items array length decreases by 1
  - Test: Other items remain unchanged
  - Test: Removing non-existent item returns original level
  - Test: Original level object not mutated (immutability check)
  - Expected: 5+ tests
- [ ] Update PickUpCommand to use `levelService.removeItemFromLevel()`
  - Replace filter logic with service call
  - Verify PickUpCommand has no remaining array manipulation
- [ ] Update PickUpCommand tests if needed
- [ ] Run tests: `npm test LevelService` and `npm test PickUpCommand`
- [ ] Verify PickUpCommand follows orchestration pattern
- [ ] Git commit: "refactor: extract PickUpCommand filter logic to LevelService (Phase 2.2)"

**Architecture Verification**:
- ✅ PickUpCommand has ZERO array manipulation
- ✅ All item removal logic in LevelService

---

### Phase 3: Documentation & Polish (Priority: LOW)

**Objective**: Improve code documentation, message consistency, and API clarity

#### Task 3.1: Document Polymorph Wand Limitation

**Context**: POLYMORPH wand has a simplified v1 implementation - it renames the monster and resets HP instead of fully transforming to a different monster type. This should be documented as a known limitation.

**Current Implementation** (WandService.ts lines 321-342):
- Renames to "Polymorphed {name}"
- Resets HP to maxHp
- Does NOT change monster type/depth

**Files to modify**:
- `src/services/WandService/WandService.ts` (ADD TODO comment)
- `docs/game-design/05-items.md` (ADD known limitation section)
- `docs/plans/item_generation_plan.md` (ADD future enhancement note)

##### Subtasks:
- [ ] Add TODO comment in WandService.applyPolymorph() method
  ```typescript
  // TODO: Full polymorph implementation for v2
  // Current behavior: Renames monster and resets HP (simplified v1)
  // Future: Use MonsterSpawnService to spawn new monster of same depth
  // Challenges: Preserve position, handle monster data transitions
  ```
- [ ] Update `docs/game-design/05-items.md` wand section
  - Add "Known Limitations" subsection under Wands
  - Document: "POLYMORPH wand (v1): Renames monster and resets HP. Full transformation to different monster type coming in v2."
- [ ] Update `docs/plans/item_generation_plan.md` Post-Implementation section
  - Add follow-up task: "[ ] Implement full POLYMORPH transformation using MonsterSpawnService"
  - Add note about technical challenges (monster data migration, position preservation)
- [ ] Run tests to ensure no regressions: `npm test WandService`
- [ ] Git commit: "docs: document POLYMORPH wand v1 limitation and future enhancement (Phase 3.1)"

**User Impact**: Transparent about feature scope, sets expectations for future improvements

---

#### Task 3.2: Fix Curse Message Consistency

**Context**: EquipCommand curse discovery message uses `item.name` instead of `displayName`, creating inconsistency with the equip success message which uses `displayName`.

**Current Code** (EquipCommand.ts lines 133-139):
```typescript
messages = this.messageService.addMessage(
  messages,
  `The ${item.name} is cursed! You cannot remove it.`,  // ← Should use displayName
  'warning',
  state.turnCount
)
```

**Files to modify**:
- `src/commands/EquipCommand/EquipCommand.ts` (line 136)
- `src/commands/EquipCommand/EquipCommand.test.ts` (verify message format)

##### Subtasks:
- [ ] Change curse message to use `displayName` instead of `item.name`
  - Update line 136: `The ${displayName} is cursed! You cannot remove it.`
  - Maintains consistency with equip success message
- [ ] Verify tests still pass with updated message format
  - Check curse discovery tests use correct display name
  - Add test if needed: "curse message uses display name not raw name"
- [ ] Run tests: `npm test EquipCommand`
- [ ] Git commit: "fix: use displayName for curse message consistency (Phase 3.2)"

**User Impact**: Consistent item naming across all messages

---

#### Task 3.3: Add Missing JSDoc to Public Methods

**Context**: Some public service methods lack JSDoc comments, reducing code maintainability and IDE intellisense quality.

**Missing JSDoc Methods**:
- `WandService.applyWandEffect()` - main public method
- `LevelService.removeItemFromLevel()` - new method from Task 2.2
- Various RestService methods - new service from Task 1.1

**Files to modify**:
- `src/services/WandService/WandService.ts`
- `src/services/LevelService/LevelService.ts`
- `src/services/RestService/RestService.ts`

##### Subtasks:
- [ ] Add JSDoc to `WandService.applyWandEffect()`
  ```typescript
  /**
   * Apply wand effect to target monster
   * Handles all 10 wand types: damage, status effects, utility
   *
   * @param wand - Wand being used
   * @param target - Monster targeted by wand
   * @param level - Current level
   * @param state - Current game state
   * @param displayName - Wand display name for messages
   * @returns WandEffectResult with updated state and message
   */
  ```
- [ ] Add JSDoc to `LevelService.removeItemFromLevel()`
  ```typescript
  /**
   * Remove item from level's item list
   * Returns new Level object with item removed (immutable)
   *
   * @param level - Level to remove item from
   * @param itemId - ID of item to remove
   * @returns New Level object without the item
   */
  ```
- [ ] Add JSDoc to `RestService.executeRest()` and other public methods
  ```typescript
  /**
   * Execute rest loop until HP full or interrupted
   * Handles hunger, regeneration, fuel consumption, FOV updates, enemy detection
   *
   * @param player - Player resting
   * @param state - Current game state
   * @returns RestResult with updated player, state, messages, turn count
   */
  ```
- [ ] Follow existing JSDoc patterns in codebase
  - Use `@param` for parameters with types and descriptions
  - Use `@returns` for return values
  - Include brief description of method behavior
- [ ] Verify JSDoc renders correctly in IDE (VSCode hover)
- [ ] Git commit: "docs: add JSDoc comments to public service methods (Phase 3.3)"

**Developer Impact**: Better code documentation and IDE support

---

## 4. Technical Design

### Data Structures

**New Interfaces**:

```typescript
// RestResult - returned by RestService.executeRest()
interface RestResult {
  player: Player                 // Updated player with HP, hunger, fuel changes
  state: GameState              // Updated game state with FOV, levels
  messages: Message[]           // Messages accumulated during rest
  turnsRested: number           // How many turns player rested
  interrupted: boolean          // Whether rest was interrupted
  interruptReason: string       // Why rest was interrupted (if applicable)
}
```

**Modified Interfaces**: None (all changes backward compatible)

### Service Architecture

**New Services**:
- **RestService**: Handles rest loop logic with hunger, regeneration, fuel consumption, FOV updates, and interrupt detection
  - Dependencies: HungerService, RegenerationService, LightingService, FOVService, MessageService, TurnService
  - Methods: `executeRest(player: Player, state: GameState): RestResult`

**Modified Services**:
- **InventoryService**: Add `updateItemName(item: Item, newBonus: number): string` for enchant name formatting
- **LevelService**: Add `removeItemFromLevel(level: Level, itemId: string): Level` for item removal
- **ScrollService**: Use InventoryService.updateItemName() when enchanting items

**Service Dependencies**:
```
RestService
  ├─ depends on → HungerService
  ├─ depends on → RegenerationService
  ├─ depends on → LightingService
  ├─ depends on → FOVService
  ├─ depends on → MessageService
  └─ depends on → TurnService

ScrollService
  └─ depends on → InventoryService (NEW)

PickUpCommand
  └─ depends on → LevelService (UPDATED)

RestCommand
  └─ depends on → RestService (NEW)
```

### Algorithms & Formulas

**Rest Loop Algorithm**:
```
Initialize: currentState = state, turnsRested = 0, interrupted = false

While (player.hp < player.maxHp AND !interrupted):
  1. Tick hunger → check for starvation death or interrupt
  2. Tick regeneration (if not in combat)
  3. Tick light fuel
  4. Update FOV and exploration
  5. Check for enemy in FOV → interrupt if true
  6. Increment turnsRested
  7. Check safety limit (1000 turns) → interrupt if exceeded

Return RestResult with final state
```

**Item Name Update Algorithm**:
```
Input: item name (e.g., "Long Sword +1"), new bonus (e.g., 2)

Step 1: Extract base name using regex
  - Match pattern: /^(.*?)\s*[+-]\d+$/ → capture group 1
  - If no match, use full name as base

Step 2: Format new name
  - If bonus === 0: return baseName
  - If bonus > 0: return `${baseName} +${bonus}`
  - If bonus < 0: return `${baseName} ${bonus}` (negative sign included)

Return: updated name
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- **RestService**: >90% (all rest loop branches)
- **WandService**: 48.86% → >80% (add 6 wand types)
- **ItemSpawnService**: Add curse generation tests (aim >85%)
- **InventoryService**: Item name formatting >90%
- **LevelService**: Item removal >90%
- **Overall**: Maintain >80%

**Test Files**:
- `RestService/rest-loop.test.ts` - Rest mechanics, interrupts, starvation
- `WandService/wand-status-effects.test.ts` - SLEEP, SLOW, HASTE, CANCELLATION
- `WandService/wand-utility-effects.test.ts` - TELEPORT, POLYMORPH
- `ItemSpawnService/cursed-item-generation.test.ts` - Curse rates, Ring of Teleportation
- `InventoryService/item-name-formatting.test.ts` - Name updates with bonuses
- `LevelService/item-removal.test.ts` - Item removal from levels
- `ScrollService/enchant-scrolls.test.ts` - Update to verify name changes

### Test Scenarios

**Scenario 1: Rest Until Full HP**
- Given: Player at 50% HP, no enemies nearby
- When: Player rests
- Then: HP reaches maxHp, turns increment, hunger decreases, fuel consumed

**Scenario 2: Rest Interrupted by Enemy**
- Given: Player resting, enemy moves into FOV
- When: FOV update detects enemy
- Then: Rest interrupted, message shown, partial HP restored

**Scenario 3: Starvation During Rest**
- Given: Player at low hunger, begins resting
- When: Hunger reaches 0 during rest
- Then: Player dies, death cause = starvation, appropriate messages shown

**Scenario 4: Cursed Item Generation**
- Given: ItemSpawnService spawning rare weapon
- When: MockRandom returns 0.11 (< 12% curse chance)
- Then: Weapon is cursed, bonus is -1 to -3, name shows negative

**Scenario 5: Enchant Scroll Name Update**
- Given: Cursed "Long Sword -1" in player inventory
- When: Scroll of Enchant Weapon used
- Then: Weapon becomes "Long Sword", bonus = 0, cursed = false

**Scenario 6: SLEEP Wand Effect**
- Given: Player zaps adjacent monster with Wand of Sleep
- When: WandService.applyWandEffect() called with SLEEP type
- Then: Monster gains SLEEPING status, isAsleep = true, duration 3-6 turns

**Scenario 7: TELEPORT_AWAY Wand Effect**
- Given: Player zaps monster with Wand of Teleport Away
- When: WandService.applyWandEffect() called with TELEPORT_AWAY type
- Then: Monster position changes to random walkable tile, not original position

**Scenario 8: Ring of Teleportation Always Cursed**
- Given: ItemSpawnService spawning Ring of Teleportation
- When: MockRandom returns 0.01 (would normally not be cursed)
- Then: Ring is still cursed (special case overrides roll)

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **RestCommand**: Simplified to call RestService.executeRest() - pure orchestration
- **PickUpCommand**: Use LevelService.removeItemFromLevel() instead of inline filter

**Command Pattern** (RestCommand After Refactor):
```typescript
export class RestCommand implements ICommand {
  constructor(private restService: RestService) {}

  execute(state: GameState): GameState {
    const result = this.restService.executeRest(state.player, state)

    return {
      ...result.state,
      player: result.player,
      messages: result.messages,
    }
  }
}
```

### UI Changes

**No UI Changes Required** - All fixes are internal logic/architecture improvements

### State Updates

**No GameState Interface Changes** - All modifications use existing fields

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/services/RestService.md` - Full service documentation
- [x] Update `docs/game-design/05-items.md` - Add POLYMORPH limitation note
- [x] Update `docs/plans/item_generation_plan.md` - Add future enhancement for POLYMORPH
- [x] Update `docs/architecture.md` - Add RestService to service catalog
- [x] Add JSDoc to public methods in WandService, LevelService, RestService

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: RestCommand Refactor Breaking Tests**
- **Problem**: Moving logic from RestCommand to RestService will break existing RestCommand tests
- **Mitigation**: Update tests incrementally, ensure new RestService tests cover all scenarios first

**Issue 2: Performance of TELEPORT_AWAY Wand**
- **Problem**: O(width * height) scan of entire level for walkable tiles
- **Mitigation**: Acceptable for v1 (rare operation), consider caching walkable tiles in LevelService for v2

**Issue 3: Item Name Regex Complexity**
- **Problem**: Regex for extracting base name could fail on edge cases
- **Mitigation**: Comprehensive tests with various name formats, handle no-match gracefully

**Issue 4: MockRandom Determinism in Curse Tests**
- **Problem**: Curse rate tests rely on MockRandom.setSequence() being called correctly
- **Mitigation**: Clear documentation in tests, follow existing MockRandom patterns in codebase

### Breaking Changes

**None** - All changes are backward compatible:
- RestService is new (no breaking changes)
- LevelService.removeItemFromLevel() is new (no breaking changes)
- InventoryService.updateItemName() is new (no breaking changes)
- ScrollService internal changes (no public API changes)

### Performance Considerations

**TELEPORT_AWAY Wand**: O(width * height) scan for walkable tiles
- **Impact**: LOW - only runs when wand used (rare)
- **Optimization**: Consider caching walkable tiles in Level object (future enhancement)

**Rest Loop**: No changes to performance characteristics
- Logic moved from RestCommand to RestService (same complexity)

---

## 9. Timeline & Dependencies

### Dependencies

**Blocked by**: None - PR #3 already merged, this plan addresses review feedback

**Blocks**: None - quality improvements, doesn't block new features

### Estimated Timeline

- **Phase 1 (Critical)**: 4-5 hours
  - Task 1.1 (RestService extraction): 2-3 hours
  - Task 1.2 (WandService tests): 1-2 hours
  - Task 1.3 (ItemSpawnService tests): 1 hour

- **Phase 2 (Medium)**: 1-2 hours
  - Task 2.1 (Enchant name fix): 1 hour
  - Task 2.2 (PickUpCommand refactor): 0.5 hours

- **Phase 3 (Low)**: 0.5-1 hours
  - Task 3.1 (Polymorph docs): 0.25 hours
  - Task 3.2 (Message consistency): 0.25 hours
  - Task 3.3 (JSDoc): 0.5 hours

**Total Estimated Time**: 5.5-8 hours

### Execution Order

**Recommended Order**:
1. Phase 1.3 (ItemSpawnService tests) - Independent, quick win
2. Phase 1.2 (WandService tests) - Independent, medium complexity
3. Phase 2.1 (Enchant name fix) - Independent, clear scope
4. Phase 2.2 (PickUpCommand refactor) - Independent, quick
5. Phase 1.1 (RestService extraction) - Complex, do last with full focus
6. Phase 3 (All) - Polish after critical work complete

---

## 10. Post-Implementation

### Verification Checklist

- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
  - [ ] RestService >90%
  - [ ] WandService >80% (from 48.86%)
  - [ ] ItemSpawnService >85%
- [ ] Architectural review completed:
  - [ ] RestCommand has ZERO loops, calculations, or array manipulation
  - [ ] PickUpCommand has ZERO array manipulation
  - [ ] All logic in services, commands orchestrate only
- [ ] Documentation updated:
  - [ ] RestService.md created
  - [ ] Game design docs updated
  - [ ] JSDoc added to all public methods
- [ ] Manual testing completed:
  - [ ] Rest until full HP
  - [ ] Rest interrupted by enemy
  - [ ] Enchant weapon/armor shows updated name
  - [ ] All 10 wand types functional
  - [ ] Cursed items generate correctly

### Follow-Up Tasks

**Future Enhancements** (defer to post-v1):
- [ ] Implement full POLYMORPH transformation using MonsterSpawnService
- [ ] Cache walkable tiles in Level for TELEPORT_AWAY performance
- [ ] Add visual indicators for item quality in inventory (color coding)
- [ ] Implement remaining 5 ring types (SEARCHING, SEE_INVISIBLE, etc.)

---

**Last Updated**: 2025-10-06
**Status**: 🚧 In Progress
