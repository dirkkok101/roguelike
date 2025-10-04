import { DeathScreen, DeathStats } from './DeathScreen'

describe('DeathScreen', () => {
  let screen: DeathScreen

  beforeEach(() => {
    screen = new DeathScreen()
    // Clean up any existing modals
    document.body.innerHTML = ''
  })

  afterEach(() => {
    screen.hide()
    document.body.innerHTML = ''
  })

  function createDeathStats(overrides: Partial<DeathStats> = {}): DeathStats {
    return {
      cause: 'Killed by Orc',
      finalLevel: 5,
      totalGold: 250,
      totalXP: 1000,
      totalTurns: 500,
      deepestLevel: 5,
      seed: 'test-seed',
      ...overrides,
    }
  }

  test('displays death title', () => {
    const stats = createDeathStats()
    screen.show(stats, jest.fn())

    const title = document.querySelector('.death-title')
    expect(title?.textContent).toContain('GAME OVER')
  })

  test('displays "You have died" message', () => {
    const stats = createDeathStats()
    screen.show(stats, jest.fn())

    const title = document.querySelector('.death-title')
    expect(title?.textContent).toContain('You have died')
  })

  test('displays death cause', () => {
    const stats = createDeathStats({ cause: 'Killed by Orc' })
    screen.show(stats, jest.fn())

    const cause = document.querySelector('.death-cause')
    expect(cause?.textContent).toContain('Killed by Orc')
  })

  test('displays starvation death cause', () => {
    const stats = createDeathStats({ cause: 'Died of starvation' })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Died of starvation')
  })

  test('displays character level', () => {
    const stats = createDeathStats({ finalLevel: 8 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Character Level: 8')
  })

  test('displays total gold', () => {
    const stats = createDeathStats({ totalGold: 567 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Total Gold: 567')
  })

  test('displays experience points', () => {
    const stats = createDeathStats({ totalXP: 2500 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Experience: 2500')
  })

  test('displays deepest level reached', () => {
    const stats = createDeathStats({ deepestLevel: 7 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Deepest Level: 7')
  })

  test('displays total turns', () => {
    const stats = createDeathStats({ totalTurns: 1500 })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Total Turns: 1500')
  })

  test('displays seed', () => {
    const stats = createDeathStats({ seed: 'death-seed-123' })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Seed: death-seed-123')
  })

  test('displays permadeath message', () => {
    const stats = createDeathStats()
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Permadeath')
    expect(document.body.textContent).toContain('save has been deleted')
  })

  test('displays "Press [N] for New Game" instruction', () => {
    const stats = createDeathStats()
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Press [N] for New Game')
  })

  test('calls onNewGame when N key pressed', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), callback)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('calls onNewGame when uppercase N pressed', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), callback)

    const event = new KeyboardEvent('keydown', { key: 'N' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  test('hides screen when N key pressed', () => {
    screen.show(createDeathStats(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'n' })
    document.dispatchEvent(event)

    expect(screen.isVisible()).toBe(false)
  })

  test('isVisible returns true when shown', () => {
    expect(screen.isVisible()).toBe(false)

    screen.show(createDeathStats(), jest.fn())

    expect(screen.isVisible()).toBe(true)
  })

  test('isVisible returns false after hide', () => {
    screen.show(createDeathStats(), jest.fn())
    expect(screen.isVisible()).toBe(true)

    screen.hide()

    expect(screen.isVisible()).toBe(false)
  })

  test('does not call callback for other keys', () => {
    const callback = jest.fn()
    screen.show(createDeathStats(), callback)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(callback).not.toHaveBeenCalled()
  })

  test('creates modal with death-modal class', () => {
    screen.show(createDeathStats(), jest.fn())

    const modal = document.querySelector('.death-modal')
    expect(modal).not.toBeNull()
  })

  test('creates overlay with modal-overlay class', () => {
    screen.show(createDeathStats(), jest.fn())

    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
  })

  test('removes modal from DOM when hidden', () => {
    screen.show(createDeathStats(), jest.fn())
    const modalBefore = document.querySelector('.death-modal')
    expect(modalBefore).not.toBeNull()

    screen.hide()

    const modalAfter = document.querySelector('.death-modal')
    expect(modalAfter).toBeNull()
  })

  test('displays unknown cause as fallback', () => {
    const stats = createDeathStats({ cause: 'Unknown cause' })
    screen.show(stats, jest.fn())

    expect(document.body.textContent).toContain('Unknown cause')
  })
})
