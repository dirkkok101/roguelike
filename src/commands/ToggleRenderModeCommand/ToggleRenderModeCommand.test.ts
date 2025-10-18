import { ToggleRenderModeCommand } from './ToggleRenderModeCommand'
import { PreferencesService } from '@services/PreferencesService'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { createMockGameState } from '../../test-helpers/mockGameState'

describe('ToggleRenderModeCommand', () => {
  let command: ToggleRenderModeCommand
  let preferencesService: PreferencesService
  let messageService: MessageService
  let recorder: CommandRecorderService
  let mockRandom: MockRandom

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    preferencesService = new PreferencesService()
    messageService = new MessageService()
    recorder = new CommandRecorderService()
    mockRandom = new MockRandom()
    command = new ToggleRenderModeCommand(preferencesService, messageService, recorder, mockRandom)
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('toggle from sprites to ASCII', () => {
    it('should change renderMode preference to ascii', () => {
      // Default is sprites
      const initialPrefs = preferencesService.getPreferences()
      expect(initialPrefs.renderMode).toBe('sprites')

      const state = createMockGameState()
      command.execute(state)

      const newPrefs = preferencesService.getPreferences()
      expect(newPrefs.renderMode).toBe('ascii')
    })

    it('should save preference to localStorage', () => {
      const state = createMockGameState()
      command.execute(state)

      // Reload preferences from localStorage
      const freshService = new PreferencesService()
      const loadedPrefs = freshService.getPreferences()

      expect(loadedPrefs.renderMode).toBe('ascii')
    })

    it('should add "Switched to ASCII rendering mode" message', () => {
      const state = createMockGameState()
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Switched to ASCII rendering mode')
      expect(result.messages[0].type).toBe('info')
    })
  })

  describe('toggle from ASCII to sprites', () => {
    it('should change renderMode preference to sprites', () => {
      // Set initial mode to ASCII
      preferencesService.savePreferences({
        renderMode: 'ascii',
      })

      const state = createMockGameState()
      command.execute(state)

      const newPrefs = preferencesService.getPreferences()
      expect(newPrefs.renderMode).toBe('sprites')
    })

    it('should add "Switched to Sprite rendering mode" message', () => {
      // Set initial mode to ASCII
      preferencesService.savePreferences({
        renderMode: 'ascii',
      })

      const state = createMockGameState()
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Switched to Sprite rendering mode')
      expect(result.messages[0].type).toBe('info')
    })
  })

  describe('state preservation', () => {
    it('should preserve all game state except messages', () => {
      const state = createMockGameState({
        turnCount: 42,
        currentLevel: 2,
      })

      const result = command.execute(state)

      expect(result.turnCount).toBe(42)
      expect(result.currentLevel).toBe(2)
      expect(result.player).toBe(state.player)
      expect(result.levels).toBe(state.levels)
      expect(result.visibleCells).toBe(state.visibleCells)
    })

    it('should not consume player turn (no turn count change)', () => {
      const state = createMockGameState({ turnCount: 100 })
      const result = command.execute(state)

      expect(result.turnCount).toBe(100)
    })
  })

  describe('multiple toggles', () => {
    it('should toggle back and forth correctly', () => {
      const state = createMockGameState()

      // Start with sprites (default)
      const prefs1 = preferencesService.getPreferences()
      expect(prefs1.renderMode).toBe('sprites')

      // Toggle to ASCII
      command.execute(state)
      const prefs2 = preferencesService.getPreferences()
      expect(prefs2.renderMode).toBe('ascii')

      // Toggle back to sprites
      command.execute(state)
      const prefs3 = preferencesService.getPreferences()
      expect(prefs3.renderMode).toBe('sprites')
    })
  })
})
