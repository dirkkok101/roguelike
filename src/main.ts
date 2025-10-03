import { GameState, Level, TileType, Position } from '@types/core/core'
import { SeededRandom } from '@services/RandomService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { RenderingService } from '@services/RenderingService'
import { MovementService } from '@services/MovementService'
import { MessageService } from '@services/MessageService'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'

// ============================================================================
// MAIN - Game initialization and loop
// ============================================================================

// Create services
const random = new SeededRandom('test-seed')
const lightingService = new LightingService(random)
const fovService = new FOVService()
const renderingService = new RenderingService(fovService)
const movementService = new MovementService()
const messageService = new MessageService()

// Create UI
const renderer = new GameRenderer(renderingService)
const inputHandler = new InputHandler(
  movementService,
  lightingService,
  fovService,
  messageService
)

// Create initial game state
function createInitialState(): GameState {
  // Create simple test level (single room)
  const width = 20
  const height = 15
  const tiles = Array(height)
    .fill(null)
    .map((_, y) =>
      Array(width)
        .fill(null)
        .map((_, x) => {
          // Border walls
          if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            return {
              type: TileType.WALL,
              char: '#',
              walkable: false,
              transparent: false,
              colorVisible: '#8B7355',
              colorExplored: '#4A4A4A',
            }
          }
          // Floor
          return {
            type: TileType.FLOOR,
            char: '.',
            walkable: true,
            transparent: true,
            colorVisible: '#A89078',
            colorExplored: '#5A5A5A',
          }
        })
    )

  const level: Level = {
    depth: 1,
    width,
    height,
    tiles,
    rooms: [{ id: 0, x: 1, y: 1, width: width - 2, height: height - 2 }],
    doors: [],
    monsters: [],
    items: [],
    gold: [],
    stairsUp: null,
    stairsDown: { x: 10, y: 7 },
    explored: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
  }

  const startPos: Position = { x: 5, y: 5 }
  const torch = lightingService.createTorch()

  const player = {
    position: startPos,
    hp: 12,
    maxHp: 12,
    strength: 16,
    maxStrength: 16,
    ac: 4,
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment: {
      weapon: null,
      armor: null,
      leftRing: null,
      rightRing: null,
      lightSource: torch,
    },
    inventory: [],
  }

  // Compute initial FOV
  const visibleCells = fovService.computeFOV(
    startPos,
    lightingService.getLightRadius(torch),
    level
  )

  // Mark initial tiles as explored
  visibleCells.forEach((key) => {
    const pos = fovService.keyToPos(key)
    level.explored[pos.y][pos.x] = true
  })

  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells,
    messages: [
      {
        text: 'Welcome to the dungeon. Find the Amulet of Yendor!',
        type: 'info',
        turn: 0,
      },
    ],
    turnCount: 0,
    seed: 'test-seed',
    gameId: 'game-' + Date.now(),
    isGameOver: false,
    hasWon: false,
  }
}

// Game state
let gameState = createInitialState()

// Render initial state
const app = document.getElementById('app')
if (app) {
  app.innerHTML = ''
  app.appendChild(renderer.getContainer())
  renderer.render(gameState)
}

// Input handling
document.addEventListener('keydown', (event) => {
  const command = inputHandler.handleKeyPress(event)
  if (command) {
    gameState = command.execute(gameState)
    renderer.render(gameState)
  }
})

console.log('Game initialized. Use arrow keys to move.')
