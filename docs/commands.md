# Command Creation Guide: ASCII Roguelike

**Version**: 1.0
**Last Updated**: 2025-10-05
**Related Docs**: [Architecture](./architecture.md) | [Services](./services.md) | [CLAUDE.md](../CLAUDE.md) | [Testing Strategy](./testing-strategy.md) | [Architectural Review](./ARCHITECTURAL_REVIEW.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [When to Create a Command](#2-when-to-create-a-command)
3. [Command Responsibilities (Orchestration Principle)](#3-command-responsibilities-orchestration-principle)
4. [Command Structure & Organization](#4-command-structure--organization)
5. [Core Patterns](#5-core-patterns)
6. [Writing Command Tests](#6-writing-command-tests)
7. [Command Documentation](#7-command-documentation)
8. [Integration with Services](#8-integration-with-services)
9. [Advanced Patterns](#9-advanced-patterns)
10. [Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)
11. [Step-by-Step Creation Guide](#11-step-by-step-creation-guide)
12. [Real Examples](#12-real-examples)
13. [Migration Guide](#13-migration-guide)
14. [Quick Reference](#14-quick-reference)

---

## 1. Introduction

### 1.1 What is a Command?

A **Command** is a class that **orchestrates services** to handle a single user action. Commands are the coordination layer between UI input and game logic.

**Key Characteristics**:
- Implements `ICommand` interface
- Single `execute(state: GameState): GameState` method
- Orchestrates services (NO logic implementation)
- Returns new immutable state
- Testable via mocked services

**What Commands DO**:
- ✅ Capture user intent (move, attack, pick up, etc.)
- ✅ Call services in specific order
- ✅ Route decisions to appropriate services
- ✅ Delegate to other commands when needed
- ✅ Handle result objects from services
- ✅ Update state immutably
- ✅ Return new GameState

**What Commands DON'T DO**:
- ❌ Implement game logic (services' job)
- ❌ Render to DOM (UI layer's job)
- ❌ Contain loops, calculations, algorithms
- ❌ Mutate state (return new objects)
- ❌ Duplicate orchestration patterns

---

### 1.2 Role in Layered Architecture

```
┌──────────────────────────────────────────┐
│  UI Layer                                │
│  - Captures keyboard input               │
│  - Creates Command instances             │
│  - Renders new state                     │
└──────────────────────────────────────────┘
                    ↓
              User Input (key press)
                    ↓
┌──────────────────────────────────────────┐
│  COMMAND LAYER ← YOU ARE HERE            │
│  - Orchestrates services                 │
│  - Routes to appropriate logic           │
│  - Delegates to other commands           │
│  - Returns new state                     │
└──────────────────────────────────────────┘
                    ↓
          Calls multiple Services
                    ↓
┌──────────────────────────────────────────┐
│  Service Layer                           │
│  - ALL game logic implementation         │
│  - Business rules                        │
│  - Calculations                          │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Data Layer                              │
│  - Immutable GameState                   │
└──────────────────────────────────────────┘
```

**The Rule**: Commands orchestrate, services implement. If it's a decision about **what** to do, it belongs in a command. If it's **how** to do it, it belongs in a service.

---

### 1.3 Quick Reference: 40+ Existing Commands

**Movement & Combat** (6 commands):
- MoveCommand (↑↓←→) - Player movement with bump-to-attack
- AttackCommand - Combat resolution
- OpenDoorCommand (o) - Open doors
- CloseDoorCommand (c) - Close doors
- SearchCommand (s) - Find secrets
- MoveStairsCommand (<>) - Level traversal

**Inventory Management** (5 commands):
- PickUpCommand (,) - Pick up items
- DropCommand (d) - Drop items
- EquipCommand (w/W/P) - Equip items
- UnequipCommand (R/T) - Remove equipment
- TakeOffCommand - Remove armor

**Consumables** (4 commands):
- EatCommand (e) - Consume food
- QuaffPotionCommand (q) - Drink potions
- ReadScrollCommand (r) - Read scrolls
- ZapWandCommand (z) - Use wands
- RefillLanternCommand (F) - Refill lantern

**Meta Commands** (2 commands):
- SaveCommand (S) - Save game
- QuitCommand (Q) - Quit to menu

**Debug Commands** (10 commands):
- ToggleDebugConsoleCommand (~) - Console toggle
- ToggleGodModeCommand (g) - Invincibility
- RevealMapCommand (v) - Reveal map
- ToggleFOVDebugCommand (f) - FOV overlay
- TogglePathDebugCommand (p) - Pathfinding overlay
- ToggleAIDebugCommand (n) - AI states
- SpawnMonsterCommand (m) - Spawn test monster
- WakeAllMonstersCommand (M) - Wake monsters
- KillAllMonstersCommand (K) - Kill all monsters

---

## 2. When to Create a Command

### 2.1 Decision Tree

```
Is this a new user action?
├─ YES → Create Command
├─ NO → Is it new orchestration for existing action?
   ├─ YES → Extend existing command
   └─ NO → Is it game logic?
      ├─ YES → Create/extend Service
      └─ NO → Reconsider approach
```

---

### 2.2 Signs You Need a New Command

**🚨 Create a command when:**

1. **New User Input/Keybinding**
   ```
   Player wants to "rest" (wait a turn)
   → Create RestCommand
   ```

2. **New Player Action**
   ```
   Adding "throw" mechanic for ranged combat
   → Create ThrowCommand
   ```

3. **Complex Multi-Service Coordination**
   ```
   Teleportation requires: position validation,
   monster avoidance, FOV update, message
   → Create TeleportCommand
   ```

4. **Delegation Pattern Needed**
   ```
   MoveCommand needs to trigger combat
   → Delegates to AttackCommand
   ```

5. **Unique State Transitions**
   ```
   Victory requires: item check, level check,
   state update, score calculation
   → VictoryCommand (or LevelService handles)
   ```

**Examples from Real Development**:
- Movement with bump-to-attack → **MoveCommand** delegates to **AttackCommand**
- Equipment management (weapon/armor/ring) → **EquipCommand** with type switching
- Stairs navigation with victory check → **MoveStairsCommand** uses **LevelService**

---

### 2.3 When to Extend Existing Command vs Create New

**Extend Existing Command When:**
- ✅ Same user intent (e.g., move + auto-open door)
- ✅ Same keybinding
- ✅ Adds routing logic (new `if` branch)
- ✅ Reuses same services

**Create New Command When:**
- ✅ Different user action (new keybinding)
- ✅ Completely different service orchestration
- ✅ Distinct player intent
- ✅ Command would become too complex (>200 lines)

**Example**:
```
Q: Add "kick door" action to break locked doors?
A: Extend OpenDoorCommand (same intent: open doors)

Q: Add "throw weapon" for ranged attack?
A: Create ThrowCommand (different intent: ranged combat)
```

---

## 3. Command Responsibilities (Orchestration Principle)

### 3.1 The Orchestration Principle

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
      const pos = this.parseKey(key)  // CALCULATION!
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

### 3.2 What Commands DO

**1. Service Orchestration**
```typescript
// Call services in specific order
const newPos = this.movementService.calculatePosition(...)
const isValid = this.movementService.canMoveTo(...)
const updatedPlayer = this.lightingService.tickFuel(player)
const fovResult = this.fovService.updateFOV(...)
return this.turnService.incrementTurn(state)
```

**2. Routing Decisions**
```typescript
// Route to appropriate service/command
if (obstacle.type === 'monster') {
  return attackCommand.execute(state)
} else if (obstacle.type === 'door') {
  return this.handleDoor(state, obstacle)
} else {
  return this.performMovement(state, newPos)
}
```

**3. Result Handling**
```typescript
// Handle service result objects
const result = this.combatService.playerAttack(player, monster)
if (result.killed) {
  // Apply XP, remove monster
}
```

**4. State Updates (Immutably)**
```typescript
// Return new state objects
return this.turnService.incrementTurn({
  ...state,
  player: updatedPlayer,
  levels: updatedLevels,
  messages: finalMessages
})
```

---

### 3.3 What Commands DON'T DO

**❌ NO Loops**
```typescript
// Bad - loop in command
level.items.forEach(item => { ... })

// Good - service method
const item = this.inventoryService.findItemAtPosition(level, position)
```

**❌ NO Calculations**
```typescript
// Bad - calculation in command
const damage = Math.floor(Math.random() * 10)

// Good - service method
const damage = this.combatService.calculateDamage(weapon)
```

**❌ NO Array/Object Manipulation**
```typescript
// Bad - array manipulation in command
const updatedMonsters = level.monsters.filter(m => m.id !== id)

// Good - service method or simple spreading
const updatedLevel = this.combatService.removeMonster(level, monsterId)
```

**❌ NO Business Logic**
```typescript
// Bad - logic in command
if (player.hp < monster.damage * 2) {
  // Complex decision logic
}

// Good - service decision
if (this.combatService.shouldFlee(player, monster)) {
  // Simple routing
}
```

---

### 3.4 Single Responsibility for Commands

**Each command handles ONE user action.**

```typescript
// ✅ Good - Single action
class PickUpCommand {
  execute(state: GameState): GameState {
    // Pick up item at position
    // Add to inventory
    // Update state
    // Increment turn
  }
}

// ❌ Bad - Multiple actions
class ItemCommand {
  execute(state: GameState, action: string): GameState {
    if (action === 'pickup') { ... }
    if (action === 'drop') { ... }
    if (action === 'equip') { ... }
    if (action === 'use') { ... }
    // TOO MANY RESPONSIBILITIES!
  }
}
```

**Test**: "What user action does this command handle?" Should be one clear answer.

---

## 4. Command Structure & Organization

### 4.1 Folder Structure

```
src/commands/CommandName/
├── CommandName.ts              # Implementation
├── scenario-1.test.ts          # Scenario-based tests
├── scenario-2.test.ts          # More tests
└── index.ts                    # Barrel export
```

**Real Example** (MoveCommand):
```
src/commands/MoveCommand/
├── MoveCommand.ts
├── movement.test.ts
├── collision.test.ts
├── door-interaction.test.ts
├── fov-updates.test.ts
├── bump-attack.test.ts
└── index.ts
```

---

### 4.2 Naming Conventions

**Command Names**: `{Action}Command`

**Good Examples**:
- `MoveCommand` - Player movement
- `AttackCommand` - Combat action
- `PickUpCommand` - Pick up item
- `EquipCommand` - Equip item
- `QuaffPotionCommand` - Drink potion
- `MoveStairsCommand` - Stairs navigation

**Bad Examples**:
- ❌ `PlayerMoveHandler` - Wrong suffix
- ❌ `Movement` - Not descriptive enough
- ❌ `DoMove` - Poor naming
- ❌ `MoveCommandClass` - Redundant suffix

---

### 4.3 File Header Template

```typescript
import { GameState, Player, Monster } from '@game/core/core'
import { ICommand } from '../ICommand'
import { ServiceA } from '@services/ServiceA'
import { ServiceB } from '@services/ServiceB'

// ============================================================================
// COMMAND_NAME - Brief description of user action
// ============================================================================

/**
 * CommandName handles [user action]
 *
 * User Action: [Key press or UI interaction]
 * Turn Cost: [Yes/No]
 *
 * Orchestration:
 * - Service calls in order
 * - Routing decisions
 * - Delegation patterns
 *
 * @see docs/commands/command-name.md for detailed documentation
 */
export class CommandName implements ICommand {
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB
  ) {}

  execute(state: GameState): GameState {
    // Orchestration only
  }

  // Private helper methods (if needed)
}
```

---

### 4.4 Method Organization

**Order within command class:**

1. **Constructor** (dependency injection)
2. **execute() method** (public API)
3. **Private helper methods** (if needed for clarity)

```typescript
export class ExampleCommand implements ICommand {
  // 1. Constructor
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB,
    private turnService: TurnService
  ) {}

  // 2. Public execute method
  execute(state: GameState): GameState {
    // Guard clauses
    if (!state.player) return state

    // Service orchestration
    const result = this.serviceA.doSomething()

    if (result.success) {
      return this.handleSuccess(state, result)
    } else {
      return this.handleFailure(state, result.message)
    }
  }

  // 3. Private helpers (for readability)
  private handleSuccess(state: GameState, result: any): GameState {
    // Complex success flow
    return this.turnService.incrementTurn({...state})
  }

  private handleFailure(state: GameState, message: string): GameState {
    // Failure flow (no turn)
    return { ...state, messages: [...state.messages, message] }
  }
}
```

---

### 4.5 ICommand Interface

**All commands must implement**:

```typescript
export interface ICommand {
  execute(state: GameState): GameState
}
```

**Signature Requirements**:
- ✅ Single method: `execute`
- ✅ Input: `GameState`
- ✅ Output: `GameState` (new object)
- ✅ No side effects (pure orchestration)

---

## 5. Core Patterns

### 5.1 Dependency Injection

**Always inject services via constructor.**

```typescript
/**
 * Standard dependency injection pattern for commands
 */
class PickUpCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
    // Use injected services
    const item = this.inventoryService.findItemAtPosition(...)
    return this.turnService.incrementTurn(state)
  }
}
```

**Why?**
- ✅ Testable (inject mocked services)
- ✅ Flexible (swap implementations)
- ✅ Clear dependencies (visible in constructor)
- ✅ Follows Dependency Inversion Principle

---

### 5.2 Guard Clauses (Early Returns)

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

**Benefits**:
- ✅ Reduces nesting
- ✅ Clear error paths
- ✅ Easier to read
- ✅ Prevents invalid operations

---

### 5.3 Command Delegation Pattern

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

**When to Delegate**:
- ✅ Action triggers different user action (move → attack)
- ✅ Reuse existing command logic
- ✅ Avoid duplicating orchestration
- ✅ Keep commands focused (SRP)

---

### 5.4 Result Object Handling

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

**Result Object Pattern Benefits**:
- ✅ Type-safe returns
- ✅ Multiple values
- ✅ Self-documenting
- ✅ Easy to extend

---

### 5.5 Turn Management Pattern

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

**Rules**:
- ✅ Use `TurnService.incrementTurn()` (DRY)
- ✅ Call at END of command (last return)
- ✅ Only increment on successful actions
- ✅ Failed actions return unchanged state (no turn)

**Counter-Example (Failed Action)**:
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

### 5.6 Immutability Pattern

**CRITICAL**: Commands must NEVER mutate state.

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

**Immutability Rules**:
1. Always use spread operator `{...obj}`, `[...arr]`
2. Never use `push`, `splice`, `pop` on arrays
3. Never assign to object properties after creation
4. Return new objects from all updates
5. Create new Maps when updating state.levels

---

## 6. Writing Command Tests

### 6.1 Test File Organization

**Scenario-Based Naming**: Test files describe behavior, not methods.

```
commands/MoveCommand/
├── MoveCommand.ts
├── movement.test.ts             # Basic movement scenarios
├── collision.test.ts            # Wall/obstacle blocking
├── door-interaction.test.ts     # Door opening/closing
├── fov-updates.test.ts          # FOV recalculation
├── bump-attack.test.ts          # Bump-to-attack delegation
└── index.ts
```

**NOT** ❌ `MoveCommand.test.ts` - too broad
**YES** ✅ `bump-attack.test.ts` - clear scenario

---

### 6.2 AAA Pattern (Arrange-Act-Assert)

**Every test follows this structure:**

```typescript
describe('PickUpCommand', () => {
  let command: PickUpCommand
  let mockInventoryService: jest.Mocked<InventoryService>
  let mockMessageService: jest.Mocked<MessageService>
  let mockTurnService: jest.Mocked<TurnService>

  beforeEach(() => {
    // Arrange: Setup mocked services
    mockInventoryService = {
      findItemAtPosition: jest.fn(),
      canCarry: jest.fn(),
      addItem: jest.fn()
    } as any

    mockMessageService = {
      addMessage: jest.fn((msgs, text) => [...msgs, text])
    } as any

    mockTurnService = {
      incrementTurn: jest.fn(state => ({ ...state, turnCount: state.turnCount + 1 }))
    } as any

    command = new PickUpCommand(
      mockInventoryService,
      mockMessageService,
      mockTurnService,
      {} as any  // identificationService
    )
  })

  test('picks up item successfully', () => {
    // Arrange: Create test data
    const item = createTestItem({ id: 'sword-1', type: ItemType.WEAPON })
    const state = createTestState({ currentLevel: 1 })

    mockInventoryService.findItemAtPosition.mockReturnValue(item)
    mockInventoryService.canCarry.mockReturnValue(true)
    mockInventoryService.addItem.mockReturnValue({
      ...state.player,
      inventory: [...state.player.inventory, item]
    })

    // Act: Execute command
    const result = command.execute(state)

    // Assert: Verify results
    expect(mockInventoryService.addItem).toHaveBeenCalledWith(state.player, item)
    expect(mockTurnService.incrementTurn).toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount + 1)
  })

  test('fails when inventory is full', () => {
    // Arrange
    const state = createTestState()
    mockInventoryService.canCarry.mockReturnValue(false)

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockInventoryService.addItem).not.toHaveBeenCalled()
    expect(mockTurnService.incrementTurn).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount)  // No turn increment
  })
})
```

---

### 6.3 Mocking Services

**Create test doubles for services:**

```typescript
/**
 * Simple mock pattern
 */
const mockCombatService = {
  playerAttack: jest.fn().mockReturnValue({
    hit: true,
    damage: 10,
    killed: false,
    defender: 'Orc'
  })
} as jest.Mocked<CombatService>

/**
 * Mock with multiple scenarios
 */
beforeEach(() => {
  mockMovementService = {
    applyDirection: jest.fn(),
    detectObstacle: jest.fn(),
    movePlayer: jest.fn()
  } as any
})

test('handles wall collision', () => {
  mockMovementService.detectObstacle.mockReturnValue({
    type: 'wall',
    data: null
  })

  const result = command.execute(state)

  expect(mockMovementService.movePlayer).not.toHaveBeenCalled()
})
```

---

### 6.4 Test Descriptive Names

**Use full sentences describing expected behavior.**

```typescript
// ✅ Good - describes behavior
test('picks up item and adds to inventory')
test('blocks pickup when inventory is full')
test('increments turn on successful pickup')
test('delegates to AttackCommand when bumping monster')
test('opens closed door and moves through')

// ❌ Bad - too vague
test('execute')
test('pickup')
test('works')
test('test1')
```

---

### 6.5 Coverage Requirements

**Minimum Standards**:
- >80% line coverage (minimum)
- >80% branch coverage
- 100% for critical commands (Move, Attack, PickUp)

**How to Check**:
```bash
npm run test:coverage -- MoveCommand
```

**What to Test**:
- ✅ Happy path (successful execution)
- ✅ Error paths (all guard clauses)
- ✅ Service orchestration (correct order)
- ✅ Turn increment (when applicable)
- ✅ State immutability (new object returned)
- ✅ Edge cases (empty inventory, missing items, etc.)

---

## 7. Command Documentation

### 7.1 JSDoc Comments

**Every command needs JSDoc.**

```typescript
/**
 * Pick up item from dungeon floor at player position
 *
 * User Action: Press ',' (comma)
 * Turn Cost: Yes (if successful)
 *
 * Orchestration:
 * - Find item at player position (InventoryService)
 * - Check inventory capacity (InventoryService)
 * - Add to inventory (InventoryService)
 * - Remove from level floor
 * - Generate pickup message (MessageService)
 * - Increment turn (TurnService)
 *
 * Error Cases:
 * - No item at position → message, no turn
 * - Inventory full → message, no turn
 *
 * @see docs/commands/pickup.md for detailed documentation
 *
 * @example
 * const command = new PickUpCommand(services)
 * const newState = command.execute(state)
 */
export class PickUpCommand implements ICommand {
  // ...
}
```

**Required JSDoc Elements**:
- Brief description (one line)
- User action (keybinding)
- Turn cost (Yes/No)
- Orchestration flow
- Error cases
- `@see` link to docs file
- `@example` for usage

---

### 7.2 Command Documentation File

**Every command needs a doc file**: `docs/commands/{command-name}.md`

**Template** (based on pickup.md):

```markdown
# CommandName

**Keybinding**: `X` (key)
**Consumes Turn**: Yes/No
**Implementation**: `src/commands/CommandName/CommandName.ts`

---

## Purpose

Brief description of what this command does.

---

## Behavior

### Normal Flow
1. Step 1
2. Step 2
3. Step 3

### Special Cases
Describe any special behavior.

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Invalid state** | "Error message" | No |

---

## Turn Side Effects

**Only if action succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |

---

## Services Used

- **ServiceA**: Purpose
- **ServiceB**: Purpose

---

## Code Flow

```
CommandName.execute()
├── Guard clause 1
├── Guard clause 2
└── Main logic
    ├── Service call 1
    ├── Service call 2
    └── Increment turn
```

---

## Examples

### Example 1: Success Case
```
[Description]
→ [Result]
```

---

## Related Commands

- [OtherCommand](./other.md) - Relationship

---

**Architecture**: Command orchestrates [list services]. Zero logic in command itself.
```

**See Real Example**: `docs/commands/pickup.md`

---

## 8. Integration with Services

### 8.1 Service-Command Contract

**The Rule**: Commands call services, services return results.

```typescript
/**
 * Standard service integration pattern
 */
class MoveCommand implements ICommand {
  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    // 1. Calculate (MovementService)
    const newPos = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // 2. Validate (MovementService)
    const obstacle = this.movementService.detectObstacle(newPos, level)
    if (obstacle.type === 'wall') return state

    // 3. Move (MovementService)
    const player = this.movementService.movePlayer(state.player, newPos)

    // 4. Tick fuel (LightingService)
    const fuelResult = this.lightingService.tickFuel(player)

    // 5. Update FOV (FOVService)
    const fovResult = this.fovService.updateFOV(newPos, lightRadius, level)

    // 6. Increment turn (TurnService)
    return this.turnService.incrementTurn({
      ...state,
      player: fuelResult.player,
      visibleCells: fovResult.visibleCells
    })
  }
}
```

**Command Checklist**:
- [ ] Each step is a service call
- [ ] No loops or calculations
- [ ] No business logic
- [ ] Reads like a recipe

---

### 8.2 Common Orchestration Patterns

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
  // Use result.data
  return this.handleSuccess(state, result.data)
} else {
  // Use result.message
  return this.handleFailure(state, result.message)
}
```

---

## 9. Advanced Patterns

### 9.1 Multi-Route Commands

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

**Benefits**:
- ✅ Clear routing logic
- ✅ Separate concerns (each route is isolated)
- ✅ Easy to test (test each route separately)
- ✅ Maintainable (add new routes easily)

---

### 9.2 Command Delegation Pattern

**When to delegate to another command:**

```typescript
/**
 * MoveCommand delegates to AttackCommand
 */
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    const obstacle = this.movementService.detectObstacle(newPos, level)

    if (obstacle.type === 'monster') {
      // Create and delegate to AttackCommand
      const attackCommand = new AttackCommand(
        obstacle.data.id,
        this.combatService,
        this.messageService,
        this.levelingService,
        this.turnService
      )
      return attackCommand.execute(state)  // Delegate and return
    }

    // ... other routes
  }
}
```

**Delegation Guidelines**:
- ✅ Delegate when action triggers different user action
- ✅ Reuse existing command logic (DRY)
- ✅ Avoid duplicating orchestration
- ✅ Keep commands focused (Single Responsibility)

**Example**: Move → Attack, Open Door → Unlock (if has key)

---

### 9.3 Private Helper Methods

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

**When to Use Private Helpers**:
- ✅ Command >100 lines
- ✅ Repeated orchestration pattern
- ✅ Complex multi-step flow
- ✅ Improve readability

**When NOT to Use**:
- ❌ Extracting logic (should be in service)
- ❌ Creating "helper" methods that do calculations

---

### 9.4 Error Handling with Guard Clauses

**Use guard clauses for all error cases:**

```typescript
execute(state: GameState): GameState {
  // Guard: Level exists
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  // Guard: Item exists at position
  const item = this.inventoryService.findItemAtPosition(level, state.player.position)
  if (!item) {
    return this.returnWithMessage(state, 'Nothing here to pick up.', 'info')
  }

  // Guard: Inventory has space
  if (!this.inventoryService.canCarry(state.player.inventory)) {
    return this.returnWithMessage(state, 'Inventory full.', 'warning')
  }

  // Guard: Item is not cursed (if applicable)
  if (this.itemService.isCursed(item) && !state.player.hasBless) {
    return this.returnWithMessage(state, 'The item is cursed!', 'warning')
  }

  // All guards passed - perform action
  return this.performPickup(state, item)
}

private returnWithMessage(state: GameState, text: string, type: string): GameState {
  const messages = this.messageService.addMessage(state.messages, text, type, state.turnCount)
  return { ...state, messages }
}
```

---

### 9.5 State Updates Pattern

**Always update state immutably:**

```typescript
/**
 * Immutable state update pattern
 */
execute(state: GameState): GameState {
  // 1. Update player
  const updatedPlayer = { ...state.player, hp: newHp }

  // 2. Update level (in Map)
  const updatedLevel = { ...level, monsters: updatedMonsters }
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, updatedLevel)

  // 3. Update messages
  const messages = this.messageService.addMessage(
    state.messages,
    'Action completed.',
    'success',
    state.turnCount
  )

  // 4. Return new state (spread operator)
  return this.turnService.incrementTurn({
    ...state,
    player: updatedPlayer,
    levels: updatedLevels,
    messages
  })
}
```

---

## 10. Anti-Patterns to Avoid

### 10.1 Logic in Commands

**Problem**: Commands implementing game logic instead of orchestrating.

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

**Detection**: Look for loops, calculations, array manipulation in commands.

---

### 10.2 Duplicate Orchestration

**Problem**: Same orchestration pattern repeated across multiple commands.

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

**Solution**: Extract repeated orchestration to service method.

---

### 10.3 Missing Guard Clauses

**Problem**: Commands crash or behave incorrectly due to invalid state.

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

### 10.4 Direct State Mutation

**Problem**: Mutating state instead of returning new objects.

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

### 10.5 Not Using TurnService

**Problem**: Manual turn increment instead of using TurnService.

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

**Why**: TurnService provides single source of truth, allows future enhancements (status effects, turn-based triggers).

---

## 11. Step-by-Step Creation Guide

### Phase 1: Planning

**Step 1.1: Define User Action**
- [ ] What action does the user perform? (e.g., "pick up item")
- [ ] What keybinding? (e.g., `,` comma key)
- [ ] Does it consume a turn? (Yes/No)

**Step 1.2: Identify Required Services**
```
List services needed:
- Service 1: Purpose
- Service 2: Purpose
- TurnService: (always needed if turn consumed)
```

**Step 1.3: Map Orchestration Flow**
```
1. Guard clause: Check precondition
2. Service call: Validate action
3. Service call: Perform action
4. Service call: Update state
5. Return: Increment turn
```

**Step 1.4: Check Existing Patterns**
- [ ] Review similar commands
- [ ] Identify reusable patterns
- [ ] Check if delegation is appropriate

---

### Phase 2: Implementation

**Step 2.1: Create Folder Structure**
```bash
mkdir -p src/commands/CommandName
touch src/commands/CommandName/CommandName.ts
touch src/commands/CommandName/index.ts
```

**Step 2.2: Implement ICommand Interface**
```typescript
import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'

export class CommandName implements ICommand {
  constructor(
    // Inject services
  ) {}

  execute(state: GameState): GameState {
    // TODO: Implement
    return state
  }
}
```

**Step 2.3: Add Service Dependencies**
```typescript
constructor(
  private serviceA: ServiceA,
  private serviceB: ServiceB,
  private messageService: MessageService,
  private turnService: TurnService
) {}
```

**Step 2.4: Implement execute() Method**
```typescript
execute(state: GameState): GameState {
  // 1. Guard clauses
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  // 2. Service orchestration
  const result = this.serviceA.doSomething(state.player)

  if (!result.success) {
    const messages = this.messageService.addMessage(
      state.messages,
      result.message,
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }

  // 3. Update state
  const updatedState = { ...state, player: result.player }

  // 4. Increment turn
  return this.turnService.incrementTurn(updatedState)
}
```

**Step 2.5: Create Barrel Export**
```typescript
// index.ts
export { CommandName } from './CommandName'
```

---

### Phase 3: Testing

**Step 3.1: Create Test File**
```bash
touch src/commands/CommandName/basic-flow.test.ts
```

**Step 3.2: Write Tests (AAA Pattern)**
```typescript
import { CommandName } from './CommandName'
import { createTestState, createTestItem } from '@test/helpers'

describe('CommandName - Basic Flow', () => {
  let command: CommandName
  let mockServiceA: jest.Mocked<ServiceA>
  let mockTurnService: jest.Mocked<TurnService>

  beforeEach(() => {
    mockServiceA = {
      doSomething: jest.fn()
    } as any

    mockTurnService = {
      incrementTurn: jest.fn(state => ({ ...state, turnCount: state.turnCount + 1 }))
    } as any

    command = new CommandName(mockServiceA, mockTurnService)
  })

  test('performs action successfully', () => {
    // Arrange
    const state = createTestState()
    mockServiceA.doSomething.mockReturnValue({ success: true, player: state.player })

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockServiceA.doSomething).toHaveBeenCalledWith(state.player)
    expect(mockTurnService.incrementTurn).toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount + 1)
  })

  test('fails when precondition not met', () => {
    // Arrange
    const state = createTestState()
    mockServiceA.doSomething.mockReturnValue({ success: false, message: 'Error' })

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockTurnService.incrementTurn).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount)  // No turn increment
  })
})
```

**Step 3.3: Test Edge Cases**
- [ ] Guard clauses (null/undefined)
- [ ] Error paths
- [ ] Turn consumption (success vs failure)
- [ ] State immutability

**Step 3.4: Verify Coverage**
```bash
npm test CommandName -- --coverage
```
- [ ] >80% line coverage
- [ ] >80% branch coverage

---

### Phase 4: Integration

**Step 4.1: Update main.ts**
```typescript
// Add to command initialization
const commandName = new CommandName(
  serviceA,
  serviceB,
  messageService,
  turnService
)

// Add to command map
commandMap.set('X', commandName)  // X = keybinding
```

**Step 4.2: Update InputHandler**
```typescript
// Map key press to command
case 'X':
  return commandMap.get('X')
```

**Step 4.3: Test Integration**
```bash
npm run dev
# Test command with keybinding
```

---

### Phase 5: Documentation

**Step 5.1: Add JSDoc to Command**
```typescript
/**
 * CommandName handles [user action]
 *
 * User Action: Press 'X'
 * Turn Cost: Yes/No
 *
 * Orchestration:
 * - Step 1 (ServiceA)
 * - Step 2 (ServiceB)
 * - Increment turn (TurnService)
 *
 * @see docs/commands/command-name.md
 */
```

**Step 5.2: Create Command Doc File**
```bash
touch docs/commands/command-name.md
```

**Step 5.3: Write Documentation**
(Use template from Section 7.2)

**Step 5.4: Update commands/README.md**
```markdown
| `X` | [CommandName](./command-name.md) | Yes/No | Description |
```

---

## 12. Real Examples

### 12.1 Simple Command: PickUpCommand

**Why Simple?**
- 92 lines total
- 4 service dependencies
- Linear orchestration flow
- No delegation
- Clear guard clauses

**Code** (`src/commands/PickUpCommand/PickUpCommand.ts`):
```typescript
export class PickUpCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const playerPos = state.player.position

    // Find item at player's position
    const itemAtPosition = level.items.find(
      (item) => item.position && item.position.x === playerPos.x && item.position.y === playerPos.y
    )

    // Guard: No item
    if (!itemAtPosition) {
      const messages = this.messageService.addMessage(
        state.messages,
        'There is nothing here to pick up.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Guard: Inventory full
    if (!this.inventoryService.canCarry(state.player.inventory)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Your pack is full. You cannot carry any more items.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Add item to inventory
    const updatedPlayer = this.inventoryService.addItem(state.player, itemAtPosition)

    // Remove item from level
    const updatedItems = level.items.filter((item) => item.id !== itemAtPosition.id)
    const updatedLevel = { ...level, items: updatedItems }
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // Check if picked up amulet
    const isAmulet = itemAtPosition.type === ItemType.AMULET
    const hasAmulet = state.hasAmulet || isAmulet

    // Add message
    const displayName = this.identificationService.getDisplayName(itemAtPosition, state)
    let messages = this.messageService.addMessage(
      state.messages,
      `You pick up ${displayName}.`,
      'success',
      state.turnCount
    )

    if (isAmulet) {
      messages = this.messageService.addMessage(
        messages,
        'You have retrieved the Amulet of Yendor! Return to Level 1 to win!',
        'success',
        state.turnCount
      )
    }

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      levels: updatedLevels,
      messages,
      hasAmulet,
    })
  }
}
```

**Orchestration Pattern**:
1. Guard: Check level exists
2. Guard: Find item at position
3. Guard: Check inventory space
4. Service: Add item to inventory
5. Update: Remove item from level
6. Service: Get display name
7. Update: Messages
8. Service: Increment turn

**Benefits**:
- ✅ Clear linear flow
- ✅ Good guard clauses
- ✅ Service orchestration only
- ✅ Immutable state updates
- ✅ Easy to test

---

### 12.2 Complex Orchestration: MoveCommand

**Why Complex?**
- 235 lines total
- 10+ service dependencies
- Multi-route orchestration
- Private helper method
- Delegates to AttackCommand

**Code Structure**:
```typescript
export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private combatService: CombatService,
    private levelingService: LevelingService,
    private doorService: DoorService,
    private hungerService: HungerService,
    private notificationService: NotificationService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Calculate target position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // Detect obstacle
    const obstacle = this.movementService.detectObstacle(newPosition, level)

    // ROUTE 1: Monster → Delegate to AttackCommand
    if (obstacle.type === 'monster') {
      const attackCommand = new AttackCommand(
        obstacle.data.id,
        this.combatService,
        this.messageService,
        this.levelingService,
        this.turnService
      )
      return attackCommand.execute(state)
    }

    // ROUTE 2: Door → Handle based on state
    if (obstacle.type === 'door') {
      // ... door handling logic
      return this.performMovement(stateWithOpenDoor, newPosition, result.level)
    }

    // ROUTE 3: Wall → Blocked
    if (obstacle.type === 'wall') {
      const messages = this.messageService.addMessage(...)
      return { ...state, messages }
    }

    // ROUTE 4: Clear → Normal movement
    return this.performMovement(state, newPosition, level)
  }

  /**
   * Private helper: Perform movement with all side effects
   */
  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // 1. Move player
    let player = this.movementService.movePlayer(state.player, position)

    // 2. Tick hunger
    const hungerResult = this.hungerService.tickHunger(player)
    player = hungerResult.player

    // Check starvation death
    if (hungerResult.death) {
      // ... handle death
    }

    // 3. Tick light fuel
    const fuelResult = this.lightingService.tickFuel(player)
    const updatedPlayer = fuelResult.player

    // 4. Update FOV and exploration
    const lightRadius = this.lightingService.getLightRadius(...)
    const fovResult = this.fovService.updateFOVAndExploration(...)

    // 5-9. More orchestration...

    return this.turnService.incrementTurn({...state})
  }
}
```

**Orchestration Pattern**:
1. Calculate new position (MovementService)
2. Detect obstacle (MovementService)
3. **Route to handler**:
   - Monster → Delegate to AttackCommand
   - Door → Open + performMovement
   - Wall → Block message
   - Clear → performMovement
4. **Private helper (performMovement)**:
   - Move player
   - Tick hunger (check death)
   - Tick fuel
   - Update FOV
   - Generate notifications
   - Increment turn

**Advanced Patterns**:
- ✅ Multi-route orchestration
- ✅ Command delegation
- ✅ Private helper for complex flow
- ✅ Death handling (early return)
- ✅ Result object integration

**See**: `src/commands/MoveCommand/MoveCommand.ts`

---

### 12.3 Delegation Pattern: MoveCommand → AttackCommand

**Pattern**: One command delegates to another.

```typescript
// MoveCommand detects monster and delegates
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    const obstacle = this.movementService.detectObstacle(newPosition, level)

    if (obstacle.type === 'monster') {
      // Create AttackCommand
      const attackCommand = new AttackCommand(
        obstacle.data.id,  // Monster ID
        this.combatService,
        this.messageService,
        this.levelingService,
        this.turnService
      )

      // Delegate and return result
      return attackCommand.execute(state)
    }

    // ... other routes
  }
}

// AttackCommand handles combat
class AttackCommand implements ICommand {
  constructor(
    private monsterId: string,
    private combatService: CombatService,
    private messageService: MessageService,
    private levelingService: LevelingService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const monster = level.monsters.find(m => m.id === this.monsterId)
    if (!monster) return state

    // Player attacks
    const result = this.combatService.playerAttack(state.player, monster)

    if (result.killed) {
      // Remove monster, award XP, level-up
      // ...
    } else {
      // Apply damage
      // ...
    }

    return this.turnService.incrementTurn({...state})
  }
}
```

**Why Delegate**:
- ✅ Reuse AttackCommand logic (DRY)
- ✅ Keep MoveCommand focused (SRP)
- ✅ Bump-to-attack uses same code as explicit attack
- ✅ AttackCommand testable in isolation

---

### 12.4 Type Switching: EquipCommand

**Pattern**: Switch statement for different item types.

```typescript
export class EquipCommand implements ICommand {
  constructor(
    private itemId: string,
    private ringSlot: 'left' | 'right' | null,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
    // Guard: Find item
    const item = this.inventoryService.findItem(state.player, this.itemId)
    if (!item) {
      return this.returnWithMessage(state, 'You do not have that item.', 'warning')
    }

    // Equip based on item type (TYPE SWITCHING)
    let updatedPlayer = state.player
    let equipMessage = ''
    const displayName = this.identificationService.getDisplayName(item, state)

    switch (item.type) {
      case ItemType.WEAPON:
        updatedPlayer = this.inventoryService.equipWeapon(state.player, item as Weapon)
        equipMessage = `You wield ${displayName}.`
        break

      case ItemType.ARMOR:
        updatedPlayer = this.inventoryService.equipArmor(state.player, item as Armor)
        equipMessage = `You put on ${displayName}.`
        break

      case ItemType.RING:
        if (!this.ringSlot) {
          return this.returnWithMessage(state, 'Specify which hand.', 'warning')
        }
        updatedPlayer = this.inventoryService.equipRing(state.player, item as Ring, this.ringSlot)
        equipMessage = `You put on ${displayName} on your ${this.ringSlot} hand.`
        break

      case ItemType.TORCH:
      case ItemType.LANTERN:
        updatedPlayer = this.inventoryService.equipLightSource(
          state.player,
          item as Torch | Lantern
        )
        equipMessage = `You light and wield ${displayName}.`
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
      messages,
    })
  }

  private returnWithMessage(state: GameState, text: string, type: string): GameState {
    const messages = this.messageService.addMessage(state.messages, text, type, state.turnCount)
    return { ...state, messages }
  }
}
```

**Pattern Benefits**:
- ✅ Type-safe narrowing (`item as Weapon`)
- ✅ Clear routing per item type
- ✅ Fallback for invalid types
- ✅ Consistent message generation

**See**: `src/commands/EquipCommand/EquipCommand.ts`

---

### 12.5 Result Object Handling: DoorService Integration

**Pattern**: Handle service result objects with level + message.

```typescript
// DoorService returns result object
interface DoorOpenResult {
  level: Level        // Updated level
  message: string     // User feedback
  success: boolean    // Operation status
}

// MoveCommand handles result
execute(state: GameState): GameState {
  if (obstacle.type === 'door') {
    const door = obstacle.data

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
      result.message,  // From result object
      'info',
      state.turnCount + 1
    )

    // Continue with movement
    return this.performMovement(
      { ...stateWithOpenDoor, messages },
      newPosition,
      result.level  // Use updated level
    )
  }
}
```

**Benefits**:
- ✅ Type-safe returns (compiler checks)
- ✅ Multiple values without tuples
- ✅ Self-documenting (named fields)
- ✅ Extensible (add fields without breaking)

---

## 13. Migration Guide

### 13.1 Extracting Logic from Commands

**Scenario**: Command has business logic that belongs in a service.

**Step 1: Identify the Logic**
```typescript
// Command has this logic:
const updatedItems = level.items.filter(item => {
  const distance = Math.sqrt(
    Math.pow(item.position.x - player.position.x, 2) +
    Math.pow(item.position.y - player.position.y, 2)
  )
  return distance <= radius
})
```

**Red Flags**:
- Array manipulation (`filter`)
- Calculation (`Math.sqrt`, `Math.pow`)
- Business logic (distance calculation)

**Step 2: Determine Domain**
- What is this doing? → Finding items within radius
- Which service? → InventoryService (owns item queries)

**Step 3: Create Service Method**
```typescript
// In InventoryService.ts
findItemsInRadius(
  items: Item[],
  center: Position,
  radius: number
): Item[] {
  return items.filter(item => {
    const distance = Math.sqrt(
      Math.pow(item.position.x - center.x, 2) +
      Math.pow(item.position.y - center.y, 2)
    )
    return distance <= radius
  })
}
```

**Step 4: Update Command**
```typescript
// Command - before
const updatedItems = level.items.filter(...)  // 6 lines

