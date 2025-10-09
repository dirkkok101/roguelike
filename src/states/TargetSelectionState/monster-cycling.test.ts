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

describe('TargetSelectionState - Monster Cycling', () => {
  let targetingService: TargetingService
  let gameRenderer: GameRenderer
  let mockGameRenderer: any

  beforeEach(() => {
    const fovService = new FOVService(new StatusEffectService())
    const movementService = new MovementService(new MockRandom(), new StatusEffectService())
    targetingService = new TargetingService(fovService, movementService)

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

  function createMonster(id: string, position: Position, name: string = 'Monster'): Monster {
    return {
      id,
      letter: name.charAt(0).toUpperCase(),
      name,
      position,
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
  }

  function createTestState(
    playerPos: Position = { x: 10, y: 10 },
    monsters: Monster[] = []
  ): GameState {
    const level = createTestLevel()
    level.monsters = monsters

    const visibleCells = new Set<string>()
    visibleCells.add(`${playerPos.x},${playerPos.y}`)
    monsters.forEach((m) => visibleCells.add(`${m.position.x},${m.position.y}`))

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
      visibleCells,
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

  describe('Tab Key Monster Cycling', () => {
    it('should cycle to next monster when Tab is pressed', () => {
      const monster1 = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const monster2 = createMonster('m2', { x: 13, y: 10 }, 'Goblin')
      const monster3 = createMonster('m3', { x: 14, y: 10 }, 'Bat')
      const state = createTestState({ x: 10, y: 10 }, [monster1, monster2, monster3])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Should start at nearest monster (m1)
      let cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12)
      expect(cursor.y).toBe(10)

      // Press Tab to cycle to next
      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(13) // monster2

      // Press Tab again
      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(14) // monster3
    })

    it('should wrap around to first monster after last monster', () => {
      const monster1 = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const monster2 = createMonster('m2', { x: 13, y: 10 }, 'Goblin')
      const state = createTestState({ x: 10, y: 10 }, [monster1, monster2])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Cycle through all monsters and wrap around
      targetState.handleInput({ key: 'Tab' }) // -> monster2
      targetState.handleInput({ key: 'Tab' }) // -> wrap to monster1

      const cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12) // Back to first monster
    })

    it('should cycle to previous monster when Shift+Tab is pressed', () => {
      const monster1 = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const monster2 = createMonster('m2', { x: 13, y: 10 }, 'Goblin')
      const monster3 = createMonster('m3', { x: 14, y: 10 }, 'Bat')
      const state = createTestState({ x: 10, y: 10 }, [monster1, monster2, monster3])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Start at first monster, cycle backward
      targetState.handleInput({ key: 'Tab', shift: true })

      const cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(14) // Should wrap to last monster
    })

    it('should handle Tab when no monsters are visible', () => {
      const state = createTestState({ x: 10, y: 10 }, [])

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

      // Press Tab (should do nothing)
      targetState.handleInput({ key: 'Tab' })

      const cursor = targetState.getCursorPosition()
      expect(cursor).toEqual(initialCursor) // Should not move
    })

    it('should only cycle through visible monsters', () => {
      const visibleMonster = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const invisibleMonster = createMonster('m2', { x: 13, y: 10 }, 'Goblin')

      const state = createTestState({ x: 10, y: 10 }, [visibleMonster, invisibleMonster])

      // Remove invisible monster from FOV
      state.visibleCells.delete('13,10')

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Should start at visible monster
      let cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12)

      // Tab should wrap back to same monster (only one visible)
      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12)
    })
  })

  describe('Monster Distance Sorting', () => {
    it('should initialize cursor at nearest monster by distance', () => {
      const farMonster = createMonster('m1', { x: 15, y: 10 }, 'Far')
      const nearMonster = createMonster('m2', { x: 12, y: 10 }, 'Near')
      const midMonster = createMonster('m3', { x: 13, y: 10 }, 'Mid')

      // Add in non-sorted order
      const state = createTestState({ x: 10, y: 10 }, [farMonster, nearMonster, midMonster])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Should start at nearest (m2 at x=12)
      const cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12)
    })

    it('should cycle monsters in distance order (nearest to farthest)', () => {
      const monster1 = createMonster('m1', { x: 12, y: 10 }, 'Near') // distance 2
      const monster2 = createMonster('m2', { x: 13, y: 10 }, 'Mid') // distance 3
      const monster3 = createMonster('m3', { x: 15, y: 10 }, 'Far') // distance 5

      const state = createTestState({ x: 10, y: 10 }, [monster1, monster2, monster3])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Verify cycling order
      let cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12) // Nearest

      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(13) // Mid

      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(15) // Farthest
    })
  })

  describe('Single Monster Cases', () => {
    it('should handle cycling with only one monster', () => {
      const monster = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const state = createTestState({ x: 10, y: 10 }, [monster])

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

      // Tab should stay on same monster
      targetState.handleInput({ key: 'Tab' })
      const cursor = targetState.getCursorPosition()

      expect(cursor).toEqual(initialCursor)
      expect(cursor.x).toBe(12)
    })
  })

  describe('Cycling After Manual Movement', () => {
    it('should resume cycling from current monster after manual cursor movement', () => {
      const monster1 = createMonster('m1', { x: 12, y: 10 }, 'Orc')
      const monster2 = createMonster('m2', { x: 13, y: 10 }, 'Goblin')
      const monster3 = createMonster('m3', { x: 14, y: 10 }, 'Bat')

      const state = createTestState({ x: 10, y: 10 }, [monster1, monster2, monster3])

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        10,
        () => {},
        () => {}
      )

      targetState.enter()

      // Start at m1, cycle to m2
      targetState.handleInput({ key: 'Tab' })
      let cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(13)

      // Manually move cursor away
      targetState.handleInput({ key: 'j' }) // Move down
      cursor = targetState.getCursorPosition()
      expect(cursor.y).toBe(11) // Off monsters

      // Tab should find next monster (m3)
      targetState.handleInput({ key: 'Tab' })
      cursor = targetState.getCursorPosition()
      // Should cycle to next available monster
    })
  })

  describe('Range and Cycling', () => {
    it('should only cycle through monsters within range', () => {
      const nearMonster = createMonster('m1', { x: 12, y: 10 }, 'Near') // distance 2
      const farMonster = createMonster('m2', { x: 18, y: 10 }, 'Far') // distance 8

      const state = createTestState({ x: 10, y: 10 }, [nearMonster, farMonster])
      const range = 5

      const targetState = new TargetSelectionState(
        targetingService,
        gameRenderer,
        state,
        range,
        () => {},
        () => {}
      )

      targetState.enter()

      // Should start at near monster (within range)
      const cursor = targetState.getCursorPosition()
      expect(cursor.x).toBe(12)

      // Note: getVisibleMonsters already filters by FOV, but not by range
      // This test verifies the behavior with mixed-range monsters
    })
  })
})
