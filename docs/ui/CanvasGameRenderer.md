# CanvasGameRenderer

**Type**: UI Component
**Responsibilities**: Render game state to HTML5 Canvas using sprite tiles
**Dependencies**: `RenderingService`, `AssetLoaderService`
**Created**: Phase 2 - Sprite Rendering Implementation

---

## Overview

The `CanvasGameRenderer` is a sprite-based game renderer that uses HTML5 Canvas and 2D sprites from a tileset to render the dungeon view. It replaces the previous text-based ASCII rendering with hardware-accelerated graphical rendering.

### Key Features

- **Sprite-Based Rendering**: Uses 32×32 pixel tiles from Gervais tileset
- **Hardware Acceleration**: Leverages GPU via Canvas 2D API
- **Visibility States**: Applies opacity based on FOV (visible, explored, unexplored)
- **Color Tinting**: Dynamic threat-level coloring for monsters
- **Render Order**: Correct z-ordering (terrain → items → gold → monsters → player)
- **Pixel-Perfect**: Disabled image smoothing for crisp pixel art
- **Scroll Margin Camera**: NetHack-style deadzone camera for smooth viewport scrolling
- **Dirty Rectangle Optimization**: Only redraws changed tiles (~99% reduction in draw calls)
- **Separation of Concerns**: Pure rendering, no game logic

---

## Architecture

### File Location
```
src/ui/
├── CanvasGameRenderer.ts                    # Renderer implementation
├── CanvasGameRenderer.test.ts               # Basic rendering tests (34 tests)
├── CanvasGameRenderer.camera.test.ts        # Camera system tests (35 tests)
├── CanvasGameRenderer.integration.test.ts   # Integration tests (6 tests)
└── GameRenderer.ts                          # Main UI coordinator
```

### Dependencies

```
CanvasGameRenderer
  ├─ RenderingService  (visibility states, entity colors)
  ├─ AssetLoaderService  (sprite coordinate lookups)
  └─ HTMLCanvasElement  (browser API)
```

---

## Configuration

### CanvasRenderConfig

```typescript
export interface CanvasRenderConfig {
  tileWidth: number           // 32 pixels
  tileHeight: number          // 32 pixels
  gridWidth: number           // 80 tiles
  gridHeight: number          // 22 tiles
  enableSmoothing: boolean    // false for pixel art
  enableDirtyRectangles: boolean  // true for optimization ✅ Implemented
  exploredOpacity: number     // 0.5 for dimming
  detectedOpacity: number     // 0.6 for detected entities
  scrollMarginX: number       // 10 tiles - horizontal scroll deadzone
  scrollMarginY: number       // 5 tiles - vertical scroll deadzone
}
```

**Default Configuration:**
```typescript
{
  tileWidth: 32,
  tileHeight: 32,
  gridWidth: 80,
  gridHeight: 22,
  enableSmoothing: false,     // Crisp pixel art
  enableDirtyRectangles: true,  // ✅ Dirty rectangle optimization
  exploredOpacity: 0.5,       // 50% dim for explored tiles
  detectedOpacity: 0.6,       // 60% opacity for detected monsters
  scrollMarginX: 10,          // 10 tiles horizontal deadzone
  scrollMarginY: 5,           // 5 tiles vertical deadzone
}
```

---

## Public API

### Constructor

```typescript
constructor(
  private renderingService: RenderingService,
  private assetLoader: AssetLoaderService,
  private canvasElement: HTMLCanvasElement,
  config?: Partial<CanvasRenderConfig>
)
```

**Example:**
```typescript
const canvas = document.createElement('canvas')
canvas.width = 2560  // 80 tiles × 32px
canvas.height = 704  // 22 tiles × 32px

const renderer = new CanvasGameRenderer(
  renderingService,
  assetLoaderService,
  canvas,
  {
    exploredOpacity: 0.4,  // Custom dimming
    detectedOpacity: 0.7   // Custom detection opacity
  }
)
```

---

### Core Methods

#### `render(state: GameState): void`

Render the complete game state to canvas.

**Rendering Pipeline:**
1. Update camera position (scroll margin system)
2. Calculate dirty tiles (changed since last frame)
3. Decide rendering strategy:
   - If >30% tiles dirty → full render (faster)
   - Otherwise → selective render (dirty tiles only)
4. Render using chosen strategy:
   - **Full Render**: Clear canvas, render terrain → entities → player
   - **Selective Render**: Clear dirty tiles, render only those tiles
5. Update previous state for next frame's diff

**Example:**
```typescript
// In game loop
function gameLoop() {
  renderer.render(gameState)  // Automatically optimizes via dirty rectangles
  requestAnimationFrame(gameLoop)
}
```

---

