import { GameState } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MessageService } from '@services/MessageService'
import { DungeonService, DungeonConfig } from '@services/DungeonService'
import { FOVService } from '@services/FOVService'
import { LightingService } from '@services/LightingService'
import { VictoryService } from '@services/VictoryService'

// ============================================================================
// MOVE STAIRS COMMAND - Navigate between dungeon levels
// ============================================================================

export class MoveStairsCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down',
    private dungeonService: DungeonService,
    private dungeonConfig: DungeonConfig,
    private fovService: FOVService,
    private lightingService: LightingService,
    private messageService: MessageService,
    private victoryService: VictoryService
  ) {}

  execute(state: GameState): GameState {
    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Check if player is on stairs
    const playerPos = state.player.position

    if (this.direction === 'down') {
      // Check for stairs down
      if (
        !currentLevel.stairsDown ||
        playerPos.x !== currentLevel.stairsDown.x ||
        playerPos.y !== currentLevel.stairsDown.y
      ) {
        const messages = this.messageService.addMessage(
          state.messages,
          'There are no stairs down here.',
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Go down
      const newDepth = state.currentLevel + 1

      // Check for max depth
      if (newDepth > 26) {
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot go any deeper!',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      return this.moveToLevel(state, newDepth, 'down')
    } else {
      // Check for stairs up
      if (
        !currentLevel.stairsUp ||
        playerPos.x !== currentLevel.stairsUp.x ||
        playerPos.y !== currentLevel.stairsUp.y
      ) {
        const messages = this.messageService.addMessage(
          state.messages,
          'There are no stairs up here.',
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Go up
      const newDepth = state.currentLevel - 1

      // Check for min depth
      if (newDepth < 1) {
        const messages = this.messageService.addMessage(
          state.messages,
          'You cannot go any higher! You need to find the Amulet first.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      return this.moveToLevel(state, newDepth, 'up')
    }
  }

  private moveToLevel(
    state: GameState,
    newDepth: number,
    direction: 'up' | 'down'
  ): GameState {
    // Check if level exists, if not generate it
    let level = state.levels.get(newDepth)
    const levels = new Map(state.levels)

    if (!level) {
      // Generate new level
      level = this.dungeonService.generateLevel(newDepth, this.dungeonConfig)
      levels.set(newDepth, level)
    }

    // Determine spawn position (opposite stairs)
    const spawnPos =
      direction === 'down'
        ? level.stairsUp || this.getRandomFloor(level)
        : level.stairsDown || this.getRandomFloor(level)

    // Update player position
    const updatedPlayer = { ...state.player, position: spawnPos }

    // Compute FOV for new position
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(spawnPos, lightRadius, level)

    // Mark visible tiles as explored
    const updatedLevel = {
      ...level,
      explored: level.explored.map((row, y) =>
        row.map((explored, x) => {
          const key = `${x},${y}`
          return explored || visibleCells.has(key)
        })
      ),
    }
    levels.set(newDepth, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      direction === 'down'
        ? `You descend to level ${newDepth}.`
        : `You climb to level ${newDepth}.`,
      'info',
      state.turnCount
    )

    // Create new state after level change
    const newState = {
      ...state,
      player: updatedPlayer,
      currentLevel: newDepth,
      levels,
      visibleCells,
      messages,
      turnCount: state.turnCount + 1,
    }

    // Check victory condition after moving to new level
    if (this.victoryService.checkVictory(newState)) {
      return {
        ...newState,
        hasWon: true,
        isGameOver: true,
        messages: this.messageService.addMessage(
          newState.messages,
          'You have escaped with the Amulet of Yendor! You win!',
          'success',
          newState.turnCount
        ),
      }
    }

    return newState
  }

  private getRandomFloor(level: any): { x: number; y: number } {
    // Fallback: return center of first room
    if (level.rooms.length > 0) {
      const room = level.rooms[0]
      return {
        x: room.x + Math.floor(room.width / 2),
        y: room.y + Math.floor(room.height / 2),
      }
    }
    // Ultimate fallback
    return { x: Math.floor(level.width / 2), y: Math.floor(level.height / 2) }
  }
}
