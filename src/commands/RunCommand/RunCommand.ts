import { GameState, Direction, RunState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

export class RunCommand implements ICommand {
  private messageService: MessageService

  constructor(
    private direction: Direction,
    private recorder: CommandRecorderService,
    private randomService: IRandomService
  ) {
    this.messageService = new MessageService()
  }

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.RUN,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
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
    if (!currentLevel) {
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
