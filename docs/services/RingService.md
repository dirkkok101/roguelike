# RingService

**Location**: `src/services/RingService/RingService.ts`
**Dependencies**: RandomService
**Test Coverage**: Foundation methods, bonus calculations, hunger modifiers, passive abilities, teleportation

---

## Purpose

Centralized service for managing all ring effects in the game. Provides query methods for ring bonuses, passive abilities, and special effects. Integrates with CombatService, HungerService, RegenerationService, and other systems.

---

## Ring Types Overview

The game features 10 ring types following classic 1980 Rogue mechanics:

| Ring Type | Effect | Bonus | Hunger Modifier | Notes |
|-----------|--------|-------|-----------------|-------|
| **PROTECTION** | AC bonus | +1 to +2 | +50% | Improves armor class |
| **ADD_STRENGTH** | Strength bonus | +1 to +2 | +50% | Increases damage and hit chance |
| **DEXTERITY** | AC + to-hit bonus | +1 to +2 | +50% | Dual benefit (AC + accuracy) |
| **REGENERATION** | 2x heal rate | N/A | +30% | Doubles natural healing |
| **SLOW_DIGESTION** | Reduces hunger | N/A | -50% | Can negate all hunger with two rings |
| **SEARCHING** | Auto-detect traps/doors | N/A | +50% | 10% chance per ring per turn |
| **SEE_INVISIBLE** | Reveal invisible monsters | N/A | +50% | Makes Phantoms visible |
| **SUSTAIN_STRENGTH** | Block strength drain | N/A | +50% | Protects from Rattlesnake attacks |
| **TELEPORTATION** | Random teleport (cursed) | N/A | +50% | **Always cursed**, 15% chance per turn |
| **STEALTH** | Silent movement | N/A | +50% | Prevents waking sleeping monsters |

---

## Bonus System

### Bonus Stacking
- Players can wear **2 rings simultaneously** (left hand + right hand)
- Bonuses from the same ring type **stack additively**
- Example: Protection +1 (left) + Protection +2 (right) = **+3 total AC bonus**

### Cursed Rings
- Cursed rings have **negative bonuses**: -1, -2, or -3
- Cannot be removed without remove curse scroll
- Ring of Teleportation is **always cursed** (cannot spawn blessed)

---

## Public API

### Foundation Methods

#### `hasRing(player: Player, ringType: RingType): boolean`
Checks if player has at least one ring of the specified type equipped.

**Parameters**:
- `player` - Player to check
- `ringType` - Ring type to search for

**Returns**: `true` if player has ring equipped (left or right hand)

**Example**:
```typescript
const hasRegen = ringService.hasRing(player, RingType.REGENERATION)
// Returns: true if REGENERATION ring equipped
```

---

#### `getRingBonus(player: Player, ringType: RingType): number`
Calculates total bonus for a specific ring type (stacks if both hands have same type).

**Parameters**:
- `player` - Player to check
- `ringType` - Ring type to sum bonuses for

**Returns**: Total bonus (positive or negative)

**Example**:
```typescript
const protectionBonus = ringService.getRingBonus(player, RingType.PROTECTION)
// Left: Protection +1, Right: Protection +2 → Returns: 3
// Left: Cursed Protection -2, Right: None → Returns: -2
```

---

#### `getEquippedRings(player: Player): Ring[]`
Returns array of all equipped rings (left + right).

**Returns**: Array of 0-2 Ring objects

**Example**:
```typescript
const rings = ringService.getEquippedRings(player)
// Returns: [Ring, Ring] or [Ring] or []
```

---

#### `getRingEffects(player: Player): RingEffectResult`
Comprehensive summary of all active ring effects.

**Returns**: `RingEffectResult` object:
```typescript
{
  acBonus: number              // AC from PROTECTION + DEXTERITY
  strengthBonus: number        // Bonus from ADD_STRENGTH
  dexterityBonus: number       // Bonus from DEXTERITY
  hungerModifier: number       // Total hunger rate multiplier
  hasRegeneration: boolean     // REGENERATION ring equipped
  hasStealth: boolean          // STEALTH ring equipped
  hasSearching: boolean        // SEARCHING ring equipped
  hasSeeInvisible: boolean     // SEE_INVISIBLE ring equipped
  hasSustainStrength: boolean  // SUSTAIN_STRENGTH ring equipped
}
```

**Example**:
```typescript
const effects = ringService.getRingEffects(player)
console.log(effects)
// {
//   acBonus: 3,
//   strengthBonus: 1,
//   dexterityBonus: 2,
//   hungerModifier: 2.0,  // 2x hunger (two normal rings)
//   hasRegeneration: false,
//   hasStealth: true,
//   ...
// }
```

