import {
  Player,
  Potion,
  PotionType,
  GameState,
  ItemType,
} from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import { LevelingService } from '@services/LevelingService'

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
    private levelingService: LevelingService
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

  private applyRaiseLevelPotion(player: Player): Player {
    // Use LevelingService to level up the player
    // This grants +1 level, rolls 1d8 for max HP increase, and fully heals
    return this.levelingService.levelUp(player)
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
