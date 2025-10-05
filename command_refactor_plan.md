# Command Refactoring Plan - Architecture Compliance

**Status**: Ready for Execution with Turn Management Architecture
**Created**: 2025-10-04
**Updated**: 2025-10-05
**Estimated Total Time**: 11-15 hours (7 hours if parallelized)
**Current Test Count**: 1276 tests passing

---

## Executive Summary

### Problem Statement

Multiple commands violate our core architecture principle: **"Commands orchestrate, services contain logic"**. We have identified ~723 lines of business logic embedded in 7 command files that should be extracted to services.

### Critical Bug Discovered

**Bug**: Bump-to-attack combat (via `CombatService.executeBumpAttack()`) does NOT integrate with `LevelingService`, causing bump-attacks to award XP but never trigger level-ups.

**Root Cause**: The recent refactoring created duplicate combat logic instead of delegating to `AttackCommand`, which has the correct level-up integration.

**Impact**: Players can kill monsters by bumping into them without ever leveling up.

### Architecture Violations

| Command | Lines | Violation | Should Delegate To |
|---------|-------|-----------|-------------------|
| `UseItemCommand` | 535 | Item effect logic (409 lines) | `ItemEffectService` |
| `MoveCommand` | 410 | Bump-to-attack, bump-to-open-door | `AttackCommand` (delegate), `DoorService` (use) |
| `SearchCommand` | 138 | Discovery mechanics (97 lines) | `SearchService` |
| `OpenDoorCommand` | 115 | Door state manipulation | `DoorService` |
| `CloseDoorCommand` | 123 | Door state manipulation | `DoorService` |
| `CombatService.executeBumpAttack` | 90 | DUPLICATE logic - DELETE | N/A (delete method) |

### Solution Overview

1. **Create 3 new services** with comprehensive business logic
2. **Refactor 7 commands** to pure orchestration
3. **Delete duplicate logic** (`executeBumpAttack()`)
4. **Fix level-up bug** by delegating to `AttackCommand`
5. **Establish turn management architecture** for proper delegation
6. **Maintain >80% test coverage** with +49 new tests

---

## 🎯 Turn Management Architecture (NEW SECTION)

### The Challenge

When commands delegate to other commands, both might attempt to increment the turn counter, causing **double turn increments**:

```typescript
// ❌ PROBLEM: Double turn increment
class MoveCommand {
  execute(state: GameState): GameState {
    const attackCmd = new AttackCommand(...)
    const newState = attackCmd.execute(state)  // ← Increments to N+1
    return { ...newState, turnCount: newState.turnCount + 1 }  // ← Increments to N+2 (WRONG!)
  }
}
```

Additionally:
- Direct command execution (user presses 'a' to attack) should increment turn ✓
- Delegated execution (bump-to-attack) should also increment turn, but only once ✓
- Commands must work in both contexts without modification ✓

### Core Principles

#### Principle 1: Turn Ownership
**The command that performs the primary action owns the turn increment.**

- `AttackCommand` executes direct attack → `AttackCommand` increments turn ✓
- `MoveCommand` delegates to `AttackCommand` → `AttackCommand` still increments turn ✓
- `MoveCommand` does normal move → `MoveCommand` increments turn ✓

#### Principle 2: Early Return Strategy
**Delegating commands use early return to avoid double increment:**

```typescript
// ✅ SOLUTION: Early return after delegation
class MoveCommand {
  execute(state: GameState): GameState {
    if (monster) {
      const attackCmd = new AttackCommand(monster.id, services...)
      return attackCmd.execute(state)  // ← Early return, no additional increment
    }

    // Normal movement path
    // ... movement logic ...
    return { ...newState, turnCount: state.turnCount + 1 }  // ← Only increments for movement
  }
}
```

#### Principle 3: Service vs Command Delegation
**Use services for logic, commands for complete actions:**

| Scenario | Pattern | Reason |
|----------|---------|--------|
| Bump-to-attack | Delegate to `AttackCommand` | Attack is a complete action (combat + XP + level-up) |
| Bump-to-open-door | Use `DoorService` | Door opening is part of movement action |
| Explicit open door | Execute `OpenDoorCommand` | Opening door IS the complete action |

#### Principle 4: Hunger/Fuel Ticking Policy

**Tick hunger/fuel ONLY when player moves:**

| Action | Movement? | Tick Hunger/Fuel? | Turn Increment? |
|--------|-----------|-------------------|-----------------|
| Bump-to-attack | No (combat in place) | ❌ No | ✅ Yes (by AttackCommand) |
| Bump-to-open-door | Yes (move through door) | ✅ Yes | ✅ Yes (by MoveCommand) |
| Normal move | Yes | ✅ Yes | ✅ Yes (by MoveCommand) |
| Explicit attack | No | ❌ No | ✅ Yes (by AttackCommand) |
| Explicit open door | No | ❌ No | ✅ Yes (by OpenDoorCommand) |
| Bump into wall | No (blocked) | ❌ No | ❌ No turn consumed |

---

## Architecture Pattern: Default Action Delegation (UPDATED)

### Core Principle

When a player bumps into an obstacle, the system should:
1. **Detect** what obstacle is blocking movement
2. **Route** to appropriate handler:
   - **Command delegation**: For complete actions (attack)
   - **Service usage**: For sub-actions within movement (door opening)
3. **Execute** with correct turn/hunger/fuel handling

### Pattern 1: Bump-to-Attack (Command Delegation)

```typescript
// ✅ CORRECT: Delegate to AttackCommand with early return
execute(state: GameState): GameState {
  const newPosition = this.movementService.applyDirection(...)
  const obstacle = this.detectObstacle(newPosition, level)

  if (obstacle.type === 'monster') {
    // Delegate to AttackCommand - it handles everything
    const attackCommand = new AttackCommand(
      obstacle.data.id,  // ← Pass monster.id (CRITICAL)
      this.combatService,
      this.messageService,
      this.levelingService
    )
    return attackCommand.execute(state)  // ← Early return
    // ✓ AttackCommand increments turn
    // ✓ No hunger/fuel tick (no movement)
    // ✓ XP and level-up handled correctly
  }

  // ... other cases ...
}
```

**Why this works**:
- `AttackCommand` is a **complete action** (combat + XP + level-up + messages)
- Early return prevents double turn increment
- No hunger/fuel tick (correct behavior - combat happens in place)
- Reuses ALL existing AttackCommand logic (including level-up)

### Pattern 2: Bump-to-Open-Door (Service Usage + Movement)

```typescript
// ✅ CORRECT: Use DoorService, then continue with movement
execute(state: GameState): GameState {
  const newPosition = this.movementService.applyDirection(...)
  const obstacle = this.detectObstacle(newPosition, level)

  if (obstacle.type === 'door' && obstacle.data.state === DoorState.CLOSED) {
    // Open door via DoorService (sub-action, no turn increment)
    const level = state.levels.get(state.currentLevel)!
    const updatedLevel = this.doorService.openDoor(level, obstacle.data)

    const stateWithOpenDoor = {
      ...state,
      levels: new Map(state.levels).set(state.currentLevel, updatedLevel)
    }

    // Add door-opening message
    const messages = this.messageService.addMessage(
      stateWithOpenDoor.messages,
      'You open the door.',
      'info',
      state.turnCount + 1  // ← Message for the turn about to happen
    )

    // Continue with movement logic (hunger, fuel, FOV, turn increment)
    return this.performMovement(
      { ...stateWithOpenDoor, messages },
      newPosition
    )
  }

  // ... other cases ...
}
```

