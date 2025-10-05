# Equip Command

**Keybinding**: `w` (weapon) / `W` (armor) / `P` (ring)
**Consumes Turn**: Yes
**Implementation**: `src/commands/EquipCommand/EquipCommand.ts`

---

## Purpose

Equips weapons, armor, or rings from inventory. Equipped items provide combat bonuses, protection, and special effects.

---

## Keybindings

| Key | Item Type | Prompt | Slot |
|-----|-----------|--------|------|
| `w` | Weapon | "Wield which weapon?" | `equipment.weapon` |
| `W` | Armor | "Wear which armor?" | `equipment.armor` |
| `P` | Ring | "Put on which ring?" | `equipment.leftRing` or `equipment.rightRing` |

---

## Behavior

### Weapon (`w`)
1. Shows item selection modal (weapons only)
2. Player selects weapon
3. Current weapon (if any) returned to inventory
4. New weapon equipped
5. Message: "You wield {weapon}."
6. Turn increments

### Armor (`W`)
1. Shows item selection modal (armor only)
2. Player selects armor
3. Current armor (if any) returned to inventory
4. New armor equipped
5. Message: "You put on {armor}."
6. Turn increments

### Ring (`P`)
1. Shows item selection modal (rings only)
2. Player selects ring
3. **Ring slot logic:**
   - If left hand empty → equip left
   - If left hand full, right empty → equip right
   - If both full → **blocked** (must unequip first)
4. Message: "You put on {ring} on your {hand} hand."
5. Turn increments

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Already equipped** | "{Item} is already equipped." | No |
| **Not in inventory** | "You do not have that item." | No |
| **Wrong item type** | "You cannot equip that item." | No |
| **Both ring slots full** | "You must specify which hand..." | No |

---

## Turn Side Effects

**Only if equip succeeds:**

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Equipment** | Item equipped, old item to inventory |
| **Stats** | Combat/defense stats update (via equipment) |

---

## Services Used

- **InventoryService**: Inventory checks, equipping logic, slot management
- **IdentificationService**: Display name generation
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Equipment Slots

| Slot | Limit | Auto-Swap? |
|------|-------|------------|
| **Weapon** | 1 | Yes (old weapon → inventory) |
| **Armor** | 1 | Yes (old armor → inventory) |
| **Left Ring** | 1 | No (must unequip manually) |
| **Right Ring** | 1 | No (must unequip manually) |
| **Light Source** | 1 | Special (via pickup/drop) |

**Note**: Weapons and armor auto-swap. Rings do NOT - you must unequip first if both hands full.

---

## Special Rules

1. **Auto-Swap**: Equipping weapon/armor automatically unequips the old one (returns to inventory)

2. **Ring Limitation**: Can only wear 2 rings (left + right). Must [Unequip](./unequip.md) to swap.

3. **Inventory Space**: If inventory full and equipping would return item to inventory, **operation blocks** (drop something first)

4. **Identification**: Item becomes identified upon equipping (you learn its properties)

5. **Cursed Items**: Future feature - cursed items cannot be unequipped (require uncurse scroll)

---

## Code Flow

```
EquipCommand.execute()
├── Check if already equipped
│   └─ If equipped:
│       └── Message: "{Item} is already equipped." (no turn)
│
├── Find item in inventory
│   └─ If not found:
│       └── Message: "You do not have that item." (no turn)
│
├── Type-specific equipping:
│   ├─ WEAPON:
│   │   ├── InventoryService.equipWeapon()
│   │   │   ├── Old weapon → inventory (if any)
│   │   │   └── New weapon → equipment.weapon
│   │   └── Message: "You wield {weapon}."
│   │
│   ├─ ARMOR:
│   │   ├── InventoryService.equipArmor()
│   │   │   ├── Old armor → inventory (if any)
│   │   │   └── New armor → equipment.armor
│   │   └── Message: "You put on {armor}."
│   │
│   └─ RING:
│       ├── Check ring slot availability
│       ├─ If no ringSlot specified:
│       │   └── Message: "You must specify which hand..." (no turn)
│       │
│       └─ InventoryService.equipRing()
│           ├── Ring → equipment.leftRing or equipment.rightRing
│           └── Message: "You put on {ring} on your {hand} hand."
│
└── Increment turn
```

---

## Examples

### Example 1: Equip Weapon (First Time)
```
Player with Mace in inventory, no weapon equipped
Player presses: w → (selects Mace)
→ "You wield a mace."
→ equipment.weapon: null → Mace
→ Mace removed from inventory
→ Turn: 100 → 101
```

### Example 2: Swap Weapon
```
Player with Longsword equipped, Mace in inventory
Player presses: w → (selects Mace)
→ "You wield a mace."
→ equipment.weapon: Longsword → Mace
→ Longsword returned to inventory
→ Mace removed from inventory
→ Turn: 101 → 102
```

### Example 3: Equip Ring (Empty Slot)
```
Player with Ring of Strength in inventory
No rings equipped
Player presses: P → (selects Ring of Strength)
→ "You put on a Ring of Strength on your left hand."
→ equipment.leftRing: null → Ring of Strength
→ Turn: 100 → 101
```

### Example 4: Equip Ring (One Slot Full)
```
Player with Ring of Strength equipped on left
Ring of Protection in inventory
Player presses: P → (selects Ring of Protection)
→ "You put on a Ring of Protection on your right hand."
→ equipment.rightRing: null → Ring of Protection
→ Turn: 101 → 102
```

### Example 5: Equip Ring (Both Slots Full) - BLOCKED
```
Player with rings on both hands
Ring of Regeneration in inventory
Player presses: P → (selects Ring of Regeneration)
→ "You must specify which hand (left or right) to wear the ring on."
→ No turn consumed
→ (Must use 'R' to unequip a ring first)
```

### Example 6: Already Equipped
```
Player with Longsword equipped
Player presses: w → (selects Longsword)
→ "longsword is already equipped."
→ No turn consumed
```

---

## Equipment Benefits

### Weapons
- **Damage**: Higher damage dice (1d4 → 1d8 → 1d10)
- **Hit Bonus**: Enchanted weapons (+1, +2, etc.)
- **Special Effects**: Some weapons have unique properties

### Armor
- **Armor Class**: Higher AC = harder to hit
- **Enchantment**: +1, +2, +3 AC bonuses
- **Weight**: Heavier armor may affect future mechanics

### Rings
- **Protection**: +AC bonus
- **Strength**: +damage, +hit
- **Regeneration**: Auto-heal over time
- **See Invisible**: Detect invisible monsters
- **And more**: 14 ring types total

---

## Related Commands

- [Unequip](./unequip.md) - Remove rings (weapon/armor swap automatically)
- [Drop](./drop.md) - Drop items (must unequip first)
- [Pick Up](./pickup.md) - Pick up equipment

---

**Architecture**: Command orchestrates InventoryService (equipping logic, slot management), IdentificationService (display names), MessageService (messages), TurnService (turn increment). Ring slot selection logic in command is acceptable (UI concern).
