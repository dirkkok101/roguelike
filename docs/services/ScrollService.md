# ScrollService

**Location**: `src/services/ScrollService/ScrollService.ts`
**Dependencies**: IdentificationService, InventoryService
**Test Coverage**: All 3 scroll types, item targeting, enchantment limits

---

## Purpose

Implements **scroll effects** with item targeting: identify items, enchant weapons (+1 damage), enchant armor (+1 AC). Handles auto-identification and target validation.

---

## Public API

### Scroll Application

#### `applyScroll(player: Player, scroll: Scroll, state: GameState, targetItemId?: string): ScrollEffectResult`
Applies scroll effect with optional item targeting.

**Returns**:
```typescript
interface ScrollEffectResult {
  player: Player      // Updated player (with enchanted items)
  message: string     // Effect description
  identified: boolean // Was scroll unidentified before use?
}
```

**Process**:
1. Check if scroll is already identified
2. Validate target item (if required)
3. Apply effect based on scroll type
4. Auto-identify scroll by use
5. Return result with message

**Example**:
```typescript
const result = service.applyScroll(player, enchantScroll, state, weaponId)
// result.player.equipment.weapon.bonus: 0 → 1
// result.message: "You read scroll labeled XYZZY. Long Sword glows brightly! (+1)"
// result.identified: true
```

---

## Scroll Types

### IDENTIFY - Reveal Item Type

```typescript
private applyIdentify(player: Player, targetItemId: string | undefined, state: GameState, scrollName: string): { player: Player; message: string }
```

**Requires**: Target item ID

**Effect**: Identifies the **type** of target item (not just the instance)

**Example**:
```typescript
// Before: Player has "blue potion" (unidentified)
// After reading IDENTIFY on it:
//   - All "blue potions" become "Potion of Healing"
//   - state.identifiedItems: Set('HEAL')
```

**Messages**:
- Success: `"You read scroll labeled XYZZY. This is Potion of Healing!"`
- No target: `"You read scroll labeled XYZZY, but nothing happens."`
- Invalid target: `"You read scroll labeled XYZZY, but the item is gone."`

---

### ENCHANT_WEAPON - Increase Weapon Bonus

```typescript
private applyEnchantWeapon(player: Player, targetItemId: string | undefined, scrollName: string): { player: Player; message: string }
```

**Requires**: Target weapon ID

**Effect**: Increases weapon bonus by +1 (max +3)

**Bonus Mechanics**:
```typescript
damage = roll(weapon.damage) + weapon.bonus
// Long Sword: 1d12 + 0 → 1d12 + 1
```

**Enchantment Process**:
1. Find weapon in inventory
2. Check if bonus < 3
3. Create enchanted weapon: `{ ...weapon, bonus: bonus + 1 }`
4. Remove old weapon, add enchanted weapon
5. Update equipment if weapon was equipped

**Messages**:
- Success: `"You read scroll labeled ELBERETH. Long Sword glows brightly! (+1)"`
- No target: `"You read scroll labeled ELBERETH, but nothing happens."`
- Not weapon: `"You read scroll labeled ELBERETH, but the item is not a weapon."`
- Max enchant: `"You read scroll labeled ELBERETH. Long Sword is already at maximum enchantment!"`

**Max Enchantment**: +3 (balance cap)

---

### ENCHANT_ARMOR - Increase Armor Bonus

```typescript
private applyEnchantArmor(player: Player, targetItemId: string | undefined, scrollName: string): { player: Player; message: string }
```

**Requires**: Target armor ID

**Effect**: Increases armor bonus by +1 (max +3)

**Armor Class Formula**:
```typescript
effectiveAC = armor.ac - armor.bonus
// Chain Mail: AC 5 - 0 = 5
// Chain Mail +1: AC 5 - 1 = 4 (better protection, lower AC)
```

**Note**: In D&D-style systems, **lower AC = better**. Bonus reduces effective AC.

