// ============================================================================
// SCORE CALCULATION SERVICE - Calculate scores for victories and deaths
// ============================================================================

/**
 * Score calculation configuration
 * Extracted as constants for maintainability and testing
 */
export const SCORE_FORMULA = {
  GOLD_MULTIPLIER: 10,
  LEVEL_MULTIPLIER: 100,
  XP_MULTIPLIER: 5,
  TURN_PENALTY_DIVISOR: 10,
}

/**
 * ScoreCalculationService
 *
 * Pure, stateless service for calculating game scores.
 * Centralizes scoring logic to ensure consistency across victory and death scenarios.
 *
 * Score Formula:
 * - Gold collected × 10
 * - Final level × 100
 * - Total XP × 5
 * - Total turns ÷ 10 (penalty for long games)
 */
export class ScoreCalculationService {
  /**
   * Calculate score from game statistics
   * Used for both victories and deaths
   *
   * @param gold - Total gold collected
   * @param level - Final character level
   * @param xp - Total experience points earned
   * @param turns - Total turns taken
   * @returns Calculated score
   */
  calculateScore(gold: number, level: number, xp: number, turns: number): number {
    const goldScore = gold * SCORE_FORMULA.GOLD_MULTIPLIER
    const levelScore = level * SCORE_FORMULA.LEVEL_MULTIPLIER
    const xpScore = xp * SCORE_FORMULA.XP_MULTIPLIER
    const turnPenalty = Math.floor(turns / SCORE_FORMULA.TURN_PENALTY_DIVISOR)

    return goldScore + levelScore + xpScore - turnPenalty
  }
}
