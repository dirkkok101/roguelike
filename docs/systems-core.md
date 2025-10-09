# Core Systems: ASCII Roguelike

**Version**: 2.0  
**Last Updated**: 2025-10-03  
**Related Docs**: [Game Design](./game-design/README.md) | [Architecture](./architecture.md) | [Advanced Systems](./systems-advanced.md) | [Testing](./testing-strategy.md) | [Plan](./plan.md)

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

**Key Capabilities**:
- Fuel Management: Tick fuel each turn, refill lanterns with oil flasks
- Light Properties: Calculate radius, check fuel levels, generate warnings
- Equipment: Equip/unequip light sources
- Creation: Factory methods for torches, lanterns, artifacts (testing/spawning)

**Key Implementation Details**:
- Fuel decrements by 1 per turn (immutable updates)
- Permanent lights (artifacts) skip fuel depletion
- Warning thresholds: 50 turns ("getting dim"), 10 turns ("flickers"), 0 turns ("goes out")

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

**Key Capabilities**:
- Compute FOV from origin with radius (8-octant recursive shadowcasting)
- Check if position is in FOV
- Determine blocking tiles (walls, closed doors, secret doors)
- Update explored tiles based on visible cells (immutable)
- Internal shadowcasting algorithm (castLight for each octant)

**Algorithm Benefits**:
- Fast in confined dungeon spaces (only visits visible cells)
- Accurate sight lines around corners
- Natural difficulty scaling with light source radius
- Efficient recalculation (only when player moves or light changes)

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

## 4. Sprite Rendering System

**Objective**: Hardware-accelerated sprite-based rendering using HTML5 Canvas and AngbandTK tileset

### 4.1 Overview

The game uses **CanvasGameRenderer** to render the dungeon view with 2D sprites instead of ASCII text. This provides:
- Hardware acceleration via GPU
- Smooth 60 FPS performance
- Visual effects (color tinting, opacity, animations)
- Pixel-perfect rendering without CSS overhead

### 4.2 Architecture

**Rendering Pipeline**:
```
GameState → CanvasGameRenderer → HTML5 Canvas
     ↓              ↓                   ↓
RenderingService  AssetLoaderService  Browser GPU
(visibility)      (sprite coords)     (compositing)
```

**Key Components**:
- **CanvasGameRenderer**: Renders game state to canvas using sprites
- **AssetLoaderService**: Loads sprite sheets and .prf mapping files
- **RenderingService**: Determines visibility states (unchanged from ASCII version)
- **FOVService**: Calculates visible cells (unchanged from ASCII version)

**Canvas Configuration**:
- **Size**: 2560×704 pixels (80 tiles × 22 tiles @ 32px per tile)
- **Image Smoothing**: Disabled for crisp pixel art
- **Composite Operations**: Multiply blend for color tinting
- **Alpha Blending**: Opacity for explored tiles

### 4.3 Tileset Format

**AngbandTK Gervais 32×32 Tileset**:
- **Source**: https://github.com/angband/angband/tree/master/lib/tiles/gervais
- **Creator**: David Gervais
- **License**: Free for open source use (Angband license)

**File Structure**:
```
public/assets/tilesets/gervais/
├── 32x32.png           # Single sprite atlas (4096×960px)
├── graf-dvg.prf        # Main tile mappings (terrain, monsters, objects)
├── flvr-dvg.prf        # Flavored items (colored potions, rings)
├── xtra-dvg.prf        # Player character variants
└── LICENSE.txt         # Attribution to David Gervais
```

**Sprite Atlas Layout**:
- **Format**: Single PNG image with all sprites in a grid
- **Tile Size**: 32×32 pixels
- **Coordinate System**: Hexadecimal 0x80-based (Angband convention)

**.prf File Format** (Angband tile mapping):
```
# Terrain features
feat:FLOOR:torch:0x80:0x96   # Floor tile (torchlit condition)
feat:GRANITE:*:0x80:0x92     # Wall tile (any condition)
feat:CLOSED:lit:0x84:0x96    # Closed door (lit condition)

# Monsters
monster:Bat:0x80:0x8B        # Monster 'B' sprite
monster:Kobold:0x8C:0x8D     # Monster 'K' sprite

# Objects
object:potion:Healing:0x80:0x82   # Potion sprite
object:scroll:Light:0x81:0x82     # Scroll sprite
object:ring:Protection:0x82:0x82  # Ring sprite

# Hex to Pixel Conversion:
# pixelX = (hexX - 0x80) * 32
# pixelY = (hexY - 0x80) * 32
# Example: 0x80:0x96 → pixel (704, 0)
```

