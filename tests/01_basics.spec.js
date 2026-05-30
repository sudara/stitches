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

test("the playlist sets up its node pool", async ({ page }) => {
  await expectEvent(page, "nodepool:create")
})

test("clicking play on a preloaded track starts audio", async ({ page }) => {
  await page.locator("#track1 svg").click()
  await expectEvent(page, "audioNode:alreadyUnlockedDirectly")
  await expectPlaying(page)
})

test("clicking play on a non-preloaded track starts audio", async ({
  page,
}) => {
  await page.locator("#track2 svg").click()
  await expectPlaying(page)
})

test("clicking play, pause and play resumes playback", async ({ page }) => {
  await page.locator("#track2 svg").click()
  await expectPlaying(page, { past: 0.4 })

  await page.locator("#track2 svg").click() // pause
  await expectEvent(page, "track:pause")

  await clearEvents(page)
  await expectNoEvent(page, "track:whilePlaying")

  await page.locator("#track2 svg").click() // play again
  await expectPlaying(page, { past: 0.5 }) // resumed, not restarted at 0
})
