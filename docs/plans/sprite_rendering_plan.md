# Sprite-Based Rendering Implementation Plan

**Status**: 🚧 In Progress - Phase 3 Complete (2/3 tasks), Task 3.3 Optional
**Version**: 1.0
**Created**: 2025-10-09
**Last Updated**: 2025-10-09
**Owner**: Dirk Kok
**Related Docs**: [Architecture](../architecture.md) | [Core Systems](../systems-core.md) | [CLAUDE.md](../../CLAUDE.md)

---

## 1. Objectives

### Primary Goal
Replace ASCII text rendering with canvas-based 2D sprite rendering using the AngbandTK tileset (32×32 tiles), while maintaining all existing game logic, visibility states, and FOV calculations unchanged.

### Design Philosophy
- **Separation of Concerns**: Game logic remains 100% independent of rendering implementation
- **Performance First**: Use hardware-accelerated canvas rendering for smooth 60 FPS gameplay
- **Backward Compatibility**: Maintain ability to toggle between ASCII and sprite rendering
- **Asset Efficiency**: Use sprite atlases and tile-based rendering for optimal performance
- **Incremental Migration**: Phase implementation to minimize risk and allow testing at each step

### Success Criteria
- [ ] Canvas renderer displays all game entities using AngbandTK sprites
- [ ] Visibility states (visible/explored/unexplored) correctly applied to sprites
- [ ] FOV calculations unchanged - RenderingService logic untouched
- [ ] Performance: Maintain 60 FPS on 80×22 grid with full dungeon visible
- [ ] Color system adapted: Monster threat colors, status effects, dimming for explored tiles
- [ ] All existing tests pass without modification
- [ ] New sprite rendering tests achieve >80% coverage
- [ ] Architecture follows CLAUDE.md principles (layered architecture, immutability)
- [ ] Documentation updated with sprite system details

---

## 2. Context & Related Documentation

