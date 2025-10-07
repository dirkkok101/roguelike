# IdentificationService

**Location**: `src/services/IdentificationService/IdentificationService.ts`
**Dependencies**: RandomService
**Test Coverage**: Name generation, identification tracking, display names

---

## Purpose

Generates **randomized item names** (seeded per game) and tracks **item identification** state. Provides descriptive names for unidentified items (e.g., "blue potion") and true names for identified items (e.g., "Potion of Healing").

---

## Public API

### Name Generation

#### `generateItemNames(): ItemNameMap`
Generates randomized descriptive names for new game (seeded).

**Returns**:
```typescript
interface ItemNameMap {
  potions: Map<PotionType, string>   // HEAL → "blue potion"
  scrolls: Map<ScrollType, string>   // IDENTIFY → "scroll labeled XYZZY"
  rings: Map<RingType, string>       // PROTECTION → "ruby ring"
  wands: Map<WandType, string>       // STRIKING → "oak wand"
}
```

**Seeding**: Uses `RandomService.shuffle()` to randomize mappings (same seed = same names)

**Example**:
```typescript
const nameMap = service.generateItemNames()
// nameMap.potions.get(PotionType.HEAL) → "blue potion" (Game 1)
// nameMap.potions.get(PotionType.HEAL) → "red potion" (Game 2, different seed)
```

---

## Name Pools

### Potion Descriptors

```typescript
const POTION_DESCRIPTORS = [
  'blue', 'red', 'clear', 'fizzy', 'dark', 'cloudy',
  'smoky', 'bubbling', 'glowing', 'murky', 'sparkling',
]
```

**Usage**: `"${descriptor} potion"` → `"blue potion"`

---

### Scroll Labels

```typescript
const SCROLL_LABELS = [
  'XYZZY', 'ELBERETH', 'NR 9', 'PRATYAVAYAH',
  'ZELGO MER', 'VE FORBRYDERNE', 'HACKEM MUCHE',
  'GHOTI', 'VERR YED HORRE', 'PHOL ENDE WODAN', 'THARR',
]
```

**Usage**: `"scroll labeled ${label}"` → `"scroll labeled XYZZY"`

**Easter Eggs**:
- **XYZZY**: Colossal Cave Adventure magic word
- **ELBERETH**: Tolkien elvish ward against evil
- **HACKEM MUCHE**: NetHack reference

---

### Ring Materials

```typescript
const RING_MATERIALS = [
  'ruby', 'sapphire', 'iron', 'wooden', 'ivory',
  'gold', 'silver', 'bronze', 'jade', 'obsidian',
]
```

**Usage**: `"${material} ring"` → `"ruby ring"`

---

### Wand Woods

```typescript
const WAND_WOODS = [
  'oak', 'pine', 'metal', 'crystal', 'bone',
  'copper', 'silver', 'ebony', 'marble', 'glass',
]
```

**Usage**: `"${wood} wand"` → `"oak wand"`

---

## Name Mapping Algorithm

**Shuffle pools** → **Assign to types in order** → **Store in Map**

```typescript
generateItemNames(): ItemNameMap {
  // 1. Shuffle pools (seeded RNG)
  const potionDescriptors = this.random.shuffle([...POTION_DESCRIPTORS])

  // 2. Create mappings
  const potions = new Map<PotionType, string>()
  const potionTypes = Object.values(PotionType)  // [HEAL, EXTRA_HEAL, ...]

  // 3. Assign shuffled descriptors to types
  potionTypes.forEach((type, index) => {
    const descriptor = potionDescriptors[index % potionDescriptors.length]
    potions.set(type, `${descriptor} potion`)
  })

  return { potions, scrolls, rings, wands }
}
```

**Key Property**: Same seed → same shuffle → same mappings (reproducible games)

---

## Identification Tracking

### identifyItem

```typescript
identifyItem(itemType: string, state: GameState): GameState {
  return {
    ...state,
    identifiedItems: new Set([...state.identifiedItems, itemType]),
  }
}
```

**Adds item type to identified set**: All items of that type become identified.

**Example**:
```typescript
// Player drinks "blue potion" (HEAL type)
state = service.identifyItem(PotionType.HEAL, state)
// state.identifiedItems: Set('HEAL')

// Now ALL heal potions show true name
```

---

### isIdentified

```typescript
isIdentified(itemType: string, state: GameState): boolean {
  return state.identifiedItems.has(itemType)
}
```

**Returns**: `true` if item type is in identified set

**Example**:
```typescript
if (service.isIdentified(PotionType.HEAL, state)) {
  // Show "Potion of Healing"
} else {
  // Show "blue potion"
}
```

