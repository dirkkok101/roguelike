# Game Design: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Architecture](./architecture.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

---

## 1. Product Overview

**Name**: Web Roguelike

**Genre**: Classic roguelike dungeon crawler

**Platform**: Web (TypeScript + Vite)

**Target Audience**: Roguelike enthusiasts, retro gamers, fans of challenging procedurally-generated games

**Core Concept**: A faithful recreation of the original 1980 Rogue game using modern web technologies while preserving the classic ASCII aesthetic and core gameplay loop. Players navigate procedurally generated dungeons, battle monsters, manage resources (hunger, equipment, lighting), and attempt to retrieve the legendary Amulet of Yendor.

---

## 2. Game Objective

The player must:
1. Start on Level 1 of the dungeon
2. Descend through 10 procedurally generated dungeon levels
3. Retrieve the **Amulet of Yendor** from Level 10
4. Return to the surface (Level 1) with the amulet
5. Survive hunger, combat, traps, darkness, and **permadeath**

Victory is achieved only when the player returns to Level 1 with the Amulet of Yendor.

---

## 3. Core Features

### 3.1 Character

**Class**: Fighter (single class for v1)

**Core Stats**:
- **HP (Hit Points)**: Current/Maximum health
- **Strength**: Current/Maximum (affects damage and carry capacity)
- **Armor Class (AC)**: Lower is better (affects enemy hit chance)
- **Level**: Character progression level
- **Experience (XP)**: Points toward next level
- **Gold**: Currency collected from dungeon
- **Hunger**: Food units (starts at 1300)
- **Light Source**: Torch, lantern, or artifact (affects vision radius)

**Progression**:
- Gain XP from defeating monsters
- Level up to increase max HP and stats
- Find better equipment to improve combat effectiveness
- Discover permanent light sources (artifacts)

**Permadeath**:
- Death is permanent - game over, start fresh
- Can save current game state to resume later
- Save is deleted upon death (no save scumming)

---

### 3.2 Dungeon & ASCII Graphics

