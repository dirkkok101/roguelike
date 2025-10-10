import { TurnService } from './TurnService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LevelService } from '@services/LevelService'
import { WanderingMonsterService } from '@services/WanderingMonsterService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { GameState, Level, Monster, TileType, MonsterBehavior } from '@game/core/core'

describe('TurnService - Wandering Monster Spawns', () => {
  let turnService: TurnService
  let wanderingService: WanderingMonsterService
  let messageService: MessageService
  let mockRandom: MockRandom
  let monsterSpawnService: MonsterSpawnService

  beforeEach(() => {
    mockRandom = new MockRandom()
    const statusEffectService = new StatusEffectService()
    const levelService = new LevelService(mockRandom)
    monsterSpawnService = new MonsterSpawnService(mockRandom)
    wanderingService = new WanderingMonsterService(monsterSpawnService, mockRandom)
    messageService = new MessageService()

    turnService = new TurnService(
      statusEffectService,
      levelService,
      undefined, // No ring service
      wanderingService,
      messageService
    )

    // Mock MonsterSpawnService methods to avoid needing loadMonsterData()
    jest.spyOn(monsterSpawnService, 'selectMonsterForDepth').mockReturnValue({
      letter: 'O',
      name: 'Orc',
      spriteName: 'Orc',
      hp: '1d8',
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      level: 2,
      speed: 10,
      rarity: 'uncommon',
      mean: true,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 5,
        fleeThreshold: 0.25,
        chaseChance: 0.67,
        special: [],
      },
    })

    jest.spyOn(monsterSpawnService, 'createMonsterFromTemplate').mockImplementation(
      (template, position, id) =>
        ({
          id: id || 'wanderer-test',
          letter: template.letter,
          name: template.name,
          position,
          hp: 8,
          maxHp: 8,
          ac: template.ac,
          damage: template.damage,
          xpValue: template.xpValue,
          level: template.level,
          speed: template.speed,
          aiProfile: template.aiProfile,
          isAsleep: false,
          isAwake: true,
          state: 'HUNTING',
          visibleCells: new Set(),
          currentPath: null,
          hasStolen: false,
          energy: 0,
          isInvisible: false,
          statusEffects: [],
        }) as Monster
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function createGameState(overrides?: Partial<GameState>): GameState {
    const level: Level = {
      depth: 1,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              colorVisible: '#ffffff',
              colorExplored: '#888888',
            }))
        ),
      rooms: [
        { id: 0, x: 1, y: 1, width: 8, height: 8 },
        { id: 1, x: 15, y: 1, width: 8, height: 8 },
      ],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 10, y: 10 },
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
      wanderingMonsterCount: 0,
      lastWanderingSpawnTurn: 0,
    }

    const levels = new Map<number, Level>()
    levels.set(1, level)

    return {
      player: {
        id: 'player-1',
        name: 'Player',
      spriteName: 'Player',
        position: { x: 5, y: 5 },
        hp: 20,
        maxHp: 20,
        ac: 5,
        strength: 16,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1000,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          rings: [],
          lightSource: null,
        },
        energy: 0,
        statusEffects: [],
      },
      levels,
      currentLevel: 1,
      turnCount: 0,
      messages: [],
      isGameOver: false,
      ...overrides,
    }
  }

  describe('processWanderingSpawns', () => {
    test('spawns wanderer when chance succeeds', () => {
      const state = createGameState({ turnCount: 100 })

      // Mock spawn chance to succeed (return 1 for chance() to return true)
      mockRandom.setValues([1, 15, 15, 100]) // chance succeeds, location selection, monster stats

      const result = turnService.processWanderingSpawns(state)
      const level = result.levels.get(1)!

      expect(level.monsters.length).toBe(1)
      expect(level.wanderingMonsterCount).toBe(1)
      expect(level.lastWanderingSpawnTurn).toBe(100)
      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.messages[result.messages.length - 1].text).toContain('faint noise')
    })

    test('does not spawn when chance fails', () => {
      const state = createGameState({ turnCount: 100 })

      // Mock spawn chance to fail (return 0 for chance() to return false)
      mockRandom.setValues([0])

      const result = turnService.processWanderingSpawns(state)
      const level = result.levels.get(1)!

      expect(level.monsters.length).toBe(0)
      expect(level.wanderingMonsterCount).toBe(0)
    })

    test('does not spawn when at wanderer limit (5)', () => {
      const state = createGameState()
      const level = state.levels.get(1)!
      const updatedLevel = { ...level, wanderingMonsterCount: 5 }
      state.levels.set(1, updatedLevel)

      // Mock spawn chance to succeed (should be ignored due to limit)
      mockRandom.setValues([1])

      const result = turnService.processWanderingSpawns(state)
      const resultLevel = result.levels.get(1)!

      expect(resultLevel.monsters.length).toBe(0)
      expect(resultLevel.wanderingMonsterCount).toBe(5)
    })

    test('does not spawn when no valid location available', () => {
      const state = createGameState({ turnCount: 100 })
      const level = state.levels.get(1)!

      // Make all tiles unwalkable
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          level.tiles[y][x].walkable = false
        }
      }

      // Mock spawn chance to succeed
      mockRandom.setValues([1])

      const result = turnService.processWanderingSpawns(state)
      const resultLevel = result.levels.get(1)!

      expect(resultLevel.monsters.length).toBe(0)
    })

    test('increments wanderingMonsterCount', () => {
      const state = createGameState({ turnCount: 100 })
      const level = state.levels.get(1)!
      const updatedLevel = { ...level, wanderingMonsterCount: 2 }
      state.levels.set(1, updatedLevel)

      // Mock spawn chance to succeed
      mockRandom.setValues([1, 15, 15, 100])

      const result = turnService.processWanderingSpawns(state)
      const resultLevel = result.levels.get(1)!

      expect(resultLevel.wanderingMonsterCount).toBe(3)
    })

    test('updates lastWanderingSpawnTurn', () => {
      const state = createGameState({ turnCount: 250 })

      // Mock spawn chance to succeed
      mockRandom.setValues([1, 15, 15, 100])

      const result = turnService.processWanderingSpawns(state)
      const level = result.levels.get(1)!

      expect(level.lastWanderingSpawnTurn).toBe(250)
    })

    test('returns unchanged state when services not injected', () => {
      // Create TurnService without wandering services
      const turnServiceNoWandering = new TurnService(
        new StatusEffectService(),
        new LevelService(mockRandom)
      )

      const state = createGameState({ turnCount: 100 })
      mockRandom.setValues([1])

      const result = turnServiceNoWandering.processWanderingSpawns(state)

      expect(result).toBe(state) // Same reference, no changes
    })

    test('returns unchanged state when level not found', () => {
      const state = createGameState()
      state.currentLevel = 99 // Invalid level

      mockRandom.setValues([1])

      const result = turnService.processWanderingSpawns(state)

      expect(result).toBe(state) // Same reference, no changes
    })

    test('adds atmospheric message when wanderer spawns', () => {
      const state = createGameState({ turnCount: 100 })

      // Mock spawn chance to succeed
      mockRandom.setValues([1, 15, 15, 100])

      const result = turnService.processWanderingSpawns(state)

      const lastMessage = result.messages[result.messages.length - 1]
      expect(lastMessage.text).toBe('You hear a faint noise in the distance...')
      expect(lastMessage.type).toBe('info')
    })

    test('handles undefined wanderingMonsterCount gracefully', () => {
      const state = createGameState({ turnCount: 100 })
      const level = state.levels.get(1)!
      const updatedLevel = { ...level, wanderingMonsterCount: undefined }
      state.levels.set(1, updatedLevel)

      // Mock spawn chance to succeed
      mockRandom.setValues([1, 15, 15, 100])

      const result = turnService.processWanderingSpawns(state)
      const resultLevel = result.levels.get(1)!

      expect(resultLevel.wanderingMonsterCount).toBe(1) // 0 + 1
    })
  })
})
