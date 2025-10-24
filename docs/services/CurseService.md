# CurseService

**Location**: `src/services/CurseService/CurseService.ts`
**Dependencies**: None
**Test Coverage**: Curse detection, removal, equipment scanning

---

## Purpose

Pure, stateless curse management for equipment. Detects cursed items, removes curses immutably, and scans player equipment for cursed items.

---

## Public API

### isCursed(item: Item | null | undefined): boolean

Checks if an item is cursed.

**Returns**: `true` if item has `cursed` field set to `true`.

### removeCurse<T extends Weapon | Armor | Ring>(item: T): T

Removes curse from a single equipment item.

**Returns**: New item with `cursed` set to `false` (immutable).

### removeCursesFromEquipment(player: Player): Player

Removes curses from all equipped items.

**Returns**: New player with all equipment uncursed (immutable).

**Equipment Slots**:
- Weapon
- Armor
- Left ring
- Right ring
- Light source (cannot be cursed)

### hasAnyCursedItems(player: Player): boolean

Checks if player has any cursed items equipped.

**Returns**: `true` if any equipped item is cursed.

### getCursedItemNames(player: Player): string[]

Gets list of cursed equipment names for messaging.

**Returns**: Array of item names that are cursed.

---

## Integration Notes

**Scroll of Remove Curse**:
```typescript
const curseService = new CurseService()

// Check if player has cursed items
if (!curseService.hasAnyCursedItems(player)) {
  return addMessage(state, "You feel no different.")
}

// Get cursed item names for message
const cursedItems = curseService.getCursedItemNames(player)
const message = `Your ${cursedItems.join(', ')} glows blue for a moment.`

// Remove all curses
const updatedPlayer = curseService.removeCursesFromEquipment(player)

return { ...state, player: updatedPlayer }
```

**Equipment Prevention**:
```typescript
// Prevent unequipping cursed items
if (curseService.isCursed(equippedItem)) {
  return addMessage(state, "You can't remove the cursed item!")
}
```

---

## Related Services

- [InventoryService](./InventoryService.md) - Manages equipment
