# Attack Command

**Keybinding**: Move into monster (bump-to-attack)
**Consumes Turn**: Yes
**Implementation**: `src/commands/AttackCommand/AttackCommand.ts`

---

## Purpose

Handles player-initiated melee combat. Triggered automatically when the player moves into a tile occupied by a monster (bump-to-attack mechanic).

---

## Behavior

### Attack Resolution
1. Player attacks monster (hit/miss calculated via CombatService)
2. If **hit**:
   - Damage applied to monster
   - Message: "You hit the {monster} for {damage} damage!"
3. If **miss**:
   - No damage
   - Message: "You miss the {monster}."
4. Turn increments (monster gets to retaliate during monster phase)

### Monster Death
If attack kills the monster:
1. Monster removed from level
2. XP awarded to player
3. Messages:
   - "You killed the {monster}!"
   - "You gain {xp} experience points."
4. Check for level-up (see below)

### Level-Up
If XP gain triggers level-up:
1. Player stats increase (LevelingService)
2. Messages:
   - "You have reached level {level}!"
   - "Your max HP increases to {maxHp}!"

---

## Turn Side Effects

| System | Effect | Details |
|--------|--------|---------|
| **Combat** | Hit/miss roll | Based on player strength, weapon, monster AC |
| **Damage** | Applied to monster | Weapon damage dice + strength modifier |
| **XP** | Awarded on kill | Based on monster difficulty |
| **Leveling** | Check for level-up | Increases max HP, strength (every 3 levels) |
| **Turn** | Increments | Monsters get to act |
| **Hunger/Fuel** | **NOT consumed** | Attack doesn't tick hunger/fuel |

---

## Important Notes

1. **No Hunger/Fuel Consumption**: Unlike movement, attacking does NOT consume hunger or fuel (attack is not movement)

2. **No FOV Update**: FOV is not recalculated (player didn't move)

3. **Monster Retaliation**: After turn increments, monsters act (including the attacked monster if it survived)

4. **Triggered Implicitly**: Player cannot manually trigger attack - must move into monster

---

## Services Used

- **CombatService**: Attack resolution, damage calculation, hit/miss
- **MessageService**: Combat messages
- **LevelingService**: XP rewards, level-up logic
- **TurnService**: Turn increment

---

## Combat Mechanics

### Hit Calculation
```
Hit if: 1d20 + player.strength + weapon.bonus ≥ monster.armorClass
```

### Damage Calculation
```
Damage = weapon.damage (e.g., 1d8) + strength modifier + weapon.enchantment
```

### XP Rewards
| Monster Difficulty | XP Reward |
|--------------------|-----------|
| Weak (E, K, B) | 10-25 XP |
| Medium (O, Z, S) | 30-60 XP |
| Strong (T, G, W) | 70-100 XP |
| Boss (D, J) | 200-500 XP |

### Level-Up Thresholds
```
Level 2: 10 XP
Level 3: 30 XP
Level 4: 60 XP
Level 5: 100 XP
... (exponential curve)
```

---

## Code Flow

```
AttackCommand.execute()
├── Find monster by ID
├── CombatService.playerAttack(player, monster)
│   └── Returns: { hit, damage, defender, killed }
│
├─ If HIT:
│   ├── Add damage message
│   │
│   ├─ If KILLED:
│   │   ├── Remove monster from level
│   │   ├── Calculate XP reward
│   │   ├── Add XP to player
│   │   ├── Add XP message
│   │   │
│   │   └─ If LEVELED UP:
│   │       ├── Level up player (increase stats)
│   │       ├── Add level-up message
│   │       └── Add HP increase message
│   │
│   └─ If NOT KILLED:
│       └── Apply damage to monster
│
├─ If MISS:
│   └── Add miss message
│
└── Increment turn (TurnService)
```

---

## Examples

### Example 1: Successful Hit (Non-Fatal)
```
Player attacks Orc (HP: 15)
Roll: 16 (hit!)
Damage: 8
→ "You hit the Orc for 8 damage!"
→ Orc HP: 15 → 7
→ Turn increments, Orc retaliates
```

### Example 2: Kill + XP + Level-Up
```
Player attacks Zombie (HP: 5, Level 1, 8/10 XP)
Roll: 14 (hit!)
Damage: 6 (kill!)
→ "You hit the Zombie for 6 damage!"
→ "You killed the Zombie!"
→ "You gain 10 experience points." (8 → 18 XP)
→ "You have reached level 2!" (level-up triggered!)
→ "Your max HP increases to 20!"
```

### Example 3: Miss
```
Player attacks Dragon (AC: 22)
Roll: 10 (miss!)
→ "You miss the Dragon."
→ Turn increments, Dragon retaliates
```

---

## Related Commands

- [Move](./move.md) - Triggers attack via bump-to-attack
- [Equip](./equip.md) - Equip better weapons for more damage

---

**Architecture**: Command orchestrates CombatService (attack resolution), MessageService (messages), LevelingService (XP/level-up), TurnService (turn increment). All combat logic lives in CombatService.
