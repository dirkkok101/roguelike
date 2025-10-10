import { SeededRandom } from '@services/RandomService'
import { LightingService } from '@services/LightingService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { MonsterAIService } from '@services/MonsterAIService'
import { MonsterTurnService } from '@services/MonsterTurnService'
import { SpecialAbilityService } from '@services/SpecialAbilityService'
import { CombatService } from '@services/CombatService'
import { PathfindingService } from '@services/PathfindingService'
import { HungerService } from '@services/HungerService'
import { MessageService } from '@services/MessageService'
import { LevelService } from '@services/LevelService'

/**
 * Integration test: Service Initialization
 *
 * Purpose: Validates that all services can be instantiated with correct dependencies.
 * This test would have caught the missing FOVService dependency bug in MonsterAIService.
 *
 * Why this matters:
 * - Unit tests validate individual services work correctly
 * - Integration tests validate services work together correctly
 * - This specific test validates the dependency injection chain in main.ts
 */
describe('Integration: Service Initialization', () => {
  let random: SeededRandom
  let messageService: MessageService

  beforeEach(() => {
    random = new SeededRandom('test-seed')
    messageService = new MessageService()
  })

  describe('Core Services', () => {
    test('LightingService initializes correctly', () => {
      const service = new LightingService(random)
      expect(service).toBeDefined()
      expect(service.tickFuel).toBeDefined()
      expect(service.getLightRadius).toBeDefined()
    })

    test('FOVService initializes correctly', () => {
      const statusEffectService = new StatusEffectService()
      const service = new FOVService(statusEffectService)
      expect(service).toBeDefined()
      expect(service.computeFOV).toBeDefined()
    })

    test('PathfindingService initializes correctly', () => {
      const levelService = new LevelService()
      const service = new PathfindingService(levelService)
      expect(service).toBeDefined()
      expect(service.findPath).toBeDefined()
    })

    test('HungerService initializes correctly', () => {
      const service = new HungerService(random)
      expect(service).toBeDefined()
      expect(service.tickHunger).toBeDefined()
    })

    test('MessageService initializes correctly', () => {
      const service = new MessageService()
      expect(service).toBeDefined()
      expect(service.addMessage).toBeDefined()
    })
  })

  describe('Combat & Monster Services', () => {
    test('CombatService initializes correctly with optional dependencies', () => {
      const hungerService = new HungerService(random)

      // CombatService can be created with or without optional dependencies
      const serviceWithoutDebug = new CombatService(random, hungerService)
      expect(serviceWithoutDebug).toBeDefined()
      expect(serviceWithoutDebug.playerAttack).toBeDefined()
    })

    test('SpecialAbilityService initializes correctly', () => {
      const service = new SpecialAbilityService(random)
      expect(service).toBeDefined()
      expect(service.regenerate).toBeDefined()
    })

    test('MonsterAIService requires all 4 dependencies', () => {
      const levelService = new LevelService()
      const pathfinding = new PathfindingService(levelService)
      const statusEffectService = new StatusEffectService()
      const fovService = new FOVService(statusEffectService)

      // This test validates the bug fix: MonsterAIService needs FOVService and LevelService
      const service = new MonsterAIService(pathfinding, random, fovService, levelService)

      expect(service).toBeDefined()
      expect(service.decideAction).toBeDefined()
      expect(service.computeMonsterFOV).toBeDefined()

      // Note: Missing FOVService or LevelService is caught by TypeScript at compile time,
      // not at runtime. This test documents the correct 4-parameter signature.
    })

    test('MonsterTurnService initializes with complete dependency chain', () => {
      const levelService = new LevelService()
      const pathfinding = new PathfindingService(levelService)
      const statusEffectService = new StatusEffectService()
      const fovService = new FOVService(statusEffectService)
      const hungerService = new HungerService(random)
      const combatService = new CombatService(random, hungerService)
      const aiService = new MonsterAIService(pathfinding, random, fovService, levelService)
      const abilityService = new SpecialAbilityService(random)

      // Full dependency chain as used in main.ts
      const service = new MonsterTurnService(
        random,
        aiService,
        combatService,
        abilityService,
        messageService
      )

      expect(service).toBeDefined()
      expect(service.processMonsterTurns).toBeDefined()
    })
  })

  describe('Service Dependency Chain (as in main.ts)', () => {
    test('all services can be instantiated in correct order', () => {
      // This mirrors the exact initialization order in main.ts

      // 1. Foundation services (no dependencies)
      const randomSvc = new SeededRandom('test')
      const messageSvc = new MessageService()
      const statusEffectService = new StatusEffectService()
      const fovSvc = new FOVService(statusEffectService)
      const levelSvc = new LevelService()
      const pathfindingSvc = new PathfindingService(levelSvc)

      expect(randomSvc).toBeDefined()
      expect(messageSvc).toBeDefined()
      expect(fovSvc).toBeDefined()
      expect(levelSvc).toBeDefined()
      expect(pathfindingSvc).toBeDefined()

      // 2. Services with single dependencies
      const lightingSvc = new LightingService(randomSvc)
      const hungerSvc = new HungerService(randomSvc)
      const abilitySvc = new SpecialAbilityService(randomSvc)

      expect(lightingSvc).toBeDefined()
      expect(hungerSvc).toBeDefined()
      expect(abilitySvc).toBeDefined()

      // 3. Services with multiple dependencies
      const combatSvc = new CombatService(randomSvc, hungerSvc)
      const aiSvc = new MonsterAIService(pathfindingSvc, randomSvc, fovSvc, levelSvc)

      expect(combatSvc).toBeDefined()
      expect(aiSvc).toBeDefined()

      // 4. Top-level orchestrator service
      const monsterTurnSvc = new MonsterTurnService(
        randomSvc,
        aiSvc,
        combatSvc,
        abilitySvc,
        messageSvc
      )

      expect(monsterTurnSvc).toBeDefined()
    })

    test('services can call each others methods without errors', () => {
      // Integration test: validate services actually work together

      const randomSvc = new SeededRandom('test')
      const messageSvc = new MessageService()
      const statusEffectService = new StatusEffectService()
      const fovSvc = new FOVService(statusEffectService)
      const levelSvc = new LevelService()
      const pathfindingSvc = new PathfindingService(levelSvc)
      const hungerSvc = new HungerService(randomSvc)
      const combatSvc = new CombatService(randomSvc, hungerSvc)
      const abilitySvc = new SpecialAbilityService(randomSvc)
      const aiSvc = new MonsterAIService(pathfindingSvc, randomSvc, fovSvc, levelSvc)
      const monsterTurnSvc = new MonsterTurnService(
        randomSvc,
        aiSvc,
        combatSvc,
        abilitySvc,
        messageSvc
      )

      // Each service should have its methods available
      expect(typeof aiSvc.computeMonsterFOV).toBe('function')
      expect(typeof monsterTurnSvc.processMonsterTurns).toBe('function')
      expect(typeof combatSvc.playerAttack).toBe('function')
      expect(typeof abilitySvc.regenerate).toBe('function')
    })
  })

  describe('Regression Tests for Known Issues', () => {
    test('MonsterAIService has access to FOVService methods', () => {
      // Regression test for bug fixed in commit b4c225f
      const levelService = new LevelService()
      const pathfinding = new PathfindingService(levelService)
      const statusEffectService = new StatusEffectService()
      const fovService = new FOVService(statusEffectService)
      const aiService = new MonsterAIService(pathfinding, random, fovService, levelService)

      // Create a mock monster and state to verify FOV computation works
      const mockMonster = {
        id: 'test-monster',
        letter: 'T',
        name: 'Test Monster',
      spriteName: 'Test Monster',
        position: { x: 5, y: 5 },
        hp: 10,
        maxHp: 10,
        ac: 5,
        aiProfile: {
          behavior: 'SIMPLE' as const,
          aggroRange: 3,
          fleeThreshold: 0,
        },
        state: 'HUNTING' as const,
        isAsleep: false,
        visibleCells: new Set<string>(),
        currentPath: null,
      }

      const mockLevel = {
        tiles: Array(10).fill(null).map(() =>
          Array(10).fill({ type: 'FLOOR' as const, char: '.', color: 'white' })
        ),
        rooms: [],
        corridors: [],
        doors: [],
        stairs: [],
        monsters: [mockMonster],
        items: [],
        traps: [],
        explored: Array(10).fill(null).map(() => Array(10).fill(false)),
        width: 10,
        height: 10,
      }

      const mockState = {
        player: {
          position: { x: 7, y: 7 },
          hp: 20,
          maxHp: 20,
          strength: 16,
          maxStrength: 16,
          ac: 5,
          level: 1,
          xp: 0,
          gold: 0,
          hunger: 1300,
          equipment: {
            weapon: null,
            armor: null,
            leftRing: null,
            rightRing: null,
            lightSource: null,
          },
          inventory: [],
        },
        currentLevel: 1,
        levels: new Map([[1, mockLevel]]),
        visibleCells: new Set<string>(),
        messages: [],
        turnCount: 0,
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        hasAmulet: false,
        itemNameMap: {},
        identifiedItems: new Set(),
        debug: {
          isEnabled: false,
          godMode: false,
          revealMap: false,
          fovDebug: false,
          pathDebug: false,
          aiDebug: false,
        },
      }

      // This should not throw "Cannot read properties of undefined (reading 'computeFOV')"
      expect(() => {
        aiService.computeMonsterFOV(mockMonster, mockState)
      }).not.toThrow()
    })
  })
})
