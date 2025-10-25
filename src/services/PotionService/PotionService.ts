import {
  Player,
  Potion,
  PotionType,
  GameState,
  ItemType,
  StatusEffectType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'
import { StatusEffectService } from '@services/StatusEffectService'

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface PotionEffectResult {
  player: Player
  message: string
  identified: boolean
  death?: boolean
  state?: GameState // Updated state for detection potions
}

// ============================================================================
// POTION SERVICE - All potion effect logic
// ============================================================================

export class PotionService {
  constructor(
    private random: IRandomService,
    private identificationService: IdentificationService,
    private levelingService: LevelingService,
    private statusEffectService: StatusEffectService
  ) {}

  /**
   * Apply potion effect and return complete result
   */
  applyPotion(player: Player, potion: Potion, state: GameState): PotionEffectResult {
    // Identify potion by use
    const identified = !this.identificationService.isIdentified(potion.id, state)
    const displayName = this.identificationService.getDisplayName(potion, state)

    let updatedPlayer = player
    let message = ''
    let death = false

    // Apply effect based on type
    switch (potion.potionType) {
      case PotionType.MINOR_HEAL:
      case PotionType.MEDIUM_HEAL:
      case PotionType.MAJOR_HEAL:
      case PotionType.SUPERIOR_HEAL:
        {
          const result = this.applyHealingPotion(player, potion)
          updatedPlayer = result.player
          message = `You feel better. (+${result.healAmount} HP)`
          if (result.maxHpIncrease) {
            message += ' You feel permanently stronger! (Max HP +1)'
          }
          if (result.curedConfusion) {
            message += ' Your head clears!'
          }
          if (result.curedBlindness) {
            message += ' You can see again!'
          }
        }
        break

      case PotionType.GAIN_STRENGTH:
        {
          updatedPlayer = this.applyGainStrength(player)
          // Format strength display with exceptional strength support
          // Show max strength with percentile if exceptional (since Gain Strength increases max)
          const strDisplay =
            updatedPlayer.maxStrength === 18 && updatedPlayer.strengthPercentile !== undefined
              ? `18/${updatedPlayer.strengthPercentile.toString().padStart(2, '0')}`
              : `${updatedPlayer.strength}`
          message = `You feel stronger! (Max Strength: ${strDisplay})`
        }
        break

      case PotionType.RESTORE_STRENGTH:
        {
          updatedPlayer = this.applyRestoreStrength(player)
          // Format strength display with exceptional strength support
          const strDisplay =
            updatedPlayer.strength === 18 && updatedPlayer.strengthPercentile !== undefined
              ? `18/${updatedPlayer.strengthPercentile.toString().padStart(2, '0')}`
              : `${updatedPlayer.strength}`
          message = `Your strength is restored. (Strength: ${strDisplay})`
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

      case PotionType.RAISE_LEVEL:
        {
          updatedPlayer = this.applyRaiseLevelPotion(player)
          message = `You feel more experienced! (Level ${updatedPlayer.level})`
        }
        break

      case PotionType.DETECT_MONSTERS:
        {
          const result = this.applyDetectMonsters(state)
          message = result.message
          return {
            player,
            message,
            identified,
            death: false,
            state: result.state,
          }
        }

      case PotionType.DETECT_MAGIC:
        {
          const result = this.applyDetectMagic(state)
          message = result.message
          return {
            player,
            message,
            identified,
            death: false,
            state: result.state,
          }
        }

      case PotionType.CONFUSION:
        {
          const result = this.applyConfusionPotion(player)
          updatedPlayer = result.player
          message = `Wait, what's going on here? (Confused for ${result.duration} turns)`
        }
        break

      case PotionType.BLINDNESS:
        {
          const result = this.applyBlindnessPotion(player)
          updatedPlayer = result.player
          message = `Oh, bummer! Everything is dark! (Blind for ${result.duration} turns)`
        }
        break

      case PotionType.HASTE_SELF:
        {
          const result = this.applyHasteSelfPotion(player)
          updatedPlayer = result.player
          message = `You feel yourself moving much faster! (Hasted for ${result.duration} turns)`
        }
        break

      case PotionType.SEE_INVISIBLE:
        {
          updatedPlayer = this.applySeeInvisiblePotion(player)
          message = `Your eyes tingle. You can now see invisible creatures!`
        }
        break

      case PotionType.LEVITATION:
        {
          updatedPlayer = this.applyLevitationPotion(player)
          message = `You begin to float above the ground!`
        }
        break

      default:
        message = `You quaff ${displayName}. (Effect not yet implemented)`
    }

    return { player: updatedPlayer, message, identified, death }
  }

  // ============================================================================
  // PRIVATE: Helper methods
  // ============================================================================

  /**
   * Validate and fix strength percentile invariants
   * - Percentile must be undefined when maxStrength !== 18
   * - Percentile must be 1-100 when maxStrength === 18
   * - Clamps invalid values to valid range
   * Note: Percentile is tied to maxStrength, not current strength (for drain/restore mechanics)
   */
  private validateStrengthPercentile(player: Player): Player {
    // If maxStrength is not 18, percentile must be undefined
    if (player.maxStrength !== 18 && player.strengthPercentile !== undefined) {
      return {
        ...player,
        strengthPercentile: undefined,
      }
    }

    // If maxStrength is 18 with percentile, clamp to 1-100
    if (player.maxStrength === 18 && player.strengthPercentile !== undefined) {
      const clamped = Math.max(1, Math.min(100, player.strengthPercentile))
      if (clamped !== player.strengthPercentile) {
        return {
          ...player,
          strengthPercentile: clamped,
        }
      }
    }

    return player
  }

  // ============================================================================
  // PRIVATE: Potion effect implementations
  // ============================================================================

  /**
   * Shared healing logic for HEAL and EXTRA_HEAL potions
   * - Heals HP based on potion power
   * - Grants +1 max HP when healing at full HP (overheal mechanic)
   * - Cures confusion and blindness (Rogue 1980 mechanic)
   */
  private applyHealingPotion(
    player: Player,
    potion: Potion
  ): { player: Player; healAmount: number; maxHpIncrease: boolean; curedConfusion: boolean; curedBlindness: boolean } {
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

    // Rogue mechanic: Healing cures confusion and blindness
    const hadConfusion = this.statusEffectService.hasStatusEffect(player, StatusEffectType.CONFUSED)
    const hadBlindness = this.statusEffectService.hasStatusEffect(player, StatusEffectType.BLIND)

    let updatedPlayer: Player = { ...player, hp: newHp, maxHp: newMaxHp }
    if (hadConfusion) {
      updatedPlayer = this.statusEffectService.removeStatusEffect(updatedPlayer, StatusEffectType.CONFUSED)
    }
    if (hadBlindness) {
      updatedPlayer = this.statusEffectService.removeStatusEffect(updatedPlayer, StatusEffectType.BLIND)
    }

    return {
      player: updatedPlayer,
      healAmount: actualHeal,
      maxHpIncrease: shouldIncreaseMaxHp,
      curedConfusion: hadConfusion,
      curedBlindness: hadBlindness,
    }
  }

  private applyHealPotion(
    player: Player,
    potion: Potion
  ): { player: Player; healAmount: number; maxHpIncrease: boolean; curedConfusion: boolean; curedBlindness: boolean } {
    return this.applyHealingPotion(player, potion)
  }

  private applyExtraHealPotion(
    player: Player,
    potion: Potion
  ): { player: Player; healAmount: number; maxHpIncrease: boolean; curedConfusion: boolean; curedBlindness: boolean } {
    return this.applyHealingPotion(player, potion)
  }

  private applyGainStrength(player: Player): Player {
    let updatedPlayer: Player

    // Handle exceptional strength (18/XX format) from original 1980 Rogue
    if (player.maxStrength === 18 && player.strengthPercentile !== undefined) {
      // Already have exceptional strength: increase percentile by d10 (1-10), cap at 100
      const increase = this.random.nextInt(1, 10)
      const newPercentile = Math.min(100, player.strengthPercentile + increase)

      updatedPlayer = {
        ...player,
        strengthPercentile: newPercentile,
        // If current strength is also 18, it remains 18 (percentile is the only change)
        strength: player.strength === 18 ? 18 : player.strength,
      }
    } else if (player.maxStrength === 18 && player.strengthPercentile === undefined) {
      // Just reached 18: add exceptional strength (roll d10 for initial percentile 1-10)
      const percentile = this.random.nextInt(1, 10)

      updatedPlayer = {
        ...player,
        strengthPercentile: percentile,
        strength: player.strength === 18 ? 18 : player.strength,
        maxStrength: 18,
      }
    } else {
      // Normal strength progression: increment by 1
      const newMaxStrength = player.maxStrength + 1
      const newStrength = player.strength + 1

      updatedPlayer = {
        ...player,
        strength: newStrength,
        maxStrength: newMaxStrength,
      }
    }

    // Validate and fix any invariant violations
    return this.validateStrengthPercentile(updatedPlayer)
  }

  private applyRestoreStrength(player: Player): Player {
    const updatedPlayer = {
      ...player,
      strength: player.maxStrength,
    }

    // Validate and fix any invariant violations
    return this.validateStrengthPercentile(updatedPlayer)
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

  private applyRaiseLevelPotion(player: Player): Player {
    // Use LevelingService to level up the player
    // This grants +1 level, rolls 1d8 for max HP increase, and fully heals
    return this.levelingService.levelUp(player)
  }

  private applyConfusionPotion(player: Player): { player: Player; duration: number } {
    // Original Rogue: 19-21 turns of confusion
    // Random duration: 19 + 1d3 (results in 20-22)
    const duration = 19 + this.random.roll('1d3')

    const updatedPlayer = this.statusEffectService.addStatusEffect(
      player,
      StatusEffectType.CONFUSED,
      duration
    )

    return {
      player: updatedPlayer,
      duration,
    }
  }

  private applyBlindnessPotion(player: Player): { player: Player; duration: number } {
    // Original Rogue: 807-892 turns (very long!)
    // Reduced for balance: 40-60 turns
    // Random duration: 39 + 1d21 (results in 40-60)
    const duration = 39 + this.random.roll('1d21')

    const updatedPlayer = this.statusEffectService.addStatusEffect(
      player,
      StatusEffectType.BLIND,
      duration
    )

    return {
      player: updatedPlayer,
      duration,
    }
  }

  private applyHasteSelfPotion(player: Player): { player: Player; duration: number } {
    // Original Rogue: 4-8 turns of haste
    // Random duration: 3 + 1d5 (results in 4-8)
    const duration = 3 + this.random.roll('1d5')

    const updatedPlayer = this.statusEffectService.addStatusEffect(
      player,
      StatusEffectType.HASTED,
      duration
    )

    return {
      player: updatedPlayer,
      duration,
    }
  }

  private applySeeInvisiblePotion(player: Player): Player {
    // Original Rogue: Lasts until level change
    // Using 999 turns (effectively permanent until stairs are used)
    // StairsCommand will clear this effect when changing levels
    const duration = 999

    const updatedPlayer = this.statusEffectService.addStatusEffect(
      player,
      StatusEffectType.SEE_INVISIBLE,
      duration
    )

    return updatedPlayer
  }

  private applyLevitationPotion(player: Player): Player {
    // Original Rogue: Lasts 29-32 turns
    // Player floats over traps without triggering them
    const duration = this.random.nextInt(29, 32)

    const updatedPlayer = this.statusEffectService.addStatusEffect(
      player,
      StatusEffectType.LEVITATING,
      duration
    )

    return updatedPlayer
  }

  private applyDetectMonsters(
    state: GameState
  ): { state: GameState; message: string } {
    // Get current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        state,
        message: 'You feel a strange sensation.',
      }
    }

    // Get all monster IDs on current level
    const monsterIds = new Set(level.monsters.map((m) => m.id))
    const monsterCount = monsterIds.size

    // Update state with detected monsters
    const updatedState: GameState = {
      ...state,
      detectedMonsters: monsterIds,
    }

    // Generate message based on count
    if (monsterCount === 0) {
      return {
        state: updatedState,
        message: 'You have a strange feeling for a moment, then it passes.',
      }
    } else if (monsterCount === 1) {
      return {
        state: updatedState,
        message: 'You sense a monster nearby!',
      }
    } else {
      return {
        state: updatedState,
        message: `You sense ${monsterCount} monsters nearby!`,
      }
    }
  }

  private applyDetectMagic(
    state: GameState
  ): { state: GameState; message: string } {
    // Get current level
    const level = state.levels.get(state.currentLevel)
    if (!level) {
      return {
        state,
        message: 'You feel a strange sensation.',
      }
    }

    // Get all magic item IDs on current level
    // Magic items: potions, scrolls, rings, wands
    const magicItemIds = new Set(
      level.items
        .filter(
          (item) =>
            item.type === ItemType.POTION ||
            item.type === ItemType.SCROLL ||
            item.type === ItemType.RING ||
            item.type === ItemType.WAND
        )
        .map((item) => item.id)
    )
    const itemCount = magicItemIds.size

    // Update state with detected magic items
    const updatedState: GameState = {
      ...state,
      detectedMagicItems: magicItemIds,
    }

    // Generate message based on count
    if (itemCount === 0) {
      return {
        state: updatedState,
        message: 'You have a strange feeling for a moment, then it passes.',
      }
    } else if (itemCount === 1) {
      return {
        state: updatedState,
        message: 'You sense magic nearby!',
      }
    } else {
      return {
        state: updatedState,
        message: `You sense ${itemCount} magic items nearby!`,
      }
    }
  }
}
