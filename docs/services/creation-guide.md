# Service Creation Guide

[Home](../README.md) > [Services](./README.md) > Creation Guide

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 15 minutes
**Prerequisites**: [Architecture](../architecture.md), [Services Overview](./README.md)
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

### Step 1.1: Identify Domain

- [ ] What is the service responsible for?
- [ ] One clear answer? (Single Responsibility)
- [ ] Does similar service already exist?

**Example:**
```
Q: What does this service do?
A: "Manages light sources, fuel tracking, and light radius calculation"
→ Good! Single clear responsibility
```

---

### Step 1.2: Define Public API

List all public methods needed:

```typescript
// Example: LightingService API
createTorch(): Torch
createLantern(): Lantern
tickFuel(light: LightSource): LightSource
getLightRadius(light: LightSource | null): number
isFuelLow(light: LightSource): boolean
refillLantern(lantern: Lantern): Lantern
```

**Checklist:**
- [ ] Methods follow naming conventions (`get`, `calculate`, `update`, etc.)
- [ ] Each method has single responsibility
- [ ] Return types clearly defined
- [ ] Parameters immutable (not modified)

---

### Step 1.3: Identify Dependencies

- [ ] Does it need RandomService?
- [ ] Does it need other services?
- [ ] Any interfaces required?

**Example:**
```typescript
// CombatService dependencies
constructor(
  private random: IRandomService,          // RNG for hit/damage rolls
  private hungerService?: HungerService    // Optional: hunger modifiers
) {}
```

---

### Step 1.4: Check Existing Patterns

- [ ] Review similar services in [Architecture](../architecture.md)
- [ ] Follow established patterns from [Patterns Guide](./patterns.md)
- [ ] Check [Testing Strategy](../testing-strategy.md) for test patterns

---

## 2. Implementation

### Step 2.1: Create Folder Structure

```bash
mkdir -p src/services/ServiceName
touch src/services/ServiceName/ServiceName.ts
touch src/services/ServiceName/index.ts
```

---

### Step 2.2: Write Service Class

Use this template:

```typescript
import { GameState, Player, Monster } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// RESULT TYPES (if needed)
// ============================================================================

export interface ServiceResult {
  success: boolean
  data?: SomeType
  message: string
}

// ============================================================================
// SERVICE_NAME - Brief description of responsibility
// ============================================================================

/**
 * ServiceName handles [domain responsibility]
 *
 * Responsibilities:
 * - Primary responsibility 1
 * - Primary responsibility 2
 * - Primary responsibility 3
 *
 * @see docs/services/ServiceName.md for detailed documentation
 */
export class ServiceName {
  constructor(private dependency: DependencyType) {}

  // Public API methods

  // Private helper methods (if needed)
}
```

---

### Step 2.3: Implement Methods One at a Time

For each method:

1. **Write method signature**
   ```typescript
   calculateDamage(dice: string, bonuses?: number): number
   ```

2. **Add JSDoc comment**
   ```typescript
   /**
    * Calculate damage for a weapon attack
    *
    * Uses dice notation (e.g., "2d6+3") to determine damage.
    *
    * @param dice - Dice notation string (e.g., "1d8", "2d6+2")
    * @param bonuses - Optional damage modifiers
    * @returns Final damage amount
    *
    * @example
    * const damage = service.calculateDamage("2d6+3")
    * console.log(damage)  // 8 (rolled 2 and 3, plus 3 bonus)
    */
   ```

3. **Implement logic (pure function)**
   ```typescript
   calculateDamage(dice: string, bonuses?: number): number {
     const base = this.random.roll(dice)
     return base + (bonuses || 0)
   }
   ```

4. **Ensure immutability**
   ```typescript
   // ✅ Good - returns new object
   tickFuel(light: LightSource): LightSource {
     return { ...light, fuel: light.fuel - 1 }
   }

   // ❌ Bad - mutates parameter
   tickFuel(light: LightSource): LightSource {
     light.fuel -= 1  // MUTATION!
     return light
   }
   ```

