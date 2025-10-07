import { GameState, ItemType, Weapon, Armor, Ring, Torch, Lantern, Artifact } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { IdentificationService } from '@services/IdentificationService'
import { CurseService } from '@services/CurseService'

// ============================================================================
// EQUIP COMMAND - Equip weapons, armor, and rings
// ============================================================================

export class EquipCommand implements ICommand {
  constructor(
    private itemId: string,
    private ringSlot: 'left' | 'right' | null,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private turnService: TurnService,
    private identificationService: IdentificationService,
    private curseService: CurseService
  ) {}

  execute(state: GameState): GameState {
    // Check if already equipped (equipped items are not in inventory)
    if (this.inventoryService.isEquipped(state.player, this.itemId)) {
      const equippedItems = this.inventoryService.getEquippedItems(state.player)
      const equippedItem = equippedItems.find((i) => i.id === this.itemId)

      const messages = this.messageService.addMessage(
        state.messages,
        `${equippedItem?.name || 'That item'} is already equipped.`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Find item in inventory
    const item = this.inventoryService.findItem(state.player, this.itemId)

    if (!item) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You do not have that item.',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Equip based on item type
    let updatedPlayer = state.player
    let updatedState = state
    let equipMessage = ''
    const displayName = this.identificationService.getDisplayName(item, state)

    switch (item.type) {
      case ItemType.WEAPON:
        // Check if current weapon is cursed
        if (this.curseService.isCursed(state.player.equipment.weapon)) {
          const messages = this.messageService.addMessage(
            state.messages,
            `The ${state.player.equipment.weapon!.name} is cursed! You cannot remove it.`,
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }
        updatedPlayer = this.inventoryService.equipWeapon(state.player, item as Weapon)
        equipMessage = `You wield ${displayName}.`
        break

      case ItemType.ARMOR:
        // Check if current armor is cursed
        if (this.curseService.isCursed(state.player.equipment.armor)) {
          const messages = this.messageService.addMessage(
            state.messages,
            `The ${state.player.equipment.armor!.name} is cursed! You cannot remove it.`,
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }
        updatedPlayer = this.inventoryService.equipArmor(state.player, item as Armor)
        equipMessage = `You put on ${displayName}.`
        break

      case ItemType.RING: {
        if (!this.ringSlot) {
          const messages = this.messageService.addMessage(
            state.messages,
            'You must specify which hand (left or right) to wear the ring on.',
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }

        const ring = item as Ring
        const wasIdentified = this.identificationService.isIdentified(ring.ringType, state)

        updatedPlayer = this.inventoryService.equipRing(
          state.player,
          ring,
          this.ringSlot
        )

        // Identify ring by equipping it
        updatedState = this.identificationService.identifyByUse(ring, state)

        // Craft equip message with identification info
        if (wasIdentified) {
          equipMessage = `You put on ${displayName} on your ${this.ringSlot} hand.`
        } else {
          const trueName = this.identificationService.getDisplayName(ring, updatedState)
          equipMessage = `You put on ${displayName} on your ${this.ringSlot} hand. (This is a ${trueName}!)`
        }
        break
      }

      case ItemType.TORCH:
      case ItemType.LANTERN:
        updatedPlayer = this.inventoryService.equipLightSource(
          state.player,
          item as Torch | Lantern | Artifact
        )
        equipMessage = `You light and wield ${displayName}.`
        break

      default:
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot equip that item.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
    }

    let messages = this.messageService.addMessage(
      updatedState.messages,
      equipMessage,
      'success',
      updatedState.turnCount
    )

    // Check if newly equipped item is cursed (curse discovery)
    if (this.curseService.isCursed(item)) {
      messages = this.messageService.addMessage(
        messages,
        `The ${displayName} is cursed! You cannot remove it.`,
        'warning',
        updatedState.turnCount
      )
    }

    return this.turnService.incrementTurn({
      ...updatedState,
      player: updatedPlayer,
      messages,
    })
  }
}
