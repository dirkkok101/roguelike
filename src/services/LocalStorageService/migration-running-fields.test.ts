import { LocalStorageService } from './LocalStorageService'
import { GameState, TileType } from '@game/core/core'

/**
 * Test migration of old saves to add isRunning and runState fields
 * 
 * This was causing runtime error:
 * "Player missing required fields: isRunning. Check Player initialization in DungeonService or use PlayerFactory."
 * 
 * Root cause: Old saved games from before Task 7 (running system) were missing these fields.
 * Fix: Migration in restoreStateFromSerialization() adds defaults.
 */
describe('LocalStorageService - Migration: Running Fields', () => {
  let service: LocalStorageService

  beforeEach(() => {
    service = new LocalStorageService()
    service.enableTestMode()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('should migrate old save without isRunning field', async () => {
    // Simulate an old save (before Task 7) by creating save manually without running fields
    const oldSaveData = {
      version: 4, // Current version, but missing new fields
      player: {
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
        energy: 100, // Has energy (Task 6)
        statusEffects: [], // Has statusEffects (Task 6)
        // MISSING: isRunning and runState (should be added by migration)
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: [[1, {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() => Array(10).fill(TileType.WALL)),
        rooms: [],
        corridors: [],
        monsters: [],
        items: [],
        doors: [],
        traps: [],
        explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      }]],
      visibleCells: [],
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'old-save',
      characterName: 'Test Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: [],
      maxDepth: 26,
      itemNameMap: {
        potions: [],
        scrolls: [],
        rings: [],
        wands: [],
      },
      identifiedItems: [],
      detectedMonsters: [],
      detectedMagicItems: [],
      debug: { isGodMode: false, isMapRevealed: false },
      positionHistory: [],
      config: { fovMode: 'radius' },
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }

    // Manually inject old save into localStorage
    const serialized = JSON.stringify(oldSaveData)
    localStorage.setItem('roguelike_save_old-save', serialized)
    localStorage.setItem('roguelike_continue', 'old-save')

    // Load the save (should trigger migration)
    const loaded = await service.loadGame('old-save')

    // Verify migration succeeded
    expect(loaded).not.toBeNull()
    expect(loaded!.player.isRunning).toBe(false) // Default added by migration
    expect(loaded!.player.runState).toBe(null) // Default added by migration
    expect(loaded!.player.energy).toBe(100) // Existing field preserved
    expect(loaded!.player.statusEffects).toEqual([]) // Existing field preserved
  })

  test('should validate migrated save with isValidSaveState', async () => {
    // Same old save setup
    const oldSaveData = {
      version: 4,
      player: {
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
        energy: 100,
        statusEffects: [],
        // MISSING: isRunning and runState
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: [[1, {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() => Array(10).fill(TileType.WALL)),
        rooms: [],
        corridors: [],
        monsters: [],
        items: [],
        doors: [],
        traps: [],
        explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      }]],
      visibleCells: [],
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'validation-test',
      characterName: 'Test Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: [],
      maxDepth: 26,
      itemNameMap: {
        potions: [],
        scrolls: [],
        rings: [],
        wands: [],
      },
      identifiedItems: [],
      detectedMonsters: [],
      detectedMagicItems: [],
      debug: { isGodMode: false, isMapRevealed: false },
      positionHistory: [],
      config: { fovMode: 'radius' },
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }

    const serialized = JSON.stringify(oldSaveData)
    localStorage.setItem('roguelike_save_validation-test', serialized)

    // Load should succeed (migration + validation)
    const loaded = await service.loadGame('validation-test')
    
    // Should NOT be deleted (validation should pass after migration)
    expect(loaded).not.toBeNull()
    expect(loaded!.player.isRunning).toBe(false)
    expect(loaded!.player.runState).toBe(null)
  })

  test('should preserve existing running fields if present', async () => {
    // New save with running fields already present
    const newSaveData = {
      version: 4,
      player: {
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
        energy: 100,
        statusEffects: [],
        isRunning: true, // Already present
        runState: { direction: 'east', initialDistance: 5 }, // Already present
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: [[1, {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() => Array(10).fill(TileType.WALL)),
        rooms: [],
        corridors: [],
        monsters: [],
        items: [],
        doors: [],
        traps: [],
        explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      }]],
      visibleCells: [],
      messages: [],
      turnCount: 0,
      seed: 'test-seed',
      gameId: 'new-save',
      characterName: 'Test Hero',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      levelsVisitedWithAmulet: [],
      maxDepth: 26,
      itemNameMap: {
        potions: [],
        scrolls: [],
        rings: [],
        wands: [],
      },
      identifiedItems: [],
      detectedMonsters: [],
      detectedMagicItems: [],
      debug: { isGodMode: false, isMapRevealed: false },
      positionHistory: [],
      config: { fovMode: 'radius' },
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }

    const serialized = JSON.stringify(newSaveData)
    localStorage.setItem('roguelike_save_new-save', serialized)

    const loaded = await service.loadGame('new-save')

    // Should preserve existing values (not overwrite with defaults)
    expect(loaded).not.toBeNull()
    expect(loaded!.player.isRunning).toBe(true) // Preserved
    expect(loaded!.player.runState).toEqual({ direction: 'east', initialDistance: 5 }) // Preserved
  })
})
