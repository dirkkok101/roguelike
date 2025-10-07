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
} from '@game/core/core'
import { MessageService } from '@services/MessageService'

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
   * Apply god mode effects to player state
   * Called by relevant services (CombatService, HungerService, LightingService)
   */
  applyGodModeEffects(state: GameState): GameState {
    if (!this.isGodModeActive(state)) return state

    // Restore full HP
    const player = state.player
    if (player.hp < player.maxHp) {
      return {
        ...state,
        player: {
          ...player,
          hp: player.maxHp,
        },
      }
    }

    return state
  }

  /**
   * Spawn monster at position for testing
   */
  spawnMonster(state: GameState, letter: string, position?: Position): GameState {
    if (!this.isEnabled()) return state

    const currentLevel = state.levels.get(state.currentLevel)
    if (!currentLevel) return state

    // Find monster template by letter (would load from monsters.json in real implementation)
    // For now, create basic monster
    const spawnPos = position || this.findNearbyEmptyTile(currentLevel, state.player.position)
    if (!spawnPos) {
      const messages = this.messageService.addMessage(
        state.messages,
        'No empty tile found for monster spawn',
        'warning',
        state.turnCount
      )
      return { ...state, messages }
    }

    const newMonster: Monster = {
      id: `debug-monster-${Date.now()}`,
      letter,
      name: `Debug ${letter}`,
      position: spawnPos,
      hp: 10,
      maxHp: 10,
      ac: 5,
      damage: '1d6',
      xpValue: 10,
      aiProfile: {
        behavior: MonsterBehavior.SIMPLE,
        intelligence: 5,
        aggroRange: 5,
        fleeThreshold: 0.25,
        special: [],
      },
      isAsleep: false,
      isAwake: true,
      isInvisible: false,
      state: MonsterState.HUNTING,
      visibleCells: new Set(),
      currentPath: null,
      hasStolen: false,
      level: state.currentLevel,
      lastKnownPlayerPosition: null,
      turnsWithoutSight: 0,
      energy: 100, // Debug monsters start with full energy
      speed: 10, // Normal speed
      statusEffects: []
    }

    const updatedLevel: Level = {
      ...currentLevel,
      monsters: [...currentLevel.monsters, newMonster],
    }

    const newLevels = new Map(state.levels)
    newLevels.set(state.currentLevel, updatedLevel)

    const messages = this.messageService.addMessage(
      state.messages,
      `Spawned ${letter} at (${spawnPos.x}, ${spawnPos.y})`,
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

    return {
      ...state,
      debug: {
        ...debug,
        fovOverlay: !debug.fovOverlay,
      },
    }
  }

  /**
   * Toggle pathfinding debug overlay
   */
  togglePathDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        pathOverlay: !debug.pathOverlay,
      },
    }
  }

  /**
   * Toggle AI debug overlay
   */
  toggleAIDebug(state: GameState): GameState {
    if (!this.isEnabled()) return state

    const debug = state.debug || this.initializeDebugState()

    return {
      ...state,
      debug: {
        ...debug,
        aiOverlay: !debug.aiOverlay,
      },
    }
  }

  /**
   * Helper: Find nearby empty tile for spawning
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
}
