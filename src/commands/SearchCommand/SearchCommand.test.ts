import { SearchCommand } from './SearchCommand'
import { MessageService } from '@services/MessageService'
import { MockRandom } from '@services/RandomService'
import { GameState, DoorState, Door, Player, Trap, TrapType, Position } from '@game/core/core'

describe('SearchCommand', () => {
  let messageService: MessageService
  let mockRandom: MockRandom

  beforeEach(() => {
    messageService = new MessageService()
    mockRandom = new MockRandom()
  })

  function createTestPlayer(
    position: Position = { x: 5, y: 5 },
    level: number = 1
  ): Player {
    return {
      position,
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

  function createTestDoor(
    position: Position,
    state: DoorState,
    discovered: boolean = true
  ): Door {
    return {
      id: `door-${position.x}-${position.y}`,
      position,
      state,
      discovered,
      orientation: 'horizontal',
      connectedRooms: [],
    }
  }

  function createTestTrap(position: Position, discovered: boolean = false): Trap {
    return {
      id: `trap-${position.x}-${position.y}`,
      position,
      type: TrapType.BEAR,
      discovered,
      triggered: false,
    }
  }

  function createTestState(
    player: Player,
    doors: Door[] = [],
    traps: Trap[] = []
  ): GameState {
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
      player,
      levels: new Map([
        [
          1,
          {
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
          },
        ],
      ]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      isGameOver: false,
    }
  }

  describe('Finding secret doors', () => {
    test('discovers adjacent secret door on success', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1]) // chance() returns true (50% base + 5%)

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const door = level.doors[0]

      expect(door.discovered).toBe(true)
      expect(result.messages[0].text).toBe('You found a secret door!')
      expect(result.messages[0].type).toBe('success')
      expect(result.turnCount).toBe(1)
    })

    test('updates tile to show discovered secret door', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      const tile = level.tiles[5][6]

      expect(tile.char).toBe('+')
      expect(tile.walkable).toBe(true)
      expect(tile.transparent).toBe(false)
    })

    test('does not discover secret door on failure', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([0]) // chance() returns false

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.doors[0].discovered).toBe(false)
      expect(result.messages[0].text).toBe('You search but find nothing.')
      expect(result.turnCount).toBe(1)
    })

    test('higher level player has better chance to find secret door', () => {
      const highLevelPlayer = createTestPlayer({ x: 5, y: 5 }, 10)
      const secretDoor = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(highLevelPlayer, [secretDoor])

      // Level 10: 50% + 10*5% = 100% chance
      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].discovered).toBe(true)
    })
  })

  describe('Finding traps', () => {
    test('discovers adjacent trap on success', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const trap = createTestTrap({ x: 6, y: 5 }, false)
      const state = createTestState(player, [], [trap])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      const level = result.levels.get(1)!
      expect(level.traps[0].discovered).toBe(true)
      expect(result.messages[0].text).toContain('You found a')
      expect(result.messages[0].text).toContain('trap!')
      expect(result.turnCount).toBe(1)
    })

    test('does not discover trap on failure', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const trap = createTestTrap({ x: 6, y: 5 }, false)
      const state = createTestState(player, [], [trap])

      mockRandom.setValues([0])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.traps[0].discovered).toBe(false)
      expect(result.messages[0].text).toBe('You search but find nothing.')
    })

    test('does not discover already discovered trap', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const trap = createTestTrap({ x: 6, y: 5 }, true)
      const state = createTestState(player, [], [trap])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      // Should find nothing since trap is already discovered
      expect(result.messages[0].text).toBe('You search but find nothing.')
    })
  })

  describe('Search in all directions', () => {
    test('finds secret door to the left', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 4, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].discovered).toBe(true)
    })

    test('finds secret door above', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 5, y: 4 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].discovered).toBe(true)
    })

    test('finds secret door below', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 5, y: 6 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.doors[0].discovered).toBe(true)
    })

    test('finds trap to the right', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const trap = createTestTrap({ x: 6, y: 5 }, false)
      const state = createTestState(player, [], [trap])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.levels.get(1)!.traps[0].discovered).toBe(true)
    })
  })

  describe('No secrets nearby', () => {
    test('reports finding nothing when no secrets are adjacent', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const state = createTestState(player, [], [])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You search but find nothing.')
      expect(result.turnCount).toBe(1)
    })

    test('reports finding nothing when secret is far away', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 10, y: 10 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result.messages[0].text).toBe('You search but find nothing.')
      expect(result.levels.get(1)!.doors[0].discovered).toBe(false)
    })
  })

  describe('State immutability', () => {
    test('does not mutate original state', () => {
      const player = createTestPlayer({ x: 5, y: 5 })
      const secretDoor = createTestDoor({ x: 6, y: 5 }, DoorState.SECRET, false)
      const state = createTestState(player, [secretDoor])

      mockRandom.setValues([1])

      const command = new SearchCommand(messageService, mockRandom)
      const result = command.execute(state)

      expect(result).not.toBe(state)
      expect(result.levels).not.toBe(state.levels)
      expect(state.levels.get(1)!.doors[0].discovered).toBe(false)
    })
  })
})
