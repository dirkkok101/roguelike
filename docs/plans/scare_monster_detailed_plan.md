# SCARE_MONSTER Scroll - Detailed Implementation Plan

**Version**: 1.0
**Date**: 2025-10-06
**Status**: Ready for Implementation
**Complexity**: HIGH (Special mechanics, AI integration, deterioration tracking)

---

## Executive Summary

SCARE_MONSTER is the most complex scroll in the game because it:
1. **Is NOT consumed** on use (unique behavior - scroll is dropped, not removed)
2. **Requires ground item tracking** with turn-based deterioration
3. **Modifies monster AI** (detect scroll, switch to FLEEING state)
4. **Blocks pathfinding** (monsters cannot path through scare scroll tiles)
5. **Has temporal mechanics** (deteriorates after 100 turns)

**Current State**: 10/11 scrolls implemented (SCARE_MONSTER is the last)
**Target State**: All 11 scrolls functional with scare scroll mechanics fully integrated

---

## 1. Existing Infrastructure Analysis

### ✅ What Already Exists

**Items on Ground System**:
- ✅ `Level.items: Item[]` - Items can be placed on the ground
- ✅ `Item.position: Position` - Items have positions
- ✅ `DropCommand` - Command for dropping items exists

**Monster AI System**:
- ✅ `MonsterState.FLEEING` - Monsters can flee
- ✅ COWARD and THIEF behaviors already implement FLEEING logic
- ✅ `MonsterAIService.fleeBehavior()` - Pathfinding away from player exists

**Pathfinding System**:
- ✅ `PathfindingService.findPath()` - A* pathfinding implemented
- ✅ Tile walkability checks - `tile.walkable` determines valid paths

**Turn System**:
- ✅ `TurnService.incrementTurn()` - Turn counter tracking
- ✅ Status effect duration ticking (can be adapted for item deterioration)

### ❌ What Needs to Be Built

1. **Scroll Drop Mechanism** - Return `consumed: false` from ScrollService
2. **Deterioration Tracking** - Track when scroll was dropped, remove after 100 turns
3. **Scare Scroll Detection** - MonsterAIService needs to detect nearby scare scrolls
4. **Pathfinding Avoidance** - PathfindingService must avoid scare scroll tiles
5. **FLEEING Trigger** - Monsters adjacent to scare scroll switch to FLEEING state
6. **Deterioration Cleanup** - TurnService removes expired scare scrolls

---

## 2. Technical Architecture

### 2.1 Data Model Extensions

#### Item Interface Extension (Optional Field)

```typescript
export interface Scroll extends Item {
  scrollType: ScrollType
  effect: string
  labelName: string

  // NEW: Track when scroll was dropped for deterioration
  droppedAtTurn?: number  // Turn when scroll was dropped (undefined = not dropped)
}
```

**Why Optional**: Only SCARE_MONSTER scrolls need this field when dropped

#### Level Helper Method (LevelService)

```typescript
// NEW: Get all scare scrolls on level
getScareScrollsOnGround(level: Level): Scroll[] {
  return level.items.filter(item =>
    item.type === ItemType.SCROLL &&
    (item as Scroll).scrollType === ScrollType.SCARE_MONSTER &&
    (item as Scroll).droppedAtTurn !== undefined
  ) as Scroll[]
}

// NEW: Check if position has scare scroll
hasScareScrollAt(position: Position, level: Level): boolean {
  return level.items.some(item =>
    item.position.x === position.x &&
    item.position.y === position.y &&
    item.type === ItemType.SCROLL &&
    (item as Scroll).scrollType === ScrollType.SCARE_MONSTER &&
    (item as Scroll).droppedAtTurn !== undefined
  )
}

// NEW: Get scare scroll positions for pathfinding
getScareScrollPositions(level: Level): Set<string> {
  const positions = new Set<string>()
  const scareScrolls = this.getScareScrollsOnGround(level)

  scareScrolls.forEach(scroll => {
    positions.add(`${scroll.position.x},${scroll.position.y}`)
  })

  return positions
}
```

---

### 2.2 ScrollService Implementation

#### applyScareMonster Method

