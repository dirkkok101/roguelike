import { GameState, Level, TileType, Position, Torch, ItemType } from '@game/core/core'
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
import { MonsterTurnService } from '@services/MonsterTurnService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { InventoryService } from '@services/InventoryService'
import { IdentificationService } from '@services/IdentificationService'
import { HungerService } from '@services/HungerService'
import { RegenerationService } from '@services/RegenerationService'
import { LevelingService } from '@services/LevelingService'
import { DebugService } from '@services/DebugService'
import { ContextService } from '@services/ContextService'
import { NotificationService } from '@services/NotificationService'
import { VictoryService } from '@services/VictoryService'
import { LocalStorageService } from '@services/LocalStorageService'
import { AutoSaveMiddleware } from '@services/AutoSaveMiddleware'
import { DoorService } from '@services/DoorService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { DeathService } from '@services/DeathService'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'
import { ModalController } from '@ui/ModalController'
import { MainMenu } from '@ui/MainMenu'
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

  // Generate unique seed for new games (will be overridden when loading saves)
  const newGameSeed = `seed-${Date.now()}`
  const random = new SeededRandom(newGameSeed)
  const lightingService = new LightingService(random)
  const fovService = new FOVService()
  const renderingService = new RenderingService(fovService)
  const movementService = new MovementService()
  const messageService = new MessageService()
  const dungeonService = new DungeonService(random, itemData)
  const hungerService = new HungerService(random)
  const regenerationService = new RegenerationService()
  const levelingService = new LevelingService(random)
  const debugService = new DebugService(messageService)
  const inventoryService = new InventoryService()
  const identificationService = new IdentificationService(random)
  const contextService = new ContextService(identificationService)
  const notificationService = new NotificationService(identificationService)
  const victoryService = new VictoryService()
  const deathService = new DeathService()
  const localStorageService = new LocalStorageService()
  const autoSaveMiddleware = new AutoSaveMiddleware(localStorageService, 10)
  const combatService = new CombatService(random, hungerService, debugService)
  const pathfindingService = new PathfindingService()
  const monsterAIService = new MonsterAIService(pathfindingService, random, fovService)
  const specialAbilityService = new SpecialAbilityService(random)
  const monsterTurnService = new MonsterTurnService(
    random,
    monsterAIService,
    combatService,
    specialAbilityService,
    messageService
  )
  const modalController = new ModalController(identificationService)
  const doorService = new DoorService()
  const potionService = new PotionService(random, identificationService)
  const scrollService = new ScrollService(identificationService, inventoryService)
  const wandService = new WandService(identificationService)
  const turnService = new TurnService()
  const levelService = new LevelService()

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

  // Create UI with return to menu callback (will be set in startGame)
  let renderer: GameRenderer
  let inputHandler: InputHandler

  // Create initial game state
  function createInitialState(): GameState {
  // Generate unique seed for this game
  const gameSeed = `seed-${Date.now()}`

  // Create new random service with game-specific seed
  const gameRandom = new SeededRandom(gameSeed)
  const gameDungeonService = new DungeonService(gameRandom, itemData)

  // Generate procedural dungeon using DungeonService
  const level = gameDungeonService.generateLevel(1, dungeonConfig)

  // Start player in center of first room
  const startRoom = level.rooms[0]
  const startPos: Position = {
    x: startRoom.x + Math.floor(startRoom.width / 2),
    y: startRoom.y + Math.floor(startRoom.height / 2),
  }
  const torch: Torch = {
    id: 'initial-torch',
    name: 'Torch',
    type: ItemType.TORCH,
    identified: true,
    position: startPos,
    fuel: 500,
    maxFuel: 500,
    radius: 2,
    isPermanent: false,
  }

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
    seed: gameSeed,
    gameId: 'game-' + Date.now(),
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap,
    identifiedItems: new Set(),
    debug: debugService.initializeDebugState(),
    // Run statistics (initialized to 0)
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1, // Starting level counts as explored
  }
  }

  // Function to start game with given state
  function startGame(initialState: GameState) {
    let gameState = initialState

    // Initialize renderer and inputHandler with returnToMenu callback
    renderer = new GameRenderer(
      renderingService,
      hungerService,
      levelingService,
      debugService,
      contextService,
      victoryService,
      localStorageService,
      deathService,
      returnToMenu
    )

    inputHandler = new InputHandler(
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
      regenerationService,
      levelingService,
      modalController,
      debugService,
      notificationService,
      victoryService,
      localStorageService,
      doorService,
      potionService,
      scrollService,
      wandService,
      turnService,
      levelService,
      renderer.getMessageHistoryModal(),
      renderer.getHelpModal(),
      returnToMenu
    )

    // Render initial state
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = ''
      app.appendChild(renderer.getContainer())
      renderer.render(gameState)
    }

    // Input handling - store handler for cleanup
    currentKeydownHandler = (event: KeyboardEvent) => {
      const command = inputHandler.handleKeyPress(event, gameState)
      if (command) {
        gameState = command.execute(gameState)
        gameState = monsterTurnService.processMonsterTurns(gameState)
        autoSaveMiddleware.afterTurn(gameState)
      }
      // Always re-render (handles modal closes, inventory updates, etc.)
      renderer.render(gameState)
    }
    document.addEventListener('keydown', currentKeydownHandler)

    console.log('Game initialized. Use arrow keys to move.')
  }

  // Create main menu instance
  const mainMenu = new MainMenu()

  // Track active event listeners for cleanup
  let currentKeydownHandler: ((e: KeyboardEvent) => void) | null = null

  // Return to main menu (used by quit, death, victory)
  function returnToMenu() {
    // Clean up game event listeners
    if (currentKeydownHandler) {
      document.removeEventListener('keydown', currentKeydownHandler)
      currentKeydownHandler = null
    }

    // Clear game container
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = ''
    }

    // Show main menu
    showMainMenu()
  }

  // Show main menu with save detection
  function showMainMenu() {
    const hasSave = localStorageService.hasSave()

    mainMenu.show(
      hasSave,
      // New Game callback
      () => {
        const newState = createInitialState()
        startGame(newState)
      },
      // Continue callback
      () => {
        const savedState = localStorageService.loadGame()
        if (savedState) {
          console.log('Continuing saved game:', savedState.gameId)
          startGame(savedState)
        } else {
          console.error('Failed to load save, starting new game')
          const newState = createInitialState()
          startGame(newState)
        }
      }
    )
  }

  // Initialize - show main menu
  showMainMenu()
}

// Start the game
initializeGame()
