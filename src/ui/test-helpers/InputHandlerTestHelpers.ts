import { GameState, Player, Level, TileType, Position, GameDependencies } from '@game/core/core'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { CombatService } from '@services/CombatService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { NotificationService } from '@services/NotificationService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { ToastNotificationService } from '@services/ToastNotificationService'
import { DoorService } from '@services/DoorService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { CurseService } from '@services/CurseService'
import { GoldService } from '@services/GoldService'
import { TargetingService } from '@services/TargetingService'
import { RingService } from '@services/RingService'
import { StairsNavigationService } from '@services/StairsNavigationService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { IndexedDBService } from '@services/IndexedDBService'
import { DownloadService } from '@services/DownloadService'

/**
 * Creates a minimal but valid test player
 */
export function createTestPlayer(): Player {
  return {
    position: { x: 10, y: 10 },
    hp: 12,
    maxHp: 12,
    strength: 16,
    maxStrength: 16,
    ac: 8,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: null,
    },
    inventory: [],
  }
}

/**
 * Creates a minimal valid dungeon level
 */
export function createMinimalLevel(depth: number = 1): Level {
  const width = 80
  const height = 22

  return {
    depth,
    width,
    height,
    tiles: Array(height)
      .fill(null)
      .map(() =>
        Array(width).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#FFFFFF',
          colorExplored: '#888888',
        })
      ),
    rooms: [],
    doors: [],
    traps: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: { x: 40, y: 11 },
    explored: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
    visible: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
  }
}

/**
 * Creates a minimal valid game state for testing
 */
export function createTestGameState(): GameState {
  const level = createMinimalLevel(1)

  return {
    player: createTestPlayer(),
    levels: new Map([[1, level]]),
    currentLevel: 1,
    messages: [],
    turnCount: 0,
    isGameOver: false,
    hasAmulet: false,
    seed: 'test-seed-123',
    debug: {
      debugConsoleVisible: false,
      godMode: false,
      revealMap: false,
      fovDebugOverlay: false,
      pathDebugOverlay: false,
      aiDebugOverlay: false,
      fovMode: 'radius',
    },
  }
}

/**
 * Creates all game dependencies with real service instances
 */
export function createTestDependencies(): GameDependencies {
  const random = new MockRandom()
  const dungeonConfig: DungeonConfig = {
    minRooms: 4,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    maxCorridorLength: 20,
    loopProbability: 0.3,
  }

  return {
    // Core gameplay services
    movement: new MovementService(),
    lighting: new LightingService(),
    fov: new FOVService(),
    message: new MessageService(),
    random,
    turn: new TurnService(),
    level: new LevelService(),

    // World generation
    dungeon: new DungeonService(random, dungeonConfig),
    stairsNavigation: new StairsNavigationService(),
    dungeonConfig,

    // Combat and entities
    combat: new CombatService(random),
    gold: new GoldService(),

    // Player stats and progression
    hunger: new HungerService(),
    regeneration: new RegenerationService(),
    leveling: new LevelingService(),
    statusEffect: new StatusEffectService(),

    // Inventory and items
    inventory: new InventoryService(),
    identification: new IdentificationService(),
    curse: new CurseService(),
    ring: new RingService(),

    // Item usage
    potion: new PotionService(random),
    scroll: new ScrollService(random),
    wand: new WandService(random),

    // Environment interaction
    door: new DoorService(),
    targeting: new TargetingService(),

    // Persistence and meta
    localStorage: new LocalStorageService(),
    notification: new NotificationService(),
    toastNotification: new ToastNotificationService(),
    victory: new VictoryService(),
    debug: new DebugService(),

    // Replay and debugging
    commandRecorder: new CommandRecorderService(),
    replayDebugger: new ReplayDebuggerService(new IndexedDBService()),
    indexedDB: new IndexedDBService(),
    download: new DownloadService(),
  }
}

/**
 * Creates a mock KeyboardEvent for testing
 */
export function createKeyboardEvent(key: string, ctrlKey: boolean = false, shiftKey: boolean = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey,
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
}
