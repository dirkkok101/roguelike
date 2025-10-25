// ============================================================================
// CORE TYPES
// ============================================================================

export interface Position {
  x: number
  y: number
}

export enum TileType {
  WALL = 'WALL',
  FLOOR = 'FLOOR',
  CORRIDOR = 'CORRIDOR',
  DOOR = 'DOOR',
  TRAP = 'TRAP',
}

export interface Tile {
  type: TileType
  char: string
  walkable: boolean
  transparent: boolean
  colorVisible: string
  colorExplored: string
  isRoom: boolean  // NEW: Marks room tiles vs corridor/wall/door tiles
}

export enum DoorState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED',
  BROKEN = 'BROKEN',
  SECRET = 'SECRET',
  ARCHWAY = 'ARCHWAY',
}

export interface Door {
  position: Position
  state: DoorState
  discovered: boolean
  orientation: 'horizontal' | 'vertical'
  connectsRooms: [number, number]
}

export interface Room {
  id: number
  x: number
  y: number
  width: number
  height: number
}

export enum TrapType {
  BEAR = 'BEAR',
  DART = 'DART',
  TELEPORT = 'TELEPORT',
  SLEEP = 'SLEEP',
  PIT = 'PIT',
}

export interface Trap {
  type: TrapType
  position: Position
  discovered: boolean
  triggered: boolean
}

export interface Level {
  depth: number
  width: number
  height: number
  tiles: Tile[][]
  rooms: Room[]
  doors: Door[]
  traps: Trap[]
  monsters: Monster[]
  items: Item[]
  gold: GoldPile[]
  stairsUp: Position | null
  stairsDown: Position | null
  explored: boolean[][]
  wanderingMonsterCount?: number // Count of wandering monsters spawned (max 5)
  lastWanderingSpawnTurn?: number // Turn number of last wandering monster spawn
}

/**
 * @deprecated Use Torch, Lantern, or Artifact interfaces instead.
 * This interface is kept temporarily for backwards compatibility
 * but will be removed once all references are updated.
 *
 * Fuel now lives directly on Torch/Lantern items, not in a nested object.
 */
export interface LightSource {
  type: 'torch' | 'lantern' | 'artifact'
  radius: number
  isPermanent: boolean
  fuel?: number
  maxFuel?: number
  name: string
}

export interface Equipment {
  weapon: Weapon | null
  armor: Armor | null
  leftRing: Ring | null
  rightRing: Ring | null
  lightSource: Torch | Lantern | Artifact | null
}

// ============================================================================
// STATUS EFFECTS
// ============================================================================

export enum StatusEffectType {
  CONFUSED = 'CONFUSED',       // Random movement direction
  BLIND = 'BLIND',             // Cannot see
  HASTED = 'HASTED',           // Double actions per turn
  SLOWED = 'SLOWED',           // Half movement speed
  PARALYZED = 'PARALYZED',     // Cannot move
  LEVITATING = 'LEVITATING',   // Can cross traps
  SEE_INVISIBLE = 'SEE_INVISIBLE', // Can see invisible monsters
  HELD = 'HELD',               // Frozen in place (HOLD_MONSTER scroll)
  SLEEPING = 'SLEEPING',       // Asleep, cannot act (SLEEP scroll)
}

export interface StatusEffect {
  type: StatusEffectType
  duration: number
  intensity?: number // Optional: for effects that stack or have varying power
}

export interface Player {
  position: Position
  hp: number
  maxHp: number
  strength: number
  maxStrength: number
  strengthPercentile?: number // Exceptional strength percentile (1-100, only when strength=18)
  ac: number
  level: number
  xp: number
  gold: number
  hunger: number
  equipment: Equipment
  inventory: Item[]
  statusEffects: StatusEffect[]
  energy: number // Energy for turn system (0-199 typical range)
  isRunning: boolean // Track if player is running (increases monster detection range)
  runState: RunState | null // Active run state (null when not running)
}

