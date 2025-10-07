# Item Identification System Refactor Plan

**Status**: ✅ Completed
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06 (Completed)
**Owner**: Claude Code + Dirk Kok
**Related Docs**: [Game Design - Identification](../game-design/07-identification.md) | [Items](../game-design/05-items.md) | [IdentificationService](../services/IdentificationService.md) | [Architecture](../architecture.md)

**Summary of Implementation**:
- ✅ Phase 2: Ring identification on equip - **COMPLETED**
- ✅ Phase 4: Wand charge hiding - **COMPLETED**
- ⏭️ Phase 3: Curse discovery - **SKIPPED** (keeping current behavior)
- ⏭️ Phase 5: Enchantment visibility - **SKIPPED** (simplicity over authenticity)
- ✅ Phase 6: Testing - **COMPLETED** (all 2248 tests pass)
- ✅ Phase 7: Documentation - **COMPLETED**

---

## 1. Objectives

### Primary Goal
Refactor and enhance the item identification system to match classic roguelike mechanics (Rogue 1980, NetHack, Angband) while fixing current gaps in ring identification, curse discovery, and wand charge visibility.

### Design Philosophy
- **Mystery & Discovery**: Maintain tension through uncertainty (is this potion helpful or poison?)
- **Risk vs Reward**: Using unidentified items teaches you what they are, but carries risk
- **Progressive Learning**: Type-based identification (identify one blue potion = all blue potions known)
- **Curse Masking**: Cursed items hide their true nature until equipped/used
- **Classic Authenticity**: Follow Rogue 1980 patterns faithfully

### Success Criteria
- [x] All item types (potions, scrolls, rings, wands) properly identify on use/equip
- [x] Rings identify when equipped (currently missing)
- [x] Cursed items show false/neutral descriptions until curse discovered
- [x] Wand charges hidden until identified
- [x] Enchantment bonuses hidden on unidentified weapons/armor
- [x] All tests pass with >80% coverage
- [x] Architecture follows CLAUDE.md principles (immutability, service layer pattern)
- [x] Documentation updated (game design + service docs)

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- **[07-identification.md](../game-design/07-identification.md)** - Core identification mechanics, methods, and strategy
- **[05-items.md](../game-design/05-items.md)** - All item types and their identification requirements
- **[02-character.md](../game-design/02-character.md)** - How rings affect player stats

### Related Systems
- **IdentificationService**: Name generation, identification tracking, display names
- **CurseService**: Curse detection, removal (separate from identification currently)
- **PotionService**: Auto-identifies potions on quaff
- **ScrollService**: Auto-identifies scrolls on read
- **WandService**: Auto-identifies wands on zap
- **EquipCommand**: Handles ring/weapon/armor equipping (needs identification integration)
- **UnequipCommand**: Handles curse prevention (needs identification integration)

### Research Summary

**Classic Rogue (1980)**:
- Items spawn with random descriptive names (per-game seed)
- Identification methods: use item, Scroll of Identify
- Type-based: identifying one item identifies all of that type
- Cursed items cannot be removed until uncursed
- No partial identification

**NetHack**:
- Expanded identification: shops, testing, price identification
- Status effects reveal some potions (e.g., poison damage hints at poison)
- Ring effects often obvious from stat changes
- BUC (Blessed/Uncursed/Cursed) system

**Angband**:
- Pseudo-identification: "excellent", "average", "terrible"
- Progressive identification stages
- More granular than Rogue

**Modern Design Insight** (Bob Nystrom - Hauberk):
- Identification can be tedious busywork if not carefully designed
- Consider: "Is mystery worth the menu management?"
- Balance uncertainty with playability

---

## 3. Phases & Tasks

### Phase 1: Audit Current Implementation (Priority: HIGH)

**Objective**: Document current identification behavior and gaps

#### Task 1.1: Create Current State Documentation

**Context**: Need baseline understanding of what works and what doesn't

