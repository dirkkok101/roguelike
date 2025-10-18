import { ICommand } from '@commands/ICommand'
import { CommandEvent, COMMAND_TYPES } from '@game/replay/replay'
import { ICommandFactory } from './ICommandFactory'

// Command imports
import { MoveCommand } from '@commands/MoveCommand'
import { RestCommand } from '@commands/RestCommand'
import { SearchCommand } from '@commands/SearchCommand'
import { PickUpCommand } from '@commands/PickUpCommand'
import { DropCommand } from '@commands/DropCommand'

// Service imports
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { NotificationService } from '@services/NotificationService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { TurnService } from '@services/TurnService'
import { GoldService } from '@services/GoldService'
import { MonsterAIService } from '@services/MonsterAIService'
import { DisturbanceService } from '@services/DisturbanceService'
import { RestService } from '@services/RestService'
import { SearchService } from '@services/SearchService'
import { InventoryService } from '@services/InventoryService'

// ============================================================================
// COMMAND FACTORY - Create command instances from events for replay
// ============================================================================

/**
 * CommandFactory
 *
 * Reconstructs command instances from CommandEvent records during replay.
 * Injects all necessary service dependencies for each command type.
 *
 * **Supported Commands (Phase 1):**
 * - MOVE: Player movement
 * - REST: Resting to heal
 * - SEARCH: Searching for traps/doors
 * - PICKUP: Pick up items
 * - DROP: Drop items
 *
 * **TODO (Phase 2):**
 * - ATTACK, RUN, DESCEND, ASCEND
 *
 * **TODO (Phase 3):**
 * - All remaining command types
 */
export class CommandFactory implements ICommandFactory {
  constructor(
    // Core services (used by most commands)
    private recorder: CommandRecorderService,
    private randomService: IRandomService,
    private messageService: MessageService,
    private turnService: TurnService,
    private notificationService: NotificationService,

    // Movement and exploration services
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private searchService: SearchService,

    // Combat and progression services
    private combatService: CombatService,
    private levelingService: LevelingService,
    private hungerService: HungerService,
    private regenerationService: RegenerationService,

    // Level and environment services
    private doorService: DoorService,
    private goldService: GoldService,
    private monsterAIService: MonsterAIService,
    private disturbanceService: DisturbanceService,

    // Other services
    private restService: RestService,
    private inventoryService: InventoryService
  ) {}

  /**
   * Create command instance from event
   *
   * @throws Error if command type is unsupported
   */
  createFromEvent(event: CommandEvent): ICommand {
    switch (event.commandType) {
      // === MOVEMENT ===
      case COMMAND_TYPES.MOVE:
        return new MoveCommand(
          event.payload.direction,
          this.movementService,
          this.lightingService,
          this.fovService,
          this.messageService,
          this.combatService,
          this.levelingService,
          this.doorService,
          this.hungerService,
          this.regenerationService,
          this.notificationService,
          this.turnService,
          this.goldService,
          this.recorder,
          this.randomService,
          this.monsterAIService,
          this.disturbanceService
        )

      // === RESTING ===
      case COMMAND_TYPES.REST:
        return new RestCommand(
          this.restService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === SEARCHING ===
      case COMMAND_TYPES.SEARCH:
        return new SearchCommand(
          this.searchService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === ITEM MANAGEMENT ===
      case COMMAND_TYPES.PICKUP:
        return new PickUpCommand(
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.DROP:
        if (!event.payload.item) {
          throw new Error('DROP command requires item in payload')
        }
        return new DropCommand(
          event.payload.item,
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === UNSUPPORTED (Phase 2+) ===
      default:
        throw new Error(
          `Unsupported command type for replay: ${event.commandType}. ` +
            `Only basic commands (MOVE, REST, SEARCH, PICKUP, DROP) are currently supported. ` +
            `Full command support coming in Phase 2/3 of replay implementation.`
        )
    }
  }
}
