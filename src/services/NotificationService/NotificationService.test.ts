import { NotificationService } from './NotificationService'
import { IdentificationService } from '@services/IdentificationService'
import {
  GameState,
  Level,
  Item,
  Monster,
  Door,
  DoorState,
  ItemType,
  MonsterBehavior,
  MonsterState,
  TileType,
} from '@game/core/core'

// ============================================================================
// NOTIFICATION SERVICE TESTS - Auto-Notifications
// ============================================================================

describe('NotificationService - Auto-Notifications', () => {
  let service: NotificationService
  let mockState: GameState
  let mockLevel: Level
  let mockIdentificationService: jest.Mocked<IdentificationService>

  beforeEach(() => {
    // Create mock IdentificationService
    mockIdentificationService = {
      getDisplayName: jest.fn((item: Item) => item.name),
    } as any

    service = new NotificationService(mockIdentificationService)

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

  describe('Item Notifications', () => {
    test('generates item presence message when standing on item', () => {
      // Arrange
      const item: Item = {
        id: 'item-1',
        name: 'ruby ring',
      spriteName: 'ruby ring',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see a ruby ring here.')
    })

    test('generates gold message with correct amount', () => {
      // Arrange
      mockLevel.gold = [{ position: { x: 10, y: 10 }, amount: 47 }]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see 47 gold pieces here.')
    })

    test('generates gold message with singular form for 1 piece', () => {
      // Arrange
      mockLevel.gold = [{ position: { x: 10, y: 10 }, amount: 1 }]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see 1 gold piece here.')
    })

    test('generates multiple items message for 2+ items', () => {
      // Arrange
      const item1: Item = {
        id: 'item-1',
        name: 'potion',
      spriteName: 'potion',
        type: ItemType.POTION,
        identified: false,
        position: { x: 10, y: 10 },
      }
      const item2: Item = {
        id: 'item-2',
        name: 'scroll',
      spriteName: 'scroll',
        type: ItemType.SCROLL,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item1, item2]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see several items here. Press [,] to pick up.')
    })

    test('uses correct article "an" for item starting with vowel', () => {
      // Arrange
      const item: Item = {
        id: 'item-1',
        name: 'emerald',
      spriteName: 'emerald',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see an emerald here.')
    })

    test('uses correct article "a" for item starting with consonant', () => {
      // Arrange
      const item: Item = {
        id: 'item-1',
        name: 'sword',
      spriteName: 'sword',
        type: ItemType.WEAPON,
        identified: true,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('You see a sword here.')
    })
  })

  describe('Deduplication', () => {
    test('does not repeat same notification on same position', () => {
      // Arrange
      const item: Item = {
        id: 'item-1',
        name: 'ring',
      spriteName: 'ring',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]

      // Act
      const first = service.generateNotifications(mockState)
      const second = service.generateNotifications(mockState)

      // Assert
      expect(first.length).toBeGreaterThan(0)
      expect(second).toEqual([]) // No new notifications
    })

    test('clears deduplication when player moves', () => {
      // Arrange
      const item: Item = {
        id: 'item-1',
        name: 'ring',
      spriteName: 'ring',
        type: ItemType.RING,
        identified: false,
        position: { x: 10, y: 10 },
      }
      mockLevel.items = [item]
      const previousPosition = { x: 9, y: 10 }

      // Act
      const first = service.generateNotifications(mockState, previousPosition)
      const second = service.generateNotifications(mockState, { x: 10, y: 10 })

      // Assert
      expect(first.length).toBeGreaterThan(0)
      expect(second.length).toBe(0) // Still at same position, so deduplicated
    })
  })

  describe('Door Notifications', () => {
    test('notifies about nearby closed door', () => {
      // Arrange
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.doors = [door]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('There is a closed door nearby.')
    })

    test('does not notify about open door', () => {
      // Arrange
      const door: Door = {
        position: { x: 10, y: 9 },
        state: DoorState.OPEN,
        discovered: true,
        orientation: 'horizontal',
        connectsRooms: [0, 1],
      }
      mockLevel.doors = [door]

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications.find((n) => n.includes('door'))).toBeUndefined()
    })
  })

  describe('Resource Warnings', () => {
    test('warns when inventory is full', () => {
      // Arrange
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
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('⚠ Your pack is full! (26/26 items)')
    })

    test('warns when no food and hungry', () => {
      // Arrange
      mockState.player.inventory = [] // No food
      mockState.player.hunger = 400 // Below 500 threshold

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('⚠ You have no food rations!')
    })

    test('does not warn about no food when not hungry', () => {
      // Arrange
      mockState.player.inventory = [] // No food
      mockState.player.hunger = 1000 // Above 500 threshold

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications.find((n) => n.includes('food'))).toBeUndefined()
    })
  })

  describe('Monster Proximity', () => {
    test('alerts about adjacent awake monster', () => {
      // Arrange
      const monster: Monster = {
        id: 'monster-1',
        letter: 'O',
        name: 'Orc',
      spriteName: 'Orc',
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
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toContain('The Orc is nearby!')
    })

    test('does not alert about sleeping monster', () => {
      // Arrange
      const monster: Monster = {
        id: 'monster-1',
        letter: 'O',
        name: 'Orc',
      spriteName: 'Orc',
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
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications.find((n) => n.includes('Orc'))).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    test('returns empty array for invalid level', () => {
      // Arrange
      mockState.currentLevel = 99

      // Act
      const notifications = service.generateNotifications(mockState)

      // Assert
      expect(notifications).toEqual([])
    })
  })
})
