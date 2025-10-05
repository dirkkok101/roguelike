# LightingService

**Location**: `src/services/LightingService/LightingService.ts`
**Dependencies**: RandomService
**Test Coverage**: Fuel consumption, warnings, refill mechanics

---

## Purpose

Manages light sources (torches, lanterns, artifacts), fuel consumption, and vision radius. Essential for FOV calculations and survival mechanics.

---

## Public API

### Fuel Management

#### `tickFuel(player: Player): FuelTickResult`
Consumes 1 fuel per turn (call each turn during movement).

**Returns**:
```typescript
interface FuelTickResult {
  player: Player  // Updated with depleted fuel
  messages: Message[]  // Fuel warnings
}
```

**Fuel Depletion**:
- **-1 fuel per turn** (only during movement)
- **Warnings** at 50, 10, and 0 fuel remaining
- **Permanent lights** (artifacts) never deplete

**Example**:
```typescript
const result = service.tickFuel(player)
// player.equipment.lightSource.fuel: 450 → 449
// messages: [] (no warning yet)
```

---

#### `getLightRadius(lightSource: LightSource | null): number`
Returns vision radius for light source.

**Light Radii**:
- **Torch**: 1 tile
- **Lantern**: 2 tiles
- **Artifact**: 3 tiles
- **None**: 0 tiles (darkness)

---

### Lantern Refilling

#### `refillPlayerLantern(player: Player, oilAmount: number): LanternRefillResult`
Refills equipped lantern with oil flask.

**Parameters**:
- `player` - Player with lantern equipped
- `oilAmount` - Fuel to add (default 500)

**Returns**:
```typescript
interface LanternRefillResult {
  player: Player  // Updated lantern fuel
  message: string
  success: boolean
}
```

**Rules**:
- Only works on **lanterns** (not torches/artifacts)
- Lantern must be **equipped**
- Fuel capped at **500 max**
- Overfill is wasted

**Example**:
```typescript
const result = service.refillPlayerLantern(player, 500)
// lantern.fuel: 200 → 500 (full)
// message: "You refill your lantern."
// success: true
```

---

### Light Source Creation

#### `createTorch(): LightSource`
Creates new torch (radius 1, 500 fuel).

---

#### `createLantern(): LightSource`
Creates new lantern (radius 2, 500 fuel, refillable).

---

#### `createArtifact(name: string): LightSource`
Creates artifact light (radius 3, infinite fuel).

---

## Light Source Types

### Torch
```typescript
{
  type: 'torch',
  name: 'Torch',
  radius: 1,
  fuel: 500,
  maxFuel: 500,
  isPermanent: false
}
```

### Lantern
```typescript
{
  type: 'lantern',
  name: 'Lantern',
  radius: 2,
  fuel: 500,
  maxFuel: 500,
  isPermanent: false
}
```

### Artifact (e.g., Staff of Light)
```typescript
{
  type: 'artifact',
  name: 'Staff of Light',
  radius: 3,
  isPermanent: true,
  fuel: undefined  // Never depletes
}
```

---

## Fuel Warnings

Warnings generated during `tickFuel()`:

| Fuel Remaining | Message | Type |
|----------------|---------|------|
| **50** | "Your torch is getting dim..." | warning |
| **10** | "Your torch flickers..." | critical |
| **0** | "Your torch goes out! You are in darkness!" | critical |

---

## Darkness Effects

When light source depletes (fuel = 0):
- **Vision radius**: 0 (cannot see anything)
- **FOV**: Empty set (blind)
- **Combat**: Heavy penalties (future feature)
- **Monsters**: Can ambush player

**Critical**: Find new light source or you're helpless!

---

## Refill Mechanics

**Lantern Refilling**:
1. Must have **oil flask** in inventory
2. Lantern must be **equipped**
3. Adds **500 fuel** (one oil flask)
4. Fuel capped at **max 500**
5. Oil flask consumed (removed from inventory)

**Cannot Refill**:
- **Torches** - Consumed when empty
- **Artifacts** - Don't need fuel

---

## Usage in Commands

### MoveCommand (Fuel Tick)
```typescript
// Tick fuel during movement
const fuelResult = this.lightingService.tickFuel(player)
const updatedPlayer = fuelResult.player

// Add fuel warnings to message log
fuelResult.messages.forEach(msg => {
  messages = this.messageService.addMessage(messages, msg.text, msg.type, turnCount)
})
```

### RefillLanternCommand
```typescript
// Refill lantern with oil flask
const result = this.lightingService.refillPlayerLantern(player, 500)

if (result.success) {
  // Remove oil flask from inventory
  // Update player with refilled lantern
} else {
  // Show error message (not equipped, already full, etc.)
}
```

---

## Testing

**Test Files**:
- `refill.test.ts` - Lantern refill mechanics

**Example Test**:
```typescript
describe('LightingService - Fuel Consumption', () => {
  test('depletes 1 fuel per tick', () => {
    const torch = service.createTorch()  // 500 fuel
    const player = { ...basePlayer, equipment: { ...equipment, lightSource: torch } }

    const result = service.tickFuel(player)

    expect(result.player.equipment.lightSource.fuel).toBe(499)
  })
})
```

---

## Related Services

- **FOVService** - Uses light radius for vision calculation
- **InventoryService** - Manages oil flask items
- **MessageService** - Displays fuel warnings
