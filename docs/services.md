# Service Creation Guide: ASCII Roguelike

**Version**: 1.0
**Last Updated**: 2025-01-05
**Related Docs**: [Architecture](./architecture.md) | [CLAUDE.md](../CLAUDE.md) | [Testing Strategy](./testing-strategy.md) | [Architectural Review](./ARCHITECTURAL_REVIEW.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [When to Create a Service](#2-when-to-create-a-service)
3. [Service Responsibilities (SOLID Principles)](#3-service-responsibilities-solid-principles)
4. [Service Structure & Organization](#4-service-structure--organization)
5. [Core Patterns](#5-core-patterns)
6. [Writing Service Tests](#6-writing-service-tests)
7. [Service Documentation](#7-service-documentation)
8. [Integration with Commands](#8-integration-with-commands)
9. [Advanced Patterns](#9-advanced-patterns)
10. [Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)
11. [Step-by-Step Creation Guide](#11-step-by-step-creation-guide)
12. [Real Examples](#12-real-examples)
13. [Migration Guide](#13-migration-guide)
14. [Quick Reference](#14-quick-reference)

---

## 1. Introduction

### 1.1 What is a Service?

A **Service** is a class that encapsulates **all game logic and rules** for a specific domain. Services are the core of the layered architecture — they contain the "brain" of the game.

**Key Characteristics**:
- Contains ALL business logic for its domain
- Stateless (operates on data passed in)
- Pure functions where possible (no side effects)
- Testable in isolation
- Reusable across commands

**What Services DO**:
- ✅ Calculate damage, hit chances, XP rewards
- ✅ Validate moves, check collisions
- ✅ Generate dungeons, rooms, corridors
- ✅ Manage inventory, equipment
- ✅ Track hunger, fuel, experience
- ✅ Compute FOV, pathfinding
- ✅ Make AI decisions

**What Services DON'T DO**:
- ❌ Render to DOM (UI layer's job)
- ❌ Capture user input (UI layer's job)
- ❌ Orchestrate other services (Command layer's job)
- ❌ Mutate state (return new objects)

---

### 1.2 Role in Layered Architecture

```
┌──────────────────────────────────────────┐
│  UI Layer                                │
│  - Renders state                         │
│  - Captures input                        │
│  - NO logic                              │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Command Layer                           │
│  - Orchestrates services                 │
│  - Coordinates multi-step operations     │
│  - NO logic implementation               │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  SERVICE LAYER ← YOU ARE HERE            │
│  - ALL game logic                        │
│  - Domain-specific rules                 │
│  - Business calculations                 │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Data Layer                              │
│  - Immutable GameState                   │
│  - JSON config files                     │
└──────────────────────────────────────────┘
```

**The Rule**: If it's game logic, it belongs in a service. Period.

---

### 1.3 Quick Reference: 33 Existing Services

**Core Game Loop**:
- CombatService, MovementService, TurnService, MonsterTurnService

**Player Management**:
- InventoryService, HungerService, RegenerationService, LevelingService

**World & Perception**:
- FOVService, LightingService, RenderingService, DungeonService

**Monster AI**:
- MonsterAIService, PathfindingService, SpecialAbilityService

**Level Generation**:
- RoomGenerationService, CorridorGenerationService, DoorService

**Items & Abilities**:
- PotionService, ScrollService, WandService, IdentificationService

**Systems**:
- MessageService, NotificationService, ContextService, DebugService

**Utilities**:
- RandomService, VictoryService, LocalStorageService, AutoSaveMiddleware

**Level Mechanics**:
- LevelService, SearchService, TrapService

---

## 2. When to Create a Service

### 2.1 Decision Tree

```
Is this game logic or rules?
├─ YES → Service
├─ NO → Is it orchestrating multiple steps?
   ├─ YES → Command
   └─ NO → Is it rendering or capturing input?
      ├─ YES → UI Layer
      └─ NO → Reconsider your approach
```

---

### 2.2 Signs You Need a New Service

**🚨 Create a service when:**

1. **Duplicated Logic Across Commands**
   ```
   3+ commands have similar calculation/validation
   → Extract to shared service
   ```

2. **Business Rules in Commands**
   ```
   Command has loops, conditionals, calculations
   → Extract logic to service
   ```

3. **Complex Domain Logic**
   ```
   50+ lines of logic in one command
   → Move to dedicated service
   ```

4. **New Game System**
   ```
   Adding crafting, quests, skills
   → Create new domain service
   ```

5. **Testing Difficulty**
   ```
   Can't test logic without full game state
   → Extract to testable service
   ```

**Examples from Real Refactorings**:
- 26 commands duplicating `turnCount + 1` → **TurnService** created
- MoveStairsCommand had 40 lines of level transition logic → **LevelService** created
- Multiple commands opening doors with different messages → **DoorService** created

---

### 2.3 When to Extend Existing Service vs Create New

**Extend Existing Service When:**
- ✅ Logic belongs to same domain (e.g., new combat mechanic → CombatService)
- ✅ Uses same dependencies
- ✅ Shares related data structures
- ✅ Enhances existing capabilities

**Create New Service When:**
- ✅ Different domain/responsibility
- ✅ Requires different dependencies
- ✅ Service would grow >500 lines
- ✅ Logically separable feature

**Example**:
```
Q: Add equipment durability system?
A: Extend InventoryService (same domain: items/equipment)

Q: Add weather system affecting light radius?
A: Create WeatherService (new domain: environmental effects)
```

---

## 3. Service Responsibilities (SOLID Principles)

### 3.1 Single Responsibility Principle (SRP)

**Each service owns ONE domain.**

```typescript
// ✅ Good - Single responsibility
class CombatService {
  calculateDamage()    // Combat domain
  calculateHitChance() // Combat domain
  applyDamage()        // Combat domain
}

// ❌ Bad - Multiple responsibilities
class GameService {
  calculateDamage()      // Combat
  movePlayer()           // Movement
  generateDungeon()      // Generation
  addInventoryItem()     // Inventory
}
```

**Test**: "What is this service responsible for?" Should be one clear answer.

---

### 3.2 Open/Closed Principle (OCP)

**Extend via new methods, not modification.**

```typescript
// ✅ Good - Adding new capability
class CombatService {
  calculateMeleeDamage()  // Existing
  calculateRangedDamage() // New method, doesn't break existing
}

// ❌ Bad - Modifying existing behavior
class CombatService {
  calculateDamage(weaponType: string) {  // Now requires all callers to change!
    if (weaponType === 'ranged') {
      // New logic breaks existing calls
    }
  }
}
```

---

### 3.3 Liskov Substitution Principle (LSP)

**Interfaces should be interchangeable.**

```typescript
// ✅ Good - Interface enables substitution
interface IRandomService {
  nextInt(min: number, max: number): number
}

class SeededRandom implements IRandomService { ... }  // Production
class MockRandom implements IRandomService { ... }     // Testing

// Service depends on interface, works with either implementation
class CombatService {
  constructor(private random: IRandomService) {}
}
```

---

### 3.4 Interface Segregation Principle (ISP)

**Keep interfaces small and focused.**

```typescript
// ✅ Good - Small, focused interface
interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  chance(probability: number): boolean
}

// ❌ Bad - Bloated interface
interface IGodService {
  // 50+ methods from unrelated domains
}
```

---

### 3.5 Dependency Inversion Principle (DIP)

**Depend on abstractions, not concretions.**

```typescript
// ✅ Good - Depends on interface
class CombatService {
  constructor(private random: IRandomService) {}  // Interface!

  calculateDamage(dice: string): number {
    return this.random.roll(dice)  // Works with any IRandomService
  }
}

// ❌ Bad - Depends on concrete class
class CombatService {
  calculateDamage(): number {
    return Math.random() * 10  // Hardcoded, not testable!
  }
}
```

---

## 4. Service Structure & Organization

### 4.1 Folder Structure

```
src/services/ServiceName/
├── ServiceName.ts              # Implementation
├── scenario-1.test.ts          # Scenario-based tests
├── scenario-2.test.ts          # More tests
├── scenario-3.test.ts          # Even more tests
└── index.ts                    # Barrel export
```

**Real Example** (LightingService):
```
src/services/LightingService/
├── LightingService.ts
├── fuel-consumption.test.ts
├── light-sources.test.ts
├── refill.test.ts
├── warnings.test.ts
└── index.ts
```

---

### 4.2 Naming Conventions

**Service Names**: `{Domain}Service`

**Good Examples**:
- `CombatService` - Combat domain
- `FOVService` - Field of view
- `LightingService` - Light management
- `PathfindingService` - Pathfinding algorithms
- `TurnService` - Turn counter management

**Bad Examples**:
- ❌ `Helper` - Too vague
- ❌ `Utils` - Not a domain
- ❌ `Manager` - Meaningless suffix
- ❌ `GameLogic` - Too broad

---

### 4.3 File Header Template

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

### 4.4 Method Organization

**Order within service class:**

1. **Constructor** (dependency injection)
2. **Public API methods** (alphabetically or by importance)
3. **Private helper methods** (if needed)

```typescript
export class ExampleService {
  // 1. Constructor
  constructor(private random: IRandomService) {}

  // 2. Public API
  publicMethod1(): ReturnType { ... }
  publicMethod2(): ReturnType { ... }
  publicMethod3(): ReturnType { ... }

  // 3. Private helpers
  private helperMethod1(): void { ... }
  private helperMethod2(): void { ... }
}
```

---

### 4.5 Method Naming Prefixes

**Common Prefixes**:
- `get` - Retrieve value (e.g., `getLightRadius`)
- `set` - Update value (avoid mutation!)
- `calculate` - Compute result (e.g., `calculateDamage`)
- `determine` - Make decision (e.g., `determineAIAction`)
- `apply` - Execute effect (e.g., `applyPotion`)
- `update` - Return new state (e.g., `updateExploredTiles`)
- `check` - Boolean test (e.g., `checkVictory`)
- `can` - Boolean capability test (e.g., `canOpenDoor`)
- `is` - Boolean state test (e.g., `isFuelLow`)
- `find` - Search for item (e.g., `findPath`)
- `generate` - Create new data (e.g., `generateLevel`)
- `create` - Factory method (e.g., `createTorch`)

---

## 5. Core Patterns

### 5.1 Dependency Injection

**Always inject dependencies via constructor.**

```typescript
/**
 * Standard dependency injection pattern
 */
class ExampleService {
  constructor(
    private random: IRandomService,        // Required for randomness
    private otherService: OtherService     // Service composition
  ) {}

  someMethod(): number {
    return this.random.roll('2d6')  // Use injected dependency
  }
}
```

**Why?**
- ✅ Testable (inject MockRandom in tests)
- ✅ Flexible (swap implementations)
- ✅ Clear dependencies (visible in constructor)

---

### 5.2 Result Object Pattern

**Use when returning multiple related values.**

```typescript
// Define result type
export interface DoorOpenResult {
  level: Level           // Updated level
  message: string        // User feedback
  success: boolean       // Operation status
}

// Service method
openDoorWithResult(level: Level, door: Door): DoorOpenResult {
  if (door.state === DoorState.LOCKED) {
    return {
      level,  // Unchanged
      message: "The door is locked!",
      success: false
    }
  }

  const updatedDoors = level.doors.map(d =>
    d.position === door.position
      ? { ...d, state: DoorState.OPEN }
      : d
  )

  return {
    level: { ...level, doors: updatedDoors },
    message: door.wasSecret
      ? "You discover and open a secret door!"
      : "You open the door.",
    success: true
  }
}
```

**When to Use Result Objects**:
- ✅ Multiple return values needed
- ✅ Operation can succeed or fail
- ✅ Need contextual error messages
- ✅ Returning state + metadata

**Real Examples**:
- `DoorOpenResult` - DoorService
- `FuelTickResult` - LightingService
- `LanternRefillResult` - LightingService
- `PotionEffectResult` - PotionService

---

### 5.3 Factory Methods

**Standardized object creation.**

```typescript
class LightingService {
  /**
   * Factory: Create standard torch
   */
  createTorch(): Torch {
    return {
      id: `torch-${Date.now()}`,
      name: 'Torch',
      type: ItemType.TORCH,
      identified: true,
      position: { x: 0, y: 0 },
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false
    }
  }

  /**
   * Factory: Create lantern
   */
  createLantern(): Lantern {
    return {
      id: `lantern-${Date.now()}`,
      name: 'Lantern',
      type: ItemType.LANTERN,
      identified: true,
      position: { x: 0, y: 0 },
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false
    }
  }
}
```

**Benefits**:
- ✅ Consistent object creation
- ✅ Centralized defaults
- ✅ Useful for testing (create fixtures)
- ✅ Easy to modify all instances

---

### 5.4 Immutability Pattern

**CRITICAL**: Services must NEVER mutate state.

```typescript
// ✅ CORRECT - Return new object
tickFuel(light: LightSource): LightSource {
  return { ...light, fuel: light.fuel - 1 }
}

// ❌ WRONG - Mutates parameter
tickFuel(light: LightSource): LightSource {
  light.fuel -= 1  // MUTATION!
  return light
}

// ✅ CORRECT - Update nested structure
updatePlayer(player: Player, hp: number): Player {
  return { ...player, hp }
}

// ✅ CORRECT - Update array immutably
updateDoors(doors: Door[], doorId: string, state: DoorState): Door[] {
  return doors.map(door =>
    door.id === doorId
      ? { ...door, state }
      : door
  )
}
```

**Immutability Rules**:
1. Always use spread operator `{...obj}`, `[...arr]`
2. Never use `push`, `splice`, `pop` on arrays
3. Never assign to object properties after creation
4. Return new objects from all update methods

**Why Immutability?**
- ✅ Enables undo/redo
- ✅ Prevents action-at-a-distance bugs
- ✅ Makes debugging easier
- ✅ Supports React-style rendering
- ✅ Required for time-travel debugging

---

## 6. Writing Service Tests

### 6.1 Test File Organization

**Scenario-Based Naming**: Test files describe behavior, not methods.

```
services/LightingService/
├── fuel-consumption.test.ts     # Fuel tick mechanics
├── light-sources.test.ts        # Creation, radius, types
├── refill.test.ts               # Lantern refill mechanics
└── warnings.test.ts             # Warning generation
```

**NOT** ✅ Good - clear scenarios
**vs** ❌ `LightingService.test.ts` - too broad

---

### 6.2 AAA Pattern (Arrange-Act-Assert)

**Every test follows this structure:**

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

### 6.3 Testing with MockRandom

**Always use MockRandom for deterministic tests.**

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

test('critical hit on max roll', () => {
  const mockRandom = new MockRandom([20])  // Always roll 20
  const service = new CombatService(mockRandom)

  const result = service.attackRoll(10, 15)
  expect(result.isCritical).toBe(true)
})
```

**Why MockRandom?**
- ✅ Deterministic (no flaky tests)
- ✅ Test specific edge cases (max roll, min roll)
- ✅ Reproducible (same results every run)

---

### 6.4 Test Descriptive Names

**Use full sentences describing expected behavior.**

```typescript
// ✅ Good - describes behavior
test('reduces fuel by 1 each tick')
test('warns when torch has 50 turns remaining')
test('permanent lights never run out of fuel')
test('returns unchanged player when no light equipped')

// ❌ Bad - too vague or implementation-focused
test('tickFuel')
test('fuel')
test('test1')
test('it works')
```

---

### 6.5 Testing Immutability

**Always verify original objects unchanged.**

```typescript
test('updatePlayer returns new object without mutating original', () => {
  // Arrange
  const originalPlayer = { ...testPlayer, hp: 20 }
  const originalHp = originalPlayer.hp

  // Act
  const updated = service.updatePlayer(originalPlayer, 15)

  // Assert
  expect(updated.hp).toBe(15)              // New object updated
  expect(originalPlayer.hp).toBe(originalHp)  // Original unchanged!
  expect(updated).not.toBe(originalPlayer) // Different reference
})
```

---

### 6.6 Coverage Requirements

**Minimum Standards**:
- >80% line coverage (minimum)
- >80% branch coverage
- 100% for critical services (Combat, Movement, Dungeon)

**How to Check**:
```bash
npm run test:coverage
```

**Target Files**:
- Services: Aim for 100%
- Commands: >80% (orchestration harder to test)
- UI: Test critical paths only

---

## 7. Service Documentation

### 7.1 JSDoc Comments

**Every public method needs JSDoc.**

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
calculateDamage(dice: string, bonuses?: number): number {
  const base = this.random.roll(dice)
  return base + (bonuses || 0)
}
```

**Required JSDoc Elements**:
- Brief description (one line)
- `@param` for each parameter
- `@returns` for return value
- `@throws` if method can throw (rare)
- `@example` for complex methods

---

### 7.2 Service Documentation File

**Every service needs a doc file**: `docs/services/{ServiceName}.md`

**Template** (based on TurnService.md):

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

**See Real Example**: `docs/services/TurnService.md`

---

## 8. Integration with Commands

### 8.1 Service-Command Contract

**The Rule**: Commands orchestrate, services implement.

```typescript
// COMMAND - Orchestration only
class MoveCommand implements ICommand {
  constructor(
    private movement: MovementService,
    private lighting: LightingService,
    private fov: FOVService,
    private turn: TurnService
  ) {}

  execute(state: GameState): GameState {
    // 1. Calculate new position (service)
    const newPos = this.movement.calculatePosition(
      state.player.position,
      this.direction
    )

    // 2. Validate move (service)
    if (!this.movement.canMoveTo(newPos, state.level)) {
      return state
    }

    // 3. Update player (immutable)
    const movedPlayer = { ...state.player, position: newPos }

    // 4. Tick fuel (service)
    const fuelResult = this.lighting.tickFuel(movedPlayer)

    // 5. Recompute FOV (service)
    const visibleCells = this.fov.computeFOV(
      newPos,
      this.lighting.getLightRadius(fuelResult.player.equipment.lightSource),
      state.level
    )

    // 6. Update explored tiles (service)
    const updatedLevel = this.fov.updateExploredTiles(
      state.level,
      visibleCells
    )

    // 7. Increment turn (service)
    return this.turn.incrementTurn({
      ...state,
      player: fuelResult.player,
      level: updatedLevel,
      visibleCells
    })
  }
}
```

**Command Checklist**:
- [ ] Each step is a service call
- [ ] No loops or calculations
- [ ] No business logic
- [ ] Reads like a recipe (step 1, step 2, step 3)
- [ ] <30 lines (orchestration is concise)

---

### 8.2 Common Integration Patterns

**Pattern 1: Sequential Service Calls**
```
Calculate → Validate → Execute → Update State
```

**Pattern 2: Conditional Delegation**
```
IF monster present:
  CALL combatService.attack()
ELSE:
  CALL movementService.move()
```

**Pattern 3: Result Object Handling**
```
result = service.performAction()
IF result.success:
  Apply result.data
  Add result.message
ELSE:
  Return unchanged state
```

---

## 9. Advanced Patterns

### 9.1 Service Composition

**When services depend on other services:**

```typescript
class ComplexService {
  constructor(
    private simpleService: SimpleService,
    private helperService: HelperService,
    private random: IRandomService
  ) {}

  complexOperation(): Result {
    // Use composed services
    const step1 = this.simpleService.doSomething()
    const step2 = this.helperService.processData(step1)
    const step3 = this.random.roll('1d20')

    return this.combineResults(step1, step2, step3)
  }

  private combineResults(...args): Result {
    // Private helper method
  }
}
```

**When to Use**:
- Service needs functionality from another domain
- Complex operations require multiple services
- Avoid circular dependencies

---

### 9.2 Error Handling

**Option 1: Result Objects** (Preferred)
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}

validateMove(pos: Position, level: Level): ValidationResult {
  const errors: string[] = []

  if (pos.x < 0 || pos.x >= level.width) {
    errors.push("Position out of bounds")
  }

  if (level.tiles[pos.y][pos.x].type === TileType.WALL) {
    errors.push("Cannot move into wall")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

**Option 2: Exceptions** (Rare)
```typescript
// Only for truly exceptional cases
refillLantern(lantern: Lantern): Lantern {
  if (lantern.type !== ItemType.LANTERN) {
    throw new Error('Can only refill lanterns')  // Programming error
  }
  // ...
}
```

**Guideline**: Use result objects for expected failures (validation), exceptions for programming errors.

---

### 9.3 Performance Considerations

**Caching Strategy**:
```typescript
class FOVService {
  private fovCache = new Map<string, Set<string>>()

  computeFOV(origin: Position, radius: number, level: Level): Set<string> {
    const cacheKey = `${origin.x},${origin.y},${radius}`

    if (this.fovCache.has(cacheKey)) {
      return this.fovCache.get(cacheKey)!  // Cache hit
    }

    const result = this.calculateFOV(origin, radius, level)
    this.fovCache.set(cacheKey, result)
    return result
  }

  // Clear cache when level changes
  invalidateCache(): void {
    this.fovCache.clear()
  }
}
```

**When to Cache**:
- Expensive calculations (pathfinding, FOV)
- Repeated with same inputs
- Results don't change frequently

**When NOT to Cache**:
- Simple calculations
- Results change every call
- Memory overhead too high

---

## 10. Anti-Patterns to Avoid

### 10.1 God Service

**Problem**: Service doing too many things.

```typescript
// ❌ Bad - God service
class GameService {
  calculateDamage()      // Combat
  movePlayer()           // Movement
  generateDungeon()      // Generation
  addToInventory()       // Inventory
  computeFOV()           // Vision
  // ...50 more methods
}
```

**Fix**: Split into focused services.
```typescript
// ✅ Good - Focused services
class CombatService { calculateDamage() }
class MovementService { movePlayer() }
class DungeonService { generateDungeon() }
class InventoryService { addToInventory() }
class FOVService { computeFOV() }
```

**Detection**: Service >500 lines or >20 public methods.

---

### 10.2 State Mutation

**Problem**: Modifying objects in place.

```typescript
// ❌ Bad - Mutation
tickFuel(light: LightSource): LightSource {
  light.fuel -= 1  // MUTATES PARAMETER!
  return light
}

// ✅ Good - Immutability
tickFuel(light: LightSource): LightSource {
  return { ...light, fuel: light.fuel - 1 }
}
```

**Detection**: Look for `=` assignments to object properties or array elements after object creation.

---

### 10.3 Hardcoded Dependencies

**Problem**: Direct use of global state or `Math.random()`.

```typescript
// ❌ Bad - Hardcoded dependency
class CombatService {
  calculateDamage(): number {
    return Math.floor(Math.random() * 10)  // Not testable!
  }
}

// ✅ Good - Injected dependency
class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(dice: string): number {
    return this.random.roll(dice)  // Testable!
  }
}
```

---

### 10.4 Logic Leakage to Commands

**Problem**: Business rules implemented in commands.

```typescript
// ❌ Bad - Logic in command
class MoveCommand {
  execute(state: GameState): GameState {
    const newPos = { x: state.player.position.x + this.dx }

    // LOOP IN COMMAND!
    visibleCells.forEach((key) => {
      const pos = this.fovService.keyToPos(key)
      if (level.explored[pos.y]) {
        level.explored[pos.y][pos.x] = true  // LOGIC IN COMMAND!
      }
    })
  }
}

// ✅ Good - Logic in service
class MoveCommand {
  execute(state: GameState): GameState {
    const newPos = this.movement.calculatePosition(state.player.position, this.dx)
    const updatedLevel = this.fov.updateExploredTiles(level, visibleCells)
    return { ...state, level: updatedLevel }
  }
}
```

**See**: [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for comprehensive checklist.

---

## 11. Step-by-Step Creation Guide

### Phase 1: Planning

**Step 1.1: Identify Domain**
- [ ] What is the service responsible for?
- [ ] One clear answer? (Single Responsibility)
- [ ] Does similar service already exist?

**Step 1.2: Define Public API**
```
List all public methods needed:
- createX()
- calculateY()
- updateZ()
```

**Step 1.3: Identify Dependencies**
- [ ] Does it need RandomService?
- [ ] Does it need other services?
- [ ] Any interfaces required?

**Step 1.4: Check Existing Patterns**
- [ ] Review similar services (architecture.md)
- [ ] Follow established patterns

---

### Phase 2: Implementation

**Step 2.1: Create Folder**
```bash
mkdir -p src/services/ServiceName
touch src/services/ServiceName/ServiceName.ts
touch src/services/ServiceName/index.ts
```

**Step 2.2: Write Service Class**
```typescript
// ServiceName.ts
import { GameState, SomeType } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

export class ServiceName {
  constructor(private random: IRandomService) {}

  // TODO: Implement methods
}
```

**Step 2.3: Implement Methods One at a Time**
- [ ] Write method signature
- [ ] Add JSDoc comment
- [ ] Implement logic (pure function)
- [ ] Ensure immutability
- [ ] Test manually

**Step 2.4: Create Barrel Export**
```typescript
// index.ts
export { ServiceName } from './ServiceName'
export type { SomeResultType } from './ServiceName'
```

---

### Phase 3: Testing

**Step 3.1: Create First Test File**
```bash
touch src/services/ServiceName/basic-functionality.test.ts
```

**Step 3.2: Write Tests (AAA Pattern)**
```typescript
import { ServiceName } from './ServiceName'
import { MockRandom } from '@services/RandomService'

describe('ServiceName - Basic Functionality', () => {
  let service: ServiceName
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom([5])
    service = new ServiceName(mockRandom)
  })

  test('method does expected thing', () => {
    // Arrange
    const input = createTestInput()

    // Act
    const result = service.method(input)

    // Assert
    expect(result).toBeDefined()
    expect(input).toEqual(createTestInput())  // Unchanged
  })
})
```

**Step 3.3: Test Edge Cases**
- [ ] Null/undefined inputs
- [ ] Boundary values (min, max)
- [ ] Empty arrays/objects
- [ ] Invalid states

**Step 3.4: Verify Coverage**
```bash
npm test ServiceName -- --coverage
```
- [ ] >80% line coverage
- [ ] >80% branch coverage

---

### Phase 4: Integration

**Step 4.1: Update Commands**
- [ ] Import service
- [ ] Inject in constructor
- [ ] Replace inline logic with service calls
- [ ] Test commands still work

**Step 4.2: Update main.ts**
```typescript
// Add to service initialization
const serviceName = new ServiceName(random)

// Add to command constructors
const someCommand = new SomeCommand(
  existingServices,
  serviceName  // New service
)
```

**Step 4.3: Run Integration Tests**
```bash
npm test
```

---

### Phase 5: Documentation

**Step 5.1: Create Service Doc**
```bash
touch docs/services/ServiceName.md
```

**Step 5.2: Write Documentation**
- [ ] Purpose section
- [ ] Public API documentation
- [ ] Design rationale
- [ ] Usage examples
- [ ] Related services

**Step 5.3: Update architecture.md** (if major service)
```markdown
### 4.X ServiceName

**Responsibilities**: Brief description

**Key Capabilities**:
- Capability 1
- Capability 2
```

**Step 5.4: Update CLAUDE.md** (if establishes pattern)
Add real example to relevant section.

---

## 12. Real Examples

### 12.1 Simple Service: TurnService

**Why Simple?**
- Zero dependencies
- Two methods
- No complex logic
- Single responsibility

**Code** (`src/services/TurnService/TurnService.ts`):
```typescript
export class TurnService {
  incrementTurn(state: GameState): GameState {
    return { ...state, turnCount: state.turnCount + 1 }
  }

  getCurrentTurn(state: GameState): number {
    return state.turnCount
  }
}
```

**Usage**:
```typescript
// In every command
return this.turnService.incrementTurn(state)
```

**Benefits**:
- DRY: 26 commands use same method
- Extensible: Future turn-based effects easy to add
- Simple: 23 lines total

**See**: `docs/services/TurnService.md`

---

### 12.2 Complex Service: DungeonService

**Why Complex?**
- Multiple dependencies (RandomService, RoomGenerationService, CorridorGenerationService)
- 500+ lines
- Complex algorithms (MST, door placement, entity spawning)
- Coordinates multiple sub-services

**Key Methods**:
```typescript
class DungeonService {
  constructor(
    private random: IRandomService,
    private itemData?: ItemData
  ) {}

  generateLevel(depth: number, config: DungeonConfig): Level
  private generateRooms(): Room[]
  private connectRooms(rooms: Room[]): Corridor[]
  private placeDoors(corridors: Corridor[]): Door[]
  private spawnMonsters(rooms: Room[], depth: number): Monster[]
  private spawnItems(rooms: Room[], depth: number): Item[]
}
```

**Pattern**: Orchestrates sub-services for room/corridor generation.

**See**: `src/services/DungeonService/DungeonService.ts`

---

### 12.3 Interface-Based Service: RandomService

**Why Interface-Based?**
- Multiple implementations needed (production vs testing)
- Dependency inversion principle
- Enables deterministic testing

**Interface**:
```typescript
export interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean
  pickRandom<T>(array: T[]): T
}
```

**Implementations**:
```typescript
// Production: Seeded randomness
class SeededRandom implements IRandomService { ... }

// Testing: Predetermined values
class MockRandom implements IRandomService { ... }
```

**Usage**:
```typescript
// Services depend on interface
class CombatService {
  constructor(private random: IRandomService) {}
}

// Can inject either implementation
const prodService = new CombatService(new SeededRandom(seed))
const testService = new CombatService(new MockRandom([5, 8, 3]))
```

**See**: `src/services/RandomService/RandomService.ts`

---

### 12.4 Result Object Service: DoorService

**Why Result Objects?**
- Returns multiple values (level, message, success)
- Type-safe returns
- Self-documenting

**Result Type**:
```typescript
export interface DoorOpenResult {
  level: Level        // Updated level state
  message: string     // User feedback
  success: boolean    // Operation status
}
```

**Method**:
```typescript
openDoorWithResult(level: Level, door: Door): DoorOpenResult {
  if (door.state === DoorState.LOCKED) {
    return {
      level,  // Unchanged
      message: "The door is locked!",
      success: false
    }
  }

  const updatedDoors = level.doors.map(d =>
    d.position === door.position
      ? { ...d, state: DoorState.OPEN }
      : d
  )

  return {
    level: { ...level, doors: updatedDoors },
    message: door.wasSecret
      ? "You discover and open a secret door!"
      : "You open the door.",
    success: true
  }
}
```

**Benefits**:
- Single return type (not tuples)
- Named fields (self-documenting)
- Type-safe (compiler enforces usage)

**See**: `src/services/DoorService/DoorService.ts`

---

## 13. Migration Guide

### 13.1 Extracting Logic from Commands

**Scenario**: Command has business logic that belongs in service.

**Step 1: Identify the Logic**
```typescript
// MoveCommand has this logic:
visibleCells.forEach((key) => {
  const pos = this.fovService.keyToPos(key)
  if (updatedLevel.explored[pos.y]) {
    updatedLevel.explored[pos.y][pos.x] = true
  }
})
```

**Red Flags**:
- `forEach` loop
- Array manipulation
- Conditional logic

**Step 2: Determine Domain**
- What is this doing? → Updating explored tiles based on FOV
- Which service? → FOVService (owns FOV/exploration domain)

**Step 3: Create Service Method**
```typescript
// In FOVService.ts
updateExploredTiles(level: Level, visibleCells: Set<string>): Level {
  const updatedExplored = level.explored.map((row) => [...row])

  visibleCells.forEach((key) => {
    const pos = this.keyToPos(key)
    if (updatedExplored[pos.y] && updatedExplored[pos.y][pos.x] !== undefined) {
      updatedExplored[pos.y][pos.x] = true
    }
  })

  return { ...level, explored: updatedExplored }
}
```

**Step 4: Update Command**
```typescript
// MoveCommand - before
visibleCells.forEach((key) => { ... })  // 11 lines

// MoveCommand - after
const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)  // 1 line
```

**Step 5: Write Service Tests**
```typescript
// FOVService/exploration-tracking.test.ts
test('marks visible cells as explored', () => {
  // Test the extracted logic
})
```

**Step 6: Verify Command Tests Pass**
```bash
npm test MoveCommand
```

---

## 14. Quick Reference

### 14.1 Service Creation Checklist

**Planning**:
- [ ] Service name follows `{Domain}Service` pattern
- [ ] Single clear responsibility (SRP)
- [ ] Similar service doesn't already exist
- [ ] Dependencies identified

**Implementation**:
- [ ] Folder created: `src/services/ServiceName/`
- [ ] Service class created with constructor
- [ ] Dependencies injected via constructor
- [ ] All methods return new objects (immutability)
- [ ] No direct DOM access
- [ ] No hardcoded randomness
- [ ] JSDoc comments on public methods
- [ ] Barrel export created (index.ts)

**Testing**:
- [ ] Scenario-based test files created
- [ ] AAA pattern used in all tests
- [ ] MockRandom for randomness tests
- [ ] Edge cases tested
- [ ] Immutability verified (original unchanged)
- [ ] >80% line coverage
- [ ] >80% branch coverage

**Documentation**:
- [ ] `docs/services/ServiceName.md` created
- [ ] Purpose section written
- [ ] Public API documented
- [ ] Design rationale explained
- [ ] Usage examples provided

**Integration**:
- [ ] Commands updated to use service
- [ ] main.ts service instantiation added
- [ ] All tests pass
- [ ] Architectural review passed

---

### 14.2 Common Method Patterns

| Pattern | Prefix | Example | Return Type |
|---------|--------|---------|-------------|
| Factory | `create` | `createTorch()` | New object |
| Query | `get` | `getLightRadius()` | Value |
| Boolean test | `is`, `can`, `has` | `isFuelLow()` | boolean |
| Calculation | `calculate` | `calculateDamage()` | number/result |
| Decision | `determine` | `determineAIAction()` | Action enum |
| State update | `update`, `apply` | `updatePlayer()` | New state |
| Search | `find` | `findPath()` | Found item or null |
| Generation | `generate` | `generateLevel()` | New data |

---

### 14.3 When to Use Each Pattern

| Pattern | When to Use |
|---------|-------------|
| **Result Object** | Multiple return values, operation can fail |
| **Factory Method** | Standardized object creation, testing fixtures |
| **Service Composition** | Service needs functionality from another domain |
| **Interface** | Multiple implementations needed (production vs test) |
| **Caching** | Expensive calculations, repeated with same inputs |

---

### 14.4 Red Flags in Services

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

### 14.5 File Naming Quick Ref

**Services**: `{Domain}Service.ts`
- ✅ CombatService.ts
- ✅ LightingService.ts
- ❌ combat.ts
- ❌ LightingHelper.ts

**Tests**: `{scenario}.test.ts`
- ✅ fuel-consumption.test.ts
- ✅ smart-pathfinding.test.ts
- ❌ LightingService.test.ts
- ❌ tests.test.ts

**Docs**: `{ServiceName}.md`
- ✅ LightingService.md
- ✅ TurnService.md
- ❌ lighting.md

---

## Additional Resources

### Related Documentation
- [Architecture Overview](./architecture.md)
- [CLAUDE.md - Architectural Principles](../CLAUDE.md#core-architectural-principles)
- [Testing Strategy](./testing-strategy.md)
- [Architectural Review Checklist](./ARCHITECTURAL_REVIEW.md)

### Example Services
- Simple: `docs/services/TurnService.md`
- Complex: `src/services/DungeonService/`
- Interface: `src/services/RandomService/`
- Result Objects: `docs/services/DoorService.md`

### Code Examples
- Service Template: Section 4.3 (above)
- Test Template: Section 6.2 (above)
- Documentation Template: Section 7.2 (above)

---

**Last Updated**: 2025-01-05
**Maintainers**: Project architecture team
**Feedback**: Report issues or suggest improvements via project issues
