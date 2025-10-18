# InputHandler Integration Tests Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Create comprehensive integration tests for InputHandler to verify all 40+ commands are properly instantiated with required dependencies and execute without errors.

**Architecture:** Category-based test organization (5 files) with shared test fixtures. Tests use real service instances (not mocks) to verify full integration. Each test creates a KeyboardEvent, gets command from handleKeyPress(), executes it, and verifies no errors occur.

**Tech Stack:** Jest, TypeScript, MockRandom, fake-indexeddb

**Context:** This prevents integration bugs like missing CommandRecorderService parameters that unit tests don't catch because they test components in isolation.

---

## Task 1: Create Shared Test Helpers

**Files:**
- Create: `src/ui/test-helpers/InputHandlerTestHelpers.ts`

**Step 1: Write test helper utilities**

Create the shared test infrastructure that all InputHandler tests will use:

```typescript
import { GameState, Player, Level, TileType, Position, GameDependencies } from '@game/core/core'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { CombatService } from '@services/CombatService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { NotificationService } from '@services/NotificationService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { ToastNotificationService } from '@services/ToastNotificationService'
import { DoorService } from '@services/DoorService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { CurseService } from '@services/CurseService'
import { GoldService } from '@services/GoldService'
import { TargetingService } from '@services/TargetingService'
import { RingService } from '@services/RingService'
import { StairsNavigationService } from '@services/StairsNavigationService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { IndexedDBService } from '@services/IndexedDBService'
import { DownloadService } from '@services/DownloadService'

/**
 * Creates a minimal but valid test player
 */
export function createTestPlayer(): Player {
  return {
    position: { x: 10, y: 10 },
    hp: 12,
    maxHp: 12,
    strength: 16,
    maxStrength: 16,
    ac: 8,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: null,
    },
    inventory: [],
  }
}

/**
 * Creates a minimal valid dungeon level
 */
export function createMinimalLevel(depth: number = 1): Level {
  const width = 80
  const height = 22

  return {
    depth,
    width,
    height,
    tiles: Array(height)
      .fill(null)
      .map(() =>
        Array(width).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#FFFFFF',
          colorExplored: '#888888',
        })
      ),
    rooms: [],
    doors: [],
    traps: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: { x: 40, y: 11 },
    explored: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
    visible: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
  }
}

/**
 * Creates a minimal valid game state for testing
 */
export function createTestGameState(): GameState {
  const level = createMinimalLevel(1)

  return {
    player: createTestPlayer(),
    levels: new Map([[1, level]]),
    currentLevel: 1,
    messages: [],
    turnCount: 0,
    isGameOver: false,
    hasAmulet: false,
    seed: 'test-seed-123',
    debug: {
      debugConsoleVisible: false,
      godMode: false,
      revealMap: false,
      fovDebugOverlay: false,
      pathDebugOverlay: false,
      aiDebugOverlay: false,
      fovMode: 'radius',
    },
  }
}

/**
 * Creates all game dependencies with real service instances
 */
export function createTestDependencies(): GameDependencies {
  const random = new MockRandom()
  const dungeonConfig: DungeonConfig = {
    minRooms: 4,
    maxRooms: 9,
    minRoomSize: 3,
    maxRoomSize: 8,
    maxCorridorLength: 20,
    loopProbability: 0.3,
  }

  return {
    // Core gameplay services
    movement: new MovementService(),
    lighting: new LightingService(),
    fov: new FOVService(),
    message: new MessageService(),
    random,
    turn: new TurnService(),
    level: new LevelService(),

    // World generation
    dungeon: new DungeonService(random, dungeonConfig),
    stairsNavigation: new StairsNavigationService(),
    dungeonConfig,

    // Combat and entities
    combat: new CombatService(random),
    gold: new GoldService(),

    // Player stats and progression
    hunger: new HungerService(),
    regeneration: new RegenerationService(),
    leveling: new LevelingService(),
    statusEffect: new StatusEffectService(),

    // Inventory and items
    inventory: new InventoryService(),
    identification: new IdentificationService(),
    curse: new CurseService(),
    ring: new RingService(),

    // Item usage
    potion: new PotionService(random),
    scroll: new ScrollService(random),
    wand: new WandService(random),

    // Environment interaction
    door: new DoorService(),
    targeting: new TargetingService(),

    // Persistence and meta
    localStorage: new LocalStorageService(),
    notification: new NotificationService(),
    toastNotification: new ToastNotificationService(),
    victory: new VictoryService(),
    debug: new DebugService(),

    // Replay and debugging
    commandRecorder: new CommandRecorderService(),
    replayDebugger: new ReplayDebuggerService(new IndexedDBService()),
    indexedDB: new IndexedDBService(),
    download: new DownloadService(),
  }
}

/**
 * Creates a mock KeyboardEvent for testing
 */
export function createKeyboardEvent(key: string, ctrlKey: boolean = false, shiftKey: boolean = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey,
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
}
```

