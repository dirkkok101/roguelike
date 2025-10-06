# StatusEffectService

**Location**: `src/services/StatusEffectService/StatusEffectService.ts`
**Dependencies**: None (standalone service)
**Test Coverage**: Duration tracking, expiration, stacking, tick system, all 5 status effects
**Status**: ✅ Complete (All potion status effects implemented)

---

## Purpose

Manages **temporary status effects** on the player with duration tracking, automatic expiration, and effect querying. Central system for duration-based potion effects (CONFUSION, BLINDNESS, HASTE_SELF) and future temporary buffs/debuffs.

---

## Public API

### Status Effect Management

#### `addStatusEffect(player: Player, type: StatusEffectType, duration: number, intensity?: number): Player`
Adds a new status effect to the player.

**Parameters**:
- `player` - Current player state
- `type` - Type of status effect (enum)
- `duration` - How many turns the effect lasts
- `intensity` - (Optional) Strength of effect (e.g., slow level 1 vs 2)

**Returns**: New player object with status effect added

**Behavior**:
- If effect already exists, replaces with new duration (takes highest)
- Adds effect to `player.statusEffects` array

**Example**:
```typescript
const player = service.addStatusEffect(basePlayer, StatusEffectType.CONFUSED, 20)
// player.statusEffects: [{ type: CONFUSED, duration: 20 }]
```

---

#### `removeStatusEffect(player: Player, type: StatusEffectType): Player`
Removes a status effect from the player.

**Returns**: New player object without the specified effect

**Example**:
```typescript
const player = service.removeStatusEffect(confusedPlayer, StatusEffectType.CONFUSED)
// player.statusEffects: [] (confused effect removed)
```

---

#### `hasStatusEffect(player: Player, type: StatusEffectType): boolean`
Checks if player currently has a specific status effect.

**Returns**: `true` if effect is active, `false` otherwise

**Example**:
```typescript
if (service.hasStatusEffect(player, StatusEffectType.BLIND)) {
  // Player cannot see
}
```

---

#### `getStatusEffect(player: Player, type: StatusEffectType): StatusEffect | undefined`
Retrieves a specific status effect with its details.

**Returns**: StatusEffect object or undefined if not found

**Example**:
```typescript
const haste = service.getStatusEffect(player, StatusEffectType.HASTED)
if (haste) {
  console.log(`Haste remaining: ${haste.duration} turns`)
}
```

---

### Duration & Tick System

#### `tickStatusEffects(player: Player): { player: Player; expired: StatusEffectType[] }`
Decrements all status effect durations by 1 turn and removes expired effects.

**Called by**: TurnService.incrementTurn() (every turn)

**Returns**:
```typescript
{
  player: Player,           // Updated player with decremented durations
  expired: StatusEffectType[] // List of effects that just expired (for messaging)
}
```

**Process**:
1. Decrement duration of all effects by 1
2. Remove effects with duration <= 0
3. Return updated player + list of expired effects

**Example**:
```typescript
const result = service.tickStatusEffects(player)
// result.player.statusEffects: [{ type: CONFUSED, duration: 19 }] (was 20)
// result.expired: [] (none expired yet)

// After 20 ticks:
// result.player.statusEffects: []
// result.expired: [StatusEffectType.CONFUSED]
```

---

## Status Effect Types

### StatusEffectType Enum

```typescript
export enum StatusEffectType {
  // Negative Effects (Debuffs)
  CONFUSED = 'CONFUSED',      // Random movement
  BLIND = 'BLIND',            // Cannot see
  SLOWED = 'SLOWED',          // Half movement speed
  PARALYZED = 'PARALYZED',    // Cannot move
  POISONED = 'POISONED',      // HP drain over time

  // Positive Effects (Buffs)
  HASTED = 'HASTED',          // Double actions per turn
  LEVITATING = 'LEVITATING',  // Float over traps
  SEE_INVISIBLE = 'SEE_INVISIBLE', // Reveal invisible monsters

  // Future Expansion
  HALLUCINATING = 'HALLUCINATING', // Monsters appear different
  BLESSED = 'BLESSED',        // Improved AC/to-hit
  CURSED = 'CURSED',          // Reduced AC/to-hit
}
```

---

### StatusEffect Interface

```typescript
export interface StatusEffect {
  type: StatusEffectType
  duration: number     // Turns remaining (0 = expired)
  intensity?: number   // Optional strength (1-3, for variable effects)
}
```

**Example**:
```typescript
const confusion: StatusEffect = {
  type: StatusEffectType.CONFUSED,
  duration: 20,
}

const poison: StatusEffect = {
  type: StatusEffectType.POISONED,
  duration: 10,
  intensity: 2, // Loses 2 HP per turn
}
```

---

## Integration with Other Services

### PotionService
**Uses**: Adds status effects when potions are consumed

```typescript
// In PotionService.applyConfusionPotion()
const duration = this.random.range(19, 21) // 19-21 turns
const player = this.statusEffectService.addStatusEffect(
  basePlayer,
  StatusEffectType.CONFUSED,
  duration
)
```

---

### TurnService
**Uses**: Ticks status effects every turn

```typescript
// In TurnService.incrementTurn()
const result = this.statusEffectService.tickStatusEffects(state.player)

// Add messages for expired effects
result.expired.forEach(effect => {
  this.messageService.addMessage(
    messages,
    `You feel less ${effect.toLowerCase()}.`,
    'info'
  )
})
```

---

### MovementService
**Uses**: Checks for CONFUSED status before movement

```typescript
// In MovementService.movePlayer()
if (this.statusEffectService.hasStatusEffect(player, StatusEffectType.CONFUSED)) {
  // Randomize movement direction
  direction = this.random.choice(['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'])
}
```

