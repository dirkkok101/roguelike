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
- **Separation of Concerns**: Pure rendering, no game logic

---

## Architecture

### File Location
```
src/ui/
├── CanvasGameRenderer.ts          # Renderer implementation
├── CanvasGameRenderer.test.ts     # Unit tests (34 tests)
└── GameRenderer.ts                # Main UI coordinator
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
  enableDirtyRectangles: boolean  // true for optimization (future)
  exploredOpacity: number     // 0.5 for dimming
  detectedOpacity: number     // 0.6 for detected entities
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
  enableDirtyRectangles: true,
  exploredOpacity: 0.5,       // 50% dim for explored tiles
  detectedOpacity: 0.6,       // 60% opacity for detected monsters
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
1. Verify tileset is loaded (skip if not)
2. Clear canvas (fill with black)
3. Render terrain (floor, walls, doors, stairs)
4. Render entities (items, gold, monsters, traps)
5. Render player (always on top)

**Example:**
```typescript
// In game loop
function gameLoop() {
  renderer.render(gameState)
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
1. Check tileset loaded → skip if not
  ↓
2. Clear canvas (black background)
  ↓
3. renderTerrain(state)
   - Loop through 80×22 grid
   - Get tile character (., #, +, <, >, etc.)
   - Look up sprite via AssetLoaderService
   - Get visibility state (visible/explored/unexplored)
   - Draw with appropriate opacity
  ↓
4. renderEntities(state)
   - Render items (bottom layer)
   - Render gold piles
   - Render monsters (top layer)
   - Render stairs
   - Render discovered traps
  ↓
5. renderPlayer(state)
   - Always at full opacity
   - Always on top
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
- **Draw Calls**: ~500-800 per frame (depends on FOV size)
- **Target FPS**: 60 FPS
- **Actual FPS**: ~200-300 FPS on modern hardware

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

### Future Optimizations (Phase 4)

1. **Dirty Rectangles**: Only redraw changed tiles
2. **Sprite Batching**: Group draws by texture
3. **Offscreen Canvas**: Pre-composite layers
4. **RequestAnimationFrame Throttling**: Skip frames if GPU overloaded

---

## Testing

### Test Coverage

- **File**: `CanvasGameRenderer.test.ts`
- **Tests**: 34 passing
- **Coverage**: >80%

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

**Last Updated**: 2025-10-09
**Phase**: Sprite Rendering Implementation (Phase 1-3 Complete)
