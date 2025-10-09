# Monster AI Refactor - Authentic Behaviors with Modern Enhancements

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Monster AI Service](../services/MonsterAIService.md) | [Game Design - Monsters](../game-design/03-monsters.md) | [Advanced Systems](../systems-advanced.md)

---

## 1. Objectives

### Primary Goal
Refine Monster AI to blend authentic Rogue (1980) behaviors with modern enhancements, fixing incorrect behaviors while maintaining modern features like A* pathfinding, FOV, and memory tracking.

### Design Philosophy
- **Authenticity First**: Core monster behaviors should match original Rogue mechanics where possible
- **Modern Enhancements**: Keep sophisticated AI features (A*, FOV, memory) that improve gameplay
- **Balanced Difficulty**: 67% chase probability makes MEAN monsters less relentless and more authentic
- **Type-Safe Implementation**: Use enums and interfaces for behavior flags

### Success Criteria
- [x] Research original Rogue (1980) monster AI mechanics
- [ ] Implement 67% chase probability for MEAN monsters
- [ ] Fix Bat behavior (100% random movement)
- [ ] Fix Leprechaun/Nymph teleport after stealing
- [ ] Update monsters.json with accurate MEAN flags
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles
- [ ] Documentation updated with modern vs. authentic comparison

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Monster AI Service Documentation](../services/MonsterAIService.md) - Current AI implementation
- [Game Design - Monsters](../game-design/03-monsters.md) - Monster specs and behaviors
- [Advanced Systems - Monster AI](../systems-advanced.md) - AI behavior descriptions

### Related Systems
- **MonsterAIService**: Core AI decision-making (main service to modify)
- **MonsterTurnService**: Executes monster actions (integrates AI decisions)
- **SpecialAbilityService**: Handles stealing for Leprechaun/Nymph
- **LevelService**: Provides level data for teleport positions
- **RandomService**: Used for chase probability and random movement

### Research Summary

**Original Rogue (1980) Findings**:

1. **Chase Probability**: ISMEAN monsters had 67% chance per turn to chase player (not 100%)
2. **Bat Behavior**: Bats "always moved as if confused" (100% random, not 50%)
3. **Leprechaun/Nymph**: Were stationary, stole when adjacent, then teleported away (didn't flee by walking)
4. **Movement**: Original used 8-directional (diagonals), but we're keeping 4-directional
5. **Greedy Behavior**: Only Dragons had ISGREED flag (guarded gold)
6. **No Monster FOV**: Monsters always knew player position (no vision calculation)

**What We're Keeping (Modern Enhancements)**:
- A* pathfinding for SMART behavior
- Monster FOV computation based on aggroRange
- Memory tracking (lastKnownPlayerPosition)
- 4-directional movement (no diagonals)
- State machine (SLEEPING, HUNTING, FLEEING)
- Flee thresholds for COWARD behavior

**What We're Fixing**:
- Add 67% chase probability for MEAN monsters
- Fix Bat to 100% random movement
- Add teleport mechanic for Leprechaun/Nymph after stealing

---

## 3. Phases & Tasks

### Phase 1: Add Chase Probability System (Priority: HIGH)

**Objective**: Implement 67% chase probability for MEAN monsters to match original Rogue behavior

#### Task 1.1: Add chaseChance to AIProfile

**Context**: Need configurable chase probability per monster type

**Files to create/modify**:
- `src/types/core/core.ts` - Add `chaseChance?: number` to `AIProfile` interface
- `public/data/monsters.json` - Add `chaseChance: 0.67` to all MEAN monsters

##### Subtasks:
- [ ] Add `chaseChance?: number` field to `AIProfile` interface (optional, defaults to 1.0)
- [ ] Update monsters.json: Add `chaseChance: 0.67` to all MEAN monsters (Emu, Hobgoblin, Kestrel, Orc, Quagga, Snake, Troll, Dragon, Griffin, Jabberwock, Ur-vile)
- [ ] Git commit: "feat: add chaseChance field to AIProfile (Phase 1.1)"

---

#### Task 1.2: Implement Chase Probability in MonsterAIService

**Context**: Modify `decideAction()` to check chase probability before deciding to pursue player

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`

##### Subtasks:
- [ ] In `decideAction()`, after sleep check and before behavior routing:
  - Check if monster has `chaseChance < 1.0`
  - Roll random chance using `this.random.chance(monster.aiProfile.chaseChance)`
  - If fails, return `{ type: 'wait' }` (monster doesn't chase this turn)
  - If succeeds or no chaseChance set, proceed with normal behavior
- [ ] Add comment explaining this matches original Rogue ISMEAN behavior
- [ ] Git commit: "feat: implement 67% chase probability for MEAN monsters (Phase 1.2)"

---

#### Task 1.3: Add Tests for Chase Probability

**Context**: Verify chase probability works correctly using MockRandom

**Files to create**:
- `src/services/MonsterAIService/chase-probability.test.ts`

##### Subtasks:
- [ ] Create test file with AAA pattern tests
- [ ] Test: MEAN monster with chaseChance 0.67 waits when roll fails (MockRandom returns 0.8)
- [ ] Test: MEAN monster with chaseChance 0.67 pursues when roll succeeds (MockRandom returns 0.5)
- [ ] Test: Monster without chaseChance always pursues (backwards compatibility)
- [ ] Test: Sleeping monsters ignore chase probability (wait regardless)
- [ ] Verify >80% coverage for new code paths
- [ ] Git commit: "test: add chase probability tests (Phase 1.3)"

---

### Phase 2: Fix Bat Behavior (100% Random) (Priority: HIGH)

**Objective**: Change ERRATIC behavior from 50% random to 100% random to match original Rogue

#### Task 2.1: Modify ERRATIC Behavior

**Context**: Bats in original Rogue always moved randomly (confused), not 50/50 toward player

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`

##### Subtasks:
- [ ] Modify `erraticBehavior()` method:
  - Remove 50% chance check (`this.random.chance(0.5)`)
  - Always pick random direction from 4 cardinal directions
  - Remove fallback to `simpleBehavior()`
- [ ] Update method comment to reflect 100% random movement
- [ ] Git commit: "fix: change ERRATIC behavior to 100% random movement (Phase 2.1)"

---

#### Task 2.2: Update ERRATIC Behavior Tests

**Context**: Update tests to match new 100% random behavior

**Files to modify**:
- `src/services/MonsterAIService/erratic-behavior.test.ts`

##### Subtasks:
- [ ] Remove tests for "50% toward player" behavior
- [ ] Update all tests to expect random movement only
- [ ] Add test: Bat always moves randomly (never toward player)
- [ ] Add test: Random direction selection uses all 4 directions
- [ ] Verify >80% coverage maintained
- [ ] Git commit: "test: update ERRATIC behavior tests for 100% random (Phase 2.2)"

---

### Phase 3: Add Teleport for Leprechaun/Nymph (Priority: HIGH)

**Objective**: After stealing, Leprechaun/Nymph should teleport to random room instead of fleeing by walking

#### Task 3.1: Add Teleport Method to LevelService

**Context**: Need utility to find valid random teleport position in level

**Files to modify**:
- `src/services/LevelService/LevelService.ts`
- `src/services/LevelService/teleport.test.ts` (new file)

##### Subtasks:
- [ ] Add `getRandomTeleportPosition(level: Level, avoidPosition?: Position): Position | null` method
- [ ] Implementation:
  - Find all walkable floor tiles in level
  - Filter out position to avoid (where thief currently is)
  - Pick random walkable position using RandomService
  - Return null if no valid positions found
- [ ] Write tests for teleport position selection
- [ ] Git commit: "feat: add getRandomTeleportPosition to LevelService (Phase 3.1)"

---

#### Task 3.2: Add hasStolen Flag Check in SpecialAbilityService

**Context**: Need to verify hasStolen flag is set after successful steal

**Files to verify**:
- `src/services/SpecialAbilityService/SpecialAbilityService.ts`

##### Subtasks:
- [ ] Review `handleSteal()` method - ensure it sets `monster.hasStolen = true`
- [ ] If not set, add: `return { ...monster, hasStolen: true }`
- [ ] Verify tests cover hasStolen flag being set
- [ ] Git commit: "fix: ensure hasStolen flag set after stealing (Phase 3.2)" (if needed)

---

#### Task 3.3: Add Teleport After Steal in MonsterTurnService

**Context**: When Leprechaun/Nymph has `hasStolen = true`, teleport instead of normal movement

**Files to modify**:
- `src/services/MonsterTurnService/MonsterTurnService.ts`

##### Subtasks:
- [ ] In `executeTurn()`, after steal action executes:
  - Check if monster has `hasStolen = true` AND behavior is THIEF
  - Call `levelService.getRandomTeleportPosition(level, monster.position)`
  - If valid position found, update `monster.position` to teleport target
  - Add message: `"The ${monster.name} vanishes!"`
  - Reset `monster.hasStolen = false` after teleport
- [ ] Add comment explaining this matches original Rogue behavior
- [ ] Git commit: "feat: add teleport after steal for Leprechaun/Nymph (Phase 3.3)"

---

#### Task 3.4: Update THIEF Behavior Logic

**Context**: Remove flee-by-walking logic since thieves now teleport

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`

##### Subtasks:
- [ ] Modify `thiefBehavior()`:
  - Keep approach logic (SMART behavior)
  - Remove `fleeBehavior()` call when `hasStolen = true`
  - Return `{ type: 'wait' }` when `hasStolen = true` (they teleport before next turn)
- [ ] Update method comment to note teleport happens in MonsterTurnService
- [ ] Git commit: "refactor: simplify THIEF behavior (teleport replaces flee) (Phase 3.4)"

---

#### Task 3.5: Add Tests for Teleport Mechanic

**Context**: Verify teleport works correctly for thieves

**Files to create/modify**:
- `src/services/MonsterTurnService/teleport-after-steal.test.ts` (new)
- `src/services/MonsterAIService/thief-behavior.test.ts` (modify)

##### Subtasks:
- [ ] MonsterTurnService tests:
  - Test: Leprechaun teleports after stealing (hasStolen = true)
  - Test: Nymph teleports after stealing
  - Test: Teleport position is different from original position
  - Test: hasStolen flag reset after teleport
  - Test: Message "The Leprechaun vanishes!" appears
- [ ] MonsterAIService tests:
  - Update: THIEF with hasStolen waits (no longer flees)
  - Remove: Flee-after-steal tests
- [ ] Verify >80% coverage
- [ ] Git commit: "test: add teleport after steal tests (Phase 3.5)"

---

### Phase 4: Update monsters.json (Priority: MEDIUM)

**Objective**: Ensure monsters.json has correct MEAN flags and chase probabilities

#### Task 4.1: Audit MEAN Flags in monsters.json

**Context**: Verify which monsters should have chaseChance: 0.67 based on original Rogue

**Files to modify**:
- `public/data/monsters.json`

##### Subtasks:
- [ ] Review original Rogue MEAN monsters:
  - Dragon (D), Emu (E), Griffin (G), Hobgoblin (H), Jabberwock (J)
  - Kestrel (K), Orc (O), Quagga (Q), Snake (S), Troll (T), Ur-vile (U)
- [ ] Add `chaseChance: 0.67` to all MEAN monsters
- [ ] Verify other monsters don't have chaseChance (default to 1.0)
- [ ] Git commit: "data: add chaseChance to MEAN monsters (Phase 4.1)"

---

#### Task 4.2: Verify Monster Behaviors Are Correct

**Context**: Ensure behavior assignments match our modern + authentic hybrid approach

**Files to verify**:
- `public/data/monsters.json`

##### Subtasks:
- [ ] Verify behavior assignments:
  - Bat (B): ERRATIC ✓ (100% random after Phase 2)
  - Dragon (D): SMART ✓ (keep modern A*)
  - Leprechaun (L): THIEF ✓ (approach + teleport after Phase 3)
  - Nymph (N): THIEF ✓ (approach + teleport after Phase 3)
  - Venus Flytrap (F): STATIONARY ✓
  - Vampire (V): SMART (not COWARD - remove flee threshold if needed)
  - Orc (O): GREEDY ✓ (modern enhancement, acceptable)
- [ ] Document any deviations from original in comments
- [ ] Git commit: "data: audit and verify monster behaviors (Phase 4.2)" (if changes needed)

---

### Phase 5: Documentation Updates (Priority: MEDIUM)

**Objective**: Document modern vs. authentic behaviors and refactor rationale

#### Task 5.1: Update MonsterAIService.md

**Context**: Add section explaining authentic Rogue behaviors vs. modern enhancements

**Files to modify**:
- `docs/services/MonsterAIService.md`

##### Subtasks:
- [ ] Add new section at top: "## Authentic Rogue vs. Modern Enhancements"
- [ ] Document:
  - **Authentic behaviors preserved**: 67% chase, 100% random bats, teleporting thieves
  - **Modern enhancements kept**: A* pathfinding, FOV, memory tracking, 4-directional
  - **Why this hybrid approach**: Balance authenticity with quality-of-life improvements
- [ ] Update ERRATIC section: Note 100% random (not 50%)
- [ ] Update THIEF section: Note teleport mechanic after stealing
- [ ] Add chase probability documentation to "Aggro System" section
- [ ] Git commit: "docs: update MonsterAIService with authentic vs modern behaviors (Phase 5.1)"

---

#### Task 5.2: Update Game Design - Monsters

**Context**: Document monster behaviors match original Rogue where applicable

**Files to modify**:
- `docs/game-design/03-monsters.md`

##### Subtasks:
- [ ] Add note about 67% chase probability for MEAN monsters
- [ ] Update Bat description: "Moves randomly every turn (100% erratic)"
- [ ] Update Leprechaun/Nymph: "Steals and teleports away"
- [ ] Add callout box explaining modern AI enhancements
- [ ] Git commit: "docs: update monster behaviors in game design (Phase 5.2)"

---

#### Task 5.3: Update Advanced Systems Documentation

**Context**: Update AI behavior descriptions in systems documentation

**Files to modify**:
- `docs/systems-advanced.md`

##### Subtasks:
- [ ] Update Monster AI section:
  - Add chase probability explanation
  - Update ERRATIC behavior description (100% random)
  - Update THIEF behavior (teleport instead of flee)
- [ ] Add comparison table: Original Rogue vs. Our Implementation
- [ ] Git commit: "docs: update advanced systems with refined AI behaviors (Phase 5.3)"

---

## 4. Technical Design

### Data Structures

```typescript
// Updated AIProfile with chase probability
interface AIProfile {
  behavior: MonsterBehavior | MonsterBehavior[]
  intelligence: number
  aggroRange: number
  fleeThreshold: number
  chaseChance?: number  // ← NEW: Probability to chase per turn (0.0-1.0, default 1.0)
  special: SpecialAbilityFlag[]
}

// Example MEAN monster in monsters.json
{
  "letter": "H",
  "name": "Hobgoblin",
  "aiProfile": {
    "behavior": "SIMPLE",
    "intelligence": 2,
    "aggroRange": 7,
    "fleeThreshold": 0.0,
    "chaseChance": 0.67,  // ← 67% chance to chase (MEAN flag)
    "special": ["mean"]
  }
}
```

### Service Architecture

**Modified Services**:
- **MonsterAIService**:
  - Add chase probability check in `decideAction()`
  - Modify `erraticBehavior()` to 100% random
  - Modify `thiefBehavior()` to wait when hasStolen
- **MonsterTurnService**:
  - Add teleport logic after steal action
  - Handle position update and message display
- **LevelService**:
  - Add `getRandomTeleportPosition()` utility method

**Service Dependencies**:
```
MonsterTurnService
  ├─ depends on → MonsterAIService (gets action decision)
  ├─ depends on → SpecialAbilityService (handles steal)
  └─ depends on → LevelService (finds teleport position)

MonsterAIService
  ├─ depends on → RandomService (chase probability, random movement)
  ├─ depends on → PathfindingService (A* for SMART)
  └─ depends on → FOVService (monster vision)
```

### Algorithms & Formulas

**Chase Probability Algorithm**:
```
Step 1: Check if monster has chaseChance < 1.0
Step 2: Roll random number [0.0, 1.0]
Step 3: If roll > chaseChance, return wait action (monster doesn't chase)
Step 4: Otherwise, proceed with normal behavior routing
Result: 67% chance to pursue, 33% chance to wait (for MEAN monsters)
```

**Teleport After Steal Algorithm**:
```
Step 1: Monster executes steal action (SpecialAbilityService)
Step 2: hasStolen flag set to true
Step 3: MonsterTurnService detects hasStolen + THIEF behavior
Step 4: Call LevelService.getRandomTeleportPosition(level, currentPos)
Step 5: Update monster.position to teleport target
Step 6: Display "The Leprechaun vanishes!" message
Step 7: Reset hasStolen to false
Result: Thief instantly relocates to random room after stealing
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- MonsterAIService: >90% (add chase probability, update behaviors)
- MonsterTurnService: >85% (add teleport logic)
- LevelService: >80% (add teleport position finder)
- Overall: >80%

**Test Files**:
- `chase-probability.test.ts` - Chase probability with MockRandom
- `erratic-behavior.test.ts` - 100% random movement (updated)
- `thief-behavior.test.ts` - Wait when hasStolen (updated)
- `teleport-after-steal.test.ts` - Teleport mechanic (new)
- `teleport.test.ts` - LevelService random position (new)

### Test Scenarios

**Scenario 1: MEAN Monster Chase Probability**
- Given: Hobgoblin with chaseChance 0.67, awake, player visible
- When: MockRandom returns 0.8 (>0.67, fails chase roll)
- Then: Monster returns { type: 'wait' } instead of pursuing

**Scenario 2: Bat 100% Random Movement**
- Given: Bat using ERRATIC behavior
- When: decideAction() called
- Then: Always returns random direction move (never toward player)

**Scenario 3: Leprechaun Teleport After Steal**
- Given: Leprechaun with hasStolen = true in room at (10, 10)
- When: executeTurn() processes monster
- Then:
  - Monster position changes to random walkable tile
  - Message "The Leprechaun vanishes!" appears
  - hasStolen reset to false

**Scenario 4: No Teleport Positions Available**
- Given: Level with no walkable tiles except thief's current position
- When: Teleport after steal attempted
- Then: Monster stays in place (graceful fallback)

---

## 6. Integration Points

### Commands
**No new commands needed** - all changes are internal to services

### Modified Commands
**No command modifications needed** - MonsterTurnService already handles monster turns

### State Updates

**Monster Interface** (already exists, verify):
```typescript
interface Monster {
  // ... existing fields
  hasStolen?: boolean  // ← Verify this exists for THIEF tracking
  position: Position   // ← Updated by teleport logic
}
```

**AIProfile Interface** (update):
```typescript
interface AIProfile {
  // ... existing fields
  chaseChance?: number  // ← NEW: Chase probability (0.0-1.0)
}
```

---

## 7. Risk & Considerations

### Potential Issues

**Issue 1: Chase Probability Makes Monsters Too Passive**
- **Problem**: 33% wait chance might make MEAN monsters feel too easy
- **Mitigation**: Test in gameplay, can adjust to 0.75 or 0.8 if needed

**Issue 2: Teleport Position Not Found**
- **Problem**: What if getRandomTeleportPosition() returns null?
- **Mitigation**: Graceful fallback - thief stays in place, reset hasStolen flag

**Issue 3: Thief Teleports Into Player's View**
- **Problem**: Might feel jarring if thief teleports into visible area
- **Mitigation**: Acceptable - matches original Rogue behavior, adds unpredictability

**Issue 4: 100% Random Bats Too Easy**
- **Problem**: Bats might become trivial to avoid
- **Mitigation**: Bats are low-level monsters, this matches original difficulty

### Breaking Changes
- **Chase Probability**: Monsters without `chaseChance` default to 1.0 (100% chase) - backwards compatible
- **ERRATIC Behavior**: Bats become easier - gameplay change, but authentic
- **THIEF Behavior**: Leprechaun/Nymph become harder to kill (teleport) - gameplay change

### Performance Considerations
- **Chase Probability**: Single random roll per monster per turn - negligible
- **Teleport**: Finding random position requires iterating walkable tiles - O(n) where n = level tiles, runs once per steal (rare event)
- **100% Random Movement**: Removes one random.chance() call - slight performance improvement

---

## 8. Timeline & Dependencies

### Dependencies
- **Blocked by**: None - all required services exist
- **Blocks**: None - this is a refinement, not a blocker

### Estimated Timeline
- Phase 1 (Chase Probability): 2-3 hours
- Phase 2 (Bat Behavior): 1 hour
- Phase 3 (Teleport): 3-4 hours
- Phase 4 (monsters.json): 1 hour
- Phase 5 (Documentation): 2 hours
- **Total**: 9-11 hours

---

## 9. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (MonsterAIService.md, game-design, systems-advanced)
- [ ] Manual testing: Fight MEAN monsters, verify they sometimes wait
- [ ] Manual testing: Bats move randomly (never toward player)
- [ ] Manual testing: Leprechaun steals and vanishes

### Follow-Up Tasks
- [ ] Playtest and gather feedback on chase probability (adjust if needed)
- [ ] Consider adding config option for chase probability (easy/normal/hard modes)
- [ ] Consider adding visual indicator when thief teleports (particle effect?)
- [ ] Monitor bat difficulty - may need to increase spawn rate if too easy

---

**Last Updated**: 2025-10-09
**Status**: 🚧 In Progress
