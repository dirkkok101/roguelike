import { GameState, Level, Monster } from '@game/core/core'
import { CompressionWorkerService } from '@services/CompressionWorkerService'
import { SerializationWorkerService } from '@services/SerializationWorkerService'

// ============================================================================
// SERIALIZATION TYPES
// ============================================================================

/**
 * Serialized monster with Set converted to Array
 */
type SerializedMonster = Omit<Monster, 'visibleCells'> & {
  visibleCells: string[] // Array instead of Set<string>
}

/**
 * Serialized level with monsters converted to serialized form
 */
type SerializedLevel = Omit<Level, 'monsters'> & {
  monsters: SerializedMonster[]
}

// ============================================================================
// LOCAL STORAGE SERVICE - Game save/load persistence
// ============================================================================

export class LocalStorageService {
  private readonly SAVE_KEY_PREFIX = 'roguelike_save_'
  private readonly CONTINUE_KEY = 'roguelike_continue'

  /**
   * Save version for compatibility checking
   * Version 1: Original 10-level implementation (uncompressed)
   * Version 2: 26-level implementation with vorpal spawning and amulet quest (uncompressed)
   * Version 3: Same as v2 but with LZ-string compression (60-80% size reduction)
   * Version 4: Web Worker compression + state snapshot + save queue
   */
  public readonly SAVE_VERSION = 4
  private static readonly MAX_QUEUE_SIZE = 1 // Only keep latest save (each state is 1-5 MB)
  private static readonly MAX_RETRY_ATTEMPTS = 3 // Retry failed saves up to 3 times

  private compressionWorker: CompressionWorkerService
  private serializationWorker: SerializationWorkerService
  private isSaving = false
  private saveQueue: GameState[] = []
  private lastSaveTime = 0
  private readonly MIN_SAVE_INTERVAL_MS = 1000 // Debounce: max 1 save per second

  constructor() {
    this.compressionWorker = new CompressionWorkerService()
    this.serializationWorker = new SerializationWorkerService()
  }

  private testMode = false

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
   * Check if a save operation is currently in progress
   * Useful for beforeunload warning
   */
  isSavingInProgress(): boolean {
    return this.isSaving || this.saveQueue.length > 0
  }

  /**
   * Save game state to LocalStorage asynchronously
   * Uses Web Worker for background compression
   * Queues saves if one is already in progress
   * Takes snapshot of state to avoid race conditions
   *
   * IMPORTANT FOR CALLERS: Returns a Promise but DO NOT AWAIT IT!
   * The promise is returned for testing purposes only.
   * In production code, call without await to avoid blocking:
   *   localStorageService.saveGame(state) // Fire-and-forget
   *
   * Use callbacks for notifications instead of .then():
   *   localStorageService.saveGame(state, onSuccess, onError)
   */
  saveGame(
    state: GameState,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // DEBOUNCE: Prevent rapid-fire saves (max 1 per second)
    // Skip debounce in test mode to avoid breaking tests
    const now = Date.now()
    if (!this.testMode && now - this.lastSaveTime < this.MIN_SAVE_INTERVAL_MS) {
      const error = new Error('Save throttled - please wait before saving again')
      console.warn(`Save throttled (last save was ${now - this.lastSaveTime}ms ago)`)
      if (onError) onError(error)
      return Promise.reject(error)
    }

    this.lastSaveTime = now

    // CRITICAL: Limit queue size to prevent memory exhaustion
    if (this.saveQueue.length >= LocalStorageService.MAX_QUEUE_SIZE) {
      console.warn(
        `Save queue full (${LocalStorageService.MAX_QUEUE_SIZE}), discarding oldest state`
      )
      this.saveQueue.shift() // Remove oldest
    }

    // NO SNAPSHOT NEEDED: State is immutable (never mutated, always new objects)
    // We can safely serialize the state object directly without race conditions
    // The state object passed here won't change - new player actions create NEW state objects
    this.saveQueue.push(state)

    // Start processing queue if not already saving
    if (!this.isSaving) {
      // Return the promise (but callers should NOT await it!)
      const savePromise = this.processSaveQueue()

      // Fire callbacks if provided
      if (onSuccess || onError) {
        savePromise
          .then(() => {
            if (onSuccess) onSuccess()
          })
          .catch((error) => {
            console.error('Background save failed:', error)
            if (onError) onError(error as Error)
          })
      }

      return savePromise
    }

    // Already saving - return resolved promise
    return Promise.resolve()
  }


