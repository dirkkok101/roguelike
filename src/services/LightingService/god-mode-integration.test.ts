import { LightingService } from './LightingService'
import { MockRandom } from '@services/RandomService'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { Player, GameState, ItemType } from '@game/core/core'

describe('LightingService - God Mode Integration', () => {
  let originalFetch: typeof global.fetch
  let lightingService: LightingService
  let debugService: DebugService
  let mockRandom: MockRandom
  let messageService: MessageService

  const mockMonsterData = [{ letter: 'T', name: 'Troll', hp: '6d8', ac: 4, damage: '1d8', xpValue: 120, level: 6, speed: 12, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] }}]

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockMonsterData } as Response)
  })

  afterAll(() => { global.fetch = originalFetch })

  beforeEach(async () => {
    mockRandom = new MockRandom()
    messageService = new MessageService()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true) // Enable debug mode
    lightingService = new LightingService(mockRandom, debugService)
  })

  describe('tickFuel with god mode', () => {
    it('should not consume fuel when god mode is active', () => {
      // Arrange
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'torch-1',
            name: 'Torch',
            type: ItemType.TORCH,
            radius: 2,
            fuel: 250,
            maxFuel: 500,
            isPermanent: false,
          },
        },
        energy: 100,
        statusEffects: [],
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: true, // God mode enabled
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
        },
      }

      // Act
      const result = lightingService.tickFuel(player, state)

      // Assert
      expect(result.player.equipment.lightSource?.fuel).toBe(250) // Fuel unchanged
      expect(result.messages).toEqual([]) // No messages
    })

    it('should consume fuel normally when god mode is disabled', () => {
      // Arrange
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'torch-1',
            name: 'Torch',
            type: ItemType.TORCH,
            radius: 2,
            fuel: 250,
            maxFuel: 500,
            isPermanent: false,
          },
        },
        energy: 100,
        statusEffects: [],
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: false, // God mode disabled
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
        },
      }

      // Act
      const result = lightingService.tickFuel(player, state)

      // Assert
      expect(result.player.equipment.lightSource?.fuel).toBe(249) // Fuel decreased by 1
    })

    it('should work without state parameter (backwards compatibility)', () => {
      // Arrange
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'torch-1',
            name: 'Torch',
            type: ItemType.TORCH,
            radius: 2,
            fuel: 250,
            maxFuel: 500,
            isPermanent: false,
          },
        },
        energy: 100,
        statusEffects: [],
      }

      // Act
      const result = lightingService.tickFuel(player) // No state parameter

      // Assert
      expect(result.player.equipment.lightSource?.fuel).toBe(249) // Fuel decreased normally
    })

    it('should not consume fuel for permanent light sources (artifact)', () => {
      // Arrange
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'artifact-1',
            name: 'Eternal Flame',
            type: ItemType.ARTIFACT,
            radius: 3,
            isPermanent: true, // Permanent light
          },
        },
        energy: 100,
        statusEffects: [],
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: false, // Not needed for artifacts
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
        },
      }

      // Act
      const result = lightingService.tickFuel(player, state)

      // Assert
      expect(result.player.equipment.lightSource).toEqual(player.equipment.lightSource) // Unchanged
      expect(result.messages).toEqual([]) // No messages
    })

    it('should prevent fuel warnings in god mode', () => {
      // Arrange - torch at 50 fuel (normally triggers warning)
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'torch-1',
            name: 'Torch',
            type: ItemType.TORCH,
            radius: 2,
            fuel: 51, // Will tick down to 50, triggering warning in normal mode
            maxFuel: 500,
            isPermanent: false,
          },
        },
        energy: 100,
        statusEffects: [],
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: true, // God mode enabled
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
        },
      }

      // Act
      const result = lightingService.tickFuel(player, state)

      // Assert
      expect(result.player.equipment.lightSource?.fuel).toBe(51) // Fuel unchanged
      expect(result.messages).toEqual([]) // No warning message
    })

    it('should show fuel warnings when god mode is disabled', () => {
      // Arrange - torch at 51 fuel (will tick to 50, trigger warning)
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: {
            id: 'torch-1',
            name: 'Torch',
            type: ItemType.TORCH,
            radius: 2,
            fuel: 51, // Will tick down to 50, triggering warning
            maxFuel: 500,
            isPermanent: false,
          },
        },
        energy: 100,
        statusEffects: [],
      }

      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: false, // God mode disabled
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
        },
      }

      // Act
      const result = lightingService.tickFuel(player, state)

      // Assert
      expect(result.player.equipment.lightSource?.fuel).toBe(50) // Fuel decreased
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Your torch is getting dim...')
      expect(result.messages[0].type).toBe('warning')
    })
  })
})
