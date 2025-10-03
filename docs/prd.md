# Product Requirements Document: ASCII Roguelike

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
- **Procedural generation** with rooms connected by corridors
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

---

### 3.2.1 Lighting System

**Inspiration**: Angband-style light radius system with consumable and permanent sources

**Light Sources**:

| Source | Radius | Duration | Notes |
|--------|--------|----------|-------|
| **Torch** | 1 tile | 500 turns | Basic consumable, burns out |
| **Lantern** | 2 tiles | Refillable | Requires oil flasks (each = 500 turns) |
| **Phial of Galadriel** | 3 tiles | Permanent | Rare artifact, never runs out |
| **Star of Elendil** | 3 tiles | Permanent | Rare artifact, never runs out |
| **Arkenstone of Thrain** | 2 tiles | Permanent | Rare artifact, never runs out |

**Mechanics**:
- **FOV = Light Radius**: Your vision distance equals your light source's radius
- **Fuel Consumption**: Torches and lanterns consume fuel each turn
- **Warning System**:
  - "Your torch is getting dim..." (50 turns left)
  - "Your torch flickers..." (10 turns left)
  - "Your torch goes out! You are in darkness!" (0 turns)
- **Darkness Effects**: Without light, vision radius = 0 (can only see current tile)
- **Multiple Torches**: Can carry extras, swap when current burns out
- **Oil Flasks**: Refill lanterns (must wield lantern to refill)

**Starting Equipment**:
- Start with 1 lit torch + 2 unlit torches
- OR start with 1 lantern + 2 oil flasks (random choice)

**Light Source Progression**:
1. **Early game**: Manage torches carefully, scroun

ge for spares
2. **Mid game**: Find lantern, collect oil flasks
3. **Late game**: Discover artifacts (permanent solution)

**Strategy**:
- Light management adds tension to exploration
- Must balance exploration vs fuel conservation
- Artifacts are major power spikes

---

### 3.2.2 Field of View (FOV) System

**Algorithm**: Recursive Shadowcasting

**Vision Radius**: Determined by equipped light source (1-3 tiles)

**Implementation**:
- Divides FOV into 8 octants, scans row-by-row
- Tracks shadows cast by blocking cells
- Walls and closed doors block vision
- Secret doors appear as walls until discovered

**Line of Sight**: Walls, closed doors, and secret doors block vision

**Memory (Fog of War)**: Previously explored tiles remain visible but grayed out

**Recalculation**: FOV recomputed when:
- Player moves
- Light source changes (torch burns out, equip better light)
- Dungeon state changes (door opens/closes)

**Benefits**:
- Fast in confined dungeon spaces
- Only visits visible cells
- Accurate sight lines around corners
- Natural difficulty scaling with light sources

---

### 3.2.3 Visibility States & Color System

**Purpose**: Provide visual distinction between currently visible areas (FOV), previously explored areas (map memory), and unexplored areas.

**Three Visibility States**:

| State | Description | Rendering |
|-------|-------------|-----------|
| **Visible** | Currently in FOV | Full brightness, full color |
| **Explored** | Previously seen, not in FOV | Dimmed/desaturated, "memory" |
| **Unexplored** | Never seen before | Hidden (black) |

**Entity Rendering Rules by State**:

| Entity Type | Visible (in FOV) | Explored (memory) | Unexplored |
|-------------|------------------|-------------------|------------|
| **Player** | Full color @ | N/A (current position) | Hidden |
| **Monsters** | Full color A-Z | **NOT SHOWN** | Hidden |
| **Items** | Full color symbols | Dimmed (optional) | Hidden |
| **Gold** | Full color $ | Dimmed (optional) | Hidden |
| **Stairs** | Full color < > | Dimmed < > | Hidden |
| **Doors** | Full color + ' | Dimmed + ' | Hidden |
| **Walls** | Tan/brown | Dark gray | Hidden |
| **Floors** | Light brown | Medium gray | Hidden |
| **Corridors** | Brown | Dark gray | Hidden |
| **Traps** | Red ^ (if discovered) | Dimmed ^ (if discovered) | Hidden |

**Key Rendering Principles**:

1. **Monsters only visible in FOV**: Player can only see monster behavior and position when currently visible
2. **Terrain is remembered**: Walls, floors, corridors, and doors remain visible in explored areas (dimmed)
3. **Items/Gold optionally remembered**: Can be configured to show in memory (dimmed) or require FOV
4. **Dynamic entities hidden**: Monster positions, animations, and states only shown in current FOV
5. **Fog of war**: Explored tiles remain visible to help navigation and tactical planning

**Color Palette** (detailed in Section 5.1):

**Visible State** (in FOV):
- Walls: `#8B7355` (tan)
- Floors: `#A89078` (light brown)
- Corridors: `#6B5D52` (dark brown)
- Doors (closed): `#D4AF37` (golden)
- Doors (open): `#8B7355` (tan)
- Player: `#00FFFF` (cyan)
- Monsters: Varies by type (red/green/blue based on danger)
- Items: Varies by type (yellow/magenta/cyan)
- Gold: `#FFD700` (gold)
- Stairs: `#FFFFFF` (white)

**Explored State** (memory):
- Walls: `#4A4A4A` (dark gray)
- Floors: `#5A5A5A` (medium gray)
- Corridors: `#404040` (darker gray)
- Doors: `#6A6A6A` (gray)
- Monsters: **NOT SHOWN**
- Items: `#707070` (dim gray) - optional
- Gold: `#808080` (dim gray) - optional
- Stairs: `#9A9A9A` (light gray)

**Unexplored State**:
- Everything: `#000000` (black) or not rendered

**Implementation Notes**:
- Use CSS classes for state-based styling (e.g., `.tile-visible`, `.tile-explored`)
- RenderingService determines visibility state for each cell
- Explored state tracked in `Level.explored` boolean array
- FOV calculation updates visible cells each turn
- Explored cells marked true when first entered FOV, never reset

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

**Monster AI Behaviors** (detailed in Section 4.4):
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

Based on original Rogue formulas:

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

## 4. Technical Architecture

### 4.1 Technology Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **UI Rendering**: Vanilla TypeScript + DOM manipulation (NO framework)
- **Testing**: Jest (unit + integration tests)
- **Storage**: Browser LocalStorage (game saves)
- **Data Files**: JSON (monsters, items, config)

**Rationale for No Framework**:
- ASCII grid rendering is simple and performant with direct DOM manipulation
- Avoids framework overhead for a turn-based game
- Full control over rendering pipeline
- Smaller bundle size

---

### 4.2 Architecture Layers

```
┌──────────────────────────────────────────────────────────────┐
│  UI Layer (Vanilla TypeScript + DOM)                         │
│  - Renders game state to DOM                                 │
│  - Captures keyboard input                                   │
│  - Converts user input into Commands                         │
│  - NO game logic in UI layer                                 │
└──────────────────────────────────────────────────────────────┘
                             ↓
                    GameState (immutable)
                             ↓
┌──────────────────────────────────────────────────────────────┐
│  Command Layer (Orchestration)                               │
│  - MoveCommand, AttackCommand, UseItemCommand, etc.          │
│  - Implements ICommand interface                             │
│  - Orchestrates service calls                                │
│  - Returns new GameState                                     │
│  - NO game logic implementation, only orchestration          │
└──────────────────────────────────────────────────────────────┘
                             ↓
                    Calls multiple Services
                             ↓
┌──────────────────────────────────────────────────────────────┐
│  Service Layer (Game Logic)                                  │
│  - CombatService: Hit/damage calculations                    │
│  - MovementService: Position validation, collision           │
│  - DungeonService: Level generation, room/corridor creation  │
│  - InventoryService: Item management, equipment              │
│  - HungerService: Food tracking, hunger effects              │
│  - LevelingService: XP calculation, level-up                 │
│  - IdentificationService: Item name generation, identify     │
│  - MessageService: Action/combat log management              │
│  - FOVService: Field of view calculations (shadowcasting)    │
│  - PathfindingService: A* pathfinding for monster AI         │
│  - LightingService: Light source management, fuel tracking   │
│  - MonsterAIService: AI behavior decision-making             │
│  - RenderingService: Visibility states, color selection      │
│  - DebugService: Debug commands and visualizations           │
│  - RandomService: Seeded RNG (injectable for testing)        │
│  - Contains ALL game logic and rules                         │
└──────────────────────────────────────────────────────────────┘
                             ↓
                    Operates on Data
                             ↓
┌──────────────────────────────────────────────────────────────┐
│  Data Layer                                                  │
│  - GameState: Core game state (immutable updates)            │
│  - Data Files: /data/monsters.json, items.json, config.json  │
│  - LocalStorageService: Persistence wrapper                  │
└──────────────────────────────────────────────────────────────┘
```

**Design Principles**:
1. **Separation of Concerns**: Each layer has a single responsibility
2. **Immutability**: State updates return new objects (functional approach)
3. **Dependency Injection**: Services injected into Commands for testability
4. **No Logic Leakage**: UI has no game logic; Commands have no implementation details
5. **Pure Functions**: Services are stateless where possible

