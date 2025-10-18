# Controls

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Items](./05-items.md)

---

## 1. Input Method

**Keyboard Only**: Mac-compatible keyboard controls

**No Mouse**: Traditional roguelike keyboard-only interface

---

## 2. Movement

**Arrow Keys**: Primary movement controls

- **↑** - Move north
- **↓** - Move south
- **←** - Move west
- **→** - Move east
- **Arrow combinations** - Diagonal movement (if supported by terminal)

**Bump-to-Attack**: Moving into monster automatically attacks

**Bump-to-Open**: Moving into closed door automatically opens it

---

## 3. Command Keys

**Inspiration**: **Original Rogue (1980)** - Classic command key scheme (q, r, w, etc.)

### Inventory & Items

| Key | Command | Description |
|-----|---------|-------------|
| `i` | Inventory | View all carried items |
| `q` | Quaff | Drink a potion |
| `r` | Read | Read a scroll |
| `w` | Wield | Equip a weapon |
| `W` | Wear | Put on armor |
| `t` | Take off | Remove equipment (armor/weapon/light) |
| `P` | Put on | Wear a ring |
| `R` | Remove | Take off a ring |
| `z` | Zap | Use a wand/staff |
| `e` | Eat | Consume food |
| `d` | Drop | Drop an item |
| `,` | Pick up | Pick up item at current position |

---

### Movement & Exploration

| Key | Command | Description |
|-----|---------|-------------|
| `>` | Go down | Descend stairs to next level |
| `<` | Go up | Ascend stairs to previous level |
| `s` | Search | Search for hidden traps/doors |
| `o` | Open | Open a closed door |
| `c` | Close | Close an open door |
| `.` | Rest | Skip turns until healed or interrupted |
| `5` | Rest | Skip turns (numpad alternative) |

**Note**: Closed doors auto-open when you walk into them (bump-to-open). The `o` command is useful for opening doors without moving through them. Locked doors require a key (Phase 5+).

**Rest Command**: See [Character](./02-character.md#rest-command) for details.

---

### System Commands

| Key | Command | Description |
|-----|---------|-------------|
| `S` | Save | Save current game |
| `Q` | Quit | Quit game (prompts to save) |
| `?` | Help | Show help screen |
| `Shift+T` | Toggle Render | Toggle between Sprite and ASCII rendering modes |
| `~` | Debug | Open debug console (dev only) |

---

## 4. Command Mode

**How It Works**:

1. **Press command key** (e.g., `q` for quaff)
2. **If multiple items of that type**:
   - Selection menu appears
   - Items labeled `a-z`
3. **Press letter** to select item (e.g., `a`, `b`, `c`)
4. **ESC** to cancel and return to game

**Example - Quaffing a Potion**:
```
Press: q
Menu: "Quaff which potion? (a) blue potion (b) red potion (ESC to cancel)"
Press: a
Result: "You drink the blue potion. You feel better! (+8 HP)"
```

---

## 5. Special Movement Behaviors

### Auto-Open Doors

**Closed doors** (`+`):
- Walking into closed door **automatically opens** it
- No `o` command needed for most cases
- Door becomes open (`'`)

**When to use `o` command**:
- Open door without moving through it
- Check for locked door before approaching

---

### Auto-Attack

**Moving into monster**:
- Automatically initiates melee attack
- No separate attack command needed
- See [Combat](./09-combat.md) for combat mechanics

---

## 6. Vi-Style Movement (Optional, Future)

**Not implemented in v1**, but common in roguelikes:

- `h` - West
- `j` - South
- `k` - North
- `l` - East
- `y` - Northwest
- `u` - Northeast
- `b` - Southwest
- `n` - Southeast

**See**: [Future Enhancements](./14-future.md)

---

## 7. Command Reference Quick Guide

### Most Common Commands

**Movement**: Arrow keys
**Pick up item**: `,`
**View inventory**: `i`
**Eat food**: `e`
**Drink potion**: `q`
**Go downstairs**: `>`
**Rest/wait**: `.` or `5`

### Emergency Commands

**Save game**: `S`
**Quit game**: `Q`
**Help screen**: `?`

---

## 8. Keybinding Tips

**Case Sensitive**: `w` (wield weapon) ≠ `W` (wear armor)

**Shift Modifiers**: Some keys use Shift for different functions (e.g., `t` = take off equipment, `Shift+T` = toggle rendering)

**Numpad**: `5` key as alternative to `.` for resting

**ESC**: Always cancels current command/menu

---

## Cross-References

- **[Character](./02-character.md)** - Rest command mechanics
- **[Items](./05-items.md)** - Item commands (wield, wear, quaff, read, zap)
- **[Combat](./09-combat.md)** - Bump-to-attack mechanics
- **[Dungeon](./03-dungeon.md)** - Movement, doors, stairs
- **[Save System](./12-save-system.md)** - Save/quit commands

---

## Influences

- **Original Rogue (1980)**: Command key scheme (q, r, w, W, T, P, R, z, e, d, etc.)
- **NetHack**: Enhanced command set, Vi-style movement option
