import { DisturbanceService } from './DisturbanceService'
import { GameState, RunState, Monster, Position, Player, ItemType, MonsterBehavior } from '@game/core/core'
import { createMockGameState, createMockLevel } from '../../test-helpers/mockGameState'

describe('DisturbanceService - Disturbance Checks', () => {
  let service: DisturbanceService

  // Helper function to create test players
  function createTestPlayer(overrides: Partial<Player> = {}): Player {
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
      hunger: 1000,
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
      isRunning: false,
      runState: null,
      ...overrides,
    }
  }

  // Helper function to create test monsters
  function createTestMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      id: 'monster-1',
      name: 'Orc',
      char: 'O',
      position: { x: 10, y: 10 },
      hp: 10,
      maxHp: 10,
      ac: 6,
      damage: '1d8',
      xpValue: 5,
      behavior: MonsterBehavior.SIMPLE,
      isAsleep: false,
      carriesGold: false,
      level: 1,
      aggro: 5,
      spriteName: 'orc',
      isUnique: false,
      hasSpecialAttack: false,
      canOpenDoors: false,
      canPickUpItems: false,
      ...overrides,
    }
  }

  beforeEach(() => {
    service = new DisturbanceService()
  })

  describe('monster detection', () => {
    it('stops run when new monster appears in FOV', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 }, hp: 20 })
      const level = createMockLevel()

      const existingMonster = createTestMonster({ id: 'orc-1', position: { x: 6, y: 5 }, name: 'Orc' })
      const newMonster = createTestMonster({ id: 'kobold-2', position: { x: 7, y: 5 }, name: 'Kobold' })
      level.monsters = [existingMonster, newMonster]

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5', '7,5']) // Both monsters visible

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(['orc-1']), // Only orc was visible when run started
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toBe('Kobold appears!')
    })

    it('does not stop if same monsters still visible', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 }, hp: 20 })
      const level = createMockLevel()

      // Create a simple corridor (only left and right are walkable - 2 directions)
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          level.tiles[y][x].walkable = false
        }
      }
      level.tiles[5][4] = { walkable: true, type: 'CORRIDOR' } as any // left
      level.tiles[5][5] = { walkable: true, type: 'CORRIDOR' } as any // player position
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right

      const monster = createTestMonster({ id: 'orc-1', position: { x: 6, y: 5 } })
      level.monsters = [monster]

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)
      state.visibleCells = new Set(['5,5', '6,5'])

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(['orc-1']),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(false)
    })
  })

  describe('safety critical', () => {
    it('stops run when HP drops below 30%', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 }, hp: 5, maxHp: 20 }) // 25%
      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 10
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('health is low')
    })

    it('stops run when hunger is critical', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 }, hunger: 250 }) // Below 300
      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('hungry')
    })
  })

  describe('navigation', () => {
    it('stops run at corridor branch (3+ walkable directions)', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 } })
      const level = createMockLevel()

      // Create T-junction: paths up, down, right
      level.tiles[4][5] = { walkable: true, type: 'CORRIDOR' } as any // up
      level.tiles[6][5] = { walkable: true, type: 'CORRIDOR' } as any // down
      level.tiles[5][6] = { walkable: true, type: 'CORRIDOR' } as any // right
      level.tiles[5][4] = { walkable: false, type: 'WALL' } as any // left blocked

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('corridor branches')
    })

    it('stops run when reaching a door', () => {
      const player = createTestPlayer({ position: { x: 5, y: 5 } })
      const level = createMockLevel()

      level.doors = [
        { position: { x: 5, y: 6 }, state: 'CLOSED' } as any
      ]

      const state: GameState = createMockGameState({ currentLevel: 1 })
      state.player = player
      state.levels.set(1, level)

      const runState: RunState = {
        direction: 'right',
        startingFOV: new Set(),
        startingPosition: { x: 4, y: 5 },
        previousHP: 20
      }

      const result = service.checkDisturbance(state, runState)

      expect(result.disturbed).toBe(true)
      expect(result.reason).toContain('door')
    })
  })
})
