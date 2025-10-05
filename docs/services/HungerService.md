# HungerService

**Location**: `src/services/HungerService/HungerService.ts`
**Dependencies**: RandomService
**Test Coverage**: Hunger states, depletion, food consumption, combat penalties

---

## Purpose

Manages hunger mechanics, starvation, food consumption, and hunger-based combat penalties. Essential survival system.

---

## Public API

### Hunger Tracking

#### `tickHunger(player: Player): HungerTickResult`
Depletes hunger by calculated rate (call each turn during movement).

**Returns**:
```typescript
interface HungerTickResult {
  player: Player  // Updated hunger
  messages: Message[]  // Warnings
  death?: { cause: string }  // If starved
}
```

**Depletion Rate**:
- **Base**: -1 per turn
- **Ring Modifier**: Most rings +0.5, Slow Digestion -0.5
- **Formula**: `rate = 1.0 + (ringCount * 0.5) - (slowDigestionCount * 1.0)`

**Example**:
```typescript
// Player with 2 rings (no Slow Digestion)
const result = service.tickHunger(player)
// Depletion: -2 per turn (1.0 + 0.5 + 0.5)
```

---

#### `consumeFood(player: Player, explicitNutrition?: number): FoodConsumptionResult`
Feeds player with food ration.

**Nutrition**:
- **Standard**: Random 1100-1499 units
- **Explicit**: Custom value (for special foods)
- **Cap**: 2000 max hunger

**Returns**:
```typescript
interface FoodConsumptionResult {
  player: Player
  messages: Message[]
  improved: boolean  // Did hunger state improve?
}
```

---

### Hunger States

#### `getHungerState(foodUnits: number): HungerState`
Determines hunger state from food units.

**States**:
```typescript
enum HungerState {
  NORMAL = 'NORMAL',      // 301+ food units
  HUNGRY = 'HUNGRY',      // 151-300
  WEAK = 'WEAK',          // 1-150
  STARVING = 'STARVING'   // 0
}
```

---

#### `applyHungerEffects(player: Player): { toHitPenalty: number; damagePenalty: number }`
Calculates combat penalties from hunger.

**Penalties**:
| State | To-Hit | Damage |
|-------|--------|--------|
| NORMAL | 0 | 0 |
| HUNGRY | 0 | 0 |
| WEAK | -1 | -1 |
| STARVING | -1 | -1 |

---

### Starvation

#### `applyStarvationDamage(player: Player): Player`
Damages player from starvation (call automatically in `tickHunger`).

**Damage**: -1 HP per turn at 0 hunger
**Death**: HP reaches 0 → game over

---

## Hunger Mechanics

### Depletion Rates

**Base Rate**: -1 food unit per turn

**Ring Effects**:
```typescript
calculateHungerRate(rings: Ring[]): number {
  let rate = 1.0  // Base

  rings.forEach(ring => {
    if (ring.type === SLOW_DIGESTION) {
      rate -= 0.5  // Reduces hunger
    } else {
      rate += 0.5  // Most rings increase hunger
    }
  })

  return Math.max(0, rate)
}
```

**Examples**:
- No rings: -1/turn
- 1 normal ring: -1.5/turn
- 2 normal rings: -2/turn
- 1 Slow Digestion ring: -0.5/turn
- 1 Slow Digestion + 1 normal: 0/turn (no hunger!)

---

### Food Consumption

**Nutrition Values**:
- Standard ration: 1100-1499 (random)
- Max capacity: 2000 units
- Overeating: Capped at 2000 (no waste shown)

**Messages**:
- Base: "You eat the food ration."
- Yuck: "Yuck, that food tasted awful!" (30% chance)
- Improvement: State-specific (e.g., "You feel satisfied.")

---

### Hunger Warnings

Generated when state worsens:

| Transition | Warning | Type |
|------------|---------|------|
| NORMAL → HUNGRY | "You are getting hungry" | warning |
| HUNGRY → WEAK | "You are weak from hunger!" | warning |
| WEAK → STARVING | "You are fainting!" | critical |

**No warnings** when improving (only positive messages).

---

## Combat Integration

CombatService calls `applyHungerEffects()`:

```typescript
// In CombatService.playerAttack()
const penalties = hungerService.applyHungerEffects(player)
toHit += penalties.toHitPenalty  // -1 if WEAK/STARVING
damage += penalties.damagePenalty  // -1 if WEAK/STARVING
```

---

## Usage in Commands

### MoveCommand (Hunger Tick)
```typescript
// Tick hunger during movement
const hungerResult = this.hungerService.tickHunger(player)
player = hungerResult.player

// Check for death
if (hungerResult.death) {
  return {
    ...state,
    isGameOver: true,
    deathCause: hungerResult.death.cause
  }
}

// Add warnings
hungerResult.messages.forEach(msg => {
  messages = this.messageService.addMessage(messages, msg.text, msg.type, turnCount)
})
```

### EatCommand
```typescript
// Consume food
const result = this.hungerService.consumeFood(player)

// Add messages
result.messages.forEach(msg => {
  messages = this.messageService.addMessage(messages, msg.text, msg.type, turnCount)
})
```

---

## Testing

**Test Files**:
- `hunger-states.test.ts` - State transitions
- `hunger-depletion.test.ts` - Depletion rates
- `hunger-effects.test.ts` - Combat penalties

**Example Test**:
```typescript
describe('HungerService - Starvation', () => {
  test('player dies at 0 hunger', () => {
    const player = { ...basePlayer, hunger: 1, hp: 1 }
    const result = service.tickHunger(player)

    expect(result.player.hp).toBe(0)
    expect(result.death).toBeDefined()
    expect(result.death.cause).toBe('Died of starvation')
  })
})
```

---

## Related Services

- **CombatService** - Applies hunger combat penalties
- **InventoryService** - Manages food items
- **MessageService** - Displays hunger warnings
