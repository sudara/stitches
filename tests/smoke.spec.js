import { test } from "@playwright/test"
import { openPlayer, expectEvent, expectPlayerPlaying } from "./helpers.js"

// Minimal cross-device smoke suite, and the ONLY suite the BrowserStack
// real-device lane runs (playwright.browserstack.config.js). It proves the
// three things that actually break per browser: the pool unlocks on the user
// gesture, real MP3 decodes and plays, and a gestureless next() advances and
// plays the following track. The desktop lanes run it too, so it stays honest
// without needing a BrowserStack dispatch.

test.beforeEach(async ({ page }) => {
  await openPlayer(page, "/tests/fixtures/player-queue.html")
})

const start = (page) => page.locator("#play").click()

test("unlock + play: the first track plays after the gesture", async ({
  page,
}) => {
  await expectEvent(page, "nodepool:create") // the library loaded and Player built
  await start(page)
  await expectEvent(page, "nodepool:unlockAll") // the gesture unlocked the pool
  await expectPlayerPlaying(page, { id: 1 }) // real MP3 decoded and played
})

test("next: gestureless advance plays the second track", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page, { id: 1 })
  await page.evaluate(() => window.player.next())
  await expectPlayerPlaying(page, { id: 2 })
})
