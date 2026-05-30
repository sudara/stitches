import { test, expect } from "@playwright/test"
import {
  openPlayer,
  events,
  clearEvents,
  expectEvent,
  expectPlayerPlaying,
} from "./helpers.js"

test.beforeEach(async ({ page }) => {
  await openPlayer(page, "/tests/fixtures/player-queue.html")
})

// The first setQueue rides this click so autoplay/iOS unlock is satisfied.
const start = (page) => page.locator("#play").click()

test("setQueue queues, announces the track, and plays it", async ({ page }) => {
  await start(page)

  await expect
    .poll(async () =>
      (await events(page)).find((e) => e.type === "player:queued"),
    )
    .toMatchObject({ detail: { length: 3, index: 0 } })
  await expectEvent(page, "player:trackchanged")
  await expectPlayerPlaying(page, { id: 1 })
})

test("player:timeupdate fires repeatedly while playing", async ({ page }) => {
  await start(page)
  await expect
    .poll(
      async () =>
        (await events(page)).filter((e) => e.type === "player:timeupdate")
          .length,
    )
    .toBeGreaterThan(2)
})

test("pause emits player:paused and stops reporting playing", async ({
  page,
}) => {
  await start(page)
  await expectPlayerPlaying(page)
  await page.evaluate(() => window.player.pause())
  await expectEvent(page, "player:paused")
  expect(await page.evaluate(() => window.player.isPlaying)).toBe(false)
})

test("next() advances to the following track", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page, { id: 1 })
  await clearEvents(page)
  await page.evaluate(() => window.player.next())
  await expectEvent(page, "player:trackchanged")
  await expectPlayerPlaying(page, { id: 2 })
})

test("previous() goes back to the prior track", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page, { id: 1 })
  await page.evaluate(() => window.player.next())
  await expectPlayerPlaying(page, { id: 2 })
  await clearEvents(page)
  await page.evaluate(() => window.player.previous())
  await expectPlayerPlaying(page, { id: 1 })
})

test("a finished track auto-advances to the next", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page, { id: 1 })
  await expectEvent(page, "player:ended")
  await expectPlayerPlaying(page, { id: 2 }) // advanced without a gesture
})

test("the last track finishing emits player:queueended", async ({ page }) => {
  await page.evaluate(() => {
    window.OPTS = { startIndex: 2, autoplay: true }
  })
  await start(page)
  await expectPlayerPlaying(page, { id: 3, past: 1.0 })
  await expectEvent(page, "player:queueended")
})

test("registerlisten fires past 15% of the track", async ({ page }) => {
  await start(page)
  await expectEvent(page, "player:registerlisten")
})

test("seek emits player:seeked", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page)
  await page.evaluate(() => window.player.seek(0.5))
  await expectEvent(page, "player:seeked")
})

test("a failed track errors and skips to the next", async ({ page }) => {
  await page.evaluate(() => {
    window.TRACKS = [
      { id: 99, url: "/mp3/short-continuous-666.mp3" }, // 404
      { id: 2, url: "/mp3/short-continuous-2.mp3" },
    ]
  })
  await start(page)
  await expectEvent(page, "player:error")
  await expectPlayerPlaying(page, { id: 2 }) // skipped past the broken track
})
