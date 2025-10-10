import { Player, Monster, Weapon, GameState } from '@game/core/core'
import { IRandomService } from '@services/RandomService'
import { HungerService } from '@services/HungerService'
import { DebugService } from '@services/DebugService'
import { RingService } from '@services/RingService'

// ============================================================================
// COMBAT SERVICE - Original Rogue combat formulas
// ============================================================================

export interface CombatResult {
  hit: boolean
  damage: number
  attacker: string
  defender: string
  killed: boolean
}

export class CombatService {
  constructor(
    private random: IRandomService,
    private ringService: RingService,
    private hungerService?: HungerService,
    private debugService?: DebugService
  ) {}

  /**
   * Player attacks monster
   */
  playerAttack(player: Player, monster: Monster): CombatResult {
    const strengthBonus = this.ringService.getStrengthBonus(player)
    const effectiveStrength = player.strength + strengthBonus

    // Apply hunger penalties if service available
    let toHitModifier = 0
    let damageModifier = 0
    if (this.hungerService) {
      const penalties = this.hungerService.applyHungerEffects(player)
      toHitModifier = penalties.toHitPenalty
      damageModifier = penalties.damagePenalty
    }

    // Calculate strength to-hit bonus (matching original Rogue 1980)
    const strToHitBonus = this.getStrengthToHitBonus(
      effectiveStrength,
      player.strengthPercentile
    )

    const hit = this.calculateHit(
      player.level + strToHitBonus + toHitModifier,
      monster.ac
    )

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: 'Player',
        defender: monster.name,
        killed: false,
      }
    }

    const weapon = player.equipment.weapon
    const baseDamage = this.calculatePlayerDamage(player, weapon)

    // Apply strength damage bonus (matching original Rogue 1980)
    const strDamageBonus = this.getStrengthDamageBonus(
      effectiveStrength,
      player.strengthPercentile
    )

    const damage = Math.max(0, baseDamage + strDamageBonus + damageModifier) // Don't go negative
    const newHp = Math.max(0, monster.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: 'Player',
      defender: monster.name,
      killed,
    }
  }

  /**
   * Monster attacks player
   */
  monsterAttack(monster: Monster, player: Player, state?: GameState): CombatResult {
    // Check god mode - player is invincible
    if (state && this.debugService?.isGodModeActive(state)) {
      return {
        hit: false,
        damage: 0,
        attacker: monster.name,
        defender: 'Player',
        killed: false,
      }
    }

    const acBonus = this.ringService.getACBonus(player)
    const effectiveAC = player.ac - acBonus // Lower AC is better
    const hit = this.calculateHit(monster.level, effectiveAC)

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        attacker: monster.name,
        defender: 'Player',
        killed: false,
      }
    }

    const damage = this.random.roll(monster.damage)
    const newHp = Math.max(0, player.hp - damage)
    const killed = newHp === 0

    return {
      hit: true,
      damage,
      attacker: monster.name,
      defender: 'Player',
      killed,
    }
  }

  /**
   * Apply damage to player
   */
  applyDamageToPlayer(player: Player, damage: number): Player {
    return {
      ...player,
      hp: Math.max(0, player.hp - damage),
    }
  }

  /**
   * Apply damage to monster
   */
  applyDamageToMonster(monster: Monster, damage: number): Monster {
    return {
      ...monster,
      hp: Math.max(0, monster.hp - damage),
    }
  }

  /**
   * Calculate XP reward
   */
  calculateXP(monster: Monster): number {
    return monster.xpValue
  }


  // ============================================================================
  // PRIVATE: Combat formulas (from original Rogue)
  // ============================================================================

  /**
   * Calculate if attack hits
   * Original Rogue formula: roll d20, modified by level and AC
   */
  private calculateHit(attackerLevel: number, defenderAC: number): boolean {
    const roll = this.random.nextInt(1, 20)
    const modifier = attackerLevel - defenderAC
    return roll + modifier >= 10
  }

  /**
   * Calculate player damage with weapon
   */
  private calculatePlayerDamage(_player: Player, weapon: Weapon | null): number {
    if (weapon) {
      const baseDamage = this.random.roll(weapon.damage)
      return baseDamage + weapon.bonus
    }

    // Unarmed: 1d4
    return this.random.roll('1d4')
  }

  /**
   * Calculate strength to-hit bonus (Original Rogue 1980)
   *
   * @param strength - Base strength value (3-31)
   * @param percentile - Exceptional strength percentile (1-100, only for Str 18)
   * @returns To-hit modifier
   *
   * Table:
   * Str ≤6: -1
   * Str 7-16: +0
   * Str 17-18: +1
   * Str 18/51-100: +2
   * Str 18/100: +3
   * Str 19+: +1
   */
  private getStrengthToHitBonus(strength: number, percentile?: number): number {
    // Weak strength penalty
    if (strength <= 6) return -1

    // No bonus for average strength
    if (strength < 17) return 0

    // Exceptional strength (18/XX)
    if (strength === 18 && percentile !== undefined && percentile > 0) {
      if (percentile >= 100) return +3
      if (percentile >= 51) return +2
      return +1  // 1-50
    }

    // Normal high strength (17, 18 without percentile, 19+)
    return +1
  }

  /**
   * Calculate strength damage bonus (Original Rogue 1980)
   *
   * @param strength - Base strength value (3-31)
   * @param percentile - Exceptional strength percentile (1-100, only for Str 18)
   * @returns Damage modifier
   *
   * Table:
   * Str ≤6: -1
   * Str 7-15: +0
   * Str 16-17: +1
   * Str 18: +2
   * Str 18/01-50: +3
   * Str 18/51-75: +4
   * Str 18/76-90: +5
   * Str 18/91-100: +6
   * Str 19-21: +3
   * Str 22-30: +5
   * Str 31: +6
   */
  private getStrengthDamageBonus(strength: number, percentile?: number): number {
    // Weak strength penalty
    if (strength <= 6) return -1

    // No bonus for average strength
    if (strength < 16) return 0

    // Normal bonus (16-17)
    if (strength === 16 || strength === 17) return +1

    // Exceptional strength (18/XX)
    if (strength === 18) {
      // With percentile
      if (percentile !== undefined && percentile > 0) {
        if (percentile >= 91) return +6
        if (percentile >= 76) return +5
        if (percentile >= 51) return +4
        return +3  // 1-50
      }
      // Base 18 with no percentile
      return +2
    }

    // Higher strength ranges
    if (strength >= 19 && strength <= 21) return +3
    if (strength >= 22 && strength <= 30) return +5
    if (strength === 31) return +6

    // Undefined behavior above 31, return 0
    return 0
  }
}