export interface Monster {
  id: string
  letter: string
  name: string
  spriteName: string // Sprite name for tileset lookup
  position: Position
  hp: number
  maxHp: number
  ac: number
  damage: string
  xpValue: number
  aiProfile: MonsterAIProfile
  isAsleep: boolean
  isAwake: boolean
  state: MonsterState
  visibleCells: Set<string>
  currentPath: Position[] | null
  hasStolen: boolean
  level: number
  lastKnownPlayerPosition?: Position | null // Memory: last position where monster saw player
  turnsWithoutSight?: number // Counter: how many turns since monster last saw player
  energy: number // Energy for turn system (0-199 typical range)
  speed: number // Base speed (5=slow, 10=normal, 20=fast)
  isInvisible: boolean // True for Phantoms, revealed by SEE_INVISIBLE potion (default false)
  statusEffects: StatusEffect[] // Status effects (HELD, CONFUSED, etc.)
}

export enum MonsterBehavior {
  SMART = 'SMART',
  GREEDY = 'GREEDY',
  ERRATIC = 'ERRATIC',
  SIMPLE = 'SIMPLE',
  THIEF = 'THIEF',
  STATIONARY = 'STATIONARY',
  COWARD = 'COWARD',
}

export enum MonsterState {
  SLEEPING = 'SLEEPING',
  WANDERING = 'WANDERING',
  HUNTING = 'HUNTING',
  FLEEING = 'FLEEING',
}

/**
 * SpecialAbilityFlag - Type-safe special ability identifiers
 *
 * These flags control monster special abilities and passive traits.
 * Used in monsters.json and checked by SpecialAbilityService.
 */
export enum SpecialAbilityFlag {
  // On-hit effects
  RUSTS_ARMOR = 'rusts_armor',
  FREEZES = 'freezes',
  CONFUSES = 'confuses',
  DRAINS_STRENGTH = 'drains_strength',
  DRAINS_XP = 'drains_xp',
  DRAINS_MAX_HP = 'drains_max_hp',
  HOLDS = 'holds',
  STEALS = 'steals',

  // Passive abilities
  REGENERATION = 'regeneration',
  BREATH_WEAPON = 'breath_weapon',
  FLYING = 'flying',
  INVISIBLE = 'invisible',
  MEAN = 'mean',
}

export interface MonsterAIProfile {
  behavior: MonsterBehavior | MonsterBehavior[]
  intelligence: number
  aggroRange: number
  fleeThreshold: number
  chaseChance?: number // Probability to chase per turn (0.0-1.0, default 1.0). MEAN monsters use 0.67 (67% chance)
  special: SpecialAbilityFlag[]
}

/**
 * MonsterTemplate - Data structure loaded from monsters.json
 *
 * Represents the template/definition for a monster type, not a runtime instance.
 * Used by MonsterSpawnService to create Monster instances with appropriate stats.
 */
export interface MonsterTemplate {
  letter: string // Monster display character ('B', 'K', 'D', etc.)
  name: string // Display name ("Bat", "Kobold", "Dragon")
  spriteName: string // Sprite name for tileset lookup ("Fruit bat", "Water elemental", etc.)
  hp: string // HP dice notation ("1d8", "10d8", etc.)
  ac: number // Armor class (lower = harder to hit)
  damage: string // Damage dice notation ("1d2", "1d8+3d10", etc.)
  xpValue: number // XP awarded on kill
  level: number // Dungeon depth where this monster starts appearing (1-10)
  speed: number // Energy gain rate (5=slow, 10=normal, 15=fast, 18+=very fast)
  rarity: 'common' | 'uncommon' | 'rare' // Spawn frequency (common=50%, uncommon=30%, rare=20%)
  mean: boolean // If true, starts awake and aggressive (no sleep chance)
  vorpalness: number // 0-25 scale for spawn depth control (authentic Rogue vorpal spawn ranges)
  aiProfile: MonsterAIProfile // AI behavior configuration
}

export interface DebugState {
  godMode: boolean              // Player invincible, infinite resources
  mapRevealed: boolean          // All tiles visible
  debugConsoleVisible: boolean  // Debug console UI visible
  fovOverlay: boolean           // FOV visualization (Phase 6)
  pathOverlay: boolean          // Pathfinding visualization (Phase 6)
  aiOverlay: boolean            // AI state visualization (Phase 6)
}