---

## Display Names

### getDisplayName

```typescript
getDisplayName(item: Item, state: GameState): string
```

**Returns**:
- **Identified**: True name with details (e.g., `"Potion of Healing"`, `"Wand of Fire (5 charges)"`)
- **Unidentified**: Descriptive name only (e.g., `"blue potion"`, `"oak wand"`)
- **Always Identified**: Items that don't need identification (`"Long Sword"`)

**Implementation**:
```typescript
switch (item.type) {
  case ItemType.POTION: {
    const potion = item as Potion
    if (this.isIdentified(potion.potionType, state)) {
      return potion.name  // "Potion of Healing"
    }
    return state.itemNameMap.potions.get(potion.potionType) || 'unknown potion'
  }

  case ItemType.WAND: {
    const wand = item as Wand
    if (this.isIdentified(wand.wandType, state)) {
      // Show true name WITH charge count when identified
      const chargeText = wand.currentCharges === 1 ? 'charge' : 'charges'
      return `${wand.name} (${wand.currentCharges} ${chargeText})`
    }
    // Show only descriptive name when unidentified (no charges)
    return state.itemNameMap.wands.get(wand.wandType) || 'unknown wand'
  }

  // Similar for scrolls, rings...

  default:
    return item.name  // Weapons, armor, food always show true name
}
```

**Wand Charge Display**:
- **Identified**: `"Wand of Fire (7 charges)"` - True name + current charge count
- **Unidentified**: `"oak wand"` - Descriptive name only (charges hidden)
- **Purpose**: Hides strategic information (remaining charges) until wand is identified

---

### getItemTypeKey

```typescript
getItemTypeKey(item: Item): string | null
```

**Returns**: Type key for identification tracking, or `null` if item doesn't need identification.

**Usage**: Convert item to type key for `identifyItem()`

**Example**:
```typescript
const potion = { type: ItemType.POTION, potionType: PotionType.HEAL, ... }
const typeKey = service.getItemTypeKey(potion)
// Returns: "HEAL"

const weapon = { type: ItemType.WEAPON, ... }
const typeKey = service.getItemTypeKey(weapon)
// Returns: null (weapons don't need identification)
```

---

### identifyByUse

```typescript
identifyByUse(item: Item, state: GameState): GameState
```

**Convenience method**: Identify item when used.

**Usage**: Called by potion/scroll/wand services after use.

**Example**:
```typescript
// Player drinks potion
const result = potionService.applyPotion(player, potion, state)

if (result.identified) {
  state = identificationService.identifyByUse(potion, state)
}
```

---

## Item Categories

### Require Identification

- **Potions**: Need to learn which color = which effect (identified on use/quaff)
- **Scrolls**: Need to learn which label = which effect (identified on use/read)
- **Rings**: Need to learn which material = which effect (identified on equip)
- **Wands**: Need to learn which wood = which effect (identified on use/zap)

### Always Identified

- **Weapons**: Name shows immediately (`"Long Sword"`)
- **Armor**: Name shows immediately (`"Chain Mail"`)
- **Food**: Always identifiable (`"Food Ration"`)
- **Torches/Lanterns**: Always identifiable (`"Torch"`)

---

## Identification Methods

### By Use (Automatic)

**Trigger**: Player uses item

**Mechanics**:
1. **Potions**: Quaff potion → Identify type (handled by PotionService)
2. **Scrolls**: Read scroll → Identify type (handled by ScrollService)
3. **Wands**: Zap wand → Identify type (handled by WandService)
4. **Rings**: Equip ring → Identify type (handled by EquipCommand)

**Example - Ring Identification**:
```typescript
// Player equips unidentified "ruby ring" (Ring of Protection)
// EquipCommand.execute():
const wasIdentified = identificationService.isIdentified(ring.ringType, state)
updatedState = identificationService.identifyByUse(ring, state)

if (!wasIdentified) {
  message = `You put on ruby ring on your left hand. (This is a Ring of Protection!)`
} else {
  message = `You put on Ring of Protection on your left hand.`
}
```

### By Scroll of Identify

**Trigger**: Player reads Scroll of Identify and selects item

**Mechanics**: ScrollService directly identifies item type

---

## Type-Based Identification

**Key Mechanic**: Identifying one item identifies **all items of that type**.

**Example**:
```
1. Player finds "blue potion" (HEAL)
2. Player drinks it → heals
3. Game identifies PotionType.HEAL
4. Player finds another "blue potion" → shows "Potion of Healing"
5. Player finds third "blue potion" → also shows "Potion of Healing"
```

