import { RegenerationService } from './RegenerationService'
import { RingService } from '@services/RingService'
import { Player } from '@game/core/core'

describe('RegenerationService - Progression Integration', () => {
  let service: RegenerationService
  let ringService: RingService
  let basePlayer: Player

  beforeEach(() => {
    ringService = new RingService()
    service = new RegenerationService(ringService)
    service.resetTurnCounter()

    basePlayer = {
      name: 'Test',
      x: 5,
      y: 5,
      hp: 50,
      maxHp: 100,
      strength: 16,
      level: 10,
      xp: 0,
      gold: 0,
      armor: 5,
      hunger: 1000,
      turnsSinceLastRest: 0,
      equipment: {
        weapon: null,
        armor: null,
        leftRing: null,
        rightRing: null,
        lightSource: null
      },
      inventory: []
    }
  })

  test('depth 1 regenerates 20 HP in 200 turns (10 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 1)
      player = result.player
    }

    expect(player.hp).toBe(70) // 50 + 20 HP
  })

  test('depth 26 regenerates 40 HP in 200 turns (5 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 26)
      player = result.player
    }

    expect(player.hp).toBe(90) // 50 + 40 HP (2× faster)
  })

  test('depth 13 regenerates 25 HP in 200 turns (8 turns/HP)', () => {
    let player = { ...basePlayer, hp: 50 }

    for (let i = 0; i < 200; i++) {
      const result = service.tickRegeneration(player, false, 13)
      player = result.player
    }

    // calculateRegenTurns(13) = max(5, 10 - floor(13 * 0.2)) = 8 turns/HP
    // floor(200 / 8) = 25 heals
    expect(player.hp).toBe(75) // 50 + 25 HP
  })

  test('regeneration stops at maxHp regardless of depth', () => {
    let player = { ...basePlayer, hp: 95, maxHp: 100 }

    for (let i = 0; i < 100; i++) {
      const result = service.tickRegeneration(player, false, 26)
      player = result.player
    }

    expect(player.hp).toBe(100) // Capped at maxHp
  })

  test('depth 26 is 50% faster than depth 1', () => {
    const turns1 = (service as any).calculateRegenTurns(1)
    const turns26 = (service as any).calculateRegenTurns(26)

    expect(turns26).toBe(5)
    expect(turns1).toBe(10)
    expect(turns26 / turns1).toBe(0.5) // 50% of original time
  })
})