**Step 2: Commit test helpers**

```bash
git add src/ui/test-helpers/
git commit -m "test: add shared test helpers for InputHandler integration tests"
```

---

## Task 2: Create Movement Command Tests

**Files:**
- Create: `src/ui/InputHandler.movement.test.ts`

**Step 1: Write movement command tests**

```typescript
import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'

describe('InputHandler - Movement Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager
  let gameRenderer: GameRenderer

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    // Create minimal mocks for UI dependencies
    modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      hide: jest.fn(),
    } as any

    const messageHistoryModal = { show: jest.fn() }
    const helpModal = { show: jest.fn() }
    const onReturnToMenu = jest.fn()
    stateManager = new GameStateManager()
    gameRenderer = {} as any // Not needed for these tests

    handler = new InputHandler(
      dependencies,
      modalController,
      messageHistoryModal,
      helpModal,
      onReturnToMenu,
      stateManager,
      gameRenderer
    )
  })

  describe('MoveCommand - Arrow Keys', () => {
    it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
      'should handle %s without errors',
      (key) => {
        const event = createKeyboardEvent(key)
        const command = handler.handleKeyPress(event, state)

        expect(command).toBeDefined()
        expect(command).not.toBeNull()
        expect(() => command!.execute(state)).not.toThrow()
      }
    )

    it('should record command execution for ArrowRight', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent('ArrowRight')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      expect(recordSpy).toHaveBeenCalledTimes(1)
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          commandType: expect.any(String),
          rngState: expect.any(String),
          actorType: 'player',
        })
      )
    })

    it('should return new state object (immutability)', () => {
      const event = createKeyboardEvent('ArrowRight')
      const command = handler.handleKeyPress(event, state)
      const newState = command!.execute(state)

      expect(newState).toBeDefined()
      expect(newState).not.toBe(state)
    })
  })

  describe('MoveStairsCommand', () => {
    it('should handle > (down stairs) without errors', () => {
      const event = createKeyboardEvent('>')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle < (up stairs) without errors', () => {
      const event = createKeyboardEvent('<')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('Door Commands', () => {
    it('should handle o (open door) mode without errors', () => {
      // First press 'o' to enter open door mode
      const oEvent = createKeyboardEvent('o')
      let command = handler.handleKeyPress(oEvent, state)
      expect(command).toBeNull() // Mode switch, no command yet

      // Then press direction
      const dirEvent = createKeyboardEvent('ArrowRight')
      command = handler.handleKeyPress(dirEvent, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle c (close door) mode without errors', () => {
      // First press 'c' to enter close door mode
      const cEvent = createKeyboardEvent('c')
      let command = handler.handleKeyPress(cEvent, state)
      expect(command).toBeNull() // Mode switch, no command yet

      // Then press direction
      const dirEvent = createKeyboardEvent('ArrowDown')
      command = handler.handleKeyPress(dirEvent, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- InputHandler.movement.test.ts
```

Expected: All tests PASS (commands already have correct dependencies)

**Step 3: Commit movement tests**

