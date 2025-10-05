# Quaff Potion Command

**Keybinding**: `q` + potion selection
**Consumes Turn**: Yes
**Implementation**: `src/commands/QuaffPotionCommand/QuaffPotionCommand.ts`

---

## Purpose

Drinks a potion from inventory to gain beneficial effects (or suffer harmful ones!). Potions are single-use consumables.

---

## Behavior

### Input Mode
1. Player presses `q`
2. Inventory modal appears showing potions only
3. Prompt: "Quaff which potion?"
4. Player selects potion (letter key)
5. Potion effect applies
6. Potion removed from inventory
7. Turn increments

### Potion Effects
Potions provide various effects:
- **Healing**: Restore HP
- **Strength**: Increase strength stat
- **Poison**: Damage over time
- **Blindness**: Temporary vision loss
- **Confusion**: Random movement
- **And more**: 13 potion types total

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Not in inventory** | "You do not have that item." | No |
| **Not a potion** | "You cannot drink that." | No |

---

## Turn Side Effects

**Always consumes turn** (even if harmful potion):

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Potion** | Removed from inventory (consumed) |
| **Effect** | Applied immediately (healing, poison, etc.) |

---

## Services Used

- **InventoryService**: Find potion, remove from inventory
- **PotionService**: Potion effect application, identification
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Potion Types

### Beneficial Potions
| Potion | Effect |
|--------|--------|
| **Healing** | Restore HP (+1d8 or full heal) |
| **Extra Healing** | Restore more HP (+2d8) |
| **Strength** | Increase strength permanently (+1) |
| **Restore Strength** | Remove strength drain |
| **Haste Self** | Double movement speed (temp) |
| **See Invisible** | Detect invisible monsters (temp) |
| **Levitation** | Float over traps/pits (temp) |

### Harmful Potions
| Potion | Effect |
|--------|--------|
| **Poison** | Damage over time (-1 HP/turn for 10 turns) |
| **Blindness** | Cannot see (FOV = 0) for 100 turns |
| **Confusion** | Random movement for 20 turns |
| **Weakness** | Reduce strength (-1) |
| **Paralysis** | Cannot move for 10 turns (instant death vs monsters!) |

### Utility Potions
| Potion | Effect |
|--------|--------|
| **Detect Monster** | Reveal all monsters on level |

---

## Identification System

**Unidentified Potions:**
- Potions start unidentified (shown as color: "a blue potion")
- Must drink or use Identify scroll to learn true name
- Once identified, all potions of that type become known

**Risk vs Reward:**
- Drinking unknown potion identifies it (risky!)
- Could be healing (good!) or poison (bad!)
- Use Identify scrolls on unknown potions first

---

## Special Rules

1. **Consumed on Use**: Potion disappears after drinking (single-use)

2. **Identification**: Drinking a potion identifies all potions of that type

3. **Cannot Kill**: Some harmful effects (like poison) can kill you if HP drops to 0

4. **Stacking Effects**: Some effects stack (e.g., multiple Haste potions extend duration)

5. **Death from Potion**: Drinking poison at low HP can kill you (game over)

---

## Code Flow

```
QuaffPotionCommand.execute()
├── Find item in inventory (by itemId)
│
├─ Item not found:
│   └── Message: "You do not have that item." (no turn)
│
├─ Item not a potion:
│   └── Message: "You cannot drink that." (no turn)
│
└─ Valid potion:
    ├── PotionService.applyPotion(player, potion, state)
    │   ├── Apply potion effect
    │   ├── Mark potion type as identified
    │   └── Return { player, message, death }
    │
    ├── Remove potion from inventory
    ├── Add effect message to log
    ├─ If death occurred:
    │   └── Set isGameOver: true
    │
    └── Increment turn
```

---

## Examples

### Example 1: Quaff Healing Potion
```
Player HP: 15/25
Potion of Healing (identified) in inventory
Player presses: q → (selects Healing Potion)
→ "You quaff a Potion of Healing. You feel better."
→ HP: 15 → 23 (+8 from 1d8 roll)
→ Potion removed from inventory
→ Turn: 100 → 101
```

### Example 2: Quaff Unknown Potion (Poison!)
```
Player HP: 20/25
"a green potion" (unidentified) in inventory
Player presses: q → (selects green potion)
→ "You quaff a Potion of Poison. You feel sick!"
→ Potion identified as "Poison"
→ Poison effect: -1 HP/turn for 10 turns
→ Potion removed
→ Turn: 100 → 101
```

### Example 3: Quaff Strength Potion
```
Player strength: 16
Potion of Strength in inventory
Player presses: q → (selects Strength Potion)
→ "You quaff a Potion of Strength. You feel stronger!"
→ Strength: 16 → 17 (permanent!)
→ Attack damage increases
→ Turn: 100 → 101
```

### Example 4: Not a Potion
```
Player selects food ration by mistake
Player presses: q → (selects food)
→ "You cannot drink that."
→ No turn consumed
```

### Example 5: Death from Poison
```
Player HP: 2/25
Drinks Potion of Poison (unknown)
→ "You quaff a Potion of Poison. You feel sick!"
→ Poison tick: HP 2 → 1 → 0 (death!)
→ "You died from poison!"
→ Game over
```

---

## Tactical Use

**When to Quaff:**
- **Healing**: When HP below 50% (emergency use)
- **Strength**: Anytime (permanent boost)
- **Utility**: When needed (Detect Monster before big fight)

**When NOT to Quaff:**
- Unknown potions at low HP (poison risk!)
- During combat (unless healing emergency)
- When fully healed (waste Healing potions)

**Identification Strategy:**
1. Use Identify scrolls on unknown potions first
2. If no scrolls, drink unknown potions when:
   - High HP (can survive poison)
   - Safe location (no monster threats)
   - Have backup healing

---

## Potion Management

**Priority Ranking** (keep these):
1. Healing (3-5 minimum)
2. Extra Healing (2-3)
3. Strength (drink immediately for permanent boost)
4. Utility (Haste, See Invisible, Detect Monster)

**Drop These** (when inventory full):
- Multiple Weakness/Poison (harmful, no benefit)
- Duplicate utility potions (Levitation, etc.)

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up potions
- [Drop](./drop.md) - Drop unwanted potions
- [Read](./read.md) - Use Identify scroll on potions

---

**Architecture**: Command orchestrates InventoryService (find/remove potion), PotionService (effect application, identification), MessageService (messages), TurnService (turn increment). All potion effect logic lives in PotionService.
