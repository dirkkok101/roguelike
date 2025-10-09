# UI Design

**Version**: 2.1
**Last Updated**: 2025-10-09
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

**Wide-Screen Design**: Optimized for modern 16:9+ monitors, responsive to narrow screens

### Desktop Layout (>1200px wide)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  STATS BAR (Full Width, Single Row with 4 Panels)                                   │
│  ──────────────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────┬─────────────────┬──────────────────────┬───────────────────┐    │
│  │ COMBAT         │ RESOURCES       │ EQUIPMENT            │ STATUS            │    │
│  │ HP: 24/30 ⚠️   │ Gold: 247       │ Weapon: Mace +1      │ Confused (5)      │    │
│  │ Str: 16/16     │ Hunger: Fed     │ Armor: Chain Mail +1 │ Hasted (10)       │    │
│  │ AC: 4          │ Depth: 5        │ Left Hand: Ring +1   │                   │    │
│  │ Lvl: 3         │ Turn: 523       │ Right Hand: (empty)  │                   │    │
│  │ XP: 156/300    │ Torch: 458      │ Light: Torch (458)   │                   │    │
│  └────────────────┴─────────────────┴──────────────────────┴───────────────────┘    │
├────────────────────────────────────────────────┬──────────────────────────────────────┤
│                                                │  MESSAGES (Vertical Scroll)          │
│                                                │  ────────────────────────────         │
│          DUNGEON VIEW (80x22)                  │  › You miss the Orc. (x2)            │
│                                                │  › You hit the Orc for 5 damage.     │
│                                                │  › The Orc attacks you for 3 damage! │
│  #################                             │  › Your torch is getting dim...      │
│  #...............#      ######                 │  › You feel hungry.                  │
│  #...@...........+######+....#                 │  › You picked up 15 gold.            │
│  #...............#      #....#                 │  › The Zombie attacks! (x3)          │
│  #...........O...#      #....#                 │  › You descended to level 5.         │
│  #################      ######                 │  › It's dark here! (no light)        │
│                                                │  › ...                               │
│                                                │  › (30 messages shown, scrollable)   │
│                                                │                                      │
├────────────────────────────────────────────────┴──────────────────────────────────────┤
│  📍 Item here! │ [g]et item  [o]pen door  [i]nventory  [?]help  [~]debug             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Layout Features**:
- **Stats Bar (Top)**: Single row with 4 distinct panels spanning full width
  - **Combat Panel**: HP, Str, AC, Level, XP (color-coded HP: green/yellow/red)
  - **Resources Panel**: Gold, Hunger, Depth, Turn, Torch (text-only display)
  - **Equipment Panel**: All 5 slots with explicit labels (Weapon, Armor, Left Hand, Right Hand, Light Source)
  - **Status Panel**: Active status effects with durations, or "None"
- **Dungeon View (Left)**: 80×22 ASCII grid, gets maximum vertical space
- **Messages (Right)**: Vertical sidebar (320px), shows last 30 messages with › prefix
- **Command Bar (Bottom)**: Context-aware keybindings, spans full width

### Mobile/Tablet Layout (<1200px wide)

```
┌────────────────────────────────┐
│  STATS (2x2 Grid, Compact)     │
│  ──────────────────────────────  │
│  ┌──────────┬─────────────┐    │
│  │ COMBAT   │ RESOURCES   │    │
│  │ HP: 24/30│ Gold: 247   │    │
│  │ Str: 16  │ Hunger: Fed │    │
│  │ AC: 4    │ Depth: 5    │    │
│  │ Lvl: 3   │ Turn: 523   │    │
│  │ XP: 156  │ Torch: 458  │    │
│  ├──────────┼─────────────┤    │
│  │ EQUIP    │ STATUS      │    │
│  │ Weapon:  │ Confused(5) │    │
│  │  Mace +1 │ Hasted(10)  │    │
│  │ Armor:   │             │    │
│  │  Chain+1 │             │    │
│  │ Light:   │             │    │
│  │  Torch   │             │    │
│  └──────────┴─────────────┘    │
├────────────────────────────────┤
│                                │
│         DUNGEON VIEW           │
│       (Maximum height)         │
│                                │
│  #################             │
│  #...@...........#             │
│  #...............#             │
│  #################             │
│                                │
├────────────────────────────────┤
│  MESSAGES (Bottom, Full Width) │
│  › You hit the Orc.            │
│  › Torch getting dim...        │
├────────────────────────────────┤
│  [g]et [i]nv [?]help           │
└────────────────────────────────┘
```

**Mobile Priority**: Dungeon map gets majority of vertical space (4 panels arrange in 2x2 grid)

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

**Wide-Screen First**: Optimized for 16:9+ monitors (max 1800px width)

**Breakpoint**: 1200px

### Desktop (>1200px)
- **Grid**: 2 columns (dungeon + messages sidebar)
- **Stats Bar**: Full width at top, single row with 4 panels (Combat, Resources, Equipment, Status)
- **Panel Layout**: Flexbox with equal-width panels (flex: 1)
- **Dungeon**: Left column, gets all vertical space (grid row: `1fr`)
- **Messages**: Right sidebar (320px fixed), vertical scroll (30 messages)
- **Command Bar**: Full width bottom

### Mobile/Tablet (<1200px)
- **Grid**: Single column, stacked layout
- **Priority**: **Dungeon map gets maximum height**
- **Stats**: 4 panels in 2x2 grid (Combat | Resources on top, Equipment | Status on bottom)
- **Dungeon**: Flexible height (`1fr` - takes all remaining space)
- **Messages**: Stacked below dungeon (full width)
- **Command Bar**: Bottom

**Design Philosophy**:
- Wide screens: Single-row 4-panel layout maximizes horizontal space, vertical messages sidebar
- Narrow screens: **Map is most important** - 4 panels in compact 2x2 grid to maximize dungeon view
- Text-only resource display (no bars) saves vertical space on all screen sizes

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
