import { ContextService } from './ContextService'
import {
  GameState,
  Level,
  Item,
  Monster,
  Door,
  DoorState,
  Position,
  ItemType,
  MonsterBehavior,
  MonsterState,
  TileType,
} from '@game/core/core'

// ============================================================================
// CONTEXT SERVICE TESTS - Context Detection
// ============================================================================

describe('ContextService - Context Detection', () => {
  let service: ContextService
  let mockState: GameState
  let mockLevel: Level

  beforeEach(() => {
    service = new ContextService()

    // Create minimal level
    mockLevel = {
      depth: 1,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#888',
            colorExplored: '#444',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }

    // Create minimal game state
    mockState = {
      player: {
        position: { x: 10, y: 10 },
        hp: 12,
        maxHp: 12,
        strength: 16,
        maxStrength: 16,
        ac: 4,
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
      },
      currentLevel: 1,
      levels: new Map([[1, mockLevel]]),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  })

  describe('Item Context', () => {
    test('shows pickup command when standing on item', () => {
      // Arrange: place item at player position
      const item: Item = {
        id: 'item-1',
        name: 'test item',
        type: ItemType.POTION,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.primaryHint).toContain('Item here')
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: ',', label: 'pickup' })
      )
    })

    test('shows type-specific commands for weapon', () => {
      // Arrange: weapon at position
      const weapon: Item = {
        id: 'weapon-1',
        name: 'sword',
        type: ItemType.WEAPON,
        identified: true,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [weapon]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'w', label: 'wield' })
      )
    })

    test('shows type-specific commands for armor', () => {
      // Arrange: armor at position
      const armor: Item = {
        id: 'armor-1',
        name: 'plate mail',
        type: ItemType.ARMOR,
        identified: true,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [armor]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'W', label: 'wear' })
      )
    })

    test('shows type-specific commands for ring', () => {
      // Arrange: ring at position
      const ring: Item = {
        id: 'ring-1',
        name: 'ruby ring',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [ring]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'P', label: 'put on' })
      )
    })
  })

  describe('Gold Context', () => {
    test('shows gold message with correct amount', () => {
      // Arrange: gold at position
      mockLevel.gold = [{ position: { x: 10, y: 10 }, amount: 47 }]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.primaryHint).toBe('47 gold pieces here')
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: ',', label: 'pickup gold' })
      )
    })
  })

  describe('Door Context', () => {
    test('shows open command for adjacent closed door', () => {
      // Arrange: closed door adjacent to player (north)
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.doors = [door]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'o', label: 'open door' })
      )
    })

    test('shows close command for adjacent open door', () => {
      // Arrange: open door adjacent
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.doors = [door]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'c', label: 'close door' })
      )
    })

    test('shows search command for nearby door', () => {
      // Arrange: any door nearby
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.doors = [door]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 's', label: 'search' })
      )
    })
  })

  describe('Stairs Context', () => {
    test('shows descend command when on stairs down', () => {
      // Arrange: player on stairs down
      mockLevel.stairsDown = { x: 10, y: 10 }

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: '>', label: 'descend' })
      )
    })

    test('shows ascend command when on stairs up', () => {
      // Arrange: player on stairs up
      mockLevel.stairsUp = { x: 10, y: 10 }

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: '<', label: 'ascend' })
      )
    })
  })

  describe('Combat Context', () => {
    test('shows attack command for adjacent awake monster', () => {
      // Arrange: awake monster adjacent
      const monster: Monster = {
        id: 'monster-1',
        letter: 'O',
        name: 'Orc',
        position: { x: 10, y: 9 },
        hp: 10,
        maxHp: 10,
        ac: 6,
        damage: '1d8',
        xpValue: 10,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 5,
          aggroRange: 5,
          fleeThreshold: 0,
          special: [],
        },
        isAsleep: false,
        isAwake: true,
        state: MonsterState.HUNTING,
        visibleCells: new Set(),
        currentPath: null,
        hasStolen: false,
        level: 1,
      }
      mockLevel.monsters = [monster]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: '↑↓←→', label: 'attack' })
      )
    })

    test('does not show attack for sleeping monster', () => {
      // Arrange: sleeping monster adjacent
      const monster: Monster = {
        id: 'monster-1',
        letter: 'O',
        name: 'Orc',
        position: { x: 10, y: 9 },
        hp: 10,
        maxHp: 10,
        ac: 6,
        damage: '1d8',
        xpValue: 10,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 5,
          aggroRange: 5,
          fleeThreshold: 0,
          special: [],
        },
        isAsleep: true,
        isAwake: false,
        state: MonsterState.SLEEPING,
        visibleCells: new Set(),
        currentPath: null,
        hasStolen: false,
        level: 1,
      }
      mockLevel.monsters = [monster]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions.find((a) => a.label === 'attack')).toBeUndefined()
    })
  })

  describe('Warnings', () => {
    test('shows inventory full warning at 26 items', () => {
      // Arrange: 26 items in inventory
      mockState.player.inventory = Array(26)
        .fill(null)
        .map((_, i) => ({
          id: `item-${i}`,
          name: `item ${i}`,
          type: ItemType.POTION,
          identified: false,
          position: { x: 0, y: 0 },
        }))

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.warnings).toContain('⚠ Inventory full (26/26)')
    })

    test('shows drop command when inventory full', () => {
      // Arrange: 26 items in inventory
      mockState.player.inventory = Array(26)
        .fill(null)
        .map((_, i) => ({
          id: `item-${i}`,
          name: `item ${i}`,
          type: ItemType.POTION,
          identified: false,
          position: { x: 0, y: 0 },
        }))

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'd', label: 'drop item', category: 'primary' })
      )
    })
  })

  describe('Priority Sorting', () => {
    test('sorts actions by priority descending', () => {
      // Arrange: item at position (creates multiple priority actions)
      const item: Item = {
        id: 'item-1',
        name: 'sword',
        type: ItemType.WEAPON,
        identified: true,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      const priorities = context.actions.map((a) => a.priority)
      const sorted = [...priorities].sort((a, b) => b - a)
      expect(priorities).toEqual(sorted)
    })

    test('limits to 7 actions maximum', () => {
      // Arrange: multiple contexts (item + door + stairs + monster)
      const item: Item = {
        id: 'item-1',
        name: 'ring',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.items = [item]
      mockLevel.doors = [door]
      mockLevel.stairsDown = { x: 10, y: 10 }

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions.length).toBeLessThanOrEqual(7)
    })
  })

  describe('Utility Actions', () => {
    test('shows utility actions when no primary context', () => {
      // Arrange: empty context (no items, doors, monsters, etc.)

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: 'i', label: 'inventory', category: 'utility' })
      )
      expect(context.actions).toContainEqual(
        expect.objectContaining({ key: '?', label: 'help', category: 'utility' })
      )
    })

    test('does not show utility actions when primary context exists', () => {
      // Arrange: item at position (primary context)
      const item: Item = {
        id: 'item-1',
        name: 'potion',
        type: ItemType.POTION,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      const utilityActions = context.actions.filter((a) => a.category === 'utility')
      expect(utilityActions.length).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    test('returns empty context for invalid level', () => {
      // Arrange: invalid level
      mockState.currentLevel = 99

      // Act
      const context = service.analyzeContext(mockState)

      // Assert
      expect(context.actions).toEqual([])
      expect(context.warnings).toEqual([])
      expect(context.primaryHint).toBeUndefined()
    })
  })
})
