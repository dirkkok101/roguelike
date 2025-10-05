# Read Scroll Command

**Keybinding**: `r` + scroll selection (+ optional item target)
**Consumes Turn**: Yes
**Implementation**: `src/commands/ReadScrollCommand/ReadScrollCommand.ts`

---

## Purpose

Reads a scroll from inventory to activate powerful magical effects. Scrolls are single-use consumables.

---

## Behavior

### Input Mode
1. Player presses `r`
2. Inventory modal shows scrolls only
3. Prompt: "Read which scroll?"
4. Player selects scroll
5. **Some scrolls require target item** (Identify, Enchant)
   - Second modal appears: "Identify which item?" / "Enchant which weapon?"
   - Player selects target item
6. Scroll effect applies
7. Scroll removed from inventory
8. Turn increments

---

## Scroll Types

### Item-Target Scrolls (require second selection)
| Scroll | Target | Effect |
|--------|--------|--------|
| **Identify** | Unidentified item | Reveals true name/properties |
| **Enchant Weapon** | Weapon | +1 damage/hit bonus |
| **Enchant Armor** | Armor | +1 AC |

### Instant Scrolls (no target needed)
| Scroll | Effect |
|--------|--------|
| **Magic Mapping** | Reveal entire level map |
| **Teleport** | Random teleport on level |
| **Remove Curse** | Uncurse all equipped items |
| **Scare Monster** | Nearby monsters flee |
| **Create Monster** | Spawn random monster (dangerous!) |
| **And more** | 13 scroll types total |

---

## Error Cases

| Condition | Message | Turn? |
|-----------|---------|-------|
| **Not in inventory** | "You do not have that item." | No |
| **Not a scroll** | "You cannot read that." | No |

---

## Turn Side Effects

**Always consumes turn** (even if harmful scroll):

| System | Effect |
|--------|--------|
| **Turn** | Increments |
| **Monsters** | Get to act |
| **Hunger/Fuel** | **NOT consumed** (no movement) |
| **Scroll** | Removed from inventory (consumed) |
| **Effect** | Applied immediately |

---

## Services Used

- **InventoryService**: Find scroll, remove from inventory
- **ScrollService**: Scroll effect application, identification
- **MessageService**: Message log updates
- **TurnService**: Turn increment

---

## Identification System

**Unidentified Scrolls:**
- Scrolls start unidentified (shown as title: "scroll titled ELAM EBOW")
- Must read or use Identify scroll to learn true name
- Once identified, all scrolls of that type become known

**Risk vs Reward:**
- Reading unknown scroll identifies it (risky!)
- Could be teleport (dangerous!) or magic mapping (helpful!)

---

## Special Rules

1. **Consumed on Use**: Scroll disappears after reading (single-use)

2. **Identification**: Reading a scroll identifies all scrolls of that type

3. **Target Validation**: Item-target scrolls check for valid targets (e.g., Enchant Weapon requires weapon)

4. **Dangerous Scrolls**: Some scrolls are harmful (Create Monster spawns enemy!)

5. **Cursed Scrolls**: Future feature - cursed scrolls have negative effects

---

## Code Flow

```
ReadScrollCommand.execute()
├── Find item in inventory (by itemId)
│
├─ Item not found:
│   └── Message: "You do not have that item." (no turn)
│
├─ Item not a scroll:
│   └── Message: "You cannot read that." (no turn)
│
└─ Valid scroll:
    ├── ScrollService.applyScroll(player, scroll, state, targetItemId)
    │   ├── Apply scroll effect based on scrollType
    │   │   ├─ IDENTIFY:
    │   │   │   └── Mark target item as identified
    │   │   ├─ ENCHANT_WEAPON:
    │   │   │   └── Increase weapon bonus +1
    │   │   ├─ ENCHANT_ARMOR:
    │   │   │   └── Increase armor AC +1
    │   │   ├─ MAGIC_MAPPING:
    │   │   │   └── Reveal level.explored = all true
    │   │   └─ ... (other scroll types)
    │   │
    │   ├── Mark scroll type as identified
    │   └── Return { player, message }
    │
    ├── Remove scroll from inventory
    ├── Add effect message to log
    └── Increment turn
```

---

## Examples

### Example 1: Read Identify Scroll
```
Player with unidentified "blue potion" in inventory
Scroll of Identify (identified) in inventory
Player presses: r → (selects Identify) → (selects blue potion)
→ "You read a Scroll of Identify."
→ "The blue potion is a Potion of Healing!"
→ Potion now shows as "Potion of Healing"
→ Scroll removed from inventory
→ Turn: 100 → 101
```

### Example 2: Read Unknown Scroll (Magic Mapping!)
```
Player with unknown scroll "titled ELAM EBOW"
Player presses: r → (selects scroll)
→ "You read a Scroll of Magic Mapping."
→ Entire level map revealed
→ Scroll identified as "Magic Mapping"
→ Scroll removed
→ Turn: 100 → 101
```

### Example 3: Enchant Weapon
```
Player with Longsword (+0) equipped
Scroll of Enchant Weapon in inventory
Player presses: r → (selects Enchant Weapon) → (selects Longsword)
→ "You read a Scroll of Enchant Weapon."
→ "Your longsword glows blue!"
→ Longsword: +0 → +1 (permanent!)
→ Attack damage/hit increases
→ Turn: 100 → 101
```

### Example 4: Teleport (Risky!)
```
Player in safe room
Reads unknown scroll (Teleport)
→ "You read a Scroll of Teleport."
→ "You feel disoriented!"
→ Player teleports to random position on level
→ (Could land in monster room!)
→ Turn: 100 → 101
```

### Example 5: Create Monster (Dangerous!)
```
Player reads unknown scroll
→ "You read a Scroll of Create Monster."
→ "A monster appears!"
→ Dragon spawns at random nearby position
→ (Bad luck!)
→ Turn: 100 → 101
```

---

## Tactical Use

**Always Read:**
- **Identify**: On unknown potions/scrolls/wands
- **Enchant Weapon/Armor**: On your best gear (permanent upgrade)
- **Remove Curse**: When wearing cursed items

**Situational:**
- **Magic Mapping**: When exploring new level (shows layout)
- **Teleport**: Emergency escape (random destination!)
- **Scare Monster**: When surrounded (monsters flee)

**Never Read** (unless desperate):
- **Create Monster**: Spawns enemy (harmful!)

**Identification Strategy:**
1. Use Identify scrolls on unknown scrolls first
2. If no Identify scrolls, read unknown scrolls when:
   - Safe location (no monsters nearby)
   - Can handle negative consequences (Create Monster)
   - Need emergency effect (Teleport for escape)

---

## Scroll Management

**Priority Ranking** (keep these):
1. Identify (2-3 minimum)
2. Enchant Weapon/Armor (use immediately on best gear)
3. Remove Curse (1-2 for emergencies)
4. Magic Mapping (helpful for exploration)
5. Teleport (1-2 for emergency escape)

**Drop These** (when inventory full):
- Multiple Create Monster (harmful)
- Duplicate utility scrolls

---

## Related Commands

- [Pick Up](./pickup.md) - Pick up scrolls
- [Drop](./drop.md) - Drop unwanted scrolls
- [Quaff](./quaff.md) - Use Identify scroll on potions

---

**Architecture**: Command orchestrates InventoryService (find/remove scroll), ScrollService (effect application, identification), MessageService (messages), TurnService (turn increment). Target item selection handled in InputHandler (UI concern). All scroll effect logic lives in ScrollService.
