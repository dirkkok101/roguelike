import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { RestService } from '@services/RestService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'
import { CommandRecorderService } from '@services/CommandRecorderService'
import { IRandomService } from '@services/RandomService'
import { COMMAND_TYPES } from '@game/replay/replay'

// ============================================================================
// REST COMMAND - Rest until HP full or interrupted
// ============================================================================

export class RestCommand implements ICommand {
  constructor(
    private restService: RestService,
    private messageService: MessageService,
    private turnService: TurnService,

    private recorder: CommandRecorderService,

    private randomService: IRandomService
  ) {}

  execute(state: GameState): GameState {
    // STEP 1: Record command BEFORE execution (for deterministic replay)
    this.recorder.recordCommand({
      turnNumber: state.turnCount,
      timestamp: Date.now(),
      commandType: COMMAND_TYPES.REST,
      actorType: 'player',
      payload: {},
      rngState: this.randomService.getState(),
    })

    // STEP 2: Execute normally (existing logic unchanged)
    // Check for valid level
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) {
      return state
    }

    // Check if already at max HP
    if (state.player.hp >= state.player.maxHp) {
      const messages = this.messageService.addMessage(
        state.messages,
        'You are already at full health.',
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Delegate rest logic to service
    const result = this.restService.rest(state)

    // Handle death case
    if (result.died) {
      let finalMessages = result.state.messages
      finalMessages = this.messageService.addMessage(
        finalMessages,
        result.interruptReason,
        'critical',
        state.turnCount + result.turnsRested + 1
      )

      let deathState: GameState = {
        ...result.state,
        messages: finalMessages,
        isGameOver: true,
        deathCause: result.deathCause,
      }

      // Increment turns for all turns rested plus the death turn
      for (let i = 0; i <= result.turnsRested; i++) {
        deathState = this.turnService.incrementTurn(deathState)
      }

      return deathState
    }

    // Handle no-rest case (immediate interruption)
    if (result.turnsRested === 0) {
      if (result.interruptReason) {
        const messages = this.messageService.addMessage(
          state.messages,
          result.interruptReason,
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }
      return state
    }

    // Generate success message
    let finalMessages = result.state.messages
    let summaryMessage = `Rested for ${result.turnsRested} turn${result.turnsRested > 1 ? 's' : ''}. `

    if (result.state.player.hp >= result.state.player.maxHp) {
      summaryMessage += `Fully healed! (${result.state.player.hp}/${result.state.player.maxHp} HP)`
    } else {
      summaryMessage += `Gained ${result.hpGained} HP. (${result.state.player.hp}/${result.state.player.maxHp} HP)`
    }

    finalMessages = this.messageService.addMessage(
      finalMessages,
      summaryMessage,
      'success',
      state.turnCount + result.turnsRested
    )

    // Add interruption message if interrupted
    if (result.interrupted && result.interruptReason) {
      finalMessages = this.messageService.addMessage(
        finalMessages,
        result.interruptReason,
        'warning',
        state.turnCount + result.turnsRested
      )
    }

    // Increment turn count for all turns rested
    let finalState = {
      ...result.state,
      messages: finalMessages,
    }

    for (let i = 0; i < result.turnsRested; i++) {
      finalState = this.turnService.incrementTurn(finalState)
    }

    return finalState
  }
}
