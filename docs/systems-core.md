# Core Systems: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design.md) | [Architecture](./architecture.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

---

## 1. Lighting System

**Inspiration**: Angband-style light radius system with consumable and permanent sources

### 1.1 Light Sources

| Source | Radius | Duration | Notes |
|--------|--------|----------|-------|
| **Torch** | 2 tiles | 500 turns | Basic consumable, burns out |
| **Lantern** | 2 tiles | Refillable | Requires oil flasks (each = 500 turns) |
| **Phial of Galadriel** | 3 tiles | Permanent | Rare artifact, never runs out |
| **Star of Elendil** | 3 tiles | Permanent | Rare artifact, never runs out |
| **Arkenstone of Thrain** | 2 tiles | Permanent | Rare artifact, never runs out |

---

### 1.2 Mechanics

**FOV = Light Radius**: Your vision distance equals your light source's radius

**Fuel Consumption**: 
- Torches and lanterns consume fuel each turn
- 1 fuel unit per turn during normal gameplay
- Fuel does not deplete during menu actions or inventory management

**Warning System**:
- "Your torch is getting dim..." (50 turns left)
- "Your torch flickers..." (10 turns left)
- "Your torch goes out! You are in darkness!" (0 turns)

**Darkness Effects**: 
- Without light, vision radius = 0 (can only see current tile)
- Severe penalty to combat effectiveness
- Cannot see monsters until they attack

**Multiple Torches**: 
- Can carry extras in inventory
- Swap when current burns out (requires action)

**Oil Flasks**: 
- Refill lanterns (must wield lantern to refill)
- Each flask provides 500 turns of fuel
- Cannot overfill lantern

---

### 1.3 Starting Equipment

Player starts with one of the following (random choice):
- **Option A**: 1 lit torch + 2 unlit torches in inventory
- **Option B**: 1 lantern + 2 oil flasks in inventory

---

### 1.4 Light Source Progression

1. **Early game** (Levels 1-3): Manage torches carefully, scrounge for spares
2. **Mid game** (Levels 4-7): Find lantern, collect oil flasks
3. **Late game** (Levels 8-10): Discover artifacts (permanent solution)

**Strategy**:
- Light management adds tension to exploration
- Must balance exploration vs fuel conservation
- Artifacts are major power spikes (no more fuel worries)

---

### 1.5 LightingService Implementation

**Responsibilities**: Light source management, fuel tracking, FOV radius calculation

**Methods**:
```typescript
class LightingService {
  constructor(private random: IRandomService) {}

  // Fuel management
  tickFuel(lightSource: LightSource): LightSource
  refillLantern(lantern: LightSource, oilFlask: Item): LightSource
  
  // Light properties
  getLightRadius(lightSource: LightSource | null): number
  isFuelLow(lightSource: LightSource): boolean
  generateFuelWarning(lightSource: LightSource): string | null
  
  // Equipment
  equipLightSource(player: Player, lightSource: LightSource): Player
  
  // Creation (for testing/spawning)
  createTorch(): LightSource
  createLantern(): LightSource
  createArtifact(name: string, radius: number): LightSource
}
```

**Key Implementation Details**:
- `tickFuel()`: Decrements fuel by 1, returns new LightSource (immutable)
- Permanent lights skip fuel depletion
- Warnings triggered at 50, 10, and 0 fuel thresholds

**See**:
- Implementation: `src/services/LightingService/LightingService.ts`
- Full API: [LightingService Documentation](./services/LightingService.md)

**Testing**: See [Testing Strategy](./testing-strategy.md) - `LightingService/` folder
- `fuel-consumption.test.ts` - Tick mechanics, depletion
- `light-sources.test.ts` - Creation, radius, permanent vs consumable
- `refill.test.ts` - Lantern refill mechanics
- `warnings.test.ts` - Warning message generation

---

## 2. Field of View (FOV) System

**Algorithm**: Recursive Shadowcasting

**Vision Radius**: Determined by equipped light source (1-3 tiles)

