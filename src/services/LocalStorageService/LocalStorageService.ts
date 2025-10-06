import { GameState } from '@game/core/core'

// ============================================================================
// LOCAL STORAGE SERVICE - Game save/load persistence
// ============================================================================

export class LocalStorageService {
  private readonly SAVE_KEY_PREFIX = 'roguelike_save_'
  private readonly CONTINUE_KEY = 'roguelike_continue'

  /**
   * Save game state to LocalStorage
   * Auto-cleanup old saves if quota exceeded
   */
  saveGame(state: GameState): void {
    try {
      const saveKey = this.getSaveKey(state.gameId)
      const serialized = this.serializeGameState(state)

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
        console.warn('Storage quota exceeded, cleaning up old saves...')

        // Try to free space by deleting old saves (keep current game)
        const cleaned = this.cleanupOldSaves(state.gameId)

        if (cleaned > 0) {
          console.log(`Deleted ${cleaned} old save(s) to free space`)

          // Retry save after cleanup
          try {
            const saveKey = this.getSaveKey(state.gameId)
            const serialized = this.serializeGameState(state)
            localStorage.setItem(saveKey, serialized)
            localStorage.setItem(this.CONTINUE_KEY, state.gameId)
            console.log(`Game saved after cleanup: ${state.gameId}`)
            return
          } catch (retryError) {
            console.error('Save failed even after cleanup:', retryError)
            throw new Error('Save failed - storage quota exceeded even after cleanup')
          }
        } else {
          console.error('No old saves to clean up')
          throw new Error('Save failed - storage quota exceeded?')
        }
      }

      console.error('Failed to save game:', error)
      throw new Error('Save failed - storage quota exceeded?')
    }
  }

  /**
   * Load game state from LocalStorage
   * Attempts to migrate old saves, deletes if migration fails
   */
  loadGame(gameId?: string): GameState | null {
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

      // Attempt to deserialize and migrate
      const state = this.deserializeGameState(serialized)

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
   * Serialize GameState to JSON string
   * Handle special types: Map, Set
   */
  private serializeGameState(state: GameState): string {
    const serializable = {
      ...state,
      levels: Array.from(state.levels.entries()), // Map → Array
      visibleCells: Array.from(state.visibleCells), // Set → Array
      identifiedItems: Array.from(state.identifiedItems), // Set → Array
      detectedMonsters: Array.from(state.detectedMonsters || []), // Set → Array
      detectedMagicItems: Array.from(state.detectedMagicItems || []), // Set → Array
      // Note: Monster visibleCells and currentPath also need conversion
      // This is done per-level
    }

    // Deep clone levels to convert monster Sets
    serializable.levels = serializable.levels.map(([depth, level]) => {
      return [
        depth,
        {
          ...level,
          monsters: level.monsters.map((m) => ({
            ...m,
            visibleCells: Array.from(m.visibleCells),
            currentPath: m.currentPath,
          })),
        },
      ]
    })

    return JSON.stringify(serializable)
  }

  /**
   * Deserialize JSON string to GameState
   * Restore Map and Set types
   * Migrate old saves by adding defaults for missing fields
   */
  private deserializeGameState(json: string): GameState {
    const data = JSON.parse(json)

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
    const visibleCells = new Set(data.visibleCells || [])
    const identifiedItems = new Set(data.identifiedItems || [])
    const detectedMonsters = new Set(data.detectedMonsters || [])
    const detectedMagicItems = new Set(data.detectedMagicItems || [])

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
    }
  }
}
