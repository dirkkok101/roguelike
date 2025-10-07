import { RenderingService, RenderConfig } from './RenderingService'
import { FOVService } from '@services/FOVService'
import { StatusEffectService } from '@services/StatusEffectService'
import { Position } from '@game/core/core'

describe('RenderingService - Entity Rendering', () => {
  let service: RenderingService
  let fovService: FOVService
  let statusEffectService: StatusEffectService

  beforeEach(() => {
    statusEffectService = new StatusEffectService()
    fovService = new FOVService(statusEffectService)
    service = new RenderingService(fovService)
  })

  const defaultConfig: RenderConfig = {
    showItemsInMemory: false,
    showGoldInMemory: false,
  }

  describe('shouldRenderEntity() - monsters', () => {
    test('renders monster when visible', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'monster',
        'visible',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render monster when explored', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'monster',
        'explored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })

    test('does not render monster when unexplored', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'monster',
        'unexplored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })
  })

  describe('shouldRenderEntity() - items', () => {
    test('renders item when visible', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'item',
        'visible',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render item in memory by default', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'item',
        'explored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })

    test('renders item in memory when config enabled', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: true,
        showGoldInMemory: false,
      }

      const shouldRender = service.shouldRenderEntity(
        position,
        'item',
        'explored',
        config
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render item when unexplored', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: true,
        showGoldInMemory: false,
      }

      const shouldRender = service.shouldRenderEntity(
        position,
        'item',
        'unexplored',
        config
      )

      expect(shouldRender).toBe(false)
    })
  })

  describe('shouldRenderEntity() - gold', () => {
    test('renders gold when visible', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'gold',
        'visible',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render gold in memory by default', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'gold',
        'explored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })

    test('renders gold in memory when config enabled', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: false,
        showGoldInMemory: true,
      }

      const shouldRender = service.shouldRenderEntity(
        position,
        'gold',
        'explored',
        config
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render gold when unexplored', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: false,
        showGoldInMemory: true,
      }

      const shouldRender = service.shouldRenderEntity(
        position,
        'gold',
        'unexplored',
        config
      )

      expect(shouldRender).toBe(false)
    })
  })

  describe('shouldRenderEntity() - stairs', () => {
    test('renders stairs when visible', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'stairs',
        'visible',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('renders stairs when explored (remembered)', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'stairs',
        'explored',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render stairs when unexplored', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'stairs',
        'unexplored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })
  })

  describe('shouldRenderEntity() - traps', () => {
    test('renders trap when visible', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'trap',
        'visible',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('renders trap when explored (remembered)', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'trap',
        'explored',
        defaultConfig
      )

      expect(shouldRender).toBe(true)
    })

    test('does not render trap when unexplored', () => {
      const position: Position = { x: 5, y: 5 }

      const shouldRender = service.shouldRenderEntity(
        position,
        'trap',
        'unexplored',
        defaultConfig
      )

      expect(shouldRender).toBe(false)
    })
  })

  describe('config independence', () => {
    test('monster rendering ignores config', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: true,
        showGoldInMemory: true,
      }

      // Monster still not shown in explored
      const shouldRender = service.shouldRenderEntity(
        position,
        'monster',
        'explored',
        config
      )

      expect(shouldRender).toBe(false)
    })

    test('stairs rendering ignores config', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: false,
        showGoldInMemory: false,
      }

      // Stairs still shown in explored
      const shouldRender = service.shouldRenderEntity(
        position,
        'stairs',
        'explored',
        config
      )

      expect(shouldRender).toBe(true)
    })
  })

  describe('unexplored never renders', () => {
    test('no entity types render in unexplored', () => {
      const position: Position = { x: 5, y: 5 }
      const config: RenderConfig = {
        showItemsInMemory: true,
        showGoldInMemory: true,
      }

      expect(
        service.shouldRenderEntity(position, 'monster', 'unexplored', config)
      ).toBe(false)
      expect(
        service.shouldRenderEntity(position, 'item', 'unexplored', config)
      ).toBe(false)
      expect(
        service.shouldRenderEntity(position, 'gold', 'unexplored', config)
      ).toBe(false)
      expect(
        service.shouldRenderEntity(position, 'stairs', 'unexplored', config)
      ).toBe(false)
      expect(
        service.shouldRenderEntity(position, 'trap', 'unexplored', config)
      ).toBe(false)
    })
  })
})
