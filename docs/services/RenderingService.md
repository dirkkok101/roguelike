# RenderingService

**Location**: `src/services/RenderingService/RenderingService.ts`
**Dependencies**: FOVService
**Test Coverage**: Visibility states, entity rendering, color selection

---

## Purpose

Determines **visibility states** and **rendering rules** for tiles and entities. Implements the three-state visibility system (visible/explored/unexplored) and color selection for fog of war.

---

## Public API

### Visibility States

#### `getVisibilityState(position: Position, visibleCells: Set<string>, level: Level): VisibilityState`
Determines visibility state for a position.

**Returns**: `'visible' | 'explored' | 'unexplored'`

**Logic**:
1. If position in FOV set → `'visible'`
2. If position in `level.explored` array → `'explored'`
3. Otherwise → `'unexplored'`

**Example**:
```typescript
const state = service.getVisibilityState(
  { x: 10, y: 5 },
  player.visibleCells,
  level
)
// Returns: 'visible' (player can see this tile)
```

---

### Entity Rendering

#### `shouldRenderEntity(position: Position, entityType: string, visibilityState: VisibilityState, config: RenderConfig): boolean`
Determines if entity should be rendered based on visibility.

**Entity Rendering Rules**:

| Entity Type | Visible | Explored | Unexplored |
|-------------|---------|----------|------------|
| **monster** | ✅ Yes | ❌ No | ❌ No |
| **item** | ✅ Yes | ⚙️ Config | ❌ No |
| **gold** | ✅ Yes | ⚙️ Config | ❌ No |
| **stairs** | ✅ Yes | ✅ Yes | ❌ No |
| **trap** | ✅ Yes (if discovered) | ✅ Yes (if discovered) | ❌ No |

**Config Options**:
```typescript
interface RenderConfig {
  showItemsInMemory: boolean  // Show items in explored tiles?
  showGoldInMemory: boolean   // Show gold in explored tiles?
}
```

**Example**:
```typescript
const shouldRender = service.shouldRenderEntity(
  monsterPos,
  'monster',
  'explored',
  config
)
// Returns: false (monsters only render in FOV)
```

---

## Color System

### Tile Colors

#### `getColorForTile(tile: Tile, visibilityState: VisibilityState): string`
Returns color for tile based on visibility.

**Color Selection**:
- **Visible**: `tile.colorVisible` (full color)
- **Explored**: `tile.colorExplored` (dimmed/gray)
- **Unexplored**: `'#000000'` (black)

**Example**:
```typescript
// Floor tile
tile.colorVisible = '#808080'  // Gray
tile.colorExplored = '#404040' // Dark gray

const color = service.getColorForTile(tile, 'explored')
// Returns: '#404040'
```

---

### Entity Colors

#### `getColorForEntity(entity: Monster | Item | GoldPile, visibilityState: VisibilityState): string`
Returns color for entity based on visibility and type.

**Visibility Colors**:
- **Unexplored**: `'#000000'` (black, should never render)
- **Explored**: `'#707070'` (dimmed gray for memory)
- **Visible**: Entity-specific color

**Entity-Specific Colors** (when visible):
- **Monsters**: Color by threat level (see below)
- **Gold**: `'#FFD700'` (gold)
- **Items**: `'#FFFFFF'` (white, expanded in Phase 5)

---

## Monster Threat Coloring

**Algorithm**: Color based on letter position (A-Z scale)

```typescript
private getMonsterColor(monster: Monster): string {
  const position = monster.letter.charCodeAt(0) - 'A'.charCodeAt(0)
  const total = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0)

  if (position < total * 0.25) {
    return '#44FF44'  // Low threat - green (A-F)
  } else if (position < total * 0.5) {
    return '#FFDD00'  // Medium threat - yellow (G-M)
  } else if (position < total * 0.75) {
    return '#FF8800'  // High threat - orange (N-S)
  } else {
    return '#FF4444'  // Boss tier - red (T-Z)
  }
}
```