### 2.1 How Shadowcasting Works

Divides FOV into 8 octants, scanning row-by-row from the origin:

```
    NW   N   NE
      \  |  /
   W --- @ --- E
      /  |  \
    SW   S   SE
```

For each octant:
1. Start at origin (player position)
2. Scan outward row by row up to light radius
3. Track shadow ranges cast by blocking cells (walls, closed doors)
4. Merge overlapping shadows
5. Mark cells visible until blocked by wall/door

**Line of Sight**: Walls, closed doors, and secret doors block vision

**Memory (Fog of War)**: Previously explored tiles remain visible but grayed out

---

### 2.2 FOVService Implementation

**Responsibilities**: Field of view calculations using recursive shadowcasting

**Methods**:
```typescript
class FOVService {
  // Main FOV computation
  computeFOV(
    origin: Position,
    radius: number,
    level: Level
  ): Set<Position>

  // Check if position is in visible set
  isInFOV(
    position: Position,
    visibleCells: Set<Position>
  ): boolean

  // Check if position blocks vision
  isBlocking(position: Position, level: Level): boolean

  // Update explored tiles based on visible cells (immutable)
  updateExploredTiles(
    level: Level,
    visibleCells: Set<string>
  ): Level

  // Internal: Process one octant of FOV
  private castLight(
    row: number,
    start: number,
    end: number,
    radius: number,
    xx: number, xy: number,
    yx: number, yy: number,
    origin: Position,
    level: Level,
    visible: Set<Position>
  ): void
}
```

**Algorithm Benefits**:
- Fast in confined dungeon spaces
- Only visits visible cells
- Accurate sight lines around corners
- Natural difficulty scaling with light sources

**Recalculation Triggers**:
- Player moves
- Light source changes (torch burns out, equip better light)
- Dungeon state changes (door opens/closes)

**Testing**: See [Testing Strategy](./testing-strategy.md) - `FOVService/` folder
- `shadowcasting.test.ts` - Core algorithm correctness
- `blocking.test.ts` - What blocks vision (walls, doors)
- `radius.test.ts` - Light radius limits visibility
- `exploration-tracking.test.ts` - Explored tiles tracking (immutability, bounds checking)
- `octants.test.ts` - All 8 octants computed correctly

---

## 3. Visibility States & Color System

**Purpose**: Provide visual distinction between currently visible areas (FOV), previously explored areas (map memory), and unexplored areas.

### 3.1 Three Visibility States

| State | Description | Rendering |
|-------|-------------|-----------|
| **Visible** | Currently in FOV | Full brightness, full color |
| **Explored** | Previously seen, not in FOV | Dimmed/desaturated, "memory" |
| **Unexplored** | Never seen before | Hidden (black) |

---

### 3.2 Entity Rendering Rules by State

| Entity Type | Visible (in FOV) | Explored (memory) | Unexplored |
|-------------|------------------|-------------------|------------|
| **Player** | Full color @ | N/A (current position) | Hidden |
| **Monsters** | Full color A-Z | **NOT SHOWN** | Hidden |
| **Items** | Full color symbols | Dimmed (optional) | Hidden |
| **Gold** | Full color $ | Dimmed (optional) | Hidden |
| **Stairs** | Full color < > | Dimmed < > | Hidden |
| **Doors** | Full color + ' | Dimmed + ' | Hidden |
| **Walls** | Tan/brown | Dark gray | Hidden |
| **Floors** | Light brown | Medium gray | Hidden |
| **Corridors** | Brown | Dark gray | Hidden |
| **Traps** | Red ^ (if discovered) | Dimmed ^ (if discovered) | Hidden |

---

### 3.3 Key Rendering Principles

1. **Monsters only visible in FOV**: Player can only see monster behavior and position when currently visible
2. **Terrain is remembered**: Walls, floors, corridors, and doors remain visible in explored areas (dimmed)
3. **Items/Gold optionally remembered**: Can be configured to show in memory (dimmed) or require FOV
4. **Dynamic entities hidden**: Monster positions, animations, and states only shown in current FOV
5. **Fog of war**: Explored tiles remain visible to help navigation and tactical planning