```typescript
// In ScrollService.ts
private applyScareMonster(
  player: Player,
  state: GameState,
  scrollName: string,
  identified: boolean
): ScrollEffectResult {
  // Scare scroll is NOT consumed - it's dropped on ground
  // The ReadScrollCommand will handle dropping it at player position

  return {
    message: `You read ${scrollName}. You hear maniacal laughter and instinctively drop the scroll!`,
    identified,
    consumed: false,  // KEY: Scroll NOT consumed, will be dropped
  }
}
```

**Key Points**:
- Returns `consumed: false` (unique to SCARE_MONSTER)
- No player or state modification (scroll just gets dropped)
- ReadScrollCommand handles the actual drop + turn tracking

---

### 2.3 ReadScrollCommand Integration

#### Scroll Drop Logic

```typescript
// In ReadScrollCommand.execute()

// After applying scroll effect
const result = this.scrollService.applyScroll(player, scroll, state)

if (result.consumed) {
  // Normal scrolls: Remove from inventory
  updatedPlayer = this.inventoryService.removeItem(updatedPlayer, scroll.id)
} else {
  // SCARE_MONSTER: Drop scroll at player position with turn tracking
  updatedPlayer = this.inventoryService.removeItem(updatedPlayer, scroll.id)

  // Mark scroll as dropped with current turn
  const droppedScroll: Scroll = {
    ...scroll,
    position: state.player.position,
    droppedAtTurn: state.turnCount,  // Track when dropped
  }

  // Add to level items
  const currentLevel = state.levels.get(state.currentLevel)!
  const updatedLevel: Level = {
    ...currentLevel,
    items: [...currentLevel.items, droppedScroll]
  }

  updatedState = {
    ...state,
    levels: new Map(state.levels).set(state.currentLevel, updatedLevel)
  }
}
```

---

### 2.4 PathfindingService Extension

#### Avoid Scare Scroll Tiles

```typescript
// In PathfindingService.ts

// MODIFY: getNeighbors method
private getNeighbors(pos: Position, level: Level): Position[] {
  const neighbors: Position[] = []
  const directions = [
    { dx: 0, dy: -1 },  // North
    { dx: 0, dy: 1 },   // South
    { dx: -1, dy: 0 },  // West
    { dx: 1, dy: 0 },   // East
    { dx: -1, dy: -1 }, // NW
    { dx: 1, dy: -1 },  // NE
    { dx: -1, dy: 1 },  // SW
    { dx: 1, dy: 1 },   // SE
  ]

  // NEW: Get scare scroll positions (inject LevelService)
  const scareScrollPositions = this.levelService.getScareScrollPositions(level)

  for (const dir of directions) {
    const newPos = { x: pos.x + dir.dx, y: pos.y + dir.dy }

    if (this.isInBounds(newPos, level)) {
      const tile = level.tiles[newPos.y][newPos.x]
      const posKey = `${newPos.x},${newPos.y}`

      // NEW: Block scare scroll tiles from pathfinding
      if (tile.walkable && !scareScrollPositions.has(posKey)) {
        neighbors.push(newPos)
      }
    }
  }

  return neighbors
}
```

**Key Points**:
- Scare scroll tiles are treated as unwalkable for monsters
- Monsters cannot path through or onto scare scroll tiles
- Requires injecting LevelService into PathfindingService

---

### 2.5 MonsterAIService Extension

#### Detect Nearby Scare Scrolls

```typescript
// In MonsterAIService.ts

// NEW: Check if monster is adjacent to scare scroll
private isAdjacentToScareScroll(
  monster: Monster,
  level: Level
): boolean {
  const adjacentPositions = [
    { x: monster.position.x - 1, y: monster.position.y - 1 }, // NW
    { x: monster.position.x, y: monster.position.y - 1 },     // N
    { x: monster.position.x + 1, y: monster.position.y - 1 }, // NE
    { x: monster.position.x - 1, y: monster.position.y },     // W
    { x: monster.position.x + 1, y: monster.position.y },     // E
    { x: monster.position.x - 1, y: monster.position.y + 1 }, // SW
    { x: monster.position.x, y: monster.position.y + 1 },     // S
    { x: monster.position.x + 1, y: monster.position.y + 1 }, // SE
  ]

  return adjacentPositions.some(pos =>
    this.levelService.hasScareScrollAt(pos, level)
  )
}

// MODIFY: updateMonsterState method
updateMonsterState(
  monster: Monster,
  player: Player,
  level: Level
): Monster {
  // NEW: Check for scare scroll FIRST (overrides other behaviors)
  if (this.isAdjacentToScareScroll(monster, level)) {
    return { ...monster, state: MonsterState.FLEEING }
  }

  // ... existing state transition logic
}
```

