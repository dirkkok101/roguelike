# UI Design

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Dungeon](./03-dungeon.md) | [Light Sources](./06-light-sources.md)

---

## 1. Visual Design Philosophy

**Core Aesthetic**: Modern web interpretation of classic ASCII terminal

### Design Goals

**Readable**: Clear, high-contrast monospace font
**Authentic**: True to ASCII roguelike spirit
**Enhanced**: Modern colors, subtle effects (no breaking immersion)
**Accessible**: Colorblind-friendly palette, clear messaging

---

## 2. Typography

**Font**: Fira Code, JetBrains Mono, or similar monospace

**Size**: 14-16px for readability

**Weight**:
- Regular for dungeon terrain
- Bold for player and important elements

---

## 3. Color Palette

**Background**: `#1a1a1a` (dark gray/black)

### Visible State (Currently in FOV)

**Terrain**:
- Walls: `#8B7355` (tan)
- Floors: `#A89078` (light brown)
- Corridors: `#6B5D52` (dark brown)
- Doors (closed): `#D4AF37` (golden)
- Doors (open): `#8B7355` (tan)
- Stairs: `#FFFFFF` (white)
- Traps: `#FF4444` (red, if discovered)

**Entities**:
- Player: `#00FFFF` (bright cyan)
- Monsters (low threat, A-E): `#44FF44` (green)
- Monsters (medium threat, F-P): `#FFDD00` (yellow)
- Monsters (high threat, Q-U): `#FF8800` (orange)
- Monsters (boss tier, V-Z): `#FF4444` (red)

**Items**:
- Gold: `#FFD700` (gold)
- Food: `#44FF44` (green)
- Torch: `#FFAA00` (orange)
- Lantern: `#FFD700` (yellow)
- Potions: `#FF00FF` (magenta)
- Scrolls: `#00FFFF` (cyan)
- Weapons: `#FFFFFF` (white)
- Armor: `#C0C0C0` (silver)
- Rings: `#9370DB` (purple)
- Wands: `#4444FF` (blue)
- Amulet: `#FFD700` (bright gold)

---

### Explored State (Map Memory)

**Terrain**:
- Walls: `#4A4A4A` (dark gray)
- Floors: `#5A5A5A` (medium gray)
- Corridors: `#404040` (darker gray)
- Doors: `#6A6A6A` (gray)
- Stairs: `#9A9A9A` (light gray)
- Traps: `#442222` (dark red, if discovered)

**Entities**:
- Monsters: **NOT SHOWN** (key design principle)
- Items: `#707070` (dim gray) - optional
- Gold: `#808080` (dim gray) - optional

---

### Unexplored State

**Everything**: `#000000` (black) or not rendered

---

### UI/Message Colors

- **Damage**: `#FF4444` (red)
- **Healing**: `#44FF44` (green)
- **Info**: `#FFFFFF` (white)
- **Warnings**: `#FFDD00` (yellow)
- **Light warnings**: `#FF8800` (orange)
- **Critical**: `#FF0000` (bright red)
- **Success**: `#00FF00` (bright green)

---

## 4. Visual Effects

**Subtle enhancements** (no breaking immersion):

- **Player glow**: 2px cyan shadow (subtle)
- **Message fade-in**: New messages fade in smoothly
- **Low HP pulse**: HP bar pulses when < 25%
- **Torch flicker**: Light source flickers when < 10 turns fuel
- **NO animations** for movement/combat (instant, turn-based)

---

## 5. Layout

**Responsive Design**: Fixed aspect ratio, scales to fit screen

