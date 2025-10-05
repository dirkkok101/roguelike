# Command Reference

Complete reference for all player commands in the ASCII Roguelike.

---

## Quick Reference Table

| Key | Command | Turns | Description |
|-----|---------|-------|-------------|
| **Movement & Combat** ||||
| `↑` `↓` `←` `→` | [Move](./move.md) | Yes | Move in direction (bump-to-attack) |
| - | [Attack](./attack.md) | Yes | Triggered by moving into monster |
| **Doors & Exploration** ||||
| `o` + direction | [Open Door](./open-door.md) | Yes | Open closed/secret door |
| `c` + direction | [Close Door](./close-door.md) | Yes | Close open door |
| `s` | [Search](./search.md) | Yes | Find secret doors/traps |
| **Level Navigation** ||||
| `<` | [Stairs Up](./stairs.md) | Yes | Ascend to previous level |
| `>` | [Stairs Down](./stairs.md) | Yes | Descend to next level |
| **Inventory** ||||
| `,` | [Pick Up](./pickup.md) | Yes | Pick up item at feet |
| `d` | [Drop](./drop.md) | Yes | Drop item from inventory |
| `i` | Inventory | No | View inventory (modal) |
| **Equipment** ||||
| `w` | [Wield Weapon](./equip.md) | Yes | Equip weapon |
| `W` | [Wear Armor](./equip.md) | Yes | Equip armor |
| `P` | [Put On Ring](./equip.md) | Yes | Equip ring |
| `R` | [Remove Ring](./unequip.md) | Yes | Unequip ring |
| **Consumables** ||||
| `e` | [Eat Food](./eat.md) | Yes | Consume food ration |
| `q` | [Quaff Potion](./quaff.md) | Yes | Drink potion |
| `r` | [Read Scroll](./read.md) | Yes | Read scroll |
| `z` | [Zap Wand](./zap.md) | Yes | Use wand |
| `F` | [Refill Lantern](./refill.md) | Yes | Refill lantern with oil |
| **Game** ||||
| `S` | [Save](./save.md) | No | Save game |
| `Q` | [Quit](./quit.md) | No | Quit to main menu |
| `?` | Help | No | Show help modal |
| `M` | Message History | No | View message log |
| **Debug (Dev Only)** ||||
| `~` | [Debug Console](./debug-console.md) | No | Toggle debug console |
| `g` | [God Mode](./debug-godmode.md) | No | Toggle invincibility |
| `v` | [Reveal Map](./debug-reveal.md) | No | Reveal entire level |
| `f` | [FOV Overlay](./debug-fov.md) | No | Show FOV debug |
| `p` | [Path Overlay](./debug-path.md) | No | Show pathfinding |
| `n` | [AI Overlay](./debug-ai.md) | No | Show AI states |
| `m` | [Spawn Monster](./debug-spawn.md) | No | Spawn test monster |
| `M` | [Wake Monsters](./debug-wake.md) | No | Wake all monsters (debug mode) |
| `K` | [Kill Monsters](./debug-kill.md) | No | Kill all monsters |

---

## Turn Consumption

Commands marked **"Yes"** in the Turns column will:
- Increment turn counter
- Tick hunger (1 turn closer to starvation)
- Tick light fuel (torches/lanterns burn fuel)
- Trigger monster turns (all monsters get to act)

Commands marked **"No"** are **instant** and do not advance the game state.

---

## Command Categories

### Core Gameplay
- [Move](./move.md) - Player movement
- [Attack](./attack.md) - Combat via bump-to-attack
- [Open Door](./open-door.md) - Open doors
- [Close Door](./close-door.md) - Close doors
- [Search](./search.md) - Find secrets
- [Stairs](./stairs.md) - Level navigation

### Items
- [Pick Up](./pickup.md) - Pick up items
- [Drop](./drop.md) - Drop items
- [Equip](./equip.md) - Equip weapons/armor/rings
- [Unequip](./unequip.md) - Remove equipment

### Consumables
- [Eat](./eat.md) - Consume food
- [Quaff](./quaff.md) - Drink potions
- [Read](./read.md) - Read scrolls
- [Zap](./zap.md) - Use wands
- [Refill](./refill.md) - Refill lantern

### Meta
- [Save](./save.md) - Save game
- [Quit](./quit.md) - Quit game

### Debug
- [God Mode](./debug-godmode.md) - Invincibility
- [Reveal Map](./debug-reveal.md) - Show entire level
- [Debug Console](./debug-console.md) - Console toggle
- [Spawn Monster](./debug-spawn.md) - Spawn test monster
- [Wake Monsters](./debug-wake.md) - Wake all monsters
- [Kill Monsters](./debug-kill.md) - Kill all monsters
- [FOV Overlay](./debug-fov.md) - FOV visualization
- [Path Overlay](./debug-path.md) - Pathfinding visualization
- [AI Overlay](./debug-ai.md) - AI state visualization

---

## Architecture Notes

All commands follow the **Command Pattern**:
- Implement `ICommand` interface
- `execute(state: GameState): GameState`
- Orchestrate services (no logic in commands)
- Return new immutable state

See [Architecture Guide](../architecture.md) for more details.

---

**Last Updated**: 2025-10-05
