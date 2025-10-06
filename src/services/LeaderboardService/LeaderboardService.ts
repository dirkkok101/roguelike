import {
  GameState,
  LeaderboardEntry,
  AggregateStatistics,
  LeaderboardFilters,
} from '@game/core/core'
import { ComprehensiveDeathStats } from '@services/DeathService'

// ============================================================================
// LEADERBOARD SERVICE - Entry management, filtering, and statistics
// ============================================================================

/**
 * Personal best records across all runs
 */
export interface PersonalBests {
  highestScore: LeaderboardEntry | null
  fastestVictory: LeaderboardEntry | null
  deepestLevel: LeaderboardEntry | null
  mostKills: LeaderboardEntry | null
}

/**
 * Rank information for a score
 */
export interface RankInfo {
  rank: number // Position in leaderboard (1-based)
  percentile: number // Percentile rank (0-100)
}

/**
 * LeaderboardService
 *
 * Pure, stateless service for leaderboard entry management.
 * All methods are pure functions with no side effects.
 *
 * Responsibilities:
 * - Create leaderboard entries from game state
 * - Filter and sort entries based on criteria
 * - Calculate aggregate statistics
 * - Extract personal best records
 */
export class LeaderboardService {
  /**
   * Create a leaderboard entry from game state and outcome
   * Called on game completion (victory or death)
   */
  createEntry(
    state: GameState,
    isVictory: boolean,
    score: number,
    deathStats?: ComprehensiveDeathStats
  ): LeaderboardEntry {
    const id = `${state.gameId}-${Date.now()}`

    // Extract equipment snapshot
    const finalEquipment = this.extractEquipmentSnapshot(state)

    // Calculate efficiency metrics
    const scorePerTurn = state.turnCount > 0 ? score / state.turnCount : 0
    const killsPerLevel =
      state.currentLevel > 0 ? state.monstersKilled / state.currentLevel : 0

    return {
      // Meta
      id,
      gameId: state.gameId,
      timestamp: Date.now(),
      seed: state.seed,

      // Outcome
      isVictory,
      score,

      // Death info (null if victory)
      deathCause: isVictory ? null : state.deathCause || 'Unknown cause',
      epitaph: isVictory ? null : deathStats?.epitaph || null,

      // Character progression
      finalLevel: state.player.level,
      totalXP: state.player.xp,
      totalGold: state.player.gold,

      // Exploration
      deepestLevel: state.currentLevel,
      levelsExplored: state.levelsExplored,
      totalTurns: state.turnCount,

      // Combat
      monstersKilled: state.monstersKilled,

      // Items
      itemsFound: state.itemsFound,
      itemsUsed: state.itemsUsed,

      // Achievements (from death stats if available, otherwise empty)
      achievements: deathStats?.achievements || [],

      // Equipment snapshot
      finalEquipment,

      // Efficiency metrics
      scorePerTurn,
      killsPerLevel,
    }
  }

  /**
   * Filter and sort entries based on criteria
   * Returns paginated results
   */
  filterEntries(
    entries: LeaderboardEntry[],
    filters: LeaderboardFilters
  ): LeaderboardEntry[] {
    let filtered = [...entries]

    // Filter by outcome
    if (filters.outcome === 'victories') {
      filtered = filtered.filter((e) => e.isVictory)
    } else if (filters.outcome === 'deaths') {
      filtered = filtered.filter((e) => !e.isVictory)
    }

    // Filter by date range
    if (filters.dateRange !== 'all-time') {
      const now = Date.now()
      const cutoffDays =
        filters.dateRange === 'last-7-days'
          ? 7
          : filters.dateRange === 'last-30-days'
            ? 30
            : 0

      if (cutoffDays > 0) {
        const cutoffTime = now - cutoffDays * 24 * 60 * 60 * 1000
        filtered = filtered.filter((e) => e.timestamp >= cutoffTime)
      }
    }

    // Filter by custom date range
    if (filters.dateRange === 'custom') {
      if (filters.customDateStart) {
        filtered = filtered.filter((e) => e.timestamp >= filters.customDateStart!)
      }
      if (filters.customDateEnd) {
        filtered = filtered.filter((e) => e.timestamp <= filters.customDateEnd!)
      }
    }

    // Filter by minimum score
    if (filters.minScore !== undefined) {
      filtered = filtered.filter((e) => e.score >= filters.minScore!)
    }

    // Filter by minimum level
    if (filters.minLevel !== undefined) {
      filtered = filtered.filter((e) => e.finalLevel >= filters.minLevel!)
    }

    // Filter by seed
    if (filters.seed) {
      filtered = filtered.filter((e) => e.seed === filters.seed)
    }

    // Sort entries
    filtered = this.sortEntries(filtered, filters.sortBy, filters.sortOrder)

    // Paginate
    const start = filters.offset
    const end = start + filters.limit
    return filtered.slice(start, end)
  }

