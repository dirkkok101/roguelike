import { GameState } from '@game/core/core'
import { IndexedDBService } from '@services/IndexedDBService'
import { CompressionWorkerService } from '@services/CompressionWorkerService'
import { SerializationWorkerService } from '@services/SerializationWorkerService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { ReplayData, ReplayMetadata } from '@game/replay/replay'

// ============================================================================
// GAME STORAGE SERVICE - IndexedDB-based game save/load
// ============================================================================

/**
 * GameStorageService
 *
 * Responsibilities:
 * - Replace LocalStorageService with IndexedDB backend
 * - Handle game save/load operations
 * - Compress data with LZ-string (keep existing compression)
 * - Manage saves in IndexedDB 'saves' object store
 * - Save replay data in IndexedDB 'replays' object store
 * - Serialize/deserialize GameState (Maps/Sets → Arrays)
 * - Integrate with CommandRecorderService for replay tracking
 */

export interface SaveMetadata {
  gameId: string
  characterName: string
  currentLevel: number
  turnCount: number
  timestamp: number
}

export class GameStorageService {
  /**
   * Save version for compatibility checking
   * Version 5: IndexedDB implementation (no localStorage migration)
   */
  public readonly SAVE_VERSION = 5

  /**
   * Replay version for compatibility checking
   * Version 1: Initial replay implementation with command recording
   */
  public readonly REPLAY_VERSION = 1

  private indexedDB: IndexedDBService
  private compressionWorker: CompressionWorkerService
  private serializationWorker: SerializationWorkerService
  private recorder: CommandRecorderService

  private testMode = false

  constructor(
    recorder: CommandRecorderService,
    indexedDB?: IndexedDBService,
    compressionWorker?: CompressionWorkerService,
    serializationWorker?: SerializationWorkerService
  ) {
    this.recorder = recorder
    this.indexedDB = indexedDB || new IndexedDBService()
    this.compressionWorker = compressionWorker || new CompressionWorkerService()
    this.serializationWorker = serializationWorker || new SerializationWorkerService()
  }

  /**
   * Enable test mode (for unit tests)
   * Disables Web Workers and uses synchronous compression/serialization
   */
  enableTestMode(): void {
    this.testMode = true
    this.compressionWorker.enableTestMode()
    this.serializationWorker.enableTestMode()
  }

  /**
   * Save game state to IndexedDB
   * Saves BOTH game state (full snapshot) and replay data (commands) atomically
   * Dual storage model: 'saves' for fast loading, 'replays' for debugging
   */
  async saveGame(state: GameState): Promise<void> {
    try {
      // Serialize and compress game state
      const serialized = await this.serializeGameState(state)
      const compressed = await this.compressionWorker.compress(serialized)

      // Prepare save data
      const saveData = {
        gameId: state.gameId,
        gameState: compressed,
        metadata: this.extractMetadata(state),
        version: this.SAVE_VERSION,
        timestamp: Date.now(),
      }

      // Get command log and initial state from recorder
      const commands = this.recorder.getCommandLog()
      const initialState = this.recorder.getInitialState()

      // Prepare replay data (only if recording is active)
      let replayData: ReplayData | null = null
      if (initialState && commands.length > 0) {
        replayData = {
          gameId: state.gameId,
          version: this.REPLAY_VERSION,
          initialState: initialState,
          seed: state.seed,
          commands: commands,
          metadata: this.extractReplayMetadata(state),
        }
      }

      // Save to IndexedDB atomically (both stores or neither)
      await this.indexedDB.put('saves', state.gameId, saveData)

      // Save replay data if available
      if (replayData) {
        await this.indexedDB.put('replays', state.gameId, replayData)
      }

      // Update continue pointer
      await this.setContinueGameId(state.gameId)

      console.log(
        `Game saved: ${state.gameId} (${commands.length} commands recorded)`
      )
    } catch (error) {
      console.error('Failed to save game:', error)
      // TODO: Implement rollback for atomic saves (delete both if either fails)
      throw new Error('Failed to save game')
    }
  }