// Command - after
const updatedItems = this.inventoryService.findItemsInRadius(
  level.items,
  player.position,
  radius
)  // 1 line
```

**Step 5: Write Service Tests**
```typescript
// InventoryService/item-queries.test.ts
test('finds items within radius', () => {
  // Test the extracted logic
})
```

---

### 13.2 Refactoring Command Orchestration

**Scenario**: Command orchestration needs to change.

**Example: Adding FOV update to PickUpCommand**

**Before**:
```typescript
execute(state: GameState): GameState {
  const updatedPlayer = this.inventoryService.addItem(state.player, item)

  return this.turnService.incrementTurn({
    ...state,
    player: updatedPlayer
  })
}
```

**After** (with FOV update):
```typescript
execute(state: GameState): GameState {
  const updatedPlayer = this.inventoryService.addItem(state.player, item)

  // Add FOV update after picking up light source
  if (item.type === ItemType.TORCH || item.type === ItemType.LANTERN) {
    const lightRadius = this.lightingService.getLightRadius(item)
    const fovResult = this.fovService.updateFOV(
      state.player.position,
      lightRadius,
      level
    )

    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, fovResult.level)

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      visibleCells: fovResult.visibleCells,
      levels: updatedLevels
    })
  }

  return this.turnService.incrementTurn({
    ...state,
    player: updatedPlayer
  })
}
```

**Pattern**: Add service calls, update state immutably.

---

### 13.3 Splitting Large Commands

**Scenario**: Command >200 lines, hard to maintain.

**Solution**: Split into multiple commands or extract private helpers.

**Option 1: Split into Commands**
```typescript
// Before: UseItemCommand (300 lines)
class UseItemCommand {
  execute(state: GameState): GameState {
    if (item.type === ItemType.POTION) {
      // 100 lines of potion logic
    } else if (item.type === ItemType.SCROLL) {
      // 100 lines of scroll logic
    } else if (item.type === ItemType.WAND) {
      // 100 lines of wand logic
    }
  }
}

