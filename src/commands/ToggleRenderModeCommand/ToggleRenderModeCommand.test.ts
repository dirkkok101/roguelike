import { ToggleRenderModeCommand } from './ToggleRenderModeCommand'
import { PreferencesService } from '@services/PreferencesService'
import { MessageService } from '@services/MessageService'
import { GameState, Player, Level, TileType } from '@game/core/core'

describe('ToggleRenderModeCommand', () => {
  let command: ToggleRenderModeCommand
  let preferencesService: PreferencesService
  let messageService: MessageService

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    preferencesService = new PreferencesService()
    messageService = new MessageService()
    command = new ToggleRenderModeCommand(preferencesService, messageService)
  })

  afterEach(() => {
    localStorage.clear()
  })

  function createTestPlayer(): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null,
      },
      inventory: [],
      statusEffects: [],
      id: 'player',
    }
  }

  function createTestLevel(depth: number): Level {
    return {
      depth,
      width: 20,
      height: 20,
      tiles: Array(20)
        .fill(null)
        .map(() =>
          Array(20).fill({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            explored: false,
          })
        ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
    }
  }

  function createTestState(overrides: Partial<GameState> = {}): GameState {
    return {
      player: createTestPlayer(),
      currentLevel: 1,
      levels: new Map([[1, createTestLevel(1)]]),
      visibleCells: new Set(),
      exploredCells: new Set(),
      detectedMagicItems: new Set(),
      detectedMonsters: new Set(),
      messages: [],
      turnCount: 0,
      gameId: 'test-game-toggle',
      isGameOver: false,
      hasWon: false,
      ...overrides,
    }
  }

  describe('toggle from sprites to ASCII', () => {
    it('should change renderMode preference to ascii', () => {
      // Default is sprites
      const initialPrefs = preferencesService.getPreferences()
      expect(initialPrefs.renderMode).toBe('sprites')

      const state = createTestState()
      command.execute(state)

      const newPrefs = preferencesService.getPreferences()
      expect(newPrefs.renderMode).toBe('ascii')
    })

    it('should save preference to localStorage', () => {
      const state = createTestState()
      command.execute(state)

      // Reload preferences from localStorage
      const freshService = new PreferencesService()
      const loadedPrefs = freshService.getPreferences()

      expect(loadedPrefs.renderMode).toBe('ascii')
    })

    it('should add "Switched to ASCII rendering mode" message', () => {
      const state = createTestState()
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

      const state = createTestState()
      command.execute(state)

      const newPrefs = preferencesService.getPreferences()
      expect(newPrefs.renderMode).toBe('sprites')
    })

    it('should add "Switched to Sprite rendering mode" message', () => {
      // Set initial mode to ASCII
      preferencesService.savePreferences({
        renderMode: 'ascii',
      })

      const state = createTestState()
      const result = command.execute(state)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].text).toBe('Switched to Sprite rendering mode')
      expect(result.messages[0].type).toBe('info')
    })
  })

  describe('state preservation', () => {
    it('should preserve all game state except messages', () => {
      const state = createTestState({
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
      const state = createTestState({ turnCount: 100 })
      const result = command.execute(state)

      expect(result.turnCount).toBe(100)
    })
  })

  describe('multiple toggles', () => {
    it('should toggle back and forth correctly', () => {
      const state = createTestState()

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
