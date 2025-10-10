import { GameState, Level, Tile, Player, Position } from '@game/core/core'

// ============================================================================
// MOCK GAME STATE HELPERS FOR TESTING
// ============================================================================

interface MockGameStateOptions {
  playerPosition?: Position
  mapDimensions?: { width: number; height: number }
  currentLevel?: number
  turnCount?: number
}

interface MockLevelOptions {
  width?: number
  height?: number
}

/**
 * Create a mock level with specified dimensions
 */
export function createMockLevel(options: MockLevelOptions = {}): Level {
  const width = options.width || 100
  const height = options.height || 50

  // Create tile grid
  const tiles: Tile[][] = []
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      row.push({
        char: '.',
        walkable: true,
        transparent: true,
        explored: false,
      })
    }
    tiles.push(row)
  }

  // Create explored grid (separate from tile.explored for rendering)
  const explored: boolean[][] = []
  for (let y = 0; y < height; y++) {
    const row: boolean[] = []
    for (let x = 0; x < width; x++) {
      row.push(false)
    }
    explored.push(row)
  }

  return {
    depth: 1,
    width,
    height,
    tiles,
    explored,
    monsters: [],
    items: [],
    gold: [],
    doors: [],
    traps: [],
    stairsUp: null,
    stairsDown: null,
    rooms: [],
  }
}

/**
 * Create a mock game state for testing
 */
export function createMockGameState(options: MockGameStateOptions = {}): GameState {
  const playerPos = options.playerPosition || { x: 50, y: 25 }
  const mapDims = options.mapDimensions || { width: 100, height: 50 }
  const currentLevel = options.currentLevel || 1
  const turnCount = options.turnCount !== undefined ? options.turnCount : 0

  const player: Player = {
    position: playerPos,
    maxHp: 12,
    hp: 12,
    strength: 16,
    maxStrength: 16,
    ac: 4,
    level: 1,
    exp: 0,
    expToNextLevel: 10,
    gold: 0,
    hunger: 1000,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: {
        type: 'torch',
        radius: 2,
        fuel: 500,
        isPermanent: false,
      },
    },
    statusEffects: [],
    energy: 0,
  }

  const level = createMockLevel({ width: mapDims.width, height: mapDims.height })

  const levels = new Map<number, Level>()
  levels.set(currentLevel, level)

  return {
    player,
    levels,
    currentLevel,
    turnCount,
    messages: [],
    visibleCells: new Set<string>(),
    detectedMonsters: new Set<string>(),
    detectedMagicItems: new Set<string>(),
    seed: 'test-seed',
    gameId: 'test-game-id',
    characterName: 'TestHero',
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap: {
      potions: new Map(),
      scrolls: new Map(),
      wands: new Map(),
      rings: new Map(),
    },
    identifiedItems: new Set<string>(),
  }
}
