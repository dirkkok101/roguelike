# Product Requirements Document: ASCII Roguelike

## 1. Product Overview

**Name**: [TBD - Your Roguelike Title]

**Genre**: Classic roguelike dungeon crawler

**Platform**: Web (TypeScript + Vite)

**Target Audience**: Roguelike enthusiasts, retro gamers, fans of challenging procedurally-generated games

**Core Concept**: A faithful recreation of the original 1980 Rogue game using modern web technologies while preserving the classic ASCII aesthetic and core gameplay loop. Players navigate procedurally generated dungeons, battle monsters, manage resources (hunger, equipment), and attempt to retrieve the legendary Amulet of Yendor.

---

## 2. Game Objective

The player must:
1. Start on Level 1 of the dungeon
2. Descend through 10 procedurally generated dungeon levels
3. Retrieve the **Amulet of Yendor** from Level 10
4. Return to the surface (Level 1) with the amulet
5. Survive hunger, combat, traps, and **permadeath**

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

**Progression**:
- Gain XP from defeating monsters
- Level up to increase max HP and stats
- Find better equipment to improve combat effectiveness

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

**ASCII Characters** (matching original Rogue):

| Element | Symbol | Description |
|---------|--------|-------------|
| Player | `@` | You (the adventurer) |
| Wall | `─│┌┐└┘` or `\|`, `-` | Dungeon walls |
| Floor | `.` | Walkable floor space |
| Corridor | `#` | Narrow passages between rooms |
| Door | `+` | Doorways (can be open or closed) |
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
| Amulet | `&` | The Amulet of Yendor (win condition) |

---

### 3.3 Monsters (26 Total - Letters A-Z)

All monsters from the original Rogue, each represented by a capital letter:

| Letter | Name | HP | AC | Damage | Special Abilities |
|--------|------|----|----|--------|-------------------|
| **A** | Aquator | 5d8 | 2 | 0d0 | Rusts armor on hit |
| **B** | Bat | 1d8 | 3 | 1d2 | Flying, erratic movement |
| **C** | Centaur | 4d8 | 4 | 1d2/1d5/1d5 | - |
| **D** | Dragon | 10d8 | -1 | 1d8/1d8/3d10 | Flame breath (6d6 ranged) |
| **E** | Emu | 1d8 | 7 | 1d2 | Mean (aggressive) |
| **F** | Venus Flytrap | 8d8 | 3 | Special | Holds player in place |
| **G** | Griffin | 13d8 | 2 | 4d3/3d5 | Regenerates HP, flying, mean |
| **H** | Hobgoblin | 1d8 | 5 | 1d8 | Mean |
| **I** | Ice Monster | 1d8 | 9 | 0d0 | Freezes player (skip turn) |
| **J** | Jabberwock | 15d8 | 6 | 2d12/2d4 | High damage |
| **K** | Kestrel | 1d8 | 7 | 1d4 | Mean, flying |
| **L** | Leprechaun | 3d8 | 8 | 1d1 | Steals gold |
| **M** | Medusa | 8d8 | 2 | 3d4/3d4/2d5 | Confuses player |
| **N** | Nymph | 3d8 | 9 | 0d0 | Steals random magic item |
| **O** | Orc | 1d8 | 6 | 1d8 | Greedy (runs toward gold piles) |
| **P** | Phantom | 8d8 | 3 | 4d4 | Invisible |
| **Q** | Quagga | 3d8 | 3 | 1d5/1d5 | Mean |
| **R** | Rattlesnake | 2d8 | 3 | 1d6 | Reduces strength on hit |
| **S** | Snake | 1d8 | 5 | 1d3 | Mean |
| **T** | Troll | 6d8 | 4 | 1d8/1d8/2d6 | Regenerates HP, mean |
| **U** | Ur-vile | 7d8 | -2 | 1d9/1d9/2d9 | Mean, tough AC |
| **V** | Vampire | 8d8 | 1 | 1d10 | Regenerates, drains max HP |
| **W** | Wraith | 5d8 | 4 | 1d6 | Drains experience points |
| **X** | Xeroc | 7d8 | 7 | 4d4 | - |
| **Y** | Yeti | 4d8 | 6 | 1d6/1d6 | Two attacks |
| **Z** | Zombie | 2d8 | 8 | 1d8 | Mean |