#### `clear(): void`

Clear the canvas and fill with black background.

**Implementation:**
```typescript
this.ctx.clearRect(0, 0, width, height)
this.ctx.fillStyle = '#000000'
this.ctx.fillRect(0, 0, width, height)
```

---

#### `drawTile(x, y, sprite, opacity, tintColor?): void`

Draw a single sprite tile at grid position.

**Parameters:**
- `x`: Grid X coordinate (0-79)
- `y`: Grid Y coordinate (0-21)
- `sprite`: TileCoordinate from AssetLoaderService
- `opacity`: Opacity (0.0-1.0)
- `tintColor`: Optional hex color for tinting (e.g., `'#FF4444'`)

**Example:**
```typescript
const sprite = assetLoader.getSprite('.')
renderer.drawTile(10, 5, sprite, 1.0)  // Full opacity

renderer.drawTile(10, 5, sprite, 0.5)  // 50% dim

renderer.drawTile(10, 5, sprite, 1.0, '#FF4444')  // Red tint
```

**Color Tinting:**
Uses multiply blend composite operation:
1. Draw sprite normally
2. Apply `globalCompositeOperation = 'multiply'`
3. Fill rectangle with tint color
4. Reset composite operation

---

#### `worldToScreen(pos: Position): { x, y }`

Convert grid coordinates to screen pixel coordinates.

**Formula:**
```
screenX = gridX × tileWidth
screenY = gridY × tileHeight
```

**Example:**
```typescript
const screen = renderer.worldToScreen({ x: 10, y: 5 })
// Returns: { x: 320, y: 160 }
```

---

#### `updateCamera(state: GameState): void` (Private)

Update camera position using scroll margin system.

**Scroll Margin Behavior:**
- **Initial Centering**: Centers camera on player when entering new level
- **Comfort Zone**: Player can move within center area without camera scrolling
- **Scroll Triggers**: Camera scrolls when player enters margin zones
- **Edge Clamping**: Prevents showing off-map areas

**Margin Zones:**
- Horizontal: 10 tiles from left/right edges
- Vertical: 5 tiles from top/bottom edges
- Comfort zone: 60×12 tile center area (80-10-10 = 60 wide, 22-5-5 = 12 tall)

**Level Transitions:**
- Detects level changes via `currentLevel` comparison
- Re-centers camera on player when level changes
- Stores previous level and player position for diff tracking

---

#### `calculateDirtyTiles(state: GameState): Set<string>` (Private)

Calculate which tiles changed since last frame.

**Change Detection:**
- **Camera scroll**: Entire viewport marked dirty (early return)
- **Player movement**: Old + new position marked dirty
- **Monster movement**: All moved monster positions marked dirty
- **FOV changes**: Visibility state transitions marked dirty

**Returns:** Set of tile coordinates `"x,y"` that need redrawing

**Performance:** Typical player movement = 2-10 dirty tiles (vs 1,760 total tiles)

---

### Getter Methods

#### `getCanvas(): HTMLCanvasElement`
Returns the underlying canvas element.

#### `getConfig(): CanvasRenderConfig`
Returns a copy of the rendering configuration.

---

## Rendering Pipeline

### Complete Rendering Flow

```
render(state)
  ↓
1. Update camera position (scroll margin system)
   - Check for level transition → re-center if changed
   - Check scroll margin triggers → scroll if needed
   - Clamp to map boundaries
  ↓
2. Calculate dirty tiles (changed since last frame)
   - Camera scrolled? → mark all tiles dirty
   - Player moved? → mark old + new position dirty
   - Monsters moved? → mark all moved positions dirty
   - FOV changed? → mark visibility transitions dirty
  ↓
3. Decide rendering strategy
   - Count dirty tiles
   - If >30% (528+ tiles) → use full render (faster)
   - Otherwise → use selective render
  ↓
4a. Full Render Path:
   - Clear canvas (black background)
   - renderTerrain(state) - Loop 80×22 grid
   - renderEntities(state) - Items, gold, monsters, stairs, traps
   - renderPlayer(state) - Player on top
  ↓
4b. Selective Render Path:
   - For each dirty tile:
     - clearTile() - Clear tile rectangle
     - renderTileAt() - Render terrain + entities + player at position
  ↓
5. Update previous state for next frame
   - Store visible cells set
   - Store monster positions map
   - Store camera offsets
```

---

## Visibility States

### Three-State System

| State | Opacity | Render? | Description |
|-------|---------|---------|-------------|
| **Visible** | 1.0 | ✓ Yes | In FOV, full brightness |
| **Explored** | 0.5 | ✓ Yes | Memory, dimmed |
| **Unexplored** | — | ✗ No | Never seen, not rendered |

