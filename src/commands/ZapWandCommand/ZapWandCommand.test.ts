import { ZapWandCommand } from './ZapWandCommand'
import { InventoryService } from '@services/InventoryService'
import { WandService } from '@services/WandService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { CombatService } from '@services/CombatService'
import { StatusEffectService } from '@services/StatusEffectService'
import { IdentificationService } from '@services/IdentificationService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Player,
  ItemType,
  Wand,
  WandType,
  Monster,
  MonsterBehavior,
  MonsterState,
  Level,
  TileType,
} from '@game/core/core'

describe('ZapWandCommand', () => {
  let inventoryService: InventoryService
  let wandService: WandService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom
  let combatService: CombatService
  let levelService: LevelService

  beforeEach(() => {
    inventoryService = new InventoryService()
    const identificationService = new IdentificationService()
    mockRandom = new MockRandom()
    combatService = new CombatService(mockRandom)
    levelService = new LevelService()
    wandService = new WandService(identificationService, mockRandom, combatService, levelService)
    messageService = new MessageService()
    statusEffectService = new StatusEffectService()
    turnService = new TurnService(statusEffectService, levelService)
  })

  function createTestPlayer(): Player {
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

  function createWand(
    type: WandType = WandType.LIGHTNING,
    currentCharges: number = 5,
    id: string = 'wand-1'
  ): Wand {
    return {
      id,
      type: ItemType.WAND,
      name: 'Wand',
      wandType: type,
      charges: 10,
      currentCharges,
      identified: false,
      damage: '2d6',
      woodName: 'oak wand',
      range: 8, // Add range property
    }
  }

  function createTestState(player: Player): GameState {
    const testMonster: Monster = {
      id: 'monster-1',
      letter: 'B',
      name: 'Bat',
      position: { x: 6, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 7,
      damage: '1d2',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 2,
        aggroRange: 5,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: MonsterState.WANDERING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      energy: 0,
      speed: 10,
      isInvisible: false,
      statusEffects: [],
    }

    const testLevel: Level = {
      depth: 1,
      width: 80,
      height: 22,
      tiles: Array(22).fill(null).map(() =>
        Array(80).fill(null).map(() => ({
          type: TileType.FLOOR,
          walkable: true,
          transparent: true,
          explored: false,
        }))
      ),
      monsters: [testMonster],
      items: [],
      rooms: [],
      corridors: [],
      doors: [],
      traps: [],
      upStairs: { x: 40, y: 11 },
      downStairs: { x: 41, y: 11 },
    }

    const levels = new Map<number, Level>()
    levels.set(1, testLevel)

    // Add monster position to visible cells for targeting validation
    const visibleCells = new Set<string>()
    visibleCells.add('6,5') // Monster at (6, 5)
    visibleCells.add('5,5') // Player at (5, 5)

    return {
      player,
      levels,
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
      visibleCells,
      seed: 'test-seed',
      gameId: 'test-game',
      hasWon: false,
      hasAmulet: false,
      itemNameMap: { potions: new Map(), scrolls: new Map(), wands: new Map(), rings: new Map() },
      identifiedItems: new Set(),
    }
  }

  test('zaps wand successfully', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 5)
    player.inventory = [wand]
    const state = createTestState(player)

    mockRandom.setValues([3, 4, 2, 5, 6, 3]) // Lightning damage (6d6 = 6 dice)

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService,
      statusEffectService,
      'monster-1' // Target monster
    )
    const result = command.execute(state)

    const updatedWand = result.player.inventory.find(i => i.id === 'wand-1') as Wand
    expect(updatedWand.currentCharges).toBe(4) // Charge decremented
    expect(result.messages).toHaveLength(1)
    expect(result.turnCount).toBe(1)
  })

  test('returns error when item not found', () => {
    const player = createTestPlayer()
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'nonexistent',
      inventoryService,
      wandService,
      messageService,
      turnService,
      statusEffectService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You do not have that item.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('returns error when item is not a wand', () => {
    const player = createTestPlayer()
    const notWand = {
      id: 'potion-1',
      type: ItemType.POTION,
      name: 'Potion',
      identified: false,
    }
    player.inventory = [notWand]
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'potion-1',
      inventoryService,
      wandService,
      messageService,
      turnService,
      statusEffectService
    )
    const result = command.execute(state)

    expect(result.messages[0].text).toBe('You cannot zap that.')
    expect(result.messages[0].type).toBe('warning')
    expect(result.turnCount).toBe(0)
  })

  test('handles wand with no charges', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 0) // No charges
    player.inventory = [wand]
    const state = createTestState(player)

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService,
      statusEffectService,
      'monster-1' // Target monster
    )
    const result = command.execute(state)

    const updatedWand = result.player.inventory.find(i => i.id === 'wand-1') as Wand
    expect(updatedWand.currentCharges).toBe(0) // Still 0
    expect(result.messages[0].text).toBe('The wand has no charges.')
  })

  test('immutability - does not mutate original state', () => {
    const player = createTestPlayer()
    const wand = createWand(WandType.LIGHTNING, 5)
    player.inventory = [wand]
    const state = createTestState(player)

    mockRandom.setValues([3, 4, 2, 5, 6, 3]) // Lightning damage (6d6)

    const command = new ZapWandCommand(
      'wand-1',
      inventoryService,
      wandService,
      messageService,
      turnService,
      statusEffectService,
      'monster-1'
    )
    const result = command.execute(state)

    expect(result).not.toBe(state)
    expect(result.player).not.toBe(state.player)
    const originalWand = state.player.inventory[0] as Wand
    expect(originalWand.currentCharges).toBe(5) // Original unchanged
  })
})
