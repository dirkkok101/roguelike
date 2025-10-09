import {
  GameState,
  Level,
  DebugState,
  Position,
  Monster,
  MonsterBehavior,
  MonsterState,
  PotionType,
  ScrollType,
  RingType,
  WandType,
  Room,
  TileType,
} from '@game/core/core'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { IRandomService } from '@services/RandomService'

/**
 * DebugService - Debug tools for testing and development
 *
 * Provides god mode, map reveal, monster debugging, and debug state management.
 *
 * Architecture:
 * - Contains ALL debug logic (no logic in commands/UI)
 * - Immutable: returns new GameState objects
 * - Only enabled in development mode
 */
export class DebugService {
  private isDevMode: boolean

  constructor(
    private messageService: MessageService,
    private monsterSpawnService: MonsterSpawnService,
    private itemSpawnService: ItemSpawnService,
    private random: IRandomService,
    isDevMode?: boolean
  ) {
    // Priority: explicit parameter > NODE_ENV check > false (production default)
    // Note: In browser (Vite), pass import.meta.env.DEV explicitly from main.ts
    // In Jest, process.env.NODE_ENV is automatically set to 'test'/'development'
    this.isDevMode = isDevMode ?? (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'development'
    )
  }

  /**
   * Check if debug mode is available
   */
  isEnabled(): boolean {
    return this.isDevMode
  }

  /**
   * Initialize debug state (call once at game start)
   */
  initializeDebugState(): DebugState {
    return {
      godMode: false,
      mapRevealed: false,
      debugConsoleVisible: false,
      fovOverlay: false,
      pathOverlay: false,
      aiOverlay: false,
    }
  }

  /**
   * Toggle god mode (invincible, infinite hunger/light)
   */
  toggleGodMode(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newGodMode = !debug.godMode

    // Add message
    const message = newGodMode
      ? 'God mode ENABLED (invincible, infinite hunger/light)'
      : 'God mode DISABLED'

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return {
      ...state,
      messages,
      debug: {
        ...debug,
        godMode: newGodMode,
      },
    }
  }