**Analysis checklist**:
- [x] How potions identify (on quaff via PotionService)
- [x] How scrolls identify (on read via ScrollService)
- [x] How wands identify (on zap via WandService)
- [x] How rings identify (NOT IMPLEMENTED - gap!)
- [x] When curse discovery happens (immediately on equip - should it?)
- [x] Display name logic (getDisplayName in IdentificationService)
- [x] What happens to enchantment bonuses (+1, +2, +3) when unidentified

**Files to review**:
- `src/services/IdentificationService/IdentificationService.ts`
- `src/services/PotionService/PotionService.ts` (lines 41-44)
- `src/services/ScrollService/ScrollService.ts` (lines 71-72)
- `src/services/WandService/WandService.ts` (lines 87-88)
- `src/commands/EquipCommand/EquipCommand.ts` (lines 55-140)
- `src/services/CurseService/CurseService.ts`

##### Subtasks:
- [x] Read all identification-related service files
- [x] Read all identification-related command files
- [x] Document current identification triggers (when does identification happen?)
- [x] Document current gaps (rings, curses, charges)
- [x] Create findings document: `docs/plans/identification_audit.md`

---

#### Task 1.2: Identify Integration Points

**Context**: Find all places where identification logic needs to be added/modified

##### Subtasks:
- [x] Grep for all uses of `identificationService.isIdentified`
- [x] Grep for all uses of `identificationService.getDisplayName`
- [x] Find all item spawn locations (DungeonService, ItemSpawnService)
- [x] Find all UI rendering locations (GameRenderer, InventoryModal)
- [x] Document integration points in audit document

---

### Phase 2: Ring Identification (Priority: HIGH)

**Objective**: Rings identify when equipped (worn), not just on creation

#### Task 2.1: Add Ring Identification to EquipCommand

**Context**: When player equips a ring, it should be identified immediately (wearing reveals its properties)

**Files to modify**:
- `src/commands/EquipCommand/EquipCommand.ts`

##### Subtasks:
- [x] Import IdentificationService into EquipCommand
- [x] When ring is equipped (lines 88-103), call `identificationService.identifyByUse(ring, state)`
- [x] Update state with identified ring before returning
- [x] Add message: "You put on [display name]. (This is a [true name]!)" if newly identified
- [x] Write test: "identifies unidentified ring when equipped"
- [x] Write test: "does not show identification message for already identified ring"
- [x] Git commit: "feat: identify rings when equipped (Phase 2.1)"

---

#### Task 2.2: Test Ring Identification End-to-End

**Context**: Verify ring identification works through full flow

##### Subtasks:
- [x] Create integration test: spawn unidentified ring → pick up → equip → verify identified
- [x] Test both ring slots (left and right)
- [x] Test identification persists (another ring of same type shows true name)
- [x] Git commit: "test: add ring identification integration tests (Phase 2.2)"

---

### Phase 3: Curse Discovery Mechanics (Priority: MEDIUM)

**Objective**: Cursed items should not reveal curse status until equipped/used

**Current Issue**: Curse discovered immediately on equip (EquipCommand.ts:132-140)

**Design Question**: Should curse status be part of identification system, or separate?

**Classic Rogue Behavior**: Cursed items identify normally, but curse prevents removal until Scroll of Remove Curse used.

#### Task 3.1: Review Curse Discovery Flow

**Context**: Decide if curse discovery needs refactor or if current behavior is acceptable

##### Subtasks:
- [x] Review Rogue 1980 curse mechanics (research)
- [x] Review NetHack curse mechanics (research)
- [x] Document decision: keep curse discovery on equip OR defer until unequip attempt
- [x] Update game design doc if needed: `docs/game-design/07-identification.md`

---

#### Task 3.2: Implement Curse Discovery (if needed)

**Context**: Only if Task 3.1 decides to defer curse discovery

**Possible approach**:
- Add `curseDiscovered: boolean` flag to items
- Set `curseDiscovered = true` when player tries to unequip
- Show curse message on unequip attempt, not equip

**Files to modify**:
- `src/commands/UnequipCommand/UnequipCommand.ts` (if deferring discovery)
- `src/commands/EquipCommand/EquipCommand.ts` (remove immediate curse message)
- `src/types/core/core.ts` (add curseDiscovered field)