```bash
git add src/ui/InputHandler.movement.test.ts
git commit -m "test: add InputHandler movement command integration tests"
```

---

## Task 3: Create Items Command Tests

**Files:**
- Create: `src/ui/InputHandler.items.test.ts`

**Step 1: Write items command tests**

```typescript
import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { GameRenderer } from './GameRenderer'
import { Food, FoodType } from '@game/core/core'

describe('InputHandler - Items Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>
  let modalController: ModalController
  let stateManager: GameStateManager

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      hide: jest.fn(),
    } as any

    const messageHistoryModal = { show: jest.fn() }
    const helpModal = { show: jest.fn() }
    const onReturnToMenu = jest.fn()
    stateManager = new GameStateManager()

    handler = new InputHandler(
      dependencies,
      modalController,
      messageHistoryModal,
      helpModal,
      onReturnToMenu,
      stateManager,
      {} as any
    )
  })

  describe('PickUpCommand', () => {
    it('should handle , (pickup) without errors', () => {
      const event = createKeyboardEvent(',')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent(',')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      expect(recordSpy).toHaveBeenCalled()
    })
  })

  describe('DropCommand', () => {
    it('should handle d (drop) key press without errors', () => {
      // Add item to inventory first
      const food: Food = {
        id: 'test-food-1',
        type: 'food',
        foodType: FoodType.RATION,
        name: 'ration',
        identified: true,
        position: null,
      }
      state.player.inventory.push(food)

      const event = createKeyboardEvent('d')
      // This opens modal, doesn't return command immediately
      const command = handler.handleKeyPress(event, state)

      // Modal interaction - command is null for modal triggers
      expect(command).toBeNull()
    })
  })

  describe('QuaffPotionCommand', () => {
    it('should handle q (quaff) key press without errors', () => {
      const event = createKeyboardEvent('q')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('ReadScrollCommand', () => {
    it('should handle r (read) key press without errors', () => {
      const event = createKeyboardEvent('r')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('ZapWandCommand', () => {
    it('should handle z (zap) key press without errors', () => {
      const event = createKeyboardEvent('z')
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('EatCommand', () => {
    it('should handle e (eat) without errors', () => {
      const event = createKeyboardEvent('e')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('RefillLanternCommand', () => {
    it('should handle F (refill) key press without errors', () => {
      const event = createKeyboardEvent('F', false, true)
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('RestCommand', () => {
    it('should handle . (rest) without errors', () => {
      const event = createKeyboardEvent('.')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle 5 (rest) without errors', () => {
      const event = createKeyboardEvent('5')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
```

**Step 2: Run tests**

```bash
npm test -- InputHandler.items.test.ts
```

Expected: All tests PASS

**Step 3: Commit items tests**

```bash
git add src/ui/InputHandler.items.test.ts
git commit -m "test: add InputHandler items command integration tests"
```

---

## Task 4: Create Equipment Command Tests

**Files:**
- Create: `src/ui/InputHandler.equipment.test.ts`

**Step 1: Write equipment command tests**

```typescript
import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'
import { Torch } from '@game/core/core'

describe('InputHandler - Equipment Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    const modalController = {
      handleInput: jest.fn(() => false),
      showInventory: jest.fn(),
      showEquippedRingSelection: jest.fn(),
      hide: jest.fn(),
    } as any

    handler = new InputHandler(
      dependencies,
      modalController,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any,
      jest.fn(),
      new GameStateManager(),
      {} as any
    )
  })

  describe('EquipCommand - Wield', () => {
    it('should handle w (wield) key press without errors', () => {
      const event = createKeyboardEvent('w')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeNull() // Opens modal
    })
  })

  describe('EquipCommand - Wear', () => {
    it('should handle W (wear) key press without errors', () => {
      const event = createKeyboardEvent('W', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeNull() // Opens modal
    })
  })

  describe('EquipCommand - Put On Ring', () => {
    it('should handle P (put on ring) key press without errors', () => {
      const event = createKeyboardEvent('P', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeNull() // Opens modal
    })
  })

  describe('UnequipCommand - Remove Ring', () => {
    it('should handle R (remove ring) key press without errors', () => {
      const event = createKeyboardEvent('R', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeNull() // Opens modal
    })
  })

  describe('TakeOffCommand', () => {
    it('should handle t (take off) with light source equipped', () => {
      // Equip a torch
      const torch: Torch = {
        id: 'torch-1',
        type: 'torch',
        name: 'torch',
        identified: true,
        radius: 2,
        fuel: 500,
        position: null,
      }
      state.player.equipment.lightSource = torch

      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle t with no equipment', () => {
      const event = createKeyboardEvent('t')
      const command = handler.handleKeyPress(event, state)

      // Returns null when nothing equipped
      expect(command).toBeNull()
    })
  })
})
```

