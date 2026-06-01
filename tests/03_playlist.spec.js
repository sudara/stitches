import { test } from "@playwright/test"
import {
  openPlayer,
  clearEvents,
  expectEvent,
  expectNoEvent,
  expectPlaying,
} from "./helpers.js"

test.beforeEach(async ({ page }) => {
  await openPlayer(page)
})

test("the next track starts once one has ended", async ({ page }) => {
  await page.locator("#track1 svg").click()
  await expectEvent(page, "nodepool:create")
  await expectEvent(page, "audioNode:loaded") // the second track preloads
  await expectPlaying(page, { past: 0.3, fileName: "short-continuous-2.mp3" })
})

test("the playlist keeps playing in a backgrounded tab", async ({ page }) => {
  await page.locator("#track1 svg").click()
  await expectEvent(page, "track:playing")

  const other = await page.context().newPage()
  await other.goto("about:blank")
  await other.bringToFront() // backgrounds the player tab
  await page.bringToFront()

  await expectPlaying(page, { past: 2.0, fileName: "short-continuous-2.mp3" })
  await other.close()
})

test("the playlist ends after the last track", async ({ page }) => {
  await page.locator("#track3 svg").click()
  await expectPlaying(page, { past: 1.0, fileName: "short-continuous-3.mp3" })
  await expectEvent(page, "track:ended")
  await clearEvents(page)
  await expectNoEvent(page, "track:whilePlaying")
})

test("a playlist can contain the same track multiple times", async ({
  page,
}) => {
  await page.locator("#playlist2-track1 svg").click()
  await expectPlaying(page, { past: 1.0, fileName: "short-continuous-1.mp3" })

  await expectEvent(page, "track:ended")
  await clearEvents(page)
  // The next track is the same mp3, so we should cross 1.0s on it again.
  await expectPlaying(page, { past: 1.0, fileName: "short-continuous-1.mp3" })
})