  /**
   * Load game state from IndexedDB
   * Clears command recorder and sets loaded state as new initial state
   * (Recording starts from the load point, not from turn 0)
   */
  async loadGame(gameId?: string): Promise<GameState | null> {
    try {
      const targetId = gameId || (await this.getContinueGameId())
      if (!targetId) {
        return null
      }

      // Get from IndexedDB
      const data = await this.indexedDB.get('saves', targetId)
      if (!data) {
        return null
      }

      // Check version compatibility
      if (data.version !== this.SAVE_VERSION) {
        console.warn(
          `Incompatible save version: found v${data.version}, expected v${this.SAVE_VERSION}`
        )
        return null
      }

      // Decompress and deserialize
      const decompressed = await this.compressionWorker.decompress(data.gameState)
      const state = await this.deserializeGameState(decompressed)

      // Validate
      if (!this.isValidSaveState(state)) {
        console.warn(`Save validation failed for ${targetId}`)
        return null
      }

      // Clear command recorder and set loaded state as new initial state
      // This means we start recording from this point (not from turn 0)
      this.recorder.clearLog()
      this.recorder.setInitialState(state)

      console.log(`Save loaded successfully: ${targetId} (recording from this point)`)
      return state
    } catch (error) {
      console.error('Failed to load game:', error)
      return null
    }
  }

  /**
   * Delete save file
   */
  async deleteSave(gameId: string): Promise<void> {
    await this.indexedDB.delete('saves', gameId)

    // Clear continue pointer if it matches this save
    const continueId = await this.getContinueGameId()
    if (continueId === gameId) {
      await this.indexedDB.delete('saves', 'continue_pointer')
    }

    console.log(`Save deleted: ${gameId}`)
  }

  /**
   * Check if a save exists
   */
  async hasSave(gameId?: string): Promise<boolean> {
    const targetId = gameId || (await this.getContinueGameId())
    if (!targetId) {
      return false
    }

    const data = await this.indexedDB.get('saves', targetId)
    return data !== null
  }

  /**
   * Get the game ID of the most recent save
   */
  async getContinueGameId(): Promise<string | null> {
    const data = await this.indexedDB.get('saves', 'continue_pointer')
    return data?.continueGameId || null
  }

  /**
   * Set the continue game ID
   */
  async setContinueGameId(gameId: string): Promise<void> {
    await this.indexedDB.put('saves', 'continue_pointer', {
      gameId: 'continue_pointer',
      continueGameId: gameId,
    })
  }

  /**
   * List all save game metadata
   */
  async listGames(): Promise<SaveMetadata[]> {
    const allData = await this.indexedDB.getAll('saves')

    // Filter out continue pointer and extract metadata
    const saves = allData
      .filter((item) => item.gameId !== 'continue_pointer')
      .map((item) => item.metadata as SaveMetadata)

    // Sort by timestamp (newest first)
    saves.sort((a, b) => b.timestamp - a.timestamp)

    return saves
  }

  /**
   * Get storage quota information
   */
  async getQuota(): Promise<{
    usage: number
    quota: number
    percentUsed: number
  }> {
    return this.indexedDB.checkQuota()
  }

  // ========================================================================
  // PRIVATE METHODS - Serialization/Deserialization
  // ========================================================================

  /**
   * Serialize GameState to JSON string
   * Uses Web Worker for background serialization
   */
  private async serializeGameState(state: GameState): Promise<string> {
    // SerializationWorker does prepareStateForSerialization() + JSON.stringify() off main thread
    const json = await this.serializationWorker.serialize(state, this.SAVE_VERSION)
    return json
  }

