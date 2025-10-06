import {
  Player,
  Potion,
  PotionType,
  GameState,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface PotionEffectResult {
  player: Player
  message: string
  identified: boolean
  death?: boolean
}

// ============================================================================
// POTION SERVICE - All potion effect logic
// ============================================================================

export class PotionService {
  constructor(
    private random: IRandomService,
    private identificationService: IdentificationService
  ) {}

  /**
   * Apply potion effect and return complete result
   */
  applyPotion(player: Player, potion: Potion, state: GameState): PotionEffectResult {
    // Identify potion by use
    const identified = !this.identificationService.isIdentified(potion, state)
    const displayName = this.identificationService.getDisplayName(potion, state)

    let updatedPlayer = player
    let message = ''
    let death = false

    // Apply effect based on type
    switch (potion.potionType) {
      case PotionType.HEAL:
        {
          const result = this.applyHealPotion(player, potion)
          updatedPlayer = result.player
          message = `You feel better. (+${result.healAmount} HP)`
          if (result.maxHpIncrease) {
            message += ' You feel permanently stronger! (Max HP +1)'
          }
        }
        break

      case PotionType.EXTRA_HEAL:
        {
          const result = this.applyExtraHealPotion(player, potion)
          updatedPlayer = result.player
          message = `You feel much better! (+${result.healAmount} HP)`
          if (result.maxHpIncrease) {
            message += ' You feel permanently stronger! (Max HP +1)'
          }
        }
        break

      case PotionType.GAIN_STRENGTH:
        {
          updatedPlayer = this.applyGainStrength(player)
          message = `You feel stronger! (Strength: ${updatedPlayer.strength})`
        }
        break

      case PotionType.RESTORE_STRENGTH:
        {
          updatedPlayer = this.applyRestoreStrength(player)
          message = `Your strength is restored. (Strength: ${updatedPlayer.strength})`
        }
        break

      case PotionType.POISON:
        {
          const result = this.applyPoison(player, potion)
          updatedPlayer = result.player
          message = `You feel sick! (-${result.damage} HP)`
          death = updatedPlayer.hp <= 0
        }
        break

      default:
        message = `You quaff ${displayName}. (Effect not yet implemented)`
    }

    return { player: updatedPlayer, message, identified, death }
  }

  // ============================================================================
  // PRIVATE: Potion effect implementations
  // ============================================================================

  private applyHealPotion(
    player: Player,
    potion: Potion
  ): { player: Player; healAmount: number; maxHpIncrease: boolean } {
    const healAmount = this.random.roll(potion.power)

    // Check for overheal (healing at full HP grants +1 max HP)
    const wasAtFullHp = player.hp >= player.maxHp
    const overheal = healAmount - (player.maxHp - player.hp)
    const shouldIncreaseMaxHp = wasAtFullHp && overheal > 0

    let newMaxHp = player.maxHp
    if (shouldIncreaseMaxHp) {
      newMaxHp = player.maxHp + 1
    }

    const newHp = Math.min(player.hp + healAmount, newMaxHp)
    const actualHeal = newHp - player.hp

    return {
      player: { ...player, hp: newHp, maxHp: newMaxHp },
      healAmount: actualHeal,
      maxHpIncrease: shouldIncreaseMaxHp,
    }
  }

  private applyExtraHealPotion(
    player: Player,
    potion: Potion
  ): { player: Player; healAmount: number; maxHpIncrease: boolean } {
    const healAmount = this.random.roll(potion.power)

    // Check for overheal (healing at full HP grants +1 max HP)
    const wasAtFullHp = player.hp >= player.maxHp
    const overheal = healAmount - (player.maxHp - player.hp)
    const shouldIncreaseMaxHp = wasAtFullHp && overheal > 0

    let newMaxHp = player.maxHp
    if (shouldIncreaseMaxHp) {
      newMaxHp = player.maxHp + 1
    }

    const newHp = Math.min(player.hp + healAmount, newMaxHp)
    const actualHeal = newHp - player.hp

    return {
      player: { ...player, hp: newHp, maxHp: newMaxHp },
      healAmount: actualHeal,
      maxHpIncrease: shouldIncreaseMaxHp,
    }
  }

  private applyGainStrength(player: Player): Player {
    const newMaxStrength = player.maxStrength + 1
    const newStrength = player.strength + 1

    return {
      ...player,
      strength: newStrength,
      maxStrength: newMaxStrength,
    }
  }

  private applyRestoreStrength(player: Player): Player {
    return {
      ...player,
      strength: player.maxStrength,
    }
  }

  private applyPoison(
    player: Player,
    potion: Potion
  ): { player: Player; damage: number } {
    const damage = this.random.roll(potion.power)
    const newHp = Math.max(0, player.hp - damage)

    return {
      player: { ...player, hp: newHp },
      damage,
    }
  }
}
