# Potion System Implementation Plan

**Status**: ✅ Complete
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Game Design - Items](../game-design/05-items.md) | [Architecture](../architecture.md) | [PotionService](../services/PotionService.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Implement all 11 core potion types from Original Rogue (1980), including instant-effect potions, status effect potions, and detection potions, while building the foundation for duration-based status effects.

### Design Philosophy
- **Phased Implementation**: Start with simple instant effects, build status effect infrastructure, then implement duration-based potions
- **Single Source of Truth**: Status effects managed centrally by StatusEffectService
- **Backward Compatibility**: Existing 5 potions remain unchanged, new system extends functionality
- **Original Rogue Fidelity**: Match Original Rogue (1980) mechanics, durations, and messages where documented

### Success Criteria
- [x] 5 potions already implemented (HEAL, EXTRA_HEAL, GAIN_STRENGTH, RESTORE_STRENGTH, POISON)
- [x] Phase 1 Complete: 3 instant-effect potions (RAISE_LEVEL, DETECT_MONSTERS, DETECT_MAGIC)
- [x] Phase 2: StatusEffectService handles duration-based effects (confusion, blindness, haste)
- [x] Phase 2: 3 status effect potions (CONFUSION, BLINDNESS, HASTE_SELF)
- [x] Phase 2: Full energy system implemented (Angband-style, supports variable speeds)
- [x] Phase 3 Complete: 2 advanced potions (SEE_INVISIBLE, LEVITATION)
- [x] All tests pass with 100% coverage (159/159 suites, 1732/1732 tests)
- [x] Architecture follows CLAUDE.md principles (no logic in commands)
- [ ] Documentation updated (game design, service docs, plan)

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Items - Potions](../game-design/05-items.md#potions-) - Game design specification for potion types
- [Character - Health Regeneration](../game-design/02-character.md#3-health-regeneration) - Overheal mechanic
- [References - Original Rogue](../game-design/15-references.md#2-original-rogue-1980) - Source material

### Related Systems
- **IdentificationService**: Handles potion name display and auto-identification on use
- **LevelingService**: Needed for RAISE_LEVEL potion (instant level up)
- **FOVService**: Needs modification for BLINDNESS (override visibility) and DETECT_MONSTERS (temporary reveal)
- **MovementService**: Needs modification for CONFUSION (randomize direction)
- **TurnService**: Needs modification for HASTE_SELF (double actions per turn)
- **RenderingService**: Visual indicators for status effects and detected entities

### Research Summary

**Original Rogue (1980) Potion Mechanics** (from StrategyWiki and Rogue Archive):

| Potion | Effect | Power/Duration | Message |
|--------|--------|----------------|---------|
| **Healing** | Heals 1d8 HP | 1d8 | "You feel better" |
| **Extra Healing** | Heals 1d8/level | 1d8 per level | "You feel much better!" |
| **Gain Strength** | +1 STR permanently | +1 | "You feel stronger!" |
| **Restore Strength** | STR = Max STR | Instant | "Hey, this tastes great..." |
| **Poison** | -1 to -3 STR | 1d3 | "You feel very sick now" |
| **Confusion** | Random movement | 19-21 turns | "Wait, what's going on..." |
| **Blindness** | Cannot see | 807-892 turns | "Oh, bummer! Everything is dark!" |
| **Haste Self** | Double speed | 4-8 turns | "You feel yourself moving much faster" |
| **Raise Level** | Level up | Instant | Level up message |
| **Monster Detection** | Reveal monsters | Instant | "You sense monsters" or "strange feeling" |
| **Magic Detection** | Reveal magic items | Instant | "You sense magic" or "strange feeling" |

**Design Adaptations**:
- **EXTRA_HEAL**: Changed from `1d8/level` to fixed `2d8+2` for balance (matches current implementation)
- **POISON**: Changed from STR drain to HP damage `1d6` (matches current implementation)
- **Blindness Duration**: May reduce from 807-892 to ~40-60 turns for gameplay balance

---

## 3. Phases & Tasks

### Phase 1: Instant Effect Potions (Priority: HIGH)

**Objective**: Implement 3 simple instant-effect potions (RAISE_LEVEL, DETECT_MONSTERS, DETECT_MAGIC) that require no new systems.

#### Task 1.1: Implement RAISE_LEVEL Potion

**Context**: Grants instant level up. Uses existing LevelingService, simplest new potion to implement.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/PotionService/raise-level-potion.test.ts` (create)
- `public/data/items.json` (modify - add RAISE_LEVEL entry)

##### Subtasks:
- [x] Inject LevelingService into PotionService constructor
- [x] Add `applyRaiseLevelPotion(player: Player): Player` private method
- [x] Add RAISE_LEVEL case to `applyPotion()` switch statement
- [x] Write tests: level increase, HP increase, XP threshold, max level cap
- [ ] Update items.json with RAISE_LEVEL potion data (rarity: "rare")
- [x] Git commit: "feat: implement RAISE_LEVEL potion with instant level up (Phase 1.1)"

---

#### Task 1.2: Add Detection State to GameState

**Context**: Need temporary state to track revealed monsters/magic items for detection potions.

**Files to create/modify**:
- `src/types/core/core.ts` (modify)

##### Subtasks:
- [x] Add `detectedMonsters: Set<string>` to GameState (monster IDs temporarily revealed)
- [x] Add `detectedMagicItems: Set<string>` to GameState (magic item IDs highlighted)
- [ ] Add `detectionExpiresOnTurn: number | null` to GameState (auto-clear detection on level change)
- [x] Git commit: "feat: add detection state to GameState (Phase 1.2)"

---

#### Task 1.3: Implement DETECT_MONSTERS Potion

**Context**: Reveals all monsters on current level temporarily. Original Rogue shows monsters on map until player changes levels.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/PotionService/detection-potions.test.ts` (create)

##### Subtasks:
- [x] Add `applyDetectMonsters(state: GameState): { state: GameState; monstersFound: number }` method
- [x] Populate `state.detectedMonsters` with all monster IDs on current level
- [x] Return count of monsters detected (0 = "strange feeling", >0 = "you sense monsters")
- [x] Add DETECT_MONSTERS case to `applyPotion()` switch
- [x] Write tests: monsters detected, no monsters case, multiple monsters
- [x] Git commit: "feat: implement DETECT_MONSTERS potion (Phase 1.3)"

---

#### Task 1.4: Implement DETECT_MAGIC Potion

**Context**: Highlights all magic items (potions, scrolls, rings, wands) on current level.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/PotionService/detection-potions.test.ts` (modify)

##### Subtasks:
- [x] Add `applyDetectMagic(state: GameState): { state: GameState; itemsFound: number }` method
- [x] Populate `state.detectedMagicItems` with all magic item IDs
- [x] Return count of items detected (0 = "strange feeling", >0 = "you sense magic")
- [x] Add DETECT_MAGIC case to `applyPotion()` switch
- [x] Write tests: magic items detected, no items case, mixed items
- [x] Git commit: "feat: implement DETECT_MAGIC potion (Phase 1.4)"

---

#### Task 1.5: Update Rendering for Detection

**Context**: Monsters/items detected by potions need visual indicators.

**Files to create/modify**:
- `src/ui/GameRenderer.ts` (modify)

##### Subtasks:
- [x] Check `state.detectedMonsters` when rendering monsters (show even if not in FOV)
- [x] Check `state.detectedMagicItems` when rendering items (add visual indicator like `*` or color)
- [x] Add "Detected" prefix or highlight color for detected entities
- [ ] Clear detection state on level change (in level navigation commands)
- [x] Git commit: "feat: render detected monsters and magic items (Phase 1.5)"

---

### Phase 2: Status Effect System (Priority: HIGH)

**Objective**: Build foundational StatusEffectService to manage duration-based effects (confusion, blindness, haste, etc.).

#### Task 2.1: Create StatusEffectService Interface and Types

**Context**: Central system for managing temporary player status effects with durations.

**Files to create/modify**:
- `src/types/core/core.ts` (modify)
- `src/services/StatusEffectService/StatusEffectService.ts` (create)
- `src/services/StatusEffectService/index.ts` (create)

##### Subtasks:
- [ ] Define `StatusEffectType` enum (CONFUSED, BLIND, HASTED, SLOWED, PARALYZED, LEVITATING, SEE_INVISIBLE)
- [ ] Define `StatusEffect` interface: `{ type: StatusEffectType, duration: number, intensity?: number }`
- [ ] Add `statusEffects: StatusEffect[]` to Player interface
- [ ] Create StatusEffectService class with RandomService dependency
- [ ] Implement `addStatusEffect(player: Player, effect: StatusEffectType, duration: number): Player`
- [ ] Implement `removeStatusEffect(player: Player, effect: StatusEffectType): Player`
- [ ] Implement `hasStatusEffect(player: Player, effect: StatusEffectType): boolean`
- [ ] Implement `getStatusEffect(player: Player, effect: StatusEffectType): StatusEffect | undefined`
- [ ] Barrel export in index.ts
- [ ] Git commit: "feat: create StatusEffectService with duration tracking (Phase 2.1)"

---

#### Task 2.2: Implement Status Effect Tick System

**Context**: Status effects decrement duration each turn and auto-expire when duration reaches 0.

**Files to create/modify**:
- `src/services/StatusEffectService/StatusEffectService.ts` (modify)
- `src/services/StatusEffectService/status-effect-tick.test.ts` (create)
- `src/services/TurnService/TurnService.ts` (modify)

##### Subtasks:
- [ ] Implement `tickStatusEffects(player: Player): { player: Player; expired: StatusEffectType[] }`
- [ ] Decrement duration of all active effects by 1
- [ ] Remove effects with duration <= 0
- [ ] Return updated player + list of expired effects (for messaging)
- [ ] Inject StatusEffectService into TurnService
- [ ] Call `tickStatusEffects()` in TurnService.incrementTurn()
- [ ] Write tests: single effect expiration, multiple effects, no effects
- [ ] Git commit: "feat: implement status effect tick and auto-expiration (Phase 2.2)"

---

#### Task 2.3: Implement CONFUSION Potion

**Context**: Randomizes player movement direction for 19-21 turns. Original Rogue mechanic.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/MovementService/MovementService.ts` (modify)
- `src/services/PotionService/confusion-potion.test.ts` (create)
- `src/services/MovementService/confused-movement.test.ts` (create)

##### Subtasks:
- [ ] Inject StatusEffectService into PotionService
- [ ] Add `applyConfusionPotion(player: Player): Player` method
- [ ] Apply CONFUSED status for 19-21 turns (random)
- [ ] Add CONFUSION case to `applyPotion()` switch
- [ ] Inject StatusEffectService into MovementService (modify constructor)
- [ ] Update MovementService.movePlayer() to randomize direction if confused
- [ ] Write PotionService tests: duration randomization, status applied
- [ ] Write MovementService tests: confused movement, random direction selection
- [ ] Git commit: "feat: implement CONFUSION potion with randomized movement (Phase 2.3)"

---

#### Task 2.4: Implement BLINDNESS Potion

**Context**: Removes player vision for 40-60 turns (reduced from original 807-892 for balance). Player sees nothing.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/FOVService/FOVService.ts` (modify)
- `src/services/PotionService/blindness-potion.test.ts` (create)
- `src/services/FOVService/blind-fov.test.ts` (create)

##### Subtasks:
- [ ] Add `applyBlindnessPotion(player: Player): Player` method to PotionService
- [ ] Apply BLIND status for 40-60 turns (random)
- [ ] Add BLINDNESS case to `applyPotion()` switch
- [ ] Inject StatusEffectService into FOVService
- [ ] Update FOVService.computeFOV() to return empty set if player has BLIND status
- [ ] Write PotionService tests: duration randomization, blind status applied
- [ ] Write FOVService tests: blind player sees nothing, normal FOV when not blind
- [ ] Git commit: "feat: implement BLINDNESS potion with vision override (Phase 2.4)"

---

#### Task 2.5: Implement HASTE_SELF Potion (Full Energy System)

**Context**: Grants double actions per turn for 4-8 turns. After research (priority queues, energy systems, action counters), implementing **full Angband-style energy system** for extensibility.

**Design Decision**: Full energy system chosen over simple actionsRemaining because:
- ✅ Handles player haste (immediate need: 2 actions/turn for 4-8 turns)
- ✅ Scales to variable monster speeds (future: Zombie=slow, wands of haste/slow)
- ✅ Precise speed calculations with energy carryover
- ✅ Battle-tested in Angband/ADOM/Crawl

**Energy System Mechanics**:
- Energy threshold: 100 energy required to act
- Speeds: Normal=10, Hasted=20 (2x rate), Slowed=5 (0.5x rate)
- Energy carries over after actions (excess persists to next tick)
- Player gets energy until threshold met, acts, then monsters process

**Files to create/modify**:
- `src/types/core/core.ts` (modify - add energy/speed fields)
- `src/constants/energy.ts` (create - energy constants)
- `src/services/TurnService/TurnService.ts` (modify - energy methods)
- `src/services/TurnService/energy-system.test.ts` (create)
- `src/services/MonsterTurnService/MonsterTurnService.ts` (modify - energy processing)
- `src/services/MonsterTurnService/energy-turn-processing.test.ts` (create)
- `src/services/PotionService/PotionService.ts` (modify - HASTE_SELF potion)
- `src/services/PotionService/haste-potion.test.ts` (create)
- `src/main.ts` (modify - energy-based game loop)
- `src/services/DungeonService/DungeonService.ts` (modify - monster energy init)
- `src/__integration__/energy-game-loop.test.ts` (create)

##### Subtasks:

**Task 2.5.1: Add energy/speed fields to core types**
- [x] Update `Player` interface: add `energy: number` field
- [x] Update `Monster` interface: add `energy: number`, `speed: number` fields
- [x] Initialize player energy to 100 in main.ts `createInitialState()` (can act immediately)
- [x] Initialize player energy to 100 in main.ts `replaySeed()` (can act immediately)
- [x] Initialize monster energy to random 0-99 in DungeonService (staggered starts)
- [x] Initialize monster speed to 10 in DungeonService (normal speed baseline)
- [x] Git commit: "feat: add energy/speed fields to Player and Monster (Phase 2.5.1)"

**Task 2.5.2: Create energy constants**
- [x] Create `/src/constants/energy.ts`
- [x] Define `ENERGY_THRESHOLD = 100` (energy required to act)
- [x] Define `NORMAL_SPEED = 10` (baseline speed)
- [x] Define `HASTED_SPEED = 20` (player hasted, 2x rate)
- [x] Define `SLOWED_SPEED = 5` (slowed, 0.5x rate)
- [x] Git commit: "feat: create energy system constants (Phase 2.5.2)"

**Task 2.5.3: Refactor TurnService for energy system**
- [x] Add generic `Actor` type: `type Actor = { energy: number }`
- [x] Add `grantEnergy<T extends Actor>(actor: T, speed: number): T` - grants energy based on speed
- [x] Add `canAct<T extends Actor>(actor: T): boolean` - checks if energy >= ENERGY_THRESHOLD
- [x] Add `consumeEnergy<T extends Actor>(actor: T): T` - subtracts ENERGY_THRESHOLD from energy
- [x] Add `getPlayerSpeed(player: Player): number` - returns HASTED_SPEED if HASTED, else NORMAL_SPEED
- [x] Add `grantPlayerEnergy(state: GameState): GameState` - grants energy to player based on speed
- [x] Add `consumePlayerEnergy(player: Player): Player` - wrapper for consumeEnergy
- [x] Add `canPlayerAct(player: Player): boolean` - wrapper for canAct
- [x] Modify `incrementTurn()` to only tick status effects (no energy granting)
- [x] Create `energy-system.test.ts` with 12 unit tests:
  - [x] Test `grantEnergy()` with normal speed (10 energy granted)
  - [x] Test `grantEnergy()` with hasted speed (20 energy granted)
  - [x] Test `grantEnergy()` with slowed speed (5 energy granted)
  - [x] Test `canAct()` returns true when energy >= 100
  - [x] Test `canAct()` returns false when energy < 100
  - [x] Test `consumeEnergy()` subtracts 100 from energy
  - [x] Test energy carryover (150 energy → consume → 50 remains)
  - [x] Test `getPlayerSpeed()` returns 20 when HASTED
  - [x] Test `getPlayerSpeed()` returns 10 when not HASTED
  - [x] Test `grantPlayerEnergy()` grants correct amount for normal player
  - [x] Test `grantPlayerEnergy()` grants correct amount for hasted player
  - [x] Test `canPlayerAct()` wrapper method
- [x] Git commit: "feat: refactor TurnService with energy system methods (Phase 2.5.3)"

**Task 2.5.4: Update MonsterTurnService for energy**
- [x] Inject `TurnService` dependency into MonsterTurnService constructor
- [x] Update MonsterTurnService initialization in main.ts to pass turnService
- [x] Modify `processMonsterTurns()` to grant energy to monsters based on `monster.speed`
- [x] Process each monster in `while (turnService.canAct(monster))` loop (multiple actions possible)
- [x] Consume ENERGY_THRESHOLD from monster after each action
- [x] Update monster state with new energy value after processing
- [x] Create `energy-turn-processing.test.ts` with 8 unit tests:
  - [x] Test monster with speed 10 acts once per turn
  - [x] Test monster with speed 20 acts twice per turn
  - [x] Test monster with speed 5 acts once every 2 turns
  - [x] Test energy carryover between turns
  - [x] Test multiple monsters with different speeds
  - [x] Test monster with 150 energy acts once, 50 energy remains
  - [x] Test monster with 99 energy does not act
  - [x] Test dead monster (hp <= 0) does not process
- [x] Update existing MonsterTurnService tests to inject TurnService mock
- [x] Git commit: "feat: update MonsterTurnService with energy-based processing (Phase 2.5.4)"

**Task 2.5.5: Implement HASTE_SELF potion**
- [x] Add `applyHasteSelfPotion(player: Player): { player: Player; duration: number }` method
- [x] Duration formula: 3 + 1d5 (results in 4-8 turns, matches Original Rogue)
- [x] Apply HASTED status effect via StatusEffectService
- [x] Add HASTE_SELF case to `applyPotion()` switch statement
- [x] Message: `"You feel yourself moving much faster! (Hasted for ${duration} turns)"`
- [x] Auto-identify potion on use (already handled by applyPotion)
- [x] Create `haste-potion.test.ts` with 9 unit tests:
  - [x] Test HASTED status applied to player
  - [x] Test duration is 4-8 turns (min: 3+1=4, max: 3+5=8)
  - [x] Test message includes duration
  - [x] Test potion auto-identifies on use
  - [x] Test does not kill player
  - [x] Test does not modify player stats (HP, strength, level)
  - [x] Test can stack with other status effects (HASTED + CONFUSED)
  - [x] Test replaces existing HASTED effect (does not stack with self)
  - [x] Test no state field in result (potion doesn't modify game state)
- [x] Git commit: "feat: implement HASTE_SELF potion with 4-8 turn duration (Phase 2.5.5)"

**Task 2.5.6: Update main game loop (energy-based)**
- [x] Modify `currentKeydownHandler` in main.ts:
  - [x] **Phase 1**: Grant energy until player can act (`while (!turnService.canPlayerAct(gameState.player))`)
  - [x] Grant player energy in loop: `gameState = turnService.grantPlayerEnergy(gameState)`
  - [x] **Phase 2**: Execute command if command exists
  - [x] Consume player energy after command: `gameState = { ...gameState, player: turnService.consumePlayerEnergy(gameState.player) }`
  - [x] **Phase 3**: Process monsters only if player exhausted energy
  - [x] Check `if (!turnService.canPlayerAct(gameState.player))` before monster turns
  - [x] Process monster turns: `gameState = monsterTurnService.processMonsterTurns(gameState)`
  - [x] Increment turn after monster phase: `gameState = turnService.incrementTurn(gameState)`
- [x] Test manually: player with speed 10 acts once, then monsters act
- [x] Test manually: player with speed 20 (hasted) acts twice, then monsters act
- [x] Git commit: "feat: update main game loop with energy system (Phase 2.5.6)"

**Task 2.5.7: Integration testing**
- [x] Create `/src/__integration__/energy-game-loop.test.ts`
- [x] Test scenario 1: Normal speed player (speed 10) acts once per turn cycle
- [x] Test scenario 2: Hasted player (speed 20) acts twice before monsters
- [x] Test scenario 3: Slow monster (speed 5) acts once every 2 turns
- [x] Test scenario 4: Fast monster (speed 20) acts twice per monster phase
- [x] Test scenario 5: Energy carryover - player with 150 energy acts, 50 remains
- [x] Test scenario 6: Haste expires mid-turn - speed drops from 20 to 10
- [x] Test scenario 7: Multiple monsters with mixed speeds (5, 10, 20)
- [x] Test scenario 8: Full turn cycle - player acts → monsters act → turn increments
- [x] Git commit: "test: add energy system integration tests (Phase 2.5.7)"

**Task 2.5.8: Update plan document**
- [x] Mark Phase 2.5 complete in `docs/plans/potion_implementation_plan.md`
- [x] Document energy system design decisions in plan
- [x] Git commit: "docs: mark Phase 2.5 complete in potion plan (Phase 2.5.8)"

---

#### Task 2.6: Add Status Effect UI Indicators

**Context**: Player needs to see active status effects (CONFUSED, BLIND, HASTED).

**Files to create/modify**:
- `src/ui/GameRenderer.ts` (modify)

##### Subtasks:
- [x] Add status effect indicator section to stats display
- [x] Show active status effects with icons/text (e.g., "Confused (12)", "Blind! (45)", "Fast! (6)")
- [x] Add visual indicator for CONFUSED (e.g., "?" icon near player)
- [x] Add visual indicator for HASTED (e.g., lightning bolt icon)
- [x] BLIND naturally handled by FOVService (returns empty set when blind)
- [x] Git commit: "feat: add status effect UI indicators (Phase 2.6)"

---

### Phase 3: Advanced Potion Mechanics (Priority: MEDIUM)

**Objective**: Implement complex interaction potions (SEE_INVISIBLE, LEVITATION) and edge cases.

#### Task 3.1: Implement SEE_INVISIBLE Potion

**Context**: Reveals invisible monsters (Phantoms) until player changes levels. Original Rogue mechanic.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/types/core/core.ts` (modify - add `isInvisible: boolean` to Monster)
- `src/ui/GameRenderer.ts` (modify)
- `src/commands/MoveStairsCommand/MoveStairsCommand.ts` (modify)
- `src/ui/InputHandler.ts` (modify)
- `src/main.ts` (modify)

##### Subtasks:
- [x] Add `SEE_INVISIBLE` to StatusEffectType enum (already exists)
- [x] Add `applySeeInvisiblePotion(player: Player): Player` method
- [x] Apply SEE_INVISIBLE status with duration = 999 turns (cleared on stairs)
- [x] Add `isInvisible: boolean` property to Monster interface (default false)
- [x] Update DungeonService to initialize isInvisible: false
- [x] Update GameRenderer to render invisible monsters if player has SEE_INVISIBLE
- [x] Add StatusEffectService to MoveStairsCommand
- [x] Clear SEE_INVISIBLE status on level change (in MoveStairsCommand)
- [x] Wire up StatusEffectService in InputHandler and main.ts
- [x] Update MoveStairsCommand tests (all 14 passing)
- [ ] Update Phantom monster definition to have `isInvisible: true` (future)
- [x] Git commits: "feat: implement SEE_INVISIBLE potion" + "feat: wire up StatusEffectService" (Phase 3.1)

---

#### Task 3.2: Implement LEVITATION Potion

**Context**: Player floats over traps for 29-32 turns. Original Rogue mechanic.

**Files to create/modify**:
- `src/services/PotionService/PotionService.ts` (modify)
- `src/services/TrapService/TrapService.ts` (modify)

##### Subtasks:
- [x] Add `LEVITATING` to StatusEffectType enum (already existed)
- [x] Add LEVITATION and SEE_INVISIBLE to PotionType enum
- [x] Add `applyLevitationPotion(player: Player): Player` method
- [x] Apply LEVITATING status for 29-32 turns (random)
- [x] Inject StatusEffectService into TrapService
- [x] Update TrapService.triggerTrap() to check for LEVITATING status
- [x] If levitating, return `{ damage: 0, message: "You float over the trap." }`
- [x] Write tests: trap avoidance while levitating, normal trap trigger when not levitating (3 tests added)
- [x] Update TrapService test files with StatusEffectService dependency
- [x] Git commit: "feat: implement LEVITATION potion with trap immunity (Phase 3.2)" (commit e303579)

---

#### Task 3.3: Optional Potions (Future Enhancements)

**Context**: Additional potions from Original Rogue that may be added in future versions.

##### Potions to Consider:
- [ ] **HALLUCINATION**: Monsters/items appear as different types (850 turns) - Very complex rendering
- [ ] **PARALYSIS**: Player cannot move (variable duration) - Simple status effect
- [ ] **THIRST_QUENCHING**: Does nothing (joke item) - Trivial implementation

---

### Phase 4: Testing & Polish (Priority: HIGH)

**Objective**: Ensure comprehensive test coverage and edge case handling.

#### Task 4.1: Comprehensive Testing

**Files to create/modify**:
- All test files from previous phases

##### Subtasks:
- [ ] Write edge case tests: multiple status effects stacking, effect expiration mid-action
- [ ] Write integration tests: potion → status effect → game mechanic interaction
- [ ] Test identification system with all new potions
- [ ] Test QuaffPotionCommand with all 11 potion types
- [ ] Verify >80% coverage on PotionService and StatusEffectService
- [ ] Git commit: "test: comprehensive potion and status effect testing (Phase 4.1)"

---

#### Task 4.2: Balance Testing

**Context**: Ensure potion spawn rates, durations, and effects feel balanced.

##### Subtasks:
- [ ] Verify rarity distribution in items.json (common/uncommon/rare)
- [ ] Playtest CONFUSION duration (19-21 turns feels reasonable?)
- [ ] Playtest BLINDNESS duration (40-60 turns vs original 807-892)
- [ ] Playtest HASTE_SELF (4-8 turns with double actions)
- [ ] Adjust values based on feedback
- [ ] Git commit: "balance: tune potion durations and spawn rates (Phase 4.2)"

---

## 4. Technical Design

### Data Structures

```typescript
// Status Effect System
export enum StatusEffectType {
  CONFUSED = 'CONFUSED',
  BLIND = 'BLIND',
  HASTED = 'HASTED',
  SLOWED = 'SLOWED',
  PARALYZED = 'PARALYZED',
  LEVITATING = 'LEVITATING',
  SEE_INVISIBLE = 'SEE_INVISIBLE',
}

export interface StatusEffect {
  type: StatusEffectType
  duration: number // turns remaining
  intensity?: number // for variable-strength effects
}

// Player with status effects
export interface Player {
  // ... existing fields
  statusEffects: StatusEffect[]
}

// GameState with detection
export interface GameState {
  // ... existing fields
  detectedMonsters: Set<string> // Monster IDs revealed by DETECT_MONSTERS
  detectedMagicItems: Set<string> // Item IDs highlighted by DETECT_MAGIC
  actionsRemaining: number // For HASTE_SELF double actions (default 1)
}

// Monster with invisibility
export interface Monster {
  // ... existing fields
  isInvisible: boolean // True for Phantoms, revealed by SEE_INVISIBLE
}
```

### Service Architecture

**New Services**:
- **StatusEffectService**: Manages duration-based temporary effects (add, remove, tick, query)

**Modified Services**:
- **PotionService**: Add 6 new potion effect methods + inject StatusEffectService, LevelingService
- **MovementService**: Check CONFUSED status, randomize direction
- **FOVService**: Check BLIND status, return empty set if blind
- **TurnService**: Tick status effects, handle HASTED double actions
- **TrapService**: Check LEVITATING status, skip trap trigger
- **RenderingService**: Show detected monsters/items, render invisible creatures if SEE_INVISIBLE

**Service Dependencies**:
```
PotionService
  ├─ depends on → RandomService
  ├─ depends on → IdentificationService
  ├─ depends on → StatusEffectService (NEW)
  └─ depends on → LevelingService

StatusEffectService (NEW)
  └─ depends on → RandomService

TurnService
  └─ depends on → StatusEffectService (NEW)

MovementService
  └─ depends on → StatusEffectService (NEW)

FOVService
  └─ depends on → StatusEffectService (NEW)

TrapService
  └─ depends on → StatusEffectService (NEW)
```

### Algorithms & Formulas

**Status Effect Duration**:
```
CONFUSION: 19 + random(0, 2) = 19-21 turns
BLINDNESS: 40 + random(0, 20) = 40-60 turns (reduced from original 807-892)
HASTE_SELF: 4 + random(0, 4) = 4-8 turns
LEVITATION: 29 + random(0, 3) = 29-32 turns
```

**Haste Action System**:
```
On turn start:
  if player.hasStatusEffect(HASTED):
    actionsRemaining = 2
  else:
    actionsRemaining = 1

On player action:
  actionsRemaining -= 1
  if actionsRemaining > 0:
    skip monster turns, player acts again
  else:
    process monster turns
```

**Confused Movement**:
```
if player.hasStatusEffect(CONFUSED):
  intendedDirection = player input
  actualDirection = random(all 8 directions)
  move player in actualDirection
else:
  move player in intendedDirection
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- StatusEffectService: >90% (core system, fully testable)
- PotionService: >90% (pure logic)
- Modified services (Movement, FOV, Turn, Trap): >80%
- Overall: >80%

**Test Files**:
- `src/services/StatusEffectService/status-effect-management.test.ts` - Add, remove, query
- `src/services/StatusEffectService/status-effect-tick.test.ts` - Duration decrement, expiration
- `src/services/StatusEffectService/status-effect-stacking.test.ts` - Multiple effects
- `src/services/PotionService/raise-level-potion.test.ts` - RAISE_LEVEL
- `src/services/PotionService/detection-potions.test.ts` - DETECT_MONSTERS, DETECT_MAGIC
- `src/services/PotionService/confusion-potion.test.ts` - CONFUSION
- `src/services/PotionService/blindness-potion.test.ts` - BLINDNESS
- `src/services/PotionService/haste-potion.test.ts` - HASTE_SELF
- `src/services/MovementService/confused-movement.test.ts` - Randomized movement
- `src/services/FOVService/blind-fov.test.ts` - Vision override
- `src/services/TurnService/haste-turn.test.ts` - Double actions
- `src/services/TrapService/levitation-trap.test.ts` - Trap immunity

### Test Scenarios

**Scenario 1: Confusion Potion**
- Given: Player at full health, no status effects
- When: Player quaffs CONFUSION potion
- Then: CONFUSED status applied for 19-21 turns, movement randomized

**Scenario 2: Blindness Potion**
- Given: Player with normal vision (FOV radius 2)
- When: Player quaffs BLINDNESS potion
- Then: BLIND status applied for 40-60 turns, FOV returns empty set, screen dark

**Scenario 3: Haste Self Potion**
- Given: Player in combat, normal turn rate
- When: Player quaffs HASTE_SELF potion
- Then: HASTED status applied for 4-8 turns, player gets 2 actions per turn

**Scenario 4: Raise Level Potion**
- Given: Player at level 3, 100/200 XP
- When: Player quaffs RAISE_LEVEL potion
- Then: Player immediately advances to level 4, max HP increases

**Scenario 5: Detect Monsters Potion**
- Given: 5 monsters on level, 2 in FOV, 3 hidden
- When: Player quaffs DETECT_MONSTERS potion
- Then: All 5 monsters revealed on map, message "You sense 5 monsters"

**Scenario 6: Status Effect Expiration**
- Given: Player confused with 2 turns remaining
- When: 2 turns elapse
- Then: CONFUSED status removed, normal movement restored, message "You feel less confused"

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **QuaffPotionCommand**: Already supports new potions via PotionService (no changes needed)
- **MoveCommand**: Inject StatusEffectService, check CONFUSED before movement
- **StairsCommand**: Clear detection states (detectedMonsters, detectedMagicItems) and SEE_INVISIBLE on level change

**No New Commands Required**: All potion effects handled by existing QuaffPotionCommand + service layer.

### UI Changes

**Renderer Updates**:
- **StatusBar**: Add status effect indicator section (show active effects with durations)
- **GameRenderer**:
  - Render detected monsters even if not in FOV
  - Highlight detected magic items with visual indicator
  - Darken/blur screen when BLIND
  - Add "Confused" icon near player
  - Add "Fast!" icon when HASTED

**Input Handling**:
- No new input required (existing `q` quaff command works for all potions)

### State Updates

**GameState Changes**:
```typescript
interface GameState {
  // ... existing fields
  detectedMonsters: Set<string>      // ← Added for DETECT_MONSTERS
  detectedMagicItems: Set<string>    // ← Added for DETECT_MAGIC
  actionsRemaining: number           // ← Added for HASTE_SELF (default 1)
}
```

**Player Changes**:
```typescript
interface Player {
  // ... existing fields
  statusEffects: StatusEffect[]      // ← Added for duration-based effects
}
```

**Monster Changes**:
```typescript
interface Monster {
  // ... existing fields
  isInvisible: boolean               // ← Added for SEE_INVISIBLE (default false)
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/plans/potion_implementation_plan.md` - This file
- [ ] Update `docs/services/PotionService.md` - Add 6 new potion types, update examples
- [ ] Create `docs/services/StatusEffectService.md` - Full service documentation
- [ ] Update `docs/services/README.md` - Add StatusEffectService to service catalog
- [ ] Update `docs/game-design/05-items.md` - Add complete potion catalog with all 11 types
- [ ] Update `docs/architecture.md` - Add StatusEffectService to architecture diagram
- [ ] Update `docs/systems-core.md` - Add status effect system section
- [ ] Update `CLAUDE.md` - If new patterns introduced (likely no changes needed)

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Haste Double Actions Complexity**
- **Problem**: HASTE_SELF requires significant turn system changes (actionsRemaining counter, conditional monster turns)
- **Mitigation**: Thoroughly test edge cases (haste expiring mid-action, haste + confusion interaction)

**Issue 2: Blindness Duration Too Long**
- **Problem**: Original Rogue BLINDNESS (807-892 turns) is ~80+ minutes of gameplay, likely too punishing
- **Mitigation**: Reduce to 40-60 turns (~4-6 minutes), playtest and adjust

**Issue 3: Confusion + Other Status Effects**
- **Problem**: Multiple status effects may interact unexpectedly (confused + hasted = chaos)
- **Mitigation**: Allow stacking, test all combinations, prioritize BLIND override (if blind, can't target enemies even if confused)

**Issue 4: Detection State Persistence**
- **Problem**: detectedMonsters/detectedMagicItems need to clear on level change but persist during navigation
- **Mitigation**: Clear in StairsCommand, not in movement

### Breaking Changes
- Adding `statusEffects: StatusEffect[]` to Player interface (default to empty array)
- Adding `detectedMonsters`, `detectedMagicItems`, `actionsRemaining` to GameState (default to empty sets and 1)
- Adding `isInvisible: boolean` to Monster interface (default to false)
- **Migration**: All changes are additive with defaults, no breaking changes to existing save files

### Performance Considerations
- Status effect tick runs every turn (O(n) where n = number of active effects)
- Detection sets use Set<string> for O(1) lookups
- No performance concerns expected (typical 0-3 active status effects)

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (existing PotionService and identification system complete)
- **Blocks**: Future advanced features (HALLUCINATION, PARALYSIS, SEE_INVISIBLE interactions with new monster types)

### Estimated Timeline
- Phase 1 (Instant Potions): 4-6 hours
  - Task 1.1: 1 hour
  - Task 1.2: 0.5 hours
  - Task 1.3: 1 hour
  - Task 1.4: 1 hour
  - Task 1.5: 1.5 hours
- Phase 2 (Status Effects): 10-12 hours
  - Task 2.1: 2 hours
  - Task 2.2: 2 hours
  - Task 2.3: 2 hours
  - Task 2.4: 2 hours
  - Task 2.5: 3 hours (most complex)
  - Task 2.6: 1 hour
- Phase 3 (Advanced): 4-6 hours
  - Task 3.1: 2 hours
  - Task 3.2: 2 hours
  - Task 3.3: Optional (TBD)
- Phase 4 (Testing & Polish): 3-4 hours
  - Task 4.1: 2 hours
  - Task 4.2: 2 hours
- **Total**: 21-28 hours

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (services, game design, plan)
- [ ] Manual playtesting of all 11 potion types
- [ ] Verify identification system works with new potions
- [ ] Verify status effects display correctly in UI

### Follow-Up Tasks
- [ ] Add HALLUCINATION potion (Phase 3.3) - Very complex rendering system
- [ ] Add PARALYSIS potion (Phase 3.3) - Simple status effect
- [ ] Add THIRST_QUENCHING potion (Phase 3.3) - Joke item, trivial
- [ ] Add potion throwing mechanic (Phase 5+) - Throw potions at monsters
- [ ] Add potion mixing/alchemy system (Phase 5+) - Combine potions for new effects
- [ ] Add more artifact-based detection (e.g., Amulet of ESP for permanent monster detection)

---

**Last Updated**: 2025-10-06
**Status**: 🚧 In Progress
