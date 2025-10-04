import {
  GameState,
  ItemType,
  Potion,
  PotionType,
  Scroll,
  ScrollType,
  Wand,
  WandType,
  Food,
  OilFlask,
  Item,
} from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// USE ITEM COMMAND - Consume items (potions, scrolls, wands, food, oil)
// ============================================================================

export type UseItemAction = 'quaff' | 'read' | 'zap' | 'eat' | 'refill'

export class UseItemCommand implements ICommand {
  constructor(
    private itemId: string,
    private action: UseItemAction,
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private random: IRandomService,
    private identificationService: IdentificationService
  ) {}

  execute(state: GameState): GameState {
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

    // Validate action matches item type
    const validationResult = this.validateAction(item)
    if (!validationResult.valid) {
      const messages = this.messageService.addMessage(
        state.messages,
        validationResult.message!,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Apply item effect based on type
    let newState = state
    switch (this.action) {
      case 'quaff':
        newState = this.quaffPotion(state, item as Potion)
        break
      case 'read':
        newState = this.readScroll(state, item as Scroll)
        break
      case 'zap':
        newState = this.zapWand(state, item as Wand)
        break
      case 'eat':
        newState = this.eatFood(state, item as Food)
        break
      case 'refill':
        newState = this.refillLantern(state, item as OilFlask)
        break
    }

    return newState
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateAction(item: Item): { valid: boolean; message?: string } {
    switch (this.action) {
      case 'quaff':
        if (item.type !== ItemType.POTION) {
          return { valid: false, message: 'You cannot drink that.' }
        }
        break
      case 'read':
        if (item.type !== ItemType.SCROLL) {
          return { valid: false, message: 'You cannot read that.' }
        }
        break
      case 'zap':
        if (item.type !== ItemType.WAND) {
          return { valid: false, message: 'You cannot zap that.' }
        }
        break
      case 'eat':
        if (item.type !== ItemType.FOOD) {
          return { valid: false, message: 'You cannot eat that.' }
        }
        break
      case 'refill':
        if (item.type !== ItemType.OIL_FLASK) {
          return { valid: false, message: 'You cannot use that to refill a lantern.' }
        }
        break
    }
    return { valid: true }
  }

  // ============================================================================
  // POTION EFFECTS
  // ============================================================================

  private quaffPotion(state: GameState, potion: Potion): GameState {
    let newState = state
    let effectMessage = ''

    // Identify potion by use
    newState = this.identificationService.identifyByUse(potion, newState)
    const displayName = this.identificationService.getDisplayName(potion, newState)

    // Apply effect based on potion type
    switch (potion.potionType) {
      case PotionType.HEAL:
        {
          const healAmount = this.random.roll(potion.power)
          const newHp = Math.min(newState.player.hp + healAmount, newState.player.maxHp)
          const actualHeal = newHp - newState.player.hp
          newState = {
            ...newState,
            player: { ...newState.player, hp: newHp },
          }
          effectMessage = `You feel better. (+${actualHeal} HP)`
        }
        break

      case PotionType.EXTRA_HEAL:
        {
          const healAmount = this.random.roll(potion.power)
          const newHp = Math.min(newState.player.hp + healAmount, newState.player.maxHp)
          const actualHeal = newHp - newState.player.hp
          newState = {
            ...newState,
            player: { ...newState.player, hp: newHp },
          }
          effectMessage = `You feel much better! (+${actualHeal} HP)`
        }
        break

      case PotionType.GAIN_STRENGTH:
        {
          const newMaxStrength = newState.player.maxStrength + 1
          const newStrength = newState.player.strength + 1
          newState = {
            ...newState,
            player: {
              ...newState.player,
              strength: newStrength,
              maxStrength: newMaxStrength,
            },
          }
          effectMessage = `You feel stronger! (Strength: ${newStrength})`
        }
        break

      case PotionType.RESTORE_STRENGTH:
        {
          const newStrength = newState.player.maxStrength
          newState = {
            ...newState,
            player: { ...newState.player, strength: newStrength },
          }
          effectMessage = `Your strength is restored. (Strength: ${newStrength})`
        }
        break

      case PotionType.POISON:
        {
          const damage = this.random.roll(potion.power)
          const newHp = Math.max(0, newState.player.hp - damage)
          newState = {
            ...newState,
            player: { ...newState.player, hp: newHp },
          }
          effectMessage = `You feel sick! (-${damage} HP)`
          if (newHp === 0) {
            newState = { ...newState, isGameOver: true }
          }
        }
        break

      default:
        effectMessage = `You quaff ${displayName}. (Effect not yet implemented)`
    }

    // Remove potion from inventory
    const updatedPlayer = this.inventoryService.removeItem(newState.player, potion.id)
    newState = { ...newState, player: updatedPlayer }

    // Add message
    const messages = this.messageService.addMessage(
      newState.messages,
      effectMessage,
      'info',
      newState.turnCount
    )

    return {
      ...newState,
      messages,
      turnCount: newState.turnCount + 1,
    }
  }

  // ============================================================================
  // SCROLL EFFECTS
  // ============================================================================

  private readScroll(state: GameState, scroll: Scroll): GameState {
    let newState = state

    // Identify scroll by use
    newState = this.identificationService.identifyByUse(scroll, newState)
    const displayName = this.identificationService.getDisplayName(scroll, newState)

    // TODO: Implement scroll effects
    // Most scrolls require additional UI (item selection, targeting, etc.)
    const effectMessage = `You read ${displayName}. (Effect not yet implemented)`

    // Remove scroll from inventory
    const updatedPlayer = this.inventoryService.removeItem(newState.player, scroll.id)
    newState = { ...newState, player: updatedPlayer }

    // Add message
    const messages = this.messageService.addMessage(
      newState.messages,
      effectMessage,
      'info',
      newState.turnCount
    )

    return {
      ...newState,
      messages,
      turnCount: newState.turnCount + 1,
    }
  }

  // ============================================================================
  // WAND EFFECTS
  // ============================================================================

  private zapWand(state: GameState, wand: Wand): GameState {
    let newState = state

    // Check if wand has charges
    if (wand.currentCharges === 0) {
      const messages = this.messageService.addMessage(
        newState.messages,
        'The wand has no charges.',
        'warning',
        newState.turnCount
      )
      return { ...newState, messages }
    }

    // Identify wand by use
    newState = this.identificationService.identifyByUse(wand, newState)
    const displayName = this.identificationService.getDisplayName(wand, newState)

    // TODO: Implement wand effects
    // Wands require targeting system (which monster to zap)
    const effectMessage = `You zap ${displayName}. (Effect not yet implemented)`

    // Decrement charges (note: we need to update the wand in inventory)
    // For now, we'll remove it and add it back with decremented charges
    // This is a simplification - in a real implementation we'd use a method to update in place
    let updatedPlayer = this.inventoryService.removeItem(newState.player, wand.id)
    const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, updatedWand)
    newState = { ...newState, player: updatedPlayer }

    // Add message
    const messages = this.messageService.addMessage(
      newState.messages,
      effectMessage,
      'info',
      newState.turnCount
    )

    return {
      ...newState,
      messages,
      turnCount: newState.turnCount + 1,
    }
  }

  // ============================================================================
  // FOOD EFFECTS
  // ============================================================================

  private eatFood(state: GameState, food: Food): GameState {
    let newState = state

    // Restore hunger
    const newHunger = newState.player.hunger + food.nutrition
    newState = {
      ...newState,
      player: { ...newState.player, hunger: newHunger },
    }

    const effectMessage = `You eat ${food.name}. You feel satiated.`

    // Remove food from inventory
    const updatedPlayer = this.inventoryService.removeItem(newState.player, food.id)
    newState = { ...newState, player: updatedPlayer }

    // Add message
    const messages = this.messageService.addMessage(
      newState.messages,
      effectMessage,
      'info',
      newState.turnCount
    )

    return {
      ...newState,
      messages,
      turnCount: newState.turnCount + 1,
    }
  }

  // ============================================================================
  // LANTERN REFILL
  // ============================================================================

  private refillLantern(state: GameState, oilFlask: OilFlask): GameState {
    let newState = state

    // Check if lantern is equipped
    const lantern = newState.player.equipment.lightSource
    if (!lantern) {
      const messages = this.messageService.addMessage(
        newState.messages,
        'You do not have a lantern equipped.',
        'warning',
        newState.turnCount
      )
      return { ...newState, messages }
    }

    // Check if it's a lantern (not torch or artifact)
    if (lantern.type !== 'lantern') {
      const messages = this.messageService.addMessage(
        newState.messages,
        'You can only refill lanterns, not other light sources.',
        'warning',
        newState.turnCount
      )
      return { ...newState, messages }
    }

    // Check if lantern is already full
    if (lantern.fuel !== undefined && lantern.maxFuel !== undefined) {
      if (lantern.fuel >= lantern.maxFuel) {
        const messages = this.messageService.addMessage(
          newState.messages,
          'Your lantern is already full.',
          'info',
          newState.turnCount
        )
        return { ...newState, messages }
      }
    }

    // Refill lantern (add fuel, cap at maxFuel)
    const newFuel = Math.min(
      (lantern.fuel || 0) + oilFlask.fuelAmount,
      lantern.maxFuel || 500
    )
    const fuelAdded = newFuel - (lantern.fuel || 0)

    const updatedLantern = {
      ...lantern,
      fuel: newFuel,
    }

    const updatedPlayer = {
      ...newState.player,
      equipment: {
        ...newState.player.equipment,
        lightSource: updatedLantern,
      },
    }

    // Remove oil flask from inventory
    const finalPlayer = this.inventoryService.removeItem(updatedPlayer, oilFlask.id)
    newState = { ...newState, player: finalPlayer }

    // Add message
    const messages = this.messageService.addMessage(
      newState.messages,
      `You refill your lantern. (+${fuelAdded} fuel, ${newFuel}/${lantern.maxFuel} total)`,
      'info',
      newState.turnCount
    )

    return {
      ...newState,
      messages,
      turnCount: newState.turnCount + 1,
    }
  }
}