**Enchantment Process**:
1. Find armor in inventory
2. Check if bonus < 3
3. Create enchanted armor: `{ ...armor, bonus: bonus + 1 }`
4. Remove old armor, add enchanted armor
5. Update equipment if armor was equipped

**Messages**:
- Success: `"You read scroll labeled NR 9. Chain Mail glows with protection! [AC 4]"`
- No target: `"You read scroll labeled NR 9, but nothing happens."`
- Not armor: `"You read scroll labeled NR 9, but the item is not armor."`
- Max enchant: `"You read scroll labeled NR 9. Plate Mail is already at maximum enchantment!"`

**Max Enchantment**: +3 (balance cap)

---

## Item Targeting

### Why targetItemId?

**Some scrolls require target**: IDENTIFY, ENCHANT_WEAPON, ENCHANT_ARMOR

**User Flow**:
1. Player presses `r` (read scroll)
2. UI prompts: `"Read which scroll? [a-z]"`
3. Player selects scroll
4. If scroll needs target:
   - UI prompts: `"Identify which item? [a-z]"` or `"Enchant which weapon?"`
5. Command executes with `targetItemId`

**No Target Handling**: Scroll fizzles (`"but nothing happens"`)

---

## Equipment Updates

### Enchanting Equipped Items

**Challenge**: Item is in both inventory and equipment

**Solution**: Update both locations

```typescript
// Enchant weapon
let updatedPlayer = this.inventoryService.removeItem(player, weapon.id)
updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedWeapon)

// If weapon was equipped, update equipment too
if (updatedPlayer.equipment.weapon?.id === weapon.id) {
  updatedPlayer = {
    ...updatedPlayer,
    equipment: { ...updatedPlayer.equipment, weapon: enchantedWeapon },
  }
}
```

**Why Needed?** Equipment holds references to items, must stay in sync with inventory.

---

## Identification System

### Auto-Identify on Use

**Process**:
```typescript
const identified = !this.identificationService.isIdentified(scroll, state)
const displayName = this.identificationService.getDisplayName(scroll, state)

// Apply effect...

return { player: updatedPlayer, message, identified }
```

**Unidentified Scroll**:
- Before use: `"scroll labeled XYZZY"` (random label)
- After use: `"Scroll of Identify"` (real name)

**Already Identified**:
- `identified = false` (was already known)

See [IdentificationService](./IdentificationService.md) for details.

---

## Result Type

```typescript
interface ScrollEffectResult {
  player: Player      // Updated player (enchanted items, etc.)
  message: string     // User-friendly message
  identified: boolean // Was scroll unidentified before use?
}
```

**No Death**: Scrolls cannot kill player (unlike potions)

---

## Usage in Commands

### ReadCommand

```typescript
execute(state: GameState): GameState {
  const scroll = findScrollInInventory(player, itemId)

  // Prompt for target if needed
  let targetItemId: string | undefined
  if (needsTarget(scroll.scrollType)) {
    targetItemId = promptForTarget(scroll.scrollType)
  }

  // Apply scroll effect
  const result = this.scrollService.applyScroll(player, scroll, state, targetItemId)

  // Update identification
  let updatedState = state
  if (result.identified) {
    updatedState = this.identificationService.identifyByUse(scroll, state)
  }

  // Remove scroll from inventory
  const updatedPlayer = this.inventoryService.removeItem(result.player, scroll.id)

  return {
    ...updatedState,
    player: updatedPlayer,
    messages: this.messageService.addMessage(updatedState.messages, result.message, 'success'),
  }
}
```

---

## Immutability

All methods return **new objects**, never mutate inputs:

```typescript
private applyEnchantWeapon(player: Player, targetItemId: string, scrollName: string) {
  const enchantedWeapon: Weapon = { ...weapon, bonus: weapon.bonus + 1 }

  // Create new player with updated inventory and equipment
  let updatedPlayer = this.inventoryService.removeItem(player, weapon.id)
  updatedPlayer = this.inventoryService.addItem(updatedPlayer, enchantedWeapon)

  return { player: updatedPlayer, message }
}
```

---

## Testing

