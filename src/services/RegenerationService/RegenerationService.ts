import { Player, RingType } from '@game/core/core'

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const REGEN_CONFIG = {
  BASE_TURNS: 10, // Turns between heals (normal)
  RING_TURNS: 5, // Turns between heals (with ring)
  HUNGER_THRESHOLD: 100, // Minimum hunger for regen
} as const

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface Message {
  text: string
  type: 'info' | 'success' | 'warning' | 'critical' | 'combat'
}

export interface RegenerationTickResult {
  player: Player
  messages: Message[]
  healed: boolean
}

// ============================================================================
// REGENERATION SERVICE - Natural HP regeneration mechanics
// ============================================================================

export class RegenerationService {
  private turnCounter: Map<string, number> = new Map()

  /**
   * Tick regeneration for player
   * Returns player with updated HP if regen triggered
   *
   * Rules:
   * - Base rate: 1 HP every 10 turns
   * - With Ring of Regeneration: 1 HP every 5 turns
   * - Requires: hunger > 100
   * - Blocked by: enemy in FOV (combat)
   * - Only heals when below max HP
   *
   * @param player - Current player state
   * @param inCombat - True if enemy in FOV
   * @returns Result with updated player and messages
   */
  tickRegeneration(player: Player, inCombat: boolean): RegenerationTickResult {
    const messages: Message[] = []

    // 1. Check if regeneration is blocked
    if (inCombat) {
      // Reset counter when in combat (don't accumulate turns)
      this.turnCounter.set('player', 0)
      return { player, messages, healed: false }
    }

    if (player.hunger <= REGEN_CONFIG.HUNGER_THRESHOLD) {
      // Reset counter when starving (don't accumulate turns)
      this.turnCounter.set('player', 0)
      return { player, messages, healed: false }
    }

    if (player.hp >= player.maxHp) {
      // Already at max HP, no need to regen
      return { player, messages, healed: false }
    }

    // 2. Get or initialize turn counter
    const currentTurns = this.turnCounter.get('player') || 0
    const newTurns = currentTurns + 1

    // 3. Check if player has regeneration ring
    const hasRing = this.hasRegenerationRing(player)
    const requiredTurns = hasRing
      ? REGEN_CONFIG.RING_TURNS
      : REGEN_CONFIG.BASE_TURNS

    // 4. Check if regen triggers
    if (newTurns < requiredTurns) {
      // Not enough turns yet, update counter and return
      this.turnCounter.set('player', newTurns)
      return { player, messages, healed: false }
    }

    // 5. Regen triggers! Reset counter and heal 1 HP
    this.turnCounter.set('player', 0)

    const newHp = Math.min(player.maxHp, player.hp + 1)
    const updatedPlayer = {
      ...player,
      hp: newHp,
    }

    return {
      player: updatedPlayer,
      messages,
      healed: true,
    }
  }

  /**
   * Check if player has regeneration ring equipped
   * @param player - Player to check
   * @returns True if ring equipped on either hand
   */
  hasRegenerationRing(player: Player): boolean {
    const leftRing = player.equipment.leftRing
    const rightRing = player.equipment.rightRing

    if (leftRing && leftRing.ringType === RingType.REGENERATION) {
      return true
    }

    if (rightRing && rightRing.ringType === RingType.REGENERATION) {
      return true
    }

    return false
  }

  /**
   * Get current turn count for player (for testing/debugging)
   * @returns Current turn counter value
   */
  getTurnCount(): number {
    return this.turnCounter.get('player') || 0
  }

  /**
   * Reset turn counter (for testing or game state reset)
   */
  resetTurnCounter(): void {
    this.turnCounter.set('player', 0)
  }
}
