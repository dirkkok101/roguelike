# MonsterTurnService

**Location**: `src/services/MonsterTurnService/MonsterTurnService.ts`
**Dependencies**: MonsterAIService, CombatService, SpecialAbilityService, MessageService, RandomService
**Test Coverage**: Turn processing, combat, theft, regeneration

---

## Purpose

**Orchestrates all monster turns** on current level. Processes wake-up checks, FOV computation, memory tracking, state transitions, regeneration, action execution, and combat resolution.

---

## Public API

### Turn Processing

#### `processMonsterTurns(state: GameState): GameState`
Processes turns for all monsters on current level.

**Processing Order** (per monster):
1. Skip dead monsters (`hp <= 0`)
2. Check wake-up (`checkWakeUp`)
3. Compute monster FOV (`computeMonsterFOV`)
4. Update player memory (`updateMonsterMemory`)
5. Update state transitions (`updateMonsterState`)
6. Apply regeneration (if monster has ability)
7. **Save updated monster** to level (preserves state changes)
8. Decide action (`decideAction`)
9. Execute action (move, attack, wait)
10. Stop if player died

**Returns**: Updated game state with all monster turns processed

**Example**:
```typescript
const updated = service.processMonsterTurns(state)
// All monsters have taken their turn
// updated.player.hp may have changed (combat)
// updated.levels has updated monster positions
```

---

## Action Execution

### Move Action

#### `private handleMove(monster: Monster, target: Position, state: GameState): GameState`
Handles monster movement.

**Validation**:
1. Check if target walkable
2. Check if target occupied by another monster

**Movement**:
- Updates `monster.position`
- Updates monster in level's monsters array

**Special**: GREEDY monsters pick up gold when moving onto tile

**Example**:
```typescript
// Orc moves onto gold pile
const result = handleMove(orc, { x: 10, y: 5 }, state)
// orc.position: { x: 10, y: 5 }
// level.gold: gold pile removed
```

---

### Attack Action

#### `private handleAttack(monster: Monster, state: GameState): GameState`
Handles monster attacking player.

**Attack Process**:
1. Check for THIEF behavior (steal instead of attack)
2. Parse multiple attacks (`damage` string)
3. For each attack:
   - Check breath weapon (Dragon)
   - Roll attack (CombatService)
   - Apply damage
   - Add combat message
   - Check player death
   - Apply on-hit abilities (SpecialAbilityService)
4. Set game over if player died

**Returns**: State with:
- Updated `player.hp`
- Combat messages
- `isGameOver = true` if player died
- `deathCause` set

---

### Wait Action

Monster does nothing this turn (stationary monsters, blocked monsters).

---

## Special Handling

### Theft System

#### `private handleTheft(monster: Monster, state: GameState): GameState`
Handles theft by THIEF monsters (Leprechaun, Nymph).

**Leprechaun** (steals gold):
```typescript
const stolenGold = Math.min(player.gold, this.random.nextInt(10, 50))
player.gold -= stolenGold
// Message: "The Leprechaun steals {amount} gold and flees!"
```

**Nymph** (steals random item):
```typescript
const randomIndex = this.random.nextInt(0, player.inventory.length - 1)
const stolenItem = player.inventory[randomIndex]
player.inventory = player.inventory.filter((_, i) => i !== randomIndex)
// Message: "The Nymph steals your {item} and disappears!"
```

**Post-Theft**:
- Sets `monster.hasStolen = true`
- Changes state to `MonsterState.FLEEING`
- Monster will flee on subsequent turns

---

### Gold Pickup (GREEDY)

**When**: GREEDY monster moves onto gold tile

**Process**:
1. Check for gold at new position
2. Remove gold from `level.gold` array
3. No message (silent pickup)

**Used By**: Orc

---

### Regeneration

**When**: Monster has `'regenerates'` special ability

**Process**:
```typescript
if (this.abilityService.hasSpecial(monster, 'regenerates')) {
  const regenResult = this.abilityService.regenerate(monster)
  if (regenResult.monster) {
    monster = regenResult.monster  // +1 HP (capped at maxHp)
  }
}
```

