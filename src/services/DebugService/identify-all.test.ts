import { DebugService } from './DebugService'
import { MessageService } from '@services/MessageService'
import { GameState, PotionType, ScrollType, RingType, WandType } from '@game/core/core'

describe('DebugService - Identify All', () => {
  let debugService: DebugService
  let mockState: GameState

  beforeEach(() => {
    const messageService = new MessageService()
    debugService = new DebugService(messageService, true)

    mockState = {
      messages: [],
      turnCount: 0,
      identifiedItems: new Set(),
      debug: debugService.initializeDebugState(),
    } as GameState
  })

  test('identifyAll marks all potion types as identified', () => {
    const result = debugService.identifyAll(mockState)

    const potionCount = Object.values(PotionType).length
    const potionItems = Array.from(result.identifiedItems).filter(id => id.startsWith('potion-'))

    expect(potionItems).toHaveLength(potionCount)
  })

  test('identifyAll marks all scroll types as identified', () => {
    const result = debugService.identifyAll(mockState)

    const scrollCount = Object.values(ScrollType).length
    const scrollItems = Array.from(result.identifiedItems).filter(id => id.startsWith('scroll-'))

    expect(scrollItems).toHaveLength(scrollCount)
  })

  test('identifyAll marks all ring types as identified', () => {
    const result = debugService.identifyAll(mockState)

    const ringCount = Object.values(RingType).length
    const ringItems = Array.from(result.identifiedItems).filter(id => id.startsWith('ring-'))

    expect(ringItems).toHaveLength(ringCount)
  })

  test('identifyAll marks all wand types as identified', () => {
    const result = debugService.identifyAll(mockState)

    const wandCount = Object.values(WandType).length
    const wandItems = Array.from(result.identifiedItems).filter(id => id.startsWith('wand-'))

    expect(wandItems).toHaveLength(wandCount)
  })

  test('identifyAll adds message with total count', () => {
    const result = debugService.identifyAll(mockState)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toContain('Identified all')
    expect(result.messages[0].text).toContain('item types')
  })

  test('identifyAll includes all item categories', () => {
    const result = debugService.identifyAll(mockState)

    const totalTypes =
      Object.values(PotionType).length +
      Object.values(ScrollType).length +
      Object.values(RingType).length +
      Object.values(WandType).length

    expect(result.identifiedItems.size).toBe(totalTypes)
  })

  test('preserves immutability', () => {
    const result = debugService.identifyAll(mockState)

    expect(result).not.toBe(mockState)
    expect(result.identifiedItems).not.toBe(mockState.identifiedItems)
    expect(mockState.identifiedItems.size).toBe(0) // Original unchanged
  })

  test('does nothing in production mode', () => {
    const prodService = new DebugService(new MessageService(), false)
    const result = prodService.identifyAll(mockState)

    expect(result).toBe(mockState)
  })

  test('identifyAll includes specific potion type', () => {
    const result = debugService.identifyAll(mockState)

    expect(result.identifiedItems.has('potion-HEAL')).toBe(true)
  })

  test('identifyAll includes specific scroll type', () => {
    const result = debugService.identifyAll(mockState)

    expect(result.identifiedItems.has('scroll-IDENTIFY')).toBe(true)
  })

  test('identifyAll includes specific ring type', () => {
    const result = debugService.identifyAll(mockState)

    expect(result.identifiedItems.has('ring-PROTECTION')).toBe(true)
  })

  test('identifyAll includes specific wand type', () => {
    const result = debugService.identifyAll(mockState)

    expect(result.identifiedItems.has('wand-LIGHTNING')).toBe(true)
  })
})