---

### Bonus Calculation Methods

#### `getACBonus(player: Player): number`
Calculates total AC bonus from PROTECTION and DEXTERITY rings.

**Formula**:
```
AC Bonus = sum(PROTECTION bonuses) + sum(DEXTERITY bonuses)
```

**Example**:
```typescript
const acBonus = ringService.getACBonus(player)
// Left: Protection +2, Right: Dexterity +1 → Returns: 3
```

---

#### `getStrengthBonus(player: Player): number`
Calculates total strength bonus from ADD_STRENGTH rings.

**Example**:
```typescript
const strBonus = ringService.getStrengthBonus(player)
// Left: Add Strength +1, Right: Add Strength +2 → Returns: 3
```

---

#### `getDexterityBonus(player: Player): number`
Calculates total dexterity bonus from DEXTERITY rings.

**Example**:
```typescript
const dexBonus = ringService.getDexterityBonus(player)
// Left: Dexterity +2, Right: None → Returns: 2
```

---

### Hunger Modifier Calculation

#### `calculateHungerModifier(player: Player): number`
Calculates total hunger rate multiplier based on equipped rings.

**Formula**:
```
Base rate: 1.0
For each ring:
  - REGENERATION: +0.3
  - SLOW_DIGESTION: -0.5
  - All others: +0.5
Total: max(0, base + sum(modifiers))
```

**Examples**:
```typescript
// No rings: 1.0
// 1x REGENERATION: 1.0 + 0.3 = 1.3 (30% faster hunger)
// 1x SLOW_DIGESTION: 1.0 - 0.5 = 0.5 (50% slower hunger)
// 2x SLOW_DIGESTION: 1.0 - 1.0 = 0.0 (NO HUNGER!)
// 1x REGENERATION + 1x SLOW_DIGESTION: 1.0 + 0.3 - 0.5 = 0.8
// 2x Protection: 1.0 + 0.5 + 0.5 = 2.0 (2x hunger rate)
```

**Edge Cases**:
- Two SLOW_DIGESTION rings = 0.0 hunger rate (player never gets hungry!)
- Hunger rate never goes negative (clamped to 0)

---

### Passive Ring Abilities

#### `applySearchingRing(player: Player, level: Level): SearchingRingResult`
Auto-detects hidden traps and secret doors in adjacent tiles.

**Detection Logic**:
- **Radius**: 1 tile around player (8 adjacent positions)
- **Chance**: 10% per ring per turn (20% with two SEARCHING rings)
- **Trigger**: Called every turn from TurnService

**Returns**: `SearchingRingResult`:
```typescript
{
  trapsFound: Position[]         // Newly revealed traps
  secretDoorsFound: Position[]   // Newly revealed secret doors
}
```

**Example**:
```typescript
const result = ringService.applySearchingRing(player, level)
// player has 1x SEARCHING ring
// MockRandom returns 1 (10% chance succeeds)
// Secret door at (5,4) revealed
// Returns: { trapsFound: [], secretDoorsFound: [{x:5, y:4}] }
```

**Integration**: Called from `TurnService.incrementTurn()` each turn

---

#### `canSeeInvisible(player: Player): boolean`
Checks if player has SEE_INVISIBLE ring to reveal invisible monsters.

**Returns**: `true` if player has SEE_INVISIBLE ring equipped

**Example**:
```typescript
const canSee = ringService.canSeeInvisible(player)
// Used by RenderingService to show/hide invisible Phantoms
```

**Integration**: Called from `RenderingService` when rendering monsters

---

#### `preventStrengthDrain(player: Player): boolean`
Checks if player has SUSTAIN_STRENGTH ring to block strength drain attacks.

**Returns**: `true` if player has SUSTAIN_STRENGTH ring equipped

**Example**:
```typescript
const protected = ringService.preventStrengthDrain(player)
// Used by SpecialAbilityService to block Rattlesnake drain
```

**Integration**: Called from `SpecialAbilityService.applyDrainAbility()`

---

#### `hasStealth(player: Player): boolean`
Checks if player has STEALTH ring for silent movement.

**Returns**: `true` if player has STEALTH ring equipped

**Example**:
```typescript
const stealthy = ringService.hasStealth(player)
// Prevents sleeping monsters from waking when player moves nearby
```

**Integration**: Called from `MonsterAIService` wake-up logic

