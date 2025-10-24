# Service Reference

Complete reference for all services in the ASCII Roguelike. Services contain all game logic and follow the **Service Layer** pattern.

---

## Architecture Principles

All services follow these rules:
- **Pure Logic**: Services contain ALL game logic (no logic in commands/UI)
- **Dependency Injection**: Services receive dependencies via constructor
- **Immutability**: Services return new objects, never mutate inputs
- **Stateless**: Services don't hold mutable state (state passed as parameters)
- **Testable**: All services have comprehensive unit tests

See [Architecture Guide](../architecture.md) for details.

---

## Quick Reference Table

| Service | Responsibility | Key Methods | Dependencies |
|---------|----------------|-------------|--------------|
| **Core Game Logic** ||||
| [MovementService](./MovementService.md) | Position validation, collision detection | `isWalkable`, `detectObstacle`, `movePlayer` | None |
| [CombatService](./CombatService.md) | Combat formulas, hit/damage calculation | `playerAttack`, `monsterAttack` | RandomService, RingService, HungerService |
| [FOVService](./FOVService.md) | Field of view, shadowcasting | `computeFOV`, `updateFOVAndExploration` | None |
| [LightingService](./LightingService.md) | Light sources, fuel management | `tickFuel`, `getLightRadius`, `refillLantern` | RandomService |
| [HungerService](./HungerService.md) | Hunger tracking, starvation | `tickHunger`, `consumeFood` | RandomService, RingService |
| [RegenerationService](./RegenerationService.md) | Health regeneration (1 HP/10 turns) | `tickRegeneration`, `hasRegenerationRing` | RingService |
| [LevelingService](./LevelingService.md) | XP, level-up, stat progression | `addExperience`, `levelUp` | None |
| [InventoryService](./InventoryService.md) | Item management, equipping | `addItem`, `equipWeapon`, `canCarry` | None |
| [DoorService](./DoorService.md) | Door state management | `openDoor`, `closeDoor`, `canOpenDoor` | None |
| [SearchService](./SearchService.md) | Secret detection | `searchForSecrets` | RandomService |
| **Monster Systems** ||||
| [MonsterAIService](./MonsterAIService.md) | AI behaviors (7 types) | `processMonsterTurn`, `updateMonsterState` | PathfindingService, Random |
| [MonsterTurnService](./MonsterTurnService.md) | Monster turn processing | `processMonsterTurns` | MonsterAIService, CombatService |
| [SpecialAbilityService](./SpecialAbilityService.md) | Monster abilities | `applyAbility`, `processBreathWeapon` | RandomService, CombatService |
| **Level Generation** ||||
| [DungeonService](./DungeonService.md) | Level generation orchestration | `generateLevel` | RoomGen, CorridorGen, MonsterSpawn, Random |
| [DungeonGenerationService](./DungeonGenerationService.md) | Procedural dungeon generation | `generateLevel` | RandomService, RoomGen, CorridorGen, MonsterSpawn, ItemSpawn |
| [RoomGenerationService](./RoomGenerationService.md) | Room creation | `generateRooms` | RandomService |
| [CorridorGenerationService](./CorridorGenerationService.md) | Corridor pathfinding | `generateCorridors` | RandomService |
| [MonsterSpawnService](./MonsterSpawnService.md) | Data-driven monster spawning | `loadMonsterData`, `spawnMonsters` | RandomService |
| [ItemSpawnService](./ItemSpawnService.md) | Rarity-based item generation | `spawnItem`, `spawnSpecificItem` | RandomService, ItemData |
| [RoomDetectionService](./RoomDetectionService.md) | Floodfill room detection | `detectRoom` | None |
| [LevelService](./LevelService.md) | Level utilities | `getSpawnPosition` | None |
| **Pathfinding & Rendering** ||||
| [PathfindingService](./PathfindingService.md) | A* algorithm | `findPath` | None |
| [RenderingService](./RenderingService.md) | Visual rendering | `getVisibilityState`, `getTileColor` | None |
| **Item Systems** ||||
| [PotionService](./PotionService.md) | Potion effects (13 types) | `applyPotion` | RandomService, IdentificationService, StatusEffectService, LevelingService, FOVService |
| [StatusEffectService](./StatusEffectService.md) | Status effects, durations | `addStatusEffect`, `tickStatusEffects` | None |
| [ScrollService](./ScrollService.md) | Scroll effects | `applyScroll` | None |
| [WandService](./WandService.md) | Wand effects, charges | `applyWand`, `decrementCharge` | RandomService |
| [RingService](./RingService.md) | Ring bonuses, passive abilities | `getRingBonus`, `calculateHungerModifier`, `triggerTeleportation` | RandomService |
| [IdentificationService](./IdentificationService.md) | Item identification | `identifyItem`, `getDisplayName` | None |
| [TrapService](./TrapService.md) | Trap detection, triggering | `detectTrap`, `triggerTrap` | RandomService, StatusEffectService |
| [CurseService](./CurseService.md) | Curse detection and removal | `isCursed`, `removeCurse`, `removeCursesFromEquipment` | None |
| **UI & Support** ||||
| [MessageService](./MessageService.md) | Message log management | `addMessage`, `groupMessages` | None |
| [NotificationService](./NotificationService.md) | Auto-notifications | `generateNotifications` | None |
| [ToastNotificationService](./ToastNotificationService.md) | Global async notifications | `show`, `subscribe`, `unsubscribe` | None |
| [ContextService](./ContextService.md) | Turn context tracking | `createContext`, `updateContext` | None |
| [TurnService](./TurnService.md) | Turn management, energy system | `incrementTurn`, `grantPlayerEnergy`, `consumePlayerEnergy` | StatusEffectService |
| [VictoryService](./VictoryService.md) | Win condition checking | `checkVictory`, `calculateScore` | None |
| [DebugService](./DebugService.md) | Debug tools | `toggleGodMode`, `revealMap` | None |
| **Domain Services** ||||
| [RestService](./RestService.md) | Multi-turn resting | `rest` | RegenerationService, HungerService, LightingService, FOVService |
| [StairsNavigationService](./StairsNavigationService.md) | Stairs traversal, respawning | `descend`, `ascend`, `canDescend`, `canAscend` | MonsterSpawnService |
| [DeathService](./DeathService.md) | Death statistics, achievements | `calculateDeathStats`, `determineAchievements`, `generateEpitaph` | None |
| [DisturbanceService](./DisturbanceService.md) | Running interruption detection | `checkDisturbance` | None |
| **Storage & Replay** ||||
| [IndexedDBService](./IndexedDBService.md) | Browser database wrapper | `saveGame`, `loadGame`, `listGames`, `deleteGame` | None (browser IndexedDB) |
| [GameStorageService](./GameStorageService.md) | Save/load orchestration | `saveGame`, `loadGame`, `listGames`, `getLeaderboard` | IndexedDB, Compression, Serialization, Score |
| [LocalStorageService](./LocalStorageService.md) | Legacy localStorage persistence | `saveGame`, `loadGame` | None |
| [LeaderboardStorageService](./LeaderboardStorageService.md) | Leaderboard persistence | `saveEntries`, `loadEntries`, `addEntry` | None (localStorage) |
| [LeaderboardService](./LeaderboardService.md) | Leaderboard entry management | `createEntry`, `filterEntries`, `calculateStatistics`, `getRank` | None |
| [ScoreCalculationService](./ScoreCalculationService.md) | Score formula | `calculateScore` | None |
| [CommandRecorderService](./CommandRecorderService.md) | Command history tracking | `recordCommand`, `getCommands`, `persistToIndexedDB` | None |
| [ReplayDebuggerService](./ReplayDebuggerService.md) | Replay validation | `loadReplay`, `validateDeterminism`, `reconstructState` | CommandFactory |
| [CommandFactory](./CommandFactory.md) | Command reconstruction | `createCommand` | All command types |
| [CompressionWorkerService](./CompressionWorkerService.md) | Web Worker compression | `compress`, `decompress` | None (Web Worker) |
| [SerializationWorkerService](./SerializationWorkerService.md) | Off-thread serialization | `serialize`, `deserialize` | None (Web Worker) |
| [DownloadService](./DownloadService.md) | Browser file downloads | `downloadJSON`, `downloadBlob` | None (browser Blob/URL APIs) |
| **Rendering & Assets** ||||
| [AssetLoaderService](./AssetLoaderService.md) | Sprite sheet loading, .prf parsing | `loadTileset`, `getSprite`, `getSpriteByName` | None (browser Image/fetch) |
| [TerrainSpriteService](./TerrainSpriteService.md) | Terrain sprite mapping | `getTerrainSprite`, `loadMappings` | None |
| **Middleware & Orchestration** ||||
| [AutoSaveMiddleware](./AutoSaveMiddleware.md) | Auto-save every N turns | `afterTurn` | GameStorageService, CommandRecorder, ReplayDebugger |
| **Preferences & Randomness** ||||
| [PreferencesService](./PreferencesService.md) | User preferences, event system | `get`, `set`, `subscribe`, `notifyChange` | None |
| [RandomService](./RandomService.md) | Seeded RNG | `nextInt`, `roll`, `MockRandom` | None |