**Step 2: Run tests**

```bash
npm test -- InputHandler.equipment.test.ts
```

Expected: All tests PASS

**Step 3: Commit equipment tests**

```bash
git add src/ui/InputHandler.equipment.test.ts
git commit -m "test: add InputHandler equipment command integration tests"
```

---

## Task 5: Create Actions Command Tests

**Files:**
- Create: `src/ui/InputHandler.actions.test.ts`

**Step 1: Write actions command tests**

```typescript
import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'

describe('InputHandler - Actions Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    const modalController = {
      handleInput: jest.fn(() => false),
    } as any

    handler = new InputHandler(
      dependencies,
      modalController,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any,
      jest.fn(),
      new GameStateManager(),
      {} as any
    )
  })

  describe('SearchCommand', () => {
    it('should handle s (search) without errors', () => {
      const event = createKeyboardEvent('s')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent('s')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      expect(recordSpy).toHaveBeenCalled()
    })
  })

  describe('SaveCommand', () => {
    it('should handle S (save) without errors', () => {
      const event = createKeyboardEvent('S', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('QuitCommand', () => {
    it('should handle Q (quit) without errors', () => {
      const event = createKeyboardEvent('Q', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
```

**Step 2: Run tests**

```bash
npm test -- InputHandler.actions.test.ts
```

Expected: All tests PASS

**Step 3: Commit actions tests**

```bash
git add src/ui/InputHandler.actions.test.ts
git commit -m "test: add InputHandler actions command integration tests"
```

---

## Task 6: Create Debug Command Tests

**Files:**
- Create: `src/ui/InputHandler.debug.test.ts`

**Step 1: Write debug command tests**

