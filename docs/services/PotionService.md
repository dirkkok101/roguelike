# PotionService

**Location**: `src/services/PotionService/PotionService.ts`
**Dependencies**: RandomService, IdentificationService
**Test Coverage**: All 5 potion types, healing caps, death handling

---

## Purpose

Implements **all potion effects**: healing, strength manipulation, and poison. Handles identification-by-use and result messaging.

---

## Public API

### Potion Application

#### `applyPotion(player: Player, potion: Potion, state: GameState): PotionEffectResult`
Applies potion effect and returns complete result.

**Returns**:
```typescript
interface PotionEffectResult {
  player: Player      // Updated player after effect
  message: string     // Effect description
  identified: boolean // Was potion unidentified before use?
  death?: boolean     // Did potion kill player?
}
```

**Process**:
1. Check if potion is already identified
2. Apply effect based on potion type
3. Auto-identify potion by use
4. Return result with message

**Example**:
```typescript
const result = service.applyPotion(player, healPotion, state)
// result.player.hp: 15 → 23 (+8 HP)
// result.message: "You feel better. (+8 HP)"
// result.identified: true (was unidentified)
```

---

## Potion Types

### HEAL - Restore HP

```typescript
private applyHealPotion(player: Player, potion: Potion): { player: Player; healAmount: number }
```

**Power**: `1d8` (1-8 HP)

**Effect**: Restores HP, capped at `maxHp`

**Message**: `"You feel better. (+X HP)"`

**Example**:
```typescript
// Player: HP 10/20, Potion rolls 8
// Result: HP 18/20 (actual heal: 8)

// Player: HP 18/20, Potion rolls 8
// Result: HP 20/20 (actual heal: 2, capped at max)
```

---

### EXTRA_HEAL - Restore More HP

```typescript
private applyExtraHealPotion(player: Player, potion: Potion): { player: Player; healAmount: number }
```

**Power**: `3d8` (3-24 HP)

**Effect**: Restores large amount of HP, capped at `maxHp`

**Message**: `"You feel much better! (+X HP)"`

**Use Case**: Emergency healing, boss fights

---

### GAIN_STRENGTH - Permanent Strength Boost

```typescript
private applyGainStrength(player: Player): Player
```

**Effect**:
- `player.strength += 1`
- `player.maxStrength += 1`

**Permanent**: Does not wear off

**Message**: `"You feel stronger! (Strength: X)"`

**Example**:
```typescript
// Before: strength 16, maxStrength 16
// After: strength 17, maxStrength 17
```

---

### RESTORE_STRENGTH - Restore Drained Strength

```typescript
private applyRestoreStrength(player: Player): Player
```

**Effect**: `player.strength = player.maxStrength`

**Use Case**: Counter Rattlesnake drain attacks

**Message**: `"Your strength is restored. (Strength: X)"`

**Example**:
```typescript
// Before: strength 14, maxStrength 16 (drained by Rattlesnake)
// After: strength 16, maxStrength 16
```

---

### POISON - Damage Player

```typescript
private applyPoison(player: Player, potion: Potion): { player: Player; damage: number }
```

**Power**: `1d6` (1-6 damage)

**Effect**: Deals damage, can kill player

**Message**: `"You feel sick! (-X HP)"`

**Death Check**: `result.death = true` if `hp <= 0`

**Example**:
```typescript
// Player: HP 3/20, Potion rolls 5
// Result: HP 0/20, death = true
```

---

## Identification System

### Auto-Identify on Use

**Process**:
```typescript
const identified = !this.identificationService.isIdentified(potion, state)
const displayName = this.identificationService.getDisplayName(potion, state)

// Apply effect...

return { player: updatedPlayer, message, identified, death }
```

**Unidentified Potion**:
- Before use: `"blue potion"` (random descriptor)
- After use: `"Potion of Healing"` (real name)

**Already Identified**:
- `identified = false` (was already known)

See [IdentificationService](./IdentificationService.md) for details.

---

## Result Type

```typescript
interface PotionEffectResult {
  player: Player      // Updated player (HP, strength, etc.)
  message: string     // User-friendly message
  identified: boolean // Was potion unidentified before use?
  death?: boolean     // Did potion kill player? (POISON only)
}
```

**Death Handling**: Only POISON sets `death = true`

---

## Usage in Commands

### QuaffCommand