**Monster Behavior**:
- Most monsters are initially **asleep** (don't move until player is near)
- **Mean** monsters are always aggressive
- Some monsters have **special abilities** (steal, rust armor, drain stats)
- **Flying** monsters can cross certain terrain
- **Regenerating** monsters heal HP over time

**Scaling**: Higher dungeon levels spawn tougher monsters more frequently.

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
- **Arrow combinations** - Diagonal movement (if needed)

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
| `.` | Rest | Skip turn (wait in place) |
| `S` | Save | Save current game |
| `Q` | Quit | Quit game (prompts to save) |

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
- **Framework**: React (for UI rendering)
- **Testing**: Jest (unit + integration tests)
- **Storage**: Browser LocalStorage (game saves)
- **Data Files**: JSON (monsters, items, config)

---

### 4.2 Architecture Layers

```
┌──────────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                                 │
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

**Responsibilities**: Procedural level generation

**Methods**:
```typescript
class DungeonService {
  constructor(private random: IRandomService) {}

  generateLevel(depth: number, seed: string): Level
  placeRooms(level: Level, count: number): Level
  connectRooms(level: Level): Level
  placeDoors(level: Level): Level
  placeStairs(level: Level): Level
  spawnMonsters(level: Level, depth: number): Monster[]
  spawnItems(level: Level, depth: number): Item[]
  spawnGold(level: Level): Gold[]
}
```

**Algorithm**: Rooms + corridors (BSP or grid-based placement)

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

**Message Types**: Combat, item pickup, level change, hunger warnings, death

**Dependencies**: None

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
}
```

**Implementations**:
1. **SeededRandom**: Uses seed string for reproducibility
2. **MockRandom**: Returns predefined values for testing

**Usage**: Injected into services that need randomness (Combat, Dungeon, Hunger, Identification)

---

### 4.4 Command Layer Details

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
    // 6. Return new state
  }
}
```

#### UseItemCommand
```typescript
class UseItemCommand implements ICommand {
  constructor(
    private itemId: string,
    private inventoryService: InventoryService,
    private identificationService: IdentificationService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    // 1. Get item from inventory (via InventoryService)
    // 2. Apply item effect (via appropriate service)
    // 3. Identify item if not already (via IdentificationService)
    // 4. Remove consumable from inventory (via InventoryService)
    // 5. Add message (via MessageService)
    // 6. Return new state
  }
}
```

**Key Points**:
- Commands orchestrate multiple services
- Commands contain NO game logic (only coordination)
- All logic lives in services
- Commands are easily testable (mock services)

---

### 4.5 Data Structures

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
  effects: StatusEffect[];  // Confusion, blindness, etc.
}
```

#### Equipment
```typescript
interface Equipment {
  weapon: Weapon | null;
  armor: Armor | null;
  leftRing: Ring | null;
  rightRing: Ring | null;
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
  isAsleep: boolean;
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
  monsters: Monster[];
  items: Item[];
  gold: GoldPile[];
  stairsUp: Position | null;
  stairsDown: Position | null;
  revealed: boolean[][];  // Fog of war
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
  transparent: boolean;  // For fog of war
}
```

#### Item (Base)
```typescript
interface Item {
  id: string;
  type: ItemCategory;  // WEAPON, ARMOR, POTION, etc.
  name: string;
  displayName: string;  // Unidentified or true name
  char: string;  // Display symbol
  identified: boolean;
  cursed: boolean;
}
```