**Used By**: Griffin, Troll, Vampire

**Rate**: +1 HP per turn (if below max)

---

## Combat Resolution

### Multiple Attacks

**Monsters can have multiple attacks** in damage string:

```typescript
const attacks = this.abilityService.parseMultipleAttacks(monster.damage)
// "1d2/1d5/1d5" → ["1d2", "1d5", "1d5"]

for (const attackDamage of attacks) {
  // Roll each attack separately
}
```

**Example**: Troll has `"1d8/1d8/2d6"` (claw/claw/bite)

---

### Breath Weapon (Dragon)

**Check**: Before first attack, 40% chance Dragon uses breath weapon

```typescript
if (this.abilityService.shouldUseBreathWeapon(monster) && attacks.length === 1) {
  const breathDamage = this.abilityService.rollBreathWeaponDamage(monster)  // 6d6
  messages.push(`The ${monster.name} breathes fire at you for ${breathDamage} damage!`)

  player.hp -= breathDamage

  if (player.hp <= 0) {
    killedBy = `Killed by ${monster.name}'s breath weapon`
    break
  }
  continue  // Skip melee attack this turn
}
```

**Properties**:
- Replaces melee attack (not in addition)
- 6d6 fire damage (18 average, 6-36 range)
- 40% chance per turn
- Can kill player in one hit

---

### On-Hit Abilities

**After successful hit**, apply special abilities:

```typescript
const abilityResult = this.abilityService.applyOnHitAbilities(player, monster)
if (abilityResult.player) {
  player = abilityResult.player
}
for (const msg of abilityResult.messages) {
  messages.push(msg)
}
```

**Abilities Applied**:
- **Aquator**: Rust armor (50% chance)
- **Ice Monster**: Freeze player (40% chance)
- **Medusa**: Confuse player (30% chance)
- **Rattlesnake**: Drain strength (50% chance)
- **Wraith**: Drain XP (40% chance)
- **Vampire**: Drain max HP (30% chance)
- **Venus Flytrap**: Hold player (60% chance)

See [SpecialAbilityService](./SpecialAbilityService.md) for details.

---

## State Persistence

**Critical**: Monster updates are saved to level **before** action execution:

```typescript
// Update monster (wake up, FOV, memory, state transitions)
let updatedMonster = this.aiService.checkWakeUp(monster, state)
updatedMonster = this.aiService.computeMonsterFOV(updatedMonster, state)
updatedMonster = this.aiService.updateMonsterMemory(updatedMonster, state)
updatedMonster = this.aiService.updateMonsterState(updatedMonster, state)

// SAVE UPDATED MONSTER TO LEVEL BEFORE ACTION
currentState = this.updateMonsterInLevel(updatedMonster, currentState)

// Now decide and execute action
const action = this.aiService.decideAction(updatedMonster, currentState)
const result = this.executeMonsterAction(updatedMonster, action, currentState)
```

**Why?** Ensures state changes (wake-up, FOV, memory) persist even if action is `wait`.

---

## Helper Methods

### Update Monster in Level

```typescript
private updateMonsterInLevel(monster: Monster, state: GameState): GameState {
  const level = state.levels.get(state.currentLevel)
  if (!level) return state

  const updatedMonsters = level.monsters.map((m) =>
    m.id === monster.id ? monster : m
  )

  const updatedLevel = { ...level, monsters: updatedMonsters }
  const updatedLevels = new Map(state.levels)
  updatedLevels.set(state.currentLevel, updatedLevel)

  return { ...state, levels: updatedLevels }
}
```

**Immutability**: Returns new state, never mutates.

---

## Player Death

**When**: `player.hp <= 0`

**Process**:
1. Set `isGameOver = true`
2. Set `deathCause` (e.g., "Killed by Dragon")
3. Stop processing remaining monsters
4. Return state

**Death Causes**:
- `"Killed by {monster name}"` - Melee attack
- `"Killed by {monster name}'s breath weapon"` - Dragon fire
- Poison, starvation handled elsewhere

---

## Turn Processing Flow

```
For each monster on level:
  │
  ├─ Skip if dead (hp <= 0)
  │
  ├─ checkWakeUp (SLEEPING → HUNTING if player in range)
  │
  ├─ computeMonsterFOV (calculate visibleCells)
  │
  ├─ updateMonsterMemory (track lastKnownPlayerPosition)
  │
  ├─ updateMonsterState (FSM transitions)
  │
  ├─ regenerate (if has ability)
  │
  ├─ SAVE monster to level ← Important!
  │
  ├─ decideAction (AI decision)
  │
  ├─ executeMonsterAction
  │   ├─ move: Update position, pickup gold
  │   ├─ attack: Combat, abilities, death check
  │   └─ wait: Do nothing
  │
  └─ Stop if player died
