# Potion System Refactor - Critical Fixes

**Status**: ✅ Complete
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Potion Implementation Plan](./potion_implementation_plan.md) | [Game Design: Items](../game-design/05-items.md) | [PotionService](../services/PotionService.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Fix critical spawn configuration bug preventing 2 fully-implemented potions (SEE_INVISIBLE and LEVITATION) from appearing in the game, add missing unit tests, and correct documentation discrepancies.

### Design Philosophy
- **No Breaking Changes**: All implementation code is correct - only fix configuration and tests
- **Minimal Risk**: Low-risk changes targeting data files and test coverage
- **Complete Coverage**: Ensure all 13 implemented potions are fully tested and accessible

### Success Criteria
- [x] Analysis completed - identified missing potions and test gaps
- [x] SEE_INVISIBLE and LEVITATION spawn in-game
- [x] Dedicated unit tests exist for all 13 potion types
- [x] Documentation reflects accurate potion count (13, not 11)
- [x] All tests pass with >80% coverage
- [x] Manual verification: all potions spawn correctly

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Items: Potions](../game-design/05-items.md#potions-) - Complete potion specification
- [PotionService Documentation](../services/PotionService.md) - Service architecture
- [Original Potion Implementation Plan](./potion_implementation_plan.md) - Historical context

### Related Systems
- **ItemSpawnService**: Uses `items.json` to spawn potions on dungeon levels
- **PotionService**: All 13 potions fully implemented with correct mechanics
- **StatusEffectService**: Handles LEVITATING and SEE_INVISIBLE status effects
- **TrapService**: LEVITATION tested via trap immunity integration tests
- **FOVService**: SEE_INVISIBLE tested via integration tests

### Critical Issues Identified

**Issue 1: Missing Spawn Configuration (CRITICAL)**
- **Problem**: `items.json` only defines 11/13 potions
- **Missing**: SEE_INVISIBLE, LEVITATION
- **Impact**: These potions cannot spawn in-game despite being fully implemented
- **Evidence**:
  ```bash
  # items.json has only these 11:
  HEAL, EXTRA_HEAL, GAIN_STRENGTH, RESTORE_STRENGTH, POISON,
  CONFUSION, BLINDNESS, HASTE_SELF, DETECT_MONSTERS, DETECT_MAGIC, RAISE_LEVEL
  ```

**Issue 2: Documentation Count Discrepancy**
- **Problem**: `docs/game-design/05-items.md:105` claims "11 core potions"
- **Reality**: 13 potion types exist in codebase
- **Impact**: Confusing for developers reading documentation

**Issue 3: Missing Dedicated Unit Tests**
- **Problem**: SEE_INVISIBLE and LEVITATION lack dedicated unit test files
- **Current Testing**: Only covered via integration tests
- **Impact**: Reduced test discoverability, harder to debug edge cases

---

## 3. Phases & Tasks

### Phase 1: Fix Critical Spawn Configuration (Priority: HIGH)

**Objective**: Enable SEE_INVISIBLE and LEVITATION potions to spawn in-game

#### Task 1.1: Add SEE_INVISIBLE to items.json

**Context**: Potion is fully implemented but missing from spawn configuration

**Files to modify**:
- `public/data/items.json`

##### Subtasks:
- [x] Add SEE_INVISIBLE entry to `potions` array (lines 113-191)
- [x] Use correct fields: `type: "SEE_INVISIBLE"`, `effect: "see_invisible"`, `power: "0"`
- [x] Set rarity to `"uncommon"` (matches game design)
- [x] Add standard descriptors array
- [x] Verify JSON syntax validity
- [x] Git commit: "fix: add SEE_INVISIBLE potion to spawn configuration (Phase 1.1)"

**JSON Structure**:
```json
{
  "type": "SEE_INVISIBLE",
  "effect": "see_invisible",
  "power": "0",
  "rarity": "uncommon",
  "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
}
```

---

#### Task 1.2: Add LEVITATION to items.json

**Context**: Potion is fully implemented but missing from spawn configuration

**Files to modify**:
- `public/data/items.json`

##### Subtasks:
- [x] Add LEVITATION entry to `potions` array (after SEE_INVISIBLE)
- [x] Use correct fields: `type: "LEVITATION"`, `effect: "levitate"`, `power: "0"`
- [x] Set rarity to `"uncommon"` (matches game design)
- [x] Add standard descriptors array
- [x] Verify JSON syntax validity
- [x] Verify total potion count is now 13
- [x] Git commit: "fix: add LEVITATION potion to spawn configuration (Phase 1.2)"

**JSON Structure**:
```json
{
  "type": "LEVITATION",
  "effect": "levitate",
  "power": "0",
  "rarity": "uncommon",
  "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
}
```

---

#### Task 1.3: Manual Verification

**Context**: Ensure potions spawn correctly in-game

##### Subtasks:
- [x] Start new game
- [x] Explore multiple dungeon levels
- [x] Verify SEE_INVISIBLE potions appear
- [x] Verify LEVITATION potions appear
- [x] Test drinking both potions
- [x] Confirm status effects apply correctly
- [x] Git commit: "test: verify SEE_INVISIBLE and LEVITATION spawn in-game (Phase 1.3)"

---

### Phase 2: Add Dedicated Unit Tests (Priority: MEDIUM)

**Objective**: Create comprehensive unit tests for SEE_INVISIBLE and LEVITATION matching existing test patterns

#### Task 2.1: Create see-invisible-potion.test.ts

**Context**: Currently only tested via integration tests - need dedicated unit tests for edge cases

**Files to create**:
- `src/services/PotionService/see-invisible-potion.test.ts`

##### Subtasks:
- [x] Create test file following existing pattern (see `haste-potion.test.ts` as template)
- [x] Test: Applies SEE_INVISIBLE status effect with 999 turn duration
- [x] Test: Returns correct message ("Your eyes tingle. You can now see invisible creatures!")
- [x] Test: Does not modify player stats (HP, strength, level)
- [x] Test: Auto-identifies potion when consumed
- [x] Test: Does not kill player (death = false)
- [x] Test: Status effect persists across turns
- [x] Test: Integration with StatusEffectService
- [x] Verify >90% coverage for SEE_INVISIBLE code path
- [x] Git commit: "test: add comprehensive SEE_INVISIBLE potion unit tests (Phase 2.1)"

**Test Pattern**:
```typescript
describe('PotionService - SEE_INVISIBLE Potion', () => {
  test('applies SEE_INVISIBLE status effect with 999 turn duration', () => {
    // Given: Player without status effect
    // When: Drink SEE_INVISIBLE potion
    // Then: Status effect applied with 999 turns
  })

  test('returns correct message', () => {
    // Verify message matches design spec
  })

  // ... 6 more test cases
})
```

---

#### Task 2.2: Create levitation-potion.test.ts

**Context**: Currently only tested via TrapService integration - need dedicated unit tests

**Files to create**:
- `src/services/PotionService/levitation-potion.test.ts`

##### Subtasks:
- [x] Create test file following existing pattern (see `haste-potion.test.ts` as template)
- [x] Test: Applies LEVITATING status effect
- [x] Test: Duration is 29-32 turns (randomized)
- [x] Test: Returns correct message ("You begin to float above the ground!")
- [x] Test: Does not modify player stats (HP, strength, level)
- [x] Test: Auto-identifies potion when consumed
- [x] Test: Does not kill player (death = false)
- [x] Test: Duration randomization uses correct range
- [x] Test: Integration with StatusEffectService
- [x] Verify >90% coverage for LEVITATION code path
- [x] Git commit: "test: add comprehensive LEVITATION potion unit tests (Phase 2.2)"

**Test Pattern**:
```typescript
describe('PotionService - LEVITATION Potion', () => {
  test('applies LEVITATING status effect with correct duration range', () => {
    // Given: Player without status effect
    // When: Drink LEVITATION potion
    // Then: Status effect applied with 29-32 turn duration
  })

  test('returns correct message', () => {
    // Verify message matches design spec
  })

  // ... 6 more test cases
})
```

---

#### Task 2.3: Verify Test Coverage

**Context**: Ensure all potion code paths are tested

##### Subtasks:
- [x] Run `npm test -- PotionService --coverage`
- [x] Verify PotionService coverage >90%
- [x] Verify all 13 potion types have dedicated test files or integration tests
- [x] Update test count documentation
- [x] Git commit: "docs: update test coverage statistics (Phase 2.3)"

---

### Phase 3: Update Documentation (Priority: MEDIUM)

**Objective**: Correct documentation discrepancies and update test statistics

#### Task 3.1: Fix Potion Count in Game Design Docs

**Context**: Documentation incorrectly states "11 core potions" when 13 exist

**Files to modify**:
- `docs/game-design/05-items.md`

##### Subtasks:
- [x] Change line 105: "11 core potions" → "13 potions"
- [x] Verify all 13 potions are listed in documentation
- [x] Update test coverage statistics (line 113)
- [x] Ensure phase breakdown is correct (lines 107-111)
- [x] Git commit: "docs: correct potion count from 11 to 13 (Phase 3.1)"

**Changes Required**:
```markdown
# BEFORE (line 105)
**Total Potion Types**: 11 core potions ✅ **All Implemented**

# AFTER (line 105)
**Total Potion Types**: 13 potions ✅ **All Implemented**
```

---

#### Task 3.2: Update Test Coverage Statistics

**Context**: Test coverage stats may be outdated after adding new tests

**Files to modify**:
- `docs/game-design/05-items.md` (line 113)
- `docs/services/PotionService.md` (if coverage stats mentioned)

##### Subtasks:
- [x] Run `npm test` to get latest test counts
- [x] Update test suite count in game design docs
- [x] Update test count in PotionService docs
- [x] Verify all potion types listed in documentation summary table
- [x] Git commit: "docs: update potion test coverage statistics (Phase 3.2)"

---

#### Task 3.3: Verify Documentation Completeness

**Context**: Ensure all documentation is accurate and complete

##### Subtasks:
- [x] Verify items.md describes all 13 potions
- [x] Verify PotionService.md lists all 13 potions
- [x] Verify quaff.md references all potion types
- [x] Check for any other references to "11 potions"
- [x] Git commit: "docs: verify and complete potion documentation (Phase 3.3)"

---

## 4. Technical Design

### Data Structures

**items.json Potion Entry**:
```json
{
  "type": "POTION_TYPE_ENUM",       // Must match PotionType enum
  "effect": "effect_name",            // Human-readable effect descriptor
  "power": "dice_notation_or_value", // "1d8", "2d8+2", "0", etc.
  "rarity": "common|uncommon|rare|legendary",
  "descriptors": [                    // Randomized color names
    "blue", "red", "clear", "fizzy",
    "dark", "cloudy", "smoky", "bubbling"
  ]
}
```

### Service Architecture

**No Service Changes Required**:
- ✅ PotionService already implements all 13 potions correctly
- ✅ StatusEffectService already handles all status effects
- ✅ QuaffPotionCommand already orchestrates correctly

**Configuration Change Only**:
- `items.json` → ItemSpawnService → PotionService (chain works, just missing config)

### Algorithms & Formulas

**No Algorithm Changes Required** - all mechanics already implemented:

**SEE_INVISIBLE Duration**:
```
duration = 999 turns (effectively permanent until level change)
```

**LEVITATION Duration**:
```
duration = random(29, 32) turns
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- PotionService: >90% (currently high, add 2 test files to reach 95%+)
- Commands: >80% (QuaffPotionCommand already well-tested)
- Overall: >80% (currently passing)

**New Test Files**:
- `see-invisible-potion.test.ts` - SEE_INVISIBLE potion behavior
- `levitation-potion.test.ts` - LEVITATION potion behavior

**Existing Integration Tests** (no changes needed):
- `potion-status-cure.test.ts` - Status effect integration
- `trap-effects.test.ts` - LEVITATION trap immunity

### Test Scenarios

**Scenario 1: SEE_INVISIBLE Potion Application**
- Given: Player without SEE_INVISIBLE status
- When: Quaff SEE_INVISIBLE potion
- Then:
  - Status effect applied with 999 turn duration
  - Message: "Your eyes tingle. You can now see invisible creatures!"
  - Player stats unchanged
  - Potion identified

**Scenario 2: LEVITATION Potion Application**
- Given: Player without LEVITATING status
- When: Quaff LEVITATION potion
- Then:
  - Status effect applied with 29-32 turn duration (randomized)
  - Message: "You begin to float above the ground!"
  - Player stats unchanged
  - Potion identified

**Scenario 3: SEE_INVISIBLE Duration**
- Given: Player with SEE_INVISIBLE status (999 turns)
- When: Multiple turns pass
- Then: Status persists until stairs or duration expires

**Scenario 4: LEVITATION Duration Randomization**
- Given: Mock random values for duration
- When: Drink LEVITATION potion
- Then: Duration correctly uses `random.nextInt(29, 32)`

**Scenario 5: In-Game Spawning**
- Given: New game started
- When: Explore dungeon levels
- Then: SEE_INVISIBLE and LEVITATION potions spawn on floors

---

## 6. Integration Points

### Commands

**No Command Changes Required**:
- QuaffPotionCommand already handles all potion types correctly

### UI Changes

**No UI Changes Required**:
- Potions already render correctly
- Status effects already display correctly

### State Updates

**No State Changes Required**:
- GameState already supports `detectedMonsters`, `detectedMagicItems`
- Player already supports `statusEffects` array

### Configuration Changes

**items.json**:
```json
{
  "potions": [
    // ... existing 11 potions (lines 113-190) ...
    {
      "type": "SEE_INVISIBLE",
      "effect": "see_invisible",
      "power": "0",
      "rarity": "uncommon",
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    },
    {
      "type": "LEVITATION",
      "effect": "levitate",
      "power": "0",
      "rarity": "uncommon",
      "descriptors": ["blue", "red", "clear", "fizzy", "dark", "cloudy", "smoky", "bubbling"]
    }
  ]
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/plans/potion_refactor.md` - This plan
- [x] Update `docs/game-design/05-items.md` - Fix potion count (11 → 13)
- [x] Update `docs/services/PotionService.md` - Update test coverage stats
- [x] Verify `docs/commands/quaff.md` - Ensure all 13 potions referenced
- [x] Update `docs/plans/README.md` - Add this plan to active plans list

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: JSON Syntax Error**
- **Problem**: Malformed JSON could break item spawning entirely
- **Mitigation**:
  - Validate JSON syntax before committing
  - Use JSON linter
  - Test in-game immediately after changes

**Issue 2: Descriptor Conflicts**
- **Problem**: Duplicate descriptors could cause identification issues
- **Mitigation**: Use same descriptor pool as other potions (consistent behavior)

**Issue 3: Rarity Balance**
- **Problem**: Wrong rarity could make potions too common/rare
- **Mitigation**:
  - SEE_INVISIBLE: "uncommon" (matches game design spec)
  - LEVITATION: "uncommon" (matches game design spec)

### Breaking Changes
- **None** - This is purely additive/corrective

### Performance Considerations
- **None** - No performance impact (configuration only)

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (all implementation complete)
- **Blocks**: None (cosmetic fix)

### Estimated Timeline
- Phase 1: 30 minutes (add 2 JSON entries + manual test)
- Phase 2: 2 hours (write 2 test files + verify coverage)
- Phase 3: 30 minutes (update documentation)
- **Total**: 3 hours

---

## 10. Post-Implementation

### Verification Checklist
- [x] All tests passing (`npm test`)
- [x] Type checking passing (`npm run type-check`)
- [x] Coverage >80% (`npm run test:coverage`)
- [x] SEE_INVISIBLE potion spawns in-game
- [x] LEVITATION potion spawns in-game
- [x] SEE_INVISIBLE effect works (reveals invisible monsters)
- [x] LEVITATION effect works (floats over traps)
- [x] Documentation reflects correct count (13 potions)
- [x] No broken references to "11 potions"
- [x] items.json has valid syntax
- [x] All 13 potion types have test coverage

### Follow-Up Tasks
- [ ] Consider adding rarity balance testing (future enhancement)
- [ ] Consider adding potion spawn rate analytics (future enhancement)
- [ ] Monitor player feedback on SEE_INVISIBLE and LEVITATION availability

---

## Appendix: Current Implementation Status

### All 13 Potion Types (Analysis Summary)

| # | Potion | Power | Implementation | Tests | Spawn Config |
|---|--------|-------|----------------|-------|--------------|
| 1 | HEAL | 1d8 | ✅ | ✅ heal-potions.test.ts | ✅ items.json |
| 2 | EXTRA_HEAL | 2d8+2 | ✅ | ✅ heal-potions.test.ts | ✅ items.json |
| 3 | GAIN_STRENGTH | +1 | ✅ | ✅ strength-potions.test.ts | ✅ items.json |
| 4 | RESTORE_STRENGTH | restore | ✅ | ✅ strength-potions.test.ts | ✅ items.json |
| 5 | POISON | 1d6 | ✅ | ✅ poison-potion.test.ts | ✅ items.json |
| 6 | RAISE_LEVEL | +1 level | ✅ | ✅ raise-level-potion.test.ts | ✅ items.json |
| 7 | DETECT_MONSTERS | reveal | ✅ | ✅ detection-potions.test.ts | ✅ items.json |
| 8 | DETECT_MAGIC | reveal | ✅ | ✅ detection-potions.test.ts | ✅ items.json |
| 9 | CONFUSION | 19-21 turns | ✅ | ✅ confusion-potion.test.ts | ✅ items.json |
| 10 | BLINDNESS | 40-60 turns | ✅ | ✅ blindness-potion.test.ts | ✅ items.json |
| 11 | HASTE_SELF | 4-8 turns | ✅ | ✅ haste-potion.test.ts | ✅ items.json |
| 12 | **SEE_INVISIBLE** | 999 turns | ✅ | ✅ see-invisible-potion.test.ts | ✅ items.json |
| 13 | **LEVITATION** | 29-32 turns | ✅ | ✅ levitation-potion.test.ts | ✅ items.json |

**Legend**:
- ✅ Complete
- ⚠️ Partial (integration tests exist, dedicated unit tests missing)
- ❌ Missing

---

**Last Updated**: 2025-10-09
**Status**: ✅ Complete
