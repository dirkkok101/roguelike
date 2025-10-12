// ============================================================================
// TEST FIXTURES - Shared test data factories
// ============================================================================

import { Torch, Lantern, Artifact, ItemType, Position } from '@game/core/core'

/**
 * Create a test torch with default values
 */
export function createTestTorch(id: string, name: string, options?: {
  fuel?: number
  maxFuel?: number
  radius?: number
  isPermanent?: boolean
  position?: Position
}): Torch | Artifact {
  if (options?.isPermanent) {
    // Return artifact (permanent torch)
    return {
      id,
      name,
      type: ItemType.TORCH,
      identified: true,
      position: options?.position || { x: 0, y: 0 },
      radius: options?.radius ?? 3,
      isPermanent: true,
      spriteName: 'artifact_light',
    }
  }

  // Return regular torch
  return {
    id,
    name,
    type: ItemType.TORCH,
    identified: true,
    position: options?.position || { x: 0, y: 0 },
    fuel: options?.fuel ?? 500,
    maxFuel: options?.maxFuel ?? 500,
    radius: options?.radius ?? 2,
    isPermanent: false,
    spriteName: 'torch',
  }
}

/**
 * Create a test lantern with default values
 */
export function createTestLantern(id: string, name: string, options?: {
  fuel?: number
  maxFuel?: number
  radius?: number
  position?: Position
}): Lantern {
  return {
    id,
    name,
    type: ItemType.LANTERN,
    identified: true,
    position: options?.position || { x: 0, y: 0 },
    fuel: options?.fuel ?? 500,
    maxFuel: options?.maxFuel ?? 500,
    radius: options?.radius ?? 2,
    isPermanent: false,
    spriteName: 'lantern',
  }
}

/**
 * Create a test artifact (permanent light source) with default values
 *
 * Note: Use createTestTorch with isPermanent: true option instead.
 * Artifacts are torches with isPermanent: true in the game's type system.
 *
 * @example
 * const artifact = createTestTorch('staff-1', 'Staff of Light', { isPermanent: true, radius: 3 })
 */
export function createTestArtifact(id: string, name: string, options?: {
  radius?: number
  position?: Position
}): Artifact {
  return createTestTorch(id, name, {
    ...options,
    isPermanent: true,
    radius: options?.radius ?? 3,
  }) as Artifact
}
