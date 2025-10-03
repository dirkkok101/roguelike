import { GameState, Level, TileType, Position } from '@types/core/core'
import { SeededRandom } from '@services/RandomService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { RenderingService } from '@services/RenderingService'
import { MovementService } from '@services/MovementService'
import { MessageService } from '@services/MessageService'
import { DungeonService } from '@services/DungeonService'
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
const dungeonService = new DungeonService(random)

// Dungeon configuration
const dungeonConfig = {
  width: 80,
  height: 22,
  minRooms: 4,
  maxRooms: 9,
  minRoomSize: 3,
  maxRoomSize: 8,
  minSpacing: 2,
  loopChance: 0.25,
}

// Create UI
const renderer = new GameRenderer(renderingService)
const inputHandler = new InputHandler(
  movementService,
  lightingService,
  fovService,
  messageService,
  random,
  dungeonService,
  dungeonConfig
)

// Create initial game state
function createInitialState(): GameState {
  // Generate procedural dungeon using DungeonService

  const level = dungeonService.generateLevel(1, dungeonConfig)

  // Start player in center of first room
  const startRoom = level.rooms[0]
  const startPos: Position = {
    x: startRoom.x + Math.floor(startRoom.width / 2),
    y: startRoom.y + Math.floor(startRoom.height / 2),
  }
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
