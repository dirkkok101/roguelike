# DeathService

**Location**: `src/services/DeathService/DeathService.ts`
**Dependencies**: None
**Test Coverage**: Death stats calculation, achievements, epitaphs

---

## Purpose

Centralizes death-related logic. Calculates comprehensive death statistics, determines achievements based on milestones, and generates flavor text for the death screen.

---

## Public API

### calculateDeathStats(state: GameState): ComprehensiveDeathStats

Calculates comprehensive death statistics from final game state.

**Returns**:
```typescript
interface ComprehensiveDeathStats {
  // Death info
  cause: string
  finalBlow?: { damage: number; attacker: string; playerHPRemaining: number }

  // Progression
  finalLevel: number
  totalXP: number

  // Exploration
  deepestLevel: number
  totalTurns: number
  levelsExplored: number

  // Combat
  monstersKilled: number

  // Loot
  totalGold: number
  itemsFound: number
  itemsUsed: number

  // Achievements
  achievements: string[]  // Top 3 achievements

  // Meta
  seed: string
  gameId: string
  timestamp: number

  // Flavor
  epitaph?: string
}
```

### determineAchievements(state: GameState): string[]

Determines achievements based on game state milestones.

**Achievement Categories**:
- **Depth**: "Deep Delver" (level 10), "Deeper Delver" (level 5)
- **Combat**: "Monster Slayer" (50 kills), "Monster Hunter" (25 kills), "First Blood" (10 kills)
- **Survival**: "Survivor" (1000 turns), "Endurance" (500 turns)
- **Loot**: "Treasure Hoarder" (2000 gold), "Treasure Seeker" (1000 gold)
- **Items**: "Pack Rat" (50 items), "Well Equipped" (20 items)
- **Efficiency**: "Resourceful" (20 consumables used)
- **Quest**: "Amulet Bearer" (has Amulet of Yendor)

**Returns**: Top 3 achievements for display.

### generateEpitaph(cause: string): string

Generates flavor text epitaph based on death cause.

**Epitaph Types**:
- **Combat deaths** ("killed by"): "Bravery and foolishness are often indistinguishable."
- **Starvation**: "Here lies an adventurer who forgot to pack lunch."
- **Trap deaths**: "Curiosity killed more than the cat."
- **Poison**: "Not all potions are what they seem."
- **Generic**: "The dungeon keeps its secrets well."

**Note**: Uses `Math.random()` for epitaph selection (non-deterministic, UI-only).

---

## Technical Details

### Non-Determinism Exception

**generateEpitaph()** uses `Math.random()` for epitaph selection, which is **non-deterministic**. This is acceptable because:

1. **UI-Only Impact**: Epitaphs are flavor text displayed on death screen
2. **No Gameplay Impact**: Epitaph choice doesn't affect game mechanics, scores, or outcomes
3. **Non-Interactive**: Death screen is terminal state (no further player actions)
4. **Replay Compatibility**: Replay system doesn't need to preserve epitaphs

**Why It's Safe**:
```typescript
// Epitaph is purely cosmetic
const epitaph = generateEpitaph(deathCause)  // Random selection OK

// Game state is deterministic (not affected by epitaph)
const score = calculateScore(gameState)  // Deterministic
const stats = calculateDeathStats(gameState)  // Deterministic
```

**Alternative Considered**: Using seeded RNG would make epitaphs deterministic but adds complexity for zero gameplay benefit.

---

## Related Services

- [ScoreCalculationService](./ScoreCalculationService.md) - Calculates final score
