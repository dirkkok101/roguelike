# LevelingService

**Location**: `src/services/LevelingService/LevelingService.ts`
**Dependencies**: RandomService
**Test Coverage**: XP calculation, level-up mechanics, XP curve

---

## Purpose

Manages experience points (XP), level progression, and stat increases. Handles XP rewards from defeating monsters and level-up bonuses.

---

## Public API

### XP Management

#### `addExperience(player: Player, xp: number): { player: Player; leveledUp: boolean }`
Adds XP to player and checks if level-up occurred.

**Parameters**:
- `player` - Current player
- `xp` - Experience points to add

**Returns**:
- `player` - Updated player with new XP total
- `leveledUp` - `true` if player reached next level threshold

**Example**:
```typescript
const result = service.addExperience(player, 50)
// player.xp: 40 → 90
// leveledUp: true (if threshold was 60)
```

---

#### `checkLevelUp(player: Player): boolean`
Checks if player has enough XP for next level.

**Returns**: `true` if `player.xp >= nextLevelThreshold`

---

### Level-Up

#### `levelUp(player: Player): Player`
Applies level-up, increasing stats.

**Effects**:
1. **Level**: +1 (max level 10)
2. **Max HP**: +1d8 (random HP increase)
3. **Current HP**: Fully healed to new max
4. **XP**: Carry-over to next level (excess XP preserved)

**Example**:
```typescript
// Player: Level 1, XP 70, HP 12/12
const leveledUp = service.levelUp(player)
// Level: 1 → 2
// MaxHP: 12 → 18 (rolled 6 on d8)
// HP: 12 → 18 (fully healed)
// XP: 70 → 10 (carried over 10 XP, threshold was 60)
```

---

### XP Calculations

#### `getXPForNextLevel(currentLevel: number): number`
Returns XP threshold for next level.

**XP Curve**:
```typescript
Level 1 → 2: 10 XP
Level 2 → 3: 30 XP
Level 3 → 4: 60 XP
Level 4 → 5: 100 XP
Level 5 → 6: 150 XP
Level 6 → 7: 210 XP
Level 7 → 8: 280 XP
Level 8 → 9: 360 XP
Level 9 → 10: 450 XP
Level 10: Max (returns Infinity)
```

**Example**:
```typescript
const xpNeeded = service.getXPForNextLevel(3)
// Returns: 60 (need 60 total XP to reach level 4)
```

---

#### `calculateXPReward(monster: Monster): number`
Returns XP value for defeating monster.

**Returns**: `monster.xpValue` (defined in monster data)

**Example XP Values**:
| Monster | XP |
|---------|-----|
| Bat | 10 |
| Orc | 25 |
| Troll | 75 |
| Dragon | 500 |

---

## Level-Up Mechanics

### HP Increase
**Random HP gain**: Roll 1d8 (1-8 HP)

**Why random?** Original Rogue mechanic - adds variability to character growth.

**Average**: ~4.5 HP per level-up

**Example Progression**:
```
Level 1: 12 HP (starting)
Level 2: 12 + 6 = 18 HP (rolled 6)
Level 3: 18 + 3 = 21 HP (rolled 3)
Level 4: 21 + 8 = 29 HP (rolled 8)
```

---

### Full Heal on Level-Up
**Why?** Reward for progression + original Rogue tradition.

```typescript
levelUp(player: Player): Player {
  const hpIncrease = this.random.roll('1d8')
  const newMaxHp = player.maxHp + hpIncrease

  return {
    ...player,
    maxHp: newMaxHp,
    hp: newMaxHp  // FULL HEAL
  }
}
```

---

### XP Carry-Over
Excess XP carries to next level:

**Example**:
- Player at Level 2 (needs 30 total XP for Level 3)
- Player has 70 XP
- Level up to 3
- XP becomes: 70 - 30 = 40 XP (carried over)

---

## XP Curve Design

**Exponential Growth**: Each level requires progressively more XP.

**Formula**: Roughly `XP(n) = XP(n-1) + (10 * n)`

**Purpose**: Slows progression at higher levels, maintains challenge.

---

## Usage in Commands

### AttackCommand
```typescript
execute(state: GameState): GameState {
  const result = this.combatService.playerAttack(player, monster)

  if (result.killed) {
    // Award XP
    const xpReward = this.levelingService.calculateXPReward(monster)
    const xpResult = this.levelingService.addExperience(player, xpReward)

    // Check for level-up
    if (xpResult.leveledUp) {
      const leveledPlayer = this.levelingService.levelUp(xpResult.player)
      // Add level-up messages
    }
  }
}
```

---

## Testing

**Test Files**:
- `xp-calculation.test.ts` - XP reward calculations
- `xp-curve.test.ts` - Level threshold validation
- `level-up.test.ts` - Level-up mechanics

**Example Test**:
```typescript
describe('LevelingService - Level-Up', () => {
  test('increases max HP by 1d8', () => {
    mockRandom.setNext([6])  // Roll 6 on d8
    const player = { ...basePlayer, level: 1, maxHp: 12 }

    const result = service.levelUp(player)

    expect(result.maxHp).toBe(18)  // 12 + 6
    expect(result.hp).toBe(18)  // Fully healed
  })
})
```

---

## Related Services

- **CombatService** - Triggers XP rewards on monster kills
- **RandomService** - HP increase dice rolls (1d8)
