# SpecialAbilityService

**Location**: `src/services/SpecialAbilityService/SpecialAbilityService.ts`
**Dependencies**: RandomService
**Test Coverage**: All 7 on-hit abilities, breath weapon, regeneration, multiple attacks

---

## Purpose

Implements **all special monster abilities**: on-hit debuffs (rust, freeze, drain), breath weapons (Dragon fire), regeneration, theft, and multiple attack parsing.

---

## Public API

### On-Hit Debuffs

#### `rustArmor(player: Player, monster: Monster): AbilityResult`
**Monster**: Aquator

Rusts player's armor, reducing AC bonus by 1.

**Chance**: 50%

**Effect**: `armor.bonus -= 1` (makes AC worse)

**Example**:
```typescript
const result = service.rustArmor(player, aquator)
// player.equipment.armor.bonus: 3 → 2
// messages: ["Your armor rusts!"]
```

---

#### `freezePlayer(player: Player): AbilityResult`
**Monster**: Ice Monster

Freezes player solid, causing turn loss.

**Chance**: 40%

**Effect**: Player loses next turn (status effect system)

**Example**:
```typescript
const result = service.freezePlayer(player)
// messages: ["You are frozen solid!"]
// Note: Turn skipping handled by status effect system
```

---

#### `confusePlayer(player: Player): AbilityResult`
**Monster**: Medusa

Confuses player, randomizing movements.

**Chance**: 30%

**Duration**: 3-5 turns

**Effect**: Player movements become random (status effect system)

**Example**:
```typescript
const result = service.confusePlayer(player)
// messages: ["You feel confused!"]
// Note: Confusion handled by status effect system
```

---

#### `drainStrength(player: Player): AbilityResult`
**Monster**: Rattlesnake

Permanently drains player strength.

**Chance**: 50%

**Effect**: `player.strength -= 1` (minimum 3)

**Example**:
```typescript
const result = service.drainStrength(player)
// player.strength: 16 → 15
// messages: ["You feel weaker!"]
```

---

#### `drainXP(player: Player): AbilityResult`
**Monster**: Wraith

Drains player experience points.

**Chance**: 40%

**Amount**: Random 10-50 XP

**Effect**: `player.xp -= drainAmount` (minimum 0)

**Example**:
```typescript
const result = service.drainXP(player)
// player.xp: 100 → 65 (drained 35)
// messages: ["You feel your life force drain away!"]
```

---

#### `drainMaxHP(player: Player): AbilityResult`
**Monster**: Vampire

Permanently reduces player's maximum HP.

**Chance**: 30%

**Effect**:
- `player.maxHp -= 1` (minimum 1)
- `player.hp = Math.min(player.hp, player.maxHp)` (cap current HP)

**Example**:
```typescript
const result = service.drainMaxHP(player)
// player.maxHp: 20 → 19
// player.hp: 20 → 19 (capped)
// messages: ["You feel your life essence fade!"]
```

---

#### `holdPlayer(player: Player): AbilityResult`
**Monster**: Venus Flytrap

Grabs player, preventing movement.

**Chance**: 60%

**Duration**: 1-2 turns

**Effect**: Player can't move (status effect system)

**Example**:
```typescript
const result = service.holdPlayer(player)
// messages: ["The flytrap grabs you!"]
// Note: Movement blocking handled by status effect system
```

---

### Composite Method

#### `applyOnHitAbilities(player: Player, monster: Monster): AbilityResult`
Applies all on-hit abilities for a monster.

**Process**: Checks `monster.aiProfile.special` array and applies each ability

**Special Flags**:
- `'rusts_armor'` → rustArmor()
- `'freezes'` → freezePlayer()
- `'confuses'` → confusePlayer()
- `'drains_strength'` → drainStrength()
- `'drains_xp'` → drainXP()
- `'drains_max_hp'` → drainMaxHP()
- `'holds'` → holdPlayer()

**Returns**:
```typescript
interface AbilityResult {
  player?: Player
  monster?: Monster
  messages: string[]
}
```