### Relevant Game Design Docs
- [Core Systems - Visibility & Color System](../systems-core.md#visibility-color-system)
- [Core Systems - Rendering Service](../systems-core.md#renderingservice)
- [Architecture - UI Layer](../architecture.md#architecture-layers)

### Related Systems
- **RenderingService**: Determines visibility states (visible/explored/unexplored) - UNCHANGED
- **FOVService**: Calculates visible cells using shadowcasting - UNCHANGED
- **GameRenderer**: Current text-based renderer - REPLACED with CanvasGameRenderer
- **Debug Overlays**: Already uses canvas for FOV/pathfinding visualization - REFERENCE for canvas patterns

### Research Summary
**AngbandTK Tileset (David Gervais 32×32)**:
- Created by David Gervais for Angband (classic roguelike)
- **Single PNG file**: `32x32.png` containing all sprites in a grid
- **Three .prf files** (text-based tile mappings):
  - `graf-dvg.prf` - Main mappings (terrain, monsters, objects)
  - `flvr-dvg.prf` - Flavored items (colored potions, rings, scrolls)
  - `xtra-dvg.prf` - Player character variants (by class/race)
- **Coordinate System**: Hexadecimal `0xYY:0xXX` format, base offset `0x80:0x80`
  - Conversion: `pixelX = (0xXX - 0x80) * 32`, `pixelY = (0xYY - 0x80) * 32`
  - Example: `0x81:0x83` → pixel position (96, 32)
- **Source**: https://github.com/angband/angband/tree/master/lib/tiles/gervais
- License: Free to use in open source projects (Angband license, verify specifics)

**Canvas Rendering Benefits**:
- Hardware acceleration (GPU compositing)
- Efficient dirty rectangle updates
- Native support for sprite atlases (drawImage with source/dest rectangles)
- CSS-independent (no reflow/repaint overhead)
- Supports advanced effects (particle systems, animations, lighting)

---

## 3. Phases & Tasks

### Phase 1: Asset Integration & Infrastructure (Priority: HIGH)

**Objective**: Set up sprite asset loading, tileset configuration, and asset management service

#### Task 1.1: Download and Organize AngbandTK Tileset

**Context**: Download David Gervais 32×32 tileset from Angband GitHub repository

**Files to create/modify**:
- `public/assets/tilesets/gervais/` (new directory)
- `public/assets/tilesets/gervais/32x32.png` (sprite sheet)
- `public/assets/tilesets/gervais/graf-dvg.prf` (main tile mappings)
- `public/assets/tilesets/gervais/flvr-dvg.prf` (flavored items)
- `public/assets/tilesets/gervais/xtra-dvg.prf` (player variants)
- `public/assets/tilesets/gervais/LICENSE.txt` (attribution)

##### Subtasks:
- [x] Download assets from https://github.com/angband/angband/tree/master/lib/tiles/gervais
  - Download `32x32.png` (single sprite sheet)
  - Download `graf-dvg.prf` (main mappings)
  - Download `flvr-dvg.prf` (flavored items)
  - Download `xtra-dvg.prf` (player variants)
- [x] Create `public/assets/tilesets/gervais/` directory
- [x] Copy downloaded files to public directory
- [x] Verify tileset license (Angband license, free for open source use)
- [x] Create `LICENSE.txt` with attribution to David Gervais and Angband project
- [x] Git commit: "chore: add Gervais 32x32 tileset from Angband (Phase 1.1)"

---

#### Task 1.2: Create .prf Parser and Type Definitions

**Context**: Define TypeScript interfaces for parsing Angband .prf tile mapping files

**Files to create/modify**:
- `src/types/assets/assets.ts` (new file)
- `src/utils/prfParser.ts` (new file - .prf file parser)

##### Subtasks:
- [x] Create `src/types/assets/assets.ts` with TypeScript interfaces:
  ```typescript
  export interface TilesetConfig {
    name: string
    tileWidth: number           // 32
    tileHeight: number          // 32
    imageUrl: string            // "/assets/tilesets/gervais/32x32.png"
    tiles: Map<string, TileCoordinate>  // Character → sprite mapping
  }

  export interface TileCoordinate {
    x: number        // Pixel X offset (calculated from hex)
    y: number        // Pixel Y offset (calculated from hex)
    hexX: number     // Original hex value (0xXX)
    hexY: number     // Original hex value (0xYY)
  }

  export interface Tileset {
    config: TilesetConfig
    image: HTMLImageElement
    isLoaded: boolean
  }

  export interface PrfEntry {
    type: 'feat' | 'monster' | 'object' | 'trap'
    name: string
    category?: string   // e.g., 'sword', 'FLOOR'
    condition?: string  // e.g., 'torch', '*'
    hexY: number        // 0xYY attribute
    hexX: number        // 0xXX character
  }
  ```
- [x] Create `src/utils/prfParser.ts`:
  - `parsePrfFile(content: string): PrfEntry[]` - Parse .prf text format
  - `hexToPixel(hex: number, tileSize: number): number` - Convert 0x80-based hex to pixel offset
  - Handle .prf format: `feat:FLOOR:torch:0x96:0x80`, `monster:Bat:0x8B:0x81`, etc.
- [x] Add path alias to `tsconfig.json`: `"@assets/*": ["src/types/assets/*"]`
- [x] Git commit: "feat: create .prf parser and tileset type definitions (Phase 1.2)"

---

#### Task 1.3: Implement AssetLoaderService

**Context**: Service to load sprite sheets and parse .prf mapping files asynchronously

**Files to create/modify**:
- `src/services/AssetLoaderService/AssetLoaderService.ts`
- `src/services/AssetLoaderService/asset-loading.test.ts`
- `src/services/AssetLoaderService/prf-parsing.test.ts`
- `src/services/AssetLoaderService/index.ts`

##### Subtasks:
- [x] Create `AssetLoaderService` with methods:
  - `loadTileset(imageUrl: string, prfFiles: string[]): Promise<Tileset>`
  - `getSprite(char: string): TileCoordinate | null`
  - `getSpriteByName(type: string, name: string): TileCoordinate | null`
  - `isLoaded(): boolean`
- [x] Implement PNG image preloading using `Image` objects
- [x] Implement .prf file fetching and parsing:
  - Fetch each .prf file (graf-dvg.prf, flvr-dvg.prf, xtra-dvg.prf)
  - Parse using `prfParser.parsePrfFile()`
  - Convert hex coordinates to pixel offsets
  - Build Map<string, TileCoordinate> for fast lookups
- [x] Add error handling:
  - Missing image file (404)
  - Missing .prf files (404)
  - Malformed .prf syntax
  - Network errors
- [x] Cache loaded tilesets in Map (support multiple tilesets)
- [x] Write unit tests:
  - Load tileset successfully (PNG + .prf files)
  - Parse .prf format correctly (feat, monster, object, trap entries)
  - Hex to pixel conversion accuracy
  - Handle missing assets (404 error)
  - Handle malformed .prf syntax
  - Cache behavior (avoid duplicate loads)
  - Get sprite coordinates for valid/invalid characters
- [x] Create barrel export `index.ts`
- [x] Git commit: "feat: implement AssetLoaderService with .prf parsing (Phase 1.3)"

---

#### Task 1.4: Add Tileset Preloading to Game Initialization

**Context**: Load sprites before starting game to avoid flicker/delays

**Files to create/modify**:
- `src/main.ts` (modify)
- `src/ui/LoadingScreen.ts` (new file - optional)

##### Subtasks:
- [x] Modify `src/main.ts` to preload tileset before game starts:
  ```typescript
  const assetLoader = new AssetLoaderService()
  await assetLoader.loadTileset(
    '/assets/tilesets/gervais/32x32.png',
    [
      '/assets/tilesets/gervais/graf-dvg.prf',
      '/assets/tilesets/gervais/flvr-dvg.prf',
      '/assets/tilesets/gervais/xtra-dvg.prf'
    ]
  )
  // Then initialize game renderer with loaded tileset
  ```
- [x] Add loading indicator (optional): "Loading sprites..." text or progress bar
- [x] Handle loading errors gracefully (fallback to ASCII or show error screen)
- [x] Git commit: "feat: add tileset preloading to game initialization (Phase 1.4)"

---

### Phase 2: Canvas Renderer Implementation (Priority: HIGH)

**Objective**: Create new canvas-based renderer that uses sprites instead of text

#### Task 2.1: Create CanvasGameRenderer Core Structure

**Context**: New renderer class that replaces text-based GameRenderer for dungeon view

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts`
- `src/ui/CanvasGameRenderer.test.ts` (unit tests)

##### Subtasks:
- [x] Create `CanvasGameRenderer` class with constructor:
  ```typescript
  constructor(
    private renderingService: RenderingService,
    private assetLoader: AssetLoaderService,
    private canvasElement: HTMLCanvasElement,
    private config: CanvasRenderConfig
  )
  ```
- [x] Implement `render(state: GameState): void` method stub
- [x] Set up canvas context and initial configuration:
  - Canvas size: 80 tiles × 22 tiles × 32px = 2560×704 pixels
  - Enable image smoothing: `ctx.imageSmoothingEnabled = false` (pixel art)
  - Set up coordinate transformation (if needed)
- [x] Add helper methods:
  - `clear(): void` - Clear canvas
  - `drawTile(x: number, y: number, sprite: TileCoordinate, opacity: number): void`
  - `worldToScreen(pos: Position): { x: number, y: number }`
- [x] Write basic tests (canvas context mocking with jest-canvas-mock)
- [x] Git commit: "feat: create CanvasGameRenderer core structure (Phase 2.1)"

---

#### Task 2.2: Implement Terrain Rendering

**Context**: Render floor, walls, corridors, doors using sprites

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)
- `src/ui/CanvasGameRenderer.test.ts` (add tests)

##### Subtasks:
- [x] Implement `renderTerrain(state: GameState): void`:
  - Loop through 80×22 grid
  - Get tile character from `level.tiles[y][x].char`
  - Look up sprite coordinates from AssetLoaderService
  - Get visibility state from RenderingService
  - Draw sprite with appropriate opacity (visible=1.0, explored=0.5, unexplored=skip)
- [x] Handle special cases:
  - Doors: Different sprites for open/closed/locked states
  - Stairs: `<` (up) and `>` (down)
  - Traps: Only if discovered
- [x] Test scenarios:
  - Visible tile rendered at full opacity
  - Explored tile rendered at 50% opacity
  - Unexplored tile not rendered
  - Correct sprite coordinates used for each tile type
- [x] Git commit: "feat: implement terrain rendering in CanvasGameRenderer (Phase 2.2)"

---

#### Task 2.3: Implement Entity Rendering (Monsters, Items, Gold)

**Context**: Render monsters, items, gold piles on top of terrain

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)
- `src/ui/CanvasGameRenderer.test.ts` (add tests)

##### Subtasks:
- [x] Implement `renderEntities(state: GameState): void`:
  - Render gold piles (`$`)
  - Render items (potions, scrolls, weapons, armor, rings, etc.)
  - Render monsters (A-Z letters)
  - Respect visibility rules (RenderingService.shouldRenderEntity)
- [x] Apply correct rendering order (terrain → items → gold → monsters → player)
- [x] Handle detection effects:
  - Detected monsters (dimmed if not in FOV)
  - Detected magic items (dimmed if not in FOV)
- [x] Test scenarios:
  - Monster only rendered when visible (not in explored state)
  - Items rendered in visible and explored (if config.showItemsInMemory)
  - Gold rendered only when visible
  - Detected entities rendered with dimming
- [x] Git commit: "feat: implement entity rendering (monsters, items, gold) (Phase 2.3)"

---

#### Task 2.4: Implement Player Rendering

**Context**: Render player character (@) on top of all other entities

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [x] Implement `renderPlayer(state: GameState): void`
- [x] Get player sprite from tileset (`@` character)
- [x] Render at player.position with full opacity
- [x] Consider player status effects (future: add visual indicators for confusion, haste, etc.)
- [x] Git commit: "feat: implement player rendering (Phase 2.4)"

---

#### Task 2.5: Integrate CanvasGameRenderer into Main Game Loop

**Context**: Replace text-based GameRenderer with CanvasGameRenderer

**Files to create/modify**:
- `src/main.ts` (modify)
- `src/ui/GameRenderer.ts` (modify - keep stats/messages, only replace dungeon view)

##### Subtasks:
- [x] Create canvas element for dungeon view:
  ```typescript
  const dungeonCanvas = document.createElement('canvas')
  dungeonCanvas.width = 2560  // 80 tiles × 32px
  dungeonCanvas.height = 704  // 22 tiles × 32px
  dungeonCanvas.className = 'dungeon-canvas'
  ```
- [x] Replace `<pre>` dungeon view with canvas in GameRenderer
- [x] Keep text-based rendering for stats panel and messages (unchanged)
- [x] Wire up CanvasGameRenderer.render() in game loop
- [x] Pass AssetLoaderService to GameRenderer constructor
- [x] Test in browser: Verify sprites render correctly
- [x] Git commit: "feat: integrate CanvasGameRenderer into main game loop (Phase 2.5)"

---

### Phase 3: Color System & Visibility Effects (Priority: HIGH)

**Objective**: Apply color tinting, threat-level coloring, and visibility dimming to sprites

#### Task 3.1: Implement Color Tinting System

**Context**: Apply dynamic colors to sprites (monster threat levels, status indicators)

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)
- `src/services/ColorService/ColorService.ts` (new service - optional)

##### Subtasks:
- [x] Research canvas color tinting techniques:
  - Option A: Use `ctx.globalCompositeOperation = 'multiply'` with colored rectangle overlay ← IMPLEMENTED
  - Option B: Use `ctx.filter = 'hue-rotate() brightness() saturate()'`
  - Option C: Pre-render colored sprite variants (less flexible, more performant)
- [x] Implement chosen technique in `drawTile()` method
- [x] Apply monster threat-level colors (from RenderingService.getColorForEntity):
  - Low threat (A-E): Green (#44FF44)
  - Medium threat (F-P): Yellow (#FFDD00)
  - High threat (Q-U): Orange (#FF8800)
  - Boss tier (V-Z): Red (#FF4444)
- [x] Test color accuracy in browser (compare to ASCII version)
- [x] Git commit: "feat: implement color tinting for sprites (Phase 3.1)"

---

#### Task 3.2: Implement Visibility Dimming & Opacity

**Context**: Apply opacity changes for explored vs visible states

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [x] Add opacity parameter to `drawTile()`:
  - Visible state: `opacity = 1.0`
  - Explored state: `opacity = 0.5`
  - Unexplored: Don't render
- [x] Apply opacity using `ctx.globalAlpha`:
  ```typescript
  ctx.globalAlpha = opacity
  ctx.drawImage(...)
  ctx.globalAlpha = 1.0  // Reset
  ```
- [x] Verify fog-of-war effect matches ASCII version
- [x] Test: Explored tiles should be dimmed but still visible
- [x] Git commit: "feat: implement visibility dimming with opacity (Phase 3.2)" (completed in Phase 2)

---

#### Task 3.3: Implement Desaturation for Explored Tiles (Optional Enhancement)

**Context**: Make explored tiles grayscale (like ASCII version) for better visual distinction

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [ ] Add desaturation filter for explored tiles:
  ```typescript
  if (visibilityState === 'explored') {
    ctx.filter = 'saturate(0) brightness(0.5)'  // Grayscale + dim
  }
  ctx.drawImage(...)
  ctx.filter = 'none'  // Reset
  ```
- [ ] Test visual effect matches ASCII explored colors
- [ ] Make configurable (user preference: color vs grayscale for explored)
- [ ] Git commit: "feat: add desaturation for explored tiles (Phase 3.3)"

---

### Phase 3.5: Viewport Scrolling & Camera System (Priority: HIGH)

**Objective**: Implement a NetHack-style scroll margin camera system that allows the player to move visibly within the viewport while only scrolling when approaching edges. Replace the current always-centered camera which makes it feel like the map is moving rather than the player moving.

**Context**:
- **Current Issue**: Camera always centers on player, making it feel like the map moves instead of the player
- **Research**: NetHack uses scroll margins, Angband uses panel-based or centered mode, classic roguelikes favor deadzone approaches
- **Viewport Analysis**:
  - Canvas Size: 2560×704px
  - Tile Size: 32×32px
  - Grid Dimensions: 80×22 tiles (2560÷32 = 80 wide, 704÷32 = 22 tall)
  - Map Size: Varies by level, typically 80-100 tiles wide × 40-60 tiles tall

**Scroll Margin Design**:
- **Horizontal Margins**: 10 tiles from left/right edges
- **Vertical Margins**: 5 tiles from top/bottom edges
- **Comfort Zone**: 60×12 tile center area where player can move without scrolling
- **Behavior**: Camera only scrolls when player enters margin zones

#### Task 3.5.1: Add Scroll Margin Configuration

**Context**: Extend CanvasRenderConfig with scroll margin settings and camera state tracking

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [ ] Add to `CanvasRenderConfig` interface:
  ```typescript
  scrollMarginX: number  // Default: 10 tiles (horizontal deadzone)
  scrollMarginY: number  // Default: 5 tiles (vertical deadzone)
  ```
- [ ] Add private camera state fields to `CanvasGameRenderer` class:
  ```typescript
  private isFirstRender: boolean = true         // For initial centering
  private previousLevel: number | null = null   // For level transition detection
  private previousPlayerPos: Position | null = null  // For movement detection
  ```
- [ ] Update constructor to initialize scroll margins with defaults
- [ ] Git commit: "feat: add scroll margin configuration to CanvasRenderer (Phase 3.5.1)"

---

#### Task 3.5.2: Implement Scroll Margin Camera Logic

**Context**: Replace simple centering with scroll margin-based camera positioning

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [ ] Create `updateCamera(state: GameState): void` method with algorithm:
  ```typescript
  private updateCamera(state: GameState): void {
    const playerPos = state.player.position
    const level = state.levels.get(state.currentLevel)
    if (!level) return

    // 1. Check for level transition (new level or first render)
    const levelChanged = this.previousLevel !== state.currentLevel
    if (levelChanged || this.isFirstRender) {
      // Center camera on player for new level
      this.cameraOffsetX = playerPos.x - Math.floor(this.config.gridWidth / 2)
      this.cameraOffsetY = playerPos.y - Math.floor(this.config.gridHeight / 2)
      this.isFirstRender = false
      this.previousLevel = state.currentLevel
    } else {
      // 2. Scroll margin mode (normal gameplay)
      // Horizontal scrolling
      if (playerPos.x < this.cameraOffsetX + this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.scrollMarginX
      } else if (playerPos.x >= this.cameraOffsetX + this.config.gridWidth - this.config.scrollMarginX) {
        this.cameraOffsetX = playerPos.x - this.config.gridWidth + this.config.scrollMarginX
      }

      // Vertical scrolling
      if (playerPos.y < this.cameraOffsetY + this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.scrollMarginY
      } else if (playerPos.y >= this.cameraOffsetY + this.config.gridHeight - this.config.scrollMarginY) {
        this.cameraOffsetY = playerPos.y - this.config.gridHeight + this.config.scrollMarginY
      }
    }

    // 3. Edge clamping (prevent showing off-map areas)
    const mapWidth = level.tiles[0]?.length || this.config.gridWidth
    const mapHeight = level.tiles.length || this.config.gridHeight

    this.cameraOffsetX = Math.max(0, Math.min(this.cameraOffsetX, mapWidth - this.config.gridWidth))
    this.cameraOffsetY = Math.max(0, Math.min(this.cameraOffsetY, mapHeight - this.config.gridHeight))

    // Store for next frame
    this.previousPlayerPos = { ...playerPos }
  }
  ```
- [ ] Call `updateCamera(state)` at start of `render(state)` method (before rendering)
- [ ] Remove old centering logic from `render()` method
- [ ] Git commit: "feat: implement scroll margin camera system (Phase 3.5.2)"

---

#### Task 3.5.3: Handle Level Transitions and Edge Cases

**Context**: Ensure camera behaves correctly for stairs navigation and small maps

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [ ] Add level transition detection in `updateCamera()`:
  - Compare `state.currentLevel` with `this.previousLevel`
  - If changed, trigger initial centering
- [ ] Handle small maps (smaller than viewport):
  ```typescript
  // If map width < viewport width, lock camera at X=0
  if (mapWidth <= this.config.gridWidth) {
    this.cameraOffsetX = 0
  }
  // Same for height
  if (mapHeight <= this.config.gridHeight) {
    this.cameraOffsetY = 0
  }
  ```
- [ ] Adjust scroll margins dynamically for small maps:
  ```typescript
  const effectiveMarginX = Math.min(this.config.scrollMarginX, Math.floor(mapWidth / 4))
  const effectiveMarginY = Math.min(this.config.scrollMarginY, Math.floor(mapHeight / 4))
  ```
- [ ] Add debug logging (removable after testing):
  ```typescript
  console.log(`[Camera] offset=(${this.cameraOffsetX}, ${this.cameraOffsetY}) player=(${playerPos.x}, ${playerPos.y}) level=${state.currentLevel}`)
  ```
- [ ] Git commit: "feat: handle level transitions and small maps in camera (Phase 3.5.3)"

---

#### Task 3.5.4: Write Comprehensive Camera Unit Tests

**Context**: Test all camera behaviors with scroll margins, transitions, and edge cases

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.camera.test.ts` (new file)

##### Subtasks:
- [ ] **Test Suite**: Camera Scroll Margin System
- [ ] **Scenario 1: Initial Centering on Level Entry**
  - Given: New level, player at (50, 30)
  - When: First render() called
  - Then: Camera centered at (50-40, 30-11) = (10, 19)
  - Verify: `cameraOffsetX = 10, cameraOffsetY = 19`

- [ ] **Scenario 2: Player Movement Within Comfort Zone**
  - Given: Camera at (10, 10), player at (50, 21), margins (10, 5)
  - When: Player moves to (51, 21) [still in comfort zone: X ∈ [20, 70], Y ∈ [15, 17]]
  - Then: Camera stays at (10, 10)
  - Verify: Camera did not scroll

- [ ] **Scenario 3: Player Approaches Right Edge (Scroll Right)**
  - Given: Camera at (10, 10), player at (69, 21), viewport 80×22
  - When: Player moves to (70, 21) [exits comfort zone: 10+(80-10) = 80]
  - Then: Camera scrolls to (70-(80-10), 10) = (0, 10)
  - Verify: `cameraOffsetX` updated

- [ ] **Scenario 4: Player Approaches Left Edge (Scroll Left)**
  - Given: Camera at (20, 10), player at (30, 21)
  - When: Player moves to (29, 21) [enters left margin: 20+10=30]
  - Then: Camera scrolls to (29-10, 10) = (19, 10)
  - Verify: `cameraOffsetX = 19`

- [ ] **Scenario 5: Player Approaches Bottom Edge (Scroll Down)**
  - Given: Camera at (10, 10), player at (50, 21)
  - When: Player moves to (50, 22) [exits comfort zone: 10+5=15, 10+(22-5)=27]
  - Then: Camera scrolls to (10, 22-(22-5)) = (10, 5)
  - Verify: `cameraOffsetY = 5`

- [ ] **Scenario 6: Player Approaches Top Edge (Scroll Up)**
  - Given: Camera at (10, 10), player at (50, 15)
  - When: Player moves to (50, 14) [enters top margin: 10+5=15]
  - Then: Camera scrolls to (10, 14-5) = (10, 9)
  - Verify: `cameraOffsetY = 9`

- [ ] **Scenario 7: Edge Clamping - Left/Top Map Boundary**
  - Given: Camera at (0, 0), player at (5, 5), map 80×50 tiles
  - When: Player moves to (3, 3) [would move camera to negative]
  - Then: Camera clamped at (0, 0)
  - Verify: `cameraOffsetX >= 0, cameraOffsetY >= 0`

- [ ] **Scenario 8: Edge Clamping - Right/Bottom Map Boundary**
  - Given: Map 80×50 tiles, viewport 80×22, player at (77, 47)
  - When: Player moves right (camera would exceed map width)
  - Then: Camera clamped at (max(0, 80-80), max(0, 50-22)) = (0, 28)
  - Verify: Camera doesn't show off-map areas

- [ ] **Scenario 9: Small Map - Width < Viewport**
  - Given: Map 60×50 tiles (< 80 viewport width)
  - When: render() called with player anywhere
  - Then: Camera locked at X=0 (entire width visible)
  - Verify: `cameraOffsetX = 0` always

- [ ] **Scenario 10: Small Map - Height < Viewport**
  - Given: Map 80×18 tiles (< 22 viewport height)
  - When: render() called with player anywhere
  - Then: Camera locked at Y=0 (entire height visible)
  - Verify: `cameraOffsetY = 0` always

- [ ] **Scenario 11: Level Transition via Stairs Down**
  - Given: Player on level 1 at (70, 30), camera at (30, 19)
  - When: Player takes stairs to level 2, spawns at (40, 25)
  - Then: Camera re-centers at (40-40, 25-11) = (0, 14)
  - Verify: `previousLevel` updated, camera centered

- [ ] **Scenario 12: Level Transition via Stairs Up**
  - Given: Player on level 2 at (20, 10), camera at (0, 0)
  - When: Player takes stairs to level 1, spawns at (15, 8)
  - Then: Camera re-centers at (15-40, 8-11) = (-25, -3) → clamped to (0, 0)
  - Verify: Level change detected, camera centered and clamped

- [ ] **Scenario 13: Rapid Movement Within Comfort Zone**
  - Given: Camera at (10, 10), player at (50, 21)
  - When: Player makes 5 moves within comfort zone
  - Then: Camera never scrolls
  - Verify: `cameraOffsetX` and `cameraOffsetY` unchanged

- [ ] **Scenario 14: Diagonal Movement Crossing Both Margins**
  - Given: Camera at (20, 10), player at (29, 14)
  - When: Player moves diagonally to (28, 13) [crosses both margins]
  - Then: Camera scrolls on both axes
  - Verify: Both `cameraOffsetX` and `cameraOffsetY` updated

- [ ] **Scenario 15: Map Reveal Debug Command**
  - Given: Camera at (10, 10), reveal entire map (all tiles explored)
  - When: render() called after reveal
  - Then: Camera position unchanged (player still in same position)
  - Verify: No unintended camera jump

- [ ] Achieve >90% coverage for camera logic
- [ ] Git commit: "test: comprehensive camera scroll margin tests (Phase 3.5.4)"

---

#### Task 3.5.5: Integration Testing with Real Gameplay

**Context**: Test camera system with actual game scenarios and player input

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.integration.test.ts` (new file)

##### Subtasks:
- [ ] **Integration Test 1: Full game loop with movement**
  - Start new game
  - Move player around starting room (no scrolling)
  - Move player toward corridor (camera scrolls)
  - Verify smooth camera following

- [ ] **Integration Test 2: Level navigation**
  - Complete level 1
  - Take stairs down to level 2
  - Verify camera re-centers on new level
  - Take stairs back up
  - Verify camera re-centers again

- [ ] **Integration Test 3: Combat while near edge**
  - Position player near viewport edge
  - Engage monster (movement during combat)
  - Verify camera scrolls appropriately

- [ ] **Integration Test 4: Multiple level transitions**
  - Navigate from level 1 → 2 → 3 → 2 → 1
  - Verify camera centers correctly each time

- [ ] Git commit: "test: camera integration tests with gameplay (Phase 3.5.5)"

---

#### Task 3.5.6: Manual Testing Checklist

**Context**: Human verification of camera feel and behavior

##### Manual Test Cases:
- [ ] **Test 1: Game start** - Camera centers on player in starting room
- [ ] **Test 2: Move around starting room** - Player moves visibly, no camera scroll
- [ ] **Test 3: Move toward room edge** - Camera scrolls smoothly when approaching viewport edge
- [ ] **Test 4: Move to level edge** - Camera clamps at map boundaries, no black space shown
- [ ] **Test 5: Take stairs down** - Camera re-centers on player on new level
- [ ] **Test 6: Take stairs up** - Camera re-centers on returning to previous level
- [ ] **Test 7: Navigate corridors** - Camera follows player appropriately through tight spaces
- [ ] **Test 8: Explore large room** - Player can explore room before camera scrolls
- [ ] **Test 9: Use reveal map debug (`v` key)** - Camera stays stable after revealing entire level
- [ ] **Test 10: Fast movement** - Rapidly move player in all directions, verify no jitter or lag
- [ ] **Test 11: Diagonal movement** - Camera scrolls smoothly on both axes when needed
- [ ] **Test 12: Play through 3 levels** - Verify consistent behavior across multiple levels

##### Subjective Feel Checks:
- [ ] Camera feels responsive (not laggy)
- [ ] Player movement feels natural (not like map is moving)
- [ ] Scroll margins feel appropriate (not too aggressive or too passive)
- [ ] No disorienting camera jumps
- [ ] Smooth transitions on level changes

---

#### Task 3.5.7: Update Documentation for Camera System

**Context**: Document the scroll margin camera system for future reference

**Files to create/modify**:
- `docs/systems-core.md` (modify)
- `docs/ui/CanvasGameRenderer.md` (new or modify)

##### Subtasks:
- [ ] Add "Camera & Viewport System" section to `docs/systems-core.md`:
  - Explain scroll margin concept
  - Document comfort zone dimensions
  - Describe level transition behavior
  - Include diagrams showing margin zones
  - Performance considerations

- [ ] Update `docs/ui/CanvasGameRenderer.md`:
  - Document `updateCamera()` method
  - Explain scroll margin algorithm
  - Describe edge clamping logic
  - Include code examples

- [ ] Add camera system to architecture diagrams (if applicable)

- [ ] Git commit: "docs: document scroll margin camera system (Phase 3.5.7)"

---

### Phase 4: Performance Optimization (Priority: MEDIUM)

**Objective**: Optimize rendering for 60 FPS with minimal CPU/GPU usage

#### Task 4.1: Implement Dirty Rectangle Tracking

**Context**: Only redraw changed tiles instead of full 80×22 grid every frame

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)
- `src/services/DirtyRectService/DirtyRectService.ts` (new service - optional)

##### Subtasks:
- [ ] Track which tiles changed since last frame:
  - Player movement
  - Monster movement
  - FOV changes (light source change, door open/close)
  - Item pickup/drop
- [ ] Only clear and redraw changed rectangular regions
- [ ] Benchmark: Measure FPS before/after optimization
- [ ] Target: 60 FPS on low-end hardware
- [ ] Git commit: "perf: implement dirty rectangle rendering optimization (Phase 4.1)"

---

#### Task 4.2: Implement Sprite Batching (Optional)

**Context**: Batch multiple drawImage calls to reduce GPU overhead

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.ts` (modify)

##### Subtasks:
- [ ] Group sprite draws by texture (all tiles from same sprite sheet)
- [ ] Use offscreen canvas for pre-compositing (if beneficial)
- [ ] Benchmark performance impact
- [ ] Only implement if FPS target not met with dirty rectangles
- [ ] Git commit: "perf: implement sprite batching for draw calls (Phase 4.2)"

---

### Phase 5: Testing & Polish (Priority: HIGH)

**Objective**: Comprehensive testing, edge case handling, and visual polish

#### Task 5.1: Write Comprehensive Unit Tests

**Context**: Test all sprite rendering logic in isolation

**Files to create/modify**:
- `src/ui/CanvasGameRenderer.test.ts` (expand)
- `src/services/AssetLoaderService/asset-loading.test.ts` (expand)

##### Subtasks:
- [ ] Test suite for CanvasGameRenderer:
  - Rendering all tile types (walls, floors, doors, stairs)
  - Rendering all entity types (monsters, items, gold)
  - Visibility state application (visible, explored, unexplored)
  - Color tinting correctness
  - Opacity application
  - Detection effect dimming
  - Player rendering on top
- [ ] Test suite for AssetLoaderService:
  - Successful tileset loading (PNG + .prf files)
  - .prf file parsing (feat, monster, object, trap entries)
  - Hex to pixel conversion accuracy
  - Error handling (404 PNG, 404 .prf, malformed .prf, network errors)
  - Caching behavior
  - Sprite coordinate lookup (valid/invalid characters)
- [ ] Achieve >80% code coverage
- [ ] Git commit: "test: comprehensive unit tests for sprite rendering (Phase 5.1)"

---

#### Task 5.2: Manual Testing & Bug Fixing

**Context**: Play-test the game with sprite rendering, identify visual issues

**Files to create/modify**:
- Various bug fixes as discovered

##### Subtasks:
- [ ] Test all visibility scenarios:
  - Torch radius 1, 2, 3
  - Explore entire level, verify explored tiles dimmed
  - Monsters disappear when out of FOV
  - Items/gold visibility rules
- [ ] Test all entity types:
  - All 26 monster letters render correctly
  - All item types have correct sprites
  - Doors (open/closed/locked/secret) render correctly
  - Stairs render correctly
- [ ] Test edge cases:
  - Missing sprite definitions (fallback behavior)
  - Tileset loading failure (graceful degradation)
  - Viewport scrolling (if implemented)
- [ ] Document any known issues
- [ ] Git commit: "fix: [specific bug description] (Phase 5.2)"

---

#### Task 5.3: Add ASCII/Sprite Toggle (Optional Feature)

**Context**: Allow users to switch between ASCII and sprite rendering via settings

**Files to create/modify**:
- `src/services/PreferencesService/PreferencesService.ts` (modify)
- `src/ui/SettingsModal.ts` (modify - if exists, or create)
- `src/main.ts` (modify)

##### Subtasks:
- [ ] Add `renderMode: 'ascii' | 'sprites'` to user preferences
- [ ] Persist preference to localStorage
- [ ] Add toggle button in settings menu
- [ ] Swap renderer based on preference at runtime
- [ ] Test switching between modes works seamlessly
- [ ] Git commit: "feat: add ASCII/sprite rendering toggle (Phase 5.3)"

---

### Phase 6: Documentation & Finalization (Priority: MEDIUM)

**Objective**: Update all documentation to reflect sprite rendering system

#### Task 6.1: Create Service Documentation

**Context**: Document new services and rendering architecture

**Files to create/modify**:
- `docs/services/AssetLoaderService.md`
- `docs/services/CanvasGameRenderer.md`

##### Subtasks:
- [ ] Create `docs/services/AssetLoaderService.md`:
  - Service responsibilities
  - Public API methods
  - Usage examples
  - Tileset configuration format
  - Error handling behavior
- [ ] Create `docs/ui/CanvasGameRenderer.md`:
  - Rendering pipeline overview
  - Sprite mapping system
  - Color tinting system
  - Performance optimizations
  - Testing strategy
- [ ] Git commit: "docs: add sprite rendering service documentation (Phase 6.1)"

---

#### Task 6.2: Update Architecture Documentation

**Context**: Update architecture docs to reflect new rendering system

**Files to create/modify**:
- `docs/architecture.md` (modify)
- `docs/systems-core.md` (modify)

##### Subtasks:
- [x] Update `docs/architecture.md`:
  - Add AssetLoaderService to service catalog
  - Update UI layer description (canvas-based instead of text)
  - Add sprite rendering to technology stack
- [x] Update `docs/systems-core.md`:
  - Add section on sprite rendering system
  - Document tileset format and configuration
  - Explain color tinting and visibility effects
  - Add performance considerations
- [x] Git commit: "docs: update architecture for sprite rendering (Phase 6.2)"

---

#### Task 6.3: Update CLAUDE.md (if needed)

**Context**: Update project reference if new patterns introduced

**Files to create/modify**:
- `CLAUDE.md` (modify - only if new patterns)

##### Subtasks:
- [x] Review if new architectural patterns were introduced
- [x] Add sprite rendering quick reference (if significant)
- [x] Update "Running the Project" if asset setup required
- [x] Git commit: "docs: update CLAUDE.md for sprite rendering (Phase 6.3)"

---

## 4. Technical Design

### Data Structures

#### Tileset Configuration
```typescript
// src/types/assets/assets.ts

export interface TilesetConfig {
  name: string                         // "Gervais 32x32"
  tileWidth: number                    // 32
  tileHeight: number                   // 32
  imageUrl: string                     // "/assets/tilesets/gervais/32x32.png"
  tiles: Map<string, TileCoordinate>   // Character → Sprite mapping
}

export interface TileCoordinate {
  x: number        // Pixel X offset in sprite sheet (e.g., 0, 32, 64, ...)
  y: number        // Pixel Y offset in sprite sheet (e.g., 0, 32, 64, ...)
  hexX: number     // Original hex value from .prf (e.g., 0x80, 0x81, ...)
  hexY: number     // Original hex value from .prf (e.g., 0x80, 0x81, ...)
}

export interface Tileset {
  config: TilesetConfig
  image: HTMLImageElement
  isLoaded: boolean
}

export interface PrfEntry {
  type: 'feat' | 'monster' | 'object' | 'trap'
  name: string
  category?: string   // e.g., 'sword', 'FLOOR'
  condition?: string  // e.g., 'torch', '*'
  hexY: number        // 0xYY attribute (row in sprite sheet)
  hexX: number        // 0xXX character (column in sprite sheet)
}
```

#### Canvas Render Configuration
```typescript
// src/ui/CanvasGameRenderer.ts

export interface CanvasRenderConfig {
  tileWidth: number                    // 32 pixels
  tileHeight: number                   // 32 pixels
  gridWidth: number                    // 80 tiles
  gridHeight: number                   // 22 tiles
  enableSmoothing: boolean             // false for pixel art
  enableDirtyRectangles: boolean       // true for optimization
  exploredOpacity: number              // 0.5 for dimming
  detectedOpacity: number              // 0.6 for detected entities
}
```

#### Example .prf File Format (graf-dvg.prf excerpt)
```
# Terrain features (walls, floors, doors, stairs)
feat:FLOOR:torch:0x80:0x80                # Floor (torchlit)
feat:WALL:torch:0x80:0x81                 # Wall (torchlit)
feat:DOOR_CLOSED:*:0x80:0x82              # Closed door

# Monsters (A-Z)
monster:Aquator:0x81:0x80                 # Monster 'A'
monster:Bat:0x81:0x81                     # Monster 'B'
monster:Kobold:0x81:0x8A                  # Monster 'K'

# Objects (items, weapons, armor)
object:potion:Healing:0x82:0x80           # Potion '!'
object:scroll:Light:0x82:0x81             # Scroll '?'
object:ring:Protection:0x82:0x82          # Ring '='
object:wand:Lightning:0x82:0x83           # Wand '/'
object:food:Ration:0x82:0x84              # Food '%'

# Traps
trap:poison gas trap:*:0x83:0x80          # Trap '^'

# Conversion Examples:
# 0x80:0x80 → pixel (0, 0)       because (0x80 - 0x80) * 32 = 0
# 0x81:0x83 → pixel (96, 32)     because (0x83 - 0x80) * 32 = 96, (0x81 - 0x80) * 32 = 32
# 0x82:0x85 → pixel (160, 64)    because (0x85 - 0x80) * 32 = 160, (0x82 - 0x80) * 32 = 64
```

### Service Architecture

**New Services**:
- **AssetLoaderService**:
  - Responsibilities: Load sprite sheets, parse .prf mapping files, cache loaded assets
  - Key Methods:
    - `loadTileset(imageUrl: string, prfFiles: string[]): Promise<Tileset>`
    - `getSprite(char: string): TileCoordinate | null`
    - `getSpriteByName(type: string, name: string): TileCoordinate | null`
    - `isLoaded(): boolean`
  - Dependencies: None (uses browser Image API and fetch API)
  - Implementation: Parses Angband .prf format, converts hex coordinates to pixels

**New UI Components**:
- **CanvasGameRenderer**:
  - Responsibilities: Render game state to canvas using sprites
  - Key Methods:
    - `render(state: GameState): void`
    - `renderTerrain(state: GameState): void`
    - `renderEntities(state: GameState): void`
    - `renderPlayer(state: GameState): void`
    - `drawTile(x, y, sprite, opacity, color?): void`
  - Dependencies: RenderingService, AssetLoaderService

**Unchanged Services**:
- **RenderingService**: NO CHANGES - continues to provide visibility states
- **FOVService**: NO CHANGES - continues to calculate visible cells

**Service Dependencies**:
```
CanvasGameRenderer
  ├─ depends on → AssetLoaderService (get sprite coordinates)
  ├─ depends on → RenderingService (get visibility states, colors)
  └─ uses → Canvas 2D Context (browser API)

AssetLoaderService
  └─ uses → Image API (browser)
```

### Algorithms & Formulas

**Hex to Pixel Conversion** (Angband coordinate system):
```
Input: Hex coordinates 0x81:0x83 (from .prf file)
Formula:
  pixelX = (hexX - 0x80) * tileWidth   // (0x83 - 0x80) * 32 = 96
  pixelY = (hexY - 0x80) * tileHeight  // (0x81 - 0x80) * 32 = 32
Result: { x: 96, y: 32, hexX: 0x83, hexY: 0x81 }

Note: 0x80:0x80 is the base offset (origin of sprite sheet)
```

**Sprite Coordinate Lookup**:
```
Input: Character 'A' (Aquator monster)
Step 1: Parse .prf file: "monster:Aquator:0x81:0x80"
Step 2: Convert hex to pixels: (0x80 - 0x80) * 32 = 0, (0x81 - 0x80) * 32 = 32
Step 3: Return TileCoordinate: { x: 0, y: 32, hexX: 0x80, hexY: 0x81 }
```

**World to Screen Conversion**:
```
Input: World position { x: 10, y: 5 }
Formula:
  screenX = worldX × tileWidth
  screenY = worldY × tileHeight
Result: { x: 320, y: 160 } (in pixels)
```

**Visibility-Based Rendering**:
```
Input: Tile at position { x, y }
Step 1: Get visibility state from RenderingService
Step 2: Determine opacity:
  - IF visible → opacity = 1.0
  - IF explored → opacity = 0.5
  - IF unexplored → skip rendering
Step 3: Draw sprite with opacity
```

**Color Tinting (Multiply Blend)**:
```
Step 1: Set composite operation:
  ctx.globalCompositeOperation = 'source-over'
Step 2: Draw sprite at full opacity
Step 3: Apply color overlay:
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = tintColor  // e.g., '#FF4444' for red
  ctx.fillRect(x, y, width, height)
Step 4: Reset composite operation:
  ctx.globalCompositeOperation = 'source-over'
```

---

## 5. Testing Strategy

### Unit Tests

**Coverage Goals**:
- AssetLoaderService: >90%
- CanvasGameRenderer: >80%
- Overall: >80%

**Test Files**:
- `asset-loading.test.ts` - Tileset loading (PNG + .prf files), caching, error handling
- `prf-parsing.test.ts` - .prf file parsing, hex to pixel conversion
- `sprite-lookup.test.ts` - Character to sprite coordinate mapping
- `canvas-rendering.test.ts` - Canvas draw calls, visibility application
- `color-tinting.test.ts` - Color application correctness

### Test Scenarios

**Scenario 1: Successful Tileset Loading**
- Given: Valid 32x32.png and .prf files (graf-dvg.prf, flvr-dvg.prf, xtra-dvg.prf)
- When: AssetLoaderService.loadTileset() called
- Then:
  - PNG image loaded
  - All .prf files parsed successfully
  - Hex coordinates converted to pixel offsets
  - Tileset cached in Map
  - Sprite lookups return correct coordinates
  - isLoaded() returns true

**Scenario 2: Missing Tileset Asset (404)**
- Given: Invalid PNG URL or missing .prf file
- When: AssetLoaderService.loadTileset() called
- Then:
  - Promise rejects with error
  - Error logged to console (specify which file failed)
  - isLoaded() returns false
  - Fallback to ASCII rendering (or show error screen)

**Scenario 2b: .prf File Parsing**
- Given: .prf file content with various entry types
- When: prfParser.parsePrfFile() called
- Then:
  - Comments (lines starting with #) ignored
  - feat entries parsed correctly: `feat:FLOOR:torch:0x96:0x80`
  - monster entries parsed correctly: `monster:Bat:0x8B:0x81`
  - object entries parsed correctly: `object:sword:Dagger:0x8a:0x83`
  - trap entries parsed correctly: `trap:poison gas trap:*:0x87:0xB8`
  - Hex values converted to decimal correctly
  - Malformed lines logged as warnings, parsing continues

**Scenario 3: Sprite Rendering with Visibility States**
- Given: GameState with visible, explored, and unexplored tiles
- When: CanvasGameRenderer.render() called
- Then:
  - Visible tiles drawn at opacity 1.0
  - Explored tiles drawn at opacity 0.5
  - Unexplored tiles not drawn
  - Canvas drawImage called correct number of times

**Scenario 4: Monster Color Tinting**
- Given: Monster at position with threat level (letter A-Z)
- When: CanvasGameRenderer.renderEntities() called
- Then:
  - Monster sprite drawn with correct threat-level color:
    - A-E: Green
    - F-P: Yellow
    - Q-U: Orange
    - V-Z: Red

**Scenario 5: Entity Rendering Order**
- Given: Position with floor, item, monster, and player
- When: CanvasGameRenderer.render() called
- Then:
  - Sprites drawn in correct order (bottom to top):
    1. Floor tile
    2. Item
    3. Monster
    4. Player (if at same position)

**Scenario 6: Dirty Rectangle Optimization**
- Given: Game state where only player moved (no other changes)
- When: CanvasGameRenderer.render() called
- Then:
  - Only player's old and new positions redrawn
  - Other tiles not redrawn (performance optimization)
  - FPS maintained at 60

**Scenario 7: Missing Sprite Definition**
- Given: Character not defined in tileset.json (e.g., new item type)
- When: AssetLoaderService.getSprite() called
- Then:
  - Returns null or fallback sprite
  - Warning logged to console
  - Render fallback: colored rectangle or question mark sprite

---

## 6. Integration Points

### Commands

**No Changes Required**:
- All commands remain unchanged
- Commands still return GameState
- No awareness of rendering implementation

### UI Changes

**GameRenderer Updates**:
- Replace `renderDungeon()` text generation with CanvasGameRenderer
- Keep `renderStats()` and `renderMessages()` as text (unchanged)
- Swap `<pre class="dungeon-grid">` with `<canvas class="dungeon-canvas">`

**CSS Updates**:
```css
/* public/styles.css */

.dungeon-canvas {
  background: #000000;
  border: 1px solid #444;
  image-rendering: pixelated; /* Crisp pixel art scaling */
  image-rendering: crisp-edges;
}
```

**HTML Structure**:
```html
<!-- Before (ASCII) -->
<div class="dungeon-view">
  <pre class="dungeon-grid">...</pre>
</div>

<!-- After (Sprites) -->
<div class="dungeon-view">
  <canvas class="dungeon-canvas" width="2560" height="704"></canvas>
</div>
```

### State Updates

**No GameState Changes Required**:
- All existing state structures unchanged
- No new fields needed
- Rendering is purely presentational

**Optional: User Preferences**:
```typescript
// src/services/PreferencesService/PreferencesService.ts

export interface UserPreferences {
  // ... existing fields
  renderMode: 'ascii' | 'sprites'  // ← New field (optional)
}
```

---

## 7. Documentation Updates

**Files to Update**:
- [x] Create `docs/plans/sprite_rendering_plan.md` - This plan document
- [ ] Create `docs/services/AssetLoaderService.md` - Service documentation
- [ ] Create `docs/ui/CanvasGameRenderer.md` - Renderer documentation
- [ ] Update `docs/architecture.md` - Add AssetLoaderService to catalog
- [ ] Update `docs/systems-core.md` - Add sprite rendering section
- [ ] Update `CLAUDE.md` - Add sprite rendering quick reference (if significant)
- [ ] Create `public/assets/tilesets/gervais/LICENSE.txt` - Tileset attribution and license

---

## 8. Risk & Considerations

### Potential Issues

**Issue 1: Tileset Licensing**
- **Problem**: AngbandTK tileset may have license restrictions (attribution, commercial use, modifications)
- **Mitigation**:
  - Research exact license before integration
  - Add LICENSE.txt to assets directory
  - Credit Adam Bolt in game credits/about screen
  - Consider alternative free tilesets if licensing issues arise

**Issue 2: Asset Loading Failures**
- **Problem**: Network errors, 404s, or corrupted sprite sheets can break rendering
- **Mitigation**:
  - Implement robust error handling in AssetLoaderService
  - Show user-friendly error messages ("Failed to load sprites")
  - Fallback to ASCII rendering if sprites fail to load
  - Add retry logic for transient network errors

**Issue 3: Performance on Low-End Hardware**
- **Problem**: 2560×704 canvas with 1760 tiles (80×22) may be slow on older devices
- **Mitigation**:
  - Implement dirty rectangle optimization (only redraw changed tiles)
  - Profile with browser DevTools (Chrome Performance tab)
  - Consider sprite batching or offscreen canvas pre-compositing
  - Provide ASCII fallback option for performance-constrained devices

**Issue 4: Color Tinting Complexity**
- **Problem**: Applying dynamic colors to sprites (monster threat levels) is non-trivial with canvas
- **Mitigation**:
  - Research and test multiple approaches (multiply blend, CSS filters, pre-rendered variants)
  - Choose simplest approach that achieves desired visual result
  - Consider pre-rendering colored sprite variants if performance issues arise

**Issue 5: Sprite Sheet Organization**
- **Problem**: AngbandTK may not have exact sprite for every item/monster in our game
- **Mitigation**:
  - Map similar sprites (e.g., generic potion for all potions)
  - Create fallback sprite (question mark) for missing definitions
  - Document sprite mappings in tileset.json comments
  - Consider commissioning custom sprites for unique items (future)

### Breaking Changes
- **None**: This is an additive change. ASCII rendering can coexist with sprite rendering.
- Optional: If ASCII rendering removed entirely, this would be breaking for accessibility (screen readers may prefer text)

### Performance Considerations
- **Target**: 60 FPS on 80×22 grid (1760 tiles)
- **Optimization Techniques**:
  1. Dirty rectangles (only redraw changed tiles)
  2. Sprite batching (group draws by texture)
  3. Offscreen canvas pre-compositing (if needed)
  4. RequestAnimationFrame throttling (skip frames if GPU overloaded)
- **Benchmarking**: Use Chrome DevTools Performance tab to profile:
  - Time to render full frame
  - Number of draw calls per frame
  - GPU memory usage

---

## 9. Timeline & Dependencies

### Dependencies
- **Blocked by**: None (this is a standalone feature)
- **Blocks**: Future animation system, particle effects, lighting effects (all depend on canvas rendering)

### Estimated Timeline

**Phase 1: Asset Integration & Infrastructure**
- Task 1.1: Download Gervais tileset from Angband GitHub - 1 hour
- Task 1.2: Create .prf parser and type definitions - 3 hours
- Task 1.3: Implement AssetLoaderService with .prf parsing - 4 hours
- Task 1.4: Add preloading to initialization - 1 hour
- **Phase 1 Total**: 9 hours (~1 day)

**Phase 2: Canvas Renderer Implementation**
- Task 2.1: Create CanvasGameRenderer structure - 2 hours
- Task 2.2: Implement terrain rendering - 3 hours
- Task 2.3: Implement entity rendering - 3 hours
- Task 2.4: Implement player rendering - 1 hour
- Task 2.5: Integrate into main game loop - 2 hours
- **Phase 2 Total**: 11 hours (~1.5 days)

**Phase 3: Color System & Visibility Effects**
- Task 3.1: Implement color tinting - 4 hours
- Task 3.2: Implement visibility dimming - 2 hours
- Task 3.3: Implement desaturation (optional) - 2 hours
- **Phase 3 Total**: 8 hours (~1 day)

**Phase 4: Performance Optimization**
- Task 4.1: Dirty rectangle tracking - 4 hours
- Task 4.2: Sprite batching (optional) - 3 hours
- **Phase 4 Total**: 7 hours (~1 day)

**Phase 5: Testing & Polish**
- Task 5.1: Comprehensive unit tests - 4 hours
- Task 5.2: Manual testing & bug fixing - 4 hours
- Task 5.3: ASCII/sprite toggle (optional) - 3 hours
- **Phase 5 Total**: 11 hours (~1.5 days)

**Phase 6: Documentation & Finalization**
- Task 6.1: Create service documentation - 2 hours
- Task 6.2: Update architecture docs - 2 hours
- Task 6.3: Update CLAUDE.md - 1 hour
- **Phase 6 Total**: 5 hours (~0.5 days)

**Grand Total**: 51 hours (~6-7 working days)

---

## 10. Post-Implementation

### Verification Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Coverage >80% (`npm run test:coverage`)
- [ ] Architectural review completed ([ARCHITECTURAL_REVIEW.md](../ARCHITECTURAL_REVIEW.md))
- [ ] Documentation updated (all 6 docs files)
- [ ] Manual testing completed (all visibility scenarios, all entity types)
- [ ] Performance verified (60 FPS in browser DevTools)
- [ ] Gervais tileset license compliance verified (attribution to David Gervais and Angband project added)

### Follow-Up Tasks
- [ ] **Animations**: Add sprite animations (idle, attack, movement) - Phase 7
- [ ] **Particle Effects**: Add visual effects for combat, spells, explosions - Phase 8
- [ ] **Lighting Effects**: Add dynamic lighting (torch glow, fire, magic) - Phase 9
- [ ] **Custom Sprites**: Commission custom sprites for unique items/monsters - Future
- [ ] **Alternative Tilesets**: Support multiple tileset options (user choice) - Future
- [ ] **Accessibility**: Add screen reader support or text-mode toggle for visually impaired - Future

---

**Last Updated**: 2025-10-09 (Revised for AngbandTK .prf format)
**Status**: 🚧 In Progress
