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
import { UseItemCommand } from '@commands/UseItemCommand'
import { EatCommand } from '@commands/EatCommand'
import { ToggleGodModeCommand } from '@commands/ToggleGodModeCommand'
import { RevealMapCommand } from '@commands/RevealMapCommand'
import { ToggleDebugConsoleCommand } from '@commands/ToggleDebugConsoleCommand'
import { SpawnMonsterCommand } from '@commands/SpawnMonsterCommand'
import { WakeAllMonstersCommand } from '@commands/WakeAllMonstersCommand'
import { KillAllMonstersCommand } from '@commands/KillAllMonstersCommand'
import { ToggleFOVDebugCommand } from '@commands/ToggleFOVDebugCommand'
import { TogglePathDebugCommand } from '@commands/TogglePathDebugCommand'
import { ToggleAIDebugCommand } from '@commands/ToggleAIDebugCommand'
import { MovementService } from '@services/MovementService'
import { DebugService } from '@services/DebugService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { CombatService } from '@services/CombatService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { NotificationService } from '@services/NotificationService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { DoorService } from '@services/DoorService'
import { ItemEffectService } from '@services/ItemEffectService'
import { GameState, Scroll, ScrollType } from '@game/core/core'
import { ModalController } from './ModalController'

// ============================================================================
// INPUT HANDLER - Keyboard input to commands
// ============================================================================

type InputMode = 'normal' | 'open_door' | 'close_door'

export class InputHandler {
  private mode: InputMode = 'normal'
  private pendingCommand: ICommand | null = null

  constructor(
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private random: IRandomService,
    private dungeonService: DungeonService,
    private dungeonConfig: DungeonConfig,
    private combatService: CombatService,
    private inventoryService: InventoryService,
    private identificationService: IdentificationService,
    private hungerService: HungerService,
    private levelingService: LevelingService,
    private modalController: ModalController,
    private debugService: DebugService,
    private notificationService: NotificationService,
    private victoryService: VictoryService,
    private localStorageService: LocalStorageService,
    private doorService: DoorService,
    private itemEffectService: ItemEffectService,
    private messageHistoryModal?: any, // MessageHistoryModal
    private helpModal?: any // HelpModal
  ) {}

  /**
   * Handle keyboard event and return command (if any)
   * @param event Keyboard event
   * @param state Current game state (needed for modal item selection)
   */
  handleKeyPress(event: KeyboardEvent, state: GameState): ICommand | null {
    // 1. Check if modal is handling input first
    if (this.modalController.handleInput(event)) {
      // Modal handled the input, check if we have a pending command
      const cmd = this.pendingCommand
      this.pendingCommand = null
      return cmd
    }

    // 2. Handle modal input (waiting for direction)
    if (this.mode === 'open_door' || this.mode === 'close_door') {
      const direction = this.getDirectionFromKey(event.key)
      if (direction) {
        event.preventDefault()
        const command =
          this.mode === 'open_door'
            ? new OpenDoorCommand(direction, this.messageService, this.doorService)
            : new CloseDoorCommand(direction, this.messageService, this.doorService)
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
          this.hungerService,
          this.notificationService
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
          this.hungerService,
          this.notificationService
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
          this.hungerService,
          this.notificationService
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
          this.hungerService,
          this.notificationService
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
        return new SearchCommand(this.messageService, this.random)

      case 'S':
        event.preventDefault()
        return new SaveCommand(this.localStorageService, this.messageService)

      case 'Q':
        event.preventDefault()
        return new QuitCommand(this.localStorageService)

      case '>':
        event.preventDefault()
        return new MoveStairsCommand(
          'down',
          this.dungeonService,
          this.dungeonConfig,
          this.fovService,
          this.lightingService,
          this.messageService,
          this.victoryService
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
          this.victoryService
        )

      // =====================================================================
      // ITEM COMMANDS
      // =====================================================================

      case ',':
        // Pickup item at current position
        event.preventDefault()
        return new PickUpCommand(this.inventoryService, this.messageService)

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
              this.messageService
            )
          }
        })
        return null

      case 'q':
        // Quaff potion
        event.preventDefault()
        this.modalController.showItemSelection('potion', 'Quaff which potion?', state, (item) => {
          if (item) {
            this.pendingCommand = new UseItemCommand(
              item.id,
              'quaff',
              this.inventoryService,
              this.messageService,
              this.itemEffectService
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
            // Show unidentified items
            this.modalController.showItemSelection(
              'unidentified',
              'Identify which item?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new UseItemCommand(
                    scroll.id,
                    'read',
                    this.inventoryService,
                    this.messageService,
                    this.itemEffectService,
                    targetItem.id
                  )
                }
              }
            )
          } else if (scrollItem.scrollType === ScrollType.ENCHANT_WEAPON) {
            // Show weapons
            this.modalController.showItemSelection(
              'weapon',
              'Enchant which weapon?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new UseItemCommand(
                    scroll.id,
                    'read',
                    this.inventoryService,
                    this.messageService,
                    this.itemEffectService,
                    targetItem.id
                  )
                }
              }
            )
          } else if (scrollItem.scrollType === ScrollType.ENCHANT_ARMOR) {
            // Show armor
            this.modalController.showItemSelection(
              'armor',
              'Enchant which armor?',
              state,
              (targetItem) => {
                if (targetItem) {
                  this.pendingCommand = new UseItemCommand(
                    scroll.id,
                    'read',
                    this.inventoryService,
                    this.messageService,
                    this.itemEffectService,
                    targetItem.id
                  )
                }
              }
            )
          } else {
            // Other scrolls (no selection needed)
            this.pendingCommand = new UseItemCommand(
              scroll.id,
              'read',
              this.inventoryService,
              this.messageService,
              this.itemEffectService
            )
          }
        })
        return null

      case 'z':
        // Zap wand
        event.preventDefault()
        this.modalController.showItemSelection('wand', 'Zap which wand?', state, (item) => {
          if (item) {
            this.pendingCommand = new UseItemCommand(
              item.id,
              'zap',
              this.inventoryService,
              this.messageService,
              this.itemEffectService
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
          this.random
        )

      case 'w':
        // Wield weapon
        event.preventDefault()
        this.modalController.showItemSelection('weapon', 'Wield which weapon?', state, (item) => {
          if (item) {
            this.pendingCommand = new EquipCommand(
              item.id,
              null, // No ring slot for weapons
              this.inventoryService,
              this.messageService
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
              this.messageService
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
              this.messageService
            )
          }
        })
        return null

      case 'R':
        // Remove ring
        event.preventDefault()
        // Remove from left if present, else right
        const ringSlot = state.player.equipment.leftRing ? 'left' : 'right'
        return new UnequipCommand(ringSlot, this.inventoryService, this.messageService)

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