  /**
   * Process save queue
   * Saves most recent state, discards intermediate states
   * Retries failed saves with exponential backoff
   */
  private async processSaveQueue(): Promise<void> {
    while (this.saveQueue.length > 0) {
      this.isSaving = true

      // Take most recent state (discard intermediate states to save time)
      const discardedCount = this.saveQueue.length - 1
      const state = this.saveQueue[this.saveQueue.length - 1]
      this.saveQueue = []

      // Log if we skipped saves (transparency)
      if (discardedCount > 0) {
        console.log(`⏩ Skipped ${discardedCount} intermediate save(s) (optimization)`)
      }

      // Retry logic with exponential backoff
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= LocalStorageService.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          await this.saveGameInternal(state)
          // Success - break out of retry loop
          break
        } catch (error) {
          lastError = error as Error
          console.error(`Save attempt ${attempt}/${LocalStorageService.MAX_RETRY_ATTEMPTS} failed:`, error)

          if (attempt === LocalStorageService.MAX_RETRY_ATTEMPTS) {
            // Final attempt failed - throw error
            console.error('❌ All save attempts failed')
            throw error
          }

          // Wait before retry (exponential backoff: 1s, 2s, 4s)
          const backoffMs = 1000 * Math.pow(2, attempt - 1)
          console.log(`Retrying in ${backoffMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
        }
      }
    }

    this.isSaving = false
  }

  /**
   * Internal async save logic
   * Uses Web Workers for serialization and compression
   * @private
   */
  private async saveGameInternal(state: GameState): Promise<void> {
    try {
      const saveKey = this.getSaveKey(state.gameId)
      // serializeGameState() now uses Web Workers for both JSON.stringify() and compression
      // This keeps the main thread free for game updates
      const serialized = await this.serializeGameState(state)

      const exists = localStorage.getItem(saveKey) !== null
      localStorage.setItem(saveKey, serialized)
      localStorage.setItem(this.CONTINUE_KEY, state.gameId)

      console.log(`Game ${exists ? 'overwritten' : 'saved'}: ${state.gameId}`)
    } catch (error) {
      // Check if quota exceeded (check both name and message for test compatibility)
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceededError'))
      ) {
        console.warn('Storage quota exceeded, attempting recovery...')

        // STRATEGY 1: Try to free space by deleting OTHER saves
        const cleaned = this.cleanupOldSaves(state.gameId)

        if (cleaned > 0) {
          console.log(`Deleted ${cleaned} old save(s) to free space`)
        } else {
          console.warn('No other saves found to delete')
        }

        // STRATEGY 2: Delete the OLD version of the CURRENT save
        // This is critical because setItem() tries to store BOTH old and new versions temporarily
        const saveKey = this.getSaveKey(state.gameId)
        const oldSaveExists = localStorage.getItem(saveKey) !== null

        if (oldSaveExists) {
          console.log('Deleting old version of current save to make room...')
          localStorage.removeItem(saveKey)
        }

        // STRATEGY 3: Retry save after cleanup
        try {
          const serialized = await this.serializeGameState(state)
          localStorage.setItem(saveKey, serialized)
          localStorage.setItem(this.CONTINUE_KEY, state.gameId)
          console.log(`✅ Game saved after cleanup: ${state.gameId}`)

          // Print diagnostics to help user understand storage usage
          this.printStorageDiagnostics()
          return
        } catch (retryError) {
          console.error('❌ Save STILL failed after cleanup:', retryError)

          // Print diagnostics to help debug
          console.error('Storage diagnostics:')
          this.printStorageDiagnostics()

          // Calculate what we tried to save (reuse already-serialized data)
          const serialized = await this.serializeGameState(state)
          const attemptedSize = new Blob([serialized]).size
          console.error(`Attempted save size: ${this.formatBytes(attemptedSize)}`)
          console.error(
            'This save is too large for localStorage (typical limit: 5-10MB per domain)'
          )
          console.error(
            'Solutions: 1) Clear localStorage, 2) Use IndexedDB, 3) Compress saves'
          )

          throw new Error('Save failed - individual save file too large for localStorage')
        }
      }

      console.error('Failed to save game:', error)
      throw new Error('Failed to save game')
    }
  }

  /**
   * Load game state from LocalStorage
   * Attempts to migrate old saves, deletes if migration fails
   * Now async to support Web Worker decompression
   */
  async loadGame(gameId?: string): Promise<GameState | null> {
    try {
      const targetId = gameId || this.getContinueGameId()
      if (!targetId) {
        return null
      }

      const saveKey = this.getSaveKey(targetId)
      const serialized = localStorage.getItem(saveKey)

      if (!serialized) {
        return null
      }

      // Check version compatibility before full deserialization
      // Need to decompress first if it's a compressed save (v3+)
      let json = serialized
      try {
        const decompressed = await this.compressionWorker.decompress(serialized)
        if (decompressed) {
          json = decompressed
        }
      } catch {
        // Not compressed - use as-is
        json = serialized
      }

      const parsed = JSON.parse(json)
      const saveVersion = parsed.version ?? 1 // Old saves have no version field (v1)

      if (saveVersion !== this.SAVE_VERSION) {
        console.warn(
          `Incompatible save version: found v${saveVersion}, expected v${this.SAVE_VERSION}. Deleting incompatible save...`
        )
        this.deleteSave(targetId)
        return null
      }

      // Attempt to deserialize and migrate
      const state = await this.deserializeGameState(serialized)

      // VALIDATE: Check if migration succeeded
      if (!this.isValidSaveState(state)) {
        console.warn(`Save migration failed for ${targetId}, deleting corrupted save...`)
        this.deleteSave(targetId)
        return null
      }

      console.log(`Save loaded successfully: ${targetId}`)
      return state
    } catch (error) {
      console.error('Failed to load game:', error)

      // Delete corrupted save that caused parse error
      const targetId = gameId || this.getContinueGameId()
      if (targetId) {
        console.warn(`Deleting corrupted save: ${targetId}`)
        this.deleteSave(targetId)
      }

      return null
    }
  }

  /**
   * Delete save file (for permadeath)
   */
  deleteSave(gameId: string): void {
    const saveKey = this.getSaveKey(gameId)
    localStorage.removeItem(saveKey)

    // Clear continue pointer if it matches this save
    const continueId = this.getContinueGameId()
    if (continueId === gameId) {
      localStorage.removeItem(this.CONTINUE_KEY)
    }

    console.log(`Save deleted: ${gameId}`)
  }

  /**
   * Validate that loaded/migrated save has all required fields
   * Returns false for corrupted saves that can't be recovered
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
    if (typeof state.player.position.x !== 'number' || typeof state.player.position.y !== 'number') {
      return false
    }

    return true
  }

  /**
   * Check if a save exists
   */
  hasSave(gameId?: string): boolean {
    const targetId = gameId || this.getContinueGameId()
    if (!targetId) {
      return false
    }

    const saveKey = this.getSaveKey(targetId)
    return localStorage.getItem(saveKey) !== null
  }

  /**
   * Get the game ID of the most recent save
   */
  getContinueGameId(): string | null {
    return localStorage.getItem(this.CONTINUE_KEY)
  }

  /**
   * List all save game IDs
   */
  listSaves(): string[] {
    const saves: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.SAVE_KEY_PREFIX)) {
        const gameId = key.substring(this.SAVE_KEY_PREFIX.length)
        saves.push(gameId)
      }
    }

    return saves
  }

  /**
   * Get storage usage diagnostics
   * Returns size in bytes and human-readable format
   */
  getStorageDiagnostics(): {
    totalSize: number
    totalSizeFormatted: string
    saves: Array<{ gameId: string; size: number; sizeFormatted: string }>
    otherKeys: Array<{ key: string; size: number; sizeFormatted: string }>
  } {
    let totalSize = 0
    const saves: Array<{ gameId: string; size: number; sizeFormatted: string }> = []
    const otherKeys: Array<{ key: string; size: number; sizeFormatted: string }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      const value = localStorage.getItem(key)
      if (!value) continue

      const size = new Blob([value]).size
      totalSize += size

      if (key.startsWith(this.SAVE_KEY_PREFIX)) {
        const gameId = key.substring(this.SAVE_KEY_PREFIX.length)
        saves.push({
          gameId,
          size,
          sizeFormatted: this.formatBytes(size),
        })
      } else {
        otherKeys.push({
          key,
          size,
          sizeFormatted: this.formatBytes(size),
        })
      }
    }

    // Sort by size (largest first)
    saves.sort((a, b) => b.size - a.size)
    otherKeys.sort((a, b) => b.size - a.size)

    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      saves,
      otherKeys,
    }
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * Print storage diagnostics to console
   * Useful for debugging storage issues
   */
  printStorageDiagnostics(): void {
    const diagnostics = this.getStorageDiagnostics()

    console.group('🔍 LocalStorage Diagnostics')
    console.log(`Total Usage: ${diagnostics.totalSizeFormatted} (${diagnostics.totalSize} bytes)`)

    if (diagnostics.saves.length > 0) {
      console.group(`📦 Save Files (${diagnostics.saves.length})`)
      diagnostics.saves.forEach((save) => {
        console.log(`  ${save.gameId}: ${save.sizeFormatted}`)
      })
      console.groupEnd()
    }

    if (diagnostics.otherKeys.length > 0) {
      console.group(`🗂️ Other Keys (${diagnostics.otherKeys.length})`)
      diagnostics.otherKeys.forEach((item) => {
        console.log(`  ${item.key}: ${item.sizeFormatted}`)
      })
      console.groupEnd()
    }

    console.groupEnd()
  }

  /**
   * Cleanup old saves to free storage space
   * Deletes all saves except the current game
   * Returns number of saves deleted
   */
  private cleanupOldSaves(currentGameId: string): number {
    const allSaves = this.listSaves()
    let deletedCount = 0

    for (const gameId of allSaves) {
      // Don't delete the current game
      if (gameId !== currentGameId) {
        this.deleteSave(gameId)
        deletedCount++
      }
    }

    return deletedCount
  }

  private getSaveKey(gameId: string): string {
    return `${this.SAVE_KEY_PREFIX}${gameId}`
  }

  /**
   * Serialize GameState to compressed string
   * Uses Web Workers for background serialization and compression
   * Version 4+ saves use dual workers (serialization + compression)
   *
   * CRITICAL: Passes RAW state to worker - worker does ALL processing off main thread
   */
  private async serializeGameState(state: GameState): Promise<string> {
    // Step 1: Send RAW state to worker (instant, just a reference)
    // Worker does prepareStateForSerialization() + JSON.stringify() OFF MAIN THREAD
    const json = await this.serializationWorker.serialize(state, this.SAVE_VERSION)

    // Step 2: Compress with Web Worker (async, non-blocking)
    const compressed = await this.compressionWorker.compress(json)
    return compressed
  }

  /**
   * Restore state from serialized data
   * Converts arrays back to Maps/Sets
   * Used both for snapshotting and for final deserialization
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
    // DEFENSIVE: Ensure values are arrays (old saves might have objects {})
    const visibleCells = new Set(Array.isArray(data.visibleCells) ? data.visibleCells : [])
    const identifiedItems = new Set(Array.isArray(data.identifiedItems) ? data.identifiedItems : [])
    const detectedMonsters = new Set(Array.isArray(data.detectedMonsters) ? data.detectedMonsters : [])
    const detectedMagicItems = new Set(Array.isArray(data.detectedMagicItems) ? data.detectedMagicItems : [])
    const levelsVisitedWithAmulet = new Set(Array.isArray(data.levelsVisitedWithAmulet) ? data.levelsVisitedWithAmulet : [])

    // Restore nested Maps in itemNameMap
    // Handle both old format (plain objects) and new format (arrays)
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

    // MIGRATION: Add defaults for missing player fields (from older save versions)
    const player = {
      ...data.player,
      energy: data.player.energy ?? 100, // Default: can act immediately
      statusEffects: data.player.statusEffects ?? [], // Default: no effects
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
      // MIGRATION: Add defaults for v2 26-level fields (for v1 saves)
      characterName: data.characterName ?? 'Unknown Hero',
      maxDepth: data.maxDepth ?? 10, // Old saves used 10 levels
      monstersKilled: data.monstersKilled ?? 0,
      itemsFound: data.itemsFound ?? 0,
      itemsUsed: data.itemsUsed ?? 0,
      levelsExplored: data.levelsExplored ?? 1,
      // MIGRATION: Add default config for saves without it (pre room-reveal PR)
      config: data.config ?? { fovMode: 'radius' },
    }
  }

  /**
   * Deserialize compressed string to GameState
   * Uses Web Worker for background decompression
   * Handles both compressed (v3+) and uncompressed (v1-v2) saves
   * Migrates old saves by adding defaults for missing fields
   */
  private async deserializeGameState(serialized: string): Promise<GameState> {
    // SECURITY: Validate input before decompression
    if (!serialized || typeof serialized !== 'string') {
      throw new Error('Invalid save data: empty or non-string')
    }

    // Check for reasonable size (compressed saves should be <10MB)
    const byteSize = new Blob([serialized]).size
    if (byteSize > 10 * 1024 * 1024) {
      throw new Error(`Save file too large: ${this.formatBytes(byteSize)} (max 10MB)`)
    }

    // Try to decompress (v3+ and v4+ compressed saves)
    let json = serialized
    try {
      const decompressed = await this.compressionWorker.decompress(serialized)
      // If decompress returns null or empty string, fall back to uncompressed
      if (decompressed) {
        json = decompressed
      }
    } catch (error) {
      console.warn('Decompression failed, trying uncompressed:', error)
      // Decompression failed - assume uncompressed (v1/v2 save)
      json = serialized
    }

    // SECURITY: Validate JSON structure before parsing
    let data
    try {
      data = JSON.parse(json)
    } catch (error) {
      throw new Error(`Failed to parse save data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save structure: not an object')
    }

    if (!data.player || !data.levels || !data.gameId) {
      throw new Error('Invalid save structure: missing required fields (player, levels, gameId)')
    }

    return this.restoreStateFromSerialization(data)
  }
}