---

### 4.2.1 Test Organization Strategy

**Structure**: Modified Colocated with Scenario-Based Tests

Each service and command lives in its own folder containing:
- Source file(s) - Implementation code
- Scenario-based test files - Tests organized by feature/behavior
- Barrel export (index.ts) - Clean re-exports for imports

**Benefits**:
- Tests close to source for easy maintenance
- Clear scenario-based organization
- Folder isolation for each major component
- Simple imports via path aliases (`@services/ServiceName`)
- Scales well for complex services with multiple test scenarios

**Example Structure**:
```
src/services/FOVService/
├── FOVService.ts              # Implementation
├── shadowcasting.test.ts      # FOV algorithm tests
├── blocking.test.ts           # Vision blocking tests
├── radius.test.ts             # Light radius tests
└── index.ts                   # export { FOVService } from './FOVService'

src/commands/MoveCommand/
├── MoveCommand.ts             # Command implementation
├── movement.test.ts           # Basic movement tests
├── collision.test.ts          # Collision detection tests
├── fov-updates.test.ts        # FOV recalculation tests
└── index.ts                   # export { MoveCommand } from './MoveCommand'
```

**Test Naming Convention**: Use descriptive scenario names that describe **what** is tested:
- ✅ Good: `fuel-consumption.test.ts`, `smart-pathfinding.test.ts`, `hunger-penalties.test.ts`
- ✅ Good: `shadowcasting.test.ts`, `secret-door-discovery.test.ts`, `room-generation.test.ts`
- ❌ Avoid: `ServiceName.test.ts` (too broad), `test1.test.ts` (not descriptive), `methodName.test.ts` (tests implementation)

**Import Pattern**:
```typescript
// Clean imports using barrel exports
import { FOVService } from '@services/FOVService'
import { MoveCommand } from '@commands/MoveCommand'
import { RandomService } from '@services/RandomService'

// NOT: import { FOVService } from '@services/FOVService/FOVService'
```

---

### 4.3 Service Layer Details

#### CombatService

**Responsibilities**: All combat calculations and resolution

**Methods**:
```typescript
class CombatService {
  constructor(private random: IRandomService) {}

  calculateHit(attacker: Entity, defender: Entity): boolean
  calculateDamage(attacker: Entity, weapon: Weapon | null): number
  applyDamage(entity: Entity, damage: number): Entity
  resolveAttack(attacker: Entity, defender: Entity): CombatResult
  checkDeath(entity: Entity): boolean
}
```

**Dependencies**: RandomService

---

#### MovementService

**Responsibilities**: Position validation, collision detection, movement logic

**Methods**:
```typescript
class MovementService {
  canMoveTo(position: Position, level: Level): boolean
  moveEntity(entity: Entity, direction: Direction, level: Level): Entity
  getEntityAt(position: Position, state: GameState): Entity | null
  isWalkable(position: Position, level: Level): boolean
  getAdjacentPositions(position: Position): Position[]
}
```

**Dependencies**: None

---

#### DungeonService

**Responsibilities**: Procedural level generation with rooms, corridors, doors

**Methods**:
```typescript
class DungeonService {
  constructor(private random: IRandomService) {}

  generateLevel(depth: number, seed: string): Level
  placeRooms(config: DungeonConfig): Room[]
  connectRooms(rooms: Room[]): Corridor[]
  placeDoors(rooms: Room[], corridors: Corridor[]): Door[]
  placeStairs(level: Level): Level
  spawnMonsters(level: Level, depth: number): Monster[]
  spawnItems(level: Level, depth: number): Item[]
  spawnGold(level: Level): Gold[]
  ensureConnectivity(level: Level): boolean
  addLoops(graph: RoomGraph, loopChance: number): void
}
```

**Advanced Generation Features**:
- **Room Variety**: Random sizes (3x3 to 12x10)
- **Door Types**: Open (30%), Closed (40%), Locked (10%), Broken (5%), Secret (10%), Archway (5%)
- **Winding Corridors**: 30% chance to add bends
- **Loops**: Create multiple paths between rooms (30% chance)
- **Connectivity**: Minimum Spanning Tree + floodfill verification

**Algorithm**: Room + Corridor generation
1. Place random rooms (6-12 rooms, no overlap)
2. Build room graph (all possible connections)
3. Create Minimum Spanning Tree (ensures connectivity)
4. Add random loops (optional extra connections)
5. Connect rooms with L-shaped corridors (with bends)
6. Place doors at room entrances (varied types)
7. Verify full connectivity with floodfill
8. If disconnected, add emergency corridors

**Dependencies**: RandomService

---

#### InventoryService

**Responsibilities**: Item management and equipment

**Methods**:
```typescript
class InventoryService {
  addItem(inventory: Inventory, item: Item): Inventory
  removeItem(inventory: Inventory, itemId: string): Inventory
  equipWeapon(entity: Entity, weapon: Weapon): Entity
  equipArmor(entity: Entity, armor: Armor): Entity
  equipRing(entity: Entity, ring: Ring, slot: 'left' | 'right'): Entity
  unequipRing(entity: Entity, slot: 'left' | 'right'): Entity
  equipLightSource(entity: Entity, lightSource: LightSource): Entity
  canCarry(inventory: Inventory): boolean
  useConsumable(entity: Entity, item: Consumable): Entity
}
```

**Dependencies**: None

---

#### HungerService

**Responsibilities**: Hunger tracking and effects

**Methods**:
```typescript
class HungerService {
  tickHunger(entity: Entity, rings: Ring[]): Entity
  feed(entity: Entity, food: Food): Entity
  getHungerState(foodUnits: number): HungerState
  applyHungerEffects(entity: Entity): Entity
  calculateHungerRate(rings: Ring[]): number
}
```

**Hunger States**: Normal, Hungry, Weak, Starving

**Dependencies**: RandomService (for food randomization)

---

#### LevelingService

**Responsibilities**: Experience and level progression

**Methods**:
```typescript
class LevelingService {
  addExperience(entity: Entity, xp: number): Entity
  checkLevelUp(entity: Entity): boolean
  levelUp(entity: Entity): Entity
  getXPForLevel(level: number): number
  calculateXPReward(monster: Monster): number
}
```

**Dependencies**: None

---

#### IdentificationService

**Responsibilities**: Item identification and name generation

**Methods**:
```typescript
class IdentificationService {
  constructor(private random: IRandomService) {}

  generateItemNames(seed: string): ItemNameMap
  identifyItem(item: Item, state: GameState): GameState
  isIdentified(item: Item, state: GameState): boolean
  getDisplayName(item: Item, state: GameState): string
}
```

**Name Generation**: Seeded random mapping (consistent per game)

**Dependencies**: RandomService

---

#### MessageService

**Responsibilities**: Combat and action log management

**Methods**:
```typescript
class MessageService {
  addMessage(log: MessageLog, message: string): MessageLog
  addMessages(log: MessageLog, messages: string[]): MessageLog
  getRecentMessages(log: MessageLog, count: number): string[]
  clearLog(log: MessageLog): MessageLog
}
```

**Message Types**: Combat, item pickup, level change, hunger warnings, light warnings, death

**Dependencies**: None

---

#### FOVService

**Responsibilities**: Field of view calculations using recursive shadowcasting

**Methods**:
```typescript
class FOVService {
  computeFOV(
    origin: Position,
    radius: number,
    level: Level
  ): Set<Position>

  isInFOV(
    position: Position,
    visibleCells: Set<Position>
  ): boolean

  isBlocking(position: Position, level: Level): boolean

  // Internal: Process one octant of FOV
  private castLight(
    row: number,
    start: number,
    end: number,
    radius: number,
    xx: number, xy: number,
    yx: number, yy: number,
    origin: Position,
    level: Level,
    visible: Set<Position>
  ): void
}
```

**Algorithm**: Recursive shadowcasting (8 octant sweep)
- Transforms each octant to normalized coordinate space
- Tracks shadow ranges as it scans outward from origin
- Merges overlapping shadows to optimize
- Marks cells visible until blocked by walls/doors

**Dependencies**: None (pure geometry)

---

#### PathfindingService

**Responsibilities**: A* pathfinding for monster AI

**Methods**:
```typescript
class PathfindingService {
  findPath(
    start: Position,
    goal: Position,
    level: Level,
    options?: PathfindingOptions
  ): Position[] | null

  getNextStep(
    start: Position,
    goal: Position,
    level: Level
  ): Position | null

  isWalkable(
    position: Position,
    level: Level,
    entity?: Entity
  ): boolean

  // Heuristic distance estimation (Manhattan)
  private heuristic(a: Position, b: Position): number

  // Get valid adjacent positions
  private getNeighbors(
    position: Position,
    level: Level
  ): Position[]
}

interface PathfindingOptions {
  allowDiagonal?: boolean;
  maxPathLength?: number;
  avoidMonsters?: boolean;
  avoidTraps?: boolean;
}
```

