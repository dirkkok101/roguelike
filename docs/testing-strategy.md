# Testing Strategy: ASCII Roguelike

**Version**: 1.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Plan](./plan.md)

---

## Overview

This document defines the testing strategy, file organization, and naming conventions for the ASCII Roguelike project. We use a **hybrid colocated structure with scenario-based testing** to maintain clean, scalable, and maintainable test suites.

---

## Folder Structure

### Pattern: Service/Command Folders with Colocated Tests

Each service and command lives in its own folder containing:
- **Source file(s)** - Implementation code
- **Scenario-based test files** - Tests organized by feature/behavior
- **Barrel export (index.ts)** - Clean re-exports for simplified imports

### Example Structure

```
src/
├── services/
│   ├── RandomService/
│   │   ├── RandomService.ts          # Implementation
│   │   ├── seeded.test.ts            # Seeded RNG tests
│   │   ├── mock.test.ts              # Mock implementation tests
│   │   └── index.ts                  # export { IRandomService, SeededRandom, MockRandom } from './RandomService'
│   │
│   ├── LightingService/
│   │   ├── LightingService.ts
│   │   ├── fuel-consumption.test.ts  # Fuel mechanics tests
│   │   ├── light-sources.test.ts     # Creation & radius tests
│   │   ├── refill.test.ts            # Lantern refill tests
│   │   └── index.ts
│   │
│   ├── FOVService/
│   │   ├── FOVService.ts
│   │   ├── shadowcasting.test.ts     # FOV algorithm tests
│   │   ├── blocking.test.ts          # Vision blocking tests
│   │   ├── radius.test.ts            # Light radius tests
│   │   └── index.ts
│   │
│   └── CombatService/
│       ├── CombatService.ts
│       ├── hit-calculation.test.ts   # To-hit roll tests
│       ├── damage.test.ts            # Damage calculation tests
│       ├── special-attacks.test.ts   # Breath weapons, etc.
│       └── index.ts
│
└── commands/
    ├── MoveCommand/
    │   ├── MoveCommand.ts
    │   ├── movement.test.ts          # Basic movement tests
    │   ├── collision.test.ts         # Wall/monster collision tests
    │   ├── fov-updates.test.ts       # FOV recalculation tests
    │   └── index.ts
    │
    └── AttackCommand/
        ├── AttackCommand.ts
        ├── melee.test.ts             # Melee combat tests
        ├── ranged.test.ts            # Ranged combat tests
        └── index.ts
```

---

## Test Naming Conventions

### Scenario-Based Names

Test files should describe **what behavior** is being tested, not just the class or method name.

#### ✅ Good Examples

**Services:**
- `fuel-consumption.test.ts` - Tests light fuel mechanics (tick, warnings, depletion)
- `shadowcasting.test.ts` - Tests FOV algorithm correctness
- `smart-pathfinding.test.ts` - Tests monster A* pathfinding behavior
- `hunger-penalties.test.ts` - Tests combat modifiers from hunger states
- `secret-door-discovery.test.ts` - Tests search mechanics for hidden doors
- `room-generation.test.ts` - Tests procedural room placement
- `seeded.test.ts` - Tests deterministic RNG with seeds
- `blocking.test.ts` - Tests what blocks vision (walls, doors)

**Commands:**
- `movement.test.ts` - Tests basic player movement
- `collision.test.ts` - Tests collision detection logic
- `inventory-management.test.ts` - Tests item add/remove/equip
- `fov-updates.test.ts` - Tests FOV recalculation after movement

#### ❌ Avoid

- `LightingService.test.ts` - Too broad, doesn't describe specific behavior
- `test1.test.ts` - Not descriptive at all
- `tickFuel.test.ts` - Tests implementation detail (method name), not behavior
- `ServiceNameTests.test.ts` - Redundant, folder already provides context

### Rationale

1. **Folder name provides context** - No need to repeat `ServiceName.` prefix
2. **Scenario-based = clear intent** - Immediately understand what's being tested
3. **Supports multiple test files** - Complex services can have 5-8 scenario files
4. **Easier to navigate** - Find test by feature, not by class structure

---

## Test Organization

### AAA Pattern (Arrange-Act-Assert)