**Structure**:
- **10 levels** of increasing difficulty
- **Procedural generation** with rooms connected by corridors (see [Advanced Systems](./systems-advanced.md#dungeon-generation))
- **Level persistence**: Each level generated once per game instance; state preserved when revisiting
- **Stairs**: Go down (`>`) to next level, up (`<`) to previous level

**ASCII Characters**:

| Element | Symbol | Description |
|---------|--------|-------------|
| Player | `@` | You (the adventurer) |
| Wall | `─│┌┐└┘` or `\|`, `-` | Dungeon walls |
| Floor | `.` | Walkable floor space |
| Corridor | `#` | Narrow passages between rooms |
| Door (Open) | `'` | Open doorway |
| Door (Closed) | `+` | Closed door (blocks vision) |
| Door (Locked) | `+` | Locked door (needs key) |
| Door (Secret) | `#` | Hidden door (appears as wall) |
| Stairs Down | `>` | Descend to next level |
| Stairs Up | `<` | Ascend to previous level |
| Trap | `^` | Hidden dangers (bear trap, dart trap, etc.) |
| Gold | `$` | Currency |
| Food | `%` | Food rations |
| Weapon | `)` | Swords, maces, axes, etc. |
| Armor | `[` | Leather, chain mail, plate armor |
| Potion | `!` | Magic potions |
| Scroll | `?` | Magic scrolls |
| Ring | `=` | Magic rings |
| Wand/Staff | `/` | Magic wands and staffs |
| Torch | `~` | Basic light source (burns out) |
| Lantern | `(` | Better light source (needs oil) |
| Amulet | `&` | The Amulet of Yendor (win condition) |

**Note**: Detailed lighting and visibility mechanics are covered in [Core Systems](./systems-core.md#lighting-system).

---

### 3.3 Monsters (26 Total - Letters A-Z)

All monsters from the original Rogue, each represented by a capital letter:

| Letter | Name | HP | AC | Damage | AI | Special Abilities |
|--------|------|----|----|--------|-----|-------------------|
| **A** | Aquator | 5d8 | 2 | 0d0 | SIMPLE | Rusts armor on hit |
| **B** | Bat | 1d8 | 3 | 1d2 | ERRATIC | Flying, erratic movement |
| **C** | Centaur | 4d8 | 4 | 1d2/1d5/1d5 | SMART | Multiple attacks |
| **D** | Dragon | 10d8 | -1 | 1d8/1d8/3d10 | SMART | Flame breath (6d6 ranged) |
| **E** | Emu | 1d8 | 7 | 1d2 | SIMPLE | Mean (aggressive) |
| **F** | Venus Flytrap | 8d8 | 3 | Special | STATIONARY | Holds player in place |
| **G** | Griffin | 13d8 | 2 | 4d3/3d5 | SMART | Regenerates HP, flying, mean |
| **H** | Hobgoblin | 1d8 | 5 | 1d8 | SIMPLE | Mean |
| **I** | Ice Monster | 1d8 | 9 | 0d0 | SIMPLE | Freezes player (skip turn) |
| **J** | Jabberwock | 15d8 | 6 | 2d12/2d4 | SMART | High damage, boss-tier |
| **K** | Kestrel | 1d8 | 7 | 1d4 | ERRATIC | Mean, flying |
| **L** | Leprechaun | 3d8 | 8 | 1d1 | THIEF | Steals gold, flees after |
| **M** | Medusa | 8d8 | 2 | 3d4/3d4/2d5 | SMART | Confuses player |
| **N** | Nymph | 3d8 | 9 | 0d0 | THIEF | Steals magic item, teleports |
| **O** | Orc | 1d8 | 6 | 1d8 | GREEDY | Runs toward gold piles |
| **P** | Phantom | 8d8 | 3 | 4d4 | SMART | Invisible |
| **Q** | Quagga | 3d8 | 3 | 1d5/1d5 | SIMPLE | Mean |
| **R** | Rattlesnake | 2d8 | 3 | 1d6 | SIMPLE | Reduces strength on hit |
| **S** | Snake | 1d8 | 5 | 1d3 | SIMPLE | Mean |
| **T** | Troll | 6d8 | 4 | 1d8/1d8/2d6 | SIMPLE | Regenerates HP, mean |
| **U** | Ur-vile | 7d8 | -2 | 1d9/1d9/2d9 | SMART | Mean, tough AC |
| **V** | Vampire | 8d8 | 1 | 1d10 | SMART + COWARD | Regenerates, drains max HP, flees at low HP |
| **W** | Wraith | 5d8 | 4 | 1d6 | SMART | Drains experience points |
| **X** | Xeroc | 7d8 | 7 | 4d4 | SIMPLE | None |
| **Y** | Yeti | 4d8 | 6 | 1d6/1d6 | SIMPLE | Two attacks |
| **Z** | Zombie | 2d8 | 8 | 1d8 | SIMPLE | Mean, slow |

**Monster AI Behaviors** (detailed in [Advanced Systems](./systems-advanced.md#monster-ai)):
- **SMART**: Full A* pathfinding, tactical positioning
- **GREEDY**: Prioritizes gold over player
- **ERRATIC**: 50% random movement, 50% toward player
- **SIMPLE**: Direct "greedy" movement toward player
- **STATIONARY**: Doesn't move, waits for player
- **THIEF**: Steals item/gold then flees
- **COWARD**: Flees when HP < threshold

**Monster Behavior**:
- Most monsters start **asleep** (don't move until player is near)
- **Mean** monsters always start awake and aggressive
- **Special abilities** trigger on specific conditions
- **Flying** monsters can cross certain terrain
- **Regenerating** monsters heal HP over time

**Scaling**: Higher dungeon levels spawn tougher monsters more frequently

---

### 3.4 Items & Equipment

#### Item Categories

**Food** (`%`)
- **Food Rations**: Restore 1100-1499 hunger units (random)
- Essential for survival due to hunger system
- 30% chance food "tastes awful" (flavor text, still works)

**Weapons** (`)`)
- Various weapon types with different damage dice
- Examples: Mace (2d4), Long Sword (1d12), Two-handed Sword (3d6)
- Can be enchanted (+1, +2, etc. for hit/damage bonuses)
- **Wield** command to equip

**Armor** (`[`)
- Provides Armor Class (AC) protection
- Types: Leather [8], Studded Leather [7], Ring Mail [7], Chain Mail [5], Banded Mail [4], Splint Mail [4], Plate Mail [3]
- Lower AC = better protection
- Can be enchanted (e.g., +1 improves AC by 1)
- Vulnerable to **rust** (Aquator attacks)
- **Wear/Take off** commands to equip/unequip

**Light Sources** (`~` torch, `(` lantern)
- **Torches**: Radius 1, 500 turns of fuel
- **Lanterns**: Radius 2, refillable with oil flasks
- **Oil Flasks**: 500 turns of fuel per flask
- **Artifacts**: Permanent light sources (radius 2-3)
- See [Core Systems](./systems-core.md#lighting-system) for details

**Potions** (`!`)
- Single-use consumable items
- **Unidentified** at start (e.g., "blue potion", "fizzy potion")
- Types: Healing, Extra Healing, Restore Strength, Gain Strength, Poison, Confusion, Blindness, etc.
- **Quaff** command to drink

**Scrolls** (`?`)
- Single-use magic items
- **Unidentified** at start (e.g., "scroll labeled XYZZY")
- Types: Identify, Enchant Weapon, Enchant Armor, Magic Mapping, Teleportation, Remove Curse, etc.
- **Read** command to use

**Rings** (`=`)
- Worn on finger (can wear 2 simultaneously)
- **Unidentified** at start (e.g., "ruby ring", "wooden ring")
- Provide passive effects (good or bad)
- Most rings **increase hunger rate** (except Slow Digestion)
- Types: Protection, Regeneration, Searching, See Invisible, Slow Digestion, Add Strength, Sustain Strength, Dexterity, etc.
- **Put on/Remove** commands

**Wands/Staffs** (`/`)
- Limited charges (e.g., 3-7 uses)
- **Unidentified** at start
- Ranged magical effects
- Types: Lightning, Fire, Cold, Magic Missile, Sleep, Haste Monster, Slow Monster, Polymorph, etc.
- **Zap** command to use

**Gold** (`$`)
- Scattered throughout dungeon
- Adds to score
- Can be stolen by Leprechauns
- Attracts Orcs (greedy AI)

**Amulet of Yendor** (`&`)
- Found on Level 10
- **Win condition**: Must return to surface with it
- Cannot be dropped once picked up

---

### 3.5 Item Identification System

To mimic the mystery and discovery of the original Rogue:

**Unidentified Items**:
- Potions, scrolls, rings, and wands start **unidentified**
- Each game instance generates **random descriptive names**
- Names randomized per playthrough (e.g., "blue potion" might be Healing in one game, Poison in another)

**Descriptive Names** (examples):
- **Potions**: "blue potion", "red potion", "fizzy potion", "dark potion", "cloudy potion", etc.
- **Scrolls**: "scroll labeled XYZZY", "scroll labeled ELBERETH", "scroll labeled NR 9", etc.
- **Rings**: "ruby ring", "sapphire ring", "iron ring", "wooden ring", "ivory ring", etc.
- **Wands**: "oak wand", "pine staff", "metal wand", etc.

**Identification Methods**:
1. **Use the item** (risky - could be harmful!)
2. **Scroll of Identify** (reveals true nature)
3. **Trial and error** (note effects in other games)

**Persistence**: Once an item type is identified in a game, all similar items are revealed (e.g., if "blue potion" = Healing, all blue potions in that game are known).

---

### 3.6 Hunger System

Based on original Rogue mechanics:

**Hunger Units**:
- Start with **1300 food units**
- Maximum capacity: **2000 units**
- Food rations restore **1100-1499 units** (average 1300, randomized)

**Hunger Depletion**:
- Normal depletion: **1 unit per turn**
- Wearing rings increases hunger rate (except Ring of Slow Digestion, which reduces it)
- Moving, fighting, and resting all consume hunger

**Hunger States**:

| Food Units | State | Display | Effect |
|------------|-------|---------|--------|
| 301+ | Normal | - | No penalties |
| 150-300 | Hungry | "You are getting hungry" (yellow) | Warning message |
| 1-149 | Weak | "You are weak from hunger!" (red) | Combat penalties (-1 to hit/damage) |
| 0 | Starving | "You are fainting!" (flashing red) | Take 1 HP damage per turn |

**Strategy**:
- Manage food carefully (finite resource)
- Ration food based on exploration needs
- Rings drain food faster - use wisely
- Running out of food = death

---

### 3.7 Combat System

Based on original Rogue formulas (service implementation in [Architecture](./architecture.md#combatservice)):

**Turn-Based Combat**:
- Moving into a monster initiates melee attack
- Combat is automatic (no separate attack command)
- Both player and monster attack each turn until one flees or dies

**Hit Calculation**:
```
Attack Roll = 1d20 + 1 + to-hit modifiers
Hit if: Attack Roll >= Enemy AC
```

**To-Hit Modifiers**:
- **Strength bonus**:
  - Str 21-30: +3 to hit
  - Str 31: +4 to hit
- **Sleeping/Held target**: +4 to hit
- **Enchanted weapon**: +1 to +3 (depending on enchantment)

**Damage Calculation**:
```
Damage = Weapon Dice + Strength Modifier
```

**Strength Damage Bonuses**:

| Strength | Damage Bonus |
|----------|--------------|
| 1-15 | +0 |
| 16 | +1 |
| 17 | +2 |
| 18-19 | +3 |
| 20-21 | +4 |
| 22-30 | +5 |
| 31 | +6 (max) |

**Armor Class (AC)**:
- Lower AC = harder to hit
- Base AC = 10 (unarmored)
- Armor reduces AC (e.g., Plate Mail = AC 3)
- Enchanted armor further reduces AC (e.g., +1 armor = -1 AC)

**Combat Messages**:
- "You hit the Orc for 5 damage."
- "The Orc misses you."
- "The Dragon breathes fire at you for 18 damage!"
- Messages logged to action log

**Death**:
- Player HP reaches 0 = game over
- Permadeath - save deleted
- Show death screen with stats summary

---

### 3.8 Controls

**Input**: Keyboard only (Mac-compatible)

**Movement**: Arrow keys
- **↑** - Move north
- **↓** - Move south
- **←** - Move west
- **→** - Move east
- **Arrow combinations** - Diagonal movement (if supported)

**Command Keys** (original Rogue style):

| Key | Command | Description |
|-----|---------|-------------|
| `i` | Inventory | View all carried items |
| `q` | Quaff | Drink a potion |
| `r` | Read | Read a scroll |
| `w` | Wield | Equip a weapon |
| `W` | Wear | Put on armor |
| `T` | Take off | Remove armor |
| `P` | Put on | Wear a ring |
| `R` | Remove | Take off a ring |
| `z` | Zap | Use a wand/staff |
| `e` | Eat | Consume food |
| `d` | Drop | Drop an item |
| `,` | Pick up | Pick up item at current position |
| `>` | Go down | Descend stairs to next level |
| `<` | Go up | Ascend stairs to previous level |
| `s` | Search | Search for hidden traps/doors |
| `o` | Open | Open a closed door |
| `c` | Close | Close an open door |
| `.` | Rest | Skip turn (wait in place) |
| `S` | Save | Save current game |
| `Q` | Quit | Quit game (prompts to save) |
| `~` | Debug | Open debug console (dev only) |

**Command Mode**:
- Press command key (e.g., `q` for quaff)
- If multiple items of that type, show selection menu
- Press letter (a-z) to select item
- ESC to cancel

---

## 4. UI/UX Design

### 4.1 Visual Design Philosophy

**Core Aesthetic**: Modern web interpretation of classic ASCII terminal

**Design Goals**:
- **Readable**: Clear, high-contrast monospace font
- **Authentic**: True to ASCII roguelike spirit
- **Enhanced**: Modern colors, subtle effects (no breaking immersion)
- **Accessible**: Colorblind-friendly palette, clear messaging

**Typography**:
- **Font**: Fira Code, JetBrains Mono, or similar monospace
- **Size**: 14-16px for readability
- **Weight**: Regular for dungeon, bold for player/important elements

**Color Palette** (Three-State Visibility System):

See [Core Systems](./systems-core.md#visibility-color-system) for complete color specifications.

**Background**: Dark gray/black (`#1a1a1a`)

**VISIBLE STATE** (Currently in FOV):

*Terrain*:
- **Walls**: Tan (`#8B7355`)
- **Floors**: Light brown (`#A89078`)
- **Corridors**: Dark brown (`#6B5D52`)
- **Doors (closed)**: Golden (`#D4AF37`)
- **Doors (open)**: Tan (`#8B7355`)
- **Stairs**: White (`#FFFFFF`)
- **Traps**: Red (`#FF4444`) - if discovered

*Entities*:
- **Player**: Bright cyan (`#00FFFF`)
- **Monsters**: Color-coded by threat level (green/yellow/orange/red)
- **Items**: Type-specific colors (gold/magenta/cyan/white/etc.)

**EXPLORED STATE** (Previously seen, map memory):
- Grayscale variants of all terrain
- Monsters **NOT RENDERED** (only visible in FOV)
- Items optional (dim gray)

**UNEXPLORED STATE**:
- Everything: Black (`#000000`) or not rendered

**UI/Message Colors**:
- **Damage**: Red (`#FF4444`)
- **Healing**: Green (`#44FF44`)
- **Info**: White (`#FFFFFF`)
- **Warnings**: Yellow (`#FFDD00`)
- **Light warnings**: Orange (`#FF8800`)
- **Critical**: Bright red (`#FF0000`)
- **Success**: Bright green (`#00FF00`)

**Effects**:
- **Subtle glow** on player character (2px cyan shadow)
- **Fade in** for new messages
- **Pulse** for low HP warning
- **Flicker** for torch running out
- **NO animations** for movement/combat (instant, turn-based)

---

### 4.2 Layout

**Responsive Design**: Fixed aspect ratio, scales to fit screen

```
┌──────────────────────────────────────────────────────────────────┐
│  TITLE BAR                                           [~] Debug    │
│  Roguelike: The Quest for the Amulet          Seed: abc123def    │
├──────────────────────────────────────────────────────────────────┤
│  MESSAGE LOG (5 lines, scrolling)                                │
│  > You hit the Orc for 5 damage.                                 │
│  > The Orc attacks you for 3 damage!                             │
│  > Your torch is getting dim...                                  │
│  > You feel hungry.                                              │
│  >                                                               │
├──────────────────────────────────────────────┬────────────────────┤
│                                              │  STATS             │
│                                              │                    │
│         DUNGEON VIEW (80x22)                 │  HP:    24/30  ████│
│                                              │  Str:   16/16      │
│                                              │  AC:    4          │
│  #################                           │  Lvl:   3          │
│  #...............#      ######               │  XP:    156/300    │
│  #...@...........+######+....#               │  Gold:  247        │
│  #...............#      #....#               │  Depth: 5          │
│  #...........O...#      #....#               │                    │
│  #################      ######               │  HUNGER            │
│                                              │  [████████████▒▒]  │
│                                              │  Hungry            │
│                                              │                    │
│                                              │  LIGHT             │
│                                              │  Torch (dim)       │
│                                              │  ~45 turns left    │
│                                              │                    │
│                                              │  EQUIPPED          │
│                                              │  ────────────      │
│                                              │  Weapon:           │
│                                              │    Mace +1         │
│                                              │  Armor:            │
│                                              │    Chain Mail [4]  │
│                                              │  Rings:            │
│                                              │    Protection +1   │
│                                              │    [empty]         │
├──────────────────────────────────────────────┴────────────────────┤
│  COMMANDS: [i]nv [q]uaff [r]ead [w]ield [e]at [o]pen [>]/<] [S]ave│
└──────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Screens & Modals

#### Main Menu
```
┌────────────────────────────────────────┐
│                                        │
│     ╔═══════════════════════════╗      │
│     ║   ROGUE: THE QUEST FOR    ║      │
│     ║   THE AMULET OF YENDOR    ║      │
│     ╚═══════════════════════════╝      │
│                                        │
│           [N] New Game                 │
│           [C] Continue                 │
│           [H] Help                     │
│           [~] Debug Mode               │
│                                        │
│      Press a key to begin...           │
│                                        │
└────────────────────────────────────────┘
```

---

## 5. Save System & Persistence

### 5.1 LocalStorage Strategy

**Save Data**:
- Stored in browser LocalStorage
- Key: `roguelike_save_${gameId}`
- Format: JSON-serialized GameState (see [Architecture](./architecture.md#gamestate))

**Save Triggers**:
1. **Manual save** (press `S`)
2. **Auto-save** on quit (press `Q`)
3. **Auto-save** every 10 turns (configurable)

**Load**:
- On game start, check for existing save
- If found, show "Continue" option on main menu
- Load full GameState and resume

### 5.2 Permadeath Implementation

**On Death**:
1. Show death screen with stats
2. **Delete save from LocalStorage** (no second chances)
3. Offer "New Game" option

**No Save Scumming**:
- Save is overwritten on each action/turn
- Cannot reload earlier state
- Death = permanent game over

---

## 6. Success Metrics

### 6.1 Functionality Metrics

- [ ] **Core loop functional**: Can play from Level 1 → Level 10 → Level 1 with Amulet
- [ ] **All monsters implemented**: 26 monsters A-Z with correct stats/abilities
- [ ] **All item types working**: Weapons, armor, potions, scrolls, rings, wands, food, light sources
- [ ] **Combat accurate**: Formulas match original Rogue
- [ ] **Hunger system functional**: Depletion, states, effects working correctly
- [ ] **Lighting system functional**: Fuel consumption, radius affects FOV, artifacts work
- [ ] **Permadeath works**: Save deleted on death, no save scumming
- [ ] **Identification system**: Random names per game, persistence
- [ ] **FOV system accurate**: Shadowcasting with light radius correctly blocks vision
- [ ] **Pathfinding works**: Monsters navigate around obstacles intelligently
- [ ] **AI behaviors work**: All 7 behavior types function correctly
- [ ] **Dungeon generation**: Rooms, corridors, doors (6 types), loops, full connectivity
- [ ] **Debug tools functional**: All debug commands and overlays work

---

### 6.2 Quality Metrics

- [ ] **Test coverage**: >80% for services and commands
- [ ] **Performance**: 60fps rendering, <100ms input response
- [ ] **No game-breaking bugs**: Playable without crashes or softlocks
- [ ] **Saves/loads correctly**: State persists accurately
- [ ] **Balanced difficulty**: Challenging but fair (playtesting feedback)

---

### 6.3 UX Metrics

- [ ] **Controls responsive**: Keyboard input feels snappy
- [ ] **Readable**: ASCII characters clear and distinguishable
- [ ] **Messages helpful**: Combat log provides useful feedback
- [ ] **UI intuitive**: Players can understand commands without manual
- [ ] **Authentic feel**: Captures spirit of original Rogue with modern enhancements
- [ ] **Lighting tension**: Managing torches/lanterns adds strategic depth

---

## 7. Future Enhancements (Post-v1)

### 7.1 Additional Features

- **Character classes**: Thief (stealth), Mage (spells), Ranger (archery)
- **More items**: Additional weapons, armor types, unique artifacts
- **More light sources**: Candles (radius 0.5), magical lanterns (radius 2.5)
- **Special rooms**: Shops, vaults, shrines, treasure rooms
- **Quests**: Side objectives beyond Amulet retrieval
- **Monster AI improvements**: Pack tactics, fleeing behavior, terrain awareness
- **Traps**: More variety (dart, pit, teleport, alarm)
- **Sound effects**: Combat hits, item pickup, footsteps, torch lighting
- **Music**: Ambient dungeon music, combat themes

---

### 7.2 Technical Improvements

- **Mobile support**: Touch controls, simplified UI
- **Multiplayer**: Shared dungeon, leaderboards
- **Cloud saves**: Sync across devices
- **Replay system**: Save/share game seeds
- **Modding support**: Custom monsters, items, levels via JSON
- **Accessibility**: Screen reader support, colorblind modes, adjustable font sizes

---

### 7.3 Content Expansions

- **More levels**: Extend to 20+ levels
- **Boss fights**: Unique powerful monsters on certain levels
- **Alternate dungeons**: Different themes (ice cave, volcano, crypt, underwater)
- **Prestige mode**: New Game+ with harder enemies
- **Achievements**: Unlock challenges and rewards
- **Daily challenges**: Same seed for all players, compete for best score

---

## Appendix

### Glossary

- **Roguelike**: Genre of dungeon crawlers with permadeath, procedural generation, turn-based gameplay
- **ASCII**: Text-based graphics using characters (A-Z, symbols)
- **Permadeath**: Permanent death - no continues or respawns
- **Procedural Generation**: Algorithmic creation of content (dungeons, monsters)
- **AC (Armor Class)**: Defense stat (lower = better in classic Rogue)
- **HP (Hit Points)**: Health/life total
- **XP (Experience Points)**: Points toward leveling up
- **Amulet of Yendor**: The legendary artifact and win condition
- **FOV (Field of View)**: What the player/monster can currently see
- **A\* (A-star)**: Pathfinding algorithm for finding optimal paths
- **Shadowcasting**: FOV algorithm that accurately simulates line of sight
- **MST (Minimum Spanning Tree)**: Graph algorithm ensuring all rooms are connected
- **Light Radius**: Distance player can see, determined by equipped light source

---

### References

- [Original Rogue Manual](https://britzl.github.io/roguearchive/files/misc/EpyxRogueDOSManual/manual.htm)
- [Rogue Monster List - StrategyWiki](https://strategywiki.org/wiki/Rogue/Monsters)
- [RogueBasin - Roguelike Development Wiki](https://www.roguebasin.com/)
- [Rogue Wikipedia](https://en.wikipedia.org/wiki/Rogue_(video_game))
- [FOV using Recursive Shadowcasting - RogueBasin](https://www.roguebasin.com/index.php/FOV_using_recursive_shadowcasting)
- [What the Hero Sees: Field-of-View for Roguelikes - Bob Nystrom](https://journal.stuffwithstuff.com/2015/09/07/what-the-hero-sees/)
- [Introduction to A* - Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Original Rogue Source Code (BSD 4.3)](https://github.com/commercial-game-sources/rogue)
- [Pathfinding in Roguelikes - RogueBasin](https://www.roguebasin.com/index.php/Pathfinding)
- [Angband Lighting Mechanics](http://angband.oook.cz/)
- [Dungeon Generation Algorithms - RogueBasin](https://www.roguebasin.com/index.php/Articles)

---

### Contact & Feedback

**Developer**: Dirk Kok  
**Repository**: https://github.com/dirkkok101/roguelike  
**Issues/Bugs**: https://github.com/dirkkok101/roguelike/issues  
**Email**: dirkkok@gmail.com