**Algorithm**: A* search with priority queue
- Open list: Priority queue ordered by `f = g + h`
  - `g` = cost from start to current node
  - `h` = heuristic estimate to goal (Manhattan distance)
- Closed list: Set of evaluated positions
- Reconstructs path by backtracking through parent pointers

**Optimizations**:
- Early exit when goal reached
- Cache paths for 1-2 turns (invalidate on level change)
- Optional max path length to prevent expensive searches
- Jump point search for large open areas (future optimization)

**Dependencies**: None (pure pathfinding)

---

#### LightingService

**Responsibilities**: Light source management, fuel consumption, FOV radius calculation

**Methods**:
```typescript
class LightingService {
  constructor(private random: IRandomService) {}

  tickFuel(lightSource: LightSource): LightSource
  refillLantern(lantern: LightSource, oilFlask: Item): LightSource
  getLightRadius(lightSource: LightSource | null): number
  isFuelLow(lightSource: LightSource): boolean
  generateFuelWarning(lightSource: LightSource): string | null
  equipLightSource(player: Player, lightSource: LightSource): Player
}
```

**Fuel Tracking**:
- Torches: 500 turns, then extinguish
- Lanterns: Refillable, each oil flask = 500 turns
- Artifacts: Infinite (no fuel tracking)

**Warning Thresholds**:
- 50 turns: "Your torch is getting dim..."
- 10 turns: "Your torch flickers..."
- 0 turns: "Your torch goes out! You are in darkness!"

**Dependencies**: RandomService (for item spawning)

---

#### MonsterAIService

**Responsibilities**: AI behavior decision-making for all monsters

**Methods**:
```typescript
class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private random: IRandomService
  ) {}

  decideAction(monster: Monster, state: GameState): MonsterAction
  updateMonsterState(monster: Monster, state: GameState): Monster

  // Behavior implementations
  private smartBehavior(monster: Monster, state: GameState): MonsterAction
  private greedyBehavior(monster: Monster, state: GameState): MonsterAction
  private erraticBehavior(monster: Monster, state: GameState): MonsterAction
  private simpleBehavior(monster: Monster, state: GameState): MonsterAction
  private thiefBehavior(monster: Monster, state: GameState): MonsterAction
  private stationaryBehavior(monster: Monster, state: GameState): MonsterAction

  // Utilities
  private canSeePlayer(monster: Monster, state: GameState): boolean
  private findNearestGold(monster: Monster, state: GameState): Position | null
  private flee(monster: Monster, state: GameState): MonsterAction
}
```

**AI Behaviors**:

| Behavior | Description | Used By |
|----------|-------------|---------|
| **SMART** | Full A* pathfinding, tactical positioning | Dragon, Jabberwock, Centaur, Griffin, Medusa, Wraith, Vampire, Ur-vile, Phantom |
| **GREEDY** | Prioritizes gold over player, uses A* | Orc, Leprechaun (with THIEF) |
| **ERRATIC** | 50% random, 50% toward player | Bat, Kestrel |
| **SIMPLE** | Direct greedy movement (no pathfinding) | Emu, Hobgoblin, Snake, Troll, Zombie, Aquator, Ice Monster, Quagga, Rattlesnake, Yeti, Xeroc |
| **STATIONARY** | Doesn't move, waits for player | Venus Flytrap |
| **THIEF** | Steals then flees using A* | Leprechaun (gold), Nymph (items) |
| **COWARD** | Flees when HP < 30% | Vampire (combined with SMART) |

**State Machine**:
```typescript
enum MonsterState {
  SLEEPING,    // Initial, not aware of player
  WANDERING,   // Moving randomly
  HUNTING,     // Chasing player
  FLEEING,     // Running away
}
```

**Wake-Up Conditions**:
- Player enters monster's FOV
- Player attacks from range
- Player enters adjacent tile

**Dependencies**: PathfindingService, RandomService

---

#### DebugService

**Responsibilities**: Debug commands, visualizations, and cheats for development

**Methods**:
```typescript
class DebugService {
  isEnabled: boolean;

  // Command handlers
  toggleGodMode(): void
  teleportTo(level: number): GameState
  spawnMonster(letter: string, position: Position): GameState
  spawnItem(type: ItemType, position: Position): GameState
  revealMap(state: GameState): GameState
  identifyAll(state: GameState): GameState
  showSeed(state: GameState): string
  toggleFOVDebug(): void
  toggleAIDebug(): void
  togglePathDebug(): void
  giveInfiniteLight(): GameState

  // Overlay rendering
  renderFOVOverlay(state: GameState): void
  renderPathOverlay(monsters: Monster[]): void
  renderAIStateOverlay(monsters: Monster[]): void
}
```

**Debug Commands**:

| Key | Command | Effect |
|-----|---------|--------|
| `~` | Toggle Debug Console | Show/hide debug panel |
| `g` | God Mode | Invincible, infinite hunger/light |
| `t` | Teleport | Jump to any level |
| `m` | Spawn Monster | Create monster at cursor |
| `i` | Spawn Item | Create item at cursor |
| `v` | Reveal Map | Show entire level |
| `a` | Identify All | Reveal all item identities |
| `l` | Infinite Light | Permanent radius 3 light |
| `f` | Toggle FOV Debug | Highlight visible tiles |
| `p` | Toggle Path Debug | Show A* paths |
| `n` | Toggle AI Debug | Display monster states |

**Visual Overlays**:
- **FOV Debug**: Highlights visible tiles in green
- **Path Debug**: Shows A* paths as red lines
- **AI Debug**: Displays state above monsters (e.g., "HUNTING")
- **Seed Display**: Shows current seed in corner

**Dependencies**: All services (for command execution)

---

#### RenderingService

**Responsibilities**: Determine visibility states, apply color schemes, filter entity rendering

**Methods**:
```typescript
class RenderingService {
  constructor(
    private fovService: FOVService
  ) {}

  // Visibility state determination
  getVisibilityState(
    position: Position,
    visibleCells: Set<Position>,
    level: Level
  ): 'visible' | 'explored' | 'unexplored'

  // Entity rendering decisions
  shouldRenderEntity(
    entityPosition: Position,
    entityType: 'monster' | 'item' | 'gold' | 'stairs' | 'trap',
    visibilityState: 'visible' | 'explored' | 'unexplored',
    config: RenderConfig
  ): boolean

  // Color selection
  getColorForTile(
    tile: Tile,
    visibilityState: 'visible' | 'explored' | 'unexplored'
  ): string

  getColorForEntity(
    entity: Monster | Item | GoldPile,
    visibilityState: 'visible' | 'explored' | 'unexplored'
  ): string

  // CSS class generation
  getCSSClass(
    visibilityState: 'visible' | 'explored' | 'unexplored',
    entityType?: string
  ): string
}
```

**Visibility Logic**:
```typescript
getVisibilityState(position, visibleCells, level):
  if position in visibleCells:
    return 'visible'
  else if level.explored[position.y][position.x]:
    return 'explored'
  else:
    return 'unexplored'
```

**Entity Rendering Rules**:
- **Monsters**: Only render if `visibilityState === 'visible'`
- **Items/Gold**: Render if `visible`, optionally if `explored` (config)
- **Stairs**: Render if `visible` or `explored`
- **Traps**: Render if discovered AND (`visible` or `explored`)
- **Terrain**: Render if `visible` or `explored`

**Color Mappings** (detailed in Section 5.1):
- Visible state: Full color palette
- Explored state: Grayscale variants
- Unexplored state: Black/hidden

**Dependencies**: FOVService

---

#### RandomService (Injectable Interface)

**Responsibilities**: Centralized RNG for deterministic testing

**Interface**:
```typescript
interface IRandomService {
  nextInt(min: number, max: number): number
  roll(dice: string): number  // e.g., "2d8", "1d20+3"
  shuffle<T>(array: T[]): T[]
  chance(probability: number): boolean  // 0.0 to 1.0
  pickRandom<T>(array: T[]): T
}
```

**Implementations**:
1. **SeededRandom**: Uses seed string for reproducibility
2. **MockRandom**: Returns predefined values for testing

**Usage**: Injected into services that need randomness (Combat, Dungeon, Hunger, Identification, Lighting, AI)

---

### 4.4 Monster AI System

#### AI Behavior Profiles

Each monster has an AI profile defining its intelligence and behavior:

```typescript
interface MonsterAIProfile {
  behavior: MonsterBehavior | MonsterBehavior[];  // Can have multiple
  intelligence: number;    // 1-10 scale
  aggroRange: number;      // Distance to wake up (tiles)
  fleeThreshold: number;   // HP % to flee (0.0-1.0)
  special: string[];       // Special behavior flags
}
```

#### Complete Monster AI Table