**Key Points**:
- Check runs BEFORE existing state logic (highest priority)
- Any monster adjacent to scare scroll immediately switches to FLEEING
- Uses LevelService helper to detect scare scrolls

---

### 2.6 TurnService Extension

#### Deterioration Cleanup

```typescript
// In TurnService.ts

// NEW: Remove expired scare scrolls
private removeExpiredScareScrolls(state: GameState): GameState {
  const currentLevel = state.levels.get(state.currentLevel)
  if (!currentLevel) return state

  // Filter out expired scare scrolls (>100 turns old)
  const updatedItems = currentLevel.items.filter(item => {
    if (item.type === ItemType.SCROLL) {
      const scroll = item as Scroll
      if (scroll.scrollType === ScrollType.SCARE_MONSTER && scroll.droppedAtTurn !== undefined) {
        const turnsOnGround = state.turnCount - scroll.droppedAtTurn
        return turnsOnGround < 100  // Keep if less than 100 turns
      }
    }
    return true  // Keep all other items
  })

  // If items changed, update level
  if (updatedItems.length !== currentLevel.items.length) {
    const updatedLevel = { ...currentLevel, items: updatedItems }
    return {
      ...state,
      levels: new Map(state.levels).set(state.currentLevel, updatedLevel)
    }
  }

  return state
}

// MODIFY: incrementTurn method
incrementTurn(state: GameState): GameState {
  // ... existing logic (tick status effects, update hunger, etc.)

  // NEW: Remove expired scare scrolls
  let updatedState = this.removeExpiredScareScrolls(state)

  // ... existing turn increment logic
  updatedState = { ...updatedState, turnCount: updatedState.turnCount + 1 }

  return updatedState
}
```

**Key Points**:
- Checks on every turn increment
- Removes scrolls older than 100 turns
- Shows no message (scroll silently turns to dust)
- Only checks current level (efficiency optimization)

---

## 3. Implementation Phases

### Phase 1: Core Scroll Mechanics ✓

**Goal**: Implement basic SCARE_MONSTER scroll drop behavior

**Tasks**:

1.1. **ScrollService.applyScareMonster()**
   - [ ] Add case for ScrollType.SCARE_MONSTER in applyScroll()
   - [ ] Implement applyScareMonster() method
   - [ ] Return `consumed: false` (unique behavior)
   - [ ] Add message: "You hear maniacal laughter and instinctively drop the scroll!"
   - [ ] Verify auto-identification works

1.2. **ReadScrollCommand Drop Logic**
   - [ ] Add special case for `consumed: false` scrolls
   - [ ] Remove scroll from inventory
   - [ ] Add scroll to level.items at player position
   - [ ] Set `droppedAtTurn: state.turnCount` on dropped scroll
   - [ ] Update state with modified level

1.3. **Basic Tests**
   - [ ] Test applyScareMonster returns consumed: false
   - [ ] Test scroll is marked as identified
   - [ ] Test message contains "maniacal laughter"
   - [ ] Test scroll is NOT in result.player (no player modification)

**Deliverable**: SCARE_MONSTER scroll can be dropped on ground with turn tracking

**Estimated Effort**: 3 subtasks, ~50 lines of code, ~30 lines of tests

---

### Phase 2: LevelService Helper Methods ✓

**Goal**: Add utility methods for detecting scare scrolls

**Tasks**:

2.1. **LevelService.getScareScrollsOnGround()**
   - [ ] Filter level.items for SCARE_MONSTER scrolls
   - [ ] Check scrollType and droppedAtTurn fields
   - [ ] Return array of Scroll objects
   - [ ] Write tests

