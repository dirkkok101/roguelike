import { VictoryScreen } from './VictoryScreen'
import { VictoryStats } from '@services/VictoryService'

describe('VictoryScreen', () => {
  let screen: VictoryScreen

  beforeEach(() => {
    screen = new VictoryScreen()
    // Clean up any existing modals
    document.body.innerHTML = ''
  })

  afterEach(() => {
    screen.hide()
    document.body.innerHTML = ''
  })

  function createVictoryStats(overrides: Partial<VictoryStats> = {}): VictoryStats {
    return {
      finalLevel: 10,
      totalGold: 1000,
      totalXP: 5000,
      totalTurns: 2000,
      deepestLevel: 10,
      finalScore: 50000,
      seed: 'test-seed',
      gameId: 'test-game',
      ...overrides,
    }
  }

  test('displays victory title', () => {
    const stats = createVictoryStats()
    screen.show(stats, jest.fn())

    const title = document.querySelector('.victory-title')
    expect(title?.textContent).toContain('VICTORY IS YOURS')
  })

  test('displays "You escaped with the Amulet" message', () => {
    const stats = createVictoryStats()
    screen.show(stats, jest.fn())

    const title = document.querySelector('.victory-title')
    expect(title?.textContent).toContain('You escaped with the Amulet')
  })

  test('displays final score with formatting', () => {
    const stats = createVictoryStats({ finalScore: 50000 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Final Score: 50,000')
  })

  test('displays character level', () => {
    const stats = createVictoryStats({ finalLevel: 15 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Character Level: 15')
  })

  test('displays total gold', () => {
    const stats = createVictoryStats({ totalGold: 1234 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Total Gold: 1234')
  })

  test('displays experience points', () => {
    const stats = createVictoryStats({ totalXP: 5678 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Experience: 5678')
  })

  test('displays deepest level reached', () => {
    const stats = createVictoryStats({ deepestLevel: 12 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Deepest Level: 12')
  })

  test('displays total turns', () => {
    const stats = createVictoryStats({ totalTurns: 9000 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Total Turns: 9000')
  })

  test('displays seed', () => {
    const stats = createVictoryStats({ seed: 'custom-seed-123' })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Seed: custom-seed-123')
  })

  test('displays "Press [N] for New Game" instruction', () => {
    const stats = createVictoryStats()
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Press [N] to Continue')
  })

  test('calls onNewGame when N key pressed', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), callback)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('calls onNewGame when uppercase N pressed', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), callback)

    const event = new KeyboardEvent('keydown', { key: 'N' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('hides screen when N key pressed', () => {
    screen.show(createVictoryStats(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(screen.isVisible()).toBe(false)
  })

  test('isVisible returns true when shown', () => {
    expect(screen.isVisible()).toBe(false)

    screen.show(createVictoryStats(), jest.fn())

    expect(screen.isVisible()).toBe(true)
  })

  test('isVisible returns false after hide', () => {
    screen.show(createVictoryStats(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    screen.hide()

    expect(screen.isVisible()).toBe(false)
  })

  test('does not call callback for other keys', () => {
    const callback = jest.fn()
    screen.show(createVictoryStats(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(callback).not.toHaveBeenCalled()
  })

  test('creates modal with victory-modal class', () => {
    screen.show(createVictoryStats(), jest.fn())

    const modal = document.querySelector('.victory-modal')
    expect(modal).not.toBeNull()
  })

  test('creates overlay with modal-overlay class', () => {
    screen.show(createVictoryStats(), jest.fn())

    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
  })

  test('removes modal from DOM when hidden', () => {
    screen.show(createVictoryStats(), jest.fn())
    const modalBefore = document.querySelector('.victory-modal')
    expect(modalBefore).not.toBeNull()

    screen.hide()

    const modalAfter = document.querySelector('.victory-modal')
    expect(modalAfter).toBeNull()
  })
})
