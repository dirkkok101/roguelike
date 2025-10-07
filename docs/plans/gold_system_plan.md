# Gold System Implementation Plan

**Status**: 🚧 In Progress
**Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Owner**: Dirk Kok
**Related Docs**: [Game Design - Dungeon](../game-design/03-dungeon.md) | [Services](../services/README.md) | [Architecture](../architecture.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Implement a complete gold placement and collection system based on classic roguelike mechanics (Rogue 1980), enabling players to collect currency from dungeon floors and allowing leprechauns to steal gold using authentic formulas.

### Design Philosophy
- **Classic Authenticity**: Use original Rogue 1980 formulas and mechanics where appropriate
- **Automatic Collection**: Walk-over pickup (no manual action needed) for smooth gameplay
- **Level Scaling**: Gold amounts scale with dungeon depth for progressive rewards
- **No Encumbrance**: Gold doesn't take inventory slots or have weight
- **Single Source of Truth**: Player gold stored in `player.gold`, piles stored in `level.gold[]`

### Success Criteria
- [x] Research classic roguelike gold mechanics (Rogue, Angband, NetHack)
- [ ] Gold piles spawn in dungeons (3-9 per level, scaled by depth)
- [ ] Automatic pickup when player walks over gold (no turn cost)
- [ ] Gold renders correctly on map ($) and under player
- [ ] Leprechaun stealing uses level-scaled formula
- [ ] Killed leprechauns drop gold piles
- [ ] GREEDY monsters (Dragon) attracted to gold in room
- [ ] All tests pass with >80% coverage
- [ ] Architecture follows CLAUDE.md principles (service layer pattern)
- [ ] Documentation updated

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Dungeon - ASCII Symbols](../game-design/03-dungeon.md#ascii-symbols) - Gold represented as `$`
- [Monsters - Leprechaun](../game-design/04-monsters.md) - THIEF behavior, steals gold
- [Items](../game-design/05-items.md) - Item categories (gold is special, not inventory item)

### Related Systems
- **DungeonService**: Needs `spawnGold()` method for level generation
- **RenderingService**: Needs to render `$` for gold piles, handle gold under player
- **MoveCommand**: Needs to detect gold at destination, trigger automatic pickup
- **MonsterTurnService**: Already has leprechaun stealing, needs level-scaled formula
- **MonsterAIService**: GREEDY behavior needs gold attraction logic

### Research Summary

**Original Rogue (1980)** mechanics researched:
1. **Gold Formula**: `GOLDCALC = rnd(50 + 10 * level) + 2`
   - Produces random amount between 2 and (51 + 10 * level)
   - Level 1: 2-61 gold per pile
   - Level 5: 2-101 gold per pile
   - Level 10: 2-151 gold per pile

2. **Placement**: Maximum 9 treasures (MAXOBJ) per level
   - Rooms without gold have 25% chance of monster instead

3. **Pickup**: Automatic when walking over gold pile
   - No manual action required
   - No turn cost
   - No inventory slot used

4. **Leprechaun Mechanics**:
   - Steals `5 * GOLDCALC` on failed save, `GOLDCALC` on successful save
   - Drops `GOLDCALC` or `5 * GOLDCALC` when killed (based on save)
   - Vanishes after stealing (teleports away)
   - Gold merges with existing pile in room if present

5. **GREEDY Flag**: Only Dragon has ISGREED, drawn to gold in room

**Angband** mechanics:
- Gold pickup takes **no time** (instant, doesn't consume turn)
- Gold has **no weight** (no encumbrance penalty)
- Objects take 1/10th turn, but gold is instant

**Modern Roguelike Best Practices**:
- Gold-only auto-pickup widely accepted
- Toggle controls common for flexibility
- Direct addition to currency counter (no inventory management)

---

## 3. Phases & Tasks

### Phase 1: Data Model & Gold Service (Priority: HIGH)

**Objective**: Create GoldService for gold operations and verify data model

#### Task 1.1: Create GoldService

**Context**: Centralize all gold-related logic (calculation, pickup, drop) in a dedicated service following the service layer pattern.

**Files to create/modify**:
- `src/services/GoldService/GoldService.ts`
- `src/services/GoldService/gold-calculation.test.ts`
- `src/services/GoldService/gold-pickup.test.ts`
- `src/services/GoldService/gold-drop.test.ts`
- `src/services/GoldService/index.ts`
- `docs/services/GoldService.md`

##### Subtasks:
- [ ] Create GoldService interface with methods:
  - `calculateGoldAmount(depth: number): number` - Rogue formula
  - `pickupGold(player: Player, amount: number): Player` - Add gold to player
  - `dropGold(position: Position, amount: number): GoldPile` - Create gold pile
  - `calculateLeprechaunSteal(playerGold: number, depth: number, savedThrow: boolean): number`
  - `calculateLeprechaunDrop(depth: number, savedThrow: boolean): number`
- [ ] Implement Rogue 1980 gold formula: `rnd(50 + 10 * depth) + 2`
- [ ] Implement leprechaun steal formula (5x or 1x GOLDCALC)
- [ ] Write comprehensive unit tests (>90% coverage target):
  - Gold calculation scales correctly by depth
  - Leprechaun stealing amounts (with/without save)
  - Leprechaun drop amounts (with/without save)
  - Edge cases (depth 0, depth 10, player has 0 gold)
- [ ] Use MockRandom for deterministic testing
- [ ] Create barrel export (`index.ts`)
- [ ] Update path aliases in `vite.config.ts` if needed
- [ ] Create service documentation: `docs/services/GoldService.md`
- [ ] Git commit: "feat: implement GoldService with Rogue 1980 formulas (Phase 1.1)"

---

#### Task 1.2: Verify Data Model

**Context**: Confirm GoldPile interface and Level/Player gold fields exist and are correctly typed.

**Files to verify**:
- `src/types/core/core.ts`

##### Subtasks:
- [x] Verify `GoldPile` interface exists (position, amount)
- [x] Verify `Level` has `gold: GoldPile[]` field
- [x] Verify `Player` has `gold: number` field
- [ ] Add JSDoc comments if missing
- [ ] Git commit: "docs: add GoldPile JSDoc comments (Phase 1.2)" (if changes made)

---

### Phase 2: Gold Generation in DungeonService (Priority: HIGH)

**Objective**: Generate gold piles during level generation using authentic Rogue mechanics

#### Task 2.1: Add Gold Spawning to DungeonService

**Context**: DungeonService orchestrates level generation but currently doesn't spawn gold piles. Add `spawnGold()` method similar to existing `spawnItems()` and `spawnMonsters()`.

**Files to modify**:
- `src/services/DungeonService/DungeonService.ts`
- `src/services/DungeonService/gold-spawning.test.ts` (new)
- `docs/services/DungeonService.md`

##### Subtasks:
- [ ] Add `private spawnGold(rooms: Room[], depth: number, tiles: Tile[][]): GoldPile[]` method
- [ ] Generate 3-9 gold piles per level (randomized)
  - Use `this.random.nextInt(3, 9)` for pile count
- [ ] Place gold in random room positions (not on walls/doors)
- [ ] Use GoldService.calculateGoldAmount(depth) for each pile amount
- [ ] Call `spawnGold()` in `generateLevel()` after item spawning
- [ ] Inject GoldService into DungeonService constructor
- [ ] Write unit tests:
  - Correct number of gold piles spawned (3-9)
  - Gold amounts scale with depth
  - Gold placed in valid room positions only
  - No gold on walls, doors, stairs, or occupied tiles
  - MockRandom for deterministic tests
- [ ] Update `docs/services/DungeonService.md` with gold spawning step
- [ ] Git commit: "feat: add gold pile generation to DungeonService (Phase 2.1)"

---

### Phase 3: Automatic Gold Pickup (Priority: HIGH)

**Objective**: Implement automatic gold collection when player walks over gold piles

#### Task 3.1: Add Gold Detection to MoveCommand

**Context**: MoveCommand currently handles movement, combat, and door opening. Add gold detection at destination position before movement completes.

**Files to modify**:
- `src/commands/MoveCommand/MoveCommand.ts`
- `src/commands/MoveCommand/gold-pickup.test.ts` (new)
- `docs/commands/move.md`

##### Subtasks:
- [ ] Inject GoldService into MoveCommand constructor
- [ ] After successful movement, check for gold at new position:
  ```typescript
  const goldAtPosition = level.gold.find(
    g => g.position.x === newPos.x && g.position.y === newPos.y
  )
  ```
- [ ] If gold found:
  - Call `GoldService.pickupGold(player, goldAtPosition.amount)`
  - Remove gold pile from `level.gold[]`
  - Add message: `"You pick up {amount} gold pieces."` (success type)
  - **NO turn increment** (pickup is instant, already moved)
- [ ] Write unit tests:
  - Player walks over gold, gold added to player.gold
  - Gold pile removed from level.gold[]
  - Correct message generated
  - No turn cost for pickup (turn already incremented for movement)
  - Multiple gold piles on level, only one at position picked up
  - No gold at position, no pickup occurs
- [ ] Update `docs/commands/move.md` with gold pickup behavior
- [ ] Git commit: "feat: implement automatic gold pickup in MoveCommand (Phase 3.1)"

---

#### Task 3.2: Update LevelService for Gold Removal

**Context**: LevelService has utility methods for level manipulation. Add gold removal helper.

**Files to modify**:
- `src/services/LevelService/LevelService.ts`
- `src/services/LevelService/gold-removal.test.ts` (new)

##### Subtasks:
- [ ] Add `removeGoldFromLevel(level: Level, position: Position): Level` method
- [ ] Return new Level with gold pile at position removed
- [ ] Maintain immutability (return new level, don't mutate)
- [ ] Write unit tests:
  - Gold at position removed
  - Other gold piles unchanged
  - Level immutability preserved
- [ ] Git commit: "feat: add removeGoldFromLevel to LevelService (Phase 3.2)"

---

### Phase 4: Gold Rendering (Priority: HIGH)

**Objective**: Render gold piles on map with $ symbol and handle gold under player

#### Task 4.1: Add Gold Rendering to RenderingService

**Context**: RenderingService determines what character to display at each position. Add gold pile rendering.

**Files to modify**:
- `src/services/RenderingService/RenderingService.ts`
- `src/services/RenderingService/gold-rendering.test.ts` (new)
- `docs/services/RenderingService.md`

##### Subtasks:
- [ ] Add gold pile check in rendering priority:
  ```typescript
  // Priority order: player > monsters > items > gold > traps > terrain
  if (isGoldAtPosition(position, level.gold)) return '$'
  ```
- [ ] Add color for gold: `#FFD700` (classic gold color)
- [ ] Write helper: `private isGoldAtPosition(pos: Position, gold: GoldPile[]): boolean`
- [ ] Write unit tests:
  - Gold renders as $ when visible
  - Gold not rendered when out of FOV
  - Gold not rendered under player (player @ has priority)
  - Gold not rendered under monster (monster has priority)
  - Gold renders correctly in explored but not visible tiles (dimmed)
- [ ] Update `docs/services/RenderingService.md` with gold rendering rules
- [ ] Git commit: "feat: add gold pile rendering to RenderingService (Phase 4.1)"

---

#### Task 4.2: Update ContextualCommandBar for Gold

**Context**: ContextualCommandBar shows what's at player's feet. Add gold notification.

**Files to modify**:
- `src/ui/ContextualCommandBar.ts`
- `src/services/ContextService/ContextService.ts`
- `src/services/ContextService/gold-context.test.ts` (new)

##### Subtasks:
- [ ] Add gold check in ContextService.createContext()
- [ ] If gold at position, add to context:
  ```typescript
  goldAtFeet: { amount: number } | null
  ```
- [ ] Update ContextualCommandBar to show: `"[Gold: {amount}gp]"` when standing on gold
- [ ] Write unit tests:
  - Gold amount shown correctly
  - No gold notification when no gold present
  - Gold notification updates after pickup
- [ ] Git commit: "feat: add gold notification to ContextualCommandBar (Phase 4.2)"

---

### Phase 5: Leprechaun Gold Mechanics (Priority: MEDIUM)

**Objective**: Enhance leprechaun interactions with level-scaled gold formulas and gold drops on death

#### Task 5.1: Update Leprechaun Stealing Formula

**Context**: MonsterTurnService currently steals fixed amount (10-50). Replace with authentic Rogue formula.

**Files to modify**:
- `src/services/MonsterTurnService/MonsterTurnService.ts`
- `src/services/MonsterTurnService/theft-mechanics.test.ts`
- `docs/services/MonsterTurnService.md`

##### Subtasks:
- [ ] Inject GoldService into MonsterTurnService
- [ ] Replace leprechaun stealing logic:
  ```typescript
  // Old: const stolenGold = Math.min(player.gold, this.random.nextInt(10, 50))
  // New: Use GoldService.calculateLeprechaunSteal(player.gold, level.depth, savedThrow)
  ```
- [ ] Implement saving throw logic:
  - Success chance: `(player.level + player.strength) / 2 >= 10` (simplified)
  - On success: steal 1x GOLDCALC
  - On failure: steal 5x GOLDCALC
- [ ] Update message to show amount stolen
- [ ] Write unit tests:
  - Leprechaun steals correct amount based on level
  - Saving throw affects steal amount (1x vs 5x)
  - Edge cases (player has less gold than steal amount)
  - Message shows correct stolen amount
- [ ] Update `docs/services/MonsterTurnService.md` with formula
- [ ] Git commit: "feat: update leprechaun stealing with Rogue formula (Phase 5.1)"

---

#### Task 5.2: Add Gold Drop on Leprechaun Death

**Context**: In original Rogue, killing a leprechaun drops a gold pile. Add this mechanic to CombatService monster death handling.

**Files to modify**:
- `src/services/CombatService/CombatService.ts`
- `src/services/CombatService/leprechaun-death.test.ts` (new)
- `src/commands/MoveCommand/MoveCommand.ts` (combat result handling)
- `docs/services/CombatService.md`

##### Subtasks:
- [ ] Inject GoldService into CombatService
- [ ] Add `droppedGold: number | null` to AttackResult interface
- [ ] In `playerAttack()`, if monster is Leprechaun and killed:
  ```typescript
  droppedGold = this.goldService.calculateLeprechaunDrop(monster.level, savedThrow)
  ```
- [ ] Update MoveCommand to handle droppedGold:
  - Create GoldPile at monster position
  - Add to level.gold[]
  - Message: "The Leprechaun drops {amount} gold pieces!"
- [ ] Write unit tests:
  - Leprechaun drops gold on death
  - Amount scales with level and save
  - Other monsters don't drop gold
  - Gold pile created at correct position
- [ ] Update `docs/services/CombatService.md` with leprechaun drop mechanic
- [ ] Git commit: "feat: add gold drop on leprechaun death (Phase 5.2)"

---

### Phase 6: GREEDY Monster Behavior (Priority: LOW)

**Objective**: Implement gold attraction for GREEDY monsters (Dragon)

#### Task 6.1: Add Gold Attraction to MonsterAIService

**Context**: Original Rogue had ISGREED flag for Dragons, making them move toward gold in their room. Add this to GREEDY behavior.

**Files to modify**:
- `src/services/MonsterAIService/MonsterAIService.ts`
- `src/services/MonsterAIService/behavior-greedy.test.ts`
- `docs/services/MonsterAIService.md`

##### Subtasks:
- [ ] Add `greedyBehavior()` method to MonsterAIService
- [ ] Check if gold exists in monster's current room
- [ ] If gold present and monster not on gold:
  - Pathfind to gold position
  - Move toward gold
- [ ] If on gold, guard it (STATIONARY behavior)
- [ ] If no gold or player nearby, use SIMPLE behavior
- [ ] Update Dragon aiProfile in monsters.json:
  ```json
  "behavior": ["GREEDY", "SMART"]
  ```
- [ ] Write unit tests:
  - Dragon moves toward gold in same room
  - Dragon ignores gold in other rooms
  - Dragon guards gold when standing on it
  - Dragon prioritizes player if in aggro range
- [ ] Update `docs/services/MonsterAIService.md` with GREEDY behavior
- [ ] Git commit: "feat: implement GREEDY behavior for Dragons (Phase 6.1)"

---

## 4. Technical Design

### Data Structures

```typescript
// Already exists in core.ts
export interface GoldPile {
  position: Position
  amount: number
}

// Player already has gold field
export interface Player {
  // ... existing fields
  gold: number  // Total gold carried
}

// Level already has gold array
export interface Level {
  // ... existing fields
  gold: GoldPile[]  // Gold piles on this level
}
```

### Service Architecture

**New Services**:
- **GoldService**: Gold calculation, pickup, drop logic
  - `calculateGoldAmount(depth: number): number`
  - `pickupGold(player: Player, amount: number): Player`
  - `dropGold(position: Position, amount: number): GoldPile`
  - `calculateLeprechaunSteal(playerGold: number, depth: number, savedThrow: boolean): number`
  - `calculateLeprechaunDrop(depth: number, savedThrow: boolean): number`

**Modified Services**:
- **DungeonService**: Add `spawnGold()` method, inject GoldService
- **RenderingService**: Add gold rendering logic ($)
- **ContextService**: Add gold detection at player position
- **MonsterTurnService**: Update leprechaun stealing formula
- **CombatService**: Add leprechaun gold drop on death
- **MonsterAIService**: Add GREEDY behavior for gold attraction
- **LevelService**: Add `removeGoldFromLevel()` utility

**Service Dependencies**:
```
GoldService (no dependencies)
  ↓
DungeonService → GoldService, RandomService
MoveCommand → GoldService, LevelService
CombatService → GoldService, RandomService
MonsterTurnService → GoldService
```

### Algorithms & Formulas

**Gold Amount Formula** (Rogue 1980):
```
GOLDCALC = random(50 + 10 * depth) + 2
Result: 2 to (51 + 10 * depth)

Examples:
- Level 1: 2-61 gold
- Level 5: 2-101 gold
- Level 10: 2-151 gold
```

**Leprechaun Steal Formula**:
```
Saving Throw: (player.level + player.strength) / 2 >= 10
Success: steal min(player.gold, GOLDCALC)
Failure: steal min(player.gold, 5 * GOLDCALC)
```

**Leprechaun Drop Formula**:
```
Saving Throw: (player.level + player.strength) / 2 >= 10
Success: drop 5 * GOLDCALC
Failure: drop GOLDCALC
```

**Gold Placement Algorithm**:
```
1. Determine pile count: random(3, 9)
2. For each pile:
   a. Pick random room
   b. Pick random floor position in room
   c. Check position is empty (no items/monsters/stairs)
   d. Calculate amount: GOLDCALC
   e. Create GoldPile at position
3. Return gold array
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- GoldService: >95% (pure calculation logic)
- DungeonService gold spawning: >90%
- MoveCommand gold pickup: >85%
- RenderingService gold rendering: >90%
- Overall: >80%

**Test Files**:
- `GoldService/gold-calculation.test.ts` - GOLDCALC formula tests
- `GoldService/gold-pickup.test.ts` - Pickup logic tests
- `GoldService/leprechaun-formulas.test.ts` - Steal/drop calculation tests
- `DungeonService/gold-spawning.test.ts` - Gold placement tests
- `MoveCommand/gold-pickup.test.ts` - Automatic pickup integration tests
- `RenderingService/gold-rendering.test.ts` - Visual rendering tests
- `MonsterTurnService/theft-mechanics.test.ts` - Update existing tests
- `CombatService/leprechaun-death.test.ts` - Gold drop tests
- `MonsterAIService/behavior-greedy.test.ts` - GREEDY behavior tests

### Test Scenarios

**Scenario 1: Gold Generation Scales with Depth**
- Given: DungeonService generates Level 1
- When: `spawnGold()` called with depth=1
- Then: Gold amounts range from 2-61 per pile

**Scenario 2: Gold Generation Scales with Depth (Deep Level)**
- Given: DungeonService generates Level 10
- When: `spawnGold()` called with depth=10
- Then: Gold amounts range from 2-151 per pile

**Scenario 3: Automatic Gold Pickup on Movement**
- Given: Player at (10, 10), gold pile (100gp) at (11, 10)
- When: Player moves right to (11, 10)
- Then:
  - Player.gold increases from 0 to 100
  - Gold pile removed from level.gold[]
  - Message: "You pick up 100 gold pieces."
  - No extra turn consumed

**Scenario 4: Gold Renders Correctly**
- Given: Gold pile at (15, 15), player at (10, 10), position visible
- When: RenderingService renders (15, 15)
- Then: Character is '$', color is gold (#FFD700)

**Scenario 5: Gold Not Visible Under Player**
- Given: Player at (10, 10), gold pile at (10, 10)
- When: RenderingService renders (10, 10)
- Then: Character is '@' (player has priority)

**Scenario 6: Leprechaun Steals Gold (Failed Save)**
- Given: Player with 200 gold, Leprechaun on Level 5, player fails save
- When: Leprechaun attacks and steals
- Then:
  - Player loses 5 * GOLDCALC gold (up to 505 max, or remaining gold)
  - Leprechaun hasStolen = true, enters FLEEING state

**Scenario 7: Leprechaun Drops Gold on Death (Successful Save)**
- Given: Player kills Leprechaun on Level 5, player made save
- When: Leprechaun dies
- Then: Gold pile (5 * GOLDCALC) created at leprechaun position

**Scenario 8: Dragon Moves Toward Gold**
- Given: Dragon in room with gold pile, gold at (15, 15), dragon at (10, 10)
- When: MonsterAIService processes dragon turn
- Then: Dragon pathfinds toward (15, 15)

---

## 6. Integration Points

### Commands

**Modified Commands**:
- **MoveCommand**:
  - Add gold detection at destination position
  - Call GoldService.pickupGold() if gold present
  - Update player.gold and level.gold[]
  - Add pickup message
  - Handle combat result with leprechaun gold drops

### UI Changes

**Renderer Updates**:
- Add gold pile rendering ($) in tile rendering pipeline
- Gold color: `#FFD700` (classic gold)
- Priority: player > monsters > items > gold > traps > terrain

**ContextualCommandBar**:
- Show `[Gold: {amount}gp]` when player stands on gold
- Updates after automatic pickup

**Status Bar** (future):
- Display total player gold (already shown in UI)

### State Updates

**GameState** (no changes needed):
```typescript
interface GameState {
  player: Player  // player.gold already exists
  levels: Map<number, Level>  // level.gold[] already exists
}
```

**Level** (no changes needed):
```typescript
interface Level {
  gold: GoldPile[]  // Already exists
}
```

**Player** (no changes needed):
```typescript
interface Player {
  gold: number  // Already exists
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [ ] Create `docs/services/GoldService.md` - Full service documentation
- [ ] Update `docs/services/DungeonService.md` - Add gold spawning step
- [ ] Update `docs/services/RenderingService.md` - Add gold rendering rules
- [ ] Update `docs/services/MonsterTurnService.md` - Update leprechaun stealing formula
- [ ] Update `docs/services/CombatService.md` - Add leprechaun gold drop
- [ ] Update `docs/services/MonsterAIService.md` - Add GREEDY behavior
- [ ] Update `docs/services/README.md` - Add GoldService to service catalog
- [ ] Update `docs/commands/move.md` - Add automatic gold pickup behavior
- [ ] Update `docs/game-design/03-dungeon.md` - Confirm gold ($) symbol documented
- [ ] Update `docs/game-design/04-monsters.md` - Document leprechaun gold mechanics
- [ ] Update `docs/systems-core.md` or `systems-advanced.md` - Add gold system overview
- [ ] Update `CLAUDE.md` - If new patterns introduced (unlikely)

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Gold Pickup Timing**
- **Problem**: Should gold pickup consume a turn, or be instant?
- **Mitigation**: Research shows Angband gold pickup is instant (no turn cost). Original Rogue auto-picked up when walking (turn already consumed for movement). **Decision**: Pickup is instant, occurs during movement (no extra turn).

**Issue 2: Gold Rendering Priority**
- **Problem**: What if gold is under player, monster, or item?
- **Mitigation**: Use priority system: player > monsters > items > gold > traps > terrain. Gold only visible when nothing else at position. ContextualCommandBar shows "Gold at feet" notification.

**Issue 3: Leprechaun Saving Throw Complexity**
- **Problem**: Original Rogue has complex saving throw system we don't have yet.
- **Mitigation**: Use simplified formula: `(player.level + player.strength) / 2 >= 10`. Can be enhanced later if full saving throw system added.

**Issue 4: Gold Pile Stacking**
- **Problem**: Should multiple gold piles at same position merge?
- **Mitigation**: Original Rogue merged piles. **Decision**: Don't allow multiple piles at same position during generation. If leprechaun drops gold where pile exists, merge amounts (update existing pile).

**Issue 5: Maximum Gold Limit**
- **Problem**: Should there be a maximum gold a player can carry?
- **Mitigation**: Original Rogue had no limit. Gold has no weight. **Decision**: No maximum limit.

### Breaking Changes
- None. This is additive functionality only.
- Existing leprechaun stealing logic will be replaced, but behavior remains similar (just uses better formula).

### Performance Considerations
- Gold rendering adds one extra check per tile: `isGoldAtPosition()`
- **Optimization**: Store gold positions in Set for O(1) lookup:
  ```typescript
  private goldPositionSet: Set<string> = new Set(
    level.gold.map(g => `${g.position.x},${g.position.y}`)
  )
  ```
- Gold pickup in MoveCommand adds one array search per move
- **Optimization**: Use `Array.find()` (acceptable for ~9 gold piles max per level)

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (data model already exists)
- **Blocks**: Future shop system (may use gold for purchases)

### Estimated Timeline
- Phase 1 (GoldService): 2-3 hours
- Phase 2 (DungeonService gold spawning): 1-2 hours
- Phase 3 (Automatic pickup): 2-3 hours
- Phase 4 (Rendering): 2-3 hours
- Phase 5 (Leprechaun mechanics): 2-3 hours
- Phase 6 (GREEDY behavior): 1-2 hours
- Documentation: 1-2 hours
- Testing & bugfixes: 2-3 hours
- **Total**: 13-21 hours (2-3 days)

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
  - [ ] GoldService contains all gold logic (no logic in commands)
  - [ ] Services are stateless and pure
  - [ ] Immutability maintained (no mutations)
  - [ ] Dependency injection used throughout
- [ ] Documentation updated
- [ ] Manual testing completed:
  - [ ] Gold spawns on multiple levels
  - [ ] Walking over gold picks it up automatically
  - [ ] Gold renders correctly on map
  - [ ] Leprechaun steals gold using formula
  - [ ] Killing leprechaun drops gold
  - [ ] Dragon moves toward gold in room (GREEDY)
  - [ ] Gold counter updates in UI
  - [ ] No turn cost for gold pickup
  - [ ] Gold piles vary in amount by depth

### Follow-Up Tasks
- [ ] Add gold to death screen statistics (total gold collected)
- [ ] Add gold to leaderboard scoring
- [ ] Consider gold-based shops (future Phase)
- [ ] Consider gold-based experience bonus (Rogue 1980 didn't have this, but some roguelikes do)
- [ ] Add "greedy" personality to more monsters (Orcs, Goblins)
- [ ] Visual enhancement: gold pile size varies by amount (small/medium/large piles)
- [ ] Sound effect for gold pickup (if audio added to game)

---

**Last Updated**: 2025-10-06
**Status**: 🚧 In Progress
