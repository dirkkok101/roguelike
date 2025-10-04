# Phase 6 Implementation Plan: Hunger & Progression System

**Version**: 1.0
**Created**: 2025-10-04
**Phase**: 6 of 8
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Testing Strategy](./testing-strategy.md) | [Plan](./plan.md)

---

## Table of Contents

1. [Overview & Current State](#1-overview--current-state)
2. [Folder Structure & Organization](#2-folder-structure--organization)
3. [Testing Strategy & Standards](#3-testing-strategy--standards)
4. [HungerService Design](#4-hungerservice-design)
5. [EatCommand Design](#5-eatcommand-design)
6. [LevelingService Design](#6-levelingservice-design)
7. [Integration Specifications](#7-integration-specifications)
8. [Type Definitions](#8-type-definitions)
9. [Architectural Compliance](#9-architectural-compliance)
10. [Implementation Order](#10-implementation-order)
11. [Complete Code Examples](#11-complete-code-examples)
12. [Reference Data](#12-reference-data)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. Overview & Current State

### 1.1 Phase 6 Goals

Implement the hunger and character progression systems to add resource management and player growth mechanics:

**Hunger System:**
- Hunger depletion over time (1 unit/turn base rate)
- Hunger states with visual warnings and combat penalties
- Food consumption mechanics
- Ring modifiers affecting hunger rate
- Starvation damage

**Leveling System:**
- XP rewards for defeating monsters
- Level-up mechanics with stat increases
- XP curve progression (levels 1-10)
- Level-up notifications

### 1.2 What's Already Implemented

✅ **Existing:**
- `Player.hunger` field exists (core.ts:110) - initialized to 1300 in main.ts:101
- `Food` item type exists in items.json
- Ring system with hunger modifiers (RingType.SLOW_DIGESTION reduces hunger)
- InventoryService for item management
- CombatService for damage calculations
- MessageService for notifications

⚪ **Needs Implementation:**
- HungerService (hunger tracking, states, effects)
- EatCommand (food consumption orchestration)
- LevelingService (XP tracking, level-ups)
- Hunger integration in MoveCommand
- Hunger penalties in CombatService
- XP awards in AttackCommand
- UI display for hunger state and XP progress

### 1.3 Dependencies

**Services Used:**
- `InventoryService` - Find/remove food items, check rings
- `MessageService` - Hunger warnings, level-up messages
- `CombatService` - Apply hunger penalties to combat
- `RandomService` - Food nutrition randomization

**Commands Modified:**
- `MoveCommand` - Add hunger tick
- `AttackCommand` - Award XP on kills

---

## 2. Folder Structure & Organization

### 2.1 New Service Folders

Create these folder structures following the project's colocated testing pattern:

```
src/services/HungerService/
├── HungerService.ts              # Implementation
├── hunger-depletion.test.ts      # Tick mechanics, ring modifiers
├── hunger-states.test.ts         # State thresholds and transitions
├── hunger-effects.test.ts        # Combat penalties, starvation damage
├── ring-modifiers.test.ts        # Ring hunger rate calculations
└── index.ts                      # Barrel export

src/services/LevelingService/
├── LevelingService.ts            # Implementation
├── xp-calculation.test.ts        # XP rewards, thresholds
├── level-up.test.ts              # Level-up mechanics, stat increases
├── xp-curve.test.ts              # XP curve validation
└── index.ts                      # Barrel export

src/commands/EatCommand/
├── EatCommand.ts                 # Implementation
├── eat-command.test.ts           # Food consumption, edge cases
└── index.ts                      # Barrel export
```

### 2.2 Barrel Export Pattern

**Example: `src/services/HungerService/index.ts`**
```typescript
export { HungerService } from './HungerService'
export { HungerState } from './HungerService'
```

**Example: `src/services/LevelingService/index.ts`**
```typescript
export { LevelingService } from './LevelingService'
```

**Example: `src/commands/EatCommand/index.ts`**
```typescript
export { EatCommand } from './EatCommand'
```

### 2.3 Import Conventions

**Use path aliases** (configured in tsconfig.json and jest.config.js):

```typescript
// ✅ Good - Path aliases with barrel exports
import { HungerService, HungerState } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { EatCommand } from '@commands/EatCommand'
import { Player, Food } from '@game/core/core'
import { IRandomService, MockRandom } from '@services/RandomService'

// ❌ Avoid - Direct file imports
import { HungerService } from '@services/HungerService/HungerService'
import { Player } from '../types/core/core'
```

**Within tests (same folder):**
```typescript
// Option 1: Relative import (preferred for colocated tests)
import { HungerService, HungerState } from './HungerService'

// Option 2: Path alias (also works)
import { HungerService, HungerState } from '@services/HungerService'

// Dependencies always via path alias
import { MockRandom } from '@services/RandomService'
import { Player, Ring, RingType } from '@game/core/core'
```

---

## 3. Testing Strategy & Standards

### 3.1 Scenario-Based Test Organization

Following [testing-strategy.md](./testing-strategy.md), organize tests by **behavior/feature**, not by method names:

**✅ Good test file names:**
- `hunger-depletion.test.ts` - Tests hunger tick mechanics
- `hunger-states.test.ts` - Tests state thresholds
- `ring-modifiers.test.ts` - Tests ring effects on hunger rate

**❌ Avoid:**
- `HungerService.test.ts` - Too broad
- `tickHunger.test.ts` - Implementation detail

### 3.2 AAA Pattern (Arrange-Act-Assert)

All tests follow this pattern for clarity:

```typescript
describe('HungerService - Hunger Depletion', () => {
  let service: HungerService
  let mockRandom: MockRandom

  beforeEach(() => {
    // Arrange: Setup dependencies
    mockRandom = new MockRandom()
    service = new HungerService(mockRandom)
  })

  test('reduces hunger by 1 each tick for base rate', () => {
    // Arrange: Create initial player state
    const player: Player = {
      ...createTestPlayer(),
      hunger: 1300,
      equipment: { ...createTestEquipment(), leftRing: null, rightRing: null }
    }

    // Act: Perform the action
    const updated = service.tickHunger(player)

    // Assert: Verify the result
    expect(updated.hunger).toBe(1299)
    expect(updated).not.toBe(player) // Immutability check
  })
})
```

### 3.3 Test Naming Conventions

Use full sentences describing expected behavior:

```typescript
// ✅ Good - Behavior-focused
test('reduces hunger by 1 each tick for base rate')
test('applies 1.5x multiplier per equipped ring')
test('returns Weak state when hunger is below 150')
test('applies -1 to hit penalty when in Weak state')
test('increases max HP by 1d8 on level up')

// ❌ Avoid - Too terse
test('tickHunger')
test('ring modifier')
test('weak state')
```

### 3.4 Coverage Goals

**Threshold**: >80% (branches, functions, lines, statements) as defined in jest.config.js

**Services**: Aim for 100% coverage
**Commands**: Aim for >80% coverage

### 3.5 MockRandom Usage

For deterministic tests involving randomness:

```typescript
test('food restores random nutrition between 1100-1499', () => {
  const mockRandom = new MockRandom([1250]) // Next nextInt() returns 1250
  const service = new HungerService(mockRandom)

  const player = { ...createTestPlayer(), hunger: 500 }
  const food: Food = { ...createTestFood() }

  const fed = service.feed(player, food)

  expect(fed.hunger).toBe(500 + 1250)
})
```

### 3.6 Immutability Verification

Every state-modifying method must verify immutability:

```typescript
test('tickHunger returns new Player object', () => {
  const player = createTestPlayer()
  const updated = service.tickHunger(player)

  expect(updated).not.toBe(player)           // Different object reference
  expect(player.hunger).toBe(1300)           // Original unchanged
  expect(updated.hunger).toBe(1299)          // New object updated
})
```

### 3.7 Nested Describe Blocks

Group related tests logically:

```typescript
describe('HungerService', () => {
  describe('tickHunger()', () => {
    test('reduces hunger by 1 each tick for base rate')
    test('does not go below zero')
    test('applies ring multipliers correctly')
  })

  describe('getHungerState()', () => {
    test('returns Normal when hunger is above 300')
    test('returns Hungry when hunger is 150-300')
    test('returns Weak when hunger is 1-149')
    test('returns Starving when hunger is 0')
  })

  describe('feed()', () => {
    test('restores random nutrition between 1100-1499')
    test('caps hunger at 2000 max')
    test('generates "tastes awful" message 30% of time')
  })
})
```

---

## 4. HungerService Design

### 4.1 Complete Interface

```typescript
import { Player, Ring, RingType } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

export enum HungerState {
  NORMAL = 'NORMAL',       // 301+ food units
  HUNGRY = 'HUNGRY',       // 150-300 food units
  WEAK = 'WEAK',           // 1-149 food units
  STARVING = 'STARVING',   // 0 food units
}

export class HungerService {
  constructor(private random: IRandomService) {}

  /**
   * Tick hunger depletion (call each turn)
   * Base rate: -1/turn
   * Ring modifier: +0.5 per equipped ring (except SLOW_DIGESTION which is -0.5)
   */
  tickHunger(player: Player): Player

  /**
   * Feed player with food ration
   * Restores random 1100-1499 hunger units (capped at 2000)
   */
  feed(player: Player, food: Food): { player: Player, message: string }

  /**
   * Get current hunger state based on food units
   */
  getHungerState(foodUnits: number): HungerState

  /**
   * Get combat penalties for current hunger state
   * Weak state: -1 to hit, -1 damage
   * Other states: no penalty
   */
  applyHungerEffects(player: Player): { toHitPenalty: number, damagePenalty: number }

  /**
   * Calculate hunger depletion rate based on equipped rings
   * Base: 1
   * Each ring: +0.5 (except SLOW_DIGESTION: -0.5)
   */
  calculateHungerRate(rings: Ring[]): number

  /**
   * Apply starvation damage (1 HP per turn at 0 hunger)
   */
  applyStarvationDamage(player: Player): Player

  /**
   * Generate hunger warning message if state changed
   */
  generateHungerWarning(oldState: HungerState, newState: HungerState): string | null
}
```

### 4.2 Hunger State Thresholds

```typescript
getHungerState(foodUnits: number): HungerState {
  if (foodUnits <= 0) return HungerState.STARVING
  if (foodUnits < 150) return HungerState.WEAK
  if (foodUnits <= 300) return HungerState.HUNGRY
  return HungerState.NORMAL
}
```

**Thresholds:**
- **NORMAL**: 301+ units (no effects)
- **HUNGRY**: 150-300 units (warning message only)
- **WEAK**: 1-149 units (combat penalties: -1 to hit, -1 damage)
- **STARVING**: 0 units (1 HP damage per turn + combat penalties)

### 4.3 Ring Hunger Modifiers

```typescript
calculateHungerRate(rings: Ring[]): number {
  let rate = 1.0 // Base rate

  rings.forEach(ring => {
    if (!ring) return

    if (ring.type === RingType.SLOW_DIGESTION) {
      rate -= 0.5 // Reduces hunger
    } else {
      rate += 0.5 // Most rings increase hunger
    }
  })

  return Math.max(0, rate) // Never negative
}
```

**Examples:**
- No rings: 1.0 units/turn
- 1 Protection ring: 1.5 units/turn
- 2 Protection rings: 2.0 units/turn
- 1 Slow Digestion ring: 0.5 units/turn
- 1 Protection + 1 Slow Digestion: 1.0 units/turn (cancel out)

### 4.4 Combat Penalties

```typescript
applyHungerEffects(player: Player): { toHitPenalty: number, damagePenalty: number } {
  const state = this.getHungerState(player.hunger)

  if (state === HungerState.WEAK || state === HungerState.STARVING) {
    return { toHitPenalty: -1, damagePenalty: -1 }
  }

  return { toHitPenalty: 0, damagePenalty: 0 }
}
```

### 4.5 Test File Specifications

#### **hunger-depletion.test.ts**

Tests hunger tick mechanics and ring modifiers:

```typescript
describe('HungerService - Hunger Depletion', () => {
  describe('tickHunger()', () => {
    test('reduces hunger by 1 each tick for base rate')
    test('does not go below zero')
    test('returns new Player object (immutability)')
    test('applies 1.5x rate with one Protection ring')
    test('applies 2.0x rate with two Protection rings')
    test('applies 0.5x rate with Slow Digestion ring')
    test('applies 1.0x rate with Protection + Slow Digestion (cancel out)')
  })

  describe('calculateHungerRate()', () => {
    test('returns 1.0 for no rings')
    test('returns 1.5 for one regular ring')
    test('returns 2.0 for two regular rings')
    test('returns 0.5 for Slow Digestion ring')
    test('returns 1.0 for mixed rings that cancel out')
    test('never returns negative rate')
  })
})
```

#### **hunger-states.test.ts**

Tests state thresholds and transitions:

```typescript
describe('HungerService - Hunger States', () => {
  describe('getHungerState()', () => {
    test('returns NORMAL when hunger is 301 or above')
    test('returns HUNGRY when hunger is 300')
    test('returns HUNGRY when hunger is 150')
    test('returns WEAK when hunger is 149')
    test('returns WEAK when hunger is 1')
    test('returns STARVING when hunger is 0')
  })

  describe('generateHungerWarning()', () => {
    test('returns "You are getting hungry" when transitioning to HUNGRY')
    test('returns "You are weak from hunger!" when transitioning to WEAK')
    test('returns "You are fainting!" when transitioning to STARVING')
    test('returns null when no state change')
    test('returns null when improving hunger state')
  })
})
```

#### **hunger-effects.test.ts**

Tests combat penalties and starvation:

```typescript
describe('HungerService - Hunger Effects', () => {
  describe('applyHungerEffects()', () => {
    test('returns no penalty in NORMAL state')
    test('returns no penalty in HUNGRY state')
    test('returns -1 to hit penalty in WEAK state')
    test('returns -1 damage penalty in WEAK state')
    test('returns penalties in STARVING state')
  })

  describe('applyStarvationDamage()', () => {
    test('reduces HP by 1 when hunger is 0')
    test('does not reduce HP when hunger is above 0')
    test('does not reduce HP below 0')
    test('returns new Player object (immutability)')
  })
})
```

#### **ring-modifiers.test.ts**

Tests ring effects on hunger:

```typescript
describe('HungerService - Ring Modifiers', () => {
  test('Protection ring increases hunger rate to 1.5x')
  test('Regeneration ring increases hunger rate to 1.5x')
  test('Add Strength ring increases hunger rate to 1.5x')
  test('Slow Digestion ring decreases hunger rate to 0.5x')
  test('Two regular rings result in 2.0x rate')
  test('Slow Digestion + Protection result in 1.0x rate')
  test('Two Slow Digestion rings result in 0.0x rate (no depletion)')
})
```

---

## 5. EatCommand Design

### 5.1 Complete Interface

```typescript
import { GameState, Food, ItemType } from '@game/core/core'
import { ICommand } from '../ICommand'
import { InventoryService } from '@services/InventoryService'
import { HungerService } from '@services/HungerService'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'

export class EatCommand implements ICommand {
  constructor(
    private inventoryService: InventoryService,
    private hungerService: HungerService,
    private messageService: MessageService,
    private random: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // 1. Find food in inventory
    // 2. If no food, return with message "You have no food to eat."
    // 3. Remove food from inventory
    // 4. Roll random nutrition (1100-1499)
    // 5. Feed player (cap at 2000)
    // 6. Generate messages:
    //    - "You eat the food ration." (always)
    //    - "Yuck, that food tasted awful!" (30% chance)
    //    - Hunger state change warning (if applicable)
    // 7. Return new state
  }
}
```

### 5.2 Execution Flow

```typescript
execute(state: GameState): GameState {
  // 1. Find food in inventory
  const food = this.inventoryService.findItemByType(
    state.player.inventory,
    ItemType.FOOD
  )

  if (!food) {
    const messages = this.messageService.addMessage(
      state.messages,
      'You have no food to eat.',
      'warning',
      state.turnCount
    )
    return { ...state, messages }
  }

  // 2. Remove food from inventory
  const updatedInventory = this.inventoryService.removeItem(
    state.player.inventory,
    food.id
  )

  // 3. Roll random nutrition (1100-1499)
  const nutrition = this.random.nextInt(1100, 1499)

  // 4. Feed player (service handles capping at 2000)
  const oldState = this.hungerService.getHungerState(state.player.hunger)
  const result = this.hungerService.feed(state.player, nutrition)
  const newState = this.hungerService.getHungerState(result.player.hunger)

  // 5. Generate messages
  let messages = this.messageService.addMessage(
    state.messages,
    'You eat the food ration.',
    'info',
    state.turnCount
  )

  // 30% chance of "tastes awful" message
  if (this.random.chance(0.3)) {
    messages = this.messageService.addMessage(
      messages,
      'Yuck, that food tasted awful!',
      'info',
      state.turnCount
    )
  }

  // Add hunger state improvement message if applicable
  const warning = this.hungerService.generateHungerWarning(oldState, newState)
  if (warning) {
    messages = this.messageService.addMessage(
      messages,
      warning,
      'success',
      state.turnCount
    )
  }

  // 6. Return new state
  return {
    ...state,
    player: {
      ...result.player,
      inventory: updatedInventory,
    },
    messages,
    turnCount: state.turnCount + 1,
  }
}
```

### 5.3 Test File Specification

#### **eat-command.test.ts**

```typescript
describe('EatCommand', () => {
  describe('execute()', () => {
    test('removes food from inventory')
    test('restores hunger by random amount (1100-1499)')
    test('caps hunger at 2000 max')
    test('adds "You eat the food ration." message')
    test('adds "tastes awful" message 30% of time (MockRandom)')
    test('returns "no food" message when inventory empty')
    test('increments turn count')
    test('returns new GameState (immutability)')
    test('improves hunger state from WEAK to NORMAL')
    test('improves hunger state from HUNGRY to NORMAL')
  })
})
```

---

## 6. LevelingService Design

### 6.1 Complete Interface

```typescript
import { Player, Monster } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

export class LevelingService {
  // XP required for each level (index = level, value = XP needed)
  private readonly XP_CURVE: number[] = [
    0,    // Level 1 (starting level)
    10,   // Level 2
    30,   // Level 3
    60,   // Level 4
    100,  // Level 5
    150,  // Level 6
    210,  // Level 7
    280,  // Level 8
    360,  // Level 9
    450,  // Level 10
  ]

  constructor(private random: IRandomService) {}

  /**
   * Add XP to player and check for level-up
   * Returns updated player + level-up flag
   */
  addExperience(player: Player, xp: number): { player: Player, leveledUp: boolean }

  /**
   * Check if player has enough XP to level up
   */
  checkLevelUp(player: Player): boolean

  /**
   * Apply level-up to player
   * Increases: level, maxHp (+1d8), resets XP to carry-over
   */
  levelUp(player: Player): Player

  /**
   * Get XP required for next level
   */
  getXPForNextLevel(currentLevel: number): number

  /**
   * Calculate XP reward for defeating monster
   * (For now, just return monster.xpValue; may add modifiers later)
   */
  calculateXPReward(monster: Monster): number
}
```

### 6.2 XP Curve

```typescript
private readonly XP_CURVE = [0, 10, 30, 60, 100, 150, 210, 280, 360, 450]

getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= 10) return Infinity // Max level
  return this.XP_CURVE[currentLevel] // e.g., level 1 needs 10 XP
}
```

**Progression:**
- Level 1 → 2: 10 XP
- Level 2 → 3: 30 XP (20 more)
- Level 3 → 4: 60 XP (30 more)
- Level 4 → 5: 100 XP (40 more)
- ...continues to Level 10

### 6.3 Level-Up Mechanics

```typescript
levelUp(player: Player): Player {
  if (player.level >= 10) return player // Max level

  // Roll 1d8 for HP increase
  const hpIncrease = this.random.roll('1d8')
  const newMaxHp = player.maxHp + hpIncrease
  const newLevel = player.level + 1

  // Calculate XP carry-over
  const xpForNextLevel = this.getXPForNextLevel(player.level)
  const xpCarryOver = player.xp - xpForNextLevel

  return {
    ...player,
    level: newLevel,
    maxHp: newMaxHp,
    hp: newMaxHp, // Fully heal on level-up
    xp: xpCarryOver,
  }
}
```

**Level-up benefits:**
- +1 level
- +1d8 max HP
- Full HP restore
- XP carry-over to next level

### 6.4 Test File Specifications

#### **xp-calculation.test.ts**

```typescript
describe('LevelingService - XP Calculation', () => {
  describe('addExperience()', () => {
    test('adds XP to player total')
    test('returns leveledUp: false when below threshold')
    test('returns leveledUp: true when reaching threshold')
    test('returns new Player object (immutability)')
  })

  describe('calculateXPReward()', () => {
    test('returns monster xpValue')
    test('handles low-XP monsters (Bat: 5 XP)')
    test('handles high-XP monsters (Dragon: 100+ XP)')
  })

  describe('getXPForNextLevel()', () => {
    test('returns 10 XP for level 1')
    test('returns 30 XP for level 2')
    test('returns Infinity for level 10 (max level)')
  })
})
```

#### **level-up.test.ts**

```typescript
describe('LevelingService - Level Up', () => {
  describe('levelUp()', () => {
    test('increases level by 1')
    test('increases max HP by 1d8 (MockRandom: 5)')
    test('fully restores HP to new max')
    test('carries over excess XP to next level')
    test('does not level up beyond level 10')
    test('returns new Player object (immutability)')
  })

  describe('checkLevelUp()', () => {
    test('returns true when XP >= threshold')
    test('returns false when XP < threshold')
    test('returns false at max level')
  })
})
```

#### **xp-curve.test.ts**

```typescript
describe('LevelingService - XP Curve', () => {
  test('level 1 requires 10 XP')
  test('level 2 requires 30 XP')
  test('level 3 requires 60 XP')
  test('level 4 requires 100 XP')
  test('level 5 requires 150 XP')
  test('level 6 requires 210 XP')
  test('level 7 requires 280 XP')
  test('level 8 requires 360 XP')
  test('level 9 requires 450 XP')
  test('level 10 is max level')
  test('curve increases progressively (each level requires more XP)')
})
```

---

## 7. Integration Specifications

### 7.1 MoveCommand Integration

**Add HungerService dependency:**

```typescript
export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private combatService: CombatService,
    private hungerService: HungerService  // ADD THIS
  ) {}
```

**Add hunger tick after movement:**

```typescript
execute(state: GameState): GameState {
  // ... existing movement logic ...

  // After successful movement, tick hunger
  const rings = [player.equipment.leftRing, player.equipment.rightRing].filter(Boolean)
  const oldHungerState = this.hungerService.getHungerState(movedPlayer.hunger)
  let updatedPlayer = this.hungerService.tickHunger(movedPlayer, rings)
  const newHungerState = this.hungerService.getHungerState(updatedPlayer.hunger)

  // Generate hunger warning if state changed
  const hungerWarning = this.hungerService.generateHungerWarning(oldHungerState, newHungerState)
  if (hungerWarning) {
    messages = this.messageService.addMessage(messages, hungerWarning, 'warning', state.turnCount)
  }

  // Apply starvation damage if starving
  if (newHungerState === HungerState.STARVING) {
    updatedPlayer = this.hungerService.applyStarvationDamage(updatedPlayer)
    messages = this.messageService.addMessage(
      messages,
      'You are fainting from hunger!',
      'critical',
      state.turnCount
    )
  }

  // ... rest of method ...
}
```

### 7.2 CombatService Integration

**Add hunger penalty methods:**

```typescript
export class CombatService {
  constructor(
    private random: IRandomService,
    private hungerService?: HungerService  // Optional for backwards compatibility
  ) {}

  /**
   * Player attacks monster (with hunger penalties)
   */
  playerAttack(player: Player, monster: Monster): CombatResult {
    const strengthBonus = this.getStrengthBonus(player)
    const effectiveStrength = player.strength + strengthBonus

    // Apply hunger penalties if service available
    let toHitModifier = 0
    let damageModifier = 0
    if (this.hungerService) {
      const penalties = this.hungerService.applyHungerEffects(player)
      toHitModifier = penalties.toHitPenalty
      damageModifier = penalties.damagePenalty
    }

    const hit = this.calculateHit(
      player.level + effectiveStrength + toHitModifier,
      monster.ac
    )

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: 'Player',
        defender: monster.name,
        killed: false,
      }
    }

    const weapon = player.equipment.weapon
    const baseDamage = this.calculatePlayerDamage(player, weapon)
    const damage = Math.max(0, baseDamage + damageModifier) // Don't go negative

    // ... rest of method ...
  }
}
```

**Test file: `hunger-penalties.test.ts`**

```typescript
describe('CombatService - Hunger Penalties', () => {
  test('applies -1 to hit penalty when player is Weak')
  test('applies -1 damage penalty when player is Weak')
  test('applies penalties when player is Starving')
  test('applies no penalty when player is Normal')
  test('applies no penalty when player is Hungry')
  test('damage penalty does not go below 0')
})
```

### 7.3 AttackCommand Integration

**Add LevelingService dependency:**

```typescript
export class AttackCommand implements ICommand {
  constructor(
    private combatService: CombatService,
    private messageService: MessageService,
    private levelingService: LevelingService  // ADD THIS
  ) {}
```

**Award XP on kill:**

```typescript
execute(state: GameState): GameState {
  // ... existing combat logic ...

  if (result.killed) {
    // Award XP
    const xpReward = this.levelingService.calculateXPReward(monster)
    const xpResult = this.levelingService.addExperience(state.player, xpReward)

    let updatedPlayer = xpResult.player
    messages = this.messageService.addMessage(
      messages,
      `You gain ${xpReward} experience points.`,
      'success',
      state.turnCount
    )

    // Check for level-up
    if (xpResult.leveledUp) {
      updatedPlayer = this.levelingService.levelUp(updatedPlayer)
      messages = this.messageService.addMessage(
        messages,
        `You have reached level ${updatedPlayer.level}!`,
        'success',
        state.turnCount
      )
      messages = this.messageService.addMessage(
        messages,
        `Your max HP increases to ${updatedPlayer.maxHp}!`,
        'success',
        state.turnCount
      )
    }

    // Remove monster and update state
    // ... rest of method ...
  }
}
```

### 7.4 InputHandler Updates

**Add new services to constructor:**

```typescript
export class InputHandler {
  constructor(
    // ... existing services ...
    private hungerService: HungerService,
    private levelingService: LevelingService
  ) {}
```

**Wire up 'e' key for EatCommand:**

```typescript
private handleKeyPress(event: KeyboardEvent, state: GameState): ICommand | null {
  switch (event.key) {
    // ... existing keys ...

    case 'e':
      return new EatCommand(
        this.inventoryService,
        this.hungerService,
        this.messageService,
        this.random
      )

    // ... rest of keys ...
  }
}
```

### 7.5 GameRenderer Updates

**Display hunger state:**

```typescript
// In stats panel
renderHungerBar(player: Player): HTMLElement {
  const container = document.createElement('div')
  container.className = 'hunger-display'

  const label = document.createElement('span')
  label.textContent = 'Hunger:'

  const bar = document.createElement('div')
  bar.className = 'hunger-bar'

  const fill = document.createElement('div')
  fill.className = 'hunger-fill'
  const percentage = Math.min(100, (player.hunger / 2000) * 100)
  fill.style.width = `${percentage}%`

  // Color based on state
  const state = this.getHungerStateForDisplay(player.hunger)
  fill.classList.add(`hunger-${state.toLowerCase()}`)

  bar.appendChild(fill)
  container.appendChild(label)
  container.appendChild(bar)

  return container
}
```

**Display XP progress:**

```typescript
// In stats panel
renderXPProgress(player: Player): HTMLElement {
  const container = document.createElement('div')
  container.className = 'xp-display'

  const label = document.createElement('span')
  label.textContent = `XP: ${player.xp} / ${this.getXPForNextLevel(player.level)}`

  const bar = document.createElement('div')
  bar.className = 'xp-bar'

  const fill = document.createElement('div')
  fill.className = 'xp-fill'
  const xpNeeded = this.getXPForNextLevel(player.level)
  const percentage = (player.xp / xpNeeded) * 100
  fill.style.width = `${percentage}%`

  bar.appendChild(fill)
  container.appendChild(label)
  container.appendChild(bar)

  return container
}
```

---

## 8. Type Definitions

### 8.1 HungerState Enum

Add to `src/types/core/core.ts` or create in HungerService.ts:

```typescript
export enum HungerState {
  NORMAL = 'NORMAL',       // 301+ food units, no effects
  HUNGRY = 'HUNGRY',       // 150-300 food units, warning only
  WEAK = 'WEAK',           // 1-149 food units, combat penalties
  STARVING = 'STARVING',   // 0 food units, combat penalties + starvation damage
}
```

### 8.2 Food Interface

Already exists in core.ts, extends Item:

```typescript
export interface Food extends Item {
  type: ItemType.FOOD
  nutrition: number  // Added if not present
}
```

### 8.3 Player Interface

Already has `hunger: number` field at line 110. No changes needed.

### 8.4 Ring Interface

Verify RingType includes SLOW_DIGESTION:

```typescript
export enum RingType {
  PROTECTION = 'PROTECTION',
  REGENERATION = 'REGENERATION',
  ADD_STRENGTH = 'ADD_STRENGTH',
  DEXTERITY = 'DEXTERITY',
  SLOW_DIGESTION = 'SLOW_DIGESTION',  // Must be present
  // ... other types
}
```

---

## 9. Architectural Compliance

### 9.1 Checklist

- ✅ **Services contain ALL game logic** (no logic in commands)
- ✅ **Commands orchestrate only** (call service methods, no loops/calculations)
- ✅ **All state updates return new objects** (immutability)
- ✅ **Dependency injection** (RandomService injected into all services)
- ✅ **MockRandom for all randomness testing**
- ✅ **No mutations** (verified in all tests)
- ✅ **Barrel exports for all folders** (index.ts files)
- ✅ **Path aliases for all imports** (@services, @commands, @game)

### 9.2 Service Logic Examples

**✅ Good - Logic in Service:**

```typescript
// HungerService.ts
calculateHungerRate(rings: Ring[]): number {
  let rate = 1.0
  rings.forEach(ring => {
    if (ring.type === RingType.SLOW_DIGESTION) {
      rate -= 0.5
    } else {
      rate += 0.5
    }
  })
  return Math.max(0, rate)
}
```

**❌ Bad - Logic in Command:**

```typescript
// EatCommand.ts - DON'T DO THIS
execute(state: GameState): GameState {
  const food = state.player.inventory.find(i => i.type === ItemType.FOOD)
  const nutrition = Math.floor(Math.random() * 400) + 1100  // ❌ Logic!
  const newHunger = Math.min(2000, player.hunger + nutrition) // ❌ Logic!
  // ...
}
```

### 9.3 Command Orchestration Examples

**✅ Good - Orchestration Only:**

```typescript
// EatCommand.ts
execute(state: GameState): GameState {
  const food = this.inventoryService.findItemByType(state.player.inventory, ItemType.FOOD)
  if (!food) return this.handleNoFood(state)

  const updatedInventory = this.inventoryService.removeItem(state.player.inventory, food.id)
  const nutrition = this.random.nextInt(1100, 1499)
  const result = this.hungerService.feed(state.player, nutrition)

  return this.buildNewState(state, result.player, updatedInventory)
}
```

### 9.4 Immutability Pattern

**Always return new objects:**

```typescript
// ✅ Good - New object returned
tickHunger(player: Player): Player {
  const rate = this.calculateHungerRate([player.equipment.leftRing, player.equipment.rightRing])
  const newHunger = Math.max(0, player.hunger - rate)

  return {
    ...player,
    hunger: newHunger,
  }
}

// ❌ Bad - Mutation
tickHunger(player: Player): Player {
  player.hunger -= 1  // ❌ Mutates original!
  return player
}
```

---

## 10. Implementation Order

### 10.1 Recommended Sequence

Follow this order to minimize dependencies and integration issues:

**Phase 1: Type Definitions**
1. Create/verify `HungerState` enum
2. Verify `RingType.SLOW_DIGESTION` exists
3. Verify `Player.hunger` field exists

**Phase 2: HungerService**
1. Create folder structure: `src/services/HungerService/`
2. Implement `HungerService.ts` (all methods)
3. Create barrel export `index.ts`
4. Write all 4 test files:
   - `hunger-depletion.test.ts`
   - `hunger-states.test.ts`
   - `hunger-effects.test.ts`
   - `ring-modifiers.test.ts`
5. Run tests: `npm test HungerService`
6. Verify >80% coverage

**Phase 3: EatCommand**
1. Create folder structure: `src/commands/EatCommand/`
2. Implement `EatCommand.ts`
3. Create barrel export `index.ts`
4. Write test file: `eat-command.test.ts`
5. Run tests: `npm test EatCommand`
6. Verify >80% coverage

**Phase 4: MoveCommand Integration**
1. Add `HungerService` dependency to constructor
2. Add hunger tick logic after movement
3. Add hunger warning messages
4. Add starvation damage check
5. Update existing tests to pass with hunger integration
6. Run tests: `npm test MoveCommand`

**Phase 5: CombatService Integration**
1. Add optional `HungerService` dependency
2. Implement hunger penalty methods
3. Apply penalties in `playerAttack()`
4. Write test file: `hunger-penalties.test.ts`
5. Run tests: `npm test CombatService`

**Phase 6: LevelingService**
1. Create folder structure: `src/services/LevelingService/`
2. Implement `LevelingService.ts` (all methods)
3. Create barrel export `index.ts`
4. Write all 3 test files:
   - `xp-calculation.test.ts`
   - `level-up.test.ts`
   - `xp-curve.test.ts`
5. Run tests: `npm test LevelingService`
6. Verify >80% coverage

**Phase 7: AttackCommand Integration**
1. Add `LevelingService` dependency to constructor
2. Add XP award logic on kill
3. Add level-up check and messages
4. Update existing tests to pass with XP integration
5. Run tests: `npm test AttackCommand`

**Phase 8: UI Integration**
1. Update `InputHandler` with new services
2. Wire up 'e' key to EatCommand
3. Update `GameRenderer` to display hunger bar
4. Update `GameRenderer` to display XP progress
5. Update main.ts to initialize new services

**Phase 9: Full Integration Testing**
1. Manual playthrough testing
2. Verify hunger depletes correctly
3. Verify food consumption works
4. Verify XP awards and level-ups
5. Verify combat penalties apply
6. Run full test suite: `npm test`
7. Check coverage: `npm run test:coverage`

**Phase 10: Commit**
1. Update `docs/plan.md` (mark Phase 6 tasks complete)
2. Git commit with descriptive message:
   ```
   feat(phase-6): implement hunger and leveling systems

   - Add HungerService with hunger depletion, states, and combat penalties
   - Add EatCommand for food consumption
   - Add LevelingService with XP tracking and level-ups
   - Integrate hunger tick into MoveCommand
   - Integrate hunger penalties into CombatService
   - Integrate XP awards into AttackCommand
   - Update UI to display hunger and XP progress
   - Add 9 comprehensive test files (>80% coverage)
   ```

---

## 11. Complete Code Examples

### 11.1 HungerService.tickHunger()

```typescript
tickHunger(player: Player): Player {
  // Get equipped rings
  const rings: Ring[] = [
    player.equipment.leftRing,
    player.equipment.rightRing,
  ].filter(Boolean) as Ring[]

  // Calculate depletion rate
  const rate = this.calculateHungerRate(rings)

  // Apply depletion (don't go below 0)
  const newHunger = Math.max(0, player.hunger - rate)

  return {
    ...player,
    hunger: newHunger,
  }
}
```

### 11.2 HungerService.feed()

```typescript
feed(player: Player, nutrition: number): { player: Player, message: string } {
  // Cap hunger at 2000 max
  const newHunger = Math.min(2000, player.hunger + nutrition)

  const updatedPlayer = {
    ...player,
    hunger: newHunger,
  }

  // Generate message
  let message = `You eat the food ration. (+${nutrition} hunger)`

  if (newHunger === 2000) {
    message += ' You are completely full.'
  }

  return { player: updatedPlayer, message }
}
```

### 11.3 LevelingService.addExperience()

```typescript
addExperience(player: Player, xp: number): { player: Player, leveledUp: boolean } {
  const newXP = player.xp + xp
  const xpNeeded = this.getXPForNextLevel(player.level)
  const leveledUp = newXP >= xpNeeded && player.level < 10

  return {
    player: {
      ...player,
      xp: newXP,
    },
    leveledUp,
  }
}
```

### 11.4 LevelingService.levelUp()

```typescript
levelUp(player: Player): Player {
  if (player.level >= 10) {
    return player // Already max level
  }

  // Roll 1d8 for HP increase
  const hpIncrease = this.random.roll('1d8')
  const newMaxHp = player.maxHp + hpIncrease
  const newLevel = player.level + 1

  // Calculate XP carry-over
  const xpForNextLevel = this.getXPForNextLevel(player.level)
  const xpCarryOver = player.xp - xpForNextLevel

  return {
    ...player,
    level: newLevel,
    maxHp: newMaxHp,
    hp: newMaxHp, // Fully heal on level-up
    xp: Math.max(0, xpCarryOver),
  }
}
```

### 11.5 Test Example (AAA Pattern + MockRandom + Immutability)

```typescript
describe('HungerService - Hunger Depletion', () => {
  let service: HungerService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    service = new HungerService(mockRandom)
  })

  test('reduces hunger by 1 each tick for base rate', () => {
    // Arrange: Create player with no rings
    const player: Player = {
      ...createTestPlayer(),
      hunger: 1300,
      equipment: {
        ...createTestEquipment(),
        leftRing: null,
        rightRing: null,
      },
    }

    // Act: Tick hunger
    const updated = service.tickHunger(player)

    // Assert: Verify depletion and immutability
    expect(updated.hunger).toBe(1299)
    expect(updated).not.toBe(player) // Different object
    expect(player.hunger).toBe(1300) // Original unchanged
  })

  test('applies 1.5x rate with one Protection ring', () => {
    // Arrange: Create player with Protection ring
    const protectionRing: Ring = {
      ...createTestRing(),
      type: RingType.PROTECTION,
    }
    const player: Player = {
      ...createTestPlayer(),
      hunger: 1300,
      equipment: {
        ...createTestEquipment(),
        leftRing: protectionRing,
        rightRing: null,
      },
    }

    // Act: Tick hunger
    const updated = service.tickHunger(player)

    // Assert: Verify 1.5x depletion
    expect(updated.hunger).toBe(1298.5) // 1300 - 1.5
  })

  test('returns new Player object (immutability)', () => {
    // Arrange
    const player = createTestPlayer()

    // Act
    const updated = service.tickHunger(player)

    // Assert immutability
    expect(updated).not.toBe(player)
    expect(updated).toEqual({ ...player, hunger: player.hunger - 1 })
  })
})
```

### 11.6 Test Example (MockRandom for Randomness)

```typescript
describe('EatCommand', () => {
  test('restores random nutrition between 1100-1499', () => {
    // Arrange: Set up MockRandom to return specific value
    const mockRandom = new MockRandom([1250])
    const command = new EatCommand(
      inventoryService,
      hungerService,
      messageService,
      mockRandom
    )

    const player = { ...createTestPlayer(), hunger: 500 }
    const food = createTestFood()
    const state = {
      ...createTestState(),
      player: {
        ...player,
        inventory: [food],
      },
    }

    // Act: Execute command
    const newState = command.execute(state)

    // Assert: Verify exact nutrition added
    expect(newState.player.hunger).toBe(500 + 1250)
  })

  test('adds "tastes awful" message 30% of time', () => {
    // Arrange: MockRandom to trigger awful message
    const mockRandom = new MockRandom([1250]) // nutrition
    mockRandom.setNextChance(true) // 30% chance succeeds

    const command = new EatCommand(
      inventoryService,
      hungerService,
      messageService,
      mockRandom
    )

    const state = createTestStateWithFood()

    // Act
    const newState = command.execute(state)

    // Assert: Check for awful message
    const messages = newState.messages.map(m => m.text)
    expect(messages).toContain('Yuck, that food tasted awful!')
  })
})
```

---

## 12. Reference Data

### 12.1 Hunger Mechanics (from game-design.md)

**Initial Values:**
- Starting hunger: 1300 units
- Max capacity: 2000 units

**Depletion Rates:**
- Base rate: 1 unit/turn
- Each equipped ring: +0.5 units/turn (except Slow Digestion: -0.5)

**Food Rations:**
- Restores: Random 1100-1499 units (average 1300)
- 30% chance of "Yuck, that food tasted awful!" message (flavor only, still works)

**Hunger States:**

| Food Units | State | Warning Message | Combat Effect |
|------------|-------|-----------------|---------------|
| 301+ | NORMAL | - | None |
| 150-300 | HUNGRY | "You are getting hungry" (yellow) | None |
| 1-149 | WEAK | "You are weak from hunger!" (red) | -1 to hit, -1 damage |
| 0 | STARVING | "You are fainting!" (flashing red) | -1 to hit, -1 damage, 1 HP/turn |

### 12.2 Combat Penalties (from game-design.md)

**Weak State Effects:**
- To-hit penalty: -1
- Damage penalty: -1

**Starving State Effects:**
- To-hit penalty: -1
- Damage penalty: -1
- Starvation damage: 1 HP per turn

### 12.3 XP Curve (from architecture.md)

**XP Required per Level:**

| Level | Total XP Needed | XP from Previous Level |
|-------|-----------------|------------------------|
| 1 | 0 | - (starting level) |
| 2 | 10 | 10 |
| 3 | 30 | 20 |
| 4 | 60 | 30 |
| 5 | 100 | 40 |
| 6 | 150 | 50 |
| 7 | 210 | 60 |
| 8 | 280 | 70 |
| 9 | 360 | 80 |
| 10 | 450 | 90 |

**Level-Up Benefits:**
- +1 level
- +1d8 max HP
- Full HP restore
- XP carry-over to next level

### 12.4 Monster XP Values (from monsters.json)

**Low-threat monsters (A-E):**
- Bat (B): 5 XP
- Emu (E): 10 XP
- Aquator (A): 20 XP

**Medium-threat monsters (F-P):**
- Hobgoblin (H): 15 XP
- Orc (O): 25 XP
- Leprechaun (L): 30 XP

**High-threat monsters (Q-U):**
- Troll (T): 50 XP
- Medusa (M): 80 XP
- Ur-vile (U): 120 XP

**Boss-tier monsters (V-Z):**
- Vampire (V): 100 XP
- Wraith (W): 90 XP
- Dragon (D): 150 XP
- Jabberwock (J): 200 XP

### 12.5 Ring Types Affecting Hunger

**Increase Hunger (1.5x multiplier):**
- Ring of Protection
- Ring of Regeneration
- Ring of Add Strength
- Ring of Dexterity
- Ring of Searching
- (Most rings increase hunger)

**Decrease Hunger (0.5x multiplier):**
- Ring of Slow Digestion (only ring that reduces hunger)

**Examples:**
- No rings: 1.0 units/turn
- 1 Protection ring: 1.5 units/turn
- 2 Protection rings: 2.0 units/turn
- 1 Slow Digestion: 0.5 units/turn
- 1 Protection + 1 Slow Digestion: 1.0 units/turn (cancel out)

---

## 13. Testing Checklist

### 13.1 Unit Tests

**HungerService (4 test files):**
- [ ] hunger-depletion.test.ts (7 tests)
  - [ ] Reduces hunger by base rate (1/turn)
  - [ ] Does not go below 0
  - [ ] Returns new Player object (immutability)
  - [ ] Applies 1.5x rate with one ring
  - [ ] Applies 2.0x rate with two rings
  - [ ] Applies 0.5x rate with Slow Digestion
  - [ ] Handles mixed rings correctly

- [ ] hunger-states.test.ts (7 tests)
  - [ ] Returns NORMAL for 301+
  - [ ] Returns HUNGRY for 150-300
  - [ ] Returns WEAK for 1-149
  - [ ] Returns STARVING for 0
  - [ ] Generates warnings on state changes
  - [ ] No warning when no state change
  - [ ] No warning when improving

- [ ] hunger-effects.test.ts (6 tests)
  - [ ] No penalty in NORMAL state
  - [ ] No penalty in HUNGRY state
  - [ ] -1 to hit in WEAK state
  - [ ] -1 damage in WEAK state
  - [ ] Penalties in STARVING state
  - [ ] Starvation damage reduces HP by 1

- [ ] ring-modifiers.test.ts (7 tests)
  - [ ] Each ring type tested for hunger rate
  - [ ] Multiple ring combinations
  - [ ] Rate never goes negative

**LevelingService (3 test files):**
- [ ] xp-calculation.test.ts (6 tests)
  - [ ] Adds XP correctly
  - [ ] Returns leveledUp flag correctly
  - [ ] Calculates monster XP rewards
  - [ ] Returns correct XP thresholds
  - [ ] Immutability verification

- [ ] level-up.test.ts (6 tests)
  - [ ] Increases level by 1
  - [ ] Increases max HP by 1d8
  - [ ] Fully restores HP
  - [ ] Carries over XP
  - [ ] Doesn't exceed level 10
  - [ ] Immutability verification

- [ ] xp-curve.test.ts (11 tests)
  - [ ] Each level threshold correct (levels 1-10)
  - [ ] Curve increases progressively

**EatCommand (1 test file):**
- [ ] eat-command.test.ts (10 tests)
  - [ ] Removes food from inventory
  - [ ] Restores random hunger
  - [ ] Caps at 2000 max
  - [ ] Adds eat message
  - [ ] Adds awful message 30% (MockRandom)
  - [ ] "No food" message when empty
  - [ ] Increments turn count
  - [ ] Immutability verification
  - [ ] State improvements (WEAK→NORMAL)
  - [ ] State improvements (HUNGRY→NORMAL)

**CombatService Integration:**
- [ ] hunger-penalties.test.ts (6 tests)
  - [ ] Penalty application in each state
  - [ ] Damage never goes negative

### 13.2 Integration Tests

**MoveCommand:**
- [ ] Hunger ticks after movement
- [ ] Hunger warnings appear
- [ ] Starvation damage applies
- [ ] Existing tests still pass

**AttackCommand:**
- [ ] XP awarded on kill
- [ ] Level-up triggers correctly
- [ ] Level-up messages appear
- [ ] Existing tests still pass

**Full Game Flow:**
- [ ] Move → hunger depletes
- [ ] Eat → hunger restores
- [ ] Kill monster → gain XP
- [ ] Level up → stats increase
- [ ] Combat with hunger penalties works

### 13.3 Coverage Goals

- [ ] HungerService: >80% (aim for 100%)
- [ ] LevelingService: >80% (aim for 100%)
- [ ] EatCommand: >80%
- [ ] CombatService (hunger integration): >80%
- [ ] Overall project: >80%

**Check coverage:**
```bash
npm run test:coverage
```

### 13.4 Manual Testing

- [ ] Start game, verify hunger = 1300
- [ ] Move around, verify hunger decreases
- [ ] Eat food, verify hunger increases
- [ ] Equip rings, verify hunger rate changes
- [ ] Get to Weak state, verify combat penalties
- [ ] Get to Starving state, verify HP damage
- [ ] Kill monsters, verify XP gains
- [ ] Level up, verify stat increases
- [ ] Check UI displays hunger/XP correctly

---

## 14. Success Criteria

**Phase 6 Complete When:**

✅ All services implemented:
- [x] HungerService (4 test files, >80% coverage)
- [x] LevelingService (3 test files, >80% coverage)

✅ All commands implemented:
- [x] EatCommand (1 test file, >80% coverage)

✅ All integrations complete:
- [x] MoveCommand hunger tick
- [x] CombatService hunger penalties
- [x] AttackCommand XP awards

✅ UI updated:
- [x] Hunger bar/state display
- [x] XP progress bar display
- [x] 'e' key wired to EatCommand

✅ Testing complete:
- [x] All 9 test files passing
- [x] >80% coverage on all new code
- [x] Full integration tests passing

✅ Manual verification:
- [x] Hunger depletes during play
- [x] Food restores hunger
- [x] Combat penalties apply when weak
- [x] XP awards on kills
- [x] Level-ups increase stats
- [x] UI displays correctly

✅ Documentation updated:
- [x] plan.md Phase 6 tasks marked complete
- [x] Git commit with descriptive message

---

## 15. Notes & Tips

### 15.1 Common Pitfalls

**❌ Don't put logic in commands:**
```typescript
// Bad
execute(state: GameState): GameState {
  const newHunger = player.hunger - 1 // Logic!
}
```

**✅ Put logic in services:**
```typescript
// Good
execute(state: GameState): GameState {
  const updated = this.hungerService.tickHunger(player)
}
```

**❌ Don't mutate state:**
```typescript
// Bad
tickHunger(player: Player): Player {
  player.hunger -= 1 // Mutation!
  return player
}
```

**✅ Return new objects:**
```typescript
// Good
tickHunger(player: Player): Player {
  return { ...player, hunger: player.hunger - 1 }
}
```

### 15.2 Debugging Tips

**If hunger doesn't deplete:**
- Check MoveCommand calls tickHunger()
- Verify HungerService dependency injected
- Check calculateHungerRate() returns > 0

**If combat penalties don't apply:**
- Check CombatService has HungerService dependency
- Verify applyHungerEffects() is called
- Check hunger state is WEAK or STARVING

**If XP doesn't award:**
- Check AttackCommand calls addExperience()
- Verify LevelingService dependency injected
- Check calculateXPReward() returns correct value

**If tests fail:**
- Verify MockRandom usage
- Check immutability (use `.not.toBe()`)
- Ensure AAA pattern followed
- Check test data setup (createTestPlayer, etc.)

### 15.3 Helpful Commands

```bash
# Run specific service tests
npm test HungerService
npm test LevelingService
npm test EatCommand

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Type checking
npm run type-check

# Full build
npm run build
```

---

**End of Phase 6 Implementation Plan**

**Related Documents:**
- [Development Plan (plan.md)](./plan.md)
- [Game Design (game-design.md)](./game-design.md)
- [Architecture (architecture.md)](./architecture.md)
- [Testing Strategy (testing-strategy.md)](./testing-strategy.md)
- [Core Systems (systems-core.md)](./systems-core.md)

**Questions?** Refer to existing service implementations (LightingService, CombatService) for patterns.
