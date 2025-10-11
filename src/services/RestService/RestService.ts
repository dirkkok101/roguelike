import { GameState } from '@game/core/core'
import { RegenerationService } from '@services/RegenerationService'
import { HungerService } from '@services/HungerService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'

// ============================================================================
// REST SERVICE - Rest logic (hunger, regen, fuel, interrupts)
// ============================================================================

export interface RestResult {
  state: GameState
  turnsRested: number
  interrupted: boolean
  interruptReason: string
  hpGained: number
  died: boolean
  deathCause?: string
}

export class RestService {
  constructor(
    private regenerationService: RegenerationService,
    private hungerService: HungerService,
    private lightingService: LightingService,
    private fovService: FOVService
  ) {}

  /**
   * Rest until HP full or interrupted
   * Handles hunger, regeneration, fuel consumption, and interruption detection
   */
  rest(state: GameState): RestResult {
    const startingHp = state.player.hp

    let currentState = state
    let turnsRested = 0
    let interrupted = false
    let interruptReason = ''
    let died = false
    let deathCause: string | undefined

    // Rest loop - continue until HP full or interrupted
    while (currentState.player.hp < currentState.player.maxHp && !interrupted) {
      // 1. Tick hunger
      const hungerResult = this.hungerService.tickHunger(currentState.player, currentState)
      let player = hungerResult.player

      // Check for starvation death
      if (hungerResult.death) {
        // Death during rest - need to handle turn increments outside
        died = true
        deathCause = hungerResult.death.cause

        return {
          state: { ...currentState, player },
          turnsRested,
          interrupted: true,
          interruptReason: 'You died of starvation while resting!',
          hpGained: player.hp - startingHp,
          died,
          deathCause,
        }
      }

      // Check for hunger interruption (starving state)
      if (player.hunger <= 0) {
        interrupted = true
        interruptReason = 'You are too hungry to rest!'

        return {
          state: { ...currentState, player },
          turnsRested,
          interrupted,
          interruptReason,
          hpGained: player.hp - startingHp,
          died: false,
        }
      }

      // 2. Tick regeneration (check combat status)
      const currentLevel = currentState.levels.get(currentState.currentLevel)!

      const inCombat = currentLevel.monsters.some((monster) =>
        currentState.visibleCells.has(`${monster.position.x},${monster.position.y}`)
      )

      const regenResult = this.regenerationService.tickRegeneration(player, inCombat)
      player = regenResult.player

      // 3. Tick light fuel
      const fuelResult = this.lightingService.tickFuel(player, currentState)
      player = fuelResult.player

      // 4. Update FOV and exploration
      const lightRadius = this.lightingService.getLightRadius(
        player.equipment.lightSource
      )
      const fovResult = this.fovService.updateFOVAndExploration(
        player.position,
        lightRadius,
        currentLevel,
        player,
        currentState.config
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

    return {
      state: currentState,
      turnsRested,
      interrupted,
      interruptReason,
      hpGained: currentState.player.hp - startingHp,
      died: false,
    }
  }
}
