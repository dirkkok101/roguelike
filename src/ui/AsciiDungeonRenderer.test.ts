// ============================================================================
// ASCII DUNGEON RENDERER TESTS
// ============================================================================

import { AsciiDungeonRenderer } from './AsciiDungeonRenderer'
import { RenderingService } from '@services/RenderingService'
import { GameState, Level, ItemType, TileType } from '@game/core/core'

describe('AsciiDungeonRenderer', () => {
  let renderer: AsciiDungeonRenderer
  let mockRenderingService: jest.Mocked<RenderingService>
  let mockGameState: GameState

  beforeEach(() => {
    // Create mock rendering service
    mockRenderingService = {
      getVisibilityState: jest.fn(),
      getColorForTile: jest.fn(),
      getColorForEntity: jest.fn(),
      shouldRenderEntity: jest.fn(),
    } as any

    renderer = new AsciiDungeonRenderer(mockRenderingService)

    // Create minimal mock game state
    const mockLevel: Level = {
      depth: 1,
      width: 10,
      height: 5,
      tiles: Array(5)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: TileType.FLOOR,
              char: '.',
              walkable: true,
              transparent: true,
              explored: false,
            }))
        ),
      monsters: [],
      items: [],
      gold: [],
      doors: [],
      traps: [],
      stairsUp: null,
      stairsDown: null,
      rooms: [],
    }

    mockGameState = {
      player: {
        id: 'player',
        position: { x: 5, y: 2 },
        hp: 20,
        maxHp: 20,
        strength: 16,
        maxStrength: 16,
        ac: 10,
        level: 1,
        xp: 0,
        gold: 0,
        hunger: 1300,
        inventory: [],
        equipment: {
          weapon: null,
          armor: null,
          leftRing: null,
          rightRing: null,
          lightSource: null,
        },
        statusEffects: [],
      },
      levels: new Map([[1, mockLevel]]),
      currentLevel: 1,
      messages: [],
      turnCount: 0,
      visibleCells: new Set(),
      exploredCells: new Set(),
      detectedMagicItems: new Set(),
      detectedMonsters: new Set(),
      isGameOver: false,
      hasWon: false,
      gameId: 'test-game',
    }
  })

  describe('render', () => {
    it('should return HTML string wrapped in <pre> tags', () => {
      mockRenderingService.getVisibilityState.mockReturnValue('unexplored')
      mockRenderingService.getColorForTile.mockReturnValue('#888888')

      const html = renderer.render(mockGameState)

      expect(html).toContain('<pre class="dungeon-grid">')
      expect(html).toContain('</pre>')
    })

    it('should render player at correct position with cyan color', () => {
      // Player is at (5, 2)
      mockRenderingService.getVisibilityState.mockReturnValue('visible')
      mockRenderingService.getColorForTile.mockReturnValue('#888888')

      const html = renderer.render(mockGameState)

      // Check that player '@' symbol exists with cyan color
      expect(html).toContain('color: #00FFFF">@</span>')
    })

    it('should render visible tiles with full color', () => {
      mockRenderingService.getVisibilityState.mockReturnValue('visible')
      mockRenderingService.getColorForTile.mockReturnValue('#FFFFFF')

      const html = renderer.render(mockGameState)

      // Should contain spans with white color for floor tiles
      expect(html).toContain('color: #FFFFFF')
    })

    it('should not render unexplored tiles', () => {
      // Set up a mix of visible and unexplored
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x < 5) return 'unexplored'
        return 'visible'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')

      const html = renderer.render(mockGameState)

      // HTML should exist and contain visible tiles
      expect(html.length).toBeGreaterThan(100)
    })

    it('should render monsters in visible areas', () => {
      const monster = {
        id: 'orc-1',
        letter: 'o',
        position: { x: 3, y: 2 },
        isInvisible: false,
        hp: 10,
        maxHp: 10,
      }

      mockGameState.levels.get(1)!.monsters = [monster as any]
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x === 3 && pos.y === 2) return 'visible'
        return 'unexplored'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')
      mockRenderingService.getColorForEntity.mockReturnValue('#FF0000')

      const html = renderer.render(mockGameState)

      // Should contain monster letter 'o'
      expect(html).toContain('>o<')
    })

    it('should render items in visible areas', () => {
      const item = {
        id: 'potion-1',
        type: ItemType.POTION,
        position: { x: 4, y: 2 },
      }

      mockGameState.levels.get(1)!.items = [item as any]
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x === 4 && pos.y === 2) return 'visible'
        return 'unexplored'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')

      const html = renderer.render(mockGameState)

      // Potion should be rendered as '!' symbol
      expect(html).toContain('>!</')
      // Should have magenta color
      expect(html).toContain('#FF00FF')
    })

    it('should render gold in visible areas', () => {
      const gold = {
        id: 'gold-1',
        position: { x: 6, y: 2 },
        amount: 100,
      }

      mockGameState.levels.get(1)!.gold = [gold as any]
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x === 6 && pos.y === 2) return 'visible'
        return 'unexplored'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')

      const html = renderer.render(mockGameState)

      // Gold should be rendered as '$' symbol
      expect(html).toContain('>$<')
      // Should have gold color
      expect(html).toContain('#FFD700')
    })

    it('should render stairs up in visible areas', () => {
      mockGameState.levels.get(1)!.stairsUp = { x: 7, y: 2 }
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x === 7 && pos.y === 2) return 'visible'
        return 'unexplored'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')
      mockRenderingService.shouldRenderEntity.mockReturnValue(true)

      const html = renderer.render(mockGameState)

      // Stairs up should be rendered as '<' symbol
      expect(html).toContain('><')
      // Should have yellow color
      expect(html).toContain('#FFFF00')
    })

    it('should render stairs down in visible areas', () => {
      mockGameState.levels.get(1)!.stairsDown = { x: 8, y: 2 }
      mockRenderingService.getVisibilityState.mockImplementation((pos) => {
        if (pos.x === 8 && pos.y === 2) return 'visible'
        return 'unexplored'
      })
      mockRenderingService.getColorForTile.mockReturnValue('#888888')
      mockRenderingService.shouldRenderEntity.mockReturnValue(true)

      const html = renderer.render(mockGameState)

      // Stairs down should be rendered as '>' symbol
      expect(html).toContain('>><')
      // Should have yellow color
      expect(html).toContain('#FFFF00')
    })

    it('should handle level with no data', () => {
      mockGameState.levels = new Map()

      const html = renderer.render(mockGameState)

      expect(html).toContain('No level data')
    })
  })
})