---

### Step 2.4: Create Barrel Export

```typescript
// index.ts
export { ServiceName } from './ServiceName'
export type { SomeResultType } from './ServiceName'
```

---

### Step 2.5: Folder Structure & Naming

**Service Names**: `{Domain}Service`

**Good Examples:**
- `CombatService` - Combat domain
- `FOVService` - Field of view
- `LightingService` - Light management
- `PathfindingService` - Pathfinding algorithms

**Bad Examples:**
- ❌ `Helper` - Too vague
- ❌ `Utils` - Not a domain
- ❌ `Manager` - Meaningless suffix
- ❌ `GameLogic` - Too broad

---

## 3. Testing

### Step 3.1: Create First Test File

```bash
touch src/services/ServiceName/basic-functionality.test.ts
```

Use scenario-based naming:
- ✅ `fuel-consumption.test.ts` - Tests fuel mechanics
- ✅ `smart-pathfinding.test.ts` - Tests A* algorithm
- ❌ `ServiceName.test.ts` - Too broad

---

### Step 3.2: Write Tests (AAA Pattern)

```typescript
import { ServiceName } from './ServiceName'
import { MockRandom } from '@services/RandomService'

describe('ServiceName - Basic Functionality', () => {
  let service: ServiceName
  let mockRandom: MockRandom

  beforeEach(() => {
    // Arrange: Setup dependencies
    mockRandom = new MockRandom([5])
    service = new ServiceName(mockRandom)
  })

  test('method does expected thing', () => {
    // Arrange: Create test data
    const input = createTestInput()

    // Act: Call method under test
    const result = service.method(input)

    // Assert: Verify result
    expect(result).toBeDefined()
    expect(input).toEqual(createTestInput())  // Original unchanged!
  })
})
```

---

### Step 3.3: Test Edge Cases

- [ ] Null/undefined inputs
- [ ] Boundary values (min, max)
- [ ] Empty arrays/objects
- [ ] Invalid states

**Example:**
```typescript
test('handles null input gracefully', () => {
  const result = service.calculateDamage(null)
  expect(result).toBe(0)
})

test('handles max damage roll', () => {
  const mockRandom = new MockRandom([20])  // Max d20 roll
  const service = new CombatService(mockRandom)

  const result = service.attackRoll(10, 15)
  expect(result.isCritical).toBe(true)
})
```

---

### Step 3.4: Verify Coverage

```bash
npm test ServiceName -- --coverage
```

**Requirements:**
- [ ] >80% line coverage
- [ ] >80% branch coverage
- [ ] All public methods tested
- [ ] Edge cases covered

---

## 4. Integration

### Step 4.1: Update Commands

Example integration in a command:

```typescript
import { ServiceName } from '@services/ServiceName'

class SomeCommand implements ICommand {
  constructor(
    private existingService: ExistingService,
    private newService: ServiceName  // New service
  ) {}

  execute(state: GameState): GameState {
    // Use new service
    const result = this.newService.doSomething(state.player)

    // Update state immutably
    return { ...state, player: result.player }
  }
}
```

---

### Step 4.2: Update main.ts

```typescript
// Add to service initialization
const serviceName = new ServiceName(random)

// Add to command constructors
const someCommand = new SomeCommand(
  existingServices,
  serviceName  // New service
)
```

---

### Step 4.3: Run Integration Tests

```bash
npm test
```

Verify:
- [ ] All existing tests still pass
- [ ] New service tests pass
- [ ] Command integration works
- [ ] No circular dependencies

---

## 5. Documentation

### Step 5.1: Create Service Doc

```bash
touch docs/services/ServiceName.md
```

Use this template:

