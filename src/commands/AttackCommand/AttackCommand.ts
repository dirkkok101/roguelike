import { GameState, Monster } from '@game/core/core'
import { ICommand } from '../ICommand'
import { CombatService } from '@services/CombatService'
import { MessageService } from '@services/MessageService'
import { LevelingService } from '@services/LevelingService'

// ============================================================================
// ATTACK COMMAND - Player attacks monster
// ============================================================================

export class AttackCommand implements ICommand {
  constructor(
    private monsterId: string,
    private combatService: CombatService,
    private messageService: MessageService,
    private levelingService: LevelingService
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
        const xpReward = this.levelingService.calculateXPReward(monster)

        // Add XP and check for level-up
        const xpResult = this.levelingService.addExperience(state.player, xpReward)
        let updatedPlayer = xpResult.player

        // Add XP gain message
        messages = this.messageService.addMessage(
          messages,
          `You gain ${xpReward} experience points.`,
          'success',
          state.turnCount
        )

        // Handle level-up if it occurred
        if (xpResult.leveledUp) {
          updatedPlayer = this.levelingService.levelUp(updatedPlayer)
          messages = this.messageService.addMessage(
            messages,
            `You have reached level ${updatedPlayer.level}!`,
            'success',
            state.turnCount
          )
          messages = this.messageService.addMessage(
            messages,
            `Your max HP increases to ${updatedPlayer.maxHp}!`,
            'success',
            state.turnCount
          )
        }

        const updatedLevel = { ...level, monsters: updatedMonsters }
        const updatedLevels = new Map(state.levels)
        updatedLevels.set(state.currentLevel, updatedLevel)

        return {
          ...state,
          player: updatedPlayer,
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
