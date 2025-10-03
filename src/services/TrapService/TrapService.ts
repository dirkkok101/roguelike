import { Player, Trap, TrapType, GameState } from '../../types/core/core'
import { IRandomService } from '../RandomService'

// ============================================================================
// TRAP SERVICE - Trap effects and triggering
// ============================================================================

export interface TrapEffect {
  damage: number
  statusEffect?: string
  message: string
}

export class TrapService {
  constructor(private random: IRandomService) {}

  /**
   * Trigger a trap and apply its effects
   */
  triggerTrap(trap: Trap, player: Player, state: GameState): TrapEffect {
    // Mark trap as triggered and discovered
    trap.triggered = true
    trap.discovered = true

    switch (trap.type) {
      case TrapType.BEAR:
        return this.bearTrap(player)
      case TrapType.DART:
        return this.dartTrap(player)
      case TrapType.TELEPORT:
        return this.teleportTrap(player, state)
      case TrapType.SLEEP:
        return this.sleepTrap(player)
      case TrapType.PIT:
        return this.pitTrap(player)
      default:
        return {
          damage: 0,
          message: 'You trigger a trap!',
        }
    }
  }

  /**
   * Bear trap - 1d4 damage, holds player
   */
  private bearTrap(player: Player): TrapEffect {
    const damage = this.random.roll('1d4')
    return {
      damage,
      statusEffect: 'held',
      message: `A bear trap snaps shut on your leg! You take ${damage} damage.`,
    }
  }

  /**
   * Dart trap - 1d6 damage, poison chance
   */
  private dartTrap(player: Player): TrapEffect {
    const damage = this.random.roll('1d6')
    const poisoned = this.random.chance(0.3) // 30% poison chance
    return {
      damage,
      statusEffect: poisoned ? 'poisoned' : undefined,
      message: poisoned
        ? `A poisoned dart hits you! You take ${damage} damage and feel sick.`
        : `A dart hits you for ${damage} damage.`,
    }
  }

  /**
   * Teleport trap - random teleport (no damage)
   */
  private teleportTrap(player: Player, state: GameState): TrapEffect {
    return {
      damage: 0,
      statusEffect: 'teleport',
      message: 'You feel a sudden lurch and find yourself elsewhere!',
    }
  }

  /**
   * Sleep trap - skip turns (no damage)
   */
  private sleepTrap(player: Player): TrapEffect {
    return {
      damage: 0,
      statusEffect: 'asleep',
      message: 'A gas fills the air and you feel drowsy...',
    }
  }

  /**
   * Pit trap - fall damage, potentially fall to next level
   */
  private pitTrap(player: Player): TrapEffect {
    const damage = this.random.roll('2d6')
    const fallThroughChance = 0.2 // 20% chance to fall through to next level

    if (this.random.chance(fallThroughChance)) {
      return {
        damage,
        statusEffect: 'fall_through',
        message: `You fall into a pit and plummet to the level below! You take ${damage} damage.`,
      }
    }

    return {
      damage,
      message: `You fall into a pit and take ${damage} damage.`,
    }
  }

  /**
   * Check if player steps on a trap
   */
  shouldTriggerTrap(trap: Trap): boolean {
    // Already triggered traps don't trigger again
    if (trap.triggered) return false

    // Hidden traps have 100% trigger chance
    // Discovered traps can be avoided (10% trigger chance)
    return trap.discovered ? this.random.chance(0.1) : true
  }
}
