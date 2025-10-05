import { GameState, DoorState, Position, Level, Monster } from '@game/core/core'
import { ICommand } from '../ICommand'
import { MovementService } from '@services/MovementService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { MessageService } from '@services/MessageService'
import { CombatService } from '@services/CombatService'
import { HungerService, HungerState } from '@services/HungerService'
import { NotificationService } from '@services/NotificationService'
import { LevelingService } from '@services/LevelingService'
import { DoorService } from '@services/DoorService'
import { AttackCommand } from '../AttackCommand'

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
    private combatService: CombatService,
    private levelingService: LevelingService,
    private doorService: DoorService,
    private hungerService?: HungerService,
    private notificationService?: NotificationService
  ) {}

  execute(state: GameState): GameState {
    const level = state.levels.get(state.currentLevel)
    if (!level) return state

    // Calculate target position
    const newPosition = this.movementService.applyDirection(
      state.player.position,
      this.direction
    )

    // Detect obstacle
    const obstacle = this.detectObstacle(newPosition, level)

    // ROUTE 1: Monster → Delegate to AttackCommand (early return)
    if (obstacle.type === 'monster') {
      const attackCommand = new AttackCommand(
        obstacle.data.id,
        this.combatService,
        this.messageService,
        this.levelingService
      )
      return attackCommand.execute(state)
      // AttackCommand handles: combat, XP, level-up, messages, turn increment
      // No hunger/fuel tick (correct - no movement)
    }

    // ROUTE 2: Door → Handle based on state
    if (obstacle.type === 'door') {
      const door = obstacle.data

      // Locked door - blocked (no turn)
      if (door.state === DoorState.LOCKED) {
        const messages = this.messageService.addMessage(
          state.messages,
          'The door is locked.',
          'warning',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Undiscovered secret door - blocked (no turn)
      if (door.state === DoorState.SECRET && !door.discovered) {
        const messages = this.messageService.addMessage(
          state.messages,
          "You can't go that way.",
          'info',
          state.turnCount
        )
        return { ...state, messages }
      }

      // Closed door - open and move through
      if (door.state === DoorState.CLOSED) {
        // Open door via DoorService (no turn increment)
        const updatedLevel = this.doorService.openDoor(level, door)
        const stateWithOpenDoor = {
          ...state,
          levels: new Map(state.levels).set(state.currentLevel, updatedLevel),
        }

        // Add message
        const messages = this.messageService.addMessage(
          stateWithOpenDoor.messages,
          'You open the door.',
          'info',
          state.turnCount + 1
        )

        // Continue with movement (hunger, fuel, FOV, turn increment)
        return this.performMovement(
          { ...stateWithOpenDoor, messages },
          newPosition,
          updatedLevel
        )
      }
    }

    // ROUTE 3: Wall → Blocked (no turn)
    if (obstacle.type === 'wall') {
      const messages = this.messageService.addMessage(
        state.messages,
        "You can't go that way.",
        'info',
        state.turnCount
      )
      return { ...state, messages }
    }

    // ROUTE 4: Clear path → Normal movement
    return this.performMovement(state, newPosition, level)
  }

  /**
   * Detects what obstacle (if any) is at the target position
   */
  private detectObstacle(
    position: Position,
    level: Level
  ): { type: 'none' | 'monster' | 'door' | 'wall'; data?: any } {
    // Check for monster
    const monster = level.monsters.find(
      (m) => m.position.x === position.x && m.position.y === position.y
    )
    if (monster) return { type: 'monster', data: monster }

    // Check for closed/locked/secret door
    const door = level.doors.find(
      (d) => d.position.x === position.x && d.position.y === position.y
    )
    if (
      door &&
      (door.state === DoorState.CLOSED ||
        door.state === DoorState.LOCKED ||
        (door.state === DoorState.SECRET && !door.discovered))
    ) {
      return { type: 'door', data: door }
    }

    // Check walkability
    if (!this.movementService.isWalkable(position, level)) {
      return { type: 'wall' }
    }

    return { type: 'none' }
  }

  /**
   * Performs movement with all side effects (hunger, fuel, FOV, turn)
   * @param state Current game state
   * @param position Target position (already validated as walkable)
   * @param level Current level
   * @returns Updated state with movement, hunger tick, fuel tick, FOV update, turn increment
   */
  private performMovement(state: GameState, position: Position, level: Level): GameState {
    // 1. Move player
    let player = this.movementService.movePlayer(state.player, position)

    // 2. Tick hunger
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

        // Check if player died from starvation
        if (player.hp <= 0) {
          const messages = this.messageService.addMessage(
            state.messages,
            'You died of starvation!',
            'critical',
            state.turnCount + 1
          )
          return {
            ...state,
            player,
            messages,
            isGameOver: true,
            deathCause: 'Died of starvation',
            turnCount: state.turnCount + 1,
          }
        }
      }
    }

    // 3. Tick light fuel
    let updatedPlayer = player
    if (player.equipment.lightSource) {
      const tickedLight = this.lightingService.tickFuel(player.equipment.lightSource)
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

    // 4. Recompute FOV
    const lightRadius = this.lightingService.getLightRadius(
      updatedPlayer.equipment.lightSource
    )
    const visibleCells = this.fovService.computeFOV(position, lightRadius, level)

    // 5. Update explored tiles
    const updatedLevel = this.fovService.updateExploredTiles(level, visibleCells)

    // 6. Update levels map
    const updatedLevels = new Map(state.levels)
    updatedLevels.set(state.currentLevel, updatedLevel)

    // 7. Generate auto-notifications
    const stateWithUpdatedLevel = {
      ...state,
      player: updatedPlayer,
      visibleCells,
      levels: updatedLevels,
    }
    const notifications = this.notificationService
      ? this.notificationService.generateNotifications(stateWithUpdatedLevel, state.player.position)
      : []

    // 8. Add hunger messages
    let messages = state.messages
    hungerMessages.forEach((msg) => {
      messages = this.messageService.addMessage(
        messages,
        msg,
        msg.includes('fainting') ? 'critical' : 'warning',
        state.turnCount + 1
      )
    })

    // 9. Add auto-notifications to message log
    notifications.forEach((msg) => {
      messages = this.messageService.addMessage(messages, msg, 'info', state.turnCount + 1)
    })

    // 10. Return with turn increment
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
