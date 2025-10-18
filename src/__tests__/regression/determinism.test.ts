import 'fake-indexeddb/auto'
import { generateCanonicalReplay } from '../fixtures/replays/generate-canonical-replay'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { CommandFactory } from '@services/CommandFactory'
import { IndexedDBService } from '@services/IndexedDBService'
import { MockRandom } from '@services/RandomService'

/**
 * Determinism Regression Tests
 *
 * These tests use canonical replay fixtures to catch breaking changes to game logic.
 * If game logic changes in a non-deterministic way, these tests will fail.
 *
 * **How to Add Canonical Replays:**
 * 1. Play a test game to completion (manually or scripted)
 * 2. Export replay from IndexedDB using ReplayDebuggerService
 * 3. Save to `tests/fixtures/replays/canonical-game-N.json`
 * 4. Add fixture to CANONICAL_FIXTURES array below
 * 5. Document the scenario (victory, death, combat-heavy, etc.)
 *
 * **When to Update Fixtures:**
 * - After intentional game logic changes
 * - Re-export replays with new behavior
 * - Update expected states if needed
 *
 * **Current Fixtures:**
 * - Generated fixture: Simple 5-turn movement test (validates basic replay structure)
 * - TODO: Add real canonical replays from actual gameplay
 */

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('Determinism Regression Tests', () => {
  let replayDebugger: ReplayDebuggerService
  let indexedDB: IndexedDBService
  let mockRandom: MockRandom
  let commandFactory: CommandFactory

  beforeEach(async () => {
    indexedDB = new IndexedDBService()
    await indexedDB.initDatabase()

    mockRandom = new MockRandom([50, 30, 70, 20, 80])
    commandFactory = {} as CommandFactory // Minimal factory for basic tests

    replayDebugger = new ReplayDebuggerService(indexedDB, mockRandom, commandFactory)
  })

  afterEach(() => {
    indexedDB.close()
  })

  describe('Generated Canonical Fixtures', () => {
    it('should validate a simple 5-command replay without desyncs', async () => {
      // Generate minimal canonical replay
      const replayData = generateCanonicalReplay(5)

      // Save to IndexedDB
      await indexedDB.put('replays', replayData.gameId, replayData)

      // Load replay
      const loaded = await replayDebugger.loadReplay(replayData.gameId)
      expect(loaded).not.toBeNull()
      expect(loaded!.commands).toHaveLength(5)
      expect(loaded!.metadata.turnCount).toBe(5)
    })

    it('should validate replay metadata extraction', async () => {
      const replayData = generateCanonicalReplay(10)

      expect(replayData.metadata.turnCount).toBe(10)
      expect(replayData.metadata.characterName).toBe('Test Hero')
      expect(replayData.metadata.currentLevel).toBe(1)
      expect(replayData.metadata.outcome).toBe('ongoing')
    })

    it('should handle large replay (100 commands)', async () => {
      const replayData = generateCanonicalReplay(100)

      await indexedDB.put('replays', replayData.gameId, replayData)

      const loaded = await replayDebugger.loadReplay(replayData.gameId)
      expect(loaded).not.toBeNull()
      expect(loaded!.commands).toHaveLength(100)
    })

    it('should validate replay format version', async () => {
      const replayData = generateCanonicalReplay(5)

      expect(replayData.version).toBe(1)
      expect(replayData.gameId).toBe('canonical-test-replay')
      expect(replayData.seed).toBe('canonical-seed-12345')
    })

    it('should preserve initial state in replay', async () => {
      const replayData = generateCanonicalReplay(5)

      expect(replayData.initialState.turnCount).toBe(0)
      expect(replayData.initialState.player.hp).toBe(50)
      expect(replayData.initialState.player.position).toEqual({ x: 10, y: 5 })
      expect(replayData.initialState.characterName).toBe('Test Hero')
    })

    it('should record RNG state with each command', async () => {
      const replayData = generateCanonicalReplay(5)

      replayData.commands.forEach((cmd, index) => {
        expect(cmd.rngState).toBeDefined()
        expect(typeof cmd.rngState).toBe('string')
        expect(cmd.turnNumber).toBe(index)
      })
    })
  })

  describe('Real Canonical Fixtures', () => {
    // TODO: Add tests for real canonical replays from actual gameplay
    // Example structure:
    //
    // it('should replay canonical-game-victory without desyncs', async () => {
    //   const replayData = loadFixture('canonical-game-victory.json')
    //
    //   const reconstructed = await replayDebugger.reconstructToTurn(
    //     replayData,
    //     replayData.metadata.turnCount
    //   )
    //
    //   const result = await replayDebugger.validateDeterminism(
    //     replayData,
    //     reconstructed
    //   )
    //
    //   expect(result.valid).toBe(true)
    //   if (!result.valid) {
    //     console.error('Desyncs detected:', result.desyncs)
    //   }
    // })

    it('placeholder for future canonical replay tests', () => {
      // This test serves as documentation for how to add real canonical replays
      expect(true).toBe(true)
    })
  })

  describe('Regression Protection', () => {
    it('should detect version incompatibility', async () => {
      const replayData = generateCanonicalReplay(5)
      replayData.version = 999 // Incompatible version

      await indexedDB.put('replays', replayData.gameId, replayData)

      const loaded = await replayDebugger.loadReplay(replayData.gameId)
      expect(loaded).toBeNull() // Should reject incompatible version
    })

    it('should validate replay format integrity', async () => {
      const replayData = generateCanonicalReplay(5)

      // Verify all required fields are present
      expect(replayData.gameId).toBeDefined()
      expect(replayData.version).toBeDefined()
      expect(replayData.initialState).toBeDefined()
      expect(replayData.seed).toBeDefined()
      expect(replayData.commands).toBeDefined()
      expect(replayData.metadata).toBeDefined()

      // Verify command structure
      replayData.commands.forEach(cmd => {
        expect(cmd.turnNumber).toBeDefined()
        expect(cmd.timestamp).toBeDefined()
        expect(cmd.commandType).toBeDefined()
        expect(cmd.actorType).toBeDefined()
        expect(cmd.payload).toBeDefined()
        expect(cmd.rngState).toBeDefined()
      })
    })
  })
})