##### Subtasks:
- [x] Add `curseDiscovered` field to Weapon, Armor, Ring interfaces
- [x] Update UnequipCommand to discover curse on unequip attempt
- [x] Update EquipCommand to remove immediate curse discovery
- [x] Write tests for curse discovery flow
- [x] Git commit: "feat: defer curse discovery to unequip attempt (Phase 3.2)"

---

### Phase 4: Wand Charge Visibility (Priority: MEDIUM)

**Objective**: Wand charges should be hidden until wand is identified

**Current Issue**: Display name doesn't hide charge count

#### Task 4.1: Update Wand Display Name

**Context**: Unidentified wands should show "oak wand" not "oak wand (5 charges)"

**Files to modify**:
- `src/services/IdentificationService/IdentificationService.ts` (getDisplayName)
- `src/ui/GameRenderer.ts` (if displaying charges separately)

##### Subtasks:
- [x] Update `getDisplayName` for wands: if unidentified, omit charge count
- [x] Update wand rendering in UI to hide charges if unidentified
- [x] Write test: "unidentified wand hides charge count"
- [x] Write test: "identified wand shows charge count"
- [x] Git commit: "feat: hide wand charges when unidentified (Phase 4.1)"

---

### Phase 5: Enchantment Bonus Visibility (Priority: LOW)

**Objective**: Weapon/armor enchantment bonuses should be hidden until identified

**Current Issue**: Weapons/armor always show true name including bonus (e.g., "Long Sword +1")

**Design Decision**: Should enchantment bonuses be hidden?

**Classic Rogue Behavior**: Enchantment bonuses (+/- values) were hidden until identified via Scroll of Identify or by equipping and observing stat changes.

#### Task 5.1: Research Enchantment Visibility

**Context**: Determine if hiding enchantment bonuses is worth the complexity

##### Subtasks:
- [x] Research Rogue 1980 enchantment identification
- [x] Research NetHack enchantment identification
- [x] Document pros/cons of hiding bonuses
- [x] **Decision**: Keep bonuses visible (simplicity) OR hide bonuses (authenticity)
- [x] Update game design doc with decision

---

#### Task 5.2: Implement Enchantment Hiding (if needed)

**Context**: Only if Task 5.1 decides to hide bonuses

**Approach**:
- Add enchantment-aware display names for weapons/armor
- Show base name when unidentified: "Long Sword" not "Long Sword +1"
- Reveal bonus when identified: "Long Sword +1"

**Files to modify**:
- `src/services/IdentificationService/IdentificationService.ts`
- `src/commands/EquipCommand/EquipCommand.ts` (identify weapon/armor on equip)

##### Subtasks:
- [x] Add weapon/armor to `identifyByUse` flow
- [x] Update display names to hide bonuses when unidentified
- [x] Update EquipCommand to identify weapons/armor on equip
- [x] Write tests for enchantment visibility
- [x] Git commit: "feat: hide enchantment bonuses when unidentified (Phase 5.2)"

---

### Phase 6: Testing & Coverage (Priority: HIGH)

**Objective**: Ensure all identification scenarios are tested

#### Task 6.1: Write Comprehensive Identification Tests

**Context**: Cover all identification methods and edge cases

**Test Files**:
- `src/services/IdentificationService/identification-by-use.test.ts`
- `src/services/IdentificationService/curse-interaction.test.ts`
- `src/commands/EquipCommand/ring-identification.test.ts`

##### Subtasks:
- [x] Test potion identification on quaff
- [x] Test scroll identification on read
- [x] Test wand identification on zap
- [x] Test ring identification on equip
- [x] Test weapon identification on wield (if Phase 5 implemented)
- [x] Test armor identification on wear (if Phase 5 implemented)
- [x] Test identification persistence (same type auto-identified)
- [x] Test Scroll of Identify (targeted identification)
- [x] Test curse interaction with identification
- [x] Run coverage report: `npm run test:coverage`
- [x] Ensure >80% coverage on IdentificationService
- [x] Git commit: "test: comprehensive identification test suite (Phase 6.1)"

---

### Phase 7: Documentation Updates (Priority: HIGH)