**Monster Threat Tiers**:
| Letter Range | Threat Level | Color | Examples |
|--------------|--------------|-------|----------|
| A-F | Low | Green (#44FF44) | Bat, Emu, Kestrel |
| G-M | Medium | Yellow (#FFDD00) | Hobgoblin, Ice Monster, Leprechaun |
| N-S | High | Orange (#FF8800) | Orc, Rattlesnake, Troll |
| T-Z | Boss | Red (#FF4444) | Vampire, Wraith, Xeroc, Yeti, Zombie |

---

## CSS Classes

#### `getCSSClass(visibilityState: VisibilityState, entityType?: string): string`
Returns CSS class for styling.

**Format**: `tile-{state}` or `tile-{state} {type}`

**Examples**:
```typescript
service.getCSSClass('visible')          // "tile-visible"
service.getCSSClass('explored', 'monster') // "tile-explored monster"
```

---

## Three-State Visibility System

### Visible (In FOV)
- **Full color rendering**
- All entities visible (monsters, items, gold, stairs, traps)
- Player's current field of view
- Updated every turn based on light radius

### Explored (Memory/Fog of War)
- **Dimmed grayscale rendering** (`#707070`)
- Tiles: Show terrain
- Monsters: **Hidden** (never shown in memory)
- Items/Gold: Optional (config setting)
- Stairs/Traps: Shown (if discovered)
- Player has been here before

### Unexplored (Unknown)
- **Black** (`#000000`)
- Nothing rendered
- Player has never seen this area

---

## Rendering Pipeline

**Typical flow**:
```typescript
// 1. Compute visibility state
const visState = service.getVisibilityState(pos, visibleCells, level)

// 2. Check if entity should render
const shouldRender = service.shouldRenderEntity(pos, 'monster', visState, config)

// 3. Get appropriate color
const color = visState === 'visible'
  ? service.getColorForEntity(monster, visState)
  : '#707070'  // Dimmed for explored
```

---

## Config Pattern

**RenderConfig** allows UI customization:

```typescript
// Classic mode: Items/gold hidden in memory
const classicConfig: RenderConfig = {
  showItemsInMemory: false,
  showGoldInMemory: false,
}

// Accessible mode: Items/gold visible in memory
const accessibleConfig: RenderConfig = {
  showItemsInMemory: true,
  showGoldInMemory: true,
}
```

**Use Case**: Player accessibility options or difficulty modes.

---

## Immutability

All methods are **pure functions** - no state mutations.

**Input**: Position, visibility data, config
**Output**: Visibility state, render decision, color

---

## Usage in UI

### Tile Rendering
```typescript
// For each tile
const visState = renderingService.getVisibilityState(pos, visibleCells, level)
const color = renderingService.getColorForTile(tile, visState)
const cssClass = renderingService.getCSSClass(visState)

element.textContent = tile.char
element.style.color = color
element.className = cssClass
```

### Entity Rendering
```typescript
// For each monster
const visState = renderingService.getVisibilityState(monster.position, visibleCells, level)
const shouldRender = renderingService.shouldRenderEntity(
  monster.position,
  'monster',
  visState,
  config
)

if (shouldRender) {
  const color = renderingService.getColorForEntity(monster, visState)
  // Render monster with color
}
```

---

## Testing

**Test Files**:
- `visibility-states.test.ts` - State determination
- `entity-rendering.test.ts` - Render rules
- `color-selection.test.ts` - Color algorithms

**Example Test**:
```typescript
describe('RenderingService - Visibility', () => {
  test('monsters only render in FOV', () => {
    const shouldRender = service.shouldRenderEntity(
      pos,
      'monster',
      'explored',  // In memory, not FOV
      config
    )

    expect(shouldRender).toBe(false)
  })

  test('stairs render in both visible and explored', () => {
    expect(service.shouldRenderEntity(pos, 'stairs', 'visible', config)).toBe(true)
    expect(service.shouldRenderEntity(pos, 'stairs', 'explored', config)).toBe(true)
  })
})
```

---

## Design Rationale

### Why Monsters Only in FOV?

**Original Rogue behavior** - prevents exploiting memory to track monsters.

**Benefits**:
- Monsters feel more threatening (can ambush from explored tiles)
- Encourages cautious exploration
- Forces player to re-scout areas

### Why Dimmed Colors for Explored?

**Visual clarity** - player can distinguish:
- Where they are (bright FOV)
- Where they've been (dim memory)
- Where they haven't explored (black)

**Inspiration**: Nethack, DCSS fog of war systems

---

## Related Services

- **FOVService** - Computes `visibleCells` set used for visibility checks
- **LightingService** - Determines FOV radius from light source
- **UI Renderer** - Consumes color/visibility data for DOM rendering

---

## Future Enhancements (Phase 5)

- **Item color coding** by type (potions, scrolls, wands)
- **Identified vs unidentified** item colors
- **Magical auras** for enchanted items
- **Status effects** coloring (poisoned, confused)
