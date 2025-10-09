import { SpawnItemCommand } from './SpawnItemCommand'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { GameState, Level, TileType } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('SpawnItemCommand', () => {
  let originalFetch: typeof global.fetch
  let debugService: DebugService
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
    mockRandom.setValues([2, 5, 5, 5])
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
        }))),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [{ x: 0, y: 0, width: 10, height: 10 }],
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
  test('spawns potion at smart position', () => {
    const command = new SpawnItemCommand('potion', 'HEAL', debugService)
    const result = command.execute(mockState)
    const level = result.levels.get(1)!
    expect(level.items).toHaveLength(1)
    expect(level.items[0].type).toBe('POTION')
  test('spawns scroll at smart position', () => {
    const command = new SpawnItemCommand('scroll', 'IDENTIFY', debugService)
    expect(level.items[0].type).toBe('SCROLL')
  test('spawns ring at smart position', () => {
    const command = new SpawnItemCommand('ring', 'PROTECTION', debugService)
    expect(level.items[0].type).toBe('RING')
  test('spawns wand at smart position', () => {
    const command = new SpawnItemCommand('wand', 'MAGIC_MISSILE', debugService)
    expect(level.items[0].type).toBe('WAND')
  test('spawns food at smart position', () => {
    const command = new SpawnItemCommand('food', undefined, debugService)
    expect(level.items[0].type).toBe('FOOD')
  test('spawns torch at smart position', () => {
    const command = new SpawnItemCommand('torch', undefined, debugService)
    expect(level.items[0].type).toBe('TORCH')
  test('spawns lantern at smart position', () => {
    const command = new SpawnItemCommand('lantern', undefined, debugService)
    expect(level.items[0].type).toBe('LANTERN')
  test('spawns oil flask at smart position', () => {
    const command = new SpawnItemCommand('oil', undefined, debugService)
    expect(level.items[0].type).toBe('OIL_FLASK')
  test('adds message indicating spawn', () => {
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Spawned')
  test('handles unknown item type', () => {
    const command = new SpawnItemCommand('unknown', undefined, debugService)
    expect(level.items).toHaveLength(0)
    expect(result.messages[0].text).toContain('Unknown')
})