---

### FOVService
**Uses**: Checks for BLIND status to override vision

```typescript
// In FOVService.computeFOV()
if (this.statusEffectService.hasStatusEffect(player, StatusEffectType.BLIND)) {
  return new Set<string>() // Return empty FOV (no vision)
}
```

---

### TrapService
**Uses**: Checks for LEVITATING to skip trap trigger

```typescript
// In TrapService.triggerTrap()
if (this.statusEffectService.hasStatusEffect(player, StatusEffectType.LEVITATING)) {
  return {
    damage: 0,
    message: 'You float over the trap.',
  }
}
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
addStatusEffect(player: Player, type: StatusEffectType, duration: number): Player {
  const newEffect: StatusEffect = { type, duration }

  // Check if effect already exists
  const existing = player.statusEffects.find(e => e.type === type)

  if (existing) {
    // Replace with new duration (if higher)
    const updatedEffects = player.statusEffects.map(e =>
      e.type === type ? { ...e, duration: Math.max(e.duration, duration) } : e
    )
    return { ...player, statusEffects: updatedEffects }
  } else {
    // Add new effect
    return {
      ...player,
      statusEffects: [...player.statusEffects, newEffect],
    }
  }
}
```

---

## Testing

**Test Files**:
- `status-effect-management.test.ts` - Add, remove, query effects
- `status-effect-tick.test.ts` - Duration decrement, expiration
- `status-effect-stacking.test.ts` - Multiple effects, duration replacement

**Example Test**:
```typescript
describe('StatusEffectService - Tick System', () => {
  test('decrements duration by 1 each tick', () => {
    const player = { ...basePlayer, statusEffects: [
      { type: StatusEffectType.CONFUSED, duration: 5 },
    ]}

    const result = service.tickStatusEffects(player)

    expect(result.player.statusEffects[0].duration).toBe(4)
    expect(result.expired).toEqual([])
  })

  test('removes effect when duration reaches 0', () => {
    const player = { ...basePlayer, statusEffects: [
      { type: StatusEffectType.CONFUSED, duration: 1 },
    ]}

    const result = service.tickStatusEffects(player)

    expect(result.player.statusEffects).toHaveLength(0)
    expect(result.expired).toEqual([StatusEffectType.CONFUSED])
  })

  test('handles multiple effects expiring simultaneously', () => {
    const player = { ...basePlayer, statusEffects: [
      { type: StatusEffectType.CONFUSED, duration: 1 },
      { type: StatusEffectType.HASTED, duration: 1 },
      { type: StatusEffectType.BLIND, duration: 5 },
    ]}

    const result = service.tickStatusEffects(player)

    expect(result.player.statusEffects).toHaveLength(1)
    expect(result.player.statusEffects[0].type).toBe(StatusEffectType.BLIND)
    expect(result.expired).toEqual([StatusEffectType.CONFUSED, StatusEffectType.HASTED])
  })
})
```

---

## Status Effect Summary Table

| Effect | Type | Duration | Source | Game Impact |
|--------|------|----------|--------|-------------|
| **CONFUSED** | Debuff | 19-21 turns | Potion of Confusion | Random movement direction |
| **BLIND** | Debuff | 40-60 turns | Potion of Blindness | FOV = empty, screen dark |
| **HASTED** | Buff | 4-8 turns | Potion of Haste Self | 2 actions per turn |
| **LEVITATING** | Buff | 29-32 turns | Potion of Levitation | Immune to traps |
| **SEE_INVISIBLE** | Buff | Until level change | Potion of See Invisible | Reveal invisible monsters |
| **SLOWED** | Debuff | Variable | Monster ability | Half movement speed |
| **PARALYZED** | Debuff | Variable | Potion/Trap | Cannot move |
| **POISONED** | Debuff | Variable | Trap/Monster | HP drain over time |

---

## Design Rationale

### Why Centralized Status Effect Service?

**Single Responsibility** - One service manages all temporary effects, not scattered across services.

**Consistent Duration Logic** - All effects use same tick/expiration system.

**Easy Expansion** - New status effects added by extending enum, no service changes.

---

### Why Duration in Turns?

**Original Rogue** - All effects measured in turns (19-21 turns confusion).

**Predictable** - Player can estimate when effects expire.

**Turn-Based** - Aligns with game's turn structure.

---

### Why Return Expired List?

**Messaging** - UI can show "You feel less confused" when effect expires.

**Event System** - Future event listeners can react to expiration.

**Debugging** - Easy to track effect lifecycle.

---

## Related Services

- **PotionService** - Applies status effects from potions
- **TurnService** - Ticks status effects every turn
- **MovementService** - Checks CONFUSED status
- **FOVService** - Checks BLIND status
- **TrapService** - Checks LEVITATING status
- **MessageService** - Displays status messages
- **RenderingService** - Visual indicators for active effects

---

## Future Enhancements

**Stacking Rules**:
- Some effects stack (multiple poison sources)
- Others don't (only one haste at a time)

**Intensity Levels**:
- POISONED level 1 = -1 HP/turn
- POISONED level 2 = -2 HP/turn

**Resistance**:
- Items/rings provide immunity to specific effects
- Example: Ring of Free Action prevents PARALYZED

**Aura Effects**:
- Ring-based permanent effects (SEE_INVISIBLE while worn)
- Auto-removed when ring unequipped

---

**Last Updated**: 2025-10-06
**Status**: ✅ Complete - All 5 status effects implemented (CONFUSED, BLINDED, HASTED, LEVITATING, SEE_INVISIBLE)
