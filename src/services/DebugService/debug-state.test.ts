import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'

describe('DebugService - State Management', () => {
  let debugService: DebugService
  let messageService: MessageService

  beforeEach(() => {
    messageService = new MessageService()
    debugService = new DebugService(messageService, true) // Force dev mode
  })

  test('initializes debug state with all flags false', () => {
    const debugState = debugService.initializeDebugState()

    expect(debugState.godMode).toBe(false)
    expect(debugState.mapRevealed).toBe(false)
    expect(debugState.debugConsoleVisible).toBe(false)
    expect(debugState.fovOverlay).toBe(false)
    expect(debugState.pathOverlay).toBe(false)
    expect(debugState.aiOverlay).toBe(false)
  })

  test('isEnabled returns true in dev mode', () => {
    expect(debugService.isEnabled()).toBe(true)
  })

  test('isEnabled returns false in production', () => {
    const prodService = new DebugService(messageService, false)
    expect(prodService.isEnabled()).toBe(false)
  })

  test('getDebugState returns initialized state when debug field missing', () => {
    const mockState = {
      messages: [],
    } as any

    const debugState = debugService.getDebugState(mockState)

    expect(debugState.godMode).toBe(false)
    expect(debugState.debugConsoleVisible).toBe(false)
  })

  test('getDebugState returns existing debug state', () => {
    const mockState = {
      debug: {
        godMode: true,
        mapRevealed: false,
        debugConsoleVisible: true,
        fovOverlay: false,
        pathOverlay: false,
        aiOverlay: false,
      },
    } as any

    const debugState = debugService.getDebugState(mockState)

    expect(debugState.godMode).toBe(true)
    expect(debugState.debugConsoleVisible).toBe(true)
  })

  test('showSeed returns game seed', () => {
    const mockState = {
      seed: 'test-seed-12345',
    } as any

    expect(debugService.showSeed(mockState)).toBe('test-seed-12345')
  })

  test('isGodModeActive returns false when debug state missing', () => {
    const mockState = {} as any
    expect(debugService.isGodModeActive(mockState)).toBe(false)
  })

  test('isGodModeActive returns correct status', () => {
    const mockState = {
      debug: {
        godMode: true,
        mapRevealed: false,
        debugConsoleVisible: false,
        fovOverlay: false,
        pathOverlay: false,
        aiOverlay: false,
      },
    } as any

    expect(debugService.isGodModeActive(mockState)).toBe(true)
  })
})