| Monster | Behavior | Intelligence | Aggro Range | Flee @ | Special Notes |
|---------|----------|--------------|-------------|--------|---------------|
| Aquator | SIMPLE | 3 | 5 | Never | Seeks armor to rust |
| Bat | ERRATIC | 2 | 8 | Never | Flying, ignores some terrain |
| Centaur | SMART | 6 | 10 | 0.20 | Good tactical sense |
| Dragon | SMART | 8 | 15 | 0.15 | Uses breath weapon tactically |
| Emu | SIMPLE | 2 | 6 | Never | Mean, always awake |
| Venus Flytrap | STATIONARY | 1 | 1 | Never | Doesn't move, holds player |
| Griffin | SMART | 7 | 12 | 0.25 | Flying, regenerates |
| Hobgoblin | SIMPLE | 4 | 7 | Never | Mean, always awake |
| Ice Monster | SIMPLE | 3 | 6 | 0.50 | Freezes then backs off |
| Jabberwock | SMART | 8 | 15 | Never | Boss-tier, very aggressive |
| Kestrel | ERRATIC | 2 | 8 | 0.40 | Mean, flying |
| Leprechaun | THIEF + GREEDY | 7 | 10 | 0.30 | Steals gold, flees after |
| Medusa | SMART | 7 | 12 | 0.30 | Confusion tactics |
| Nymph | THIEF | 6 | 10 | 0.20 | Steals item, teleports away |
| Orc | GREEDY | 5 | 8 | 0.25 | Prioritizes gold over player |
| Phantom | SMART | 6 | 12 | 0.30 | Invisible, uses stealth |
| Quagga | SIMPLE | 3 | 6 | Never | Mean, always awake |
| Rattlesnake | SIMPLE | 3 | 5 | 0.40 | Strength drain attack |
| Snake | SIMPLE | 2 | 5 | Never | Mean, always awake |
| Troll | SIMPLE | 4 | 8 | 0.20 | Regenerates, persistent |
| Ur-vile | SMART | 7 | 12 | Never | Mean, tough, smart |
| Vampire | SMART + COWARD | 7 | 12 | 0.30 | Regenerates, drains max HP |
| Wraith | SMART | 6 | 10 | 0.35 | Drains XP strategically |
| Xeroc | SIMPLE | 4 | 7 | 0.30 | Basic chaser |
| Yeti | SIMPLE | 3 | 8 | 0.25 | Two attacks |
| Zombie | SIMPLE | 1 | 6 | Never | Mean, always awake, slow |

#### AI Decision Tree

```typescript
class MonsterAIService {
  decideAction(monster: Monster, state: GameState): MonsterAction {
    const profile = monster.aiProfile;

    // 1. Check wake-up conditions
    if (monster.state === MonsterState.SLEEPING) {
      if (this.canSeePlayer(monster, state) ||
          this.isPlayerAdjacent(monster, state)) {
        monster.state = MonsterState.HUNTING;
      } else {
        return { type: 'wait' };
      }
    }

    // 2. Check flee condition
    const hpPercent = monster.hp / monster.maxHp;
    if (hpPercent < profile.fleeThreshold && profile.fleeThreshold > 0) {
      monster.state = MonsterState.FLEEING;
    }

    // 3. Execute behavior based on state
    switch (monster.state) {
      case MonsterState.SLEEPING:
        return { type: 'wait' };

      case MonsterState.WANDERING:
        // Random movement
        return this.wander(monster, state);

      case MonsterState.HUNTING:
        // Execute primary behavior
        return this.executeBehavior(monster, state, profile.behavior);

      case MonsterState.FLEEING:
        return this.flee(monster, state);
    }
  }

  private executeBehavior(
    monster: Monster,
    state: GameState,
    behavior: MonsterBehavior
  ): MonsterAction {
    switch (behavior) {
      case MonsterBehavior.SMART:
        // Full A* pathfinding
        const path = this.pathfinding.findPath(
          monster.position,
          state.player.position,
          state.currentLevel
        );
        return path ? { type: 'move', position: path[0] } : this.wander(monster, state);

      case MonsterBehavior.GREEDY:
        // Check for nearby gold
        const gold = this.findNearestGold(monster, state);
        if (gold && this.distance(monster.position, gold) <
                     this.distance(monster.position, state.player.position)) {
          // Go for gold instead of player
          const path = this.pathfinding.findPath(monster.position, gold, state.currentLevel);
          return path ? { type: 'move', position: path[0] } : this.simpleBehavior(monster, state);
        }
        // Otherwise chase player with A*
        return this.smartBehavior(monster, state);

      case MonsterBehavior.ERRATIC:
        // 50% random, 50% toward player
        if (this.random.chance(0.5)) {
          return this.wander(monster, state);
        } else {
          return this.simpleBehavior(monster, state);
        }

      case MonsterBehavior.SIMPLE:
        // Greedy movement (pick adjacent tile closest to player)
        return this.simpleBehavior(monster, state);

      case MonsterBehavior.STATIONARY:
        // Don't move
        return { type: 'wait' };

      case MonsterBehavior.THIEF:
        // If already stole, flee
        if (monster.hasStolen) {
          return this.flee(monster, state);
        }
        // Otherwise approach player with A*
        return this.smartBehavior(monster, state);
    }
  }

  private simpleBehavior(monster: Monster, state: GameState): MonsterAction {
    // Greedy movement: pick adjacent square closest to player
    const neighbors = this.getWalkableNeighbors(monster.position, state);
    if (neighbors.length === 0) return { type: 'wait' };

    const player = state.player.position;
    const closest = neighbors.reduce((best, pos) =>
      this.distance(pos, player) < this.distance(best, player) ? pos : best
    );

    return { type: 'move', position: closest };
  }
}
```

---

### 4.5 Advanced Dungeon Generation

#### Room + Corridor Algorithm

**Goals**:
- Variable room sizes and shapes
- Multiple door types (open, closed, locked, secret, broken, archway)
- Winding corridors with natural feel
- Loops for multiple paths
- Guaranteed full connectivity (no isolated rooms)

#### Generation Configuration

```typescript
interface DungeonConfig {
  // Room parameters
  minRooms: 6;
  maxRooms: 12;
  minRoomWidth: 3;
  maxRoomWidth: 12;
  minRoomHeight: 3;
  maxRoomHeight: 10;
  roomPlacementAttempts: 100;  // Try N times to place each room

  // Door distribution
  doorTypes: {
    open: 0.30,      // 30% already open
    closed: 0.40,    // 40% closed (can open)
    locked: 0.10,    // 10% locked (need key)
    broken: 0.05,    // 5% broken (always open, can't close)
    secret: 0.10,    // 10% secret (hidden until searched)
    archway: 0.05,   // 5% archway (no door)
  };

  // Corridor parameters
  corridorWindiness: 0.3;  // 30% chance to add bend
  bendChance: 0.5;         // At each turn, 50% to bend
  allowLoops: true;        // Create loops between rooms
  loopChance: 0.3;         // 30% of non-MST edges become loops

  // Connectivity
  minDoors PerRoom: 1;
  maxDoorsPerRoom: 4;
  ensureFullConnectivity: true;
}
```

#### Door Types

```typescript
enum DoorState {
  OPEN,        // Can walk through, doesn't block vision
  CLOSED,      // Must open (press 'o'), blocks vision
  LOCKED,      // Need key to open, blocks vision
  BROKEN,      // Permanently open, can't close
  SECRET,      // Hidden (appears as wall '#'), found via search
  ARCHWAY,     // No door, just opening
}

interface Door {
  position: Position;
  state: DoorState;
  discovered: boolean;      // For secret doors
  orientation: 'horizontal' | 'vertical';
  connectsRooms: [number, number];  // Room IDs
}
```

#### Generation Steps