// After: Separate commands
class QuaffPotionCommand { ... }
class ReadScrollCommand { ... }
class ZapWandCommand { ... }
```

**Option 2: Extract Private Helpers**
```typescript
// Before: Single execute() method (200 lines)
execute(state: GameState): GameState {
  // 200 lines of orchestration
}

// After: Private helpers
execute(state: GameState): GameState {
  if (condition1) {
    return this.handleRoute1(state)
  } else if (condition2) {
    return this.handleRoute2(state)
  }
  return this.handleDefaultRoute(state)
}

private handleRoute1(state: GameState): GameState { ... }
private handleRoute2(state: GameState): GameState { ... }
private handleDefaultRoute(state: GameState): GameState { ... }
```

---

## 14. Quick Reference

### 14.1 Command Creation Checklist

**Planning**:
- [ ] Command name follows `{Action}Command` pattern
- [ ] User action clearly defined (keybinding)
- [ ] Turn cost determined (Yes/No)
- [ ] Required services identified
- [ ] Orchestration flow mapped

**Implementation**:
- [ ] Folder created: `src/commands/CommandName/`
- [ ] Implements `ICommand` interface
- [ ] Services injected via constructor
- [ ] Guard clauses for all error cases
- [ ] Service orchestration only (NO logic)
- [ ] Returns new state (immutability)
- [ ] Uses `TurnService.incrementTurn()` if turn consumed
- [ ] Barrel export created (index.ts)

**Testing**:
- [ ] Scenario-based test files created
- [ ] AAA pattern used in all tests
- [ ] Services mocked properly
- [ ] Happy path tested
- [ ] Error paths tested (all guards)
- [ ] Turn increment tested
- [ ] State immutability verified
- [ ] >80% coverage

**Documentation**:
- [ ] JSDoc comments on class
- [ ] `docs/commands/command-name.md` created
- [ ] Command README updated
- [ ] Services used documented

**Integration**:
- [ ] main.ts updated (command initialization)
- [ ] Input handler updated (keybinding)
- [ ] All tests pass
- [ ] Architectural review passed

---

### 14.2 Common Orchestration Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Sequential** | Services called in order | Move → Tick Hunger → Tick Fuel → Update FOV → Increment Turn |
| **Conditional Routing** | Different paths based on state | If monster → Attack, If door → Open, If wall → Block |
| **Delegation** | Action triggers other action | Move → Attack (bump-to-attack) |
| **Result Handling** | Service returns complex result | DoorService.openDoor() → { level, message, success } |
| **Guard Clauses** | Early exit for invalid state | No item → return with message (no turn) |
| **Multi-Route** | Command handles multiple scenarios | MoveCommand: monster/door/wall/clear routes |

---

### 14.3 Red Flags in Commands

**🚨 Review Needed If:**
- Command >200 lines → Consider splitting or extracting helpers
- Contains loops (`forEach`, `map`, `filter`) → Extract to service
- Contains calculations (`Math.*`, arithmetic) → Extract to service
- Contains array manipulation → Extract to service
- Direct property assignment after creation → Violates immutability
- No guard clauses → Missing error handling
- Duplicates orchestration from other commands → Extract to service
- Not using TurnService → Violates DRY
- Contains business logic → Move to service

---

### 14.4 File Naming Quick Ref

**Commands**: `{Action}Command.ts`
- ✅ MoveCommand.ts
- ✅ AttackCommand.ts
- ✅ PickUpCommand.ts
- ❌ move.ts
- ❌ MoveHandler.ts

**Tests**: `{scenario}.test.ts`
- ✅ movement.test.ts
- ✅ bump-attack.test.ts
- ✅ door-interaction.test.ts
- ❌ MoveCommand.test.ts
- ❌ tests.test.ts

**Docs**: `{command-name}.md`
- ✅ move.md
- ✅ pickup.md
- ✅ attack.md
- ❌ MoveCommand.md

---

### 14.5 Turn Management Quick Ref

**When to Increment Turn**:
- ✅ Action succeeds (item picked up, moved, attacked)
- ✅ Use `TurnService.incrementTurn(state)` (DRY)
- ✅ Call at END of command (last step)

**When NOT to Increment**:
- ❌ Action fails (no item to pick up)
- ❌ Guard clause triggered (invalid state)
- ❌ Error occurred (cannot perform action)

**Pattern**:
```typescript
// Success → Increment
return this.turnService.incrementTurn({ ...state, player: updatedPlayer })

