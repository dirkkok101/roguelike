import { ICommand } from '@commands/ICommand'
import { MoveCommand } from '@commands/MoveCommand'
import { OpenDoorCommand } from '@commands/OpenDoorCommand'
import { CloseDoorCommand } from '@commands/CloseDoorCommand'
import { SearchCommand } from '@commands/SearchCommand'
import { MoveStairsCommand } from '@commands/MoveStairsCommand'
import { PickUpCommand } from '@commands/PickUpCommand'
import { DropCommand } from '@commands/DropCommand'
import { SaveCommand } from '@commands/SaveCommand'
import { QuitCommand } from '@commands/QuitCommand'
import { EquipCommand } from '@commands/EquipCommand'
import { UnequipCommand } from '@commands/UnequipCommand'
import { TakeOffCommand } from '@commands/TakeOffCommand'
import { QuaffPotionCommand } from '@commands/QuaffPotionCommand'
import { ReadScrollCommand } from '@commands/ReadScrollCommand'
import { ZapWandCommand } from '@commands/ZapWandCommand'
import { RefillLanternCommand } from '@commands/RefillLanternCommand'
import { EatCommand } from '@commands/EatCommand'
import { RestCommand } from '@commands/RestCommand'
import { ToggleGodModeCommand } from '@commands/ToggleGodModeCommand'
import { RevealMapCommand } from '@commands/RevealMapCommand'
import { ToggleDebugConsoleCommand } from '@commands/ToggleDebugConsoleCommand'
import { SpawnMonsterCommand } from '@commands/SpawnMonsterCommand'
import { WakeAllMonstersCommand } from '@commands/WakeAllMonstersCommand'
import { KillAllMonstersCommand } from '@commands/KillAllMonstersCommand'
import { ToggleFOVDebugCommand } from '@commands/ToggleFOVDebugCommand'
import { TogglePathDebugCommand } from '@commands/TogglePathDebugCommand'
import { ToggleAIDebugCommand } from '@commands/ToggleAIDebugCommand'
import { IdentifyAllItemsCommand } from '@commands/IdentifyAllItemsCommand'
import { SpawnItemCommand } from '@commands/SpawnItemCommand'
import { RestService } from '@services/RestService'
import { SearchService } from '@services/SearchService'
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
import { LocalStorageService } from '@services/LocalStorageService'
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
import { GameState, Scroll, ScrollType, TargetingMode } from '@game/core/core'
import { GameDependencies } from '@game/core/Services'
import { ModalController } from './ModalController'

// ============================================================================
// INPUT HANDLER - Keyboard input to commands
// ============================================================================

type InputMode = 'normal' | 'open_door' | 'close_door'

export class InputHandler {
  private mode: InputMode = 'normal'
  private pendingCommand: ICommand | null = null

  // Services (destructured from container for easy access)
  private readonly movementService: MovementService
  private readonly lightingService: LightingService
  private readonly fovService: FOVService
  private readonly messageService: MessageService
  private readonly random: IRandomService
  private readonly dungeonService: DungeonService
  private readonly dungeonConfig: DungeonConfig
  private readonly combatService: CombatService
  private readonly inventoryService: InventoryService
  private readonly identificationService: IdentificationService
  private readonly hungerService: HungerService
  private readonly regenerationService: RegenerationService
  private readonly levelingService: LevelingService
  private readonly debugService: DebugService
  private readonly notificationService: NotificationService
  private readonly victoryService: VictoryService
  private readonly localStorageService: LocalStorageService
  private readonly doorService: DoorService
  private readonly potionService: PotionService
  private readonly scrollService: ScrollService
  private readonly wandService: WandService
  private readonly turnService: TurnService
  private readonly levelService: LevelService
  private readonly statusEffectService: StatusEffectService
  private readonly curseService: CurseService
  private readonly goldService: GoldService
  private readonly targetingService: TargetingService

  constructor(
    services: GameDependencies,
    private modalController: ModalController,
    private messageHistoryModal: any, // MessageHistoryModal
    private helpModal: any, // HelpModal
    private onReturnToMenu: () => void
  ) {
    // Destructure services for convenient access
    this.movementService = services.movement
    this.lightingService = services.lighting
    this.fovService = services.fov
    this.messageService = services.message
    this.random = services.random
    this.dungeonService = services.dungeon
    this.dungeonConfig = services.dungeonConfig
    this.combatService = services.combat
    this.inventoryService = services.inventory
    this.identificationService = services.identification
    this.hungerService = services.hunger
    this.regenerationService = services.regeneration
    this.levelingService = services.leveling
    this.debugService = services.debug
    this.notificationService = services.notification
    this.victoryService = services.victory
    this.localStorageService = services.localStorage
    this.doorService = services.door
    this.potionService = services.potion
    this.scrollService = services.scroll
    this.wandService = services.wand
    this.turnService = services.turn
    this.levelService = services.level
    this.statusEffectService = services.statusEffect
    this.curseService = services.curse
    this.goldService = services.gold
    this.targetingService = services.targeting
  }

