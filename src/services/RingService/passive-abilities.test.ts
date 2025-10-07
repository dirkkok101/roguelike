import { RingService } from './RingService'
import { Player, Ring, RingType, ItemType, Level, Door, Trap, DoorState, TrapType, TileType } from '@game/core/core'
import { MockRandom } from '@services/RandomService'

describe('RingService - Passive Ring Abilities', () => {
  let service: RingService
  let mockRandom: MockRandom
  let basePlayer: Player
  let baseLevel: Level

  beforeEach(() => {
    mockRandom = new MockRandom([])
    service = new RingService(mockRandom)

    basePlayer = {
      position: { x: 5, y: 5 },
      hp: 12,
      maxHp: 12,
      strength: 16,
      maxStrength: 16,
      ac: 10,
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
      energy: 0,
    }

    baseLevel = {
      depth: 1,
      width: 80,
      height: 22,
      tiles: Array(22).fill(null).map(() =>
        Array(80).fill({ type: TileType.FLOOR, char: '.', walkable: true, transparent: true, colorVisible: '#fff', colorExplored: '#888' })
      ),
      rooms: [],
      doors: [],
      traps: [],
      monsters: [],
      items: [],
      gold: [],
      stairsUp: null,
      stairsDown: null,
      explored: Array(22).fill(null).map(() => Array(80).fill(false)),
    }
  })

  // ============================================================================
  // canSeeInvisible() - SEE_INVISIBLE ring
  // ============================================================================

  describe('canSeeInvisible', () => {
    test('returns false when no rings equipped', () => {
      expect(service.canSeeInvisible(basePlayer)).toBe(false)
    })

    test('returns true when SEE_INVISIBLE ring equipped on left hand', () => {
      const seeInvisRing: Ring = {
        id: 'ring-1',
        name: 'Ring of See Invisible',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEE_INVISIBLE,
        effect: 'Reveal invisible monsters',
        bonus: 0,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: seeInvisRing,
        },
      }

      expect(service.canSeeInvisible(player)).toBe(true)
    })

    test('returns true when SEE_INVISIBLE ring equipped on right hand', () => {
      const seeInvisRing: Ring = {
        id: 'ring-1',
        name: 'Ring of See Invisible',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEE_INVISIBLE,
        effect: 'Reveal invisible monsters',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: seeInvisRing,
        },
      }

      expect(service.canSeeInvisible(player)).toBe(true)
    })

    test('returns true when two SEE_INVISIBLE rings equipped (redundant but works)', () => {
      const seeInvis1: Ring = {
        id: 'ring-1',
        name: 'Ring of See Invisible',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEE_INVISIBLE,
        effect: 'Reveal invisible monsters',
        bonus: 0,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const seeInvis2: Ring = {
        id: 'ring-2',
        name: 'Ring of See Invisible',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEE_INVISIBLE,
        effect: 'Reveal invisible monsters',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: seeInvis1,
          rightRing: seeInvis2,
        },
      }

      expect(service.canSeeInvisible(player)).toBe(true)
    })

    test('returns false when other ring types equipped', () => {
      const protectionRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Protection',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.PROTECTION,
        effect: 'Improves AC',
        bonus: 1,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: protectionRing,
        },
      }

      expect(service.canSeeInvisible(player)).toBe(false)
    })
  })

  // ============================================================================
  // preventStrengthDrain() - SUSTAIN_STRENGTH ring
  // ============================================================================

  describe('preventStrengthDrain', () => {
    test('returns false when no rings equipped', () => {
      expect(service.preventStrengthDrain(basePlayer)).toBe(false)
    })

    test('returns true when SUSTAIN_STRENGTH ring equipped on left hand', () => {
      const sustainRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Sustain Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SUSTAIN_STRENGTH,
        effect: 'Prevent strength drain',
        bonus: 0,
        materialName: 'ruby',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: sustainRing,
        },
      }

      expect(service.preventStrengthDrain(player)).toBe(true)
    })

    test('returns true when SUSTAIN_STRENGTH ring equipped on right hand', () => {
      const sustainRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Sustain Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SUSTAIN_STRENGTH,
        effect: 'Prevent strength drain',
        bonus: 0,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: sustainRing,
        },
      }

      expect(service.preventStrengthDrain(player)).toBe(true)
    })

    test('returns false when other ring types equipped', () => {
      const strengthRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Add Strength',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.ADD_STRENGTH,
        effect: 'Increases strength',
        bonus: 2,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: strengthRing,
        },
      }

      expect(service.preventStrengthDrain(player)).toBe(false)
    })
  })

  // ============================================================================
  // hasStealth() - STEALTH ring
  // ============================================================================

  describe('hasStealth', () => {
    test('returns false when no rings equipped', () => {
      expect(service.hasStealth(basePlayer)).toBe(false)
    })

    test('returns true when STEALTH ring equipped on left hand', () => {
      const stealthRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Stealth',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.STEALTH,
        effect: 'Silent movement',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: stealthRing,
        },
      }

      expect(service.hasStealth(player)).toBe(true)
    })

    test('returns true when STEALTH ring equipped on right hand', () => {
      const stealthRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Stealth',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.STEALTH,
        effect: 'Silent movement',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: stealthRing,
        },
      }

      expect(service.hasStealth(player)).toBe(true)
    })

    test('returns false when other ring types equipped', () => {
      const regenRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Regeneration',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.REGENERATION,
        effect: 'Faster healing',
        bonus: 0,
        materialName: 'sapphire',
        hungerModifier: 1.3,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: regenRing,
        },
      }

      expect(service.hasStealth(player)).toBe(false)
    })
  })

  // ============================================================================
  // applySearchingRing() - SEARCHING ring auto-detection
  // ============================================================================

  describe('applySearchingRing', () => {
    test('returns empty result when no SEARCHING ring equipped', () => {
      const result = service.applySearchingRing(basePlayer, baseLevel)

      expect(result.trapsFound).toEqual([])
      expect(result.secretDoorsFound).toEqual([])
    })

    test('returns empty result when no traps or secret doors nearby', () => {
      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const result = service.applySearchingRing(player, baseLevel)

      expect(result.trapsFound).toEqual([])
      expect(result.secretDoorsFound).toEqual([])
    })

    test('detects undiscovered trap adjacent to player when chance succeeds', () => {
      mockRandom = new MockRandom([1]) // 10% chance succeeds (1 = true for chance())
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const trap: Trap = {
        type: TrapType.DART,
        position: { x: 6, y: 5 }, // Adjacent to player (east)
        discovered: false,
        triggered: false,
      }

      const level = {
        ...baseLevel,
        traps: [trap],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.trapsFound).toHaveLength(1)
      expect(result.trapsFound[0]).toEqual({ x: 6, y: 5 })
      expect(result.secretDoorsFound).toEqual([])
    })

    test('does not detect trap when chance fails', () => {
      mockRandom = new MockRandom([0]) // 10% chance fails (0 = false for chance())
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const trap: Trap = {
        type: TrapType.DART,
        position: { x: 6, y: 5 },
        discovered: false,
        triggered: false,
      }

      const level = {
        ...baseLevel,
        traps: [trap],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.trapsFound).toEqual([])
    })

    test('ignores already discovered traps', () => {
      mockRandom = new MockRandom([1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const trap: Trap = {
        type: TrapType.DART,
        position: { x: 6, y: 5 },
        discovered: true, // Already discovered
        triggered: false,
      }

      const level = {
        ...baseLevel,
        traps: [trap],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.trapsFound).toEqual([])
    })

    test('detects secret door adjacent to player', () => {
      mockRandom = new MockRandom([1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const secretDoor: Door = {
        position: { x: 5, y: 4 }, // Adjacent to player (north)
        state: DoorState.SECRET,
        discovered: false,
        orientation: 'vertical',
        connectsRooms: [1, 2],
      }

      const level = {
        ...baseLevel,
        doors: [secretDoor],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.secretDoorsFound).toHaveLength(1)
      expect(result.secretDoorsFound[0]).toEqual({ x: 5, y: 4 })
      expect(result.trapsFound).toEqual([])
    })

    test('ignores already discovered secret doors', () => {
      mockRandom = new MockRandom([1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const secretDoor: Door = {
        position: { x: 5, y: 4 },
        state: DoorState.SECRET,
        discovered: true, // Already discovered
        orientation: 'vertical',
        connectsRooms: [1, 2],
      }

      const level = {
        ...baseLevel,
        doors: [secretDoor],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.secretDoorsFound).toEqual([])
    })

    test('ignores non-secret doors', () => {
      mockRandom = new MockRandom([1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const closedDoor: Door = {
        position: { x: 5, y: 4 },
        state: DoorState.CLOSED, // Regular closed door, not secret
        discovered: false,
        orientation: 'vertical',
        connectsRooms: [1, 2],
      }

      const level = {
        ...baseLevel,
        doors: [closedDoor],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.secretDoorsFound).toEqual([])
    })

    test('two SEARCHING rings double detection chance (20%)', () => {
      // With two rings, detection chance is 0.2 (20%)
      mockRandom = new MockRandom([1, 1])
      service = new RingService(mockRandom)

      const searching1: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const searching2: Ring = {
        id: 'ring-2',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'iron',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searching1,
          rightRing: searching2,
        },
      }

      const trap: Trap = {
        type: TrapType.DART,
        position: { x: 6, y: 5 },
        discovered: false,
        triggered: false,
      }

      const secretDoor: Door = {
        position: { x: 5, y: 4 },
        state: DoorState.SECRET,
        discovered: false,
        orientation: 'vertical',
        connectsRooms: [1, 2],
      }

      const level = {
        ...baseLevel,
        traps: [trap],
        doors: [secretDoor],
      }

      const result = service.applySearchingRing(player, level)

      // With 20% chance (two rings), both should be found
      expect(result.trapsFound).toHaveLength(1)
      expect(result.secretDoorsFound).toHaveLength(1)
    })

    test('checks all 8 adjacent positions', () => {
      // True for all 8 positions
      mockRandom = new MockRandom([1, 1, 1, 1, 1, 1, 1, 1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      // Place traps at all 8 adjacent positions
      const traps: Trap[] = [
        { type: TrapType.DART, position: { x: 4, y: 4 }, discovered: false, triggered: false }, // NW
        { type: TrapType.DART, position: { x: 5, y: 4 }, discovered: false, triggered: false }, // N
        { type: TrapType.DART, position: { x: 6, y: 4 }, discovered: false, triggered: false }, // NE
        { type: TrapType.DART, position: { x: 4, y: 5 }, discovered: false, triggered: false }, // W
        { type: TrapType.DART, position: { x: 6, y: 5 }, discovered: false, triggered: false }, // E
        { type: TrapType.DART, position: { x: 4, y: 6 }, discovered: false, triggered: false }, // SW
        { type: TrapType.DART, position: { x: 5, y: 6 }, discovered: false, triggered: false }, // S
        { type: TrapType.DART, position: { x: 6, y: 6 }, discovered: false, triggered: false }, // SE
      ]

      const level = {
        ...baseLevel,
        traps,
      }

      const result = service.applySearchingRing(player, level)

      // All 8 traps should be found
      expect(result.trapsFound).toHaveLength(8)
    })

    test('ignores traps/doors outside adjacent range', () => {
      mockRandom = new MockRandom([1])
      service = new RingService(mockRandom)

      const searchingRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Searching',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.SEARCHING,
        effect: 'Auto-detect traps/doors',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
      }

      const player = {
        ...basePlayer,
        position: { x: 5, y: 5 },
        equipment: {
          ...basePlayer.equipment,
          leftRing: searchingRing,
        },
      }

      const trap: Trap = {
        type: TrapType.DART,
        position: { x: 8, y: 8 }, // Far away from player
        discovered: false,
        triggered: false,
      }

      const level = {
        ...baseLevel,
        traps: [trap],
      }

      const result = service.applySearchingRing(player, level)

      expect(result.trapsFound).toEqual([])
    })
  })
})
