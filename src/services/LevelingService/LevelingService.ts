import { Player, Monster } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// LEVELING SERVICE - XP tracking and character progression
// ============================================================================

export class LevelingService {
  // XP required for each level (index = level, value = total XP needed)
  private readonly XP_CURVE: number[] = [
    0, // Level 1 (starting level)
    10, // Level 2
    30, // Level 3
    60, // Level 4
    100, // Level 5
    150, // Level 6
    210, // Level 7
    280, // Level 8
    360, // Level 9
    450, // Level 10
  ]

  constructor(private random: IRandomService) {}

  /**
   * Add XP to player and check for level-up
   * Returns updated player + level-up flag
   */
  addExperience(
    player: Player,
    xp: number
  ): { player: Player; leveledUp: boolean } {
    const newXP = player.xp + xp
    const xpNeeded = this.getXPForNextLevel(player.level)
    const leveledUp = newXP >= xpNeeded && player.level < 10

    return {
      player: {
        ...player,
        xp: newXP,
      },
      leveledUp,
    }
  }

  /**
   * Check if player has enough XP to level up
   */
  checkLevelUp(player: Player): boolean {
    if (player.level >= 10) return false // Max level
    const xpNeeded = this.getXPForNextLevel(player.level)
    return player.xp >= xpNeeded
  }

  /**
   * Apply level-up to player
   * Increases: level, maxHp (+1d8), resets XP to carry-over
   */
  levelUp(player: Player): Player {
    if (player.level >= 10) {
      return player // Already at max level
    }

    // Roll 1d8 for HP increase
    const hpIncrease = this.random.roll('1d8')
    const newMaxHp = player.maxHp + hpIncrease
    const newLevel = player.level + 1

    // Calculate XP carry-over
    const xpForNextLevel = this.getXPForNextLevel(player.level)
    const xpCarryOver = Math.max(0, player.xp - xpForNextLevel)

    return {
      ...player,
      level: newLevel,
      maxHp: newMaxHp,
      hp: newMaxHp, // Fully heal on level-up
      xp: xpCarryOver,
    }
  }

  /**
   * Get XP required for next level
   */
  getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= 10) return Infinity // Max level
    return this.XP_CURVE[currentLevel] // e.g., level 1 needs 10 XP
  }

  /**
   * Calculate XP reward for defeating monster
   * (For now, just return monster.xpValue; may add modifiers later)
   */
  calculateXPReward(monster: Monster): number {
    return monster.xpValue
  }
}
