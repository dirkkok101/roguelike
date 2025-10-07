import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { FOVService } from '@services/FOVService'
import type { FOVUpdateResult } from '@services/FOVService'
import { LightingService } from '@services/LightingService'

// ============================================================================
// TAKE OFF COMMAND - Generic equipment removal (Angband's 't' command)
// Handles weapons, armor, rings, and light sources
// ============================================================================

export type EquipmentSlot = 'weapon' | 'armor' | 'leftRing' | 'rightRing' | 'lightSource' | 'prompt'

export class TakeOffCommand implements ICommand {
  constructor(
    private equipmentSlot: EquipmentSlot,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private fovService: FOVService,
    private lightingService: LightingService
  ) {}

  execute(state: GameState): GameState {
    // If 'prompt', show modal to select which equipment to remove
    // This will be handled by the InputHandler/ModalController
    if (this.equipmentSlot === 'prompt') {
      // Modal display logic is handled in the UI layer
      return state
    }

    // Check if slot has equipment
    const equipment = state.player.equipment[this.equipmentSlot]
    if (!equipment) {
      const slotName = this.getSlotDisplayName(this.equipmentSlot)
      const messages = this.messageService.addMessage(
        state.messages,
        `You have nothing equipped in your ${slotName} slot.`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Check if inventory has space
    if (!this.inventoryService.canCarry(state.player.inventory)) {
      const messages = this.messageService.addMessage(
        state.messages,
        'Your pack is full. You cannot remove that equipment.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Unequip based on slot
    let updatedPlayer = state.player
    let message = ''

    switch (this.equipmentSlot) {
      case 'weapon':
        // For weapons, we need a method to unequip them
        // For now, we'll manually handle it similar to other slots
        updatedPlayer = {
          ...state.player,
          inventory: [...state.player.inventory, equipment],
          equipment: { ...state.player.equipment, weapon: null },
        }
        message = `You unwield your ${equipment.name}.`
        break

      case 'armor':
        // For armor, we need to update AC as well
        updatedPlayer = {
          ...state.player,
          inventory: [...state.player.inventory, equipment],
          equipment: { ...state.player.equipment, armor: null },
          ac: 10, // Base AC when no armor
        }
        message = `You take off your ${equipment.name}.`
        break

      case 'leftRing':
      case 'rightRing':
        const ringSlot = this.equipmentSlot === 'leftRing' ? 'left' : 'right'
        updatedPlayer = this.inventoryService.unequipRing(state.player, ringSlot)
        message = `You remove your ${equipment.name}.`
        break

      case 'lightSource': {
        updatedPlayer = this.inventoryService.unequipLightSource(state.player)
        message = `You extinguish and stow your ${equipment.name}.`

        // Update FOV with no light (radius 0)
        const currentLevel = state.levels.get(state.currentLevel)!
        const lightRadius = this.lightingService.getLightRadius(null)
        const fovResult: FOVUpdateResult = this.fovService.updateFOVAndExploration(
          updatedPlayer.position,
          lightRadius,
          currentLevel,
          updatedPlayer
        )

        // Return state with updated FOV before incrementing turn
        const stateWithFOV = {
          ...state,
          player: updatedPlayer,
          messages: this.messageService.addMessage(state.messages, message, 'info', state.turnCount),
          visibleCells: fovResult.visibleCells,
          levels: new Map(state.levels).set(state.currentLevel, fovResult.level)
        }
        return this.turnService.incrementTurn(stateWithFOV)
      }

      default:
        const messages = this.messageService.addMessage(
          state.messages,
          'Cannot remove that equipment.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
    }

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return this.turnService.incrementTurn({
      ...state,
      player: updatedPlayer,
      messages,
    })
  }

  private getSlotDisplayName(slot: EquipmentSlot): string {
    switch (slot) {
      case 'weapon':
        return 'weapon'
      case 'armor':
        return 'armor'
      case 'leftRing':
        return 'left ring'
      case 'rightRing':
        return 'right ring'
      case 'lightSource':
        return 'light source'
      default:
        return 'equipment'
    }
  }
}
