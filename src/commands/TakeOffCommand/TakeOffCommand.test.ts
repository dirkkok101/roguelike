import { TakeOffCommand, EquipmentSlot } from './TakeOffCommand'
import { InventoryService } from '@services/InventoryService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { FOVService } from '@services/FOVService'
import { LightingService } from '@services/LightingService'
import { SeededRandom } from '@services/RandomService'
import { createTestTorch, createTestLantern } from '@test-utils/fixtures'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { createTestPlayer } from '@test-helpers'
import {
  GameState,
  Player,
  ItemType,
  Position,
} from '@game/core/core'

describe('TakeOffCommand - FOV Updates', () => {
  let inventoryService: InventoryService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let fovService: FOVService
  let lightingService: LightingService
  let mockRandom: MockRandom
  let recorder: CommandRecorderService

  beforeEach(() => {
    inventoryService = new InventoryService()
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    const levelService = new LevelService()
    const random = new SeededRandom('test-seed')
    turnService = new TurnService(statusEffectService, levelService)
    fovService = new FOVService(statusEffectService)
    lightingService = new LightingService(random)
 
    mockRandom = new MockRandom()
    recorder = new CommandRecorderService() })

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
      statusEffects: [],
      energy: 100,
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

  describe('FOV updates when unequipping light sources', () => {
    test('updates FOV to radius 0 when taking off torch', () => {
      const player = createTestPlayer()
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      const state = createTestState(player)

      // Simulate having visible cells with the torch equipped
      state.visibleCells = new Set(['5,5', '5,6', '6,5', '4,5', '5,4'])

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      // Verify light source was unequipped
      expect(result.player.equipment.lightSource).toBeNull()

      // Verify torch is now in inventory
      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('torch-1')

      // Verify FOV was reduced (no light = minimal visibility)
      expect(result.visibleCells.size).toBeLessThan(state.visibleCells.size)
    })

    test('updates FOV to radius 0 when taking off lantern', () => {
      const player = createTestPlayer()
      const lantern = createTestLantern('lantern-1', 'Lantern')

      // Equip the lantern first
      player.equipment.lightSource = lantern

      const state = createTestState(player)

      // Simulate having visible cells with the lantern equipped
      state.visibleCells = new Set(['5,5', '5,6', '6,5', '4,5', '5,4'])

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      // Verify light source was unequipped
      expect(result.player.equipment.lightSource).toBeNull()

      // Verify lantern is now in inventory
      expect(result.player.inventory).toHaveLength(1)
      expect(result.player.inventory[0].id).toBe('lantern-1')

      // Verify FOV was reduced (no light = minimal visibility)
      expect(result.visibleCells.size).toBeLessThan(state.visibleCells.size)
    })

    test('updates exploration state when taking off light source', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      const state = createTestState(player)
      const level = state.levels.get(1)!

      // Mark some tiles as explored with the torch
      level.explored[5][5] = true
      level.explored[5][6] = true
      level.explored[6][5] = true

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      const updatedLevel = result.levels.get(1)!

      // Verify previously explored tiles remain explored (memory)
      expect(updatedLevel.explored[5][5]).toBe(true)
      expect(updatedLevel.explored[5][6]).toBe(true)
      expect(updatedLevel.explored[6][5]).toBe(true)
    })

    test('adds success message when taking off light source', () => {
      const player = createTestPlayer()
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      const state = createTestState(player)

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You extinguish and stow your Torch.')
      expect(result.messages[0].type).toBe('info')
    })

    test('increments turn when taking off light source', () => {
      const player = createTestPlayer()
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      const state = createTestState(player)

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      expect(result.turnCount).toBe(1)
    })

    test('cannot take off light source when inventory is full', () => {
      const player = createTestPlayer()
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      // Fill inventory to max capacity (26 items a-z)
      player.inventory = Array(26)
        .fill(null)
        .map((_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          type: ItemType.WEAPON,
          identified: true,
          damage: '1d4',
          bonus: 0,
        }))

      const state = createTestState(player)

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      // Light source should still be equipped
      expect(result.player.equipment.lightSource?.id).toBe('torch-1')

      // Should have warning message
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Your pack is full. You cannot remove that equipment.')
      expect(result.messages[0].type).toBe('warning')

      // Turn should not increment
      expect(result.turnCount).toBe(0)
    })

    test('shows info message when trying to remove non-existent light source', () => {
      const player = createTestPlayer()
      // No light source equipped

      const state = createTestState(player)

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      const result = command.execute(state)

      // Should have info message
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('You have nothing equipped in your light source slot.')
      expect(result.messages[0].type).toBe('info')

      // Turn should not increment
      expect(result.turnCount).toBe(0)
    })

    test('does not modify original state when taking off light source', () => {
      const player = createTestPlayer()
      const torch = createTestTorch('torch-1', 'Torch')

      // Equip the torch first
      player.equipment.lightSource = torch

      const state = createTestState(player)
      const originalVisibleCells = state.visibleCells.size

      const command = new TakeOffCommand(
        'lightSource',
        inventoryService,
        messageService,
        turnService,
        fovService,
        lightingService,
      recorder,
      mockRandom
      )
      command.execute(state)

      // Verify original state unchanged
      expect(state.player.equipment.lightSource?.id).toBe('torch-1')
      expect(state.player.inventory).toHaveLength(0)
      expect(state.visibleCells.size).toBe(originalVisibleCells)
      expect(state.turnCount).toBe(0)
    })
  })
})