```typescript
class DungeonService {
  generateLevel(depth: number, seed: string): Level {
    const config = this.loadConfig();

    // 1. Initialize empty level
    const level = this.createEmptyLevel(config.width, config.height, depth);

    // 2. Place rooms (with overlap prevention)
    const rooms = this.placeRooms(level, config);

    // 3. Build room connection graph
    const graph = this.buildRoomGraph(rooms);

    // 4. Create Minimum Spanning Tree (ensures connectivity)
    const mst = this.minimumSpanningTree(graph);

    // 5. Connect MST rooms with corridors
    for (const edge of mst) {
      this.connectRooms(level, edge.roomA, edge.roomB, config);
    }

    // 6. Add loops (extra connections for alternate routes)
    if (config.allowLoops) {
      this.addLoops(level, graph, mst, config.loopChance);
    }

    // 7. Place doors at room/corridor junctions
    const doors = this.placeDoors(level, rooms, config.doorTypes);

    // 8. Verify full connectivity
    if (!this.isFullyConnected(level, rooms)) {
      console.warn('Dungeon not fully connected, adding emergency corridors');
      this.ensureConnectivity(level, rooms);
    }

    // 9. Place stairs
    this.placeStairs(level, rooms);

    // 10. Spawn entities
    this.spawnMonsters(level, depth);
    this.spawnItems(level, depth);
    this.spawnGold(level);

    return level;
  }

  private placeRooms(level: Level, config: DungeonConfig): Room[] {
    const rooms: Room[] = [];
    const targetCount = this.random.nextInt(config.minRooms, config.maxRooms);

    for (let attempts = 0; attempts < config.roomPlacementAttempts && rooms.length < targetCount; attempts++) {
      const width = this.random.nextInt(config.minRoomWidth, config.maxRoomWidth);
      const height = this.random.nextInt(config.minRoomHeight, config.maxRoomHeight);
      const x = this.random.nextInt(1, level.width - width - 1);
      const y = this.random.nextInt(1, level.height - height - 1);

      const newRoom = { x, y, width, height, id: rooms.length };

      // Check for overlap with existing rooms (with 1-tile buffer)
      if (!this.overlapsAny(newRoom, rooms)) {
        this.carveRoom(level, newRoom);
        rooms.push(newRoom);
      }
    }

    return rooms;
  }

  private connectRooms(level: Level, roomA: Room, roomB: Room, config: DungeonConfig): void {
    // Create L-shaped corridor with potential winding
    const startA = this.getRandomPoint(roomA);
    const startB = this.getRandomPoint(roomB);

    // Choose random elbow point
    const useHorizontalFirst = this.random.chance(0.5);

    if (useHorizontalFirst) {
      // Go horizontal first, then vertical
      this.carveCorridor(level, startA, { x: startB.x, y: startA.y }, config.corridorWindiness);
      this.carveCorridor(level, { x: startB.x, y: startA.y }, startB, config.corridorWindiness);
    } else {
      // Go vertical first, then horizontal
      this.carveCorridor(level, startA, { x: startA.x, y: startB.y }, config.corridorWindiness);
      this.carveCorridor(level, { x: startA.x, y: startB.y }, startB, config.corridorWindiness);
    }
  }

  private carveCorridor(level: Level, start: Position, end: Position, windiness: number): void {
    let current = { ...start };
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);

    // Carve path with potential bends
    while (current.x !== end.x || current.y !== end.y) {
      level.tiles[current.x][current.y] = this.createCorridorTile();

      // Add random bends for natural feel
      if (this.random.chance(windiness)) {
        // Randomly choose to go horizontal or vertical this step
        if (this.random.chance(0.5) && current.x !== end.x) {
          current.x += dx;
        } else if (current.y !== end.y) {
          current.y += dy;
        }
      } else {
        // Standard movement (prefer primary direction)
        if (dx !== 0 && current.x !== end.x) {
          current.x += dx;
        } else if (dy !== 0 && current.y !== end.y) {
          current.y += dy;
        }
      }
    }
  }

  private minimumSpanningTree(graph: RoomGraph): Edge[] {
    // Prim's algorithm for MST
    const mst: Edge[] = [];
    const visited = new Set<number>();
    const edges = [...graph.edges].sort((a, b) => a.weight - b.weight);

    // Start with first room
    visited.add(0);

    while (visited.size < graph.rooms.length) {
      // Find cheapest edge connecting visited to unvisited
      const nextEdge = edges.find(e =>
        (visited.has(e.roomA) && !visited.has(e.roomB)) ||
        (visited.has(e.roomB) && !visited.has(e.roomA))
      );

      if (!nextEdge) break; // Shouldn't happen, but safety

      mst.push(nextEdge);
      visited.add(nextEdge.roomA);
      visited.add(nextEdge.roomB);
    }

    return mst;
  }

  private addLoops(level: Level, graph: RoomGraph, mst: Edge[], loopChance: number): void {
    // Add extra connections (not in MST) to create loops
    const unusedEdges = graph.edges.filter(e => !mst.includes(e));

    for (const edge of unusedEdges) {
      if (this.random.chance(loopChance)) {
        this.connectRooms(level,
          graph.rooms[edge.roomA],
          graph.rooms[edge.roomB],
          this.config
        );
      }
    }
  }

  private placeDoors(level: Level, rooms: Room[], doorTypes: DoorTypeDistribution): Door[] {
    const doors: Door[] = [];

    // Find all room entrances (where corridor meets room)
    for (const room of rooms) {
      const entrances = this.findRoomEntrances(level, room);

      for (const pos of entrances) {
        const doorType = this.chooseDoorType(doorTypes);
        const door: Door = {
          position: pos,
          state: doorType,
          discovered: doorType !== DoorState.SECRET,
          orientation: this.getDoorOrientation(level, pos),
          connectsRooms: [room.id, -1],  // -1 = corridor
        };

        doors.push(door);
        this.placeDoorTile(level, door);
      }
    }

    return doors;
  }

  private isFullyConnected(level: Level, rooms: Room[]): boolean {
    // Floodfill from first room to check all reachable
    const visited = new Set<number>();
    const queue = [rooms[0].id];

    while (queue.length > 0) {
      const roomId = queue.shift()!;
      if (visited.has(roomId)) continue;
      visited.add(roomId);

      // Find connected rooms via corridors
      const connected = this.getConnectedRooms(level, rooms[roomId], rooms);
      for (const connectedId of connected) {
        if (!visited.has(connectedId)) {
          queue.push(connectedId);
        }
      }
    }

    return visited.size === rooms.length;
  }
}
```

---

### 4.6 Debug System

**Purpose**: Development tools for testing, debugging, and rapid iteration

#### Debug Console UI

```
┌─────────────────────────────────────────────┐
│ DEBUG CONSOLE (~ to toggle)                 │
│ ───────────────────────────────────────────│
│ Seed: abc123def456                          │
│ Turn: 542    Depth: 5                       │
│ FOV Debug: [ON]  AI Debug: [ON]            │
│ God Mode: [OFF]                             │
│                                             │
│ COMMANDS:                                   │
│  g - Toggle god mode (invincible)           │
│  t - Teleport to level (1-10)               │
│  m - Spawn monster (letter A-Z)             │
│  i - Spawn item (type)                      │
│  v - Reveal entire map                      │
│  a - Identify all items                     │
│  l - Infinite light (radius 3)              │
│  f - Toggle FOV overlay                     │
│  p - Toggle path overlay                    │
│  n - Toggle AI state overlay                │
│                                             │
│ MONSTER AI STATES:                          │
│  D (Dragon): HUNTING, Path: 12 tiles        │
│  O (Orc): GREEDY, Target: Gold (15,8)       │
│  B (Bat): ERRATIC, Random                   │
└─────────────────────────────────────────────┘
```

#### Debug Overlays

**FOV Overlay**:
- Highlights visible tiles in green
- Shows light radius boundary
- Displays blocked tiles in red

**Pathfinding Overlay**:
- Draws A* paths as red lines
- Shows path cost for each monster
- Indicates unreachable targets

**AI State Overlay**:
- Displays state above each monster:
  - `[S]` = SLEEPING
  - `[W]` = WANDERING
  - `[H]` = HUNTING
  - `[F]` = FLEEING
- Shows aggro range circle
- Indicates if can see player

#### Debug Commands Implementation

```typescript
class DebugService {
  private godMode: boolean = false;
  private fovDebug: boolean = false;
  private aiDebug: boolean = false;
  private pathDebug: boolean = false;

  isEnabled: boolean = process.env.NODE_ENV === 'development';

  handleInput(key: string, state: GameState): GameState | null {
    if (!this.isEnabled) return null;

    switch (key) {
      case '~':
        this.toggleConsole();
        return null;

      case 'g':
        this.godMode = !this.godMode;
        return this.applyGodMode(state);

      case 't':
        const level = prompt('Teleport to level (1-10):');
        return this.teleportTo(state, parseInt(level));

      case 'm':
        const letter = prompt('Spawn monster (A-Z):');
        return this.spawnMonster(state, letter, state.player.position);

      case 'i':
        const itemType = prompt('Item type (weapon/armor/potion/etc):');
        return this.spawnItem(state, itemType, state.player.position);

      case 'v':
        return this.revealMap(state);

      case 'a':
        return this.identifyAll(state);

      case 'l':
        return this.giveInfiniteLight(state);

      case 'f':
        this.fovDebug = !this.fovDebug;
        return null;

      case 'p':
        this.pathDebug = !this.pathDebug;
        return null;

      case 'n':
        this.aiDebug = !this.aiDebug;
        return null;

      default:
        return null;
    }
  }

  private applyGodMode(state: GameState): GameState {
    if (this.godMode) {
      return {
        ...state,
        player: {
          ...state.player,
          hp: 9999,
          maxHp: 9999,
          foodUnits: 9999,
          lightSource: { radius: 3, isPermanent: true },
        }
      };
    }
    return state;
  }

  renderOverlays(state: GameState, canvas: HTMLCanvasElement): void {
    if (!this.isEnabled) return;

    if (this.fovDebug) {
      this.renderFOVOverlay(state, canvas);
    }

    if (this.pathDebug) {
      this.renderPathOverlay(state, canvas);
    }

    if (this.aiDebug) {
      this.renderAIStateOverlay(state, canvas);
    }
  }
}
```

---

### 4.7 Command Layer Details

**Command Pattern** for user actions:

```typescript
interface ICommand {
  execute(state: GameState): GameState;
}
```

**Example Commands**:

#### MoveCommand
```typescript
class MoveCommand implements ICommand {
  constructor(
    private direction: Direction,
    private movementService: MovementService,
    private combatService: CombatService,
    private hungerService: HungerService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    // 1. Calculate new position
    // 2. Check if blocked by wall (via MovementService)
    // 3. Check if monster at position (via MovementService)
    //    - If monster, initiate combat (via CombatService)
    //    - Add combat messages (via MessageService)
    // 4. If clear, move player (via MovementService)
    // 5. Tick hunger (via HungerService)
    // 6. Tick light fuel (via LightingService)
    // 7. Recompute FOV (via FOVService)
    // 8. Return new state
  }
}
```

**Key Points**:
- Commands orchestrate multiple services
- Commands contain NO game logic (only coordination)
- All logic lives in services
- Commands are easily testable (mock services)

---

### 4.8 Data Structures

#### GameState
```typescript
interface GameState {
  player: Player;
  currentLevel: number;
  levels: Map<number, Level>;  // 1-10, persisted per game
  messageLog: string[];
  turnCount: number;
  seed: string;  // For level generation and item names
  itemNames: ItemNameMap;  // Generated at game start
  identifiedItems: Set<ItemType>;  // Tracks identified item types
  hasAmulet: boolean;
  gameId: string;  // Unique ID for save system
  isGameOver: boolean;
  isVictory: boolean;
  debugMode: boolean;
}
```

#### Player
```typescript
interface Player {
  id: string;
  position: Position;
  hp: number;
  maxHp: number;
  strength: number;
  maxStrength: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  armorClass: number;
  inventory: Item[];
  equipped: Equipment;
  foodUnits: number;
  lightSource: LightSource | null;
  effects: StatusEffect[];  // Confusion, blindness, etc.
  visibleCells: Set<Position>;  // Computed by FOVService
}
```

#### Equipment
```typescript
interface Equipment {
  weapon: Weapon | null;
  armor: Armor | null;
  leftRing: Ring | null;
  rightRing: Ring | null;
  lightSource: LightSource | null;
}
```

#### LightSource
```typescript
interface LightSource {
  type: 'torch' | 'lantern' | 'artifact';
  radius: number;  // 1-3 tiles
  isPermanent: boolean;
  fuel?: number;  // Current fuel (for consumables)
  maxFuel?: number;  // Max fuel capacity
  name: string;  // "Torch", "Lantern", "Phial of Galadriel"
}
```

#### Monster
```typescript
interface Monster {
  id: string;
  letter: string;  // 'A' for Aquator, 'O' for Orc, etc.
  name: string;
  position: Position;
  hp: number;
  maxHp: number;
  ac: number;
  damage: string;  // Dice notation: "1d8", "2d4", etc.
  xpValue: number;
  flags: MonsterFlag[];  // MEAN, FLYING, REGENERATES, INVISIBLE, etc.
  aiProfile: MonsterAIProfile;
  state: MonsterState;  // SLEEPING, WANDERING, HUNTING, FLEEING
  visibleCells: Set<Position>;  // Computed by FOVService when awake
  currentPath: Position[] | null;  // Cached A* path
  hasStolen: boolean;  // For thief monsters
  level: number;  // Dungeon level where spawned
}
```

#### Level
```typescript
interface Level {
  depth: number;  // 1-10
  width: number;  // e.g., 80
  height: number;  // e.g., 22
  tiles: Tile[][];  // 2D array of terrain
  rooms: Room[];
  doors: Door[];
  monsters: Monster[];
  items: Item[];
  gold: GoldPile[];
  stairsUp: Position | null;
  stairsDown: Position | null;
  explored: boolean[][];  // Fog of war / memory
}
```

#### Door
```typescript
enum DoorState {
  OPEN,
  CLOSED,
  LOCKED,
  BROKEN,
  SECRET,
  ARCHWAY,
}

interface Door {
  position: Position;
  state: DoorState;
  discovered: boolean;  // For secret doors
  orientation: 'horizontal' | 'vertical';
  connectsRooms: [number, number];  // Room IDs
}
```

#### Tile
```typescript
enum TileType {
  WALL,
  FLOOR,
  CORRIDOR,
  DOOR,
  TRAP
}

interface Tile {
  type: TileType;
  char: string;  // Display character
  walkable: boolean;
  transparent: boolean;  // For FOV calculations
  colorVisible: string;  // Hex color when in FOV (e.g., "#8B7355")
  colorExplored: string;  // Hex color when in memory (e.g., "#4A4A4A")
}
```

---

### 4.9 Data Files (JSON)

All game content stored in `/data/*.json`:

#### `/data/monsters.json`
```json
[
  {
    "letter": "A",
    "name": "Aquator",
    "hp": "5d8",
    "ac": 2,
    "damage": "0d0",
    "xp": 20,
    "flags": ["RUSTS_ARMOR"],
    "aiProfile": {
      "behavior": "SIMPLE",
      "intelligence": 3,
      "aggroRange": 5,
      "fleeThreshold": 0.0
    },
    "sleepChance": 0.5,
    "minLevel": 1,
    "maxLevel": 10
  },
  {
    "letter": "B",
    "name": "Bat",
    "hp": "1d8",
    "ac": 3,
    "damage": "1d2",
    "xp": 5,
    "flags": ["FLYING", "ERRATIC"],
    "aiProfile": {
      "behavior": "ERRATIC",
      "intelligence": 2,
      "aggroRange": 8,
      "fleeThreshold": 0.0
    },
    "sleepChance": 0.3,
    "minLevel": 1,
    "maxLevel": 5
  },
  {
    "letter": "D",
    "name": "Dragon",
    "hp": "10d8",
    "ac": -1,
    "damage": "1d8/1d8/3d10",
    "xp": 6800,
    "flags": ["FLYING", "FLAME_BREATH"],
    "aiProfile": {
      "behavior": "SMART",
      "intelligence": 8,
      "aggroRange": 15,
      "fleeThreshold": 0.15
    },
    "sleepChance": 0.7,
    "minLevel": 7,
    "maxLevel": 10
  }
  // ... 23 more monsters
]
```

#### `/data/items.json`
```json
{
  "weapons": [
    {
      "name": "Mace",
      "damage": "2d4",
      "rarity": "common"
    },
    {
      "name": "Long Sword",
      "damage": "1d12",
      "rarity": "uncommon"
    }
  ],
  "armor": [
    {
      "name": "Leather Armor",
      "ac": 8,
      "rarity": "common"
    },
    {
      "name": "Chain Mail",
      "ac": 5,
      "rarity": "uncommon"
    }
  ],
  "lightSources": [
    {
      "type": "torch",
      "name": "Torch",
      "radius": 1,
      "fuel": 500,
      "rarity": "common"
    },
    {
      "type": "lantern",
      "name": "Lantern",
      "radius": 2,
      "fuel": 500,
      "rarity": "uncommon"
    },
    {
      "type": "artifact",
      "name": "Phial of Galadriel",
      "radius": 3,
      "isPermanent": true,
      "rarity": "legendary"
    }
  ],
  "potions": [
    {
      "type": "HEAL",
      "effect": "restore_hp",
      "power": "1d8",
      "descriptors": ["blue", "red", "clear", "fizzy", "dark"]
    }
  ],
  "scrolls": [
    {
      "type": "IDENTIFY",
      "effect": "identify_item",
      "labels": ["XYZZY", "ELBERETH", "NR 9", "FOOBAR"]
    }
  ],
  "rings": [
    {
      "type": "PROTECTION",
      "effect": "ac_bonus",
      "power": "1d3",
      "hungerModifier": 1.5,
      "materials": ["ruby", "sapphire", "iron", "wooden", "ivory"]
    }
  ],
  "wands": [
    {
      "type": "LIGHTNING",
      "damage": "6d6",
      "charges": "3d3",
      "woods": ["oak", "pine", "metal", "crystal"]
    }
  ],
  "food": [
    {
      "name": "Food Ration",
      "nutrition": "1100-1499"
    }
  ],
  "consumables": [
    {
      "name": "Oil Flask",
      "type": "lantern_fuel",
      "fuelAmount": 500
    }
  ]
}
```

