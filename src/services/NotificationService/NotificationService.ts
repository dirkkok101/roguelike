import { GameState, Position, Level, Monster } from '@game/core/core'
import { IdentificationService } from '@services/IdentificationService'

// ============================================================================
// NOTIFICATION SERVICE - Generates contextual auto-messages
// ============================================================================

/**
 * Internal context for tracking notification state
 */
interface NotificationContext {
  lastPosition?: Position
  lastItemSeen?: string
  lastGoldSeen?: number
  recentNotifications: Set<string> // For deduplication
  monstersSeen: Set<string> // Track first sightings (monster IDs)
  lastLevelSeen?: number // Track level changes to reset monstersSeen
}

/**
 * NotificationService - Generates contextual auto-messages
 *
 * Triggers proactive notifications for:
 * - Item/gold presence
 * - Nearby doors/stairs
 * - Resource warnings (inventory full, no food, etc.)
 * - Proximity alerts (monsters nearby)
 *
 * Features:
 * - Smart deduplication (don't spam same message)
 * - Priority-based (critical > warning > info)
 * - Context-aware (only relevant to current situation)
 *
 * Architecture:
 * - Pure logic, returns message strings
 * - Called by MoveCommand after position change
 * - Integrates with MessageService
 */
export class NotificationService {
  private context: NotificationContext = {
    recentNotifications: new Set(),
    monstersSeen: new Set(),
  }

  constructor(private identificationService: IdentificationService) {}

