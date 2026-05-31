import { test, expect } from "@playwright/test"
import {
  openPlayer,
  events,
  clearEvents,
  expectEvent,
  expectNoEvent,
  expectPlayerPlaying,
} from "./helpers.js"

test.beforeEach(async ({ page }) => {
  await openPlayer(page, "/tests/fixtures/player-queue.html")
})

// TEMP diagnostic for the Firefox failures: dump error/playback events on fail
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  const dump = await page.evaluate(() =>
    (window.__stitchesEvents || [])
      .filter((e) =>
        /audioNode:onError|player:(error|playing|timeupdate|trackchanged)/.test(
          e.type,
        ),
      )
      .map((e) => ({
        t: e.type,
        file: e.detail?.fileName,
        code: e.detail?.code,
        msg: e.detail?.message || e.detail?.error?.message,
        id: e.detail?.track?.id,
        ct: e.detail?.currentTime,
      })),
  )
  console.log(`[DIAG ${testInfo.title}] ${JSON.stringify(dump)}`)
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

test("consecutive failed tracks skip through to a playable one", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.TRACKS = [
      { id: 97, url: "/mp3/missing-a.mp3" },
      { id: 98, url: "/mp3/missing-b.mp3" },
      { id: 3, url: "/mp3/short-continuous-3.mp3" },
    ]
  })
  await start(page)
  await expectPlayerPlaying(page, { id: 3 })
})

test("a failing last track ends the queue", async ({ page }) => {
  await page.evaluate(() => {
    window.TRACKS = [{ id: 96, url: "/mp3/missing-only.mp3" }]
  })
  await start(page)
  await expectEvent(page, "player:error")
  await expectEvent(page, "player:queueended")
})

test("autoAdvance:false stops at the end of a track without advancing", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.player.autoAdvance = false
    window.OPTS = { startIndex: 0, autoplay: true }
  })
  await start(page)
  await expectEvent(page, "player:ended")
  await clearEvents(page)
  // give auto-advance a chance to (wrongly) fire, then assert it didn't
  await page.waitForTimeout(500)
  await expectNoEvent(page, "player:trackchanged")
  expect(await page.evaluate(() => window.player.isPlaying)).toBe(false)
})

test("toggle pauses then resumes the current track", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page)
  await page.evaluate(() => window.player.toggle())
  await expectEvent(page, "player:paused")
  await clearEvents(page)
  await page.evaluate(() => window.player.toggle())
  await expectPlayerPlaying(page)
})

test("clear stops playback and empties the queue", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page)
  await page.evaluate(() => window.player.clear())
  const state = await page.evaluate(() => ({
    queue: window.player.queue,
    index: window.player.currentIndex,
    current: window.player.currentTrack,
  }))
  expect(state.queue).toEqual([])
  expect(state.index).toBe(-1)
  expect(state.current).toBeNull()
})

test("jumpTo out of bounds is a no-op", async ({ page }) => {
  await start(page)
  await expectPlayerPlaying(page, { id: 1 })
  await page.evaluate(() => {
    window.player.jumpTo(99)
    window.player.jumpTo(-5)
  })
  expect(await page.evaluate(() => window.player.currentIndex)).toBe(0)
})

test("seek before playback does not throw", async ({ page }) => {
  await page.evaluate(() => {
    window.OPTS = { startIndex: 0, autoplay: false }
  })
  await start(page)
  // no audio node yet; seek must be a safe no-op rather than crash
  await page.evaluate(() => window.player.seek(0.5))
  expect(await page.evaluate(() => window.player.currentIndex)).toBe(0)
})
