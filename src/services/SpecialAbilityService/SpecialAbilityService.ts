import { Player, Monster, Armor } from '@game/core/core'
import { IRandomService } from '@services/RandomService'

// ============================================================================
// SPECIAL ABILITY SERVICE - Handle all special monster abilities
// ============================================================================

export interface AbilityResult {
  player?: Player
  monster?: Monster
  messages: string[]
}

export class SpecialAbilityService {
  constructor(private random: IRandomService) {}

  /**
   * Rust armor - Aquator ability
   * Reduces armor AC bonus by 1
   */
  rustArmor(player: Player, _monster: Monster): AbilityResult {
    const messages: string[] = []

    if (!player.equipment.armor) {
      return { player, messages }
    }

    const armor = player.equipment.armor as Armor

    // 50% chance to rust
    if (!this.random.chance(0.5)) {
      return { player, messages }
    }

    // Reduce armor bonus (makes AC worse)
    const rustedArmor: Armor = {
      ...armor,
      bonus: armor.bonus - 1,
    }

    messages.push('Your armor rusts!')

    return {
      player: {
        ...player,
        equipment: {
          ...player.equipment,
          armor: rustedArmor,
        },
      },
      messages,
    }
  }

  /**
   * Freeze player - Ice Monster ability
   * Player loses next turn
   */
  freezePlayer(player: Player): AbilityResult {
    const messages: string[] = []

    // 40% chance to freeze
    if (!this.random.chance(0.4)) {
      return { player, messages }
    }

    messages.push('You are frozen solid!')

    // Note: Actual turn skipping handled by status effect system
    // This would set a "frozen" status effect for 1 turn
    return { player, messages }
  }

  /**
   * Confuse player - Medusa ability
   * Player movements become random for 3-5 turns
   */
  confusePlayer(player: Player): AbilityResult {
    const messages: string[] = []

    // 30% chance to confuse
    if (!this.random.chance(0.3)) {
      return { player, messages }
    }

    messages.push('You feel confused!')

    // Note: Actual confusion handled by status effect system
    // This would set a "confused" status for 3-5 turns
    return { player, messages }
  }

  /**
   * Drain strength - Rattlesnake ability
   * Permanently reduces player strength
   */
  drainStrength(player: Player): AbilityResult {
    const messages: string[] = []

    // 50% chance to drain
    if (!this.random.chance(0.5)) {
      return { player, messages }
    }

    // Can't go below 3
    if (player.strength <= 3) {
      return { player, messages }
    }

    messages.push('You feel weaker!')

    return {
      player: {
        ...player,
        strength: player.strength - 1,
      },
      messages,
    }
  }

  /**
   * Drain XP - Wraith ability
   * Reduces player XP
   */
  drainXP(player: Player): AbilityResult {
    const messages: string[] = []

    // 40% chance to drain
    if (!this.random.chance(0.4)) {
      return { player, messages }
    }

    const drainAmount = this.random.nextInt(10, 50)
    const newXP = Math.max(0, player.xp - drainAmount)

    messages.push('You feel your life force drain away!')

    return {
      player: {
        ...player,
        xp: newXP,
      },
      messages,
    }
  }

  /**
   * Drain max HP - Vampire ability
   * Permanently reduces max HP
   */
  drainMaxHP(player: Player): AbilityResult {
    const messages: string[] = []

    // 30% chance to drain
    if (!this.random.chance(0.3)) {
      return { player, messages }
    }

    // Can't go below 1
    if (player.maxHp <= 1) {
      return { player, messages }
    }

    messages.push('You feel your life essence fade!')

    const newMaxHp = player.maxHp - 1
    const newHp = Math.min(player.hp, newMaxHp)

    return {
      player: {
        ...player,
        hp: newHp,
        maxHp: newMaxHp,
      },
      messages,
    }
  }

  /**
   * Regenerate HP - Griffin, Troll, Vampire ability
   * Heal 1 HP per turn (or every N turns)
   */
  regenerate(monster: Monster): AbilityResult {
    const messages: string[] = []

    // Already at max HP
    if (monster.hp >= monster.maxHp) {
      return { monster, messages }
    }

    return {
      monster: {
        ...monster,
        hp: Math.min(monster.hp + 1, monster.maxHp),
      },
      messages,
    }
  }

  /**
   * Hold player - Venus Flytrap ability
   * Player can't move for 1-2 turns
   */
  holdPlayer(player: Player): AbilityResult {
    const messages: string[] = []

    // 60% chance to hold
    if (!this.random.chance(0.6)) {
      return { player, messages }
    }

    messages.push('The flytrap grabs you!')

    // Note: Actual holding handled by status effect system
    // This would set a "held" status for 1-2 turns
    return { player, messages }
  }

  /**
   * Parse multiple attacks from damage string
   * e.g., "1d2/1d5/1d5" returns ["1d2", "1d5", "1d5"]
   */
  parseMultipleAttacks(damageString: string): string[] {
    return damageString.split('/')
  }

  /**
   * Check if monster has breath weapon
   * Currently only Dragon
   */
  hasBreathWeapon(monster: Monster): boolean {
    return monster.name === 'Dragon'
  }

  /**
   * Calculate breath weapon damage
   * Dragon: 6d6 fire damage
   */
  rollBreathWeaponDamage(monster: Monster): number {
    if (monster.name === 'Dragon') {
      return this.random.roll('6d6')
    }
    return 0
  }

  /**
   * Check if monster should use breath weapon vs melee
   * 40% chance for Dragon
   */
  shouldUseBreathWeapon(monster: Monster): boolean {
    if (!this.hasBreathWeapon(monster)) {
      return false
    }
    return this.random.chance(0.4)
  }

  /**
   * Check if monster has special ability flag
   */
  hasSpecial(monster: Monster, special: string): boolean {
    return monster.aiProfile.special?.includes(special) || false
  }

  /**
   * Apply all on-hit special abilities
   * Called after a monster successfully hits the player
   */
  applyOnHitAbilities(player: Player, monster: Monster): AbilityResult {
    let currentPlayer = player
    const allMessages: string[] = []

    // Check for each special ability
    if (this.hasSpecial(monster, 'rusts_armor')) {
      const result = this.rustArmor(currentPlayer, monster)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'freezes')) {
      const result = this.freezePlayer(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'confuses')) {
      const result = this.confusePlayer(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'drains_strength')) {
      const result = this.drainStrength(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'drains_xp')) {
      const result = this.drainXP(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'drains_max_hp')) {
      const result = this.drainMaxHP(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    if (this.hasSpecial(monster, 'holds')) {
      const result = this.holdPlayer(currentPlayer)
      if (result.player) currentPlayer = result.player
      allMessages.push(...result.messages)
    }

    return {
      player: currentPlayer,
      messages: allMessages,
    }
  }
}
