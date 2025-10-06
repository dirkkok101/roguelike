# RegenerationService

**Location**: `src/services/RegenerationService/RegenerationService.ts`
**Dependencies**: None (stateless logic service)
**Test Coverage**: Natural regeneration, ring mechanics, combat blocking, hunger gating, integration tests

---

## Purpose

Manages natural health regeneration with turn-based healing, Ring of Regeneration mechanics, combat blocking, and hunger gating. Enables tactical "hit-and-run" gameplay inspired by original Rogue (1980).

---

## Public API

### Core Regeneration

#### `tickRegeneration(player: Player, inCombat: boolean): RegenerationTickResult`
Processes one turn of regeneration (call each turn during movement).

**Parameters**:
- `player`: Current player state
- `inCombat`: Whether enemy is visible in FOV (blocks regeneration)

**Returns**:
```typescript
interface RegenerationTickResult {
  player: Player  // Updated HP (if healed)
  messages: Array<{ text: string; type: 'info' | 'success' }>  // Healing notifications
  healed: boolean  // Whether healing occurred this turn
}
```

**Healing Conditions** (all must be true):
- `!inCombat` - No enemy in FOV
- `player.hunger > HUNGER_THRESHOLD` (100)
- `player.hp < player.maxHp` - Not at full health
- Counter reached threshold (10 or 5 turns)

**Example**:
```typescript
const inCombat = level.monsters.some(m => visibleCells.has(`${m.position.x},${m.position.y}`))
const result = regenerationService.tickRegeneration(player, inCombat)

if (result.healed) {
  console.log('Healed 1 HP!')
}
```

---

### Ring Detection

#### `hasRegenerationRing(player: Player): boolean`
Checks if player has Ring of Regeneration equipped (either hand).

**Returns**: `true` if ring equipped in leftRing OR rightRing

**Example**:
```typescript
const hasRing = service.hasRegenerationRing(player)
const turnsToHeal = hasRing ? 5 : 10
```

---

## Configuration

```typescript
export const REGEN_CONFIG = {
  BASE_TURNS: 10,        // Turns between heals (normal)
  RING_TURNS: 5,         // Turns between heals (with ring)
  HUNGER_THRESHOLD: 100, // Minimum hunger required
} as const
```

---

## Mechanics

### Turn Counter System

**Internal State**:
- Map<string, number> tracks counter per player
- Key: `${position.x},${position.y},${maxHp}` (unique per player + state)
- Counter increments each turn, resets to 0 after healing

**Why External Tracking**:
- Player object remains immutable (no counter property)
- Supports future multiplayer (separate counters per player)
- Resets if maxHP changes (potion overheal)

---

### Regeneration Formula

```typescript
// 1. Determine required turns
requiredTurns = hasRegenerationRing(player) ? RING_TURNS : BASE_TURNS

// 2. Check healing conditions
canRegenerate = !inCombat &&
                player.hunger > HUNGER_THRESHOLD &&
                player.hp < player.maxHp

// 3. Increment counter
counter = counter + 1

// 4. Heal if threshold reached
if (canRegenerate && counter >= requiredTurns) {
  player.hp = min(player.hp + 1, player.maxHp)
  counter = 0
  return { player, messages: ['You feel better! (+1 HP)'], healed: true }
}
```

---

### Combat Blocking

**Trigger**: Any monster visible in FOV (passed as `inCombat` parameter)

**Behavior**:
- Counter continues to increment (time still passes)
- Healing does NOT occur
- Encourages tactical retreat

**Strategic Impact**:
- Players must break line of sight to heal
- Creates "hit-and-run" combat tactics
- Prevents infinite stalling in combat

**Example**:
```typescript
// Monster in FOV - no healing but counter increments
turn 1-10: counter = 1-10, no heal (monster visible)

// Monster defeated/fled - healing resumes
turn 11: counter = 11 → HEAL (counter resets to 0)
turn 12-20: counter = 1-9
turn 21: counter = 10 → HEAL
```

---

### Hunger Gating

**Threshold**: `hunger > 100` required to regenerate

**Rationale**:
- Body needs food reserves to heal
- Prevents infinite healing via starvation
- Creates resource tradeoff (food vs healing)

**States**:
| Hunger | Can Regenerate? | Effect |
|--------|-----------------|--------|
| 301+ (NORMAL) | ✅ Yes | Full regen |
| 151-300 (HUNGRY) | ✅ Yes | Full regen |
| 101-150 (WEAK) | ✅ Yes | Full regen |
| 1-100 (WEAK) | ❌ No | Too weak to heal |
| 0 (STARVING) | ❌ No | Taking damage |

---

### Ring of Regeneration

**Effect**: Doubles regeneration rate (5 turns instead of 10)

**Hunger Cost**: +30% hunger consumption (handled by HungerService)
- Base rate: 1.0 hunger/turn
- With ring: 1.3 hunger/turn
- Formula: `rate = 1.0 + (ringModifier = 0.3)`