// Failure → No increment
return { ...state, messages: errorMessages }
```

---

### 14.6 Service Orchestration vs Logic

| Orchestration (Command) | Logic (Service) |
|-------------------------|-----------------|
| `const result = service.method()` | `return { ...object, field: newValue }` |
| `if (result.success) { ... }` | `for (let i = 0; i < array.length; i++)` |
| `return turnService.incrementTurn(state)` | `const damage = Math.floor(Math.random() * 10)` |
| `if (obstacle.type === 'monster')` | `array.filter(item => item.id === id)` |
| `const messages = messageService.addMessage()` | `Object.keys(obj).forEach(...)` |

**Test**: If you can't explain it in 5 words, it's probably logic (belongs in service).

---

## Additional Resources

### Related Documentation
- [Architecture Overview](./architecture.md)
- [Services Guide](./services.md)
- [CLAUDE.md - Architectural Principles](../CLAUDE.md#core-architectural-principles)
- [Testing Strategy](./testing-strategy.md)
- [Architectural Review Checklist](./ARCHITECTURAL_REVIEW.md)

### Example Commands
- Simple: `src/commands/PickUpCommand/PickUpCommand.ts`
- Complex: `src/commands/MoveCommand/MoveCommand.ts`
- Delegation: `src/commands/MoveCommand/` → `AttackCommand/`
- Type Switching: `src/commands/EquipCommand/EquipCommand.ts`

### Command Documentation
- Move: `docs/commands/move.md`
- PickUp: `docs/commands/pickup.md`
- Attack: `docs/commands/attack.md`
- All Commands: `docs/commands/README.md`

---

**Last Updated**: 2025-10-05
**Maintainers**: Project architecture team
**Feedback**: Report issues or suggest improvements via project issues