---

## Service Categories

### Core Game Logic (10 services)
Essential gameplay systems:
- [MovementService](./MovementService.md) - Movement, collision
- [CombatService](./CombatService.md) - Combat mechanics
- [FOVService](./FOVService.md) - Field of view
- [LightingService](./LightingService.md) - Light management
- [HungerService](./HungerService.md) - Hunger system
- [RegenerationService](./RegenerationService.md) - Health regeneration
- [LevelingService](./LevelingService.md) - XP and leveling
- [InventoryService](./InventoryService.md) - Item management
- [DoorService](./DoorService.md) - Door mechanics
- [SearchService](./SearchService.md) - Secret detection

### Monster Systems (3 services)
Monster behavior and abilities:
- [MonsterAIService](./MonsterAIService.md) - AI behaviors (SMART, SIMPLE, ERRATIC, etc.)
- [MonsterTurnService](./MonsterTurnService.md) - Turn processing
- [SpecialAbilityService](./SpecialAbilityService.md) - Special abilities (breath, drain, etc.)

### Level Generation (7 services)
Procedural dungeon generation:
- [DungeonService](./DungeonService.md) - Generation orchestration
- [DungeonGenerationService](./DungeonGenerationService.md) - Procedural generation with MST connectivity
- [RoomGenerationService](./RoomGenerationService.md) - Room creation
- [CorridorGenerationService](./CorridorGenerationService.md) - Corridor generation
- [MonsterSpawnService](./MonsterSpawnService.md) - Data-driven monster spawning
- [ItemSpawnService](./ItemSpawnService.md) - Rarity-based item generation
- [RoomDetectionService](./RoomDetectionService.md) - Floodfill room detection
- [LevelService](./LevelService.md) - Level utilities