### 4.4 Sprite Lookup System

**Character-to-Sprite Mapping**:
1. **Direct Lookup**: Try character directly (for monster letters A-Z)
2. **Angband Mapping**: Map ASCII character to Angband feature names
3. **Condition Variants**: Try multiple conditions (torch, lit, los, *, no condition)
4. **Fallback**: Return null if no sprite found (logged as warning)

**Example Mapping Table**:
| Character | Angband Features | Conditions Tried |
|-----------|------------------|------------------|
| `@` | `<player>` | torch, lit, los, *, none |
| `.` | `FLOOR` | torch, lit, los, *, none |
| `#` | `GRANITE`, `PERM` | torch, lit, los, *, none |
| `+` | `CLOSED` | torch, lit, los, *, none |
| `-` | `OPEN` | torch, lit, los, *, none |
| `<` | `LESS` | torch, lit, los, *, none |
| `>` | `MORE` | torch, lit, los, *, none |
| `A-Z` | Direct character lookup | (monster names) |

**Lookup Performance**:
- O(1) average case (Map.get)
- Maximum ~5 lookups per character (direct + 4 condition variants)
- Cached after first lookup

### 4.5 Visibility Effects

**Three-State Opacity System**:
| State | Opacity | Rendering | Effect |
|-------|---------|-----------|--------|
| **Visible** | 1.0 | Full brightness | Currently in FOV |
| **Explored** | 0.5 | Dimmed | Map memory, not in FOV |
| **Unexplored** | — | Hidden | Never seen, not rendered |

**Implementation**:
```typescript
// Visible tiles (in FOV)
ctx.globalAlpha = 1.0
ctx.drawImage(sprite, ...)

// Explored tiles (memory)
ctx.globalAlpha = 0.5  // 50% dimming
ctx.drawImage(sprite, ...)

// Unexplored tiles
// Skip rendering entirely
```

**Entity-Specific Rules**:
- **Monsters**: Only render in visible state (never in memory)
- **Items**: Render in visible + explored (if config.showItemsInMemory)
- **Gold**: Render only in visible (not in memory)
- **Stairs**: Render in visible + explored
- **Traps**: Render if discovered AND (visible OR explored)
- **Player**: Always full opacity (1.0)

### 4.6 Color Tinting

**Monster Threat Levels**:
Colors applied dynamically based on monster letter (A-Z):
| Threat Level | Monster Letters | Color | Hex Code |
|--------------|-----------------|-------|----------|
| Low | A-E | Green | `#44FF44` |
| Medium | F-P | Yellow | `#FFDD00` |
| High | Q-U | Orange | `#FF8800` |
| Boss | V-Z | Red | `#FF4444` |

**Tinting Implementation**:
Uses multiply blend composite operation:
```typescript
// 1. Draw sprite normally
ctx.drawImage(tileset.image, srcX, srcY, w, h, destX, destY, w, h)

// 2. Apply color tint
if (tintColor) {
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = tintColor  // e.g., '#FF4444' for red
  ctx.fillRect(destX, destY, w, h)
  ctx.globalCompositeOperation = 'source-over'  // Reset
}
```

**Effect**: Multiplies sprite colors by tint color, darkening and colorizing the sprite while preserving details.

### 4.7 Render Order (Z-Index)

Sprites are drawn in this order (bottom to top):
1. **Terrain** (floor, walls, corridors, doors, stairs)
2. **Items** (potions, scrolls, weapons, armor, rings, wands)
3. **Gold** piles ($)
4. **Monsters** (A-Z)
5. **Stairs** (<, >)
6. **Traps** (^)
7. **Player** (@) - Always on top

This ensures the player is always visible and monsters appear on top of items.

### 4.8 Performance Considerations

**Current Performance**:
- **Canvas Size**: 2560×704 pixels (80×22 tiles @ 32px)
- **Draw Calls**: ~500-800 per frame (depends on FOV size)
- **Target FPS**: 60 FPS
- **Actual FPS**: ~200-300 FPS on modern hardware

