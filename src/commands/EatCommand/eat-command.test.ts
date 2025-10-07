import { EatCommand } from './EatCommand'
import { InventoryService } from '@services/InventoryService'
import { HungerService, HungerState } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Player,
  Food,
  ItemType,
  Level,
  TileType,
} from '@game/core/core'

describe('EatCommand', () => {
  let inventoryService: InventoryService
  let hungerService: HungerService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom
  let command: EatCommand

  beforeEach(() => {
    inventoryService = new InventoryService()
    mockRandom = new MockRandom()
    hungerService = new HungerService(mockRandom)
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)
  })

  function createTestPlayer(overrides?: Partial<Player>): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      inventory: [],
      statusEffects: [],
      energy: 100,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      ...overrides,
    }
  }

  function createTestFood(id: string = 'food-1'): Food {
    return {
      id,
      name: 'Food Ration',
      type: ItemType.FOOD,
      identified: true,
      position: { x: 0, y: 0 },
      nutrition: 1300, // Typical value, though actual is random in command
    }
  }

  function createTestLevel(): Level {
    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles: Array(20).fill(Array(20).fill({
        type: TileType.FLOOR,
        char: '.',
        walkable: true,
        transparent: true,
        colorVisible: '#ccc',
        colorExplored: '#666',
      })),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20).fill(Array(20).fill(false)),
    }
  }

  function createTestState(overrides?: Partial<GameState>): GameState {
    const levels = new Map()
    levels.set(1, createTestLevel())

    return {
      player: createTestPlayer(),
      currentLevel: 1,
      levels,
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test',
      isGameOver: false,
      hasWon: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      ...overrides,
    }
  }

  describe('execute()', () => {
    test('removes food from inventory', () => {
      // Arrange
      const food = createTestFood()
      mockRandom.setValues([1250, 0]) // nutrition roll + chance(0.3) = false
      const player = createTestPlayer({
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      expect(newState.player.inventory).toHaveLength(0)
      expect(newState.player.inventory).not.toContain(food)
    })

    test('restores hunger by random amount (1100-1499)', () => {
      // Arrange: MockRandom returns specific nutrition value
      const food = createTestFood()
      mockRandom.setValues([1250, 0]) // nextInt(1100, 1499) returns 1250 + chance = false
      const player = createTestPlayer({
        hunger: 500,
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      expect(newState.player.hunger).toBe(500 + 1250)
    })

    test('caps hunger at 2000 max', () => {
      // Arrange: Player with high hunger
      const food = createTestFood()
      mockRandom.setValues([1499, 0]) // Maximum nutrition + chance = false
      const player = createTestPlayer({
        hunger: 1800,
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert: Capped at 2000
      expect(newState.player.hunger).toBe(2000)
    })

    test('adds "You eat the food ration." message', () => {
      // Arrange
      const food = createTestFood()
      mockRandom.setValues([1250, 0]) // nutrition + chance(0.3) = false
      const player = createTestPlayer({
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0].text).toBe('You eat the food ration.')
      expect(newState.messages[0].type).toBe('info')
    })

    test('adds "tastes awful" message 30% of time (MockRandom)', () => {
      // Arrange: MockRandom set to trigger awful message
      const food = createTestFood()
      mockRandom.setValues([1250, 1]) // nutrition + chance(0.3) = true
      const player = createTestPlayer({
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      const messages = newState.messages.map((m) => m.text)
      expect(messages).toContain('Yuck, that food tasted awful!')
    })

    test('returns "no food" message when inventory empty', () => {
      // Arrange: Player with no food
      const player = createTestPlayer({
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      expect(newState.messages).toHaveLength(1)
      expect(newState.messages[0].text).toBe('You have no food to eat.')
      expect(newState.messages[0].type).toBe('warning')
      expect(newState.player.hunger).toBe(1300) // Unchanged
      expect(newState.turnCount).toBe(0) // Turn not consumed
    })

    test('increments turn count', () => {
      // Arrange
      const food = createTestFood()
      mockRandom.setValues([1250, 0]) // nutrition + chance = false
      const player = createTestPlayer({
        inventory: [food],
      })
      const state = createTestState({ player, turnCount: 5 })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert
      expect(newState.turnCount).toBe(6)
    })

    test('returns new GameState (immutability)', () => {
      // Arrange
      const food = createTestFood()
      mockRandom.setValues([1250, 0]) // nutrition + chance = false
      const player = createTestPlayer({
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert immutability
      expect(newState).not.toBe(state)
      expect(newState.player).not.toBe(state.player)
      expect(state.player.inventory).toHaveLength(1) // Original unchanged
      expect(newState.player.inventory).toHaveLength(0)
    })

    test('improves hunger state from WEAK to NORMAL', () => {
      // Arrange: Weak player
      const food = createTestFood()
      mockRandom.setValues([1499, 0]) // Max nutrition + chance = false
      const player = createTestPlayer({
        hunger: 100, // WEAK state
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert: Hunger increased to NORMAL
      expect(newState.player.hunger).toBe(100 + 1499)
      expect(hungerService.getHungerState(newState.player.hunger)).toBe(
        HungerState.NORMAL
      )
      // Should have improvement message
      const messages = newState.messages.map((m) => m.text)
      expect(messages.some((m) => m.includes('feel'))).toBe(true)
    })

    test('improves hunger state from HUNGRY to NORMAL', () => {
      // Arrange: Hungry player
      const food = createTestFood()
      mockRandom.setValues([1200, 0]) // nutrition + chance = false
      const player = createTestPlayer({
        hunger: 200, // HUNGRY state
        inventory: [food],
      })
      const state = createTestState({ player })
      command = new EatCommand(
        inventoryService,
        hungerService,
        messageService,
        turnService
      )

      // Act
      const newState = command.execute(state)

      // Assert: Hunger increased to NORMAL
      expect(newState.player.hunger).toBe(200 + 1200)
      expect(hungerService.getHungerState(newState.player.hunger)).toBe(
        HungerState.NORMAL
      )
    })
  })
})