### Pathfinding & Rendering (2 services)
Algorithms and visualization:
- [PathfindingService](./PathfindingService.md) - A* pathfinding
- [RenderingService](./RenderingService.md) - Visual rendering

### Item Systems (8 services)
Consumables, status effects, and identification:
- [PotionService](./PotionService.md) - Potion effects
- [StatusEffectService](./StatusEffectService.md) - Status effects and durations
- [ScrollService](./ScrollService.md) - Scroll effects
- [WandService](./WandService.md) - Wand effects
- [RingService](./RingService.md) - Ring bonuses and passive abilities
- [IdentificationService](./IdentificationService.md) - Item identification
- [TrapService](./TrapService.md) - Traps
- [CurseService](./CurseService.md) - Curse detection and removal

### UI & Support (7 services)
Supporting systems:
- [MessageService](./MessageService.md) - Message log
- [NotificationService](./NotificationService.md) - Auto-notifications
- [ToastNotificationService](./ToastNotificationService.md) - Global async notifications
- [ContextService](./ContextService.md) - Turn context
- [TurnService](./TurnService.md) - Turn management
- [VictoryService](./VictoryService.md) - Win conditions
- [DebugService](./DebugService.md) - Debug tools

### Domain Services (4 services)
High-level game features:
- [RestService](./RestService.md) - Multi-turn resting with interrupts
- [StairsNavigationService](./StairsNavigationService.md) - 26-level navigation with Amulet mechanics
- [DeathService](./DeathService.md) - Death statistics and achievements
- [DisturbanceService](./DisturbanceService.md) - Running interruption detection

### Storage & Replay (12 services)
Save/load, replay, and leaderboards:
- [IndexedDBService](./IndexedDBService.md) - Browser database wrapper
- [GameStorageService](./GameStorageService.md) - Save/load orchestration
- [LocalStorageService](./LocalStorageService.md) - Legacy localStorage persistence
- [LeaderboardStorageService](./LeaderboardStorageService.md) - Leaderboard persistence
- [LeaderboardService](./LeaderboardService.md) - Leaderboard entry management
- [ScoreCalculationService](./ScoreCalculationService.md) - Score formula
- [CommandRecorderService](./CommandRecorderService.md) - Command history tracking
- [ReplayDebuggerService](./ReplayDebuggerService.md) - Replay validation
- [CommandFactory](./CommandFactory.md) - Command reconstruction
- [CompressionWorkerService](./CompressionWorkerService.md) - Web Worker compression
- [SerializationWorkerService](./SerializationWorkerService.md) - Off-thread serialization
- [DownloadService](./DownloadService.md) - Browser file downloads

