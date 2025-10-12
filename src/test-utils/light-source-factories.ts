import { Torch, Lantern, Artifact, ItemType, Position } from '@game/core/core'

/**
 * Test utility functions for creating light source objects
 * Replaces the removed LightingService.createTorch/createLantern/createArtifact methods
 */

export function createTestTorch(overrides?: Partial<Torch>): Torch {
  const defaultPosition: Position = { x: 0, y: 0 }

  return {
    id: 'test-torch',
    name: 'Torch',
    type: ItemType.TORCH,
    spriteName: 'torch',
    identified: true,
    position: defaultPosition,
    fuel: 500,
    maxFuel: 500,
    radius: 2,
    isPermanent: false,
    ...overrides,
  }
}

export function createTestLantern(overrides?: Partial<Lantern>): Lantern {
  const defaultPosition: Position = { x: 0, y: 0 }

  return {
    id: 'test-lantern',
    name: 'Lantern',
    type: ItemType.LANTERN,
    spriteName: 'lantern',
    identified: true,
    position: defaultPosition,
    fuel: 500,
    maxFuel: 1000,
    radius: 2,
    isPermanent: false,
    ...overrides,
  }
}

export function createTestArtifact(name: string, radius: number, overrides?: Partial<Artifact>): Artifact {
  const defaultPosition: Position = { x: 0, y: 0 }

  return {
    id: 'test-artifact',
    name,
    type: ItemType.TORCH, // Artifacts use TORCH type
    spriteName: 'artifact',
    identified: true,
    position: defaultPosition,
    radius,
    isPermanent: true,
    ...overrides,
  }
}