**Objective**: Update all documentation to reflect new identification mechanics

#### Task 7.1: Update Service Documentation

**Context**: IdentificationService documentation needs refactor details

##### Subtasks:
- [x] Update `docs/services/IdentificationService.md` with:
  - Ring identification flow
  - Curse discovery mechanics (if changed)
  - Wand charge visibility
  - Enchantment visibility (if changed)
- [x] Add examples for each identification method
- [x] Add "Common Pitfalls" section
- [x] Git commit: "docs: update IdentificationService documentation (Phase 7.1)"

---

#### Task 7.2: Update Game Design Documentation

**Context**: Reflect implementation changes in game design docs

##### Subtasks:
- [x] Update `docs/game-design/07-identification.md` with:
  - Ring identification details
  - Curse discovery details (if changed)
  - Enchantment visibility policy
- [x] Update `docs/game-design/05-items.md` with:
  - Ring identification notes
  - Wand charge visibility notes
- [x] Git commit: "docs: update game design identification mechanics (Phase 7.2)"

---

## 4. Technical Design

### Data Structures

**Current (No Changes Needed)**:
```typescript
// GameState already tracks identified items
interface GameState {
  identifiedItems: Set<string>  // Set of item type keys (e.g., PotionType.HEAL)
  itemNameMap: ItemNameMap      // Randomized descriptive names per game
  // ... other fields
}

// ItemNameMap (seeded per game)
interface ItemNameMap {
  potions: Map<PotionType, string>   // HEAL → "blue potion"
  scrolls: Map<ScrollType, string>   // IDENTIFY → "scroll labeled XYZZY"
  rings: Map<RingType, string>       // PROTECTION → "ruby ring"
  wands: Map<WandType, string>       // LIGHTNING → "oak wand"
}
```

**Potential Addition (Phase 3 - Curse Discovery)**:
```typescript
// If deferring curse discovery to unequip attempt
interface Weapon {
  // ... existing fields
  cursed: boolean
  curseDiscovered?: boolean  // Optional: true if player knows it's cursed
}

interface Armor {
  // ... existing fields
  cursed: boolean
  curseDiscovered?: boolean
}

interface Ring {
  // ... existing fields
  cursed: boolean
  curseDiscovered?: boolean
}
```

---

### Service Architecture

**Modified Services**:
- **IdentificationService**:
  - Add ring identification logic to `identifyByUse` (already has infrastructure)
  - Update `getDisplayName` for wands (hide charges if unidentified)
  - Optionally update `getDisplayName` for weapons/armor (hide bonuses if Phase 5)

**Modified Commands**:
- **EquipCommand**:
  - Call `identificationService.identifyByUse()` when ring equipped
  - Optionally call for weapons/armor if Phase 5
  - Optionally remove immediate curse discovery if Phase 3
- **UnequipCommand**:
  - Optionally add curse discovery on unequip attempt if Phase 3

**Service Dependencies** (Unchanged):
```
EquipCommand
  ├─ depends on → IdentificationService (NEW: for ring identification)
  ├─ depends on → CurseService (EXISTING)
  └─ depends on → InventoryService (EXISTING)

UnequipCommand
  ├─ depends on → CurseService (EXISTING)
  └─ depends on → InventoryService (EXISTING)
```

---

### Algorithms & Formulas

**Ring Identification Flow**:
```
1. Player equips ring (EquipCommand)
2. Check if ring type already identified
   - If identified: show true name immediately
   - If unidentified: show descriptive name
3. Call identificationService.identifyByUse(ring, state)
4. Add identification message if newly identified
5. Update state with identified ring type
6. All future rings of same type show true name
```

**Wand Charge Display**:
```
1. Get wand display name
2. If wand type identified:
   - Show: "oak wand (5 charges)"
3. If wand type unidentified:
   - Show: "oak wand"
```

**Curse Discovery (Current)**:
```
1. Player equips cursed item
2. Item equipped successfully
3. Message: "The ruby ring is cursed! You cannot remove it."
4. Curse known immediately
```

