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
 * Grouped entries by seed with aggregate statistics
 */
export interface SeedGroup {
  seed: string
  entries: LeaderboardEntry[]
  bestScore: number
  totalRuns: number
  victories: number
  defeats: number
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
      deathCause: isVictory ? null : (deathStats?.cause || state.deathCause || 'Unknown cause'),
      epitaph: isVictory ? null : (deathStats?.epitaph || null),

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
   *
   * Ranking logic: Find position in descending-sorted leaderboard
   * - For equal scores, returns the rank of the first (best) occurrence
   * - For new scores, returns the position where it would be inserted
   */
  calculateRank(score: number, entries: LeaderboardEntry[]): RankInfo {
    if (entries.length === 0) {
      return { rank: 1, percentile: 100 }
    }

    // Sort entries by score descending
    const sortedByScore = [...entries].sort((a, b) => b.score - a.score)

    // Find the first entry with score <= given score
    // This handles both equal scores and position for new scores
    let rank = sortedByScore.length + 1 // Default: worse than all entries

    for (let i = 0; i < sortedByScore.length; i++) {
      if (sortedByScore[i].score <= score) {
        rank = i + 1
        break
      }
    }

    // Calculate percentile
    const percentile =
      entries.length > 1
        ? ((entries.length - rank + 1) / entries.length) * 100
        : 100

    return {
      rank,
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

  /**
   * Filter entries by outcome (all, victories, or deaths)
   */
  filterByOutcome(
    entries: LeaderboardEntry[],
    outcome: 'all' | 'victories' | 'deaths'
  ): LeaderboardEntry[] {
    switch (outcome) {
      case 'victories':
        return entries.filter((e) => e.isVictory)
      case 'deaths':
        return entries.filter((e) => !e.isVictory)
      default:
        return entries
    }
  }

  /**
   * Filter entries by date range
   * Returns entries within the specified number of days from now
   * Pass 0 for 'all' to return all entries
   */
  filterByDateRange(entries: LeaderboardEntry[], days: number): LeaderboardEntry[] {
    if (days === 0) return entries

    const now = Date.now()
    const cutoff = now - days * 24 * 60 * 60 * 1000
    return entries.filter((e) => e.timestamp >= cutoff)
  }

  /**
   * Group entries by dungeon seed with aggregate statistics
   * Useful for comparing performance on the same dungeon layout
   * Returns groups sorted by best score descending
   */
  groupEntriesBySeed(entries: LeaderboardEntry[]): SeedGroup[] {
    const seedMap = new Map<string, LeaderboardEntry[]>()

    // Group entries by seed
    entries.forEach((entry) => {
      const existing = seedMap.get(entry.seed) || []
      existing.push(entry)
      seedMap.set(entry.seed, existing)
    })

    // Convert to SeedGroup array with aggregate stats
    const groups: SeedGroup[] = []
    seedMap.forEach((seedEntries, seed) => {
      const bestScore = Math.max(...seedEntries.map((e) => e.score))
      const victories = seedEntries.filter((e) => e.isVictory).length
      const defeats = seedEntries.length - victories

      groups.push({
        seed,
        entries: seedEntries,
        bestScore,
        totalRuns: seedEntries.length,
        victories,
        defeats,
      })
    })

    // Sort by best score descending
    return groups.sort((a, b) => b.bestScore - a.bestScore)
  }

  /**
   * Sort entries by specified column and order
   * Public method for UI to call
   */
  sortEntriesByColumn(
    entries: LeaderboardEntry[],
    column: 'rank' | 'score' | 'level' | 'turns' | 'date',
    ascending: boolean
  ): LeaderboardEntry[] {
    const sorted = [...entries]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (column) {
        case 'rank':
        case 'score':
          comparison = b.score - a.score // Higher score = better rank
          break
        case 'level':
          comparison = b.finalLevel - a.finalLevel
          break
        case 'turns':
          comparison = b.totalTurns - a.totalTurns
          break
        case 'date':
          comparison = b.timestamp - a.timestamp
          break
      }

      return ascending ? -comparison : comparison
    })

    return sorted
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