#### Weapon
```typescript
interface Weapon extends Item {
  damage: string;  // "1d8", "2d4+1", etc.
  hitBonus: number;  // +1, +2, etc.
  damageBonus: number;
}
```

#### Potion / Scroll / Ring / Wand
```typescript
interface Potion extends Item {
  effect: PotionEffect;  // HEAL, STRENGTH, POISON, etc.
}

interface Scroll extends Item {
  effect: ScrollEffect;  // IDENTIFY, ENCHANT, TELEPORT, etc.
}

interface Ring extends Item {
  effect: RingEffect;
  hungerModifier: number;  // Most rings increase hunger
}

interface Wand extends Item {
  effect: WandEffect;
  charges: number;
  maxCharges: number;
}
```

---

### 4.6 Data Files (JSON)

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
    "sleepChance": 0.3,
    "minLevel": 1,
    "maxLevel": 5
  }
  // ... 24 more monsters
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
    "startingFood": 1300
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
    "maxRooms": 9,
    "minRoomSize": 4,
    "maxRoomSize": 10
  },
  "combat": {
    "baseToHit": 1,
    "sleepingBonus": 4
  },
  "leveling": {
    "xpCurve": [0, 10, 30, 60, 100, 150, 210, 280, 360, 450]
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

**Color Palette**:
- **Background**: Dark gray/black (`#1a1a1a`)
- **Player**: Bright cyan (`#00ffff`)
- **Monsters**: Red/orange gradient (`#ff4444` to `#ff8800`)
- **Items**:
  - Gold: Yellow (`#ffdd00`)
  - Food: Green (`#44ff44`)
  - Potions: Magenta (`#ff00ff`)
  - Weapons/Armor: White (`#ffffff`)
- **Dungeon**:
  - Walls: Dark gray (`#444444`)
  - Floors: Medium gray (`#666666`)
  - Corridors: Lighter gray (`#888888`)
- **Messages**:
  - Damage: Red (`#ff4444`)
  - Healing: Green (`#44ff44`)
  - Info: White (`#ffffff`)
  - Warnings: Yellow (`#ffdd00`)

**Effects**:
- **Subtle glow** on player character (2px cyan shadow)
- **Fade in** for new messages
- **Pulse** for low HP warning
- **NO animations** for movement/combat (instant, turn-based)

---

### 5.2 Layout

**Responsive Design**: Fixed aspect ratio, scales to fit screen

```
┌────────────────────────────────────────────────────────────────────┐
│  TITLE BAR                                                         │
│  Roguelike: The Quest for the Amulet                               │
├────────────────────────────────────────────────────────────────────┤
│  MESSAGE LOG (5 lines, scrolling)                                  │
│  > You hit the Orc for 5 damage.                                   │
│  > The Orc attacks you for 3 damage!                               │
│  > You feel hungry.                                                │
│  >                                                                 │
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
│  COMMAND BAR                                                       │
│  [i]nv [q]uaff [r]ead [w]ield [e]at [>]down [<]up [S]ave [Q]uit   │
└────────────────────────────────────────────────────────────────────┘
```

**Sections**:

1. **Title Bar**: Game title, version
2. **Message Log**: Last 5 actions/events, auto-scrolling
3. **Dungeon View**: 80x22 ASCII grid (main play area)
4. **Stats Panel**: Character info (HP, Str, AC, Level, XP, Gold, Depth, Hunger)
5. **Equipment Panel**: Currently equipped items
6. **Command Bar**: Quick reference for key commands

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
│                                        │
│      Press a key to begin...           │
│                                        │
└────────────────────────────────────────┘
```

#### Inventory Screen (Modal Overlay)
```
┌────────────────────────────────────────┐
│  INVENTORY (12/26 items)               │
│  ────────────────────────────────────  │
│                                        │
│  Weapons:                              │
│    a) Mace +1, +1 (wielded)            │
│    b) Long Sword                       │
│                                        │
│  Armor:                                │
│    c) Chain Mail [4] (being worn)      │
│                                        │
│  Potions:                              │
│    d) blue potion                      │
│    e) red potion (2)                   │
│                                        │
│  Scrolls:                              │
│    f) scroll labeled XYZZY             │
│                                        │
│  Rings:                                │
│    g) ruby ring (left hand)            │
│    h) wooden ring                      │
│                                        │
│  Food:                                 │
│    i) Food Ration (3)                  │
│                                        │
│  [ESC] to close                        │
└────────────────────────────────────────┘
```

#### Death Screen
```
┌────────────────────────────────────────┐
│                                        │
│        You have died...                │
│                                        │
│     Killed by: Orc on Level 5          │
│                                        │
│     ─── FINAL STATS ───                │
│     Level:       3                     │
│     Gold:        247                   │
│     Kills:       23                    │
│     Turns:       1,542                 │
│                                        │
│     [N] New Game                       │
│     [Q] Quit                           │
│                                        │
└────────────────────────────────────────┘
```

#### Victory Screen
```
┌────────────────────────────────────────┐
│                                        │
│   🎉 VICTORY! 🎉                       │
│                                        │
│  You have retrieved the Amulet of      │
│  Yendor and escaped the dungeon!       │
│                                        │
│     ─── FINAL STATS ───                │
│     Level:       8                     │
│     Gold:        3,421                 │
│     Kills:       89                    │
│     Turns:       5,234                 │
│     Score:       12,450                │
│                                        │
│     [N] New Game                       │
│     [Q] Quit                           │
│                                        │
└────────────────────────────────────────┘
```

---

### 5.4 Responsive Behavior

**Desktop** (>1024px):
- Full layout as shown above
- Dungeon view: 80x22 characters
- Stats panel on right side

**Tablet** (768-1024px):
- Scale down font slightly (12-14px)
- Collapse command bar into icons

**Mobile** (<768px):
- **NOT prioritized for v1** (keyboard required)
- Future: Touch controls, simplified layout

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
3. **Auto-save** every N turns (configurable, e.g., every 10 turns)

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

### 6.3 Multiple Saves

**v1**: Single save slot per browser

**Future**: Multiple save slots, different characters

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

**Example: CombatService Tests**
```typescript
describe('CombatService', () => {
  let mockRandom: MockRandom;
  let combatService: CombatService;

  beforeEach(() => {
    mockRandom = new MockRandom([15]);  // Predefined roll
    combatService = new CombatService(mockRandom);
  });

  it('should calculate hit with strength bonus', () => {
    const attacker = createTestPlayer({ strength: 21 });
    const defender = createTestMonster({ ac: 5 });

    const hit = combatService.calculateHit(attacker, defender);

    expect(hit).toBe(true);  // 15 (roll) + 1 (base) + 3 (str) = 19 >= 5 AC
  });

  it('should calculate damage with weapon and strength', () => {
    mockRandom.setSequence([4, 2]);  // Weapon: 2d4
    const attacker = createTestPlayer({ strength: 16 });  // +1 damage
    const weapon = createTestWeapon({ damage: '2d4' });

    const damage = combatService.calculateDamage(attacker, weapon);

    expect(damage).toBe(7);  // 4 + 2 (rolls) + 1 (str bonus) = 7
  });

  it('should apply damage and update HP', () => {
    const entity = createTestPlayer({ hp: 20 });

    const updated = combatService.applyDamage(entity, 5);

    expect(updated.hp).toBe(15);
  });

  it('should detect death when HP reaches 0', () => {
    const entity = createTestPlayer({ hp: 5 });

    const updated = combatService.applyDamage(entity, 10);

    expect(combatService.checkDeath(updated)).toBe(true);
    expect(updated.hp).toBe(0);
  });
});
```

**Example: HungerService Tests**
```typescript
describe('HungerService', () => {
  let mockRandom: MockRandom;
  let hungerService: HungerService;

  beforeEach(() => {
    mockRandom = new MockRandom([1300]);  // Food nutrition
    hungerService = new HungerService(mockRandom);
  });

  it('should deplete hunger each turn', () => {
    const entity = createTestPlayer({ foodUnits: 500 });
    const rings: Ring[] = [];  // No rings

    const updated = hungerService.tickHunger(entity, rings);

    expect(updated.foodUnits).toBe(499);  // -1 per turn
  });

  it('should deplete hunger faster with rings', () => {
    const entity = createTestPlayer({ foodUnits: 500 });
    const rings = [createTestRing({ hungerModifier: 1.5 })];

    const updated = hungerService.tickHunger(entity, rings);

    expect(updated.foodUnits).toBe(498);  // -2 (base * 1.5 + base)
  });

  it('should restore hunger when eating', () => {
    const entity = createTestPlayer({ foodUnits: 100 });
    const food = createTestFood();

    const updated = hungerService.feed(entity, food);

    expect(updated.foodUnits).toBe(1400);  // 100 + 1300
  });

  it('should cap food at maximum', () => {
    const entity = createTestPlayer({ foodUnits: 1800 });

    const updated = hungerService.feed(entity, createTestFood());

    expect(updated.foodUnits).toBe(2000);  // Capped at max
  });

  it('should return correct hunger state', () => {
    expect(hungerService.getHungerState(500)).toBe(HungerState.NORMAL);
    expect(hungerService.getHungerState(200)).toBe(HungerState.HUNGRY);
    expect(hungerService.getHungerState(100)).toBe(HungerState.WEAK);
    expect(hungerService.getHungerState(0)).toBe(HungerState.STARVING);
  });
});
```

**Coverage**: All services (Combat, Movement, Dungeon, Inventory, Leveling, etc.)

---

#### Command Layer Tests

**Test orchestration logic**:
- Mock all services
- Verify correct service calls
- Verify state transformations
- Check message generation

**Example: MoveCommand Tests**
```typescript
describe('MoveCommand', () => {
  let mockMovement: jest.Mocked<MovementService>;
  let mockCombat: jest.Mocked<CombatService>;
  let mockHunger: jest.Mocked<HungerService>;
  let mockMessage: jest.Mocked<MessageService>;
  let command: MoveCommand;

  beforeEach(() => {
    mockMovement = createMockMovementService();
    mockCombat = createMockCombatService();
    mockHunger = createMockHungerService();
    mockMessage = createMockMessageService();
  });

  it('should move player to empty space', () => {
    const state = createTestGameState();
    mockMovement.getEntityAt.mockReturnValue(null);  // No obstacle
    mockMovement.moveEntity.mockReturnValue({ ...state.player, position: { x: 5, y: 5 } });

    command = new MoveCommand(Direction.NORTH, mockMovement, mockCombat, mockHunger, mockMessage);
    const newState = command.execute(state);

    expect(mockMovement.moveEntity).toHaveBeenCalled();
    expect(mockCombat.resolveAttack).not.toHaveBeenCalled();
    expect(newState.player.position).toEqual({ x: 5, y: 5 });
  });

  it('should initiate combat when moving into monster', () => {
    const state = createTestGameState();
    const monster = createTestMonster();
    mockMovement.getEntityAt.mockReturnValue(monster);
    mockCombat.resolveAttack.mockReturnValue({
      attackerDamage: 5,
      defenderDamage: 3,
      messages: ['You hit the Orc for 5 damage.']
    });

    command = new MoveCommand(Direction.NORTH, mockMovement, mockCombat, mockHunger, mockMessage);
    const newState = command.execute(state);

    expect(mockCombat.resolveAttack).toHaveBeenCalledWith(state.player, monster);
    expect(mockMessage.addMessages).toHaveBeenCalled();
  });

  it('should tick hunger after movement', () => {
    const state = createTestGameState();
    mockMovement.getEntityAt.mockReturnValue(null);
    mockHunger.tickHunger.mockReturnValue({ ...state.player, foodUnits: 499 });

    command = new MoveCommand(Direction.NORTH, mockMovement, mockCombat, mockHunger, mockMessage);
    const newState = command.execute(state);

    expect(mockHunger.tickHunger).toHaveBeenCalled();
    expect(newState.player.foodUnits).toBe(499);
  });
});
```

**Coverage**: All commands (Move, Attack, UseItem, PickUp, Drop, etc.)

---

### 7.3 Integration Tests

**Test service interactions**:
- Use real services (not mocked)
- Use SeededRandom for deterministic results
- Test full game flows

**Example: Combat Integration Test**
```typescript
describe('Combat Integration', () => {
  let random: SeededRandom;
  let combat: CombatService;
  let message: MessageService;

  beforeEach(() => {
    random = new SeededRandom('test-seed-123');
    combat = new CombatService(random);
    message = new MessageService();
  });

  it('should resolve full combat encounter', () => {
    const player = createTestPlayer({ hp: 20, strength: 16 });
    const orc = createTestMonster({ name: 'Orc', hp: 8, ac: 6 });

    const result = combat.resolveAttack(player, orc);

    // With known seed, we can predict outcome
    expect(result.defenderDamage).toBeGreaterThan(0);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0]).toContain('Orc');
  });
});
```

**Example: Dungeon Generation Integration Test**
```typescript
describe('Dungeon Generation Integration', () => {
  let random: SeededRandom;
  let dungeon: DungeonService;

  beforeEach(() => {
    random = new SeededRandom('dungeon-seed-456');
    dungeon = new DungeonService(random);
  });

  it('should generate consistent level with same seed', () => {
    const level1 = dungeon.generateLevel(1, 'dungeon-seed-456');

    // Reset random with same seed
    random = new SeededRandom('dungeon-seed-456');
    dungeon = new DungeonService(random);

    const level2 = dungeon.generateLevel(1, 'dungeon-seed-456');

    // Levels should be identical
    expect(level1.rooms.length).toBe(level2.rooms.length);
    expect(level1.monsters.length).toBe(level2.monsters.length);
  });

  it('should generate different levels with different seeds', () => {
    const level1 = dungeon.generateLevel(1, 'seed-a');

    random = new SeededRandom('seed-b');
    dungeon = new DungeonService(random);

    const level2 = dungeon.generateLevel(1, 'seed-b');

    expect(level1.rooms).not.toEqual(level2.rooms);
  });
});
```

---

### 7.4 Test Utilities

**Mock Factories**:
```typescript
// test/factories.ts
export function createTestPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'player-1',
    position: { x: 10, y: 10 },
    hp: 20,
    maxHp: 20,
    strength: 16,
    maxStrength: 16,
    level: 1,
    xp: 0,
    gold: 0,
    armorClass: 10,
    inventory: [],
    equipped: { weapon: null, armor: null, leftRing: null, rightRing: null },
    foodUnits: 1300,
    effects: [],
    ...overrides
  };
}

