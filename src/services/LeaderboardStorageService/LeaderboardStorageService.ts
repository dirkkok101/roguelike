import { LeaderboardEntry } from '@game/core/core'

// ============================================================================
// LEADERBOARD STORAGE SERVICE - LocalStorage persistence for leaderboard
// ============================================================================

/**
 * LeaderboardStorageService
 *
 * Handles persistence of leaderboard entries to browser LocalStorage.
 * Manages storage quota, auto-cleanup, and import/export functionality.
 *
 * Storage Strategy:
 * - Store all entries in a single JSON array
 * - Sort by score descending before storing
 * - Auto-cleanup when approaching quota limits
 * - Keep all victories, prune oldest low-score deaths
 */
export class LeaderboardStorageService {
  private readonly STORAGE_KEY = 'roguelike_leaderboard'
  private readonly MAX_ENTRIES = 500 // Soft limit
  private readonly CLEANUP_THRESHOLD = 400 // Trigger cleanup at this count

  /**
   * Add new entry to leaderboard
   * Automatically sorts and stores
   * Triggers auto-cleanup if approaching limits
   */
  addEntry(entry: LeaderboardEntry): void {
    const entries = this.getAllEntries()
    entries.push(entry)

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score)

    // Auto-cleanup if needed
    const entriesToStore =
      entries.length > this.CLEANUP_THRESHOLD ? this.autoCleanup(entries) : entries

    this.saveEntries(entriesToStore)
  }

  /**
   * Get all leaderboard entries
   * Returns sorted by score (descending)
   */
  getAllEntries(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) {
        return []
      }

      const entries = JSON.parse(data) as LeaderboardEntry[]
      return entries.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      return []
    }
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): LeaderboardEntry | null {
    const entries = this.getAllEntries()
    return entries.find((e) => e.id === id) || null
  }

  /**
   * Delete entry by ID
   */
  deleteEntry(id: string): void {
    const entries = this.getAllEntries()
    const filtered = entries.filter((e) => e.id !== id)
    this.saveEntries(filtered)
  }

  /**
   * Clear all entries
   */
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Get total entry count
   */
  getCount(): number {
    return this.getAllEntries().length
  }

  /**
   * Export leaderboard as JSON string
   */
  exportToJSON(): string {
    const entries = this.getAllEntries()
    return JSON.stringify(entries, null, 2)
  }

  /**
   * Import leaderboard from JSON string
   * Merges with existing entries, skipping duplicates
   * Returns count of imported and skipped entries
   */
  importFromJSON(json: string): { imported: number; skipped: number } {
    try {
      const importedEntries = JSON.parse(json) as LeaderboardEntry[]

      // Validate that it's an array
      if (!Array.isArray(importedEntries)) {
        throw new Error('Invalid format: expected array of entries')
      }

      const existingEntries = this.getAllEntries()
      const existingIds = new Set(existingEntries.map((e) => e.id))

      let imported = 0
      let skipped = 0

      // Add non-duplicate entries
      for (const entry of importedEntries) {
        if (existingIds.has(entry.id)) {
          skipped++
        } else {
          existingEntries.push(entry)
          imported++
        }
      }

      // Sort and save
      existingEntries.sort((a, b) => b.score - a.score)
      this.saveEntries(existingEntries)

      return { imported, skipped }
    } catch (error) {
      console.error('Failed to import leaderboard:', error)
      throw new Error('Import failed - invalid JSON or format')
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Save entries to LocalStorage
   * Handles quota exceeded errors
   */
  private saveEntries(entries: LeaderboardEntry[]): void {
    try {
      const json = JSON.stringify(entries)
      localStorage.setItem(this.STORAGE_KEY, json)
    } catch (error) {
      // Check if quota exceeded
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.message.includes('QuotaExceededError'))
      ) {
        console.warn('Storage quota exceeded, performing aggressive cleanup...')

        // More aggressive cleanup
        const cleaned = this.autoCleanup(entries, true)
        try {
          const json = JSON.stringify(cleaned)
          localStorage.setItem(this.STORAGE_KEY, json)
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError)
          throw new Error('Storage quota exceeded - could not save leaderboard')
        }
      } else {
        throw error
      }
    }
  }

  /**
   * Auto-cleanup strategy to manage storage quota
   * Keeps all victories, prunes oldest low-score deaths
   *
   * @param entries - Entries to clean up
   * @param aggressive - If true, keeps only top 50 deaths instead of 100
   * @returns Cleaned entries array
   */
  private autoCleanup(entries: LeaderboardEntry[], aggressive = false): LeaderboardEntry[] {
    const victories = entries.filter((e) => e.isVictory)
    const deaths = entries.filter((e) => !e.isVictory)

    // Sort deaths by score descending
    deaths.sort((a, b) => b.score - a.score)

    // Keep top N deaths
    const deathLimit = aggressive ? 50 : 100
    const keptDeaths = deaths.slice(0, deathLimit)

    // Combine victories and kept deaths
    const cleaned = [...victories, ...keptDeaths]

    // Sort by score descending
    cleaned.sort((a, b) => b.score - a.score)

    console.log(
      `Cleaned up leaderboard: kept ${victories.length} victories and ${keptDeaths.length} deaths (${entries.length - cleaned.length} entries removed)`
    )

    return cleaned
  }
}