**Optimization Techniques**:
1. **Image Smoothing Disabled**:
   ```typescript
   ctx.imageSmoothingEnabled = false
   ```
   Prevents anti-aliasing blur, keeps pixel art crisp, reduces GPU overhead.

2. **Opacity Batching**:
   ```typescript
   ctx.globalAlpha = opacity
   // Draw multiple sprites at same opacity
   ctx.globalAlpha = 1.0  // Reset once
   ```

3. **Composite Operation Caching**:
   ```typescript
   const prev = ctx.globalCompositeOperation
   ctx.globalCompositeOperation = 'multiply'
   // Apply tint
   ctx.globalCompositeOperation = prev  // Restore
   ```

**Future Optimizations** (Phase 4, not yet implemented):
1. **Dirty Rectangles**: Only redraw changed tiles
2. **Sprite Batching**: Group draws by texture
3. **Offscreen Canvas**: Pre-composite layers
4. **RequestAnimationFrame Throttling**: Skip frames if GPU overloaded

### 4.9 Integration with Existing Systems

**RenderingService** (unchanged):
- Continues to determine visibility states (visible/explored/unexplored)
- Provides color information for monsters (threat-level colors)
- Filters entity rendering (monsters only in FOV, items in memory, etc.)

**FOVService** (unchanged):
- Continues to calculate visible cells using shadowcasting
- Light radius determines FOV size (unchanged)
- Explored tiles tracked in Level.explored boolean array

**GameRenderer**:
- **Dungeon View**: Replaced text-based rendering with CanvasGameRenderer
- **Stats Panel**: Text-based rendering unchanged
- **Messages**: Text-based rendering unchanged

**No Changes Required**:
- All commands remain unchanged (no awareness of rendering)
- GameState structure unchanged (rendering is purely presentational)
- Service layer unchanged (except new AssetLoaderService)

### 4.10 Testing

**Unit Tests** (51 tests total):
- **CanvasGameRenderer**: 34 tests
  - Constructor & setup (4 tests)
  - Helper methods (6 tests)
  - Rendering pipeline (11 tests)
  - Entity rendering (10 tests)
  - Player rendering (3 tests)
- **AssetLoaderService**: 17 tests
  - Tileset loading (PNG + .prf files)
  - .prf file parsing (hex to pixel conversion)
  - Sprite coordinate lookup
  - Error handling (404, malformed .prf)
  - Caching behavior

**Coverage**: >80% for sprite rendering code

