import { GameState, DoorState, Position } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService, HungerState } from '@services/HungerService'

// ============================================================================
// MOVE COMMAND - Handle player movement and combat
// ============================================================================

export class MoveCommand implements ICommand {
  constructor(
    private direction: 'up' | 'down' | 'left' | 'right',
    private movementService: MovementService,
    private lightingService: LightingService,
    private fovService: FOVService,
    private messageService: MessageService,
    private combatService?: CombatService,
    private hungerService?: HungerService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // 1. Calculate new position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // 2. Check if walkable
    if (!this.movementService.isWalkable(newPosition, level)) {
      // Check if blocked by a door
      const door = level.doors.find(
        (d) => d.position.x === newPosition.x && d.position.y === newPosition.y
      )

      if (door) {
        // Handle different door states
        if (door.state === DoorState.CLOSED) {
          // Auto-open closed doors (bump-to-open)
          return this.openDoorAndMoveThrough(state, level, door, newPosition)
        }

        if (door.state === DoorState.LOCKED) {
          // Locked door - show message (key system not yet implemented)
          const messages = this.messageService.addMessage(
            state.messages,
            'The door is locked.',
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }

        if (door.state === DoorState.SECRET && !door.discovered) {
          // Undiscovered secret door - appears as wall
          const messages = this.messageService.addMessage(
            state.messages,
            "You can't go that way.",
            'info',
            state.turnCount
          )
          return { ...state, messages }
        }
      }

      // Not a door or other obstacle - regular wall/obstacle message
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // 3. Check for monster - trigger combat
    const monster = this.movementService.getMonsterAt(newPosition, level)
    if (monster) {
      // Combat! Attack the monster
      if (!this.combatService) {
        // Fallback if no combat service provided
        const messages = this.messageService.addMessage(
          state.messages,
          `A ${monster.name} blocks your way!`,
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Execute combat
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
          const updatedMonsters = level.monsters.filter((m) => m.id !== monster.id)
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
            m.id === monster.id ? updatedMonster : m
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

    // 4. Move player
    let player = this.movementService.movePlayer(state.player, newPosition)

    // 5. Tick hunger
    let hungerMessages: string[] = []
    if (this.hungerService) {
      const oldHungerState = this.hungerService.getHungerState(player.hunger)
      player = this.hungerService.tickHunger(player)
      const newHungerState = this.hungerService.getHungerState(player.hunger)

      // Generate hunger warning if state changed
      const hungerWarning = this.hungerService.generateHungerWarning(
        oldHungerState,
        newHungerState
      )
      if (hungerWarning) {
        hungerMessages.push(hungerWarning)
      }

      // Apply starvation damage if starving
      if (newHungerState === HungerState.STARVING) {
        player = this.hungerService.applyStarvationDamage(player)
        hungerMessages.push('You are fainting from hunger!')
      }
    }

    // 6. Tick light fuel
    let updatedPlayer = player
    if (player.equipment.lightSource) {
      const tickedLight = this.lightingService.tickFuel(
        player.equipment.lightSource
      )
      updatedPlayer = {
        ...player,
        equipment: {
          ...player.equipment,
          lightSource: tickedLight,
        },
      }

      // Check for fuel warning
      const warning = this.lightingService.generateFuelWarning(tickedLight)
      if (warning) {
        const messages = this.messageService.addMessage(
          state.messages,
          warning,
          'warning',
          state.turnCount + 1
        )
        return {
          ...state,
          player: updatedPlayer,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    }

    // 7. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(
      newPosition,
      lightRadius,
      level
    )

    // 8. Update explored tiles
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

    // 9. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 10. Add hunger messages if any
    let messages = state.messages
    hungerMessages.forEach((msg) => {
      messages = this.messageService.addMessage(
        messages,
        msg,
        msg.includes('fainting') ? 'critical' : 'warning',
        state.turnCount + 1
      )
    })

    return {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
      messages,
      turnCount: state.turnCount + 1,
    }
  }

  /**
   * Open a closed door and move the player through it
   */
  private openDoorAndMoveThrough(
    state: GameState,
    level: any,
    door: any,
    newPosition: Position
  ): GameState {
    // 1. Update door state to OPEN
    const updatedDoor = { ...door, state: DoorState.OPEN }
    const updatedDoors = level.doors.map((d: any) =>
      d.position.x === door.position.x && d.position.y === door.position.y
        ? updatedDoor
        : d
    )

    // 2. Update tile to be walkable and transparent
    const updatedTiles = level.tiles.map((row: any) => [...row])
    const tile = updatedTiles[door.position.y][door.position.x]
    tile.char = "'"
    tile.walkable = true
    tile.transparent = true

    // 3. Move player through the now-open door
    let player = this.movementService.movePlayer(state.player, newPosition)

    // 3.5. Tick hunger
    let hungerMessages: string[] = []
    if (this.hungerService) {
      const oldHungerState = this.hungerService.getHungerState(player.hunger)
      player = this.hungerService.tickHunger(player)
      const newHungerState = this.hungerService.getHungerState(player.hunger)

      // Generate hunger warning if state changed
      const hungerWarning = this.hungerService.generateHungerWarning(
        oldHungerState,
        newHungerState
      )
      if (hungerWarning) {
        hungerMessages.push(hungerWarning)
      }

      // Apply starvation damage if starving
      if (newHungerState === HungerState.STARVING) {
        player = this.hungerService.applyStarvationDamage(player)
        hungerMessages.push('You are fainting from hunger!')
      }
    }

    // 4. Tick light fuel
    let updatedPlayer = player
    if (player.equipment.lightSource) {
      const tickedLight = this.lightingService.tickFuel(
        player.equipment.lightSource
      )
      updatedPlayer = {
        ...player,
        equipment: {
          ...player.equipment,
          lightSource: tickedLight,
        },
      }

      // Check for fuel warning
      const warning = this.lightingService.generateFuelWarning(tickedLight)
      if (warning) {
        const messages = this.messageService.addMessage(
          state.messages,
          warning,
          'warning',
          state.turnCount + 1
        )

        const levelWithDoor = { ...level, doors: updatedDoors, tiles: updatedTiles }
        const levelsWithDoor = new Map(state.levels)
        levelsWithDoor.set(state.currentLevel, levelWithDoor)

        return {
          ...state,
          player: updatedPlayer,
          levels: levelsWithDoor,
          messages,
          turnCount: state.turnCount + 1,
        }
      }
    }

    // 5. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(
      newPosition,
      lightRadius,
      { ...level, doors: updatedDoors, tiles: updatedTiles }
    )

    // 6. Update explored tiles
    const levelWithDoor = { ...level, doors: updatedDoors, tiles: updatedTiles }
    const updatedLevel = this.fovService.updateExploredTiles(levelWithDoor, visibleCells)

    // 7. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 8. Add message
    let messages = this.messageService.addMessage(
      state.messages,
      'You open the door and move through.',
      'info',
      state.turnCount + 1
    )

    // 9. Add hunger messages if any
    hungerMessages.forEach((msg) => {
      messages = this.messageService.addMessage(
        messages,
        msg,
        msg.includes('fainting') ? 'critical' : 'warning',
        state.turnCount + 1
      )
    })

    return {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
      messages,
      turnCount: state.turnCount + 1,
    }
  }
}