```

---

## Orchestration Pattern

**MonsterTurnService orchestrates, never implements logic**:

✅ **Orchestration** (what it does):
```typescript
const action = this.aiService.decideAction(monster, state)  // Delegates
const result = this.combatService.monsterAttack(monster, player)  // Delegates
const abilityResult = this.abilityService.applyOnHitAbilities(player, monster)  // Delegates
```

❌ **Logic** (what it doesn't do):
- No pathfinding calculations
- No combat formulas
- No ability implementations
- No AI decision making

**All logic** lives in services (AIService, CombatService, AbilityService).

---

## Testing

**Test Files**:
- `turn-processing.test.ts` - Full turn cycle
- `combat-resolution.test.ts` - Attack handling
- `theft-system.test.ts` - Leprechaun/Nymph stealing
- `regeneration.test.ts` - HP regeneration
- `death-handling.test.ts` - Player death conditions

**Example Test**:
```typescript
describe('MonsterTurnService - Combat', () => {
  test('monster attacks player and reduces HP', () => {
    const monster = createMonster('Orc', { x: 5, y: 5 })
    const state = {
      ...baseState,
      player: { ...basePlayer, position: { x: 5, y: 6 } },  // Adjacent
    }

    mockCombat.monsterAttack.mockReturnValue({ hit: true, damage: 5 })

    const result = service.processMonsterTurns(state)

    expect(result.player.hp).toBe(basePlayer.hp - 5)
    expect(result.messages).toContainEqual(
      expect.objectContaining({ text: 'The Orc hits you for 5 damage.' })
    )
  })

  test('stops processing if player dies', () => {
    const state = {
      ...baseState,
      player: { ...basePlayer, hp: 1 },  // Low HP
    }

    mockCombat.monsterAttack.mockReturnValue({ hit: true, damage: 10 })

    const result = service.processMonsterTurns(state)

    expect(result.isGameOver).toBe(true)
    expect(result.deathCause).toBe('Killed by Orc')
  })
})
```

---

## Related Services

- **MonsterAIService** - Decides monster actions (move/attack/wait)
- **CombatService** - Resolves combat rolls and damage
- **SpecialAbilityService** - Handles breath weapons, theft, on-hit abilities
- **MessageService** - Adds combat messages to log
- **RandomService** - Rolls for theft amounts, regeneration

---

## Performance Optimization

**Early Exit**: Stops processing if player dies

```typescript
if (currentState.player.hp <= 0) {
  break  // Don't process remaining monsters
}
```

**Sleeping Monsters**: FOV computation skipped for sleeping monsters

```typescript
if (monster.isAsleep || monster.state === 'SLEEPING') {
  return monster  // Skip expensive FOV calculation
}
```

---

## Design Rationale

### Why Process All Monsters?

**Original Rogue behavior** - monsters act simultaneously (from player perspective).

**Implementation**: Sequential processing in service, but player sees all results at once.

### Why Stop on Player Death?

**Optimization** - No need to process remaining monsters if player already dead.

**Behavior**: Player sees death message immediately, not after all monsters act.

### Why Save Monster Before Action?

**Bug Prevention** - Ensures wake-up, FOV, and state changes persist even if monster waits.

**Example**: Monster wakes up but can't path to player → state changes still saved.
