# LeaderboardService

**Location**: `src/services/LeaderboardService/LeaderboardService.ts`
**Dependencies**: None
**Test Coverage**: Entry creation, filtering, statistics, rankings

---

## Purpose

Pure, stateless leaderboard entry management. Creates entries from game state, filters entries, calculates statistics, and determines rankings.

---

## Public API

### createEntry(gameState: GameState, score: number, isVictory: boolean): LeaderboardEntry
Creates leaderboard entry from game state.

### filterEntries(entries: LeaderboardEntry[], filters: LeaderboardFilters): LeaderboardEntry[]
Filters entries by status, seed, date range.

### calculateStatistics(entries: LeaderboardEntry[]): AggregateStatistics
Calculates aggregate stats (total runs, victories, average score, etc.).

### getPersonalBests(entries: LeaderboardEntry[]): PersonalBests
Finds personal best records (highest score, fastest victory, deepest level, most kills).

### getRank(score: number, entries: LeaderboardEntry[]): RankInfo
Determines rank and percentile for score.

---

## Related Services
- [LeaderboardStorageService](./LeaderboardStorageService.md) - Persists entries
- [ScoreCalculationService](./ScoreCalculationService.md) - Calculates scores
