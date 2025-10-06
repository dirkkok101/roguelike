# Dungeon

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Monsters](./04-monsters.md) | [Light Sources](./06-light-sources.md) | [UI Design](./11-ui-design.md)

---

## 1. Structure

### Dungeon Layout

**Total Levels**: 10 (increasing difficulty)

**Generation**: Procedural (rooms + corridors)

**Persistence**: Each level generated once per game; state preserved when revisiting

**Stairs**:
- **Go down** (`>`) to next level
- **Go up** (`<`) to previous level
- Each level has both (except Level 1 has no up, Level 10 requires finding down stairs after getting Amulet)

**Inspiration**: **Original Rogue (1980)** - Room and corridor generation algorithm with BSP-style dungeon layout.

---

## 2. ASCII Symbols

**Note**: Detailed lighting and visibility mechanics covered in [Core Systems](../systems-core.md#lighting-system).

### Terrain

| Element | Symbol | Description |
|---------|--------|-------------|
| **Wall** | `─│┌┐└┘` or `\|`, `-` | Dungeon walls (block movement and vision) |
| **Floor** | `.` | Walkable floor space |
| **Corridor** | `#` | Narrow passages between rooms |
| **Stairs Down** | `>` | Descend to next level |
| **Stairs Up** | `<` | Ascend to previous level |
| **Trap** | `^` | Hidden dangers (visible only when discovered) |

### Doors (6 Types)

| Type | Symbol | Description |
|------|--------|-------------|
| **Open** | `'` | Open doorway (passable, does not block vision) |
| **Closed** | `+` | Closed door (blocks vision, auto-opens on bump) |
| **Locked** | `+` | Locked door (needs key, appears same as closed) |
| **Secret** | `#` | Hidden door (appears as wall until discovered) |
| **Broken** | `'` | Destroyed door (permanently open) |
| **Archway** | `'` | Doorless opening (always passable) |

**Note**: **Closed doors auto-open when you walk into them** (bump-to-open). The `o` command opens doors without moving through them. Locked doors require a key (Phase 5+).

### Entities

| Element | Symbol | Description |
|---------|--------|-------------|
| **Player** | `@` | You (the adventurer) |
| **Monster** | `A-Z` | 26 monster types (capital letters) |
| **Gold** | `$` | Currency |
| **Food** | `%` | Food rations |
| **Weapon** | `)` | Swords, maces, axes, etc. |
| **Armor** | `[` | Leather, chain mail, plate armor |
| **Potion** | `!` | Magic potions |
| **Scroll** | `?` | Magic scrolls |
| **Ring** | `=` | Magic rings |
| **Wand/Staff** | `/` | Magic wands and staffs |
| **Torch** | `~` | Basic light source (burns out) |
| **Lantern** | `(` | Better light source (needs oil) |
| **Amulet** | `&` | The Amulet of Yendor (win condition) |

---

## 3. Level Generation

**Algorithm**: Room + Corridor approach (see [Advanced Systems](../systems-advanced.md#dungeon-generation))

### Rooms
- **Count**: 6-9 rooms per level
- **Size**: Variable (3x3 to 10x10)
- **Placement**: Random, non-overlapping
- **Doors**: 1-4 doors per room (6 types)

### Corridors
- **Purpose**: Connect all rooms
- **Algorithm**: Minimum Spanning Tree ensures full connectivity
- **Loops**: 30% chance of extra connections (alternate paths)
- **Style**: Winding corridors with bends (not straight lines)

### Connectivity
- **All rooms reachable** from any starting point
- **MST algorithm** prevents isolated areas
- **Optional loops** create tactical choices (multiple paths)

**Inspiration**: **Original Rogue** used similar room + corridor generation with random connections.

---

## 4. Level Persistence

### How It Works

**First Visit**:
- Level generated procedurally (rooms, corridors, monsters, items)
- State saved to game memory

**Revisiting**:
- **Level state preserved** (monster positions, items, doors opened)
- **Monsters remain** where last seen
- **Items dropped** still on floor
- **Doors opened** stay open

**Purpose**: Strategic retreat is viable (return to previous level to heal/restock)

---

## 5. Visibility & Exploration

### Three States

**Visible** (in field of view):
- Full brightness, full color
- Determined by light source radius
- See [Light Sources](./06-light-sources.md) for radius details

**Explored** (previously seen):
- Dimmed/desaturated "map memory"
- Terrain visible (walls, floors, doors, stairs)
- **Monsters NOT shown** (only visible in current FOV)
- Items optional (dim gray)

**Unexplored**:
- Black or not rendered
- Never visited by player

**See**: [UI Design](./11-ui-design.md) for complete color palette.

---

## 6. Traps

**Discovery**:
- Hidden until triggered or searched (`s` key)
- Appear as `^` when discovered

**Types** (Phase 3+):
- Bear trap (immobilizes player)
- Dart trap (damage + possible poison)
- Pit trap (damage + fall to lower level)
- Teleport trap (random relocation)
- Alarm trap (wakes all monsters on level)

**Strategy**: Search frequently in suspicious areas (corridors, room entrances)

---

## 7. Dungeon Progression

### Early Levels (1-3)
- **Difficulty**: Low
- **Monsters**: Weak (Bat, Snake, Hobgoblin)
- **Loot**: Basic equipment, torches, food
- **Goal**: Learn mechanics, build resources

### Mid Levels (4-7)
- **Difficulty**: Moderate
- **Monsters**: Stronger (Centaur, Troll, Leprechaun)
- **Loot**: Better weapons/armor, lanterns, oil flasks
- **Goal**: Prepare for late game (upgrade equipment)

### Late Levels (8-10)
- **Difficulty**: High
- **Monsters**: Powerful (Dragon, Jabberwock, Vampire)
- **Loot**: Artifact lights, enchanted gear, Amulet of Yendor (Level 10)
- **Goal**: Survive, retrieve Amulet, escape to surface

---

## Cross-References

- **[Monsters](./04-monsters.md)** - Spawning rules, difficulty scaling
- **[Light Sources](./06-light-sources.md)** - Vision radius, exploration
- **[Combat](./09-combat.md)** - Tactical positioning, cover
- **[UI Design](./11-ui-design.md)** - Color palette, visibility rendering
- **[Advanced Systems](../systems-advanced.md#dungeon-generation)** - Technical generation algorithm

---

## Influences

- **Original Rogue (1980)**: Room + corridor generation, ASCII symbols, procedural layout
- **NetHack**: Secret doors, diverse trap types
- **Angband**: Level persistence, fog of war
