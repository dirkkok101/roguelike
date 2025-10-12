import { GameState, Direction, RunState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'

export class RunCommand implements ICommand {
  private messageService: MessageService

  constructor(private direction: Direction) {
    this.messageService = new MessageService()
  }

  execute(state: GameState): GameState {
    console.log('[RunCommand] Execute called', {
      direction: this.direction,
      playerPosition: state.player.position,
      playerHP: state.player.hp,
      turnCount: state.turnCount
    })

    // Check for blocking status effects
    const blockingEffects = state.player.statusEffects.filter(
      (effect) =>
        effect.type === 'CONFUSED' ||
        effect.type === 'BLIND' ||
        effect.type === 'PARALYZED' ||
        effect.type === 'HELD'
    )

    if (blockingEffects.length > 0) {
      console.log('[RunCommand] Blocked by status effect:', blockingEffects[0].type)
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
    if (!currentLevel) {
      console.log('[RunCommand] No current level found')
      return state
    }

    // Build starting FOV monster set
    const startingFOV = new Set<string>()
    for (const monster of currentLevel.monsters) {
      const key = `${monster.position.x},${monster.position.y}`
      if (state.visibleCells.has(key)) {
        startingFOV.add(monster.id)
      }
    }

    console.log('[RunCommand] Starting FOV contains', startingFOV.size, 'monsters')

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

    console.log('[RunCommand] Run initiated', {
      direction: runState.direction,
      startingPosition: runState.startingPosition,
      startingHP: runState.previousHP,
      startingFOVSize: runState.startingFOV.size,
      isRunning: newPlayer.isRunning
    })

    return {
      ...state,
      player: newPlayer
    }
  }
}