#### `/data/config.json`
```json
{
  "player": {
    "startingHp": 12,
    "startingStrength": 16,
    "startingAC": 10,
    "startingGold": 0,
    "startingFood": 1300,
    "startingLight": {
      "type": "torch",
      "fuel": 500
    }
  },
  "lighting": {
    "torchRadius": 1,
    "torchFuel": 500,
    "lanternRadius": 2,
    "lanternFuel": 500,
    "oilFlaskFuel": 500,
    "artifactRadius": 3,
    "fuelWarningThresholds": [50, 10, 0]
  },
  "fov": {
    "lightWalls": true
  },
  "hunger": {
    "maxFood": 2000,
    "hungryThreshold": 300,
    "weakThreshold": 150,
    "baseDepletion": 1,
    "ringMultiplier": 1.5
  },
  "dungeon": {
    "levelCount": 10,
    "width": 80,
    "height": 22,
    "minRooms": 6,
    "maxRooms": 12,
    "minRoomWidth": 3,
    "maxRoomWidth": 12,
    "minRoomHeight": 3,
    "maxRoomHeight": 10,
    "corridorWindiness": 0.3,
    "allowLoops": true,
    "loopChance": 0.3,
    "doorTypes": {
      "open": 0.30,
      "closed": 0.40,
      "locked": 0.10,
      "broken": 0.05,
      "secret": 0.10,
      "archway": 0.05
    }
  },
  "ai": {
    "pathfindingMaxDepth": 30,
    "pathCacheTurns": 2
  },
  "combat": {
    "baseToHit": 1,
    "sleepingBonus": 4
  },
  "leveling": {
    "xpCurve": [0, 10, 30, 60, 100, 150, 210, 280, 360, 450]
  },
  "debug": {
    "enabled": true,
    "godMode": false,
    "showSeed": true
  }
}
```

---

## 5. UI/UX Design

### 5.1 Visual Design Philosophy

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

**Background**: Dark gray/black (`#1a1a1a`)

**VISIBLE STATE** (Currently in FOV):

*Terrain*:
- **Walls**: Tan (`#8B7355`)
- **Floors**: Light brown (`#A89078`)
- **Corridors**: Dark brown (`#6B5D52`)
- **Doors (closed)**: Golden (`#D4AF37`)
- **Doors (open)**: Tan (`#8B7355`)
- **Doors (secret)**: Same as wall until discovered
- **Stairs**: White (`#FFFFFF`)
- **Traps**: Red (`#FF4444`) - if discovered

*Entities*:
- **Player**: Bright cyan (`#00FFFF`)
- **Monsters**:
  - Low threat (A-E): Green (`#44FF44`)
  - Medium threat (F-P): Yellow (`#FFDD00`)
  - High threat (Q-U): Orange (`#FF8800`)
  - Boss tier (V-Z): Red (`#FF4444`)
- **Items**:
  - Gold: Gold (`#FFD700`)
  - Food: Green (`#44FF44`)
  - Light sources (torch): Orange (`#FFAA00`)
  - Light sources (lantern): Yellow (`#FFD700`)
  - Potions: Magenta (`#FF00FF`)
  - Scrolls: Cyan (`#00FFFF`)
  - Weapons: White (`#FFFFFF`)
  - Armor: Silver (`#C0C0C0`)
  - Rings: Purple (`#9370DB`)
  - Wands: Blue (`#4444FF`)
  - Amulet of Yendor: Bright gold (`#FFD700`)

**EXPLORED STATE** (Previously seen, map memory):

*Terrain*:
- **Walls**: Dark gray (`#4A4A4A`)
- **Floors**: Medium gray (`#5A5A5A`)
- **Corridors**: Darker gray (`#404040`)
- **Doors**: Gray (`#6A6A6A`)
- **Stairs**: Light gray (`#9A9A9A`)
- **Traps**: Dark red (`#442222`) - if discovered

*Entities*:
- **Monsters**: **NOT RENDERED** (only visible in FOV)
- **Items**: Optional - Dim gray (`#707070`)
- **Gold**: Optional - Dim gray (`#808080`)

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

### 5.2 Layout

**Responsive Design**: Fixed aspect ratio, scales to fit screen

```
┌────────────────────────────────────────────────────────────────────┐
│  TITLE BAR                                           [~] Debug      │
│  Roguelike: The Quest for the Amulet          Seed: abc123def      │
├────────────────────────────────────────────────────────────────────┤
│  MESSAGE LOG (5 lines, scrolling)                                  │
│  > You hit the Orc for 5 damage.                                   │
│  > The Orc attacks you for 3 damage!                               │
│  > Your torch is getting dim...                                    │
│  > You feel hungry.                                                │
│  >                                                                 │
├──────────────────────────────────────────────┬─────────────────────┤
│                                              │  STATS              │
│                                              │                     │
│         DUNGEON VIEW (80x22)                 │  HP:    24/30  ████ │
│                                              │  Str:   16/16       │
│                                              │  AC:    4           │
│  #################                           │  Lvl:   3           │
│  #...............#      ######               │  XP:    156/300     │
│  #...@...........+######+....#               │  Gold:  247         │
│  #...............#      #....#               │  Depth: 5           │
│  #...........O...#      #....#               │                     │
│  #################      ######               │  HUNGER             │
│                                              │  [████████████░░]   │
│                                              │  Hungry             │
│                                              │                     │
│                                              │  LIGHT              │
│                                              │  Torch (dim)        │
│                                              │  ~45 turns left     │
│                                              │                     │
│                                              │  EQUIPPED           │
│                                              │  ─────────────      │
│                                              │  Weapon:            │
│                                              │    Mace +1          │
│                                              │  Armor:             │
│                                              │    Chain Mail [4]   │
│                                              │  Rings:             │
│                                              │    Protection +1    │
│                                              │    [empty]          │
├──────────────────────────────────────────────┴─────────────────────┤
│  COMMANDS: [i]nv [q]uaff [r]ead [w]ield [e]at [o]pen [>]/<] [S]ave│
└────────────────────────────────────────────────────────────────────┘
```

---

### 5.3 Screens & Modals

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

## 6. Save System & Persistence

### 6.1 LocalStorage Strategy

**Save Data**:
- Stored in browser LocalStorage
- Key: `roguelike_save_${gameId}`
- Format: JSON-serialized GameState

**Save Triggers**:
1. **Manual save** (press `S`)
2. **Auto-save** on quit (press `Q`)
3. **Auto-save** every 10 turns (configurable)

**Load**:
- On game start, check for existing save
- If found, show "Continue" option on main menu
- Load full GameState and resume

### 6.2 Permadeath Implementation

**On Death**:
1. Show death screen with stats
2. **Delete save from LocalStorage** (no second chances)
3. Offer "New Game" option

**No Save Scumming**:
- Save is overwritten on each action/turn
- Cannot reload earlier state
- Death = permanent game over

---

## 7. Testing Strategy

### 7.1 Testing Philosophy

**Goals**:
- **>80% code coverage** for services and commands
- **Deterministic tests** (no flaky randomness)
- **Fast execution** (<10 seconds for full suite)
- **Isolated layers** (unit tests mock dependencies)

**Framework**: Jest

---

### 7.2 Unit Tests

#### Service Layer Tests

**Test each service in isolation**:
- Mock all dependencies (especially RandomService)
- Test pure logic and edge cases
- Verify correct outputs for given inputs

**Coverage**: All services (Combat, Movement, Dungeon, Inventory, Leveling, FOV, Pathfinding, Lighting, AI, Debug)

---

### 7.3 Integration Tests

**Test service interactions**:
- Use real services (not mocked)
- Use SeededRandom for deterministic results
- Test full game flows

---

## 8. Development Phases

### Phase 1: Foundation & Core Loop (Week 1-2)

**Goal**: Get basic movement, rendering, and lighting working

**Tasks**:
- [x] Project setup (Vite + TypeScript + Jest)
- [ ] Core data structures (GameState, Player, Position, Level, LightSource)
- [ ] RandomService interface + SeededRandom + MockRandom implementations
- [ ] Basic UI (Vanilla TypeScript + DOM for dungeon, stats)
- [ ] Keyboard input handling
- [ ] LightingService (fuel tracking, radius calculation)
- [ ] FOVService (shadowcasting with light radius)
- [ ] RenderingService (visibility states, color selection, entity filtering)
- [ ] MovementService (position validation, basic collision)
- [ ] MoveCommand (orchestrate movement + FOV update)
- [ ] Simple test level (single room, manual placement)
- [ ] Render player (`@`) on floor (`.`) with visibility states
- [ ] Implement three-state rendering (visible/explored/unexplored)
- [ ] Add color palette CSS classes for visibility states
- [ ] Update Level.explored tracking when FOV changes
- [ ] **DebugService** (basic commands: reveal, teleport, god mode)

**Deliverable**: Can move player around a room, see FOV change with light, observe fog of war (explored areas dimmed, unexplored hidden)

**Tests**:
- MovementService unit tests
- LightingService unit tests
- FOVService unit tests
- RenderingService unit tests (visibility state logic, color selection, entity filtering)
- MoveCommand unit tests

---

### Phase 2: Combat & Monsters (Week 3)

**Goal**: Implement combat system with monsters and basic AI

**Tasks**:
- [ ] Load `/data/monsters.json` with AI profiles
- [ ] Monster data structure
- [ ] CombatService (hit calculation, damage, death)
- [ ] AttackCommand (orchestrate combat)
- [ ] MonsterAIService (basic behaviors: SIMPLE, SMART)
- [ ] PathfindingService (A*)
- [ ] Monster spawning in dungeon
- [ ] MessageService (combat log)
- [ ] Render monsters (A-Z letters)
- [ ] Combat flow: move into monster → attack → messages
- [ ] Death screen (player dies)

**Deliverable**: Can fight monsters with basic AI, see combat messages, die