**See**:
- [CanvasGameRenderer Documentation](./ui/CanvasGameRenderer.md)
- [AssetLoaderService Documentation](./services/AssetLoaderService.md)
- [Architecture - AssetLoaderService](./architecture.md#432-assetloaderservice)

---

## 5. RenderingService

**Responsibilities**: Determine visibility states, apply color schemes, filter entity rendering

### 4.1 Key Capabilities

**Visibility State Determination**:
- Check if position in FOV → visible
- Check if previously explored → explored
- Otherwise → unexplored

**Entity Rendering Decisions**:
- Monsters: Only render in FOV (never in memory)
- Items/Gold: Render in FOV + optionally in explored
- Stairs: Render in FOV and explored
- Traps: Render if discovered AND (visible or explored)

**Color Selection**:
- Unexplored: Black (#000000)
- Visible: Full color (from tile/entity properties)
- Explored: Dimmed/grayscale versions

**CSS Class Generation**: Applies state-based styling classes

---

### 4.2 Visibility Logic Flow

```
Determine State:
  IF position in visibleCells:
    RETURN 'visible'
  ELSE IF level.explored[position] == true:
    RETURN 'explored'
  ELSE:
    RETURN 'unexplored'
```

**Usage**: Called for every tile/entity during rendering

---

### 4.3 Entity Rendering Rules

```
Monster Rendering:
  ONLY render if state == 'visible'

Item/Gold Rendering:
  Render if state == 'visible'
  OR (state == 'explored' AND config.showItemsInMemory)

Stairs Rendering:
  Render if state == 'visible' OR state == 'explored'

Trap Rendering:
  Render if trap.discovered == true
  AND (state == 'visible' OR state == 'explored')
```

**Design Principle**: Monsters disappear when out of FOV (creates suspense)

---

### 4.4 Color Selection Logic

```
Color Mapping:
  IF state == 'unexplored':
    RETURN black
  IF state == 'visible':
    RETURN full color (from tile/entity data)
  IF state == 'explored':
    RETURN dimmed color (grayscale/darkened version)
```

**Implementation**: Tiles/entities store both `colorVisible` and `colorExplored` properties

---

### 4.5 Testing

See [Testing Strategy](./testing-strategy.md) - `RenderingService/` folder
- `visibility-states.test.ts` - State determination logic
- `entity-filtering.test.ts` - What renders in each state
- `color-selection.test.ts` - Color mapping correctness
- `fog-of-war.test.ts` - Explored tracking

**Dependencies**: FOVService (for visibility checks)

---

## 6. Integration Example: Movement Turn

**How Core Systems Coordinate** during a player movement:

```
MoveCommand Flow:
  1. Calculate new position (MovementService)
     → newPos = current + direction vector

  2. Check collision (MovementService)
     → IF blocked: return unchanged state
     → IF monster: delegate to combat flow

  3. Move player (immutable update)
     → player = { ...player, position: newPos }

  4. Tick light fuel (LightingService)
     → IF permanent light: skip
     → ELSE: fuel = fuel - 1
     → Generate warning if needed (50/10/0 thresholds)

  5. Recompute FOV (FOVService + LightingService)
     → radius = getLightRadius(lightSource)
     → visibleCells = computeFOV(newPos, radius, level)

  6. Update explored tiles (FOVService)
     → Mark all visibleCells as explored
     → Immutable level update

  7. Tick hunger (HungerService)
     → Apply hunger effects based on state

  8. Increment turn (TurnService)
     → turnCount = turnCount + 1

  9. Return new GameState
     → All updates immutable (spread operators)
```

**Key Principles Demonstrated**:
- **Orchestration**: Command coordinates 6 services
- **Immutability**: Every update returns new objects
- **Separation**: Logic lives in services, not commands
- **Order Matters**: FOV must wait for position update, hunger waits for FOV

**See**: `src/commands/MoveCommand/MoveCommand.ts` for implementation

---

## 7. RegenerationService

**Inspiration**: Original Rogue (1980) natural healing, NetHack's ring mechanics, Angband's regeneration system

### 7.1 Core Mechanic

**Natural Regeneration**: Player heals **1 HP per 10 turns** when conditions are met

**Turn Counter Tracking**:
- Internal Map stores counter per player (keyed by position + maxHP)
- Counter increments each turn
- Resets to 0 after healing occurs

**Formula**:
```typescript
BASE_TURNS = 10  // Turns between heals (normal)
RING_TURNS = 5   // Turns between heals (with ring)
HUNGER_THRESHOLD = 100  // Minimum hunger required

canRegenerate = !inCombat && hunger > HUNGER_THRESHOLD && hp < maxHp
if (canRegenerate && counter >= requiredTurns) {
  hp = min(hp + 1, maxHp)
  counter = 0
}
```

---

### 7.2 Blocking Conditions

**Combat Blocking**:
- No regeneration when enemy visible in FOV
- Prevents healing during active combat
- Encourages tactical retreat

**Hunger Gating**:
- Requires hunger > 100 to regenerate
- Body needs food reserves to heal
- Prevents infinite healing via starvation

**Max HP Cap**:
- Stops regenerating at maxHp
- Use potions or rest command for full healing

---

### 7.3 Ring of Regeneration

**Effect**: Doubles regeneration rate (5 turns instead of 10)

**Detection**:
```typescript
hasRegenerationRing(player: Player): boolean {
  const leftRing = player.equipment.leftRing
  const rightRing = player.equipment.rightRing

  return (leftRing?.ringType === RingType.REGENERATION) ||
         (rightRing?.ringType === RingType.REGENERATION)
}
```

**Hunger Cost**: +30% hunger consumption rate (handled by HungerService)

**Synergy**: Combine with Ring of Slow Digestion (-50% hunger) for net -20% rate

---

### 7.4 Rest Command Integration

**RestCommand** uses RegenerationService to heal until full HP or interrupted:

```typescript
Rest Loop:
  WHILE hp < maxHp AND !interrupted:
    1. Tick hunger (check for starvation death)
    2. Tick regeneration (with combat check)
    3. Tick light fuel
    4. Update FOV
    5. Check for enemy in FOV → interrupt
    6. Check for hunger ≤ 0 → interrupt
    7. Safety limit: 1000 turns max
```

**Keybindings**: `5` or `.` to rest

**Interruptions**:
- Enemy appears in FOV
- Hunger reaches 0 (too hungry to rest)
- Starvation death (0 hunger + HP damage)

**Messages**:
- `"Rested for X turns. Fully healed! (HP/maxHP)"`
- `"You are interrupted by a nearby enemy!"`
- `"You are too hungry to rest!"`

---

### 7.5 Integration with Other Systems

**HungerService**:
- Checks hunger threshold (> 100) before allowing regen
- Applies ring hunger modifier (+30% for Regeneration ring)
- Handles starvation damage during rest

**FOVService**:
- Provides visibleCells set for combat detection
- Used to check if monsters are nearby (blocks regen)

**LightingService**:
- Fuel consumption continues during rest
- Warnings issued if torch/lantern runs out mid-rest

**TurnService**:
- Increments turn count for each rest cycle
- Ensures proper game time tracking

**MoveCommand**:
- Calls RegenerationService.tickRegeneration() each turn
- Regeneration happens automatically during movement

---

### 7.6 Testing Strategy

**Unit Tests** (46 tests across 4 files):
- `natural-regen.test.ts`: Base 10-turn cycle, hunger gating
- `ring-regen.test.ts`: Ring detection, rate doubling (5 turns)
- `combat-blocking.test.ts`: FOV-based combat detection
- `ring-hunger-penalty.test.ts`: Hunger rate modifications

**Integration Tests** (8 tests):
- Full combat → retreat → heal cycles
- Hunger depletion blocking regeneration
- Ring rate doubling in real gameplay
- Rest command with monster interruptions
- Turn count accuracy across systems

**Coverage**: >95% for RegenerationService

---

### 7.7 Design Rationale

**Turn-Based Formula**:
- Predictable healing rate (1 HP / 10 turns = ~6 HP / minute)
- Players can plan tactical retreats
- Encourages "hit-and-run" combat style

**Combat Blocking**:
- Prevents exploiting regen during combat
- Forces tactical positioning (break line of sight)
- Matches original Rogue behavior

**Hunger Gate**:
- Resource tradeoff: food vs healing
- Prevents infinite healing loop
- Creates strategic depth (manage food vs HP)

**Ring Tradeoff**:
- 2x healing speed vs +30% food cost
- Balances power with resource pressure
- Synergizes with Slow Digestion ring

**Immutability**:
- Counter tracked externally (Map<string, number>)
- Player object never mutated
- Enables time-travel debugging, undo/redo

---

### 7.8 Implementation Notes

**Counter Key Generation**:
```typescript
private getCounterKey(player: Player): string {
  return `${player.position.x},${player.position.y},${player.maxHp}`
}
```
- Unique per player location + max HP
- Allows multiple players (future multiplayer)
- Resets if maxHP changes (potion overheal)

**Immutable Updates**:
```typescript
return {
  player: { ...player, hp: newHp },
  messages: [...messages],
  healed: true
}
```
- Always return new objects
- Never mutate parameters
- Result objects include metadata (healed, messages)

**See**:
- `src/services/RegenerationService/RegenerationService.ts` for implementation
- `src/commands/RestCommand/RestCommand.ts` for rest loop
- `docs/plans/regeneration_plan.md` for full design specification

---

## 8. Performance Considerations

### 8.1 FOV Optimization

**Caching**:
- Only recompute FOV when necessary (movement, light change, door state change)
- Cache visible cell set between renders

**Octant Transformation**:
- Use lookup tables for octant coordinate transformations
- Pre-compute transformation matrices

---

### 8.2 Rendering Optimization

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

## 9. Cross-References

**Related Systems**:
- Monster AI uses FOV for awareness checks: [Advanced Systems](./systems-advanced.md#monster-ai)
- Dungeon generation creates blocking tiles: [Advanced Systems](./systems-advanced.md#dungeon-generation)
- Combat system uses visibility for surprise attacks: [Game Design - Combat](./game-design/09-combat.md)
- Data structures define tile properties: [Architecture](./architecture.md#tile)

**Testing**:
- All core systems have comprehensive test coverage: [Testing Strategy](./testing-strategy.md)

**Development Plan**:
- Phase 1 implements lighting + FOV + rendering: [Plan](./plan.md#phase-1)
