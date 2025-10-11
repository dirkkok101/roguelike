# Technical Architecture: ASCII Roguelike

**Version**: 2.0
**Last Updated**: 2025-10-03
**Related Docs**: [Game Design](./game-design/README.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

**Visual Diagrams**: [Architecture Diagrams Index](./diagrams/README.md) | [Layered Architecture](./diagrams/architecture-layers.md) | [Service Dependencies](./diagrams/service-dependencies.md) | [Data Model](./diagrams/data-model.md)

---

## 1. Technology Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **UI Rendering**: Canvas 2D + HTML5 (sprite-based rendering)
- **Sprite Assets**: AngbandTK Gervais 32×32 tileset
- **Testing**: Jest (unit + integration tests)
- **Storage**: Browser LocalStorage (game saves)
- **Data Files**: JSON (monsters, items, config)

**Rendering Architecture**:
- **Dungeon View**: HTML5 Canvas with hardware-accelerated sprite rendering
- **UI Panels**: Vanilla TypeScript + DOM manipulation for stats and messages
- **Tileset**: Single PNG sprite atlas with .prf mapping files
- **Performance**: 60 FPS target on 80×22 grid (2560×704px canvas)

**Rationale for Canvas Rendering**:
- Hardware acceleration via GPU for smooth performance
- Efficient sprite atlas rendering using drawImage
- Support for advanced visual effects (color tinting, opacity, animations)
- Pixel-perfect control without CSS reflow/repaint overhead
- Smaller than framework-based solution

---

## 2. Architecture Layers

**See Visual Diagram**: [Architecture Layers Diagram](./diagrams/architecture-layers.md) for detailed visual representation

```
┌──────────────────────────────────────────────────────────────┐
│  UI Layer (Canvas 2D + HTML5)                                │
│  - CanvasGameRenderer: Sprite-based dungeon rendering        │
│  - GameRenderer: Stats/messages with DOM                     │
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
│  - AssetLoaderService: Sprite sheet loading, .prf parsing    │
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

**Related Diagrams**:
- [Service Dependencies](./diagrams/service-dependencies.md) - Dependency graph of all 35 services
- [Command Flow](./diagrams/command-flow.md) - Detailed MoveCommand execution sequence
- [Data Model](./diagrams/data-model.md) - Entity relationships and data structures

---

## 3. Test Organization Strategy

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

See [Testing Strategy](./testing-strategy.md) for complete details.

---

## 4. Service Layer Details

### 4.1 CombatService

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

**Testing**: See [Testing Strategy](./testing-strategy.md) - `CombatService/` folder

---

### 4.2 MovementService

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

### 4.3 DungeonService

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

**Advanced Generation Features**: See [Advanced Systems](./systems-advanced.md#dungeon-generation)

**Dependencies**: RandomService

---

### 4.4 InventoryService

**Responsibilities**: Item management and equipment

**Key Capabilities**:
- Add/remove items from inventory
- Equip/unequip weapons, armor, rings, light sources
- Inventory capacity checks
- Consumable item usage

**Dependencies**: None

**See**: [InventoryService Documentation](./services/InventoryService.md)

---

### 4.5 HungerService

**Responsibilities**: Hunger tracking and effects

**Key Capabilities**:
- Tick hunger each turn (affected by rings)
- Feed player with food items
- Calculate hunger state (Normal → Hungry → Weak → Starving)
- Apply hunger effects (strength penalties, damage)
- Variable hunger rates (rings modify consumption)

**Dependencies**: RandomService (for food randomization)

**See**: [Game Design - Hunger](./game-design/08-hunger.md)

---

### 4.6 LevelingService

**Responsibilities**: Experience and level progression

**Key Capabilities**:
- Add experience points from combat
- Check and trigger level-ups
- Calculate XP thresholds per level
- Determine monster XP rewards
- Apply level-up stat increases

**Dependencies**: RandomService (for stat increases)

---

### 4.7 IdentificationService

**Responsibilities**: Item identification and name generation

**Key Capabilities**:
- Generate seeded random item names per game (e.g., "red potion", "oak wand")
- Track identified items across game state
- Get display names (identified vs unidentified)
- Identify items (reading scrolls, using items)

**Name Generation**: Seeded random mapping ensures consistency per save file

**Dependencies**: RandomService

**See**: [IdentificationService Documentation](./services/IdentificationService.md)

---

### 4.8 MessageService

**Responsibilities**: Combat and action log management

**Key Capabilities**:
- Add single or multiple messages to log
- Retrieve recent messages (for UI display)
- Clear message log
- Message grouping by importance (combat, warnings, info)
- Turn-based message filtering

**Message Categories**: Combat, item pickup, level change, hunger warnings, light warnings, death

**Dependencies**: None

**See**: [MessageService Documentation](./services/MessageService.md)

---

### 4.9 RandomService (Injectable Interface)

**Responsibilities**: Centralized RNG for deterministic testing

**Key Capabilities**:
- Integer generation within range
- Dice rolling (supports notation: "2d8", "1d20+3")
- Array shuffling
- Probability checks (0.0 to 1.0)
- Random element selection

**Implementations**:
1. **SeededRandom**: Uses seed string for reproducible dungeon generation
2. **MockRandom**: Returns predefined values for deterministic tests

**Usage**: Injected via DI into Combat, Dungeon, Hunger, Identification, Lighting, and AI services

**Pattern**: Dependency Inversion Principle - all services depend on `IRandomService` interface

---

### 4.10 FOVService

**Responsibilities**: Field of view calculations using recursive shadowcasting

**Key Capabilities**:
- Compute FOV from position with radius (8-octant shadowcasting)
- Update explored tiles based on visible cells
- Check if position is in FOV
- Determine blocking tiles (walls, closed doors)
- Position ↔ string key conversion (for Set storage)

**Algorithm**: 8-octant recursive shadowcasting
**Dependencies**: None

**See**: [Core Systems - FOV System](./systems-core.md#fov-system)

---

### 4.11 LightingService

**Responsibilities**: Light source management and fuel tracking

**Key Capabilities**:
- Create light sources (torches, lanterns, artifacts)
- Tick fuel consumption each turn
- Refill lanterns with oil flasks
- Calculate light radius (determines FOV)
- Generate fuel warnings (50, 10, 0 turns remaining)

**Light Source Types**:
- **Torch**: Radius 2, 500 fuel, consumable
- **Lantern**: Radius 2, 500 fuel, refillable
- **Artifact**: Radius 3, permanent (no fuel)

**Dependencies**: RandomService

**See**: [Core Systems - Lighting System](./systems-core.md#lighting-system)

---

### 4.12 RenderingService

**Responsibilities**: Visibility states and color selection for rendering

**Key Capabilities**:
- Determine visibility state (visible/explored/unexplored)
- Select colors based on visibility (full color vs dimmed)
- Filter entity rendering (monsters only in FOV)
- Apply fog-of-war effects

**Visibility States**:
- `VISIBLE`: In FOV (full color)
- `EXPLORED`: Memory (dimmed/grayscale)
- `HIDDEN`: Unexplored (black)

**Dependencies**: FOVService

**See**: [Core Systems - Visibility System](./systems-core.md#visibility-color-system)

---

### 4.13 TurnService

**Responsibilities**: Turn counter management and turn-based effects

**Key Capabilities**:
- Increment turn counter (single source of truth)
- Retrieve current turn number
- Future: trigger turn-based effects (poison, regeneration, status decay)

**Usage**: Standardized across all 26 commands (eliminates `turnCount + 1` duplication)

**Dependencies**: None

**See**: [TurnService Documentation](./services/TurnService.md)

---

### 4.14 NotificationService

**Responsibilities**: Contextual auto-notifications for player awareness

**Key Capabilities**:
- Generate position-based notifications (items, gold, stairs, doors)
- Resource warnings (full inventory, no food, low fuel)
- Proximity alerts (monsters in adjacent cells)
- Smart deduplication (avoid spam)
- Priority-based filtering (critical warnings first)

**Features**: Context-aware, only shows relevant info for current position

**Dependencies**: IdentificationService

**See**: [NotificationService Documentation](./services/NotificationService.md)

---

### 4.15 MonsterTurnService

**Responsibilities**: Execute monster turns and state updates

**Key Capabilities**:
- Process all monster turns after player action
- Coordinate AI decision → action execution
- Handle monster attacks (via CombatService)
- Generate combat messages
- Update monster states (sleeping → hunting → fleeing)

**Dependencies**: MonsterAIService, CombatService, MessageService, SpecialAbilityService

---

### 4.16 MonsterAIService

**Responsibilities**: Monster behavior and decision-making

**Key Capabilities**:
- Decide monster actions based on AI profile
- Update monster state (sleeping → hunting → fleeing)
- Wake up checks (proximity, noise)
- Implement 7 AI behaviors (see below)

**AI Behavior Types**:
- **SMART**: A* pathfinding to player
- **SIMPLE**: Greedy movement (move toward player)
- **ERRATIC**: 50% random, 50% greedy
- **GREEDY**: Prioritize gold over player
- **THIEF**: Steal items and flee
- **STATIONARY**: No movement
- **COWARD**: Flee when HP < 25%

**Dependencies**: PathfindingService, FOVService, RandomService

**See**: [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai)

---

### 4.17 PathfindingService

**Responsibilities**: A* pathfinding for monster movement

**Key Capabilities**:
- Find optimal path from start to goal
- Calculate neighbor positions (walkable cells)
- Manhattan distance heuristic
- Max depth limiting (performance optimization)

**Algorithm**: A* with Manhattan heuristic

**Dependencies**: None

**See**: [Advanced Systems - Pathfinding](./systems-advanced.md#pathfinding-algorithm)

---

### 4.18 DoorService

**Responsibilities**: Door manipulation and state management

**Key Capabilities**:
- Open/close doors with state updates
- Result object pattern (returns updated level + message)
- Reveal secret doors
- Find door at position
- Validation (can open/close checks)

**Door States**: OPEN, CLOSED, LOCKED, BROKEN, SECRET, ARCHWAY

**Dependencies**: None

**See**: [DoorService Documentation](./services/DoorService.md)

---

### 4.19 LevelService

**Responsibilities**: Level transition logic and spawn positioning

**Key Capabilities**:
- Transition between dungeon levels (up/down stairs)
- Boundary validation (levels 1-10)
- Victory condition checking (amulet + surface)
- Level generation coordination
- Spawn position calculation (opposite stairs)

**Usage**: Centralizes level transition logic from MoveStairsCommand

**Dependencies**: None (coordinates with DungeonService)

**See**: [LevelService Documentation](./services/LevelService.md)

---

### 4.20 SearchService

**Responsibilities**: Secret door and trap discovery

**Key Capabilities**:
- Search for hidden doors/traps at position
- Progressive success chance (50% + 5% per player level)
- Reveal secrets on success
- Adjacent tile checking

**Search Formula**: 50% base + (5% × player level)

**Dependencies**: RandomService

---

### 4.21 TrapService

**Responsibilities**: Trap effects and trigger logic

**Key Capabilities**:
- Trigger trap effects on player
- Probability-based activation
- Apply damage, status effects, teleportation
- Result object pattern (damage, status, message)

**Trap Types**:
- **BEAR**: 1d4 damage, held condition
- **DART**: 1d6 damage, 30% poison
- **TELEPORT**: Random level teleport
- **SLEEP**: 2-4 turns asleep
- **PIT**: 2d6 damage, 20% fall to next level

**Dependencies**: RandomService

---

### 4.22 PotionService

**Responsibilities**: Potion effects and identification

**Key Capabilities**:
- Apply potion effects to player
- Auto-identify on use
- Result object pattern (stat changes, messages)
- Randomized healing (e.g., 1d8 for HEAL)

**Potion Types**: HEAL, EXTRA_HEAL, RESTORE_STRENGTH, GAIN_LEVEL, POISON, BLINDNESS, CONFUSION, etc.

**Dependencies**: RandomService, IdentificationService

---

### 4.23 ScrollService

**Responsibilities**: Scroll effects with item targeting

**Key Capabilities**:
- Apply scroll effects with optional item targeting
- Identify items (reveal true type)
- Enchant weapons/armor (+1 bonus, max +3)
- Auto-identify scroll on use
- Validation (enchant limits, target types)

**Scroll Types**: IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR, TELEPORT, MAPPING, REMOVE_CURSE

**Dependencies**: IdentificationService, InventoryService

---

### 4.24 WandService

**Responsibilities**: Wand usage and charge management

**Key Capabilities**:
- Apply wand effects with monster targeting
- Charge tracking (3-7 charges per wand)
- Auto-identify on use
- Wand types: damage, sleep, teleport, haste, slow

**Status**: Basic implementation (full effects pending Phase 5 targeting system)

**Dependencies**: IdentificationService

---

### 4.25 RoomGenerationService

**Responsibilities**: Room placement with collision detection

**Key Capabilities**:
- Generate random rooms within dungeon bounds
- Collision detection (prevent overlaps)
- Configurable room count and size
- Minimum spacing enforcement

**Dependencies**: RandomService

---

### 4.26 CorridorGenerationService

**Responsibilities**: Corridor path generation with winding

**Key Capabilities**:
- Connect rooms with corridors
- Winding path generation (organic feel)
- Minimum Spanning Tree algorithm
- Loop creation (30% chance for alternate routes)

**Algorithm**: MST + probabilistic loops

**Dependencies**: RandomService

**See**: [Advanced Systems - Dungeon Generation](./systems-advanced.md#dungeon-generation)

---

### 4.27 VictoryService

**Responsibilities**: Win condition checking and score calculation

**Key Capabilities**:
- Check victory condition (Amulet + Level 1)
- Calculate final score
- Compile victory statistics

**Win Condition**: Reach Level 1 (surface) with Amulet of Yendor

**Score Formula**: `(Gold × 10) + (Level × 100) + (XP × 5) - (Turns ÷ 10)`

**Dependencies**: None

**See**: [VictoryService Documentation](./services/VictoryService.md)

---

### 4.28 DebugService

**Responsibilities**: Debug commands and visualizations

**Key Capabilities**:
- God mode (invincibility)
- Map reveal (explore all tiles)
- FOV overlay visualization
- Pathfinding overlay (show monster paths)
- Debug state management

**Hotkeys**: `~` console, `g` god mode, `v` reveal map, `f` FOV overlay, `p` pathfinding

**Dependencies**: MessageService

**See**: [Advanced Systems - Debug System](./systems-advanced.md#debug-system)

---

### 4.29 ContextService

**Responsibilities**: Contextual help and command suggestions

**Key Capabilities**:
- List available commands based on game state
- Generate position-based action suggestions
- Context-aware help text
- Interactive command reference

**Example Suggestions**: "Press 'o' to open door", "Press ',' to pick up items", "Press 's' to search"

**Dependencies**: IdentificationService

**See**: [ContextService Documentation](./services/ContextService.md)

---

### 4.30 LocalStorageService

**Responsibilities**: Browser localStorage persistence wrapper

**Key Capabilities**:
- Save/load game state (JSON serialization)
- Custom serialization (Map, Set conversion)
- Delete saves (permadeath enforcement)
- List saved games
- Continue pointer (most recent save)

**Storage Keys**: `roguelike_save_{gameId}`, `roguelike_continue`

**Dependencies**: None

**See**: [LocalStorageService Documentation](./services/LocalStorageService.md)

---

### 4.31 SpecialAbilityService

**Responsibilities**: Special monster abilities (rust armor, steal gold, drain strength)

**Key Capabilities**:
- Apply monster-specific special attacks
- Result object pattern (stat changes, messages)
- Probability-based activation

**Abilities**:
- **RUSTS_ARMOR**: Reduces AC (Aquator)
- **STEALS_GOLD**: Takes gold and flees (Leprechaun)
- **DRAINS_STRENGTH**: Reduces strength (Rattlesnake)

**Dependencies**: RandomService

---

### 4.32 AssetLoaderService

**Responsibilities**: Load sprite sheets, parse .prf tile mappings, cache loaded assets

**Key Capabilities**:
- Asynchronous PNG image loading via browser Image API
- Parse Angband .prf format tile mapping files
- Convert hexadecimal coordinates (0x80-based) to pixel offsets
- Build sprite coordinate lookup maps for fast rendering
- Cache loaded tilesets to avoid duplicate network requests
- Character-to-Angband feature name mapping

**Tileset Support**:
- **Format**: AngbandTK Gervais 32×32 tileset
- **Files**: Single PNG sprite atlas + multiple .prf mapping files
- **Coordinate System**: Hex-based (0x80:0x80 origin)
- **Lookup**: Character → Angband feature name → sprite coordinates

**Key Methods**:
- `loadTileset(imageUrl: string, prfFiles: string[], tileSize: number): Promise<Tileset>`
- `getSprite(char: string): TileCoordinate | null`
- `getSpriteByName(type: string, name: string, condition?: string): TileCoordinate | null`
- `isLoaded(): boolean`
- `getCurrentTileset(): Tileset | null`

**Character Mapping**:
- Maps ASCII characters (`@`, `.`, `#`, `+`) to Angband feature names
- Supports condition variants (torch, lit, los, *, no condition)
- Fallback strategies for missing sprites

**Dependencies**: None (uses browser Image API and fetch API)

**See**: [AssetLoaderService Documentation](./services/AssetLoaderService.md)

---

## 5. Command Layer Details

**Command Pattern** for user actions:

**Interface**: `ICommand` with single `execute(state: GameState): GameState` method

**Command Responsibilities**:
- Orchestrate service calls (NO game logic)
- Coordinate multi-step operations
- Return new immutable state
- Easily testable via mocked services

**Example Flow** (MoveCommand):
```
1. Calculate new position (MovementService)
2. Check collision/monster (MovementService)
3. Handle combat if needed (CombatService)
4. Move player (MovementService)
5. Tick hunger (HungerService)
6. Tick fuel (LightingService)
7. Recompute FOV (FOVService)
8. Increment turn (TurnService)
9. Return new state
```

**Architectural Rules**:
- ✅ Service calls only (orchestration)
- ✅ Simple routing (`if monster then attack else move`)
- ❌ NO loops, calculations, or business logic
- ❌ NO duplicate logic across commands

**See**: [CLAUDE.md - Command Pattern](../CLAUDE.md#architecture-patterns) for full details

---

## 6. Data Structures

### 6.1 GameState
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

---

### 6.2 Player
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

---

### 6.3 Equipment
```typescript
interface Equipment {
  weapon: Weapon | null;
  armor: Armor | null;
  leftRing: Ring | null;
  rightRing: Ring | null;
  lightSource: LightSource | null;
}
```

---

### 6.4 LightSource
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

See [Core Systems](./systems-core.md#lighting-system) for lighting mechanics.

---

### 6.5 Monster
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

See [Advanced Systems](./systems-advanced.md#monster-ai) for AI behavior details.

---

### 6.6 Level
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

---

### 6.7 Door
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

See [Advanced Systems](./systems-advanced.md#dungeon-generation) for door placement mechanics.

---

### 6.8 Tile
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

See [Core Systems](./systems-core.md#visibility-color-system) for color specifications.

---

## 7. Data Files (JSON)

All game content stored in `/data/*.json`:

### 7.1 monsters.json
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
  }
  // ... 24 more monsters
]
```

See [Game Design - Monsters](./game-design/04-monsters.md) for complete monster list.

---

### 7.2 items.json
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

See [Game Design - Items](./game-design/05-items.md) for complete item specifications.

---

### 7.3 config.json
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
      "open": 0.40,
      "closed": 0.30,
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

## 8. Technical Specifications Summary

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

## 9. Testing Best Practices

### 9.1 Dependency Injection

Always inject dependencies for testability:

```typescript
// ✅ Good - Testable
export class CombatService {
  constructor(private random: IRandomService) {}

  calculateDamage(dice: string): number {
    return this.random.roll(dice)
  }
}

// ❌ Avoid - Not testable
export class CombatService {
  calculateDamage(dice: string): number {
    return Math.random() * 10  // Can't control randomness
  }
}
```

---

### 9.2 Use MockRandom for Deterministic Tests

```typescript
test('damage calculation uses dice roll', () => {
  const mockRandom = new MockRandom([8])  // Next roll returns 8
  const service = new CombatService(mockRandom)

  const damage = service.calculateDamage('1d8')
  expect(damage).toBe(8)
})
```

---

### 9.3 Test Immutability

Verify that state updates return new objects:

```typescript
test('tickFuel returns new LightSource object', () => {
  const torch = service.createTorch()
  const ticked = service.tickFuel(torch)

  expect(ticked).not.toBe(torch)  // Different object reference
  expect(torch.fuel).toBe(500)    // Original unchanged
  expect(ticked.fuel).toBe(499)   // New object updated
})
```

See [Testing Strategy](./testing-strategy.md) for complete testing guidelines.

---

## References

- **Game Design**: [game-design/](./game-design/README.md)
- **Core Systems**: [systems-core.md](./systems-core.md)
- **Advanced Systems**: [systems-advanced.md](./systems-advanced.md)
- **Testing Strategy**: [testing-strategy.md](./testing-strategy.md)
- **Development Plan**: [plan.md](./plan.md)
