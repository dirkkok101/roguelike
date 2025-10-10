import { RestCommand } from './RestCommand'
import { RestService } from '@services/RestService'
import { RegenerationService } from '@services/RegenerationService'
import { HungerService } from '@services/HungerService'
import { RingService } from '@services/RingService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import {
  GameState,
  Player,
  Level,
  TileType,
  Equipment,
  Monster,
  MonsterBehavior,
  Torch,
  ItemType,
} from '@game/core/core'

describe('RestCommand', () => {
  let command: RestCommand
  let restService: RestService
  let regenerationService: RegenerationService
  let hungerService: HungerService
  let lightingService: LightingService
  let fovService: FOVService
  let messageService: MessageService
  let turnService: TurnService
  let statusEffectService: StatusEffectService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    const ringService = new RingService(mockRandom)
    regenerationService = new RegenerationService(ringService)
    hungerService = new HungerService(mockRandom, ringService)
    lightingService = new LightingService(mockRandom)
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    messageService = new MessageService()
    const levelService = new LevelService()
    turnService = new TurnService(statusEffectService, levelService)

    restService = new RestService(
      regenerationService,
      hungerService,
      lightingService,
      fovService,
      turnService
    )

    command = new RestCommand(
      restService,
      messageService,
      turnService
    )
  })

  function createTestState(overrides?: Partial<GameState>): GameState {
    const defaultEquipment: Equipment = {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: createTorch(),
    }

    const player: Player = {
      position: { x: 5, y: 5 },
      hp: 10,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: defaultEquipment,
      inventory: [],
      statusEffects: [],
      energy: 100,
    }

    const level: Level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles: createEmptyTiles(20, 20),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: createExploredArray(20, 20),
    }

    const levels = new Map<number, Level>()
    levels.set(1, level)

    return {
      player,
      currentLevel: 1,
      levels,
      messages: [],
      turnCount: 0,
      seed: 'test',
      itemNames: new Map(),
      identifiedItems: new Set(),
      hasAmulet: false,
      gameId: 'test-game',
      isGameOver: false,
      isVictory: false,
      debugMode: false,
      visibleCells: new Set(),
      ...overrides,
    }
  }

  function createTorch(): Torch {
    return {
      id: 'torch-1',
      type: ItemType.TORCH,
      name: 'Torch',
      spriteName: 'Torch',
      char: '~',
      color: '#FFAA00',
      fuel: 500,
      maxFuel: 500,
      radius: 2,
      isPermanent: false,
      identified: true,
      stackable: true,
      position: { x: 0, y: 0 },
    }
  }

  function createEmptyTiles(width: number, height: number) {
    const tiles: any[][] = []
    for (let y = 0; y < height; y++) {
      tiles[y] = []
      for (let x = 0; x < width; x++) {
        tiles[y][x] = {
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#A89078',
          colorExplored: '#5A5A5A',
        }
      }
    }
    return tiles
  }

  function createExploredArray(width: number, height: number): boolean[][] {
    const explored: boolean[][] = []
    for (let y = 0; y < height; y++) {
      explored[y] = []
      for (let x = 0; x < width; x++) {
        explored[y][x] = false
      }
    }
    return explored
  }

  function createTestMonster(): Monster {
    return {
      id: 'orc-1',
      letter: 'O',
      name: 'Orc',
      spriteName: 'Orc',
      position: { x: 7, y: 5 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 3,
        aggroRange: 10,
        fleeThreshold: 0,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      state: 'HUNTING',
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: 1,
      speed: 10,
    }
  }

  describe('Basic Resting', () => {
    test('rests until HP is full', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      // Should rest until full HP (10 turns to heal 10 HP at 1 HP/10 turns = 100 turns)
      expect(result.player.hp).toBe(20)
      expect(result.turnCount).toBeGreaterThan(state.turnCount)
    })

    test('does not rest when already at max HP', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 20,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      expect(result.player.hp).toBe(20)
      expect(result.turnCount).toBe(state.turnCount) // No turns passed
      expect(result.messages[0].text).toContain('already at full health')
    })

    test('generates completion message with HP gained', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      const lastMessage = result.messages[result.messages.length - 1].text
      expect(lastMessage).toContain('Rested for')
      expect(lastMessage).toContain('Fully healed')
      expect(lastMessage).toContain('20/20 HP')
    })

    test('increments turn count correctly', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      // Should take 10 turns to heal 1 HP
      expect(result.turnCount).toBe(10)
    })
  })

  describe('Enemy Interruption', () => {
    test('interrupts when enemy appears in FOV', () => {
      const monster = createTestMonster()
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
        },
        levels: new Map([[1, level]]),
      })

      const result = command.execute(state)

      // Should stop resting when monster comes into view
      expect(result.player.hp).toBeLessThan(20)
      const lastMessage = result.messages[result.messages.length - 1].text
      expect(lastMessage).toContain('interrupted by a nearby enemy')
    })

    test('rests successfully when no enemies nearby', () => {
      const monster = createTestMonster()
      monster.position = { x: 15, y: 15 } // Far away
      const level = createTestState().levels.get(1)!
      level.monsters = [monster]

      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
        levels: new Map([[1, level]]),
      })

      const result = command.execute(state)

      expect(result.player.hp).toBe(20)
    })
  })

  describe('Hunger Interruption', () => {
    test('interrupts when hunger reaches 0', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
          hunger: 10, // Very low hunger
        },
      })

      const result = command.execute(state)

      expect(result.player.hp).toBeLessThan(20)
      const messages = result.messages.map((m) => m.text.toLowerCase())
      expect(messages.some((m) => m.includes('hungry'))).toBe(true)
    })

    test('continues resting while hunger > 0', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
          hunger: 1300, // Plenty of hunger
        },
      })

      const result = command.execute(state)

      expect(result.player.hp).toBe(20)
      expect(result.player.hunger).toBeLessThan(1300) // Hunger consumed
    })
  })

  describe('Starvation Death', () => {
    test('dies from starvation while resting', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 1, // Will die when starvation damage hits
          maxHp: 20,
          hunger: 1, // Will hit 0 on first turn
        },
      })

      const result = command.execute(state)

      expect(result.isGameOver).toBe(true)
      if (result.deathCause) {
        expect(result.deathCause).toContain('starvation')
      }
      const messages = result.messages.map((m) => m.text.toLowerCase())
      expect(messages.some((m) => m.includes('died'))).toBe(true)
    })
  })

  describe('Fuel Consumption', () => {
    test('consumes fuel while resting', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const initialFuel = (state.player.equipment.lightSource as Torch)?.fuel || 0

      const result = command.execute(state)

      const finalFuel = (result.player.equipment.lightSource as Torch)?.fuel || 0
      expect(finalFuel).toBeLessThan(initialFuel)
    })
  })

  describe('Turn Tracking', () => {
    test('tracks turns rested accurately', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 18, // Need 2 HP = 20 turns
          maxHp: 20,
        },
        turnCount: 100,
      })

      const result = command.execute(state)

      expect(result.turnCount).toBe(120) // 100 + 20 turns
    })

    test('message includes turn count', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      const summaryMessage = result.messages[result.messages.length - 1].text
      expect(summaryMessage).toMatch(/Rested for \d+ turn/)
    })
  })

  describe('Immutability', () => {
    test('returns new game state object', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.player).not.toBe(state.player)
    })

    test('does not mutate original state', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 19,
          maxHp: 20,
        },
      })

      const originalHp = state.player.hp
      const originalTurnCount = state.turnCount

      command.execute(state)

      expect(state.player.hp).toBe(originalHp)
      expect(state.turnCount).toBe(originalTurnCount)
    })
  })

  describe('Edge Cases', () => {
    test('handles very low HP correctly', () => {
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 1,
          maxHp: 20,
        },
      })

      const result = command.execute(state)

      expect(result.player.hp).toBe(20)
    })

    test('handles safety limit (prevents infinite loop)', () => {
      // This would normally cause an infinite loop if regeneration is blocked
      const state = createTestState({
        player: {
          ...createTestState().player,
          hp: 10,
          maxHp: 20,
          hunger: 50, // Below threshold, can't regenerate
        },
      })

      const result = command.execute(state)

      // Should exit with safety limit message
      expect(result.turnCount).toBeLessThanOrEqual(1000)
    })

    test('handles no level gracefully', () => {
      const state = createTestState({
        levels: new Map(), // No levels
      })

      const result = command.execute(state)

      expect(result).toEqual(state)
    })
  })
})
