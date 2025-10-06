# Light Sources

**Version**: 2.0
**Last Updated**: 2025-10-05
**Related Docs**: [Character](./02-character.md) | [Dungeon](./03-dungeon.md) | [Items](./05-items.md) | [UI Design](./11-ui-design.md)

---

## 1. Overview

**Inspiration**: **Angband**-style light radius system with consumable and permanent sources. Light management adds strategic depth and tension to exploration.

**Core Mechanic**: **Vision radius = Light source radius**. Your ability to see the dungeon is directly tied to your equipped light source.

---

## 2. Light Source Types

### Torch (`~`)

**Radius**: 2 tiles

**Duration**: 500 turns of fuel

**Nature**: Basic consumable, burns out

**Starting Equipment**: Option A (50% chance) - 1 lit torch + 2 unlit spares in inventory

**Strategy**: Manage carefully in early game, scrounge for spares

**Fuel Warning Messages**:
- **50 turns left**: "Your torch is getting dim..."
- **10 turns left**: "Your torch flickers..."
- **0 turns left**: "Your torch goes out! You are in darkness!"

---

### Lantern (`(`)

**Radius**: 2 tiles

**Duration**: Refillable (not fixed)

**Refill Source**: Oil flasks (each provides 500 turns)

**Starting Equipment**: Option B (50% chance) - 1 lantern + 2 oil flasks in inventory

**Refill Mechanics**:
- Must **wield lantern** to refill
- Use `r` command with oil flask
- Each flask adds 500 turns
- **Cannot overfill** beyond maximum capacity

**Strategy**: Superior to torches (reusable), collect oil flasks as found

**Fuel Warning Messages**:
- **50 turns left**: "Your lantern is getting dim..."
- **10 turns left**: "Your lantern flickers..."
- **0 turns left**: "Your lantern goes out! You are in darkness!"

---

### Artifacts (Permanent Lights)

**Inspiration**: **Angband** artifact lights (Phial of Galadriel, Star of Elendil, Arkenstone of Thrain)

| Artifact | Symbol | Radius | Duration |
|----------|--------|--------|----------|
| **Phial of Galadriel** | `(` | 3 tiles | Permanent |
| **Star of Elendil** | `(` | 3 tiles | Permanent |
| **Arkenstone of Thrain** | `(` | 2 tiles | Permanent |

**Properties**:
- **Never run out** (infinite fuel)
- **Rare** (late-game finds, Levels 8-10)
- **Power spike** (no more fuel management worries)
- **Radius 3** (most artifacts) - see further than torches/lanterns

**Strategy**: Major upgrade, eliminates light resource tension

---

## 3. Fuel Consumption

### Mechanics

**Rate**: 1 fuel unit per turn

**When Fuel Depletes**:
- **Normal gameplay** (moving, attacking, resting)
- **Turn-based actions**

**When Fuel Does NOT Deplete**:
- **Menu actions** (inventory, examining items)
- **Non-turn actions** (help screens, save/load)

**Permanent Lights**: Skip fuel depletion entirely (artifacts)

---

## 4. Darkness Effects

**When Light Source Runs Out**:

**Vision Radius**: 0 (can only see current tile)

**Combat Penalties**:
- Severe penalty to hit chance
- Cannot see monsters until they attack
- Tactical positioning impossible

**Exploration**: Blind navigation (extremely dangerous)

**Message**: "You are in darkness!" (flashing red warning)

**Strategy**: Always carry spare torches or oil flasks

---

## 5. Light Source Progression

### Early Game (Levels 1-3)

**Source**: Torches

**Challenge**:
- Manage fuel carefully
- Scrounge for spare torches
- Balance exploration vs conservation

**Strategy**: Don't linger, be efficient

---

### Mid Game (Levels 4-7)

**Source**: Lantern

**Challenge**:
- Find lantern (random spawn)
- Collect oil flasks (finite but renewable)
- Better fuel economy than torches

**Strategy**: Prioritize oil flask collection

---

### Late Game (Levels 8-10)

**Source**: Artifacts

**Challenge**: Find rare permanent light

**Reward**: No more fuel worries, radius 3 vision

**Strategy**: Artifact is major power spike, enables deeper exploration

---

## 6. Multiple Torches/Oil Flasks

### Inventory Management

**Torches**:
- Can carry multiple unlit torches in inventory
- Swap when current burns out
- **Requires action** to equip new torch (costs turn)

**Oil Flasks**:
- Stack in inventory
- Refill lantern when needed
- **Requires action** to refill (costs turn)

**Strategy**: Keep reserves, swap/refill in safe areas

---

## 7. Field of View Relationship

### Vision = Light Radius

**Torch/Lantern**: Radius 2
- See 2 tiles in all directions
- Limited tactical awareness
- Must approach carefully

**Artifact**: Radius 3
- See 3 tiles in all directions
- Better tactical positioning
- Spot threats earlier

**Darkness**: Radius 0
- See only current tile
- Essentially blind

**See**: [Core Systems - FOV System](../systems-core.md#fov-system) for shadowcasting algorithm details.

---

## 8. Warning System

### Alert Thresholds

| Turns Left | Message | Color | Urgency |
|------------|---------|-------|---------|
| **50** | "Your [torch/lantern] is getting dim..." | Orange | Low |
| **10** | "Your [torch/lantern] flickers..." | Red | High |
| **0** | "Your [torch/lantern] goes out! You are in darkness!" | Flashing Red | Critical |

**Strategy**: Respond to warnings proactively
- 50 turns: Start looking for replacement/refill
- 10 turns: Retreat to safe area, swap/refill immediately
- 0 turns: Emergency (combat severely penalized)

---

## 9. Strategic Depth

### Resource Management Tension

**Tradeoff**: Exploration vs Fuel Conservation
- Explore thoroughly (find more loot) = burn more fuel
- Rush to stairs (conserve fuel) = miss items

**Risk/Reward**: Deep exploration requires fuel investment

### Tactical Decisions

**Swap/Refill Timing**:
- Costs turn (vulnerable during action)
- Safe areas preferable (no monsters in FOV)

**Artifact Discovery**:
- Game-changing upgrade
- Removes resource tension
- Enables aggressive exploration

---

## 10. Technical Notes

**Implementation**: See [LightingService](../systems-core.md#lighting-system) for service layer details.

**Fuel Tracking**: Each light source has `fuel` and `maxFuel` properties

**Immutability**: Fuel updates return new light source objects (no mutations)

**Testing**: Comprehensive test coverage in `LightingService/` folder

---

## Cross-References

- **[Character](./02-character.md)** - Starting equipment (torch or lantern)
- **[Dungeon](./03-dungeon.md)** - Visibility and exploration
- **[Items](./05-items.md)** - Light sources as equipment
- **[UI Design](./11-ui-design.md)** - Light warnings, visual effects
- **[Core Systems](../systems-core.md#lighting-system)** - Technical implementation

---

## Influences

- **Angband**: Light radius system, artifact lights (Phial, Star, Arkenstone), fuel consumption mechanics
- **Original Rogue (1980)**: Basic torch mechanics (simplified compared to Angband)
- **NetHack**: Light source variety, refillable lanterns
