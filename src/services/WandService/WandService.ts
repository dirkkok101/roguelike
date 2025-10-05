import {
  Player,
  Wand,
  GameState,
} from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface WandEffectResult {
  player: Player
  wand: Wand  // Updated wand with decremented charges
  message: string
  identified: boolean
}

// ============================================================================
// WAND SERVICE - Wand usage and charge management
// ============================================================================

export class WandService {
  constructor(
    private identificationService: IdentificationService
  ) {}

  /**
   * Apply wand effect and return complete result
   * @param targetMonsterId - Optional monster ID for targeted wands
   */
  applyWand(
    player: Player,
    wand: Wand,
    state: GameState,
    targetMonsterId?: string
  ): WandEffectResult {
    // Check if wand has charges
    if (wand.currentCharges === 0) {
      return {
        player,
        wand,
        message: 'The wand has no charges.',
        identified: false,
      }
    }

    // Identify wand by use
    const identified = !this.identificationService.isIdentified(wand.wandType, state)
    const displayName = this.identificationService.getDisplayName(wand, state)

    // Decrement charges
    const updatedWand = { ...wand, currentCharges: wand.currentCharges - 1 }

    // TODO: Implement wand effects (targeting system needed)
    // Wands require targeting system (which monster to zap)
    const message = `You zap ${displayName}. (Effect not yet implemented)`

    return {
      player,
      wand: updatedWand,
      message,
      identified,
    }
  }
}
