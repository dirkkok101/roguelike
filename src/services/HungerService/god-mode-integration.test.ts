import { HungerService } from './HungerService'
import { MockRandom } from '@services/RandomService'
import { RingService } from '@services/RingService'
import { DebugService } from '@services/DebugService'
import { MessageService } from '@services/MessageService'
import { MonsterSpawnService } from '@services/MonsterSpawnService'
import { ItemSpawnService } from '@services/ItemSpawnService'
import { Player, GameState } from '@game/core/core'
import { mockItemData } from '@/test-utils'

describe('HungerService - God Mode Integration', () => {
  let originalFetch: typeof global.fetch
  let hungerService: HungerService
  let debugService: DebugService
  let mockRandom: MockRandom
  let ringService: RingService
  let messageService: MessageService
  const mockMonsterData = [{ letter: 'T', name: 'Troll', hp: '6d8', ac: 4, damage: '1d8', xpValue: 120, level: 6, speed: 12, rarity: 'uncommon', mean: true, aiProfile: { behavior: 'SIMPLE', intelligence: 4, aggroRange: 8, fleeThreshold: 0.2, special: [] }}]
  beforeAll(() => {
    originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockMonsterData } as Response)
  })
  afterAll(() => { global.fetch = originalFetch })
  beforeEach(async () => {
    mockRandom = new MockRandom()
    ringService = new RingService()
    messageService = new MessageService()
    const monsterSpawnService = new MonsterSpawnService(mockRandom)
    await monsterSpawnService.loadMonsterData()
    const itemSpawnService = new ItemSpawnService(mockRandom, mockItemData)
    debugService = new DebugService(messageService, monsterSpawnService, itemSpawnService, mockRandom, true) // Enable debug mode
    hungerService = new HungerService(mockRandom, ringService, debugService)
  describe('tickHunger with god mode', () => {
    it('should not consume hunger when god mode is active', () => {
      // Arrange
      const player: Player = {
        position: { x: 5, y: 5 },
        hp: 100,
        maxHp: 100,
        strength: 16,
        maxStrength: 16,
        ac: 5,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 500,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        energy: 100,
        statusEffects: [],
      }
      const state: GameState = {
        player,
        currentLevel: 1,
        levels: new Map(),
        messages: [],
        turnCount: 1,
        visibleCells: new Set(),
        seed: 'test',
        gameId: 'test-game',
        isGameOver: false,
        hasWon: false,
        detectedMonsters: new Set(),
        detectedMagicItems: new Set(),
        identifiedItems: new Set(),
        debug: {
          godMode: true, // God mode enabled
          mapRevealed: false,
          debugConsoleVisible: false,
          fovOverlay: false,
          pathOverlay: false,
          aiOverlay: false,
      // Act
      const result = hungerService.tickHunger(player, state)
      // Assert
      expect(result.player.hunger).toBe(500) // Hunger unchanged
      expect(result.messages).toEqual([]) // No messages
      expect(result.death).toBeUndefined() // No death
    })
    it('should consume hunger normally when god mode is disabled', () => {
          godMode: false, // God mode disabled
      expect(result.player.hunger).toBe(499) // Hunger decreased by 1
      expect(result.messages).toEqual([]) // No messages (still in NORMAL state)
    it('should work without state parameter (backwards compatibility)', () => {
      const result = hungerService.tickHunger(player) // No state parameter
      expect(result.player.hunger).toBe(499) // Hunger decreased normally
  describe('applyStarvationDamage with god mode', () => {
    it('should not apply starvation damage when god mode is active', () => {
        hp: 10,
        hunger: 0, // Starving
      const result = hungerService.applyStarvationDamage(player, state)
      expect(result.hp).toBe(10) // HP unchanged (no starvation damage)
    it('should apply starvation damage when god mode is disabled', () => {
      expect(result.hp).toBe(9) // HP decreased by 1 (starvation damage)
    it('should not apply damage if hunger > 0 (not starving)', () => {
        hunger: 50, // Not starving
          godMode: false,
      expect(result.hp).toBe(10) // HP unchanged (not starving)
      const result = hungerService.applyStarvationDamage(player) // No state parameter
      expect(result.hp).toBe(9) // HP decreased normally (no god mode)
})
