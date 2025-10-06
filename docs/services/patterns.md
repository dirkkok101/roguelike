# Service Patterns

[Home](../README.md) > [Services](./README.md) > Patterns

**Version**: 2.0
**Last Updated**: 2025-10-06
**Status**: ✅ Complete
**Audience**: Developer
**Reading Time**: 12 minutes
**Prerequisites**: [Services Overview](./README.md)
**Related Docs**: [Creation Guide](./creation-guide.md) | [Testing Guide](./testing-guide.md) | [Architecture](../architecture.md)

---

## Table of Contents

1. [Core Patterns](#1-core-patterns)
2. [Advanced Patterns](#2-advanced-patterns)
3. [Anti-Patterns to Avoid](#3-anti-patterns-to-avoid)

---

## 1. Core Patterns

### 1.1 Dependency Injection

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

**Real Example:**
```typescript
class CombatService {
  constructor(
    private random: IRandomService,
    private hungerService?: HungerService  // Optional dependency
  ) {}

  playerAttack(player: Player, monster: Monster): AttackResult {
    // Use random for dice rolls
    const roll = this.random.roll('1d20')

    // Use optional hunger service for penalties
    const penalty = this.hungerService?.getHungerPenalty(player) || 0

    return { hit: roll + penalty >= 10, damage }
  }
}
```

---

### 1.2 Result Object Pattern

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

**When to Use Result Objects:**
- ✅ Multiple return values needed
- ✅ Operation can succeed or fail
- ✅ Need contextual error messages
- ✅ Returning state + metadata

**Real Examples:**
- `DoorOpenResult` - DoorService
- `FuelTickResult` - LightingService
- `LanternRefillResult` - LightingService
- `PotionEffectResult` - PotionService

---

### 1.3 Factory Methods

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

**Benefits:**
- ✅ Consistent object creation
- ✅ Centralized defaults
- ✅ Useful for testing (create fixtures)
- ✅ Easy to modify all instances

---

### 1.4 Immutability Pattern

**CRITICAL: Services must NEVER mutate state.**

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

**Immutability Rules:**
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

## 2. Advanced Patterns

### 2.1 Service Composition

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

**When to Use:**
- Service needs functionality from another domain
- Complex operations require multiple services
- Avoid circular dependencies

**Real Example:**
```typescript
class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private random: IRandomService
  ) {}

  determineAction(monster: Monster, player: Player, level: Level): Action {
    // Use pathfinding service for SMART behavior
    if (monster.behavior === 'SMART') {
      const path = this.pathfinding.findPath(
        monster.position,
        player.position,
        level
      )
      return { type: 'MOVE', direction: path[0] }
    }

    // Use random for ERRATIC behavior
    if (monster.behavior === 'ERRATIC' && this.random.chance(0.5)) {
      return { type: 'MOVE', direction: this.random.pickRandom(directions) }
    }

    return { type: 'WAIT' }
  }
}
```

---

### 2.2 Error Handling

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

### 2.3 Performance Considerations

**Caching Strategy:**

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

**When to Cache:**
- Expensive calculations (pathfinding, FOV)
- Repeated with same inputs
- Results don't change frequently

**When NOT to Cache:**
- Simple calculations
- Results change every call
- Memory overhead too high

---

### 2.4 Optional Dependencies

**Pattern for optional service dependencies:**

```typescript
class CombatService {
  constructor(
    private random: IRandomService,
    private hungerService?: HungerService  // Optional
  ) {}

  calculateHitChance(player: Player): number {
    let baseChance = 10

    // Use hunger service if available
    if (this.hungerService) {
      const penalty = this.hungerService.getHungerPenalty(player)
      baseChance -= penalty
    }

    return baseChance
  }
}
```

**Benefits:**
- ✅ Service works with or without dependency
- ✅ Graceful degradation
- ✅ Easier testing (inject null for optional)

---

### 2.5 Interface-Based Services

**For multiple implementations:**

```typescript
// Define interface
export interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean
  pickRandom<T>(array: T[]): T
}

// Production implementation
class SeededRandom implements IRandomService {
  constructor(private seed: number) {}

  nextInt(min: number, max: number): number {
    // Seeded random logic
  }

  roll(dice: string): number {
    // Dice notation parser
  }
}

// Testing implementation
class MockRandom implements IRandomService {
  constructor(private values: number[]) {}

  nextInt(min: number, max: number): number {
    return this.values.shift() || min
  }

  roll(dice: string): number {
    return this.values.shift() || 1
  }
}

// Services depend on interface
class CombatService {
  constructor(private random: IRandomService) {}  // Interface!

  rollDamage(dice: string): number {
    return this.random.roll(dice)
  }
}
```

**Benefits:**
- ✅ Liskov Substitution Principle
- ✅ Swap implementations easily
- ✅ Deterministic testing with MockRandom

---

## 3. Anti-Patterns to Avoid

### 3.1 God Service

**Problem:** Service doing too many things.

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

**Fix:** Split into focused services.

```typescript
// ✅ Good - Focused services
class CombatService { calculateDamage() }
class MovementService { movePlayer() }
class DungeonService { generateDungeon() }
class InventoryService { addToInventory() }
class FOVService { computeFOV() }
```

**Detection:** Service >500 lines or >20 public methods.

---

### 3.2 State Mutation

**Problem:** Modifying objects in place.

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

**Detection:** Look for `=` assignments to object properties or array elements after object creation.

---

### 3.3 Hardcoded Dependencies

**Problem:** Direct use of global state or `Math.random()`.

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

**Detection:** Use of `Math.random()`, `Date.now()`, `localStorage` directly in service methods.

---

### 3.4 Tight Coupling

**Problem:** Service knows too much about other services' internals.

```typescript
// ❌ Bad - Tight coupling
class CombatService {
  attack(player: Player, monster: Monster): void {
    // Accessing internal state of HungerService
    if (player.hungerLevel < 100) {
      // Direct knowledge of hunger mechanics
    }
  }
}

// ✅ Good - Loose coupling
class CombatService {
  constructor(private hungerService: HungerService) {}

  attack(player: Player, monster: Monster): AttackResult {
    // Use public API only
    const penalty = this.hungerService.getAttackPenalty(player)
    const damage = this.calculateDamage(player.weapon) - penalty
    return { damage, hit: true }
  }
}
```

**Detection:** Service accessing private fields or implementation details of other services.

---

### 3.5 Missing Abstractions

**Problem:** Concrete dependencies instead of interfaces.

```typescript
// ❌ Bad - Concrete dependency
class CombatService {
  constructor(private random: SeededRandom) {}  // Concrete class!
}

// ✅ Good - Interface dependency
class CombatService {
  constructor(private random: IRandomService) {}  // Interface!
}
```

**Benefits of Interfaces:**
- ✅ Dependency Inversion Principle
- ✅ Easy testing (swap for MockRandom)
- ✅ Flexibility (change implementation without breaking callers)

---

## Pattern Decision Tree

```
Need to return multiple values?
├─ YES → Use Result Object Pattern
└─ NO → Single return value

Need randomness?
├─ YES → Inject IRandomService
└─ NO → Direct implementation

Creating standard objects?
├─ YES → Use Factory Methods
└─ NO → Direct construction

Service depends on another service?
├─ YES → Use Service Composition (inject dependency)
└─ NO → Standalone service

Multiple implementations needed?
├─ YES → Define Interface (Dependency Inversion)
└─ NO → Concrete class is fine

Expensive operation called repeatedly?
├─ YES → Consider Caching
└─ NO → No cache needed
```

---

## Related Documentation

- [Services Overview](./README.md) - All services reference
- [Creation Guide](./creation-guide.md) - Step-by-step creation
- [Testing Guide](./testing-guide.md) - Service testing
- [Architecture](../architecture.md) - Overall architecture
- [ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md) - Review checklist

---

**Last Updated**: 2025-10-06
