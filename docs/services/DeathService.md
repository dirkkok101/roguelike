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

## Related Services

- [ScoreCalculationService](./ScoreCalculationService.md) - Calculates final score
