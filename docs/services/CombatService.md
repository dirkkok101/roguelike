# CombatService

**Location**: `src/services/CombatService/CombatService.ts`
**Dependencies**: RandomService, HungerService (optional), DebugService (optional)
**Test Coverage**: Hit calculation, damage formulas, equipment bonuses, hunger penalties

---

## Purpose

Implements combat mechanics using original 1980 Rogue formulas. Handles hit/miss calculation, damage rolls, and applies equipment/hunger modifiers.

---

## Public API

### Combat Resolution

#### `playerAttack(player: Player, monster: Monster): CombatResult`
Resolves player attack against monster.

**Formula**:
- **Hit**: `d20 + playerLevel + strength + hungerPenalty ≥ 10`
- **Damage**: `weaponDamage + weaponBonus + strengthMod + hungerPenalty`

**Returns**:
```typescript
interface CombatResult {
  hit: boolean
  damage: number
  attacker: string
  defender: string
  killed: boolean
}
```

---

#### `monsterAttack(monster: Monster, player: Player, state?: GameState): CombatResult`
Resolves monster attack against player.

**God Mode Check**: Returns miss if god mode active (player invincible)

**Formula**:
- **Hit**: `d20 + monsterLevel - (playerAC + ringBonuses) ≥ 10`
- **Damage**: Roll monster's damage dice

---

### Damage Application

#### `applyDamageToPlayer(player: Player, damage: number): Player`
Applies damage to player (immutable update).

**Returns**: New player with `hp = max(0, hp - damage)`

---

#### `applyDamageToMonster(monster: Monster, damage: number): Monster`
Applies damage to monster (immutable update).

**Returns**: New monster with `hp = max(0, hp - damage)`

---

## Combat Formulas (Original Rogue)

### Hit Calculation
```
roll = d20 (1-20)
modifier = attackerLevel - defenderAC
hit = (roll + modifier >= 10)
```

### Player Damage
```
baseDamage = roll(weaponDamage)  // e.g., 1d8 for longsword
totalDamage = baseDamage + weaponBonus + strengthMod + hungerPenalty
```

### Monster Damage
```
damage = roll(monsterDamage)  // e.g., 2d6 for troll
```

---

## Equipment Bonuses

### Strength Rings
Adds to attack modifier:
```typescript
bonus = leftRing.ADD_STRENGTH.bonus + rightRing.ADD_STRENGTH.bonus
effectiveStrength = player.strength + bonus
```

### Protection/Dexterity Rings
Reduces AC (lower is better):
```typescript
acBonus = leftRing.PROTECTION.bonus + rightRing.DEXTERITY.bonus
effectiveAC = player.ac - acBonus
```

---

## Hunger Effects

When HungerService injected, applies penalties:

| Hunger State | To-Hit Penalty | Damage Penalty |
|--------------|----------------|----------------|
| **Weak** (< 150) | -1 | -1 |
| **Starving** (0) | -1 | -1 |

---

## God Mode

When DebugService injected and god mode active:
- **Player attacks**: Normal (can still attack)
- **Monster attacks**: Always miss (player invincible)

---

## Related Services

- **RandomService** - Dice rolls (d20, damage)
- **HungerService** - Hunger penalties (optional dependency)
- **DebugService** - God mode check (optional dependency)
- **LevelingService** - XP calculation after kills
