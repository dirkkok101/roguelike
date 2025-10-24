import { ICommand } from '@commands/ICommand'
import { CommandEvent, COMMAND_TYPES } from '@game/replay/replay'
import { ICommandFactory } from './ICommandFactory'

// Command imports
import { MoveCommand } from '@commands/MoveCommand'
import { RestCommand } from '@commands/RestCommand'
import { SearchCommand } from '@commands/SearchCommand'
import { PickUpCommand } from '@commands/PickUpCommand'
import { DropCommand } from '@commands/DropCommand'
import { AttackCommand } from '@commands/AttackCommand'
import { RunCommand } from '@commands/RunCommand'
import { QuaffPotionCommand } from '@commands/QuaffPotionCommand'
import { ReadScrollCommand } from '@commands/ReadScrollCommand'
import { ZapWandCommand } from '@commands/ZapWandCommand'
import { EatCommand } from '@commands/EatCommand'
import { EquipCommand } from '@commands/EquipCommand'
import { UnequipCommand } from '@commands/UnequipCommand'
import { TakeOffCommand } from '@commands/TakeOffCommand'
import { MoveStairsCommand } from '@commands/MoveStairsCommand'
import { OpenDoorCommand } from '@commands/OpenDoorCommand'
import { CloseDoorCommand } from '@commands/CloseDoorCommand'
import { RefillLanternCommand } from '@commands/RefillLanternCommand'

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
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { StatusEffectService } from '@services/StatusEffectService'
import { TargetingService } from '@services/TargetingService'
import { IdentificationService } from '@services/IdentificationService'
import { CurseService } from '@services/CurseService'
import { StairsNavigationService } from '@services/StairsNavigationService'
import { VictoryService } from '@services/VictoryService'
import { LevelService } from '@services/LevelService'

// ============================================================================
// COMMAND FACTORY - Create command instances from events for replay
// ============================================================================