**Notes**:
- Only prevents wake-up from **adjacent movement**
- Monsters in FOV still wake up (seeing player overrides stealth)

---

### Special Abilities

#### `triggerTeleportation(player: Player, level: Level): TeleportationResult`
Handles cursed TELEPORTATION ring random teleport effect.

**Trigger Chance**: 15% per turn (only if TELEPORTATION ring equipped)

**Returns**: `TeleportationResult`:
```typescript
{
  triggered: boolean         // true if teleport occurred
  newPosition?: Position     // Random walkable destination
  message?: string           // "You feel a wrenching sensation!"
}
```

**Example**:
```typescript
const result = ringService.triggerTeleportation(player, level)
// player has cursed TELEPORTATION ring
// MockRandom returns 1 (15% chance succeeds)
// Returns: {
//   triggered: true,
//   newPosition: {x: 12, y: 8},
//   message: "You feel a wrenching sensation!"
// }
```

**Teleport Logic**:
1. Find all walkable tiles on level
2. Filter out tiles with monsters
3. Pick random position from valid tiles
4. Return new position + message

**Integration**: Called from `TurnService.incrementTurn()` each turn

**Notes**:
- Ring of Teleportation is **always cursed** (verified in `ItemSpawnService:390`)
- Cannot be removed without remove curse scroll
- 15% chance is configurable (adjust based on playtesting)

---

## Hunger Modifier Details

### Base Hunger System
- Base consumption: 1 hunger point per turn
- Hunger modifiers from rings multiply this rate

### Ring Hunger Modifiers

| Ring Count | Ring Type | Modifier | Net Rate | Example |
|------------|-----------|----------|----------|---------|
| 1x | REGENERATION | +0.3 | 1.3 | 30% faster hunger |
| 1x | SLOW_DIGESTION | -0.5 | 0.5 | 50% slower hunger |
| 1x | Any other | +0.5 | 1.5 | 50% faster hunger |
| 2x | REGENERATION | +0.6 | 1.6 | 60% faster hunger |
| 2x | SLOW_DIGESTION | -1.0 | 0.0 | **No hunger!** |
| 2x | PROTECTION | +1.0 | 2.0 | 2x hunger rate |

### Strategic Combinations

**Optimal for Exploration** (minimize hunger):
- 2x SLOW_DIGESTION = 0.0 hunger rate (infinite exploration!)

**Balanced** (slight hunger penalty):
- 1x REGENERATION + 1x SLOW_DIGESTION = 0.8 (20% reduction)

**High Cost** (fast hunger):
- 2x PROTECTION = 2.0 (2x hunger rate)
- Must carry extra food rations!

---

## Integration with Other Services

### CombatService
**Uses**: `getACBonus()`, `getStrengthBonus()`, `getDexterityBonus()`

**Integration**:
```typescript
// CombatService.calculatePlayerAttack()
const strengthBonus = this.ringService.getStrengthBonus(player)
const toHit = baseToHit + strengthBonus + dexterityBonus

// CombatService.calculatePlayerAC()
const acBonus = this.ringService.getACBonus(player)
const totalAC = baseAC + armorBonus + acBonus
```

---

### HungerService
**Uses**: `calculateHungerModifier()`

**Integration**:
```typescript
// HungerService.tickHunger()
const rate = this.ringService.calculateHungerModifier(player)
const hungerLoss = Math.floor(baseRate * rate)
```

---

### RegenerationService
**Uses**: `hasRing(player, RingType.REGENERATION)`

**Integration**:
```typescript
// RegenerationService.attemptRegeneration()
const hasRing = this.ringService.hasRing(player, RingType.REGENERATION)
const healRate = hasRing ? 5 : 10  // 2x faster with ring
```

---

### MonsterAIService
**Uses**: `hasStealth()`

**Integration**:
```typescript
// MonsterAIService.wakeupCheck()
if (!this.ringService.hasStealth(player)) {
  // Wake sleeping monsters adjacent to player
}
```

---

### SpecialAbilityService
**Uses**: `preventStrengthDrain()`

**Integration**:
```typescript
// SpecialAbilityService.applyDrainAbility()
if (this.ringService.preventStrengthDrain(player)) {
  return { message: "Your ring protects you!", strengthDrained: false }
}
// Apply drain...
```

---

### TurnService
**Uses**: `triggerTeleportation()`, `applySearchingRing()`

**Integration**:
```typescript
// TurnService.incrementTurn()
// Check SEARCHING ring auto-detection
const searchResult = ringService.applySearchingRing(player, level)

// Check TELEPORTATION ring random teleport
const teleportResult = ringService.triggerTeleportation(player, level)
if (teleportResult.triggered) {
  player.position = teleportResult.newPosition
}
```

