import { GameState } from '@game/core/core'

// ============================================================================
// LOCAL STORAGE SERVICE - Game save/load persistence
// ============================================================================

export class LocalStorageService {
  private readonly SAVE_KEY_PREFIX = 'roguelike_save_'
  private readonly CONTINUE_KEY = 'roguelike_continue'

  /**
   * Save game state to LocalStorage
   */
  saveGame(state: GameState): void {
    try {
      const saveKey = this.getSaveKey(state.gameId)
      const serialized = this.serializeGameState(state)

      localStorage.setItem(saveKey, serialized)
      localStorage.setItem(this.CONTINUE_KEY, state.gameId)

      console.log(`Game saved: ${state.gameId}`)
    } catch (error) {
      console.error('Failed to save game:', error)
      throw new Error('Save failed - storage quota exceeded?')
    }
  }

  /**
   * Load game state from LocalStorage
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

      return this.deserializeGameState(serialized)
    } catch (error) {
      console.error('Failed to load game:', error)
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
              visibleCells: new Set(m.visibleCells),
            })),
          },
        ]
      })
    )

    // Restore Sets
    const visibleCells = new Set(data.visibleCells)
    const identifiedItems = new Set(data.identifiedItems)

    return {
      ...data,
      levels,
      visibleCells,
      identifiedItems,
    }
  }
}
