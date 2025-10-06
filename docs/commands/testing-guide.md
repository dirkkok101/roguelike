# Command Testing Guide

[Home](../README.md) > [Commands](./README.md) > Testing Guide

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 10 minutes
**Prerequisites**: [Commands Overview](./README.md), [Testing Strategy](../testing-strategy.md)
**Related Docs**: [Creation Guide](./creation-guide.md) | [Patterns](./patterns.md) | [Services Testing](../services/testing-guide.md)

---

## Table of Contents

1. [Test Organization](#1-test-organization)
2. [AAA Pattern](#2-aaa-pattern)
3. [Mocking Services](#3-mocking-services)
4. [Testing Orchestration](#4-testing-orchestration)
5. [Coverage Requirements](#5-coverage-requirements)
6. [Common Test Scenarios](#6-common-test-scenarios)

---

## 1. Test Organization

### 1.1 Scenario-Based Naming

Test files describe **behavior**, not method names.

**Folder Structure:**
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

**✅ Good Examples:**
- `movement.test.ts` - Basic movement tests
- `bump-attack.test.ts` - Bump-to-attack delegation
- `door-interaction.test.ts` - Door mechanics
- `fov-updates.test.ts` - FOV recalculation

**❌ Bad Examples:**
- `MoveCommand.test.ts` - Too broad
- `execute.test.ts` - Method-focused
- `test1.test.ts` - Not descriptive

---

### 1.2 Test File Structure

```typescript
import { CommandName } from './CommandName'
import { createTestState, createTestItem } from '@test/helpers'

describe('CommandName - Scenario Description', () => {
  let command: CommandName
  let mockServiceA: jest.Mocked<ServiceA>
  let mockTurnService: jest.Mocked<TurnService>

  beforeEach(() => {
    // Setup mocked services
    mockServiceA = {
      doSomething: jest.fn()
    } as any

    mockTurnService = {
      incrementTurn: jest.fn(state => ({ ...state, turnCount: state.turnCount + 1 }))
    } as any

    command = new CommandName(mockServiceA, mockTurnService)
  })

  test('specific behavior description', () => {
    // Test implementation
  })
})
```

---

## 2. AAA Pattern

**Every test follows Arrange-Act-Assert:**

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

## 3. Mocking Services

### 3.1 Basic Mock Pattern

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
```

---

### 3.2 Mock with Multiple Scenarios

```typescript
beforeEach(() => {
  mockMovementService = {
    applyDirection: jest.fn(),
    detectObstacle: jest.fn(),
    movePlayer: jest.fn()
  } as any
})

test('handles wall collision', () => {
  // Arrange: Mock returns wall obstacle
  mockMovementService.detectObstacle.mockReturnValue({
    type: 'wall',
    data: null
  })

  // Act
  const result = command.execute(state)

  // Assert: Movement should not occur
  expect(mockMovementService.movePlayer).not.toHaveBeenCalled()
})

test('handles monster encounter', () => {
  // Arrange: Mock returns monster obstacle
  mockMovementService.detectObstacle.mockReturnValue({
    type: 'monster',
    data: { id: 'orc-1', name: 'Orc' }
  })

  // Act
  const result = command.execute(state)

  // Assert: Should delegate to attack
  // (test delegation separately)
})
```

---

### 3.3 Verifying Service Call Order

```typescript
test('calls services in correct order', () => {
  // Arrange
  const state = createTestState()

  // Act
  command.execute(state)

  // Assert: Verify call order
  const { mock } = mockMovementService.applyDirection
  const calls = mock.calls

  expect(calls[0]).toBeDefined()  // Called first
  expect(mockMovementService.detectObstacle).toHaveBeenCalledAfter(
    mockMovementService.applyDirection
  )
})
```

---

## 4. Testing Orchestration

### 4.1 Testing Guard Clauses

```typescript
describe('PickUpCommand - Guard Clauses', () => {
  test('returns unchanged state when level not found', () => {
    // Arrange: State with no levels
    const state = { ...createTestState(), levels: new Map() }

    // Act
    const result = command.execute(state)

    // Assert: No services called
    expect(mockInventoryService.findItemAtPosition).not.toHaveBeenCalled()
    expect(result).toBe(state)  // Exact same reference
  })

  test('returns with message when no item at position', () => {
    // Arrange
    const state = createTestState()
    mockInventoryService.findItemAtPosition.mockReturnValue(null)

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockMessageService.addMessage).toHaveBeenCalledWith(
      state.messages,
      'There is nothing here to pick up.',
      'info',
      state.turnCount
    )
    expect(mockInventoryService.addItem).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount)  // No turn
  })
})
```

---

### 4.2 Testing Turn Consumption

```typescript
describe('PickUpCommand - Turn Management', () => {
  test('consumes turn on successful pickup', () => {
    // Arrange
    const state = createTestState({ turnCount: 100 })
    mockInventoryService.findItemAtPosition.mockReturnValue(createTestItem())
    mockInventoryService.canCarry.mockReturnValue(true)

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockTurnService.incrementTurn).toHaveBeenCalled()
    expect(result.turnCount).toBe(101)
  })

  test('does not consume turn when action fails', () => {
    // Arrange
    const state = createTestState({ turnCount: 100 })
    mockInventoryService.findItemAtPosition.mockReturnValue(null)

    // Act
    const result = command.execute(state)

    // Assert
    expect(mockTurnService.incrementTurn).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(100)  // Unchanged
  })
})
```

---

### 4.3 Testing Delegation

```typescript
describe('MoveCommand - Delegation', () => {
  test('delegates to AttackCommand when bumping monster', () => {
    // Arrange
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'monster',
      data: { id: 'orc-1' }
    })

    // Spy on AttackCommand creation
    const attackSpy = jest.spyOn(AttackCommand.prototype, 'execute')

    // Act
    const result = command.execute(state)

    // Assert
    expect(attackSpy).toHaveBeenCalled()
    attackSpy.mockRestore()
  })

  test('does not call movement services after delegation', () => {
    // Arrange
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'monster',
      data: { id: 'orc-1' }
    })

    // Act
    command.execute(state)

    // Assert: Movement should not occur
    expect(mockMovementService.movePlayer).not.toHaveBeenCalled()
    expect(mockFovService.updateFOV).not.toHaveBeenCalled()
  })
})
```

---

### 4.4 Testing State Immutability

```typescript
test('does not mutate original state', () => {
  // Arrange
  const originalState = createTestState()
  const originalTurnCount = originalState.turnCount
  const originalPlayer = originalState.player

  // Act
  const result = command.execute(originalState)

  // Assert: Original unchanged
  expect(originalState.turnCount).toBe(originalTurnCount)
  expect(originalState.player).toBe(originalPlayer)
  expect(result).not.toBe(originalState)  // New object
})
```

---

## 5. Coverage Requirements

### 5.1 Minimum Standards

- **Commands**: >80% line coverage
- **Commands**: >80% branch coverage
- **Critical commands** (Move, Attack, PickUp): Aim for 100%

**Why less than services?** Orchestration is harder to test comprehensively, but all paths should be covered.

---

### 5.2 Check Coverage

```bash
# Test specific command
npm test MoveCommand -- --coverage