---

## Testing Patterns

### MockRandom Usage

RingService depends on RandomService for:
- SEARCHING ring detection chance (10% per ring)
- TELEPORTATION ring trigger chance (15% per turn)
- TELEPORTATION random position selection

**Example Test**:
```typescript
describe('SEARCHING ring', () => {
  test('detects trap with 10% chance', () => {
    const mockRandom = new MockRandom([1]) // chance() succeeds
    const ringService = new RingService(mockRandom)

    // Player has 1x SEARCHING ring, trap at (5,4)
    const result = ringService.applySearchingRing(player, level)

    expect(result.trapsFound).toContainEqual({x: 5, y: 4})
  })
})
```

### Bonus Stacking Tests
```typescript
test('stacks two PROTECTION rings', () => {
  player.equipment.leftRing = createRing(RingType.PROTECTION, 1)
  player.equipment.rightRing = createRing(RingType.PROTECTION, 2)

  const bonus = ringService.getRingBonus(player, RingType.PROTECTION)
  expect(bonus).toBe(3)  // +1 + +2 = 3
})
```

### Cursed Ring Tests
```typescript
test('handles cursed ring negative bonus', () => {
  player.equipment.leftRing = createRing(RingType.PROTECTION, -2)

  const acBonus = ringService.getACBonus(player)
  expect(acBonus).toBe(-2)  // Worsens AC!
})
```

---

## Architecture Notes

### Zero Dependencies Design
- RingService is a **pure query service**
- No dependencies except RandomService (for chance calculations)
- Can be injected into any service without circular dependency risk

### Immutability
- All methods return new objects (never mutate input)
- Follows functional programming principles
- Safe for concurrent calls

### Single Responsibility
- RingService **only** manages ring effects
- Does not handle:
  - Ring equipping/unequipping (InventoryService)
  - Ring identification (IdentificationService)
  - Ring spawning (ItemSpawnService)
  - Ring curse handling (CurseService)

---

## Performance Considerations

### SEARCHING Ring Optimization
- Early exit if no SEARCHING ring equipped
- Only checks 8 adjacent tiles (not entire level)
- Uses Set for O(1) position lookups
- **Impact**: Negligible (< 1ms per turn)

### TELEPORTATION Ring Optimization
- Only triggers 15% of turns (85% fast path)
- Position finding is O(n) where n = walkable tiles
- **Impact**: Minimal (only when triggered)

### Bonus Calculation
- Simple addition (no loops for most operations)
- Worst case: 2 rings = 2 additions
- **Impact**: Negligible (< 0.1ms)

---

## Common Pitfalls

### ❌ Forgetting to Inject RingService
```typescript
// Bad: CombatService calculates ring bonuses itself
class CombatService {
  private getACBonus(player: Player) {
    // Duplicated ring logic!
  }
}
```

```typescript
// Good: CombatService delegates to RingService
class CombatService {
  constructor(
    private random: IRandomService,
    private ringService: RingService  // ✅ Injected
  ) {}

  calculateAC(player: Player) {
    return baseAC + this.ringService.getACBonus(player)  // ✅ Single source of truth
  }
}
```

---

### ❌ Mutating Player Equipment
```typescript
// Bad: Mutates ring bonus
player.equipment.leftRing.bonus += 1  // ❌ Mutation!
```

```typescript
// Good: Returns new player with updated ring
return {
  ...player,
  equipment: {
    ...player.equipment,
    leftRing: { ...ring, bonus: ring.bonus + 1 }  // ✅ New object
  }
}
```

---

### ❌ Hardcoding Ring Effects
```typescript
// Bad: Hardcoded hunger modifier
const hungerRate = player.equipment.leftRing?.ringType === 'REGENERATION' ? 1.3 : 1.0
```

```typescript
// Good: Centralized logic
const hungerRate = ringService.calculateHungerModifier(player)  // ✅ Handles all rings
```

---

## Related Documentation

- [Game Design - Items (Rings Section)](../game-design/05-items.md#rings-)
- [Game Design - Hunger System](../game-design/08-hunger.md)
- [CombatService](./CombatService.md)
- [HungerService](./HungerService.md)
- [RegenerationService](./RegenerationService.md)
- [Ring Refactor Plan](../plans/ring_refactor_plan.md)

---

**Last Updated**: 2025-10-07
**Test Coverage**: 92 tests, 100% passing
**Dependencies**: RandomService (IRandomService interface)