/**
 * GameConfig - Global game configuration
 *
 * Controls game behavior and features.
 */
export interface GameConfig {
  fovMode: 'radius' | 'room-reveal' // Field of view mode: radius-based (default) or room-reveal (1980 Rogue)
}

export interface GameState {
  player: Player
  currentLevel: number
  levels: Map<number, Level>
  visibleCells: Set<string>
  messages: Message[]
  turnCount: number
  seed: string
  gameId: string
  characterName: string // Player's character name for leaderboard
  isGameOver: boolean
  hasWon: boolean
  hasAmulet: boolean // Player has retrieved the Amulet of Yendor
  levelsVisitedWithAmulet: Set<number> // Tracks which levels had monsters respawn during ascent with Amulet
  maxDepth: number // Maximum dungeon depth (26 levels)
  deathCause?: string // Reason for player death (e.g., "Killed by Orc")
  itemNameMap: ItemNameMap // Random descriptive names for this game
  identifiedItems: Set<string> // Item types that have been identified
  debug?: DebugState // Debug state (optional for production builds)
  config: GameConfig // Game configuration (FOV mode, etc.)

  // Detection state (from detection potions)
  detectedMonsters: Set<string> // Monster IDs revealed by DETECT_MONSTERS potion
  detectedMagicItems: Set<string> // Magic item IDs highlighted by DETECT_MAGIC potion

  // Run statistics (for death screen and achievements)
  monstersKilled: number // Total monsters killed this run
  itemsFound: number // Total items picked up this run
  itemsUsed: number // Total consumable items used (potions, scrolls, wands)
  levelsExplored: number // Count of unique dungeon levels visited

  // Targeting state (active during target selection)
  targeting?: TargetingState // Active targeting state (optional)

  // Position history for door slam detection (tracks last 3 positions)
  positionHistory?: Position[] // Track player movement pattern (max length 3)

  // Death details (populated only on death)
  deathDetails?: {
    finalBlow: {
      damage: number
      attacker: string
      playerHPRemaining: number
    }
  }
}

export interface ItemNameMap {
  potions: Map<PotionType, string> // PotionType -> "blue potion"
  scrolls: Map<ScrollType, string> // ScrollType -> "scroll labeled XYZZY"
  rings: Map<RingType, string> // RingType -> "ruby ring"
  wands: Map<WandType, string> // WandType -> "oak wand"
}

export interface Message {
  text: string
  type: 'info' | 'combat' | 'warning' | 'critical' | 'success'
  turn: number
  count?: number // For grouped messages
  importance?: number // 1 (low) to 5 (critical)
}

// Item types (minimal for Phase 1, expanded in Phase 5)
export interface Item {
  id: string
  name: string
  type: ItemType
  identified: boolean
  position: Position
}

export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  POTION = 'POTION',
  SCROLL = 'SCROLL',
  RING = 'RING',
  WAND = 'WAND',
  FOOD = 'FOOD',
  GOLD = 'GOLD',
  AMULET = 'AMULET',
  OIL_FLASK = 'OIL_FLASK',
  TORCH = 'TORCH',
  LANTERN = 'LANTERN',
}

export interface Weapon extends Item {
  spriteName: string // Sprite name for tileset lookup
  damage: string
  bonus: number
  cursed?: boolean // Cursed weapons cannot be unwielded
}

export interface Armor extends Item {
  spriteName: string // Sprite name for tileset lookup
  ac: number
  bonus: number
  cursed?: boolean // Cursed armor cannot be removed
}

export interface Ring extends Item {
  spriteName: string // Sprite name for tileset lookup
  ringType: RingType
  effect: string
  bonus: number
  materialName: string // e.g., "ruby", "sapphire", "wooden"
  hungerModifier: number // multiplier for hunger rate (1.5 = 50% faster)
  cursed?: boolean // Cursed rings cannot be removed
}

