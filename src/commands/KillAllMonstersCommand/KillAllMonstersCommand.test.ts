import { KillAllMonstersCommand } from './KillAllMonstersCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('KillAllMonstersCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
  let command: KillAllMonstersCommand
  let mockState: GameState
  const mockMonsterData = [{ letter: 'T', name: 'Troll', hp: '6d8', ac: 4, damage: '1d8', xpValue: 120, level: 6, speed: 12, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] }}]
  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockMonsterData } as Response)
  })
  afterAll(() => { global.fetch = originalFetch })
  beforeEach(async () => {
    const messageService = new MessageService()
    const mockRandom = new MockRandom()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true)
    command = new KillAllMonstersCommand(debugService)
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [
        { id: 'monster1', letter: 'O', name: 'Orc' } as any,
        { id: 'monster2', letter: 'T', name: 'Troll' } as any,
      ],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }
    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      debug: debugService.initializeDebugState(),
    } as GameState
  test('executes debugService.killAllMonsters', () => {
    const result = command.execute(mockState)
    const level = result.levels.get(1)!
    expect(level.monsters).toHaveLength(0)
  test('removes all monsters from level', () => {
    expect(level.monsters).toEqual([])
  test('adds message with monster count', () => {
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Removed')
    expect(result.messages[0].text).toContain('monsters')
})