**Rationale**: Learn colors through experimentation (like original Rogue).

---

## Testing

**Test Files**:
- `name-generation.test.ts` - Seeded name mapping
- `identification-tracking.test.ts` - Identify/isIdentified
- `display-names.test.ts` - Unidentified vs identified names

**Example Test**:
```typescript
describe('IdentificationService - Name Generation', () => {
  test('generates different names for different seeds', () => {
    const random1 = new SeededRandom('seed-1')
    const service1 = new IdentificationService(random1)
    const nameMap1 = service1.generateItemNames()

    const random2 = new SeededRandom('seed-2')
    const service2 = new IdentificationService(random2)
    const nameMap2 = service2.generateItemNames()

    expect(nameMap1.potions.get(PotionType.HEAL)).not.toBe(
      nameMap2.potions.get(PotionType.HEAL)
    )
  })

  test('generates same names for same seed', () => {
    const random1 = new SeededRandom('seed-1')
    const service1 = new IdentificationService(random1)
    const nameMap1 = service1.generateItemNames()

    const random2 = new SeededRandom('seed-1')
    const service2 = new IdentificationService(random2)
    const nameMap2 = service2.generateItemNames()

    expect(nameMap1.potions.get(PotionType.HEAL)).toBe(
      nameMap2.potions.get(PotionType.HEAL)
    )
  })
})

describe('IdentificationService - Display Names', () => {
  test('shows descriptive name when unidentified', () => {
    const potion = createPotion(PotionType.HEAL)
    const state = { ...baseState, identifiedItems: new Set() }

    const name = service.getDisplayName(potion, state)

    expect(name).toMatch(/potion/)  // e.g., "blue potion"
    expect(name).not.toBe(potion.name)  // Not "Potion of Healing"
  })

  test('shows true name when identified', () => {
    const potion = createPotion(PotionType.HEAL)
    const state = {
      ...baseState,
      identifiedItems: new Set([PotionType.HEAL]),
    }

    const name = service.getDisplayName(potion, state)

    expect(name).toBe(potion.name)  // "Potion of Healing"
  })
})
```

---

## Related Services

- **PotionService** - Uses `getDisplayName()` for messages, calls `identifyByUse()` after quaffing
- **ScrollService** - Uses `getDisplayName()` for messages, calls `identifyByUse()` after reading
- **WandService** - Uses `getDisplayName()` for messages (with charge count), calls `identifyByUse()` after zapping
- **EquipCommand** - Calls `identifyByUse()` when ring is equipped, shows identification message
- **RandomService** - Shuffles name pools (seeded)

---

## Design Rationale

### Why Seeded Name Generation?

**Reproducible Games** - Same seed produces same item names.

**Speedruns** - Runners can learn item names for specific seed.

**Fairness** - All players with same seed have same item colors.

---

### Why Type-Based Identification?

**Learning Curve** - Player gradually learns item types across entire game.

**Memory Challenge** - Must remember which color = which effect.

**Original Rogue** - Used type-based identification.

---

### Why Descriptive Names?

**Mystery** - Unidentified items feel unknown, dangerous.

**Experimentation** - Player must test items to learn types.

**Variety** - Different games have different color mappings.

---

## Name Generation Flow

```
Game Start
   ↓
Generate Seed (user input or timestamp)
   ↓
Create SeededRandom(seed)
   ↓
Create IdentificationService(random)
   ↓
Call generateItemNames()
   ↓
Shuffle name pools (seeded)
   ↓
Map types to shuffled names
   ↓
Store in GameState.itemNameMap
   ↓
All unidentified items use itemNameMap
   ↓
Player uses item → Identify type
   ↓
Add type to GameState.identifiedItems
   ↓
All items of that type now show true name
```

---

## Recent Enhancements (v1.1)

- ✅ **Ring Identification on Equip**: Rings now identify when equipped (Phase 2)
- ✅ **Wand Charge Hiding**: Wand charges hidden until identified (Phase 4)
- ✅ **Comprehensive Testing**: 40+ tests covering all identification scenarios

## Future Enhancements

- **Item Properties**: Cursed items show false properties until identified
- **Shopkeeper Identification**: Pay to identify items in shops
- **Scroll of Identify**: Already implemented via ScrollService
- **Partial Identification**: Know item category but not specific type
- **Pseudo-Identification**: Show hints like "good", "average", "cursed" (Angband-style)

---

**Last Updated**: 2025-10-06
**Version**: 1.1 (Ring Identification + Wand Charge Hiding)
