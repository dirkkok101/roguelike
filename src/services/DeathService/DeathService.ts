import { GameState } from '@game/core/core'

// ============================================================================
// DEATH SERVICE - Comprehensive death statistics and flavor text
// ============================================================================

/**
 * Comprehensive death statistics for enhanced death screen
 */
export interface ComprehensiveDeathStats {
  // Death info
  cause: string // e.g., "Killed by Orc"
  finalBlow?: {
    damage: number
    attacker: string
    playerHPRemaining: number
  }

  // Progression stats
  finalLevel: number
  totalXP: number

  // Exploration stats
  deepestLevel: number
  totalTurns: number
  levelsExplored: number

  // Combat stats
  monstersKilled: number

  // Loot stats
  totalGold: number
  itemsFound: number
  itemsUsed: number

  // Achievements
  achievements: string[]

  // Meta
  seed: string
  gameId: string
  timestamp: number

  // Flavor
  epitaph?: string
}

/**
 * DeathService
 *
 * Centralizes death-related logic following Single Responsibility Principle.
 * Calculates comprehensive death statistics, determines achievements,
 * and generates flavor text for the death screen.
 */
export class DeathService {
  /**
   * Calculate comprehensive death statistics from game state
   */
  calculateDeathStats(state: GameState): ComprehensiveDeathStats {
    const achievements = this.determineAchievements(state)
    const epitaph = state.deathCause
      ? this.generateEpitaph(state.deathCause)
      : undefined

    return {
      // Death info
      cause: state.deathCause || 'Unknown cause',
      finalBlow: state.deathDetails?.finalBlow,

      // Progression
      finalLevel: state.player.level,
      totalXP: state.player.xp,

      // Exploration
      deepestLevel: state.currentLevel, // Current level is the deepest reached
      totalTurns: state.turnCount,
      levelsExplored: state.levelsExplored,

      // Combat
      monstersKilled: state.monstersKilled,

      // Loot
      totalGold: state.player.gold,
      itemsFound: state.itemsFound,
      itemsUsed: state.itemsUsed,

      // Achievements
      achievements,

      // Meta
      seed: state.seed,
      gameId: state.gameId,
      timestamp: Date.now(),

      // Flavor
      epitaph,
    }
  }

  /**
   * Determine achievements based on game state milestones
   */
  determineAchievements(state: GameState): string[] {
    const achievements: string[] = []

    // Level-based achievements
    if (state.currentLevel >= 10) {
      achievements.push('Deep Delver - Reached level 10!')
    } else if (state.currentLevel >= 5) {
      achievements.push('Deeper Delver - Reached level 5')
    }

    // Combat achievements
    if (state.monstersKilled >= 50) {
      achievements.push('Monster Slayer - Killed 50 monsters!')
    } else if (state.monstersKilled >= 25) {
      achievements.push('Monster Hunter - Killed 25 monsters')
    } else if (state.monstersKilled >= 10) {
      achievements.push('First Blood - Killed 10 monsters')
    }

    // Survival achievements
    if (state.turnCount >= 1000) {
      achievements.push('Survivor - Survived 1000 turns!')
    } else if (state.turnCount >= 500) {
      achievements.push('Endurance - Survived 500 turns')
    }

    // Loot achievements
    if (state.player.gold >= 2000) {
      achievements.push('Treasure Hoarder - Collected 2000 gold!')
    } else if (state.player.gold >= 1000) {
      achievements.push('Treasure Seeker - Collected 1000 gold')
    }

    // Item achievements
    if (state.itemsFound >= 50) {
      achievements.push('Pack Rat - Found 50 items!')
    } else if (state.itemsFound >= 20) {
      achievements.push('Well Equipped - Found 20 items')
    }

    // Efficiency achievements
    if (state.itemsUsed >= 20) {
      achievements.push('Resourceful - Used 20 consumables')
    }

    // Amulet achievement
    if (state.hasAmulet) {
      achievements.push('Amulet Bearer - Retrieved the Amulet of Yendor!')
    }

    // Limit to top 3 achievements for display
    return achievements.slice(0, 3)
  }

  /**
   * Generate epitaph flavor text based on death cause
   */
  generateEpitaph(cause: string): string {
    const lowercaseCause = cause.toLowerCase()

    // Combat deaths
    if (lowercaseCause.includes('killed by')) {
      const epitaphs = [
        'Here lies an adventurer, who bit off more than they could chew.',
        'Bravery and foolishness are often indistinguishable.',
        'Not every battle can be won.',
        'The dungeon claims another victim.',
        'They fought valiantly, but the dungeon is merciless.',
      ]
      return epitaphs[Math.floor(Math.random() * epitaphs.length)]
    }

    // Starvation
    if (lowercaseCause.includes('starvation') || lowercaseCause.includes('hunger')) {
      const epitaphs = [
        'Here lies an adventurer who forgot to pack lunch.',
        'Hunger proved deadlier than any monster.',
        'Should have saved those rations.',
        'The dungeon does not provide room service.',
      ]
      return epitaphs[Math.floor(Math.random() * epitaphs.length)]
    }

    // Trap deaths
    if (lowercaseCause.includes('trap')) {
      const epitaphs = [
        'Here lies an adventurer who failed to look before leaping.',
        'Curiosity killed more than the cat.',
        'They should have searched more carefully.',
        'The dungeon\'s traps are not forgiving.',
      ]
      return epitaphs[Math.floor(Math.random() * epitaphs.length)]
    }

    // Poison
    if (lowercaseCause.includes('poison')) {
      const epitaphs = [
        'Not all potions are what they seem.',
        'Here lies an adventurer who drank unwisely.',
        'Some lessons are learned too late.',
      ]
      return epitaphs[Math.floor(Math.random() * epitaphs.length)]
    }

    // Generic death
    const genericEpitaphs = [
      'Here lies another victim of the dungeon.',
      'The dungeon keeps its secrets well.',
      'Their adventure ends here, but the dungeon continues.',
      'Not all who wander are lost, but this one is.',
      'May their next run fare better.',
    ]
    return genericEpitaphs[Math.floor(Math.random() * genericEpitaphs.length)]
  }
}