### Rendering & Assets (2 services)
Sprite loading and rendering:
- [AssetLoaderService](./AssetLoaderService.md) - Sprite sheet loading, .prf parsing
- [TerrainSpriteService](./TerrainSpriteService.md) - Terrain sprite mappings

### Middleware & Orchestration (1 service)
Cross-cutting concerns:
- [AutoSaveMiddleware](./AutoSaveMiddleware.md) - Auto-save every N turns with determinism validation

### Preferences & Randomness (2 services)
Configuration and RNG:
- [PreferencesService](./PreferencesService.md) - User preferences with event system
- [RandomService](./RandomService.md) - Seeded RNG

---

## Common Patterns

### Dependency Injection
```typescript
// Services receive dependencies via constructor
export class CombatService {
  constructor(
    private random: IRandomService,
    private hungerService?: HungerService
  ) {}
}
```

### Immutability
```typescript
// Services return new objects, never mutate
tickFuel(player: Player): FuelTickResult {
  const tickedLight = { ...light, fuel: light.fuel - 1 }
  const updatedPlayer = {
    ...player,
    equipment: { ...player.equipment, lightSource: tickedLight }
  }
  return { player: updatedPlayer, messages }
}
```

### Result Types
```typescript
// Services export result types for structured returns
export interface FuelTickResult {
  player: Player
  messages: Message[]
}
```

### Pure Functions
```typescript
// Services are stateless - state passed as parameters
computeFOV(origin: Position, radius: number, level: Level): Set<string> {
  // No instance state used, only parameters
  return visibleCells
}
```

---

## Testing

All services have comprehensive test coverage:
- **Unit Tests**: Test individual methods in isolation
- **MockRandom**: Deterministic testing with MockRandom class
- **Scenario-Based**: Tests named after scenarios, not methods
- **>80% Coverage**: All services must maintain >80% code coverage

Example test structure:
```
src/services/
└── FOVService/
    ├── FOVService.ts          # Implementation
    ├── shadowcasting.test.ts  # Shadowcasting algorithm tests
    ├── radius.test.ts         # Radius validation tests
    ├── blocking.test.ts       # Vision blocking tests
    └── index.ts               # Barrel export
```

---

## Service Dependencies

**Dependency Graph** (simplified):

```
Commands
    ↓
Services (orchestrated by commands)
    ├── Core Services (no dependencies)
    │   ├── MovementService
    │   ├── FOVService
    │   ├── MessageService
    │   ├── StatusEffectService
    │   ├── AssetLoaderService (browser APIs only)
    │   ├── TerrainSpriteService
    │   └── PreferencesService
    │
    ├── RandomService (injected everywhere)
    │
    └── Composite Services (depend on other services)
        ├── TurnService → StatusEffectService
        ├── CombatService → RandomService, HungerService
        ├── MonsterAIService → PathfindingService, RandomService
        ├── MonsterTurnService → MonsterAIService, CombatService
        ├── PotionService → RandomService, StatusEffectService, LevelingService, FOVService
        └── DungeonService → RoomGen, CorridorGen, RandomService
```

**Key Principles:**
- **Acyclic**: No circular dependencies
- **Minimal**: Services only depend on what they need
- **Optional**: Some dependencies are optional (e.g., HungerService in CombatService)

---

## Usage Examples

### Using Services in Commands
```typescript
class MoveCommand implements ICommand {
  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService
    // ... other services
  ) {}

  execute(state: GameState): GameState {
    // 1. Use MovementService
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // 2. Use LightingService
    const fuelResult = this.lightingService.tickFuel(player)

    // 3. Use FOVService
    const fovResult = this.fovService.updateFOVAndExploration(
      position,
      lightRadius,
      level
    )

    // 4. Return new state (immutable)
    return { ...state, player: updatedPlayer, ... }
  }
}
```

### Testing Services
```typescript
describe('CombatService - Hit Calculation', () => {
  let service: CombatService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom([15]) // Deterministic roll
    service = new CombatService(mockRandom)
  })

  test('player hits when roll + modifier >= 10', () => {
    const result = service.playerAttack(player, monster)
    expect(result.hit).toBe(true)
  })
})
```

---

## Related Documentation

- **[Architecture Guide](../architecture.md)** - Overall architecture patterns
- **[Command Reference](../commands/README.md)** - How commands use services
- **[Testing Strategy](../testing-strategy.md)** - Service testing conventions
- **[Core Systems](../systems-core.md)** - System-level documentation
- **[Advanced Systems](../systems-advanced.md)** - Advanced system documentation

---

**Last Updated**: 2025-01-24 (Added 22 services: Storage & Replay, Domain Services, Middleware)
