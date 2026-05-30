import { expect } from "@playwright/test"

// Every stitches event goes through Log.trigger as a bubbling CustomEvent.
// We wrap dispatchEvent so tests assert against real events instead of
// scraping text out of the #debug element (the old Nightwatch approach).
export async function openPlayer(page) {
  await page.addInitScript(() => {
    window.__stitchesEvents = []
    const origDispatch = EventTarget.prototype.dispatchEvent
    EventTarget.prototype.dispatchEvent = function (event) {
      if (event instanceof CustomEvent) {
        window.__stitchesEvents.push({ type: event.type, detail: event.detail })
      }
      return origDispatch.call(this, event)
    }
  })
  await page.goto("/")
}

export function events(page) {
  return page.evaluate(() => window.__stitchesEvents)
}

export function clearEvents(page) {
  return page.evaluate(() => {
    window.__stitchesEvents = []
  })
}

export async function expectEvent(page, type) {
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === type), {
      message: `expected a "${type}" event`,
    })
    .toBe(true)
}

export async function expectNoEvent(page, type) {
  expect((await events(page)).some((e) => e.type === type)).toBe(false)
}

// Asserts the track produced audio that played past `past` seconds — the
// canary that MP3 actually decoded (no codec = currentTime never advances).
export async function expectPlaying(
  page,
  { past = 0.3, fileName = null } = {},
) {
  await expect
    .poll(
      async () => {
        const evts = await events(page)
        return evts.some((e) => {
          if (e.type !== "track:playing" && e.type !== "track:whilePlaying")
            return false
          if (fileName && e.detail?.fileName !== fileName) return false
          return typeof e.detail?.time === "number" && e.detail.time > past
        })
      },
      {
        timeout: 15_000,
        message: `expected playback past ${past}s${fileName ? ` of ${fileName}` : ""}`,
      },
    )
    .toBe(true)
}
