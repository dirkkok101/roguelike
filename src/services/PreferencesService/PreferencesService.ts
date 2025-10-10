// ============================================================================
// PREFERENCES SERVICE - Manage user preferences in localStorage
// ============================================================================

/**
 * User preferences interface
 */
export interface UserPreferences {
  renderMode: 'ascii' | 'sprites' // Rendering mode (default: 'sprites')
}

/**
 * PreferencesService
 *
 * Generic service for storing and retrieving user preferences from localStorage.
 * Provides type-safe storage with automatic JSON serialization/deserialization.
 *
 * Usage:
 *   const prefs = preferencesService.getPreferences()
 *   preferencesService.savePreferences({ renderMode: 'ascii' })
 */
export class PreferencesService {
  private static readonly PREFERENCES_KEY = 'user_preferences'
  /**
   * Load preferences from localStorage
   * Returns null if not found or if deserialization fails
   *
   * @param key - localStorage key
   * @returns Deserialized preferences or null
   */
  load<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) {
        return null
      }
      return JSON.parse(stored) as T
    } catch (error) {
      console.error(`Failed to load preferences for key "${key}":`, error)
      return null
    }
  }

  /**
   * Save preferences to localStorage
   * Automatically serializes to JSON
   *
   * @param key - localStorage key
   * @param value - Preferences object to save
   * @returns true if successful, false if failed
   */
  save<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
      return true
    } catch (error) {
      console.error(`Failed to save preferences for key "${key}":`, error)
      return false
    }
  }

  /**
   * Remove preferences from localStorage
   *
   * @param key - localStorage key
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove preferences for key "${key}":`, error)
    }
  }

  /**
   * Check if preferences exist for a given key
   *
   * @param key - localStorage key
   * @returns true if key exists, false otherwise
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null
  }

  /**
   * Get default user preferences
   *
   * @returns Default UserPreferences object
   */
  getDefaultPreferences(): UserPreferences {
    return {
      renderMode: 'sprites', // Default to sprite rendering
    }
  }

  /**
   * Get user preferences (with defaults if not found)
   *
   * @returns UserPreferences object
   */
  getPreferences(): UserPreferences {
    const stored = this.load<UserPreferences>(PreferencesService.PREFERENCES_KEY)

    if (!stored) {
      return this.getDefaultPreferences()
    }

    // Validate renderMode field
    if (stored.renderMode !== 'ascii' && stored.renderMode !== 'sprites') {
      console.warn(
        `Invalid renderMode "${stored.renderMode}", falling back to "sprites"`
      )
      return { ...stored, renderMode: 'sprites' }
    }

    return stored
  }

  /**
   * Save user preferences to localStorage
   *
   * @param preferences - UserPreferences object to save
   * @returns true if successful, false if failed
   */
  savePreferences(preferences: UserPreferences): boolean {
    return this.save(PreferencesService.PREFERENCES_KEY, preferences)
  }
}