export function createTestMonster(overrides?: Partial<Monster>): Monster {
  return {
    id: 'monster-1',
    letter: 'O',
    name: 'Orc',
    position: { x: 15, y: 15 },
    hp: 8,
    maxHp: 8,
    ac: 6,
    damage: '1d8',
    xpValue: 10,
    flags: [],
    isAsleep: false,
    level: 1,
    ...overrides
  };
}

// Similar factories for items, levels, etc.
```

**MockRandom Implementation**:
```typescript
export class MockRandom implements IRandomService {
  private sequence: number[];
  private index: number = 0;

  constructor(sequence: number[]) {
    this.sequence = sequence;
  }

  setSequence(sequence: number[]) {
    this.sequence = sequence;
    this.index = 0;
  }

  nextInt(min: number, max: number): number {
    const value = this.sequence[this.index % this.sequence.length];
    this.index++;
    return value;
  }

  roll(dice: string): number {
    // Parse dice string and return predefined values
    const [count, sides] = dice.split('d').map(Number);
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.nextInt(1, sides);
    }
    return total;
  }

  // ... other methods
}
```

---

## 8. Development Phases

### Phase 1: Foundation & Core Loop (Week 1-2)

**Goal**: Get basic movement and rendering working

**Tasks**:
- [x] Project setup (Vite + TypeScript + Jest)
- [ ] Core data structures (GameState, Player, Position, Level)
- [ ] RandomService interface + SeededRandom + MockRandom implementations
- [ ] Basic UI (React components for dungeon, stats)
- [ ] Keyboard input handling
- [ ] MovementService (position validation, basic collision)
- [ ] MoveCommand (orchestrate movement)
- [ ] Simple test level (single room, manual placement)
- [ ] Render player (`@`) on floor (`.`)

**Deliverable**: Can move player around a single room with arrow keys

**Tests**:
- MovementService unit tests
- MoveCommand unit tests

---

### Phase 2: Combat & Monsters (Week 3)

**Goal**: Implement combat system with monsters

**Tasks**:
- [ ] Load `/data/monsters.json`
- [ ] Monster data structure
- [ ] CombatService (hit calculation, damage, death)
- [ ] AttackCommand (orchestrate combat)
- [ ] Monster spawning in dungeon
- [ ] MessageService (combat log)
- [ ] Render monsters (A-Z letters)
- [ ] Combat flow: move into monster → attack → messages
- [ ] Death screen (player dies)

**Deliverable**: Can fight and kill monsters, see combat messages, die

**Tests**:
- CombatService unit tests (all formulas)
- MessageService unit tests
- Combat integration tests

---

### Phase 3: Dungeon Generation (Week 4)

**Goal**: Full procedural dungeon generation

**Tasks**:
- [ ] DungeonService implementation
- [ ] Room generation algorithm (random placement or BSP)
- [ ] Corridor connection (A* or simple pathfinding)
- [ ] Door placement
- [ ] Stairs placement (`>` down, `<` up)
- [ ] Multi-level support (generate all 10 levels)
- [ ] Level persistence (store in GameState.levels map)
- [ ] Stairs navigation (MoveStairsCommand)

**Deliverable**: Can explore procedurally generated multi-level dungeon

**Tests**:
- DungeonService unit tests (room generation, corridor connection)
- Seed determinism tests (same seed = same dungeon)

---

### Phase 4: Items & Inventory (Week 5-6)

**Goal**: Full item system with inventory management

**Tasks**:
- [ ] Load `/data/items.json`
- [ ] Item data structures (Weapon, Armor, Potion, Scroll, Ring, Wand, Food)
- [ ] InventoryService (add, remove, equip, use)
- [ ] IdentificationService (name generation, identify)
- [ ] Item spawning in dungeon
- [ ] Render items (symbols: %, ), [, !, ?, =, /)
- [ ] PickUpCommand, DropCommand
- [ ] EquipCommand, UseItemCommand
- [ ] Inventory UI screen (modal)
- [ ] Item effects (healing potions, scrolls, etc.)

**Deliverable**: Can pick up, carry, equip, and use items

**Tests**:
- InventoryService unit tests
- IdentificationService tests (name generation, persistence)
- Item effect tests (healing, enchanting, etc.)

---

### Phase 5: Hunger & Progression (Week 7)

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

### Phase 6: Win Condition & Polish (Week 8)

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
- [ ] UI polish (colors, spacing, animations)
- [ ] Message log improvements (scrolling, color coding)

**Deliverable**: Full game loop playable start to finish

**Tests**:
- Save/load integration tests
- Victory condition tests

---

### Phase 7: Testing, Balance & Bug Fixes (Week 9-10)

**Goal**: Achieve >80% test coverage, balance difficulty

**Tasks**:
- [ ] Write remaining unit tests (achieve >80% coverage)
- [ ] Integration test suite (full game flows)
- [ ] Playtesting (internal)
- [ ] Balance tuning:
  - [ ] Monster HP/damage scaling per level
  - [ ] Item drop rates
  - [ ] Hunger depletion rate
  - [ ] XP curve
- [ ] Bug fixes from playtesting
- [ ] Performance optimization (if needed)
- [ ] Documentation (code comments, README)

**Deliverable**: Polished, balanced, well-tested game ready for release

**Tests**:
- Full coverage report (>80%)
- End-to-end playthrough tests

---

## 9. Success Metrics

### 9.1 Functionality Metrics

- [ ] **Core loop functional**: Can play from Level 1 → Level 10 → Level 1 with Amulet
- [ ] **All monsters implemented**: 26 monsters A-Z with correct stats/abilities
- [ ] **All item types working**: Weapons, armor, potions, scrolls, rings, wands, food
- [ ] **Combat accurate**: Formulas match original Rogue
- [ ] **Hunger system functional**: Depletion, states, effects working correctly
- [ ] **Permadeath works**: Save deleted on death, no save scumming
- [ ] **Identification system**: Random names per game, persistence

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
- [ ] **Authentic feel**: Captures spirit of original Rogue

---

## 10. Future Enhancements (Post-v1)

### 10.1 Additional Features

- **Character classes**: Thief (stealth), Mage (spells), Ranger (archery)
- **More items**: Additional weapons, armor types, unique artifacts
- **Special rooms**: Shops, vaults, shrines
- **Quests**: Side objectives beyond Amulet retrieval
- **Monster AI improvements**: Smarter pathfinding, group tactics
- **Traps**: More variety (dart, pit, teleport)
- **Sound effects**: Combat hits, item pickup, footsteps
- **Music**: Ambient dungeon music

---

### 10.2 Technical Improvements

- **Mobile support**: Touch controls, simplified UI
- **Multiplayer**: Shared dungeon, leaderboards
- **Cloud saves**: Sync across devices
- **Replay system**: Save/share game seeds
- **Modding support**: Custom monsters, items, levels via JSON
- **Accessibility**: Screen reader support, colorblind modes

---

### 10.3 Content Expansions

- **More levels**: Extend to 20+ levels
- **Boss fights**: Unique powerful monsters on certain levels
- **Alternate dungeons**: Different themes (ice cave, volcano, crypt)
- **Prestige mode**: New Game+ with harder enemies
- **Achievements**: Unlock challenges and rewards

---

## 11. Technical Specifications Summary

| Aspect | Technology |
|--------|------------|
| **Language** | TypeScript (strict mode) |
| **Build Tool** | Vite |
| **Framework** | React |
| **Testing** | Jest |
| **Storage** | LocalStorage |
| **Data Format** | JSON |
| **Version Control** | Git |
| **Package Manager** | npm/yarn |

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

---

### 12.2 References

- [Original Rogue Manual](https://britzl.github.io/roguearchive/files/misc/EpyxRogueDOSManual/manual.htm)
- [Rogue Monster List - StrategyWiki](https://strategywiki.org/wiki/Rogue/Monsters)
- [RogueBasin - Roguelike Development Wiki](https://www.roguebasin.com/)
- [Rogue Wikipedia](https://en.wikipedia.org/wiki/Rogue_(video_game))

---

### 12.3 Contact & Feedback

**Developer**: [Your Name]

**Repository**: [GitHub URL]

**Issues/Bugs**: [GitHub Issues URL]

**Email**: [Your Email]

---

## End of PRD

**Version**: 1.0

**Last Updated**: 2025-10-03

**Status**: Draft → Approved → In Development
