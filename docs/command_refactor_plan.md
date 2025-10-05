# Command Architecture Refactoring Plan

**Status**: 🚧 Phase 2 Complete - In Progress (Phase 3 remaining)
**Last Updated**: 2025-10-05
**Estimated Duration**: 3 weeks
**Dependencies**: Service refactor (Phases 1-4) complete ✅

**Progress**:
- ✅ Phase 1: Critical Fixes (SearchCommand, UseItemCommand) - **COMPLETE**
- ✅ Phase 2: Service Enhancements (MovementService, HungerService, Message types) - **COMPLETE**
- ⏳ Phase 3: Polish (LevelService, FOVService, TurnService) - **IN PROGRESS**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
3. [Current State Analysis](#current-state-analysis)
4. [Refactoring Phases](#refactoring-phases)
   - [Phase 1: Critical Fixes](#phase-1-critical-fixes-week-1)
   - [Phase 2: Service Enhancements](#phase-2-service-enhancements-week-2)
   - [Phase 3: Polish](#phase-3-polish-week-3)
5. [Testing Strategy](#testing-strategy)
6. [Implementation Guidelines](#implementation-guidelines)
7. [Success Metrics](#success-metrics)
8. [Reference Examples](#reference-examples)

---

## Executive Summary

### Current State

**Command Architecture Issues**:
```
Total Commands:        23
Commands with Violations: 5 (22% of codebase)
Avg Command Size:      96 lines (target: 50-80)
Max Command Size:      263 lines (MoveCommand)
Private Methods:       6 commands have private methods (business logic)
Service Coverage:      75% (SearchService missing)
```

**Critical Violations**:
1. **SearchCommand** (138 lines) - No service layer, all logic inline
2. **UseItemCommand** (217 lines) - Violates SRP, handles 5 item types
3. **MoveCommand** (263 lines) - Private methods duplicate service functionality
4. **EatCommand** (121 lines) - Logic + duplication with UseItemCommand
5. **MoveStairsCommand** (188 lines) - Position calculation logic embedded

### Goals

**Architectural**:
- ✅ Commands orchestrate ONLY (no private methods with logic)
- ✅ All business logic in services
- ✅ SOLID principles compliance
- ✅ Single Responsibility Principle per command

**Quantitative**:
- Commands with private methods: 6 → 0
- Average command size: 96 → 68 lines
- Max command size: 263 → <150 lines
- Service coverage: 75% → 95%

**Qualitative**:
- Clear separation of concerns
- Easy to test (smaller, focused units)
- Easy to extend (add new commands without modifying existing)
- Self-documenting code (command names are verbs)

### Approach

**3-Phase Refactoring**:
1. **Phase 1** (Week 1): Fix critical violations (SearchCommand, UseItemCommand)
2. **Phase 2** (Week 2): Enhance services to remove logic from commands
3. **Phase 3** (Week 3): Polish and consolidation

**Total Estimated Time**: 15-18 days

---

## Architectural Principles

### Command Pattern (What Commands SHOULD Do)

**✅ Commands Should**:
- Validate input (item exists, player on stairs, etc.)
- Route to appropriate services based on game state
- Call services to perform business logic
- Assemble final state from service results
- Handle control flow (if/else routing to different services)

**❌ Commands Should NOT**:
- Contain algorithms or calculations
- Have loops for data processing (forEach, map, filter with logic)
- Implement private methods with business logic
- Duplicate logic from services
- Manually track state changes (old vs new comparisons)

### SOLID Principles

**Single Responsibility Principle (SRP)**:
```typescript
// ❌ BAD: UseItemCommand handles 5 different actions
class UseItemCommand {
  execute(state: GameState): GameState {
    switch (this.action) {
      case 'quaff': /* potion logic */
      case 'read': /* scroll logic */
      case 'zap': /* wand logic */
      case 'eat': /* food logic */
      case 'refill': /* oil logic */
    }
  }
}

// ✅ GOOD: One command per action
class QuaffPotionCommand { /* only potions */ }
class ReadScrollCommand { /* only scrolls */ }
class ZapWandCommand { /* only wands */ }
```

**Open/Closed Principle (OCP)**:
```typescript
// ❌ BAD: Adding new item type requires modifying switch
class UseItemCommand {
  execute(state: GameState): GameState {
    switch (this.action) {
      // Adding "drink" requires modifying this file
    }
  }
}

// ✅ GOOD: Add new command without modifying existing code
class DrinkElixirCommand implements ICommand { /* new file */ }
```

**Dependency Inversion Principle (DIP)**:
```typescript
// ❌ BAD: Command contains logic (depends on implementation)
class SearchCommand {
  execute(state: GameState): GameState {
    const findChance = 0.5 + player.level * 0.05  // ❌ Logic!
    if (random.chance(findChance)) { /*...*/ }
  }
}

// ✅ GOOD: Command depends on service abstraction
class SearchCommand {
  execute(state: GameState): GameState {
    const result = this.searchService.searchForSecrets(/*...*/)
    return this.assembleState(state, result)
  }
}
```

### Service Layer (What Services SHOULD Provide)

**Complete Results**:
```typescript
// ✅ Services return everything commands need
interface SearchResult {
  found: boolean
  type: 'door' | 'trap' | null
  position: Position | null
  message: string
  updatedLevel: Level  // ✅ Complete updated state
}

// ❌ Don't return partial data requiring command logic
interface SearchResult {
  found: boolean  // ❌ Command must figure out what was found
}
```

**Message Type Inclusion**:
```typescript
// ✅ Service specifies message type
interface HungerTickResult {
  player: Player
  messages: Array<{ text: string; type: MessageType }>  // ✅
  death?: DeathInfo
}

// ❌ Command determines message type
interface HungerTickResult {
  player: Player
  messages: string[]  // ❌ Command must decide if 'critical' or 'warning'
}
```

### Clean Code Standards

**Private Method Detection Rule**:
> If a command has a private method, that logic belongs in a service.

**Exceptions**:
- Simple helper for readability (e.g., `private addMessage(...)` that just calls MessageService)
- State assembly helpers (e.g., `private buildUpdatedState(...)` that just spreads objects)

**Red Flags**:
- `private` methods with calculations
- `private` methods with conditionals
- `private` methods with loops
- `private` methods with business rules

---

## Current State Analysis

### Problem Command #1: SearchCommand (138 lines)

**Status**: 🔴 CRITICAL - No service layer

**File**: `src/commands/SearchCommand/SearchCommand.ts`

**Violations**:
1. Adjacent position calculation (geometry logic)
2. Search probability formula (game rule logic)
3. Tile property manipulation (data logic)
4. Manual door/trap finding loops
5. Manual map() operations for state updates

**Code Analysis**:
```typescript
// Lines 25-30: ❌ Geometry logic in command
const adjacentPositions = [
  { x: playerPos.x - 1, y: playerPos.y },
  { x: playerPos.x + 1, y: playerPos.y },
  { x: playerPos.x, y: playerPos.y - 1 },
  { x: playerPos.x, y: playerPos.y + 1 },
]

// Lines 46-47: ❌ Game rule calculation in command
const findChance = 0.5 + state.player.level * 0.05
if (this.random.chance(findChance)) {

// Lines 58-60: ❌ Tile manipulation in command
tile.char = '+'
tile.walkable = true
tile.transparent = false

// Lines 35-86: ❌ Manual loop with complex logic
for (const pos of adjacentPositions) {
  const secretDoor = level.doors.find(/*...*/)
  if (secretDoor) {
    // 30+ lines of revealing logic
  }
}
```

**Impact**:
- Untestable (hard to test probability calculations in command)
- Not reusable (can't search from other commands)
- Hard to extend (adding new searchable types is complex)

---

### Problem Command #2: UseItemCommand (217 lines)

**Status**: 🔴 CRITICAL - Violates SRP

**File**: `src/commands/UseItemCommand/UseItemCommand.ts`

**Violations**:
1. Handles 5 different item types (SRP violation)
2. `validateAction()` private method contains business logic
3. Large switch statement with 5 branches
4. Duplicate functionality: `'eat'` case duplicates EatCommand
5. Action parameter adds complexity

**Code Analysis**:
```typescript
// Lines 24, 29: ❌ Action parameter = multiple responsibilities
export type UseItemAction = 'quaff' | 'read' | 'zap' | 'eat' | 'refill'
constructor(
  private action: UseItemAction,  // ❌ Discriminator
  // ...
)

// Lines 71-162: ❌ Large switch statement
switch (this.action) {
  case 'quaff':    // 14 lines
  case 'read':     // 14 lines
  case 'zap':      // 19 lines
  case 'eat':      // 10 lines - ❌ DUPLICATES EatCommand!
  case 'refill':   // 18 lines
}

// Lines 187-216: ❌ Private method with business logic
private validateAction(itemType: ItemType): { valid: boolean; message?: string } {
  switch (this.action) {
    case 'quaff':
      if (itemType !== ItemType.POTION) {
        return { valid: false, message: 'You cannot drink that.' }
      }
    // ... 5 cases with validation logic
  }
}
```

**Impact**:
- Hard to test individual actions
- Hard to extend (add new item type = modify switch)
- Duplicate code with EatCommand
- Confusing naming (UseItemCommand + action vs QuaffPotionCommand)

---

### Problem Command #3: MoveCommand (263 lines)

**Status**: 🟡 MEDIUM - Good delegation BUT private methods contain logic

**File**: `src/commands/MoveCommand/MoveCommand.ts`

**Violations**:
1. `detectObstacle()` private method reimplements existing service methods
2. Message type determination logic (`msg.includes('fainting') ? 'critical' : 'warning'`)
3. Manual message aggregation with forEach loops

**Code Analysis**:
```typescript
// Lines 130-159: ❌ Private method duplicates service functionality
private detectObstacle(position: Position, level: Level) {
  // ❌ MovementService.getMonsterAt() already exists!
  const monster = level.monsters.find(
    (m) => m.position.x === position.x && m.position.y === position.y
  )
  if (monster) return { type: 'monster', data: monster }

  // ❌ DoorService.getDoorAt() already exists!
  const door = level.doors.find(
    (d) => d.position.x === position.x && d.position.y === position.y
  )

  // Complex door state checking (should be in service)
  if (door && (door.state === DoorState.CLOSED || /* ... */)) {
    return { type: 'door', data: door }
  }
}

// Lines 182-188, 239-245: ❌ Message type logic in command
messages.forEach((msg) => {
  finalMessages = this.messageService.addMessage(
    finalMessages,
    msg,
    msg.includes('fainting') ? 'critical' : 'warning',  // ❌ LOGIC!
    state.turnCount + 1
  )
})
```

**Impact**:
- Duplicate functionality (services already provide this)
- Hard to test obstacle detection in isolation
- Message type logic should be in service

---

### Problem Command #4: EatCommand (121 lines)

**Status**: 🟡 MEDIUM - Logic in command + Duplication

**File**: `src/commands/EatCommand/EatCommand.ts`

**Violations**:
1. `isImproving()` private method contains state comparison logic
2. Nutrition calculation in command
3. Message probability logic in command
4. Manual message generation with conditionals
5. Duplicates UseItemCommand 'eat' case

**Code Analysis**:
```typescript
// Lines 44: ❌ Nutrition calculation in command
const nutrition = this.random.nextInt(1100, 1499)

// Lines 64: ❌ Message probability in command
if (this.random.chance(0.3)) {
  messages = this.messageService.addMessage(
    messages,
    'Yuck, that food tasted awful!',
    'info',
    state.turnCount
  )
}

// Lines 76-94: ❌ Manual message generation
if (this.isImproving(oldState, newState)) {
  let improvementMessage = ''
  if (newState === HungerState.NORMAL) {
    improvementMessage = 'You feel satisfied.'
  } else if (newState === HungerState.HUNGRY && oldState === HungerState.WEAK) {
    improvementMessage = 'You feel a bit better.'
  }
  // ... more conditionals
}

// Lines 108-120: ❌ Private method with business logic
private isImproving(oldState: HungerState, newState: HungerState): boolean {
  const stateOrder = {
    [HungerState.STARVING]: 0,
    [HungerState.WEAK]: 1,
    [HungerState.HUNGRY]: 2,
    [HungerState.NORMAL]: 3,
  }
  return stateOrder[newState] > stateOrder[oldState]
}
```

**Impact**:
- Business logic untestable in isolation
- Duplicate of UseItemCommand 'eat' case
- Hard to change hunger improvement messages

---

### Problem Command #5: MoveStairsCommand (188 lines)

**Status**: 🟡 LOW - Minor logic issues

**File**: `src/commands/MoveStairsCommand/MoveStairsCommand.ts`

**Violations**:
1. `getRandomFloor()` private method with position calculation
2. Manual exploration marking with map operations
3. Manual turn increment (should use TurnService)

**Code Analysis**:
```typescript
// Lines 176-187: ❌ Private method with calculation logic
private getRandomFloor(level: Level): Position {
  if (level.rooms.length > 0) {
    const room = level.rooms[0]
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    }
  }
  return { x: Math.floor(level.width / 2), y: Math.floor(level.height / 2) }
}

// Lines 127-135: ❌ Manual exploration marking
explored: level.explored.map((row, y) =>
  row.map((explored, x) => {
    const key = `${x},${y}`
    return explored || visibleCells.has(key)
  })
)

// Line 155: ❌ Manual turn increment
turnCount: state.turnCount + 1  // Should use TurnService
```

**Impact**:
- Position calculation not reusable
- Exploration marking duplicates FOVService pattern
- Inconsistent turn handling

---

### Summary of Violations

| Command | LOC | Private Methods | Primary Issue |
|---------|-----|-----------------|---------------|
| SearchCommand | 138 | 0 (but should be in service) | No service layer |
| UseItemCommand | 217 | 1 (`validateAction`) | Violates SRP |
| MoveCommand | 263 | 2 (`detectObstacle`, `performMovement`) | Duplicates services |
| EatCommand | 121 | 1 (`isImproving`) | Logic + duplication |
| MoveStairsCommand | 188 | 1 (`getRandomFloor`) | Position calculation |

**Total Lines in Violation**: 927 lines (40% of command layer)

---

## Refactoring Phases

---

## Phase 1: Critical Fixes (Week 1)
**Goal**: Fix worst architectural violations (SearchCommand, UseItemCommand)

**Estimated Time**: 5-7 days
**Priority**: P0 - Critical
**Impact**: Removes 2 of 5 major violations

---

### Task 1.1: Create SearchService

**Priority**: P0 - Critical
**Estimated Time**: 2-3 days
**Files**:
- `src/services/SearchService/SearchService.ts` (new)
- `src/services/SearchService/index.ts` (new)
- `src/services/SearchService/secret-detection.test.ts` (new)
- `src/services/SearchService/trap-detection.test.ts` (new)
- `src/commands/SearchCommand/SearchCommand.ts` (refactor)

**Task**: ☐ Extract ALL search logic from SearchCommand to new SearchService

**Current Implementation** (SearchCommand.ts lines 16-137):
```typescript
// ❌ ALL logic in command
execute(state: GameState): GameState {
  const adjacentPositions = [
    { x: playerPos.x - 1, y: playerPos.y },
    // ... more positions
  ]

  for (const pos of adjacentPositions) {
    const secretDoor = level.doors.find(/*...*/)
    if (secretDoor) {
      const findChance = 0.5 + state.player.level * 0.05
      if (this.random.chance(findChance)) {
        const revealedDoor = { ...secretDoor, discovered: true }
        updatedDoors = updatedDoors.map(/*...*/)
        const updatedTiles = level.tiles.map((row) => [...row])
        const tile = updatedTiles[pos.y][pos.x]
        tile.char = '+'
        tile.walkable = true
        // ... 60 more lines
      }
    }

    // Check for traps (similar 40 lines)
  }
}
```

**Target Implementation**:

**SearchService.ts**:
```typescript
// src/services/SearchService/SearchService.ts

export interface SearchResult {
  found: boolean
  type: 'door' | 'trap' | null
  position: Position | null
  message: string
  updatedLevel: Level
}

export class SearchService {
  /**
   * Search for secrets (doors and traps) adjacent to player position
   */
  searchForSecrets(
    player: Player,
    playerPosition: Position,
    level: Level,
    random: IRandomService
  ): SearchResult {
    const adjacentPositions = this.getAdjacentPositions(playerPosition)

    // Check for secret doors first
    const doorResult = this.findSecretDoor(adjacentPositions, level, player, random)
    if (doorResult) {
      return doorResult
    }

    // Check for traps
    const trapResult = this.findTrap(adjacentPositions, level, player, random)
    if (trapResult) {
      return trapResult
    }

    // Nothing found
    return {
      found: false,
      type: null,
      position: null,
      message: 'You search but find nothing.',
      updatedLevel: level
    }
  }

  /**
   * Find secret door in adjacent positions
   */
  private findSecretDoor(
    adjacentPositions: Position[],
    level: Level,
    player: Player,
    random: IRandomService
  ): SearchResult | null {
    for (const pos of adjacentPositions) {
      const secretDoor = level.doors.find(
        (d) =>
          d.position.x === pos.x &&
          d.position.y === pos.y &&
          d.state === DoorState.SECRET &&
          !d.discovered
      )

      if (secretDoor) {
        const findChance = this.calculateFindChance(player.level)
        if (random.chance(findChance)) {
          const updatedLevel = this.revealSecretDoor(level, secretDoor)
          return {
            found: true,
            type: 'door',
            position: pos,
            message: 'You found a secret door!',
            updatedLevel
          }
        }
      }
    }
    return null
  }

  /**
   * Find trap in adjacent positions
   */
  private findTrap(
    adjacentPositions: Position[],
    level: Level,
    player: Player,
    random: IRandomService
  ): SearchResult | null {
    for (const pos of adjacentPositions) {
      const trap = level.traps.find(
        (t) => t.position.x === pos.x && t.position.y === pos.y && !t.discovered
      )

      if (trap) {
        const findChance = this.calculateFindChance(player.level)
        if (random.chance(findChance)) {
          const updatedLevel = this.revealTrap(level, trap)
          return {
            found: true,
            type: 'trap',
            position: pos,
            message: `You found a ${trap.type.toLowerCase()} trap!`,
            updatedLevel
          }
        }
      }
    }
    return null
  }

  /**
   * Calculate probability of finding secret (based on player level)
   * Base 50% + 5% per player level
   */
  private calculateFindChance(playerLevel: number): number {
    return 0.5 + playerLevel * 0.05
  }

  /**
   * Get positions adjacent to given position (4 cardinal directions)
   */
  private getAdjacentPositions(position: Position): Position[] {
    return [
      { x: position.x - 1, y: position.y }, // Left
      { x: position.x + 1, y: position.y }, // Right
      { x: position.x, y: position.y - 1 }, // Up
      { x: position.x, y: position.y + 1 }, // Down
    ]
  }

  /**
   * Reveal secret door by updating door and tile state
   */
  private revealSecretDoor(level: Level, secretDoor: Door): Level {
    // Update door to discovered
    const updatedDoors = level.doors.map((d) =>
      d.position.x === secretDoor.position.x && d.position.y === secretDoor.position.y
        ? { ...d, discovered: true }
        : d
    )

    // Update tile to show door
    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[secretDoor.position.y][secretDoor.position.x]
    tile.char = '+'
    tile.walkable = true
    tile.transparent = false

    return {
      ...level,
      doors: updatedDoors,
      tiles: updatedTiles
    }
  }

  /**
   * Reveal trap by marking as discovered
   */
  private revealTrap(level: Level, trap: Trap): Level {
    const updatedTraps = level.traps.map((t) =>
      t.position.x === trap.position.x && t.position.y === trap.position.y
        ? { ...t, discovered: true }
        : t
    )

    return {
      ...level,
      traps: updatedTraps
    }
  }
}
```

**Refactored SearchCommand.ts**:
```typescript
// src/commands/SearchCommand/SearchCommand.ts

import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { SearchService } from '@services/SearchService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

export class SearchCommand implements ICommand {
  constructor(
    private searchService: SearchService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // ✅ Delegate to service
    const result = this.searchService.searchForSecrets(
      state.player,
      state.player.position,
      level,
      // Note: Need to pass random service - add to constructor
    )

    // ✅ Simple orchestration
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, result.updatedLevel)

    const messageType = result.found ? 'success' : 'info'
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      messageType,
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      levels: updatedLevels,
      messages
    })
  }
}
```

**Subtasks**:
- ☑ Create SearchService with `searchForSecrets()` method
- ☑ Add `getAdjacentPositions()` helper
- ☑ Add `calculateFindChance()` method
- ☑ Add `findSecretDoor()` method
- ☑ Add `findTrap()` method
- ☑ Add `revealSecretDoor()` method (uses DoorService)
- ☑ Add `revealTrap()` method
- ☑ Create test: `secret-detection.test.ts` (20 tests)
  - ☑ Test adjacent position calculation (edge cases, corners)
  - ☑ Test find chance calculation (various player levels)
  - ☑ Test secret door detection (found/not found)
  - ☑ Test trap detection (found/not found)
  - ☑ Test tile updates on reveal
  - ☑ Test door state updates on reveal
- ☑ Create test: `trap-detection.test.ts` (12 tests)
- ☑ Refactor SearchCommand to use SearchService
- ☑ Update SearchCommand tests
- ☑ Run tests: `npm test SearchService && npm test SearchCommand`
- ☑ Manual gameplay test (search for secrets in game)

**Acceptance Criteria**:
- ✅ SearchCommand reduced from 138 → 49 lines (64% reduction)
- ✅ All search logic in SearchService
- ✅ No private methods in SearchCommand
- ✅ No loops in SearchCommand
- ✅ SearchService test coverage >90% (32 tests)
- ✅ All tests passing (1389 total, 32 new)
- ✅ Leverages existing DoorService.revealSecretDoor() method

**Completed**: 2025-10-05 (Commit: 72e1a57)

---

### Task 1.2: Split UseItemCommand into Focused Commands

**Priority**: P0 - Critical
**Estimated Time**: 3-4 days
**Files**:
- `src/commands/QuaffPotionCommand/QuaffPotionCommand.ts` (new)
- `src/commands/QuaffPotionCommand/index.ts` (new)
- `src/commands/ReadScrollCommand/ReadScrollCommand.ts` (new)
- `src/commands/ReadScrollCommand/index.ts` (new)
- `src/commands/ZapWandCommand/ZapWandCommand.ts` (new)
- `src/commands/ZapWandCommand/index.ts` (new)
- `src/commands/RefillLanternCommand/RefillLanternCommand.ts` (new)
- `src/commands/RefillLanternCommand/index.ts` (new)
- `src/commands/UseItemCommand/` (DELETE entire folder)
- `src/ui/InputHandler.ts` (update to use new commands)

**Task**: ☑ Split UseItemCommand into 5 focused commands (delete 'eat' case - use existing EatCommand)

**Current Structure** (UseItemCommand.ts):
```typescript
// ❌ One command with 5 actions
export type UseItemAction = 'quaff' | 'read' | 'zap' | 'eat' | 'refill'

class UseItemCommand {
  constructor(
    private itemId: string,
    private action: UseItemAction,  // ❌ Discriminator
    // 8 service dependencies
  ) {}

  execute(state: GameState): GameState {
    // Validation
    const validationResult = this.validateAction(item.type)  // ❌ Private method

    // ❌ Large switch statement
    switch (this.action) {
      case 'quaff': /* 14 lines */
      case 'read': /* 14 lines */
      case 'zap': /* 19 lines */
      case 'eat': /* 10 lines - DUPLICATE! */
      case 'refill': /* 18 lines */
    }
  }

  // ❌ Private validation method
  private validateAction(itemType: ItemType) { /*...*/ }
}
```

**Target Structure**:

#### 1. QuaffPotionCommand

**File**: `src/commands/QuaffPotionCommand/QuaffPotionCommand.ts`

```typescript
import { GameState, ItemType, Potion } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { PotionService } from '@services/PotionService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

/**
 * QUAFF POTION COMMAND - Drink a potion from inventory
 */
export class QuaffPotionCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private potionService: PotionService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    // 1. Find item in inventory
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 2. Type check (type-safe, no validation method needed)
    if (item.type !== ItemType.POTION) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot drink that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Apply potion effect via service
    const result = this.potionService.applyPotion(
      state.player,
      item as Potion,
      state
    )

    // 4. Remove potion from inventory
    const updatedPlayer = this.inventoryService.removeItem(
      result.player,
      this.itemId
    )

    // 5. Add message and increment turn
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages,
      isGameOver: result.death || state.isGameOver
    })
  }
}
```

#### 2. ReadScrollCommand

**File**: `src/commands/ReadScrollCommand/ReadScrollCommand.ts`

```typescript
import { GameState, ItemType, Scroll } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { ScrollService } from '@services/ScrollService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

/**
 * READ SCROLL COMMAND - Read a scroll from inventory
 */
export class ReadScrollCommand implements ICommand {
  constructor(
    private itemId: string,
    private targetItemId: string | undefined,  // For enchant scroll
    private inventoryService: InventoryService,
    private scrollService: ScrollService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    if (item.type !== ItemType.SCROLL) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot read that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Apply scroll effect
    const result = this.scrollService.applyScroll(
      state.player,
      item as Scroll,
      state,
      this.targetItemId
    )

    // Remove scroll from inventory (consumed)
    const updatedPlayer = this.inventoryService.removeItem(
      result.player,
      this.itemId
    )

    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages
    })
  }
}
```

#### 3. ZapWandCommand

**File**: `src/commands/ZapWandCommand/ZapWandCommand.ts`

```typescript
import { GameState, ItemType, Wand } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

/**
 * ZAP WAND COMMAND - Use a wand from inventory
 */
export class ZapWandCommand implements ICommand {
  constructor(
    private itemId: string,
    private targetItemId: string | undefined,
    private inventoryService: InventoryService,
    private wandService: WandService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    if (item.type !== ItemType.WAND) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot zap that.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Apply wand effect (decrements charges)
    const result = this.wandService.applyWand(
      state.player,
      item as Wand,
      state,
      this.targetItemId
    )

    // Update wand in inventory (charges changed)
    let updatedPlayer = this.inventoryService.removeItem(result.player, item.id)
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, result.wand)

    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'info',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages
    })
  }
}
```

#### 4. RefillLanternCommand

**File**: `src/commands/RefillLanternCommand/RefillLanternCommand.ts`

```typescript
import { GameState, ItemType, OilFlask } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { LightingService } from '@services/LightingService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

/**
 * REFILL LANTERN COMMAND - Use oil flask to refill lantern
 */
export class RefillLanternCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private lightingService: LightingService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    if (item.type !== ItemType.OIL_FLASK) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You cannot use that to refill a lantern.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Refill lantern
    const oilFlask = item as OilFlask
    const result = this.lightingService.refillPlayerLantern(
      state.player,
      oilFlask.fuelAmount
    )

    // Only remove oil if refill was successful
    const updatedPlayer = result.success
      ? this.inventoryService.removeItem(result.player, this.itemId)
      : result.player

    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      result.success ? 'success' : 'warning',
      state.turnCount
    )

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages
    })
  }
}
```

**Note**: The 'eat' case from UseItemCommand duplicates the existing `EatCommand`. We'll delete the 'eat' case and use EatCommand instead.

**UI Handler Updates**:

**Before** (InputHandler.ts):
```typescript
// ❌ UseItemCommand with action parameter
case 'q': // Quaff
  return new UseItemCommand(
    itemId,
    'quaff',  // ❌ Action discriminator
    inventoryService,
    messageService,
    potionService,
    scrollService,
    wandService,
    hungerService,
    lightingService,
    turnService
  )
```

**After** (InputHandler.ts):
```typescript
// ✅ Specific command for specific action
case 'q': // Quaff
  return new QuaffPotionCommand(
    itemId,
    inventoryService,
    potionService,
    messageService,
    turnService
  )

case 'r': // Read
  return new ReadScrollCommand(
    itemId,
    targetItemId,
    inventoryService,
    scrollService,
    messageService,
    turnService
  )

case 'z': // Zap
  return new ZapWandCommand(
    itemId,
    targetItemId,
    inventoryService,
    wandService,
    messageService,
    turnService
  )

case 'R': // Refill
  return new RefillLanternCommand(
    itemId,
    inventoryService,
    lightingService,
    messageService,
    turnService
  )
```

**Subtasks**:
- ☑ Create QuaffPotionCommand (~40 lines)
  - ☑ Add tests (5+ scenarios)
- ☑ Create ReadScrollCommand (~50 lines)
  - ☑ Add tests (6+ scenarios including enchant scroll)
- ☑ Create ZapWandCommand (~55 lines)
  - ☑ Add tests (6+ scenarios including no charges)
- ☑ Create RefillLanternCommand (~45 lines)
  - ☑ Add tests (5+ scenarios including no lantern)
- ☑ Update InputHandler to use new commands
  - ☑ Replace 'q' handler with QuaffPotionCommand
  - ☑ Replace 'r' handler with ReadScrollCommand
  - ☑ Replace 'z' handler with ZapWandCommand
  - ☑ Replace 'F' handler with RefillLanternCommand (Note: 'F' not 'R' in implementation)
  - ☑ Keep 'e' handler using existing EatCommand (NOT UseItemCommand)
- ☑ Delete entire UseItemCommand folder
- ☑ Remove UseItemCommand imports from UI
- ☑ Run tests: `npm test QuaffPotionCommand ReadScrollCommand ZapWandCommand RefillLanternCommand`
- ☐ Manual gameplay test (try each new command in game)

**Acceptance Criteria**:
- ✓ UseItemCommand deleted
- ✓ 4 new focused commands created (74-76 lines each, close to target)
- ✓ No action parameter needed (type-safe by construction)
- ✓ No private validation methods (inline checks)
- ✓ Each command has single responsibility
- ✓ All tests passing (21 tests across 4 test suites)
- ✓ Manual gameplay confirms all item usage works

**Completed**: 2025-10-05 (21 tests passing)

**Phase 1 Completion Checklist**:
- ☑ Task 1.1 complete (SearchService created)
- ☑ Task 1.2 complete (UseItemCommand split)
- ☑ SearchCommand reduced from 138 → 49 lines (64% reduction)
- ☑ UseItemCommand replaced with 4 focused commands (74-76 lines each)
- ☑ All tests passing (1389 base + 21 new = 1410 tests)
- ☐ Manual gameplay verification complete
- ☐ Git commit: "refactor: split UseItemCommand into focused single-responsibility commands (Phase 1 Task 1.2)"

---

## Phase 2: Service Enhancements (Week 2)
**Goal**: Remove remaining logic from commands via service enhancements

**Estimated Time**: 5-6 days
**Priority**: P1 - High
**Impact**: Removes logic from MoveCommand, EatCommand

---

### Task 2.1: Enhance MovementService with Obstacle Detection

**Priority**: P1 - High
**Estimated Time**: 1-2 days
**Files**:
- `src/services/MovementService/MovementService.ts` (enhance)
- `src/services/MovementService/obstacle-detection.test.ts` (new)
- `src/commands/MoveCommand/MoveCommand.ts` (simplify)

**Task**: ☑ Add `detectObstacle()` to MovementService, remove from MoveCommand

**Current State** (MoveCommand.ts lines 130-159):
```typescript
// ❌ Private method in command - duplicates service functionality
private detectObstacle(
  position: Position,
  level: Level
): { type: 'none' | 'monster' | 'door' | 'wall'; data?: any } {
  // ❌ MovementService.getMonsterAt() already exists!
  const monster = level.monsters.find(
    (m) => m.position.x === position.x && m.position.y === position.y
  )
  if (monster) return { type: 'monster', data: monster }

  // ❌ DoorService.getDoorAt() already exists (check this)
  const door = level.doors.find(
    (d) => d.position.x === position.x && d.position.y === position.y
  )

  // ❌ Complex door state logic should be in service
  if (
    door &&
    (door.state === DoorState.CLOSED ||
      door.state === DoorState.LOCKED ||
      (door.state === DoorState.SECRET && !door.discovered))
  ) {
    return { type: 'door', data: door }
  }

  // MovementService.isWalkable() call
  if (!this.movementService.isWalkable(position, level)) {
    return { type: 'wall' }
  }

  return { type: 'none' }
}
```

**Target Implementation**:

**Enhanced MovementService**:
```typescript
// src/services/MovementService/MovementService.ts

export interface ObstacleResult {
  type: 'none' | 'monster' | 'door' | 'wall'
  data?: Monster | Door
}

export class MovementService {
  // ✅ Consolidate obstacle detection
  detectObstacle(position: Position, level: Level): ObstacleResult {
    // Check for monster
    const monster = this.getMonsterAt(position, level)
    if (monster) {
      return { type: 'monster', data: monster }
    }

    // Check for blocking door
    const door = this.getDoorAt(position, level)
    if (door && this.isBlockingDoor(door)) {
      return { type: 'door', data: door }
    }

    // Check walkability
    if (!this.isWalkable(position, level)) {
      return { type: 'wall' }
    }

    return { type: 'none' }
  }

  /**
   * Check if door blocks movement
   */
  private isBlockingDoor(door: Door): boolean {
    return (
      door.state === DoorState.CLOSED ||
      door.state === DoorState.LOCKED ||
      (door.state === DoorState.SECRET && !door.discovered)
    )
  }

  /**
   * Get door at position (if any)
   */
  private getDoorAt(position: Position, level: Level): Door | null {
    return (
      level.doors.find(
        (d) => d.position.x === position.x && d.position.y === position.y
      ) || null
    )
  }

  // Existing methods...
  isWalkable(position: Position, level: Level): boolean { /*...*/ }
  getMonsterAt(position: Position, level: Level): Monster | undefined { /*...*/ }
  movePlayer(player: Player, newPosition: Position): Player { /*...*/ }
  applyDirection(position: Position, direction: Direction): Position { /*...*/ }
}
```

**Simplified MoveCommand**:
```typescript
// src/commands/MoveCommand/MoveCommand.ts

execute(state: GameState): GameState {
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  const newPosition = this.movementService.applyDirection(
    state.player.position,
    this.direction
  )

  // ✅ Use service method (no private method needed)
  const obstacle = this.movementService.detectObstacle(newPosition, level)

  // ROUTE 1: Monster → Delegate to AttackCommand
  if (obstacle.type === 'monster') {
    return new AttackCommand(
      obstacle.data.id,
      this.combatService,
      this.messageService,
      this.levelingService
    ).execute(state)
  }

  // ROUTE 2: Door → Handle based on state
  if (obstacle.type === 'door') {
    const door = obstacle.data

    if (door.state === DoorState.LOCKED) {
      const messages = this.messageService.addMessage(
        state.messages,
        'The door is locked.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // ... rest of door handling
  }

  // ROUTE 3: Wall → Blocked
  if (obstacle.type === 'wall') {
    const messages = this.messageService.addMessage(
      state.messages,
      "You can't go that way.",
      'info',
      state.turnCount
    )
    return { ...state, messages }
  }

  // ROUTE 4: Clear path → Normal movement
  return this.performMovement(state, newPosition, level)
}

// ✅ detectObstacle() private method REMOVED
```

**Subtasks**:
- ☑ Add `detectObstacle()` method to MovementService
- ☑ Add `isBlockingDoor()` private helper
- ☑ Add `getDoorAt()` private helper (or use DoorService if exists)
- ☑ Create test: `obstacle-detection.test.ts` (12+ tests)
  - ☑ Test monster detection
  - ☑ Test door detection (all door states)
  - ☑ Test wall detection
  - ☑ Test no obstacle
  - ☑ Test out of bounds
  - ☑ Test edge cases (corner positions)
- ☑ Remove `detectObstacle()` from MoveCommand
- ☑ Update MoveCommand to use service method
- ☑ Update MoveCommand tests
- ☑ Run tests: `npm test MovementService && npm test MoveCommand`

**Acceptance Criteria**:
- ✅ MovementService has `detectObstacle()` method
- ✅ MoveCommand has no `detectObstacle()` private method
- ✅ MoveCommand reduced by 36 lines (exceeded target!)
- ✅ All obstacle types correctly detected
- ✅ All tests passing (1421 total, 14 new)

**Completed**: 2025-10-05 (Commit: 3ff8f2b)

---

### Task 2.2: Enhance HungerService for Food Consumption

**Priority**: P1 - High
**Estimated Time**: 2-3 days
**Files**:
- `src/services/HungerService/HungerService.ts` (enhance)
- `src/services/HungerService/food-consumption.test.ts` (new)
- `src/commands/EatCommand/EatCommand.ts` (simplify)

**Task**: ☑ Move food consumption logic from EatCommand to HungerService

**Current State** (EatCommand.ts lines 44-94):
```typescript
// ❌ Nutrition calculation in command
const nutrition = this.random.nextInt(1100, 1499)

// ❌ Manual old/new state tracking
const oldState = this.hungerService.getHungerState(playerWithoutFood.hunger)
const result = this.hungerService.feed(playerWithoutFood, nutrition)
const newState = this.hungerService.getHungerState(result.player.hunger)

// ❌ Message generation in command
let messages = this.messageService.addMessage(/*...*/)

// ❌ Random message in command
if (this.random.chance(0.3)) {
  messages = this.messageService.addMessage(
    messages,
    'Yuck, that food tasted awful!',
    'info',
    state.turnCount
  )
}

// ❌ Improvement message logic in command
if (this.isImproving(oldState, newState)) {
  let improvementMessage = ''
  if (newState === HungerState.NORMAL) {
    improvementMessage = 'You feel satisfied.'
  } else if (newState === HungerState.HUNGRY && oldState === HungerState.WEAK) {
    improvementMessage = 'You feel a bit better.'
  } else if (newState === HungerState.WEAK && oldState === HungerState.STARVING) {
    improvementMessage = 'You feel slightly stronger.'
  }

  if (improvementMessage) {
    messages = this.messageService.addMessage(/*...*/)
  }
}

// ❌ Private method with business logic (lines 108-120)
private isImproving(oldState: HungerState, newState: HungerState): boolean {
  const stateOrder = {
    [HungerState.STARVING]: 0,
    [HungerState.WEAK]: 1,
    [HungerState.HUNGRY]: 2,
    [HungerState.NORMAL]: 3,
  }
  return stateOrder[newState] > stateOrder[oldState]
}
```

**Target Implementation**:

**Enhanced HungerService**:
```typescript
// src/services/HungerService/HungerService.ts

export interface FoodConsumptionResult {
  player: Player
  messages: Array<{ text: string; type: MessageType }>
  improved: boolean
}

export class HungerService {
  constructor(private random: IRandomService) {}

  /**
   * Consume food - handles nutrition calculation and improvement messages
   * @param player Player consuming food
   * @param explicitNutrition Optional explicit nutrition value (for items with set nutrition)
   */
  consumeFood(player: Player, explicitNutrition?: number): FoodConsumptionResult {
    // ✅ Nutrition calculation in service
    const nutrition = explicitNutrition || this.random.nextInt(1100, 1499)

    // Track old state
    const oldState = this.getHungerState(player.hunger)

    // Feed player
    const feedResult = this.feed(player, nutrition)
    const newState = this.getHungerState(feedResult.player.hunger)

    // ✅ Generate all messages in service
    const messages: Array<{ text: string; type: MessageType }> = []

    // Base eating message
    messages.push({
      text: 'You eat the food ration.',
      type: 'info'
    })

    // ✅ Random "yuck" message in service
    if (this.random.chance(0.3)) {
      messages.push({
        text: 'Yuck, that food tasted awful!',
        type: 'info'
      })
    }

    // ✅ Improvement messages in service
    const improved = this.isImproving(oldState, newState)
    if (improved) {
      const improvementMessage = this.generateImprovementMessage(oldState, newState)
      if (improvementMessage) {
        messages.push({
          text: improvementMessage,
          type: 'success'
        })
      }
    }

    return {
      player: feedResult.player,
      messages,
      improved
    }
  }

  /**
   * Check if hunger state is improving (getting better)
   */
  private isImproving(oldState: HungerState, newState: HungerState): boolean {
    const stateOrder = {
      [HungerState.STARVING]: 0,
      [HungerState.WEAK]: 1,
      [HungerState.HUNGRY]: 2,
      [HungerState.NORMAL]: 3,
    }
    return stateOrder[newState] > stateOrder[oldState]
  }

  /**
   * Generate improvement message based on state transition
   */
  private generateImprovementMessage(
    oldState: HungerState,
    newState: HungerState
  ): string | null {
    if (newState === HungerState.NORMAL) {
      return 'You feel satisfied.'
    }

    if (newState === HungerState.HUNGRY && oldState === HungerState.WEAK) {
      return 'You feel a bit better.'
    }

    if (newState === HungerState.WEAK && oldState === HungerState.STARVING) {
      return 'You feel slightly stronger.'
    }

    return null
  }

  // Existing methods...
  tickHunger(player: Player): HungerTickResult { /*...*/ }
  feed(player: Player, nutrition: number): FeedResult { /*...*/ }
  getHungerState(hunger: number): HungerState { /*...*/ }
  applyHungerEffects(player: Player): HungerEffects { /*...*/ }
}
```

**Simplified EatCommand**:
```typescript
// src/commands/EatCommand/EatCommand.ts

export class EatCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private hungerService: HungerService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    // 1. Find food in inventory
    const food = this.inventoryService.findItemByType(
      state.player,
      ItemType.FOOD
    )

    if (!food) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You have no food to eat.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 2. Remove food from inventory
    const playerWithoutFood = this.inventoryService.removeItem(
      state.player,
      food.id
    )

    // 3. ✅ Single service call - all logic in service
    const result = this.hungerService.consumeFood(playerWithoutFood)

    // 4. ✅ Simple message aggregation
    let messages = state.messages
    result.messages.forEach(msg => {
      messages = this.messageService.addMessage(
        messages,
        msg.text,
        msg.type,
        state.turnCount
      )
    })

    // 5. Return with turn increment
    return this.turnService.incrementTurn({
      ...state,
      player: result.player,
      messages
    })
  }

  // ✅ isImproving() private method REMOVED
}
```

**Subtasks**:
- ☑ Add `consumeFood()` method to HungerService
- ☑ Move `isImproving()` to HungerService (private)
- ☑ Add `generateImprovementMessage()` private helper
- ☑ Include nutrition calculation in service
- ☑ Include "yuck" message logic in service
- ☑ Create test: `food-consumption.test.ts` (15+ tests)
  - ☑ Test nutrition calculation (random range)
  - ☑ Test explicit nutrition (for specific items)
  - ☑ Test state improvements (all transitions)
  - ☑ Test improvement message generation
  - ☑ Test "yuck" message probability (~30%)
  - ☑ Test hunger capping at 2000
- ☑ Remove `isImproving()` from EatCommand
- ☑ Remove nutrition calculation from EatCommand
- ☑ Remove message logic from EatCommand
- ☑ Update EatCommand to use `consumeFood()`
- ☑ Update EatCommand tests
- ☑ Run tests: `npm test HungerService && npm test EatCommand`

**Acceptance Criteria**:
- ✅ HungerService has `consumeFood()` method
- ✅ EatCommand has no `isImproving()` private method
- ✅ EatCommand reduced from 121 → 64 lines (47% reduction!)
- ✅ All food consumption logic in service
- ✅ All tests passing (86 total, 17 new)
- ✅ Uses TurnService for turn increment

**Completed**: 2025-10-05 (86 tests passing, 17 new food-consumption tests)

---

### Task 2.3: Enhance Service Result Types with Message Metadata

**Priority**: P1 - High
**Estimated Time**: 1-2 days
**Files**:
- `src/services/HungerService/HungerService.ts`
- `src/services/LightingService/LightingService.ts`
- `src/commands/MoveCommand/MoveCommand.ts`
- All affected test files

**Task**: ✅ Change service results from `string[]` to `Message[]` with type

**Current Problem** (MoveCommand.ts lines 182-188):
```typescript
// ❌ Command determines message type based on content
messages.forEach((msg) => {
  finalMessages = this.messageService.addMessage(
    finalMessages,
    msg,
    msg.includes('fainting') ? 'critical' : 'warning',  // ❌ LOGIC!
    state.turnCount + 1
  )
})
```

**Target Implementation**:

**Enhanced Result Types**:
```typescript
// src/types/service-results.ts (or in each service file)

export interface Message {
  text: string
  type: 'info' | 'warning' | 'critical' | 'success' | 'combat'
}

// HungerService
export interface HungerTickResult {
  player: Player
  messages: Message[]  // ✅ Not string[]
  death?: DeathInfo
}

// LightingService
export interface FuelTickResult {
  player: Player
  messages: Message[]  // ✅ Not string[]
}

// SearchService (from Phase 1)
export interface SearchResult {
  found: boolean
  type: 'door' | 'trap' | null
  position: Position | null
  message: string  // Single message is OK
  messageType: MessageType  // ✅ Included
  updatedLevel: Level
}
```

**Updated HungerService**:
```typescript
// src/services/HungerService/HungerService.ts

tickHunger(player: Player): HungerTickResult {
  // ... hunger logic

  const messages: Message[] = []

  // ✅ Service determines message type
  const warning = this.generateHungerWarning(oldState, newState)
  if (warning) {
    messages.push({
      text: warning,
      type: 'warning'  // ✅ Service knows this is a warning
    })
  }

  if (newState === HungerState.STARVING) {
    finalPlayer = this.applyStarvationDamage(finalPlayer)
    messages.push({
      text: 'You are fainting from hunger!',
      type: 'critical'  // ✅ Service knows this is critical
    })

    if (finalPlayer.hp <= 0) {
      death = { cause: 'Died of starvation' }
    }
  }

  return { player: finalPlayer, messages, death }
}
```

**Updated LightingService**:
```typescript
// src/services/LightingService/LightingService.ts

tickFuel(player: Player): FuelTickResult {
  // ... fuel logic

  const messages: Message[] = []

  if (turnsRemaining === 50) {
    messages.push({
      text: 'Your light is getting dim.',
      type: 'warning'  // ✅ Service determines type
    })
  }

  if (turnsRemaining === 10) {
    messages.push({
      text: 'Your light is flickering!',
      type: 'critical'  // ✅ Service determines type
    })
  }

  if (turnsRemaining === 0) {
    messages.push({
      text: 'Your light goes out!',
      type: 'critical'  // ✅ Service determines type
    })
  }

  return { player: updatedPlayer, messages }
}
```

**Simplified MoveCommand**:
```typescript
// src/commands/MoveCommand/MoveCommand.ts

private performMovement(/*...*/): GameState {
  // ... movement logic

  // 2. Tick hunger
  const hungerResult = this.hungerService.tickHunger(player)
  player = hungerResult.player
  messages.push(...hungerResult.messages)  // ✅ Messages include type

  // ... death check

  // 3. Tick fuel
  const fuelResult = this.lightingService.tickFuel(player)
  const updatedPlayer = fuelResult.player
  messages.push(...fuelResult.messages)  // ✅ Messages include type

  // ... FOV, notifications

  // 7. ✅ Add messages without type determination
  let finalMessages = state.messages
  messages.forEach((msg) => {
    finalMessages = this.messageService.addMessage(
      finalMessages,
      msg.text,
      msg.type,  // ✅ Type comes from service!
      state.turnCount + 1
    )
  })

  // ... rest
}
```

**Subtasks**:
- ✅ Define `Message` interface (text + type)
- ✅ Update `HungerTickResult` to use `Message[]`
- ✅ Update `FuelTickResult` to use `Message[]`
- ✅ Update `FoodConsumptionResult` to use `Message[]` (from Task 2.2)
- ✅ Update HungerService to return typed messages
- ✅ Update LightingService to return typed messages
- ✅ Remove message type logic from MoveCommand
- ✅ Update all service tests for new result types
- ✅ Update MoveCommand tests
- ✅ Run tests: `npm test` (1438 tests passing)

**Acceptance Criteria**:
- ✓ All service results use `Message[]` with type
- ✓ No message type logic in commands
- ✓ Services determine appropriate message types
- ✓ All tests passing

**Completed**: 2025-10-05 (1438 tests passing, message type logic moved to services)

**Phase 2 Completion Checklist**:
- ✅ Task 2.1 complete (MovementService enhanced) - commit 3ff8f2b
- ✅ Task 2.2 complete (HungerService enhanced) - commit 8709ab7
- ✅ Task 2.3 complete (Message types in services) - commit 49cfa5c
- ✅ MoveCommand reduced by ~30 lines (263 → 230 lines)
- ✅ EatCommand reduced from 121 → 64 lines
- ✅ No message type logic in commands
- ✅ All tests passing (1438 tests)
- ✅ Phase 2 COMPLETE - All service enhancements done

**Phase 2 Completed**: 2025-10-05 (All tasks complete, 1438 tests passing)

---

## Phase 3: Polish (Week 3)
**Goal**: Final cleanup and consolidation

**Estimated Time**: 3-4 days
**Priority**: P2 - Medium
**Impact**: Minor improvements, consistency

---

### Task 3.1: Create LevelService for Level Manipulation

**Priority**: P2 - Medium
**Estimated Time**: 2 days
**Files**:
- `src/services/LevelService/LevelService.ts` (new, or enhance existing)
- `src/services/LevelService/index.ts` (new)
- `src/services/LevelService/spawn-position.test.ts` (new)
- `src/commands/MoveStairsCommand/MoveStairsCommand.ts` (simplify)

**Task**: ☐ Consolidate level manipulation patterns

**Note**: Check if LevelService or similar already exists. If so, enhance it. If not, create new service.

**Current State** (MoveStairsCommand.ts lines 176-187):
```typescript
// ❌ Private method with position calculation
private getRandomFloor(level: Level): Position {
  if (level.rooms.length > 0) {
    const room = level.rooms[0]
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
    }
  }
  return { x: Math.floor(level.width / 2), y: Math.floor(level.height / 2) }
}
```

**Target Implementation**:

**LevelService** (or enhance existing):
```typescript
// src/services/LevelService/LevelService.ts

export class LevelService {
  /**
   * Get spawn position for player entering level
   * Prefers provided position (e.g., opposite stairs), falls back to room center
   */
  getSpawnPosition(level: Level, preferredPosition?: Position): Position {
    // Use preferred if valid
    if (preferredPosition && this.isValidSpawnPosition(level, preferredPosition)) {
      return preferredPosition
    }

    // Fallback to center of first room
    if (level.rooms.length > 0) {
      return this.getRoomCenter(level.rooms[0])
    }

    // Ultimate fallback: level center
    return {
      x: Math.floor(level.width / 2),
      y: Math.floor(level.height / 2)
    }
  }

  /**
   * Check if position is valid for spawning
   */
  private isValidSpawnPosition(level: Level, position: Position): boolean {
    if (!this.isInBounds(position, level)) {
      return false
    }

    const tile = level.tiles[position.y][position.x]
    return tile.walkable
  }

  /**
   * Get center position of room
   */
  private getRoomCenter(room: Room): Position {
    return {
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2)
    }
  }

  /**
   * Remove item from level by ID
   */
  removeItemFromLevel(level: Level, itemId: string): Level {
    return {
      ...level,
      items: level.items.filter(item => item.id !== itemId)
    }
  }

  /**
   * Update specific level in game state
   */
  updateLevel(
    state: GameState,
    levelNumber: number,
    updater: (level: Level) => Level
  ): GameState {
    const level = state.levels.get(levelNumber)
    if (!level) return state

    const updatedLevel = updater(level)
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(levelNumber, updatedLevel)

    return {
      ...state,
      levels: updatedLevels
    }
  }

  private isInBounds(position: Position, level: Level): boolean {
    return (
      position.x >= 0 &&
      position.x < level.width &&
      position.y >= 0 &&
      position.y < level.height
    )
  }
}
```

**Simplified MoveStairsCommand**:
```typescript
// src/commands/MoveStairsCommand/MoveStairsCommand.ts

private moveToLevel(
  state: GameState,
  newDepth: number,
  direction: 'up' | 'down'
): GameState {
  // ... level generation logic

  // ✅ Use service method (no private method needed)
  const spawnPos = this.levelService.getSpawnPosition(
    level,
    direction === 'down' ? level.stairsUp : level.stairsDown
  )

  // ... rest of method
}

// ✅ getRandomFloor() private method REMOVED
```

**Subtasks**:
- ☐ Create (or enhance) LevelService
- ☐ Add `getSpawnPosition()` method
- ☐ Add `removeItemFromLevel()` helper
- ☐ Add `updateLevel()` helper
- ☐ Create test: `spawn-position.test.ts` (10+ tests)
  - ☐ Test preferred position (valid stairs)
  - ☐ Test fallback to room center
  - ☐ Test fallback to level center
  - ☐ Test invalid preferred position
  - ☐ Test edge cases (no rooms, empty level)
- ☐ Remove `getRandomFloor()` from MoveStairsCommand
- ☐ Update MoveStairsCommand to use service
- ☐ Consider using `removeItemFromLevel()` in PickUpCommand
- ☐ Run tests: `npm test LevelService && npm test MoveStairsCommand`

**Acceptance Criteria**:
- ✓ LevelService (or enhanced existing) has spawn logic
- ✓ MoveStairsCommand has no `getRandomFloor()` method
- ✓ Spawn position logic reusable across commands
- ✓ All tests passing

---

### Task 3.2: Enhance FOVService with Exploration Marking

**Priority**: P2 - Medium
**Estimated Time**: 1 day
**Files**:
- `src/services/FOVService/FOVService.ts` (check if already has this)
- `src/commands/MoveStairsCommand/MoveStairsCommand.ts` (simplify)

**Task**: ☐ Check if `updateExploredTiles()` exists in FOVService, if not add it

**Current State** (MoveStairsCommand.ts lines 127-135):
```typescript
// ❌ Manual exploration marking in command
const updatedLevel = {
  ...level,
  explored: level.explored.map((row, y) =>
    row.map((explored, x) => {
      const key = `${x},${y}`
      return explored || visibleCells.has(key)
    })
  ),
}
```

**Check Existing FOVService**:
```bash
# Check if updateExploredTiles already exists
grep "updateExploredTiles" src/services/FOVService/FOVService.ts
```

**If NOT exists, add to FOVService**:
```typescript
// src/services/FOVService/FOVService.ts

/**
 * Update explored tiles based on visible cells
 * (May already exist from Phase 1 of service refactor)
 */
updateExploredTiles(level: Level, visibleCells: Set<string>): Level {
  const updatedExplored = level.explored.map((row, y) =>
    row.map((explored, x) => {
      const key = `${x},${y}`
      return explored || visibleCells.has(key)
    })
  )

  return {
    ...level,
    explored: updatedExplored
  }
}
```

**Simplified MoveStairsCommand**:
```typescript
// src/commands/MoveStairsCommand/MoveStairsCommand.ts

private moveToLevel(/*...*/): GameState {
  // ... compute FOV
  const visibleCells = this.fovService.computeFOV(spawnPos, lightRadius, level)

  // ✅ Use service method
  const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
  levels.set(newDepth, updatedLevel)

  // ... rest
}
```

**Subtasks**:
- ☐ Check if `updateExploredTiles()` exists in FOVService
- ☐ If not, add method to FOVService
- ☐ If yes, verify it matches MoveStairsCommand usage
- ☐ Remove manual exploration marking from MoveStairsCommand
- ☐ Update MoveStairsCommand to use service method
- ☐ Run tests: `npm test FOVService && npm test MoveStairsCommand`

**Acceptance Criteria**:
- ✓ FOVService has `updateExploredTiles()` method
- ✓ MoveStairsCommand uses service method
- ✓ No manual map() operations in MoveStairsCommand
- ✓ All tests passing

---

### Task 3.3: TurnService Consistency

**Priority**: P3 - Low
**Estimated Time**: 1 day
**Files**:
- All command files

**Task**: ☐ Replace all manual turn increments with TurnService

**Current Issues**:
```typescript
// ❌ Manual turn increment in some commands
return {
  ...state,
  turnCount: state.turnCount + 1
}

// ✅ Should use TurnService everywhere
return this.turnService.incrementTurn({...})
```

**Search and Replace**:
```bash
# Find all manual turn increments
grep -r "turnCount: state.turnCount + 1" src/commands/
grep -r "turnCount: state.turnCount - 1" src/commands/
```

**Subtasks**:
- ☐ Search for manual turn increments in all commands
- ☐ Replace with `this.turnService.incrementTurn()`
- ☐ Verify TurnService is injected in all affected commands
- ☐ Run tests: `npm test`

**Acceptance Criteria**:
- ✓ No manual `turnCount + 1` in commands
- ✓ All commands use TurnService consistently
- ✓ All tests passing

**Phase 3 Completion Checklist**:
- ☐ Task 3.1 complete (LevelService created/enhanced)
- ☐ Task 3.2 complete (FOVService exploration method confirmed)
- ☐ Task 3.3 complete (TurnService consistency)
- ☐ MoveStairsCommand simplified
- ☐ All manual turn increments replaced
- ☐ All tests passing
- ☐ Git commit: "refactor: final command cleanup and consolidation (Command Refactor Phase 3)"

---

## Testing Strategy

### Test Organization

**Service Tests** (New):
- `SearchService/secret-detection.test.ts` - Secret door finding logic
- `SearchService/trap-detection.test.ts` - Trap finding logic
- `MovementService/obstacle-detection.test.ts` - Comprehensive obstacle detection
- `HungerService/food-consumption.test.ts` - Food eating logic
- `LevelService/spawn-position.test.ts` - Spawn position calculation

**Command Tests** (Updated):
- All existing command tests updated to reflect simpler commands
- New command tests for split commands (QuaffPotionCommand, etc.)
- Integration tests to verify orchestration

### Coverage Goals

**Service Coverage**:
- SearchService: >90% (all game logic covered)
- Enhanced MovementService: >85%
- Enhanced HungerService: >85%
- LevelService: >80%

**Command Coverage**:
- All commands: >80% (focus on orchestration paths)
- New commands: >85% (simpler, easier to test)

### Test Types

**Unit Tests** (Service Logic):
```typescript
// Example: SearchService probability calculation
test('calculateFindChance returns correct probability', () => {
  const service = new SearchService()

  expect(service['calculateFindChance'](1)).toBe(0.55)  // 50% + 5%
  expect(service['calculateFindChance'](5)).toBe(0.75)  // 50% + 25%
  expect(service['calculateFindChance'](10)).toBe(1.0)  // 50% + 50% (capped)
})
```

**Integration Tests** (Command Orchestration):
```typescript
// Example: QuaffPotionCommand delegates to services
test('QuaffPotionCommand applies potion via service', () => {
  const command = new QuaffPotionCommand(/*...*/)
  const state = createTestState()

  const result = command.execute(state)

  // Verify orchestration (not logic)
  expect(result.player.inventory).not.toContain(potion)
  expect(result.messages).toHaveLength(2)  // Effect message + turn
  expect(result.turnCount).toBe(1)
})
```

**Regression Tests**:
- Verify all existing gameplay scenarios still work
- Secret door discovery
- Item usage (all types)
- Movement and combat
- Eating and hunger

### Manual Testing Checklist

After each phase, manually verify:
- ☐ Search command finds secret doors
- ☐ Search command finds traps
- ☐ Quaff potion command works
- ☐ Read scroll command works
- ☐ Zap wand command works
- ☐ Refill lantern command works
- ☐ Eat command works
- ☐ Movement with obstacles works
- ☐ Stairs navigation works
- ☐ All messages display correctly
- ☐ Turn counter increments properly

---

## Implementation Guidelines

### Git Commit Strategy

**After Each Task**:
```bash
# Run tests
npm test

# Check coverage
npm run test:coverage

# Commit with descriptive message
git add .
git commit -m "feat: create SearchService and refactor SearchCommand (Phase 1 Task 1.1)

- Extract all search logic to SearchService
- SearchCommand reduced from 138 → 60 lines
- Add probability calculation to service
- Add adjacent position calculation to service
- Add secret reveal logic to service

Tests: All passing (1357 + 25 new)
Coverage: 91% SearchService, 85% SearchCommand"
```

**After Each Phase**:
```bash
git commit -m "feat: complete Command Refactor Phase 1

Phase 1: Critical Fixes
- Task 1.1: SearchService created (138 → 60 lines)
- Task 1.2: UseItemCommand split into 4 commands

Impact:
- 2 of 5 violations fixed
- Commands with private methods: 6 → 4
- New services: SearchService
- New commands: QuaffPotionCommand, ReadScrollCommand, ZapWandCommand, RefillLanternCommand
- Deleted: UseItemCommand

Tests: All passing (1357 + 50 new = 1407)
Coverage: 88%"
```

### Code Style

**Service Methods Should**:
- Have clear, descriptive names (calculateFindChance, not calc)
- Return complete results (SearchResult, not boolean)
- Include all messages with types
- Be testable in isolation

**Command Methods Should**:
- Be mostly `execute()` only
- Delegate to services
- Assemble final state
- Have minimal conditionals (routing only)

**Avoid**:
- Private methods with logic in commands
- Loops with complex logic in commands
- Calculations in commands
- String inspection for message types

### Code Review Checklist

Before marking task complete:
- ☐ No private methods with logic in commands
- ☐ All business logic in services
- ☐ Commands are simple orchestration
- ☐ Service results are complete (no manual checking)
- ☐ Message types determined by services
- ☐ All tests passing
- ☐ Coverage meets goals (>80% commands, >85% services)
- ☐ Manual gameplay verification complete
- ☐ Git commit created with descriptive message

---

## Success Metrics

### Quantitative Metrics

**Before Refactoring**:
| Metric | Current |
|--------|---------|
| Commands with violations | 5 |
| Commands with private methods | 6 |
| Average command LOC | 96 |
| Max command LOC | 263 |
| Service coverage | 75% |
| Lines in violation | 927 |

**After Phase 1**:
| Metric | Target |
|--------|--------|
| Commands with violations | 3 |
| Commands with private methods | 4 |
| Average command LOC | 88 |
| Max command LOC | 263 |
| Service coverage | 85% |

**After Phase 2**:
| Metric | Target |
|--------|--------|
| Commands with violations | 1 |
| Commands with private methods | 1 |
| Average command LOC | 75 |
| Max command LOC | 233 |
| Service coverage | 90% |

**After Phase 3** (Final):
| Metric | Target |
|--------|--------|
| Commands with violations | 0 ✅ |
| Commands with private methods | 0 ✅ |
| Average command LOC | 68 ✅ |
| Max command LOC | <150 ✅ |
| Service coverage | 95% ✅ |

### Qualitative Metrics

**Phase 1 Success**:
- ✓ Search logic fully extracted to service
- ✓ UseItemCommand split into focused commands
- ✓ Single Responsibility Principle followed
- ✓ No action discriminators

**Phase 2 Success**:
- ✓ No duplicate service functionality in commands
- ✓ Message types determined by services
- ✓ All state comparison logic in services

**Phase 3 Success**:
- ✓ Consistent service usage across all commands
- ✓ No manual turn increments
- ✓ Level manipulation consolidated

**Overall Success**:
- ✓ Commands orchestrate ONLY
- ✓ All business logic in services
- ✓ SOLID principles compliance
- ✓ Easy to test (smaller units)
- ✓ Easy to extend (add new commands without modifying existing)
- ✓ Self-documenting (command names are clear verbs)

---

## Reference Examples

### Good Command Pattern

**Characteristics**:
- Simple, focused responsibility
- Delegates to services
- Minimal conditionals (routing only)
- No private methods with logic
- Clear orchestration flow

**Example: QuaffPotionCommand** (after refactor):
```typescript
class QuaffPotionCommand implements ICommand {
  execute(state: GameState): GameState {
    // 1. Validate (simple checks)
    const item = this.inventoryService.findItem(state.player, this.itemId)
    if (!item || item.type !== ItemType.POTION) {
      return this.addErrorMessage(state)
    }

    // 2. Delegate to service
    const result = this.potionService.applyPotion(state.player, item, state)

    // 3. Orchestrate state changes
    const updatedPlayer = this.inventoryService.removeItem(result.player, this.itemId)

    // 4. Assemble final state
    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages: this.addMessage(state.messages, result.message)
    })
  }
}
```

### Good Service Pattern

**Characteristics**:
- Complete result types
- All business logic encapsulated
- Testable in isolation
- Clear method names
- Deterministic (testable with MockRandom)

**Example: SearchService** (after refactor):
```typescript
class SearchService {
  searchForSecrets(
    player: Player,
    position: Position,
    level: Level,
    random: IRandomService
  ): SearchResult {
    // ✅ Clear orchestration in service
    const adjacentPositions = this.getAdjacentPositions(position)
    const doorResult = this.findSecretDoor(adjacentPositions, level, player, random)
    if (doorResult) return doorResult

    const trapResult = this.findTrap(adjacentPositions, level, player, random)
    if (trapResult) return trapResult

    // ✅ Complete result
    return {
      found: false,
      type: null,
      position: null,
      message: 'You search but find nothing.',
      updatedLevel: level
    }
  }

  // ✅ Private methods contain business logic (OK in service!)
  private calculateFindChance(playerLevel: number): number {
    return 0.5 + playerLevel * 0.05
  }
}
```

### Anti-Patterns to Avoid

**❌ Logic in Command**:
```typescript
// BAD: Calculation in command
class SearchCommand {
  execute(state: GameState): GameState {
    const findChance = 0.5 + state.player.level * 0.05  // ❌
    if (this.random.chance(findChance)) { /*...*/ }
  }
}
```

**❌ Private Method with Logic in Command**:
```typescript
// BAD: Private method in command
class EatCommand {
  execute(state: GameState): GameState { /*...*/ }

  private isImproving(old: State, new: State): boolean {  // ❌
    // Complex state comparison
  }
}
```

**❌ Switch Statement for Responsibilities**:
```typescript
// BAD: One command, many responsibilities
class UseItemCommand {
  execute(state: GameState): GameState {
    switch (this.action) {  // ❌ SRP violation
      case 'quaff': /*...*/
      case 'read': /*...*/
      // ...
    }
  }
}
```

**❌ Incomplete Service Results**:
```typescript
// BAD: Command must determine message type
interface HungerResult {
  player: Player
  messages: string[]  // ❌ Missing type info
}

// Command forced to inspect strings
messages.forEach(msg => {
  const type = msg.includes('fainting') ? 'critical' : 'warning'  // ❌
})
```

---

## References

**SOLID Principles**:
- Martin, Robert C. "Clean Code: A Handbook of Agile Software Craftsmanship" (2008)
- Martin, Robert C. "Clean Architecture: A Craftsman's Guide to Software Structure and Design" (2017)

**Command Pattern**:
- Gamma et al. "Design Patterns: Elements of Reusable Object-Oriented Software" (1994)
- Fowler, Martin "Patterns of Enterprise Application Architecture" (2002)

**Roguelike Architecture**:
- NetHack source code - src/cmd.c (command structure)
- Dungeon Crawl Stone Soup - source/command.cc (command architecture)
- Brogue source code - src/brogue/Buttons.c (input handling)

**Clean Code Metrics**:
- Martin, Robert C. "Agile Software Development, Principles, Patterns, and Practices" (2002)
- McConnell, Steve "Code Complete" (2004)

**Testing**:
- Beck, Kent "Test Driven Development: By Example" (2002)
- Meszaros, Gerard "xUnit Test Patterns" (2007)

---

## Appendix: Command Inventory

### Commands Requiring Refactoring (5)

| Command | LOC | Issue | Phase |
|---------|-----|-------|-------|
| SearchCommand | 138 | No service layer | Phase 1 |
| UseItemCommand | 217 | Violates SRP | Phase 1 |
| MoveCommand | 263 | Private methods | Phase 2 |
| EatCommand | 121 | Logic + duplication | Phase 2 |
| MoveStairsCommand | 188 | Private methods | Phase 3 |

### Well-Architected Commands (18)

| Command | LOC | Status |
|---------|-----|--------|
| AttackCommand | 127 | ✅ Good delegation |
| PickUpCommand | 87 | ✅ Minimal logic |
| EquipCommand | 103 | ✅ Good orchestration |
| UnequipCommand | 61 | ✅ Simple |
| DropCommand | 88 | ✅ Focused |
| OpenDoorCommand | 60 | ✅ Excellent example |
| CloseDoorCommand | 60 | ✅ Excellent example |
| QuitCommand | 30 | ✅ Simple |
| SaveCommand | 44 | ✅ Simple |
| RevealMapCommand | 22 | ✅ Debug tool |
| KillAllMonstersCommand | 22 | ✅ Debug tool |
| SpawnMonsterCommand | 23 | ✅ Debug tool |
| ToggleGodModeCommand | 23 | ✅ Debug tool |
| ToggleFOVDebugCommand | 23 | ✅ Debug tool |
| ToggleAIDebugCommand | 23 | ✅ Debug tool |
| TogglePathDebugCommand | 23 | ✅ Debug tool |
| ToggleDebugConsoleCommand | 22 | ✅ Debug tool |
| WakeAllMonstersCommand | 23 | ✅ Debug tool |

---

**END OF PLAN**

**Status**: Ready for implementation
**Next Step**: Begin Phase 1, Task 1.1 (Create SearchService)
