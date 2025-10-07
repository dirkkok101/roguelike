import { HungerService, HungerState } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'

describe('HungerService - Hunger States', () => {
  let service: HungerService
  let mockRandom: MockRandom
  let ringService: RingService

  beforeEach(() => {
    mockRandom = new MockRandom()
    ringService = new RingService(mockRandom)
    service = new HungerService(mockRandom, ringService)
  })

  describe('getHungerState()', () => {
    test('returns NORMAL when hunger is 301 or above', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(301)).toBe(HungerState.NORMAL)
      expect(service.getHungerState(500)).toBe(HungerState.NORMAL)
      expect(service.getHungerState(1300)).toBe(HungerState.NORMAL)
      expect(service.getHungerState(2000)).toBe(HungerState.NORMAL)
    })

    test('returns HUNGRY when hunger is 300', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(300)).toBe(HungerState.HUNGRY)
    })

    test('returns HUNGRY when hunger is 150', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(150)).toBe(HungerState.HUNGRY)
      expect(service.getHungerState(200)).toBe(HungerState.HUNGRY)
      expect(service.getHungerState(250)).toBe(HungerState.HUNGRY)
    })

    test('returns WEAK when hunger is 149', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(149)).toBe(HungerState.WEAK)
      expect(service.getHungerState(100)).toBe(HungerState.WEAK)
      expect(service.getHungerState(50)).toBe(HungerState.WEAK)
    })

    test('returns WEAK when hunger is 1', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(1)).toBe(HungerState.WEAK)
    })

    test('returns STARVING when hunger is 0', () => {
      // Arrange & Act & Assert
      expect(service.getHungerState(0)).toBe(HungerState.STARVING)
    })
  })

  describe('generateHungerWarning()', () => {
    test('returns "You are getting hungry" when transitioning to HUNGRY', () => {
      // Arrange
      const oldState = HungerState.NORMAL
      const newState = HungerState.HUNGRY

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBe('You are getting hungry')
    })

    test('returns "You are weak from hunger!" when transitioning to WEAK', () => {
      // Arrange
      const oldState = HungerState.HUNGRY
      const newState = HungerState.WEAK

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBe('You are weak from hunger!')
    })

    test('returns "You are fainting!" when transitioning to STARVING', () => {
      // Arrange
      const oldState = HungerState.WEAK
      const newState = HungerState.STARVING

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBe('You are fainting!')
    })

    test('returns null when no state change', () => {
      // Arrange
      const oldState = HungerState.NORMAL
      const newState = HungerState.NORMAL

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBeNull()
    })

    test('returns null when improving hunger state', () => {
      // Arrange & Act & Assert

      // WEAK → HUNGRY (improving)
      expect(
        service.generateHungerWarning(HungerState.WEAK, HungerState.HUNGRY)
      ).toBeNull()

      // HUNGRY → NORMAL (improving)
      expect(
        service.generateHungerWarning(HungerState.HUNGRY, HungerState.NORMAL)
      ).toBeNull()

      // STARVING → WEAK (improving)
      expect(
        service.generateHungerWarning(HungerState.STARVING, HungerState.WEAK)
      ).toBeNull()
    })

    test('returns warning when skipping states (NORMAL → WEAK)', () => {
      // Arrange
      const oldState = HungerState.NORMAL
      const newState = HungerState.WEAK

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBe('You are weak from hunger!')
    })

    test('returns warning when skipping states (HUNGRY → STARVING)', () => {
      // Arrange
      const oldState = HungerState.HUNGRY
      const newState = HungerState.STARVING

      // Act
      const warning = service.generateHungerWarning(oldState, newState)

      // Assert
      expect(warning).toBe('You are fainting!')
    })
  })
})
