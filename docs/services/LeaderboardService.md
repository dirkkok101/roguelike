# LeaderboardService

**Location**: `src/services/LeaderboardService/LeaderboardService.ts`
**Dependencies**: None
**Test Coverage**: Entry creation, filtering, statistics, rankings

---

## Purpose

Pure, stateless leaderboard entry management. Creates entries from game state, filters entries, calculates statistics, and determines rankings.

---

## Public API

### createEntry(state, isVictory, score, deathStats?): LeaderboardEntry

Creates leaderboard entry from game state.

**Parameters**:
- `state: GameState` - Final game state
- `isVictory: boolean` - Whether player won (Level 1 + Amulet)
- `score: number` - Calculated score from ScoreCalculationService
- `deathStats?: ComprehensiveDeathStats` - Optional death statistics from DeathService

**Returns**:
```typescript
interface LeaderboardEntry {
  // Meta
  id: string
  gameId: string
  characterName: string
  timestamp: number
  seed: string

  // Outcome
  isVictory: boolean
  score: number

  // Death info (null if victory)
  deathCause: string | null
  epitaph: string | null

  // Character progression
  finalLevel: number
  totalXP: number
  totalGold: number

  // Exploration
  deepestLevel: number
  levelsExplored: number
  totalTurns: number

  // Combat
  monstersKilled: number

  // Items
  itemsFound: number
  itemsUsed: number

  // Achievements
  achievements: string[]

  // Equipment snapshot
  finalEquipment: {
    weapon: string
    armor: string
    lightSource: string
    rings: string[]
  }

  // Efficiency metrics
  scorePerTurn: number
  killsPerLevel: number
}
```

**Example**:
```typescript
const entry = leaderboardService.createEntry(
  finalGameState,
  false,  // Death
  12450,  // Score
  deathStats  // From DeathService
)

// entry.deathCause = "Killed by Dragon"
// entry.achievements = ["Deep Delver", "Monster Hunter"]
// entry.scorePerTurn = 2.49 (12450 / 5000 turns)
```

---

### filterEntries(entries, filters): LeaderboardEntry[]

Filters and sorts entries by status, seed, date range.

**Parameters**:
- `entries: LeaderboardEntry[]` - All entries
- `filters: LeaderboardFilters` - Filter criteria

**Filters Structure**:
```typescript
interface LeaderboardFilters {
  // Outcome filter
  outcome: 'all' | 'victories' | 'deaths'

  // Date range
  dateRange: 'all-time' | 'last-7-days' | 'last-30-days' | 'custom'
  customDateStart?: number  // Timestamp
  customDateEnd?: number    // Timestamp

  // Score/level thresholds
  minScore?: number
  minLevel?: number

  // Seed filter
  seed?: string

  // Sorting
  sortBy: 'score' | 'date' | 'turns' | 'level' | 'gold' | 'kills'
  sortOrder: 'desc' | 'asc'

  // Pagination
  offset: number
  limit: number
}
```

**Returns**: Filtered and paginated entries

**Example**:
```typescript
const topVictories = leaderboardService.filterEntries(allEntries, {
  outcome: 'victories',
  dateRange: 'last-30-days',
  sortBy: 'score',
  sortOrder: 'desc',
  offset: 0,
  limit: 10
})

// Returns: Top 10 victories from last 30 days, sorted by score
```

---

### calculateAggregateStats(entries): AggregateStatistics

Calculates aggregate stats (total runs, victories, average score, etc.).

**Returns**:
```typescript
interface AggregateStatistics {
  // Overview
  totalGamesPlayed: number
  totalVictories: number
  totalDeaths: number
  winRate: number  // Percentage (0-100)

  // High scores
  highestScore: number
  highestScoringRun: LeaderboardEntry | null

  // Exploration
  deepestLevelEverReached: number
  totalTurnsAcrossAllRuns: number
  averageTurnsPerRun: number

  // Combat
  totalMonstersKilled: number
  mostKillsInSingleRun: number

  // Efficiency
  fastestVictory: LeaderboardEntry | null  // Fewest turns
  highestScorePerTurn: LeaderboardEntry | null

  // Progression
  averageScore: number
  averageFinalLevel: number
  totalGoldCollected: number

  // Recent performance (last 10 runs)
  recentWinRate: number  // Percentage
  recentAverageScore: number

  // Streaks
  currentWinStreak: number
  longestWinStreak: number
  currentDeathStreak: number
}
```

**Example**:
```typescript
const stats = leaderboardService.calculateAggregateStats(entries)

console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`)
console.log(`Highest Score: ${stats.highestScore}`)
console.log(`Current Win Streak: ${stats.currentWinStreak}`)
```

---

### getPersonalBests(entries): PersonalBests

Finds personal best records (highest score, fastest victory, deepest level, most kills).

**Returns**:
```typescript
interface PersonalBests {
  highestScore: LeaderboardEntry | null
  fastestVictory: LeaderboardEntry | null  // Fewest turns to victory
  deepestLevel: LeaderboardEntry | null
  mostKills: LeaderboardEntry | null
}
```

**Example**:
```typescript
const bests = leaderboardService.getPersonalBests(entries)