  /**
   * Calculate aggregate statistics from all entries
   */
  calculateAggregateStats(entries: LeaderboardEntry[]): AggregateStatistics {
    if (entries.length === 0) {
      return this.getEmptyStats()
    }

    const victories = entries.filter((e) => e.isVictory)
    const deaths = entries.filter((e) => !e.isVictory)

    // Overview
    const totalGamesPlayed = entries.length
    const totalVictories = victories.length
    const totalDeaths = deaths.length
    const winRate =
      totalGamesPlayed > 0 ? (totalVictories / totalGamesPlayed) * 100 : 0

    // High scores
    const sortedByScore = [...entries].sort((a, b) => b.score - a.score)
    const highestScore = sortedByScore[0]?.score || 0
    const highestScoringRun = sortedByScore[0] || null

    // Exploration
    const deepestLevelEverReached = Math.max(
      ...entries.map((e) => e.deepestLevel),
      0
    )
    const totalTurnsAcrossAllRuns = entries.reduce(
      (sum, e) => sum + e.totalTurns,
      0
    )
    const averageTurnsPerRun =
      totalGamesPlayed > 0 ? totalTurnsAcrossAllRuns / totalGamesPlayed : 0

    // Combat
    const totalMonstersKilled = entries.reduce(
      (sum, e) => sum + e.monstersKilled,
      0
    )
    const mostKillsInSingleRun = Math.max(
      ...entries.map((e) => e.monstersKilled),
      0
    )

    // Efficiency
    const fastestVictory =
      victories.length > 0
        ? victories.reduce((fastest, v) =>
            v.totalTurns < fastest.totalTurns ? v : fastest
          )
        : null

    const highestScorePerTurn =
      entries.length > 0
        ? entries.reduce((best, e) =>
            (e.scorePerTurn || 0) > (best.scorePerTurn || 0) ? e : best
          )
        : null

    // Progression
    const averageScore =
      totalGamesPlayed > 0
        ? entries.reduce((sum, e) => sum + e.score, 0) / totalGamesPlayed
        : 0
    const averageFinalLevel =
      totalGamesPlayed > 0
        ? entries.reduce((sum, e) => sum + e.finalLevel, 0) / totalGamesPlayed
        : 0
    const totalGoldCollected = entries.reduce((sum, e) => sum + e.totalGold, 0)

    // Recent performance (last 10 runs)
    const recent = entries.slice(-10)
    const recentVictories = recent.filter((e) => e.isVictory).length
    const recentWinRate =
      recent.length > 0 ? (recentVictories / recent.length) * 100 : 0
    const recentAverageScore =
      recent.length > 0
        ? recent.reduce((sum, e) => sum + e.score, 0) / recent.length
        : 0

    // Streaks
    const streaks = this.calculateStreaks(entries)

    return {
      // Overview
      totalGamesPlayed,
      totalVictories,
      totalDeaths,
      winRate,

      // High scores
      highestScore,
      highestScoringRun,

      // Exploration
      deepestLevelEverReached,
      totalTurnsAcrossAllRuns,
      averageTurnsPerRun,

      // Combat
      totalMonstersKilled,
      mostKillsInSingleRun,

      // Efficiency
      fastestVictory,
      highestScorePerTurn,

      // Progression
      averageScore,
      averageFinalLevel,
      totalGoldCollected,

      // Recent performance
      recentWinRate,
      recentAverageScore,

      // Streaks
      ...streaks,
    }
  }

  /**
   * Get top N entries by score
   */
  getTopScores(entries: LeaderboardEntry[], limit: number): LeaderboardEntry[] {
    return [...entries].sort((a, b) => b.score - a.score).slice(0, limit)
  }

  /**
   * Get entries for specific seed (for seed challenges)
   */
  getEntriesBySeed(entries: LeaderboardEntry[], seed: string): LeaderboardEntry[] {
    return entries.filter((e) => e.seed === seed)
  }

