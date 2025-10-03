import { GameState } from '@types/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'

// ============================================================================
// MOVE COMMAND - Handle player movement
// ============================================================================

export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // 1. Calculate new position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // 2. Check if walkable
    if (!this.movementService.isWalkable(newPosition, level)) {
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Check for monster
    const monster = this.movementService.getMonsterAt(newPosition, level)
    if (monster) {
      // Combat happens here (Phase 2)
      // For now, just block movement
      const messages = this.messageService.addMessage(
        state.messages,
        `A ${monster.name} blocks your way!`,
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 4. Move player
    const player = this.movementService.movePlayer(state.player, newPosition)

    // 5. Tick hunger (placeholder for Phase 6)
    // const player = hungerService.tick(player)

    // 6. Tick light fuel
    let updatedPlayer = player
    if (player.equipment.lightSource) {
      const tickedLight = this.lightingService.tickFuel(
        player.equipment.lightSource
      )
      updatedPlayer = {
        ...player,
        equipment: {
          ...player.equipment,
          lightSource: tickedLight,
        },
      }

      // Check for fuel warning
      const warning = this.lightingService.generateFuelWarning(tickedLight)
      if (warning) {
        const messages = this.messageService.addMessage(
          state.messages,
          warning,
          'warning',
          state.turnCount + 1
        )
        return {
          ...state,
          player: updatedPlayer,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    }

    // 7. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(
      newPosition,
      lightRadius,
      level
    )

    // 8. Update explored tiles
    const updatedLevel = {
      ...level,
      explored: level.explored.map((row) => [...row]),
    }
    visibleCells.forEach((key) => {
      const pos = this.fovService.keyToPos(key)
      if (updatedLevel.explored[pos.y]) {
        updatedLevel.explored[pos.y][pos.x] = true
      }
    })

    // 9. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    return {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
      turnCount: state.turnCount + 1,
    }
  }
}
