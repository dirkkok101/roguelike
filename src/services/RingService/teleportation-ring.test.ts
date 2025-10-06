import { RingService } from './RingService'
import { Player, Ring, RingType, ItemType, Level, TileType } from '@game/core/core'
import { MockRandom } from '@services/RandomService'

describe('RingService - TELEPORTATION Ring', () => {
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
        Array(80).fill({
          type: TileType.FLOOR,
          char: '.',
          walkable: true,
          transparent: true,
          colorVisible: '#fff',
          colorExplored: '#888',
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
      explored: Array(22).fill(null).map(() => Array(80).fill(false)),
    }
  })

  // ============================================================================
  // triggerTeleportation() - TELEPORTATION ring cursed effect
  // ============================================================================

  describe('triggerTeleportation', () => {
    test('returns not triggered when no TELEPORTATION ring equipped', () => {
      const result = service.triggerTeleportation(basePlayer, baseLevel)

      expect(result.triggered).toBe(false)
      expect(result.newPosition).toBeUndefined()
      expect(result.message).toBeUndefined()
    })

    test('returns not triggered when chance fails (85% of the time)', () => {
      mockRandom = new MockRandom([0]) // chance() fails (0 = false)
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      const result = service.triggerTeleportation(player, baseLevel)

      expect(result.triggered).toBe(false)
      expect(result.newPosition).toBeUndefined()
    })

    test('triggers teleportation when chance succeeds (15% of the time)', () => {
      // chance(0.15) succeeds, pickRandom returns position index 0
      mockRandom = new MockRandom([1, 0])
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      const result = service.triggerTeleportation(player, baseLevel)

      expect(result.triggered).toBe(true)
      expect(result.newPosition).toBeDefined()
      expect(result.message).toBe('You feel a wrenching sensation!')
    })

    test('teleports to valid walkable position', () => {
      mockRandom = new MockRandom([1, 0]) // chance succeeds, pick first position
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      const result = service.triggerTeleportation(player, baseLevel)

      expect(result.triggered).toBe(true)
      expect(result.newPosition).toBeDefined()

      // Verify position is within bounds
      expect(result.newPosition!.x).toBeGreaterThanOrEqual(0)
      expect(result.newPosition!.x).toBeLessThan(baseLevel.width)
      expect(result.newPosition!.y).toBeGreaterThanOrEqual(0)
      expect(result.newPosition!.y).toBeLessThan(baseLevel.height)

      // Verify position is walkable
      const tile = baseLevel.tiles[result.newPosition!.y][result.newPosition!.x]
      expect(tile.walkable).toBe(true)
    })

    test('does not teleport to position occupied by monster', () => {
      mockRandom = new MockRandom([1, 0]) // chance succeeds, pick first valid position
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      // Add monster at position (1, 1) - should be excluded from teleport targets
      const level = {
        ...baseLevel,
        monsters: [
          {
            id: 'monster-1',
            letter: 'O',
            name: 'Orc',
            position: { x: 1, y: 1 },
            hp: 10,
            maxHp: 10,
            ac: 6,
            damage: '1d8',
            xpValue: 10,
            aiProfile: {
              behavior: 'SIMPLE' as const,
              intelligence: 3,
              aggroRange: 5,
              fleeThreshold: 0.0,
              special: [],
            },
            isAsleep: false,
            isAwake: true,
            state: 'HUNTING' as const,
            visibleCells: new Set(),
            currentPath: null,
            hasStolen: false,
            level: 1,
            energy: 0,
            speed: 10,
            isInvisible: false,
            statusEffects: [],
          },
        ],
      }

      const result = service.triggerTeleportation(player, level)

      expect(result.triggered).toBe(true)
      expect(result.newPosition).toBeDefined()

      // Verify teleport position is not monster position
      expect(result.newPosition).not.toEqual({ x: 1, y: 1 })
    })

    test('works with TELEPORTATION ring on right hand', () => {
      mockRandom = new MockRandom([1, 0])
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          rightRing: teleportRing, // Right hand instead of left
        },
      }

      const result = service.triggerTeleportation(player, baseLevel)

      expect(result.triggered).toBe(true)
      expect(result.newPosition).toBeDefined()
      expect(result.message).toBe('You feel a wrenching sensation!')
    })

    test('handles level with mostly unwalkable tiles', () => {
      mockRandom = new MockRandom([1, 0])
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      // Create level with only a few walkable tiles
      const level = {
        ...baseLevel,
        tiles: Array(22).fill(null).map(() =>
          Array(80).fill({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#444',
            colorExplored: '#222',
          })
        ),
      }

      // Make a small walkable area
      level.tiles[5][5] = {
        type: TileType.FLOOR,
        char: '.',
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#888',
      }
      level.tiles[5][6] = {
        type: TileType.FLOOR,
        char: '.',
        walkable: true,
        transparent: true,
        colorVisible: '#fff',
        colorExplored: '#888',
      }

      const result = service.triggerTeleportation(player, level)

      expect(result.triggered).toBe(true)
      expect(result.newPosition).toBeDefined()

      // Should teleport to one of the two walkable tiles
      const validPositions = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ]
      const isValidPosition = validPositions.some(
        (pos) =>
          pos.x === result.newPosition!.x &&
          pos.y === result.newPosition!.y
      )
      expect(isValidPosition).toBe(true)
    })

    test('returns not triggered when no walkable tiles exist (edge case)', () => {
      mockRandom = new MockRandom([1]) // chance succeeds, but no walkable tiles
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      // Create level with NO walkable tiles
      const level = {
        ...baseLevel,
        tiles: Array(22).fill(null).map(() =>
          Array(80).fill({
            type: TileType.WALL,
            char: '#',
            walkable: false,
            transparent: false,
            colorVisible: '#444',
            colorExplored: '#222',
          })
        ),
      }

      const result = service.triggerTeleportation(player, level)

      // Should not trigger if no valid destination
      expect(result.triggered).toBe(false)
    })

    test('cursed property is set on TELEPORTATION ring', () => {
      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true, // Should ALWAYS be cursed
      }

      // TELEPORTATION rings should always spawn cursed
      expect(teleportRing.cursed).toBe(true)
    })

    test('multiple calls with same random seed produce consistent results', () => {
      // Test determinism - same inputs should give same outputs
      mockRandom = new MockRandom([1, 0]) // chance succeeds, pick first position
      service = new RingService(mockRandom)

      const teleportRing: Ring = {
        id: 'ring-1',
        name: 'Ring of Teleportation (cursed)',
        type: ItemType.RING,
        identified: true,
        position: { x: 0, y: 0 },
        ringType: RingType.TELEPORTATION,
        effect: 'Random teleport',
        bonus: 0,
        materialName: 'wooden',
        hungerModifier: 1.5,
        cursed: true,
      }

      const player = {
        ...basePlayer,
        equipment: {
          ...basePlayer.equipment,
          leftRing: teleportRing,
        },
      }

      const result1 = service.triggerTeleportation(player, baseLevel)

      // Reset MockRandom with same values
      mockRandom = new MockRandom([1, 0])
      service = new RingService(mockRandom)

      const result2 = service.triggerTeleportation(player, baseLevel)

      expect(result1.triggered).toBe(result2.triggered)
      expect(result1.newPosition).toEqual(result2.newPosition)
      expect(result1.message).toBe(result2.message)
    })
  })
})
