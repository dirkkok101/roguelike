import { GameState, ItemType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelService } from '@services/LevelService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// PICK UP COMMAND - Pick up items from the dungeon floor
// ============================================================================

export class PickUpCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService,
    private levelService: LevelService,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.PICKUP,
      actorType: 'player',
      payload: { position: state.player.position },
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const playerPos = state.player.position

    // Find item at player's position
    const itemAtPosition = level.items.find(
      (item) => item.position && item.position.x === playerPos.x && item.position.y === playerPos.y
    )

    if (!itemAtPosition) {
      const messages = this.messageService.addMessage(
        state.messages,
        'There is nothing here to pick up.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Check if inventory has space
    if (!this.inventoryService.canCarry(state.player.inventory)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Your pack is full. You cannot carry any more items.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Add item to inventory (this removes position property)
    const updatedPlayer = this.inventoryService.addItem(state.player, itemAtPosition)

    // Remove item from level
    const updatedLevel = this.levelService.removeItemFromLevel(level, itemAtPosition.id)
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // Check if picked up amulet
    const isAmulet = itemAtPosition.type === ItemType.AMULET
    const hasAmulet = state.hasAmulet || isAmulet

    // Add appropriate message
    const displayName = this.identificationService.getDisplayName(itemAtPosition, state)
    let messages = this.messageService.addMessage(
      state.messages,
      `You pick up ${displayName}.`,
      'success',
      state.turnCount
    )

    if (isAmulet) {
      messages = this.messageService.addMessage(
        messages,
        'You have retrieved the Amulet of Yendor! Return to Level 1 to win!',
        'success',
        state.turnCount
      )
    }

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      levels: updatedLevels,
      messages,
      hasAmulet,
      itemsFound: state.itemsFound + 1, // Track item pickup for death screen
    })
  }
}