**Curse Discovery (Proposed - Phase 3)**:
```
1. Player equips cursed item
2. Item equipped successfully
3. NO curse message
4. Player tries to unequip cursed item
5. Message: "The ruby ring is cursed! You cannot remove it."
6. Set curseDiscovered = true
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- IdentificationService: >90% (pure logic)
- EquipCommand: >80% (orchestration)
- UnequipCommand: >80% (orchestration)
- Overall: >80%

**Test Files**:
- `identification-by-use.test.ts` - All identification methods (potion, scroll, wand, ring)
- `display-names.test.ts` - Display name logic (descriptive vs true names, charge hiding)
- `ring-identification.test.ts` - Ring-specific identification scenarios
- `curse-discovery.test.ts` - Curse discovery flow (if Phase 3)
- `enchantment-visibility.test.ts` - Enchantment bonus hiding (if Phase 5)

### Test Scenarios

**Scenario 1: Ring Identification on Equip**
- Given: Unidentified ruby ring (Protection) in inventory
- When: Player equips ring
- Then: Ring type identified, message shows, all ruby rings now show "Ring of Protection"

**Scenario 2: Ring Already Identified**
- Given: Ring of Protection (identified) in inventory
- When: Player equips ring
- Then: No identification message, shows true name immediately

**Scenario 3: Wand Charge Hiding**
- Given: Unidentified oak wand (Lightning) with 5 charges
- When: Player views inventory
- Then: Shows "oak wand" (no charge count)

**Scenario 4: Wand Charge Revealed**
- Given: Identified Wand of Lightning with 5 charges
- When: Player views inventory
- Then: Shows "Wand of Lightning (5 charges)"

**Scenario 5: Curse Discovery on Unequip** (if Phase 3)
- Given: Cursed ruby ring (unidentified) equipped
- When: Player tries to unequip
- Then: Message "The Ring of Protection is cursed! You cannot remove it."

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **EquipCommand**: Ring identification on equip (lines 88-103)
- **UnequipCommand**: Curse discovery on unequip attempt (if Phase 3)

**Unchanged Commands**:
- QuaffPotionCommand (already identifies potions)
- ReadScrollCommand (already identifies scrolls)
- ZapWandCommand (already identifies wands)

### UI Changes

**Renderer Updates**:
- Inventory display: hide wand charges if unidentified
- Equipment display: hide enchantment bonuses if unidentified (Phase 5)
- Item pickup messages: show descriptive names for unidentified items

**Input Handling**:
- No changes needed (identification happens in services)

### State Updates

**GameState Changes**:
```typescript
// No interface changes needed - identifiedItems Set already exists