2.2. **LevelService.hasScareScrollAt()**
   - [ ] Check if position has scare scroll
   - [ ] Use item.position and scrollType check
   - [ ] Return boolean
   - [ ] Write tests

2.3. **LevelService.getScareScrollPositions()**
   - [ ] Get all scare scroll positions as Set<string>
   - [ ] Format as "x,y" keys for fast lookup
   - [ ] Used by PathfindingService
   - [ ] Write tests

**Deliverable**: Helper methods for detecting scare scrolls on level

**Estimated Effort**: 3 subtasks, ~40 lines of code, ~40 lines of tests

---

### Phase 3: Pathfinding Integration ✓

**Goal**: Monsters cannot path through scare scroll tiles

**Tasks**:

3.1. **PathfindingService Extension**
   - [ ] Inject LevelService into PathfindingService constructor
   - [ ] Modify getNeighbors() to call getScareScrollPositions()
   - [ ] Block tiles with scare scrolls (treat as unwalkable)
   - [ ] Ensure performance (Set lookup is O(1))

3.2. **Update PathfindingService Tests**
   - [ ] Test pathfinding avoids scare scroll tiles
   - [ ] Test monster paths around scare scroll
   - [ ] Test blocked corridor with scare scroll
   - [ ] Test multiple scare scrolls blocking paths

3.3. **Integration Tests**
   - [ ] Test monster cannot reach player through scare scroll
   - [ ] Test monster finds alternate path around scare scroll
   - [ ] Test monster gets stuck if completely blocked

**Deliverable**: Monsters cannot path through or onto scare scroll tiles

**Estimated Effort**: 3 subtasks, ~30 lines of code, ~50 lines of tests

---

### Phase 4: Monster AI Integration ✓

**Goal**: Monsters detect nearby scare scrolls and flee

**Tasks**:

4.1. **MonsterAIService.isAdjacentToScareScroll()**
   - [ ] Check all 8 adjacent tiles
   - [ ] Use LevelService.hasScareScrollAt() for each position
   - [ ] Return boolean
   - [ ] Write tests

4.2. **MonsterAIService.updateMonsterState() Extension**
   - [ ] Add scare scroll check at top of method (highest priority)
   - [ ] If adjacent to scare scroll → set state to FLEEING
   - [ ] Inject LevelService into MonsterAIService
   - [ ] Ensure existing behaviors still work

4.3. **FLEEING Behavior Tests**
   - [ ] Test monster switches to FLEEING when adjacent to scare scroll
   - [ ] Test monster flees away from scare scroll position
   - [ ] Test monster returns to normal when far from scare scroll
   - [ ] Test COWARD and THIEF still work with scare scrolls

**Deliverable**: Monsters adjacent to scare scroll switch to FLEEING state

**Estimated Effort**: 3 subtasks, ~40 lines of code, ~60 lines of tests

---

### Phase 5: Deterioration System ✓

**Goal**: Scare scrolls disappear after 100 turns

**Tasks**:

5.1. **TurnService.removeExpiredScareScrolls()**
   - [ ] Filter level.items to remove old scare scrolls
   - [ ] Check `turnCount - droppedAtTurn >= 100`
   - [ ] Update level with filtered items
   - [ ] Return updated state

5.2. **TurnService.incrementTurn() Integration**
   - [ ] Call removeExpiredScareScrolls() before incrementing turn
   - [ ] Ensure all levels checked (or just current level for efficiency)
   - [ ] Test performance with many items

5.3. **Deterioration Tests**
   - [ ] Test scare scroll removed after 100 turns
   - [ ] Test scare scroll persists for 99 turns
   - [ ] Test multiple scare scrolls deteriorate independently
   - [ ] Test deterioration message (optional: "The scroll crumbles to dust")

**Deliverable**: Scare scrolls automatically removed after 100 turns

**Estimated Effort**: 3 subtasks, ~30 lines of code, ~40 lines of tests

---

### Phase 6: Integration & Polish ✓

**Goal**: Full end-to-end testing and edge cases

**Tasks**:

