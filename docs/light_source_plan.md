# Light Source Management System - Implementation Plan

**Version**: 1.0
**Date**: 2025-10-05
**Status**: Planning Phase

---

## Executive Summary

### Current Problems

1. **Fuel Not Tracked Per Item** ❌
   - Fuel depletes on `equipment.lightSource` but NOT on inventory `Torch` items
   - When unequipping, original torch still shows `fuel: 500` (incorrect)
   - No way to preserve partial fuel when switching torches

2. **No Equip/Unequip Commands** ❌
   - `EquipCommand` doesn't handle `ItemType.TORCH` or `ItemType.LANTERN`
   - No way to manually switch light sources
   - No `UnequipLightSourceCommand` to stow light sources

3. **Escape Key Bug** ❌
   - Modal closes but screen doesn't re-render
   - User sees stale canvas state after closing inventory

### Angband Research Findings ✅

**Commands:**
- **`w` (wield)** - Equips all equipment including light sources
- **`F` (fuel)** - Refuels lanterns with oil flasks, combines torches
- **Fuel tracking** - Remains on item when unequipped, persists across equip/unequip cycles

**Key Insight**: Light sources are **wielded/equipped** like weapons, NOT "turned on/off"

### Proposed Solution

**Architecture Change**: Move to **single source of truth** model where fuel lives on the `Torch`/`Lantern` item itself, NOT on a separate `LightSource` object.

**Command Design**: Use Angband's **wield/take-off** paradigm (extend existing `EquipCommand` and create generic `TakeOffCommand`) rather than light-specific turn-on/turn-off commands.

**Auto-Drop**: Burnt-out torches (fuel = 0) automatically drop when equipping a new light source, preventing inventory clutter.

---

## Current Architecture (Broken)

### Data Model

```typescript
// Torch is an Item with a nested LightSource object
interface Torch extends Item {
  lightSource: LightSource  // ❌ Fuel copied here
}

interface LightSource {
  type: 'torch' | 'lantern' | 'artifact'
  radius: number
  isPermanent: boolean
  fuel?: number      // ❌ Fuel lives here (detached from item)
  maxFuel?: number
  name: string
}

interface Equipment {
  lightSource: LightSource | null  // ❌ Loses connection to original item
}
```

### Problem Flow

1. Player picks up torch → `Torch` item with `lightSource: { fuel: 500 }` added to inventory
2. Player equips torch → `equipment.lightSource = torch.lightSource` (value copied)
3. Fuel ticks → `equipment.lightSource.fuel` decrements to 450
4. Player unequips → Torch in inventory still has `fuel: 500` ❌ (never updated!)

---

## Proposed Architecture (Fixed)

### Data Model

```typescript
// Fuel lives directly on the item (single source of truth)
interface Torch extends Item {
  type: ItemType.TORCH
  fuel: number       // ✅ Fuel lives HERE
  maxFuel: number
  radius: number
  isPermanent: false
  name: string
}

interface Lantern extends Item {
  type: ItemType.LANTERN
  fuel: number       // ✅ Fuel lives HERE
  maxFuel: number
  radius: number
  isPermanent: false
  name: string
}

interface Artifact extends Item {
  type: ItemType.TORCH  // Same type, but isPermanent
  radius: number
  isPermanent: true
  name: string
}

interface Equipment {
  weapon: Weapon | null
  armor: Armor | null
  leftRing: Ring | null
  rightRing: Ring | null
  lightSource: Torch | Lantern | Artifact | null  // ✅ Store item reference
}

// ❌ DELETE LightSource interface (no longer needed)
```

### Benefits

✅ Fuel automatically tracked per torch (single source of truth)
✅ Switching torches preserves fuel correctly
✅ Unequipping returns torch to inventory with correct fuel
✅ Simpler data model (no duplicate objects)
✅ Follows Angband conventions

---

## Implementation Phases

### Phase 1: Data Model Refactor 🔨

**Goal**: Update core type definitions and fix compilation errors

#### Tasks

