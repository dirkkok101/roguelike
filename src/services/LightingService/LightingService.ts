import { LightSource } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// LIGHTING SERVICE - Light source management and fuel tracking
// ============================================================================

export class LightingService {
  constructor(_random: IRandomService) {
    // Random service will be used in future phases for fuel variations
  }

  /**
   * Tick fuel consumption for a light source (call each turn)
   */
  tickFuel(lightSource: LightSource): LightSource {
    if (lightSource.isPermanent) {
      return lightSource
    }

    if (lightSource.fuel === undefined || lightSource.fuel <= 0) {
      return lightSource
    }

    return {
      ...lightSource,
      fuel: lightSource.fuel - 1,
    }
  }

  /**
   * Refill lantern with oil flask
   */
  refillLantern(lantern: LightSource, oilAmount: number = 500): LightSource {
    if (lantern.type !== 'lantern') {
      throw new Error('Can only refill lanterns')
    }

    const newFuel = Math.min(
      (lantern.fuel || 0) + oilAmount,
      lantern.maxFuel || 1000
    )

    return {
      ...lantern,
      fuel: newFuel,
    }
  }

  /**
   * Get light radius for FOV calculations
   */
  getLightRadius(lightSource: LightSource | null): number {
    if (!lightSource) return 0
    if (lightSource.fuel !== undefined && lightSource.fuel <= 0) return 0
    return lightSource.radius
  }

  /**
   * Check if fuel is running low
   */
  isFuelLow(lightSource: LightSource): boolean {
    if (lightSource.isPermanent) return false
    if (lightSource.fuel === undefined) return false
    return lightSource.fuel < 50
  }

  /**
   * Generate fuel warning message
   */
  generateFuelWarning(lightSource: LightSource): string | null {
    if (lightSource.isPermanent || lightSource.fuel === undefined) {
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

  /**
   * Create a new torch
   */
  createTorch(): LightSource {
    return {
      type: 'torch',
      radius: 1,
      isPermanent: false,
      fuel: 500,
      maxFuel: 500,
      name: 'Torch',
    }
  }

  /**
   * Create a new lantern
   */
  createLantern(): LightSource {
    return {
      type: 'lantern',
      radius: 2,
      isPermanent: false,
      fuel: 500,
      maxFuel: 1000,
      name: 'Lantern',
    }
  }

  /**
   * Create artifact light (permanent)
   */
  createArtifact(name: string, radius: number): LightSource {
    return {
      type: 'artifact',
      radius,
      isPermanent: true,
      name,
    }
  }
}
