# Service Testing Guide

[Home](../README.md) > [Services](./README.md) > Testing Guide

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 10 minutes
**Prerequisites**: [Services Overview](./README.md), [Testing Strategy](../testing-strategy.md)
**Related Docs**: [Creation Guide](./creation-guide.md) | [Patterns](./patterns.md)

---

## Table of Contents

1. [Test Organization](#1-test-organization)
2. [AAA Pattern](#2-aaa-pattern)
3. [MockRandom Usage](#3-mockrandom-usage)
4. [Testing Immutability](#4-testing-immutability)
5. [Coverage Requirements](#5-coverage-requirements)
6. [Common Test Scenarios](#6-common-test-scenarios)

---

## 1. Test Organization

### 1.1 Scenario-Based Naming

Test files describe **behavior**, not method names.

**Folder Structure:**
```
services/LightingService/
├── LightingService.ts
├── fuel-consumption.test.ts      # Fuel tick mechanics
├── light-sources.test.ts         # Creation, radius, types
├── refill.test.ts                # Lantern refill mechanics
├── warnings.test.ts              # Warning generation
└── index.ts
```

**✅ Good Examples:**
- `fuel-consumption.test.ts` - Tests fuel tracking behavior
- `warning-messages.test.ts` - Tests warning generation
- `refill-mechanics.test.ts` - Tests lantern refilling
- `light-sources.test.ts` - Tests torch/lantern/artifact creation

**❌ Bad Examples:**
- `LightingService.test.ts` - Too broad, no specific behavior
- `test1.test.ts` - Not descriptive
- `tickFuel.test.ts` - Method-focused, not behavior-focused

---

### 1.2 Test File Structure

```typescript
import { ServiceName } from './ServiceName'
import { MockRandom } from '@services/RandomService'

describe('ServiceName - Scenario Description', () => {
  let service: ServiceName
  let mockRandom: MockRandom

  beforeEach(() => {
    // Setup dependencies
    mockRandom = new MockRandom()
    service = new ServiceName(mockRandom)
  })

  test('specific behavior description', () => {
    // Test implementation
  })

  test('another specific behavior', () => {
    // Test implementation
  })
})
```

---

## 2. AAA Pattern

**Every test follows Arrange-Act-Assert:**

```typescript
describe('LightingService - Fuel Consumption', () => {
  let service: LightingService
  let mockRandom: MockRandom

  beforeEach(() => {
    // Arrange: Setup dependencies
    mockRandom = new MockRandom()
    service = new LightingService(mockRandom)
  })

  test('reduces fuel by 1 each tick', () => {
    // Arrange: Create initial state
    const torch = service.createTorch()
    expect(torch.fuel).toBe(500)

    // Act: Perform the action
    const ticked = service.tickFuel(torch)

    // Assert: Verify the result
    expect(ticked.fuel).toBe(499)
    expect(torch.fuel).toBe(500)  // Original unchanged!
  })

  test('generates warning at 50 fuel remaining', () => {
    // Arrange
    const torch = { ...service.createTorch(), fuel: 51 }

    // Act
    const result = service.tickFuel({ ...torch })

    // Assert
    expect(result.fuel).toBe(50)
    expect(result.warnings).toContain('Your torch is getting dim...')
  })
})
```

---

## 3. MockRandom Usage

**Always use MockRandom for deterministic tests.**

### 3.1 Basic Usage

```typescript
import { MockRandom } from '@services/RandomService'

test('damage calculation uses random service', () => {
  // Arrange: Predefined random values
  const mockRandom = new MockRandom([8, 6, 3])  // Returns 8, then 6, then 3
  const service = new CombatService(mockRandom)

  // Act & Assert
  expect(service.rollDice('1d8')).toBe(8)  // First value
  expect(service.rollDice('1d6')).toBe(6)  // Second value
  expect(service.rollDice('1d4')).toBe(3)  // Third value
})
```

### 3.2 Testing Edge Cases

```typescript
test('critical hit on max roll', () => {
  // Arrange: Always roll 20 (max d20)
  const mockRandom = new MockRandom([20])
  const service = new CombatService(mockRandom)

  // Act
  const result = service.attackRoll(10, 15)

  // Assert
  expect(result.isCritical).toBe(true)
})

test('automatic miss on roll of 1', () => {
  // Arrange: Always roll 1 (min)
  const mockRandom = new MockRandom([1])
  const service = new CombatService(mockRandom)

  // Act
  const result = service.attackRoll(10, 15)

  // Assert
  expect(result.hit).toBe(false)
  expect(result.isFumble).toBe(true)
})
```

### 3.3 Why MockRandom?

- ✅ **Deterministic**: No flaky tests
- ✅ **Edge Cases**: Test specific scenarios (max roll, min roll)
- ✅ **Reproducible**: Same results every run
- ✅ **Fast**: No need for retry logic

---

## 4. Testing Immutability

**Always verify original objects unchanged.**

### 4.1 Basic Immutability Test

```typescript
test('updatePlayer returns new object without mutating original', () => {
  // Arrange
  const originalPlayer = { ...testPlayer, hp: 20 }
  const originalHp = originalPlayer.hp

  // Act
  const updated = service.updatePlayer(originalPlayer, 15)

  // Assert
  expect(updated.hp).toBe(15)                  // New object updated
  expect(originalPlayer.hp).toBe(originalHp)   // Original unchanged!
  expect(updated).not.toBe(originalPlayer)     // Different reference
})
```

### 4.2 Nested Object Immutability

```typescript
test('tickFuel does not mutate player or equipment', () => {
  // Arrange
  const player = createTestPlayer()
  const originalFuel = player.equipment.lightSource.fuel

  // Act
  const result = service.tickFuel(player)

  // Assert
  expect(result.player.equipment.lightSource.fuel).toBe(originalFuel - 1)
  expect(player.equipment.lightSource.fuel).toBe(originalFuel)  // Original unchanged
  expect(result.player).not.toBe(player)  // New player object
  expect(result.player.equipment).not.toBe(player.equipment)  // New equipment
})
```

### 4.3 Array Immutability

```typescript
test('updateMonsters does not mutate original array', () => {
  // Arrange
  const monsters = [createMonster('orc-1'), createMonster('orc-2')]
  const originalLength = monsters.length

  // Act
  const updated = service.removeMonster(monsters, 'orc-1')

  // Assert
  expect(updated.length).toBe(1)
  expect(monsters.length).toBe(originalLength)  // Original unchanged
  expect(updated).not.toBe(monsters)  // Different array reference
})
```

---

## 5. Coverage Requirements

### 5.1 Minimum Standards

- **Services**: Aim for 100% coverage (pure logic, fully testable)
- **Commands**: >80% coverage (orchestration, less critical)
- **Overall**: >80% lines, branches, functions

**Why?** Services contain business logic → must be bulletproof.

### 5.2 Check Coverage

```bash
# Test specific service
npm test ServiceName -- --coverage

# Test all services
npm run test:coverage
```

### 5.3 Coverage Report

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
LightingService.ts      |   100   |   100    |   100   |   100
CombatService.ts        |   98.5  |   95.2   |   100   |   98.3
MovementService.ts      |   100   |   100    |   100   |   100
```

**Target Files:**
- Services: Aim for 100%
- Commands: >80%
- UI: Test critical paths only

---

## 6. Common Test Scenarios

### 6.1 Testing Factory Methods

```typescript
describe('LightingService - Light Source Creation', () => {
  test('createTorch returns torch with correct defaults', () => {
    // Act
    const torch = service.createTorch()

    // Assert
    expect(torch.type).toBe(ItemType.TORCH)
    expect(torch.fuel).toBe(500)
    expect(torch.maxFuel).toBe(500)
    expect(torch.radius).toBe(2)
    expect(torch.isPermanent).toBe(false)
  })

  test('createLantern returns lantern with correct defaults', () => {
    // Act
    const lantern = service.createLantern()

    // Assert
    expect(lantern.type).toBe(ItemType.LANTERN)
    expect(lantern.fuel).toBe(500)
    expect(lantern.radius).toBe(2)
  })
})
```

### 6.2 Testing Result Objects

```typescript
test('openDoorWithResult returns success result for closed door', () => {
  // Arrange
  const door = createDoor({ state: DoorState.CLOSED })
  const level = createLevel({ doors: [door] })

  // Act
  const result = service.openDoorWithResult(level, door)

  // Assert
  expect(result.success).toBe(true)
  expect(result.message).toBe('You open the door.')
  expect(result.level.doors[0].state).toBe(DoorState.OPEN)
})

test('openDoorWithResult returns failure for locked door', () => {
  // Arrange
  const door = createDoor({ state: DoorState.LOCKED })
  const level = createLevel({ doors: [door] })

  // Act
  const result = service.openDoorWithResult(level, door)

  // Assert
  expect(result.success).toBe(false)
  expect(result.message).toBe('The door is locked!')
  expect(result.level.doors[0].state).toBe(DoorState.LOCKED)  // Unchanged
})
```

### 6.3 Testing Boolean Methods

```typescript
describe('LightingService - Fuel Warnings', () => {
  test('isFuelLow returns true when fuel <= 50', () => {
    const torch = { ...service.createTorch(), fuel: 50 }
    expect(service.isFuelLow(torch)).toBe(true)
  })

  test('isFuelLow returns false when fuel > 50', () => {
    const torch = { ...service.createTorch(), fuel: 51 }
    expect(service.isFuelLow(torch)).toBe(false)
  })

  test('isFuelLow returns false for permanent lights', () => {
    const artifact = { ...service.createTorch(), isPermanent: true, fuel: 0 }
    expect(service.isFuelLow(artifact)).toBe(false)
  })
})
```

### 6.4 Testing Service Composition

```typescript
describe('MonsterAIService - Pathfinding Integration', () => {
  test('SMART monsters use pathfinding service', () => {
    // Arrange
    const mockPathfinding = {
      findPath: jest.fn().mockReturnValue([{ x: 5, y: 5 }])
    } as any
    const service = new MonsterAIService(mockPathfinding, mockRandom)
    const monster = createMonster({ behavior: 'SMART' })

    // Act
    const action = service.determineAction(monster, player, level)

    // Assert
    expect(mockPathfinding.findPath).toHaveBeenCalledWith(
      monster.position,
      player.position,
      level
    )
    expect(action.type).toBe('MOVE')
  })
})
```

### 6.5 Testing Edge Cases

```typescript
describe('CombatService - Edge Cases', () => {
  test('handles zero damage', () => {
    const mockRandom = new MockRandom([1])  // Min roll
    const service = new CombatService(mockRandom)

    const result = service.calculateDamage('1d4', -10)  // Negative bonus

    expect(result).toBe(0)  // Damage can't be negative
  })

  test('handles null weapon', () => {
    const result = service.calculateDamage(null)
    expect(result).toBe(1)  // Unarmed attack
  })

  test('handles maximum damage roll', () => {
    const mockRandom = new MockRandom([8, 8])  // 2d8 max rolls
    const service = new CombatService(mockRandom)

    const result = service.calculateDamage('2d8+5')
    expect(result).toBe(21)  // 8 + 8 + 5
  })
})
```

---

## Test Descriptive Names

**Use full sentences describing expected behavior.**

### ✅ Good Examples

```typescript
test('reduces fuel by 1 each tick')
test('warns when torch has 50 turns remaining')
test('permanent lights never run out of fuel')
test('returns unchanged player when no light equipped')
test('delegates to pathfinding service for SMART behavior')
test('creates new object without mutating original')
```

### ❌ Bad Examples

```typescript
test('tickFuel')
test('fuel')
test('test1')
test('it works')
```

---

## Testing Checklist

**For each service:**

- [ ] All public methods have tests
- [ ] AAA pattern used consistently
- [ ] MockRandom used for randomness
- [ ] Immutability verified (originals unchanged)
- [ ] Edge cases covered (null, empty, min, max)
- [ ] Result objects tested (success and failure)
- [ ] Boolean methods tested (true and false paths)
- [ ] Service composition tested (mocked dependencies)
- [ ] >80% line coverage
- [ ] >80% branch coverage
- [ ] Test names are descriptive sentences

---

## Related Documentation

- [Services Overview](./README.md) - All services reference
- [Creation Guide](./creation-guide.md) - Step-by-step creation
- [Patterns](./patterns.md) - Common patterns
- [Testing Strategy](../testing-strategy.md) - Overall testing approach
- [CLAUDE.md](../../CLAUDE.md) - Development workflow

---

**Last Updated**: 2025-10-06
