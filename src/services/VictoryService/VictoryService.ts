import { GameState } from '@game/core/core'

// ============================================================================
// VICTORY SERVICE - Win condition checking and score calculation
// ============================================================================

export interface VictoryStats {
  finalLevel: number
  totalGold: number
  totalXP: number
  totalTurns: number
  deepestLevel: number
  finalScore: number
  seed: string
  gameId: string
}

export class VictoryService {
  /**
   * Check if player has won the game
   * Win condition: On Level 1 with Amulet of Yendor
   */
  checkVictory(state: GameState): boolean {
    return state.currentLevel === 1 && state.hasAmulet
  }

  /**
   * Calculate final score based on:
   * - Gold collected (×10 points)
   * - Player level (×100 points)
   * - XP earned (×5 points)
   * - Turns taken (÷10 penalty)
   */
  calculateScore(state: GameState): number {
    const goldScore = state.player.gold * 10
    const levelScore = state.player.level * 100
    const xpScore = state.player.xp * 5
    const turnPenalty = Math.floor(state.turnCount / 10)

    return Math.max(0, goldScore + levelScore + xpScore - turnPenalty)
  }

  /**
   * Generate victory statistics for display
   */
  getVictoryStats(state: GameState): VictoryStats {
    return {
      finalLevel: state.player.level,
      totalGold: state.player.gold,
      totalXP: state.player.xp,
      totalTurns: state.turnCount,
      deepestLevel: this.getDeepestLevel(state),
      finalScore: this.calculateScore(state),
      seed: state.seed,
      gameId: state.gameId,
    }
  }

  /**
   * Get the deepest level the player reached
   */
  private getDeepestLevel(state: GameState): number {
    // Get highest level number from levels map
    return Math.max(...Array.from(state.levels.keys()))
  }
}