  /**
   * Reveal entire current level map
   */
  revealMap(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newMapRevealed = !debug.mapRevealed

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Mark all tiles as explored
    const newExplored = currentLevel.explored.map(row => row.map(() => true))

    const updatedLevel: Level = {
      ...currentLevel,
      explored: newExplored,
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    // Add message
    const message = newMapRevealed
      ? 'Map REVEALED (all tiles visible)'
      : 'Map reveal DISABLED'

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return {
      ...state,
      messages,
      levels: newLevels,
      debug: {
        ...debug,
        mapRevealed: newMapRevealed,
      },
    }
  }

  /**
   * Toggle debug console visibility
   */
  toggleDebugConsole(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        debugConsoleVisible: !debug.debugConsoleVisible,
      },
    }
  }

  /**
   * Show current seed (for debugging)
   */
  showSeed(state: GameState): string {
    return state.seed
  }

  /**
   * Get debug state (helper for UI)
   */
  getDebugState(state: GameState): DebugState {
    return state.debug || this.initializeDebugState()
  }

  /**
   * Check if god mode is active
   */
  isGodModeActive(state: GameState): boolean {
    return state.debug?.godMode ?? false
  }

  /**
   * Spawn monster at position for testing
   *
   * Uses MonsterSpawnService to create real monsters from templates.
   * Smart positioning: spawns near player in same room or nearest room.
   */
  spawnMonster(state: GameState, letter: string, position?: Position): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Get monster template from MonsterSpawnService
    const template = this.monsterSpawnService.getMonsterByLetter(letter)
    if (!template) {
      const messages = this.messageService.addMessage(
        state.messages,
        `Unknown monster letter: ${letter}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Determine spawn position (use smart positioning if no position provided)
    const spawnPos = position || this.findSpawnPosition(state)
    if (!spawnPos) {
      const messages = this.messageService.addMessage(
        state.messages,
        `No valid spawn position found for ${template.name}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Create monster using MonsterSpawnService
    let monster
    try {
      monster = this.monsterSpawnService.createMonsterFromTemplate(
        template,
        spawnPos,
        `debug-monster-${Date.now()}`
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const messages = this.messageService.addMessage(
        state.messages,
        `Failed to spawn ${template.name}: ${errorMessage}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: [...currentLevel.monsters, monster],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      `Spawned ${template.name} (${letter}) at (${spawnPos.x}, ${spawnPos.y})`,
      'info',
      state.turnCount
    )

    return {
      ...state,
      messages,
      levels: newLevels,
    }
  }

  /**
   * Spawn item at position for testing
   *
   * Uses ItemSpawnService to create items of specific types.
   * Smart positioning: spawns near player in same room or nearest room.
   *
   * @param itemType - Type category ('potion', 'scroll', 'ring', 'wand', 'food', 'torch', 'lantern', 'oil')
   * @param subType - Specific type (e.g., PotionType.HEAL for potions, ScrollType.IDENTIFY for scrolls)
   * @param position - Optional position (uses smart positioning if not provided)
   */
  spawnItem(
    state: GameState,
    itemType: string,
    subType?: string,
    position?: Position
  ): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Validate itemType parameter
    if (!itemType || typeof itemType !== 'string' || itemType.trim() === '') {
      const messages = this.messageService.addMessage(
        state.messages,
        'Invalid item type: must be a non-empty string',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Validate itemType is a recognized category
    const validTypes = ['potion', 'scroll', 'ring', 'wand', 'food', 'torch', 'lantern', 'oil']
    const normalizedType = itemType.trim().toLowerCase()

    if (!validTypes.includes(normalizedType)) {
      const messages = this.messageService.addMessage(
        state.messages,
        `Unknown item type: "${itemType}". Valid types: ${validTypes.join(', ')}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Determine spawn position (use smart positioning if no position provided)
    const spawnPos = position || this.findSpawnPosition(state)
    if (!spawnPos) {
      const messages = this.messageService.addMessage(
        state.messages,
        `No valid spawn position found for ${itemType}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    // Create item using ItemSpawnService
    let item
    try {
      switch (normalizedType) {
        case 'potion': {
          item = this.itemSpawnService.createPotion(this.parsePotionType(subType), spawnPos)
          break
        }
        case 'scroll': {
          item = this.itemSpawnService.createScroll(this.parseScrollType(subType), spawnPos)
          break
        }
        case 'ring': {
          item = this.itemSpawnService.createRing(this.parseRingType(subType), spawnPos)
          break
        }
        case 'wand': {
          item = this.itemSpawnService.createWand(this.parseWandType(subType), spawnPos)
          break
        }
        case 'food': {
          item = this.itemSpawnService.createFood(spawnPos)
          break
        }
        case 'torch': {
          item = this.itemSpawnService.createTorch(spawnPos)
          break
        }
        case 'lantern': {
          item = this.itemSpawnService.createLantern(spawnPos)
          break
        }
        case 'oil': {
          item = this.itemSpawnService.createOilFlask(spawnPos)
          break
        }
        default: {
          // This should never happen due to validation above, but TypeScript requires it
          const messages = this.messageService.addMessage(
            state.messages,
            `Unexpected error: unhandled item type "${itemType}"`,
            'warning',
            state.turnCount
          )
          return { ...state, messages }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const messages = this.messageService.addMessage(
        state.messages,
        `Failed to spawn ${itemType}: ${errorMessage}`,
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const updatedLevel: Level = {
      ...currentLevel,
      items: [...currentLevel.items, item],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      `Spawned ${item.name} at (${spawnPos.x}, ${spawnPos.y})`,
      'info',
      state.turnCount
    )

    return {
      ...state,
      messages,
      levels: newLevels,
    }
  }

  /**
   * Wake all sleeping monsters on current level
   */
  wakeAllMonsters(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    const updatedMonsters = currentLevel.monsters.map((monster) => ({
      ...monster,
      isAsleep: false,
      isAwake: true,
      state: monster.state === MonsterState.SLEEPING ? MonsterState.HUNTING : monster.state,
    }))

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: updatedMonsters,
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const awakeCount = updatedMonsters.filter((m) => m.isAwake).length
    const messages = this.messageService.addMessage(
      state.messages,
      `Woke ${awakeCount} monsters`,
      'warning',
      state.turnCount
    )

    return {
      ...state,
      messages,
      levels: newLevels,
    }
  }

  /**
   * Kill all monsters on current level
   */
  killAllMonsters(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    const monsterCount = currentLevel.monsters.length

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: [],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      `Removed ${monsterCount} monsters`,
      'info',
      state.turnCount
    )

    return {
      ...state,
      messages,
      levels: newLevels,
    }
  }

  /**
   * Identify all items (Phase 5 integration)
   */
  identifyAll(state: GameState): GameState {
    if (!this.isEnabled()) return state

    // Mark all item types as identified
    const allItemTypes = new Set<string>()

    // Add all potion types
    Object.values(PotionType).forEach((type) => allItemTypes.add(`potion-${type}`))

    // Add all scroll types
    Object.values(ScrollType).forEach((type) => allItemTypes.add(`scroll-${type}`))

    // Add all ring types
    Object.values(RingType).forEach((type) => allItemTypes.add(`ring-${type}`))

    // Add all wand types
    Object.values(WandType).forEach((type) => allItemTypes.add(`wand-${type}`))

    const messages = this.messageService.addMessage(
      state.messages,
      `Identified all ${allItemTypes.size} item types`,
      'success',
      state.turnCount
    )

    return {
      ...state,
      messages,
      identifiedItems: allItemTypes,
    }
  }

  /**
   * Toggle FOV debug overlay
   */
  toggleFOVDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newFovOverlay = !debug.fovOverlay

    // Add message
    const message = newFovOverlay
      ? 'FOV debug overlay ENABLED'
      : 'FOV debug overlay DISABLED'

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return {
      ...state,
      messages,
      debug: {
        ...debug,
        fovOverlay: newFovOverlay,
      },
    }
  }

  /**
   * Toggle pathfinding debug overlay
   */
  togglePathDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newPathOverlay = !debug.pathOverlay

    // Add message
    const message = newPathOverlay
      ? 'Pathfinding debug overlay ENABLED'
      : 'Pathfinding debug overlay DISABLED'

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return {
      ...state,
      messages,
      debug: {
        ...debug,
        pathOverlay: newPathOverlay,
      },
    }
  }

  /**
   * Toggle AI debug overlay
   */
  toggleAIDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()
    const newAIOverlay = !debug.aiOverlay

    // Add message
    const message = newAIOverlay
      ? 'AI debug overlay ENABLED'
      : 'AI debug overlay DISABLED'

    const messages = this.messageService.addMessage(state.messages, message, 'info', state.turnCount)

    return {
      ...state,
      messages,
      debug: {
        ...debug,
        aiOverlay: newAIOverlay,
      },
    }
  }

  /**
   * Smart spawn position finder (Phase 5.2)
   *
   * Spawns items/monsters intelligently:
   * - 1-3 tiles from player if player in room
   * - Random position in nearest room if player in corridor
   */
  private findSpawnPosition(state: GameState): Position | null {
    const level = state.levels.get(state.currentLevel)
    if (!level) return null

    const player = state.player

    // Try to find player's current room
    const playerRoom = this.findPlayerRoom(level, player.position)

    if (playerRoom) {
      // Player in room - try 1-3 tiles away
      const radius = this.random.nextInt(1, 3)
      const candidates = this.getPositionsInRadius(player.position, radius, level)
      const valid = candidates.filter((pos) => this.isValidSpawnPosition(level, pos))

      if (valid.length > 0) {
        return this.random.pickRandom(valid)
      }

      // Fallback to any position in player's room
      return this.findRandomPositionInRoom(level, playerRoom)
    }

    // Player in corridor - find nearest room
    const nearestRoom = this.findNearestRoom(level, player.position)
    if (!nearestRoom) return null

    return this.findRandomPositionInRoom(level, nearestRoom)
  }

  /**
   * Find player's current room (null if in corridor)
   */
  private findPlayerRoom(level: Level, playerPos: Position): Room | null {
    return (
      level.rooms.find(
        (room) =>
          playerPos.x >= room.x &&
          playerPos.x < room.x + room.width &&
          playerPos.y >= room.y &&
          playerPos.y < room.y + room.height
      ) || null
    )
  }

  /**
   * Find nearest room by Manhattan distance
   */
  private findNearestRoom(level: Level, pos: Position): Room | null {
    if (level.rooms.length === 0) return null

    let nearestRoom = level.rooms[0]
    let minDistance = Infinity

    for (const room of level.rooms) {
      const roomCenter = {
        x: room.x + Math.floor(room.width / 2),
        y: room.y + Math.floor(room.height / 2),
      }
      const distance = Math.abs(pos.x - roomCenter.x) + Math.abs(pos.y - roomCenter.y)

      if (distance < minDistance) {
        minDistance = distance
        nearestRoom = room
      }
    }

    return nearestRoom
  }

  /**
   * Find random walkable position in room
   */
  private findRandomPositionInRoom(level: Level, room: Room): Position | null {
    const candidates: Position[] = []

    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        const pos = { x, y }
        if (this.isValidSpawnPosition(level, pos)) {
          candidates.push(pos)
        }
      }
    }

    if (candidates.length === 0) return null

    return this.random.pickRandom(candidates)
  }

  /**
   * Validate spawn position (walkable, not occupied)
   */
  private isValidSpawnPosition(level: Level, pos: Position): boolean {
    // Check bounds
    if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
      return false
    }

    // Must be walkable floor
    if (level.tiles[pos.y][pos.x].type !== TileType.FLOOR) {
      return false
    }

    // Must not have monster
    if (level.monsters.some((m) => m.position.x === pos.x && m.position.y === pos.y)) {
      return false
    }

    // Must not have item
    if (level.items.some((i) => i.position.x === pos.x && i.position.y === pos.y)) {
      return false
    }

    return true
  }

  /**
   * Get all positions within radius
   */
  private getPositionsInRadius(center: Position, radius: number, level: Level): Position[] {
    const positions: Position[] = []

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Skip center
        if (dx === 0 && dy === 0) continue

        // Manhattan distance check
        if (Math.abs(dx) + Math.abs(dy) <= radius) {
          const pos = { x: center.x + dx, y: center.y + dy }

          // Check bounds
          if (pos.x >= 0 && pos.x < level.width && pos.y >= 0 && pos.y < level.height) {
            positions.push(pos)
          }
        }
      }
    }

    return positions
  }

  /**
   * Helper: Find nearby empty tile for spawning (legacy method, kept for compatibility)
   * @deprecated Use findSpawnPosition() instead for smart positioning
   */
  private findNearbyEmptyTile(level: Level, center: Position): Position | null {
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ]

    for (const offset of offsets) {
      const pos = { x: center.x + offset.x, y: center.y + offset.y }

      // Check bounds
      if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
        continue
      }

      // Check walkable
      const tile = level.tiles[pos.y][pos.x]
      if (!tile.walkable) continue

      // Check no monster
      const hasMonster = level.monsters.some((m) => m.position.x === pos.x && m.position.y === pos.y)
      if (hasMonster) continue

      return pos
    }

    return null
  }

  // ============================================================================
  // ENUM PARSING HELPERS (Phase 7.2)
  // ============================================================================

  /**
   * Parse potion type from string
   *
   * Converts string subtype to PotionType enum value.
   * Returns default (HEAL) if subtype is undefined or invalid.
   *
   * @param subType - Optional string representation of PotionType
   * @returns PotionType enum value
   */
  private parsePotionType(subType?: string): PotionType {
    if (!subType) return PotionType.HEAL
    return PotionType[subType as keyof typeof PotionType] || PotionType.HEAL
  }

  /**
   * Parse scroll type from string
   *
   * Converts string subtype to ScrollType enum value.
   * Returns default (IDENTIFY) if subtype is undefined or invalid.
   *
   * @param subType - Optional string representation of ScrollType
   * @returns ScrollType enum value
   */
  private parseScrollType(subType?: string): ScrollType {
    if (!subType) return ScrollType.IDENTIFY
    return ScrollType[subType as keyof typeof ScrollType] || ScrollType.IDENTIFY
  }

  /**
   * Parse ring type from string
   *
   * Converts string subtype to RingType enum value.
   * Returns default (PROTECTION) if subtype is undefined or invalid.
   *
   * @param subType - Optional string representation of RingType
   * @returns RingType enum value
   */
  private parseRingType(subType?: string): RingType {
    if (!subType) return RingType.PROTECTION
    return RingType[subType as keyof typeof RingType] || RingType.PROTECTION
  }

  /**
   * Parse wand type from string
   *
   * Converts string subtype to WandType enum value.
   * Returns default (MAGIC_MISSILE) if subtype is undefined or invalid.
   *
   * @param subType - Optional string representation of WandType
   * @returns WandType enum value
   */
  private parseWandType(subType?: string): WandType {
    if (!subType) return WandType.MAGIC_MISSILE
    return WandType[subType as keyof typeof WandType] || WandType.MAGIC_MISSILE
  }
}
