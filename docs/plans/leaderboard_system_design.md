# Leaderboard System - Design & Implementation Plan

**Version**: 1.0
**Date**: 2025-10-06
**Status**: Planning Phase
**Related Docs**: [VictoryService](../services/VictoryService.md) | [LocalStorageService](../services/LocalStorageService.md) | [Progression](../game-design/13-progression.md)

---

## Executive Summary

This document provides a comprehensive design for implementing a **Leaderboard System** in the ASCII Roguelike. The system will track player achievements, high scores, and death statistics across multiple runs, providing motivation for replayability and competitive speedrunning.

**Current State**: No leaderboard or persistent score tracking
**Target State**: Full-featured leaderboard with local storage, filterable views, and statistics

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Requirements & Features](#2-requirements--features)
3. [Data Model Design](#3-data-model-design)
4. [Service Architecture](#4-service-architecture)
5. [UI Components](#5-ui-components)
6. [Storage Strategy](#6-storage-strategy)
7. [Implementation Phases](#7-implementation-phases)
8. [Testing Strategy](#8-testing-strategy)
9. [Design Decisions](#9-design-decisions)

---

## 1. Current State Analysis

### 1.1 What Exists

**VictoryService** (`src/services/VictoryService/VictoryService.ts`):
- ✅ Victory condition checking (`checkVictory()`)
- ✅ Score calculation formula (gold, level, XP, turn penalty)
- ✅ Victory stats generation (`VictoryStats` interface)
- ✅ Includes seed for speedrun verification

**DeathService** (`src/services/DeathService/DeathService.ts`):
- ✅ Comprehensive death statistics (`ComprehensiveDeathStats`)
- ✅ Achievement system (milestones based on progress)
- ✅ Epitaph generation (flavor text)
- ✅ Tracks combat, exploration, loot stats

**LocalStorageService** (`src/services/LocalStorageService/LocalStorageService.ts`):
- ✅ Save/load game state
- ✅ Permadeath enforcement (delete save on death)
- ✅ List all saves
- ✅ Serialization/deserialization (Maps, Sets)

**UI Components**:
- ✅ VictoryScreen - Displays final victory stats
- ✅ DeathScreen - Displays death stats and achievements
- ✅ MainMenu - Start/continue game

**Scoring Formula** (VictoryService:34-40):
```typescript
Score = (Gold × 10) + (Player Level × 100) + (XP × 5) - (Turns ÷ 10)
```

### 1.2 What's Missing

**No Persistent Score Tracking**:
- Scores are shown on victory/death but not saved
- No comparison across runs
- No all-time high scores
- No statistics dashboard

**No Leaderboard Views**:
- Can't see previous runs
- Can't filter by victory vs death
- Can't compare performance over time
- No seed-based leaderboards

**No Statistics Aggregation**:
- Total games played
- Win rate percentage
- Average score
- Best/worst performances
- Monster kill totals across all runs

---

## 2. Requirements & Features

### 2.1 Core Features (MVP)

**Leaderboard Entries**:
- ✅ Record every game completion (victory OR death)
- ✅ Store comprehensive statistics per run
- ✅ Persist to LocalStorage
- ✅ Display top 10/25/50 runs

**Score Tracking**:
- ✅ Use existing VictoryService score formula
- ✅ Track both victory and death runs
- ✅ Sort by score (highest first)

**Statistics Display**:
- ✅ Total games played
- ✅ Total victories
- ✅ Win rate percentage
- ✅ Highest score
- ✅ Deepest level reached

**UI Views**:
- ✅ Leaderboard screen (accessible from main menu)
- ✅ Tabs: All Runs | Victories | Deaths
- ✅ Entry details modal (click entry to see full stats)

### 2.2 Advanced Features (Phase 2+)

**Filtering & Sorting**:
- Filter by: All, Victories, Deaths, Date Range
- Sort by: Score, Turns, Level, Gold, Date

**Seed-Based Leaderboards**:
- Group runs by seed
- Compare performance on same dungeon
- Enable speedrun competition
- Challenge friends with seed sharing

**Statistics Dashboard**:
- Aggregate stats across all runs
- Graphs/charts (turn trends, score progression)
- Monster kill breakdown by type
- Item usage statistics

**Daily/Weekly Challenges**:
- Fixed seed per day/week
- Global leaderboard (cloud-based)
- Single-attempt runs
- Special modifiers (hard mode, speed mode)

**Export/Share**:
- Export leaderboard as JSON
- Share individual run stats
- Screenshot/clipboard support

---

## 3. Data Model Design

### 3.1 LeaderboardEntry Interface

**Complete run record** (combines VictoryStats + ComprehensiveDeathStats):

```typescript
export interface LeaderboardEntry {
  // Meta
  id: string                    // Unique entry ID (gameId + timestamp)
  gameId: string                // Game instance ID
  timestamp: number             // Unix timestamp (milliseconds)
  seed: string                  // Dungeon seed for verification

  // Outcome
  isVictory: boolean            // True = victory, False = death
  score: number                 // Calculated score (VictoryService formula)

  // Death info (null if victory)
  deathCause: string | null     // "Killed by Orc", "Starved to death"
  epitaph: string | null        // Flavor text

  // Character progression
  finalLevel: number            // Player character level
  totalXP: number               // Total experience earned
  totalGold: number             // Total gold collected

  // Exploration
  deepestLevel: number          // Deepest dungeon level reached
  levelsExplored: number        // Number of levels explored
  totalTurns: number            // Total turns taken

  // Combat
  monstersKilled: number        // Total monster kills

  // Items
  itemsFound: number            // Items picked up
  itemsUsed: number             // Consumables used (potions, scrolls, wands)

  // Achievements (top 3 from run)
  achievements: string[]

  // Equipment (snapshot at death/victory)
  finalEquipment?: {
    weapon?: string             // "Long Sword +2"
    armor?: string              // "Chain Mail +1"
    lightSource?: string        // "Phial of Galadriel"
    rings?: string[]            // ["Ring of Regeneration", "Ring of Slow Digestion"]
  }

  // Efficiency metrics (derived)
  scorePerTurn?: number         // score / turns (efficiency rating)
  killsPerLevel?: number        // monstersKilled / deepestLevel
}
```

**Size Estimate**: ~500 bytes per entry (JSON serialized)
**Storage**: 100 entries ≈ 50 KB (well within LocalStorage limits)

---

### 3.2 AggregateStatistics Interface

**Cross-run statistics** (calculated from all entries):

```typescript
export interface AggregateStatistics {
  // Overview
  totalGamesPlayed: number
  totalVictories: number
  totalDeaths: number
  winRate: number               // victories / gamesPlayed (percentage)

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
  fastestVictory: LeaderboardEntry | null       // Lowest turn count victory
  highestScorePerTurn: LeaderboardEntry | null  // Most efficient run

  // Progression
  averageScore: number
  averageFinalLevel: number
  totalGoldCollected: number

  // Recent performance (last 10 runs)
  recentWinRate: number
  recentAverageScore: number

  // Streaks
  currentWinStreak: number
  longestWinStreak: number
  currentDeathStreak: number
}
```

**Why Separate from Entries?**
- Computed on-demand from entries (no duplication)
- Expensive to calculate every render
- Cached and invalidated when new entry added

---

### 3.3 LeaderboardFilters Interface

**User-configurable view filters**:

```typescript
export interface LeaderboardFilters {
  // Filter criteria
  outcome: 'all' | 'victories' | 'deaths'
  dateRange: 'all-time' | 'last-7-days' | 'last-30-days' | 'custom'
  customDateStart?: number      // Unix timestamp
  customDateEnd?: number        // Unix timestamp
  minScore?: number             // Score threshold
  minLevel?: number             // Level threshold
  seed?: string                 // Filter by specific seed

  // Sorting
  sortBy: 'score' | 'date' | 'turns' | 'level' | 'gold' | 'kills'
  sortOrder: 'desc' | 'asc'     // Descending (default) or ascending

  // Pagination
  limit: number                 // Max entries to display (10, 25, 50, 100)
  offset: number                // Pagination offset
}
```

**Default Filters**:
```typescript
const DEFAULT_FILTERS: LeaderboardFilters = {
  outcome: 'all',
  dateRange: 'all-time',
  sortBy: 'score',
  sortOrder: 'desc',
  limit: 25,
  offset: 0
}
```

---

## 4. Service Architecture

### 4.1 LeaderboardService (NEW)

**Responsibilities**: Leaderboard entry management, filtering, statistics

**Location**: `src/services/LeaderboardService/LeaderboardService.ts`

**Dependencies**: None (stateless, operates on provided entries)

**Public API**:

```typescript
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
  ): LeaderboardEntry

  /**
   * Filter and sort entries based on criteria
   * Returns paginated results
   */
  filterEntries(
    entries: LeaderboardEntry[],
    filters: LeaderboardFilters
  ): LeaderboardEntry[]

  /**
   * Calculate aggregate statistics from all entries
   * Cached for performance
   */
  calculateAggregateStats(
    entries: LeaderboardEntry[]
  ): AggregateStatistics

  /**
   * Get top N entries by score
   */
  getTopScores(
    entries: LeaderboardEntry[],
    limit: number
  ): LeaderboardEntry[]

  /**
   * Get entries for specific seed (for seed challenges)
   */
  getEntriesBySeed(
    entries: LeaderboardEntry[],
    seed: string
  ): LeaderboardEntry[]

  /**
   * Calculate rank for a given score
   * Returns: { rank: number, percentile: number }
   */
  calculateRank(
    score: number,
    entries: LeaderboardEntry[]
  ): { rank: number, percentile: number }

  /**
   * Get personal best statistics
   */
  getPersonalBests(
    entries: LeaderboardEntry[]
  ): {
    highestScore: LeaderboardEntry
    fastestVictory: LeaderboardEntry | null
    deepestLevel: LeaderboardEntry
    mostKills: LeaderboardEntry
  }
}
```

**Pure Logic, Stateless**: All methods are pure functions (no internal state)

---

### 4.2 LeaderboardStorageService (NEW)

**Responsibilities**: Persist leaderboard entries to LocalStorage

**Location**: `src/services/LeaderboardStorageService/LeaderboardStorageService.ts`

**Dependencies**: None (uses browser LocalStorage API)

**Storage Key**: `roguelike_leaderboard`

**Public API**:

```typescript
export class LeaderboardStorageService {
  /**
   * Add new entry to leaderboard
   * Automatically sorts and stores
   */
  addEntry(entry: LeaderboardEntry): void

  /**
   * Get all leaderboard entries
   * Returns sorted by score (descending)
   */
  getAllEntries(): LeaderboardEntry[]

  /**
   * Get entry by ID
   */
  getEntry(id: string): LeaderboardEntry | null

  /**
   * Delete entry by ID
   * (for user cleanup of old runs)
   */
  deleteEntry(id: string): void

  /**
   * Clear all entries
   * (with confirmation - destructive!)
   */
  clearAll(): void

  /**
   * Get total entry count
   */
  getCount(): number

  /**
   * Export leaderboard as JSON
   */
  exportToJSON(): string

  /**
   * Import leaderboard from JSON
   * (merge with existing, avoid duplicates)
   */
  importFromJSON(json: string): { imported: number, skipped: number }
}
```

**Serialization**:
- Store as JSON array: `[entry1, entry2, entry3...]`
- Sort by score descending before storing
- Size limit: ~500 entries max (~250 KB)

**Storage Quota Management**:
- If quota exceeded, remove oldest 25% of entries (FIFO cleanup)
- Warn user if approaching limit
- Prioritize victories over deaths when pruning

---

### 4.3 Integration with Existing Services

**VictoryService** - No changes needed:
- Already calculates score
- Already generates VictoryStats
- LeaderboardService will consume VictoryStats

**DeathService** - No changes needed:
- Already generates ComprehensiveDeathStats
- Already calculates achievements
- LeaderboardService will consume DeathStats

**LocalStorageService** - No changes:
- Leaderboard uses separate storage service
- Avoids coupling with game save/load

**Integration Points**:

```typescript
// In VictoryScreen.ts - When player wins
const victoryStats = victoryService.getVictoryStats(state)
const entry = leaderboardService.createEntry(state, true, victoryStats.finalScore)
leaderboardStorageService.addEntry(entry)

// In DeathScreen.ts - When player dies
const deathStats = deathService.calculateDeathStats(state)
const score = victoryService.calculateScore(state) // Use same formula for consistency
const entry = leaderboardService.createEntry(state, false, score, deathStats)
leaderboardStorageService.addEntry(entry)
```

---

## 5. UI Components

### 5.1 LeaderboardScreen (NEW)

**Purpose**: Main leaderboard display with tabs and filters

**Location**: `src/ui/LeaderboardScreen.ts`

**Features**:
- Tabbed interface (All Runs | Victories | Deaths)
- Sortable columns (score, turns, level, date)
- Entry details modal (click entry for full stats)
- Filter controls (date range, minimum score)
- Pagination (25 entries per page)
- Personal best highlights

**Wireframe**:
```
╔══════════════════════════════════════════════════════════════╗
║                    🏆 LEADERBOARD 🏆                         ║
╠══════════════════════════════════════════════════════════════╣
║  [All Runs] [Victories] [Deaths]                             ║
║                                                              ║
║  Filter: [All Time ▼] Sort: [Score ▼]    Show: [25 ▼]      ║
║                                                              ║
║  Rank | Score    | Level | Turns  | Outcome  | Date         ║
║  ──────────────────────────────────────────────────────────  ║
║   1   | 15,430   |  10   | 1,234  | Victory  | 2025-10-05   ║
║   2   | 12,890   |   9   | 1,456  | Victory  | 2025-10-04   ║
║   3   | 11,200   |   8   | 2,100  | Death    | 2025-10-03   ║
║   4   | 10,500   |  10   | 1,890  | Victory  | 2025-10-02   ║
║   5   |  9,800   |   7   | 1,678  | Death    | 2025-10-01   ║
║  ...                                                         ║
║                                                              ║
║  [<< Prev]  Page 1 of 4  [Next >>]                          ║
║                                                              ║
║  [View Stats] [Export] [Close]                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Keyboard Controls**:
- `Arrow Keys` - Navigate entries
- `Enter` - View entry details
- `1/2/3` - Switch tabs
- `S` - Change sort
- `F` - Change filter
- `E` - Export leaderboard
- `ESC` - Close

---

### 5.2 EntryDetailsModal (NEW)

**Purpose**: Full statistics for a single leaderboard entry

**Location**: `src/ui/EntryDetailsModal.ts`

**Wireframe**:
```
╔══════════════════════════════════════════════════════════════╗
║                  📜 RUN DETAILS 📜                           ║
╠══════════════════════════════════════════════════════════════╣
║  Outcome: VICTORY ✓            Score: 15,430                 ║
║  Date: October 5, 2025         Seed: a1b2c3d4                ║
║                                                              ║
║  ──────────── Character ────────────                         ║
║  Final Level: 10               Total XP: 8,540               ║
║  Total Gold: 1,250             Total Turns: 1,234            ║
║                                                              ║
║  ──────────── Exploration ────────────                       ║
║  Deepest Level: 10             Levels Explored: 10           ║
║                                                              ║
║  ──────────── Combat ────────────                            ║
║  Monsters Killed: 45           Items Found: 38               ║
║  Items Used: 22                                              ║
║                                                              ║
║  ──────────── Equipment ────────────                         ║
║  Weapon: Long Sword +2                                       ║
║  Armor: Plate Mail +1                                        ║
║  Light: Phial of Galadriel (∞)                               ║
║  Rings: Ring of Regeneration, Ring of Slow Digestion         ║
║                                                              ║
║  ──────────── Achievements ────────────                      ║
║  ✓ Deep Delver - Reached level 10                           ║
║  ✓ Monster Slayer - Killed 50 monsters                      ║
║  ✓ Amulet Bearer - Retrieved the Amulet of Yendor           ║
║                                                              ║
║  [Copy Seed] [Share] [Close]                                ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 5.3 StatisticsDashboard (NEW - Phase 2)

**Purpose**: Aggregate statistics across all runs

**Wireframe**:
```
╔══════════════════════════════════════════════════════════════╗
║                  📊 STATISTICS 📊                            ║
╠══════════════════════════════════════════════════════════════╣
║  Total Games: 42          Victories: 8       Deaths: 34      ║
║  Win Rate: 19.0%          Avg Score: 6,234                   ║
║                                                              ║
║  ──────────── Personal Bests ────────────                    ║
║  Highest Score: 15,430 (Oct 5, 2025)                         ║
║  Fastest Victory: 892 turns (Sep 28, 2025)                   ║
║  Deepest Level: 10 (multiple runs)                           ║
║  Most Kills: 67 (Oct 1, 2025)                                ║
║                                                              ║
║  ──────────── Totals ────────────                            ║
║  Total Monsters Killed: 1,234                                ║
║  Total Gold Collected: 18,540                                ║
║  Total Turns Played: 45,678                                  ║
║                                                              ║
║  ──────────── Streaks ────────────                           ║
║  Current Win Streak: 2                                       ║
║  Longest Win Streak: 3                                       ║
║                                                              ║
║  [Close]                                                     ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 5.4 MainMenu Integration

**Add "Leaderboard" Button** to main menu:

```
╔═══════════════════════════════════════╗
║     ASCII ROGUELIKE v1.0              ║
║                                       ║
║     [N] New Game                      ║
║     [C] Continue                      ║
║     [L] Leaderboard        ← NEW      ║
║     [?] Help                          ║
║     [Q] Quit                          ║
╚═══════════════════════════════════════╝
```

**Keyboard Shortcut**: `L` - Open leaderboard screen

---

## 6. Storage Strategy

### 6.1 LocalStorage Schema

**Key**: `roguelike_leaderboard`

**Value**: JSON array of LeaderboardEntry objects

**Example**:
```json
[
  {
    "id": "game-123-1696550400000",
    "gameId": "game-123",
    "timestamp": 1696550400000,
    "seed": "a1b2c3d4",
    "isVictory": true,
    "score": 15430,
    "deathCause": null,
    "epitaph": null,
    "finalLevel": 10,
    "totalXP": 8540,
    "totalGold": 1250,
    "deepestLevel": 10,
    "levelsExplored": 10,
    "totalTurns": 1234,
    "monstersKilled": 45,
    "itemsFound": 38,
    "itemsUsed": 22,
    "achievements": [
      "Deep Delver - Reached level 10",
      "Monster Slayer - Killed 50 monsters",
      "Amulet Bearer - Retrieved the Amulet of Yendor"
    ],
    "finalEquipment": {
      "weapon": "Long Sword +2",
      "armor": "Plate Mail +1",
      "lightSource": "Phial of Galadriel",
      "rings": ["Ring of Regeneration", "Ring of Slow Digestion"]
    },
    "scorePerTurn": 12.5,
    "killsPerLevel": 4.5
  }
  // ... more entries
]
```

### 6.2 Storage Limits & Cleanup

**LocalStorage Quota**: ~5-10 MB per origin (varies by browser)

**Entry Size**: ~500 bytes per entry (JSON serialized)

**Capacity**: ~500 entries max (~250 KB total)

**Auto-Cleanup Strategy** (when approaching limit):
1. Keep all victories (always)
2. Keep top 100 deaths by score
3. Delete oldest low-score deaths (FIFO)
4. Warn user at 400 entries (recommend manual cleanup)

**User Cleanup Options**:
- Delete specific entry (confirmation required)
- Clear all deaths (keep victories)
- Clear all entries (confirmation + type "DELETE")
- Export before clearing (recommended)

---

### 6.3 Data Migration

**Version 1.0** (initial):
- No migration needed (fresh schema)

**Future Versions** (if schema changes):
- Add `version: 1` field to each entry
- Migration function in LeaderboardStorageService
- Preserve backward compatibility

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Goal**: Build service layer and data model

**Tasks**:

1. **LeaderboardEntry Interface** (NEW TYPE)
   - [ ] Create `LeaderboardEntry` interface in `core.ts`
   - [ ] Create `AggregateStatistics` interface
   - [ ] Create `LeaderboardFilters` interface
   - [ ] Add `scorePerTurn` and `killsPerLevel` derived fields

2. **LeaderboardService** (NEW SERVICE)
   - [ ] Create `src/services/LeaderboardService/LeaderboardService.ts`
   - [ ] Implement `createEntry(state, isVictory, score, deathStats?)`
   - [ ] Implement `filterEntries(entries, filters)`
   - [ ] Implement `calculateAggregateStats(entries)`
   - [ ] Implement `getTopScores(entries, limit)`
   - [ ] Implement `getEntriesBySeed(entries, seed)`
   - [ ] Implement `calculateRank(score, entries)`
   - [ ] Implement `getPersonalBests(entries)`
   - [ ] Write comprehensive tests (leaderboard-service.test.ts)

3. **LeaderboardStorageService** (NEW SERVICE)
   - [ ] Create `src/services/LeaderboardStorageService/LeaderboardStorageService.ts`
   - [ ] Implement `addEntry(entry)` with auto-sort
   - [ ] Implement `getAllEntries()` with caching
   - [ ] Implement `getEntry(id)`
   - [ ] Implement `deleteEntry(id)`
   - [ ] Implement `clearAll()` with confirmation
   - [ ] Implement `getCount()`
   - [ ] Implement `exportToJSON()`
   - [ ] Implement `importFromJSON(json)`
   - [ ] Implement auto-cleanup strategy (quota management)
   - [ ] Write comprehensive tests (storage.test.ts, quota.test.ts)

**Deliverable**: Leaderboard services functional with 100% test coverage

**Estimated Effort**: 3 tasks, ~400 lines of code, ~300 lines of tests

---

### Phase 2: Victory/Death Integration

**Goal**: Record leaderboard entries on game completion

**Tasks**:

4. **Victory Screen Integration**
   - [ ] Update `VictoryScreen.ts` to create leaderboard entry
   - [ ] Call `leaderboardService.createEntry()` with victory stats
   - [ ] Call `leaderboardStorageService.addEntry()`
   - [ ] Show rank message: "Rank #3 of 42 runs!" (optional)
   - [ ] Add "View Leaderboard" button to victory screen
   - [ ] Write integration tests

5. **Death Screen Integration**
   - [ ] Update `DeathScreen.ts` to create leaderboard entry
   - [ ] Call `leaderboardService.createEntry()` with death stats
   - [ ] Call `leaderboardStorageService.addEntry()`
   - [ ] Show rank message: "Rank #15 of 42 runs" (optional)
   - [ ] Add "View Leaderboard" button to death screen
   - [ ] Write integration tests

6. **Equipment Snapshot**
   - [ ] Create helper to serialize equipment state
   - [ ] Extract weapon/armor/light/rings names from player.equipment
   - [ ] Format as readable strings ("Long Sword +2", "Plate Mail +1")
   - [ ] Include in LeaderboardEntry.finalEquipment

**Deliverable**: All game completions (victory + death) automatically recorded

**Estimated Effort**: 3 tasks, ~150 lines of code, ~80 lines of tests

---

### Phase 3: Leaderboard UI (Simple View)

**Goal**: Display leaderboard in main menu

**Tasks**:

7. **LeaderboardScreen Component** (NEW UI)
   - [ ] Create `src/ui/LeaderboardScreen.ts`
   - [ ] Implement table view (rank, score, level, turns, outcome, date)
   - [ ] Implement tabbed navigation (All | Victories | Deaths)
   - [ ] Implement sorting (click column headers)
   - [ ] Implement pagination (25 per page)
   - [ ] Implement keyboard navigation (arrow keys, tab switching)
   - [ ] Write UI tests

8. **MainMenu Integration**
   - [ ] Add "Leaderboard" button to MainMenu
   - [ ] Keyboard shortcut: `L`
   - [ ] Open LeaderboardScreen modal
   - [ ] Close returns to main menu
   - [ ] Write integration tests

9. **Basic Styling**
   - [ ] ASCII-style borders and table
   - [ ] Color coding (victories = gold, deaths = red)
   - [ ] Highlight personal bests
   - [ ] Monospace font, readable layout

**Deliverable**: Functional leaderboard screen with basic features

**Estimated Effort**: 3 tasks, ~350 lines of code, ~120 lines of tests

---

### Phase 4: Entry Details & Filtering

**Goal**: Enhanced leaderboard with details and filters

**Tasks**:

10. **EntryDetailsModal Component** (NEW UI)
    - [ ] Create `src/ui/EntryDetailsModal.ts`
    - [ ] Display full entry statistics
    - [ ] Show equipment snapshot
    - [ ] Show achievements
    - [ ] Copy seed to clipboard button
    - [ ] Close with ESC or click outside
    - [ ] Write UI tests

11. **Filter Controls**
    - [ ] Add filter dropdown (All Time | Last 7 Days | Last 30 Days)
    - [ ] Add sort dropdown (Score | Turns | Level | Date)
    - [ ] Add limit dropdown (10 | 25 | 50 | 100)
    - [ ] Update LeaderboardScreen to use filters
    - [ ] Persist filter preferences to LocalStorage
    - [ ] Write filter tests

12. **Seed-Based View**
    - [ ] Add "Group by Seed" toggle
    - [ ] Show seed leaderboards (best run per seed)
    - [ ] Click seed to view all runs for that seed
    - [ ] Highlight current seed if viewing from game
    - [ ] Write seed filtering tests

**Deliverable**: Full-featured leaderboard with filtering and details

**Estimated Effort**: 3 tasks, ~300 lines of code, ~100 lines of tests

---

### Phase 5: Statistics Dashboard

**Goal**: Aggregate statistics and personal bests

**Tasks**:

13. **StatisticsDashboard Component** (NEW UI)
    - [ ] Create `src/ui/StatisticsDashboard.ts`
    - [ ] Display aggregate statistics (total games, win rate, etc.)
    - [ ] Display personal bests (highest score, fastest victory, etc.)
    - [ ] Display totals (monsters killed, gold collected, etc.)
    - [ ] Display streaks (current, longest)
    - [ ] Add tab to LeaderboardScreen or separate button
    - [ ] Write dashboard tests

14. **Performance Optimization**
    - [ ] Cache aggregate stats calculation
    - [ ] Invalidate cache on new entry
    - [ ] Lazy-load entry details (only when modal opened)
    - [ ] Virtualize large leaderboard tables (100+ entries)
    - [ ] Write performance tests

15. **Export/Import**
    - [ ] Add "Export" button (download leaderboard.json)
    - [ ] Add "Import" button (upload and merge)
    - [ ] Handle duplicates (skip or overwrite prompt)
    - [ ] Validate imported JSON schema
    - [ ] Write export/import tests

**Deliverable**: Statistics dashboard with export/import

**Estimated Effort**: 3 tasks, ~250 lines of code, ~80 lines of tests

---

### Phase 6: Polish & Advanced Features

**Goal**: Final enhancements and edge cases

**Tasks**:

16. **Visual Enhancements**
    - [ ] Add rank badges (🥇 🥈 🥉 for top 3)
    - [ ] Add victory/death icons (✓ ✗)
    - [ ] Add achievement icons
    - [ ] Improve table styling (alternating row colors)
    - [ ] Add animations (fade-in, slide transitions)

17. **Edge Case Handling**
    - [ ] Empty leaderboard message ("No runs yet! Start your first game.")
    - [ ] Single entry display (no pagination needed)
    - [ ] Long equipment names (truncate with ellipsis)
    - [ ] Very high scores (format with commas: 1,234,567)
    - [ ] Time zone handling (display local time)
    - [ ] Write edge case tests

18. **Documentation**
    - [ ] Update `docs/services/LeaderboardService.md`
    - [ ] Update `docs/services/LeaderboardStorageService.md`
    - [ ] Update `docs/game-design/13-progression.md` (add leaderboard section)
    - [ ] Add leaderboard screenshots to docs
    - [ ] Create user guide for leaderboard features

**Deliverable**: Production-ready leaderboard system with full documentation

**Estimated Effort**: 3 tasks, ~200 lines of code, documentation

---

## 8. Testing Strategy

### 8.1 Test Organization

**Pattern**: Scenario-based testing (one file per feature/behavior)

```
src/services/LeaderboardService/
├── LeaderboardService.ts
├── entry-creation.test.ts        # createEntry() tests
├── filtering.test.ts             # filterEntries() tests
├── aggregate-stats.test.ts       # calculateAggregateStats() tests
├── ranking.test.ts               # calculateRank() tests
├── personal-bests.test.ts        # getPersonalBests() tests
└── index.ts

src/services/LeaderboardStorageService/
├── LeaderboardStorageService.ts
├── storage-operations.test.ts    # add, get, delete, clear
├── serialization.test.ts         # JSON serialize/deserialize
├── quota-management.test.ts      # Auto-cleanup, limits
├── export-import.test.ts         # Export/import functionality
└── index.ts

src/ui/
├── LeaderboardScreen.ts
├── LeaderboardScreen.test.ts     # UI rendering, interactions
├── EntryDetailsModal.ts
├── EntryDetailsModal.test.ts     # Modal display, keyboard
├── StatisticsDashboard.ts
└── StatisticsDashboard.test.ts   # Stats calculation, display
```

### 8.2 Test Coverage Goals

**Services**: Aim for 100% coverage (pure logic, fully testable)
**UI Components**: >80% coverage (rendering, user interactions)

**Key Test Scenarios**:

**LeaderboardService**:
1. Entry creation from victory state
2. Entry creation from death state
3. Filtering by outcome (all, victories, deaths)
4. Filtering by date range
5. Filtering by seed
6. Sorting (score, turns, level, date)
7. Pagination (limit, offset)
8. Aggregate stats calculation (totals, averages, win rate)
9. Rank calculation (rank, percentile)
10. Personal bests extraction

**LeaderboardStorageService**:
1. Add entry (auto-sort by score)
2. Get all entries (sorted)
3. Get single entry by ID
4. Delete entry by ID
5. Clear all entries
6. Export to JSON (serialization)
7. Import from JSON (deserialization, merge)
8. Quota management (auto-cleanup)
9. Duplicate handling (skip on import)
10. Corrupted data handling (graceful failure)

**UI Components**:
1. Leaderboard screen renders entries
2. Tab switching (All | Victories | Deaths)
3. Sorting by column click
4. Pagination (next/prev buttons)
5. Entry details modal opens/closes
6. Filter controls update view
7. Keyboard navigation (arrow keys, enter, ESC)
8. Empty state display
9. Export/import buttons work
10. Personal best highlights

### 8.3 Test Data Fixtures

**Create realistic test data**:

```typescript
// Test fixture: Sample leaderboard entries
export const MOCK_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'test-1',
    gameId: 'game-1',
    timestamp: Date.now() - 86400000, // 1 day ago
    seed: 'seed-1',
    isVictory: true,
    score: 15430,
    deathCause: null,
    epitaph: null,
    finalLevel: 10,
    totalXP: 8540,
    totalGold: 1250,
    deepestLevel: 10,
    levelsExplored: 10,
    totalTurns: 1234,
    monstersKilled: 45,
    itemsFound: 38,
    itemsUsed: 22,
    achievements: ['Deep Delver', 'Monster Slayer', 'Amulet Bearer'],
    finalEquipment: {
      weapon: 'Long Sword +2',
      armor: 'Plate Mail +1',
      lightSource: 'Phial of Galadriel',
      rings: ['Ring of Regeneration', 'Ring of Slow Digestion']
    },
    scorePerTurn: 12.5,
    killsPerLevel: 4.5
  },
  // ... more entries (victories and deaths)
]
```

### 8.4 Integration Tests

**End-to-End Flows**:

```typescript
describe('Leaderboard Integration', () => {
  test('victory adds entry to leaderboard', () => {
    // Simulate victory
    const state = createVictoryGameState()
    const stats = victoryService.getVictoryStats(state)

    // Create entry
    const entry = leaderboardService.createEntry(state, true, stats.finalScore)

    // Store entry
    leaderboardStorageService.addEntry(entry)

    // Verify stored
    const allEntries = leaderboardStorageService.getAllEntries()
    expect(allEntries).toHaveLength(1)
    expect(allEntries[0].isVictory).toBe(true)
  })

  test('death adds entry to leaderboard', () => {
    // Simulate death
    const state = createDeathGameState('Killed by Orc')
    const deathStats = deathService.calculateDeathStats(state)
    const score = victoryService.calculateScore(state)

    // Create entry
    const entry = leaderboardService.createEntry(state, false, score, deathStats)

    // Store entry
    leaderboardStorageService.addEntry(entry)

    // Verify stored
    const allEntries = leaderboardStorageService.getAllEntries()
    expect(allEntries[0].isVictory).toBe(false)
    expect(allEntries[0].deathCause).toBe('Killed by Orc')
  })

  test('leaderboard screen displays entries', () => {
    // Add test entries
    const entries = [createVictoryEntry(), createDeathEntry()]
    entries.forEach(e => leaderboardStorageService.addEntry(e))

    // Render leaderboard screen
    const screen = new LeaderboardScreen(leaderboardService, leaderboardStorageService)
    screen.show()

    // Verify display
    expect(screen.getDisplayedEntries()).toHaveLength(2)
    expect(screen.getTab()).toBe('all')
  })
})
```

---

## 9. Design Decisions

### 9.1 Separate Storage from Game Saves

**Decision**: Use separate `LeaderboardStorageService` instead of extending `LocalStorageService`

**Rationale**:
- **Single Responsibility**: Game saves and leaderboard are distinct concerns
- **Storage Keys**: Separate keys prevent conflicts (`roguelike_save_*` vs `roguelike_leaderboard`)
- **Quota Management**: Leaderboard has different cleanup strategy (keep top scores)
- **Testability**: Easier to test in isolation
- **Future Cloud Sync**: Leaderboard may sync independently from saves

**Alternative Considered**: Extend LocalStorageService with leaderboard methods
- ❌ Violates Single Responsibility
- ❌ Couples unrelated concerns
- ❌ Harder to test

---

### 9.2 Record Both Victories and Deaths

**Decision**: Store all game completions (both victories and deaths)

**Rationale**:
- **Learning Tool**: See progression over time (deaths → victories)
- **Complete History**: Track improvement across all runs
- **Death Statistics**: Interesting to see "best death" (highest score without winning)
- **Motivation**: "Almost made it!" deaths encourage retry
- **Filtering**: Can filter to victories-only if desired

**Alternative Considered**: Only store victories
- ❌ Loses valuable progression data
- ❌ No way to track improvement before first victory
- ✅ Simpler storage (fewer entries)

**Verdict**: Store all completions, allow filtering

---

### 9.3 Derived Fields (scorePerTurn, killsPerLevel)

**Decision**: Calculate and store efficiency metrics in entry

**Rationale**:
- **Sorting**: Can sort by efficiency without recalculating
- **Performance**: Pre-computed, no need to derive on render
- **Consistency**: Same calculation used across all views
- **Speedrun Metric**: `scorePerTurn` is useful for competitive comparison

**Implementation**:
```typescript
entry.scorePerTurn = score / totalTurns
entry.killsPerLevel = monstersKilled / deepestLevel
```

---

### 9.4 Seed-Based Leaderboards (Phase 2+)

**Decision**: Support filtering by seed for competitive runs

**Rationale**:
- **Fair Comparison**: Same dungeon = same opportunities
- **Speedrun Competition**: Share seed, compete on same layout
- **Challenge Mode**: "Beat my time on seed-xyz!"
- **Daily Challenges**: Fixed seed per day (future feature)

**Implementation**:
```typescript
// Filter entries by seed
const seedEntries = leaderboardService.getEntriesBySeed(allEntries, 'a1b2c3d4')

// Display seed leaderboard
renderSeedLeaderboard(seedEntries)
```

**UI Flow**:
1. View leaderboard
2. Click "Group by Seed" toggle
3. Leaderboard groups by seed, shows best run per seed
4. Click seed to expand and see all runs for that seed

---

### 9.5 Auto-Cleanup Strategy

**Decision**: Keep all victories, prune oldest low-score deaths

**Rationale**:
- **Victories are Precious**: Never delete player's wins
- **Deaths are Abundant**: Most runs end in death, need cleanup
- **Score-Based**: Keep high-scoring deaths (impressive runs)
- **FIFO for Low Scores**: Oldest low-score deaths deleted first
- **User Control**: Manual delete option for any entry

**Cleanup Trigger**:
- When entry count > 400 (approaching 500 limit)
- Keep all victories
- Keep top 100 deaths by score
- Delete oldest deaths beyond top 100

**User Warning**:
```
"Leaderboard approaching storage limit (425 entries).
Consider exporting and clearing old deaths.
[Export] [Clear Deaths] [Dismiss]"
```

---

### 9.6 Same Score Formula for Victories and Deaths

**Decision**: Use VictoryService score formula for both outcomes

**Rationale**:
- **Consistency**: All runs ranked on same scale
- **Fair Comparison**: High-score death vs low-score victory (which is better?)
- **Simplicity**: Single source of truth for scoring
- **Motivation**: "I scored 10K but didn't win!" → encourages retry

**Formula** (same for all):
```
Score = (Gold × 10) + (Level × 100) + (XP × 5) - (Turns ÷ 10)
```

**Example**:
- Victory (Level 10, 1K gold, 8K XP, 1200 turns): **~51,880 points**
- Death (Level 7, 800 gold, 5K XP, 900 turns): **~32,610 points**

Victory still scores higher due to level bonus, but impressive deaths rank too.

---

### 9.7 Equipment Snapshot (String Format)

**Decision**: Store equipment as readable strings, not full objects

**Rationale**:
- **Storage Efficiency**: Strings are smaller than full item objects
- **Readability**: "Long Sword +2" more readable than `{ id: '123', type: 'weapon', damage: '1d12', bonus: 2 }`
- **Display-Ready**: No formatting needed in UI
- **Immutability**: Snapshot doesn't reference game state

**Format**:
```typescript
finalEquipment: {
  weapon: "Long Sword +2",
  armor: "Plate Mail +1",
  lightSource: "Phial of Galadriel (∞)",
  rings: ["Ring of Regeneration", "Ring of Slow Digestion"]
}
```

**Extraction Function**:
```typescript
private extractEquipmentSnapshot(player: Player): FinalEquipment {
  return {
    weapon: player.equipment.weapon?.name || 'None',
    armor: player.equipment.armor?.name || 'None',
    lightSource: player.equipment.lightSource?.name || 'None',
    rings: [
      player.equipment.leftRing?.name,
      player.equipment.rightRing?.name
    ].filter(Boolean) as string[]
  }
}
```

---

### 9.8 Pagination Default (25 entries)

**Decision**: Show 25 entries per page by default

**Rationale**:
- **Readability**: Fits on screen without scrolling
- **Performance**: Fast rendering (not rendering 500+ entries)
- **Options**: User can change to 10, 50, 100
- **Standard**: Common pagination size (GitHub, Reddit use 25)

**Controls**:
```
[<< Prev] Page 1 of 20 [Next >>]
Show: [10 ▼] [25 ✓] [50 ▼] [100 ▼]
```

---

## 10. Implementation Checklist

### Phase 1: Core Infrastructure ✅ = Complete | ⬜ = Pending

- [ ] LeaderboardEntry interface
- [ ] AggregateStatistics interface
- [ ] LeaderboardFilters interface
- [ ] LeaderboardService
  - [ ] createEntry()
  - [ ] filterEntries()
  - [ ] calculateAggregateStats()
  - [ ] getTopScores()
  - [ ] getEntriesBySeed()
  - [ ] calculateRank()
  - [ ] getPersonalBests()
  - [ ] Write tests
- [ ] LeaderboardStorageService
  - [ ] addEntry()
  - [ ] getAllEntries()
  - [ ] getEntry()
  - [ ] deleteEntry()
  - [ ] clearAll()
  - [ ] exportToJSON()
  - [ ] importFromJSON()
  - [ ] Auto-cleanup
  - [ ] Write tests

### Phase 2: Integration

- [ ] VictoryScreen integration
- [ ] DeathScreen integration
- [ ] Equipment snapshot extraction

### Phase 3: UI (Simple)

- [ ] LeaderboardScreen component
- [ ] MainMenu integration
- [ ] Basic styling

### Phase 4: UI (Advanced)

- [ ] EntryDetailsModal component
- [ ] Filter controls
- [ ] Seed-based view

### Phase 5: Statistics

- [ ] StatisticsDashboard component
- [ ] Performance optimization
- [ ] Export/import

### Phase 6: Polish

- [ ] Visual enhancements
- [ ] Edge case handling
- [ ] Documentation updates

---

## 11. Success Metrics

**Completion Criteria**:

- ✅ All game completions automatically recorded
- ✅ Leaderboard displays entries sorted by score
- ✅ Filtering works (outcome, date, seed, sort)
- ✅ Entry details modal shows full statistics
- ✅ Aggregate statistics calculated correctly
- ✅ Export/import functionality works
- ✅ Storage quota managed (auto-cleanup)
- ✅ 100% test coverage for services
- ✅ >80% test coverage for UI components
- ✅ Documentation complete

**Quality Gates**:

- All tests passing (`npm test`)
- No TypeScript errors (`npm run type-check`)
- Code coverage >80% (`npm run test:coverage`)
- Architecture review passed (SOLID principles)
- UI responsive and readable
- LocalStorage operations safe (quota handling)

---

## 12. Future Enhancements (Post-v1)

**Cloud Sync** (Phase 7):
- Sync leaderboard to cloud (Firebase/AWS)
- Global leaderboards (all players)
- Friends leaderboards (compare with friends)
- Seed challenges (compete on shared seed)

**Daily/Weekly Challenges** (Phase 8):
- Fixed seed per day/week
- Single-attempt rules
- Special modifiers (hard mode, speed mode)
- Leaderboard per challenge

**Achievements System** (Phase 9):
- Track unlockable achievements
- Display on leaderboard/profile
- Reward cosmetics or bonuses
- Steam-style achievement progress

**Graphs & Charts** (Phase 10):
- Score progression over time
- Win rate trend line
- Monster kill breakdown (pie chart)
- Turns-per-run histogram

**Share to Social** (Phase 11):
- Share victory screenshot
- Share seed challenge
- Twitter/Discord integration
- Leaderboard embeds

---

## 13. References

**Service Documentation**:
- [VictoryService](../services/VictoryService.md) - Score calculation, victory stats
- [DeathService](../services/DeathService.md) - Death statistics, achievements (not yet documented, but implemented)
- [LocalStorageService](../services/LocalStorageService.md) - Storage patterns, serialization

**Game Design Documentation**:
- [Progression & Success Metrics](../game-design/13-progression.md) - Victory conditions, achievements
- [Overview](../game-design/01-overview.md) - Product vision, success criteria
- [Future Enhancements](../game-design/14-future.md) - Daily challenges, global leaderboards

**Architecture**:
- [Architecture Guide](../architecture.md) - SOLID principles, layer separation
- [Testing Strategy](../testing-strategy.md) - Test organization, coverage goals

**Existing UI Components**:
- `src/ui/VictoryScreen.ts` - Victory display (will add leaderboard integration)
- `src/ui/DeathScreen.ts` - Death display (will add leaderboard integration)
- `src/ui/MainMenu.ts` - Main menu (will add leaderboard button)

---

**Last Updated**: 2025-10-06
**Author**: Claude Code
**Status**: Ready for Implementation