  /**
   * Handle keyboard event and return command (if any)
   * @param event Keyboard event
   * @param state Current game state (needed for modal item selection)
   */
  handleKeyPress(event: KeyboardEvent, state: GameState): ICommand | null {
    // 1. Check for pending command first (defensive: catches commands even if event handling races)
    if (this.pendingCommand) {
      const cmd = this.pendingCommand
      this.pendingCommand = null
      return cmd
    }

    // 2. Check if modal is handling input
    if (this.modalController.handleInput(event)) {
      // Modal handled the input, check if we have a pending command
      const cmd = this.pendingCommand
      this.pendingCommand = null
      return cmd
    }

    // 3. Handle modal input (waiting for direction)
    if (this.mode === 'open_door' || this.mode === 'close_door') {
      const direction = this.getDirectionFromKey(event.key)
      if (direction) {
        event.preventDefault()
        const command =
          this.mode === 'open_door'
            ? new OpenDoorCommand(direction, this.messageService, this.doorService, this.turnService)
            : new CloseDoorCommand(direction, this.messageService, this.doorService, this.turnService)
        this.mode = 'normal'
        return command
      }
      // Cancel on Escape
      if (event.key === 'Escape') {
        event.preventDefault()
        this.mode = 'normal'
        return null
      }
      return null
    }

    // Normal mode - handle regular commands
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        return new MoveCommand(
          'up',
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
          this.goldService
        )

      case 'ArrowDown':
        event.preventDefault()
        return new MoveCommand(
          'down',
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
          this.goldService
        )

      case 'ArrowLeft':
        event.preventDefault()
        return new MoveCommand(
          'left',
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
          this.goldService
        )

      case 'ArrowRight':
        event.preventDefault()
        return new MoveCommand(
          'right',
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
          this.goldService
        )

      case 'o':
        event.preventDefault()
        this.mode = 'open_door'
        // TODO: Show message "Open door in which direction?"
        return null

      case 'c':
        event.preventDefault()
        this.mode = 'close_door'
        // TODO: Show message "Close door in which direction?"
        return null

      case 's':
        event.preventDefault()
        // Create SearchService (stateless, can be instantiated on demand)
        const searchService = new SearchService(this.random, this.doorService)
        return new SearchCommand(searchService, this.messageService, this.turnService)

      case 'S':
        event.preventDefault()
        return new SaveCommand(this.localStorageService, this.messageService)

      case 'Q':
        event.preventDefault()
        return new QuitCommand(this.localStorageService, this.onReturnToMenu)

      case '>':
        event.preventDefault()
        return new MoveStairsCommand(
          'down',
          this.dungeonService,
          this.dungeonConfig,
          this.fovService,
          this.lightingService,
          this.messageService,
          this.victoryService,
          this.levelService,
          this.turnService,
          this.statusEffectService
        )

      case '<':
        event.preventDefault()
        return new MoveStairsCommand(
          'up',
          this.dungeonService,
          this.dungeonConfig,
          this.fovService,
          this.lightingService,
          this.messageService,
          this.victoryService,
          this.levelService,
          this.turnService,
          this.statusEffectService
        )

      // =====================================================================
      // ITEM COMMANDS
      // =====================================================================

      case ',':
        // Pickup item at current position
        event.preventDefault()
        return new PickUpCommand(this.inventoryService, this.messageService, this.turnService, this.identificationService, this.levelService)

      case 'i':
        // Show inventory
        event.preventDefault()
        this.modalController.showInventory(state)
        return null

      case 'd':
        // Drop item
        event.preventDefault()
        this.modalController.showItemSelection('all', 'Drop which item?', state, (item) => {
          if (item) {
            this.pendingCommand = new DropCommand(
              item.id,
              this.inventoryService,
              this.messageService,
              this.turnService,
              this.identificationService
            )
          }
        })
        return null

      case 'q':
        // Quaff potion
        event.preventDefault()
        this.modalController.showItemSelection('potion', 'Quaff which potion?', state, (item) => {
          if (item) {
            this.pendingCommand = new QuaffPotionCommand(
              item.id,
              this.inventoryService,
              this.potionService,
              this.messageService,
              this.turnService,
              this.statusEffectService
            )
          }
        })
        return null

      case 'r':
        // Read scroll
        event.preventDefault()
        this.modalController.showItemSelection('scroll', 'Read which scroll?', state, (scroll) => {
          if (!scroll) return

          // Check scroll type to determine if we need item selection
          const scrollItem = scroll as Scroll

          if (scrollItem.scrollType === ScrollType.IDENTIFY) {
            // Close scroll selection modal before opening target selection
            this.modalController.hide()

            // Show unidentified items (exclude the scroll being read)
            this.modalController.showItemSelection(
              'unidentified',
              'Identify which item?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new ReadScrollCommand(
                    scroll.id,
                    this.inventoryService,
                    this.scrollService,
                    this.messageService,
                    this.turnService,
                    this.statusEffectService,
                    targetItem.id
                  )
                }
              },
              scroll.id // Exclude the identify scroll itself
            )
          } else if (scrollItem.scrollType === ScrollType.ENCHANT_WEAPON) {
            // Close scroll selection modal before opening target selection
            this.modalController.hide()

            // Show weapons
            this.modalController.showItemSelection(
              'weapon',
              'Enchant which weapon?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new ReadScrollCommand(
                    scroll.id,
                    this.inventoryService,
                    this.scrollService,
                    this.messageService,
                    this.turnService,
                    this.statusEffectService,
                    targetItem.id
                  )
                }
              }
            )
          } else if (scrollItem.scrollType === ScrollType.ENCHANT_ARMOR) {
            // Close scroll selection modal before opening target selection
            this.modalController.hide()

            // Show armor
            this.modalController.showItemSelection(
              'armor',
              'Enchant which armor?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new ReadScrollCommand(
                    scroll.id,
                    this.inventoryService,
                    this.scrollService,
                    this.messageService,
                    this.turnService,
                    this.statusEffectService,
                    targetItem.id
                  )
                }
              }
            )
          } else {
            // Other scrolls (no selection needed)
            this.pendingCommand = new ReadScrollCommand(
              scroll.id,
              this.inventoryService,
              this.scrollService,
              this.messageService,
              this.turnService,
              this.statusEffectService
            )
          }
        })
        return null

      case 'z':
        // Zap wand
        event.preventDefault()
        this.modalController.showItemSelection('wand', 'Zap which wand?', state, (item) => {
          if (item) {
            // Close wand selection modal before opening targeting modal
            this.modalController.hide()

            // After wand selected, show targeting modal
            const wand = item as any // Cast to Wand (will have range property)
            const wandRange = wand.range || 5 // Default range if not set yet

            const targetingRequest = {
              mode: TargetingMode.MONSTER,
              maxRange: wandRange,
              requiresLOS: true,
            }

            this.modalController.showTargeting(
              targetingRequest,
              state,
              (result) => {
                // Targeting confirmed
                if (result.success && result.targetMonsterId) {
                  this.pendingCommand = new ZapWandCommand(
                    item.id,
                    this.inventoryService,
                    this.wandService,
                    this.messageService,
                    this.turnService,
                    this.statusEffectService,
                    this.targetingService,
                    result.targetMonsterId
                  )
                }
              },
              () => {
                // Targeting cancelled - do nothing
                this.pendingCommand = null
              }
            )
          }
        })
        return null

      case 'e':
        // Eat food
        event.preventDefault()
        return new EatCommand(
          this.inventoryService,
          this.hungerService,
          this.messageService,
          this.turnService
        )

      case '5':
      case '.':
        // Rest until HP full or interrupted
        event.preventDefault()
        const restService = new RestService(
          this.regenerationService,
          this.hungerService,
          this.lightingService,
          this.fovService
        )
        return new RestCommand(
          restService,
          this.messageService,
          this.turnService
        )

      case 'F':
        // Refill lantern with oil flask
        event.preventDefault()
        this.modalController.showItemSelection('oil_flask', 'Use which oil flask?', state, (item) => {
          if (item) {
            this.pendingCommand = new RefillLanternCommand(
              item.id,
              this.inventoryService,
              this.lightingService,
              this.messageService,
              this.turnService
            )
          }
        })
        return null

      case 'w':
        // Wield equipment (weapon or light source)
        event.preventDefault()
        this.modalController.showItemSelection('equipment', 'Wield which item?', state, (item) => {
          if (item) {
            this.pendingCommand = new EquipCommand(
              item.id,
              null, // No ring slot for weapons/light sources
              this.inventoryService,
              this.messageService,
              this.turnService,
              this.identificationService,
              this.curseService,
              this.fovService,
              this.lightingService
            )
          }
        })
        return null

      case 'W':
        // Wear armor
        event.preventDefault()
        this.modalController.showItemSelection('armor', 'Wear which armor?', state, (item) => {
          if (item) {
            this.pendingCommand = new EquipCommand(
              item.id,
              null, // No ring slot for armor
              this.inventoryService,
              this.messageService,
              this.turnService,
              this.identificationService,
              this.curseService,
              this.fovService,
              this.lightingService
            )
          }
        })
        return null

      case 'P':
        // Put on ring
        event.preventDefault()
        this.modalController.showItemSelection('ring', 'Put on which ring?', state, (item) => {
          if (item) {
            // Choose first available slot (left preferred)
            const slot = !state.player.equipment.leftRing ? 'left' : 'right'
            this.pendingCommand = new EquipCommand(
              item.id,
              slot,
              this.inventoryService,
              this.messageService,
              this.turnService,
              this.identificationService,
              this.curseService,
              this.fovService,
              this.lightingService
            )
          }
        })
        return null

      case 'R':
        // Remove ring
        event.preventDefault()
        this.modalController.showEquippedRingSelection(state, (result) => {
          if (result) {
            this.pendingCommand = new UnequipCommand(
              result.slot,
              this.inventoryService,
              this.messageService,
              this.turnService,
              this.curseService
            )
          }
        })
        return null

      case 't':
        // Take off equipment (Angband-style)
        event.preventDefault()
        // TODO: Show modal to select which equipment to remove
        // For now, prioritize light source removal (most common use case)
        if (state.player.equipment.lightSource) {
          return new TakeOffCommand('lightSource', this.inventoryService, this.messageService, this.turnService, this.fovService, this.lightingService)
        } else if (state.player.equipment.weapon) {
          return new TakeOffCommand('weapon', this.inventoryService, this.messageService, this.turnService, this.fovService, this.lightingService)
        } else if (state.player.equipment.armor) {
          return new TakeOffCommand('armor', this.inventoryService, this.messageService, this.turnService, this.fovService, this.lightingService)
        } else {
          this.messageService.addMessage(
            state.messages,
            'You have nothing equipped to take off.',
            'info',
            state.turnCount
          )
          return null
        }

      // =====================================================================
      // DEBUG COMMANDS (dev only)
      // =====================================================================

      case '~':
        // Toggle debug console
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleDebugConsoleCommand(this.debugService)
        }
        return null

      case 'g':
        // Toggle god mode
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleGodModeCommand(this.debugService)
        }
        return null

      case 'v':
        // Reveal map
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new RevealMapCommand(this.debugService)
        }
        return null

      case 'm':
        // Spawn monster (hardcoded to 'T' for now - TODO: add monster selection modal)
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new SpawnMonsterCommand('T', this.debugService)
        }
        return null

      case 'M':
        // Show message history (if not in debug mode with monsters)
        // Otherwise wake all monsters (debug)
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new WakeAllMonstersCommand(this.debugService)
        } else if (this.messageHistoryModal) {
          event.preventDefault()
          this.messageHistoryModal.show(state)
          return null
        }
        return null

      case 'K':
        // Kill all monsters
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new KillAllMonstersCommand(this.debugService)
        }
        return null

      case 'f':
        // Toggle FOV debug overlay
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleFOVDebugCommand(this.debugService)
        }
        return null

      case 'p':
        // Toggle pathfinding debug overlay
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new TogglePathDebugCommand(this.debugService)
        }
        return null

      case 'n':
        // Toggle AI debug overlay
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new ToggleAIDebugCommand(this.debugService)
        }
        return null

      case 'a':
        // Identify all items
        if (this.debugService.isEnabled()) {
          event.preventDefault()
          return new IdentifyAllItemsCommand(this.debugService)
        }
        return null

      case 'I':
        // Spawn item (with category and subtype selection)
        if (this.debugService.isEnabled()) {
          event.preventDefault()

          // Step 1: Show item category selection
          this.modalController.showSpawnItemCategory((category) => {
            if (!category) return // Cancelled

            // Step 2: For items with subtypes, show subtype selection
            const categoriesWithSubtypes = ['potion', 'scroll', 'ring', 'wand']

            if (categoriesWithSubtypes.includes(category)) {
              // Show subtype selection modal
              this.modalController.showSpawnItemSubtype(category, (subtype) => {
                if (subtype) {
                  this.pendingCommand = new SpawnItemCommand(category, subtype, this.debugService)
                }
              })
            } else {
              // No subtype needed, spawn directly
              this.pendingCommand = new SpawnItemCommand(category, undefined, this.debugService)
            }
          })
          return null
        }
        return null

      case '?':
        // Show help modal
        if (this.helpModal) {
          event.preventDefault()
          this.helpModal.show(state)
          return null
        }
        return null

      default:
        return null
    }
  }

  /**
   * Convert arrow key to direction vector
   */
  private getDirectionFromKey(key: string): { x: number; y: number } | null {
    switch (key) {
      case 'ArrowUp':
        return { x: 0, y: -1 }
      case 'ArrowDown':
        return { x: 0, y: 1 }
      case 'ArrowLeft':
        return { x: -1, y: 0 }
      case 'ArrowRight':
        return { x: 1, y: 0 }
      default:
        return null
    }
  }
}