**Test Files**:
- `identify-scroll.test.ts` - Item identification
- `enchant-weapon.test.ts` - Weapon enchantment, max cap
- `enchant-armor.test.ts` - Armor enchantment, AC calculation
- `targeting.test.ts` - Target validation

**Example Test**:
```typescript
describe('ScrollService - Enchant Weapon', () => {
  test('increases weapon bonus by 1', () => {
    const weapon = createWeapon('Long Sword', '1d12', 0)
    const player = { ...basePlayer, inventory: [weapon] }
    const scroll = createScroll(ScrollType.ENCHANT_WEAPON)

    const result = service.applyScroll(player, scroll, state, weapon.id)

    const enchantedWeapon = result.player.inventory.find((i) => i.type === ItemType.WEAPON) as Weapon
    expect(enchantedWeapon.bonus).toBe(1)
    expect(result.message).toContain('glows brightly')
  })

  test('caps enchantment at +3', () => {
    const weapon = createWeapon('Long Sword +3', '1d12', 3)
    const player = { ...basePlayer, inventory: [weapon] }
    const scroll = createScroll(ScrollType.ENCHANT_WEAPON)

    const result = service.applyScroll(player, scroll, state, weapon.id)

    const unchangedWeapon = result.player.inventory.find((i) => i.type === ItemType.WEAPON) as Weapon
    expect(unchangedWeapon.bonus).toBe(3)
    expect(result.message).toContain('already at maximum enchantment')
  })

  test('updates equipped weapon if enchanted', () => {
    const weapon = createWeapon('Long Sword', '1d12', 0)
    const player = {
      ...basePlayer,
      inventory: [weapon],
      equipment: { ...baseEquipment, weapon },
    }
    const scroll = createScroll(ScrollType.ENCHANT_WEAPON)

    const result = service.applyScroll(player, scroll, state, weapon.id)

    expect(result.player.equipment.weapon.bonus).toBe(1)
  })
})
```

---

## Related Services

- **IdentificationService** - Item name display and auto-identification
- **InventoryService** - Find items, remove/add enchanted items
- **MessageService** - Display scroll effect messages

---

## Design Rationale

### Why Identify by Type (Not Instance)?

**Original Rogue behavior** - Identifying one "blue potion" identifies all "blue potions".

**Learning Mechanic** - Player learns potion colors across entire game.

**Simplicity** - Don't need to track individual item identification.

---

### Why +3 Enchantment Cap?

**Balance** - Prevents overpowered weapons/armor late game.

**Diminishing Returns** - Scrolls become less valuable after +3.

**Original Rogue** - Had enchantment caps for balance.

---

### Why Lower AC = Better?

**D&D Tradition** - Original D&D used descending AC (lower = harder to hit).

**Rogue Mechanics** - Inherited from D&D combat system.

**Bonus Reduces AC**: Enchantment makes armor better by lowering effective AC.

---

## Scroll Summary Table

| Scroll Type | Requires Target? | Effect | Max Limit |
|-------------|------------------|--------|-----------|
| **IDENTIFY** | Yes (any item) | Reveal item type | N/A |
| **ENCHANT_WEAPON** | Yes (weapon) | +1 damage bonus | +3 |
| **ENCHANT_ARMOR** | Yes (armor) | +1 AC bonus (-1 effective AC) | +3 |

---

## Future Enhancements (Not Yet Implemented)

**Additional Scroll Types**:
- **MAGIC_MAPPING** - Reveal entire level map
- **TELEPORTATION** - Teleport to random location
- **REMOVE_CURSE** - Remove curse from equipped item
- **SCARE_MONSTER** - Drop scroll, monsters flee from tile
- **HOLD_MONSTER** - Freeze target monster
- **CREATE_MONSTER** - Spawn random monster (curse)
- **AGGRAVATE_MONSTERS** - Wake all monsters (curse)
- **ENCHANT_RING** - Increase ring bonus

**Map Reveal System**: Required for MAGIC_MAPPING (Phase 4).

**Curse System**: Required for REMOVE_CURSE, curse scrolls (Phase 3).