export enum RingType {
  PROTECTION = 'PROTECTION',
  REGENERATION = 'REGENERATION',
  SEARCHING = 'SEARCHING',
  SEE_INVISIBLE = 'SEE_INVISIBLE',
  SLOW_DIGESTION = 'SLOW_DIGESTION',
  ADD_STRENGTH = 'ADD_STRENGTH',
  SUSTAIN_STRENGTH = 'SUSTAIN_STRENGTH',
  DEXTERITY = 'DEXTERITY',
  TELEPORTATION = 'TELEPORTATION',
  STEALTH = 'STEALTH',
}

export interface Potion extends Item {
  spriteName: string // Sprite name for tileset lookup
  potionType: PotionType
  effect: string
  power: string // dice notation for healing, etc.
  descriptorName: string // e.g., "blue potion", "fizzy potion"
}

export enum PotionType {
  MINOR_HEAL = 'MINOR_HEAL',
  MEDIUM_HEAL = 'MEDIUM_HEAL',
  MAJOR_HEAL = 'MAJOR_HEAL',
  SUPERIOR_HEAL = 'SUPERIOR_HEAL',
  GAIN_STRENGTH = 'GAIN_STRENGTH',
  RESTORE_STRENGTH = 'RESTORE_STRENGTH',
  POISON = 'POISON',
  CONFUSION = 'CONFUSION',
  BLINDNESS = 'BLINDNESS',
  HASTE_SELF = 'HASTE_SELF',
  DETECT_MONSTERS = 'DETECT_MONSTERS',
  DETECT_MAGIC = 'DETECT_MAGIC',
  RAISE_LEVEL = 'RAISE_LEVEL',
  SEE_INVISIBLE = 'SEE_INVISIBLE',
  LEVITATION = 'LEVITATION',
}

export interface Scroll extends Item {
  spriteName: string // Sprite name for tileset lookup
  scrollType: ScrollType
  effect: string
  labelName: string // e.g., "scroll labeled XYZZY"
  droppedAtTurn?: number // Track when scare scroll was dropped (for deterioration)
}

export enum ScrollType {
  IDENTIFY = 'IDENTIFY',
  ENCHANT_WEAPON = 'ENCHANT_WEAPON',
  ENCHANT_ARMOR = 'ENCHANT_ARMOR',
  MAGIC_MAPPING = 'MAGIC_MAPPING',
  TELEPORTATION = 'TELEPORTATION',
  REMOVE_CURSE = 'REMOVE_CURSE',
  CREATE_MONSTER = 'CREATE_MONSTER',
  SCARE_MONSTER = 'SCARE_MONSTER',
  LIGHT = 'LIGHT',
  SLEEP = 'SLEEP',
  HOLD_MONSTER = 'HOLD_MONSTER',
}

export interface Wand extends Item {
  spriteName: string // Sprite name for tileset lookup
  wandType: WandType
  damage: string // dice notation for damage wands
  charges: number // max charges
  currentCharges: number
  woodName: string // e.g., "oak wand", "pine staff"
  range: number // maximum targeting range (5-8 tiles)
}

export enum WandType {
  LIGHTNING = 'LIGHTNING',
  FIRE = 'FIRE',
  COLD = 'COLD',
  MAGIC_MISSILE = 'MAGIC_MISSILE',
  SLEEP = 'SLEEP',
  HASTE_MONSTER = 'HASTE_MONSTER',
  SLOW_MONSTER = 'SLOW_MONSTER',
  POLYMORPH = 'POLYMORPH',
  TELEPORT_AWAY = 'TELEPORT_AWAY',
  CANCELLATION = 'CANCELLATION',
}

export interface Food extends Item {
  spriteName: string // Sprite name for tileset lookup
  nutrition: number // hunger units restored
}

export interface OilFlask extends Item {
  spriteName: string // Sprite name for tileset lookup
  fuelAmount: number // fuel units provided (typically 500)
}

export interface Torch extends Item {
  type: ItemType.TORCH
  spriteName: string // Sprite name for tileset lookup
  fuel: number
  maxFuel: number
  radius: number
  isPermanent: false
}

export interface Lantern extends Item {
  type: ItemType.LANTERN
  spriteName: string // Sprite name for tileset lookup
  fuel: number
  maxFuel: number
  radius: number
  isPermanent: false
}

