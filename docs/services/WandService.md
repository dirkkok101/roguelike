# WandService

**Location**: `src/services/WandService/WandService.ts`
**Dependencies**: IdentificationService
**Test Coverage**: Charge management, identification

---

## Purpose

Handles **wand usage and charge management**. Currently implements charge depletion and identification; full wand effects pending targeting system implementation (Phase 5).

---

## Public API

### Wand Application

#### `applyWand(player: Player, wand: Wand, state: GameState, targetMonsterId?: string): WandEffectResult`
Applies wand effect with optional monster targeting.

**Returns**:
```typescript
interface WandEffectResult {
  player: Player      // Updated player
  wand: Wand          // Updated wand (decremented charges)
  message: string     // Effect description
  identified: boolean // Was wand unidentified before use?
}
```

**Process**:
1. Check if wand has charges
2. Decrement charges
3. Auto-identify wand by use
4. Apply effect (TODO - requires targeting system)
5. Return result

**Example**:
```typescript
const result = service.applyWand(player, wand, state, monsterId)
// result.wand.currentCharges: 5 → 4
// result.message: "You zap oak wand. (Effect not yet implemented)"
// result.identified: true
```

---

## Charge Management

### Charge Depletion

```typescript
if (wand.currentCharges === 0) {
  return {
    player,
    wand,
    message: 'The wand has no charges.',
    identified: false,
  }
}

// Decrement charges
const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }
```

**Charges**:
- Each wand spawns with random charges (typically 3-7)
- Each use consumes 1 charge
- Wand becomes useless at 0 charges (cannot recharge)

---

### Wand Structure

```typescript
interface Wand {
  id: string
  name: string            // "Wand of Striking"
  type: ItemType.WAND
  identified: boolean
  wandType: WandType      // STRIKING, SLOW_MONSTER, etc.
  currentCharges: number  // Remaining charges
  maxCharges: number      // Initial charges (for display)
  materialName?: string   // "oak wand" (unidentified descriptor)
}
```

---

## Identification System

### Auto-Identify on Use

```typescript
const identified = !this.identificationService.isIdentified(wand.wandType, state)
const displayName = this.identificationService.getDisplayName(wand, state)

// Use wand...

return { player, wand: updatedWand, message, identified }
```

**Unidentified Wand**:
- Before use: `"oak wand"` (random wood descriptor)
- After use: `"Wand of Striking"` (real name)

**Already Identified**:
- `identified = false` (was already known)

See [IdentificationService](./IdentificationService.md) for details.

---

## Wand Types (Planned)

**Not Yet Implemented** - Requires targeting system and monster damage handling.

| Wand Type | Effect | Charges | Rarity |
|-----------|--------|---------|--------|
| **STRIKING** | 2d8 damage to monster | 5-7 | Common |
| **SLOW_MONSTER** | Halve monster speed | 4-6 | Common |
| **HASTE_MONSTER** | Double monster speed (curse) | 4-6 | Uncommon |
| **DRAIN_LIFE** | 1d10 damage, heal player | 3-5 | Uncommon |
| **POLYMORPH** | Transform monster | 3-5 | Rare |
| **TELEPORT_MONSTER** | Teleport monster away | 4-6 | Uncommon |
| **MAGIC_MISSILE** | 1d4 damage (always hits) | 6-8 | Common |
| **FIRE** | 3d6 fire damage in line | 3-5 | Rare |
| **COLD** | 2d6 cold damage + slow | 3-5 | Rare |
| **LIGHTNING** | 4d6 lightning in line | 2-4 | Rare |

**Implementation Status**: Placeholder only (all wands return "Effect not yet implemented")

---

## Result Type

```typescript
interface WandEffectResult {
  player: Player      // Updated player (future: reflect damage, etc.)
  wand: Wand          // Updated wand (decremented charges)
  message: string     // User-friendly message
  identified: boolean // Was wand unidentified before use?
}
```

**Why Return Wand?** Charges are decremented, must update item in inventory.

---

## Usage in Commands (Future)

### ZapCommand (Planned)

```typescript
execute(state: GameState): GameState {
  const wand = findWandInInventory(player, itemId)

  // Prompt for target monster
  const targetMonsterId = promptForTarget('Which monster?')

  // Apply wand effect
  const result = this.wandService.applyWand(player, wand, state, targetMonsterId)

  // Update wand in inventory
  const updatedPlayer = this.inventoryService.updateItem(result.player, result.wand)

  // Update identification
  let updatedState = state
  if (result.identified) {
    updatedState = this.identificationService.identifyByUse(wand, state)
  }

  return {
    ...updatedState,
    player: updatedPlayer,
    messages: this.messageService.addMessage(updatedState.messages, result.message, 'combat'),
  }
}
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
applyWand(player: Player, wand: Wand, state: GameState, targetMonsterId?: string) {
  const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }

  return {
    player,  // Unchanged (future: may apply effects to player)
    wand: updatedWand,  // New wand object
    message,
    identified,
  }
}
```