---

### 3.4 Color Palette

**Background**: `#1a1a1a` (dark gray/black)

#### Visible State (in FOV)

**Terrain**:
- Walls: `#8B7355` (tan)
- Floors: `#A89078` (light brown)
- Corridors: `#6B5D52` (dark brown)
- Doors (closed): `#D4AF37` (golden)
- Doors (open): `#8B7355` (tan)
- Stairs: `#FFFFFF` (white)
- Traps: `#FF4444` (red, if discovered)

**Entities**:
- Player: `#00FFFF` (cyan)
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

#### Explored State (memory)

**Terrain**:
- Walls: `#4A4A4A` (dark gray)
- Floors: `#5A5A5A` (medium gray)
- Corridors: `#404040` (darker gray)
- Doors: `#6A6A6A` (gray)
- Stairs: `#9A9A9A` (light gray)
- Traps: `#442222` (dark red, if discovered)

**Entities**:
- Monsters: **NOT SHOWN**
- Items: `#707070` (dim gray) - optional
- Gold: `#808080` (dim gray) - optional

#### Unexplored State

- Everything: `#000000` (black) or not rendered

---

### 3.5 Implementation Notes

- Use CSS classes for state-based styling (e.g., `.tile-visible`, `.tile-explored`)
- RenderingService determines visibility state for each cell
- Explored state tracked in `Level.explored` boolean array
- FOV calculation updates visible cells each turn
- Explored cells marked true when first entered FOV, never reset

---

## 4. RenderingService

**Responsibilities**: Determine visibility states, apply color schemes, filter entity rendering

### 4.1 Methods

```typescript
class RenderingService {
  constructor(private fovService: FOVService) {}

  // Visibility state determination
  getVisibilityState(
    position: Position,
    visibleCells: Set<Position>,
    level: Level
  ): 'visible' | 'explored' | 'unexplored'

  // Entity rendering decisions
  shouldRenderEntity(
    entityPosition: Position,
    entityType: 'monster' | 'item' | 'gold' | 'stairs' | 'trap',
    visibilityState: 'visible' | 'explored' | 'unexplored',
    config: RenderConfig
  ): boolean

  // Color selection
  getColorForTile(
    tile: Tile,
    visibilityState: 'visible' | 'explored' | 'unexplored'
  ): string

  getColorForEntity(
    entity: Monster | Item | GoldPile,
    visibilityState: 'visible' | 'explored' | 'unexplored'
  ): string

  // CSS class generation
  getCSSClass(
    visibilityState: 'visible' | 'explored' | 'unexplored',
    entityType?: string
  ): string
}
```

---

### 4.2 Visibility Logic

```typescript
getVisibilityState(position, visibleCells, level): VisibilityState {
  if (position in visibleCells) {
    return 'visible'
  } else if (level.explored[position.y][position.x]) {
    return 'explored'
  } else {
    return 'unexplored'
  }
}
```

---

### 4.3 Entity Rendering Rules

```typescript
shouldRenderEntity(
  entityPosition: Position,
  entityType: EntityType,
  visibilityState: VisibilityState,
  config: RenderConfig
): boolean {
  // Monsters only render in FOV
  if (entityType === 'monster') {
    return visibilityState === 'visible';
  }
  
  // Items/Gold: render in FOV, optionally in explored
  if (entityType === 'item' || entityType === 'gold') {
    return visibilityState === 'visible' || 
           (visibilityState === 'explored' && config.showItemsInMemory);
  }
  
  // Stairs: render in FOV and explored
  if (entityType === 'stairs') {
    return visibilityState === 'visible' || visibilityState === 'explored';
  }
  
  // Traps: render if discovered AND (visible or explored)
  if (entityType === 'trap') {
    return trap.discovered && 
           (visibilityState === 'visible' || visibilityState === 'explored');
  }
  
  return false;
}
```