### Entity-Specific Rules

| Entity Type | Visible | Explored | Unexplored |
|-------------|---------|----------|------------|
| **Terrain** (., #, +) | Full (1.0) | Dim (0.5) | Hidden |
| **Monsters** | Full (1.0) + Color | Hidden | Hidden |
| **Items** | Full (1.0) | Dim (0.5) | Hidden |
| **Gold** | Full (1.0) | Hidden | Hidden |
| **Stairs** | Full (1.0) | Dim (0.5) | Hidden |
| **Player** | Full (1.0) | — | — |

**Special Cases:**
- **Detected Monsters**: Render at `detectedOpacity` (0.6) when detected but not visible
- **Items in Memory**: Configurable via `showItemsInMemory` (default: true)
- **Gold in Memory**: Configurable via `showGoldInMemory` (default: false)

---

## Color Tinting

### Monster Threat Levels

Colors are retrieved from `RenderingService.getColorForEntity()`:

| Monster Letter | Threat Level | Color | Hex |
|----------------|--------------|-------|-----|
| A-E | Low | Green | `#44FF44` |
| F-P | Medium | Yellow | `#FFDD00` |
| Q-U | High | Orange | `#FF8800` |
| V-Z | Boss | Red | `#FF4444` |

### Tinting Implementation

```typescript
// 1. Draw sprite normally
ctx.drawImage(tileset.image, srcX, srcY, w, h, destX, destY, w, h)

// 2. Apply color tint
if (tintColor) {
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = tintColor
  ctx.fillRect(destX, destY, w, h)
  ctx.globalCompositeOperation = 'source-over'  // Reset
}
```

**Effect**: Multiplies sprite colors by tint color, darkening and colorizing the sprite.

---

## Render Order (Z-Index)

Sprites are drawn in this order (bottom to top):

1. **Terrain** (floor, walls, doors, stairs)
2. **Items** (potions, scrolls, weapons, armor)
3. **Gold piles** ($)
4. **Monsters** (A-Z)
5. **Stairs** (<, >)
6. **Traps** (^)
7. **Player** (@) - Always on top

This ensures the player is always visible, and monsters appear on top of items.

---

## Usage Patterns

### Basic Setup

```typescript
// 1. Create canvas element
const canvas = document.createElement('canvas')
canvas.width = 2560   // 80 × 32
canvas.height = 704   // 22 × 32
canvas.id = 'dungeon-canvas'

// 2. Create renderer
const renderer = new CanvasGameRenderer(
  renderingService,
  assetLoaderService,
  canvas
)

// 3. Add to DOM
document.getElementById('dungeon').appendChild(canvas)

// 4. Render game state
renderer.render(gameState)
```

### Integration with GameRenderer

```typescript
// In GameRenderer.ts
export class GameRenderer {
  private canvasGameRenderer: CanvasGameRenderer | null = null

  private createDungeonView(): HTMLElement {
    const container = document.createElement('div')
    const canvas = document.createElement('canvas')
    canvas.width = 2560
    canvas.height = 704

    container.appendChild(canvas)

    // Initialize CanvasGameRenderer if tileset loaded
    if (this.assetLoader.isLoaded()) {
      this.canvasGameRenderer = new CanvasGameRenderer(
        this.renderingService,
        this.assetLoader,
        canvas
      )
    }

    return container
  }

  private renderDungeon(state: GameState): void {
    if (this.canvasGameRenderer) {
      // Sprite rendering
      this.canvasGameRenderer.render(state)
    } else {
      // Fallback to ASCII
      this.renderASCII(state)
    }
  }
}
```

---

## Performance Considerations

### Current Performance

- **Canvas Size**: 2560×704 pixels (80×22 tiles @ 32px)
- **Total Tiles**: 1,760 tiles (80×22)
- **Draw Calls (Full Render)**: ~500-800 per frame (depends on FOV size)
- **Draw Calls (Dirty Rects)**: ~2-50 per frame (typical: 5-10)
- **Reduction**: ~99% fewer draw calls with dirty rectangles
- **Target FPS**: 60 FPS
- **Actual FPS**: ~200-300 FPS on modern hardware (full render), ~500+ FPS (dirty rects)

### Optimization Techniques

#### 1. Image Smoothing Disabled
```typescript
ctx.imageSmoothingEnabled = false
```
Prevents anti-aliasing blur, keeps pixel art crisp, reduces GPU overhead.

#### 2. Opacity Batching
```typescript
ctx.globalAlpha = opacity
// Draw multiple sprites at same opacity
ctx.globalAlpha = 1.0  // Reset once
```

#### 3. Composite Operation Caching
```typescript
const prev = ctx.globalCompositeOperation
ctx.globalCompositeOperation = 'multiply'
// Apply tint
ctx.globalCompositeOperation = prev  // Restore
```

### Implemented Optimizations

1. ✅ **Dirty Rectangles** (Phase 4.1): Only redraws changed tiles
   - Tracks player movement, monster movement, FOV changes, camera scroll
   - 30% threshold heuristic (>30% dirty → full render is faster)
   - Typical reduction: 1,760 tiles → 2-10 tiles per frame

2. ✅ **Scroll Margin Camera** (Phase 3.5): NetHack-style deadzone system
   - Player moves visibly within comfort zone (60×12 tiles)
   - Camera only scrolls when entering margin zones
   - Smooth level transitions with automatic re-centering

### Future Optimizations (Optional)

1. **Sprite Batching**: Group draws by texture (if FPS target not met)
2. **Offscreen Canvas**: Pre-composite layers (if needed)
3. **RequestAnimationFrame Throttling**: Skip frames if GPU overloaded

---

## Testing

### Test Coverage

- **Files**: 3 test suites
  - `CanvasGameRenderer.test.ts` (34 tests) - Basic rendering
  - `CanvasGameRenderer.camera.test.ts` (35 tests) - Camera scroll margins
  - `CanvasGameRenderer.integration.test.ts` (6 tests) - Full gameplay scenarios
- **Total Tests**: 75 passing
- **Coverage**: >90% (98.69% lines, 95.16% statements)

### Test Categories

1. **Constructor & Setup** (4 tests)
   - Canvas dimensions
   - Image smoothing disabled
   - Error handling
   - Custom configuration

2. **Helper Methods** (6 tests)
   - `clear()` fills with black
   - `worldToScreen()` coordinate conversion
   - `drawTile()` sprite drawing
   - Opacity application
   - Missing tileset handling

3. **Rendering Pipeline** (11 tests)
   - Canvas cleared before rendering
   - Tileset loaded check
   - Visible tiles at full opacity
   - Explored tiles at reduced opacity
   - Unexplored tiles skipped

4. **Entity Rendering** (10 tests)
   - Monsters in visible FOV
   - Monsters not in explored state
   - Items in visible/explored states
   - Gold only in visible
   - Stairs in explored state
   - Traps (discovered only)
   - Detected monsters dimmed

5. **Player Rendering** (3 tests)
   - Player at correct position
   - Full opacity
   - Missing sprite handling

6. **Camera Scroll Margins** (35 tests)
   - Initial centering on level entry
   - Movement within comfort zone (no scroll)
   - Scroll triggers (left, right, top, bottom margins)
   - Edge clamping (map boundaries)
   - Level transitions (stairs up/down)
   - Small map handling (<viewport size)
   - Diagonal movement
   - Rapid movement sequences

7. **Integration Tests** (6 tests)
   - Full game loop with movement
   - Level navigation (stairs)
   - Combat scenarios near viewport edge
   - Multiple level transitions

---

## Known Issues & Limitations

### Missing Sprites

- Not all game entities have Angband sprite matches
- Monsters without matching names silently fail to render
- Future: Add fallback generic sprites

### Color Tinting Limitations

- Multiply blend darkens sprites (can make dark sprites too dark)
- Alternative: Additive blend or pre-rendered color variants
- Future: Experiment with different blend modes

### No Animation Support

- Sprites are static (no idle/attack animations)
- Future: Add sprite sheet animation support

### Dirty Rectangle Threshold

- 30% dirty threshold is a heuristic (may need tuning)
- Large FOV changes can trigger full renders
- Future: Benchmark optimal threshold per device

---

## Future Enhancements

1. **Animations**: Sprite animations (idle, walk, attack)
2. **Particle Effects**: Combat hits, spell effects, explosions
3. **Lighting Effects**: Torch glow, fire, magic auras
4. **Camera Shake**: Screen shake on damage/explosions
5. **Sprite Scaling**: Zoom in/out for different resolutions
6. **Multiple Layers**: Separate terrain/entity/effect layers

---

## Related Documentation

- [AssetLoaderService](../services/AssetLoaderService.md) - Sprite loading and lookup
- [RenderingService](../services/RenderingService.md) - Visibility states and colors
- [GameRenderer](./GameRenderer.ts) - Main UI coordinator
- [Architecture](../architecture.md) - UI layer architecture
- [Sprite Rendering Plan](../plans/sprite_rendering_plan.md) - Implementation plan

---

**Last Updated**: 2025-10-10
**Phase**: Sprite Rendering Implementation (Phase 1-4.1 Complete)
**Status**: ✅ Scroll margin camera system implemented (Phase 3.5) | ✅ Dirty rectangle optimization implemented (Phase 4.1)
