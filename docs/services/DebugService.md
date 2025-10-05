# DebugService

**Location**: `src/services/DebugService/DebugService.ts`
**Dependencies**: MessageService
**Test Coverage**: God mode, map reveal, overlay toggles
**Availability**: Development mode only (`process.env.NODE_ENV === 'development'`)

---

## Purpose

Provides **debug tools and cheats** for testing and development. Enables god mode, map reveal, and debug overlays.

---

## Public API

### `isEnabled(): boolean`
Checks if debug mode is available (dev environment only).

---

### `initializeDebugState(): DebugState`
Creates initial debug state (called at game start).

**Debug State**:
```typescript
interface DebugState {
  godMode: boolean              // Invincible, infinite resources
  mapRevealed: boolean          // All tiles explored
  debugConsoleVisible: boolean  // Debug console panel
  fovOverlay: boolean           // FOV visualization
  pathOverlay: boolean          // Pathfinding visualization
  aiOverlay: boolean            // Monster AI state display
}
```

---

### `toggleGodMode(state: GameState): GameState`
Toggles god mode (invincibility + infinite resources).

**Effects**:
- Player cannot take damage
- Infinite hunger (no starvation)
- Infinite light fuel (no darkness)

**Keybind**: `g` (in dev mode)

---

### `revealMap(state: GameState): GameState`
Reveals entire current level map.

**Effects**:
- All tiles marked as explored
- Monsters/items visible through walls
- Secret doors revealed

**Keybind**: `v` (in dev mode)

---

### `toggleFOVOverlay(state: GameState): GameState`
Toggles FOV visualization overlay.

**Shows**: Visible cells highlighted (for debugging shadowcasting)

**Keybind**: `f` (in dev mode)

---

### `togglePathfindingOverlay(state: GameState): GameState`
Toggles pathfinding visualization.

**Shows**: Monster A* paths rendered on map

**Keybind**: `p` (in dev mode)

---

## Debug Keybinds

| Key | Command | Effect |
|-----|---------|--------|
| **`~`** | Toggle Debug Console | Show/hide debug panel |
| **`g`** | God Mode | Invincibility + infinite resources |
| **`v`** | Reveal Map | Explore entire level |
| **`f`** | FOV Overlay | Visualize field of view |
| **`p`** | Path Overlay | Show monster pathfinding |

**See**: `src/ui/InputHandler.ts` for keybind mappings

---

## Security

**Production Safety**:
- All debug methods check `isEnabled()` first
- Returns unchanged state if `process.env.NODE_ENV !== 'development'`
- Debug keybinds disabled in production builds

**Vite Configuration**:
```typescript
// Vite automatically sets NODE_ENV based on mode
// dev: NODE_ENV = 'development' → debug enabled
// build: NODE_ENV = 'production' → debug disabled
```

---

## Design Rationale

### Why Service-Level Debug Logic?

**Avoids UI/command pollution**:
- No debug code scattered across commands
- Centralized enable/disable control
- Easy to strip from production builds

**Testable**:
- Debug features can be unit tested
- Ensures they work when needed for development

---

### Why Environmental Check?

**Security**:
- Prevents players from cheating in production
- No accidental god mode in released game
- Clean separation of dev/prod environments

---

## Related Services

- **MessageService** - Displays debug mode activation messages
- **InputHandler** - Maps debug keybinds to service methods

---

## Implementation Reference

See `src/services/DebugService/DebugService.ts` (~200 lines with monster/item spawn utilities)

**See Also**: [Advanced Systems - Debug System](../systems-advanced.md#debug-system)