---

### 4.4 Color Mappings

```typescript
getColorForTile(tile: Tile, state: VisibilityState): string {
  if (state === 'unexplored') {
    return '#000000';
  }
  
  if (state === 'visible') {
    return tile.colorVisible;  // Full color
  }
  
  // Explored state uses dimmed colors
  return tile.colorExplored;
}
```

---

### 4.5 Testing

See [Testing Strategy](./testing-strategy.md) - `RenderingService/` folder
- `visibility-states.test.ts` - State determination logic
- `entity-filtering.test.ts` - What renders in each state
- `color-selection.test.ts` - Color mapping correctness
- `fog-of-war.test.ts` - Explored tracking

**Dependencies**: FOVService (for visibility checks)

---

## 5. Integration Example: Movement Turn

This example shows how all core systems work together during a player movement turn:

```typescript
class MoveCommand implements ICommand {
  execute(state: GameState): GameState {
    // 1. Calculate new position
    const newPos = this.movementService.calculateNewPosition(
      state.player.position,
      this.direction
    );
    
    // 2. Check collision
    if (!this.movementService.canMoveTo(newPos, state.currentLevel)) {
      return state;  // Blocked by wall
    }
    
    // 3. Move player
    const movedPlayer = {
      ...state.player,
      position: newPos
    };
    
    // 4. Tick light fuel
    let newLightSource = movedPlayer.lightSource;
    if (newLightSource && !newLightSource.isPermanent) {
      newLightSource = this.lightingService.tickFuel(newLightSource);
      
      // Check for warnings
      const warning = this.lightingService.generateFuelWarning(newLightSource);
      if (warning) {
        state = this.messageService.addMessage(state, warning);
      }
      
      movedPlayer.lightSource = newLightSource;
    }
    
    // 5. Recompute FOV with new position and light radius
    const lightRadius = this.lightingService.getLightRadius(newLightSource);
    const visibleCells = this.fovService.computeFOV(
      newPos,
      lightRadius,
      state.currentLevel
    );
    
    // 6. Update explored tiles
    const updatedLevel = {
      ...state.currentLevel,
      explored: this.updateExploredTiles(
        state.currentLevel.explored,
        visibleCells
      )
    };
    
    // 7. Tick hunger
    const finalPlayer = this.hungerService.tickHunger(movedPlayer, []);
    
    // 8. Return new state
    return {
      ...state,
      player: {
        ...finalPlayer,
        visibleCells
      },
      currentLevel: updatedLevel,
      turnCount: state.turnCount + 1
    };
  }
}
```

**Note**: This example shows the coordination role of commands. All actual logic lives in services.

---

## 6. Performance Considerations

### 6.1 FOV Optimization

**Caching**:
- Only recompute FOV when necessary (movement, light change, door state change)
- Cache visible cell set between renders

**Octant Transformation**:
- Use lookup tables for octant coordinate transformations
- Pre-compute transformation matrices

---

### 6.2 Rendering Optimization

**Visibility State Caching**:
- Store visibility state per tile (don't recompute every frame)
- Invalidate cache only when FOV or explored state changes

**CSS Class Strategy**:
- Pre-define CSS classes for each state
- Toggle classes rather than inline styles

**Dirty Rectangle**:
- Only re-render changed tiles (future optimization)
- Track which tiles changed since last frame

---

## 7. Cross-References

**Related Systems**:
- Monster AI uses FOV for awareness checks: [Advanced Systems](./systems-advanced.md#monster-ai)
- Dungeon generation creates blocking tiles: [Advanced Systems](./systems-advanced.md#dungeon-generation)
- Combat system uses visibility for surprise attacks: [Game Design](./game-design.md#combat-system)
- Data structures define tile properties: [Architecture](./architecture.md#tile)

**Testing**:
- All core systems have comprehensive test coverage: [Testing Strategy](./testing-strategy.md)

**Development Plan**:
- Phase 1 implements lighting + FOV + rendering: [Plan](./plan.md#phase-1)