```typescript
import { InputHandler } from './InputHandler'
import { createTestDependencies, createTestGameState, createKeyboardEvent } from './test-helpers/InputHandlerTestHelpers'
import { ModalController } from './ModalController'
import { GameStateManager } from '@services/GameStateManager'

describe('InputHandler - Debug Commands', () => {
  let handler: InputHandler
  let dependencies: ReturnType<typeof createTestDependencies>
  let state: ReturnType<typeof createTestGameState>

  beforeEach(() => {
    dependencies = createTestDependencies()
    state = createTestGameState()

    // Enable debug mode and open console
    state.debug = {
      debugConsoleVisible: true,
      godMode: false,
      revealMap: false,
      fovDebugOverlay: false,
      pathDebugOverlay: false,
      aiDebugOverlay: false,
      fovMode: 'radius',
    }

    const modalController = {
      handleInput: jest.fn(() => false),
      showSpawnItemCategory: jest.fn(),
      showSpawnItemSubtype: jest.fn(),
      hide: jest.fn(),
    } as any

    handler = new InputHandler(
      dependencies,
      modalController,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any,
      jest.fn(),
      new GameStateManager(),
      {} as any
    )
  })

  describe('ToggleDebugConsoleCommand', () => {
    it('should handle ~ (toggle console) without errors', () => {
      const event = createKeyboardEvent('~')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('ToggleGodModeCommand', () => {
    it('should handle g (god mode) without errors', () => {
      const event = createKeyboardEvent('g')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should record command execution', () => {
      const recordSpy = jest.spyOn(dependencies.commandRecorder, 'recordCommand')

      const event = createKeyboardEvent('g')
      const command = handler.handleKeyPress(event, state)
      command!.execute(state)

      expect(recordSpy).toHaveBeenCalled()
    })
  })

  describe('RevealMapCommand', () => {
    it('should handle v (reveal map) without errors', () => {
      const event = createKeyboardEvent('v')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('SpawnMonsterCommand', () => {
    it('should handle m (spawn monster) without errors', () => {
      const event = createKeyboardEvent('m')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('WakeAllMonstersCommand', () => {
    it('should handle M (wake all) without errors', () => {
      const event = createKeyboardEvent('M', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('KillAllMonstersCommand', () => {
    it('should handle K (kill all) without errors', () => {
      const event = createKeyboardEvent('K', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('ToggleFOVDebugCommand', () => {
    it('should handle f (FOV debug) without errors', () => {
      const event = createKeyboardEvent('f')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('TogglePathDebugCommand', () => {
    it('should handle p (path debug) without errors', () => {
      const event = createKeyboardEvent('p')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('ToggleAIDebugCommand', () => {
    it('should handle n (AI debug) without errors', () => {
      const event = createKeyboardEvent('n')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('IdentifyAllItemsCommand', () => {
    it('should handle a (identify all) without errors', () => {
      const event = createKeyboardEvent('a')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('ToggleFOVModeCommand', () => {
    it('should handle x (FOV mode) without errors', () => {
      const event = createKeyboardEvent('x')
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })

  describe('SpawnItemCommand', () => {
    it('should handle I (spawn item) key press without errors', () => {
      const event = createKeyboardEvent('I', false, true)
      const command = handler.handleKeyPress(event, state)

      // Opens modal
      expect(command).toBeNull()
    })
  })

  describe('Replay Debug Commands', () => {
    it('should handle L (launch replay debugger) without errors', () => {
      const event = createKeyboardEvent('L', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle C (choose replay) without errors', () => {
      const event = createKeyboardEvent('C', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })

    it('should handle E (export replay) without errors', () => {
      const event = createKeyboardEvent('E', false, true)
      const command = handler.handleKeyPress(event, state)

      expect(command).toBeDefined()
      expect(() => command!.execute(state)).not.toThrow()
    })
  })
})
```

**Step 2: Run tests**

```bash
npm test -- InputHandler.debug.test.ts
```

Expected: All tests PASS

**Step 3: Commit debug tests**

```bash
git add src/ui/InputHandler.debug.test.ts
git commit -m "test: add InputHandler debug command integration tests"
```

---

## Task 7: Run All Tests and Verify Coverage

**Step 1: Run all InputHandler tests together**

```bash
npm test -- InputHandler
```

Expected: All ~50-60 tests PASS across 5 test files

**Step 2: Check test coverage for InputHandler**

```bash
npm test -- InputHandler --coverage --collectCoverageFrom='src/ui/InputHandler.ts'
```

Expected: High coverage on InputHandler.ts (focus is on integration, not 100% line coverage)

**Step 3: Create final commit**

```bash
git add -A
git commit -m "test: complete InputHandler integration test suite

- 5 test files organized by command category
- 50+ test cases covering all commands
- Verifies proper dependency injection
- Catches missing CommandRecorderService issues
- Uses real services for true integration testing

Tests prevent regressions in command instantiation that unit tests miss."
```

---

## Verification

After completing all tasks:

1. **All tests pass**: `npm test -- InputHandler` shows all green
2. **Fast execution**: Full suite runs in < 1 second
3. **Coverage**: InputHandler.ts has high statement/branch coverage
4. **Regression prevention**: Future missing dependencies will fail these tests
5. **Maintainable**: New commands can be easily added to appropriate category file

## Success Criteria

✅ 5 test files created (movement, items, equipment, actions, debug)
✅ Shared test helpers file with fixtures
✅ ~50-60 test cases all passing
✅ Each test verifies command instantiation and execution
✅ CommandRecorderService integration verified
✅ Tests run fast (< 1s total)
✅ All commits follow conventional commit format