---

## Testing

**Test Files** (Current):
- `charge-management.test.ts` - Charge depletion
- `identification.test.ts` - Auto-identify on use
- `no-charges.test.ts` - Empty wand handling

**Test Files** (Future):
- `targeting.test.ts` - Monster targeting
- `damage-wands.test.ts` - STRIKING, FIRE, COLD effects
- `status-wands.test.ts` - SLOW, HASTE, POLYMORPH effects

**Example Test**:
```typescript
describe('WandService - Charge Management', () => {
  test('decrements charges on use', () => {
    const wand = createWand(WandType.STRIKING, 5)
    const result = service.applyWand(player, wand, state)

    expect(result.wand.currentCharges).toBe(4)
  })

  test('prevents use when no charges', () => {
    const wand = createWand(WandType.STRIKING, 0)
    const result = service.applyWand(player, wand, state)

    expect(result.wand.currentCharges).toBe(0)  // Unchanged
    expect(result.message).toBe('The wand has no charges.')
    expect(result.identified).toBe(false)  // No identification on failed use
  })
})
```

---

## Related Services

- **IdentificationService** - Wand name display and auto-identification
- **InventoryService** - Update wand charges in inventory (future)
- **CombatService** - Apply wand damage to monsters (future)
- **MonsterAIService** - Apply status effects (slow, haste, etc.) (future)

---

## Design Rationale

### Why Non-Rechargeable?

**Resource Management** - Players must conserve wand charges.

**Scarcity** - Wands become valuable, limited-use items.

**Original Rogue** - Wands could not be recharged (except with rare scroll).

---

### Why Auto-Identify on Use?

**Learning Mechanic** - Player learns wand types through experimentation.

**Risk/Reward** - Zapping unknown wand at monster reveals type.

**Original Rogue** - Wands identified by use.

---

### Why Targeting System Needed?

**Ranged Combat** - Wands affect monsters at distance.

**Line of Sight** - Some wands shoot rays (FIRE, LIGHTNING).

**Target Selection** - Player must choose which monster to zap.

**Complexity** - Requires FOV checks, ray casting, monster selection UI.

---

## Implementation Roadmap (Phase 5)

### 1. Targeting System

**UI Component**:
```typescript
interface TargetSelector {
  selectMonster(visibleMonsters: Monster[]): Monster | null
  selectDirection(): Direction | null
  selectPosition(maxRange: number): Position | null
}
```

**Use Cases**:
- **Monster targeting**: STRIKING, SLOW_MONSTER, POLYMORPH
- **Direction targeting**: FIRE, COLD, LIGHTNING (rays)
- **Position targeting**: TELEPORT_MONSTER (destination)

---

### 2. Wand Effects

**Damage Wands**:
```typescript
applyStriking(monster: Monster, wand: Wand): { monster: Monster; damage: number } {
  const damage = this.random.roll('2d8')
  return {
    monster: { ...monster, hp: monster.hp - damage },
    damage,
  }
}
```

**Status Wands**:
```typescript
applySlowMonster(monster: Monster): Monster {
  return {
    ...monster,
    statusEffects: [...monster.statusEffects, { type: 'slow', duration: 10 }],
  }
}
```

**Ray Wands** (FIRE, COLD, LIGHTNING):
```typescript
castRay(origin: Position, direction: Direction, range: number, level: Level): Position[] {
  // Bresenham line algorithm
  // Check for walls, monsters
  // Return affected positions
}
```

---

### 3. Wand Spawning

**Already Implemented** in DungeonService (just need to uncomment):
```typescript
// In DungeonService.spawnItems()
case 'wand': {
  const wandTypes = [
    { type: WandType.STRIKING, rarity: 'common' },
    { type: WandType.SLOW_MONSTER, rarity: 'common' },
    { type: WandType.FIRE, rarity: 'rare' },
    // ...
  ]
  const template = this.random.pickRandom(wandTypes.filter(t => t.rarity === rarityRoll))
  const charges = this.random.nextInt(3, 7)

  item = {
    id: itemId,
    name: `Wand of ${template.type}`,
    type: ItemType.WAND,
    identified: false,
    position: { x, y },
    wandType: template.type,
    currentCharges: charges,
    maxCharges: charges,
  } as Wand
  break
}
```

---

## Current Status

**✅ Implemented**:
- Charge management
- Auto-identification on use
- Empty wand handling

**⏳ Pending (Phase 5)**:
- Targeting system
- Wand effect implementations
- Ray casting (FIRE, COLD, LIGHTNING)
- Monster status effects (SLOW, HASTE, POLYMORPH)

**Blocking Dependencies**:
- Targeting UI component
- Status effect system (Phase 3)
- Ray casting algorithm

---

## Future Enhancements

- **Wand Recharging**: Rare scroll that restores wand charges
- **Wand Exploding**: Overcharged wands explode for area damage
- **Wand Breaking**: Cursed wands break on use
- **Wand Reflection**: Monsters with shields can reflect wand rays
