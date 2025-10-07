# Ring System Refactor & Implementation Plan

**Status**: ✅ Complete
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-07
**Owner**: Dirk Kok
**Related Docs**: [Game Design - Items](../game-design/05-items.md) | [Architecture](../architecture.md) | [Services Guide](../services/README.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Centralize ring effect logic into a dedicated RingService and implement 5 missing ring types (SEARCHING, SEE_INVISIBLE, SUSTAIN_STRENGTH, TELEPORTATION, STEALTH) to complete the ring system based on classic Rogue mechanics.

### Design Philosophy
- **Centralization**: All ring effect calculations consolidated in RingService (single source of truth)
- **Domain Separation**: Ring effects integrate with domain services (HungerService, CombatService) via dependency injection
- **Passive Effects**: Most rings provide continuous passive bonuses (checked every turn)
- **Rogue Tradition**: Follow 1980 Rogue mechanics - 10 ring types, bonus system, hunger penalties, Ring of Teleportation always cursed

### Success Criteria
- [x] Research completed - existing ring implementation mapped
- [x] RingService created with foundation methods (hasRing, getRingBonus, etc.)
- [x] All 5 missing ring types implemented and tested
- [x] Existing ring logic (CombatService, HungerService, RegenerationService) refactored to use RingService
- [x] Service documentation created (docs/services/RingService.md)
- [x] All tests pass with 98.86% coverage for RingService (target was >90%)
- [x] Architecture follows CLAUDE.md principles (immutability, dependency injection)
- [x] Integration tests verify ring interactions with other systems (2297 tests passing)

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Items - Rings Section](../game-design/05-items.md#rings-) - Ring types, effects, hunger modifiers
- [Hunger System](../game-design/08-hunger.md) - Ring hunger penalties (+30% Regeneration, -50% Slow Digestion)
- [Character - Regeneration](../game-design/02-character.md) - Ring of Regeneration mechanics
- [Combat](../game-design/09-combat.md) - Ring bonuses to AC and strength

### Related Systems
- **HungerService**: Ring-based hunger rate modifiers (already partially implemented)
- **RegenerationService**: Ring of Regeneration doubles heal rate (already implemented)
- **CombatService**: Ring of Protection (AC), Ring of Add Strength, Ring of Dexterity bonuses (already implemented)
- **InventoryService**: Ring equipping/unequipping (already implemented)
- **EquipCommand/UnequipCommand**: Ring slot management (already implemented)
- **CurseService**: Cursed ring handling (already implemented)
- **IdentificationService**: Ring identification system (already implemented)

### Research Summary

**Classic Rogue Ring Mechanics (1980)**:
- 10 ring types total
- Can wear 2 rings simultaneously (left + right hand)
- Bonuses range from +1 to +2 (or -1 to -3 if cursed)
- Most rings increase hunger rate by 50% per ring
- Ring of Teleportation is ALWAYS cursed
- Ring of Slow Digestion reduces hunger by 50%
- Ring of Regeneration increases hunger by 30% (NetHack inspiration)

**Current Implementation Status**:
- ✅ **Fully Implemented**: PROTECTION (AC bonus), ADD_STRENGTH (damage/hit bonus), SLOW_DIGESTION (hunger reduction), REGENERATION (faster healing + hunger penalty), DEXTERITY (AC + to-hit bonus)
- ❌ **Missing**: SEARCHING (auto-detect traps/doors), SEE_INVISIBLE (reveal Phantoms), SUSTAIN_STRENGTH (prevent drain), TELEPORTATION (random teleport), STEALTH (silent movement)

---

## 3. Phases & Tasks

### Phase 1: RingService Foundation (Priority: HIGH)

**Objective**: Create centralized RingService with foundation methods for querying and calculating ring effects

#### Task 1.1: Create RingService Core Structure

**Context**: Consolidate scattered ring logic into single service following SOLID principles

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/foundation.test.ts`
- `src/services/RingService/index.ts`

##### Subtasks:
- [ ] Create RingService interface and type definitions
  ```typescript
  export interface RingEffectResult {
    acBonus: number
    strengthBonus: number
    dexterityBonus: number
    hungerModifier: number
    hasRegeneration: boolean
    hasStealth: boolean
    hasSearching: boolean
    hasSeeInvisible: boolean
    hasSustainStrength: boolean
  }
  ```
- [ ] Implement core query methods:
  - `hasRing(player: Player, ringType: RingType): boolean`
  - `getRingBonus(player: Player, ringType: RingType): number`
  - `getEquippedRings(player: Player): Ring[]`
  - `getRingEffects(player: Player): RingEffectResult`
- [ ] Write unit tests for foundation methods (>90% coverage)
- [ ] Create barrel export (`index.ts`)
- [ ] Update path aliases if needed
- [ ] Git commit: "feat: implement RingService foundation (Phase 1.1)"

---

#### Task 1.2: Implement Ring Bonus Calculation Methods

**Context**: Centralize AC, strength, and dexterity bonus calculations currently in CombatService

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/bonus-calculation.test.ts`

##### Subtasks:
- [ ] Implement `getACBonus(player: Player): number` - sum PROTECTION + DEXTERITY ring bonuses
- [ ] Implement `getStrengthBonus(player: Player): number` - sum ADD_STRENGTH ring bonuses
- [ ] Implement `getDexterityBonus(player: Player): number` - sum DEXTERITY ring bonuses
- [ ] Handle bonus stacking (two rings of same type)
- [ ] Handle negative bonuses (cursed rings -1, -2, -3)
- [ ] Write comprehensive tests for bonus calculation
- [ ] Git commit: "feat: implement RingService bonus calculations (Phase 1.2)"

---

#### Task 1.3: Implement Hunger Modifier Calculation

**Context**: Extract hunger rate calculation from HungerService for better separation of concerns

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/hunger-modifiers.test.ts`

##### Subtasks:
- [ ] Implement `calculateHungerModifier(player: Player): number`
  - Base: 1.0
  - REGENERATION: +0.3 per ring
  - SLOW_DIGESTION: -0.5 per ring
  - All other rings: +0.5 per ring
  - Never negative (Math.max(0, rate))
- [ ] Write tests for all hunger modifier combinations
- [ ] Test edge case: Two SLOW_DIGESTION rings = 0 hunger consumption
- [ ] Git commit: "feat: implement RingService hunger modifier calculation (Phase 1.3)"

---

### Phase 2: Implement Missing Ring Effects (Priority: HIGH)

**Objective**: Implement 5 missing ring types with proper integration into existing services

#### Task 2.1: Implement SEARCHING Ring (Auto-detect Traps/Doors)

**Context**: Passive detection mechanic - chance to automatically reveal traps/secret doors each turn

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/searching-ring.test.ts`
- `src/services/SearchService/SearchService.ts` (update for ring integration)

##### Subtasks:
- [ ] Define SEARCHING ring detection mechanics:
  - Base search radius: 1 tile
  - Detection chance per turn: 10% per ring (20% with two rings)
  - Uses IRandomService for deterministic testing
- [ ] Implement `applySearchingRing(player: Player, level: Level, random: IRandomService): SearchingRingResult`
  ```typescript
  export interface SearchingRingResult {
    trapsFound: Position[]
    secretDoorsFound: Position[]
  }
  ```
- [ ] Integrate with SearchService (inject RingService, call on each turn)
- [ ] Write tests: detection rates, bonus stacking, radius checking
- [ ] Git commit: "feat: implement SEARCHING ring auto-detection (Phase 2.1)"

---

#### Task 2.2: Implement SEE_INVISIBLE Ring (Reveal Invisible Monsters)

**Context**: Reveals Phantom monsters and other invisible creatures

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/see-invisible-ring.test.ts`
- `src/services/RenderingService/RenderingService.ts` (update monster visibility)

##### Subtasks:
- [ ] Add `invisible: boolean` property to Monster interface (if not exists)
- [ ] Implement `canSeeInvisible(player: Player): boolean` in RingService
- [ ] Update RenderingService monster visibility logic:
  - If monster.invisible && !canSeeInvisible(player) → don't render
  - If monster.invisible && canSeeInvisible(player) → render normally
- [ ] Update MonsterSpawnService to spawn invisible Phantoms (depth 8+)
- [ ] Write tests: visibility with/without ring, two rings (redundant but works)
- [ ] Git commit: "feat: implement SEE_INVISIBLE ring (Phase 2.2)"

---

#### Task 2.3: Implement SUSTAIN_STRENGTH Ring (Prevent Strength Drain)

**Context**: Protects against monster strength drain attacks (Rattlesnake, etc.)

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/sustain-strength-ring.test.ts`
- `src/services/SpecialAbilityService/SpecialAbilityService.ts` (update drain logic)

##### Subtasks:
- [ ] Implement `preventStrengthDrain(player: Player): boolean` in RingService
- [ ] Update SpecialAbilityService strength drain logic:
  - Check `ringService.preventStrengthDrain(player)` before applying drain
  - Message: "Your ring protects you from the strength drain!" if blocked
- [ ] Write tests: drain blocked with ring, drain succeeds without ring
- [ ] Git commit: "feat: implement SUSTAIN_STRENGTH ring (Phase 2.3)"

---

#### Task 2.4: Implement TELEPORTATION Ring (Cursed Random Teleport)

**Context**: Cursed ring that randomly teleports player (10-20% chance per turn)

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/teleportation-ring.test.ts`
- `src/commands/MoveCommand/MoveCommand.ts` (or TurnService for per-turn trigger)

##### Subtasks:
- [ ] Verify ItemSpawnService sets Ring of Teleportation as always cursed (line 390)
- [ ] Implement `triggerTeleportation(player: Player, level: Level, random: IRandomService): TeleportationResult`
  ```typescript
  export interface TeleportationResult {
    triggered: boolean
    newPosition?: Position
    message?: string
  }
  ```
- [ ] Teleportation logic:
  - 15% chance per turn (configurable constant)
  - Only triggers if TELEPORTATION ring equipped
  - Find random walkable tile (reuse logic from Scroll of Teleportation)
- [ ] Integrate into TurnService.incrementTurn() - check after each turn
- [ ] Write tests: trigger frequency, valid destinations, cursed status
- [ ] Git commit: "feat: implement TELEPORTATION ring cursed teleport (Phase 2.4)"

---

#### Task 2.5: Implement STEALTH Ring (Silent Movement)

**Context**: Allows player to move without waking sleeping monsters

**Files to create/modify**:
- `src/services/RingService/RingService.ts`
- `src/services/RingService/stealth-ring.test.ts`
- `src/services/MonsterAIService/MonsterAIService.ts` (update wake-up logic)

##### Subtasks:
- [ ] Implement `hasStealth(player: Player): boolean` in RingService
- [ ] Update MonsterAIService wake-up logic:
  - Check `ringService.hasStealth(player)` before waking monsters
  - Monsters in FOV still wake up (seeing player overrides stealth)
  - Only prevents wake-up from adjacent movement/noise
- [ ] Write tests: sleeping monsters stay asleep with stealth, wake up without
- [ ] Git commit: "feat: implement STEALTH ring silent movement (Phase 2.5)"

---

### Phase 3: Refactor Existing Ring Logic (Priority: MEDIUM)

**Objective**: Consolidate scattered ring logic into RingService for single source of truth

#### Task 3.1: Refactor CombatService Ring Logic

**Context**: Move AC and strength bonus calculations from CombatService to RingService

**Files to modify**:
- `src/services/CombatService/CombatService.ts`
- `src/services/CombatService/equipment-bonuses.test.ts`

##### Subtasks:
- [ ] Inject RingService into CombatService constructor
- [ ] Replace `getACBonus(player)` with `ringService.getACBonus(player)`
- [ ] Replace `getStrengthBonus(player)` with `ringService.getStrengthBonus(player)`
- [ ] Remove private ring bonus methods from CombatService
- [ ] Update existing tests to verify behavior unchanged
- [ ] Git commit: "refactor: migrate CombatService ring logic to RingService (Phase 3.1)"

---

#### Task 3.2: Refactor HungerService Ring Logic

**Context**: Update HungerService to call RingService for hunger modifiers

**Files to modify**:
- `src/services/HungerService/HungerService.ts`
- `src/services/HungerService/ring-modifiers.test.ts`

##### Subtasks:
- [ ] Inject RingService into HungerService constructor
- [ ] Update `calculateHungerRate(rings)` to use `ringService.calculateHungerModifier(player)`
- [ ] Remove ring-specific logic from HungerService (keep only base rate)
- [ ] Update tests to verify behavior unchanged
- [ ] Git commit: "refactor: migrate HungerService ring logic to RingService (Phase 3.2)"

---

#### Task 3.3: Refactor RegenerationService Ring Logic

**Context**: Update RegenerationService to call RingService for regeneration ring check

**Files to modify**:
- `src/services/RegenerationService/RegenerationService.ts`
- `src/services/RegenerationService/ring-regen.test.ts`

##### Subtasks:
- [ ] Inject RingService into RegenerationService constructor
- [ ] Update `hasRegenerationRing(player)` to use `ringService.hasRing(player, RingType.REGENERATION)`
- [ ] Update tests to verify behavior unchanged
- [ ] Git commit: "refactor: migrate RegenerationService ring logic to RingService (Phase 3.3)"

---

#### Task 3.4: Update Command Dependency Injection

**Context**: Update commands to inject RingService where needed (MoveCommand, TurnService, etc.)

**Files to modify**:
- `src/commands/MoveCommand/MoveCommand.ts` (TELEPORTATION ring)
- `src/services/TurnService/TurnService.ts` (TELEPORTATION ring trigger)
- `src/main.ts` (service instantiation)

##### Subtasks:
- [ ] Create RingService instance in main.ts
- [ ] Inject RingService into CombatService, HungerService, RegenerationService
- [ ] Inject RingService into TurnService (for TELEPORTATION ring)
- [ ] Update all service constructors and command factories
- [ ] Git commit: "refactor: wire RingService into dependency injection (Phase 3.4)"

---

### Phase 4: Documentation & Testing (Priority: HIGH)

**Objective**: Complete comprehensive documentation and achieve >90% test coverage

#### Task 4.1: Create RingService Documentation

**Context**: Document all ring types, effects, and integration points

**Files to create**:
- `docs/services/RingService.md`

##### Subtasks:
- [ ] Create service documentation following docs/services/TEMPLATE pattern:
  - Overview and responsibility
  - All 10 ring types with effects table
  - Bonus system (+1, +2, -1 to -3)
  - Hunger modifier table
  - Integration points with other services
  - API reference for all public methods
  - Testing patterns and examples
- [ ] Git commit: "docs: create RingService comprehensive documentation (Phase 4.1)"

---

#### Task 4.2: Update Service Catalog

**Context**: Add RingService to service directory and architecture docs

**Files to modify**:
- `docs/services/README.md`
- `docs/architecture.md`

##### Subtasks:
- [ ] Add RingService to service quick reference table
- [ ] Add RingService to "Item Systems" category
- [ ] Update service dependency graph
- [ ] Git commit: "docs: add RingService to service catalog (Phase 4.2)"

---

#### Task 4.3: Update Game Design Documentation

**Context**: Expand ring mechanics documentation with complete implementation details

**Files to modify**:
- `docs/game-design/05-items.md`

##### Subtasks:
- [ ] Expand rings section with:
  - Complete 10 ring type effects table
  - Bonus calculation rules
  - Hunger modifier details
  - Integration with other systems
  - Strategy tips for each ring type
- [ ] Git commit: "docs: expand ring mechanics in game design (Phase 4.3)"

---

#### Task 4.4: Integration Testing

**Context**: Verify ring system integrates correctly with all dependent systems

**Files to create**:
- `src/services/RingService/integration.test.ts`

##### Subtasks:
- [ ] Write integration tests:
  - Ring + Combat: AC/strength bonuses affect combat results
  - Ring + Hunger: Multiple rings stack hunger penalties correctly
  - Ring + Regeneration: Ring of Regeneration doubles heal rate
  - Ring + Searching: Auto-detection finds traps/doors
  - Ring + Monster AI: Stealth prevents wake-ups
  - Ring + Teleportation: Cursed ring triggers random teleports
- [ ] Verify >90% code coverage for RingService
- [ ] Run full test suite: `npm test`
- [ ] Git commit: "test: add RingService integration tests (Phase 4.4)"

---

## 4. Technical Design

### Data Structures

```typescript
// Ring interface (already exists in core.ts)
export interface Ring extends Item {
  ringType: RingType
  effect: string
  bonus: number // +1, +2 (or -1, -2, -3 if cursed)
  materialName: string // e.g., "ruby", "sapphire", "wooden"
  hungerModifier: number // multiplier for hunger rate (1.5 = 50% faster)
  cursed?: boolean
}

// RingType enum (already exists)
export enum RingType {
  PROTECTION = 'PROTECTION',
  REGENERATION = 'REGENERATION',
  SEARCHING = 'SEARCHING',
  SEE_INVISIBLE = 'SEE_INVISIBLE',
  SLOW_DIGESTION = 'SLOW_DIGESTION',
  ADD_STRENGTH = 'ADD_STRENGTH',
  SUSTAIN_STRENGTH = 'SUSTAIN_STRENGTH',
  DEXTERITY = 'DEXTERITY',
  TELEPORTATION = 'TELEPORTATION',
  STEALTH = 'STEALTH',
}

// Ring effect result (new)
export interface RingEffectResult {
  acBonus: number
  strengthBonus: number
  dexterityBonus: number
  hungerModifier: number
  hasRegeneration: boolean
  hasStealth: boolean
  hasSearching: boolean
  hasSeeInvisible: boolean
  hasSustainStrength: boolean
}

// Searching result (new)
export interface SearchingRingResult {
  trapsFound: Position[]
  secretDoorsFound: Position[]
}

// Teleportation result (new)
export interface TeleportationResult {
  triggered: boolean
  newPosition?: Position
  message?: string
}
```

### Service Architecture

**New Services**:
- **RingService**: Centralized ring effect management
  - `hasRing(player, ringType)` - Check for specific ring
  - `getRingBonus(player, ringType)` - Get total bonus
  - `getACBonus(player)` - AC bonus from PROTECTION + DEXTERITY
  - `getStrengthBonus(player)` - Strength bonus from ADD_STRENGTH
  - `calculateHungerModifier(player)` - Total hunger modifier
  - `applySearchingRing(player, level, random)` - Auto-detection
  - `canSeeInvisible(player)` - Check SEE_INVISIBLE ring
  - `preventStrengthDrain(player)` - Check SUSTAIN_STRENGTH
  - `hasStealth(player)` - Check STEALTH ring
  - `triggerTeleportation(player, level, random)` - Random teleport

**Modified Services**:
- **CombatService**: Use RingService for AC/strength bonuses
- **HungerService**: Use RingService for hunger modifiers
- **RegenerationService**: Use RingService for regeneration check
- **SearchService**: Integrate RingService for SEARCHING ring
- **RenderingService**: Use RingService for SEE_INVISIBLE
- **MonsterAIService**: Use RingService for STEALTH
- **SpecialAbilityService**: Use RingService for SUSTAIN_STRENGTH
- **TurnService**: Trigger TELEPORTATION ring each turn

**Service Dependencies**:
```
RingService (no dependencies - pure query service)
    ↑
    │ (injected into)
    │
CombatService, HungerService, RegenerationService,
SearchService, RenderingService, MonsterAIService,
SpecialAbilityService, TurnService
```

### Algorithms & Formulas

**Bonus Stacking**:
```
Total bonus = leftRing.bonus + rightRing.bonus
Example: Protection +1 (left) + Protection +2 (right) = +3 AC bonus
```

**Hunger Modifier Calculation**:
```
Base rate: 1.0
For each ring:
  - REGENERATION: +0.3
  - SLOW_DIGESTION: -0.5
  - All others: +0.5
Total rate: max(0, base + sum(ring modifiers))

Example: REGENERATION + SLOW_DIGESTION = 1.0 + 0.3 - 0.5 = 0.8 (20% reduction)
Example: Two SLOW_DIGESTION = 1.0 - 0.5 - 0.5 = 0.0 (no hunger consumption!)
```

**SEARCHING Ring Detection**:
```
Each turn:
  radius = 1 tile around player
  detectionChance = 0.10 * ringCount (10% per ring)
  For each adjacent tile:
    If tile has trap/secret door:
      If random.chance(detectionChance):
        Reveal trap/door
        Add to SearchingRingResult
```

**TELEPORTATION Ring Trigger**:
```
Each turn:
  If TELEPORTATION ring equipped:
    If random.chance(0.15): // 15% per turn
      newPos = getRandomWalkableTile(level, random)
      teleportPlayer(player, newPos)
      message = "You feel a wrenching sensation!"
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- RingService: >90%
- Modified services: >80% (verify no regressions)

**Test Files**:
- `foundation.test.ts` - hasRing, getRingBonus, getEquippedRings
- `bonus-calculation.test.ts` - AC, strength, dexterity bonuses
- `hunger-modifiers.test.ts` - All hunger modifier combinations
- `searching-ring.test.ts` - Auto-detection mechanics
- `see-invisible-ring.test.ts` - Invisibility visibility logic
- `sustain-strength-ring.test.ts` - Strength drain protection
- `teleportation-ring.test.ts` - Random teleport triggers
- `stealth-ring.test.ts` - Silent movement, monster wake-up
- `integration.test.ts` - Cross-service integration scenarios

### Test Scenarios

**Scenario 1: Bonus Stacking**
- Given: Player has Ring of Protection +1 on left, Ring of Protection +2 on right
- When: getRingBonus(player, RingType.PROTECTION) called
- Then: Returns 3

**Scenario 2: Hunger Rate with Multiple Rings**
- Given: Player has REGENERATION ring (left) and normal ring (right)
- When: calculateHungerModifier(player) called
- Then: Returns 1.8 (base 1.0 + 0.3 regen + 0.5 other = 1.8)

**Scenario 3: SEARCHING Ring Auto-Detection**
- Given: Player has SEARCHING ring, secret door adjacent, MockRandom returns true
- When: applySearchingRing() called
- Then: Secret door revealed, added to SearchingRingResult

**Scenario 4: SEE_INVISIBLE with Phantom**
- Given: Player has SEE_INVISIBLE ring, Phantom in FOV
- When: Rendering monster visibility checked
- Then: Phantom is visible

**Scenario 5: TELEPORTATION Ring Trigger**
- Given: Player has TELEPORTATION ring (cursed), MockRandom triggers (15% chance)
- When: TurnService.incrementTurn() called
- Then: Player teleports to random walkable tile

**Scenario 6: STEALTH Ring Silent Movement**
- Given: Player has STEALTH ring, sleeping monster adjacent
- When: Player moves adjacent to monster
- Then: Monster stays asleep (no wake-up)

**Scenario 7: SUSTAIN_STRENGTH Ring Protection**
- Given: Player has SUSTAIN_STRENGTH ring, Rattlesnake attacks with drain
- When: SpecialAbilityService applies drain effect
- Then: Strength drain blocked, message "Your ring protects you!"

**Scenario 8: Cursed Ring Negative Bonus**
- Given: Player equips cursed Ring of Protection -2
- When: getACBonus(player) called
- Then: Returns -2 (worsens AC)

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **MoveCommand**: Trigger TELEPORTATION ring check after each move
- **EquipCommand**: Already handles ring equipping (no changes needed)
- **UnequipCommand**: Already prevents cursed ring removal (no changes needed)

### UI Changes

**Renderer Updates**:
- **Monster rendering**: Check RingService.canSeeInvisible() before hiding invisible monsters
- **Trap/door rendering**: Update when SEARCHING ring reveals secrets
- **Status bar**: Show "STEALTH" indicator when STEALTH ring equipped (optional)

**Input Handling**:
- No new inputs needed (rings are passive)

### State Updates

**GameState Changes**:
- No GameState interface changes needed (rings stored in player.equipment)

**Player/Level Changes**:
- Consider adding `invisibleMonsters: boolean` flag to monsters (for SEE_INVISIBLE)
- No other interface changes needed

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/plans/ring_refactor_plan.md` - This implementation plan
- [ ] Create `docs/services/RingService.md` - Full service documentation
- [ ] Update `docs/services/README.md` - Add RingService to catalog
- [ ] Update `docs/game-design/05-items.md` - Expand ring mechanics
- [ ] Update `docs/architecture.md` - Add RingService to dependency graph
- [ ] Update `CLAUDE.md` - If new patterns introduced (unlikely)

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Circular Dependencies**
- **Problem**: RingService needs to be injected into 8+ services - risk of circular dependency
- **Mitigation**: RingService has ZERO dependencies (pure query service). All other services depend on it, not vice versa.

**Issue 2: Performance - SEARCHING Ring Every Turn**
- **Problem**: Checking 8 adjacent tiles every turn with 10% chance could be slow
- **Mitigation**: Early exit if no SEARCHING ring equipped. Use Set for O(1) position lookups. Profile if needed.

**Issue 3: TELEPORTATION Ring Frequency**
- **Problem**: 15% per turn might be too frequent or too rare
- **Mitigation**: Make teleportation chance a configurable constant. Test with real gameplay. Adjust based on feel (10-20% range).

**Issue 4: Refactoring Existing Logic**
- **Problem**: Moving ring logic from CombatService/HungerService could introduce regressions
- **Mitigation**: Write comprehensive tests BEFORE refactoring. Verify exact behavior match. Run full test suite after each change.

### Breaking Changes
- No breaking changes to public APIs
- All existing tests should continue passing
- Game save files compatible (no Ring interface changes)

### Performance Considerations
- RingService methods are pure functions (no state) - fast
- SEARCHING ring auto-detection: O(8) adjacent tiles per turn - negligible
- TELEPORTATION ring: Only triggers 15% of turns - minimal impact
- Overall performance impact: **negligible**

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (all foundation exists)
- **Blocks**: None (optional enhancement)

### Estimated Timeline
- Phase 1 (Foundation): 4-6 hours
- Phase 2 (Missing rings): 8-10 hours
- Phase 3 (Refactoring): 4-6 hours
- Phase 4 (Documentation): 2-3 hours
- **Total**: 18-25 hours

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >90% for RingService (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (service docs, game design, service catalog)
- [ ] Manual testing completed (equip all 10 ring types, verify effects)
- [ ] Integration testing completed (ring + combat, hunger, regen, search, AI)

### Follow-Up Tasks
- [ ] Balance TELEPORTATION ring frequency based on playtesting
- [ ] Consider adding more ring types (Ring of Maintain Armor for rust protection)
- [ ] Add ring discovery messages when effects trigger ("You feel stealthy...")
- [ ] Add visual indicators for active ring effects in status bar
- [ ] Consider ring synergy bonuses (future enhancement)

---

## Implementation Summary

**All Phases Complete!** ✅

### Phase 1: RingService Foundation
- ✅ Core structure created with foundation methods
- ✅ Bonus calculation methods implemented
- ✅ Hunger modifier calculation implemented
- ✅ Test coverage: 100% for foundation methods

### Phase 2: Missing Ring Effects
- ✅ SEARCHING ring (auto-detect traps/doors)
- ✅ SEE_INVISIBLE ring (reveal Phantoms)
- ✅ SUSTAIN_STRENGTH ring (prevent drain)
- ✅ TELEPORTATION ring (cursed random teleport)
- ✅ STEALTH ring (silent movement)

### Phase 3: Service Refactoring
- ✅ CombatService integrated with RingService
- ✅ HungerService integrated with RingService
- ✅ RegenerationService integrated with RingService
- ✅ Dependency injection updated in main.ts
- ✅ All test files updated

### Phase 4: Documentation & Testing
- ✅ Comprehensive RingService.md documentation created
- ✅ Service catalog updated with RingService
- ✅ Test coverage: **98.86%** (target was >90%)
- ✅ All 2297 tests passing

### Metrics
- **Total Tests**: 2297 (100% passing)
- **RingService Tests**: 141 tests across 8 test files
- **RingService Coverage**: 98.86% statements, 98.41% branches, 100% functions
- **Lines of Code Eliminated**: ~71 lines (duplicate ring logic removed)
- **Ring Types Implemented**: 10 total (5 already existed, 5 newly implemented)

---

**Last Updated**: 2025-10-07
**Status**: ✅ Complete
