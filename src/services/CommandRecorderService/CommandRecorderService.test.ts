import { CommandRecorderService } from './CommandRecorderService'
import { CommandEvent, COMMAND_TYPES } from '@game/replay/replay'
import { GameState } from '@game/core/core'

// Helper to create minimal test GameState
function createTestGameState(gameId: string = 'test-game'): GameState {
  return {
    gameId,
    characterName: 'Test Hero',
    seed: 'test-seed',
    currentLevel: 1,
    turnCount: 0,
    player: {
      id: 'player-1',
      name: 'Test Hero',
      position: { x: 10, y: 5 },
      hp: 100,
      maxHp: 100,
      strength: 16,
      level: 1,
      experience: 0,
      nextLevelExperience: 10,
      gold: 0,
      armorClass: 5,
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        rings: [],
        light: null,
      },
      energy: 100,
      statusEffects: [],
      hunger: 1000,
      maxHunger: 2000,
    },
    levels: new Map(),
    visibleCells: new Set(),
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    levelsVisitedWithAmulet: new Set(),
    itemNameMap: {
      potions: new Map(),
      scrolls: new Map(),
      rings: new Map(),
      wands: new Map(),
    },
    messages: [],
    maxDepth: 26,
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
    config: { fovMode: 'radius' },
  } as GameState
}

describe('CommandRecorderService', () => {
  let service: CommandRecorderService

  beforeEach(() => {
    const mockIndexedDB = {} as any // Mock not needed for basic tests
    service = new CommandRecorderService(mockIndexedDB)
  })

  describe('Recording Commands', () => {
    it('should record commands correctly', () => {
      const event: CommandEvent = {
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      }

      service.recordCommand(event)

      const log = service.getCommandLog()
      expect(log).toHaveLength(1)
      expect(log[0]).toEqual(event)
    })

    it('should record multiple commands in order', () => {
      const event1: CommandEvent = {
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      }

      const event2: CommandEvent = {
        turnNumber: 2,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.ATTACK,
        actorType: 'player',
        payload: { target: { x: 11, y: 5 } },
        rngState: '0.456',
      }

      service.recordCommand(event1)
      service.recordCommand(event2)

      const log = service.getCommandLog()
      expect(log).toHaveLength(2)
      expect(log[0].commandType).toBe(COMMAND_TYPES.MOVE)
      expect(log[1].commandType).toBe(COMMAND_TYPES.ATTACK)
    })

    it('should record monster AI commands', () => {
      const event: CommandEvent = {
        turnNumber: 5,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.AI_MOVE,
        actorType: 'monster',
        actorId: 'monster-123',
        payload: { from: { x: 5, y: 5 }, to: { x: 6, y: 5 } },
        rngState: '0.789',
      }

      service.recordCommand(event)

      const log = service.getCommandLog()
      expect(log[0].actorType).toBe('monster')
      expect(log[0].actorId).toBe('monster-123')
    })
  })

  describe('Initial State Management', () => {
    it('should store initial state', () => {
      const state = createTestGameState('game-1')

      service.setInitialState(state)

      const initialState = service.getInitialState()
      expect(initialState).not.toBeNull()
      expect(initialState?.gameId).toBe('game-1')
      expect(initialState?.player.hp).toBe(100)
    })

    it('should track current game ID', () => {
      const state = createTestGameState('game-123')

      service.setInitialState(state)

      expect(service.getGameId()).toBe('game-123')
    })

    it('should deep copy initial state to prevent mutations', () => {
      const state = createTestGameState('game-1')

      service.setInitialState(state)

      // Mutate original state
      state.player.hp = 50

      // Initial state should be unchanged
      const initialState = service.getInitialState()
      expect(initialState?.player.hp).toBe(100)
    })

    it('should return copy of initial state to prevent external mutations', () => {
      const state = createTestGameState('game-1')
      service.setInitialState(state)

      const retrieved1 = service.getInitialState()
      const retrieved2 = service.getInitialState()

      // Should be different objects
      expect(retrieved1).not.toBe(retrieved2)

      // Mutating one should not affect the other
      if (retrieved1) retrieved1.player.hp = 50
      if (retrieved2) retrieved2.player.hp = 75

      const retrieved3 = service.getInitialState()
      expect(retrieved3?.player.hp).toBe(100)
    })
  })

  describe('Get Command Log', () => {
    it('should return copy of command log (immutable)', () => {
      const event: CommandEvent = {
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      }

      service.recordCommand(event)

      const log1 = service.getCommandLog()
      const log2 = service.getCommandLog()

      // Should be different arrays
      expect(log1).not.toBe(log2)
      expect(log1).toHaveLength(1)
      expect(log2).toHaveLength(1)

      // Mutating returned log should not affect service
      log1.push({
        turnNumber: 2,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.REST,
        actorType: 'player',
        payload: {},
        rngState: '0.999',
      })

      const log3 = service.getCommandLog()
      expect(log3).toHaveLength(1) // Still only one command
    })
  })

  describe('Clear Log', () => {
    it('should clear all recorded data', () => {
      const state = createTestGameState('game-1')
      service.setInitialState(state)

      service.recordCommand({
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      })

      service.clearLog()

      expect(service.getCommandLog()).toHaveLength(0)
      expect(service.getInitialState()).toBeNull()
      expect(service.getGameId()).toBeNull()
    })

    it('should allow starting new recording after clear', () => {
      const state1 = createTestGameState('game-1')
      service.setInitialState(state1)
      service.recordCommand({
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      })

      service.clearLog()

      const state2 = createTestGameState('game-2')
      service.setInitialState(state2)
      service.recordCommand({
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.REST,
        actorType: 'player',
        payload: {},
        rngState: '0.456',
      })

      expect(service.getGameId()).toBe('game-2')
      expect(service.getCommandLog()).toHaveLength(1)
      expect(service.getCommandLog()[0].commandType).toBe(COMMAND_TYPES.REST)
    })
  })

  describe('Recording State', () => {
    it('should report not recording initially', () => {
      expect(service.isRecording()).toBe(false)
    })

    it('should report recording after setting initial state', () => {
      const state = createTestGameState('game-1')
      service.setInitialState(state)

      expect(service.isRecording()).toBe(true)
    })

    it('should report not recording after clear', () => {
      const state = createTestGameState('game-1')
      service.setInitialState(state)

      service.clearLog()

      expect(service.isRecording()).toBe(false)
    })
  })

  describe('Command Count', () => {
    it('should report command count correctly', () => {
      expect(service.getCommandCount()).toBe(0)

      service.recordCommand({
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      })

      expect(service.getCommandCount()).toBe(1)

      service.recordCommand({
        turnNumber: 2,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.REST,
        actorType: 'player',
        payload: {},
        rngState: '0.456',
      })

      expect(service.getCommandCount()).toBe(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty command log', () => {
      expect(service.getCommandLog()).toEqual([])
      expect(service.getCommandCount()).toBe(0)
    })

    it('should handle no initial state', () => {
      expect(service.getInitialState()).toBeNull()
      expect(service.getGameId()).toBeNull()
    })

    it('should handle large command logs (1000+ commands)', () => {
      const state = createTestGameState('game-1')
      service.setInitialState(state)

      // Record 1000 commands
      for (let i = 0; i < 1000; i++) {
        service.recordCommand({
          turnNumber: i,
          timestamp: Date.now(),
          commandType: COMMAND_TYPES.MOVE,
          actorType: 'player',
          payload: { direction: 'north' },
          rngState: `0.${i}`,
        })
      }

      expect(service.getCommandCount()).toBe(1000)
      expect(service.getCommandLog()).toHaveLength(1000)
    })
  })
})
