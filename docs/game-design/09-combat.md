# Combat System

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Monsters](./04-monsters.md) | [Items](./05-items.md) | [Hunger](./08-hunger.md)

---

## 1. Overview

**Style**: Turn-based tactical combat

**Inspiration**: **Original Rogue (1980)** - Combat formulas based on classic D&D mechanics (1d20 rolls, AC system, strength modifiers).

---

## 2. Turn-Based Combat Flow

### Initiating Combat

**Movement into Monster**: Automatically initiates melee attack
- No separate attack command needed
- Attack resolves, then player continues moving (if monster dies)

**Monster Turn**: Monsters attack when adjacent
- AI determines movement toward player
- Attack if next to player

**Both Attack**: Exchange blows each turn until one flees or dies

---

## 3. Hit Calculation

### Attack Roll Formula

```
Attack Roll = 1d20 + 1 + to-hit modifiers
Hit if: Attack Roll >= Enemy AC
```

**Base**: Roll 1d20 (1-20)
**Flat Bonus**: +1 (always applied)
**Modifiers**: See to-hit modifiers below

**Example**:
- Roll: 12
- Flat bonus: +1
- Strength bonus: +3 (Str 21)
- Enchanted weapon: +2
- Total: 12 + 1 + 3 + 2 = 18
- Hit if enemy AC ≤ 18

---

## 4. To-Hit Modifiers

### Strength Bonus

| Strength | To-Hit Bonus |
|----------|--------------|
| 1-20 | +0 |
| 21-30 | +3 |
| 31 | +4 |

**High strength = better accuracy**

---

### Target Conditions

**Sleeping/Held**: +4 to hit
- Monsters start asleep (most)
- First strike advantage

**Inspiration**: **Original Rogue** - Sleeping monsters easier to hit.

---

### Enchanted Weapon

**+1 Weapon**: +1 to hit
**+2 Weapon**: +2 to hit
**+3 Weapon**: +3 to hit

**Cursed weapons** (negative enchantment):
**-1 Weapon**: -1 to hit (penalty!)

---

### Hunger Penalty

**Weak State** (hunger 1-149):
**-1 to hit** (in addition to damage penalty)

**See**: [Hunger](./08-hunger.md#state-effects) for full hunger effects.

---

## 5. Damage Calculation

### Damage Formula

```
Damage = Weapon Dice + Strength Modifier
```

**Weapon Dice**: Based on weapon type (e.g., Mace = 2d4)
**Strength Modifier**: Based on strength stat (see table below)

**Example**:
- Weapon: Mace (2d4)
- Roll: 3 + 2 = 5
- Strength: 20 (+4 bonus)
- Total Damage: 5 + 4 = 9 HP

---

## 6. Strength Damage Bonuses

| Strength | Damage Bonus |
|----------|--------------|
| 1-15 | +0 |
| 16 | +1 |
| 17 | +2 |
| 18-19 | +3 |
| 20-21 | +4 |
| 22-30 | +5 |
| 31 | +6 (maximum) |

**High strength = significantly higher damage**

**Strategy**: Strength is critical stat for Fighter class

---

## 7. Armor Class (AC)

### AC Mechanics

**Lower AC = Harder to Hit** (better defense)

**Base AC**: 10 (unarmored)

**Armor Reduces AC**:
- Leather Armor: AC 8
- Chain Mail: AC 5
- Plate Mail: AC 3

**Enchanted Armor**: Further reduces AC
- Plate Mail +1: AC 2 (3 - 1)
- Plate Mail +3: AC 0 (3 - 3)

**Negative AC Possible**: Very rare, extremely good defense

---

### AC Examples

| Equipment | AC | Difficulty to Hit |
|-----------|----|--------------------|
| Unarmored | 10 | Easy |
| Leather | 8 | Moderate |
| Chain Mail | 5 | Hard |
| Plate Mail | 3 | Very Hard |
| Plate Mail +2 | 1 | Extremely Hard |

**Strategy**: Prioritize finding and enchanting armor

---

## 8. Combat Messages

### Player Attacks

**Hit**: "You hit the Orc for 5 damage."
**Miss**: "You miss the Orc."
**Kill**: "You killed the Orc!"

### Monster Attacks

**Hit**: "The Orc attacks you for 3 damage!"
**Miss**: "The Orc misses you."
**Special**: "The Dragon breathes fire at you for 18 damage!"

**All messages logged to action log** (scrolling message area)

---

## 9. Special Combat Scenarios

### Sleeping Monsters

**First Strike Advantage**:
- +4 to hit (see to-hit modifiers)
- Monster wakes after first attack
- Subsequent attacks at normal to-hit

**Strategy**: Approach sleeping monsters carefully for guaranteed first hit

---

### Weak from Hunger

**Penalties** (hunger 1-149):
- -1 to hit
- -1 damage

**Strategy**: Eat before combat when possible

---

### Ranged Attacks (Phase 4+)

**Dragon Flame Breath**:
- 6d6 damage (ranged, 6-36 damage)
- Can attack from distance
- Extremely dangerous

**Wands** (Phase 5+):
- Lightning, Fire, Cold, Magic Missile
- Ranged magical attacks

---

## 10. Death

### Player Death

**Occurs when HP reaches 0**:
1. Game over screen displayed
2. Final stats summary shown
3. **Save file deleted** (permadeath)
4. Option to start new game

**No continues, no respawns, no resurrection**

**See**: [Character](./02-character.md#permadeath) for permadeath details.

---

### Monster Death

**Occurs when monster HP reaches 0**:
- Monster removed from level
- **XP awarded** to player
- Possible item drop (Phase 3+)

---

## 11. Combat Strategy Tips

### General Tips

**Know Enemy AC**:
- Low AC enemies: Attack freely
- High AC enemies: Need strength bonuses or enchanted weapons

**Manage HP**:
- Retreat when low (tactical withdrawal)
- Use healing potions mid-combat if necessary
- Natural regeneration after combat (if hunger > 100)

**First Strike**:
- Attack sleeping monsters for +4 to-hit advantage
- Position before waking monsters

---

### Against Specific Threats

**Regenerators** (Troll, Griffin, Vampire):
- Burst damage critical
- Don't let fight drag out
- See [Monsters](./04-monsters.md#regeneration)

**High Damage** (Dragon, Jabberwock):
- High AC essential
- Healing potions ready
- Tactical retreat if needed

**Drainers** (Wraith, Rattlesnake, Vampire):
- Avoid if under-equipped
- Permanent stat loss serious
- See [Monsters](./04-monsters.md#drain-stats-xp)

---

## Cross-References

- **[Character](./02-character.md)** - HP, strength, stats, permadeath
- **[Monsters](./04-monsters.md)** - Monster stats, special abilities
- **[Items](./05-items.md)** - Weapons, armor, enchantments
- **[Hunger](./08-hunger.md)** - Weak state combat penalties

---

## Influences

- **Original Rogue (1980)**: All combat formulas, AC system, strength tables
- **Classic D&D**: 1d20 attack rolls, AC mechanics, damage dice
