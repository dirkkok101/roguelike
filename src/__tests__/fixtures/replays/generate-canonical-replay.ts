import { GameState, Player, Level } from '@game/core/core'
import { ReplayData, CommandEvent, COMMAND_TYPES } from '@game/replay/replay'

/**
 * Generate Canonical Replay Fixture
 *
 * This utility creates a minimal but valid canonical replay for regression testing.
 *
 * **Usage:**
 * ```typescript
 * import { generateCanonicalReplay } from './generate-canonical-replay'
 * const replay = generateCanonicalReplay()
 * ```
 *
 * **Adding Real Canonical Replays:**
 * 1. Play a test game to completion
 * 2. Export replay from IndexedDB: `replayDebugger.loadReplay(gameId)`
 * 3. Save to `canonical-game-N.json`
 * 4. Document scenario in filename (e.g., `canonical-game-victory.json`)
 */

function createTestPlayer(): Player {
  return {
    id: 'player-1',
    name: 'Test Hero',
    position: { x: 10, y: 5 },
    hp: 50,
    maxHp: 100,
    strength: 16,
    level: 1,
    xp: 0,
    gold: 0,
    ac: 5,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      rings: [],
      light: null,
    },
    energy: 100,
    statusEffects: [],
    hunger: 1000,
    maxHunger: 2000,
  }
}

function createTestLevel(depth: number): Level {
  return {
    depth,
    tiles: [],
    rooms: [],
    corridors: [],
    doors: [],
    traps: [],
    monsters: [],
    items: [],
    upStairs: { x: 5, y: 5 },
    downStairs: { x: 15, y: 15 },
  }
}

function createInitialGameState(): GameState {
  return {
    gameId: 'canonical-test-replay',
    characterName: 'Test Hero',
    seed: 'canonical-seed-12345',
    currentLevel: 1,
    turnCount: 0,
    player: createTestPlayer(),
    levels: new Map([[1, createTestLevel(1)]]),
    visibleCells: new Set(['10,5']),
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    levelsVisitedWithAmulet: new Set(),
    itemNameMap: {
      potions: new Map(),
      scrolls: new Map(),
      rings: new Map(),
      wands: new Map(),
    },
    messages: ['Welcome, Test Hero!'],
    maxDepth: 26,
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
    config: { fovMode: 'radius' as const },
  }
}

export function generateCanonicalReplay(commandCount: number = 5): ReplayData {
  const initialState = createInitialGameState()
  const commands: CommandEvent[] = []

  // Generate simple MOVE commands
  for (let i = 0; i < commandCount; i++) {
    commands.push({
      turnNumber: i,
      timestamp: Date.now() + i * 1000,
      commandType: COMMAND_TYPES.MOVE,
      actorType: 'player',
      payload: { direction: 'east' },
      rngState: JSON.stringify({ seed: 12345, state: i }),
    })
  }

  return {
    gameId: 'canonical-test-replay',
    version: 1,
    initialState,
    seed: 'canonical-seed-12345',
    commands,
    metadata: {
      createdAt: Date.now(),
      turnCount: commandCount,
      characterName: 'Test Hero',
      currentLevel: 1,
      outcome: 'ongoing',
    },
  }
}

/**
 * Export canonical replay to JSON file
 *
 * @param replay - ReplayData to export
 * @param filename - Output filename (e.g., 'canonical-game-1.json')
 */
export function exportCanonicalReplay(replay: ReplayData, filename: string): string {
  return JSON.stringify(replay, (key, value) => {
    // Convert Map to object for JSON serialization
    if (value instanceof Map) {
      return Object.fromEntries(value)
    }
    // Convert Set to array for JSON serialization
    if (value instanceof Set) {
      return Array.from(value)
    }
    return value
  }, 2)
}
