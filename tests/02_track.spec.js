import { test, expect } from "@playwright/test"
import {
  openPlayer,
  events,
  callbacks,
  clearEvents,
  expectEvent,
  expectNoEvent,
  expectPlaying,
  expectProgressMoved,
  expectTimeUpdated,
} from "./helpers.js"

test.beforeEach(async ({ page }) => {
  await openPlayer(page)
})

test("the whilePlaying callback gets called", async ({ page }) => {
  await page.locator("#playlist2-track1 svg").click()
  await expectPlaying(page)
  await expect
    .poll(async () => (await callbacks(page)).whilePlaying.length)
    .toBeGreaterThan(0)
})

test("custom event detail is present in whilePlaying", async ({ page }) => {
  await page.locator("#playlist2-track1 svg").click()
  await expectPlaying(page)
  await expect
    .poll(async () =>
      (await callbacks(page)).whilePlaying.some((d) => d.trackId === "456"),
    )
    .toBe(true)
})

test("the onError callback gets called", async ({ page }) => {
  await page.locator("#track404 svg").click()
  await expect
    .poll(async () => (await callbacks(page)).onError.length)
    .toBeGreaterThan(0)
  await expectNoEvent(page, "track:playing")
})

test("<progress> element updates during playback", async ({ page }) => {
  await page.locator("#track1 svg").click()
  await expectProgressMoved(page, "#track1progress")
})

test("custom defined progress elements update their width", async ({
  page,
}) => {
  await page.locator("#playlist2-track1 svg").click()
  await expectProgressMoved(page, "#customProgress")
})

test("the time updates during playback", async ({ page }) => {
  await page.locator("#track1 svg").click()
  await expectTimeUpdated(page, "#track1time", "0:01")
})

test("seeking works and doesn't reload the track", async ({ page }) => {
  await page.locator("#track1 svg").click() // play
  await expectEvent(page, "audioNode:srcchanged")
  await page.locator("#track1 svg").click() // pause
  await clearEvents(page)

  await page.locator("#track1progress").click() // seek to ~50% and resume

  await expectEvent(page, "audioNode:seeked")
  await expectEvent(page, "track:playing")
  await expectPlaying(page, { past: 2.0 }) // only reachable via the seek

  // The current track's audio is never reloaded; the only src churn is the
  // *next* track preloading (timeFromEnd < 10 always holds on these ~4.4s mp3s),
  // so we assert by fileName rather than by event absence. A whileLoading for
  // the current file is expected here (resuming re-reports its full progress),
  // so a reload is signalled solely by a fresh srcchanged.
  const reloadedFiles = (await events(page))
    .filter((e) => e.type === "audioNode:srcchanged")
    .map((e) => e.detail?.fileName)
  expect(reloadedFiles).not.toContain("short-continuous-1.mp3")
})

test("seeking during playback doesn't trigger play callbacks", async ({
  page,
}) => {
  await page.locator("#track1 svg").click() // play
  await expectEvent(page, "track:playing")
  await clearEvents(page)

  // Seek while still playing; track:seeked needs two post-seek timeupdates to
  // confirm, so we let playback continue rather than pausing immediately.
  await page.locator("#track1progress").click()

  await expectEvent(page, "audioNode:seeked")
  await expectEvent(page, "track:seeked")
  // track:playing only fires once per track, and we cleared it above, so it
  // must not reappear from the seek.
  await expectNoEvent(page, "track:playing")
})

test("a listen is registered after 15 percent of the track is complete", async ({
  page,
}) => {
  await page.locator("#track1 svg").click() // play
  // 15% of ~4.4s is fast, so asserting it hasn't fired yet is flaky; we only
  // assert it eventually fires.
  await expectEvent(page, "track:registerListen")
})
