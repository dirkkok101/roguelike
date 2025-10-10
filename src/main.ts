import { GameState, Position, Torch, ItemType, Input } from '@game/core/core'
import { GameDependencies } from '@game/core/Services'
import { SeededRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { RenderingService } from '@services/RenderingService'
import { MovementService } from '@services/MovementService'
import { MessageService } from '@services/MessageService'
import { DungeonService } from '@services/DungeonService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
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
import { GoldService } from '@services/GoldService'
import { PotionService } from '@services/PotionService'
import { ScrollService } from '@services/ScrollService'
import { WandService } from '@services/WandService'
import { CurseService } from '@services/CurseService'
import { TurnService } from '@services/TurnService'
import { LevelService } from '@services/LevelService'
import { DeathService } from '@services/DeathService'
import { StatusEffectService } from '@services/StatusEffectService'
import { LeaderboardService } from '@services/LeaderboardService'
import { LeaderboardStorageService } from '@services/LeaderboardStorageService'
import { ScoreCalculationService } from '@services/ScoreCalculationService'
import { PreferencesService } from '@services/PreferencesService'
import { TargetingService } from '@services/TargetingService'
import { AssetLoaderService } from '@services/AssetLoaderService'
import { TerrainSpriteService } from '@services/TerrainSpriteService'
import { WanderingMonsterService } from '@services/WanderingMonsterService'
import { GameRenderer } from '@ui/GameRenderer'
import { InputHandler } from '@ui/InputHandler'
import { ModalController } from '@ui/ModalController'
import { MainMenu } from '@ui/MainMenu'
import { loadItemData, ItemData } from './data/ItemDataLoader'
import { GameStateManager } from '@services/GameStateManager'
import { PlayingState } from '@states/PlayingState'

// ============================================================================
// MAIN - Game initialization and loop
// ============================================================================

// Initialize game asynchronously to load item data
async function initializeGame() {
  // Load item data from JSON
  let itemData: ItemData
  try {
    itemData = await loadItemData()
    console.log('Items loaded from items.json')
  } catch (error) {
    console.error('Failed to load items.json:', error)
    throw error // Fatal error - game cannot proceed without item data
  }

  // Generate unique seed for new games (will be overridden when loading saves)
  const newGameSeed = `seed-${Date.now()}`
  const random = new SeededRandom(newGameSeed)
  const statusEffectService = new StatusEffectService()
  const messageService = new MessageService()

  // Load monster data early (needed by DebugService)
  const monsterSpawnService = new MonsterSpawnService(random)
  try {
    await monsterSpawnService.loadMonsterData()
    console.log('Monsters loaded from monsters.json')
  } catch (error) {
    console.error('Failed to load monsters.json:', error)
    throw error // Fatal error - game cannot proceed without monster data
  }

  // Load terrain sprite mappings (data-driven approach)
  const terrainSpriteService = new TerrainSpriteService()
  try {
    await terrainSpriteService.loadTerrainSprites()
    console.log('Terrain sprites loaded from terrain-sprites.json')
  } catch (error) {
    console.error('Failed to load terrain sprites:', error)
    // Non-fatal error - will fall back to CHAR_TO_ANGBAND
  }

  // Load tileset early (Gervais 32×32 sprite sheet)
  const assetLoaderService = new AssetLoaderService(terrainSpriteService)
  try {
    await assetLoaderService.loadTileset(
      '/assets/tilesets/gervais/32x32.png',
      [
        '/assets/tilesets/gervais/graf-dvg.prf',
        '/assets/tilesets/gervais/flvr-dvg.prf',
        '/assets/tilesets/gervais/xtra-dvg.prf',
      ],
      32
    )
    console.log('Tileset loaded successfully (Gervais 32×32)')
  } catch (error) {
    console.warn('Failed to load tileset, will fall back to ASCII rendering:', error)
    // Non-fatal error - game can proceed with ASCII rendering
  }

  // Create ItemSpawnService (needed by DebugService)
  const itemSpawnService = new ItemSpawnService(random, itemData)

  // Create debug service early (needed by HungerService and LightingService)
  const debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, random, import.meta.env.DEV)

  const lightingService = new LightingService(random, debugService)
  const fovService = new FOVService(statusEffectService)
  const renderingService = new RenderingService(fovService)
  const movementService = new MovementService(random, statusEffectService)

  const dungeonService = new DungeonService(random, monsterSpawnService, itemData)
  const ringService = new RingService(random)
  const hungerService = new HungerService(random, ringService, debugService)
  const regenerationService = new RegenerationService(ringService)
  const levelingService = new LevelingService(random)
  const inventoryService = new InventoryService()
  const identificationService = new IdentificationService(random)
  const contextService = new ContextService(identificationService)
  const notificationService = new NotificationService(identificationService)
  const victoryService = new VictoryService()
  const deathService = new DeathService()
  const localStorageService = new LocalStorageService()
  const leaderboardService = new LeaderboardService()
  const leaderboardStorageService = new LeaderboardStorageService()
  const scoreCalculationService = new ScoreCalculationService()
  const preferencesService = new PreferencesService()
  const autoSaveMiddleware = new AutoSaveMiddleware(localStorageService, 10)
  const levelService = new LevelService()
  const combatService = new CombatService(random, ringService, hungerService, debugService)
  const pathfindingService = new PathfindingService(levelService)
  const monsterAIService = new MonsterAIService(pathfindingService, random, fovService, levelService)
  const specialAbilityService = new SpecialAbilityService(random)
  const wanderingMonsterService = new WanderingMonsterService(monsterSpawnService, random)
  const turnService = new TurnService(statusEffectService, levelService, ringService, wanderingMonsterService, messageService)
  const goldService = new GoldService(random)
  const monsterTurnService = new MonsterTurnService(
    random,
    monsterAIService,
    combatService,
    specialAbilityService,
    messageService,
    turnService,
    goldService,
    levelService
  )
  const doorService = new DoorService()
  const potionService = new PotionService(random, identificationService, levelingService, statusEffectService)
  const curseService = new CurseService()
  const scrollService = new ScrollService(
    identificationService,
    inventoryService,
    levelService,
    fovService,
    random,
    dungeonService,
    curseService
  )
  const targetingService = new TargetingService(fovService, movementService)
  const wandService = new WandService(identificationService, random, combatService, targetingService)
  const modalController = new ModalController(identificationService, curseService)

  // Dungeon configuration
  // Note: Dungeon is larger than viewport (80×22) to enable camera scrolling
  const dungeonConfig = {
    width: 100,
    height: 50,
    minRooms: 6,
    maxRooms: 12,
    minRoomSize: 3,
    maxRoomSize: 10,
    minSpacing: 2,
    loopChance: 0.25,
  }

  // Create UI with return to menu callback (will be set in startGame)
  let renderer: GameRenderer
  let inputHandler: InputHandler

  // Create GameStateManager for state stack management
  const stateManager = new GameStateManager()

  // Create initial game state
  function createInitialState(characterName: string): GameState {
  // Generate unique seed for this game
  const gameSeed = `seed-${Date.now()}`

  // Create new random service with game-specific seed
  const gameRandom = new SeededRandom(gameSeed)
  const gameDungeonService = new DungeonService(gameRandom, monsterSpawnService, itemData)
  const gameItemSpawnService = new ItemSpawnService(gameRandom, itemData)

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

  // Create starting leather armor (matching original Rogue 1980)
  const leatherArmor = gameItemSpawnService.createStartingLeatherArmor(startPos)

  // Roll for exceptional strength (1% chance, matching original Rogue 1980)
  const exceptionalRoll = gameRandom.nextInt(1, 100)
  let startingStrength = 16
  let strengthPercentile: number | undefined = undefined

  if (exceptionalRoll === 1) {
    // 1% chance for exceptional strength (18/XX)
    startingStrength = 18
    strengthPercentile = gameRandom.nextInt(1, 100)
  }

  const player = {
    position: startPos,
    hp: 12,
    maxHp: 12,
    strength: startingStrength,
    maxStrength: startingStrength,
    strengthPercentile,
    ac: 8, // With starting leather armor equipped (AC 8)
    level: 1,
    xp: 0,
    gold: 0,
    hunger: 1300,
    equipment: {
      weapon: null,
      armor: leatherArmor, // Start with leather armor equipped
      leftRing: null,
      rightRing: null,
      lightSource: torch,
    },
    inventory: [],
    statusEffects: [],
    energy: 100, // Start with full energy (can act immediately)
    isRunning: false, // Not running initially
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

  // Build initial messages
  const initialMessages: Array<{ text: string; type: 'info' | 'combat' | 'warning' | 'critical'; turn: number }> = [
    {
      text: 'Welcome to the dungeon. You are equipped with leather armor and a torch. Find the Amulet of Yendor!',
      type: 'info',
      turn: 0,
    },
  ]

  // Add exceptional strength message if rolled
  if (strengthPercentile !== undefined) {
    initialMessages.push({
      text: `You feel unusually strong! (Str 18/${strengthPercentile.toString().padStart(2, '0')})`,
      type: 'info',
      turn: 0,
    })
  }

  return {
    player,
    currentLevel: 1,
    levels: new Map([[1, level]]),
    visibleCells,
    messages: initialMessages,
    turnCount: 0,
    seed: gameSeed,
    gameId: 'game-' + Date.now(),
    characterName,
    isGameOver: false,
    hasWon: false,
    hasAmulet: false,
    itemNameMap,
    identifiedItems: new Set(),
    detectedMonsters: new Set(),
    detectedMagicItems: new Set(),
    debug: debugService.initializeDebugState(),
    positionHistory: [], // Track last 3 positions for door slam detection
    // Run statistics (initialized to 0)
    monstersKilled: 0,
    itemsFound: 0,
    itemsUsed: 0,
    levelsExplored: 1, // Starting level counts as explored
  }
  }

  // Callback to start completely new game with random seed
  function startNewGame(characterName: string) {
    // Clean up previous game's event listeners
    if (currentKeydownHandler) {
      document.removeEventListener('keydown', currentKeydownHandler)
      currentKeydownHandler = null
    }

    // Clear state stack
    stateManager.clearStack()

    const newState = createInitialState(characterName)
    startGame(newState)
  }

  // Callback to replay game with specific seed
  function replaySeed(seed: string, characterName: string) {
    // Clean up previous game's event listeners
    if (currentKeydownHandler) {
      document.removeEventListener('keydown', currentKeydownHandler)
      currentKeydownHandler = null
    }

    // Clear state stack
    stateManager.clearStack()

    // Create new game with specified seed
    const gameRandom = new SeededRandom(seed)
    const gameDungeonService = new DungeonService(gameRandom, monsterSpawnService, itemData)
    const gameItemSpawnService = new ItemSpawnService(gameRandom, itemData)

    const level = gameDungeonService.generateLevel(1, dungeonConfig)
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

    // Create starting leather armor (matching original Rogue 1980)
    const leatherArmor = gameItemSpawnService.createStartingLeatherArmor(startPos)

    // Roll for exceptional strength (1% chance, matching original Rogue 1980)
    const exceptionalRoll = gameRandom.nextInt(1, 100)
    let startingStrength = 16
    let strengthPercentile: number | undefined = undefined

    if (exceptionalRoll === 1) {
      // 1% chance for exceptional strength (18/XX)
      startingStrength = 18
      strengthPercentile = gameRandom.nextInt(1, 100)
    }

    const player = {
      position: startPos,
      hp: 12,
      maxHp: 12,
      strength: startingStrength,
      maxStrength: startingStrength,
      strengthPercentile,
      ac: 8, // With starting leather armor equipped (AC 8)
      level: 1,
      xp: 0,
      gold: 0,
      hunger: 1300,
      equipment: {
        weapon: null,
        armor: leatherArmor, // Start with leather armor equipped
        leftRing: null,
        rightRing: null,
        lightSource: torch,
      },
      inventory: [],
      statusEffects: [],
      energy: 100, // Start with full energy (can act immediately)
      isRunning: false, // Not running initially
    }

    const visibleCells = fovService.computeFOV(
      startPos,
      lightingService.getLightRadius(torch),
      level
    )

    visibleCells.forEach((key) => {
      const pos = fovService.keyToPos(key)
      level.explored[pos.y][pos.x] = true
    })

    const itemNameMap = identificationService.generateItemNames()

    // Build initial messages
    const initialMessages: Array<{ text: string; type: 'info' | 'combat' | 'warning' | 'critical'; turn: number }> = [
      {
        text: 'Welcome to the dungeon. You are equipped with leather armor and a torch. Find the Amulet of Yendor!',
        type: 'info',
        turn: 0,
      },
    ]

    // Add exceptional strength message if rolled
    if (strengthPercentile !== undefined) {
      initialMessages.push({
        text: `You feel unusually strong! (Str 18/${strengthPercentile.toString().padStart(2, '0')})`,
        type: 'info',
        turn: 0,
      })
    }

    const replayState: GameState = {
      player,
      currentLevel: 1,
      levels: new Map([[1, level]]),
      visibleCells,
      messages: initialMessages,
      turnCount: 0,
      seed,
      gameId: 'game-' + Date.now(),
      characterName,
      isGameOver: false,
      hasWon: false,
      hasAmulet: false,
      itemNameMap,
      identifiedItems: new Set(),
      detectedMonsters: new Set(),
      detectedMagicItems: new Set(),
      debug: debugService.initializeDebugState(),
      positionHistory: [], // Track last 3 positions for door slam detection
      monstersKilled: 0,
      itemsFound: 0,
      itemsUsed: 0,
      levelsExplored: 1,
    }

    startGame(replayState)
  }

  // Function to start game with given state
  function startGame(initialState: GameState) {
    let gameState = initialState

    // Initialize renderer and inputHandler with all callbacks
    renderer = new GameRenderer(
      renderingService,
      assetLoaderService,
      hungerService,
      levelingService,
      debugService,
      contextService,
      victoryService,
      localStorageService,
      deathService,
      leaderboardService,
      leaderboardStorageService,
      scoreCalculationService,
      preferencesService,
      ringService,
      returnToMenu,
      startNewGame,
      replaySeed
    )

    // Create dependencies container for InputHandler
    const gameDependencies: GameDependencies = {
      movement: movementService,
      lighting: lightingService,
      fov: fovService,
      message: messageService,
      random: random,
      turn: turnService,
      level: levelService,
      dungeon: dungeonService,
      dungeonConfig: dungeonConfig,
      combat: combatService,
      gold: goldService,
      hunger: hungerService,
      regeneration: regenerationService,
      leveling: levelingService,
      statusEffect: statusEffectService,
      inventory: inventoryService,
      identification: identificationService,
      curse: curseService,
      ring: ringService,
      potion: potionService,
      scroll: scrollService,
      wand: wandService,
      door: doorService,
      targeting: targetingService,
      localStorage: localStorageService,
      notification: notificationService,
      victory: victoryService,
      debug: debugService,
    }

    inputHandler = new InputHandler(
      gameDependencies,
      modalController,
      renderer.getMessageHistoryModal(),
      renderer.getHelpModal(),
      returnToMenu,
      stateManager,
      renderer
    )

    // Render initial state
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = ''
      app.appendChild(renderer.getContainer())
    }

    // Create PlayingState and push onto state manager
    const playingState = new PlayingState(
      gameState,
      renderer,
      inputHandler,
      monsterTurnService,
      turnService,
      autoSaveMiddleware,
      preferencesService,
      messageService
    )

    // Clear any existing states and push PlayingState
    stateManager.clearStack()
    stateManager.pushState(playingState)

    // Render all visible states (for transparent state support)
    // This ensures transparent states show dimmed backgrounds correctly
    const renderAllVisibleStates = () => {
      const visibleStates = stateManager.getVisibleStates()
      visibleStates.forEach((state) => {
        state.render()
      })
    }

    // Input handling - delegate to current state
    // The state manager will call handleInput() on the top state
    currentKeydownHandler = (event: KeyboardEvent) => {
      const currentState = stateManager.getCurrentState()
      if (currentState) {
        // Convert KeyboardEvent to Input
        const input: Input = {
          key: event.key,
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
        }
        currentState.handleInput(input)

        // Render all visible states after input is processed
        // This ensures transparent states (targeting, inventory) show correctly
        renderAllVisibleStates()
      }
    }
    document.addEventListener('keydown', currentKeydownHandler)

    console.log('Game initialized. Use arrow keys to move.')
  }

  // Create main menu instance
  const mainMenu = new MainMenu(leaderboardService, leaderboardStorageService, preferencesService)

  // Track active event listeners for cleanup
  let currentKeydownHandler: ((e: KeyboardEvent) => void) | null = null

  // Return to main menu (used by quit, death, victory)
  function returnToMenu() {
    // Hide any visible screens first (death/victory screens are on document.body)
    if (renderer) {
      renderer.hideDeathScreen()
      renderer.hideVictoryScreen()
      renderer.cleanupResizeHandler()
    }

    // Clean up game event listeners
    if (currentKeydownHandler) {
      document.removeEventListener('keydown', currentKeydownHandler)
      currentKeydownHandler = null
    }

    // Clear state stack (removes all game states)
    stateManager.clearStack()

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
      (characterName: string) => {
        const newState = createInitialState(characterName)
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
          // If load fails, fall back to new game with default character name
          const newState = createInitialState('Unknown Hero')
          startGame(newState)
        }
      },
      // Custom Seed callback
      (seed: string, characterName: string) => {
        console.log('Starting game with custom seed:', seed)
        replaySeed(seed, characterName)
      }
    )
  }

  // Initialize - show main menu
  showMainMenu()
}

// Start the game
initializeGame()