/**
 * CommandFactory
 *
 * Reconstructs command instances from CommandEvent records during replay.
 * Injects all necessary service dependencies for each command type.
 *
 * **Supported Commands:**
 * - Movement: MOVE, RUN
 * - Combat: ATTACK
 * - Exploration: REST, SEARCH
 * - Items: PICKUP, DROP, EQUIP, WIELD, WEAR, UNEQUIP, QUAFF, READ, ZAP, EAT, TAKE_OFF, REFILL_LANTERN
 * - Doors: OPEN, CLOSE
 * - Navigation: DESCEND, ASCEND (MoveStairsCommand)
 *
 * **Not Supported (system commands):**
 * - SAVE, QUIT: Require UI callbacks, not replayable
 * - Debug commands: Not relevant for gameplay replay
 * - AI commands: Generated during replay, not from events
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
    private stairsNavigationService: StairsNavigationService,
    private levelService: LevelService,
    private victoryService: VictoryService,

    // Item services
    private restService: RestService,
    private inventoryService: InventoryService,
    private potionService: PotionService,
    private scrollService: ScrollService,
    private wandService: WandService,
    private statusEffectService: StatusEffectService,
    private targetingService: TargetingService,
    private identificationService: IdentificationService,
    private curseService: CurseService
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

      case COMMAND_TYPES.RUN:
        return new RunCommand(
          event.payload.direction,
          this.recorder,
          this.randomService
        )

      // === COMBAT ===
      case COMMAND_TYPES.ATTACK:
        if (!event.payload.monsterId) {
          throw new Error('ATTACK command requires monsterId in payload')
        }
        return new AttackCommand(
          event.payload.monsterId,
          this.combatService,
          this.messageService,
          this.levelingService,
          this.turnService,
          this.goldService,
          this.recorder,
          this.randomService
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
          this.identificationService,
          this.levelService,
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
          this.identificationService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.EQUIP:
        if (!event.payload.itemId) {
          throw new Error('EQUIP command requires itemId in payload')
        }
        return new EquipCommand(
          event.payload.itemId,
          event.payload.ringSlot || null,
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.identificationService,
          this.curseService,
          this.fovService,
          this.lightingService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.WIELD:
        if (!event.payload.itemId) {
          throw new Error('WIELD command requires itemId in payload')
        }
        return new EquipCommand(
          event.payload.itemId,
          null, // No ring slot for weapons/light sources
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.identificationService,
          this.curseService,
          this.fovService,
          this.lightingService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.WEAR:
        if (!event.payload.itemId) {
          throw new Error('WEAR command requires itemId in payload')
        }
        return new EquipCommand(
          event.payload.itemId,
          null, // No ring slot for armor
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.identificationService,
          this.curseService,
          this.fovService,
          this.lightingService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.UNEQUIP:
        if (!event.payload.ringSlot) {
          throw new Error('UNEQUIP command requires ringSlot in payload')
        }
        return new UnequipCommand(
          event.payload.ringSlot,
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.curseService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.REMOVE:
        if (!event.payload.equipmentSlot) {
          throw new Error('REMOVE (TakeOff) command requires equipmentSlot in payload')
        }
        return new TakeOffCommand(
          event.payload.equipmentSlot,
          this.inventoryService,
          this.messageService,
          this.turnService,
          this.fovService,
          this.lightingService,
          this.recorder,
          this.randomService
        )

      // === ITEM USE ===
      case COMMAND_TYPES.QUAFF:
        if (!event.payload.itemId) {
          throw new Error('QUAFF command requires itemId in payload')
        }
        return new QuaffPotionCommand(
          event.payload.itemId,
          this.inventoryService,
          this.potionService,
          this.identificationService,
          this.messageService,
          this.turnService,
          this.statusEffectService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.READ:
        if (!event.payload.itemId) {
          throw new Error('READ command requires itemId in payload')
        }
        return new ReadScrollCommand(
          event.payload.itemId,
          this.inventoryService,
          this.scrollService,
          this.messageService,
          this.turnService,
          this.statusEffectService,
          event.payload.targetItemId,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.ZAP:
        if (!event.payload.itemId) {
          throw new Error('ZAP command requires itemId in payload')
        }
        return new ZapWandCommand(
          event.payload.itemId,
          this.inventoryService,
          this.wandService,
          this.messageService,
          this.turnService,
          this.statusEffectService,
          this.targetingService,
          event.payload.targetPosition,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.EAT:
        return new EatCommand(
          this.inventoryService,
          this.hungerService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === DOORS ===
      case 'open': // COMMAND_TYPES doesn't define OPEN/CLOSE as separate constants
        if (!event.payload.direction) {
          throw new Error('OPEN command requires direction in payload')
        }
        return new OpenDoorCommand(
          event.payload.direction,
          this.messageService,
          this.doorService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      case 'close':
        if (!event.payload.direction) {
          throw new Error('CLOSE command requires direction in payload')
        }
        return new CloseDoorCommand(
          event.payload.direction,
          this.messageService,
          this.doorService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === LEVEL NAVIGATION ===
      case COMMAND_TYPES.DESCEND:
        return new MoveStairsCommand(
          'down',
          this.stairsNavigationService,
          this.fovService,
          this.lightingService,
          this.messageService,
          this.victoryService,
          this.levelService,
          this.turnService,
          this.statusEffectService,
          this.recorder,
          this.randomService
        )

      case COMMAND_TYPES.ASCEND:
        return new MoveStairsCommand(
          'up',
          this.stairsNavigationService,
          this.fovService,
          this.lightingService,
          this.messageService,
          this.victoryService,
          this.levelService,
          this.turnService,
          this.statusEffectService,
          this.recorder,
          this.randomService
        )

      // === EQUIPMENT MAINTENANCE ===
      case 'refill-lantern': // Custom command type for lantern refilling
        if (!event.payload.itemId) {
          throw new Error('REFILL_LANTERN command requires itemId in payload')
        }
        return new RefillLanternCommand(
          event.payload.itemId,
          this.inventoryService,
          this.lightingService,
          this.messageService,
          this.turnService,
          this.recorder,
          this.randomService
        )

      // === UNSUPPORTED COMMANDS ===
      default:
        throw new Error(
          `Unsupported command type for replay: ${event.commandType}. ` +
            `Supported: MOVE, RUN, ATTACK, REST, SEARCH, PICKUP, DROP, EQUIP, WIELD, WEAR, ` +
            `UNEQUIP, REMOVE, QUAFF, READ, ZAP, EAT, OPEN, CLOSE, DESCEND, ASCEND, REFILL_LANTERN. ` +
            `Not supported: SAVE, QUIT (require UI callbacks), debug commands, AI commands.`
        )
    }
  }
}
