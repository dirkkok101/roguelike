# PotionService

**Location**: `src/services/PotionService/PotionService.ts`
**Dependencies**: RandomService, IdentificationService, StatusEffectService, LevelingService, FOVService
**Test Coverage**: All 11 potion types, status effects, detection, healing caps, death handling

---

## Purpose

Implements **all 11 potion types from Original Rogue (1980)**: healing, strength manipulation, poison, level progression, detection, and status effects. Handles identification-by-use, status effect application, and result messaging.

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

---

### RAISE_LEVEL - Instant Level Up

```typescript
private applyRaiseLevelPotion(player: Player): Player
```

**Effect**: Instant level up using LevelingService

**Message**: `"You feel more experienced! (Level: X)"`

**Benefits**:
- +1 Level
- +HP (1d10, capped at maxHp + 10)
- +Max HP (1d10)

**Example**:
```typescript
// Before: Level 3, HP 18/30, XP 800
// After: Level 4, HP 23/37, XP 800 (level granted without XP)
```

---

### DETECT_MONSTERS - Reveal All Monsters

```typescript
private applyDetectMonstersPotion(state: GameState): { monsters: Monster[]; count: number }
```

**Effect**: Temporarily adds all monsters on current level to `visibleCells`

**Duration**: Until next movement or FOV recalculation

**Message**: `"You sense the presence of X monsters!"`

**Example**:
```typescript
// Before: Player can see 2 nearby monsters
// After: All 8 monsters on level briefly visible (1 turn)
```

---

### DETECT_MAGIC - Highlight Magic Items

```typescript
private applyDetectMagicPotion(state: GameState): { items: Item[]; count: number }
```

**Effect**: Highlights magic items (scrolls, wands, rings, magic weapons/armor) on current level

**Duration**: Permanent highlight until items are picked up

**Message**: `"You sense the presence of X magic items!"`

**Items Detected**:
- Scrolls
- Wands
- Rings
- Enchanted weapons (+X bonus)
- Enchanted armor (+X bonus)

---

### CONFUSION - Random Movement

```typescript
private applyConfusionPotion(player: Player): Player
```

**Duration**: 19-21 turns (randomized)

**Effect**: Applies CONFUSED status effect via StatusEffectService

**Movement**: MovementService intercepts and randomizes direction

**Message**: `"You feel confused! (Confused for X turns)"`

**Test File**: `confusion-potion.test.ts`

---

### BLINDNESS - Cannot See

```typescript
private applyBlindnessPotion(player: Player): Player
```

**Duration**: 40-60 turns (randomized)

**Effect**: Applies BLINDED status effect via StatusEffectService

**Vision**: FOVService sets FOV radius to 0

**Message**: `"You can't see anything! (Blinded for X turns)"`

**Test File**: `blindness-potion.test.ts`

---

### HASTE_SELF - Double Actions

```typescript
private applyHasteSelfPotion(player: Player): { player: Player; duration: number }
```

**Duration**: 4-8 turns (3 + 1d5)

**Effect**: Applies HASTED status effect via StatusEffectService

**Actions**: Player gains energy twice as fast (double actions per turn)

**Message**: `"You feel yourself moving much faster! (Hasted for X turns)"`

**Test File**: `haste-potion.test.ts`

---

### SEE_INVISIBLE - Reveal Invisible Monsters

```typescript
private applySeeInvisiblePotion(player: Player): Player
```

**Duration**: 999 turns (effectively permanent until level change)

**Effect**: Applies SEE_INVISIBLE status effect

**Vision**: GameRenderer shows monsters with `isInvisible: true` (Phantoms)

**Cleared**: MoveStairsCommand clears effect when changing levels

**Message**: `"Your eyes tingle! You can see invisible creatures."`

---

### LEVITATION - Float Over Traps

```typescript
private applyLevitationPotion(player: Player): Player
```

**Duration**: 29-32 turns (randomized)

**Effect**: Applies LEVITATING status effect

**Trap Immunity**: TrapService checks status and returns 0 damage

**Message**: `"You begin to float above the ground!"`

**Trap Message**: `"You float over the trap."`

**Test File**: TrapService `trap-effects.test.ts`

---

## Potion Summary Table

| Potion Type | Power/Duration | Effect | Service Integration | Can Kill? |
|-------------|----------------|--------|---------------------|-----------|
| **HEAL** | 1d8 | +HP | Direct | No |
| **EXTRA_HEAL** | 3d8 | +HP (large) | Direct | No |
| **GAIN_STRENGTH** | Permanent | +1 STR, +1 Max STR | Direct | No |
| **RESTORE_STRENGTH** | Instant | STR = Max STR | Direct | No |
| **POISON** | 1d6 damage | -HP | Direct | Yes |
| **RAISE_LEVEL** | Instant | +1 Level, +HP, +Max HP | LevelingService | No |
| **DETECT_MONSTERS** | 1 turn | Reveal all monsters | FOVService | No |
| **DETECT_MAGIC** | Permanent | Highlight magic items | GameState | No |
| **CONFUSION** | 19-21 turns | Random movement | StatusEffectService | No |
| **BLINDNESS** | 40-60 turns | FOV radius = 0 | StatusEffectService | No |
| **HASTE_SELF** | 4-8 turns | Double energy gain | StatusEffectService | No |
| **SEE_INVISIBLE** | Until stairs | Show invisible monsters | StatusEffectService | No |
| **LEVITATION** | 29-32 turns | Trap immunity | StatusEffectService | No |
