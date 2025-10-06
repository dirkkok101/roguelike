import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { RegenerationService } from '@services/RegenerationService'
import { HungerService } from '@services/HungerService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { TurnService } from '@services/TurnService'

// ============================================================================
// REST COMMAND - Rest until HP full or interrupted
// ============================================================================

export class RestCommand implements ICommand {
  constructor(
    private regenerationService: RegenerationService,
    private hungerService: HungerService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private turnService: TurnService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

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

    // Start resting
    let currentState = state
    let turnsRested = 0
    let interrupted = false
    let interruptReason = ''

    // Rest loop - continue until HP full or interrupted
    while (currentState.player.hp < currentState.player.maxHp && !interrupted) {
      // 1. Tick hunger
      const hungerResult = this.hungerService.tickHunger(currentState.player)
      let player = hungerResult.player

      // Check for starvation death
      if (hungerResult.death) {
        let finalMessages = currentState.messages
        hungerResult.messages.forEach((msg) => {
          finalMessages = this.messageService.addMessage(
            finalMessages,
            msg.text,
            msg.type,
            currentState.turnCount + turnsRested + 1
          )
        })
        finalMessages = this.messageService.addMessage(
          finalMessages,
          'You died of starvation while resting!',
          'critical',
          currentState.turnCount + turnsRested + 1
        )

        // Return death state with proper turn increment
        let deathState: GameState = {
          ...currentState,
          player,
          messages: finalMessages,
          isGameOver: true,
          deathCause: hungerResult.death.cause,
        }
        // Increment turns for all turns rested plus the death turn
        for (let i = 0; i <= turnsRested; i++) {
          deathState = this.turnService.incrementTurn(deathState)
        }
        return deathState
      }

      // Check for hunger interruption (starving state)
      if (player.hunger <= 0) {
        interrupted = true
        interruptReason = 'You are too hungry to rest!'
        break
      }

      // 2. Tick regeneration (check combat status)
      const currentLevel = currentState.levels.get(currentState.currentLevel)
      if (!currentLevel) break

      const inCombat = currentLevel.monsters.some((monster) =>
        currentState.visibleCells.has(`${monster.position.x},${monster.position.y}`)
      )

      const regenResult = this.regenerationService.tickRegeneration(player, inCombat)
      player = regenResult.player

      // 3. Tick light fuel
      const fuelResult = this.lightingService.tickFuel(player)
      player = fuelResult.player

      // 4. Update FOV and exploration
      const lightRadius = this.lightingService.getLightRadius(
        player.equipment.lightSource
      )
      const fovResult = this.fovService.updateFOVAndExploration(
        player.position,
        lightRadius,
        currentLevel
      )

      // Update levels map
      const updatedLevels = new Map(currentState.levels)
      updatedLevels.set(currentState.currentLevel, fovResult.level)

      // Update state for next iteration
      currentState = {
        ...currentState,
        player,
        visibleCells: fovResult.visibleCells,
        levels: updatedLevels,
      }

      turnsRested++

      // 5. Check for enemy interruption (monster appears in FOV)
      const enemyInFOV = fovResult.level.monsters.some((monster) =>
        fovResult.visibleCells.has(`${monster.position.x},${monster.position.y}`)
      )

      if (enemyInFOV) {
        interrupted = true
        interruptReason = 'You are interrupted by a nearby enemy!'
        break
      }

      // Safety limit to prevent infinite loops
      if (turnsRested >= 1000) {
        interrupted = true
        interruptReason = 'You wake from your rest.'
        break
      }
    }

    // Generate completion message
    let finalMessages = currentState.messages

    if (turnsRested === 0) {
      // No turns rested (immediate interruption or already at max HP)
      if (interruptReason) {
        finalMessages = this.messageService.addMessage(
          finalMessages,
          interruptReason,
          'warning',
          state.turnCount
        )
      }
      return { ...state, messages: finalMessages }
    }

    // Add rest summary message
    const hpGained = currentState.player.hp - state.player.hp
    let summaryMessage = `Rested for ${turnsRested} turn${turnsRested > 1 ? 's' : ''}. `

    if (currentState.player.hp >= currentState.player.maxHp) {
      summaryMessage += `Fully healed! (${currentState.player.hp}/${currentState.player.maxHp} HP)`
    } else {
      summaryMessage += `Gained ${hpGained} HP. (${currentState.player.hp}/${currentState.player.maxHp} HP)`
    }

    finalMessages = this.messageService.addMessage(
      finalMessages,
      summaryMessage,
      'success',
      state.turnCount + turnsRested
    )

    // Add interruption message if interrupted
    if (interrupted && interruptReason) {
      finalMessages = this.messageService.addMessage(
        finalMessages,
        interruptReason,
        'warning',
        state.turnCount + turnsRested
      )
    }

    // Increment turn count for all turns rested
    let finalState = {
      ...currentState,
      messages: finalMessages,
    }

    for (let i = 0; i < turnsRested; i++) {
      finalState = this.turnService.incrementTurn(finalState)
    }

    return finalState
  }
}
