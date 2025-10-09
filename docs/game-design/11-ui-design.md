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

**Wide-Screen Design**: Optimized for modern 16:9+ monitors, responsive to narrow screens

### Desktop Layout (>1200px wide)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  STATS BAR (Full Width, Compact)                                                    │
│  ──────────────────────────────────────────────────────────────────────────────────  │
│  HP: 24/30 ⚠️ │ Str: 16/16 │ AC: 4 │ Lvl: 3 │ XP: 156/300 │ Gold: 247 │ Turn: 523  │
│                                                                                       │
│  ┌──────────────────────────────────────┬──────────────────────────────────────┐    │
│  │ EQUIPMENT                            │ STATUS EFFECTS                       │    │
│  │ ⚔ Mace +1           🛡 Chain Mail [4]│ ? Confused (5)                       │    │
│  │ = Protection +1     = (empty)        │ ⚡ Hasted (10)                       │    │
│  │ 🔦 Torch (458/500)                   │                                      │    │
│  └──────────────────────────────────────┴──────────────────────────────────────┘    │
│                                                                                       │
│  Hunger🍖: [████████▒▒▒] Hungry     Light🔥: [█████████▒] 458 turns                │
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
- **Stats Bar (Top)**: Compact 3-row design spanning full width
  - Row 1: Core stats (HP, Str, AC, Level, XP, Gold, Turn, Depth, Inventory)
  - Row 2: Equipment slots + Status effects (side-by-side sections)
  - Row 3: Resource bars (Hunger and Light) with visual indicators
- **Dungeon View (Left)**: 80×22 ASCII grid, gets maximum vertical space
- **Messages (Right)**: Vertical sidebar (320px), shows last 30 messages
- **Command Bar (Bottom)**: Context-aware keybindings, spans full width

### Mobile/Tablet Layout (<1200px wide)

```
┌────────────────────────────────┐
│  STATS BAR (Compact, Stacked)  │
│  HP: 24/30 │ Str: 16/16 │ AC: 4│
│  ──────────────────────────────  │
│  Equipment: ⚔ Mace +1  🛡 [4]  │
│  Status: ? Confused (5)        │
│  Hunger: [████▒▒] Light: [██▒] │
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
│  MESSAGES (Short, Scrollable)  │
│  › You hit the Orc. (max 8-10) │
│  › Torch getting dim...        │
├────────────────────────────────┤
│  [g]et [i]nv [?]help           │
└────────────────────────────────┘
```

**Mobile Priority**: Dungeon map gets majority of vertical space (stats and messages are compact)

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
- **Stats Bar**: Full width at top, 3-row compact design
- **Dungeon**: Left column, gets all vertical space (grid row: `1fr`)
- **Messages**: Right sidebar (320px fixed), vertical scroll (30 messages)
- **Command Bar**: Full width bottom

### Mobile/Tablet (<1200px)
- **Grid**: Single column, stacked layout
- **Priority**: **Dungeon map gets maximum height**
- **Stats**: Minimal height (`auto`), compact rows
- **Dungeon**: Flexible height (`1fr` - takes all remaining space)
- **Messages**: Short scrollable area (max-height: 200px)
- **Command Bar**: Bottom

**Design Philosophy**:
- Wide screens: Horizontal space for stats/equipment, vertical messages
- Narrow screens: **Map is most important** - stats/messages compressed to maximize dungeon view

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
