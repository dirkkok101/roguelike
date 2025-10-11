import { LocalStorageService } from './LocalStorageService'
import { GameState, Player, Level, TileType, Monster, MonsterState } from '@game/core/core'

describe('LocalStorageService - Save/Load', () => {
  let service: LocalStorageService

  beforeEach(() => {
    service = new LocalStorageService()
    service.enableTestMode() // Use synchronous compression for tests
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 3,
      xp: 500,
      gold: 100,
      hunger: 1200,
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

  function createTestLevel(depth: number): Level {
    return {
      depth,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#FFFFFF',
            colorExplored: '#888888',
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(20)
        .fill(null)
        .map(() => Array(20).fill(false)),
    }
  }

  function createTestMonster(): Monster {
    return {
      id: 'test-monster-1',
      letter: 'T',
      name: 'Troll',
      spriteName: 'Troll',
      position: { x: 10, y: 10 },
      hp: 15,
      maxHp: 15,
      ac: 6,
      damage: '1d8+1',
      xpValue: 50,
      state: MonsterState.HUNTING,
      visibleCells: new Set(['10,10', '11,11']),
      currentPath: [{ x: 11, y: 11 }],
      aiProfile: {
        behavior: 'SIMPLE' as const,
        aggression: 0.5,
        intelligence: 0.3,
      },
      speed: 10,
    }
  }

  function createTestState(overrides: Partial<GameState> = {}): GameState {
    return {
      player: createTestPlayer(),
      currentLevel: 1,
      levels: new Map([[1, createTestLevel(1)]]),
      visibleCells: new Set(['5,5', '6,6']),
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'test-game-123',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: new Set<number>(),
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(['potion_healing']),
      ...overrides,
    }
  }

  test('saves game state to localStorage', async () => {
    const state = createTestState({ gameId: 'test-123' })

    await service.saveGame(state)

    const saved = localStorage.getItem('roguelike_save_test-123')
    expect(saved).not.toBeNull()
  })

  test('loads saved game state', async () => {
    const original = createTestState({ gameId: 'test-456' })
    await service.saveGame(original)

    const loaded = await service.loadGame('test-456')

    expect(loaded).not.toBeNull()
    expect(loaded?.gameId).toBe('test-456')
    expect(loaded?.player.hp).toBe(original.player.hp)
    expect(loaded?.player.level).toBe(3)
    expect(loaded?.player.gold).toBe(100)
  })

  test('returns null when no save exists', async () => {
    const loaded = await service.loadGame('nonexistent')

    expect(loaded).toBeNull()
  })

  test('preserves Map type for levels', async () => {
    const level1 = createTestLevel(1)
    const level2 = createTestLevel(2)
    const state = createTestState({
      levels: new Map([
        [1, level1],
        [2, level2],
      ]),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    expect(loaded.levels).toBeInstanceOf(Map)
    expect(loaded.levels.size).toBe(2)
    expect(loaded.levels.has(1)).toBe(true)
    expect(loaded.levels.has(2)).toBe(true)
    expect(loaded.levels.get(1)?.depth).toBe(1)
    expect(loaded.levels.get(2)?.depth).toBe(2)
  })

  test('preserves Set type for visibleCells', async () => {
    const state = createTestState({
      visibleCells: new Set(['0,0', '1,1', '2,2']),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    expect(loaded.visibleCells).toBeInstanceOf(Set)
    expect(loaded.visibleCells.size).toBe(3)
    expect(loaded.visibleCells.has('0,0')).toBe(true)
    expect(loaded.visibleCells.has('1,1')).toBe(true)
    expect(loaded.visibleCells.has('2,2')).toBe(true)
  })

  test('preserves Set type for identifiedItems', async () => {
    const state = createTestState({
      identifiedItems: new Set(['potion_healing', 'scroll_identify']),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    expect(loaded.identifiedItems).toBeInstanceOf(Set)
    expect(loaded.identifiedItems.size).toBe(2)
    expect(loaded.identifiedItems.has('potion_healing')).toBe(true)
    expect(loaded.identifiedItems.has('scroll_identify')).toBe(true)
  })

  test('preserves nested Sets in monsters', async () => {
    const monster = createTestMonster()
    const level = createTestLevel(1)
    level.monsters = [monster]

    const state = createTestState({
      levels: new Map([[1, level]]),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    const loadedMonster = loaded.levels.get(1)!.monsters[0]
    expect(loadedMonster.visibleCells).toBeInstanceOf(Set)
    expect(loadedMonster.visibleCells.size).toBe(2)
    expect(loadedMonster.visibleCells.has('10,10')).toBe(true)
    expect(loadedMonster.visibleCells.has('11,11')).toBe(true)
  })

  test('preserves monster currentPath array', async () => {
    const monster = createTestMonster()
    const level = createTestLevel(1)
    level.monsters = [monster]

    const state = createTestState({
      levels: new Map([[1, level]]),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    const loadedMonster = loaded.levels.get(1)!.monsters[0]
    expect(loadedMonster.currentPath).toEqual([{ x: 11, y: 11 }])
  })

  test('preserves all game state fields', async () => {
    const state = createTestState({
      gameId: 'full-test',
      currentLevel: 5,
      turnCount: 999,
      seed: 'test-seed-xyz',
      isGameOver: false,
      hasWon: false,
      hasAmulet: true,
    })

    await service.saveGame(state)
    const loaded = await service.loadGame('full-test')!

    expect(loaded.gameId).toBe('full-test')
    expect(loaded.currentLevel).toBe(5)
    expect(loaded.turnCount).toBe(999)
    expect(loaded.seed).toBe('test-seed-xyz')
    expect(loaded.isGameOver).toBe(false)
    expect(loaded.hasWon).toBe(false)
    expect(loaded.hasAmulet).toBe(true)
  })

  test('preserves Set type for levelsVisitedWithAmulet', async () => {
    const state = createTestState({
      hasAmulet: true,
      levelsVisitedWithAmulet: new Set([5, 10, 15]),
    })

    await service.saveGame(state)
    const loaded = await service.loadGame(state.gameId)!

    expect(loaded.levelsVisitedWithAmulet).toBeInstanceOf(Set)
    expect(loaded.levelsVisitedWithAmulet.size).toBe(3)
    expect(loaded.levelsVisitedWithAmulet.has(5)).toBe(true)
    expect(loaded.levelsVisitedWithAmulet.has(10)).toBe(true)
    expect(loaded.levelsVisitedWithAmulet.has(15)).toBe(true)
  })

  test('throws error when storage quota exceeded', async () => {
    // Mock localStorage.setItem to throw quota exceeded error
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = jest.fn(() => {
      throw new DOMException('QuotaExceededError')
    })

    const state = createTestState()

    await expect(service.saveGame(state)).rejects.toThrow(
      'Save failed - individual save file too large for localStorage'
    )

    // Restore original
    Storage.prototype.setItem = originalSetItem
  })
})