All tests follow the Arrange-Act-Assert pattern for clarity:

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
  })
})
```

### Descriptive Test Names

Use full sentences that describe the expected behavior:

```typescript
// ✅ Good - describes behavior
test('reduces fuel by 1 each tick')
test('warns when fuel drops below 50 turns')
test('blocks vision through walls but not open doors')
test('smart AI uses A* pathfinding to reach player')

// ❌ Avoid - too terse or implementation-focused
test('tickFuel')
test('warning')
test('walls')
test('AI')
```

### Nested Describe Blocks

Group related tests using nested `describe` blocks:

```typescript
describe('LightingService - Fuel Consumption', () => {
  describe('tickFuel()', () => {
    test('reduces fuel by 1 each tick')
    test('does not affect permanent lights')
    test('does not go below zero')
  })

  describe('generateFuelWarning()', () => {
    test('warns at 50 turns remaining')
    test('warns at 10 turns remaining')
    test('warns when fuel exhausted')
  })

  describe('isFuelLow()', () => {
    test('returns true when fuel < 50')
    test('returns false for permanent lights')
  })
})
```

---

## Imports and Barrel Exports

### Barrel Exports (index.ts)

Each service/command folder must have an `index.ts` file that re-exports all public APIs:

**Example: `src/services/FOVService/index.ts`**
```typescript
export { FOVService } from './FOVService'
```

**Example: `src/services/RandomService/index.ts`**
```typescript
export { IRandomService, SeededRandom, MockRandom } from './RandomService'
```

### Import Pattern

Use path aliases (`@services`, `@commands`) with barrel exports:

```typescript
// ✅ Good - Clean imports via barrel export
import { FOVService } from '@services/FOVService'
import { MoveCommand } from '@commands/MoveCommand'
import { IRandomService, MockRandom } from '@services/RandomService'

// ❌ Avoid - Direct file imports
import { FOVService } from '@services/FOVService/FOVService'
import { MoveCommand } from '@commands/MoveCommand/MoveCommand'
```

### Test Imports

Tests can import from the same folder or use path aliases:

```typescript
// Option 1: Relative import within same folder (preferred for colocation)
import { LightingService } from './LightingService'

// Option 2: Path alias (works but adds indirection)
import { LightingService } from '@services/LightingService'

// Mocks and dependencies always via path alias
import { MockRandom } from '@services/RandomService'
import { LightSource } from '@types/core'
```

---

## Test Coverage Goals

### Coverage Targets

As defined in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### What to Test

**Services** (100% coverage expected):
- All public methods
- Edge cases (null, undefined, boundary values)
- Error conditions
- State transitions
- Randomness (using MockRandom)

**Commands** (>80% coverage):
- Happy path (successful execution)
- Error paths (invalid moves, failed actions)
- State updates (immutability verification)
- Service orchestration

**Types** (Light testing):
- Interface structure validation
- Enum value checks
- Type guards (if any)

### What NOT to Test

- Third-party library internals
- Trivial getters/setters
- Type definitions (TypeScript handles this)
- UI rendering (will be tested via E2E in Phase 8)

---

## Testing Best Practices

### 1. Dependency Injection

Always inject dependencies for testability:

```typescript
// ✅ Good - Testable
export class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(dice: string): number {
    return this.random.roll(dice)
  }
}

// ❌ Avoid - Not testable
export class CombatService {
  calculateDamage(dice: string): number {
    return Math.random() * 10  // Can't control randomness
  }
}
```

### 2. Use MockRandom for Deterministic Tests

```typescript
test('damage calculation uses dice roll', () => {
  const mockRandom = new MockRandom([8])  // Next roll returns 8
  const service = new CombatService(mockRandom)

  const damage = service.calculateDamage('1d8')
  expect(damage).toBe(8)
})
```

### 3. Test Immutability

Verify that state updates return new objects:

```typescript
test('tickFuel returns new LightSource object', () => {
  const torch = service.createTorch()
  const ticked = service.tickFuel(torch)

  expect(ticked).not.toBe(torch)  // Different object reference
  expect(torch.fuel).toBe(500)    // Original unchanged
  expect(ticked.fuel).toBe(499)   // New object updated
})
```

### 4. Descriptive Test Failures

Write tests that explain failures clearly:

```typescript
// ✅ Good - Clear failure message
test('warns at 50 turns remaining', () => {
  const torch: LightSource = { ...service.createTorch(), fuel: 50 }
  const warning = service.generateFuelWarning(torch)

  expect(warning).toContain('getting dim')
})

