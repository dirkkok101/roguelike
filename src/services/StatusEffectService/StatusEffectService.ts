import { Player, StatusEffect, StatusEffectType } from '@game/core/core'

// ============================================================================
// STATUS EFFECT SERVICE - Manage player status effects with durations
// ============================================================================

export class StatusEffectService {
  /**
   * Add a status effect to the player
   * If the same effect already exists, the duration is replaced (not stacked)
   */
  addStatusEffect(
    player: Player,
    effectType: StatusEffectType,
    duration: number,
    intensity?: number
  ): Player {
    // Remove existing effect of same type (replace, don't stack)
    const filteredEffects = player.statusEffects.filter(e => e.type !== effectType)

    // Add new effect
    const newEffect: StatusEffect = {
      type: effectType,
      duration,
      intensity,
    }

    return {
      ...player,
      statusEffects: [...filteredEffects, newEffect],
    }
  }

  /**
   * Remove a specific status effect from the player
   */
  removeStatusEffect(player: Player, effectType: StatusEffectType): Player {
    return {
      ...player,
      statusEffects: player.statusEffects.filter(e => e.type !== effectType),
    }
  }

  /**
   * Check if player has a specific status effect
   */
  hasStatusEffect(player: Player, effectType: StatusEffectType): boolean {
    return player.statusEffects.some(e => e.type === effectType)
  }

  /**
   * Get a specific status effect if it exists
   */
  getStatusEffect(player: Player, effectType: StatusEffectType): StatusEffect | undefined {
    return player.statusEffects.find(e => e.type === effectType)
  }

  /**
   * Tick all status effects (decrement duration by 1, remove expired effects)
   * Returns updated player and list of expired effect types
   */
  tickStatusEffects(player: Player): { player: Player; expired: StatusEffectType[] } {
    const expired: StatusEffectType[] = []
    const tickedEffects: StatusEffect[] = []

    for (const effect of player.statusEffects) {
      const newDuration = effect.duration - 1

      if (newDuration <= 0) {
        // Effect has expired
        expired.push(effect.type)
      } else {
        // Effect still active, decrement duration
        tickedEffects.push({
          ...effect,
          duration: newDuration,
        })
      }
    }

    return {
      player: {
        ...player,
        statusEffects: tickedEffects,
      },
      expired,
    }
  }
}