if (bests.fastestVictory) {
  console.log(`Fastest victory: ${bests.fastestVictory.totalTurns} turns`)
}
```

---

### calculateRank(score, entries): RankInfo

Determines rank and percentile for score.

**Parameters**:
- `score: number` - Score to rank
- `entries: LeaderboardEntry[]` - All entries to compare against

**Returns**:
```typescript
interface RankInfo {
  rank: number       // Position in leaderboard (1-based, 1 = best)
  percentile: number // Percentile rank (0-100, 100 = best)
}
```

**Ranking Logic**:
- Entries sorted by score descending
- Rank 1 = highest score
- Equal scores share same rank (first occurrence)
- Percentile = `((total - rank + 1) / total) * 100`

**Example**:
```typescript
const rankInfo = leaderboardService.calculateRank(15000, allEntries)

console.log(`Rank: #${rankInfo.rank}`)
console.log(`Better than ${rankInfo.percentile.toFixed(1)}% of players`)
```

---

### Additional Methods

**Filtering & Sorting**:
- `getTopScores(entries, limit)` - Top N entries by score
- `getEntriesBySeed(entries, seed)` - All entries for specific seed
- `filterByOutcome(entries, outcome)` - Filter by all/victories/deaths
- `filterByDateRange(entries, days)` - Filter by last N days
- `sortEntriesByColumn(entries, column, ascending)` - Sort by column

**Grouping & Analysis**:
- `groupEntriesBySeed(entries)` - Group by seed with aggregate stats per seed
- `getBestEntryForSeed(entries, seed)` - Highest scoring entry for seed
- `getEntryCounts(entries)` - Count total/victories/deaths

---

## Integration Notes

### Entry Creation Flow

```typescript
// On game over (death or victory)
const score = scoreCalculationService.calculateScore(gameState)
const deathStats = deathService.calculateDeathStats(gameState)

const leaderboardEntry = leaderboardService.createEntry(
  gameState,
  gameState.isVictory,
  score,
  deathStats
)

// Save to storage
await leaderboardStorageService.addEntry(leaderboardEntry)
```

### Leaderboard Display

```typescript
// Load all entries from storage
const allEntries = await leaderboardStorageService.loadEntries()

// Calculate statistics
const stats = leaderboardService.calculateAggregateStats(allEntries)
const bests = leaderboardService.getPersonalBests(allEntries)

// Get top 10 scores
const top10 = leaderboardService.getTopScores(allEntries, 10)

// Display in UI
renderStats(stats)
renderPersonalBests(bests)
renderLeaderboard(top10)
```

### Seed Challenges

```typescript
// Compare performance on same seed
const seedGroups = leaderboardService.groupEntriesBySeed(allEntries)

seedGroups.forEach(group => {
  console.log(`Seed ${group.seed}:`)
  console.log(`  Runs: ${group.totalRuns}`)
  console.log(`  Victories: ${group.victories}`)
  console.log(`  Best Score: ${group.bestScore}`)
})
```

---

## Testing

**Test Files**:
- `LeaderboardService.test.ts` - Entry creation, filtering, statistics, rankings

**Coverage**: Comprehensive (all public methods, edge cases, empty entries, streak calculation)

---

## Technical Details

### Purity & Immutability

**Pure Functions**: All methods are pure (no side effects)
```typescript
// ✅ Returns new array (pure)
const filtered = leaderboardService.filterEntries(entries, filters)

// Original array unchanged
console.log(entries.length === originalLength)  // true
```

**No State**: Service holds no mutable state
- All data passed as parameters
- All results returned as new objects
- Perfect for functional composition

### Efficiency Metrics

**Calculated Metrics**:
```typescript
// Efficiency calculations
scorePerTurn = score / totalTurns  // Points per turn
killsPerLevel = monstersKilled / currentLevel  // Kills per level
```

**Recent Performance**: Last 10 runs tracked separately
- Helps identify improving/declining trends
- Used for "recent win rate" display

### Streak Calculation

**Algorithm**:
1. Sort entries by timestamp (oldest first)
2. Iterate through entries tracking:
   - Continuous wins → `currentWinStreak`, `longestWinStreak`
   - Continuous deaths → `currentDeathStreak`
3. Streaks reset on opposite outcome

**Example**:
```
W W W D D W W → currentWinStreak: 2, longestWinStreak: 3, currentDeathStreak: 0
```

### Equipment Snapshot

**Readable Strings**: Equipment converted to display names
```typescript
finalEquipment: {
  weapon: "Long Sword +2",
  armor: "Plate Mail +1",
  lightSource: "Lantern",
  rings: ["Ring of Protection +1", "Ring of Regeneration"]
}
```

**Why Strings?** Easier display, smaller storage, no object dependencies

---

## Related Services

- [LeaderboardStorageService](./LeaderboardStorageService.md) - Persists entries
- [ScoreCalculationService](./ScoreCalculationService.md) - Calculates scores
- [DeathService](./DeathService.md) - Generates death statistics
- [GameStorageService](./GameStorageService.md) - Orchestrates save/load/leaderboard
