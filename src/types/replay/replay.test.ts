import { COMMAND_TYPES, CommandEvent, ReplayData, ValidationResult } from './replay'

describe('Replay Types', () => {
  describe('CommandEvent', () => {
    it('should have valid CommandEvent structure', () => {
      const event: CommandEvent = {
        turnNumber: 1,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.MOVE,
        actorType: 'player',
        payload: { direction: 'north' },
        rngState: '0.123',
      }

      expect(event.turnNumber).toBe(1)
      expect(event.commandType).toBe('move')
      expect(event.actorType).toBe('player')
      expect(event.payload.direction).toBe('north')
    })

    it('should support monster commands with actorId', () => {
      const event: CommandEvent = {
        turnNumber: 5,
        timestamp: Date.now(),
        commandType: COMMAND_TYPES.AI_ATTACK,
        actorType: 'monster',
        actorId: 'monster-123',
        payload: { target: { x: 10, y: 5 } },
        rngState: '0.456',
      }

      expect(event.actorType).toBe('monster')
      expect(event.actorId).toBe('monster-123')
    })
  })

  describe('COMMAND_TYPES', () => {
    it('should have all command types defined', () => {
      expect(COMMAND_TYPES.MOVE).toBe('move')
      expect(COMMAND_TYPES.ATTACK).toBe('attack')
      expect(COMMAND_TYPES.AI_MOVE).toBe('ai-move')
      expect(COMMAND_TYPES.AUTO_SAVE).toBe('auto-save')
    })

    it('should have player movement commands', () => {
      expect(COMMAND_TYPES.MOVE).toBeDefined()
      expect(COMMAND_TYPES.RUN).toBeDefined()
      expect(COMMAND_TYPES.REST).toBeDefined()
      expect(COMMAND_TYPES.SEARCH).toBeDefined()
    })

    it('should have item commands', () => {
      expect(COMMAND_TYPES.PICKUP).toBeDefined()
      expect(COMMAND_TYPES.DROP).toBeDefined()
      expect(COMMAND_TYPES.QUAFF).toBeDefined()
      expect(COMMAND_TYPES.READ).toBeDefined()
      expect(COMMAND_TYPES.ZAP).toBeDefined()
    })

    it('should have AI commands', () => {
      expect(COMMAND_TYPES.AI_MOVE).toBeDefined()
      expect(COMMAND_TYPES.AI_ATTACK).toBeDefined()
      expect(COMMAND_TYPES.AI_FLEE).toBeDefined()
      expect(COMMAND_TYPES.AI_WANDER).toBeDefined()
      expect(COMMAND_TYPES.AI_STEAL).toBeDefined()
    })
  })

  describe('ValidationResult', () => {
    it('should represent successful validation', () => {
      const result: ValidationResult = {
        valid: true,
        desyncs: [],
      }

      expect(result.valid).toBe(true)
      expect(result.desyncs).toHaveLength(0)
    })

    it('should represent failed validation with desyncs', () => {
      const result: ValidationResult = {
        valid: false,
        desyncs: [
          {
            turn: 42,
            field: 'player.hp',
            expected: 100,
            actual: 95,
          },
          {
            turn: 42,
            field: 'player.position.x',
            expected: 10,
            actual: 11,
          },
        ],
      }

      expect(result.valid).toBe(false)
      expect(result.desyncs).toHaveLength(2)
      expect(result.desyncs[0].field).toBe('player.hp')
    })
  })
})
