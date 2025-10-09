import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, TileType, MonsterState, MonsterBehavior } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('DebugService - Monster Spawning', () => {
  let originalFetch: typeof global.fetch

  // Mock monster data
  const mockMonsterData = [
    {
      letter: 'T',
      name: 'Troll',
      hp: '6d8',
      ac: 4,
      damage: '1d8+1d8+2d6',
      xpValue: 120,
      level: 6,
      speed: 12,
      rarity: 'uncommon',
      mean: true,
      aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] },
    },
    {
      letter: 'D',
      name: 'Dragon',
      hp: '10d8',
      ac: -1,
      damage: '1d8+3d10',
      xpValue: 5000,
      level: 10,
      speed: 18,
      rarity: 'rare',
      mean: true,
      aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 15, fleeThreshold: 0.15, special: [] },
    },
  ]

  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMonsterData,
    } as Response)
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  async function createDebugService(isDevMode: boolean = true) {
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    return new DebugService(new MessageService(), monsterSpawnService, itemSpawnService, mockRandom, isDevMode)
  }

  let debugService: DebugService
  let mockState: GameState
  let mockRandom: MockRandom

  beforeEach(async () => {
    const messageService = new MessageService()
    mockRandom = new MockRandom()

    // Set generous default MockRandom values for smart positioning and monster creation
    // Each spawn needs: radius (1 value) + HP rolls (~10 values) + energy (1 value)
    // Provide enough for multiple spawn calls in tests
    const defaultValues = [
      2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50, // First spawn
      2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50, // Second spawn
      2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50, // Third spawn
      2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50, // Fourth spawn
    ]
    mockRandom.setValues(defaultValues)

    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)

    // Create state with empty level (includes room for smart positioning)
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map((_, y) =>
        Array(10).fill(null).map((_, x) => ({
          type: 'floor' as TileType, // Use string literal for type check compatibility
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
          position: { x, y }, // Add position for completeness
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [{ x: 0, y: 0, width: 10, height: 10 }], // Single large room for testing
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      turnCount: 0,
      player: {
        position: { x: 1, y: 1 },
      },
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('spawnMonster creates new monster at player position', async () => {
    const result = debugService.spawnMonster(mockState, 'T')

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(1)
    expect(level.monsters[0].letter).toBe('T')
  })

  test('spawnMonster creates monster with correct properties from template', async () => {
    const result = debugService.spawnMonster(mockState, 'D')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.letter).toBe('D')
    expect(monster.name).toBe('Dragon') // Real monster name
    expect(monster.hp).toBeGreaterThan(0) // HP rolled from '10d8'
    expect(monster.maxHp).toBe(monster.hp) // maxHp equals rolled HP
    expect(monster.ac).toBe(-1) // Dragon's AC
    expect(monster.damage).toBe('1d8+3d10') // Dragon's damage
    expect(monster.xpValue).toBe(5000) // Dragon's XP value
    expect(monster.speed).toBe(18) // Dragon's speed
  })

  test('spawnMonster creates awake hunting monster (mean=true)', async () => {
    const result = debugService.spawnMonster(mockState, 'T')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.isAwake).toBe(true) // Troll is mean
    expect(monster.isAsleep).toBe(false)
    expect(monster.state).toBe(MonsterState.HUNTING)
  })

  test('spawnMonster creates monster with correct AI behavior from template', async () => {
    const result = debugService.spawnMonster(mockState, 'T')

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.aiProfile.behavior).toBe(MonsterBehavior.SIMPLE)
    expect(monster.aiProfile.intelligence).toBe(4) // Troll's intelligence
    expect(monster.aiProfile.aggroRange).toBe(8) // Troll's aggro range
  })

  test('spawnMonster adds message with monster name and position', async () => {
    const result = debugService.spawnMonster(mockState, 'T')

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned Troll (T) at')
  })

  test('spawnMonster finds nearby empty tile when position blocked', async () => {
    // Add monster at player position
    const blockedLevel: Level = {
      ...mockState.levels.get(1)!,
      monsters: [{
        position: { x: 1, y: 1 },
        id: 'existing',
      } as any],
    }
    const blockedState = {
      ...mockState,
      levels: new Map([[1, blockedLevel]]),
    }

    const result = debugService.spawnMonster(blockedState, 'T')

    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(2)
    // New monster should be at different position
    expect(level.monsters[1].position).not.toEqual({ x: 1, y: 1 })
  })

  test('spawnMonster with explicit position uses that position', async () => {
    const result = debugService.spawnMonster(mockState, 'T', { x: 5, y: 5 })

    const monster = result.levels.get(1)!.monsters[0]
    expect(monster.position).toEqual({ x: 5, y: 5 })
  })

  test('spawnMonster preserves immutability', async () => {
    const result = debugService.spawnMonster(mockState, 'T')

    expect(result).not.toBe(mockState)
    expect(result.levels).not.toBe(mockState.levels)
    expect(mockState.levels.get(1)!.monsters).toHaveLength(0) // Original unchanged
  })

  test('spawnMonster does nothing in production mode', async () => {
    const prodService = await createDebugService(false)
    const result = prodService.spawnMonster(mockState, 'T')

    expect(result).toBe(mockState)
  })

  test('spawnMonster returns state with warning if no valid position found', async () => {
    // Create level with all walls and no rooms
    const walledLevel: Level = {
      ...mockState.levels.get(1)!,
      rooms: [], // No rooms
      tiles: Array(10).fill(null).map((_, y) =>
        Array(10).fill(null).map((_, x) => ({
          type: 'wall' as TileType, // Use string literal
          char: '#',
          walkable: false,
          transparent: false,
          colorVisible: '#fff',
          colorExplored: '#888',
          position: { x, y },
        }))
      ),
    }
    const walledState = {
      ...mockState,
      levels: new Map([[1, walledLevel]]),
    }

    const result = debugService.spawnMonster(walledState, 'T')

    expect(result.messages[0].text).toContain('No valid spawn position found for Troll')
    expect(result.messages[0].type).toBe('warning')
    expect(result.levels.get(1)!.monsters).toHaveLength(0)
  })

  test('spawnMonster returns state with warning for unknown monster letter', async () => {
    const result = debugService.spawnMonster(mockState, 'X') // X not in mock data

    expect(result.messages[0].text).toContain('Unknown monster letter: X')
    expect(result.messages[0].type).toBe('warning')
    expect(result.levels.get(1)!.monsters).toHaveLength(0)
  })
})
