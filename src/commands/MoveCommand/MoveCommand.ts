import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'

// ============================================================================
// MOVE COMMAND - Handle player movement and combat
// ============================================================================

export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private combatService?: CombatService
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

    // 3. Check for monster - trigger combat
    const monster = this.movementService.getMonsterAt(newPosition, level)
    if (monster) {
      // Combat! Attack the monster
      if (!this.combatService) {
        // Fallback if no combat service provided
        const messages = this.messageService.addMessage(
          state.messages,
          `A ${monster.name} blocks your way!`,
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Execute combat
      const result = this.combatService.playerAttack(state.player, monster)
      let messages = state.messages

      if (result.hit) {
        messages = this.messageService.addMessage(
          messages,
          `You hit the ${result.defender} for ${result.damage} damage!`,
          'combat',
          state.turnCount
        )

        if (result.killed) {
          messages = this.messageService.addMessage(
            messages,
            `You killed the ${result.defender}!`,
            'success',
            state.turnCount
          )

          // Remove monster and award XP
          const updatedMonsters = level.monsters.filter((m) => m.id !== monster.id)
          const xp = this.combatService.calculateXP(monster)

          const updatedLevel = { ...level, monsters: updatedMonsters }
          const updatedLevels = new Map(state.levels)
          updatedLevels.set(state.currentLevel, updatedLevel)

          return {
            ...state,
            player: { ...state.player, xp: state.player.xp + xp },
            levels: updatedLevels,
            messages,
            turnCount: state.turnCount + 1,
          }
        } else {
          // Apply damage to monster
          const updatedMonster = this.combatService.applyDamageToMonster(
            monster,
            result.damage
          )
          const updatedMonsters = level.monsters.map((m) =>
            m.id === monster.id ? updatedMonster : m
          )

          const updatedLevel = { ...level, monsters: updatedMonsters }
          const updatedLevels = new Map(state.levels)
          updatedLevels.set(state.currentLevel, updatedLevel)

          return {
            ...state,
            levels: updatedLevels,
            messages,
            turnCount: state.turnCount + 1,
          }
        }
      } else {
        messages = this.messageService.addMessage(
          messages,
          `You miss the ${result.defender}.`,
          'combat',
          state.turnCount
        )

        return {
          ...state,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
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
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

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
