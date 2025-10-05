import {
  GameState,
  Potion,
  PotionType,
  Scroll,
  ScrollType,
  Wand,
  WandType,
  Food,
  OilFlask,
  Weapon,
  Armor,
  ItemType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// ITEM EFFECT SERVICE - All item effect logic
// ============================================================================

export interface EffectResult {
  updatedState: GameState
  effectMessage: string
  isGameOver?: boolean
}

export class ItemEffectService {
  constructor(
    private random: IRandomService,
    private inventoryService: InventoryService,
    private identificationService: IdentificationService
  ) {}

  // ============================================================================
  // PUBLIC: Main effect methods
  // ============================================================================

  /**
   * Apply potion effect
   */
  applyPotionEffect(state: GameState, potion: Potion): EffectResult {
    let newState = state

    // Identify potion by use
    newState = this.identificationService.identifyByUse(potion, newState)
    const displayName = this.identificationService.getDisplayName(potion, newState)

    let effectMessage = ''

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
            return {
              updatedState: { ...newState, isGameOver: true },
              effectMessage,
              isGameOver: true,
            }
          }
        }
        break

      default:
        effectMessage = `You quaff ${displayName}. (Effect not yet implemented)`
    }

    // Remove potion from inventory
    const updatedPlayer = this.inventoryService.removeItem(newState.player, potion.id)
    newState = { ...newState, player: updatedPlayer }

    return {
      updatedState: newState,
      effectMessage,
    }
  }

  /**
   * Apply scroll effect
   */
  applyScrollEffect(
    state: GameState,
    scroll: Scroll,
    targetItemId?: string
  ): EffectResult {
    let newState = state

    // Identify scroll by use
    newState = this.identificationService.identifyByUse(scroll, newState)
    const displayName = this.identificationService.getDisplayName(scroll, newState)

    let effectMessage = ''

    // Apply scroll effect based on type
    switch (scroll.scrollType) {
      case ScrollType.IDENTIFY:
        {
          if (!targetItemId) {
            effectMessage = `You read ${displayName}, but nothing happens.`
            break
          }

          // Find target item in inventory
          const targetItem = this.inventoryService.findItem(newState.player, targetItemId)
          if (!targetItem) {
            effectMessage = `You read ${displayName}, but the item is gone.`
            break
          }

          // Identify the target item
          newState = this.identificationService.identifyItem(targetItem, newState)
          const targetName = this.identificationService.getDisplayName(targetItem, newState)
          effectMessage = `You read ${displayName}. This is ${targetName}!`
        }
        break

      case ScrollType.ENCHANT_WEAPON:
        {
          if (!targetItemId) {
            effectMessage = `You read ${displayName}, but nothing happens.`
            break
          }

          // Find target weapon in inventory
          const targetItem = this.inventoryService.findItem(newState.player, targetItemId)
          if (!targetItem || targetItem.type !== ItemType.WEAPON) {
            effectMessage = `You read ${displayName}, but the item is not a weapon.`
            break
          }

          const weapon = targetItem as Weapon

          // Check max enchantment (+3)
          if (weapon.bonus >= 3) {
            effectMessage = `You read ${displayName}. ${weapon.name} is already at maximum enchantment!`
            break
          }

          // Enchant weapon (increase bonus by 1)
          const enchantedWeapon: Weapon = { ...weapon, bonus: weapon.bonus + 1 }

          // Update inventory (remove old, add enchanted)
          let updatedPlayer = this.inventoryService.removeItem(newState.player, weapon.id)
          updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedWeapon)

          // If weapon was equipped, update equipment too
          if (updatedPlayer.equipment.weapon?.id === weapon.id) {
            updatedPlayer = {
              ...updatedPlayer,
              equipment: { ...updatedPlayer.equipment, weapon: enchantedWeapon },
            }
          }

          newState = { ...newState, player: updatedPlayer }
          effectMessage = `You read ${displayName}. ${enchantedWeapon.name} glows brightly! (+${enchantedWeapon.bonus})`
        }
        break

      case ScrollType.ENCHANT_ARMOR:
        {
          if (!targetItemId) {
            effectMessage = `You read ${displayName}, but nothing happens.`
            break
          }

          const targetItem = this.inventoryService.findItem(newState.player, targetItemId)
          if (!targetItem || targetItem.type !== ItemType.ARMOR) {
            effectMessage = `You read ${displayName}, but the item is not armor.`
            break
          }

          const armor = targetItem as Armor

          // Check max enchantment (+3)
          if (armor.bonus >= 3) {
            effectMessage = `You read ${displayName}. ${armor.name} is already at maximum enchantment!`
            break
          }

          // Enchant armor (increase bonus by 1, which LOWERS effective AC - better protection)
          const enchantedArmor: Armor = { ...armor, bonus: armor.bonus + 1 }

          // Update inventory
          let updatedPlayer = this.inventoryService.removeItem(newState.player, armor.id)
          updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedArmor)

          // If armor was equipped, update equipment
          if (updatedPlayer.equipment.armor?.id === armor.id) {
            updatedPlayer = {
              ...updatedPlayer,
              equipment: { ...updatedPlayer.equipment, armor: enchantedArmor },
            }
          }

          newState = { ...newState, player: updatedPlayer }
          const effectiveAC = enchantedArmor.ac - enchantedArmor.bonus
          effectMessage = `You read ${displayName}. ${enchantedArmor.name} glows with protection! [AC ${effectiveAC}]`
        }
        break

      default:
        effectMessage = `You read ${displayName}. (Effect not yet implemented)`
    }

    // Remove scroll from inventory
    const updatedPlayer = this.inventoryService.removeItem(newState.player, scroll.id)
    newState = { ...newState, player: updatedPlayer }

    return {
      updatedState: newState,
      effectMessage,
    }
  }

  /**
   * Apply wand effect
   */
  applyWandEffect(
    state: GameState,
    wand: Wand,
    targetMonsterId?: string
  ): EffectResult {
    let newState = state

    // Check if wand has charges
    if (wand.currentCharges === 0) {
      return {
        updatedState: newState,
        effectMessage: 'The wand has no charges.',
      }
    }

    // Identify wand by use
    newState = this.identificationService.identifyByUse(wand, newState)
    const displayName = this.identificationService.getDisplayName(wand, newState)

    // TODO: Implement wand effects
    // Wands require targeting system (which monster to zap)
    const effectMessage = `You zap ${displayName}. (Effect not yet implemented)`

    // Decrement charges
    let updatedPlayer = this.inventoryService.removeItem(newState.player, wand.id)
    const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }
    updatedPlayer = this.inventoryService.addItem(updatedPlayer, updatedWand)
    newState = { ...newState, player: updatedPlayer }

    return {
      updatedState: newState,
      effectMessage,
    }
  }

  /**
   * Consume food to restore hunger
   */
  consumeFood(state: GameState, food: Food): EffectResult {
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

    return {
      updatedState: newState,
      effectMessage,
    }
  }

  /**
   * Refill lantern with oil flask
   */
  refillLantern(state: GameState, oilFlask: OilFlask): EffectResult {
    let newState = state

    // Check if lantern is equipped
    const lantern = newState.player.equipment.lightSource
    if (!lantern) {
      return {
        updatedState: newState,
        effectMessage: 'You do not have a lantern equipped.',
      }
    }

    // Check if it's a lantern (not torch or artifact)
    if (lantern.type !== 'lantern') {
      return {
        updatedState: newState,
        effectMessage: 'You can only refill lanterns, not other light sources.',
      }
    }

    // Check if lantern is already full
    if (lantern.fuel !== undefined && lantern.maxFuel !== undefined) {
      if (lantern.fuel >= lantern.maxFuel) {
        return {
          updatedState: newState,
          effectMessage: 'Your lantern is already full.',
        }
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

    return {
      updatedState: newState,
      effectMessage: `You refill your lantern. (+${fuelAdded} fuel, ${newFuel}/${lantern.maxFuel} total)`,
    }
  }
}
