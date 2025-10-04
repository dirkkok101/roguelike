import { UseItemCommand } from './UseItemCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { IdentificationService } from '@services/IdentificationService'
import {
  GameState,
  Player,
  OilFlask,
  LightSource,
  ItemType,
  Position,
  Weapon,
} from '@game/core/core'

describe('UseItemCommand - Lantern Refill', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let mockRandom: MockRandom
  let identificationService: IdentificationService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    mockRandom = new MockRandom([])
    identificationService = new IdentificationService(mockRandom)
  })

  function createTestPlayer(position: Position = { x: 5, y: 5 }): Player {
    return {
      position,
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 10,
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

  function createLantern(fuel: number = 250): LightSource {
    return {
      type: 'lantern',
      name: 'Lantern',
      radius: 2,
      isPermanent: false,
      fuel,
      maxFuel: 500,
    }
  }

  function createTorch(fuel: number = 250): LightSource {
    return {
      type: 'torch',
      name: 'Torch',
      radius: 1,
      isPermanent: false,
      fuel,
      maxFuel: 500,
    }
  }

  function createOilFlask(id: string, fuelAmount: number = 500): OilFlask {
    return {
      id,
      name: 'Oil Flask',
      type: ItemType.OIL_FLASK,
      identified: false,
      fuelAmount,
    }
  }

  function createTestState(player: Player): GameState {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      player,
      levels: new Map([
        [
          1,
          {
            depth: 1,
            width: 20,
            height: 20,
            tiles,
            rooms: [],
            monsters: [],
            items: [],
            gold: [],
            doors: [],
            traps: [],
            stairsUp: null,
            stairsDown: { x: 10, y: 10 },
            explored: Array(20)
              .fill(null)
              .map(() => Array(20).fill(false)),
          },
        ],
      ]),
      currentLevel: 1,
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
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
  }

  describe('successful refill', () => {
    test('refills lantern with oil flask', () => {
      const player = createTestPlayer()
      const lantern = createLantern(250) // Half full
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.equipment.lightSource?.fuel).toBe(500) // Capped at max
      expect(result.player.inventory).toHaveLength(0) // Oil flask removed
      expect(result.messages[0].text).toContain('+250 fuel')
      expect(result.messages[0].text).toContain('500/500')
      expect(result.turnCount).toBe(1)
    })

    test('adds partial fuel when near max', () => {
      const player = createTestPlayer()
      const lantern = createLantern(450) // Almost full
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.equipment.lightSource?.fuel).toBe(500)
      expect(result.messages[0].text).toContain('+50 fuel')
    })

    test('refills empty lantern', () => {
      const player = createTestPlayer()
      const lantern = createLantern(0) // Empty
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.equipment.lightSource?.fuel).toBe(500)
      expect(result.messages[0].text).toContain('+500 fuel')
    })

    test('caps fuel at maxFuel', () => {
      const player = createTestPlayer()
      const lantern = createLantern(100)
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.player.equipment.lightSource?.fuel).toBe(500)
      expect(result.player.equipment.lightSource?.fuel).not.toBeGreaterThan(500)
    })
  })

  describe('validation', () => {
    test('cannot refill when no lantern equipped', () => {
      const player = createTestPlayer()
      // No light source equipped
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You do not have a lantern equipped.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
      expect(result.player.inventory).toHaveLength(1) // Oil flask not removed
    })

    test('cannot refill torch', () => {
      const player = createTestPlayer()
      const torch = createTorch(250)
      player.equipment.lightSource = torch
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe(
        'You can only refill lanterns, not other light sources.'
      )
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
      expect(result.player.inventory).toHaveLength(1)
    })

    test('shows message when lantern already full', () => {
      const player = createTestPlayer()
      const lantern = createLantern(500) // Full
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('Your lantern is already full.')
      expect(result.messages[0].type).toBe('info')
      expect(result.turnCount).toBe(0)
      expect(result.player.inventory).toHaveLength(1) // Oil flask not removed
    })

    test('cannot use non-oil-flask for refill action', () => {
      const player = createTestPlayer()
      const lantern = createLantern(250)
      player.equipment.lightSource = lantern
      const weapon: Weapon = {
        id: 'weapon-1',
        name: 'Sword',
        type: ItemType.WEAPON,
        identified: false,
        damage: '1d8',
        bonus: 0,
      }
      player.inventory = [weapon]

      const state = createTestState(player)
      const command = new UseItemCommand(
        'weapon-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You cannot use that to refill a lantern.')
      expect(result.messages[0].type).toBe('warning')
      expect(result.turnCount).toBe(0)
    })
  })

  describe('immutability', () => {
    test('does not modify original state', () => {
      const player = createTestPlayer()
      const lantern = createLantern(250)
      player.equipment.lightSource = lantern
      const oilFlask = createOilFlask('oil-1', 500)
      player.inventory = [oilFlask]

      const state = createTestState(player)
      const originalFuel = state.player.equipment.lightSource?.fuel
      const originalInventoryLength = state.player.inventory.length

      const command = new UseItemCommand(
        'oil-1',
        'refill',
        inventoryService,
        messageService,
        mockRandom,
        identificationService
      )
      command.execute(state)

      expect(state.player.equipment.lightSource?.fuel).toBe(originalFuel)
      expect(state.player.inventory).toHaveLength(originalInventoryLength)
      expect(state.turnCount).toBe(0)
    })
  })
})
