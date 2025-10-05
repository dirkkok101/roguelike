# Technical Architecture: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design.md) | [Core Systems](./systems-core.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

---

## 1. Technology Stack

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

## 2. Architecture Layers

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

### 4.5 HungerService

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

**Hunger States**: Normal, Hungry, Weak, Starving (see [Game Design](./game-design.md#hunger-system))

**Dependencies**: RandomService (for food randomization)

---

### 4.6 LevelingService

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

### 4.7 IdentificationService

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

### 4.8 MessageService

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

### 4.9 RandomService (Injectable Interface)

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

### 4.10 FOVService

**Responsibilities**: Field of view calculations using recursive shadowcasting

**Methods**:
```typescript
class FOVService {
  computeFOV(origin: Position, radius: number, level: Level): Set<string>
  updateFOVAndExploration(position: Position, radius: number, level: Level): FOVUpdateResult
  updateExploredTiles(level: Level, visibleCells: Set<string>): Level
  isInFOV(position: Position, visibleCells: Set<string>): boolean
  isBlocking(position: Position, level: Level): boolean
  posToKey(position: Position): string
  keyToPos(key: string): Position
}
```

**Algorithm**: 8-octant recursive shadowcasting
**Dependencies**: None

See [Core Systems - FOV System](./systems-core.md#fov-system) for algorithm details.

---

### 4.11 LightingService

**Responsibilities**: Light source management and fuel tracking

**Methods**:
```typescript
class LightingService {
  createTorch(): LightSource
  createLantern(): LightSource
  createArtifact(name: string): LightSource
  tickFuel(player: Player): FuelTickResult
  refillLantern(lightSource: LightSource, oilFlask: Item): LightSource
  getLightRadius(lightSource: LightSource | null): number
  getFuelWarnings(fuel: number): string[]
}
```

**Light Sources**:
- **Torch**: Radius 1, 500 fuel
- **Lantern**: Radius 2, 500 fuel, refillable
- **Artifact**: Radius 3, permanent (no fuel)

**Dependencies**: None

See [Core Systems - Lighting System](./systems-core.md#lighting-system) for mechanics.

---

### 4.12 RenderingService

**Responsibilities**: Visibility states and color selection for rendering

**Methods**:
```typescript
class RenderingService {
  getVisibilityState(position: Position, visibleCells: Set<string>, level: Level): VisibilityState
  getTileColor(tile: Tile, visibilityState: VisibilityState): string
  getMonsterColor(monster: Monster, visibilityState: VisibilityState): string
  shouldRenderMonster(monster: Monster, position: Position, visibleCells: Set<string>): boolean
}
```

**Visibility States**:
- `VISIBLE`: In FOV (full color)
- `EXPLORED`: Memory (dimmed)
- `HIDDEN`: Unexplored (black)

**Dependencies**: None

See [Core Systems - Visibility System](./systems-core.md#visibility-color-system) for color specs.

---

### 4.13 TurnService

**Responsibilities**: Turn counter management and turn-based effects

**Methods**:
```typescript
class TurnService {
  incrementTurn(state: GameState): GameState
  getCurrentTurn(state: GameState): number
}
```

**Usage**: Standardized across all 26 commands (replaces inline `turnCount + 1`)
**Dependencies**: None

---

### 4.14 NotificationService

**Responsibilities**: Contextual auto-notifications for player awareness

**Methods**:
```typescript
class NotificationService {
  constructor(private identificationService: IdentificationService) {}

  generateNotifications(state: GameState, previousPosition?: Position): string[]
}
```

**Notification Types**:
- Items/gold at position
- Nearby doors/stairs
- Resource warnings (full inventory, no food)
- Proximity alerts (monsters nearby)

**Features**: Smart deduplication, priority-based, context-aware
**Dependencies**: IdentificationService

---

### 4.15 MonsterTurnService

**Responsibilities**: Execute monster turns and state updates

**Methods**:
```typescript
class MonsterTurnService {
  constructor(
    private monsterAI: MonsterAIService,
    private combat: CombatService,
    private messageService: MessageService
  ) {}

  executeMonsterTurns(state: GameState): GameState
  processMonsterAction(monster: Monster, state: GameState): GameState
}
```

**Dependencies**: MonsterAIService, CombatService, MessageService

---

### 4.16 MonsterAIService

**Responsibilities**: Monster behavior and decision-making

**Methods**:
```typescript
class MonsterAIService {
  constructor(
    private pathfinding: PathfindingService,
    private fov: FOVService,
    private random: IRandomService
  ) {}

  decideAction(monster: Monster, state: GameState): MonsterAction
  updateMonsterState(monster: Monster, canSeePlayer: boolean): Monster
  shouldWakeUp(monster: Monster, state: GameState): boolean
}
```

**AI Behaviors**:
- SMART (A* pathfinding)
- SIMPLE (greedy movement)
- ERRATIC (50% random)
- GREEDY (prioritize gold)
- THIEF (steal and flee)
- STATIONARY (don't move)
- COWARD (flee at low HP)

**Dependencies**: PathfindingService, FOVService, RandomService

See [Advanced Systems - Monster AI](./systems-advanced.md#monster-ai) for behavior details.

---

### 4.17 PathfindingService

**Responsibilities**: A* pathfinding for monster movement

**Methods**:
```typescript
class PathfindingService {
  findPath(start: Position, goal: Position, level: Level, maxDepth: number): Position[] | null
  getNeighbors(position: Position, level: Level): Position[]
  heuristic(a: Position, b: Position): number  // Manhattan distance
}
```

**Algorithm**: A* with Manhattan heuristic
**Dependencies**: None

See [Advanced Systems - Pathfinding](./systems-advanced.md#pathfinding-algorithm) for details.

---

### 4.18 DoorService

**Responsibilities**: Door manipulation and state management

**Methods**:
```typescript
class DoorService {
  openDoor(level: Level, door: Door): Level
  openDoorWithResult(level: Level, door: Door): DoorOpenResult
  closeDoor(level: Level, door: Door): Level
  revealSecretDoor(level: Level, door: Door): Level
  getDoorAt(level: Level, position: Position): Door | null
  canOpenDoor(door: Door | null): { canOpen: boolean; reason?: string }
  canCloseDoor(door: Door | null, level: Level, position: Position): { canClose: boolean; reason?: string }
}
```

**Door States**: OPEN, CLOSED, LOCKED, BROKEN, SECRET, ARCHWAY
**Dependencies**: None

---

### 4.19 LevelService

**Responsibilities**: Level spawn positioning and helper methods

**Methods**:
```typescript
class LevelService {
  getSpawnPosition(level: Level, preferredPosition?: Position | null): Position
}
```

**Usage**: Used by MoveStairsCommand for level transitions
**Dependencies**: None

---

### 4.20 SearchService

**Responsibilities**: Secret door and trap discovery

**Methods**:
```typescript
class SearchService {
  constructor(private random: IRandomService) {}

  searchForSecrets(position: Position, level: Level, playerLevel: number): SearchResult
  getSearchChance(playerLevel: number): number  // 50% + (5% × level)
}
```

**Dependencies**: RandomService

---

### 4.21 TrapService

**Responsibilities**: Trap effects and trigger logic

**Methods**:
```typescript
class TrapService {
  constructor(private random: IRandomService) {}

  triggerTrap(trap: Trap, player: Player, state: GameState): TrapEffect
  shouldTriggerTrap(trap: Trap): boolean
}
```

**Trap Types**:
- BEAR (1d4 damage, held)
- DART (1d6 damage, 30% poison)
- TELEPORT (random teleport)
- SLEEP (2-4 turns asleep)
- PIT (2d6 damage, 20% fall-through)

**Dependencies**: RandomService

---

### 4.22 PotionService

**Responsibilities**: Potion effects and identification

**Methods**:
```typescript
class PotionService {
  constructor(
    private random: IRandomService,
    private identificationService: IdentificationService
  ) {}

  applyPotion(player: Player, potion: Potion, state: GameState): PotionEffectResult
}
```

**Potion Types**: HEAL, EXTRA_HEAL, RESTORE_STRENGTH, GAIN_LEVEL, POISON, etc.
**Dependencies**: RandomService, IdentificationService

---

### 4.23 ScrollService

**Responsibilities**: Scroll effects with item targeting

**Methods**:
```typescript
class ScrollService {
  constructor(
    private identificationService: IdentificationService,
    private inventoryService: InventoryService
  ) {}

  applyScroll(player: Player, scroll: Scroll, state: GameState, targetItemId?: string): ScrollEffectResult
}
```

**Scroll Types**:
- IDENTIFY (reveal item type)
- ENCHANT_WEAPON (+1 damage, max +3)
- ENCHANT_ARMOR (+1 AC, max +3)

**Dependencies**: IdentificationService, InventoryService

---

### 4.24 WandService

**Responsibilities**: Wand usage and charge management

**Methods**:
```typescript
class WandService {
  constructor(private identificationService: IdentificationService) {}

  applyWand(player: Player, wand: Wand, state: GameState, targetMonsterId?: string): WandEffectResult
}
```

**Note**: Full wand effects pending targeting system (Phase 5)
**Dependencies**: IdentificationService

---

### 4.25 RoomGenerationService

**Responsibilities**: Room placement with collision detection

**Methods**:
```typescript
class RoomGenerationService {
  constructor(private random: IRandomService) {}

  generateRooms(level: Level, config: DungeonConfig): Room[]
  doesRoomOverlap(room: Room, existingRooms: Room[]): boolean
}
```

**Dependencies**: RandomService

---

### 4.26 CorridorGenerationService

**Responsibilities**: Corridor path generation with winding

**Methods**:
```typescript
class CorridorGenerationService {
  constructor(private random: IRandomService) {}

  connectRooms(rooms: Room[], level: Level): Corridor[]
  generateWindingPath(start: Position, end: Position, windiness: number): Position[]
}
```

**Algorithm**: Minimum Spanning Tree + loop chances
**Dependencies**: RandomService

See [Advanced Systems - Dungeon Generation](./systems-advanced.md#dungeon-generation) for details.

---

### 4.27 VictoryService

**Responsibilities**: Win condition checking and score calculation

**Methods**:
```typescript
class VictoryService {
  checkVictory(state: GameState): boolean
  calculateScore(state: GameState): number
  getVictoryStats(state: GameState): VictoryStats
}
```

**Win Condition**: Reach Level 1 with Amulet of Yendor
**Score Formula**: (Gold × 10) + (Level × 100) + (XP × 5) - (Turns ÷ 10)
**Dependencies**: None

---

### 4.28 DebugService

**Responsibilities**: Debug commands and visualizations

**Methods**:
```typescript
class DebugService {
  toggleGodMode(state: GameState): GameState
  revealMap(state: GameState): GameState
  toggleFOVOverlay(state: GameState): GameState
  togglePathfindingOverlay(state: GameState): GameState
}
```

**Debug Commands**: God mode, map reveal, FOV/pathfinding overlays
**Dependencies**: None

See [Advanced Systems - Debug System](./systems-advanced.md#debug-system) for details.

---

### 4.29 ContextService

**Responsibilities**: Contextual help and command suggestions

**Methods**:
```typescript
class ContextService {
  getAvailableCommands(state: GameState): Command[]
  getSuggestions(state: GameState, position: Position): string[]
}
```

**Dependencies**: None

---

### 4.30 LocalStorageService

**Responsibilities**: Browser localStorage persistence wrapper

**Methods**:
```typescript
class LocalStorageService {
  saveGame(state: GameState): void
  loadGame(gameId: string): GameState | null
  listSavedGames(): SavedGameInfo[]
  deleteGame(gameId: string): void
}
```

**Storage Format**: JSON serialization with compression
**Dependencies**: None

---

### 4.31 SpecialAbilityService

**Responsibilities**: Special monster abilities (rust armor, steal gold, drain strength)

**Methods**:
```typescript
class SpecialAbilityService {
  applySpecialAbility(monster: Monster, player: Player, state: GameState): SpecialAbilityResult
}
```

**Abilities**: RUSTS_ARMOR (Aquator), STEALS_GOLD (Leprechaun), DRAINS_STRENGTH (Rattlesnake)
**Dependencies**: RandomService

---

## 5. Command Layer Details

**Command Pattern** for user actions:

```typescript
interface ICommand {
  execute(state: GameState): GameState;
}
```

**Example Commands**:

### MoveCommand
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

See [Game Design](./game-design.md#monsters) for complete monster list.

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

See [Game Design](./game-design.md#items-equipment) for complete item specifications.

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

- **Game Design**: [game-design.md](./game-design.md)
- **Core Systems**: [systems-core.md](./systems-core.md)
- **Advanced Systems**: [systems-advanced.md](./systems-advanced.md)
- **Testing Strategy**: [testing-strategy.md](./testing-strategy.md)
- **Development Plan**: [plan.md](./plan.md)
