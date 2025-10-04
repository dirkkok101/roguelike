import { DebugOverlays } from './DebugOverlays'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, Level, TileType, MonsterBehavior, MonsterState } from '@game/core/core'

describe('DebugOverlays', () => {
  let debugOverlays: DebugOverlays
  let debugService: DebugService
  let mockCtx: CanvasRenderingContext2D
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)
    debugOverlays = new DebugOverlays(debugService)

    // Create mock canvas context
    mockCtx = {
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      setLineDash: jest.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      font: '',
    } as any

    // Create basic level
    const level: Level = {
      depth: 1,
      width: 10,
      height: 10,
      tiles: Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => ({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
        }))
      ),
      explored: Array(10).fill(null).map(() => Array(10).fill(false)),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: { x: 5, y: 5 },
    }

    mockState = {
      currentLevel: 1,
      levels: new Map([[1, level]]),
      messages: [],
      visibleCells: new Set(),
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  describe('renderAIOverlay', () => {
    test('does nothing when aiOverlay is disabled', () => {
      debugOverlays.renderAIOverlay(mockState, mockCtx, 16)

      expect(mockCtx.strokeRect).not.toHaveBeenCalled()
    })

    test('renders when aiOverlay is enabled', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          aiOverlay: true,
        },
        visibleCells: new Set(['2,2']),
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 2, y: 2 },
          state: MonsterState.HUNTING,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
        } as any,
      ]

      debugOverlays.renderAIOverlay(monsterState, mockCtx, 16)

      expect(mockCtx.strokeRect).toHaveBeenCalled()
    })

    test('only renders visible monsters', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          aiOverlay: true,
        },
        visibleCells: new Set(['2,2']), // Only one monster visible
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 2, y: 2 },
          state: MonsterState.HUNTING,
          aiProfile: { behavior: MonsterBehavior.SIMPLE, intelligence: 5, aggroRange: 5, fleeThreshold: 0.25, special: [] },
        } as any,
        {
          position: { x: 5, y: 5 },
          state: MonsterState.HUNTING,
          aiProfile: { behavior: MonsterBehavior.SIMPLE, intelligence: 5, aggroRange: 5, fleeThreshold: 0.25, special: [] },
        } as any,
      ]

      debugOverlays.renderAIOverlay(monsterState, mockCtx, 16)

      // Should only render one monster (the visible one)
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1)
    })
  })

  describe('renderPathOverlay', () => {
    test('does nothing when pathOverlay is disabled', () => {
      debugOverlays.renderPathOverlay(mockState, mockCtx, 16)

      expect(mockCtx.beginPath).not.toHaveBeenCalled()
    })

    test('renders when pathOverlay is enabled and monster has path', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          pathOverlay: true,
        },
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 2, y: 2 },
          currentPath: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
          aiProfile: {
            behavior: MonsterBehavior.SMART,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
        } as any,
      ]

      debugOverlays.renderPathOverlay(monsterState, mockCtx, 16)

      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.stroke).toHaveBeenCalled()
    })

    test('skips monsters without paths', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          pathOverlay: true,
        },
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 2, y: 2 },
          currentPath: null,
          aiProfile: { behavior: MonsterBehavior.SIMPLE, intelligence: 5, aggroRange: 5, fleeThreshold: 0.25, special: [] },
        } as any,
      ]

      debugOverlays.renderPathOverlay(monsterState, mockCtx, 16)

      expect(mockCtx.beginPath).not.toHaveBeenCalled()
    })
  })

  describe('renderFOVOverlay', () => {
    test('does nothing when fovOverlay is disabled', () => {
      debugOverlays.renderFOVOverlay(mockState, mockCtx, 16)

      expect(mockCtx.arc).not.toHaveBeenCalled()
    })

    test('renders when fovOverlay is enabled and monster is awake', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          fovOverlay: true,
        },
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 5, y: 5 },
          isAwake: true,
          aiProfile: {
            behavior: MonsterBehavior.SIMPLE,
            intelligence: 5,
            aggroRange: 5,
            fleeThreshold: 0.25,
            special: [],
          },
          visibleCells: new Set(),
        } as any,
      ]

      debugOverlays.renderFOVOverlay(monsterState, mockCtx, 16)

      expect(mockCtx.arc).toHaveBeenCalled()
    })

    test('skips sleeping monsters', () => {
      const monsterState = {
        ...mockState,
        debug: {
          ...debugService.initializeDebugState(),
          fovOverlay: true,
        },
      }

      const level = monsterState.levels.get(1)!
      level.monsters = [
        {
          position: { x: 5, y: 5 },
          isAwake: false,
          aiProfile: { behavior: MonsterBehavior.SIMPLE, intelligence: 5, aggroRange: 5, fleeThreshold: 0.25, special: [] },
          visibleCells: new Set(),
        } as any,
      ]

      debugOverlays.renderFOVOverlay(monsterState, mockCtx, 16)

      expect(mockCtx.arc).not.toHaveBeenCalled()
    })
  })
})
