# Monster Sprite Mapping Options

This document provides mapping options for Rogue monsters to available Angband sprites in the Gervais tileset.

**Current Status**: 11/26 monsters mapped, 15 missing sprites

---

## ✅ Already Mapped (11 monsters)

These monsters successfully map to sprites via AssetLoaderService fallback logic:

| Rogue Monster | Match Type | Angband Sprite | Coordinates |
|---------------|------------|----------------|-------------|
| Bat (B) | Fuzzy | "Fruit bat" | 0x81:0x90 |
| Dragon (D) | Fuzzy | "Baby blue dragon" | 0x80:0x8C |
| Jabberwock (J) | Exact | "Jabberwock" | 0x99:0x93 |
| Orc (O) | Exact | "Cave orc" | 0x94:0x8D |
| Phantom (P) | Exact | "Phantom" | 0x94:0x94 |
| Rattlesnake (R) | Exact | "Rattlesnake" | 0x97:0x90 |
| Snake (S) | Fuzzy | "Large white snake" | 0x93:0x90 |
| Troll (T) | Exact | "troll scavenger" | 0xB1:0x92 |
| Vampire (V) | Exact | "Vampire" | 0xB2:0x94 |
| Wraith (W) | Fuzzy | "White wraith" | 0x8C:0x94 |
| Yeti (Y) | Exact | "Yeti" | 0xB2:0x8E |

---

## ⚠️ Missing Mappings (15 monsters)

### Option 1: Direct Sprite Name Mapping (Recommended)

Create a mapping table in AssetLoaderService that explicitly maps Rogue monster names to Angband sprite names.

```typescript
const MONSTER_TO_SPRITE: Record<string, string> = {
  // Already working via fuzzy matching
  'Bat': 'Fruit bat',
  'Dragon': 'Baby blue dragon',
  'Snake': 'Large white snake',
  'Wraith': 'White wraith',

  // New mappings for missing monsters
  'Aquator': 'Water elemental',
  'Centaur': 'Uvatha the Horseman',
  'Emu': 'White harpy',
  'Venus Flytrap': 'Shrieker mushroom patch',
  'Griffin': 'Manticore',
  'Hobgoblin': 'Large kobold',
  'Ice Monster': 'Ice elemental',
  'Kestrel': 'Giant roc',
  'Leprechaun': 'Cutpurse',
  'Medusa': 'gorgon',
  'Nymph': 'Master thief',
  'Quagga': 'Uvatha the Horseman',
  'Ur-vile': 'Bile Demon',
  'Xeroc': 'Imp',
  'Zombie': 'Skeleton human',
}
```

**Pros**:
- Most control over exact sprite used
- Clear, explicit mappings
- Easy to maintain and update
- Thematic accuracy

