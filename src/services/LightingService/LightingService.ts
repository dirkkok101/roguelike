import { Player, Torch, Lantern, Artifact, ItemType } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface Message {
  text: string
  type: 'info' | 'success' | 'warning' | 'critical' | 'combat'
}

export interface FuelTickResult {
  player: Player
  messages: Message[]
}

export interface LanternRefillResult {
  player: Player
  message: string
  success: boolean
}

// ============================================================================
// LIGHTING SERVICE - Light source management and fuel tracking
// ============================================================================

export class LightingService {
  constructor(_random: IRandomService) {
    // Random service will be used in future phases for fuel variations
  }

  /**
   * Tick fuel consumption (call each turn)
   * Returns complete result with player and fuel warning messages
   */
  tickFuel(player: Player): FuelTickResult {
    const messages: Message[] = []

    // No light source equipped
    if (!player.equipment.lightSource) {
      return { player, messages }
    }

    const light = player.equipment.lightSource

    // Permanent light (artifact)
    if (light.isPermanent) {
      return { player, messages }
    }

    // Already out of fuel
    if (light.fuel === undefined || light.fuel <= 0) {
      return { player, messages }
    }

    // Tick fuel
    const tickedLight = { ...light, fuel: light.fuel - 1 }
    const updatedPlayer = {
      ...player,
      equipment: { ...player.equipment, lightSource: tickedLight }
    }

    // Generate warnings with types based on severity
    if (tickedLight.fuel === 0) {
      messages.push({
        text: `Your ${tickedLight.name.toLowerCase()} goes out! You are in darkness!`,
        type: 'critical'
      })
    } else if (tickedLight.fuel === 10) {
      messages.push({
        text: `Your ${tickedLight.name.toLowerCase()} flickers...`,
        type: 'critical'
      })
    } else if (tickedLight.fuel === 50) {
      messages.push({
        text: `Your ${tickedLight.name.toLowerCase()} is getting dim...`,
        type: 'warning'
      })
    }

    return { player: updatedPlayer, messages }
  }

  /**
   * Refill lantern with oil flask (low-level method)
   */
  refillLantern(lantern: Lantern, oilAmount: number = 500): Lantern {
    if (lantern.type !== ItemType.LANTERN) {
      throw new Error('Can only refill lanterns')
    }

    const newFuel = Math.min(
      lantern.fuel + oilAmount,
      lantern.maxFuel
    )

    return {
      ...lantern,
      fuel: newFuel,
    }
  }

  /**
   * Refill player's equipped lantern with oil
   * Returns complete result with player, message, and success status
   */
  refillPlayerLantern(player: Player, oilAmount: number = 500): LanternRefillResult {
    // Check if lantern is equipped
    const lantern = player.equipment.lightSource
    if (!lantern) {
      return {
        player,
        message: 'You do not have a lantern equipped.',
        success: false,
      }
    }

    // Check if it's a lantern (not torch or artifact)
    if (lantern.type !== ItemType.LANTERN) {
      return {
        player,
        message: 'You can only refill lanterns, not other light sources.',
        success: false,
      }
    }

    // Check if lantern is already full
    if (lantern.fuel >= lantern.maxFuel) {
      return {
        player,
        message: 'Your lantern is already full.',
        success: false,
      }
    }

    // Refill lantern (add fuel, cap at maxFuel)
    const oldFuel = lantern.fuel
    const refilledLantern = this.refillLantern(lantern as Lantern, oilAmount)
    const fuelAdded = refilledLantern.fuel! - oldFuel

    const updatedPlayer = {
      ...player,
      equipment: { ...player.equipment, lightSource: refilledLantern },
    }

    return {
      player: updatedPlayer,
      message: `You refill your lantern. (+${fuelAdded} fuel, ${refilledLantern.fuel}/${refilledLantern.maxFuel} total)`,
      success: true,
    }
  }

  /**
   * Get light radius for FOV calculations
   */
  getLightRadius(lightSource: Torch | Lantern | Artifact | null): number {
    if (!lightSource) return 0
    if ('fuel' in lightSource && lightSource.fuel <= 0) return 0
    return lightSource.radius
  }

  /**
   * Check if fuel is running low
   */
  isFuelLow(lightSource: Torch | Lantern | Artifact): boolean {
    if (lightSource.isPermanent) return false
    if (!('fuel' in lightSource)) return false
    return lightSource.fuel < 50
  }

  /**
   * Generate fuel warning message
   */
  generateFuelWarning(lightSource: Torch | Lantern | Artifact): string | null {
    if (lightSource.isPermanent || !('fuel' in lightSource)) {
      return null
    }

    if (lightSource.fuel === 0) {
      return `Your ${lightSource.name.toLowerCase()} goes out! You are in darkness!`
    }

    if (lightSource.fuel === 10) {
      return `Your ${lightSource.name.toLowerCase()} flickers...`
    }

    if (lightSource.fuel === 50) {
      return `Your ${lightSource.name.toLowerCase()} is getting dim...`
    }

    return null
  }

  // Factory methods removed - items are now created directly in DungeonService
  // and other places where they're spawned
}