// If test fails: "Expected 'getting dim' to be in 'Your torch flickers...'"
// Immediately clear what went wrong
```

### 5. One Assertion Per Test (Usually)

Focus each test on a single behavior:

```typescript
// ✅ Good - Single responsibility
test('reduces fuel by 1 each tick', () => {
  const torch = service.createTorch()
  const ticked = service.tickFuel(torch)
  expect(ticked.fuel).toBe(499)
})

test('does not affect permanent lights', () => {
  const artifact = service.createArtifact('Phial', 3)
  const ticked = service.tickFuel(artifact)
  expect(ticked.fuel).toBeUndefined()
})

// ❌ Avoid - Testing multiple behaviors
test('tickFuel behavior', () => {
  const torch = service.createTorch()
  expect(service.tickFuel(torch).fuel).toBe(499)

  const artifact = service.createArtifact('Phial', 3)
  expect(service.tickFuel(artifact).fuel).toBeUndefined()
  // If first assertion fails, second never runs
})
```

---

## Jest Configuration

Tests are configured in `jest.config.js`:

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],  // Finds all .test.ts files
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',  // Exclude tests from coverage
    '!src/main.ts',
  ],
}
```

---

## Running Tests

### Common Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test LightingService

# Run tests matching pattern
npm test -- --testNamePattern="fuel"
```

### Continuous Testing Workflow

1. **Write test first** (TDD approach where applicable)
2. **Implement feature** to pass test
3. **Refactor** while keeping tests green
4. **Run full suite** before committing
5. **Review coverage** - aim for >80% on new code

---

## Examples by Service Type

### Service with Simple Logic (MessageService)

```
MessageService/
├── MessageService.ts
├── add-message.test.ts          # Test message creation
├── recent-messages.test.ts      # Test filtering/retrieval
└── index.ts
```

### Service with Complex Algorithm (FOVService)

```
FOVService/
├── FOVService.ts
├── shadowcasting.test.ts        # Core algorithm tests
├── blocking.test.ts             # What blocks vision
├── radius.test.ts               # Light radius limits
├── octants.test.ts              # Octant transformations
└── index.ts
```

### Service with Multiple Behaviors (MonsterAIService)

```
MonsterAIService/
├── MonsterAIService.ts
├── smart-behavior.test.ts       # A* pathfinding AI
├── greedy-behavior.test.ts      # Gold-seeking AI
├── erratic-behavior.test.ts     # Random movement AI
├── thief-behavior.test.ts       # Steal and flee AI
├── wake-conditions.test.ts      # Sleep/wake mechanics
└── index.ts
```

### Command with Orchestration (MoveCommand)

```
MoveCommand/
├── MoveCommand.ts
├── movement.test.ts             # Basic movement logic
├── collision.test.ts            # Wall/monster blocking
├── fov-updates.test.ts          # FOV recalculation
├── fuel-consumption.test.ts     # Light fuel tick
└── index.ts
```

---

## Migration Checklist

When migrating existing code to this structure:

- [ ] Create service/command folder if doesn't exist
- [ ] Move source file into folder
- [ ] Create `index.ts` barrel export
- [ ] Update all imports throughout codebase
- [ ] Split tests into scenario-based files
- [ ] Remove `ServiceName.` prefix from test file names
- [ ] Run `npm test` to verify all tests still pass
- [ ] Run `npm run build` to verify TypeScript compilation
- [ ] Commit changes with descriptive message

---

## References

- **Architecture**: [architecture.md](./architecture.md) - Service implementations
- **Development Plan**: [plan.md](./plan.md) - Testing tasks per phase
- **Jest Config**: `jest.config.js`
- **TypeScript Config**: `tsconfig.json` (path aliases)

---

## Questions & Discussion

For questions about testing strategy, file organization, or conventions:
1. Refer to examples in existing services (RandomService, LightingService)
2. Check Architecture document for service details
3. Review this document
4. Document decisions and update this file as patterns evolve
