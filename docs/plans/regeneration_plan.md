# Health Regeneration Implementation Plan

**Version**: 1.0
**Created**: 2025-10-05
**Status**: Planning
**Related Docs**: [Game Design](./game-design.md) | [Systems Core](./systems-core.md) | [Architecture](./architecture.md) | [CLAUDE.md](../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Implement natural health regeneration for the player character, adding strategic depth to resource management while maintaining classic roguelike balance.

### Design Philosophy
- **Faithful to classics**: Honor 1980 Rogue and NetHack mechanics
- **Strategic depth**: Create meaningful trade-offs (food vs healing vs time)
- **Balance**: Prevent boring "wait to heal" gameplay
- **Simplicity**: Clear, understandable mechanics for players

### Success Criteria
- ✅ Player regenerates HP at consistent, balanced rate
- ✅ Hunger system gates regeneration (no free healing)
- ✅ Combat prevents regeneration (tactical retreat required)
- ✅ Ring of Regeneration provides meaningful upgrade
- ✅ Rest command offers convenience without breaking balance
- ✅ All tests pass with >80% coverage
- ✅ Architecture follows CLAUDE.md principles

---

## 2. Research Summary

### Classic Rogue (1980)
**Healing Potions:**
- Formula: `level × d4` HP (e.g., level 5 = 5d4)
- Overheal grants +1 max HP permanently
- Potion of Extra Healing for stronger recovery

**Ring of Regeneration:**
- Passive HP recovery over time
- **Tradeoff**: Significantly increases food consumption
- Natural recovery allowed "hit-hit-run away" tactics

**Natural Recovery:**
- Characters recovered HP when not in combat
- Used as tactical resource (retreat → heal → re-engage)

---

### NetHack
**Natural HP Regeneration:**
- Below level 10: `1 HP every (42 / (XL + 2)) + 1 turns`
- Level 10+: `1 HP every 3 turns`
- Constitution stat increases regeneration rate
- **Stressed encumbrance** stops regeneration while moving

**Ring of Regeneration:**
- Gain 1 HP on turns without normal regen (doubles effective rate)
- **Cost**: +30 nutrition consumption every odd turn
- Artifact sources don't consume extra food

**Prayer Mechanic:**
- Takes 3 turns, player helpless
- If max HP ≤ 5 × (2 + level), god increases max HP by 1d5
- Fully heals to new maximum
- Strategy: Wait for safe prayer (turn 301+), pray at low HP

---

### Angband
**Natural Regeneration:**
- High Constitution = faster recovery while resting
- Most important stat for endgame survival

**Regeneration Ability:**
- Half-trolls and certain races regenerate quickly
- **Cost**: +30 food consumption per 100 turns
- Slow Digestion ring cancels food penalty while keeping HP/mana regen

**Healing Potions:**
- Cure Light Wounds (!CLW)
- Cure Serious Wounds (!CSW)
- Proposed: *Healing* restores 100% HP instantly

---

### Modern Roguelike Best Practices
**Passive Regeneration with Hunger:**
- Shiren the Wanderer: Heal ~1/150th max HP per turn if belly not empty
- Caves: "Extremely slow health regeneration when fullness ≥ 20%"
- **Balance**: Enemies respawn, can't just wait to heal

**Exploration-Based Healing:**
- Heal 25% when entering new rooms
- Heal 100% when entering boss rooms
- Heal for killing unique enemies first time

**Resource Management:**
- Healing items are scarce, save for emergencies
- Multiple healing sources create strategic choice
- Tie healing to core gameplay loops

---

## 3. Current Implementation Status

### ✅ Already Implemented

**Healing Potions** (`src/services/PotionService/`)
- `HEAL`: Heals 1d8 HP → "You feel better. (+X HP)"
- `EXTRA_HEAL`: Heals 2d8 HP → "You feel much better! (+X HP)"
- Caps at max HP ✓
- Auto-identifies on use ✓

**Monster Regeneration** (`src/services/SpecialAbilityService/`)
- Trolls, Griffins, Vampires regenerate 1 HP/turn
- Only when below max HP
- Tests: `regeneration.test.ts`

**Game Design** (`docs/game-design.md`)
- Mentions regeneration in monster descriptions
- Lists Ring of Regeneration in rings section
- No player regeneration documented

### ❌ Not Implemented

**1. Player Natural Regeneration** ⭐ PRIORITY
- No passive HP recovery mechanism
- No resting system
- No waiting command

**2. Ring of Regeneration** ⭐ PRIORITY
- Ring exists in design doc but no implementation
- Should double regen rate + increase hunger

**3. Constitution-Based Regen**
- No CON stat exists (only STR)
- Could tie to level as proxy

**4. Rest/Wait Command**
- No way to skip turns intentionally
- No "rest until healed" convenience

---

## 4. Design Decision: Hybrid Approach

### Chosen Model (Recommended)

**Natural Regeneration:**
- Base rate: **1 HP every 10 turns**
- **Requirement**: Hunger > 100
- **Blocked by**: Enemy in FOV (in combat)
- **Formula**: Simple turn counter, no complex calculations

**Ring of Regeneration:**
- **Effect**: Doubles rate to **1 HP every 5 turns**
- **Cost**: +30% hunger consumption rate
- **Acquisition**: Rare ring drop (2-3% spawn rate)

**Rest Command:**
- **Key**: `5` (numpad) or `.` (period)
- **Behavior**: Skip turns until HP full or interrupted
- **Interrupts**: Enemy appears in FOV, hunger reaches 0
- **UI**: "Resting..." message with progress

**Max HP Increase (Rogue-style):**
- Healing potions that exceed max HP grant **+1 max HP**
- Message: "You feel permanently stronger! (Max HP +1)"
- Encourages strategic potion use at full health

### Rationale

**Why 10 turns?**
- NetHack level 1 = ~15 turns, level 5 = ~7 turns, level 10+ = 3 turns
- Our simpler system: **10 turns** is middle ground
- Fast enough to be useful, slow enough to create tension
- Easy to understand and communicate

**Why hunger > 100?**
- Hunger starts at 1300, normal range ~900-1300
- 100 threshold = "starving" state
- Creates strategic choice: eat now or heal naturally?
- Prevents infinite camping in dangerous areas

**Why block in combat?**
- Prevents trivial "kite forever" strategies
- Forces tactical retreat (break line of sight)
- Encourages exploration over waiting
- Classic roguelike pattern

**Why ring doubles (not triples)?**
- 10 → 5 turns is 2× speed (significant but not game-breaking)
- 30% hunger cost balances benefit
- Encourages finding Slow Digestion ring combo
- Matches NetHack's doubling pattern

---

## 5. Implementation Phases

### Phase 1: RegenerationService Implementation
**Goal**: Create core regeneration logic service

**Tasks:**
- [ ] **Task 1.1**: Create service structure
  - [ ] Create `src/services/RegenerationService/` folder
  - [ ] Create `RegenerationService.ts` with class skeleton
  - [ ] Create `index.ts` barrel export
  - [ ] Add to service initialization in `main.ts`
  - **Commit**: `feat: create RegenerationService skeleton`

- [ ] **Task 1.2**: Implement natural regeneration logic
  - [ ] Add `tickRegeneration(player, inCombat)` method
  - [ ] Track turns since last heal (internal state or player field)
  - [ ] Implement 10-turn counter logic
  - [ ] Check hunger > 100 requirement
  - [ ] Check combat status (inCombat parameter)
  - [ ] Return new player with hp + 1 when triggered
  - **Commit**: `feat: implement natural HP regeneration logic`

- [ ] **Task 1.3**: Add ring of regeneration detection
  - [ ] Create `hasRegenerationRing(player)` helper method
  - [ ] Check leftRing and rightRing for regeneration type
  - [ ] Modify regen rate to 5 turns when ring equipped
  - **Commit**: `feat: add ring of regeneration support`

- [ ] **Task 1.4**: Write comprehensive tests
  - [ ] Create `natural-regen.test.ts`
    - Test: 1 HP per 10 turns when hunger > 100
    - Test: No regen when hunger ≤ 100
    - Test: No regen when in combat
    - Test: No regen when HP = max HP
    - Test: Immutability (returns new player object)
  - [ ] Create `ring-regen.test.ts`
    - Test: 1 HP per 5 turns with ring equipped
    - Test: Detects ring on left hand
    - Test: Detects ring on right hand
    - Test: No bonus without ring
  - [ ] Create `combat-blocking.test.ts`
    - Test: Regen stops when enemy in FOV
    - Test: Regen resumes when combat ends
  - **Commit**: `test: add comprehensive RegenerationService tests`

- [ ] **Task 1.5**: Integration with game loop
  - [ ] Add to `MoveCommand.execute()` after movement
  - [ ] Determine inCombat status (enemy in visibleCells)
  - [ ] Call `tickRegeneration()` and update player
  - **Commit**: `feat: integrate regeneration into game loop`

**Completion Criteria**: All tests pass, regen works in-game, architecture compliant

---

### Phase 2: Ring of Regeneration
**Goal**: Implement ring item and hunger cost

**Tasks:**
- [ ] **Task 2.1**: Update type definitions
  - [ ] Add `REGENERATION` to `RingType` enum in `core.ts`
  - [ ] Verify Ring interface supports new type
  - **Commit**: `feat: add REGENERATION ring type`

- [ ] **Task 2.2**: Add to ring spawning
  - [ ] Update `DungeonService` ring generation
  - [ ] Add regeneration ring to spawn table (2-3% chance)
  - [ ] Set ring properties (no bonus stat, passive effect)
  - **Commit**: `feat: add Ring of Regeneration to loot table`

- [ ] **Task 2.3**: Modify hunger consumption
  - [ ] Update `HungerService.tickHunger()` method
  - [ ] Check for regeneration ring equipped
  - [ ] Increase hunger consumption by 30% when equipped
  - [ ] Add test: `ring-hunger-penalty.test.ts`
    - Test: +30% hunger with ring
    - Test: Normal hunger without ring
    - Test: Stacks with other hunger modifiers
  - **Commit**: `feat: add hunger penalty for regeneration ring`

- [ ] **Task 2.4**: Update ring descriptions
  - [ ] Add effect description: "Regenerates health faster"
  - [ ] Add warning: "Increases hunger consumption"
  - [ ] Update `docs/game-design.md` ring table
  - **Commit**: `docs: document Ring of Regeneration mechanics`

**Completion Criteria**: Ring spawns, detection works, hunger penalty applies

---

### Phase 3: Rest Command
**Goal**: Add convenient resting mechanism

**Tasks:**
- [ ] **Task 3.1**: Create RestCommand structure
  - [ ] Create `src/commands/RestCommand/` folder
  - [ ] Create `RestCommand.ts` implementing `ICommand`
  - [ ] Create `index.ts` barrel export
  - **Commit**: `feat: create RestCommand skeleton`

- [ ] **Task 3.2**: Implement rest logic
  - [ ] Loop: Skip turns while HP < maxHP
  - [ ] Check interruption conditions each iteration:
    - Enemy appears in FOV (recompute FOV each turn)
    - Hunger reaches 0 (starving)
    - HP reaches max
  - [ ] Track turns rested
  - [ ] Return updated state
  - **Commit**: `feat: implement rest command loop logic`

- [ ] **Task 3.3**: Add UI feedback
  - [ ] Message on start: "Resting..."
  - [ ] Message on complete: "Rested for X turns. (HP: Y/Z)"
  - [ ] Message on interrupt: "You are interrupted!" or "You are starving!"
  - [ ] Update message log with rest summary
  - **Commit**: `feat: add rest command messages`

- [ ] **Task 3.4**: Wire to InputHandler
  - [ ] Map `5` key to RestCommand
  - [ ] Map `.` key to RestCommand (alternative)
  - [ ] Add to help screen / command list
  - **Commit**: `feat: bind rest command to keyboard`

- [ ] **Task 3.5**: Write tests
  - [ ] Create `rest-command.test.ts`
    - Test: Rests until HP full
    - Test: Interrupts on enemy appearance
    - Test: Interrupts on hunger = 0
    - Test: Increments turn count correctly
    - Test: Messages are generated
    - Test: Immutability maintained
  - **Commit**: `test: add RestCommand tests`

**Completion Criteria**: Players can press `5` to rest, interruptions work correctly

---

### Phase 4: Potion Enhancement (Max HP Increase)
**Goal**: Implement Rogue-style permanent HP increase on overheal

**Tasks:**
- [ ] **Task 4.1**: Update PotionService
  - [ ] Modify `applyPotion()` for HEAL and EXTRA_HEAL
  - [ ] Calculate overheal: `healAmount - (maxHp - currentHp)`
  - [ ] If overheal > 0, increase maxHp by 1
  - [ ] Heal to new maxHp
  - [ ] Return updated player
  - **Commit**: `feat: add max HP increase on potion overheal`

- [ ] **Task 4.2**: Update messages
  - [ ] Base message: "You feel better. (+X HP)"
  - [ ] Overheal message: "You feel permanently stronger! (Max HP +1)"
  - [ ] Combine both messages when applicable
  - **Commit**: `feat: add max HP increase messages`

- [ ] **Task 4.3**: Write tests
  - [ ] Update `heal-potions.test.ts`
    - Test: No max HP increase when not at full HP
    - Test: +1 max HP when healing at full HP
    - Test: Heal correctly to new maximum
    - Test: Message includes permanent increase
  - **Commit**: `test: add overheal max HP tests`

**Completion Criteria**: Healing at full HP grants +1 max HP with appropriate message

---

### Phase 5: Integration & Balance Testing
**Goal**: Ensure all systems work together harmoniously

**Tasks:**
- [ ] **Task 5.1**: Hook into MonsterTurnService
  - [ ] Call regeneration after monster turns
  - [ ] Ensure combat detection still works
  - [ ] Test player regen between monster moves
  - **Commit**: `feat: integrate regen with monster turns`

- [ ] **Task 5.2**: Full game loop testing
  - [ ] Create `regeneration-integration.test.ts`
    - Test: Full combat → retreat → heal cycle
    - Test: Hunger depletion blocks regen
    - Test: Ring doubles rate in real gameplay
    - Test: Rest command works with monsters nearby
    - Test: Turn count accuracy across systems
  - **Commit**: `test: add regeneration integration tests`

- [ ] **Task 5.3**: Balance validation
  - [ ] Playtest Level 1-3 with regeneration
  - [ ] Verify regen speed feels right
  - [ ] Check hunger depletion rate balance
  - [ ] Adjust constants if needed (10 turns, 30% hunger)
  - **Commit**: `balance: tune regeneration rates`

- [ ] **Task 5.4**: Edge case testing
  - [ ] Test with 1 HP player
  - [ ] Test at exactly max HP
  - [ ] Test with 0 hunger
  - [ ] Test with multiple rings equipped
  - [ ] Test rest command at max HP (should skip)
  - **Commit**: `test: add edge case coverage`

**Completion Criteria**: Integration tests pass, balance feels correct, no edge case bugs

---

### Phase 6: Documentation
**Goal**: Document all new mechanics for developers and players

**Tasks:**
- [ ] **Task 6.1**: Update game-design.md
  - [ ] Add "Health Recovery" section under Character stats
  - [ ] Document natural regeneration (10 turns, hunger gate, combat block)
  - [ ] Document Ring of Regeneration (5 turns, +30% hunger)
  - [ ] Document rest command (`5` key)
  - [ ] Document max HP increase mechanic
  - **Commit**: `docs: document health regeneration mechanics in game-design.md`

- [ ] **Task 6.2**: Update systems-core.md
  - [ ] Add RegenerationService section
  - [ ] Explain turn counter logic
  - [ ] Document hunger interaction
  - [ ] Explain combat detection
  - [ ] Add formula specifications
  - **Commit**: `docs: add RegenerationService to systems-core.md`

- [ ] **Task 6.3**: Update commands.md
  - [ ] Add RestCommand entry
  - [ ] Document keybindings (`5`, `.`)
  - [ ] Explain interruption conditions
  - [ ] Add usage examples
  - **Commit**: `docs: document RestCommand in commands.md`

- [ ] **Task 6.4**: Create player guide
  - [ ] Add "Healing Guide" section to docs
  - [ ] Explain healing sources (potions, regen, rest)
  - [ ] Provide strategic tips (when to rest, when to use potions)
  - [ ] Document ring synergies (Slow Digestion + Regeneration)
  - **Commit**: `docs: create player healing guide`

- [ ] **Task 6.5**: Update this plan
  - [ ] Mark all completed tasks with [x]
  - [ ] Add "Completed" status header
  - [ ] Document any design deviations
  - [ ] Note lessons learned
  - **Commit**: `docs: mark regeneration_plan.md as complete`

**Completion Criteria**: All documentation updated, players can understand mechanics

---

## 6. Technical Specifications

### RegenerationService Interface
```typescript
interface RegenerationService {
  /**
   * Tick regeneration for player
   * @param player - Current player state
   * @param inCombat - True if enemy in FOV
   * @returns Updated player (or same if no regen)
   */
  tickRegeneration(player: Player, inCombat: boolean): Player

  /**
   * Check if player has regeneration ring equipped
   * @param player - Player to check
   * @returns True if ring equipped
   */
  hasRegenerationRing(player: Player): boolean
}
```

### Player State Extension (if needed)
```typescript
interface Player {
  // ... existing fields
  turnsSinceLastHeal?: number  // Optional: track regen counter
}
```

**Alternative**: Track counter in RegenerationService internal state (cleaner)

### Message Constants
```typescript
const REGEN_MESSAGES = {
  REST_START: 'Resting...',
  REST_COMPLETE: (turns: number, hp: number, maxHp: number) =>
    `Rested for ${turns} turns. (HP: ${hp}/${maxHp})`,
  REST_INTERRUPT_ENEMY: 'You are interrupted by a nearby enemy!',
  REST_INTERRUPT_HUNGER: 'You are too hungry to rest!',
  OVERHEAL_MAX_HP: 'You feel permanently stronger! (Max HP +1)',
}
```

### Configuration Constants
```typescript
const REGEN_CONFIG = {
  BASE_TURNS: 10,           // Turns between heals (normal)
  RING_TURNS: 5,            // Turns between heals (with ring)
  HUNGER_THRESHOLD: 100,    // Minimum hunger for regen
  RING_HUNGER_PENALTY: 0.3, // +30% hunger with ring
}
```

---

## 7. Testing Strategy

### Unit Tests (Service Layer)
**RegenerationService** (`src/services/RegenerationService/`)
- `natural-regen.test.ts` - Basic regeneration logic
- `ring-regen.test.ts` - Ring detection and rate doubling
- `combat-blocking.test.ts` - Combat interruption
- `hunger-gating.test.ts` - Hunger threshold logic

**HungerService** (updated)
- `ring-hunger-penalty.test.ts` - Ring hunger modifier

**PotionService** (updated)
- `overheal-max-hp.test.ts` - Max HP increase mechanic

### Integration Tests
**RestCommand** (`src/commands/RestCommand/`)
- `rest-command.test.ts` - Full rest cycle with interruptions

**Game Loop** (`src/__integration__/`)
- `regeneration-integration.test.ts` - Cross-system testing
  - Regen during movement
  - Regen during combat
  - Regen with rest command
  - Ring + hunger interaction

### Coverage Goals
- **RegenerationService**: 100% (pure logic)
- **RestCommand**: >80% (orchestration)
- **Integration tests**: Major paths covered
- **Overall**: Maintain >80% project coverage

### Edge Cases to Test
- Player at 1 HP
- Player at max HP
- Hunger at exactly 100
- Hunger at 0
- Enemy appears mid-rest
- Multiple regeneration rings (should not stack)
- Unequipping ring mid-regen
- Regen with 0 max HP (impossible but defensive)

---

## 8. Files to Create/Modify

### New Files (7 total)
```
src/services/RegenerationService/
├── RegenerationService.ts           # Core regen logic
├── natural-regen.test.ts            # Base regen tests
├── ring-regen.test.ts               # Ring mechanic tests
├── combat-blocking.test.ts          # Combat tests
├── hunger-gating.test.ts            # Hunger tests
└── index.ts                         # Barrel export

src/commands/RestCommand/
├── RestCommand.ts                   # Rest command impl
├── rest-command.test.ts             # Rest tests
└── index.ts                         # Barrel export

src/__integration__/
└── regeneration-integration.test.ts # Full game loop tests
```

### Modified Files (8 total)
```
src/types/core/core.ts               # Add REGENERATION ring type
src/services/HungerService/HungerService.ts  # Ring hunger penalty
src/services/HungerService/ring-hunger-penalty.test.ts  # NEW test file
src/services/PotionService/PotionService.ts  # Overheal max HP
src/services/PotionService/heal-potions.test.ts  # Update tests
src/commands/MoveCommand/MoveCommand.ts      # Call tickRegeneration
src/ui/InputHandler.ts               # Wire rest command keys
src/main.ts                          # Initialize RegenerationService

docs/game-design.md                  # Document mechanics
docs/systems-core.md                 # Add service docs
docs/commands.md                     # Add rest command
docs/regeneration_plan.md            # This file - mark complete
```

---

## 9. Risks & Mitigation

### Risk 1: Regeneration Too Fast (Trivialized Combat)
**Mitigation:**
- Start with 10-turn rate (conservative)
- Hunger gate prevents infinite healing
- Combat block forces tactical retreat
- Balance testing in Phase 5
- Easy to adjust constant if needed

### Risk 2: Regeneration Too Slow (Frustrating)
**Mitigation:**
- Rest command provides convenience
- Ring doubles rate for upgrade path
- Potions still available for emergency healing
- Playtest feedback loop

### Risk 3: Ring Hunger Penalty Too Harsh
**Mitigation:**
- 30% is NetHack/Angband standard (tested)
- Slow Digestion ring combo available
- Optional upgrade, not required
- Can be adjusted based on feedback

### Risk 4: Rest Command Exploited
**Mitigation:**
- Hunger still depletes during rest
- Enemies interrupt resting
- Not faster than manual waiting
- Pure convenience, no strategic advantage

### Risk 5: Architecture Violation (Logic in Command)
**Mitigation:**
- RestCommand orchestrates only
- RegenerationService contains logic
- Follow CLAUDE.md checklist
- Code review before commit

---

## 10. Success Metrics

### Functional Metrics
- ✅ All 25+ tests pass
- ✅ >80% code coverage maintained
- ✅ Zero TypeScript compilation errors
- ✅ Build succeeds without warnings

### Balance Metrics
- ✅ Average combat → regen cycle feels fair
- ✅ Hunger depletion rate manageable
- ✅ Ring provides noticeable but not overpowered benefit
- ✅ Players choose when to use potions vs regen

### Architecture Metrics
- ✅ Zero logic in UI layer
- ✅ Zero logic in Command layer (except simple routing)
- ✅ All logic in Service layer
- ✅ Immutability maintained throughout
- ✅ Dependency injection used correctly

### Documentation Metrics
- ✅ All mechanics documented in game-design.md
- ✅ Service documented in systems-core.md
- ✅ Command documented in commands.md
- ✅ Player guide section created

---

## 11. Timeline Estimate

**Total Estimated Time**: 8-12 hours

**Phase Breakdown**:
- Phase 1 (RegenerationService): 3-4 hours
- Phase 2 (Ring of Regeneration): 1-2 hours
- Phase 3 (Rest Command): 2-3 hours
- Phase 4 (Potion Enhancement): 1 hour
- Phase 5 (Integration & Balance): 2-3 hours
- Phase 6 (Documentation): 1 hour

**Dependencies**: None (can start immediately)

**Blockers**: None identified

---

## 12. References

### Classic Roguelike Research
- **Original Rogue (1980)**: Healing formula, ring mechanics
- **NetHack**: Regeneration rates, prayer system, hunger costs
- **Angband**: Constitution-based regen, food balance
- **Modern roguelikes**: Exploration healing, hunger gates

### Project Documentation
- [CLAUDE.md](../CLAUDE.md) - Architecture principles, workflow
- [Game Design](./game-design.md) - Core mechanics, character stats
- [Systems Core](./systems-core.md) - Service layer documentation
- [Architecture](./architecture.md) - Technical patterns, data structures
- [Testing Strategy](./testing-strategy.md) - Test organization

### Related Services
- `HungerService` - Food consumption, hunger mechanics
- `PotionService` - Healing potions, item effects
- `SpecialAbilityService` - Monster regeneration (reference impl)
- `TurnService` - Turn tracking, turn-based effects

---

## 13. Notes & Decisions Log

### Design Decisions Made
1. **Chose 10-turn base rate**: Balance between NetHack's scaling and Rogue's simplicity
2. **Hunger gate at 100**: Clear threshold, creates resource tension
3. **Combat blocks regen**: Prevents trivial kiting, encourages tactics
4. **Ring doubles (not triples)**: Significant but balanced upgrade
5. **Rest command interrupts**: Convenience without breaking balance
6. **Overheal grants +1 max HP**: Faithful to original Rogue

### Open Questions
- Should regen scale with level? (Decision: No, keep simple for v1)
- Should Constitution stat be added? (Decision: No, use level as proxy if needed later)
- Should rest have animation? (Decision: Defer to UI polish phase)

### Future Enhancements (Not in This Plan)
- Regeneration potion (temporary boost)
- Life Steal mechanics
- Regeneration curse (can't stop healing, wastes food)
- Environmental healing (healing fountains, altars)

---

**Plan Status**: ⚪ Ready to Execute
**Next Action**: Begin Phase 1, Task 1.1 (Create RegenerationService skeleton)
**Estimated Completion**: 1-2 development sessions
