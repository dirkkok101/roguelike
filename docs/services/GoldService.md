# GoldService

**Package**: `@services/GoldService`
**Responsibility**: Gold calculation, pickup, drop, and leprechaun theft mechanics
**Dependencies**: `RandomService`

---

## Overview

GoldService implements authentic **Rogue 1980** gold formulas and mechanics. It handles:
- Gold amount calculation (GOLDCALC formula)
- Player gold pickup (immutable updates)
- Gold pile creation
- Leprechaun stealing mechanics (with saving throws)
- Leprechaun death gold drops

All methods are **pure functions** that maintain immutability.

---

## Key Formulas

### GOLDCALC (Original Rogue 1980)

```
GOLDCALC = random(50 + 10 * depth) + 2
```

**Examples**:
- **Level 1**: 2-62 gold per pile
- **Level 5**: 2-102 gold per pile
- **Level 10**: 2-152 gold per pile

### Saving Throw

```
Success: (player.level + player.strength) / 2 >= 10
```

### Leprechaun Steal Formula

```
- Successful save: steal min(player.gold, 1x GOLDCALC)
- Failed save: steal min(player.gold, 5x GOLDCALC)
```

### Leprechaun Drop Formula (Inverted)

```
- Successful save: drop 5x GOLDCALC
- Failed save: drop 1x GOLDCALC
```

---

## API Reference

### `calculateGoldAmount(depth: number): number`

Calculate gold pile amount using Rogue 1980 formula.

**Parameters**:
- `depth` - Dungeon level (1-10)

**Returns**: Gold amount (2 to 51 + 10 * depth)

**Example**:
```typescript
const amount = goldService.calculateGoldAmount(5)
// Returns 2-102 gold
```

---

### `pickupGold(player: Player, amount: number): Player`

Add gold to player (immutable).

**Parameters**:
- `player` - Current player state
- `amount` - Gold to add

**Returns**: New Player with updated gold

**Example**:
```typescript
const updatedPlayer = goldService.pickupGold(player, 50)
// player.gold = 100 → updatedPlayer.gold = 150
```

**Immutability**: Returns new player object, original unchanged.

---

### `dropGold(position: Position, amount: number): GoldPile`

Create a gold pile at a position.

**Parameters**:
- `position` - Position for gold pile
- `amount` - Gold amount

**Returns**: New GoldPile object

**Example**:
```typescript
const goldPile = goldService.dropGold({ x: 10, y: 15 }, 100)
// { position: { x: 10, y: 15 }, amount: 100 }
```

---

### `calculateLeprechaunSteal(playerGold, playerLevel, playerStrength, depth): number`

Calculate how much gold a leprechaun steals.

**Parameters**:
- `playerGold` - Current player gold
- `playerLevel` - Player level (for saving throw)
- `playerStrength` - Player strength (for saving throw)
- `depth` - Current dungeon depth

**Returns**: Amount stolen (0 to player.gold)

**Example**:
```typescript
// Low-level player (fails save)
const stolen = goldService.calculateLeprechaunSteal(500, 1, 10, 5)
// Returns 5x GOLDCALC (capped at 500)

// High-level player (makes save)
const stolen = goldService.calculateLeprechaunSteal(500, 10, 18, 5)
// Returns 1x GOLDCALC
```

**Saving Throw**:
- Success: `(level + strength) / 2 >= 10` → steal 1x GOLDCALC
- Failure: `(level + strength) / 2 < 10` → steal 5x GOLDCALC

---

### `calculateLeprechaunDrop(playerLevel, playerStrength, depth): number`

Calculate how much gold a leprechaun drops when killed.

**Parameters**:
- `playerLevel` - Player level (for saving throw)
- `playerStrength` - Player strength (for saving throw)
- `depth` - Current dungeon depth

**Returns**: Amount dropped

**Example**:
```typescript
// High-level player (makes save)
const dropped = goldService.calculateLeprechaunDrop(10, 18, 5)
// Returns 5x GOLDCALC

// Low-level player (fails save)
const dropped = goldService.calculateLeprechaunDrop(1, 10, 5)
// Returns 1x GOLDCALC
```

**Note**: Drop formula is **inverted** from steal formula:
- Successful save → drop 5x (reward for killing tough enemy)
- Failed save → drop 1x

---

## Integration Points

### DungeonService
- Calls `calculateGoldAmount()` during level generation
- Generates 3-9 gold piles per level
- Uses `dropGold()` to create GoldPile objects

### MoveCommand
- Calls `pickupGold()` when player walks over gold
- Automatic pickup (no manual action)
- No turn cost (instant)

### MonsterTurnService
- Calls `calculateLeprechaunSteal()` for leprechaun theft
- Updates player gold immutably
- Leprechaun transitions to FLEEING state after stealing

### CombatService
- Calls `calculateLeprechaunDrop()` when leprechaun dies
- Returns `droppedGold` in AttackResult
- MoveCommand creates gold pile at death position

---

## Testing

**Test Files**:
- `gold-calculation.test.ts` - GOLDCALC formula verification
- `gold-pickup.test.ts` - Pickup logic and immutability
- `gold-drop.test.ts` - Gold pile creation
- `leprechaun-formulas.test.ts` - Steal/drop calculations with saving throws

**Coverage**: >95% (pure calculation logic)

**Test Strategy**: Use `MockRandom` for deterministic tests

---

## Design Principles

1. **Pure Functions**: All methods are stateless and side-effect free
2. **Immutability**: `pickupGold()` returns new Player object
3. **Authentic Mechanics**: Matches original Rogue 1980 formulas exactly
4. **Dependency Injection**: Receives `IRandomService` via constructor
5. **Single Responsibility**: Only gold-related logic (no combat, no movement)

---

## Example Usage

```typescript
import { GoldService } from '@services/GoldService'
import { SeededRandom } from '@services/RandomService'

const random = new SeededRandom('seed123')
const goldService = new GoldService(random)

// Generate gold for level 5
const amount = goldService.calculateGoldAmount(5)
console.log(amount) // 2-102 gold

// Player picks up gold
let player = { ...basePlayer, gold: 100 }
player = goldService.pickupGold(player, amount)
console.log(player.gold) // 100 + amount

// Leprechaun steals gold
const stolen = goldService.calculateLeprechaunSteal(
  player.gold,
  player.level,
  player.strength,
  5
)
player = { ...player, gold: player.gold - stolen }

// Leprechaun dies, drops gold
const dropped = goldService.calculateLeprechaunDrop(
  player.level,
  player.strength,
  5
)
const goldPile = goldService.dropGold({ x: 10, y: 10 }, dropped)
```

---

## Architecture Notes

**Why a separate GoldService?**
- Centralizes all gold logic (DRY principle)
- Easy to test in isolation
- Authentic Rogue formulas well-documented
- Can be enhanced later (e.g., gold-based shops)

**Why immutability?**
- Prevents accidental state mutations
- Enables time-travel debugging
- Matches project architecture (all services immutable)

**Why GOLDCALC formula?**
- Authentic to original Rogue 1980
- Provides level-appropriate rewards
- Simple, predictable scaling

---

**Related Documentation**:
- [Architecture - Service Layer](../architecture.md#service-layer)
- [Gold System Plan](../plans/gold_system_plan.md)
- [DungeonService](./DungeonService.md) - Uses GoldService for spawning
- [MonsterTurnService](./MonsterTurnService.md) - Uses for leprechaun theft

---

**Last Updated**: 2025-10-06
**Status**: ✅ Implemented (Phase 1.1)
