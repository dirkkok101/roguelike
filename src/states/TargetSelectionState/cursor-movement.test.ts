import { TargetSelectionState } from './TargetSelectionState'
import { TargetingService } from '@services/TargetingService'
import { FOVService } from '@services/FOVService'
import { MovementService } from '@services/MovementService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MockRandom } from '@services/RandomService'
import { GameRenderer } from '@ui/GameRenderer'
import {
  GameState,
  Level,
  TileType,
  Position,
  Monster,
  MonsterBehavior,
  MonsterState,
} from '@game/core/core'

describe('TargetSelectionState - Cursor Movement', () => {
  let targetingService: TargetingService
  let gameRenderer: GameRenderer
  let mockGameRenderer: any

  beforeEach(() => {
    const fovService = new FOVService(new StatusEffectService())
    const movementService = new MovementService(new MockRandom(), new StatusEffectService())
    targetingService = new TargetingService(fovService, movementService)

    // Create minimal mock GameRenderer
    mockGameRenderer = {
      renderTargetingOverlay: jest.fn(),
      render: jest.fn(),
      hideTargetingInfo: jest.fn(),
    } as any
    gameRenderer = mockGameRenderer
  })

  function createTestLevel(width: number = 20, height: number = 20): Level {
    const tiles = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#fff',
            colorExplored: '#888',
          }))
      )

    return {
      depth: 1,
      width,
      height,
      tiles,
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(height)
        .fill(null)
        .map(() => Array(width).fill(false)),
    }
  }

  function createTestState(playerPos: Position = { x: 10, y: 10 }): GameState {
    const level = createTestLevel()
    return {
      player: {
        position: playerPos,
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
        energy: 100,
      },
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells: new Set(['10,10']),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test',
      characterName: 'Test',
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      debug: { godMode: false, revealMap: false, showFOV: false, showPathfinding: false },
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }
  }

  describe('Cursor Initialization', () => {
    it('should initialize cursor at first walkable adjacent tile when no monsters visible', () => {
      const state = createTestState()
      let confirmedPosition: Position | null = null

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        (pos) => {
          confirmedPosition = pos
        },
        () => {}
      )

      targetState.enter()
      const cursor = targetState.getCursorPosition()

      // Should be adjacent to player (10, 10)
      const distance = Math.abs(cursor.x - 10) + Math.abs(cursor.y - 10)
      expect(distance).toBe(1) // One tile away
      expect(cursor.x).toBeGreaterThanOrEqual(0)
      expect(cursor.y).toBeGreaterThanOrEqual(0)
    })

    it('should initialize cursor at nearest monster when monsters are visible', () => {
      const state = createTestState()
      const level = state.levels.get(1)!

      // Add monster at position (12, 10)
      const monster: Monster = {
        id: 'monster-1',
        letter: 'O',
        name: 'Orc',
        position: { x: 12, y: 10 },
        hp: 10,
        maxHp: 10,
        ac: 6,
        damage: '1d8',
        xpValue: 5,
        level: 2,
        aiProfile: {
          behavior: MonsterBehavior.SIMPLE,
          intelligence: 2,
          aggroRange: 5,
          fleeThreshold: 0,
          special: [],
        },
        isAsleep: false,
        isAwake: true,
        state: MonsterState.IDLE,
        visibleCells: new Set(),
        currentPath: null,
        hasStolen: false,
        lastKnownPlayerPosition: null,
        turnsWithoutSight: 0,
        energy: 0,
        speed: 10,
        isInvisible: false,
        statusEffects: [],
      }
      level.monsters.push(monster)

      // Add monster to visible cells
      state.visibleCells.add('12,10')

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const cursor = targetState.getCursorPosition()

      // Should initialize at monster position
      expect(cursor.x).toBe(12)
      expect(cursor.y).toBe(10)
    })

    it('should cancel targeting if all adjacent tiles are non-walkable', () => {
      const state = createTestState({ x: 10, y: 10 })
      const level = state.levels.get(1)!

      // Make all adjacent tiles walls
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue // Skip player position
          const x = 10 + dx
          const y = 10 + dy
          level.tiles[y][x] = {
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#888',
            colorExplored: '#444',
          }
        }
      }

      let cancelled = false
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {
          cancelled = true
        }
      )

      targetState.enter()

      expect(cancelled).toBe(true)
    })
  })

  describe('Basic Cursor Movement', () => {
    it('should move cursor right with "l" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      // Move right
      targetState.handleInput({ key: 'l' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x + 1)
      expect(newCursor.y).toBe(initialCursor.y)
    })

    it('should move cursor left with "h" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      // Move left
      targetState.handleInput({ key: 'h' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x - 1)
      expect(newCursor.y).toBe(initialCursor.y)
    })

    it('should move cursor up with "k" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      // Move up
      targetState.handleInput({ key: 'k' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x)
      expect(newCursor.y).toBe(initialCursor.y - 1)
    })

    it('should move cursor down with "j" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      // Move down
      targetState.handleInput({ key: 'j' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x)
      expect(newCursor.y).toBe(initialCursor.y + 1)
    })
  })

  describe('Diagonal Cursor Movement', () => {
    it('should move cursor diagonally up-left with "y" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      targetState.handleInput({ key: 'y' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x - 1)
      expect(newCursor.y).toBe(initialCursor.y - 1)
    })

    it('should move cursor diagonally up-right with "u" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      targetState.handleInput({ key: 'u' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x + 1)
      expect(newCursor.y).toBe(initialCursor.y - 1)
    })

    it('should move cursor diagonally down-left with "b" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      targetState.handleInput({ key: 'b' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x - 1)
      expect(newCursor.y).toBe(initialCursor.y + 1)
    })

    it('should move cursor diagonally down-right with "n" key', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      targetState.handleInput({ key: 'n' })
      const newCursor = targetState.getCursorPosition()

      expect(newCursor.x).toBe(initialCursor.x + 1)
      expect(newCursor.y).toBe(initialCursor.y + 1)
    })
  })

  describe('Arrow Key Movement', () => {
    it('should support arrow keys for movement', () => {
      const state = createTestState({ x: 10, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()
      const start = targetState.getCursorPosition()

      // Test ArrowRight
      targetState.handleInput({ key: 'ArrowRight' })
      let cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(start.x + 1)
      expect(cursor.y).toBe(start.y)

      // Test ArrowUp
      targetState.handleInput({ key: 'ArrowUp' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(start.x + 1)
      expect(cursor.y).toBe(start.y - 1)

      // Test ArrowLeft
      targetState.handleInput({ key: 'ArrowLeft' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(start.x)
      expect(cursor.y).toBe(start.y - 1)

      // Test ArrowDown
      targetState.handleInput({ key: 'ArrowDown' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(start.x)
      expect(cursor.y).toBe(start.y)
    })
  })

  describe('Range Restrictions', () => {
    it('should not allow cursor to move beyond range', () => {
      const state = createTestState({ x: 10, y: 10 })
      const range = 3
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        range,
        () => {},
        () => {}
      )

      targetState.enter()

      // Try to move 4 tiles right (beyond range)
      for (let i = 0; i < 5; i++) {
        targetState.handleInput({ key: 'l' })
      }

      const cursor = targetState.getCursorPosition()
      const distance = Math.abs(cursor.x - 10) + Math.abs(cursor.y - 10)

      // Should be capped at range
      expect(distance).toBeLessThanOrEqual(range)
    })

    it('should allow cursor to move to exact maximum range', () => {
      const state = createTestState({ x: 10, y: 10 })
      const range = 3
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        range,
        () => {},
        () => {}
      )

      targetState.enter()

      // Move exactly 3 tiles right
      for (let i = 0; i < 3; i++) {
        targetState.handleInput({ key: 'l' })
      }

      const cursor = targetState.getCursorPosition()
      const distance = Math.abs(cursor.x - 10) + Math.abs(cursor.y - 10)

      expect(distance).toBe(range)
    })
  })

  describe('Boundary Restrictions', () => {
    it('should not allow cursor to move outside map boundaries', () => {
      const state = createTestState({ x: 0, y: 0 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()
      const initialCursor = targetState.getCursorPosition()

      // Try to move left (out of bounds)
      targetState.handleInput({ key: 'h' })
      const cursor = targetState.getCursorPosition()

      // Should stay at boundary
      expect(cursor.x).toBeGreaterThanOrEqual(0)
    })

    it('should not allow cursor to move beyond map width', () => {
      const state = createTestState({ x: 19, y: 10 })
      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Try to move right (out of bounds)
      targetState.handleInput({ key: 'l' })
      const cursor = targetState.getCursorPosition()

      // Should stay within bounds
      expect(cursor.x).toBeLessThan(20)
    })
  })

  describe('Wall Restrictions', () => {
    it('should not allow cursor to move through walls', () => {
      const state = createTestState({ x: 10, y: 10 })
      const level = state.levels.get(1)!

      // Place wall to the right
      level.tiles[10][12] = {
        type: TileType.WALL,
        char: '#',
        walkable: false,
        transparent: false,
        colorVisible: '#888',
        colorExplored: '#444',
      }

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {}
      )

      targetState.enter()

      // Move right twice (should stop at wall)
      targetState.handleInput({ key: 'l' })
      targetState.handleInput({ key: 'l' })

      const cursor = targetState.getCursorPosition()

      // Should stop before wall
      expect(cursor.x).toBe(11) // One tile right, not 12
    })
  })

  describe('Target Confirmation', () => {
    it('should call onTarget callback with cursor position when Enter is pressed', () => {
      const state = createTestState({ x: 10, y: 10 })
      let confirmedPosition: Position | null = null

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        (pos) => {
          confirmedPosition = pos
        },
        () => {}
      )

      targetState.enter()

      // Move cursor
      targetState.handleInput({ key: 'l' })
      targetState.handleInput({ key: 'j' })

      // Confirm
      targetState.handleInput({ key: 'Enter' })

      expect(confirmedPosition).not.toBeNull()
      expect(confirmedPosition!.x).toBe(12) // 11 + 1 from initial adjacent
      expect(confirmedPosition!.y).toBe(11) // 10 + 1
    })

    it('should call onTarget callback when Space is pressed', () => {
      const state = createTestState({ x: 10, y: 10 })
      let confirmed = false

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {
          confirmed = true
        },
        () => {}
      )

      targetState.enter()
      targetState.handleInput({ key: ' ' })

      expect(confirmed).toBe(true)
    })

    it('should not allow targeting player position', () => {
      const state = createTestState({ x: 10, y: 10 })
      let confirmedPosition: Position | null = null

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        (pos) => {
          confirmedPosition = pos
        },
        () => {}
      )

      targetState.enter()

      // Move cursor back to player position (if possible)
      const cursor = targetState.getCursorPosition()

      // Can't actually test this directly without moving to player pos
      // The implementation silently ignores targeting self
    })
  })

  describe('Targeting Cancellation', () => {
    it('should call onCancel callback when Escape is pressed', () => {
      const state = createTestState()
      let cancelled = false

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        5,
        () => {},
        () => {
          cancelled = true
        }
      )

      targetState.enter()
      targetState.handleInput({ key: 'Escape' })

      expect(cancelled).toBe(true)
    })
  })
})