```markdown
# ServiceName

**Location**: `src/services/ServiceName/ServiceName.ts`
**Dependencies**: List of injected dependencies
**Test Coverage**: Brief description of test scenarios

---

## Purpose

Concise description of what this service does and why it exists.

---

## Public API

### `methodName(param: Type): ReturnType`
Description of what the method does.

**Usage**:
\`\`\`typescript
const result = service.methodName(value)
\`\`\`

**Parameters**:
- `param` - Description of parameter

**Returns**: Description of return value

---

## Design Rationale

### Why This Service Exists

**Problem**: What problem does this solve?

**Solution**: How does it solve it?

**Benefits**:
- Benefit 1
- Benefit 2
- Benefit 3

---

## Related Services

- ServiceA - How it relates
- ServiceB - How it relates

---

## Implementation Reference

See `src/services/ServiceName/ServiceName.ts`
```

---

### Step 5.2: Update Architecture Docs (if major service)

Add section to `docs/architecture.md`:

```markdown
### 4.X ServiceName

**Responsibilities**: Brief description

**Key Capabilities**:
- Capability 1
- Capability 2
```

---

### Step 5.3: Update Services README

Add entry to `docs/services/README.md`:

```markdown
| **ServiceName** | Brief description | `method1()`, `method2()` | Dependencies |
```

---

## Complete Checklist

### Planning
- [ ] Service name follows `{Domain}Service` pattern
- [ ] Single clear responsibility (SRP)
- [ ] Similar service doesn't already exist
- [ ] Dependencies identified

### Implementation
- [ ] Folder created: `src/services/ServiceName/`
- [ ] Service class created with constructor
- [ ] Dependencies injected via constructor
- [ ] All methods return new objects (immutability)
- [ ] No direct DOM access
- [ ] No hardcoded randomness
- [ ] JSDoc comments on public methods
- [ ] Barrel export created (index.ts)

### Testing
- [ ] Scenario-based test files created
- [ ] AAA pattern used in all tests
- [ ] MockRandom for randomness tests
- [ ] Edge cases tested
- [ ] Immutability verified (original unchanged)
- [ ] >80% line coverage
- [ ] >80% branch coverage

### Documentation
- [ ] `docs/services/ServiceName.md` created
- [ ] Purpose section written
- [ ] Public API documented
- [ ] Design rationale explained
- [ ] Usage examples provided

### Integration
- [ ] Commands updated to use service
- [ ] main.ts service instantiation added
- [ ] All tests pass
- [ ] Architectural review passed

---

## Quick Reference

### Method Naming Prefixes

| Prefix | Purpose | Example | Return Type |
|--------|---------|---------|-------------|
| `get` | Retrieve value | `getLightRadius()` | Value |
| `calculate` | Compute result | `calculateDamage()` | number/result |
| `determine` | Make decision | `determineAIAction()` | Action enum |
| `update` | Return new state | `updatePlayer()` | New state |
| `check` | Boolean test | `checkVictory()` | boolean |
| `can` | Boolean capability test | `canOpenDoor()` | boolean |
| `is` | Boolean state test | `isFuelLow()` | boolean |
| `find` | Search for item | `findPath()` | Found item or null |
| `generate` | Create new data | `generateLevel()` | New data |
| `create` | Factory method | `createTorch()` | New object |

---

## Red Flags

**🚨 Review Needed If:**
- Service >500 lines → Consider splitting
- >20 public methods → God service risk
- Method >50 lines → Extract helper methods
- No tests → Untestable design
- Direct `Math.random()` → Missing DI
- Object mutation → Violates immutability
- DOM access → Wrong layer
- User input handling → Wrong layer

---

## Related Documentation

- [Services Overview](./README.md) - All services reference
- [Patterns](./patterns.md) - Common implementation patterns
- [Testing Guide](./testing-guide.md) - Service testing
- [Architecture](../architecture.md) - Overall architecture
- [CLAUDE.md](../../CLAUDE.md) - Development workflow

---

**Last Updated**: 2025-10-06