```
┌──────────────────────────────────────────────────────────────────┐
│  TITLE BAR                                           [~] Debug    │
│  Roguelike: The Quest for the Amulet          Seed: abc123def    │
├──────────────────────────────────────────────────────────────────┤
│  MESSAGE LOG (8 lines, scrolling, grouping, history modal)       │
│  > You miss the Orc. (x2)                                        │
│  > You hit the Orc for 5 damage.                                 │
│  > The Orc attacks you for 3 damage!                             │
│  > Your torch is getting dim...                                  │
│  > You feel hungry.                                              │
│  > You picked up 15 gold.                                        │
│  > The Zombie attacks! (x3)                                      │
│  >                                                               │
├──────────────────────────────────┬────────────────────────────────┤
│                                  │  STATS                         │
│                                  │                                │
│         DUNGEON VIEW (80x22)     │  HP:    24/30  ████████▒▒     │
│                                  │  Str:   16/16                  │
│                                  │  AC:    4                      │
│  #################               │  Lvl:   3                      │
│  #...............#      ######   │  XP:    156/300                │
│  #...@...........+######+....#   │  Gold:  247                    │
│  #...............#      #....#   │  Depth: 5                      │
│  #...........O...#      #....#   │                                │
│  #################      ######   │  HUNGER                        │
│                                  │  [████████████▒▒]  Hungry      │
│                                  │                                │
│                                  │  LIGHT                         │
│                                  │  Torch (dim)                   │
│                                  │  ~45 turns left                │
│                                  │                                │
│                                  │  EQUIPPED                      │
│                                  │  ────────────                  │
│                                  │  Weapon:                       │
│                                  │    Mace +1                     │
│                                  │  Armor:                        │
│                                  │    Chain Mail [4]              │
│                                  │  Rings:                        │
│                                  │    Protection +1               │
│                                  │    [empty]                     │
├──────────────────────────────────┴────────────────────────────────┤
│  📍 Item here! │ [g]et item  [o]pen door  [i]nventory  [?]help   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Enhanced UI Features

### Message Grouping
**Repeated messages consolidated with counts**:
- "You miss. (x3)" instead of three separate lines
- Reduces clutter in combat
- Makes log more readable

---

### Message History Modal
**Access**: Press `Ctrl+M` (or similar)

**Features**:
- Full scrollable message history
- Search/filter by keyword
- Categorize by message type (combat, items, warnings)

---

### Contextual Command Bar

**Bottom bar dynamically shows context-aware commands**:
- "📍 Item here!" when standing on item
- "⚠️ Monster nearby!" when enemy in FOV
- "🪜 Stairs here!" when on stairs
- Available actions based on environment

**Color-coded**:
- Primary actions: Green
- Secondary actions: Blue
- Warnings: Yellow/Orange

---

### Auto-Notifications

**Important events flash at bottom**:
- Level up: "⭐ Level Up! (Level 3)"
- Stat changes: "💪 Strength increased!"
- Quest events: "🏆 Amulet of Yendor found!"

**Brief flash** (2-3 seconds), then disappear

---

### Quick Help Modal

**Access**: Press `?`

**Features**:
- Context-sensitive help
- Complete keybinding list
- Tutorial hints for new players

---

## 7. Responsive Design

**Full-Width Layout**: Command bar spans browser width (max 1600px)

**Narrow Screens** (<1024px):
- Stacked columns (dungeon above, stats below)
- Adjustable font sizes
- Scrollable message log

---

## 8. Accessibility

**Colorblind-Friendly**:
- Monsters use shape variations (future)
- Rely on symbols, not just colors
- High contrast everywhere

**Screen Reader Support** (future):
- Text descriptions for ASCII symbols
- Navigation announcements

---

## Cross-References

- **[Dungeon](./03-dungeon.md)** - ASCII symbols, terrain colors
- **[Light Sources](./06-light-sources.md)** - Light warnings, visual effects
- **[Character](./02-character.md)** - Stats display, HP/hunger bars
- **[Controls](./10-controls.md)** - Command bar keybindings

---

## Influences

- Classic ASCII terminal aesthetics (VT100, early Unix terminals)
- Modern web accessibility standards
- NetHack's message system (grouping, color coding)
