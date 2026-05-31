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

// TEMP diagnostic for the real-iOS playback failure: dump the playback events
// (projected to primitives so the result transfers over Selenium).
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  const dump = await page.evaluate(() =>
    (window.__stitchesEvents || [])
      .filter((e) =>
        /nodepool:|audioNode:onError|player:(error|playing|timeupdate|loading|trackchanged|queued)/.test(
          e.type,
        ),
      )
      .map((e) => ({
        t: e.type,
        file: e.detail && e.detail.fileName,
        code: e.detail && e.detail.code,
        msg: e.detail && (e.detail.message || (e.detail.error && e.detail.error.message)),
        id: e.detail && e.detail.track && e.detail.track.id,
        ct: e.detail && e.detail.currentTime,
      })),
  )
  console.log(`[DIAG ${testInfo.title}] ${JSON.stringify(dump)}`)
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
