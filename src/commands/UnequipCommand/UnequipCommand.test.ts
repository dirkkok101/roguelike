import { UnequipCommand } from './UnequipCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { GameState, Player, Ring, ItemType, Position, RingType } from '@game/core/core'

describe('UnequipCommand', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    turnService = new TurnService(statusEffectService)
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

  function createTestRing(id: string, name: string): Ring {
    return {
      id,
      name,
      type: ItemType.RING,
      identified: false,
      ringType: RingType.PROTECTION,
      effect: 'ac_bonus',
      bonus: 1,
      materialName: 'ruby',
      hungerModifier: 1.5,
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

  describe('unequipping rings', () => {
    test('unequips ring from left hand to inventory', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.player.equipment.leftRing).toBeNull()
      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('ring-1')
    })

    test('unequips ring from right hand to inventory', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'right')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('right', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.player.equipment.rightRing).toBeNull()
      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('ring-1')
    })

    test('increments turn count after unequipping', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(1)
    })

    test('adds info message after unequipping', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You remove Ring of Protection from your left hand.')
      expect(result.messages[0].type).toBe('info')
    })

    test('does not modify original state', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)

      command.execute(state)

      expect(state.player.equipment.leftRing?.id).toBe('ring-1')
      expect(state.turnCount).toBe(0)
    })
  })

  describe('no ring equipped', () => {
    test('does not unequip when no ring on left hand', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
      expect(result.turnCount).toBe(0)
    })

    test('does not unequip when no ring on right hand', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new UnequipCommand('right', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.player.inventory).toHaveLength(0)
      expect(result.turnCount).toBe(0)
    })

    test('adds info message when no ring on specified hand', () => {
      const player = createTestPlayer()
      const state = createTestState(player)

      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You are not wearing a ring on your left hand.')
      expect(result.messages[0].type).toBe('info')
    })

    test('does not unequip from wrong hand', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      const playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('right', inventoryService, messageService, turnService)
      const result = command.execute(state)

      // Left ring still equipped, right hand empty
      expect(result.player.equipment.leftRing?.id).toBe('ring-1')
      expect(result.player.equipment.rightRing).toBeNull()
      expect(result.messages[0].text).toBe('You are not wearing a ring on your right hand.')
    })
  })

  describe('inventory full', () => {
    test('cannot unequip when inventory is full', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      let playerWithRing = inventoryService.equipRing(player, ring, 'left')

      // Fill inventory to max (26 items)
      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      playerWithRing.inventory = fullInventory as any

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.player.equipment.leftRing?.id).toBe('ring-1')
      expect(result.player.inventory).toHaveLength(26)
    })

    test('adds warning message when inventory is full', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      let playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      playerWithRing.inventory = fullInventory as any

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Your pack is full. You cannot unequip that ring.')
      expect(result.messages[0].type).toBe('warning')
    })

    test('does not increment turn count when inventory is full', () => {
      const player = createTestPlayer()
      const ring = createTestRing('ring-1', 'Ring of Protection')

      player.inventory = [ring]
      let playerWithRing = inventoryService.equipRing(player, ring, 'left')

      const fullInventory = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: ItemType.WEAPON,
        identified: false,
      }))
      playerWithRing.inventory = fullInventory as any

      const state = createTestState(playerWithRing)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const result = command.execute(state)

      expect(result.turnCount).toBe(0)
    })
  })

  describe('both rings equipped', () => {
    test('unequips only specified ring', () => {
      const player = createTestPlayer()
      const leftRing = createTestRing('ring-1', 'Ring of Protection')
      const rightRing = createTestRing('ring-2', 'Ring of Regeneration')

      player.inventory = [leftRing, rightRing]
      let result = inventoryService.equipRing(player, leftRing, 'left')
      result = inventoryService.equipRing(result, rightRing, 'right')

      const state = createTestState(result)
      const command = new UnequipCommand('left', inventoryService, messageService, turnService)
      const finalResult = command.execute(state)

      expect(finalResult.player.equipment.leftRing).toBeNull()
      expect(finalResult.player.equipment.rightRing?.id).toBe('ring-2')
      expect(finalResult.player.inventory).toHaveLength(1)
      expect(finalResult.player.inventory[0].id).toBe('ring-1')
    })
  })
})
