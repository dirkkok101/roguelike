import { GameState, DoorState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// SEARCH COMMAND - Find secret doors and traps
// ============================================================================

export class SearchCommand implements ICommand {
  constructor(
    private messageService: MessageService,
    private random: IRandomService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const playerPos = state.player.position
    let foundSomething = false
    let messages = state.messages

    // Check adjacent tiles for secret doors
    const adjacentPositions = [
      { x: playerPos.x - 1, y: playerPos.y }, // Left
      { x: playerPos.x + 1, y: playerPos.y }, // Right
      { x: playerPos.x, y: playerPos.y - 1 }, // Up
      { x: playerPos.x, y: playerPos.y + 1 }, // Down
    ]

    let updatedDoors = [...level.doors]
    let updatedTraps = level.items ? [...level.items] : [] // Traps stored as items for now

    for (const pos of adjacentPositions) {
      // Check for secret doors
      const secretDoor = level.doors.find(
        (d) =>
          d.position.x === pos.x &&
          d.position.y === pos.y &&
          d.state === DoorState.SECRET &&
          !d.discovered
      )

      if (secretDoor) {
        // Intelligence-based chance to find (base 50% + player level * 5%)
        const findChance = 0.5 + state.player.level * 0.05
        if (this.random.chance(findChance)) {
          // Reveal secret door
          const revealedDoor = { ...secretDoor, discovered: true }
          updatedDoors = updatedDoors.map((d) =>
            d.position.x === pos.x && d.position.y === pos.y ? revealedDoor : d
          )

          // Update tile to show door
          const updatedTiles = level.tiles.map((row) => [...row])
          const tile = updatedTiles[pos.y][pos.x]
          tile.char = '+'
          tile.walkable = true
          tile.transparent = false

          messages = this.messageService.addMessage(
            messages,
            'You found a secret door!',
            'success',
            state.turnCount
          )
          foundSomething = true

          // Update level with new tiles
          const updatedLevel = {
            ...level,
            doors: updatedDoors,
            tiles: updatedTiles,
          }
          const updatedLevels = new Map(state.levels)
          updatedLevels.set(state.currentLevel, updatedLevel)

          return {
            ...state,
            levels: updatedLevels,
            messages,
            turnCount: state.turnCount + 1,
          }
        }
      }

      // Check for traps
      const trap = level.traps.find(
        (t) => t.position.x === pos.x && t.position.y === pos.y && !t.discovered
      )

      if (trap) {
        const findChance = 0.5 + state.player.level * 0.05
        if (this.random.chance(findChance)) {
          // Reveal trap
          const updatedTraps = level.traps.map((t) =>
            t.position.x === pos.x && t.position.y === pos.y ? { ...t, discovered: true } : t
          )

          const updatedLevel = { ...level, traps: updatedTraps }
          const updatedLevels = new Map(state.levels)
          updatedLevels.set(state.currentLevel, updatedLevel)

          messages = this.messageService.addMessage(
            messages,
            `You found a ${trap.type.toLowerCase()} trap!`,
            'success',
            state.turnCount
          )
          foundSomething = true

          return {
            ...state,
            levels: updatedLevels,
            messages,
            turnCount: state.turnCount + 1,
          }
        }
      }
    }

    if (!foundSomething) {
      messages = this.messageService.addMessage(
        messages,
        'You search but find nothing.',
        'info',
        state.turnCount
      )
    }

    return {
      ...state,
      messages,
      turnCount: state.turnCount + 1,
    }
  }
}
