import { GameState, Monster } from '../types/core/core'
import { ICommand } from './ICommand'
import { CombatService } from '../services/CombatService'
import { MessageService } from '../services/MessageService'

// ============================================================================
// ATTACK COMMAND - Player attacks monster
// ============================================================================

export class AttackCommand implements ICommand {
  constructor(
    private monsterId: string,
    private combatService: CombatService,
    private messageService: MessageService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    const monster = level.monsters.find((m) => m.id === this.monsterId)
    if (!monster) return state

    // Player attacks
    const result = this.combatService.playerAttack(state.player, monster)

    let messages = state.messages

    if (result.hit) {
      messages = this.messageService.addMessage(
        messages,
        `You hit the ${result.defender} for ${result.damage} damage!`,
        'combat',
        state.turnCount
      )

      if (result.killed) {
        messages = this.messageService.addMessage(
          messages,
          `You killed the ${result.defender}!`,
          'success',
          state.turnCount
        )

        // Remove monster and award XP
        const updatedMonsters = level.monsters.filter((m) => m.id !== this.monsterId)
        const xp = this.combatService.calculateXP(monster)

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return {
          ...state,
          player: { ...state.player, xp: state.player.xp + xp },
          levels: updatedLevels,
          messages,
          turnCount: state.turnCount + 1,
        }
      } else {
        // Apply damage to monster
        const updatedMonster = this.combatService.applyDamageToMonster(
          monster,
          result.damage
        )
        const updatedMonsters = level.monsters.map((m) =>
          m.id === this.monsterId ? updatedMonster : m
        )

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return {
          ...state,
          levels: updatedLevels,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    } else {
      messages = this.messageService.addMessage(
        messages,
        `You miss the ${result.defender}.`,
        'combat',
        state.turnCount
      )

      return {
        ...state,
        messages,
        turnCount: state.turnCount + 1,
      }
    }
  }
}
