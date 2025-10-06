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

## 4. RenderingService

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

## 5. Integration Example: Movement Turn

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

## 6. RegenerationService

**Inspiration**: Original Rogue (1980) natural healing, NetHack's ring mechanics, Angband's regeneration system

### 6.1 Core Mechanic

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

### 6.2 Blocking Conditions

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

### 6.3 Ring of Regeneration

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

### 6.4 Rest Command Integration

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

### 6.5 Integration with Other Systems

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

### 6.6 Testing Strategy

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

### 6.7 Design Rationale

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

### 6.8 Implementation Notes

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

## 7. Performance Considerations

### 7.1 FOV Optimization

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
- Combat system uses visibility for surprise attacks: [Game Design - Combat](./game-design/09-combat.md)
- Data structures define tile properties: [Architecture](./architecture.md#tile)

**Testing**:
- All core systems have comprehensive test coverage: [Testing Strategy](./testing-strategy.md)

**Development Plan**:
- Phase 1 implements lighting + FOV + rendering: [Plan](./plan.md#phase-1)