```typescript
execute(state: GameState): GameState {
  const potion = findPotionInInventory(player, itemId)

  // Apply potion effect
  const result = this.potionService.applyPotion(player, potion, state)

  // Handle death
  if (result.death) {
    return {
      ...state,
      player: result.player,
      isGameOver: true,
      deathCause: 'Killed by poison',
      messages: this.messageService.addMessage(state.messages, result.message, 'danger'),
    }
  }

  // Update identification
  let updatedState = state
  if (result.identified) {
    updatedState = this.identificationService.identifyByUse(potion, state)
  }

  // Remove potion from inventory
  const updatedPlayer = this.inventoryService.removeItem(result.player, potion.id)

  return {
    ...updatedState,
    player: updatedPlayer,
    messages: this.messageService.addMessage(updatedState.messages, result.message, 'info'),
  }
}
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
private applyHealPotion(player: Player, potion: Potion) {
  const newHp = Math.min(player.hp + healAmount, player.maxHp)

  return {
    player: { ...player, hp: newHp },  // New player object
    healAmount: actualHeal,
  }
}
```

---

## Testing

**Test Files**:
- `heal-potion.test.ts` - HEAL and EXTRA_HEAL effects
- `strength-potion.test.ts` - GAIN_STRENGTH and RESTORE_STRENGTH
- `poison-potion.test.ts` - Damage and death handling
- `identification.test.ts` - Auto-identify on use

**Example Test**:
```typescript
describe('PotionService - Healing', () => {
  test('HEAL potion restores HP', () => {
    const player = { ...basePlayer, hp: 10, maxHp: 20 }
    const potion = createPotion(PotionType.HEAL, '1d8')
    mockRandom.setRoll(8)

    const result = service.applyPotion(player, potion, state)

    expect(result.player.hp).toBe(18)
    expect(result.message).toBe('You feel better. (+8 HP)')
    expect(result.death).toBeUndefined()
  })

  test('healing capped at maxHp', () => {
    const player = { ...basePlayer, hp: 18, maxHp: 20 }
    const potion = createPotion(PotionType.HEAL, '1d8')
    mockRandom.setRoll(8)

    const result = service.applyPotion(player, potion, state)

    expect(result.player.hp).toBe(20)  // Capped at max
    expect(result.message).toBe('You feel better. (+2 HP)')  // Actual heal
  })
})

describe('PotionService - Poison', () => {
  test('POISON kills player if HP drops to 0', () => {
    const player = { ...basePlayer, hp: 3 }
    const potion = createPotion(PotionType.POISON, '1d6')
    mockRandom.setRoll(5)

    const result = service.applyPotion(player, potion, state)

    expect(result.player.hp).toBe(0)
    expect(result.death).toBe(true)
    expect(result.message).toBe('You feel sick! (-5 HP)')
  })
})
```

---

## Related Services

- **IdentificationService** - Handles item name display and auto-identification
- **InventoryService** - Removes consumed potion from inventory
- **MessageService** - Displays potion effect messages
- **RandomService** - Rolls healing/damage amounts

---

## Design Rationale

### Why Auto-Identify on Use?

**Original Rogue** - Drinking a potion reveals its type.

**Learning Curve** - Player learns potion colors through experimentation.

**Risk/Reward** - Must decide whether to drink unknown potion (could be poison or heal).

---

### Why Heal Caps at MaxHP?

**Balance** - Prevents HP hoarding at max.

**Waste Feedback** - Player learns not to use heal potions at full health.

**Actual Heal Display** - Message shows how much HP was actually restored.

---

### Why Permanent Strength Gain?

**Character Progression** - Strength potions provide permanent power boost.

**Rarity Balance** - GAIN_STRENGTH is uncommon, so permanent bonus is justified.

**Original Rogue** - Had permanent stat boosts from potions.

---

## Potion Summary Table

| Potion Type | Power | Effect | Permanent? | Can Kill? |
|-------------|-------|--------|------------|-----------|
| **HEAL** | 1d8 | +HP | No | No |
| **EXTRA_HEAL** | 3d8 | +HP (large) | No | No |
| **GAIN_STRENGTH** | N/A | +1 STR, +1 Max STR | Yes | No |
| **RESTORE_STRENGTH** | N/A | STR = Max STR | No | No |
| **POISON** | 1d6 | -HP | No | Yes |

---

## Future Enhancements (Not Yet Implemented)

**Additional Potion Types**:
- **HASTE_SELF** - Double movement speed (3-10 turns)
- **RAISE_LEVEL** - Instant level up
- **RESTORE_HP** - Full HP restoration
- **SEE_INVISIBLE** - Detect invisible monsters
- **LEVITATION** - Float over traps/water
- **BLINDNESS** - Cannot see (curse)
- **CONFUSION** - Random movement (curse)

**Status Effect System**: Required for HASTE, LEVITATION, BLINDNESS effects (Phase 3).
