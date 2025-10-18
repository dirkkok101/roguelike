import { GameState, Level, Tile, Player, Position, ItemType, TileType } from '@game/core/core'
import { PlayerFactory } from '@factories/PlayerFactory'

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
        type: TileType.FLOOR,
        char: '.',
        walkable: true,
        transparent: true,
        colorVisible: '#888888',
        colorExplored: '#444444',
        isRoom: false,
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
    ...PlayerFactory.create(playerPos),
    ac: 4,
    hunger: 1000,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: {
        id: 'test-torch',
        name: 'Torch',
        type: ItemType.TORCH,
        spriteName: 'torch',
        identified: true,
        position: { x: 0, y: 0 },
        fuel: 500,
        maxFuel: 500,
        radius: 2,
        isPermanent: false,
      },
    },
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
    levelsVisitedWithAmulet: new Set<number>(),
    maxDepth: 26,
    itemNameMap: {
      potions: new Map(),
      scrolls: new Map(),
      wands: new Map(),
      rings: new Map(),
    },
    identifiedItems: new Set<string>(),
    config: {
      fovMode: 'radius' // Default to radius-based FOV for tests
    },
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1,
  }
}
