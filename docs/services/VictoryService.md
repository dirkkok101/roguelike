# VictoryService

**Location**: `src/services/VictoryService/VictoryService.ts`
**Dependencies**: None
**Test Coverage**: Victory condition, score calculation, stats generation

---

## Purpose

Handles **win condition checking** and **final score calculation**. Determines when player has won and computes achievement statistics.

---

## Public API

### `checkVictory(state: GameState): boolean`
Checks if player has achieved victory condition.

**Win Condition**: On Level 1 with Amulet of Yendor

**Usage**:
```typescript
if (this.victoryService.checkVictory(state)) {
  return { ...state, isVictory: true, isGameOver: true }
}
```

**See**: `src/commands/MoveStairsCommand/MoveStairsCommand.ts`

---

### `calculateScore(state: GameState): number`
Computes final score based on player achievements.

**Formula**:
```
Score = (Gold × 10) + (Player Level × 100) + (XP × 5) - (Turns ÷ 10)
```

**Components**:
- **Gold bonus**: Encourages treasure collection
- **Level bonus**: Rewards character progression
- **XP bonus**: Rewards monster kills
- **Turn penalty**: Encourages efficient play (speedrun factor)

---

### `getVictoryStats(state: GameState): VictoryStats`
Generates complete victory statistics for display.

**Returns**:
```typescript
interface VictoryStats {
  finalLevel: number      // Player's final level
  totalGold: number       // Gold collected
  totalXP: number         // XP earned
  totalTurns: number      // Turns taken
  deepestLevel: number    // Deepest dungeon level reached
  finalScore: number      // Calculated score
  seed: string            // Game seed (for speedrun verification)
  gameId: string          // Unique game ID
}
```

**Usage**: Display on victory screen

---

## Design Rationale

### Why Turn Penalty?

**Encourages strategic play**:
- Fast completion = higher score
- Rewards efficiency over grinding
- Speedrun-friendly scoring
- Balances risk/reward (rush vs safety)

**Penalty is mild**: Turns ÷ 10 (1000 turns = -100 points)

---

### Why Include Seed in Stats?

**Speedrun Verification**:
- Same seed = same dungeon layout
- Verifiable runs on leaderboards
- Fair comparison between players
- Enables seed-based challenges

---

## Victory Flow

```
Player retrieves Amulet (Level 10)
  ↓
hasAmulet = true
  ↓
Player ascends to Level 1
  ↓
checkVictory() → true
  ↓
isVictory = true, isGameOver = true
  ↓
Display victory screen with getVictoryStats()
```

---

## Related Services

- **MoveStairsCommand** - Calls `checkVictory()` on level transitions
- **LevelingService** - Provides player level for score calculation

---

## Implementation Reference

See `src/services/VictoryService/VictoryService.ts` (67 lines)