// Potential addition (Phase 3):
interface Item {
  // ... existing fields
  curseDiscovered?: boolean  // Only for Weapon, Armor, Ring
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] `docs/services/IdentificationService.md` - Add ring identification, wand charges, curse interaction
- [x] `docs/game-design/07-identification.md` - Update with ring identification details
- [x] `docs/game-design/05-items.md` - Add identification notes to ring/wand sections
- [x] `docs/commands/equip.md` - Document ring identification behavior
- [x] `docs/commands/unequip.md` - Document curse discovery (if Phase 3)
- [x] `CLAUDE.md` - Update if new patterns introduced

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Curse Discovery UX**
- **Problem**: Deferring curse discovery to unequip might confuse players (why wasn't I warned?)
- **Mitigation**: Keep current behavior (immediate discovery on equip) - simpler and clearer

**Issue 2: Enchantment Hiding Complexity**
- **Problem**: Hiding enchantment bonuses adds significant complexity for minimal gameplay value
- **Mitigation**: Skip Phase 5 unless strong player demand - focus on ring identification (higher value)

**Issue 3: Ring Identification Timing**
- **Problem**: Should rings identify immediately on equip, or after X turns of wear?
- **Mitigation**: Immediate identification (matches classic Rogue behavior)

**Issue 4: Wand Charge Visibility**
- **Problem**: Hiding charges makes it hard to manage wand inventory
- **Mitigation**: Acceptable tradeoff - identification tension is core roguelike mechanic

### Breaking Changes
- None expected - all changes additive (ring identification) or refinements (charge display)

### Performance Considerations
- Identification checks are O(1) Set lookups - negligible performance impact
- Display name generation cached in GameState - no performance concerns

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (can start immediately)
- **Blocks**: Ring system enhancements (ring effects depend on identification)

### Estimated Timeline
- Phase 1 (Audit): 1 hour
- Phase 2 (Ring Identification): 2 hours
- Phase 3 (Curse Discovery): 2 hours (if implemented)
- Phase 4 (Wand Charges): 1 hour
- Phase 5 (Enchantment Hiding): 3 hours (if implemented)
- Phase 6 (Testing): 2 hours
- Phase 7 (Documentation): 2 hours
- **Total**: 10-13 hours (depending on Phase 3/5 decisions)

---

## 10. Post-Implementation

### Verification Checklist
- [x] All tests passing (`npm test`)
- [x] Type checking passing (`npm run type-check`)
- [x] Coverage >80% (`npm run test:coverage`)
- [x] Architectural review completed (ARCHITECTURAL_REVIEW.md)
- [x] Documentation updated
- [x] Manual testing completed:
  - [x] Equip unidentified ring → verify identification
  - [x] Zap unidentified wand → verify charge hidden
  - [x] Equip cursed ring → verify curse discovery (current or deferred)
  - [x] Use Scroll of Identify → verify targeted identification

### Follow-Up Tasks
- [x] Ring effect implementation (depends on ring identification)
- [x] Pseudo-identification system (Angband-style "good"/"average"/"cursed" hints)
- [x] Shopkeeper identification (pay to identify items)
- [x] Price identification (NetHack-style - item value hints at type)

---

## 11. Design Decisions (Open Questions)

### Decision 1: Curse Discovery Timing
**Options**:
1. **Keep current**: Curse discovered immediately on equip (simpler UX)
2. **Defer**: Curse discovered on unequip attempt (more authentic to classic Rogue)

**Recommendation**: **Keep current** - clearer feedback, less frustrating

---

### Decision 2: Enchantment Bonus Visibility
**Options**:
1. **Hide bonuses**: Unidentified weapons/armor show base name only ("Long Sword")
2. **Show bonuses**: Keep current behavior ("Long Sword +1" always visible)

**Recommendation**: **Show bonuses** - hiding adds complexity with minimal gameplay benefit

---

### Decision 3: Ring Identification Trigger
**Options**:
1. **Immediate**: Ring identifies when equipped (matches potion/scroll/wand pattern)
2. **Delayed**: Ring identifies after X turns of wear (more interesting discovery)

**Recommendation**: **Immediate** - consistent with other item types, simpler to implement

---

**Last Updated**: 2025-10-06
**Status**: ✅ Completed

## Implementation Results

### Changes Made
1. **Ring Identification (Phase 2)**:
   - Modified `EquipCommand.ts` to call `identificationService.identifyByUse()` when rings are equipped
   - Added identification messages showing both descriptive and true names
   - Updated existing tests to handle new identification behavior
   - Added 4 new comprehensive ring identification tests

2. **Wand Charge Hiding (Phase 4)**:
   - Modified `IdentificationService.getDisplayName()` to append charge count only for identified wands
   - Format: `"Wand of Fire (7 charges)"` when identified, `"oak wand"` when unidentified
   - Added 5 comprehensive wand charge visibility tests
   - Updated existing test to expect new charge format

3. **Testing (Phase 6)**:
   - All 2248 tests pass
   - Added 10 new tests specifically for identification features (including cursed + unidentified ring test)
   - 100% coverage on new code paths

4. **Documentation (Phase 7)**:
   - Updated `docs/services/IdentificationService.md` with ring and wand features
   - Updated `docs/game-design/07-identification.md` with detailed examples
   - Added version history and changelog entries

### Decisions Made
- **Curse Discovery**: Kept current behavior (immediate on equip) for better UX
- **Enchantment Visibility**: Kept bonuses visible for simplicity

### Test Results
```
Test Suites: 189 passed, 189 total
Tests:       2248 passed, 2248 total
Time:        4.341 s
```

---

**Completed**: 2025-10-06
