# Command Creation Guide

[Home](../README.md) > [Commands](./README.md) > Creation Guide

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 15 minutes
**Prerequisites**: [Architecture](../architecture.md), [Commands Overview](./README.md), [Services Overview](../services/README.md)
**Related Docs**: [Patterns](./patterns.md) | [Testing Guide](./testing-guide.md) | [CLAUDE.md](../../CLAUDE.md)

---

## Table of Contents

1. [Planning](#1-planning)
2. [Implementation](#2-implementation)
3. [Testing](#3-testing)
4. [Integration](#4-integration)
5. [Documentation](#5-documentation)

---

## 1. Planning

### Step 1.1: Define User Action

- [ ] What action does the user perform? (e.g., "pick up item")
- [ ] What keybinding? (e.g., `,` comma key)
- [ ] Does it consume a turn? (Yes/No)

**Example:**
```
Q: What does this command do?
A: "Picks up item from dungeon floor at player position"
→ Good! Single clear action

Q: Does it consume a turn?
A: "Yes - player uses time to pick up item"
→ Success consumes turn, failure doesn't
```

---

### Step 1.2: Identify Required Services

List services needed:

```typescript
// Example: PickUpCommand services
- InventoryService: findItemAtPosition(), canCarry(), addItem()
- MessageService: addMessage()
- TurnService: incrementTurn()
- IdentificationService: getDisplayName()
```

**Checklist:**
- [ ] Movement/position services?
- [ ] Combat services?
- [ ] Inventory services?
- [ ] Message/notification services?
- [ ] Always need TurnService if turn consumed

---

### Step 1.3: Map Orchestration Flow

```
Example: PickUpCommand Flow
1. Guard clause: Check level exists
2. Guard clause: Find item at position
3. Guard clause: Check inventory space
4. Service call: Add item to inventory
5. Update: Remove item from level
6. Service call: Get display name
7. Update: Add message
8. Return: Increment turn
```

**Pattern**: Commands orchestrate services, don't implement logic.

---

### Step 1.4: Check Existing Patterns

- [ ] Review similar commands in [Commands Overview](./README.md)
- [ ] Identify reusable patterns from [Patterns Guide](./patterns.md)
- [ ] Check if delegation is appropriate (e.g., Move → Attack)

---

## 2. Implementation

### Step 2.1: Create Folder Structure

```bash
mkdir -p src/commands/CommandName
touch src/commands/CommandName/CommandName.ts
touch src/commands/CommandName/index.ts
```

---

### Step 2.2: Implement ICommand Interface

```typescript
import { GameState } from '@game/core/core'
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
    return state
  }

  // Private helper methods (if needed)
}
```

---

### Step 2.3: Add Service Dependencies

```typescript
constructor(
  private serviceA: ServiceA,
  private serviceB: ServiceB,
  private messageService: MessageService,
  private turnService: TurnService
) {}
```

**Rules:**
- ✅ Inject all services via constructor
- ✅ Use interfaces when available (e.g., `IRandomService`)
- ✅ Order services logically (core services first)

---

### Step 2.4: Implement execute() Method

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
    return { ...state, messages }  // Failure - no turn
  }

  // 3. Update state immutably
  const updatedState = { ...state, player: result.player }

  // 4. Increment turn (success only)
  return this.turnService.incrementTurn(updatedState)
}
```

**Key Patterns:**
- Guard clauses at top
- Service calls (no loops, calculations, logic)
- Immutable state updates (spread operator)
- Turn increment last (success only)

---

### Step 2.5: Create Barrel Export

```typescript
// index.ts
export { CommandName } from './CommandName'
```

---

### Step 2.6: Naming Conventions

**Command Names**: `{Action}Command`

**Good Examples:**
- `MoveCommand` - Player movement
- `AttackCommand` - Combat action
- `PickUpCommand` - Pick up item
- `EquipCommand` - Equip item
- `QuaffPotionCommand` - Drink potion

**Bad Examples:**
- ❌ `PlayerMoveHandler` - Wrong suffix
- ❌ `Movement` - Not descriptive enough
- ❌ `DoMove` - Poor naming
- ❌ `MoveCommandClass` - Redundant suffix

---

## 3. Testing

### Step 3.1: Create Test File

```bash
touch src/commands/CommandName/basic-flow.test.ts
```

Use scenario-based naming:
- ✅ `movement.test.ts` - Basic movement tests
- ✅ `bump-attack.test.ts` - Bump-to-attack delegation
- ❌ `CommandName.test.ts` - Too broad

---

### Step 3.2: Write Tests (AAA Pattern)

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

---

### Step 3.3: Test Edge Cases

- [ ] Guard clauses (null/undefined)
- [ ] Error paths (all failure scenarios)
- [ ] Turn consumption (success vs failure)
- [ ] State immutability (original unchanged)
- [ ] Service orchestration order

---

### Step 3.4: Verify Coverage

```bash
npm test CommandName -- --coverage
```

**Requirements:**
- [ ] >80% line coverage
- [ ] >80% branch coverage
- [ ] All orchestration paths tested

---

## 4. Integration

### Step 4.1: Update main.ts

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

---

### Step 4.2: Update InputHandler

```typescript
// Map key press to command
case 'X':
  return commandMap.get('X')
```

---

### Step 4.3: Test Integration

```bash
npm run dev
# Test command with keybinding
```

**Manual Testing:**
1. Press keybinding
2. Verify action occurs
3. Check turn increments (if applicable)
4. Verify message appears
5. Test failure cases

---

## 5. Documentation

### Step 5.1: Add JSDoc to Command

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

---

### Step 5.2: Create Command Doc File

```bash
touch docs/commands/command-name.md
```

Use this template:

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

## Services Used

- **ServiceA**: Purpose
- **ServiceB**: Purpose

---

**Architecture**: Command orchestrates [list services]. Zero logic in command itself.
```

---

### Step 5.3: Update Commands README

Add entry to `docs/commands/README.md`:

```markdown
| `X` | [CommandName](./command-name.md) | Yes/No | Description |
```

---

## Complete Checklist

### Planning
- [ ] Command name follows `{Action}Command` pattern
- [ ] User action clearly defined (keybinding)
- [ ] Turn cost determined (Yes/No)
- [ ] Required services identified
- [ ] Orchestration flow mapped

### Implementation
- [ ] Folder created: `src/commands/CommandName/`
- [ ] Implements `ICommand` interface
- [ ] Services injected via constructor
- [ ] Guard clauses for all error cases
- [ ] Service orchestration only (NO logic)
- [ ] Returns new state (immutability)
- [ ] Uses `TurnService.incrementTurn()` if turn consumed
- [ ] Barrel export created (index.ts)

### Testing
- [ ] Scenario-based test files created
- [ ] AAA pattern used in all tests
- [ ] Services mocked properly
- [ ] Happy path tested
- [ ] Error paths tested (all guards)
- [ ] Turn increment tested
- [ ] State immutability verified
- [ ] >80% coverage

### Documentation
- [ ] JSDoc comments on class
- [ ] `docs/commands/command-name.md` created
- [ ] Command README updated
- [ ] Services used documented

### Integration
- [ ] main.ts updated (command initialization)
- [ ] Input handler updated (keybinding)
- [ ] All tests pass
- [ ] Architectural review passed

---

## ICommand Interface

All commands must implement:

```typescript
export interface ICommand {
  execute(state: GameState): GameState
}
```

**Signature Requirements:**
- ✅ Single method: `execute`
- ✅ Input: `GameState`
- ✅ Output: `GameState` (new object)
- ✅ No side effects (pure orchestration)

---

## Red Flags

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

## Related Documentation

- [Commands Overview](./README.md) - All commands reference
- [Patterns](./patterns.md) - Common orchestration patterns
- [Testing Guide](./testing-guide.md) - Command testing
- [Services Overview](../services/README.md) - Available services
- [Architecture](../architecture.md) - Overall architecture
- [CLAUDE.md](../../CLAUDE.md) - Development workflow

---

**Last Updated**: 2025-10-06