- [ ] **1.1 Update Torch Interface** (core.ts)
  ```typescript
  interface Torch extends Item {
    type: ItemType.TORCH
    fuel: number
    maxFuel: number
    radius: number
    isPermanent: false
    name: string
  }
  ```

- [ ] **1.2 Update Lantern Interface** (core.ts)
  ```typescript
  interface Lantern extends Item {
    type: ItemType.LANTERN
    fuel: number
    maxFuel: number
    radius: number
    isPermanent: false
    name: string
  }
  ```

- [ ] **1.3 Create Artifact Type** (core.ts)
  - Permanent light sources (Phial of Galadriel, Star of Elendil)
  - No fuel tracking needed

- [ ] **1.4 Update Equipment Interface** (core.ts)
  ```typescript
  lightSource: Torch | Lantern | Artifact | null
  ```

- [ ] **1.5 Remove LightSource Interface** (core.ts)
  - Mark as deprecated first
  - Delete after all references removed

- [ ] **1.6 Fix Compilation Errors**
  - Update all files that reference old `LightSource` type
  - Estimated: 15-20 files

**Estimated Effort**: Medium (4-6 hours)
**Breaking Change**: Yes (save file incompatible)

---

### Phase 2: Service Layer Updates ⚙️

**Goal**: Update services to work with new data model

#### Tasks

- [ ] **2.1 Update LightingService.tickFuel()**
  - Remove `LightSource` parameter
  - Work directly with `Player` object
  - Tick fuel on `equipment.lightSource` (Torch/Lantern item)
  ```typescript
  tickFuel(player: Player): FuelTickResult {
    const light = player.equipment.lightSource
    if (!light || light.isPermanent) return { player, messages: [] }

    // Tick fuel directly on the item
    const tickedLight = { ...light, fuel: light.fuel - 1 }
    const updatedEquipment = { ...player.equipment, lightSource: tickedLight }
    const updatedPlayer = { ...player, equipment: updatedEquipment }

    // Generate warnings...
    return { player: updatedPlayer, messages }
  }
  ```

- [ ] **2.2 Update LightingService.getLightRadius()**
  ```typescript
  getLightRadius(lightSource: Torch | Lantern | Artifact | null): number {
    if (!lightSource) return 0
    if (lightSource.fuel !== undefined && lightSource.fuel <= 0) return 0
    return lightSource.radius
  }
  ```

- [ ] **2.3 Update LightingService.refillPlayerLantern()**
  - Work with Lantern item instead of LightSource
  - Update fuel on equipped item

- [ ] **2.4 Remove LightingService.createTorch()**
  - No longer needed (items created by DungeonService)

- [ ] **2.5 Remove LightingService.createLantern()**
  - No longer needed

- [ ] **2.6 Remove LightingService.createArtifact()**
  - No longer needed

