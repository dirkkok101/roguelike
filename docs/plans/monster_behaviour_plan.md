# Monster Behavior Enhancement Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Game Design - Monsters](../game-design/04-monsters.md) | [Advanced Systems](../systems-advanced.md) | [MonsterAIService](../services/MonsterAIService.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Enhance monster behavior to match authentic 1980 Rogue mechanics, adding wandering monster spawns, improved notification messages, and refined awareness systems for deeper tactical gameplay.

### Design Philosophy
- **Authentic Rogue Feel**: Match original 1980 Rogue source code behavior (wake mechanics, aggro ranges, wandering spawns)
- **Time Pressure**: Wandering monsters add urgency to exploration (can't safely rest indefinitely)
- **Player Feedback**: Clear notifications about monster sighting, waking, and proximity
- **Tactical Depth**: Running vs sneaking, door slamming, sound-based alerts add strategic choices

### Success Criteria
- [ ] Wandering monsters spawn progressively as player stays on level
- [ ] Aggro ranges match authentic Rogue values (3-5 tiles base, adjusted by monster type)
- [ ] Monster sighting messages appear when monster first enters FOV
- [ ] Wake-up messages displayed when monsters transition SLEEPING → HUNTING
- [ ] Running increases monster detection chance (noise mechanic)
- [ ] Door slam mechanic allows tactical monster waking
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles (no logic in commands)
- [ ] Documentation updated

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Monsters](../game-design/04-monsters.md#sleep--waking) - Current sleep/wake mechanics
- [Advanced Systems - Monster AI](../systems-advanced.md#monster-ai-system) - AI behavior profiles
- [MonsterAIService](../services/MonsterAIService.md) - Wake-up system implementation

### Related Systems
- **MonsterAIService**: Currently handles wake-up checks, needs enhancement for running detection
- **NotificationService**: Handles proximity alerts, needs monster sighting messages
- **MonsterSpawnService**: Only spawns at level generation, needs wandering spawn logic
- **TurnService**: Orchestrates monster turns, integration point for wandering spawns
- **RingService**: Ring of Stealth already prevents wake-ups (docs/services/RingService.md)

### Research Summary

**Source**: Decoded Rogue (1980) source code analysis (CHASE.c, MONSTERS.c)

**Key Findings**:
1. **Wandering Monsters**: Spawn randomly as player stays on level, cannot spawn in player's room
2. **Wake Mechanics**: 66% chance per turn for "mean" monsters when player nearby (already implemented as 67%)
3. **Aggro Ranges**: Proximity-based detection, typically 3-5 tiles (needs alignment)
4. **Messages**: No "you see [monster]" in original Rogue, but added to modern roguelikes for UX
5. **Running Detection**: Player running increases noise, higher wake chance
6. **Door Slam**: Leaving and re-entering room wakes monsters (tactical choice)
7. **Stealth**: Ring of Stealth prevents adjacent wake-ups (already implemented)

**Comparison to NetHack**:
- NetHack added magic sleep (can't wake from attacks)
- NetHack added monster-specific wake chances (1/50 for nymphs/jabberwocks)
- NetHack added aggravate monster property (wakes all)
- We're targeting authentic 1980 Rogue behavior, not NetHack

---

## 3. Phases & Tasks

### Phase 1: Aggro Range Alignment (Priority: HIGH)

**Objective**: Align monster aggro ranges with authentic Rogue values for balanced difficulty

#### Task 1.1: Research Current Aggro Ranges

**Context**: Current project uses arbitrary aggro ranges. Need to audit monsters.json and align with Rogue source findings.

**Files to modify**:
- `public/data/monsters.json`

##### Subtasks:
- [x] Read current monsters.json and document all aggroRange values
- [x] Compare with Rogue source code findings (3-5 base, +modifiers for smart monsters)
- [x] Identify outliers (too high = monsters wake too early, too low = players starve wandering)
- [x] Document recommended changes in table format
- [x] Git commit: "docs: audit current aggro ranges vs Rogue authentic values (Phase 1.1)"

---

#### Task 1.2: Update Aggro Ranges in monsters.json

**Context**: Apply authentic Rogue aggro ranges based on monster intelligence and behavior

**Files to modify**:
- `public/data/monsters.json`

**Authentic Rogue Aggro Range Guidelines**:
- **SIMPLE monsters** (low intelligence): 3-5 tiles
- **SMART monsters** (high intelligence): 6-8 tiles (better awareness)
- **ERRATIC monsters** (Bat, Kestrel): 0 tiles (never wake, always random movement)
- **MEAN monsters**: Same as base, but 67% chase chance reduces effective range
- **Boss monsters** (Dragon, Jabberwock, Griffin): 8-10 tiles (high awareness)

##### Subtasks:
- [x] Update all monster aggroRange values in monsters.json
- [x] Ensure ERRATIC monsters have aggroRange 0 (never wake from proximity)
- [x] Verify MEAN monsters have appropriate ranges (not too aggressive)
- [x] Updated validation script to allow aggroRange 0 for ERRATIC monsters
- [x] Run `npm run validate:data` to ensure JSON validity
- [x] Git commit: "feat: align monster aggro ranges with authentic Rogue values (Phase 1.2)"

---

#### Task 1.3: Add Aggro Range Tests

**Context**: Ensure aggro ranges work as intended and prevent regression

**Files to create**:
- `src/services/MonsterAIService/aggro-range.test.ts`

##### Subtasks:
- [x] Test monster wakes at exact aggroRange distance
- [x] Test monster stays asleep at aggroRange + 1 distance
- [x] Test ERRATIC monsters never wake from proximity (aggroRange 0)
- [x] Test Ring of Stealth prevents wake at adjacent distance
- [x] Test MEAN monsters have 67% wake chance (not 100%)
- [x] Verify test coverage >90% for wake-up logic
- [x] Git commit: "test: add aggro range validation tests (Phase 1.3)"

---

### Phase 2: Monster Sighting Messages (Priority: HIGH)

**Objective**: Notify player when monsters first enter FOV or wake up

#### Task 2.1: Extend NotificationService for Monster Sighting

**Context**: Current NotificationService only alerts for adjacent awake monsters. Need "you see [monster]" messages when first spotted.

**Files to modify**:
- `src/services/NotificationService/NotificationService.ts`
- `src/services/NotificationService/NotificationService.test.ts`

##### Subtasks:
- [x] Add `monstersSeen: Set<string>` to NotificationContext (track first sighting per monster)
- [x] Implement `checkMonsterSightings(state: GameState): string[]` method
- [x] Compare current visibleCells with monster positions
- [x] Generate "You see a Dragon!" message for newly visible monsters
- [x] Handle multiple monsters: "You see a Bat and an Orc!"
- [x] Deduplicate: Don't spam message if monster still visible
- [x] Clear monstersSeen when player changes levels
- [x] Write unit tests for sighting messages (>90% coverage)
- [x] Git commit: "feat: add monster sighting notifications (Phase 2.1)"

---

#### Task 2.2: Add Wake-Up Messages

**Context**: Player should know when sleeping monsters wake and start hunting

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`
- `src/services/NotificationService/NotificationService.ts`

##### Subtasks:
- [x] Add checkWakeUpMessages() method to NotificationService (compares previous/current states)
- [x] Detect monsters transitioning from isAsleep=true to isAsleep=false
- [x] Generate "The Orc wakes up!" message for single wake-up
- [x] Handle multiple wake-ups: "The Bat and Orc wake up!" (2 monsters)
- [x] Handle 3+ wake-ups: "The Snake, Hobgoblin, and Troll wake up!"
- [x] Filter out already-awake monsters and new/dead monsters
- [x] Write comprehensive unit tests (13 tests, all passing, >90% coverage)
- [x] Git commit: "feat: add monster wake-up notifications (Phase 2.2)"

---

### Phase 3: Wandering Monster Spawns (Priority: MEDIUM)

**Objective**: Add progressive wandering monster spawns as player stays on level (authentic Rogue mechanic)

#### Task 3.1: Design Wandering Spawn Algorithm

**Context**: Authentic Rogue spawned wandering monsters randomly over time, adding time pressure

**Files to create**:
- `docs/wandering-monsters-design.md` (design doc)

##### Subtasks:
- [x] Research authentic Rogue wandering spawn rates (~1% per turn in original)
- [x] Design spawn chance formula: 0.5% base + 0.01% per turn, cap at 5%
- [x] Determine spawn location rules: walkable tiles NOT in player's room, unoccupied
- [x] Define monster selection: reuse MonsterSpawnService level-appropriate spawns
- [x] Decide max wandering monsters per level: 5 wanderers (prevents overcrowding)
- [x] Document design rationale in comprehensive design doc
- [x] Git commit: "docs: design wandering monster spawn system (Phase 3.1)"

---

#### Task 3.2: Implement WanderingMonsterService

**Context**: New service to handle wandering monster spawn logic (separation of concerns)

**Files to create**:
- `src/services/WanderingMonsterService/WanderingMonsterService.ts`
- `src/services/WanderingMonsterService/spawn-chance.test.ts`
- `src/services/WanderingMonsterService/spawn-location.test.ts`
- `src/services/WanderingMonsterService/index.ts`

##### Subtasks:
- [x] Define `WanderingMonsterService` interface
- [x] Implement `shouldSpawnWanderer(level: Level, turnCount: number): boolean`
- [x] Implement `getSpawnLocation(level: Level, playerPos: Position): Position | null`
- [x] Implement `spawnWanderer(level: Level, depth: number): Monster`
- [x] Track `lastWanderingSpawnTurn` in Level interface
- [x] Inject MonsterSpawnService for monster creation
- [x] Write comprehensive unit tests (>90% coverage)
- [x] Create barrel export
- [x] Git commit: "feat: implement WanderingMonsterService (Phase 3.2)"

---

#### Task 3.3: Integrate Wandering Spawns into TurnService

**Context**: TurnService orchestrates all per-turn logic, ideal integration point

**Files to modify**:
- `src/services/TurnService/TurnService.ts`
- `src/types/core/core.ts` (add lastWanderingSpawnTurn to Level)

##### Subtasks:
- [x] Inject WanderingMonsterService into TurnService
- [x] After monster turns, call `wanderingService.shouldSpawnWanderer()`
- [x] If true, spawn wanderer and add to level.monsters
- [x] Update level.lastWanderingSpawnTurn
- [x] Generate notification: "You hear a faint noise in the distance..." (atmospheric)
- [x] Write integration tests
- [x] Git commit: "feat: integrate wandering monster spawns into turn system (Phase 3.3)"

---

### Phase 4: Running Detection (Priority: LOW)

**Objective**: Player running increases noise, higher monster wake chance

#### Task 4.1: Add Running State to Player

**Context**: Need to track if player is "running" (shift+move or repeat-move command)

**Files to modify**:
- `src/types/core/core.ts` (add `isRunning: boolean` to Player)
- `src/commands/MoveCommand/MoveCommand.ts`

##### Subtasks:
- [ ] Add `isRunning: boolean` to Player interface
- [ ] MoveCommand sets `isRunning = true` if shift held or repeat-move active
- [ ] Reset `isRunning = false` on stop/combat/trap
- [ ] Handle edge cases (combat interrupts running)
- [ ] Git commit: "feat: add running state tracking to Player (Phase 4.1)"

---

#### Task 4.2: Modify Wake-Up Logic for Running

**Context**: Running doubles monster wake chance (or adds bonus to aggro range)

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`

##### Subtasks:
- [ ] In `checkWakeUp()`, check if player.isRunning
- [ ] If running: effective aggro range = aggroRange * 1.5 (50% farther detection)
- [ ] Alternative: 100% wake chance if player running within aggro range (no roll)
- [ ] Implement whichever matches Rogue source behavior
- [ ] Write tests for running detection
- [ ] Git commit: "feat: running increases monster detection range (Phase 4.2)"

---

### Phase 5: Door Slam Mechanic (Priority: LOW)

**Objective**: Allow player to intentionally wake monsters by "slamming" door (leave and re-enter room)

#### Task 5.1: Detect Door Slam Pattern

**Context**: Authentic Rogue woke monsters when player left doorway and immediately re-entered

**Files to modify**:
- `src/commands/MoveCommand/MoveCommand.ts`

##### Subtasks:
- [ ] Track last 2 player positions in GameState
- [ ] Detect pattern: position N-2 == position N (returned to same tile within 2 moves)
- [ ] Check if position is doorway (door at position)
- [ ] If pattern matches, set `doorSlammed: boolean` flag
- [ ] Git commit: "feat: detect door slam pattern (Phase 5.1)"

---

#### Task 5.2: Wake Monsters on Door Slam

**Context**: Door slam wakes all monsters in adjacent room

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`

##### Subtasks:
- [ ] Implement `wakeRoomMonsters(level: Level, roomId: number): Monster[]`
- [ ] Find all monsters in specified room
- [ ] Set state = HUNTING for all monsters in room
- [ ] Return list of woken monsters
- [ ] Generate notification: "Your loud entrance wakes the monsters!"
- [ ] Call from MoveCommand when doorSlammed flag set
- [ ] Write tests for door slam wake mechanic
- [ ] Git commit: "feat: door slam wakes monsters in room (Phase 5.2)"

---

## 4. Technical Design

### Data Structures

```typescript
// NotificationService context enhancement
interface NotificationContext {
  lastPosition?: Position
  lastItemSeen?: string
  lastGoldSeen?: number
  recentNotifications: Set<string>
  monstersSeen: Set<string> // ← NEW: Track first sightings
}

// Level enhancement for wandering spawns
interface Level {
  // ... existing fields
  lastWanderingSpawnTurn?: number // ← NEW: Track last spawn turn
}

// Player enhancement for running
interface Player {
  // ... existing fields
  isRunning: boolean // ← NEW: Track running state
}

// AI Service return type enhancement
interface MonsterTurnResult {
  updatedMonsters: Monster[]
  recentWakeUps: Monster[] // ← NEW: Monsters that woke this turn
}
```

### Service Architecture

**New Services**:
- **WanderingMonsterService**: Handles wandering monster spawn logic, location selection, and timing
  - `shouldSpawnWanderer(level: Level, turnCount: number): boolean`
  - `getSpawnLocation(level: Level, playerPos: Position): Position | null`
  - `spawnWanderer(level: Level, depth: number): Monster`

**Modified Services**:
- **NotificationService**: Add monster sighting and wake-up messages
- **MonsterAIService**: Add running detection, door slam wake, return wake events
- **TurnService**: Integrate wandering spawns after monster turns

**Service Dependencies**:
```
TurnService
  ├─ depends on → WanderingMonsterService (new)
  └─ depends on → MonsterAIService (modified)

WanderingMonsterService
  ├─ depends on → MonsterSpawnService
  └─ depends on → RandomService

NotificationService
  └─ depends on → IdentificationService (existing)
```

### Algorithms & Formulas

**Wandering Spawn Chance**:
```
Base chance per turn = 0.5% (1 in 200 turns)
turnsSinceLastSpawn = currentTurn - level.lastWanderingSpawnTurn
spawnChance = min(0.005 + (turnsSinceLastSpawn * 0.0001), 0.05)

Roll: random(0, 1) < spawnChance
If true: Spawn wanderer
Max wanderers per level: 5 (prevent overcrowding)
```

**Running Detection Range**:
```
effectiveAggroRange = monster.aiProfile.aggroRange * (player.isRunning ? 1.5 : 1.0)

Example:
- Orc aggroRange = 5
- Player walking: wake at 5 tiles
- Player running: wake at 7.5 tiles (rounded to 8)
```

**Door Slam Pattern**:
```
positionHistory = [pos(N-2), pos(N-1), pos(N)]
isDoorSlam = (pos(N-2) == pos(N)) && isDoorway(pos(N))
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- WanderingMonsterService: >90%
- NotificationService (monster messages): >90%
- MonsterAIService (running detection): >90%
- Overall: >80%

**Test Files**:
- `aggro-range.test.ts` - Authentic Rogue aggro range validation
- `monster-sighting.test.ts` - Sighting message generation and deduplication
- `wake-up-messages.test.ts` - Wake-up notification logic
- `spawn-chance.test.ts` - Wandering spawn probability calculations
- `spawn-location.test.ts` - Valid spawn location selection
- `running-detection.test.ts` - Running increases detection range
- `door-slam.test.ts` - Door slam wake mechanic

### Test Scenarios

**Scenario 1: Aggro Range Validation**
- Given: Monster with aggroRange 5, player 5 tiles away
- When: MonsterAIService.checkWakeUp() called
- Then: Monster wakes (SLEEPING → HUNTING), wake message generated

**Scenario 2: Monster Sighting**
- Given: Dragon not previously seen, enters player FOV
- When: NotificationService.checkMonsterSightings() called
- When: Message "You see a Dragon!" generated
- Then: Dragon added to monstersSeen set, no duplicate message next turn

**Scenario 3: Wandering Spawn**
- Given: 200 turns since last wandering spawn
- When: TurnService.processTurn() called
- Then: 0.5% + (200 * 0.0001) = 2.5% spawn chance
- Then: If roll succeeds, monster spawned NOT in player's room

**Scenario 4: Running Detection**
- Given: Orc with aggroRange 5, player 7 tiles away, player.isRunning = true
- When: MonsterAIService.checkWakeUp() called
- Then: Effective range = 5 * 1.5 = 7.5 (rounds to 8), Orc wakes

**Scenario 5: Door Slam**
- Given: Player at door position, leaves, immediately returns
- When: Door slam pattern detected
- Then: All monsters in adjacent room wake, message "Your loud entrance wakes the monsters!"

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **MoveCommand**:
  - Track player.isRunning state
  - Detect door slam pattern
  - Call MonsterAIService.wakeRoomMonsters() on slam

### UI Changes

**Renderer Updates**:
- No visual changes (messages only)

**Input Handling**:
- Shift+arrow keys already handled, sets isRunning flag

### State Updates

**GameState Changes**:
```typescript
interface GameState {
  // ... existing fields
  // No changes needed at GameState level
}
```

**Player Changes**:
```typescript
interface Player {
  // ... existing fields
  isRunning: boolean // ← Added for Phase 4
}
```

**Level Changes**:
```typescript
interface Level {
  // ... existing fields
  lastWanderingSpawnTurn?: number // ← Added for Phase 3
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Create `docs/services/WanderingMonsterService.md` - Full service documentation
- [ ] Update `docs/game-design/04-monsters.md` - Add wandering spawns, running detection, door slam
- [ ] Update `docs/systems-advanced.md#monster-ai` - Add wake mechanics details
- [ ] Update `docs/services/MonsterAIService.md` - Document running detection and door slam
- [ ] Update `docs/services/NotificationService.md` - Document monster sighting messages
- [ ] Update `CLAUDE.md` - No new patterns, but mention wandering spawns in Quick Links

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Wandering Spawns Too Frequent**
- **Problem**: Players overwhelmed by constant spawns, can't rest
- **Mitigation**: Conservative spawn rates (0.5% base), max 5 wanderers per level, extensive playtesting

**Issue 2: Running Always On**
- **Problem**: Players forget they're running, wake monsters unintentionally
- **Mitigation**: Clear UI indicator (status line shows "Running"), auto-stop on combat/trap

**Issue 3: Door Slam False Positives**
- **Problem**: Accidental backtracking triggers door slam
- **Mitigation**: Require exact pattern (position N-2 == position N AND isDoorway), test edge cases

**Issue 4: Aggro Range Too Aggressive**
- **Problem**: Monsters wake too early, no exploration
- **Mitigation**: Follow authentic Rogue values (3-5 base), playtest each monster, Ring of Stealth helps

### Breaking Changes
- `Level` interface gains optional `lastWanderingSpawnTurn` (backward compatible)
- `Player` interface gains `isRunning` (default false, backward compatible)
- `NotificationService` constructor unchanged (backward compatible)
- No breaking changes expected

### Performance Considerations

**Wandering Spawn Check**:
- Called once per turn (negligible performance impact)
- Early exit if spawn chance fails (most turns)
- Spawn location search uses existing walkability checks (already optimized)

**Monster Sighting Check**:
- Compares visibleCells Set with monster positions (O(n) where n = monsters)
- Typical level has <20 monsters, fast enough for real-time
- Deduplication via Set lookups (O(1))

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (all systems exist, this enhances them)
- **Blocks**: None (optional enhancements)

### Estimated Timeline
- Phase 1 (Aggro Range Alignment): 2-3 hours
- Phase 2 (Monster Sighting Messages): 3-4 hours
- Phase 3 (Wandering Spawns): 5-6 hours
- Phase 4 (Running Detection): 2-3 hours
- Phase 5 (Door Slam): 2-3 hours
- **Total**: 14-19 hours (2-3 days)

### Suggested Implementation Order
1. **Phase 1** (Aggro Range) - Foundation for all wake mechanics
2. **Phase 2** (Messages) - Immediate player feedback improvement
3. **Phase 3** (Wandering Spawns) - Biggest gameplay impact
4. **Phase 4** (Running Detection) - Nice-to-have enhancement
5. **Phase 5** (Door Slam) - Advanced tactical mechanic

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] No logic in MoveCommand (only orchestration)
- [ ] All services follow dependency injection
- [ ] Documentation updated (game design, systems, services)
- [ ] Manual testing: Play to level 5, verify wandering spawns and messages
- [ ] Manual testing: Test running near sleeping monsters (wake detection)
- [ ] Manual testing: Test door slam mechanic

### Follow-Up Tasks
- [ ] Add sound effects for monster sighting/wake-up (audio enhancement)
- [ ] Add "You hear sounds of combat in the distance" when monsters fight each other (future)
- [ ] Add monster shouting/alerting nearby monsters (pack behavior)
- [ ] Consider aggravate monster scroll (NetHack-style, wakes all monsters on level)

---

**Last Updated**: 2025-10-09
**Status**: 🚧 In Progress