# Test all commands
npm run test:coverage
```

---

### 5.3 What to Test

**Must Test:**
- ✅ Happy path (successful execution)
- ✅ All error paths (guard clauses)
- ✅ Turn consumption (success vs failure)
- ✅ Service orchestration (correct order)
- ✅ State immutability
- ✅ Delegation paths

**Optional:**
- Different obstacle types (if multi-route)
- Edge cases specific to command
- Message generation

---

## 6. Common Test Scenarios

### 6.1 Testing Multi-Route Commands

```typescript
describe('MoveCommand - Routing', () => {
  test('routes to attack when obstacle is monster', () => {
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'monster',
      data: { id: 'orc-1' }
    })

    const result = command.execute(state)

    // Verify delegation occurred
    expect(result).toBeDefined()
  })

  test('routes to door handler when obstacle is door', () => {
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'door',
      data: { state: DoorState.CLOSED }
    })

    const result = command.execute(state)

    expect(mockDoorService.openDoorWithResult).toHaveBeenCalled()
  })

  test('blocks movement when obstacle is wall', () => {
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'wall',
      data: null
    })

    const result = command.execute(state)

    expect(mockMovementService.movePlayer).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount)  // No turn
  })

  test('performs normal movement when no obstacle', () => {
    mockMovementService.detectObstacle.mockReturnValue({
      type: 'none',
      data: null
    })

    const result = command.execute(state)

    expect(mockMovementService.movePlayer).toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount + 1)  // Turn consumed
  })
})
```

---

### 6.2 Testing Result Object Integration

```typescript
test('handles DoorService result object correctly', () => {
  // Arrange
  const mockDoorResult = {
    level: { ...level, doors: updatedDoors },
    message: 'You open the door.',
    success: true
  }
  mockDoorService.openDoorWithResult.mockReturnValue(mockDoorResult)

  // Act
  const result = command.execute(state)

  // Assert: Result integrated correctly
  expect(result.levels.get(state.currentLevel)).toBe(mockDoorResult.level)
  expect(result.messages).toContain(mockDoorResult.message)
})
```

---

### 6.3 Testing Type Switching

```typescript
describe('EquipCommand - Type Switching', () => {
  test('equips weapon correctly', () => {
    const weapon = createTestItem({ type: ItemType.WEAPON })
    mockInventoryService.findItem.mockReturnValue(weapon)

    const result = command.execute(state)

    expect(mockInventoryService.equipWeapon).toHaveBeenCalledWith(
      state.player,
      weapon
    )
  })

  test('equips armor correctly', () => {
    const armor = createTestItem({ type: ItemType.ARMOR })
    mockInventoryService.findItem.mockReturnValue(armor)

    const result = command.execute(state)

    expect(mockInventoryService.equipArmor).toHaveBeenCalledWith(
      state.player,
      armor
    )
  })

  test('fails for non-equipable items', () => {
    const potion = createTestItem({ type: ItemType.POTION })
    mockInventoryService.findItem.mockReturnValue(potion)

    const result = command.execute(state)

    expect(mockInventoryService.equipWeapon).not.toHaveBeenCalled()
    expect(result.turnCount).toBe(state.turnCount)  // No turn
  })
})
```

---

## Test Descriptive Names

**Use full sentences describing expected behavior.**

### ✅ Good Examples

```typescript
test('picks up item and adds to inventory')
test('blocks pickup when inventory is full')
test('increments turn on successful pickup')
test('delegates to AttackCommand when bumping monster')
test('opens closed door and moves through')
test('does not consume turn on failed action')
```

### ❌ Bad Examples

```typescript
test('execute')
test('pickup')
test('works')
test('test1')
```

---

## Testing Checklist

**For each command:**

- [ ] All orchestration paths tested (happy path + errors)
- [ ] AAA pattern used consistently
- [ ] Services mocked properly
- [ ] Guard clauses tested (all error paths)
- [ ] Turn consumption tested (success vs failure)
- [ ] State immutability verified
- [ ] Delegation tested (if applicable)
- [ ] Multi-route tested (if applicable)
- [ ] Service call order verified
- [ ] >80% line coverage
- [ ] >80% branch coverage
- [ ] Test names are descriptive sentences

---

## Related Documentation

- [Commands Overview](./README.md) - All commands reference
- [Creation Guide](./creation-guide.md) - Step-by-step creation
- [Patterns](./patterns.md) - Common patterns
- [Services Testing](../services/testing-guide.md) - Service testing
- [Testing Strategy](../testing-strategy.md) - Overall testing approach
- [CLAUDE.md](../../CLAUDE.md) - Development workflow

---

**Last Updated**: 2025-10-06
