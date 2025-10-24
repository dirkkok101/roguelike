import { Player, Monster } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// LEVELING SERVICE - XP tracking and character progression
// ============================================================================

export class LevelingService {
  // XP required for each level is calculated with formula: 5 * (level - 1) * level
  // This creates the progression: 0, 10, 30, 60, 100, 150, 210, 280, 360, 450...
  // Pattern: Each level requires +10, +20, +30, +40... more XP than previous
  // No hard cap - players can level infinitely like original 1980 Rogue

  constructor(private random: IRandomService) {}

  /**
   * Calculate XP required for a given level
   * Formula: 5 * (level - 1) * level
   * Examples:
   *   Level 1: 5 * 0 * 1 = 0
   *   Level 2: 5 * 1 * 2 = 10
   *   Level 3: 5 * 2 * 3 = 30
   *   Level 10: 5 * 9 * 10 = 450
   *   Level 100: 5 * 99 * 100 = 49,500
   */
  private calculateXPForLevel(level: number): number {
    if (level <= 1) return 0
    return 5 * (level - 1) * level
  }

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
    const leveledUp = newXP >= xpNeeded

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
    const xpNeeded = this.getXPForNextLevel(player.level)
    return player.xp >= xpNeeded
  }

  /**
   * Apply level-up to player
   * Increases: level, maxHp (+1d8), resets XP to carry-over
   * No level cap - infinite progression like original Rogue
   */
  levelUp(player: Player): Player {
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
   * Apply all pending level-ups to player
   * Handles cases where player has enough XP for multiple levels
   * Returns updated player and number of levels gained
   *
   * Example: Player at level 1 with 100 XP can level up 3 times:
   *   Level 1 → 2 (needs 10 XP)
   *   Level 2 → 3 (needs 30 XP total)
   *   Level 3 → 4 (needs 60 XP total)
   *   Final: Level 4 with 40 XP remaining
   */
  applyLevelUps(player: Player): { player: Player; levelsGained: number } {
    let currentPlayer = player
    let levelsGained = 0

    // Keep leveling up while player has enough XP
    while (this.checkLevelUp(currentPlayer)) {
      currentPlayer = this.levelUp(currentPlayer)
      levelsGained++
    }

    return {
      player: currentPlayer,
      levelsGained,
    }
  }

  /**
   * Get XP required for next level
   * Uses formula: 5 * (level - 1) * level
   * No upper limit - supports infinite leveling
   */
  getXPForNextLevel(currentLevel: number): number {
    return this.calculateXPForLevel(currentLevel + 1)
  }

  /**
   * Calculate XP reward for defeating monster
   * (For now, just return monster.xpValue; may add modifiers later)
   */
  calculateXPReward(monster: Monster): number {
    return monster.xpValue
  }
}
