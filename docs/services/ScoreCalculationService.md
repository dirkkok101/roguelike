# ScoreCalculationService

**Location**: `src/services/ScoreCalculationService/ScoreCalculationService.ts`
**Dependencies**: None
**Test Coverage**: None (simple pure function)

---

## Purpose

Pure, stateless score calculation using consistent formula for victories and deaths. Rewards gold, level, and XP while penalizing long games.

---

## Public API

### Score Calculation

#### `calculateScore(gold: number, level: number, xp: number, turns: number): number`
Calculates game score from statistics.

**Parameters**:
- `gold` - Total gold collected
- `level` - Final character level (dungeon depth)
- `xp` - Total experience points earned
- `turns` - Total turns taken

**Returns**:
```typescript
number  // Calculated score
```

**Formula**:
```
score = (gold × 10) + (level × 100) + (xp × 5) - (turns ÷ 10)
```

**Breakdown**:
- **Gold score**: `gold × 10` (encourages treasure collection)
- **Level score**: `level × 100` (rewards deep exploration)
- **XP score**: `xp × 5` (rewards monster kills and leveling)
- **Turn penalty**: `turns ÷ 10` (penalizes inefficiency)

**Example**:
```typescript
const service = new ScoreCalculationService()

// Victory scenario
const victoryScore = service.calculateScore(
  500,    // gold collected
  26,     // reached level 26 (won!)
  5000,   // XP earned
  10000   // turns taken
)
// victoryScore: (500×10) + (26×100) + (5000×5) - (10000÷10)
//             = 5000 + 2600 + 25000 - 1000
//             = 31600

// Early death scenario
const deathScore = service.calculateScore(
  100,   // gold collected
  5,     // died on level 5
  500,   // XP earned
  1000   // turns taken
)
// deathScore: (100×10) + (5×100) + (500×5) - (1000÷10)
//           = 1000 + 500 + 2500 - 100
//           = 3900
```

---

## Integration Notes

**Used By**:
- GameStorageService (calculate score before saving)
- LeaderboardService (populate leaderboard with scores)
- DeathService (calculate death score)
- VictoryService (calculate victory score)

**Usage Pattern**:
```typescript
const scoreService = new ScoreCalculationService()

// On game end (victory or death)
const score = scoreService.calculateScore(
  gameState.player.gold,
  gameState.currentLevel,
  gameState.player.xp,
  gameState.turnCount
)

// Store in leaderboard
const entry: LeaderboardEntry = {
  id: gameId,
  characterName: gameState.player.name,
  score: score,
  level: gameState.currentLevel,
  isVictory: hasAmulet && currentLevel === 1,
  turnCount: gameState.turnCount,
  timestamp: Date.now()
}
```

---

## Testing

**Test Files**: None (simple pure function, manually validated)

**Coverage**: Implicitly tested via integration tests

**Note**: Could benefit from unit tests covering:
- Various score scenarios (victory, early death, late death)
- Edge cases (zero values, max values)
- Turn penalty calculation

---

## Related Services

- [LeaderboardService](./LeaderboardService.md) - Uses scores for leaderboard ranking
- [LeaderboardStorageService](./LeaderboardStorageService.md) - Persists scores
- [VictoryService](./VictoryService.md) - Calculates victory scores
- [DeathService](./DeathService.md) - Calculates death scores
- [GameStorageService](./GameStorageService.md) - Stores scores in save metadata

---

## Technical Details

**Score Formula Constants**:
```typescript
export const SCORE_FORMULA = {
  GOLD_MULTIPLIER: 10,       // Gold worth 10 points each
  LEVEL_MULTIPLIER: 100,     // Each level worth 100 points
  XP_MULTIPLIER: 5,          // Each XP worth 5 points
  TURN_PENALTY_DIVISOR: 10,  // Lose 1 point per 10 turns
}
```

**Rationale**:
- **Gold multiplier (10×)**: Makes treasure hunting worthwhile
- **Level multiplier (100×)**: Highest weight - rewards deep exploration
- **XP multiplier (5×)**: Rewards combat and leveling
- **Turn penalty (÷10)**: Prevents score farming via waiting

**Typical Score Ranges**:
| Scenario | Gold | Level | XP | Turns | Score |
|----------|------|-------|-----|-------|-------|
| Early death (level 5) | 100 | 5 | 500 | 1000 | ~3,900 |
| Mid-game death (level 15) | 300 | 15 | 2000 | 5000 | ~13,500 |
| Victory (level 26) | 500 | 26 | 5000 | 10000 | ~31,600 |
| Victory (fast) | 400 | 26 | 4500 | 5000 | ~30,500 |

**Design Principles**:
- **Pure function**: No side effects, deterministic
- **Stateless**: No instance state needed
- **Configurable**: Formula constants exported for tuning
- **Consistent**: Same formula for victories and deaths

**Future Enhancements**:
- Bonus for victory (e.g., +10000 points for winning)
- Bonus for speed runs (e.g., +points for turns < threshold)
- Configurable multipliers (difficulty settings)
- Leaderboard categories (fastest victory, highest gold, etc.)

**Browser Compatibility**:
- Pure JavaScript, no browser APIs
- Works in all environments (browser, Node, tests)
