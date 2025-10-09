import { SpawnMonsterCommand } from './SpawnMonsterCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('SpawnMonsterCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let mockState: GameState
  const mockMonsterData = [
    { letter: 'T', name: 'Troll', hp: '6d8', ac: 4, damage: '1d8', xpValue: 120, level: 6, speed: 12, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] }},
    { letter: 'A', name: 'Aquator', hp: '5d8', ac: 2, damage: '1d6', xpValue: 20, level: 5, speed: 10, rarity: 'common', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 3, aggroRange: 6, fleeThreshold: 0.3, special: [] }},
    { letter: 'B', name: 'Bat', hp: '1d8', ac: 3, damage: '1d4', xpValue: 1, level: 1, speed: 14, rarity: 'common', mean: false, aiProfile: { behavior: 'ERRATIC', intelligence: 2, aggroRange: 4, fleeThreshold: 0.5, special: [] }},
    { letter: 'D', name: 'Dragon', hp: '10d8', ac: -1, damage: '1d8+3d10', xpValue: 5000, level: 10, speed: 18, rarity: 'rare', mean: true, aiProfile: { behavior: 'SMART', intelligence: 8, aggroRange: 15, fleeThreshold: 0.15, special: [] }},
  ]
  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockMonsterData } as Response)
  })
  afterAll(() => { global.fetch = originalFetch })
  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    // Set values for HP rolls and energy
    mockRandom.setValues([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50])
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map((_, y) =>
        Array(10).fill(null).map((_, x) => ({
          type: 'floor' as TileType,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
          position: { x, y },
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [{ x: 0, y: 0, width: 10, height: 10 }], // Add room for smart positioning
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
      player: {
        position: { x: 1, y: 1 },
      },
      debug: debugService.initializeDebugState(),
    } as GameState
  test('executes debugService.spawnMonster with specified letter', () => {
    const command = new SpawnMonsterCommand('T', debugService)
    const result = command.execute(mockState)
    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(1)
    expect(level.monsters[0].letter).toBe('T')
  test('spawns different monster letters', () => {
    const commandA = new SpawnMonsterCommand('A', debugService)
    const commandB = new SpawnMonsterCommand('B', debugService)
    const resultA = commandA.execute(mockState)
    const resultB = commandB.execute(resultA)
    const level = resultB.levels.get(1)!
    expect(level.monsters).toHaveLength(2)
    expect(level.monsters[0].letter).toBe('A')
    expect(level.monsters[1].letter).toBe('B')
  test('adds message indicating spawn', () => {
    const command = new SpawnMonsterCommand('D', debugService)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned D')
  test('creates command with dragon letter', () => {
    expect(command).toBeInstanceOf(SpawnMonsterCommand)
})
