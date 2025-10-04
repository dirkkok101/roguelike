import { GameState, Level, TileType, Position } from '@game/core/core'
import { SeededRandom } from '@services/RandomService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { RenderingService } from '@services/RenderingService'
import { MovementService } from '@services/MovementService'
import { MessageService } from '@services/MessageService'
import { DungeonService } from '@services/DungeonService'
import { CombatService } from '@services/CombatService'
import { PathfindingService } from '@services/PathfindingService'
import { MonsterAIService } from '@services/MonsterAIService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import { HungerService } from '@services/HungerService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { NotificationService } from '@services/NotificationService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'
import { ModalController } from '@ui/ModalController'
import { loadItemData, ItemData } from './data/ItemDataLoader'

// ============================================================================
// MAIN - Game initialization and loop
// ============================================================================

// Initialize game asynchronously to load item data
async function initializeGame() {
  // Load item data from JSON
  let itemData: ItemData | undefined
  try {
    itemData = await loadItemData()
    console.log('Items loaded from items.json')
  } catch (error) {
    console.warn('Failed to load items.json, using hardcoded items:', error)
  }

  // Create services
  const random = new SeededRandom('test-seed')
  const lightingService = new LightingService(random)
  const fovService = new FOVService()
  const renderingService = new RenderingService(fovService)
  const movementService = new MovementService()
  const messageService = new MessageService()
  const dungeonService = new DungeonService(random, itemData)
  const hungerService = new HungerService(random)
  const levelingService = new LevelingService(random)
  const debugService = new DebugService(messageService)
  const contextService = new ContextService()
  const notificationService = new NotificationService()
  const victoryService = new VictoryService()
  const localStorageService = new LocalStorageService()
  const combatService = new CombatService(random, hungerService, debugService)
  const pathfindingService = new PathfindingService()
  const monsterAIService = new MonsterAIService(pathfindingService, random)
  const inventoryService = new InventoryService()
  const identificationService = new IdentificationService(random)
  const modalController = new ModalController(identificationService)

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
  const renderer = new GameRenderer(renderingService, hungerService, levelingService, debugService, contextService, victoryService)
  const inputHandler = new InputHandler(
    movementService,
    lightingService,
    fovService,
    messageService,
    random,
    dungeonService,
    dungeonConfig,
    combatService,
    inventoryService,
    identificationService,
    hungerService,
    levelingService,
    modalController,
    debugService,
    notificationService,
    victoryService,
    localStorageService,
    renderer.getMessageHistoryModal(),
    renderer.getHelpModal()
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

  // Generate item names for this game
  const itemNameMap = identificationService.generateItemNames()

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
    hasAmulet: false,
    itemNameMap,
    identifiedItems: new Set(),
    debug: debugService.initializeDebugState(),
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
    const command = inputHandler.handleKeyPress(event, gameState)
    if (command) {
      gameState = command.execute(gameState)
      renderer.render(gameState)
    }
  })

  console.log('Game initialized. Use arrow keys to move.')
}

// Start the game
initializeGame()