**Why this works**:
- Door opening is a **sub-action** within the movement action
- `DoorService.openDoor()` does NOT increment turn (it's a pure logic service)
- Player moves through the door (hunger/fuel tick = correct)
- `performMovement()` increments turn exactly once

### Pattern 3: Wall Bump (No Action)

```typescript
// ✅ CORRECT: Early return with message, no turn increment
execute(state: GameState): GameState {
  const obstacle = this.detectObstacle(newPosition, level)

  if (obstacle.type === 'wall' || !this.movementService.isWalkable(newPosition, level)) {
    const messages = this.messageService.addMessage(
      state.messages,
      "You can't go that way.",
      'info',
      state.turnCount  // ← Message for current turn (no increment)
    )
    return { ...state, messages }  // ← Early return, NO turn increment
  }

  // ... other cases ...
}
```

**Why this works**:
- Bumping into a wall is NOT an action
- No turn consumed
- Message uses current turn count (not +1)

### Pattern 4: Normal Movement

```typescript
// ✅ CORRECT: Full movement with turn increment
execute(state: GameState): GameState {
  const newPosition = this.movementService.applyDirection(...)
  const obstacle = this.detectObstacle(newPosition, level)

  if (obstacle.type === 'none') {
    return this.performMovement(state, newPosition)
  }

  // ... handle obstacles ...
}

private performMovement(state: GameState, position: Position): GameState {
  // 1. Move player
  let player = this.movementService.movePlayer(state.player, position)

  // 2. Tick hunger
  if (this.hungerService) {
    const oldState = this.hungerService.getHungerState(player.hunger)
    player = this.hungerService.tickHunger(player)
    const newState = this.hungerService.getHungerState(player.hunger)

    // Handle hunger warnings, starvation death, etc.
    // ...
  }

  // 3. Tick light fuel
  if (player.equipment.lightSource) {
    const tickedLight = this.lightingService.tickFuel(player.equipment.lightSource)
    player = {
      ...player,
      equipment: { ...player.equipment, lightSource: tickedLight }
    }

    // Handle fuel warnings
    // ...
  }

  // 4. Recompute FOV
  const lightRadius = this.lightingService.getLightRadius(player.equipment.lightSource)
  const visibleCells = this.fovService.computeFOV(position, lightRadius, level)

  // 5. Update explored tiles
  const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

  // 6. Generate notifications
  const notifications = this.notificationService?.generateNotifications(...) || []

  // 7. Add all messages
  let messages = state.messages
  // ... add hunger warnings, fuel warnings, notifications ...

  // 8. Return with turn increment
  return {
    ...state,
    player,
    visibleCells,
    levels: new Map(state.levels).set(state.currentLevel, updatedLevel),
    messages,
    turnCount: state.turnCount + 1  // ← Single turn increment
  }
}
```
## Detailed Architecture Violations

### Violation 1: MoveCommand - Bump-to-Attack Logic

**File**: `src/commands/MoveCommand/MoveCommand.ts`
**Lines**: 84-169
**Issue**: Contains 86 lines of combat execution logic

**Current Code** (lines 100-168):
```typescript
// Execute combat
const result = this.combatService.playerAttack(state.player, monster)
let messages = state.messages

if (result.hit) {
  messages = this.messageService.addMessage(
    messages,
    `You hit the ${result.defender} for ${result.damage} damage!`,
    'combat',
    state.turnCount
  )

  if (result.killed) {
    messages = this.messageService.addMessage(
      messages,
      `You killed the ${result.defender}!`,
      'success',
      state.turnCount
    )

    // Remove monster and award XP
    const updatedMonsters = level.monsters.filter((m) => m.id !== monster.id)
    const xp = this.combatService.calculateXP(monster)

    // BUG: No LevelingService integration!
    const updatedPlayer = {
      ...state.player,
      position: newPosition,
      xp: state.player.xp + xp,
    }
    // ... 40+ more lines
  }
}
```

**Red Flags**:
- `forEach` loop iterating monsters
- Combat result processing
- XP calculation and awarding
- Monster removal logic
- Message generation
- State mutation logic

**Should Be** (1 line):
```typescript
const attackCommand = new AttackCommand(
  this.combatService,
  this.levelingService,
  this.messageService
)
return attackCommand.execute(state)
```

**Reference Implementation**: `src/commands/AttackCommand/AttackCommand.ts` lines 27-125
Contains correct combat flow with `LevelingService.addExperience()` and `levelUp()` integration (lines 52-78).

---

### Violation 2: MoveCommand - Bump-to-Open-Door Logic

**File**: `src/commands/MoveCommand/MoveCommand.ts`
**Lines**: 309-409 (101 lines)
**Method**: `openDoorAndMoveThrough()`

**Current Code** (partial):
```typescript
private openDoorAndMoveThrough(
  state: GameState,
  newPosition: Position,
  door: any,
  level: any,
  player: any
): GameState | null {
  // 1. Update door state (lines 224-228)
  const updatedDoor = { ...door, state: DoorState.OPEN }
  const updatedDoors = level.doors.map((d: any) =>
    d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
  )

  // 2. Update tile transparency (lines 231-235)
  const updatedTiles = level.tiles.map((row: any) => [...row])
  const tile = updatedTiles[door.position.y][door.position.x]
  tile.char = "'"
  tile.walkable = true
  tile.transparent = true

  // ... 80+ more lines of FOV, lighting, hunger, messages
}
```

**Red Flags**:
- Door state manipulation (duplicates `OpenDoorCommand` lines 83-114)
- Tile updates (duplicates `DoorService` responsibility)
- Complex orchestration that should delegate

**Should Use**: `DoorService.openDoor()` + delegate to `OpenDoorCommand`

---

### Violation 3: CombatService.executeBumpAttack (DUPLICATE)

**File**: `src/services/CombatService/CombatService.ts`
**Lines**: 147-229 (90 lines)
**Status**: **MUST BE DELETED**

**Why This Is Wrong**:
1. **Duplicates `AttackCommand` logic** - same combat flow exists in two places
2. **Missing `LevelingService` integration** - bump-attacks never trigger level-ups
3. **Violates Single Responsibility** - `CombatService` should calculate combat, not orchestrate it
4. **Has its own test file** (`bump-attack.test.ts`) testing duplicate logic

**Comparison**:

| Feature | executeBumpAttack() | AttackCommand.execute() |
|---------|-------------------|------------------------|
| Combat calculation | ✅ | ✅ |
| Monster removal | ✅ | ✅ |
| XP award | ✅ | ✅ |
| Level-up check | ❌ **MISSING** | ✅ |
| Level-up messages | ❌ **MISSING** | ✅ |
| HP/Strength gains | ❌ **MISSING** | ✅ |

**Evidence of Bug** (`AttackCommand.ts` lines 52-78):
```typescript
// Add XP and check for level-up
const xpResult = this.levelingService.addExperience(state.player, xpReward)
let updatedPlayer = xpResult.player

messages = this.messageService.addMessage(
  messages,
  `You gain ${xpReward} experience points.`,
  'success',
  state.turnCount
)

if (xpResult.leveledUp) {
  updatedPlayer = this.levelingService.levelUp(updatedPlayer)
  messages = this.messageService.addMessage(
    messages,
    `You have reached level ${updatedPlayer.level}!`,
    'success',
    state.turnCount
  )
  // ... HP and strength increase messages
}
```

This entire block is **missing** from `executeBumpAttack()`.

---

### Violation 4: OpenDoorCommand - Door State Manipulation

**File**: `src/commands/OpenDoorCommand/OpenDoorCommand.ts`
**Lines**: 83-114 (32 lines)
**Method**: `openDoor()`

**Current Code**:
```typescript
private openDoor(state: GameState, door: any, level: any): GameState {
  // Update door state
  const updatedDoor = { ...door, state: DoorState.OPEN }
  const updatedDoors = level.doors.map((d: any) =>
    d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
  )

  // Update tile transparency for FOV
  const updatedTiles = level.tiles.map((row: any) => [...row])
  const tile = updatedTiles[door.position.y][door.position.x]
  tile.char = "'"
  tile.walkable = true
  tile.transparent = true

  const updatedLevel = { ...level, doors: updatedDoors, tiles: updatedTiles }
  // ... state updates
}
```

**Red Flags**:
- Array manipulation (`map`, direct array access)
- Object iteration and mutation
- Tile property updates
- State construction logic

**Should Be** (using `DoorService`):
```typescript
execute(state: GameState): GameState {
  const level = state.levels.get(state.currentLevel)!
  const door = this.doorService.getDoorAt(level, targetPos)

  const validation = this.doorService.canOpenDoor(door)
  if (!validation.canOpen) {
    return this.messageService.addMessage(state, validation.reason!, ...)
  }

  const updatedLevel = this.doorService.openDoor(level, door)
  // ... update state and return
}
```

---

### Violation 5: CloseDoorCommand - Door State Manipulation

**File**: `src/commands/CloseDoorCommand/CloseDoorCommand.ts`
**Lines**: 91-122 (32 lines)
**Method**: `closeDoor()`

**Current Code** (similar to OpenDoorCommand):
```typescript
private closeDoor(state: GameState, door: any, level: any): GameState {
  const updatedDoor = { ...door, state: DoorState.CLOSED }
  const updatedDoors = level.doors.map((d: any) =>
    d.position.x === door.position.x && d.position.y === door.position.y ? updatedDoor : d
  )

  const updatedTiles = level.tiles.map((row: any) => [...row])
  const tile = updatedTiles[door.position.y][door.position.x]
  tile.char = '+'
  tile.walkable = true
  tile.transparent = false
  // ... state updates
}
```

**Additionally** (lines 70-82):
```typescript
// Check if monster is blocking
const monsterBlocking = level.monsters.some(
  (m) => m.position.x === targetPos.x && m.position.y === targetPos.y
)
if (monsterBlocking) {
  // ... error handling
}
```

**Red Flags**:
- Duplicate door manipulation logic
- Monster blocking check (business logic)
- Tile updates (same as OpenDoorCommand)

**Should Use**: `DoorService.closeDoor()` and `DoorService.canCloseDoor()`

---

### Violation 6: SearchCommand - Discovery Mechanics

**File**: `src/commands/SearchCommand/SearchCommand.ts`
**Lines**: 24-121 (97 lines)

**Current Code** (lines 45-86 - secret door discovery):
```typescript
if (secretDoor) {
  // Intelligence-based chance to find (base 50% + player level * 5%)
  const findChance = 0.5 + state.player.level * 0.05
  if (this.random.chance(findChance)) {
    // Reveal secret door
    const revealedDoor = { ...secretDoor, discovered: true }
    updatedDoors = updatedDoors.map((d) =>
      d.position.x === pos.x && d.position.y === pos.y ? revealedDoor : d
    )

    // Update tile to show door
    const updatedTiles = level.tiles.map((row) => [...row])
    const tile = updatedTiles[pos.y][pos.x]
    tile.char = '+'
    tile.walkable = true
    tile.transparent = false

    messages = this.messageService.addMessage(
      messages,
      'You found a secret door!',
      'success',
      state.turnCount
    )
    foundSomething = true

    const updatedLevel = {
      ...level,
      doors: updatedDoors,
      tiles: updatedTiles,
    }
    // ... more state updates
  }
}
```

**Red Flags**:
- **Calculation**: `findChance = 0.5 + state.player.level * 0.05` (business rule)
- **Array manipulation**: `map`, `find`, array iteration
- **Tile updates**: Changing `char`, `walkable`, `transparent`
- **Door revealing logic**: Setting `discovered: true`
- Similar logic repeated for traps (lines 88-120)

**Should Use**: `SearchService` with methods:
- `calculateDiscoveryChance(player: Player): number`
- `findSecretDoor(level: Level, position: Position, chance: number): Door | null`
- `revealSecretDoor(level: Level, door: Door): Level`
- `findTrap(level: Level, position: Position, chance: number): Trap | null`

---

### Violation 7: UseItemCommand - Item Effect Logic

**File**: `src/commands/UseItemCommand/UseItemCommand.ts`
**Lines**: 535 total (409 lines of effect logic)

**Breakdown**:
- Lines 126-225: `quaffPotion()` - 99 lines
- Lines 231-374: `readScroll()` - 143 lines
- Lines 374-423: `zapWand()` - 49 lines
- Lines 423-458: `eatFood()` - 35 lines
- Lines 458-535: `refillLantern()` - 77 lines

**Example: Potion Effects** (lines 135-206):
```typescript
switch (potion.potionType) {
  case PotionType.HEAL:
    {
      const healAmount = this.random.roll(potion.power)
      const newHp = Math.min(newState.player.hp + healAmount, newState.player.maxHp)
      const actualHeal = newHp - newState.player.hp
      newState = {
        ...newState,
        player: { ...newState.player, hp: newHp },
      }
      effectMessage = `You feel better. (+${actualHeal} HP)`
    }
    break

  case PotionType.EXTRA_HEAL:
    // ... 10 more lines

  case PotionType.GAIN_STRENGTH:
    // ... 14 more lines

  case PotionType.RESTORE_STRENGTH:
    // ... 9 more lines

  case PotionType.POISON:
    {
      const damage = this.random.roll(potion.power)
      const newHp = Math.max(0, newState.player.hp - damage)
      newState = {
        ...newState,
        player: { ...newState.player, hp: newHp },
      }
      effectMessage = `You feel sick! (-${damage} HP)`
      if (newHp === 0) {
        newState = { ...newState, isGameOver: true }
      }
    }
    break
  // ... 5+ more cases
}
```

**Red Flags**:
- **Calculations**: `Math.min()`, `Math.max()`, `roll()` calls
- **Complex conditionals**: Large switch statements with business logic
- **State mutations**: Building new state objects
- **Game over logic**: Setting `isGameOver` flag
- **Effect determination**: What happens for each item type

**Should Use**: `ItemEffectService` with methods like:
- `applyPotionEffect(state: GameState, potion: Potion): EffectResult`
- `applyScrollEffect(state: GameState, scroll: Scroll): EffectResult`
- `applyWandEffect(state: GameState, wand: Wand, target: Position): EffectResult`
- `consumeFood(state: GameState, food: Food): EffectResult`
- Plus helper methods for each effect type

---

## Implementation Checklist for MoveCommand Refactor

### Step 1: Extract Movement Logic
```typescript
// Create shared movement method
private performMovement(state: GameState, position: Position): GameState {
  // All the logic currently in execute() for normal movement:
  // - Move player
  // - Tick hunger (with warnings, starvation)
  // - Tick fuel (with warnings)
  // - Recompute FOV
  // - Update explored tiles
  // - Generate notifications
  // - Increment turn
  return updatedState
}
```

### Step 2: Implement Obstacle Detection
```typescript
private detectObstacle(
  position: Position,
  level: Level
): { type: 'none' | 'monster' | 'door' | 'wall'; data?: any } {
  // Check for monster
  const monster = level.monsters.find(m =>
    m.position.x === position.x && m.position.y === position.y
  )
  if (monster) return { type: 'monster', data: monster }

  // Check for closed door
  const door = level.doors.find(d =>
    d.position.x === position.x &&
    d.position.y === position.y &&
    d.state === DoorState.CLOSED
  )
  if (door) return { type: 'door', data: door }

  // Check walkability
  if (!this.movementService.isWalkable(position, level)) {
    return { type: 'wall' }
  }

  return { type: 'none' }
}
```

### Step 3: Implement Routing Logic
```typescript
execute(state: GameState): GameState {
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  const newPosition = this.movementService.applyDirection(
    state.player.position,
    this.direction
  )

  const obstacle = this.detectObstacle(newPosition, level)

  // Route 1: Monster → Delegate to AttackCommand (early return)
  if (obstacle.type === 'monster') {
    const attackCommand = new AttackCommand(
      obstacle.data.id,
      this.combatService,
      this.messageService,
      this.levelingService
    )
    return attackCommand.execute(state)
  }

  // Route 2: Closed door → Open via DoorService, then move
  if (obstacle.type === 'door') {
    const updatedLevel = this.doorService.openDoor(level, obstacle.data)
    const stateWithOpenDoor = {
      ...state,
      levels: new Map(state.levels).set(state.currentLevel, updatedLevel)
    }
    const messages = this.messageService.addMessage(
      stateWithOpenDoor.messages,
      'You open the door.',
      'info',
      state.turnCount + 1
    )
    return this.performMovement({ ...stateWithOpenDoor, messages }, newPosition)
  }

  // Route 3: Wall → Return with message, no turn
  if (obstacle.type === 'wall') {
    const messages = this.messageService.addMessage(
      state.messages,
      "You can't go that way.",
      'info',
      state.turnCount
    )
    return { ...state, messages }
  }

  // Route 4: Clear path → Normal movement
  return this.performMovement(state, newPosition)
}
```

### Step 4: Handle Special Door Cases
```typescript
// Before routing, check for special door states
if (obstacle.type === 'door') {
  const door = obstacle.data

  if (door.state === DoorState.LOCKED) {
    const messages = this.messageService.addMessage(
      state.messages,
      'The door is locked.',
      'warning',
      state.turnCount
    )
    return { ...state, messages }  // No turn increment
  }

  if (door.state === DoorState.SECRET && !door.discovered) {
    const messages = this.messageService.addMessage(
      state.messages,
      "You can't go that way.",
      'info',
      state.turnCount
    )
    return { ...state, messages }  // No turn increment
  }

  if (door.state === DoorState.CLOSED) {
    // Open and move through (handled above)
  }
}
```
## Parallel Execution Strategy

### Dependency Graph

```
Workstream A (DoorService)
    ↓ (depends on DoorService)
Workstream C (SearchService)
    ↓ (depends on DoorService)
Workstream D (MoveCommand)

Workstream B (ItemEffectService) - INDEPENDENT
```

### Workstream Definitions

#### 🔵 Workstream A: DoorService + Door Commands
**Dependencies**: None (can start immediately)
**Estimated Time**: 2-3 hours
**Agent Requirements**: Access to Edit, Write, Read, Bash tools

**Tasks**:
1. ✅ Create `src/services/DoorService/DoorService.ts`
   - Implement 6 methods from interface above
   - Extract logic from `OpenDoorCommand`, `CloseDoorCommand`, `SearchCommand`

2. ✅ Create `src/services/DoorService/index.ts` (barrel export)

3. ✅ Create test files:
   - `src/services/DoorService/door-opening.test.ts`
   - `src/services/DoorService/door-closing.test.ts`
   - `src/services/DoorService/door-revealing.test.ts`
   - `src/services/DoorService/door-validation.test.ts`

4. ✅ Refactor `OpenDoorCommand.ts`:
   - Remove `openDoor()` method (lines 83-114)
   - Inject `DoorService` in constructor
   - Update `execute()` to delegate:
     ```typescript
     const door = this.doorService.getDoorAt(level, targetPos)
     const validation = this.doorService.canOpenDoor(door)
     if (!validation.canOpen) { /* error */ }
     const updatedLevel = this.doorService.openDoor(level, door)
     ```

5. ✅ Refactor `CloseDoorCommand.ts`:
   - Remove `closeDoor()` method (lines 91-122)
   - Inject `DoorService` in constructor
   - Update `execute()` to delegate (similar to above)

6. ✅ Update `src/main.ts`:
   - Import `DoorService`
   - Instantiate `doorService`
   - Pass to `OpenDoorCommand` and `CloseDoorCommand` constructors

7. ✅ Run tests: `npm test DoorService`
8. ✅ Run tests: `npm test OpenDoorCommand`
9. ✅ Run tests: `npm test CloseDoorCommand`

**Success Criteria**:
- All tests pass
- `DoorService` has >80% coverage
- `OpenDoorCommand` < 60 lines
- `CloseDoorCommand` < 60 lines

---

#### 🟢 Workstream B: ItemEffectService + UseItemCommand
**Dependencies**: None (can run parallel with A)
**Estimated Time**: 4-5 hours
**Agent Requirements**: Access to Edit, Write, Read, Bash tools

**Tasks**:
1. ✅ Create `src/services/ItemEffectService/ItemEffectService.ts`
   - Implement main interface (5 public methods)
   - Implement helper methods (~15 private methods)
   - Extract all logic from `UseItemCommand` methods

2. ✅ Create `src/services/ItemEffectService/index.ts`

3. ✅ Create test files:
   - `potion-effects.test.ts` (60 tests covering all potion types)
   - `scroll-effects.test.ts` (50 tests covering all scroll types)
   - `wand-effects.test.ts` (30 tests)
   - `food-consumption.test.ts` (20 tests)
   - `lantern-refilling.test.ts` (20 tests)

4. ✅ Refactor `UseItemCommand.ts`:
   - Remove methods: `quaffPotion()`, `readScroll()`, `zapWand()`, `eatFood()`, `refillLantern()`
   - Inject `ItemEffectService` in constructor
   - Update `execute()` to delegate:
     ```typescript
     if (item.itemType === ItemType.POTION) {
       const result = this.itemEffectService.applyPotionEffect(state, item as Potion)
       return { ...result.updatedState, messages: [..., result.message] }
     }
     // ... similar for other item types
     ```
   - File should go from 535 → ~150 lines

5. ✅ Update `src/main.ts`:
   - Import `ItemEffectService`
   - Instantiate with dependencies (random, inventoryService, identificationService)
   - Pass to `UseItemCommand` constructor

6. ✅ Run tests: `npm test ItemEffectService`
7. ✅ Run tests: `npm test UseItemCommand`

**Success Criteria**:
- All tests pass
- `ItemEffectService` has >80% coverage
- `UseItemCommand` < 180 lines

---

#### 🟡 Workstream C: SearchService + SearchCommand
**Dependencies**: Workstream A complete (needs `DoorService.revealSecretDoor()`)
**Estimated Time**: 2 hours
**Agent Requirements**: Access to Edit, Write, Read, Bash tools

**Tasks**:
1. ✅ Create `src/services/SearchService/SearchService.ts`
   - Implement 4 methods from interface
   - Use `DoorService.revealSecretDoor()` for secret door revealing

2. ✅ Create `src/services/SearchService/index.ts`

3. ✅ Create test files:
   - `secret-door-discovery.test.ts` (40 tests)
   - `trap-discovery.test.ts` (40 tests)

4. ✅ Refactor `SearchCommand.ts`:
   - Remove all discovery logic (lines 35-121)
   - Inject `SearchService` and `DoorService`
   - Update `execute()`:
     ```typescript
     const chance = this.searchService.calculateDiscoveryChance(state.player.level)
     const positions = this.searchService.getAdjacentPositions(state.player.position)

     for (const pos of positions) {
       const doorResult = this.searchService.searchForSecretDoor(level, pos, chance)
       if (doorResult.found) {
         return { ...state, levels: updatedLevels, messages: [...] }
       }

       const trapResult = this.searchService.searchForTrap(level, pos, chance)
       if (trapResult.found) {
         return { ...state, levels: updatedLevels, messages: [...] }
       }
     }
     ```
   - File should go from 138 → ~60 lines

5. ✅ Update `src/main.ts`:
   - Import `SearchService`
   - Instantiate with `random` and `doorService`
   - Pass to `SearchCommand` constructor

6. ✅ Run tests: `npm test SearchService`
7. ✅ Run tests: `npm test SearchCommand`

**Success Criteria**:
- All tests pass
- `SearchService` has >80% coverage
- `SearchCommand` < 60 lines

---
## Updated Workstream D: MoveCommand Delegation (REVISED)

**Dependencies**: Workstream A complete (needs `DoorService`)
**Estimated Time**: 3-4 hours
**Agent Requirements**: Access to Edit, Write, Read, Bash tools

**Critical**: This workstream fixes the level-up bug AND implements turn management architecture.

### Tasks:

#### 1. ✅ **DELETE duplicate logic**
   - Remove `executeBumpAttack()` method from `CombatService.ts` (lines 147-229)
   - Remove `MessageService` dependency from `CombatService` constructor
   - Revert to original constructor signature: `constructor(random, hungerService?, debugService?)`
   - **DELETE** `src/services/CombatService/bump-attack.test.ts` (21 tests - duplicate logic)

#### 2. ✅ **Update all CombatService instantiations**

Revert these test files (remove `messageService` parameter):
- [ ] `src/services/CombatService/hit-calculation.test.ts`
- [ ] `src/services/CombatService/damage.test.ts`
- [ ] `src/services/CombatService/equipment-bonuses.test.ts`
- [ ] `src/services/CombatService/hunger-penalties.test.ts`
- [ ] `src/commands/AttackCommand/AttackCommand.test.ts`
- [ ] `src/services/MonsterTurnService/theft-mechanics.test.ts`
- [ ] `src/services/MonsterTurnService/combat-execution.test.ts`
- [ ] `src/services/MonsterTurnService/turn-processing.test.ts`
- [ ] `src/services/MonsterTurnService/death-cause-tracking.test.ts`
- [ ] `src/main.ts` (CombatService instantiation)

#### 3. ✅ **Add dependencies to MoveCommand**
   - Update constructor to accept `LevelingService` and `DoorService`
   - Store as private dependencies

#### 4. ✅ **Extract movement logic to shared method**
```typescript
/**
 * Performs movement with all side effects (hunger, fuel, FOV, turn)
 * @param state Current game state
 * @param position Target position (already validated as walkable)
 * @returns Updated state with movement, hunger tick, fuel tick, FOV update, turn increment
 */
private performMovement(state: GameState, position: Position): GameState {
  // Move player
  let player = this.movementService.movePlayer(state.player, position)

  // Tick hunger (copy from current execute lines 107-145)
  let hungerMessages: string[] = []
  if (this.hungerService) {
    // ... existing hunger logic ...
  }

  // Tick light fuel (copy from current execute lines 147-176)
  let updatedPlayer = player
  if (player.equipment.lightSource) {
    // ... existing fuel logic ...
  }

  // Recompute FOV (copy from current execute lines 179-187)
  const lightRadius = this.lightingService.getLightRadius(updatedPlayer.equipment.lightSource)
  const visibleCells = this.fovService.computeFOV(position, lightRadius, level)

  // Update explored tiles (copy from current execute lines 190)
  const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

  // Generate notifications (copy from current execute lines 197-205)
  const stateWithUpdatedLevel = { ...state, player: updatedPlayer, visibleCells, levels: updatedLevels }
  const notifications = this.notificationService?.generateNotifications(...) || []

  // Add messages (copy from current execute lines 208-226)
  let messages = state.messages
  hungerMessages.forEach((msg) => {
    messages = this.messageService.addMessage(messages, msg, ...)
  })
  notifications.forEach((msg) => {
    messages = this.messageService.addMessage(messages, msg, ...)
  })

  return {
    ...state,
    player: updatedPlayer,
    visibleCells,
    levels: updatedLevels,
    messages,
    turnCount: state.turnCount + 1  // ← Single turn increment
  }
}
```

#### 5. ✅ **Implement obstacle detection**
```typescript
/**
 * Detects what obstacle (if any) is at the target position
 * @returns Obstacle type and data
 */
private detectObstacle(
  position: Position,
  level: Level
): { type: 'none' | 'monster' | 'door' | 'wall'; data?: any } {
  // Check for monster
  const monster = level.monsters.find(m =>
    m.position.x === position.x && m.position.y === position.y
  )
  if (monster) return { type: 'monster', data: monster }

  // Check for closed/locked/secret door
  const door = level.doors.find(d =>
    d.position.x === position.x && d.position.y === position.y
  )
  if (door && (
    door.state === DoorState.CLOSED ||
    door.state === DoorState.LOCKED ||
    (door.state === DoorState.SECRET && !door.discovered)
  )) {
    return { type: 'door', data: door }
  }

  // Check walkability
  if (!this.movementService.isWalkable(position, level)) {
    return { type: 'wall' }
  }

  return { type: 'none' }
}
```

#### 6. ✅ **Refactor execute() method with routing**
```typescript
execute(state: GameState): GameState {
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  // Calculate target position
  const newPosition = this.movementService.applyDirection(
    state.player.position,
    this.direction
  )

  // Detect obstacle
  const obstacle = this.detectObstacle(newPosition, level)

  // ROUTE 1: Monster → Delegate to AttackCommand (early return)
  if (obstacle.type === 'monster') {
    const attackCommand = new AttackCommand(
      obstacle.data.id,  // ← Pass monster.id
      this.combatService,
      this.messageService,
      this.levelingService
    )
    return attackCommand.execute(state)  // ← Early return
    // AttackCommand handles: combat, XP, level-up, messages, turn increment
    // No hunger/fuel tick (correct - no movement)
  }

  // ROUTE 2: Door → Handle based on state
  if (obstacle.type === 'door') {
    const door = obstacle.data

    // Locked door - blocked (no turn)
    if (door.state === DoorState.LOCKED) {
      const messages = this.messageService.addMessage(
        state.messages,
        'The door is locked.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Undiscovered secret door - blocked (no turn)
    if (door.state === DoorState.SECRET && !door.discovered) {
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Closed door - open and move through
    if (door.state === DoorState.CLOSED) {
      // Open door via DoorService (no turn increment)
      const updatedLevel = this.doorService.openDoor(level, door)
      const stateWithOpenDoor = {
        ...state,
        levels: new Map(state.levels).set(state.currentLevel, updatedLevel)
      }

      // Add message
      const messages = this.messageService.addMessage(
        stateWithOpenDoor.messages,
        'You open the door.',
        'info',
        state.turnCount + 1
      )

      // Continue with movement (hunger, fuel, FOV, turn increment)
      return this.performMovement(
        { ...stateWithOpenDoor, messages },
        newPosition
      )
    }
  }

  // ROUTE 3: Wall → Blocked (no turn)
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
  return this.performMovement(state, newPosition)
}
```

#### 7. ✅ **Delete obsolete method**
   - Remove `openDoorAndMoveThrough()` method entirely (lines 238-409)

#### 8. ✅ **Update MoveCommand tests**

Update `src/commands/MoveCommand/bump-attack.test.ts`:
- Remove tests for combat execution (now delegated)
- Add delegation verification tests:
  ```typescript
  test('delegates to AttackCommand when bumping monster', () => {
    // Setup state with monster at target position
    // Create MoveCommand with mocked AttackCommand
    // Verify AttackCommand.execute() is called with correct monster.id
    // Verify result includes level-up (proving delegation works)
  })

  test('bump-attack does NOT tick hunger', () => {
    // Setup state with monster
    // Create MoveCommand, execute bump-attack
    // Verify player.hunger unchanged (no tick because no movement)
  })

  test('bump-attack does NOT tick fuel', () => {
    // Setup state with monster and lantern
    // Create MoveCommand, execute bump-attack
    // Verify lightSource.fuel unchanged
  })

  test('bump-attack increments turn exactly once', () => {
    // Setup state with monster at turn N
    // Execute bump-attack
    // Verify turnCount = N + 1 (not N + 2)
  })
  ```

Update `src/commands/MoveCommand/door-interaction.test.ts`:
- Test bump-to-open-door behavior:
  ```typescript
  test('bump into closed door opens it and moves through', () => {
    // Setup state with closed door at target
    // Execute move command
    // Verify door state = OPEN
    // Verify player position = newPosition (moved through)
    // Verify hunger ticked (movement happened)
    // Verify fuel ticked (movement happened)
    // Verify turn incremented once
  })

  test('bump into locked door does not increment turn', () => {
    // Setup state with locked door
    // Execute move command
    // Verify player position unchanged
    // Verify turn unchanged
    // Verify message "The door is locked."
  })
  ```

#### 9. ✅ **Update main.ts**
   - Add `doorService` instantiation (from Workstream A)
   - Add `levelingService` to `MoveCommand` constructor
   - Add `doorService` to `MoveCommand` constructor
   - Ensure all dependencies injected correctly

#### 10. ✅ **Integration tests for turn management**

Create `src/commands/MoveCommand/turn-management.test.ts`:
```typescript
describe('MoveCommand - Turn Management', () => {
  test('normal move increments turn exactly once', () => {
    // Verify single increment for normal movement
  })

  test('bump-to-attack increments turn exactly once', () => {
    // Verify AttackCommand increments, MoveCommand does not
  })

  test('bump-to-open-door increments turn exactly once', () => {
    // Verify MoveCommand increments after opening door
  })

  test('bump into wall does not increment turn', () => {
    // Verify no turn consumed for invalid movement
  })

  test('complex scenario: low fuel during bump-to-open-door', () => {
    // Player bumps closed door with 1 fuel remaining
    // Verify door opens, player moves, fuel hits 0, warning generated, turn increments once
  })

  test('complex scenario: starvation during normal move', () => {
    // Player at 1 hunger moves normally
    // Verify hunger hits 0, damage taken, potential death, turn increments once
  })
})
```

#### 11. ✅ **Run tests**
```bash
npm test MoveCommand        # Should pass with new delegation tests
npm test AttackCommand      # Should be unchanged, still pass
npm test CombatService      # Should pass with executeBumpAttack deleted
npm test -- --coverage      # Verify coverage maintained
```

#### 12. ✅ **Manual verification**
- Playtest bump-attack → verify level-up triggers correctly
- Playtest bump-to-open-door → verify door opens and player moves through
- Monitor turn counter → verify no double increments
- Check hunger/fuel → verify ticks only on movement

### Success Criteria:
- ✅ All tests pass (1276 - 21 + new tests ≈ 1280+ tests)
- ✅ `MoveCommand` < 200 lines (currently 410, extracting to methods reduces significantly)
- ✅ `executeBumpAttack()` deleted from `CombatService`
- ✅ Bump-attacks trigger level-ups correctly
- ✅ No double turn increments
- ✅ Hunger/fuel tick only on movement
- ✅ No duplicate combat logic in codebase

## File Change Summary

### Files to Create (8 new files)

**DoorService** (Workstream A):
1. `src/services/DoorService/DoorService.ts` (~200 lines)
2. `src/services/DoorService/index.ts` (barrel export)
3. `src/services/DoorService/door-opening.test.ts` (~100 lines)
4. `src/services/DoorService/door-closing.test.ts` (~100 lines)
5. `src/services/DoorService/door-revealing.test.ts` (~100 lines)
6. `src/services/DoorService/door-validation.test.ts` (~100 lines)

**ItemEffectService** (Workstream B):
7. `src/services/ItemEffectService/ItemEffectService.ts` (~450 lines)
8. `src/services/ItemEffectService/index.ts` (barrel export)
9. `src/services/ItemEffectService/potion-effects.test.ts` (~200 lines)
10. `src/services/ItemEffectService/scroll-effects.test.ts` (~180 lines)
11. `src/services/ItemEffectService/wand-effects.test.ts` (~120 lines)
12. `src/services/ItemEffectService/food-consumption.test.ts` (~80 lines)
13. `src/services/ItemEffectService/lantern-refilling.test.ts` (~80 lines)

**SearchService** (Workstream C):
14. `src/services/SearchService/SearchService.ts` (~150 lines)
15. `src/services/SearchService/index.ts` (barrel export)
16. `src/services/SearchService/secret-door-discovery.test.ts` (~120 lines)
17. `src/services/SearchService/trap-discovery.test.ts` (~120 lines)

### Files to Modify (11 files)

**Commands** (7 files):
1. `src/commands/OpenDoorCommand/OpenDoorCommand.ts` (115 → ~60 lines)
2. `src/commands/CloseDoorCommand/CloseDoorCommand.ts` (123 → ~60 lines)
3. `src/commands/SearchCommand/SearchCommand.ts` (138 → ~60 lines)
4. `src/commands/UseItemCommand/UseItemCommand.ts` (535 → ~150 lines)
5. `src/commands/MoveCommand/MoveCommand.ts` (410 → ~280 lines)
6. `src/commands/MoveCommand/bump-attack.test.ts` (update for delegation)
7. `src/commands/MoveCommand/door-interaction.test.ts` (update for delegation)

**Services** (1 file):
8. `src/services/CombatService/CombatService.ts` (delete `executeBumpAttack()`, revert MessageService)

**Main** (1 file):
9. `src/main.ts` (add 3 new service instantiations, update constructors)

**Test files** (10+ files - revert CombatService constructor):
10. `src/services/CombatService/*.test.ts` (4 files)
11. `src/commands/AttackCommand/AttackCommand.test.ts`
12. `src/services/MonsterTurnService/*.test.ts` (4 files)

### Files to Delete (1 file)

1. `src/services/CombatService/bump-attack.test.ts` (21 tests - duplicate logic)

---

## Test Impact Analysis

### Current Test Count
**1276 tests passing**

### Test Changes by Workstream

**Workstream A** (DoorService):
- ➕ Add: ~120 new tests (DoorService)
- ✏️ Modify: ~30 existing tests (OpenDoorCommand, CloseDoorCommand)
- **Net**: +120 tests

**Workstream B** (ItemEffectService):
- ➕ Add: ~180 new tests (ItemEffectService)
- ✏️ Modify: ~40 existing tests (UseItemCommand)
- **Net**: +180 tests

**Workstream C** (SearchService):
- ➕ Add: ~80 new tests (SearchService)
- ✏️ Modify: ~20 existing tests (SearchCommand)
- **Net**: +80 tests

**Workstream D** (MoveCommand):
- ➖ Delete: ~21 tests (CombatService/bump-attack.test.ts)
- ➕ Add: ~10 new delegation tests (MoveCommand)
- ✏️ Modify: ~30 existing tests (MoveCommand, various service tests)
- **Net**: -11 tests

### Final Test Count Estimate
**1276 + 120 + 180 + 80 - 11 = 1645 tests** 📈

---

## Risk Analysis and Mitigation

### Risk 1: Breaking Existing Functionality
**Probability**: Medium
**Impact**: High

**Mitigation**:
- Run full test suite after each workstream
- Manual playtesting of affected features
- Git commits after each completed workstream
- Rollback plan: `git revert` if critical issues found

### Risk 2: Test Coverage Drop
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Coverage requirement: >80% for all new services
- Run `npm test -- --coverage` after each workstream
- Add tests before removing code

### Risk 3: Integration Issues Between Workstreams
**Probability**: Medium (especially C & D depend on A)
**Impact**: Medium

**Mitigation**:
- Workstream A completes and tests pass before C & D start
- DoorService interface finalized before dependent workstreams
- Integration test after all workstreams complete

### Risk 4: Level-Up Bug Persists
**Probability**: Low (if Workstream D executed correctly)
**Impact**: High

**Mitigation**:
- Specific test for bump-attack level-up in Workstream D
- Manual playtest: Kill monsters by bumping, verify level-up triggers
- Verify `LevelingService.addExperience()` called in delegation path

### Risk 5: Performance Degradation
**Probability**: Low
**Impact**: Low

**Mitigation**:
- Command delegation adds one extra function call (negligible)
- Service methods are pure logic extraction (same performance)
- Monitor game responsiveness during playtesting

---

## Execution Timeline

### Sequential Execution (DO NOT DO THIS)
- Workstream A: 2-3 hours
- Workstream B: 4-5 hours
- Workstream C: 2 hours (wait for A)
- Workstream D: 3-4 hours (wait for A)
- **Total: 11-14 hours** ⏰

### Parallel Execution (RECOMMENDED)

**Phase 1** (parallel, 4-5 hours):
- 🔵 Workstream A (DoorService) - Agent 1
- 🟢 Workstream B (ItemEffectService) - Agent 2

**Phase 2** (parallel, 3-4 hours, after A completes):
- 🟡 Workstream C (SearchService) - Agent 1 or 3
- 🔴 Workstream D (MoveCommand) - Agent 2 or 4

**Total with parallelization: 7-9 hours** ⚡

---

## Success Criteria

### Code Quality
- ✅ All commands < 300 lines (most < 100 lines)
- ✅ No business logic in commands (pure orchestration)
- ✅ No duplicate logic across codebase
- ✅ All services follow single responsibility principle

### Testing
- ✅ All 1645+ tests passing
- ✅ Test coverage >80% for all services
- ✅ Test coverage >80% for all commands
- ✅ No flaky tests (deterministic with MockRandom)

### Functionality
- ✅ Bump-attacks trigger level-ups correctly
- ✅ All door interactions work (open, close, reveal)
- ✅ All item effects work (potions, scrolls, wands, food)
- ✅ Search mechanic works (secret doors, traps)
- ✅ No regressions in existing features

### Architecture
- ✅ Commands delegate to services (no embedded logic)
- ✅ Services contain all business logic
- ✅ No state mutation (immutable patterns)
- ✅ Dependency injection used throughout
- ✅ Clear separation of concerns

---

## Post-Refactoring Verification

### Automated Checks
```bash
# Run full test suite
npm test

# Check coverage
npm test -- --coverage

# Type checking
npm run type-check

# Build verification
npm run build
```

### Manual Playtesting Checklist

**Combat & Leveling**:
- [ ] Bump into monster → Attack executes
- [ ] Kill monster by bumping → XP awarded
- [ ] Gain enough XP → Level-up triggers
- [ ] Level-up → HP increases
- [ ] Level-up → Strength increases
- [ ] Level-up messages appear

**Door Interactions**:
- [ ] Bump into closed door → Opens
- [ ] Explicit open command → Works
- [ ] Explicit close command → Works
- [ ] Close door with monster → Blocked
- [ ] Search near secret door → Reveals

**Item Usage**:
- [ ] Drink healing potion → HP restored
- [ ] Drink strength potion → Strength increases
- [ ] Drink poison → Damage taken
- [ ] Read scroll → Effect applies
- [ ] Zap wand → Effect applies
- [ ] Eat food → Hunger reduces
- [ ] Refill lantern → Fuel restored

**Search Mechanic**:
- [ ] Search command → Checks adjacent tiles
- [ ] Find secret door → Revealed and visible
- [ ] Find trap → Revealed and visible
- [ ] Search with nothing → Appropriate message

---

## Rollback Plan

If critical issues discovered after refactoring:

### Option 1: Selective Rollback (Recommended)
```bash
# Identify problematic workstream
git log --oneline -n 10

# Revert specific commits
git revert <commit-hash>

# Re-run tests
npm test
```

### Option 2: Full Rollback
```bash
# Return to pre-refactoring state
git reset --hard <commit-before-refactoring>

# Verify tests pass
npm test
```

### Option 3: Fix Forward
- Create hotfix branch
- Address specific issue
- Merge back to main

---

## Agent Instructions

### For Agent Executing Workstream A (DoorService)

**Goal**: Extract door manipulation logic from commands to new DoorService

**Step-by-step**:
1. Read this plan document (you're reading it now)
2. Create `DoorService.ts` with 6 methods (see interface above)
3. Extract logic from:
   - `OpenDoorCommand.openDoor()` → `DoorService.openDoor()`
   - `CloseDoorCommand.closeDoor()` → `DoorService.closeDoor()`
   - `SearchCommand` secret door logic → `DoorService.revealSecretDoor()`
4. Create 4 test files with comprehensive coverage
5. Refactor `OpenDoorCommand` and `CloseDoorCommand` to use DoorService
6. Update `main.ts` with DoorService instantiation
7. Run tests, verify all pass
8. Commit with message: `refactor: extract door logic to DoorService (Workstream A)`

**Reference Files**:
- Read: `src/commands/OpenDoorCommand/OpenDoorCommand.ts` (lines 83-114)
- Read: `src/commands/CloseDoorCommand/CloseDoorCommand.ts` (lines 91-122)
- Read: `src/commands/SearchCommand/SearchCommand.ts` (lines 48-86)

**Success Check**:
```bash
npm test DoorService
npm test OpenDoorCommand
npm test CloseDoorCommand
```

---

### For Agent Executing Workstream B (ItemEffectService)

**Goal**: Extract item effect logic from UseItemCommand to new ItemEffectService

**Step-by-step**:
1. Read this plan document
2. Create `ItemEffectService.ts` with 5 public methods + helpers (see interface)
3. Extract ALL logic from:
   - `UseItemCommand.quaffPotion()` → `ItemEffectService.applyPotionEffect()`
   - `UseItemCommand.readScroll()` → `ItemEffectService.applyScrollEffect()`
   - `UseItemCommand.zapWand()` → `ItemEffectService.applyWandEffect()`
   - `UseItemCommand.eatFood()` → `ItemEffectService.consumeFood()`
   - `UseItemCommand.refillLantern()` → `ItemEffectService.refillLantern()`
4. Create 5 test files (180 tests total)
5. Refactor `UseItemCommand` to delegate (535 → ~150 lines)
6. Update `main.ts` with ItemEffectService
7. Run tests, verify all pass
8. Commit: `refactor: extract item effects to ItemEffectService (Workstream B)`

**Reference Files**:
- Read: `src/commands/UseItemCommand/UseItemCommand.ts` (lines 126-535)

**Success Check**:
```bash
npm test ItemEffectService
npm test UseItemCommand
```

---

### For Agent Executing Workstream C (SearchService)

**Goal**: Extract search/discovery logic to new SearchService

**Dependencies**: ⚠️ WAIT for Workstream A to complete (needs DoorService)

**Step-by-step**:
1. Verify Workstream A complete (`DoorService` exists and tests pass)
2. Read this plan document
3. Create `SearchService.ts` with 4 methods (see interface)
4. Extract logic from `SearchCommand.execute()` (lines 24-121)
5. Use `DoorService.revealSecretDoor()` for secret door revealing
6. Create 2 test files (80 tests)
7. Refactor `SearchCommand` to delegate (138 → ~60 lines)
8. Update `main.ts` with SearchService
9. Run tests
10. Commit: `refactor: extract search logic to SearchService (Workstream C)`

**Reference Files**:
- Read: `src/commands/SearchCommand/SearchCommand.ts`
- Use: `src/services/DoorService/DoorService.ts`

**Success Check**:
```bash
npm test SearchService
npm test SearchCommand
```

---

### For Agent Executing Workstream D (MoveCommand Delegation)

**Goal**: Fix level-up bug by delegating bump-actions to proper commands

**Dependencies**: ⚠️ WAIT for Workstream A to complete (needs DoorService)

**Step-by-step**:
1. **DELETE duplicate logic first**:
   - Remove `CombatService.executeBumpAttack()` (lines 147-229)
   - Revert `CombatService` constructor (remove MessageService)
   - Delete `src/services/CombatService/bump-attack.test.ts`
   - Revert 10+ test files with CombatService instantiation

2. **Add LevelingService to MoveCommand**:
   - Update constructor to accept `levelingService`

3. **Create helper methods**:
   - `detectObstacle()` - identify what's blocking
   - `getDefaultActionCommand()` - factory for commands

4. **Replace bump-to-attack** (lines 84-169):
   - Delete existing logic
   - Add delegation to `AttackCommand`

5. **Replace bump-to-open-door**:
   - Delete `openDoorAndMoveThrough()` method (lines 207-409)
   - Add delegation to `OpenDoorCommand`

6. **Update tests**:
   - Modify `bump-attack.test.ts` - test delegation behavior
   - Modify `door-interaction.test.ts` - test door delegation

7. **Update main.ts**:
   - Add `levelingService` to MoveCommand constructor

8. **Manual verification**:
   - Playtest bump-attack → verify level-up triggers

9. Commit: `fix: delegate bump-actions to proper commands, fix level-up bug (Workstream D)`

**Reference Files**:
- Read: `src/commands/AttackCommand/AttackCommand.ts` (see level-up integration)
- Read: `src/commands/MoveCommand/MoveCommand.ts` (current violations)

**Success Check**:
```bash
npm test MoveCommand
npm test AttackCommand
npm test CombatService
# Should be ~1280 tests total (1276 - 21 + new)
```

---

## Final Notes

### Why This Refactoring Matters

1. **Fixes Critical Bug**: Bump-attacks will trigger level-ups correctly
2. **Eliminates Duplication**: Single source of truth for all logic
3. **Improves Maintainability**: Changes to combat logic only need updating in one place
4. **Enforces Architecture**: Commands become pure orchestration
5. **Increases Testability**: Services can be unit tested in isolation
6. **Reduces Complexity**: Each file has single, clear responsibility

### Architecture Validation Checklist

After refactoring, verify each command file:

**Red Flags** (should NOT exist):
- ❌ `forEach`, `for`, `while`, `map` loops
- ❌ Array manipulation (`push`, `splice`, direct index access)
- ❌ Calculations (`Math.floor`, arithmetic operations)
- ❌ String manipulation (`split`, `join`, `replace`)
- ❌ Complex conditionals (nested `if/else`, large `switch`)
- ❌ Object iteration (`Object.keys`, `Object.entries`)

**Acceptable Patterns**:
- ✅ Service method calls
- ✅ Simple routing (`if (monster) attack() else move()`)
- ✅ Guard clauses (`if (!walkable) return state`)
- ✅ State spreading (`{ ...state, player: {...} }`)

### Post-Refactoring Metrics

**Before**:
- 7 commands with violations
- 723 lines of embedded logic
- 1 critical bug (level-up)
- Duplicate logic in 2 places
- 1276 tests

**After**:
- 0 commands with violations
- 723 lines extracted to services
- 0 critical bugs
- No duplicate logic
- 1645 tests (+369 tests, +28% coverage)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-04
**Status**: Ready for parallel execution
**Estimated Completion**: 7-9 hours with 2-4 agents
## Benefits of This Architecture

### ✅ Single Source of Truth
- All attacks go through `AttackCommand` (whether explicit 'a' or bump)
- All door logic in `DoorService`
- Level-up always works (no missing integration)

### ✅ No Double Turn Increments
- Early return pattern prevents double increments
- Service methods never increment turns
- Clear ownership: command that does primary action increments

### ✅ Correct Hunger/Fuel Behavior
- Only tick when player actually moves
- Bump-to-attack: no tick (combat in place)
- Bump-to-open-door: tick (movement through door)

### ✅ Works in All Contexts
- Direct execution: `AttackCommand.execute()` works ✓
- Delegated execution: `MoveCommand → AttackCommand` works ✓
- No special flags or context parameters needed ✓

### ✅ Testable
- Each command testable in isolation
- Delegation behavior testable
- Turn increment logic clear and verifiable
## Testing Strategy for Turn Management

### Unit Tests (Per Command)
- Test direct execution increments turn ✓
- Test delegated execution increments turn exactly once ✓
- Test blocked actions do NOT increment turn ✓

### Integration Tests (Cross-Command)
- Test MoveCommand → AttackCommand delegation ✓
- Test turn counter consistency across actions ✓
- Test hunger/fuel ticking policy ✓

### Edge Case Tests
- Low fuel + bump-to-open-door → Single turn, fuel depletes, warning generated ✓
- Starvation + normal move → Single turn, damage taken, potential death ✓
- Multiple sequential actions → Verify turn increments correctly ✓

---

## Architecture Validation Checklist (UPDATED)

After refactoring, verify:

**Turn Management**:
- [ ] Each action increments turn exactly once
- [ ] Delegated commands use early return
- [ ] Services never increment turns
- [ ] Blocked actions (wall bump) don't increment turns

**Hunger/Fuel Ticking**:
- [ ] Bump-to-attack: NO tick (no movement)
- [ ] Bump-to-open-door: YES tick (movement through door)
- [ ] Normal move: YES tick (movement)
- [ ] Explicit attack: NO tick (no movement)

**Command Delegation**:
- [ ] Bump-to-attack delegates to AttackCommand ✓
- [ ] Bump-to-open-door uses DoorService (not OpenDoorCommand) ✓
- [ ] Early return prevents double increments ✓

**Service Usage**:
- [ ] DoorService methods don't increment turns ✓
- [ ] CombatService methods don't increment turns ✓
- [ ] All services are pure logic ✓

---

## Summary of Changes from Original Plan

### What Changed:
1. **Added Turn Management Architecture section** - Comprehensive guide to turn handling
2. **Updated MoveCommand delegation pattern** - Early return strategy, service vs command usage
3. **Clarified hunger/fuel ticking policy** - Only on movement
4. **Revised Workstream D** - Detailed implementation steps with turn management
5. **Updated DoorService interface** - Explicit "no turn increment" documentation
6. **Added turn management tests** - New test file for integration scenarios

### What Stayed the Same:
- All violation detection ✓
- Service creation (DoorService, ItemEffectService, SearchService) ✓
- Bug diagnosis (level-up issue) ✓
- Workstream A, B, C unchanged ✓
- Overall architecture principles ✓

### Why These Changes:
- **Prevent double turn increments** - Critical bug if overlooked
- **Ensure hunger/fuel consistency** - Gameplay correctness
- **Make delegation patterns explicit** - Easier to implement correctly
- **Support both direct and delegated execution** - Commands work in all contexts

---

**Document Version**: 2.0
**Last Updated**: 2025-10-05
**Status**: Ready for execution with turn management architecture
**Estimated Completion**: 7-9 hours with 2-4 agents

---

**Document Version**: 2.0  
**Last Updated**: 2025-10-05  
**Status**: Ready for execution with turn management architecture  
**Estimated Completion**: 7-9 hours with 2-4 agents
