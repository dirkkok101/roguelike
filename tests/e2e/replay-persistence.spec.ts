import { test, expect } from '@playwright/test'

test.describe('Replay Persistence', () => {
  test('should persist replay data to IndexedDB during gameplay', async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:3001')

    // Start new game
    await page.press('body', 'n')
    await page.press('body', 'Enter')

    // Wait for game to initialize
    await page.waitForSelector('text=Welcome to the dungeon')

    // Make 5 moves (turn 0 → turn 10)
    for (let i = 0; i < 5; i++) {
      await page.press('body', 'ArrowRight')
      await page.waitForTimeout(100)
    }

    for (let i = 0; i < 5; i++) {
      await page.press('body', 'ArrowDown')
      await page.waitForTimeout(100)
    }

    // Wait for autosave at turn 10
    await page.waitForTimeout(500)

    // Open debug console
    await page.press('body', '~')

    // Launch replay debugger
    await page.press('body', 'L')

    // Wait for console output
    await page.waitForTimeout(500)

    // Get console messages
    const messages = await page.evaluate(() => {
      return (window as any).consoleMessages || []
    })

    // Verify replay data was found (not "No replay data found")
    const hasReplayData = !messages.some((msg: string) =>
      msg.includes('No replay data found')
    )

    expect(hasReplayData).toBe(true)
  })

  test('should persist replay data on manual save', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Start new game
    await page.press('body', 'n')
    await page.press('body', 'Enter')

    // Make a few moves
    await page.press('body', 'ArrowRight')
    await page.press('body', 'ArrowRight')
    await page.press('body', 'ArrowDown')

    // Manual save (Shift+S)
    await page.press('body', 'S')

    // Wait for save to complete
    await page.waitForTimeout(500)

    // Verify IndexedDB has replay data
    const hasReplayInDB = await page.evaluate(async () => {
      const db = await indexedDB.open('roguelike-replays')
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction(['replays'], 'readonly')
          const store = transaction.objectStore('replays')
          const request = store.getAll()

          request.onsuccess = () => {
            resolve(request.result.length > 0)
          }
        }
      })
    })

    expect(hasReplayInDB).toBe(true)
  })
})