- [ ] **2.7 Update InventoryService Methods**
  - [ ] Add `equipLightSource(player: Player, lightSource: Torch | Lantern): Player`
    - Auto-drop burnt-out torches (don't return to inventory if fuel = 0)
    - Only return old light source to inventory if it has fuel remaining
  - [ ] Add `unequipLightSource(player: Player): Player`
  - [ ] Update `getEquippedItems()` to include light sources
  - [ ] Update `isEquipped()` to check light sources

- [ ] **2.8 Add LightingService.shouldAutoDropLight()**
  - Check if light source should be auto-dropped (burnt out)
  - Returns true if: not permanent AND fuel <= 0
  ```typescript
  shouldAutoDropLight(light: LightSource): boolean {
    return !light.isPermanent && light.fuel !== undefined && light.fuel <= 0
  }
  ```

**Estimated Effort**: Medium (3-5 hours)
**Dependencies**: Phase 1 complete

---

### Phase 3: Command Layer 🎮

**Goal**: Enable player to equip/unequip light sources

#### Tasks

- [ ] **3.1 Update EquipCommand**
  - Add cases for `ItemType.TORCH` and `ItemType.LANTERN`
  ```typescript
  case ItemType.TORCH:
  case ItemType.LANTERN:
    updatedPlayer = this.inventoryService.equipLightSource(state.player, item as Torch | Lantern)
    equipMessage = `You light and wield ${displayName}.`
    break
  ```

- [ ] **3.2 Create TakeOffCommand (Generic Equipment Removal)**
  - New command file: `src/commands/TakeOffCommand/`
  - Handles ALL equipment types (weapon, armor, rings, light sources)
  - Takes equipment slot parameter or shows modal to select
  - Implement:
    ```typescript
    class TakeOffCommand implements ICommand {
      constructor(
        private equipmentSlot: 'weapon' | 'armor' | 'leftRing' | 'rightRing' | 'lightSource' | 'prompt',
        private inventoryService: InventoryService,
        private messageService: MessageService,
        private turnService: TurnService
      ) {}

      execute(state: GameState): GameState {
        // If 'prompt', show modal to select which equipment to remove
        if (this.equipmentSlot === 'prompt') {
          // Show equipment selection modal
          return state
        }

        // Check if slot has equipment
        const equipment = state.player.equipment[this.equipmentSlot]
        if (!equipment) {
          return state // Nothing equipped in that slot
        }

        // Unequip based on slot
        let updatedPlayer = state.player
        let message = ''

        switch (this.equipmentSlot) {
          case 'weapon':
            updatedPlayer = this.inventoryService.unequipWeapon(state.player)
            message = `You unwield your ${equipment.name}.`
            break
          case 'armor':
            updatedPlayer = this.inventoryService.unequipArmor(state.player)
            message = `You take off your ${equipment.name}.`
            break
          case 'leftRing':
          case 'rightRing':
            const slot = this.equipmentSlot === 'leftRing' ? 'left' : 'right'
            updatedPlayer = this.inventoryService.unequipRing(state.player, slot)
            message = `You remove your ${equipment.name}.`
            break
          case 'lightSource':
            updatedPlayer = this.inventoryService.unequipLightSource(state.player)
            message = `You extinguish and stow your ${equipment.name}.`
            break
        }

        const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)
        return this.turnService.incrementTurn({ ...state, player: updatedPlayer, messages })
      }
    }
    ```
  - Write tests: `TakeOffCommand.test.ts`
  - Note: This follows Angband's `t` (take off) command which works for all equipment

- [ ] **3.3 Update RefillLanternCommand**
  - Ensure it works with new Lantern item type
  - Should already be mostly compatible

- [ ] **3.4 (Optional) Create FuelTorchCommand**
  - Angband feature: combine torches
  - Take another torch from inventory, add its fuel to equipped torch
  - Max fuel: 500 for torches
  - Lower priority

**Estimated Effort**: Small-Medium (2-4 hours)
**Dependencies**: Phase 2 complete

---

### Phase 4: UI & Input Layer 🖥️

**Goal**: Wire up commands to keyboard input and fix Escape bug

#### Tasks

- [ ] **4.1 Fix Escape Key Bug** (main.ts)
  ```typescript
  document.addEventListener('keydown', (event) => {
    const command = inputHandler.handleKeyPress(event, gameState)
    if (command) {
      gameState = command.execute(gameState)
      gameState = monsterTurnService.processMonsterTurns(gameState)
      autoSaveMiddleware.afterTurn(gameState)
    }
    // ✅ Always re-render (handles modal closes, inventory updates, etc.)
    renderer.render(gameState)
  })
  ```

- [ ] **4.2 Update InputHandler - Equip**
  - `w` key already shows equipment modal
  - Ensure modal includes torches/lanterns in item list
  - Modal filter should include `ItemType.TORCH` and `ItemType.LANTERN`

- [ ] **4.3 Update InputHandler - Take Off Equipment**
  - Add key binding `t` for "take off equipment" (matches Angband)
  - Shows modal to select which equipment slot to remove
  - Wire up to `TakeOffCommand` with 'prompt' mode
  - Modal displays currently equipped items:
    - Weapon: {name}
    - Armor: {name}
    - Left Ring: {name}
    - Right Ring: {name}
    - Light: {name} ({fuel} turns)
  - User selects slot, command executes with specific slot parameter

- [ ] **4.4 Update ModalController**
  - Add 'torch' and 'lantern' to ItemFilter type
  - Update `filterItems()` to include new item types

- [ ] **4.5 Update GameRenderer**
  - Ensure light source displayed correctly in stats panel
  - Show fuel as `Torch (234/500)` format

**Estimated Effort**: Small (2-3 hours)
**Dependencies**: Phase 3 complete

---

### Phase 5: Dungeon Generation 🏰

**Goal**: Ensure spawned torches/lanterns use new data model

#### Tasks

- [ ] **5.1 Update DungeonService.spawnItems() - Torch**
  ```typescript
  case 'torch': {
    const shouldSpawnArtifact = depth >= 8 && this.random.chance(0.005)

    if (shouldSpawnArtifact) {
      // Spawn artifact (Phial, Star, etc.)
      const artifact = this.random.pickRandom(artifactTemplates)
      item = {
        id: itemId,
        name: artifact.name,
        type: ItemType.TORCH,
        identified: true,
        position: { x, y },
        radius: artifact.radius,
        isPermanent: true,
      } as Artifact
    } else {
      // Spawn regular torch
      item = {
        id: itemId,
        name: 'Torch',
        type: ItemType.TORCH,
        identified: true,
        position: { x, y },
        fuel: 500,
        maxFuel: 500,
        radius: 2,
        isPermanent: false,
      } as Torch
    }
    break
  }
  ```

- [ ] **5.2 Update DungeonService.spawnItems() - Lantern**
  ```typescript
  case 'lantern': {
    item = {
      id: itemId,
      name: 'Lantern',
      type: ItemType.LANTERN,
      identified: true,
      position: { x, y },
      fuel: 500,
      maxFuel: 1000,
      radius: 2,
      isPermanent: false,
    } as Lantern
    break
  }
  ```

- [ ] **5.3 Update Test Data Factories**
  - Update `createTestPlayer()` in test files
  - Update `createTestState()` in integration tests
  - Ensure all test torches/lanterns use new format

**Estimated Effort**: Small (1-2 hours)
**Dependencies**: Phase 1 complete

---

### Phase 6: Testing 🧪

**Goal**: Ensure all functionality works correctly

#### Tasks

- [ ] **6.1 Update Unit Tests**
  - [ ] LightingService tests (~6 files)
  - [ ] InventoryService tests (equip/unequip tests)
  - [ ] EquipCommand tests
  - [ ] UnequipLightSourceCommand tests (new)
  - [ ] RefillLanternCommand tests
  - [ ] DungeonService spawn tests

- [ ] **6.2 Update Integration Tests**
  - [ ] game-loop.test.ts
  - [ ] MoveCommand integration tests

- [ ] **6.3 Create New Test Scenarios**
  - [ ] Equip torch → use it until fuel runs out → equip new torch
  - [ ] Switch between torches (verify fuel preserved)
  - [ ] Unequip torch → re-equip (verify fuel unchanged)
  - [ ] Refill lantern → verify fuel added correctly
  - [ ] Pick up artifact → verify isPermanent works
  - [ ] **Auto-drop burnt torch when equipping new light** (verify old torch not in inventory)
  - [ ] **Torch burns out while equipped** (fuel reaches 0, next equip auto-drops it)
  - [ ] **Equip burnt-out torch directly** (should fail or auto-drop with warning)

- [ ] **6.4 Edge Case Testing**
  - [ ] Equip torch with 0 fuel (should still equip but provide no light)
  - [ ] Inventory full when unequipping light source
  - [ ] Multiple torches in inventory with different fuel levels
  - [ ] Save/load game with equipped torch (fuel persists)

**Estimated Effort**: Medium-Large (4-6 hours)
**Dependencies**: Phases 1-5 complete

---

### Phase 7: Documentation 📚

**Goal**: Update all documentation for new system

#### Tasks

- [ ] **7.1 Update Command Docs**
  - [ ] `docs/commands/equip.md` - Add torch/lantern examples
  - [ ] Create `docs/commands/unequip-light.md`
  - [ ] Update `docs/commands/refill.md` if needed
  - [ ] Update `docs/commands/README.md` - Add key bindings

- [ ] **7.2 Update System Docs**
  - [ ] `docs/systems-core.md` - Lighting System section
  - [ ] Document new data model
  - [ ] Document equip/unequip mechanics

- [ ] **7.3 Update Architecture Docs**
  - [ ] `docs/architecture.md` - Data structures
  - [ ] Remove LightSource interface docs
  - [ ] Add Torch/Lantern interface docs

- [ ] **7.4 Update CLAUDE.md**
  - [ ] Update "Key Systems Reference" - Lighting System
  - [ ] Update any examples that reference LightSource

- [ ] **7.5 Update Game Design Docs**
  - [ ] `docs/game-design.md` - Light Sources section
  - [ ] Clarify equip/unequip mechanics

**Estimated Effort**: Small (1-2 hours)
**Dependencies**: Phases 1-6 complete

---

### Phase 8: Migration & Rollout 🚀

**Goal**: Handle save file migration and deploy changes

#### Tasks

- [ ] **8.1 Save File Migration**
  - [ ] Add migration function to LocalStorageService
  - [ ] Detect old save format (has `equipment.lightSource` as LightSource object)
  - [ ] Convert to new format (create Torch/Lantern item)
  - [ ] Test migration with various save states

- [ ] **8.2 Backwards Compatibility**
  - [ ] Decide: support old saves OR require new game?
  - [ ] If supporting: write migration logic
  - [ ] If NOT supporting: clear old saves on version mismatch

- [ ] **8.3 Version Bump**
  - [ ] Increment game version in package.json
  - [ ] Add version to GameState interface
  - [ ] Use for save compatibility checks

- [ ] **8.4 Changelog**
  - [ ] Document breaking changes
  - [ ] Document new features
  - [ ] Migration instructions for players

**Estimated Effort**: Small-Medium (2-3 hours)
**Dependencies**: All previous phases complete

---

## Task Checklist Summary

### Phase 1: Data Model (6 tasks)
- [ ] Update Torch interface
- [ ] Update Lantern interface
- [ ] Create Artifact type
- [ ] Update Equipment interface
- [ ] Remove LightSource interface
- [ ] Fix compilation errors

### Phase 2: Services (8 tasks)
- [ ] Update LightingService.tickFuel()
- [ ] Update LightingService.getLightRadius()
- [ ] Update LightingService.refillPlayerLantern()
- [ ] Remove LightingService.createTorch()
- [ ] Remove LightingService.createLantern()
- [ ] Remove LightingService.createArtifact()
- [ ] Update InventoryService methods (4 subtasks, includes auto-drop logic)
- [ ] Add LightingService.shouldAutoDropLight()

### Phase 3: Commands (4 tasks)
- [ ] Update EquipCommand (add TORCH and LANTERN cases)
- [ ] Create TakeOffCommand (generic equipment removal, replaces UnequipLightSourceCommand)
- [ ] Update RefillLanternCommand
- [ ] (Optional) Create FuelTorchCommand

### Phase 4: UI & Input (5 tasks)
- [ ] Fix Escape key bug
- [ ] Update InputHandler - Equip
- [ ] Update InputHandler - Unequip
- [ ] Update ModalController
- [ ] Update GameRenderer

### Phase 5: Dungeon Generation (3 tasks)
- [ ] Update DungeonService - Torch spawning
- [ ] Update DungeonService - Lantern spawning
- [ ] Update test data factories

### Phase 6: Testing (4 categories, ~15 tasks)
- [ ] Update unit tests (6 files)
- [ ] Update integration tests
- [ ] Create new test scenarios (5 tests)
- [ ] Edge case testing (4 tests)

### Phase 7: Documentation (5 tasks)
- [ ] Update command docs (4 files)
- [ ] Update system docs
- [ ] Update architecture docs
- [ ] Update CLAUDE.md
- [ ] Update game design docs

### Phase 8: Migration (4 tasks)
- [ ] Save file migration
- [ ] Backwards compatibility
- [ ] Version bump
- [ ] Changelog

**Total Tasks**: ~48 tasks
**Estimated Total Effort**: 20-30 hours

---

## Testing Strategy

### Unit Test Coverage

**Must Cover:**
- Fuel ticking (decrements correctly)
- Fuel warnings (50, 10, 0 turns)
- Equip light source (torch, lantern, artifact)
- Unequip light source (fuel preserved)
- Refill lantern (adds fuel, caps at max)
- Light radius calculation (0 when no fuel, normal when fueled)
- Spawning (torches, lanterns, artifacts with correct fuel)

### Integration Test Coverage

**Must Cover:**
- Full game loop: equip torch → move → fuel ticks → unequip → re-equip
- Multiple torches: switch between torches with different fuel levels
- Lantern refill: use lantern → refill with oil → continue using
- Artifact: equip artifact → fuel never depletes
- Save/load: save with equipped torch → load → fuel preserved

### Edge Cases

1. **Zero fuel edge case**
   - Equip torch with 0 fuel → should equip but provide radius 0
   - Message: "Your torch has burned out."

2. **Inventory full when unequipping**
   - Try to unequip when inventory is full (26/26)
   - Should fail with message: "Your pack is full."

3. **Multiple light sources**
   - Multiple torches with varying fuel in inventory
   - Equipping one shouldn't affect others

4. **Fuel overflow**
   - Refill lantern when fuel = 900, oil flask = 500
   - Should cap at maxFuel (1000), not go to 1400

---

## Auto-Drop Burnt Torches - Design

### Rationale

**Problem**: Burnt-out torches (fuel = 0) clutter inventory with useless items.

**Solution**: Automatically drop torches when they reach 0 fuel, similar to how Angband handles depleted light sources.

### Design Decision

When a torch reaches 0 fuel, it becomes "burnt out" and should be removed from the game. This happens in two scenarios:

1. **Torch burns out while equipped** (fuel ticks to 0 during gameplay)
2. **Player equips new light while old light is burnt out** (auto-drop during equip)

### Implementation Flow

#### Scenario 1: Torch Burns Out While Equipped

```
Turn N:   Player has torch equipped with fuel = 1
          Player moves → LightingService.tickFuel() → fuel becomes 0
          Message: "Your torch goes out! You are in darkness!"
          Torch remains equipped but provides radius = 0

Turn N+1: Player equips new torch
          InventoryService.equipLightSource() checks old torch fuel
          Old torch has fuel = 0 → NOT returned to inventory (auto-dropped)
          Message: "You light and wield Torch. Your burnt-out torch crumbles to ash."
```

#### Scenario 2: Player Tries to Equip Burnt-Out Torch

```
Inventory: Torch A (fuel = 0), Torch B (fuel = 300)
Action:    Player tries to equip Torch A
Result:    EquipCommand → InventoryService.equipLightSource()
           Detects fuel = 0 → removes from inventory
           Message: "Your torch is burnt out and crumbles to ash."
           No turn consumed, no equipment change
```

### Service Responsibilities

**LightingService**:
- `tickFuel()`: Decrements fuel, generates warnings at 0
- `shouldAutoDropLight()`: Returns true if fuel <= 0 and not permanent

**InventoryService**:
- `equipLightSource()`: Checks old light with `shouldAutoDropLight()`
  - If true: don't add to inventory (auto-drop)
  - If false: return to inventory normally

### Messages

| Event | Message | Type |
|-------|---------|------|
| Torch burns out (tick to 0) | "Your torch goes out! You are in darkness!" | critical |
| Equip new light (old burnt) | "You light and wield Torch. Your burnt-out torch crumbles to ash." | success |
| Try to equip burnt torch | "Your torch is burnt out and crumbles to ash." | warning |

### Edge Cases

1. **Lanterns never auto-drop** - They can be refilled, so always return to inventory
2. **Artifacts never auto-drop** - Permanent light sources (fuel = undefined)
3. **Unequipping burnt torch** - If player manually unequips (take off command):
   - Still returns to inventory (player explicitly asked for it)
   - Can be dropped manually later
4. **Burnt torch already in inventory** - If player somehow has burnt torch in inventory:
   - Trying to equip it triggers auto-drop
   - No turn consumed

### Testing Requirements

- Unit test: `LightingService.shouldAutoDropLight()`
  - Returns true for torch with fuel = 0
  - Returns false for torch with fuel > 0
  - Returns false for lantern with fuel = 0 (can be refilled)
  - Returns false for artifact (isPermanent = true)

- Integration test: `InventoryService.equipLightSource()`
  - Equip new torch while old has fuel = 0 → old not in inventory
  - Equip new torch while old has fuel > 0 → old in inventory
  - Try to equip burnt torch → removed from inventory, message shown

---

## Risk Assessment

### High Risk ⚠️

1. **Breaking Save Files**
   - Impact: Players lose progress
   - Mitigation: Warn in changelog, provide migration
   - Likelihood: 100% (data model changed)

2. **Fuel Not Persisting**
   - Impact: Game-breaking bug
   - Mitigation: Thorough integration testing
   - Likelihood: Medium (complex state management)

### Medium Risk ⚠️

1. **Test Update Scope**
   - Impact: Many tests to update (~20-30 files)
   - Mitigation: Systematic approach, use test factories
   - Likelihood: 100% (expected)

2. **Regression Bugs**
   - Impact: Break existing functionality
   - Mitigation: Full test suite run before commit
   - Likelihood: Medium

### Low Risk ✅

1. **Performance Impact**
   - Impact: Minimal (simpler data model)
   - Mitigation: None needed
   - Likelihood: Low

2. **UI/UX Confusion**
   - Impact: Players don't understand new system
   - Mitigation: Clear messages, documentation
   - Likelihood: Low (follows Angband conventions)

---

## Success Criteria

### Functional Requirements ✅

- [ ] Player can equip torch from inventory (fuel tracked)
- [ ] Player can unequip torch (fuel preserved)
- [ ] Player can switch between torches (each has independent fuel)
- [ ] Fuel depletes 1 per turn when equipped
- [ ] Warnings at 50, 10, 0 fuel
- [ ] Light radius = 0 when fuel = 0
- [ ] Lanterns can be refilled with oil flasks
- [ ] Artifacts never run out of fuel
- [ ] Escape key closes modals and re-renders
- [ ] All tests pass (140/140 suites)

### Non-Functional Requirements ✅

- [ ] No performance degradation
- [ ] Code maintains immutability patterns
- [ ] Clear error messages
- [ ] Documentation complete and accurate
- [ ] Save/load works correctly

---

## Rollout Plan

### Pre-Release Checklist

- [ ] All phases complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Save migration tested
- [ ] Changelog written

### Release Steps

1. **Version Bump**: Update to v1.1.0 (minor version, breaking change)
2. **Tag Commit**: `git tag v1.1.0`
3. **Changelog**: Create CHANGELOG.md entry
4. **Deploy**: Push to main branch
5. **Announcement**: Warn players of save incompatibility

### Post-Release

- Monitor for bug reports
- Hot-fix critical issues within 24 hours
- Gather feedback on new system
- Consider quality-of-life improvements (FuelTorchCommand, etc.)

---

## Future Enhancements

### Phase 9+ (Optional)

- [ ] **Torch Fueling** - Combine torches like Angband
- [ ] **Enchanted Lanterns** - Lanterns with bonuses (Angband feature)
- [ ] **Light Source Inventory Section** - Dedicated UI section
- [ ] **Fuel HUD** - Visual fuel bar in stats panel
- [ ] **Auto-Equip** - Auto-equip torch when current runs out
- [ ] **Light Source Comparison** - Compare fuel levels before equipping

---

## Notes

- This plan assumes **no backwards compatibility** for save files (cleanest approach)
- Angband uses `F` for fuel, we already use `F` for refill - no change needed
- Consider adding `L` key for "light source" menu (alternative to `w` for equip)
- Artifacts use `ItemType.TORCH` with `isPermanent: true` flag

---

**Last Updated**: 2025-10-05
**Author**: Dirk Kok + Claude Code
**Status**: Ready for Implementation