**Synergy**: Ring of Slow Digestion (-0.5 rate)
- Regen + Slow Digestion = 0.8 hunger/turn (net -20% cost)
- Balances doubled healing with reduced hunger drain

**Trade-off Analysis**:
```
Without Ring:
- Heal rate: 1 HP / 10 turns = 6 HP / minute
- Hunger cost: 1.0 / turn

With Ring:
- Heal rate: 1 HP / 5 turns = 12 HP / minute (2x faster)
- Hunger cost: 1.3 / turn (+30%)

With Ring + Slow Digestion:
- Heal rate: 1 HP / 5 turns = 12 HP / minute (2x faster)
- Hunger cost: 0.8 / turn (-20% vs base)
- BEST COMBO for long-term survival
```

---

## Integration

### MoveCommand

**When Called**: Every movement turn (after hunger tick, before fuel tick)

```typescript
// MoveCommand.execute() flow
1. Calculate new position
2. Update player position
3. Tick hunger
4. Tick regeneration ← CALLED HERE
   - Check combat status (monsters in FOV)
   - Tick regen counter
   - Heal if conditions met
5. Tick light fuel
6. Update FOV
7. Increment turn
```

---

### RestCommand

**Purpose**: Rest until HP full or interrupted

**Uses**: `RegenerationService.tickRegeneration()` in loop

**Rest Loop**:
```typescript
while (hp < maxHp && !interrupted) {
  // 1. Tick hunger (check death)
  // 2. Tick regeneration ← CALLED HERE
  const inCombat = monsters.some(m => visibleCells.has(m.position))
  const regenResult = regenerationService.tickRegeneration(player, inCombat)

  // 3. Tick light fuel
  // 4. Update FOV
  // 5. Check interruptions
  if (enemyInFOV) interrupted = true
  if (hunger <= 0) interrupted = true
  // 6. Safety limit (1000 turns max)
}
```

**Interruptions**:
- Enemy appears in FOV
- Hunger reaches 0
- Starvation death
- Safety limit (1000 turns)

---

## Testing

### Unit Tests (46 tests across 4 files)

**natural-regen.test.ts**:
- Base 10-turn regeneration cycle
- Hunger gating (blocks at ≤100)
- Max HP cap (stops at maxHp)
- Counter persistence across turns
- Immutability verification

**ring-regen.test.ts**:
- Ring detection (left/right hand)
- Rate doubling (5 turns with ring)
- Multiple rings (doesn't stack beyond 2x)
- Ring removal mid-cycle

**combat-blocking.test.ts**:
- Enemy in FOV blocks healing
- Counter continues incrementing during combat
- Healing resumes after combat ends
- Hit-and-run tactics work correctly

**ring-hunger-penalty.test.ts** (HungerService tests):
- Ring adds +0.3 hunger rate
- Slow Digestion + Regen = 0.8 rate
- 100-turn depletion accuracy

---

### Integration Tests (8 tests)

**regeneration-integration.test.ts**:
- Full combat → retreat → heal cycles
- Hunger depletion blocking regeneration
- Ring doubles rate in real gameplay
- Rest command with monster interruptions
- Turn count accuracy across systems

---

## Design Rationale

**Turn-Based Formula**:
- Predictable: 1 HP / 10 turns = 6 HP / minute
- Players can plan tactical retreats
- Matches original Rogue (1980) behavior

**Combat Blocking**:
- Prevents exploit (infinite healing during combat)
- Forces tactical positioning (break line of sight)
- Creates "hit-and-run" gameplay style

**Hunger Gate**:
- Resource tradeoff: food vs healing
- Prevents infinite loop (starve to heal)
- Strategic depth: manage food vs HP

**Ring Tradeoff**:
- 2x healing vs +30% hunger cost
- Balances power with resource pressure
- Synergizes with Slow Digestion

**Immutability**:
- Counter tracked externally (not in Player object)
- Enables time-travel debugging
- Supports undo/redo systems

---

## Related Services

- **HungerService**: Provides hunger threshold check, ring hunger modifier
- **FOVService**: Provides visibleCells for combat detection
- **LightingService**: Fuel depletes during rest
- **TurnService**: Turn counting for regen cycles

---

## See Also

- **Game Design**: [Character - Health Regeneration](../game-design/02-character.md#3-health-regeneration)
- **Core Systems**: [RegenerationService](../systems-core.md#6-regenerationservice)
- **Implementation Plan**: [regeneration_plan.md](../regeneration_plan.md)
- **Commands**: [RestCommand](../commands/README.md#restcommand)

---

## Version History

- **v1.0** (2025-10-06): Initial implementation
  - Natural regeneration (1 HP / 10 turns)
  - Ring of Regeneration (2x rate, +30% hunger)
  - Combat blocking via FOV
  - Hunger gating (>100 threshold)
  - Rest command integration
  - Comprehensive test suite (54 tests total)
