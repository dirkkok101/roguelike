import { ContextualCommandBar } from './ContextualCommandBar'
import { ContextService, GameContext } from '@services/ContextService'
import { GameState, TileType } from '@game/core/core'

// ============================================================================
// CONTEXTUAL COMMAND BAR TESTS - Rendering
// ============================================================================

describe('ContextualCommandBar', () => {
  let commandBar: ContextualCommandBar
  let mockContextService: jest.Mocked<ContextService>
  let mockState: GameState

  beforeEach(() => {
    // Create mock ContextService
    mockContextService = {
      analyzeContext: jest.fn(),
    } as any

    commandBar = new ContextualCommandBar(mockContextService)

    // Create minimal mock state
    mockState = {
      player: {
        position: { x: 10, y: 10 },
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
          lightSource: null,
        },
        inventory: [],
      },
      currentLevel: 1,
      levels: new Map(),
      visibleCells: new Set(),
      messages: [],
      turnCount: 0,
      seed: 'test',
      gameId: 'test-game',
      isGameOver: false,
      hasWon: false,
      itemNameMap: {
        potions: new Map(),
        scrolls: new Map(),
        rings: new Map(),
        wands: new Map(),
      },
      identifiedItems: new Set(),
    }
  })

  test('renders primary hint when available', () => {
    // Arrange
    const mockContext: GameContext = {
      primaryHint: 'Item here: ruby ring',
      actions: [],
      warnings: [],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('ruby ring')
    expect(html).toContain('📍')
    expect(html).toContain('#FFD700') // Gold color for hint
  })

  test('renders actions with correct colors for primary category', () => {
    // Arrange
    const mockContext: GameContext = {
      actions: [{ key: ',', label: 'pickup', priority: 100, category: 'primary' }],
      warnings: [],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('#00FF00') // Green for primary
    expect(html).toContain('[,]')
    expect(html).toContain('pickup')
  })

  test('renders actions with correct colors for secondary category', () => {
    // Arrange
    const mockContext: GameContext = {
      actions: [{ key: 's', label: 'search', priority: 60, category: 'secondary' }],
      warnings: [],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('#0088FF') // Blue for secondary
    expect(html).toContain('[s]')
    expect(html).toContain('search')
  })

  test('renders warnings in orange', () => {
    // Arrange
    const mockContext: GameContext = {
      actions: [],
      warnings: ['⚠ Inventory full (26/26)'],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('#FF8800') // Orange for warnings
    expect(html).toContain('Inventory full')
  })

  test('renders multiple actions separated correctly', () => {
    // Arrange
    const mockContext: GameContext = {
      actions: [
        { key: ',', label: 'pickup', priority: 100, category: 'primary' },
        { key: 'i', label: 'inventory', priority: 90, category: 'primary' },
        { key: 'w', label: 'wield', priority: 80, category: 'primary' },
      ],
      warnings: [],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('[,]')
    expect(html).toContain('[i]')
    expect(html).toContain('[w]')
    expect(html).toContain('pickup')
    expect(html).toContain('inventory')
    expect(html).toContain('wield')
  })

  test('renders all elements when hint, warnings, and actions present', () => {
    // Arrange
    const mockContext: GameContext = {
      primaryHint: 'Item here: sword',
      actions: [{ key: ',', label: 'pickup', priority: 100, category: 'primary' }],
      warnings: ['⚠ Low health'],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toContain('Item here: sword')
    expect(html).toContain('Low health')
    expect(html).toContain('pickup')
    expect(html).toContain('│') // Separator
  })

  test('container has correct styling', () => {
    // Arrange/Act
    const container = commandBar.getContainer()

    // Assert
    expect(container.className).toBe('contextual-command-bar')
    expect(container.style.background).toBe('rgb(26, 26, 26)') // #1a1a1a
    expect(container.style.fontFamily).toContain('Courier New')
  })

  test('renders empty when no context', () => {
    // Arrange
    const mockContext: GameContext = {
      actions: [],
      warnings: [],
    }
    mockContextService.analyzeContext.mockReturnValue(mockContext)

    // Act
    commandBar.render(mockState)

    // Assert
    const html = commandBar.getContainer().innerHTML
    expect(html).toBe('') // Empty when no context
  })
})
