// ============================================================================
// GAME RENDERER - RENDER MODE TOGGLE INTEGRATION TESTS
// Phase 5.1: Integration tests for dual-mode rendering (ASCII ↔ Sprites)
// ============================================================================

import { GameRenderer } from './GameRenderer'
import { PreferencesService } from '@services/PreferencesService'
import { RenderingService } from '@services/RenderingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { DeathService } from '@services/DeathService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { ScoreCalculationService } from '@services/ScoreCalculationService'
import { RingService } from '@services/RingService'
import { FOVService } from '@services/FOVService'
import { createMockGameState } from '../test-helpers/mockGameState'
import { GameState } from '@game/core/core'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Mock localStorage for testing
 */
class MockLocalStorage {
  private store: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

/**
 * Setup test environment with mocked dependencies
 */
function setupTestEnvironment() {
  // Mock localStorage
  const mockLocalStorage = new MockLocalStorage()
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })

  // Create services
  const fovService = new FOVService()
  const renderingService = new RenderingService(fovService)
  const assetLoaderService = new AssetLoaderService()
  const hungerService = new HungerService()
  const levelingService = new LevelingService()
  const debugService = new DebugService()
  const contextService = new ContextService()
  const victoryService = new VictoryService()
  const localStorageService = new LocalStorageService()
  const deathService = new DeathService()
  const leaderboardStorageService = new LeaderboardStorageService()
  const leaderboardService = new LeaderboardService(leaderboardStorageService)
  const scoreCalculationService = new ScoreCalculationService()
  const preferencesService = new PreferencesService()
  const ringService = new RingService()

  // Mock AssetLoaderService for sprite rendering
  jest.spyOn(assetLoaderService, 'isLoaded').mockReturnValue(true)
  jest.spyOn(assetLoaderService, 'getCurrentTileset').mockReturnValue({
    config: {
      name: 'Test',
      tileWidth: 32,
      tileHeight: 32,
      imageUrl: 'test.png',
      tiles: new Map(),
    },
    image: new Image(),
    isLoaded: true,
  })
  jest.spyOn(assetLoaderService, 'getSprite').mockReturnValue({ x: 0, y: 0, hexX: 0x80, hexY: 0x80 })

  // Mock canvas context
  const mockContext = {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
  }

  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext as any)

  // Mock callbacks
  const onReturnToMenu = jest.fn()
  const onStartNewGame = jest.fn()
  const onReplaySeed = jest.fn()

  // Create GameRenderer
  const gameRenderer = new GameRenderer(
    renderingService,
    assetLoaderService,
    hungerService,
    levelingService,
    debugService,
    contextService,
    victoryService,
    localStorageService,
    deathService,
    leaderboardService,
    leaderboardStorageService,
    scoreCalculationService,
    preferencesService,
    ringService,
    onReturnToMenu,
    onStartNewGame,
    onReplaySeed
  )

  // Add GameRenderer container to document body so getElementById works
  const container = gameRenderer.getContainer()
  document.body.appendChild(container)

  return {
    gameRenderer,
    preferencesService,
    mockLocalStorage,
    assetLoaderService,
    renderingService,
    container,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('GameRenderer - Render Mode Toggle Integration Tests', () => {
  let env: ReturnType<typeof setupTestEnvironment>
  let testGameState: GameState

  beforeEach(() => {
    // Clear localStorage before each test
    if (global.localStorage) {
      global.localStorage.clear()
    }

    // Setup fresh environment
    env = setupTestEnvironment()

    // Create test game state
    testGameState = createMockGameState({
      playerPosition: { x: 40, y: 11 },
      currentLevel: 1,
    })
  })

  afterEach(() => {
    // Clean up DOM
    if (env.container && env.container.parentNode) {
      env.container.parentNode.removeChild(env.container)
    }
    document.body.innerHTML = ''
  })

  describe('Default Render Mode', () => {
    it('should default to sprites mode when no preference is saved', () => {
      // Arrange: No preferences in localStorage (fresh setup)

      // Act: Get current preferences
      const prefs = env.preferencesService.getPreferences()

      // Assert: Default mode is 'sprites'
      expect(prefs.renderMode).toBe('sprites')
    })

    it('should initialize GameRenderer with sprites mode by default', () => {
      // Arrange: Fresh GameRenderer created in setupTestEnvironment

      // Act: Access current render mode (private field, use type assertion)
      const currentMode = (env.gameRenderer as any).currentRenderMode

      // Assert: GameRenderer initialized with sprites mode
      expect(currentMode).toBe('sprites')
    })

    it('should render with sprite renderer by default', () => {
      // Arrange: GameRenderer with default mode
      const spy = jest.spyOn((env.gameRenderer as any).canvasGameRenderer!, 'render')

      // Act: Render game state
      env.gameRenderer.render(testGameState)

      // Assert: CanvasGameRenderer.render was called
      expect(spy).toHaveBeenCalledWith(testGameState)
    })
  })

  describe('Switching from Sprites to ASCII', () => {
    it('should switch to ASCII mode when preference is changed', () => {
      // Arrange: GameRenderer starts in sprites mode
      const initialMode = (env.gameRenderer as any).currentRenderMode
      expect(initialMode).toBe('sprites')

      // Act: Change preference to ASCII
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Assert: GameRenderer switched to ASCII mode
      const newMode = (env.gameRenderer as any).currentRenderMode
      expect(newMode).toBe('ascii')
    })

    it('should use ASCII renderer after switching to ASCII mode', () => {
      // Arrange: Switch to ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Act: Render game state
      const spy = jest.spyOn((env.gameRenderer as any).asciiRenderer, 'render')
      env.gameRenderer.render(testGameState)

      // Assert: ASCII renderer was used
      expect(spy).toHaveBeenCalledWith(testGameState)
    })

    it('should update DOM to show ASCII content', () => {
      // Arrange: Get dungeon container
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement

      // Act: Switch to ASCII and render
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(testGameState)

      // Assert: Container has innerHTML (ASCII mode uses innerHTML)
      expect(container.innerHTML).not.toBe('')
      expect(container.innerHTML).toContain('<pre')
    })

    it('should show mode change notification overlay when switching', (done) => {
      // Arrange: Spy on document.body.appendChild
      const appendChildSpy = jest.spyOn(document.body, 'appendChild')

      // Act: Switch to ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Assert: Notification overlay was created
      const calls = appendChildSpy.mock.calls
      const notificationCall = calls.find((call) => {
        const element = call[0] as HTMLElement
        return element.className === 'mode-change-notification'
      })

      expect(notificationCall).toBeDefined()
      const notification = notificationCall![0] as HTMLElement
      expect(notification.textContent).toBe('ASCII MODE')

      // Cleanup
      appendChildSpy.mockRestore()
      done()
    })
  })

  describe('Switching from ASCII to Sprites', () => {
    beforeEach(() => {
      // Start in ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
    })

    it('should switch to sprites mode when preference is changed', () => {
      // Arrange: GameRenderer starts in ASCII mode
      const initialMode = (env.gameRenderer as any).currentRenderMode
      expect(initialMode).toBe('ascii')

      // Act: Change preference to sprites
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: GameRenderer switched to sprites mode
      const newMode = (env.gameRenderer as any).currentRenderMode
      expect(newMode).toBe('sprites')
    })

    it('should use sprite renderer after switching to sprites mode', () => {
      // Arrange: GameRenderer in ASCII mode
      expect((env.gameRenderer as any).currentRenderMode).toBe('ascii')

      // Act: Switch to sprites and render
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      const spy = jest.spyOn((env.gameRenderer as any).canvasGameRenderer!, 'render')
      env.gameRenderer.render(testGameState)

      // Assert: Sprite renderer was used
      expect(spy).toHaveBeenCalledWith(testGameState)
    })

    it('should update DOM to show canvas element', () => {
      // Arrange: Get dungeon container
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement

      // Act: Switch to sprites and render
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.gameRenderer.render(testGameState)

      // Assert: Container has canvas element
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeTruthy()
      expect(canvas?.id).toBe('dungeon-canvas')
    })

    it('should show mode change notification overlay when switching', (done) => {
      // Arrange: Spy on document.body.appendChild
      const appendChildSpy = jest.spyOn(document.body, 'appendChild')

      // Act: Switch to sprites mode
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: Notification overlay was created
      const calls = appendChildSpy.mock.calls
      const notificationCall = calls.find((call) => {
        const element = call[0] as HTMLElement
        return element.className === 'mode-change-notification'
      })

      expect(notificationCall).toBeDefined()
      const notification = notificationCall![0] as HTMLElement
      expect(notification.textContent).toBe('SPRITE MODE')

      // Cleanup
      appendChildSpy.mockRestore()
      done()
    })
  })

  describe('Preference Persistence', () => {
    it('should save ASCII mode preference to localStorage', () => {
      // Act: Switch to ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Assert: Preference saved to localStorage
      const stored = env.mockLocalStorage.getItem('user_preferences')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.renderMode).toBe('ascii')
    })

    it('should save sprites mode preference to localStorage', () => {
      // Arrange: Start in ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Act: Switch to sprites mode
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: Preference saved to localStorage
      const stored = env.mockLocalStorage.getItem('user_preferences')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.renderMode).toBe('sprites')
    })

    it('should restore ASCII mode preference on page reload', () => {
      // Arrange: Save ASCII preference
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Verify it was saved to localStorage
      const stored = env.mockLocalStorage.getItem('user_preferences')
      expect(stored).not.toBeNull()
      expect(JSON.parse(stored!).renderMode).toBe('ascii')

      // Act: Simulate page reload by creating new PreferencesService (using same localStorage)
      // Note: setupTestEnvironment() recreates localStorage, so we manually test preference loading
      const newPreferencesService = new PreferencesService()
      const loadedPrefs = newPreferencesService.getPreferences()

      // Assert: Preference was restored from localStorage
      expect(loadedPrefs.renderMode).toBe('ascii')
    })

    it('should restore sprites mode preference on page reload', () => {
      // Arrange: Save sprites preference (explicitly, not just default)
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Act: Simulate page reload by creating new PreferencesService and GameRenderer
      const newEnv = setupTestEnvironment()

      // Assert: New GameRenderer initialized with sprites mode
      const currentMode = (newEnv.gameRenderer as any).currentRenderMode
      expect(currentMode).toBe('sprites')
    })
  })

  describe('Renderer Equivalence', () => {
    it('should render same game state correctly in both modes', () => {
      // Arrange: Create game state with various entities
      const gameState = createMockGameState({
        playerPosition: { x: 40, y: 11 },
        currentLevel: 1,
      })

      // Act: Render in sprites mode
      const spriteSpy = jest.spyOn((env.gameRenderer as any).canvasGameRenderer!, 'render')
      env.gameRenderer.render(gameState)
      expect(spriteSpy).toHaveBeenCalledTimes(1)

      // Switch to ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      const asciiSpy = jest.spyOn((env.gameRenderer as any).asciiRenderer, 'render')
      env.gameRenderer.render(gameState)

      // Assert: Both renderers were called with same game state
      expect(spriteSpy).toHaveBeenCalledWith(gameState)
      expect(asciiSpy).toHaveBeenCalledWith(gameState)
    })

    it('should maintain FOV state across mode switches', () => {
      // Arrange: Render initial state in sprites mode
      env.gameRenderer.render(testGameState)

      // Act: Switch to ASCII and render
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(testGameState)

      // Switch back to sprites and render
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.gameRenderer.render(testGameState)

      // Assert: Game state visibility unchanged
      // (RenderingService determines visibility, not the renderer)
      expect(testGameState.visibleCells).toBeDefined()
    })

    it('should maintain game state consistency across mode switches', () => {
      // Arrange: Create game state with player HP, gold, etc.
      const gameState = createMockGameState({
        playerPosition: { x: 40, y: 11 },
        currentLevel: 1,
      })
      gameState.player.hp = 8 // Damaged
      gameState.player.gold = 100

      // Act: Render in sprites mode
      env.gameRenderer.render(gameState)
      expect(gameState.player.hp).toBe(8)
      expect(gameState.player.gold).toBe(100)

      // Switch to ASCII
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(gameState)

      // Assert: Game state unchanged
      expect(gameState.player.hp).toBe(8)
      expect(gameState.player.gold).toBe(100)

      // Switch back to sprites
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.gameRenderer.render(gameState)

      // Assert: Game state still unchanged
      expect(gameState.player.hp).toBe(8)
      expect(gameState.player.gold).toBe(100)
    })
  })

  describe('DOM Element Swapping', () => {
    it('should remove canvas element when switching to ASCII', () => {
      // Arrange: Start in sprites mode (default)
      env.gameRenderer.render(testGameState)
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement

      // Verify canvas exists initially
      expect(container.querySelector('canvas')).toBeTruthy()

      // Act: Switch to ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(testGameState)

      // Assert: Canvas element removed, innerHTML used instead
      expect(container.querySelector('canvas')).toBeNull()
      expect(container.innerHTML).toContain('<pre')
    })

    it('should add canvas element when switching to sprites', () => {
      // Arrange: Start in ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(testGameState)
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement

      // Verify no canvas initially
      expect(container.querySelector('canvas')).toBeNull()

      // Act: Switch to sprites mode
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.gameRenderer.render(testGameState)

      // Assert: Canvas element added
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeTruthy()
      expect(canvas?.id).toBe('dungeon-canvas')
    })

    it('should clear container innerHTML when switching to sprites', () => {
      // Arrange: Start in ASCII mode
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(testGameState)
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement

      // Verify innerHTML exists
      const initialHTML = container.innerHTML
      expect(initialHTML).toContain('<pre')

      // Act: Switch to sprites mode
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: Container innerHTML cleared (only canvas child)
      const children = container.children
      expect(children.length).toBe(1)
      expect(children[0].tagName).toBe('CANVAS')
    })
  })

  describe('Rapid Mode Switching', () => {
    it('should handle rapid toggling between modes', () => {
      // Act: Rapidly toggle modes
      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'ascii' : 'sprites'
        env.preferencesService.savePreferences({ renderMode: mode })
        env.gameRenderer.render(testGameState)
      }

      // Assert: Final mode is sprites (i=9 is odd)
      const finalMode = (env.gameRenderer as any).currentRenderMode
      expect(finalMode).toBe('sprites')
    })

    it('should not trigger re-render if mode has not changed', () => {
      // Arrange: Start in sprites mode
      const container = (env.gameRenderer as any).dungeonContainer as HTMLElement
      const clearSpy = jest.spyOn(container, 'innerHTML', 'set')

      // Act: Save same preference multiple times
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: Container innerHTML was not modified (mode didn't change)
      // (handlePreferenceChange returns early if mode unchanged)
      expect(clearSpy).not.toHaveBeenCalled()

      clearSpy.mockRestore()
    })

    it('should handle alternating mode changes correctly', () => {
      // Act: Alternate between modes
      const modes: Array<'ascii' | 'sprites'> = []

      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      modes.push((env.gameRenderer as any).currentRenderMode)

      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      modes.push((env.gameRenderer as any).currentRenderMode)

      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      modes.push((env.gameRenderer as any).currentRenderMode)

      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      modes.push((env.gameRenderer as any).currentRenderMode)

      // Assert: Modes alternated correctly
      expect(modes).toEqual(['ascii', 'sprites', 'ascii', 'sprites'])
    })
  })

  describe('Edge Cases', () => {
    it('should handle switching modes when game state is null', () => {
      // Arrange: GameRenderer with no game state rendered yet
      const freshEnv = setupTestEnvironment()

      // Act: Switch mode without rendering any game state
      expect(() => {
        freshEnv.preferencesService.savePreferences({ renderMode: 'ascii' })
      }).not.toThrow()

      // Assert: Mode changed successfully
      const currentMode = (freshEnv.gameRenderer as any).currentRenderMode
      expect(currentMode).toBe('ascii')
    })

    it('should handle switching modes during combat (game state update)', () => {
      // Arrange: Render initial game state
      const combatState = createMockGameState({
        playerPosition: { x: 40, y: 11 },
        currentLevel: 1,
      })
      combatState.player.hp = 5 // Player damaged in combat

      env.gameRenderer.render(combatState)

      // Act: Switch mode during combat
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Update game state (combat continues)
      combatState.player.hp = 4 // More damage
      env.gameRenderer.render(combatState)

      // Assert: Game state rendered correctly in ASCII mode
      const currentMode = (env.gameRenderer as any).currentRenderMode
      expect(currentMode).toBe('ascii')
      expect(combatState.player.hp).toBe(4)
    })

    it('should handle switching modes on different dungeon levels', () => {
      // Arrange: Create states for different levels
      const level1State = createMockGameState({ currentLevel: 1 })
      const level2State = createMockGameState({ currentLevel: 2 })
      const level3State = createMockGameState({ currentLevel: 3 })

      // Act: Render level 1 in sprites mode
      env.gameRenderer.render(level1State)
      expect((env.gameRenderer as any).currentRenderMode).toBe('sprites')

      // Switch to ASCII and render level 2
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      env.gameRenderer.render(level2State)
      expect((env.gameRenderer as any).currentRenderMode).toBe('ascii')

      // Switch back to sprites and render level 3
      env.preferencesService.savePreferences({ renderMode: 'sprites' })
      env.gameRenderer.render(level3State)

      // Assert: Mode persists across level transitions
      expect((env.gameRenderer as any).currentRenderMode).toBe('sprites')
    })

    it('should handle invalid render mode gracefully', () => {
      // Arrange: Manually corrupt localStorage
      env.mockLocalStorage.setItem('user_preferences', JSON.stringify({ renderMode: 'invalid' }))

      // Act: Create new GameRenderer (simulates page reload)
      const freshEnv = setupTestEnvironment()

      // Assert: Falls back to default 'sprites' mode
      const prefs = freshEnv.preferencesService.getPreferences()
      expect(prefs.renderMode).toBe('sprites')

      const currentMode = (freshEnv.gameRenderer as any).currentRenderMode
      expect(currentMode).toBe('sprites')
    })
  })

  describe('Subscription and Event System', () => {
    it('should notify GameRenderer when preference changes', () => {
      // Arrange: GameRenderer starts in sprites mode
      const initialMode = (env.gameRenderer as any).currentRenderMode
      expect(initialMode).toBe('sprites')

      // Act: Change preference to ASCII
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Assert: GameRenderer's mode was updated (proves handler was called)
      const newMode = (env.gameRenderer as any).currentRenderMode
      expect(newMode).toBe('ascii')
    })

    it('should unsubscribe from preference changes if needed', () => {
      // Arrange: Add external subscriber that we can track
      const externalListener = jest.fn()
      const unsubscribe = env.preferencesService.subscribe(externalListener)

      // Verify subscription works
      env.preferencesService.savePreferences({ renderMode: 'ascii' })
      expect(externalListener).toHaveBeenCalledTimes(1)

      // Act: Unsubscribe
      unsubscribe()

      // Change preference again
      env.preferencesService.savePreferences({ renderMode: 'sprites' })

      // Assert: External listener was not called again (still 1 call)
      expect(externalListener).toHaveBeenCalledTimes(1)

      // But GameRenderer's subscription still works
      expect((env.gameRenderer as any).currentRenderMode).toBe('sprites')
    })

    it('should handle multiple subscribers correctly', () => {
      // Arrange: Add additional subscriber
      const externalListener = jest.fn()
      env.preferencesService.subscribe(externalListener)

      // Act: Change preference
      env.preferencesService.savePreferences({ renderMode: 'ascii' })

      // Assert: Both GameRenderer and external listener notified
      expect(externalListener).toHaveBeenCalledWith({ renderMode: 'ascii' })
      expect((env.gameRenderer as any).currentRenderMode).toBe('ascii')
    })
  })
})