**Example**:
```typescript
// Vampire hits player
const result = service.applyOnHitAbilities(player, vampire)
// Checks vampire.aiProfile.special: ['drains_max_hp']
// Applies drainMaxHP (30% chance)
// Returns: { player: updatedPlayer, messages: [...] }
```

---

## Regeneration

#### `regenerate(monster: Monster): AbilityResult`
Heals monster by 1 HP per turn.

**Used By**: Griffin, Troll, Vampire

**Rate**: +1 HP per turn (capped at `maxHp`)

**Example**:
```typescript
const result = service.regenerate(troll)
// troll.hp: 24 → 25 (if maxHp >= 25)
```

---

## Breath Weapons

#### `hasBreathWeapon(monster: Monster): boolean`
Checks if monster has breath weapon.

**Currently**: Only Dragon

---

#### `rollBreathWeaponDamage(monster: Monster): number`
Rolls breath weapon damage.

**Dragon**: `6d6` fire damage (6-36, avg 21)

**Example**:
```typescript
const damage = service.rollBreathWeaponDamage(dragon)
// Returns: 23 (6d6 roll)
```

---

#### `shouldUseBreathWeapon(monster: Monster): boolean`
Determines if monster uses breath weapon this turn.

**Dragon**: 40% chance

**Example**:
```typescript
if (service.shouldUseBreathWeapon(dragon)) {
  const damage = service.rollBreathWeaponDamage(dragon)
  // Use breath weapon instead of melee
} else {
  // Use melee attack
}
```

---

## Multiple Attacks

#### `parseMultipleAttacks(damageString: string): string[]`
Parses multiple attacks from damage string.

**Format**: `"attack1/attack2/attack3"`

**Example**:
```typescript
const attacks = service.parseMultipleAttacks("1d2/1d5/1d5")
// Returns: ["1d2", "1d5", "1d5"]

// Griffin (3 attacks)
const attacks = service.parseMultipleAttacks("1d2/1d5/1d5")
// Roll each attack separately: claw (1d2), claw (1d5), bite (1d5)
```

**Used By**: Griffin, Jabberwock, Troll (multi-attack monsters)

---

## Ability Checks

#### `hasSpecial(monster: Monster, special: string): boolean`
Checks if monster has specific special ability.

**Example**:
```typescript
if (service.hasSpecial(aquator, 'rusts_armor')) {
  // Apply rust ability
}

if (service.hasSpecial(troll, 'regenerates')) {
  // Apply regeneration
}
```

**Special Flags**:
- `'rusts_armor'` - Aquator
- `'freezes'` - Ice Monster
- `'confuses'` - Medusa
- `'drains_strength'` - Rattlesnake
- `'drains_xp'` - Wraith
- `'drains_max_hp'` - Vampire
- `'holds'` - Venus Flytrap
- `'regenerates'` - Griffin, Troll, Vampire
- `'steals'` - Leprechaun (gold), Nymph (items)
- `'greedy'` - Orc (picks up gold)

---

## Ability Summary Table

| Ability | Monster(s) | Chance | Effect | Permanent? |
|---------|-----------|--------|--------|------------|
| **Rust Armor** | Aquator | 50% | AC bonus -1 | Yes |
| **Freeze** | Ice Monster | 40% | Lose 1 turn | No (1 turn) |
| **Confuse** | Medusa | 30% | Random movement | No (3-5 turns) |
| **Drain Strength** | Rattlesnake | 50% | Strength -1 | Yes |
| **Drain XP** | Wraith | 40% | XP -10 to -50 | Yes |
| **Drain Max HP** | Vampire | 30% | Max HP -1 | Yes |
| **Hold** | Venus Flytrap | 60% | Can't move | No (1-2 turns) |
| **Regenerate** | Griffin, Troll, Vampire | 100% | HP +1/turn | N/A |
| **Breath Weapon** | Dragon | 40% | 6d6 fire | N/A |
| **Multiple Attacks** | Griffin, Jabberwock, Troll | 100% | 2-3 attacks | N/A |
| **Steal** | Leprechaun, Nymph | 100% (on adjacent) | Gold/item | N/A |

---

## Result Type

```typescript
interface AbilityResult {
  player?: Player      // Updated player (if modified)
  monster?: Monster    // Updated monster (for regeneration)
  messages: string[]   // Ability messages
}
```

