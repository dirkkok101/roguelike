# RandomService

**Location**: `src/services/RandomService/RandomService.ts`
**Dependencies**: None
**Test Coverage**: Seeded generation, mock testing

---

## Purpose

Provides injectable random number generation with two implementations:
- **SeededRandom**: Deterministic RNG for production (reproducible dungeons)
- **MockRandom**: Deterministic testing RNG (predictable test outcomes)

---

## Interface

### `IRandomService`
Common interface for all RNG implementations.

```typescript
interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean
  pickRandom<T>(array: T[]): T
}
```

---

## Public API

### Random Numbers

#### `nextInt(min: number, max: number): number`
Generates random integer in range [min, max] (inclusive).

**Example**:
```typescript
const roll = random.nextInt(1, 20)  // d20 roll (1-20)
```

---

### Dice Rolls

#### `roll(dice: string): number`
Parses and rolls dice notation.

**Formats Supported**:
- `"1d20"` - Single d20 roll
- `"2d6"` - Two d6 rolls (summed)
- `"1d8+3"` - d8 roll plus 3 modifier
- `"3d4-2"` - Three d4 rolls minus 2

**Examples**:
```typescript
random.roll('1d20')    // Returns: 1-20
random.roll('2d6')     // Returns: 2-12
random.roll('1d8+3')   // Returns: 4-11
```

---

### Array Operations

#### `shuffle<T>(array: T[]): T[]`
Randomly shuffles array elements (Fisher-Yates algorithm).

**Returns**: New shuffled array (immutable)

**Example**:
```typescript
const shuffled = random.shuffle([1, 2, 3, 4, 5])
// Returns: [3, 1, 5, 2, 4] (order varies)
```

---

#### `pickRandom<T>(array: T[]): T`
Picks random element from array.

**Example**:
```typescript
const monster = random.pickRandom(['Orc', 'Troll', 'Dragon'])
// Returns: 'Troll' (random)
```

---

### Probability

#### `chance(probability: number): boolean`
Returns true with given probability.

**Parameter**: `0.0` to `1.0` (0% to 100%)

**Examples**:
```typescript
random.chance(0.5)   // 50% chance of true
random.chance(0.1)   // 10% chance of true
random.chance(0.95)  // 95% chance of true
```

---

## SeededRandom (Production)

**Deterministic RNG** based on seed string.

### Construction
```typescript
const random = new SeededRandom('seed-12345')
```

**Same seed = same sequence of random numbers**

### Use Cases
- **Reproducible dungeons**: Same seed generates identical levels
- **Speedruns**: Players can replay same dungeon layout
- **Debugging**: Reproduce bugs with specific seed

### Algorithm

**Linear Congruential Generator (LCG)**:
```typescript
private next(): number {
  this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
  return this.seed / 0x7fffffff
}
```

**Seed Hashing**:
```typescript
private hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}
```

---

## MockRandom (Testing)

**Predictable RNG** for deterministic tests.

### Construction
```typescript
const mockRandom = new MockRandom([5, 8, 12, 3])  // Pre-set values
```

### Behavior

**Returns values in order**:
```typescript
mockRandom.nextInt(1, 20)  // Returns: 5
mockRandom.nextInt(1, 20)  // Returns: 8
mockRandom.nextInt(1, 20)  // Returns: 12
mockRandom.nextInt(1, 20)  // Returns: 3
mockRandom.nextInt(1, 20)  // Error: No more values
```

### Setting Values
```typescript
mockRandom.setValues([10, 15, 20])  // Reset with new sequence
```

---

## Dependency Injection

**All services receive RandomService via constructor**:

```typescript
export class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(): number {
    return this.random.roll('1d8')  // Uses injected RNG
  }
}
```

**Benefits**:
- **Testable**: Inject MockRandom for deterministic tests
- **Flexible**: Swap implementations without changing code
- **Reproducible**: Inject SeededRandom with specific seed

---

## Testing Pattern

### Production Code
```typescript
// In main.ts
const random = new SeededRandom(gameSeed)
const combatService = new CombatService(random)
```

### Test Code
```typescript
// In test file
describe('CombatService', () => {
  let mockRandom: MockRandom
  let service: CombatService

  beforeEach(() => {
    mockRandom = new MockRandom([15, 8])  // Predetermined rolls
    service = new CombatService(mockRandom)
  })

  test('player hits with d20 roll of 15', () => {
    const result = service.playerAttack(player, monster)
    expect(result.hit).toBe(true)  // Guaranteed hit (15 is high roll)
  })
})
```

---

## Seeded Dungeon Generation

**Same seed produces identical dungeons**:

```typescript
// Game 1
const random1 = new SeededRandom('adventure-123')
const level1 = dungeonService.generateLevel(1, config, random1)

// Game 2 (same seed)
const random2 = new SeededRandom('adventure-123')
const level2 = dungeonService.generateLevel(1, config, random2)

// level1 and level2 are IDENTICAL
```

**Use Cases**:
- **Daily Challenge**: Everyone plays same dungeon
- **Speedruns**: Compete on same layout
- **Replays**: Re-experience exact same game

---

## Dice Notation Parsing

**Regex Pattern**: `/(\d+)d(\d+)([+\-]\d+)?/`

**Parsing**:
```typescript
roll('2d6+3')
// Matches: count=2, sides=6, modifier=+3
// Rolls: d6 + d6 + 3
// Returns: (1-6) + (1-6) + 3 = 5-15
```

---

## Testing

**Test Files**:
- `seeded.test.ts` - Deterministic generation
- `mock.test.ts` - Mock behavior validation

**Example Test**:
```typescript
describe('RandomService - Seeded', () => {
  test('same seed produces same sequence', () => {
    const random1 = new SeededRandom('test-123')
    const random2 = new SeededRandom('test-123')

    expect(random1.nextInt(1, 100)).toBe(random2.nextInt(1, 100))
    expect(random1.nextInt(1, 100)).toBe(random2.nextInt(1, 100))
  })
})
```

---

## Related Services

**Used by nearly ALL services:**
- CombatService - Damage rolls
- DungeonService - Level generation
- MonsterAIService - Erratic behavior
- LootService - Item drops
- HungerService - Food nutrition
- SearchService - Secret discovery
- ... and many more

**Core dependency** for entire roguelike randomness.