export interface Artifact extends Item {
  type: ItemType.TORCH // Artifacts are magical torches
  spriteName: string // Sprite name for tileset lookup
  radius: number
  isPermanent: true
  // No fuel properties - artifacts never run out
}

export interface GoldPile {
  position: Position
  amount: number
}

export interface Amulet extends Item {
  type: ItemType.AMULET
  spriteName: string
  cursed: boolean
}

// ============================================================================
// TARGETING TYPES
// ============================================================================

/**
 * Targeting mode for ranged interactions (wands, bows, spells)
 */
export enum TargetingMode {
  MONSTER = 'MONSTER',       // Target specific monster (wands, spells)
  DIRECTION = 'DIRECTION',   // Target direction for ray (fire, lightning, cold)
  POSITION = 'POSITION',     // Target ground position (teleport, area spells)
}

/**
 * Direction vector for directional targeting
 */
export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'

/**
 * Player run state - tracks continuous movement in one direction
 * Used by RunCommand and MoveCommand for automatic movement with disturbance detection
 */
export interface RunState {
  direction: Direction                // Direction of run (up/down/left/right, etc.)
  startingFOV: Set<string>            // Monster IDs visible when run started
  startingPosition: Position          // Where run began (for corridor logic)
  previousHP: number                  // HP when run started (to detect damage)
}

/**
 * Request for targeting (passed from command to UI)
 */
export interface TargetingRequest {
  mode: TargetingMode
  maxRange: number                    // Maximum targeting range (from wand/weapon)
  requiresLOS: boolean                // Must target be in line of sight?
  allowSelf?: boolean                 // Can target self? (healing potions)
  validationFn?: (target: any) => TargetValidation  // Custom validation
}

/**
 * Result of targeting (returned from UI to command)
 */
export interface TargetingResult {
  success: boolean
  targetMonsterId?: string            // For MONSTER mode
  direction?: Direction               // For DIRECTION mode
  position?: Position                 // For POSITION mode
  message?: string                    // Error message if !success
}

/**
 * Validation result for target
 */
export interface TargetValidation {
  isValid: boolean
  reason?: string                     // Why invalid? (for error messages)
}

/**
 * Active targeting state (added to GameState during targeting)
 */
export interface TargetingState {
  active: boolean
  mode: TargetingMode
  currentTargetId?: string            // Currently selected monster
  currentTargetIndex: number          // Index in visibleMonsters array
  visibleMonsters: Monster[]          // All visible monsters (sorted by distance)
  validTargets: Set<string>           // Monster IDs that are valid targets
  maxRange: number
  cursorPosition?: Position           // For DIRECTION/POSITION modes
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard entry for a single game run (victory or death)
 * Combines data from VictoryStats and ComprehensiveDeathStats
 */
export interface LeaderboardEntry {
  // Meta
  id: string // Unique entry ID (gameId + timestamp)
  gameId: string // Game instance ID
  characterName: string // Player's character name
  timestamp: number // Unix timestamp (milliseconds)
  seed: string // Dungeon seed for verification

  // Outcome
  isVictory: boolean // True = victory, False = death
  score: number // Calculated score (VictoryService formula)

  // Death info (null if victory)
  deathCause: string | null // "Killed by Orc", "Starved to death"
  epitaph: string | null // Flavor text

  // Character progression
  finalLevel: number // Player character level
  totalXP: number // Total experience earned
  totalGold: number // Total gold collected

  // Exploration
  deepestLevel: number // Deepest dungeon level reached
  levelsExplored: number // Number of levels explored
  totalTurns: number // Total turns taken

  // Combat
  monstersKilled: number // Total monster kills

  // Items
  itemsFound: number // Items picked up
  itemsUsed: number // Consumables used (potions, scrolls, wands)

  // Achievements (top 3 from run)
  achievements: string[]

  // Equipment (snapshot at death/victory)
  // Always populated - uses "None" for unequipped slots
  finalEquipment: {
    weapon: string // "Long Sword +2" or "None"
    armor: string // "Chain Mail +1" or "None"
    lightSource: string // "Phial of Galadriel" or "None"
    rings: string[] // ["Ring of Regeneration"] or [] for empty
  }