**Tests**:
- CombatService unit tests (all formulas)
- MonsterAIService unit tests
- PathfindingService unit tests
- Combat integration tests

---

### Phase 3: Advanced Dungeon Generation (Week 4)

**Goal**: Full procedural dungeon generation with rooms, corridors, doors

**Tasks**:
- [ ] DungeonService implementation
- [ ] Room placement algorithm (with overlap prevention)
- [ ] Corridor connection (L-shaped with winding)
- [ ] Minimum Spanning Tree for connectivity
- [ ] Loop generation for alternate paths
- [ ] Door placement (multiple types: open, closed, locked, secret, broken, archway)
- [ ] Connectivity verification (floodfill)
- [ ] Stairs placement (`>` down, `<` up)
- [ ] Multi-level support (generate all 10 levels)
- [ ] Level persistence (store in GameState.levels map)
- [ ] Stairs navigation (MoveStairsCommand)

**Deliverable**: Can explore procedurally generated multi-level dungeon with varied doors

**Tests**:
- DungeonService unit tests (room generation, corridor connection, MST, loops)
- Connectivity tests (floodfill verification)
- Seed determinism tests (same seed = same dungeon)
- Door placement tests

---

### Phase 4: Complete AI Behaviors (Week 5)

**Goal**: Implement all monster AI behaviors

**Tasks**:
- [ ] Expand MonsterAIService with all behaviors:
  - [ ] ERRATIC (Bat, Kestrel)
  - [ ] GREEDY (Orc)
  - [ ] THIEF (Leprechaun, Nymph)
  - [ ] STATIONARY (Venus Flytrap)
  - [ ] COWARD (Vampire flee logic)
- [ ] Monster FOV calculation (when awake)
- [ ] Wake-up logic (player enters FOV)
- [ ] Sleeping monster optimization (skip FOV)
- [ ] AI state transitions (SLEEPING → HUNTING → FLEEING)
- [ ] Special behaviors (MEAN always awake, FLYING ignores terrain)

**Deliverable**: Monsters exhibit varied, intelligent behaviors based on type

**Tests**:
- AI behavior tests for each type
- State transition tests
- Wake-up logic tests
- AI integration tests

---

### Phase 5: Items & Inventory (Week 6-7)

**Goal**: Full item system with inventory management

**Tasks**:
- [ ] Load `/data/items.json` (including light sources)
- [ ] Item data structures (Weapon, Armor, Potion, Scroll, Ring, Wand, Food, LightSource, OilFlask)
- [ ] InventoryService (add, remove, equip, use)
- [ ] IdentificationService (name generation, identify)
- [ ] Item spawning in dungeon (including torches, lanterns, oil flasks)
- [ ] Render items (symbols: %, ), [, !, ?, =, /, ~, ()
- [ ] PickUpCommand, DropCommand
- [ ] EquipCommand (including light sources), UseItemCommand
- [ ] Inventory UI screen (modal)
- [ ] Item effects (healing potions, scrolls, etc.)
- [ ] Lantern refill mechanic

**Deliverable**: Can pick up, carry, equip, and use items (including light sources)

**Tests**:
- InventoryService unit tests
- IdentificationService tests (name generation, persistence)
- Item effect tests (healing, enchanting, refilling)
- Light source equip/use tests

---

### Phase 6: Hunger & Progression (Week 8)

**Goal**: Hunger system and character leveling

**Tasks**:
- [ ] HungerService (tick, feed, states, effects)
- [ ] Food consumption (EatCommand)
- [ ] Hunger state messages and warnings
- [ ] Hunger effects on combat (weak = penalties)
- [ ] Starvation damage
- [ ] LevelingService (XP calculation, level up)
- [ ] XP rewards from monster kills
- [ ] Level-up stat increases
- [ ] XP progress display in UI

**Deliverable**: Hunger system works, leveling works

**Tests**:
- HungerService unit tests (all states, effects)
- LevelingService unit tests (XP curves, stat increases)

---

### Phase 7: Win Condition & Polish (Week 9)

**Goal**: Complete game loop with Amulet of Yendor

**Tasks**:
- [ ] Amulet of Yendor item (spawns on Level 10)
- [ ] Victory condition (return to Level 1 with amulet)
- [ ] Victory screen
- [ ] LocalStorageService (save/load wrapper)
- [ ] SaveCommand (manual save)
- [ ] Auto-save on quit
- [ ] Permadeath implementation (delete save on death)
- [ ] Main menu (New Game, Continue, Help)
- [ ] Help screen (controls, game rules)
- [ ] UI polish (colors, spacing, light indicators)
- [ ] Message log improvements (scrolling, color coding)

**Deliverable**: Full game loop playable start to finish

**Tests**:
- Save/load integration tests
- Victory condition tests

---

### Phase 8: Testing, Balance & Bug Fixes (Week 10-11)

**Goal**: Achieve >80% test coverage, balance difficulty

**Tasks**:
- [ ] Write remaining unit tests (achieve >80% coverage)
- [ ] Integration test suite (full game flows)
- [ ] Playtesting (internal)
- [ ] Balance tuning:
  - [ ] Monster HP/damage scaling per level
  - [ ] Monster AI behavior tuning
  - [ ] Item drop rates (including light sources)
  - [ ] Hunger depletion rate
  - [ ] Light fuel consumption rate
  - [ ] XP curve
  - [ ] Door type distribution
- [ ] Bug fixes from playtesting
- [ ] Performance optimization (if needed)
- [ ] Documentation (code comments, README)
- [ ] Polish debug tools

**Deliverable**: Polished, balanced, well-tested game ready for release

**Tests**:
- Full coverage report (>80%)
- End-to-end playthrough tests

---

## 9. Success Metrics

### 9.1 Functionality Metrics

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
- [ ] **AI behaviors work**: All 7 behavior types function correctly (SMART, GREEDY, ERRATIC, SIMPLE, STATIONARY, THIEF, COWARD)
- [ ] **Dungeon generation**: Rooms, corridors, doors (6 types), loops, full connectivity
- [ ] **Debug tools functional**: All debug commands and overlays work

---

### 9.2 Quality Metrics

- [ ] **Test coverage**: >80% for services and commands
- [ ] **Performance**: 60fps rendering, <100ms input response
- [ ] **No game-breaking bugs**: Playable without crashes or softlocks
- [ ] **Saves/loads correctly**: State persists accurately
- [ ] **Balanced difficulty**: Challenging but fair (playtesting feedback)

---

### 9.3 UX Metrics

- [ ] **Controls responsive**: Keyboard input feels snappy
- [ ] **Readable**: ASCII characters clear and distinguishable
- [ ] **Messages helpful**: Combat log provides useful feedback
- [ ] **UI intuitive**: Players can understand commands without manual
- [ ] **Authentic feel**: Captures spirit of original Rogue with modern enhancements
- [ ] **Lighting tension**: Managing torches/lanterns adds strategic depth

---

## 10. Future Enhancements (Post-v1)

### 10.1 Additional Features

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

### 10.2 Technical Improvements

- **Mobile support**: Touch controls, simplified UI
- **Multiplayer**: Shared dungeon, leaderboards
- **Cloud saves**: Sync across devices
- **Replay system**: Save/share game seeds
- **Modding support**: Custom monsters, items, levels via JSON
- **Accessibility**: Screen reader support, colorblind modes, adjustable font sizes

---

### 10.3 Content Expansions

- **More levels**: Extend to 20+ levels
- **Boss fights**: Unique powerful monsters on certain levels
- **Alternate dungeons**: Different themes (ice cave, volcano, crypt, underwater)
- **Prestige mode**: New Game+ with harder enemies
- **Achievements**: Unlock challenges and rewards
- **Daily challenges**: Same seed for all players, compete for best score

---

## 11. Technical Specifications Summary

| Aspect | Technology |
|--------|------------|
| **Language** | TypeScript (strict mode) |
| **Build Tool** | Vite |
| **UI Rendering** | Vanilla TypeScript + DOM |
| **Testing** | Jest |
| **Storage** | LocalStorage |
| **Data Format** | JSON |
| **Version Control** | Git |
| **Package Manager** | npm |

---

## 12. Appendix

### 12.1 Glossary

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

### 12.2 References

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

### 12.3 Contact & Feedback

**Developer**: Dirk Kok

**Repository**: https://github.com/dirkkok101/roguelike

**Issues/Bugs**: https://github.com/dirkkok101/roguelike/issues

**Email**: dirkkok@gmail.com

---

## End of PRD

**Version**: 2.0

**Last Updated**: 2025-10-03

**Status**: Draft → Approved → In Development

**Major Changes from v1.1**:
- Added comprehensive lighting system (Angband-style)
- Expanded monster AI with intelligence-based behaviors
- Advanced dungeon generation (door types, loops, MST)
- Built-in debug system with overlays
- New services: LightingService, MonsterAIService, DebugService
- Updated data structures for all new features
- Comprehensive AI behavior table for all 26 monsters
- Detailed dungeon generation algorithm
