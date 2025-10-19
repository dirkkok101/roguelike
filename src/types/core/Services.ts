// ============================================================================
// SERVICES CONTAINER - Groups all services for dependency injection
// ============================================================================

import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'
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
import { GameStorageService } from '@services/GameStorageService'
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
import { ToastNotificationService } from '@services/ToastNotificationService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { IndexedDBService } from '@services/IndexedDBService'
import { DownloadService } from '@services/DownloadService'

/**
 * Dependency injection container for game services and configuration
 *
 * Groups all game services and configuration objects to reduce parameter counts
 * in constructors. Organized by functional area for clarity.
 *
 * Note: Contains both services (stateful objects) and configuration (plain objects).
 *
 * @example
 * const dependencies: GameDependencies = {
 *   movement: movementService,
 *   lighting: lightingService,
 *   dungeonConfig: dungeonConfig,
 *   // ... etc
 * }
 *
 * const handler = new InputHandler(dependencies, modalController, callbacks)
 */
export interface GameDependencies {
  // Core gameplay services
  movement: MovementService
  lighting: LightingService
  fov: FOVService
  message: MessageService
  random: IRandomService
  turn: TurnService
  level: LevelService

  // World generation
  dungeon: DungeonService
  stairsNavigation: StairsNavigationService

  // Configuration (plain objects, not services)
  dungeonConfig: DungeonConfig

  // Combat and entities
  combat: CombatService
  gold: GoldService

  // Player stats and progression
  hunger: HungerService
  regeneration: RegenerationService
  leveling: LevelingService
  statusEffect: StatusEffectService

  // Inventory and items
  inventory: InventoryService
  identification: IdentificationService
  curse: CurseService
  ring: RingService

  // Item usage
  potion: PotionService
  scroll: ScrollService
  wand: WandService

  // Environment interaction
  door: DoorService
  targeting: TargetingService

  // Persistence and meta
  localStorage: GameStorageService
  notification: NotificationService
  toastNotification: ToastNotificationService
  victory: VictoryService
  debug: DebugService

  // Replay and debugging
  commandRecorder: CommandRecorderService
  replayDebugger: ReplayDebuggerService
  indexedDB: IndexedDBService
  download: DownloadService
}