  // Efficiency metrics (derived)
  scorePerTurn?: number // score / turns (efficiency rating)
  killsPerLevel?: number // monstersKilled / deepestLevel
}

/**
 * Aggregate statistics across all leaderboard entries
 * Calculated on-demand from entries
 */
export interface AggregateStatistics {
  // Overview
  totalGamesPlayed: number
  totalVictories: number
  totalDeaths: number
  winRate: number // victories / gamesPlayed (percentage)

  // High scores
  highestScore: number
  highestScoringRun: LeaderboardEntry | null

  // Exploration
  deepestLevelEverReached: number
  totalTurnsAcrossAllRuns: number
  averageTurnsPerRun: number

  // Combat
  totalMonstersKilled: number
  mostKillsInSingleRun: number

  // Efficiency
  fastestVictory: LeaderboardEntry | null // Lowest turn count victory
  highestScorePerTurn: LeaderboardEntry | null // Most efficient run

  // Progression
  averageScore: number
  averageFinalLevel: number
  totalGoldCollected: number

  // Recent performance (last 10 runs)
  recentWinRate: number
  recentAverageScore: number

  // Streaks
  currentWinStreak: number
  longestWinStreak: number
  currentDeathStreak: number
}

/**
 * User-configurable filters for leaderboard view
 */
export interface LeaderboardFilters {
  // Filter criteria
  outcome: 'all' | 'victories' | 'deaths'
  dateRange: 'all-time' | 'last-7-days' | 'last-30-days' | 'custom'
  customDateStart?: number // Unix timestamp
  customDateEnd?: number // Unix timestamp
  minScore?: number // Score threshold
  minLevel?: number // Level threshold
  seed?: string // Filter by specific seed

  // Sorting
  sortBy: 'score' | 'date' | 'turns' | 'level' | 'gold' | 'kills'
  sortOrder: 'desc' | 'asc' // Descending (default) or ascending

  // Pagination
  limit: number // Max entries to display (10, 25, 50, 100)
  offset: number // Pagination offset
}

/**
 * Default filter configuration
 */
export const DEFAULT_LEADERBOARD_FILTERS: LeaderboardFilters = {
  outcome: 'all',
  dateRange: 'all-time',
  sortBy: 'score',
  sortOrder: 'desc',
  limit: 25,
  offset: 0,
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

/**
 * Input structure for state input handling
 */
export interface Input {
  key: string
  shift: boolean
  ctrl: boolean
  alt: boolean
}

/**
 * Game state types for the state stack
 */
export enum GameStateType {
  MAIN_MENU = 'MAIN_MENU',
  NEW_GAME_DIALOG = 'NEW_GAME_DIALOG',
  PLAYING = 'PLAYING',
  INVENTORY = 'INVENTORY',
  ITEM_SELECTION = 'ITEM_SELECTION',
  TARGET_SELECTION = 'TARGET_SELECTION',
  DEATH_SCREEN = 'DEATH_SCREEN',
  VICTORY_SCREEN = 'VICTORY_SCREEN',
  LEADERBOARD = 'LEADERBOARD',
}

/**
 * Core game state interface - represents a screen or dialog in the state stack
 */
export interface IGameState {
  /** Called when state becomes active (pushed onto stack or previous state popped) */
  enter(): void

  /** Called when state is removed from stack or new state pushed on top */
  exit(): void

  /** Game tick logic - only called if state is not paused */
  update(deltaTime: number): void

  /** Drawing logic - called for all visible states in stack */
  render(): void

  /** Input processing - only called for top state */
  handleInput(input: Input): void | Promise<void>

  /** Should lower states in stack continue updating? */
  isPaused(): boolean

  /** Should lower states in stack be visible (dimmed)? */
  isTransparent(): boolean

  /** Which keys should this state handle? (null = all keys, array = specific keys only) */
  getAllowedKeys(): string[] | null
}

/**
 * Summary of a saved game for leaderboard display
 * Extracted from SaveDocument metadata
 */
export interface SaveSummary {
  gameId: string
  characterName: string
  status: 'ongoing' | 'died' | 'won'
  score: number
  gold: number
  level: number
  turnCount: number
  timestamp: number
  maxDepth: number
  monstersKilled: number
}
