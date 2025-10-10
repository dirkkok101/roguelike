// ============================================================================
// PREFERENCES SERVICE TESTS
// ============================================================================

import { PreferencesService } from './PreferencesService'

describe('PreferencesService', () => {
  let service: PreferencesService
  let mockLocalStorage: { [key: string]: string }

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key]
        },
        clear: () => {
          mockLocalStorage = {}
        },
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    })

    service = new PreferencesService()
  })

  describe('getDefaultPreferences', () => {
    it('should return default preferences with sprites render mode', () => {
      const defaults = service.getDefaultPreferences()

      expect(defaults).toEqual({
        renderMode: 'sprites',
      })
    })
  })

  describe('getPreferences', () => {
    it('should return default preferences when none are stored', () => {
      const prefs = service.getPreferences()

      expect(prefs).toEqual({
        renderMode: 'sprites',
      })
    })

    it('should return stored preferences with sprites mode', () => {
      mockLocalStorage['user_preferences'] = JSON.stringify({
        renderMode: 'sprites',
      })

      const prefs = service.getPreferences()

      expect(prefs).toEqual({
        renderMode: 'sprites',
      })
    })

    it('should return stored preferences with ascii mode', () => {
      mockLocalStorage['user_preferences'] = JSON.stringify({
        renderMode: 'ascii',
      })

      const prefs = service.getPreferences()

      expect(prefs).toEqual({
        renderMode: 'ascii',
      })
    })

    it('should validate render mode and fallback to sprites for invalid values', () => {
      mockLocalStorage['user_preferences'] = JSON.stringify({
        renderMode: 'invalid',
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const prefs = service.getPreferences()

      expect(prefs.renderMode).toBe('sprites')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid renderMode "invalid"')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('savePreferences', () => {
    it('should save preferences with sprites mode', () => {
      const success = service.savePreferences({
        renderMode: 'sprites',
      })

      expect(success).toBe(true)
      expect(mockLocalStorage['user_preferences']).toBe(
        JSON.stringify({ renderMode: 'sprites' })
      )
    })

    it('should save preferences with ascii mode', () => {
      const success = service.savePreferences({
        renderMode: 'ascii',
      })

      expect(success).toBe(true)
      expect(mockLocalStorage['user_preferences']).toBe(
        JSON.stringify({ renderMode: 'ascii' })
      )
    })

    it('should return true on successful save', () => {
      const success = service.savePreferences({
        renderMode: 'sprites',
      })

      expect(success).toBe(true)
    })
  })

  describe('load and save preferences workflow', () => {
    it('should persist and retrieve preferences correctly', () => {
      // Save preferences
      service.savePreferences({ renderMode: 'ascii' })

      // Create new service instance (simulating page reload)
      const newService = new PreferencesService()
      const loaded = newService.getPreferences()

      expect(loaded).toEqual({
        renderMode: 'ascii',
      })
    })

    it('should toggle between ascii and sprites modes', () => {
      // Start with sprites
      service.savePreferences({ renderMode: 'sprites' })
      expect(service.getPreferences().renderMode).toBe('sprites')

      // Toggle to ascii
      service.savePreferences({ renderMode: 'ascii' })
      expect(service.getPreferences().renderMode).toBe('ascii')

      // Toggle back to sprites
      service.savePreferences({ renderMode: 'sprites' })
      expect(service.getPreferences().renderMode).toBe('sprites')
    })
  })

  describe('subscribe and event system', () => {
    it('should notify listener when preferences are saved', () => {
      const listener = jest.fn()
      service.subscribe(listener)

      service.savePreferences({ renderMode: 'ascii' })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({ renderMode: 'ascii' })
    })

    it('should notify multiple listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      service.subscribe(listener1)
      service.subscribe(listener2)

      service.savePreferences({ renderMode: 'sprites' })

      expect(listener1).toHaveBeenCalledWith({ renderMode: 'sprites' })
      expect(listener2).toHaveBeenCalledWith({ renderMode: 'sprites' })
    })

    it('should return unsubscribe function', () => {
      const listener = jest.fn()
      const unsubscribe = service.subscribe(listener)

      service.savePreferences({ renderMode: 'ascii' })
      expect(listener).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      // Save again - listener should not be called
      service.savePreferences({ renderMode: 'sprites' })
      expect(listener).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should not notify listeners if save fails', () => {
      const listener = jest.fn()
      service.subscribe(listener)

      // Mock localStorage.setItem to throw error
      const originalSetItem = global.localStorage.setItem
      global.localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      service.savePreferences({ renderMode: 'ascii' })

      expect(listener).not.toHaveBeenCalled()

      // Restore original setItem
      global.localStorage.setItem = originalSetItem
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = jest.fn()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      service.subscribe(errorListener)
      service.subscribe(goodListener)

      // Should not throw even though one listener errors
      expect(() => {
        service.savePreferences({ renderMode: 'ascii' })
      }).not.toThrow()

      // Both listeners should be called
      expect(errorListener).toHaveBeenCalled()
      expect(goodListener).toHaveBeenCalledWith({ renderMode: 'ascii' })

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in preference change listener:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