**Why Optional?** Some abilities don't trigger (failed chance roll).

**Example**:
```typescript
// Ability failed (50% chance missed)
{ player: undefined, monster: undefined, messages: [] }

// Ability succeeded
{ player: updatedPlayer, messages: ["Your armor rusts!"] }
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
rustArmor(player: Player, monster: Monster): AbilityResult {
  const rustedArmor: Armor = {
    ...armor,
    bonus: armor.bonus - 1,  // New armor object
  }

  return {
    player: {
      ...player,  // New player object
      equipment: {
        ...player.equipment,  // New equipment object
        armor: rustedArmor,
      },
    },
    messages: ['Your armor rusts!'],
  }
}
```

---

## Usage in MonsterTurnService

### On-Hit Abilities

```typescript
// After successful monster attack
const abilityResult = this.abilityService.applyOnHitAbilities(player, monster)

if (abilityResult.player) {
  player = abilityResult.player
}

for (const msg of abilityResult.messages) {
  messages = this.messageService.addMessage(messages, msg, 'warning', turnCount)
}
```

---

### Breath Weapon

```typescript
if (this.abilityService.shouldUseBreathWeapon(monster)) {
  const breathDamage = this.abilityService.rollBreathWeaponDamage(monster)

  messages.push(`The ${monster.name} breathes fire at you for ${breathDamage} damage!`)
  player.hp -= breathDamage

  // Skip melee attack this turn
  continue
}
```

---

### Regeneration

```typescript
if (this.abilityService.hasSpecial(monster, 'regenerates')) {
  const regenResult = this.abilityService.regenerate(monster)
  if (regenResult.monster) {
    monster = regenResult.monster
  }
}
```

---

### Multiple Attacks

```typescript
const attacks = this.abilityService.parseMultipleAttacks(monster.damage)

for (const attackDamage of attacks) {
  // Roll each attack separately
  const result = this.combatService.monsterAttack(monster, player, attackDamage)
  // ...
}
```

---

## Testing

**Test Files**:
- `rust-armor.test.ts` - Aquator ability
- `freeze-confuse.test.ts` - Ice Monster, Medusa
- `drain-abilities.test.ts` - Rattlesnake, Wraith, Vampire
- `regeneration.test.ts` - HP regeneration
- `breath-weapon.test.ts` - Dragon fire
- `multiple-attacks.test.ts` - Parsing and execution

**Example Test**:
```typescript
describe('SpecialAbilityService - Drain Strength', () => {
  test('reduces strength by 1 on success', () => {
    mockRandom.setChance(true)  // 50% chance succeeds
    const player = { ...basePlayer, strength: 16 }

    const result = service.drainStrength(player)

    expect(result.player.strength).toBe(15)
    expect(result.messages).toContain('You feel weaker!')
  })

  test('does not reduce strength below 3', () => {
    mockRandom.setChance(true)
    const player = { ...basePlayer, strength: 3 }

    const result = service.drainStrength(player)

    expect(result.player.strength).toBe(3)  // Min cap
    expect(result.messages).toHaveLength(0)
  })
})
```

---

## Related Services

- **CombatService** - Calls `applyOnHitAbilities` after successful attack
- **MonsterTurnService** - Orchestrates all abilities during monster turns
- **RandomService** - Rolls for ability chances
- **MessageService** - Displays ability messages to player

---

## Design Rationale

### Why Percentage Chances?

**Balance** - Permanent debuffs (drains) are devastating, so lower chances (30-50%).

**Unpredictability** - Player can't rely on dodging debuffs, must plan for worst case.

**Original Rogue** - Many abilities had percentage chances for balance.

---

### Why Minimum Caps?

**Prevents Unwinnable States**:
- Strength can't go below 3 (player still effective)
- Max HP can't go below 1 (player still alive)

**Prevents Soft-Locks** - Player can't be drained into uselessness.

---

### Why Status Effects as Notes?

**Phase 1 Limitation** - Status effect system not yet implemented.

**Current**: Abilities return messages but don't apply actual status effects.

**Future (Phase 3)**: Will add status effect duration tracking, turn skipping, etc.