6.1. **End-to-End Integration Tests**
   - [ ] Test full workflow: read scroll → drop → monster flees → deteriorate
   - [ ] Test monster pathfinding with scare scroll in dungeon
   - [ ] Test picking up scare scroll after dropping (should be possible)
   - [ ] Test multiple scare scrolls in same room

6.2. **Edge Cases**
   - [ ] Test dropping scare scroll in doorway (blocks passage)
   - [ ] Test scare scroll dropped on stairs (doesn't block stairs)
   - [ ] Test monster already on scare scroll tile when dropped
   - [ ] Test scare scroll dropped with no monsters nearby

6.3. **UI/Visual Indicators (Optional)**
   - [ ] Add special character or color for scare scroll on ground
   - [ ] Show turn counter remaining (e.g., "Scare Scroll (87 turns left)")
   - [ ] Add visual feedback when monster flees from scare scroll

**Deliverable**: Production-ready SCARE_MONSTER scroll with full test coverage

**Estimated Effort**: 3 subtasks, ~20 lines of code, ~50 lines of tests

---

## 4. Testing Strategy

### 4.1 Test Organization

```
src/services/ScrollService/
├── scare-monster-scroll.test.ts         (NEW - Phase 1)

src/services/LevelService/
├── scare-scroll-detection.test.ts       (NEW - Phase 2)

src/services/PathfindingService/
├── scare-scroll-avoidance.test.ts       (NEW - Phase 3)

src/services/MonsterAIService/
├── scare-scroll-fleeing.test.ts         (NEW - Phase 4)

src/services/TurnService/
├── scare-scroll-deterioration.test.ts   (NEW - Phase 5)

src/integration/
├── scare-monster-integration.test.ts    (NEW - Phase 6)
```

### 4.2 Test Coverage Goals

- **ScrollService**: 100% coverage (scroll drop logic)
- **LevelService**: 100% coverage (helper methods)
- **PathfindingService**: >90% coverage (avoidance logic)
- **MonsterAIService**: >90% coverage (fleeing trigger)
- **TurnService**: >90% coverage (deterioration cleanup)
- **Integration**: >80% coverage (end-to-end scenarios)

### 4.3 Key Test Scenarios

#### ScrollService Tests
1. ✅ Returns `consumed: false`
2. ✅ Auto-identifies scroll
3. ✅ Returns correct message
4. ✅ No player modification
5. ✅ No state modification

#### LevelService Tests
1. ✅ Finds scare scrolls on level
2. ✅ Detects scare scroll at position
3. ✅ Returns empty set when no scare scrolls
4. ✅ Ignores unidentified scrolls (not yet dropped)
5. ✅ Ignores other scroll types

#### PathfindingService Tests
1. ✅ Avoids scare scroll tiles
2. ✅ Finds alternate path around scare scroll
3. ✅ Returns null path if completely blocked
4. ✅ Performance test with multiple scare scrolls

#### MonsterAIService Tests
1. ✅ Detects adjacent scare scroll
2. ✅ Switches to FLEEING state
3. ✅ Flees away from scare scroll
4. ✅ Returns to normal when far away
5. ✅ Works with existing FLEEING behaviors

#### TurnService Tests
1. ✅ Removes scrolls after 100 turns
2. ✅ Keeps scrolls before 100 turns
3. ✅ Multiple scrolls deteriorate independently
4. ✅ Only affects current level (optimization)

#### Integration Tests
1. ✅ Full workflow: drop → monster flees → pickup possible
2. ✅ Monster cannot reach player through scare scroll
3. ✅ Scare scroll in doorway blocks passage
4. ✅ Multiple monsters flee from same scare scroll

---

## 5. Design Decisions

### 5.1 Deterioration: 100 Turns vs Permanent

**Decision**: 100 turns before scroll turns to dust

**Rationale**:
- ✅ Prevents permanent safe zones (would break game balance)
- ✅ Forces tactical use (not "set and forget")
- ✅ Matches original Rogue behavior
- ✅ Creates strategic tension (when to use, where to place)

**Alternative Considered**: Permanent scroll
- ❌ Too powerful (create unkillable fortress)
- ❌ Trivializes combat (drop at stairs, camp forever)

---

### 5.2 Pathfinding: Hard Block vs Avoid

**Decision**: Hard block (monsters CANNOT path through scare scroll tiles)

**Rationale**:
- ✅ Clear, predictable behavior
- ✅ Matches original Rogue mechanics
- ✅ Simpler implementation (treat as unwalkable)
- ✅ Creates tactical chokepoints

**Alternative Considered**: High cost tile (monsters avoid but CAN path through if desperate)
- ❌ More complex (need cost system)
- ❌ Unpredictable (player can't rely on it)
- ❌ Deviates from original Rogue

---

### 5.3 FLEEING Trigger: Adjacent vs Visible

**Decision**: Adjacent (8 tiles around scroll) triggers FLEEING

**Rationale**:
- ✅ Matches original Rogue (adjacent tiles affected)
- ✅ Clear gameplay feedback (monster immediately flees when close)
- ✅ Balanced range (not too small, not too large)

**Alternative Considered**: Visible range (FOV-based)
- ❌ Too powerful (affects entire room)
- ❌ Harder to implement (FOV calculation)
- ❌ Less predictable for player

---

### 5.4 Deterioration Check: All Levels vs Current Level

**Decision**: Check only current level for deterioration

**Rationale**:
- ✅ Performance optimization (avoid checking 10 levels every turn)
- ✅ Player only sees current level anyway
- ✅ Scare scrolls on other levels still deteriorate when player returns

**Alternative Considered**: Check all levels every turn
- ❌ Performance cost (iterate 10 levels × items every turn)
- ❌ Unnecessary (player can't interact with other levels)
- ✅ More accurate (scrolls deteriorate even when player not present)

**Implementation Note**: Can extend to all levels if performance is acceptable

---

### 5.5 Scroll on Monster Tile: Allow vs Prevent

**Decision**: Allow dropping scare scroll on tile with monster

**Rationale**:
- ✅ Simpler implementation (no collision check)
- ✅ Monster immediately flees (becomes adjacent on next turn)
- ✅ Allows emergency use in melee combat

**Alternative Considered**: Prevent dropping on occupied tile
- ❌ More complex (need collision detection)
- ❌ Less useful (can't use in emergency)
- ✅ More realistic (can't drop on monster)

---

## 6. Performance Considerations

### 6.1 Pathfinding Performance

**Concern**: Checking scare scroll positions on every pathfinding call

**Solution**: Use Set<string> for O(1) lookup
```typescript
const scareScrollPositions = this.levelService.getScareScrollPositions(level)
// O(n) to build, where n = items on level
// O(1) to check each position during pathfinding
```

**Optimization**: Cache scare scroll positions on level?
- ✅ Faster (no rebuild on every pathfinding call)
- ❌ More complex (need cache invalidation)
- **Verdict**: Profile first, optimize if needed

---

### 6.2 Deterioration Check Performance

**Concern**: Checking items every turn

**Solution**: Only check current level
```typescript
// O(n) where n = items on current level (typically <50)
// Cost: ~50 iterations per turn (negligible)
```

**Optimization**: Track scare scroll count?
- ✅ Early exit if no scare scrolls present
- ❌ More state tracking
- **Verdict**: Profile first, optimize if needed

---

### 6.3 Monster AI Check Performance

**Concern**: Checking 8 adjacent tiles for every monster

**Solution**: Short-circuit on first found scroll
```typescript
adjacentPositions.some(pos => hasScareScrollAt(pos, level))
// Exits early on first match
```

**Optimization**: Spatial hash for scare scrolls?
- ✅ O(1) lookups instead of array iteration
- ❌ Complex to implement
- **Verdict**: Current solution sufficient (8 checks per monster negligible)

---

## 7. Success Metrics

### Completion Criteria

- ✅ All 11 scroll types functional (including SCARE_MONSTER)
- ✅ Scare scroll drops on ground (not consumed)
- ✅ Monsters avoid scare scroll tiles in pathfinding
- ✅ Monsters flee when adjacent to scare scroll
- ✅ Scare scrolls deteriorate after 100 turns
- ✅ All tests passing (>90% coverage)
- ✅ No performance regressions

### Quality Gates

- ✅ `npm test` - All tests passing
- ✅ `npm run type-check` - No TypeScript errors
- ✅ `npm run test:coverage` - >90% coverage on new code
- ✅ Manual testing - Scare scroll behaves correctly in-game
- ✅ Architecture review - No logic in commands, immutability maintained

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Pathfinding performance** | Medium | Medium | Use Set for O(1) lookups, profile before optimizing |
| **Deterioration edge cases** | Medium | Low | Comprehensive tests, handle level transitions |
| **Monster AI conflicts** | Low | Medium | Scare scroll check runs first (highest priority) |
| **Save/load compatibility** | High | High | `droppedAtTurn` is optional field (backward compatible) |
| **UI confusion** | Medium | Low | Clear messaging, visual indicators for scare scrolls |

---

## 9. Implementation Checklist

### Phase 1: Core Scroll Mechanics
- [ ] 1.1 ScrollService.applyScareMonster()
- [ ] 1.2 ReadScrollCommand drop logic
- [ ] 1.3 Basic tests

### Phase 2: LevelService Helpers
- [ ] 2.1 getScareScrollsOnGround()
- [ ] 2.2 hasScareScrollAt()
- [ ] 2.3 getScareScrollPositions()

### Phase 3: Pathfinding Integration
- [ ] 3.1 PathfindingService extension
- [ ] 3.2 Pathfinding tests
- [ ] 3.3 Integration tests

### Phase 4: Monster AI Integration
- [ ] 4.1 isAdjacentToScareScroll()
- [ ] 4.2 updateMonsterState() extension
- [ ] 4.3 FLEEING behavior tests

### Phase 5: Deterioration System
- [ ] 5.1 removeExpiredScareScrolls()
- [ ] 5.2 incrementTurn() integration
- [ ] 5.3 Deterioration tests

### Phase 6: Integration & Polish
- [ ] 6.1 End-to-end tests
- [ ] 6.2 Edge cases
- [ ] 6.3 UI indicators (optional)

---

## 10. Dependencies

**Required Services**:
- ✅ ScrollService - Scroll effect implementation
- ✅ LevelService - Helper methods for detecting scrolls
- ✅ PathfindingService - Avoidance logic
- ✅ MonsterAIService - FLEEING trigger
- ✅ TurnService - Deterioration cleanup
- ✅ InventoryService - Item removal/addition

**Required Commands**:
- ✅ ReadScrollCommand - Scroll usage and drop logic

**Required Types**:
- ✅ Scroll interface - Add optional `droppedAtTurn` field
- ✅ Level interface - Already has items array
- ✅ MonsterState enum - Already has FLEEING state

---

## 11. Future Enhancements

**Post-v1 Improvements**:
- [ ] Visual indicator on ground (special character/color)
- [ ] Turn counter display ("Scare Scroll (87 turns left)")
- [ ] Deterioration warning message ("The scroll begins to fade...")
- [ ] Sound effect when monster flees from scare scroll
- [ ] Achievement: "Safe Zone" (survive 10 turns near scare scroll)
- [ ] Stat tracking: scare scrolls used, monsters scared

**Balance Tuning**:
- [ ] Adjust deterioration time (50 turns? 150 turns?)
- [ ] Adjust affected radius (adjacent only? 2-tile radius?)
- [ ] Add rare "Scroll of Greater Scaring" (permanent version?)

---

## 12. References

**Game Design**:
- [Items Design](../game-design/05-items.md) - Scroll specifications
- [Scroll Implementation Plan](./scroll_implementation_plan.md) - Overall scroll strategy

**Architecture**:
- [Architecture Guide](../architecture.md) - SOLID principles, immutability
- [Testing Strategy](../testing-strategy.md) - Test organization

**Original Rogue**:
- [Rogue Items - StrategyWiki](https://strategywiki.org/wiki/Rogue/Items) - Original scare scroll behavior
- Original behavior: Scroll dropped on ground, monsters avoid tile, deteriorates over time

---

**Last Updated**: 2025-10-06
**Author**: Claude Code
**Status**: Ready for Implementation
**Estimated Total Effort**: 6 phases, ~210 lines of code, ~270 lines of tests