  /**
   * Calculate rank for a given score
   * Returns rank (1-based) and percentile (0-100)
   */
  calculateRank(score: number, entries: LeaderboardEntry[]): RankInfo {
    if (entries.length === 0) {
      return { rank: 1, percentile: 100 }
    }

    const sortedByScore = [...entries].sort((a, b) => b.score - a.score)
    const rank = sortedByScore.findIndex((e) => e.score <= score) + 1

    // If score is higher than all entries, rank is 1
    const actualRank = rank === 0 ? 1 : rank

    // Calculate percentile
    const percentile =
      entries.length > 1
        ? ((entries.length - actualRank + 1) / entries.length) * 100
        : 100

    return {
      rank: actualRank,
      percentile,
    }
  }

  /**
   * Get personal best statistics
   */
  getPersonalBests(entries: LeaderboardEntry[]): PersonalBests {
    if (entries.length === 0) {
      return {
        highestScore: null,
        fastestVictory: null,
        deepestLevel: null,
        mostKills: null,
      }
    }

    const victories = entries.filter((e) => e.isVictory)

    return {
      highestScore: [...entries].sort((a, b) => b.score - a.score)[0],
      fastestVictory:
        victories.length > 0
          ? victories.reduce((fastest, v) =>
              v.totalTurns < fastest.totalTurns ? v : fastest
            )
          : null,
      deepestLevel: [...entries].sort((a, b) => b.deepestLevel - a.deepestLevel)[0],
      mostKills: [...entries].sort((a, b) => b.monstersKilled - a.monstersKilled)[0],
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract equipment snapshot from game state
   * Returns readable string representations of equipped items
   */
  private extractEquipmentSnapshot(state: GameState): LeaderboardEntry['finalEquipment'] {
    const equipment = state.player.equipment

    return {
      weapon: equipment.weapon?.name || 'None',
      armor: equipment.armor?.name || 'None',
      lightSource: equipment.lightSource?.name || 'None',
      rings: [equipment.leftRing?.name, equipment.rightRing?.name].filter(
        Boolean
      ) as string[],
    }
  }

  /**
   * Sort entries based on sort criteria
   */
  private sortEntries(
    entries: LeaderboardEntry[],
    sortBy: LeaderboardFilters['sortBy'],
    sortOrder: 'desc' | 'asc'
  ): LeaderboardEntry[] {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'score':
          comparison = b.score - a.score
          break
        case 'date':
          comparison = b.timestamp - a.timestamp
          break
        case 'turns':
          comparison = b.totalTurns - a.totalTurns
          break
        case 'level':
          comparison = b.finalLevel - a.finalLevel
          break
        case 'gold':
          comparison = b.totalGold - a.totalGold
          break
        case 'kills':
          comparison = b.monstersKilled - a.monstersKilled
          break
      }

      return sortOrder === 'asc' ? -comparison : comparison
    })

    return sorted
  }

  /**
   * Calculate win/death streaks from entries
   * Entries should be sorted by timestamp (oldest first)
   */
  private calculateStreaks(
    entries: LeaderboardEntry[]
  ): Pick<
    AggregateStatistics,
    'currentWinStreak' | 'longestWinStreak' | 'currentDeathStreak'
  > {
    if (entries.length === 0) {
      return {
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentDeathStreak: 0,
      }
    }

    // Sort by timestamp (oldest first)
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

    let currentWinStreak = 0
    let longestWinStreak = 0
    let currentDeathStreak = 0
    let tempWinStreak = 0
    let tempDeathStreak = 0

    // Iterate through sorted entries
    for (const entry of sorted) {
      if (entry.isVictory) {
        tempWinStreak++
        tempDeathStreak = 0
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak)
      } else {
        tempDeathStreak++
        tempWinStreak = 0
      }
    }

    // Current streaks are the last continuous streak
    currentWinStreak = tempWinStreak
    currentDeathStreak = tempDeathStreak

    return {
      currentWinStreak,
      longestWinStreak,
      currentDeathStreak,
    }
  }

  /**
   * Get empty statistics (when no entries exist)
   */
  private getEmptyStats(): AggregateStatistics {
    return {
      totalGamesPlayed: 0,
      totalVictories: 0,
      totalDeaths: 0,
      winRate: 0,
      highestScore: 0,
      highestScoringRun: null,
      deepestLevelEverReached: 0,
      totalTurnsAcrossAllRuns: 0,
      averageTurnsPerRun: 0,
      totalMonstersKilled: 0,
      mostKillsInSingleRun: 0,
      fastestVictory: null,
      highestScorePerTurn: null,
      averageScore: 0,
      averageFinalLevel: 0,
      totalGoldCollected: 0,
      recentWinRate: 0,
      recentAverageScore: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentDeathStreak: 0,
    }
  }
}
