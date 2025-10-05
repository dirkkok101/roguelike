# InventoryService

**Location**: `src/services/InventoryService/InventoryService.ts`
**Dependencies**: None
**Test Coverage**: Inventory management, equipping, carry capacity

---

## Purpose

Manages player inventory, item storage, and equipment (weapons, armor, rings). Handles capacity limits, equipping/unequipping, and item queries.

---

## Public API

### Inventory Management

#### `addItem(player: Player, item: Item): Player`
Adds item to inventory.

**Rules**:
- Checks capacity (26 items max)
- **Removes position property** (items on floor have position, in inventory don't)
- Returns unchanged if full

**Example**:
```typescript
const updated = service.addItem(player, longsword)
// player.inventory: [shield] → [shield, longsword]
```

---

#### `removeItem(player: Player, itemId: string): Player`
Removes item from inventory by ID.

**Returns**: New player with item removed

---

#### `findItem(player: Player, itemId: string): Item | undefined`
Finds item in inventory by ID.

---

#### `findItemByType(player: Player, type: ItemType): Item | undefined`
Finds first item of specific type.

**Example**:
```typescript
const food = service.findItemByType(player, ItemType.FOOD)
// Returns first food ration found
```

---

### Capacity

#### `canCarry(inventory: Item[]): boolean`
Checks if inventory has space.

**Capacity**: 26 items (A-Z slots)

**Returns**: `true` if `inventory.length < 26`

---

#### `getInventoryCount(player: Player): number`
Returns current item count.

---

#### `getAvailableSlots(player: Player): number`
Returns free inventory slots.

**Returns**: `26 - inventory.length`

---

### Equipment - Weapons

#### `equipWeapon(player: Player, weapon: Weapon): Player`
Equips weapon, auto-swapping old weapon to inventory.

**Process**:
1. Remove new weapon from inventory
2. Old weapon (if any) → inventory
3. New weapon → `equipment.weapon`

**Example**:
```typescript
// Player with Mace equipped, Longsword in inventory
const updated = service.equipWeapon(player, longsword)
// equipment.weapon: Mace → Longsword
// inventory: [Longsword] → [Mace]
```

---

### Equipment - Armor

#### `equipArmor(player: Player, armor: Armor): Player`
Equips armor, auto-swapping old armor to inventory.

**Also Updates**:
- `player.ac` - Armor class from new armor

**Formula**: `ac = armor.ac - armor.bonus`

---

### Equipment - Rings

#### `equipRing(player: Player, ring: Ring, slot: 'left' | 'right'): Player`
Equips ring in specified slot.

**Slots**: `leftRing`, `rightRing`

**Auto-Swap**: Old ring (if any) → inventory

---

#### `unequipRing(player: Player, slot: 'left' | 'right'): Player`
Unequips ring from slot to inventory.

**Returns**: Player with ring moved to inventory

---

### Equipment Queries

#### `getEquippedItems(player: Player): Item[]`
Returns array of all equipped items.

**Includes**:
- Weapon
- Armor
- Left ring
- Right ring
- Light source

---

#### `isEquipped(player: Player, itemId: string): boolean`
Checks if item is currently equipped.

**Use Case**: Prevent dropping equipped items

---

## Inventory Capacity

**Limit**: 26 items (alphabet slots A-Z)

**Why 26?** Original Rogue used letter keys for item selection.

**When Full**:
- `addItem()` returns unchanged player
- Must drop item to pick up new one
- Commands show "Your pack is full" message

---

## Position Property

**Floor Items**: Have `position: { x, y }`

**Inventory Items**: No position property (removed on pickup)

**Why?** Items in inventory aren't "placed" anywhere.

```typescript
// Floor item
{
  id: 'sword-1',
  name: 'Longsword',
  position: { x: 10, y: 5 }  // Has position
}

// Inventory item (after pickup)
{
  id: 'sword-1',
  name: 'Longsword'
  // NO position property
}
```

---

## Equipment Slots

| Slot | Type | Auto-Swap? | Count |
|------|------|------------|-------|
| **weapon** | Weapon | Yes | 1 |
| **armor** | Armor | Yes | 1 |
| **leftRing** | Ring | No | 1 |
| **rightRing** | Ring | No | 1 |
| **lightSource** | LightSource | Special | 1 |

**Auto-Swap**: Weapons and armor automatically swap old → inventory

**Manual Swap**: Rings require explicit unequip command

**Light Source**: Managed by LightingService, not InventoryService

---

## Immutability Pattern

All methods return new Player object:

```typescript
addItem(player: Player, item: Item): Player {
  return {
    ...player,
    inventory: [...player.inventory, item]
  }
}
```

**Never mutates input** - follows service architecture pattern.

---

## Usage in Commands

### PickUpCommand
```typescript
execute(state: GameState): GameState {
  // Check capacity
  if (!this.inventoryService.canCarry(player.inventory)) {
    return state  // Inventory full
  }

  // Add item
  const updated = this.inventoryService.addItem(player, item)

  return { ...state, player: updated }
}
```

### EquipCommand
```typescript
execute(state: GameState): GameState {
  const weapon = this.inventoryService.findItem(player, itemId)

  if (weapon.type === ItemType.WEAPON) {
    const updated = this.inventoryService.equipWeapon(player, weapon)
    return { ...state, player: updated }
  }
}
```

---

## Testing

**Test Files**:
- `inventory-management.test.ts` - Add/remove items
- `carry-capacity.test.ts` - Capacity limits
- `equip-unequip.test.ts` - Equipment mechanics

**Example Test**:
```typescript
describe('InventoryService - Capacity', () => {
  test('cannot carry more than 26 items', () => {
    const fullInventory = Array(26).fill(mockItem)
    const player = { ...basePlayer, inventory: fullInventory }

    const canCarry = service.canCarry(player.inventory)
    expect(canCarry).toBe(false)
  })
})
```

---

## Related Services

- **IdentificationService** - Item display names
- **LightingService** - Light source management (separate from inventory)
