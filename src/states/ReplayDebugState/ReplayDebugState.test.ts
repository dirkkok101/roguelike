import 'fake-indexeddb/auto'
import { ReplayDebugState } from './ReplayDebugState'
import { ReplayDebuggerService } from '@services/ReplayDebuggerService'
import { GameStateManager } from '@services/GameStateManager'
import { GameState, Player, Level, Input } from '@game/core/core'
import { ReplayData } from '@game/replay/replay'

// Polyfill for structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

// Mock prompt
global.prompt = jest.fn()

describe('ReplayDebugState', () => {
  let replayDebugState: ReplayDebugState
  let replayDebugger: ReplayDebuggerService
  let stateManager: GameStateManager
  let mockLoadReplay: jest.SpyInstance
  let mockReconstructToTurn: jest.SpyInstance
  let mockValidateDeterminism: jest.SpyInstance
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    replayDebugger = {} as ReplayDebuggerService
    stateManager = new GameStateManager()

    mockLoadReplay = jest.fn()
    mockReconstructToTurn = jest.fn()
    mockValidateDeterminism = jest.fn()

    replayDebugger.loadReplay = mockLoadReplay
    replayDebugger.reconstructToTurn = mockReconstructToTurn
    replayDebugger.validateDeterminism = mockValidateDeterminism

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    replayDebugState = new ReplayDebugState('test-game-123', replayDebugger, stateManager)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  function createTestGameState(): GameState {
    const player: Player = {
      id: 'player-1',
      name: 'Test Hero',
      position: { x: 10, y: 5 },
      hp: 50,
      maxHp: 100,
      strength: 16,
      level: 1,
      xp: 0,
      gold: 0,
      ac: 5,
      inventory: [],
      equipment: { weapon: null, armor: null, light: null },
      energy: 100,
      statusEffects: [],
      hunger: 1000,
      maxHunger: 2000,
    }

    const level: Level = {
      depth: 1,
      tiles: [],
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      upStairs: { x: 5, y: 5 },
      downStairs: { x: 15, y: 15 },
    }

    return {
      gameId: 'test-game-123',
      characterName: 'Test Hero',
      seed: 'test-seed',
      currentLevel: 1,
      turnCount: 5,
      player,
      levels: new Map([[1, level]]),
      visibleCells: new Set(['10,5']),
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      levelsVisitedWithAmulet: new Set(),
      itemNameMap: { potions: new Map(), scrolls: new Map(), rings: new Map(), wands: new Map() },
      messages: ['Welcome!'],
      maxDepth: 26,
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
      config: { fovMode: 'radius' as const },
    }
  }

  function createTestReplay(turnCount: number = 5): ReplayData {
    const initialState = createTestGameState()
    const commands = Array.from({ length: turnCount }, (_, i) => ({
      turnNumber: i + 1,
      timestamp: Date.now() + i * 1000,
      commandType: 'move',
      actorType: 'player' as const,
      payload: { direction: 'east' },
      rngState: JSON.stringify({ seed: 12345, state: i }),
    }))

    return {
      gameId: 'test-game-123',
      version: 1,
      initialState,
      seed: 'test-seed',
      commands,
      metadata: {
        createdAt: Date.now(),
        turnCount,
        characterName: 'Test Hero',
        currentLevel: 1,
        outcome: 'ongoing',
      },
    }
  }

  describe('enter', () => {
    it('should load replay data on enter', async () => {
      const replayData = createTestReplay()
      mockLoadReplay.mockResolvedValue(replayData)

      replayDebugState.enter()

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockLoadReplay).toHaveBeenCalledWith('test-game-123')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('REPLAY DEBUGGER'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Replay loaded successfully'))
    })

    it('should handle missing replay data', async () => {
      mockLoadReplay.mockResolvedValue(null)

      replayDebugState.enter()

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load replay data'))
    })

    it('should handle load errors', async () => {
      mockLoadReplay.mockRejectedValue(new Error('Database error'))

      replayDebugState.enter()

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading replay'),
        expect.any(Error)
      )
    })
  })

  describe('update', () => {
    it('should not perform per-frame updates', () => {
      replayDebugState.update(16)
      // No error should be thrown
    })
  })

  describe('render', () => {
    it('should not render visual content', () => {
      replayDebugState.render()
      // Console-based, no visual rendering
    })
  })

  describe('handleInput', () => {
    beforeEach(async () => {
      const replayData = createTestReplay(10)
      mockLoadReplay.mockResolvedValue(replayData)
      mockReconstructToTurn.mockResolvedValue(createTestGameState())

      replayDebugState.enter()
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('should handle Space key to step forward', async () => {
      const input: Input = { key: ' ', shift: false, ctrl: false, alt: false }

      replayDebugState.handleInput(input)

      // Wait for async step
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockReconstructToTurn).toHaveBeenCalledWith(expect.anything(), 1)
    })

    it('should handle Shift+Space to step backward', async () => {
      // First step forward
      let input: Input = { key: ' ', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Then step backward
      input = { key: ' ', shift: true, ctrl: false, alt: false }
      replayDebugState.handleInput(input)
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockReconstructToTurn).toHaveBeenCalledWith(expect.anything(), 0)
    })

    it('should handle j key to jump to turn', async () => {
      (global.prompt as jest.Mock).mockReturnValue('5')

      const input: Input = { key: 'j', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(global.prompt).toHaveBeenCalled()
      expect(mockReconstructToTurn).toHaveBeenCalledWith(expect.anything(), 5)
    })

    it('should handle v key to validate determinism', async () => {
      mockValidateDeterminism.mockResolvedValue({
        valid: true,
        desyncs: [],
      })

      const input: Input = { key: 'v', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockValidateDeterminism).toHaveBeenCalled()
    })

    it('should handle s key to show state', () => {
      const input: Input = { key: 's', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Current State'))
    })

    it('should handle e key to export replay', () => {
      const input: Input = { key: 'e', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Replay Data Export'))
    })

    it('should handle Escape key to exit', () => {
      const mockPopState = jest.spyOn(stateManager, 'popState')

      const input: Input = { key: 'Escape', shift: false, ctrl: false, alt: false }
      replayDebugState.handleInput(input)

      expect(mockPopState).toHaveBeenCalled()
    })

    it('should ignore input while loading', () => {
      const loadingState = new ReplayDebugState('test-game', replayDebugger, stateManager)

      const input: Input = { key: ' ', shift: false, ctrl: false, alt: false }
      loadingState.handleInput(input)

      // Should not call reconstructToTurn
      expect(mockReconstructToTurn).not.toHaveBeenCalled()
    })
  })

  describe('isPaused', () => {
    it('should pause lower states', () => {
      expect(replayDebugState.isPaused()).toBe(true)
    })
  })

  describe('isTransparent', () => {
    it('should be opaque (not transparent)', () => {
      expect(replayDebugState.isTransparent()).toBe(false)
    })
  })
})
