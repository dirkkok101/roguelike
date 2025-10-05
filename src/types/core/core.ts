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
}

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
  lightSource: LightSource | null
}

export interface Player {
  position: Position
  hp: number
  maxHp: number
  strength: number
  maxStrength: number
  ac: number
  level: number
  xp: number
  gold: number
  hunger: number
  equipment: Equipment
  inventory: Item[]
}

export interface Monster {
  id: string
  letter: string
  name: string
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

export interface MonsterAIProfile {
  behavior: MonsterBehavior | MonsterBehavior[]
  intelligence: number
  aggroRange: number
  fleeThreshold: number
  special: string[]
}

export interface DebugState {
  godMode: boolean              // Player invincible, infinite resources
  mapRevealed: boolean          // All tiles visible
  debugConsoleVisible: boolean  // Debug console UI visible
  fovOverlay: boolean           // FOV visualization (Phase 6)
  pathOverlay: boolean          // Pathfinding visualization (Phase 6)
  aiOverlay: boolean            // AI state visualization (Phase 6)
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
  isGameOver: boolean
  hasWon: boolean
  hasAmulet: boolean // Player has retrieved the Amulet of Yendor
  deathCause?: string // Reason for player death (e.g., "Killed by Orc")
  itemNameMap: ItemNameMap // Random descriptive names for this game
  identifiedItems: Set<string> // Item types that have been identified
  debug?: DebugState // Debug state (optional for production builds)
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
}

export interface Weapon extends Item {
  damage: string
  bonus: number
}

export interface Armor extends Item {
  ac: number
  bonus: number
}

export interface Ring extends Item {
  ringType: RingType
  effect: string
  bonus: number
  materialName: string // e.g., "ruby", "sapphire", "wooden"
  hungerModifier: number // multiplier for hunger rate (1.5 = 50% faster)
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
  potionType: PotionType
  effect: string
  power: string // dice notation for healing, etc.
  descriptorName: string // e.g., "blue potion", "fizzy potion"
}

export enum PotionType {
  HEAL = 'HEAL',
  EXTRA_HEAL = 'EXTRA_HEAL',
  GAIN_STRENGTH = 'GAIN_STRENGTH',
  RESTORE_STRENGTH = 'RESTORE_STRENGTH',
  POISON = 'POISON',
  CONFUSION = 'CONFUSION',
  BLINDNESS = 'BLINDNESS',
  HASTE_SELF = 'HASTE_SELF',
  DETECT_MONSTERS = 'DETECT_MONSTERS',
  DETECT_MAGIC = 'DETECT_MAGIC',
  RAISE_LEVEL = 'RAISE_LEVEL',
}

export interface Scroll extends Item {
  scrollType: ScrollType
  effect: string
  labelName: string // e.g., "scroll labeled XYZZY"
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
  wandType: WandType
  damage: string // dice notation for damage wands
  charges: number // max charges
  currentCharges: number
  woodName: string // e.g., "oak wand", "pine staff"
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
  nutrition: number // hunger units restored
}

export interface OilFlask extends Item {
  fuelAmount: number // fuel units provided (typically 500)
}

export interface GoldPile {
  position: Position
  amount: number
}
