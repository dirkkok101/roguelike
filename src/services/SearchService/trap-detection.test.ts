import { SearchService } from './SearchService'
import { DoorService } from '@services/DoorService'
import { MockRandom } from '@services/RandomService'
import { Player, Level, Trap, TrapType, Position, Door, DoorState } from '@game/core/core'
import { createTestPlayer } from '@test-helpers'

describe('SearchService - Trap Detection', () => {
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

  function createTestLevel(traps: Trap[] = [], doors: Door[] = []): Level {
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
      traps,
      doors,
      upStairs: null,
      downStairs: null,
    }
  }

  function createTrap(
    position: Position,
    type: TrapType = TrapType.BEAR,
    discovered: boolean = false
  ): Trap {
    return {
      id: `trap-${position.x}-${position.y}`,
      position,
      type,
      discovered,
      triggered: false,
    }
  }

  function createSecretDoor(position: Position): Door {
    return {
      id: `door-${position.x}-${position.y}`,
      position,
      state: DoorState.SECRET,
      discovered: false,
      orientation: 'horizontal',
      connectedRooms: [],
    }
  }

  describe('searchForSecrets - traps', () => {
    test('finds trap to the right on success', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 6, y: 5 }, TrapType.BEAR)
      const level = createTestLevel([trap])

      mockRandom.setValues([1]) // chance() returns true

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.type).toBe('trap')
      expect(result.position).toEqual({ x: 6, y: 5 })
      expect(result.message).toBe('You found a bear trap!')
      expect(result.updatedLevel.traps[0].discovered).toBe(true)
    })

    test('finds trap to the left', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 4, y: 5 }, TrapType.DART)
      const level = createTestLevel([trap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 4, y: 5 })
      expect(result.message).toBe('You found a dart trap!')
    })

    test('finds trap above', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 5, y: 4 }, TrapType.PIT)
      const level = createTestLevel([trap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 5, y: 4 })
      expect(result.message).toBe('You found a pit trap!')
    })

    test('finds trap below', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 5, y: 6 }, TrapType.TELEPORT)
      const level = createTestLevel([trap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.position).toEqual({ x: 5, y: 6 })
      expect(result.message).toBe('You found a teleport trap!')
    })

    test('does not find trap on failure', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 6, y: 5 })
      const level = createTestLevel([trap])

      mockRandom.setValues([0]) // chance() returns false

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.type).toBe(null)
      expect(result.message).toBe('You search but find nothing.')
      expect(result.updatedLevel.traps[0].discovered).toBe(false)
    })

    test('ignores already discovered traps', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const discoveredTrap = createTrap({ x: 6, y: 5 }, TrapType.BEAR, true)
      const level = createTestLevel([discoveredTrap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.message).toBe('You search but find nothing.')
    })

    test('does not find trap that is too far away', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 10, y: 10 })
      const level = createTestLevel([trap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(false)
      expect(result.updatedLevel.traps[0].discovered).toBe(false)
    })

    test('formats trap message with lowercase trap type', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 6, y: 5 }, TrapType.BEAR)
      const level = createTestLevel([trap])

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.message).toBe('You found a bear trap!')
      expect(result.message).not.toContain('BEAR') // Uppercase check
    })
  })

  describe('priority - secret doors before traps', () => {
    test('finds secret door when both door and trap are adjacent', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const trap = createTrap({ x: 5, y: 6 })
      const level = createTestLevel([trap], [secretDoor])

      mockRandom.setValues([1, 1]) // Both would be found

      const result = service.searchForSecrets(player, playerPos, level)

      // Should find door first (priority)
      expect(result.found).toBe(true)
      expect(result.type).toBe('door')
      expect(result.message).toBe('You found a secret door!')
    })

    test('finds trap when door check fails but trap check succeeds', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const secretDoor = createSecretDoor({ x: 6, y: 5 })
      const trap = createTrap({ x: 5, y: 6 })
      const level = createTestLevel([trap], [secretDoor])

      mockRandom.setValues([0, 1]) // Door fails, trap succeeds

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.found).toBe(true)
      expect(result.type).toBe('trap')
      expect(result.message).toContain('trap!')
    })
  })

  describe('immutability', () => {
    test('does not mutate original level when finding trap', () => {
      const player = createTestPlayer(1)
      const playerPos = { x: 5, y: 5 }
      const trap = createTrap({ x: 6, y: 5 })
      const level = createTestLevel([trap])
      const originalTrapDiscovered = level.traps[0].discovered

      mockRandom.setValues([1])

      const result = service.searchForSecrets(player, playerPos, level)

      expect(result.updatedLevel).not.toBe(level)
      expect(result.updatedLevel.traps).not.toBe(level.traps)
      expect(level.traps[0].discovered).toBe(originalTrapDiscovered) // Original unchanged
    })
  })

  describe('revealTrap', () => {
    test('marks trap as discovered', () => {
      const trap = createTrap({ x: 5, y: 5 })
      const level = createTestLevel([trap])

      const updatedLevel = (service as any).revealTrap(level, trap)

      expect(updatedLevel.traps[0].discovered).toBe(true)
    })

    test('does not affect other traps', () => {
      const trap1 = createTrap({ x: 5, y: 5 })
      const trap2 = createTrap({ x: 6, y: 6 })
      const level = createTestLevel([trap1, trap2])

      const updatedLevel = (service as any).revealTrap(level, trap1)

      expect(updatedLevel.traps[0].discovered).toBe(true)
      expect(updatedLevel.traps[1].discovered).toBe(false)
    })

    test('returns new level object (immutability)', () => {
      const trap = createTrap({ x: 5, y: 5 })
      const level = createTestLevel([trap])

      const updatedLevel = (service as any).revealTrap(level, trap)

      expect(updatedLevel).not.toBe(level)
      expect(updatedLevel.traps).not.toBe(level.traps)
    })
  })
})