  /**
   * Generate notifications for new player position
   */
  generateNotifications(state: GameState, previousPosition?: Position): string[] {
    const notifications: string[] = []
    const level = state.levels.get(state.currentLevel)
    if (!level) return notifications

    const currentPos = state.player.position

    // Reset deduplication if player moved
    if (previousPosition && !this.positionsEqual(currentPos, previousPosition)) {
      this.context.recentNotifications.clear()
    }

    // Check for items at position
    const itemsHere = level.items.filter(
      (item) => item.position?.x === currentPos.x && item.position?.y === currentPos.y
    )

    if (itemsHere.length === 1) {
      const item = itemsHere[0]
      const key = `item-${item.id}`
      if (!this.context.recentNotifications.has(key)) {
        const displayName = this.identificationService.getDisplayName(item, state)
        const notification = `You see ${this.getArticle(displayName)} ${displayName} here.`
        notifications.push(notification)
        console.log(`[NOTIFICATION] ${notification}`)
        this.context.recentNotifications.add(key)
        this.context.lastItemSeen = item.id
      }
    } else if (itemsHere.length > 1) {
      const key = `items-${currentPos.x}-${currentPos.y}`
      if (!this.context.recentNotifications.has(key)) {
        const notification = `You see several items here. Press [,] to pick up.`
        notifications.push(notification)
        console.log(`[NOTIFICATION] ${notification}`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check for gold
    const goldHere = level.gold.find(
      (g) => g.position.x === currentPos.x && g.position.y === currentPos.y
    )

    if (goldHere) {
      const key = `gold-${goldHere.amount}`
      if (!this.context.recentNotifications.has(key)) {
        const notification = `You see ${goldHere.amount} gold piece${goldHere.amount !== 1 ? 's' : ''} here.`
        notifications.push(notification)
        console.log(`[NOTIFICATION] ${notification}`)
        this.context.recentNotifications.add(key)
        this.context.lastGoldSeen = goldHere.amount
      }
    }

    // Check for nearby doors
    const nearbyDoor = this.getNearbyDoor(level, currentPos)
    if (nearbyDoor && nearbyDoor.state === 'CLOSED') {
      const key = 'door-nearby'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`There is a closed door nearby.`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check inventory status
    if (state.player.inventory.length >= 26) {
      const key = 'inventory-full'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`⚠ Your pack is full! (26/26 items)`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check for adjacent monsters (warning)
    const adjacentMonster = this.getAdjacentMonster(level, currentPos)
    if (adjacentMonster && adjacentMonster.isAwake) {
      const key = `monster-${adjacentMonster.id}`
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`The ${adjacentMonster.name} is nearby!`)
        this.context.recentNotifications.add(key)
      }
    }

    // Check critical resources (no food and hungry)
    const foodCount = state.player.inventory.filter((item) => item.type === 'FOOD').length
    if (foodCount === 0 && state.player.hunger < 500) {
      const key = 'no-food'
      if (!this.context.recentNotifications.has(key)) {
        notifications.push(`⚠ You have no food rations!`)
        this.context.recentNotifications.add(key)
      }
    }

    return notifications
  }

  /**
   * Check for newly visible monsters and generate sighting messages
   */
  checkMonsterSightings(state: GameState): string[] {
    const level = state.levels.get(state.currentLevel)
    if (!level) return []

    // Reset monstersSeen when player changes levels
    if (this.context.lastLevelSeen !== state.currentLevel) {
      this.context.monstersSeen.clear()
      this.context.lastLevelSeen = state.currentLevel
    }

    // Find monsters in visible cells that haven't been seen yet
    const newlyVisibleMonsters = level.monsters.filter(
      (monster) =>
        state.visibleCells.has(`${monster.position.x},${monster.position.y}`) &&
        !this.context.monstersSeen.has(monster.id)
    )

    // No new monsters to report
    if (newlyVisibleMonsters.length === 0) return []

    // Mark these monsters as seen
    newlyVisibleMonsters.forEach((monster) => {
      this.context.monstersSeen.add(monster.id)
    })

    // Generate sighting message
    return this.formatMonsterSightingMessage(newlyVisibleMonsters)
  }

  /**
   * Format monster sighting message
   * Examples:
   * - "You see a Dragon!"
   * - "You see a Bat and an Orc!"
   * - "You see a Snake, a Hobgoblin, and a Troll!"
   */
  private formatMonsterSightingMessage(monsters: Monster[]): string[] {
    if (monsters.length === 0) return []

    if (monsters.length === 1) {
      const monster = monsters[0]
      return [`You see ${this.getArticle(monster.name)} ${monster.name}!`]
    }

    if (monsters.length === 2) {
      const first = monsters[0]
      const second = monsters[1]
      return [
        `You see ${this.getArticle(first.name)} ${first.name} and ${this.getArticle(second.name)} ${second.name}!`,
      ]
    }

    // 3+ monsters: "a Snake, a Hobgoblin, and a Troll!"
    const monsterNames = monsters.map((m) => `${this.getArticle(m.name)} ${m.name}`)
    const lastMonster = monsterNames.pop()
    return [`You see ${monsterNames.join(', ')}, and ${lastMonster}!`]
  }

  /**
   * Check for monsters that woke up and generate wake-up messages
   * Compares current and previous monster states to detect SLEEPING → HUNTING transitions
   */
  checkWakeUpMessages(currentMonsters: Monster[], previousMonsters: Monster[]): string[] {
    // Create a map of previous monster states for quick lookup
    const previousStates = new Map<string, Monster>()
    previousMonsters.forEach((m) => previousStates.set(m.id, m))

    // Find monsters that just woke up
    const wokeUpMonsters = currentMonsters.filter((currentMonster) => {
      const previousMonster = previousStates.get(currentMonster.id)
      if (!previousMonster) return false

      // Detect transition from asleep to awake
      return previousMonster.isAsleep && !currentMonster.isAsleep
    })

    // No wake-ups
    if (wokeUpMonsters.length === 0) return []

    // Generate wake-up message
    return this.formatWakeUpMessage(wokeUpMonsters)
  }

  /**
   * Format wake-up message
   * Examples:
   * - "The Dragon wakes up!"
   * - "The Bat and Orc wake up!"
   * - "The Snake, Hobgoblin, and Troll wake up!"
   */
  private formatWakeUpMessage(monsters: Monster[]): string[] {
    if (monsters.length === 0) return []

    if (monsters.length === 1) {
      return [`The ${monsters[0].name} wakes up!`]
    }

    if (monsters.length === 2) {
      return [`The ${monsters[0].name} and ${monsters[1].name} wake up!`]
    }

    // 3+ monsters: "The Snake, Hobgoblin, and Troll wake up!"
    const monsterNames = monsters.map((m) => m.name)
    const lastMonster = monsterNames.pop()
    return [`The ${monsterNames.join(', ')}, and ${lastMonster} wake up!`]
  }

  /**
   * Get nearby door (adjacent tiles)
   */
  private getNearbyDoor(level: Level, pos: Position) {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const door = level.doors.find((d) => d.position.x === adjPos.x && d.position.y === adjPos.y)
      if (door) return door
    }

    return null
  }

  /**
   * Get adjacent monster
   */
  private getAdjacentMonster(level: Level, pos: Position): Monster | null {
    const adjacentPositions = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ]

    for (const adjPos of adjacentPositions) {
      const monster = level.monsters.find(
        (m) => m.position.x === adjPos.x && m.position.y === adjPos.y && m.isAwake
      )
      if (monster) return monster
    }

    return null
  }

  /**
   * Get article (a/an) for item name
   */
  private getArticle(name: string): string {
    const firstChar = name[0].toLowerCase()
    return ['a', 'e', 'i', 'o', 'u'].includes(firstChar) ? 'an' : 'a'
  }

  /**
   * Helper: Compare positions
   */
  private positionsEqual(a: Position, b: Position): boolean {
    return a.x === b.x && a.y === b.y
  }
}