**Cons**:
- Requires code change in AssetLoaderService
- Fixed 1:1 mapping (can't have variants)

---

### Detailed Sprite Options for Each Monster

#### 1. Aquator (A) - Water Elemental
**Thematic fit**: ⭐⭐⭐⭐⭐ (Perfect - Aquator rusts armor, water theme)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Water elemental** | 0x9A:0x8F | ✅ Best match - water theme, elemental |
| great water elemental | 0x9A:0x8F | Same sprite, higher level variant |
| Water spirit | 0x96:0x8F | Alternative water creature |
| Water hound | 0xC7:0x90 | Dog-like water creature |
| Water vortex | 0xA5:0x92 | Swirling water form |

**Recommendation**: `Water elemental`

---

#### 2. Centaur (C) - Humanoid Options
**Thematic fit**: ⭐⭐ (No exact centaurs in tileset)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Uvatha the Horseman** | 0xA7:0x95 | Horse-related unique boss |
| terrified yeek | 0xB9:0x8F | Humanoid creature |
| Blue yeek | 0xBA:0x8F | Humanoid creature |
| Cave orc | 0x94:0x8D | Humanoid warrior |
| orc tracker | 0x98:0x92 | Humanoid archer type |

**Recommendation**: `Uvatha the Horseman` (horse connection) or generic humanoid sprite

---

#### 3. Emu (E) - Bird
**Thematic fit**: ⭐⭐⭐⭐ (Good bird options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **White harpy** | 0x8A:0x93 | Flying creature, bird-like |
| Black harpy | 0x8B:0x93 | Darker variant |
| Giant roc | 0x8C:0x91 | Large bird |
| Vrock | 0x9F:0x8D | Demon bird hybrid |

**Recommendation**: `White harpy` or `Giant roc`

---

#### 4. Venus Flytrap (F) - Plant/Fungus
**Thematic fit**: ⭐⭐⭐⭐ (Good plant options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Shrieker mushroom patch** | 0xD6:0x8E | ✅ Aggressive plant, makes noise |
| Green mold | 0xC9:0x8E | Green plant-like |
| Yellow mushroom patch | 0xD7:0x8E | Passive plant |
| Purple mushroom patch | 0xD9:0x8E | Exotic plant |
| Spotted mushroom patch | 0xD8:0x8E | Patterned plant |
| Magic mushroom patch | 0xDB:0x8E | Special plant |

**Recommendation**: `Shrieker mushroom patch` (most aggressive/active plant)

---

#### 5. Griffin (G) - Winged Creature
**Thematic fit**: ⭐⭐⭐ (Manticore is similar mythical beast)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Manticore** | 0x9F:0x93 | ✅ Winged mythical beast |
| White harpy | 0x8A:0x93 | Flying creature |
| Giant roc | 0x8C:0x91 | Large flying creature |
| Vrock | 0x9F:0x8D | Demon bird |

**Recommendation**: `Manticore` (closest to griffin theme)

---

#### 6. Hobgoblin (H) - Goblinoid
**Thematic fit**: ⭐⭐⭐⭐ (Good goblinoid options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Large kobold** | 0x8D:0x8D | ✅ Larger goblinoid |
| Cave orc | 0x94:0x8D | Orc warrior |
| Orc shaman | 0x99:0x92 | Magical orc |
| Kobold archer | 0xD8:0x83 | Ranged kobold |
| Blue yeek | 0xBA:0x8F | Goblin-like humanoid |

**Recommendation**: `Large kobold` (closest to hobgoblin concept)

---

#### 7. Ice Monster (I) - Ice Elemental
**Thematic fit**: ⭐⭐⭐⭐⭐ (Perfect match)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Ice elemental** | 0xC0:0x92 | ✅ Perfect match - freezes enemies |
| Great Ice Wyrm | 0xA2:0x8C | Dragon with ice theme |

**Recommendation**: `Ice elemental` (exact thematic match)

---

#### 8. Kestrel (K) - Bird
**Thematic fit**: ⭐⭐⭐⭐ (Good bird options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Giant roc** | 0x8C:0x91 | ✅ Large predatory bird |
| White harpy | 0x8A:0x93 | Flying creature |
| Black harpy | 0x8B:0x93 | Darker flying creature |
| Vrock | 0x9F:0x8D | Demon bird |

**Recommendation**: `Giant roc` (bird of prey like kestrel)

---

#### 9. Leprechaun (L) - Thief
**Thematic fit**: ⭐⭐⭐⭐⭐ (Perfect - leprechauns steal gold)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Cutpurse** | 0x81:0x84 | ✅ Thief character |
| Master thief | 0x99:0x84 | High-level thief |
| Squint-eyed rogue | 0x87:0x8B | Rogue character |
| rogue | 0x94:0x84 | Generic rogue |

**Recommendation**: `Cutpurse` (thief behavior, steals items)

---

#### 10. Medusa (M) - Gorgon
**Thematic fit**: ⭐⭐⭐⭐⭐ (Exact mythological match!)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **gorgon** | 0xA8:0x95 | ✅ Perfect - exact mythological creature! |
| Black naga | 0x8D:0x90 | Snake-human hybrid |
| Spirit naga | 0x91:0x90 | Mystical naga |
| 3-headed hydra | 0xA2:0x90 | Multi-headed serpent |

**Recommendation**: `gorgon` (exact thematic match to Medusa)

---

#### 11. Nymph (N) - Fey Thief
**Thematic fit**: ⭐⭐⭐ (No nymphs, but thief behavior matches)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Master thief** | 0x99:0x84 | ✅ Thief behavior (nymphs steal) |
| Cutpurse | 0x81:0x84 | Lower-level thief |
| rogue | 0x94:0x84 | Generic rogue |
| White harpy | 0x8A:0x93 | Female-coded creature |

**Recommendation**: `Master thief` (nymphs steal items in Rogue)

---

#### 12. Quagga (Q) - Zebra-like
**Thematic fit**: ⭐⭐ (No zebras in tileset)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Uvatha the Horseman** | 0xA7:0x95 | Horse-related creature |
| wild dog | 0xCE:0x8F | Wild animal |
| Cave lizard | 0x8E:0x93 | Animal-like creature |
| Giant white rat | 0x9A:0x8D | Small animal |

**Recommendation**: `Uvatha the Horseman` (only horse-like option) or `wild dog`

---

#### 13. Ur-vile (U) - Demon
**Thematic fit**: ⭐⭐⭐⭐ (Good demon options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Bile Demon** | 0xB9:0x8D | ✅ Mid-level demon |
| Imp | 0xAA:0x8D | Smaller demon |
| Pit Fiend | 0xA6:0x93 | Powerful demon |
| Lesser Balrog | 0xBA:0x8D | Fire demon |

**Recommendation**: `Bile Demon` (fits Ur-vile power level)

---

#### 14. Xeroc (X) - Unknown/Mysterious
**Thematic fit**: ⭐⭐⭐ (Demons/mysterious creatures)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Imp** | 0xAA:0x8D | ✅ Small mysterious demon |
| Bile Demon | 0xB9:0x8D | Mid-level demon |
| Demonic quylthulg | 0x83:0x93 | Mysterious pulsing creature |
| Floating eye | 0xC1:0x92 | Strange floating creature |

**Recommendation**: `Imp` (mysterious, fits X theme)

---

#### 15. Zombie (Z) - Undead
**Thematic fit**: ⭐⭐⭐⭐⭐ (Perfect undead options)

| Sprite Name | Coordinates | Notes |
|-------------|-------------|-------|
| **Skeleton human** | 0x9E:0x94 | ✅ Classic undead |
| Ghoul | 0xBF:0x94 | Flesh-eating undead |
| Skeleton kobold | 0xBB:0x94 | Smaller undead |
| Skeleton orc | 0xBE:0x94 | Orc undead |
| Zombified kobold | 0x9B:0x94 | Zombie variant |
| Zombified orc | 0x9A:0x94 | Zombie variant |

**Recommendation**: `Skeleton human` or `Ghoul`

---

## Option 2: Add .prf File Entries

Create a custom `.prf` file that maps Rogue monster names to existing sprites:

```
# custom-rogue-monsters.prf
monster:Aquator:0x8F:0x9A
monster:Centaur:0x95:0xA7
monster:Emu:0x93:0x8A
monster:Venus Flytrap:0x8E:0xD6
monster:Griffin:0x93:0x9F
monster:Hobgoblin:0x8D:0x8D
monster:Ice Monster:0x92:0xC0
monster:Kestrel:0x91:0x8C
monster:Leprechaun:0x84:0x81
monster:Medusa:0x95:0xA8
monster:Nymph:0x84:0x99
monster:Quagga:0x95:0xA7
monster:Ur-vile:0x8D:0xB9
monster:Xeroc:0x8D:0xAA
monster:Zombie:0x94:0x9E
```

**Pros**:
- No code changes required
- Easy to modify mappings
- Follows Angband conventions

**Cons**:
- Need to add custom .prf file to asset loading
- Less discoverable than code-based mapping

---

## Option 3: Rename Monsters in monsters.json

Update `monsters.json` to use sprite names that exist in the tileset.

**Pros**:
- No mapping needed
- Uses canonical Angband names

**Cons**:
- Loses classic Rogue monster names
- Breaks theme consistency
- Not recommended

---

## Recommended Approach

**Use Option 1**: Add explicit mapping table in `AssetLoaderService.ts`

1. Create `MONSTER_TO_SPRITE` constant with recommended mappings
2. Check this map FIRST in `getSprite()` before fallback logic
3. Maintains classic Rogue names while using Angband sprites
4. Clear, maintainable, and easy to update

---

## Summary of Recommendations

| Rogue Monster | → | Angband Sprite | Thematic Fit |
|---------------|---|----------------|--------------|
| Aquator | → | Water elemental | ⭐⭐⭐⭐⭐ |
| Centaur | → | Uvatha the Horseman | ⭐⭐ |
| Emu | → | White harpy | ⭐⭐⭐⭐ |
| Venus Flytrap | → | Shrieker mushroom patch | ⭐⭐⭐⭐ |
| Griffin | → | Manticore | ⭐⭐⭐ |
| Hobgoblin | → | Large kobold | ⭐⭐⭐⭐ |
| Ice Monster | → | Ice elemental | ⭐⭐⭐⭐⭐ |
| Kestrel | → | Giant roc | ⭐⭐⭐⭐ |
| Leprechaun | → | Cutpurse | ⭐⭐⭐⭐⭐ |
| Medusa | → | gorgon | ⭐⭐⭐⭐⭐ |
| Nymph | → | Master thief | ⭐⭐⭐ |
| Quagga | → | Uvatha the Horseman | ⭐⭐ |
| Ur-vile | → | Bile Demon | ⭐⭐⭐⭐ |
| Xeroc | → | Imp | ⭐⭐⭐ |
| Zombie | → | Skeleton human | ⭐⭐⭐⭐⭐ |

**Note**: 8 out of 15 mappings have ⭐⭐⭐⭐ or ⭐⭐⭐⭐⭐ thematic fit!
