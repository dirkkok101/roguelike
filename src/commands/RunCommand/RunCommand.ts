import { GameState, Direction, RunState } from '@game/core/core'
import { MessageService } from '@services/MessageService'

export class RunCommand {
  private messageService: MessageService

  constructor(private direction: Direction) {
    this.messageService = new MessageService()
  }

  execute(state: GameState): GameState {
    // Check for blocking status effects
    const blockingEffects = state.player.statusEffects.filter(
      (effect) =>
        effect.type === 'CONFUSED' ||
        effect.type === 'BLIND' ||
        effect.type === 'PARALYZED' ||
        effect.type === 'HELD'
    )

    if (blockingEffects.length > 0) {
      const messages = this.messageService.addMessage(
        state.messages,
        `You cannot run while ${blockingEffects[0].type.toLowerCase()}!`,
        'warning',
        state.turnCount
      )
      return {
        ...state,
        messages
      }
    }

    // Get current level
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Build starting FOV monster set
    const startingFOV = new Set<string>()
    for (const monster of currentLevel.monsters) {
      const key = `${monster.position.x},${monster.position.y}`
      if (state.visibleCells.has(key)) {
        startingFOV.add(monster.id)
      }
    }

    // Create run state
    const runState: RunState = {
      direction: this.direction,
      startingFOV,
      startingPosition: { ...state.player.position },
      previousHP: state.player.hp
    }

    // Set run state and flag on player
    const newPlayer = {
      ...state.player,
      isRunning: true,
      runState
    }

    return {
      ...state,
      player: newPlayer
    }
  }
}
