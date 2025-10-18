import { SearchService } from './SearchService'
import { DoorService } from '@services/DoorService'
import { MockRandom } from '@services/RandomService'
import { Player, Level, Door, DoorState, Position } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('SearchService - Secret Door Detection', () => {
  let service: SearchService
  let doorService: DoorService
  let mockRandom: MockRandom

  beforeEach(() => {
    mockRandom = new MockRandom()
    doorService = new DoorService()
    service = new SearchService(mockRandom, doorService)
  })

  function createTestPlayer(level: number = 1): Player {
    return {
      position: { x: 5, y: 5 },
      hp: 20,
      maxHp: 20,
      strength: 16,
      maxStrength: 16,
      ac: 5,
      level,
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
    }
  }

  function createTestLevel(doors: Door[] = []): Level {
    const tiles = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: 'FLOOR' as const,
            char: '.',
            walkable: true,
            transparent: true,
            visible: false,
            explored: false,
            lit: false,
          }))
      )

    return {
      depth: 1,
      width: 20,
      height: 20,
      tiles,
      rooms: [],
      monsters: [],
      items: [],
      gold: [],
      traps: [],
      doors,
      upStairs: null,
      downStairs: null,
    }
  }

  function createSecretDoor(position: Position, discovered: boolean = false): Door {
    return {
      id: `door-${position.x}-${position.y}`,
      position,
      state: DoorState.SECRET,
      discovered,
      orientation: 'horizontal',
      connectedRooms: [],
    }
  }

  describe('calculateFindChance', () => {
    test('level 1 player has 55% chance (50% + 5%)', () => {
      const player = createTestPlayer(1)
      const level = createTestLevel()
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const levelWithDoor = { ...level, doors: [secretDoor] }

      // Access private method via any cast for testing
      const chance = (service as any).calculateFindChance(player.level)
      expect(chance).toBe(0.55)
    })

    test('level 5 player has 75% chance (50% + 25%)', () => {
      const player = createTestPlayer(5)
      const chance = (service as any).calculateFindChance(player.level)
      expect(chance).toBe(0.75)
    })

    test('level 10 player has 100% chance (50% + 50%)', () => {
      const player = createTestPlayer(10)
      const chance = (service as any).calculateFindChance(player.level)
      expect(chance).toBe(1.0)
    })

    test('level 20 player has >100% chance (capped by random.chance)', () => {
      const player = createTestPlayer(20)
      const chance = (service as any).calculateFindChance(player.level)
      expect(chance).toBe(1.5) // Formula allows > 1.0, but random.chance handles it
    })
  })

  describe('getAdjacentPositions', () => {
    test('returns 4 cardinal direction positions', () => {
      const center = { x: 5, y: 5 }
      const adjacent = (service as any).getAdjacentPositions(center)

      expect(adjacent).toHaveLength(4)
      expect(adjacent).toContainEqual({ x: 4, y: 5 }) // Left
      expect(adjacent).toContainEqual({ x: 6, y: 5 }) // Right
      expect(adjacent).toContainEqual({ x: 5, y: 4 }) // Up
      expect(adjacent).toContainEqual({ x: 5, y: 6 }) // Down
    })

    test('handles edge positions correctly', () => {
      const edge = { x: 0, y: 0 }
      const adjacent = (service as any).getAdjacentPositions(edge)

      expect(adjacent).toHaveLength(4)
      expect(adjacent).toContainEqual({ x: -1, y: 0 }) // Left (out of bounds)
      expect(adjacent).toContainEqual({ x: 1, y: 0 }) // Right
      expect(adjacent).toContainEqual({ x: 0, y: -1 }) // Up (out of bounds)
      expect(adjacent).toContainEqual({ x: 0, y: 1 }) // Down
    })
  })

  describe('searchForSecrets - secret doors', () => {
    test('finds secret door to the right on success', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1]) // chance() returns true

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.type).toBe('door')
      expect(result.position).toEqual({ x: 6, y: 5 })
      expect(result.message).toBe('You found a secret door!')
      expect(result.updatedLevel.doors[0].discovered).toBe(true)
    })

    test('finds secret door to the left', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 4, y: 5 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 4, y: 5 })
    })

    test('finds secret door above', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 5, y: 4 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 5, y: 4 })
    })

    test('finds secret door below', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 5, y: 6 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 5, y: 6 })
    })

    test('does not find secret door on failure', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([0]) // chance() returns false

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.type).toBe(null)
      expect(result.message).toBe('You search but find nothing.')
      expect(result.updatedLevel.doors[0].discovered).toBe(false)
    })

    test('ignores already discovered secret doors', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const discoveredDoor = createSecretDoor({ x: 6, y: 5 }, true)
      const level = createTestLevel([discoveredDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.message).toBe('You search but find nothing.')
    })

    test('ignores non-secret doors', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const closedDoor: Door = {
        id: 'door-1',
        position: { x: 6, y: 5 },
        state: DoorState.CLOSED,
        discovered: true,
        orientation: 'horizontal',
        connectedRooms: [],
      }
      const level = createTestLevel([closedDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
    })

    test('does not find door that is too far away', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 10, y: 10 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.updatedLevel.doors[0].discovered).toBe(false)
    })

    test('updates tile when revealing secret door (via DoorService)', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const level = createTestLevel([secretDoor])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      const tile = result.updatedLevel.tiles[5][6]
      expect(tile.char).toBe('+')
      expect(tile.walkable).toBe(true)
      expect(tile.transparent).toBe(false)
    })
  })

  describe('searchForSecrets - nothing found', () => {
    test('returns "nothing found" result when no secrets nearby', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const level = createTestLevel([])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.type).toBe(null)
      expect(result.position).toBe(null)
      expect(result.message).toBe('You search but find nothing.')
      expect(result.updatedLevel).toBe(level) // No changes
    })
  })

  describe('immutability', () => {
    test('does not mutate original level when finding secret door', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const level = createTestLevel([secretDoor])
      const originalDoorDiscovered = level.doors[0].discovered

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.updatedLevel).not.toBe(level)
      expect(result.updatedLevel.doors).not.toBe(level.doors)
      expect(level.doors[0].discovered).toBe(originalDoorDiscovered) // Original unchanged
    })

    test('does not mutate original level when finding nothing', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const level = createTestLevel([])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.updatedLevel).toBe(level) // Same reference when no changes
    })
  })
})
