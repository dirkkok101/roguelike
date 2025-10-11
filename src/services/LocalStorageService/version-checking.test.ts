import { LocalStorageService } from './LocalStorageService'
import { createMockGameState } from '../../test-helpers/mockGameState'
import * as LZString from 'lz-string'

describe('LocalStorageService - Version Checking', () => {
  let service: LocalStorageService

  beforeEach(() => {
    service = new LocalStorageService()
    service.enableTestMode() // Use synchronous compression for tests
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('saveGame with version', () => {
    it('should include version in saved data', async () => {
      const state = createMockGameState()
      await service.saveGame(state)

      const saveKey = `roguelike_save_${state.gameId}`
      const serialized = localStorage.getItem(saveKey)
      expect(serialized).not.toBeNull()

      // Decompress the data (v3 saves are compressed)
      const decompressed = LZString.decompress(serialized!)
      expect(decompressed).not.toBeNull()

      const parsed = JSON.parse(decompressed!)
      expect(parsed.version).toBe(4) // Version 4 with Web Worker compression
    })
  })

  describe('loadGame with version checking', () => {
    it('should load save with correct version (v4)', async () => {
      const state = createMockGameState()
      await service.saveGame(state)

      const loaded = await service.loadGame(state.gameId)

      expect(loaded).not.toBeNull()
      expect(loaded?.gameId).toBe(state.gameId)
      expect(loaded?.currentLevel).toBe(state.currentLevel)
    })

    it('should reject save with old version (v1)', async () => {
      const state = createMockGameState()
      const saveKey = `roguelike_save_${state.gameId}`

      // Manually create an old v1 save (or no version field)
      const oldSave = {
        gameId: state.gameId,
        currentDepth: 5,
        player: state.player,
        // No version field (or version: 1)
      }

      localStorage.setItem(saveKey, JSON.stringify(oldSave))
      localStorage.setItem('roguelike_continue', state.gameId)

      const loaded = await service.loadGame(state.gameId)

      expect(loaded).toBeNull()
      // Should have deleted the incompatible save
      expect(localStorage.getItem(saveKey)).toBeNull()
    })

    it('should reject save with wrong version (v1 explicitly)', async () => {
      const state = createMockGameState()
      const saveKey = `roguelike_save_${state.gameId}`

      // Create an old v1 save with explicit version
      const oldSave = {
        version: 1, // Old version
        gameId: state.gameId,
        currentDepth: 5,
        player: state.player,
      }

      localStorage.setItem(saveKey, JSON.stringify(oldSave))
      localStorage.setItem('roguelike_continue', state.gameId)

      const loaded = await service.loadGame(state.gameId)

      expect(loaded).toBeNull()
      // Should have deleted the incompatible save
      expect(localStorage.getItem(saveKey)).toBeNull()
    })

    it('should log warning message when deleting old save', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const state = createMockGameState()
      const saveKey = `roguelike_save_${state.gameId}`

      // Create an old v1 save
      const oldSave = {
        version: 1,
        gameId: state.gameId,
      }

      localStorage.setItem(saveKey, JSON.stringify(oldSave))

      await service.loadGame(state.gameId)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incompatible save version')
      )

      consoleSpy.mockRestore()
    })

    it('should handle saves with future versions gracefully', async () => {
      const state = createMockGameState()
      const saveKey = `roguelike_save_${state.gameId}`

      // Create a save with a future version
      const futureSave = {
        version: 99, // Future version
        gameId: state.gameId,
      }

      localStorage.setItem(saveKey, JSON.stringify(futureSave))

      const loaded = await service.loadGame(state.gameId)

      // Should reject future versions too (incompatible)
      expect(loaded).toBeNull()
    })
  })

  describe('version migration history', () => {
    it('should document version history in constants', async () => {
      // This test documents the version history
      // Version 1: Original 10-level implementation (uncompressed)
      // Version 2: 26-level implementation with vorpal spawning and amulet quest (uncompressed)
      // Version 3: Same as v2 but with LZ-string compression (60-80% size reduction)
      // Version 4: Web Worker compression + state snapshot + save queue
      expect(service.SAVE_VERSION).toBe(4)
    })
  })
})