  /**
   * Deserialize JSON string to GameState
   * Converts arrays back to Maps/Sets
   */
  private async deserializeGameState(json: string): Promise<GameState> {
    // SECURITY: Validate input before parsing
    if (!json || typeof json !== 'string') {
      throw new Error('Invalid save data: empty or non-string')
    }

    // Parse JSON
    let data
    try {
      data = JSON.parse(json)
    } catch (error) {
      throw new Error(
        `Failed to parse save data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save structure: not an object')
    }

    if (!data.player || !data.levels || !data.gameId) {
      throw new Error(
        'Invalid save structure: missing required fields (player, levels, gameId)'
      )
    }

    return this.restoreStateFromSerialization(data)
  }

  /**
   * Restore state from serialized data
   * Converts arrays back to Maps/Sets
   * (Copied from LocalStorageService)
   */
  private restoreStateFromSerialization(data: any): GameState {
    // Restore levels Map
    const levelsArray = data.levels as Array<[number, any]>
    const levels = new Map(
      levelsArray.map(([depth, level]) => {
        return [
          depth,
          {
            ...level,
            monsters: level.monsters.map((m: any) => ({
              ...m,
              visibleCells: new Set(m.visibleCells || []),
            })),
          },
        ]
      })
    )

    // Restore Sets with defaults for missing fields
    const visibleCells = new Set(Array.isArray(data.visibleCells) ? data.visibleCells : [])
    const identifiedItems = new Set(
      Array.isArray(data.identifiedItems) ? data.identifiedItems : []
    )
    const detectedMonsters = new Set(
      Array.isArray(data.detectedMonsters) ? data.detectedMonsters : []
    )
    const detectedMagicItems = new Set(
      Array.isArray(data.detectedMagicItems) ? data.detectedMagicItems : []
    )
    const levelsVisitedWithAmulet = new Set(
      Array.isArray(data.levelsVisitedWithAmulet) ? data.levelsVisitedWithAmulet : []
    )

    // Restore nested Maps in itemNameMap
    const itemNameMap = {
      potions: Array.isArray(data.itemNameMap.potions)
        ? new Map(data.itemNameMap.potions)
        : new Map(Object.entries(data.itemNameMap.potions || {})),
      scrolls: Array.isArray(data.itemNameMap.scrolls)
        ? new Map(data.itemNameMap.scrolls)
        : new Map(Object.entries(data.itemNameMap.scrolls || {})),
      rings: Array.isArray(data.itemNameMap.rings)
        ? new Map(data.itemNameMap.rings)
        : new Map(Object.entries(data.itemNameMap.rings || {})),
      wands: Array.isArray(data.itemNameMap.wands)
        ? new Map(data.itemNameMap.wands)
        : new Map(Object.entries(data.itemNameMap.wands || {})),
    }

    // MIGRATION: Add defaults for missing player fields
    const player = {
      ...data.player,
      energy: data.player.energy ?? 100,
      statusEffects: data.player.statusEffects ?? [],
    }

    return {
      ...data,
      player,
      levels,
      visibleCells,
      identifiedItems,
      detectedMonsters,
      detectedMagicItems,
      levelsVisitedWithAmulet,
      itemNameMap,
      characterName: data.characterName ?? 'Unknown Hero',
      maxDepth: data.maxDepth ?? 10,
      monstersKilled: data.monstersKilled ?? 0,
      itemsFound: data.itemsFound ?? 0,
      itemsUsed: data.itemsUsed ?? 0,
      levelsExplored: data.levelsExplored ?? 1,
      config: data.config ?? { fovMode: 'radius' },
    }
  }

  /**
   * Extract metadata from game state
   */
  private extractMetadata(state: GameState): SaveMetadata {
    return {
      gameId: state.gameId,
      characterName: state.characterName || 'Unknown Hero',
      currentLevel: state.currentLevel,
      turnCount: state.turnCount,
      timestamp: Date.now(),
    }
  }

  /**
   * Extract replay metadata from game state
   * Used for indexing and querying replays
   */
  private extractReplayMetadata(state: GameState): ReplayMetadata {
    let outcome: 'won' | 'died' | 'ongoing' = 'ongoing'

    if (state.isGameOver) {
      outcome = state.hasWon ? 'won' : 'died'
    }

    return {
      createdAt: Date.now(),
      turnCount: state.turnCount,
      characterName: state.characterName || 'Unknown Hero',
      currentLevel: state.currentLevel,
      outcome: outcome,
    }
  }

  /**
   * Validate that loaded/migrated save has all required fields
   */
  private isValidSaveState(state: GameState): boolean {
    // Check critical player fields exist
    if (!state.player || typeof state.player.energy !== 'number') {
      return false
    }

    if (!Array.isArray(state.player.statusEffects)) {
      return false
    }

    // Check critical game state fields
    if (!state.levels || !state.visibleCells || !state.player.position) {
      return false
    }

    // Check player position is valid
    if (
      typeof state.player.position.x !== 'number' ||
      typeof state.player.position.y !== 'number'
    ) {
      return false
    }

    return true
  }
}
