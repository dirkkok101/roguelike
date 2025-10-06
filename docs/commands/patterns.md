# Command Patterns

[Home](../README.md) > [Commands](./README.md) > Patterns

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 12 minutes
**Prerequisites**: [Commands Overview](./README.md)
**Related Docs**: [Creation Guide](./creation-guide.md) | [Testing Guide](./testing-guide.md) | [Architecture](../architecture.md)

---

## Table of Contents

1. [Core Patterns](#1-core-patterns)
2. [Advanced Patterns](#2-advanced-patterns)
3. [Anti-Patterns to Avoid](#3-anti-patterns-to-avoid)

---

## 1. Core Patterns

### 1.1 The Orchestration Principle

**Commands orchestrate, services implement.**

```typescript
// ✅ Good - Orchestration
class MoveCommand {
  execute(state: GameState): GameState {
    const newPos = this.movementService.applyDirection(state.player.position, this.direction)
    const obstacle = this.movementService.detectObstacle(newPos, level)

    if (obstacle.type === 'monster') {
      return new AttackCommand(...).execute(state)  // Delegate
    }

    return this.performMovement(state, newPos, level)
  }
}

// ❌ Bad - Implementation in command
class MoveCommand {
  execute(state: GameState): GameState {
    // LOOP IN COMMAND!
    visibleCells.forEach((key) => {
      const pos = this.parsePosition(key)  // CALCULATION!
      if (level.explored[pos.y]) {
        level.explored[pos.y][pos.x] = true  // LOGIC!
      }
    })
  }
}
```

**Test**: "Can I describe this command in 5 words or less?"
- ✅ "Move player, tick systems, update FOV" → Good orchestration
- ❌ "Loop through cells, check bounds, update arrays..." → Too much logic

---

### 1.2 Guard Clauses (Early Returns)

**Use guard clauses to exit early for invalid states.**

```typescript
execute(state: GameState): GameState {
  // Guard: Check level exists
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  // Guard: Check item exists
  const item = level.items.find(i => i.id === this.itemId)
  if (!item) {
    const messages = this.messageService.addMessage(
      state.messages,
      'Item not found.',
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }

  // Guard: Check inventory space
  if (!this.inventoryService.canCarry(state.player.inventory)) {
    const messages = this.messageService.addMessage(
      state.messages,
      'Inventory full.',
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }

  // Main logic (all guards passed)
  return this.performPickup(state, item)
}
```

**Benefits:**
- ✅ Reduces nesting
- ✅ Clear error paths
- ✅ Easier to read
- ✅ Prevents invalid operations

---

### 1.3 Command Delegation Pattern

**Delegate to other commands when appropriate.**

```typescript
/**
 * MoveCommand delegates to AttackCommand for combat
 */
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    const obstacle = this.movementService.detectObstacle(newPosition, level)

    // Delegate to AttackCommand
    if (obstacle.type === 'monster') {
      const attackCommand = new AttackCommand(
        obstacle.data.id,
        this.combatService,
        this.messageService,
        this.levelingService,
        this.turnService
      )
      return attackCommand.execute(state)  // Delegate and return
    }

    // Continue with movement
    return this.performMovement(state, newPosition, level)
  }
}
```

**When to Delegate:**
- ✅ Action triggers different user action (move → attack)
- ✅ Reuse existing command logic
- ✅ Avoid duplicating orchestration
- ✅ Keep commands focused (SRP)

**Examples:**
- Move → Attack (bump-to-attack)
- Open Door → Unlock (if has key)
- Read Scroll → Identify (if identification scroll)

---

### 1.4 Result Object Handling

**Handle service result objects appropriately.**

```typescript
/**
 * Handling DoorService result object
 */
execute(state: GameState): GameState {
  // Service returns result object
  const result = this.doorService.openDoorWithResult(level, door)

  // Update state with result.level
  const stateWithOpenDoor = {
    ...state,
    levels: new Map(state.levels).set(state.currentLevel, result.level)
  }

  // Add result.message
  const messages = this.messageService.addMessage(
    stateWithOpenDoor.messages,
    result.message,
    'info',
    state.turnCount + 1
  )

  return { ...stateWithOpenDoor, messages }
}
```

**Result Object Pattern Benefits:**
- ✅ Type-safe returns
- ✅ Multiple values
- ✅ Self-documenting
- ✅ Easy to extend

---

### 1.5 Turn Management Pattern

**Always use TurnService for turn increments.**

```typescript
/**
 * Standard turn increment pattern
 */
execute(state: GameState): GameState {
  // Perform action
  const updatedPlayer = this.someService.doSomething(state.player)

  // Update messages
  const messages = this.messageService.addMessage(
    state.messages,
    'Action completed.',
    'success',
    state.turnCount  // Current turn (before increment)
  )

  // Return with turn increment (LAST step)
  return this.turnService.incrementTurn({
    ...state,
    player: updatedPlayer,
    messages
  })
}
```

**Rules:**
- ✅ Use `TurnService.incrementTurn()` (DRY)
- ✅ Call at END of command (last return)
- ✅ Only increment on successful actions
- ✅ Failed actions return unchanged state (no turn)

**Counter-Example (Failed Action):**
```typescript
if (!canPerformAction) {
  const messages = this.messageService.addMessage(
    state.messages,
    'Cannot do that.',
    'warning',
    state.turnCount  // Same turn (no increment)
  )
  return { ...state, messages }  // No turn increment!
}
```

---

### 1.6 Immutability Pattern

**CRITICAL: Commands must NEVER mutate state.**

```typescript
// ✅ CORRECT - Return new object
execute(state: GameState): GameState {
  const updatedPlayer = { ...state.player, hp: newHp }
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, updatedLevel)

  return {
    ...state,
    player: updatedPlayer,
    levels: updatedLevels
  }
}

// ❌ WRONG - Mutates state
execute(state: GameState): GameState {
  state.player.hp = newHp  // MUTATION!
  state.levels.get(state.currentLevel).monsters = []  // MUTATION!
  return state
}

// ✅ CORRECT - Update Map immutably
const updatedLevels = new Map(state.levels)
updatedLevels.set(state.currentLevel, { ...level, monsters: updatedMonsters })

// ✅ CORRECT - Update array immutably
const updatedMonsters = level.monsters.filter(m => m.id !== monsterId)
const updatedLevel = { ...level, monsters: updatedMonsters }
```

**Immutability Rules:**
1. Always use spread operator `{...obj}`, `[...arr]`
2. Never use `push`, `splice`, `pop` on arrays
3. Never assign to object properties after creation
4. Return new objects from all updates
5. Create new Maps when updating state.levels

---

## 2. Advanced Patterns

### 2.1 Multi-Route Commands

**When a command has multiple execution paths:**

```typescript
/**
 * MoveCommand has 4 routes: monster, door, wall, clear
 */
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    const newPosition = this.movementService.applyDirection(...)
    const obstacle = this.movementService.detectObstacle(newPosition, level)

    // ROUTE 1: Monster → Delegate to AttackCommand
    if (obstacle.type === 'monster') {
      return new AttackCommand(...).execute(state)
    }

    // ROUTE 2: Door → Handle based on state
    if (obstacle.type === 'door') {
      return this.handleDoor(state, obstacle.data, newPosition)
    }

    // ROUTE 3: Wall → Blocked (no turn)
    if (obstacle.type === 'wall') {
      return this.showBlockedMessage(state)
    }

    // ROUTE 4: Clear → Normal movement
    return this.performMovement(state, newPosition, level)
  }

  private handleDoor(state: GameState, door: Door, position: Position): GameState {
    // Door-specific orchestration
  }

  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // Movement orchestration
  }
}
```

**Benefits:**
- ✅ Clear routing logic
- ✅ Separate concerns (each route is isolated)
- ✅ Easy to test (test each route separately)
- ✅ Maintainable (add new routes easily)

---

### 2.2 Private Helper Methods

**Use private helpers to improve readability:**

```typescript
/**
 * Complex command with helper methods
 */
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    // Main orchestration logic
    if (obstacle.type === 'door') {
      return this.handleDoor(state, obstacle.data, newPosition)
    }

    return this.performMovement(state, newPosition, level)
  }

  /**
   * Private helper: Handle door interaction
   */
  private handleDoor(state: GameState, door: Door, position: Position): GameState {
    // Locked door
    if (door.state === DoorState.LOCKED) {
      const messages = this.messageService.addMessage(...)
      return { ...state, messages }
    }

    // Open door and move through
    const result = this.doorService.openDoorWithResult(level, door)
    return this.performMovement(
      { ...state, levels: updatedLevels },
      position,
      result.level
    )
  }

  /**
   * Private helper: Perform movement with side effects
   */
  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // Movement orchestration (hunger, fuel, FOV, turn)
    const player = this.movementService.movePlayer(state.player, position)
    const hungerResult = this.hungerService.tickHunger(player)
    const fuelResult = this.lightingService.tickFuel(hungerResult.player)
    const fovResult = this.fovService.updateFOV(...)

    return this.turnService.incrementTurn({...state})
  }
}
```

**When to Use Private Helpers:**
- ✅ Command >100 lines
- ✅ Repeated orchestration pattern
- ✅ Complex multi-step flow
- ✅ Improve readability

**When NOT to Use:**
- ❌ Extracting logic (should be in service)
- ❌ Creating "helper" methods that do calculations

---

### 2.3 Type Switching Pattern

**Switch statement for different item types:**

```typescript
export class EquipCommand implements ICommand {
  execute(state: GameState): GameState {
    // Guard: Find item
    const item = this.inventoryService.findItem(state.player, this.itemId)
    if (!item) {
      return this.returnWithMessage(state, 'You do not have that item.', 'warning')
    }

    // Equip based on item type (TYPE SWITCHING)
    let updatedPlayer = state.player
    let equipMessage = ''

    switch (item.type) {
      case ItemType.WEAPON:
        updatedPlayer = this.inventoryService.equipWeapon(state.player, item as Weapon)
        equipMessage = `You wield ${item.name}.`
        break

      case ItemType.ARMOR:
        updatedPlayer = this.inventoryService.equipArmor(state.player, item as Armor)
        equipMessage = `You put on ${item.name}.`
        break

      case ItemType.RING:
        if (!this.ringSlot) {
          return this.returnWithMessage(state, 'Specify which hand.', 'warning')
        }
        updatedPlayer = this.inventoryService.equipRing(state.player, item as Ring, this.ringSlot)
        equipMessage = `You put on ${item.name} on your ${this.ringSlot} hand.`
        break

      default:
        return this.returnWithMessage(state, 'You cannot equip that item.', 'warning')
    }

    const messages = this.messageService.addMessage(
      state.messages,
      equipMessage,
      'success',
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

**Pattern Benefits:**
- ✅ Type-safe narrowing (`item as Weapon`)
- ✅ Clear routing per item type
- ✅ Fallback for invalid types
- ✅ Consistent message generation

---

### 2.4 Common Orchestration Patterns

**Pattern 1: Sequential Service Calls**
```typescript
// Services called in order, each builds on previous
const validated = this.validationService.check(input)
const processed = this.processingService.process(validated)
const result = this.outputService.format(processed)
return this.turnService.incrementTurn({ ...state, result })
```

**Pattern 2: Conditional Routing**
```typescript
// Route to different services based on condition
if (obstacle.type === 'monster') {
  return this.combatService.attack(player, obstacle.data)
} else if (obstacle.type === 'door') {
  return this.doorService.open(level, obstacle.data)
} else {
  return this.movementService.move(player, position)
}
```

**Pattern 3: Delegation to Command**
```typescript
// Delegate to another command
if (shouldDelegateToOtherCommand) {
  const otherCommand = new OtherCommand(services)
  return otherCommand.execute(state)
}
```

**Pattern 4: Result Object Handling**
```typescript
// Handle service result objects
const result = this.serviceA.doSomething(input)
if (result.success) {
  return this.handleSuccess(state, result.data)
} else {
  return this.handleFailure(state, result.message)
}
```

---

## 3. Anti-Patterns to Avoid

### 3.1 Logic in Commands

**Problem:** Commands implementing game logic instead of orchestrating.

```typescript
// ❌ Bad - Logic in command
class MoveCommand {
  execute(state: GameState): GameState {
    // LOOP IN COMMAND!
    visibleCells.forEach((key) => {
      const pos = this.parsePosition(key)  // CALCULATION!
      if (level.explored[pos.y]) {
        level.explored[pos.y][pos.x] = true  // LOGIC!
      }
    })
  }
}

// ✅ Good - Orchestration only
class MoveCommand {
  execute(state: GameState): GameState {
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)
    return { ...state, levels: new Map(state.levels).set(state.currentLevel, updatedLevel) }
  }
}
```

**Detection:** Look for loops, calculations, array manipulation in commands.

---

### 3.2 Duplicate Orchestration

**Problem:** Same orchestration pattern repeated across multiple commands.

```typescript
// ❌ Bad - Duplication across commands
class Command1 {
  execute(state: GameState): GameState {
    return { ...state, turnCount: state.turnCount + 1 }  // Duplicate!
  }
}

class Command2 {
  execute(state: GameState): GameState {
    return { ...state, turnCount: state.turnCount + 1 }  // Duplicate!
  }
}

// ✅ Good - Extract to TurnService
class Command1 {
  execute(state: GameState): GameState {
    return this.turnService.incrementTurn(state)  // DRY!
  }
}
```

**Solution:** Extract repeated orchestration to service method.

---

### 3.3 Missing Guard Clauses

**Problem:** Commands crash or behave incorrectly due to invalid state.

```typescript
// ❌ Bad - No validation
class PickUpCommand {
  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    const item = level.items[0]  // Crash if no items!
    const updatedPlayer = this.inventoryService.addItem(state.player, item)
    return this.turnService.incrementTurn({...state, player: updatedPlayer})
  }
}

// ✅ Good - Guard clauses
class PickUpCommand {
  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state  // Guard!

    const item = level.items.find(i => i.position === state.player.position)
    if (!item) {  // Guard!
      const messages = this.messageService.addMessage(
        state.messages,
        'Nothing here.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Safe to proceed
    const updatedPlayer = this.inventoryService.addItem(state.player, item)
    return this.turnService.incrementTurn({...state, player: updatedPlayer})
  }
}
```

---

### 3.4 Direct State Mutation

**Problem:** Mutating state instead of returning new objects.

```typescript
// ❌ Bad - Mutation
execute(state: GameState): GameState {
  state.player.hp -= 10  // MUTATION!
  state.levels.get(state.currentLevel).monsters = []  // MUTATION!
  return state
}

// ✅ Good - Immutability
execute(state: GameState): GameState {
  const updatedPlayer = { ...state.player, hp: state.player.hp - 10 }
  const updatedLevel = { ...level, monsters: [] }
  const updatedLevels = new Map(state.levels).set(state.currentLevel, updatedLevel)

  return {
    ...state,
    player: updatedPlayer,
    levels: updatedLevels
  }
}
```

---

### 3.5 Not Using TurnService

**Problem:** Manual turn increment instead of using TurnService.

```typescript
// ❌ Bad - Manual increment
execute(state: GameState): GameState {
  return { ...state, turnCount: state.turnCount + 1 }  // Violates DRY!
}

// ✅ Good - Use TurnService
execute(state: GameState): GameState {
  return this.turnService.incrementTurn(state)
}
```

**Why:** TurnService provides single source of truth, allows future enhancements (status effects, turn-based triggers).

---

## Pattern Decision Tree

```
Need to route to different actions?
├─ YES → Use Multi-Route Pattern
└─ NO → Sequential orchestration

Action triggers another user action?
├─ YES → Use Delegation Pattern
└─ NO → Direct implementation

Operation can succeed or fail?
├─ YES → Use Guard Clauses + Error Messages
└─ NO → Direct success path

Command >100 lines?
├─ YES → Extract Private Helpers
└─ NO → Keep methods in execute()

Returning multiple values from service?
├─ YES → Use Result Object Pattern
└─ NO → Single return value

Action consumes turn?
├─ YES → Use TurnService.incrementTurn()
└─ NO → Return state directly
```

---

## Related Documentation

- [Commands Overview](./README.md) - All commands reference
- [Creation Guide](./creation-guide.md) - Step-by-step creation
- [Testing Guide](./testing-guide.md) - Command testing
- [Services Patterns](../services/patterns.md) - Service patterns
- [Architecture](../architecture.md) - Overall architecture
- [ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md) - Review checklist

---

**Last Updated**: 2025-10-06
